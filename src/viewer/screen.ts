/*
 * What the viewer computes on the screen itself (26/11/2026), as jewellers' renderers do:
 *  - a first look at the scene (the "prepass"): for each pixel, the direction of the surface, its distance, and how
 *    much it mirrors (polished metal: fully; stones and ground: not here);
 *  - reflections on the screen (SSR): polished metal shows the jewel itself — the inside of a ring shows its stones —
 *    by following the reflected ray across that first look (16 steps, as iJewel's default);
 *  - the bevel (SSBevel): the edges of the metal are rounded on the screen, without touching the shape — the direction
 *    of the surface is softened across an edge within a few pixels, so that a fine highlight follows each edge, as on
 *    real polished gold (a ring's rim, a bezel, the tip of a prong).
 * All of it before the progressive rendering, so that it is smoothed with the rest once the camera stops.
 */
import { Pass } from "postprocessing";
import {
  FloatType,
  HalfFloatType,
  Matrix4,
  NearestFilter,
  ShaderMaterial,
  Uniform,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { PostSettings } from "@/data/scene3d";

const OCT = /* glsl */ `
  vec2 octWrap(vec2 v) { return (1.0 - abs(v.yx)) * vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0); }
  vec2 octEncode(vec3 n) {
    n /= (abs(n.x) + abs(n.y) + abs(n.z));
    n.xy = n.z >= 0.0 ? n.xy : octWrap(n.xy);
    return n.xy;
  }
  vec3 octDecode(vec2 f) {
    vec3 n = vec3(f.x, f.y, 1.0 - abs(f.x) - abs(f.y));
    float t = clamp(-n.z, 0.0, 1.0);
    n.x += n.x >= 0.0 ? -t : t;
    n.y += n.y >= 0.0 ? -t : t;
    return normalize(n);
  }
`;

/* ---------- The first look ---------- */

/** Alpha of the first look: how much it mirrors (0 to 0.49), plus 0.5 when the material glows (its sparkles bloom). */
function packed(mirror: number, bloom: boolean): number {
  return Math.min(1, Math.max(0, mirror)) * 0.49 + (bloom ? 0.5 : 0);
}

function prepassMaterial(alpha: number): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { mirror: { value: alpha } },
    vertexShader: /* glsl */ `
      varying vec3 vNormalV;
      varying float vDepth;
      void main() {
        vec3 objectNormal = normal;
        vec4 p = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
          objectNormal = mat3(instanceMatrix) * objectNormal;
        #endif
        vec4 mv = modelViewMatrix * p;
        vNormalV = normalize(normalMatrix * objectNormal);
        vDepth = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      ${OCT}
      uniform float mirror;
      varying vec3 vNormalV;
      varying float vDepth;
      void main() {
        vec3 n = normalize(vNormalV);
        if (!gl_FrontFacing) n = -n;
        gl_FragColor = vec4(octEncode(n), vDepth, mirror);
      }`,
  });
}

/**
 * The first look at the scene, drawn before the image itself. Each mesh says how much it mirrors with
 * `userData.mirror` (0 to 1) and whether it glows with `userData.bloom`; meshes with `userData.noPrepass` are left out
 * (a transparent shadow plane).
 */
export class Prepass {
  readonly target: WebGLRenderTarget;
  private materials = new Map<number, ShaderMaterial>();
  private swapped: [Mesh, Material | Material[]][] = [];

  constructor(float: boolean) {
    this.target = new WebGLRenderTarget(1, 1, { type: float ? FloatType : HalfFloatType, minFilter: NearestFilter, magFilter: NearestFilter, depthBuffer: true, generateMipmaps: false });
  }

  get texture(): Texture {
    return this.target.texture;
  }

  private materialFor(mirror: number, bloom: boolean): ShaderMaterial {
    const key = packed(Math.round(mirror * 20) / 20, bloom);
    let m = this.materials.get(key);
    if (!m) {
      m = prepassMaterial(key);
      this.materials.set(key, m);
    }
    return m;
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, width: number, height: number): void {
    if (this.target.width !== width || this.target.height !== height) this.target.setSize(width, height);
    const hidden: Object3D[] = [];
    scene.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.visible) return;
      if (o.userData.noPrepass) {
        o.visible = false;
        hidden.push(o);
        return;
      }
      if (!mesh.isMesh) return;
      this.swapped.push([mesh, mesh.material]);
      mesh.material = this.materialFor(Number(o.userData.mirror ?? 0), o.userData.bloom === true);
    });
    const background = scene.background;
    scene.background = null;
    const before = renderer.getRenderTarget();
    const clearAlpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearAlpha(0);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(before);
    renderer.setClearAlpha(clearAlpha);
    scene.background = background;
    for (const [mesh, material] of this.swapped) mesh.material = material;
    this.swapped.length = 0;
    for (const o of hidden) o.visible = true;
  }

  dispose(): void {
    this.target.dispose();
    for (const m of this.materials.values()) m.dispose();
  }
}

/* ---------- Reflections on the screen ---------- */

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }`;

export class ReflectionPass extends Pass {
  private material: ShaderMaterial;
  private frame = 0;

  constructor(private prepass: Prepass) {
    super("ReflectionPass");
    this.material = new ShaderMaterial({
      uniforms: {
        inputBuffer: new Uniform<Texture | null>(null),
        prepass: new Uniform<Texture | null>(null),
        projection: new Uniform(new Matrix4()),
        projectionInverse: new Uniform(new Matrix4()),
        intensity: new Uniform(1),
        boost: new Uniform(new Vector3(1, 1, 1)),
        reach: new Uniform(0.02),
        power: new Uniform(1.1),
        tolerance: new Uniform(0.5),
        steps: new Uniform(16),
        ignoreFront: new Uniform(1),
        frontFactor: new Uniform(-0.2),
        jitter: new Uniform(0),
        texel: new Uniform(new Vector2(1, 1)),
      },
      vertexShader: VERTEX,
      fragmentShader: /* glsl */ `
        ${OCT}
        uniform sampler2D inputBuffer;
        uniform sampler2D prepass;
        uniform mat4 projection;
        uniform mat4 projectionInverse;
        uniform float intensity;
        uniform vec3 boost;
        uniform float reach;
        uniform float power;
        uniform float tolerance;
        uniform float steps;
        uniform float ignoreFront;
        uniform float frontFactor;
        uniform float jitter;
        uniform vec2 texel;
        varying vec2 vUv;

        vec3 viewAt(vec2 uv, float depth) {
          vec4 v = projectionInverse * vec4(uv * 2.0 - 1.0, 1.0, 1.0);
          v.xyz /= v.w;
          return v.xyz * (depth / -v.z);
        }
        vec2 screenOf(vec3 p) {
          vec4 c = projection * vec4(p, 1.0);
          return c.xy / c.w * 0.5 + 0.5;
        }

        void main() {
          vec4 colour = texture2D(inputBuffer, vUv);
          vec4 g = texture2D(prepass, vUv);
          gl_FragColor = colour;
          float mirror = (g.a >= 0.5 ? g.a - 0.5 : g.a) / 0.49;
          if (mirror <= 0.002 || g.b <= 0.0) return;
          vec3 p = viewAt(vUv, g.b);
          vec3 n = octDecode(g.rg);
          vec3 v = normalize(p);
          vec3 r = normalize(reflect(v, n));
          // A ray toward the eye leaves the screen at once: masked (iJewel's "ignore front rays").
          float front = ignoreFront > 0.5 ? 1.0 - smoothstep(frontFactor, frontFactor + 0.4, r.z) : 1.0;
          if (front <= 0.0) return;
          float stepLength = reach / steps;
          vec3 start = p + n * stepLength * 0.25;
          float hash = fract(sin(dot(vUv, vec2(12.9898, 78.233)) + jitter) * 43758.5453);
          vec2 hitUv = vec2(-1.0);
          float travelled = 0.0;
          vec3 q = start;
          for (float i = 1.0; i <= 64.0; i++) {
            if (i > steps) break;
            q = start + r * stepLength * (i - 1.0 + hash);
            vec2 uv = screenOf(q);
            if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) break;
            float sceneDepth = texture2D(prepass, uv).b;
            float rayDepth = -q.z;
            if (sceneDepth > 0.0 && rayDepth > sceneDepth && rayDepth - sceneDepth < stepLength * (1.0 + tolerance * 4.0)) {
              // Closer: halve the last step a few times.
              vec3 a = start + r * stepLength * (i - 2.0 + hash);
              vec3 b = q;
              for (int k = 0; k < 5; k++) {
                vec3 m = (a + b) * 0.5;
                vec2 muv = screenOf(m);
                float d = texture2D(prepass, muv).b;
                if (d > 0.0 && -m.z > d) b = m; else a = m;
              }
              hitUv = screenOf(b);
              travelled = i / steps;
              break;
            }
          }
          if (hitUv.x < 0.0) return;
          vec2 edge = smoothstep(vec2(0.0), vec2(0.08), hitUv) * (1.0 - smoothstep(vec2(0.92), vec2(1.0), hitUv));
          float fade = edge.x * edge.y * (1.0 - travelled * travelled) * front;
          vec3 seen = texture2D(inputBuffer, hitUv).rgb;
          // The metal tints what it mirrors (gold reflects gold): its own colour, brought to full brightness.
          float top = max(max(colour.r, colour.g), max(colour.b, 1e-4));
          vec3 tint = clamp(colour.rgb / top, 0.0, 1.0);
          gl_FragColor.rgb += pow(max(seen, vec3(0.0)), vec3(power)) * tint * boost * intensity * fade * mirror;
        }`,
      depthTest: false,
      depthWrite: false,
    });
    this.fullscreenMaterial = this.material;
    this.needsSwap = true;
  }

  /** Settings of iJewel's SSR; `jewelRadius` (m) gives the reach of a ray ("object radius", automatic or not). */
  configure(s: PostSettings["ssr"], jewelRadius: number): void {
    const u = this.material.uniforms;
    u.intensity!.value = s.intensity;
    (u.boost!.value as Vector3).set(...s.boost);
    u.reach!.value = (s.autoRadius ? jewelRadius * 2 : 0.02) * Math.max(0.05, s.radius);
    u.power!.value = s.power;
    u.tolerance!.value = s.tolerance;
    u.steps!.value = Math.min(64, Math.max(4, Math.round(s.steps)));
    u.ignoreFront!.value = s.ignoreFront ? 1 : 0;
    u.frontFactor!.value = s.frontFactor;
  }

  setCamera(camera: PerspectiveCamera): void {
    this.material.uniforms.projection!.value.copy(camera.projectionMatrix);
    this.material.uniforms.projectionInverse!.value.copy(camera.projectionMatrixInverse);
  }

  override render(renderer: WebGLRenderer, inputBuffer: WebGLRenderTarget | null, outputBuffer: WebGLRenderTarget | null): void {
    if (!inputBuffer) return;
    const u = this.material.uniforms;
    u.inputBuffer!.value = inputBuffer.texture;
    u.prepass!.value = this.prepass.texture;
    u.jitter!.value = (this.frame++ % 64) * 1.618;
    renderer.setRenderTarget(this.renderToScreen ? null : outputBuffer);
    renderer.render(this.scene, this.camera);
  }

  override dispose(): void {
    this.material.dispose();
    super.dispose();
  }
}

/* ---------- The bevel, inside the metal's own material ---------- */

/** Shared by every bevelled material: the first look of this frame, its size, on or off, the scene's radius. */
export const BEVEL = {
  bjPrepass: { value: null as Texture | null },
  bjResolution: { value: new Vector2(1, 1) },
  bjOn: { value: 0 },
  bjSceneRadius: { value: 2 },
  bjIntensity: { value: 1 },
  bjDepthRange: { value: 0.002 },
};

/**
 * Rounds the edges of a metal on the screen: its own radius (0–16 pixels, null: the scene's 0–8). The material keeps its
 * look elsewhere; on a flat face nothing changes.
 */
export function withBevel<M extends MeshStandardMaterial>(material: M, ownRadius: number | null): M {
  const own = { value: ownRadius ?? -1 };
  material.userData.bevel = own;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, BEVEL, { bjOwnRadius: own });
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        [
          "#include <common>",
          OCT,
          "uniform sampler2D bjPrepass;",
          "uniform vec2 bjResolution;",
          "uniform float bjOn;",
          "uniform float bjSceneRadius;",
          "uniform float bjOwnRadius;",
          "uniform float bjIntensity;",
          "uniform float bjDepthRange;",
        ].join("\n"),
      )
      .replace(
        "#include <normal_fragment_maps>",
        /* glsl */ `#include <normal_fragment_maps>
        {
          float radius = bjOwnRadius >= 0.0 ? bjOwnRadius : bjSceneRadius;
          if (bjOn > 0.5 && radius > 0.0) {
            vec2 uv = gl_FragCoord.xy / bjResolution;
            float depth = -vViewPosition.z;
            vec3 sum = normal;
            float weight = 1.0;
            for (int ring = 1; ring <= 2; ring++) {
              float r = radius * float(ring) * 0.5;
              for (int i = 0; i < 8; i++) {
                float a = float(i) * 0.7853982 + float(ring) * 0.3926991;
                vec4 g = texture2D(bjPrepass, uv + vec2(cos(a), sin(a)) * r / bjResolution);
                if (g.b <= 0.0) continue;
                float w = 1.0 - smoothstep(0.0, bjDepthRange, abs(g.b - depth));
                sum += octDecode(g.rg) * w;
                weight += w;
              }
            }
            normal = normalize(mix(normal, normalize(sum / weight), clamp(bjIntensity, 0.0, 1.0)));
          }
        }`,
      );
  };
  material.customProgramCacheKey = () => "bevel";
  material.needsUpdate = true;
  return material;
}

export function setBevel(material: Material, ownRadius: number | null): void {
  const own = (material.userData as { bevel?: { value: number } }).bevel;
  if (own) own.value = ownRadius ?? -1;
}

/* ---------- The glow: only the materials that glow, with a power ---------- */

type BloomLike = {
  fragmentShader?: string;
  uniforms: Map<string, Uniform>;
  luminanceMaterial: ShaderMaterial;
  getFragmentShader?: () => string;
  setChanged?: () => void;
};

/**
 * Teaches the glow of postprocessing two things iJewel's has: a power (the glow's own contrast: above 1, only the
 * brightest sparkles spread), and the choice of the materials that glow (read in the first look: a material without
 * glow gives none, however bright). Without the first look (phones), every bright point glows, as before.
 */
export function patchBloom(effect: unknown, prepass: Prepass | null): { set(power: number, useMask: boolean): void } {
  const bloom = effect as BloomLike;
  const power = new Uniform(1);
  bloom.uniforms.set("bjPower", power);
  const source = (bloom as { fragmentShader: string }).fragmentShader;
  if (source && !source.includes("bjPower")) {
    (bloom as { fragmentShader: string }).fragmentShader = source
      .replace("uniform float intensity;", "uniform float intensity;uniform float bjPower;")
      .replace("outputColor=texture2D(map,uv)*intensity;", "outputColor=pow(max(texture2D(map,uv),vec4(0.0)),vec4(bjPower))*intensity;");
  }
  const lum = bloom.luminanceMaterial;
  const mask = { value: prepass?.texture ?? null } as { value: Texture | null };
  const useMask = { value: 0 };
  if (!lum.fragmentShader.includes("bjMaskOf")) {
    lum.fragmentShader = lum.fragmentShader
      .replace("varying vec2 vUv;", "varying vec2 vUv;\nuniform sampler2D bjMask;\nuniform float bjUseMask;\nfloat bjMaskOf(vec2 uv){if(bjUseMask<0.5)return 1.0;return texture2D(bjMask,uv).a>=0.5?1.0:0.0;}\n")
      .replace("float mask=1.0;", "float mask=bjMaskOf(vUv);");
    lum.uniforms.bjMask = mask;
    lum.uniforms.bjUseMask = useMask;
    lum.needsUpdate = true;
  }
  return {
    set(p: number, on: boolean) {
      power.value = Math.max(0.2, p);
      useMask.value = on && prepass ? 1 : 0;
      mask.value = prepass?.texture ?? null;
    },
  };
}
