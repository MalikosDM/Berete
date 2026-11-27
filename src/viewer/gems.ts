/*
 * The stones (26/11/2026), drawn the way a jeweller's renderer does it: each pixel of a stone follows the light inside
 * it — refracted at the facet it enters, reflected by the facets inside (total internal reflection), refracted again
 * where it leaves — to the stones' own lighting (the Gem Environment: almost black, a few small bright sources), so that
 * a facet lights up only when it sends one of them back. The colours split where the light leaves (the fire), a tinted
 * stone darkens along the path of the light (absorption), and the surface reflects as polished glass does.
 * Two ways to find where the light meets the inside of the stone:
 *  - traced ("trace"): a ray against the triangles of the stone (a BVH, three-mesh-bvh), exact for any shape, for the
 *    large stones and for stones joined into one mesh;
 *  - fast ("fast"): for small repeated stones of a convex cut, the inside of the stone is measured once per cut — from
 *    its centre, the distance to its surface and the facet's normal in every direction, kept in a cube image of 256,
 *    512 or 1024 pixels a side — and the light finds its facet in a few looks at that image. Every stone of the same
 *    cut shares it: a pavé of hundreds of stones costs little more than one.
 * Settings: those of src/data/scene3d.ts (DiamondParams), as jewellers know them.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CubeCamera,
  DoubleSide,
  HalfFloatType,
  Matrix3,
  Matrix4,
  Mesh,
  NearestFilter,
  Quaternion,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLCubeRenderTarget,
  type CubeTexture,
  type InstancedMesh,
  type Texture,
  type WebGLRenderer,
} from "three";
import { BVHShaderGLSL, MeshBVH, MeshBVHUniformStruct, SAH } from "three-mesh-bvh";
import { ConvexHull } from "three/examples/jsm/math/ConvexHull.js";
import type { DiamondParams } from "@/data/scene3d";
import { lookMatrix, type LookId } from "./looks";

export type GemMode = "trace" | "fast";

/* ---------- Shaders ---------- */

const VERTEX = /* glsl */ `
  varying vec3 vStonePos;
  varying vec3 vCamStone;
  varying vec3 vWorldPos;
  varying vec3 vToWorld0;
  varying vec3 vToWorld1;
  varying vec3 vToWorld2;
  #ifdef GEM_UP
    attribute vec3 _gemup;
    varying vec3 vGemUp;
  #endif
  void main() {
    mat4 m = modelMatrix;
    #ifdef USE_INSTANCING
      m = modelMatrix * instanceMatrix;
    #endif
    vec4 world = m * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vStonePos = position;
    vCamStone = (inverse(m) * vec4(cameraPosition, 1.0)).xyz;
    vToWorld0 = normalize(m[0].xyz);
    vToWorld1 = normalize(m[1].xyz);
    vToWorld2 = normalize(m[2].xyz);
    #ifdef GEM_UP
      vGemUp = _gemup;
    #endif
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/** What both ways share: the lighting, the fire, the colour, the surface. */
const COMMON = /* glsl */ `
  precision highp float;
  precision highp isampler2D;
  precision highp usampler2D;
  #include <common>

  varying vec3 vStonePos;
  varying vec3 vCamStone;
  varying vec3 vWorldPos;
  varying vec3 vToWorld0;
  varying vec3 vToWorld1;
  varying vec3 vToWorld2;

  uniform sampler2D envMap;
  uniform mat3 envRot;
  uniform mat3 orientU;
  uniform float oriented;
  uniform float envIntensity;
  uniform float ior;
  uniform float dispersion;
  uniform float absorption;
  uniform float gammaF;
  uniform vec3 boost;
  uniform vec3 tint;
  uniform float reflectivity;
  uniform float transmission;
  uniform float bounces;
  uniform float epsilon;
  uniform float stoneSize;
  uniform float inclAmount;
  uniform float inclScale;
  uniform float inclRough;
  uniform float stoneExposure;
  uniform float floorK;
  uniform float filmAmount;
  uniform float filmThickness;
  uniform mat3 lookM;
  uniform float lookLift;
  uniform vec2 resolution;
  #ifdef GEM_TRANSMISSION
    uniform sampler2D sceneTex;
  #endif

  mat3 gemOrient;
  #ifdef GEM_UP
    varying vec3 vGemUp;
    // The rotation that turns the direction a (the stone's table) up, toward the top of the lighting.
    mat3 turnUp(vec3 a) {
      vec3 v = cross(a, vec3(0.0, 1.0, 0.0));
      float c = a.y;
      if (c < -0.9999) return mat3(1.0, 0.0, 0.0, 0.0, -1.0, 0.0, 0.0, 0.0, -1.0);
      float k = 1.0 / (1.0 + c);
      return mat3(
        v.x * v.x * k + c, v.y * v.x * k + v.z, v.z * v.x * k - v.y,
        v.x * v.y * k - v.z, v.y * v.y * k + c, v.z * v.y * k + v.x,
        v.x * v.z * k + v.y, v.y * v.z * k - v.x, v.z * v.z * k + c
      );
    }
  #endif

  // A direction of the stone's own space, in the lighting: the world's (0) or the one that follows the stone's table (1).
  vec3 toLighting(vec3 stoneDir) {
    vec3 world = mat3(vToWorld0, vToWorld1, vToWorld2) * stoneDir;
    vec3 up = gemOrient * stoneDir;
    return envRot * normalize(mix(world, up, oriented));
  }

  vec3 env(vec3 dir) {
    return textureLod(envMap, equirectUv(dir), 0.0).rgb * envIntensity;
  }

  // The lighting seen blurred (about 11° wide: a mipmap 32 pixels wide), what many more bounces would average to.
  vec3 envSoft(vec3 dir) {
    float lod = max(0.0, log2(float(textureSize(envMap, 0).x) / 32.0));
    return textureLod(envMap, equirectUv(dir), lod).rgb * envIntensity;
  }

  // A cloud inside the stone (inclusions): a soft value noise in the stone's space.
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }

  // Where the light leaves, for red, green and blue (the green is traced; red and blue split from it at the last facet,
  // where most of the fire is made), and the length of its path inside, in sizes of the stone.
  vec3 exitR;
  vec3 exitG;
  vec3 exitB;
  float pathLength;
  float cloud;
  bool escaped;
  float hops;

  void leave(vec3 dir, vec3 n) {
    vec3 g = refract(dir, n, ior);
    vec3 r = refract(dir, n, ior * (1.0 - dispersion));
    vec3 b = refract(dir, n, ior * (1.0 + dispersion));
    exitG = g;
    exitR = length(r) > 0.0 ? r : reflect(dir, n);
    exitB = length(b) > 0.0 ? b : reflect(dir, n);
  }
`;

/** The traced way: a ray against the triangles of the stone. */
const TRACE = /* glsl */ `
  // three-mesh-bvh accepts a hit up to this distance behind the ray's start (10 µm by default, the size of a facet of a
  // small stone in metres): the ray would meet again the facet it just went through. 1 µm, and the start of each ray is
  // moved further than that (stoneStep).
  #define TRI_INTERSECT_EPSILON 1e-6
  ${BVHShaderGLSL.common_functions}
  ${BVHShaderGLSL.bvh_struct_definitions}
  ${BVHShaderGLSL.bvh_ray_functions}
  uniform BVH bvh;

  void travel(vec3 origin, vec3 dir) {
    float stoneStep = max(epsilon, 3e-6);
    vec3 rayOrigin = origin + dir * stoneStep;
    vec3 rayDirection = dir;
    escaped = false;
    pathLength = 0.0;
    cloud = 0.0;
    for (float i = 0.0; i < 16.0; i++) {
      if (i >= bounces) break;
      uvec4 faceIndices = uvec4(0u);
      vec3 faceNormal = vec3(0.0, 0.0, 1.0);
      vec3 barycoord = vec3(0.0);
      float side = 1.0;
      float dist = 0.0;
      bool hit = bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
      if (!hit) {
        // Nothing met: the stone has a gap there (a file whose stone is not closed); the light leaves as it goes.
        exitR = rayDirection;
        exitG = rayDirection;
        exitB = rayDirection;
        escaped = true;
        hops = i;
        return;
      }
      pathLength += dist / stoneSize;
      vec3 hitPos = rayOrigin + rayDirection * max(dist - stoneStep, 0.0);
      if (inclAmount > 0.0) cloud += smoothstep(1.0 - inclAmount, 1.0, noise3((rayOrigin + hitPos) * 0.5 / stoneSize * 6.0 * inclScale)) * dist / stoneSize;
      // The facet's normal, facing back into the stone.
      vec3 n = faceNormal * side;
      if (dot(n, rayDirection) > 0.0) n = -n;
      vec3 out_ = refract(rayDirection, n, ior);
      hops = i + 1.0;
      if (length(out_) > 0.0) {
        leave(rayDirection, n);
        escaped = true;
        return;
      }
      rayDirection = reflect(rayDirection, n);
      rayOrigin = hitPos + rayDirection * stoneStep * 2.0;
    }
    exitR = rayDirection;
    exitG = rayDirection;
    exitB = rayDirection;
  }
`;

/**
 * The fast way: the inside of a convex stone, measured from its centre (cube image: the facet's normal in xyz, the
 * distance to the surface in w, in sizes of the stone). From inside, the ray meets the plane of the facet seen in its
 * direction; a few steps find the right facet.
 */
const FAST = /* glsl */ `
  uniform samplerCube gemCube;
  uniform vec3 gemCenter;
  uniform float gemRadius;

  vec4 cubeAt(vec3 p) {
    return texture(gemCube, normalize(p - gemCenter));
  }

  void travel(vec3 origin, vec3 dir) {
    vec3 o = origin;
    vec3 t = dir;
    escaped = false;
    pathLength = 0.0;
    cloud = 0.0;
    for (float i = 0.0; i < 16.0; i++) {
      if (i >= bounces) break;
      // First guess: where the ray leaves the sphere around the stone.
      vec3 oc = o - gemCenter;
      float b = dot(oc, t);
      float c = dot(oc, oc) - gemRadius * gemRadius * 1.21;
      float s = -b + sqrt(max(b * b - c, 0.0));
      vec3 n = vec3(0.0, 1.0, 0.0);
      for (int k = 0; k < 4; k++) {
        vec4 f = cubeAt(o + t * s);
        vec3 N = normalize(f.xyz);
        vec3 P = gemCenter + normalize(o + t * s - gemCenter) * f.w * gemRadius;
        float dn = dot(t, N);
        if (dn > 1e-4) s = max(dot(P - o, N) / dn, 0.0);
        n = N;
      }
      vec3 hitPos = o + t * s;
      pathLength += s / stoneSize;
      if (inclAmount > 0.0) cloud += smoothstep(1.0 - inclAmount, 1.0, noise3((o + hitPos) * 0.5 / stoneSize * 6.0 * inclScale)) * s / stoneSize;
      // n points out of the stone; the light inside meets it from within.
      vec3 nIn = -n;
      vec3 out_ = refract(t, nIn, ior);
      hops = i + 1.0;
      if (length(out_) > 0.0) {
        leave(t, nIn);
        escaped = true;
        return;
      }
      t = reflect(t, nIn);
      o = hitPos + t * epsilon;
    }
    exitR = t;
    exitG = t;
    exitB = t;
  }
`;

const MAIN = /* glsl */ `
  void main() {
    #ifdef GEM_UP
      gemOrient = turnUp(normalize(vGemUp));
    #else
      gemOrient = orientU;
    #endif
    vec3 d = normalize(vStonePos - vCamStone);
    // The facet: flat, from the triangle itself (crisp edges whatever the normals of the file).
    vec3 n = normalize(cross(dFdx(vStonePos), dFdy(vStonePos)));
    if (dot(n, d) > 0.0) n = -n;

    float cosi = clamp(dot(-d, n), 0.0, 1.0);
    float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
    float fresnel = f0 + (1.0 - f0) * pow(1.0 - cosi, 5.0);
    vec3 surface = env(toLighting(reflect(d, n)));

    hops = 0.0;
    travel(vStonePos, refract(d, n, 1.0 / ior));
    #ifdef GEM_DEBUG
      // Measures (lab only): 1 = escaped (green) or trapped (red), blue = bounces / 16; 2 = brightness of the lighting
      // where the light leaves (before any darkening), grey.
      #if GEM_DEBUG == 1
        gl_FragColor = vec4(escaped ? 0.0 : 1.0, escaped ? 1.0 : 0.0, hops / 16.0, 1.0);
      #else
        float lum = dot(env(toLighting(normalize(exitG))), vec3(0.2126, 0.7152, 0.0722));
        gl_FragColor = vec4(vec3(lum), 1.0);
      #endif
      return;
    #endif
    vec3 light;
    if (escaped) {
      light = vec3(env(toLighting(normalize(exitR))).r, env(toLighting(normalize(exitG))).g, env(toLighting(normalize(exitB))).b);
      // A little of the blurred lighting under the sharp one: where the light leaves towards a black gap of the
      // lighting, the facet is dark grey, as in a photograph (the studio is never a perfect black), never a black hole.
      light += envSoft(toLighting(normalize(exitG))) * 0.1;
    } else {
      // Still inside after the last bounce: the light would go on and leave somewhere; the blurred lighting in its
      // direction stands for those further bounces (formerly a third of the sharp lighting: often black).
      light = envSoft(toLighting(normalize(exitG))) * 0.85;
    }
    // Colour: a plain tint, or a density along the path of the light (a tinted stone darker where the light travels longer).
    vec3 colour = absorption > 0.0 ? exp(-absorption * pathLength * (vec3(1.0) - tint) * 3.0) : tint;
    light = pow(max(light, vec3(0.0)), vec3(gammaF)) * colour * boost;
    if (inclAmount > 0.0) {
      float k = clamp(cloud * inclAmount, 0.0, 1.0);
      light = mix(light, vec3(dot(light, vec3(0.3333))) * (0.55 + 0.25 * inclRough) + 0.02, k);
    }
    #ifdef GEM_TRANSMISSION
      // What stands behind (prongs, metal), seen through the stone, a little moved by the refraction.
      vec2 uv = gl_FragCoord.xy / resolution + (exitG.xy - d.xy) * 0.015;
      light = mix(light, texture2D(sceneTex, uv).rgb * colour, transmission);
    #endif
    vec3 reflected = surface * fresnel * reflectivity * 2.0;
    if (filmAmount > 0.0) {
      // Thin film: the light reflected by the coating's two faces interferes; each colour is reinforced or cancelled
      // with the path difference 2·n·d·cos θ (n = 1.45 for a coating), as on a soap bubble.
      float cosT = sqrt(max(0.0, 1.0 - (1.0 - cosi * cosi) / (1.45 * 1.45)));
      float opd = 2.0 * 1.45 * filmThickness * cosT;
      vec3 wave = vec3(650.0, 532.0, 450.0);
      vec3 film = 0.5 + 0.5 * cos(6.2831853 * opd / wave);
      reflected = mix(reflected, reflected * film * 2.0, filmAmount);
    }
    vec3 colourOut = reflected + light * (1.0 - fresnel);
    colourOut = max(lookM * colourOut + lookLift, vec3(0.0));
    // A floor, last of all: whatever the settings say (transparent, no reflection, one bounce, dark lighting…), a stone
    // sends back at least a little of the blurred light around the eye, in its own colour: never a black hole. Faint in
    // normal settings (the black facets of a diamond stay black), stronger as more settings lean to the dark (floorK).
    colourOut = max(colourOut, min(envSoft(toLighting(-d)) * floorK, vec3(0.35)) * colour) * stoneExposure;
    gl_FragColor = vec4(colourOut, 1.0);
  }
`;

/* ---------- Materials ---------- */

export type GemMaterial = ShaderMaterial & { userData: { gem: true; mode: GemMode; diamond: DiamondParams; darkScore?: number; darkExposure?: number } };

const bvhCache = new WeakMap<BufferGeometry, MeshBVHUniformStruct>();
const frameCache = new WeakMap<BufferGeometry, { table: Vector3; epsilon: number; center: Vector3; radius: number; size: number; convex: boolean }>();

/** About a stone's own shape: its table (the largest flat facet), a step, its centre, size, and whether it is convex. */
export function stoneShape(geometry: BufferGeometry) {
  const found = frameCache.get(geometry);
  if (found) return found;
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : pos.count;
  const at = (k: number) => new Vector3().fromBufferAttribute(pos, index ? index.getX(k) : k);
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const center = box.getCenter(new Vector3());
  let radius = 0;
  for (let i = 0; i < pos.count; i++) radius = Math.max(radius, new Vector3().fromBufferAttribute(pos, i).distanceTo(center));
  const groups: { n: Vector3; area: number }[] = [];
  const planes: { n: Vector3; d: number }[] = [];
  for (let k = 0; k + 2 < count; k += 3) {
    const a = at(k);
    const b = at(k + 1);
    const c = at(k + 2);
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    const area = n.length() / 2;
    if (area === 0) continue;
    n.normalize();
    const mid = a.clone().add(b).add(c).divideScalar(3).sub(center);
    if (n.dot(mid) < 0) n.negate();
    if (planes.length < 600) planes.push({ n, d: n.dot(a.clone().sub(center)) });
    const group = groups.find((g) => g.n.dot(n) > 0.995);
    if (group) group.area += area;
    else groups.push({ n, area });
  }
  const best = groups.reduce((m, g) => (g.area > m.area ? g : m), { n: new Vector3(0, 1, 0), area: 0 });
  // Convex: no vertex stands out of the plane of a facet (small tolerance for the rounding of the file).
  let convex = count / 3 <= 1200;
  if (convex) {
    const tol = radius * 0.02;
    outer: for (const p of planes) {
      for (let i = 0; i < pos.count; i += Math.max(1, Math.floor(pos.count / 400))) {
        const v = new Vector3().fromBufferAttribute(pos, i).sub(center);
        if (p.n.dot(v) - p.d > tol) {
          convex = false;
          break outer;
        }
      }
    }
  }
  const size = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z - box.min.z, 1e-6);
  const made = { table: best.n, epsilon: Math.max(3e-6, size * 0.0015), center, radius: Math.max(radius, 1e-6), size, convex };
  frameCache.set(geometry, made);
  return made;
}

/** How a stone meets its lighting: its table up (one stone repeated), else the world (several stones joined). */
export function orientOf(geometry: BufferGeometry, oneStone: boolean, world: Matrix4): Matrix3 {
  const { table } = stoneShape(geometry);
  const m = new Matrix3();
  if (oneStone) m.setFromMatrix4(new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(table, new Vector3(0, 1, 0))));
  else m.setFromMatrix4(new Matrix4().extractRotation(world));
  return m;
}

/* ---------- The cube images of the fast way, one per cut ---------- */

type Cube = { target: WebGLCubeRenderTarget; users: number };
const cubes = new WeakMap<BufferGeometry, Map<number, Cube>>();

const CUBE_MATERIAL = new ShaderMaterial({
  side: DoubleSide,
  uniforms: { center: { value: new Vector3() }, radius: { value: 1 } },
  vertexShader: /* glsl */ `
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 center;
    uniform float radius;
    varying vec3 vPos;
    void main() {
      vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
      if (dot(n, vPos - center) < 0.0) n = -n;
      gl_FragColor = vec4(n, length(vPos - center) / radius);
    }`,
});

/** Resolution of a cut's cube image: 256 for many small stones, 512 in general, 1024 for few (iJewel's advice). */
export function cubeResolution(copies: number, screenShare = 0): number {
  if (copies >= 60 && screenShare < 0.05) return 256;
  if (copies <= 4) return 1024;
  return 512;
}

/** Measures the inside of a convex stone from its centre, once per cut and resolution (shared by every stone of that cut). */
export function stoneCube(renderer: WebGLRenderer, geometry: BufferGeometry, resolution: number): CubeTexture {
  let byRes = cubes.get(geometry);
  if (!byRes) {
    byRes = new Map();
    cubes.set(geometry, byRes);
  }
  const found = byRes.get(resolution);
  if (found) {
    found.users++;
    return found.target.texture;
  }
  const shape = stoneShape(geometry);
  const target = new WebGLCubeRenderTarget(resolution, { type: HalfFloatType, format: RGBAFormat, minFilter: NearestFilter, magFilter: NearestFilter, generateMipmaps: false, depthBuffer: true });
  const scene = new Scene();
  const mesh = new Mesh(geometry, CUBE_MATERIAL);
  scene.add(mesh);
  CUBE_MATERIAL.uniforms.center!.value.copy(shape.center);
  CUBE_MATERIAL.uniforms.radius!.value = shape.radius;
  const camera = new CubeCamera(shape.radius * 0.001, shape.radius * 4, target);
  camera.position.copy(shape.center);
  const before = renderer.getRenderTarget();
  const clear = renderer.getClearAlpha();
  renderer.setClearAlpha(0);
  camera.update(renderer, scene);
  renderer.setRenderTarget(before);
  renderer.setClearAlpha(clear);
  scene.remove(mesh);
  byRes.set(resolution, { target, users: 1 });
  return target.texture;
}

/** Lets go of a cube image (freed when no stone uses it any more). */
export function releaseCube(geometry: BufferGeometry, resolution: number): void {
  const byRes = cubes.get(geometry);
  const found = byRes?.get(resolution);
  if (!byRes || !found) return;
  if (--found.users <= 0) {
    found.target.dispose();
    byRes.delete(resolution);
  }
}

/**
 * The triangles of a stone, unindexed, their positions in plain numbers. The light files keep positions as whole numbers
 * of 16 bits read as −1…1 (quantization); three-mesh-bvh copies those whole numbers into its texture as they are (±32 767)
 * while the shader traces in −1…1: the stone the rays met was 32 767 times larger than the one drawn, and the light never
 * met its inside (the large emerald cut of ZR0982 came out black, 26/11/2026). Read through getX/getY/getZ, which undo it.
 */
export function floatCopy(geometry: BufferGeometry): BufferGeometry {
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : pos.count;
  const out = new Float32Array(count * 3);
  for (let k = 0; k < count; k++) {
    const i = index ? index.getX(k) : k;
    out[k * 3] = pos.getX(i);
    out[k * 3 + 1] = pos.getY(i);
    out[k * 3 + 2] = pos.getZ(i);
  }
  const made = new BufferGeometry();
  made.setAttribute("position", new BufferAttribute(out, 3));
  return made;
}

/**
 * What the rays meet inside a stone. A stone cut finely into triangles by its file (the emerald of ZR0982: 108 000 for some
 * sixty facets) cost every pixel a long walk through its triangles: 17 images per second. When the stone is convex — every
 * point of its surface on the surface of its convex hull — its hull is the same solid with a few hundred triangles at
 * most, and the light finds the same facets (27/11/2026). A stone that is not convex (a heart's cleft, stones joined in one
 * mesh) keeps its own triangles.
 */
export function hullOrCopy(geometry: BufferGeometry): BufferGeometry {
  const copy = floatCopy(geometry);
  const pos = copy.getAttribute("position");
  if (pos.count / 3 < 1500 || geometry.getAttribute("_gemup")) return copy;
  const points: Vector3[] = [];
  const seen = new Set<string>();
  geometry.computeBoundingBox();
  const size = geometry.boundingBox!.getSize(new Vector3()).length();
  const q = size * 1e-5;
  for (let i = 0; i < pos.count; i++) {
    const v = new Vector3().fromBufferAttribute(pos, i);
    const key = Math.round(v.x / q) + "," + Math.round(v.y / q) + "," + Math.round(v.z / q);
    if (seen.has(key)) continue;
    seen.add(key);
    points.push(v);
  }
  const hull = new ConvexHull().setFromPoints(points);
  // Convex when nearly every point of the stone lies on its hull (within 0.3 % of its size).
  const faces = hull.faces.map((f) => ({ n: f.normal.clone(), d: f.constant }));
  const tol = size * 0.003;
  let inside = 0;
  const step = Math.max(1, Math.floor(points.length / 4000));
  let tested = 0;
  for (let i = 0; i < points.length; i += step) {
    const p = points[i]!;
    let far = -Infinity;
    for (const f of faces) far = Math.max(far, f.n.dot(p) - f.d);
    tested++;
    if (far < -tol) inside++;
  }
  if (inside / Math.max(1, tested) > 0.01) return copy;
  const out: number[] = [];
  for (const face of hull.faces) {
    let edge = face.edge;
    const loop: Vector3[] = [];
    do {
      loop.push(edge.head().point);
      edge = edge.next;
    } while (edge !== face.edge);
    for (let k = 1; k + 1 < loop.length; k++) out.push(loop[0]!.x, loop[0]!.y, loop[0]!.z, loop[k]!.x, loop[k]!.y, loop[k]!.z, loop[k + 1]!.x, loop[k + 1]!.y, loop[k + 1]!.z);
  }
  const made = new BufferGeometry();
  made.setAttribute("position", new BufferAttribute(new Float32Array(out), 3));
  return made;
}

/* ---------- Making a stone's material ---------- */

export type GemOptions = {
  geometry: BufferGeometry;
  mode: GemMode;
  env: Texture;
  params: DiamondParams;
  orient: Matrix3;
  /** Fast way: the cube image of its cut. */
  cube?: CubeTexture;
  /** Bounces at most (phones: fewer). */
  maxBounces?: number;
  /** What stands behind is seen through (a copy of the image drawn before the stones). */
  sceneTex?: Texture | null;
};

export function gemMaterial(o: GemOptions): GemMaterial {
  const shape = stoneShape(o.geometry);
  const defines: Record<string, string> = {};
  if (o.geometry.getAttribute("_gemup")) defines.GEM_UP = "";
  if (o.sceneTex && o.params.transmission > 0) defines.GEM_TRANSMISSION = "";
  // The lab's measures (?gemDebug=1 or 2 in the address of /lab3d).
  const debug = typeof window !== "undefined" ? (window as unknown as { __gemDebug?: number }).__gemDebug : undefined;
  if (debug) defines.GEM_DEBUG = String(debug);
  const uniforms: Record<string, { value: unknown }> = {
    envMap: { value: o.env },
    envRot: { value: new Matrix3() },
    orientU: { value: o.orient },
    oriented: { value: 1 },
    envIntensity: { value: 1.3 },
    ior: { value: 2.6 },
    dispersion: { value: 0.008 },
    absorption: { value: 0 },
    gammaF: { value: 1 },
    boost: { value: new Vector3(1, 1, 1) },
    tint: { value: new Color(1, 1, 1) },
    reflectivity: { value: 0.5 },
    transmission: { value: 0 },
    bounces: { value: 5 },
    epsilon: { value: shape.epsilon },
    stoneSize: { value: shape.size },
    inclAmount: { value: 0 },
    inclScale: { value: 1 },
    inclRough: { value: 0.5 },
    stoneExposure: { value: 1 },
    floorK: { value: 0.05 },
    filmAmount: { value: 0 },
    filmThickness: { value: 380 },
    lookM: { value: new Matrix3() },
    lookLift: { value: 0 },
    resolution: { value: new Vector2(1, 1) },
    sceneTex: { value: o.sceneTex ?? null },
  };
  let body: string;
  if (o.mode === "trace") {
    let bvh = bvhCache.get(o.geometry);
    if (!bvh) {
      bvh = new MeshBVHUniformStruct();
      bvh.updateFrom(new MeshBVH(hullOrCopy(o.geometry), { strategy: SAH }));
      bvhCache.set(o.geometry, bvh);
    }
    uniforms.bvh = { value: bvh };
    body = TRACE;
  } else {
    uniforms.gemCube = { value: o.cube ?? null };
    uniforms.gemCenter = { value: shape.center.clone() };
    uniforms.gemRadius = { value: shape.radius };
    body = FAST;
  }
  const material = new ShaderMaterial({ defines, uniforms, vertexShader: VERTEX, fragmentShader: COMMON + body + MAIN }) as GemMaterial;
  material.userData = { gem: true, mode: o.mode, diamond: o.params };
  setGemParams(material, o.params, o.maxBounces ?? 16);
  return material;
}

const turn = new Matrix4();
const turnX = new Matrix4();

/** Puts the settings of a stone on its material (live, without rebuilding it). */
export function setGemParams(material: GemMaterial, p: DiamondParams, maxBounces = 16): void {
  const u = material.uniforms;
  // Bounds that keep a stone readable whatever the sliders say (27/11/2026: never black, never flat white). One by one
  // the sliders' bounds do it; pushed all together to one end they did not: the light the stone gets (its intensity times
  // its gain) is kept between 0.7 and 2.1, and its inner contrast eased when that light is already low or high.
  const gain = p.boost.reduce((a, v) => a + Math.min(2.5, Math.max(0.4, v)), 0) / 3;
  let envI = Math.min(4, Math.max(0.35, p.envIntensity));
  const lightIn = envI * gain;
  if (lightIn < 0.7) envI *= 0.7 / lightIn;
  if (lightIn > 2.1) envI *= 2.1 / lightIn;
  u.envIntensity!.value = envI;
  // How many settings lean to the dark: each one raises the floor of light a little (see the shader's floorK).
  material.userData.darkScore =
    (lightIn < 0.7 ? 1 : 0) + (p.gamma > 1.2 ? 1 : 0) + (p.refractiveIndex < 1.9 ? 1 : 0) + (p.rayBounces < 3 ? 1 : 0) + (p.reflectivity < 0.2 ? 1 : 0) + (p.transmission > 0.3 ? 1 : 0);
  u.floorK!.value = 0.05 + 0.07 * ((material.userData.darkScore as number) + ((material.userData.darkExposure as number) ?? 0));
  u.ior!.value = Math.max(1.01, p.refractiveIndex);
  u.dispersion!.value = Math.max(0, p.dispersion);
  u.absorption!.value = Math.max(0, p.absorption);
  u.gammaF!.value = Math.min(lightIn < 1 ? 1.25 : 2, Math.max(lightIn > 1.5 ? 0.85 : 0.5, p.gamma));
  (u.boost!.value as Vector3).set(...(p.boost.map((v) => Math.min(2.5, Math.max(0.4, v))) as [number, number, number]));
  (u.tint!.value as Color).set(p.color);
  u.reflectivity!.value = Math.max(0, p.reflectivity);
  u.transmission!.value = Math.min(1, Math.max(0, p.transmission));
  u.bounces!.value = Math.min(maxBounces, Math.max(1, Math.round(p.rayBounces)));
  u.oriented!.value = Math.min(1, Math.max(0, p.orientedLighting));
  u.inclAmount!.value = p.inclusions ? Math.min(1, Math.max(0, p.inclusions.amount)) : 0;
  u.inclScale!.value = p.inclusions?.scale ?? 1;
  u.inclRough!.value = p.inclusions?.roughness ?? 0.5;
  u.filmAmount!.value = p.thinFilm ? Math.min(1, Math.max(0, p.thinFilm.amount)) : 0;
  u.filmThickness!.value = p.thinFilm ? Math.min(1200, Math.max(100, p.thinFilm.thickness)) : 380;
  const look = lookMatrix(p.lut as LookId | null);
  (u.lookM!.value as Matrix3).copy(look.matrix);
  u.lookLift!.value = look.lift;
  material.userData.diamond = p;
}

/**
 * Turns the lighting the stone sees: the scene's turn of the Gem Environment and the stone's own offset (degrees
 * around the vertical, then X, Y, Z), and, with "Fixed Env Direction", the camera's turn around the jewel (the
 * lighting stays with the eye: the sparkles travel over the facets as the jewel turns).
 */
export function setGemLighting(material: GemMaterial, sceneTurn: number, cameraTurn: number, width: number, height: number, bounces?: number): void {
  const p = material.userData.diamond;
  const [rx, ry, rz] = p.envRotationXYZ;
  const k = Math.PI / 180;
  turn.makeRotationY(-(sceneTurn + p.envRotation) * k - cameraTurn);
  turnX.makeRotationFromEuler({ x: rx * k, y: ry * k, z: rz * k, order: "XYZ", isEuler: true } as never);
  turn.multiply(turnX);
  (material.uniforms.envRot!.value as Matrix3).setFromMatrix4(turn);
  (material.uniforms.resolution!.value as Vector2).set(width, height);
  if (bounces !== undefined) material.uniforms.bounces!.value = Math.min(bounces, Math.max(1, Math.round(p.rayBounces)));
}

/**
 * The screen's exposure, seen by the stones within 0.8–1.4 (27/11/2026): a very low or very high exposure, wanted for
 * the metal or the background, no longer turns the stones black or flat white.
 */
export function setGemExposure(material: GemMaterial, exposure: number): void {
  const e = Math.max(0.05, exposure);
  material.uniforms.stoneExposure!.value = Math.min(1.4, Math.max(0.8, e)) / e;
  material.userData.darkExposure = e < 0.8 ? 1 : 0;
  material.uniforms.floorK!.value = 0.05 + 0.07 * (((material.userData.darkScore as number) ?? 0) + (material.userData.darkExposure as number));
}

export function setGemEnv(material: GemMaterial, env: Texture): void {
  material.uniforms.envMap!.value = env;
}

/** The way chosen for a mesh of stones: fast for many small copies of one convex cut, traced otherwise. */
export function modeFor(mesh: Mesh, params: DiamondParams): GemMode {
  if (params.mode === "trace") return "trace";
  const geometry = mesh.geometry as BufferGeometry;
  if (geometry.getAttribute("_gemup")) return "trace";
  const shape = stoneShape(geometry);
  if (!shape.convex) return "trace";
  if (params.mode === "fast") return "fast";
  const copies = (mesh as InstancedMesh).isInstancedMesh ? (mesh as InstancedMesh).count : 1;
  // A large stone alone (a solitaire) is traced: exact for its long inner paths; small copies go fast.
  return copies >= 4 ? "fast" : "trace";
}
