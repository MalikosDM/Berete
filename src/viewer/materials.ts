/*
 * The materials of the viewer. Metals: physically based colours (reflectance
 * of each alloy, linear values) and a polished surface. Diamonds: true
 * refraction with dispersion (rays traced inside the stone, MeshRefractionMaterial
 * of drei) on computers; on phones a lighter glass of the same index (2.42).
 */
import { BufferGeometry, Color, DoubleSide, LinearSRGBColorSpace, Matrix3, Matrix4, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Vector3, type Material, type Texture } from "three";
import { MeshBVH, MeshBVHUniformStruct, SAH } from "three-mesh-bvh";
import { MeshRefractionMaterial } from "@react-three/drei/materials/MeshRefractionMaterial.js";
import type { LayerSetting, MetalId } from "@/data/models";

type MetalLook = { color: [number, number, number]; roughness: number; swatch: string };

/** Linear reflectance colours of the alloys, and the colour of their swatch (sRGB). */
export const METAL_LOOKS: Record<MetalId, MetalLook> = {
  "yellow-gold": { color: [0.96, 0.74, 0.4], roughness: 0.1, swatch: "#e9c46f" },
  "white-gold": { color: [0.84, 0.83, 0.8], roughness: 0.08, swatch: "#e4e2dc" },
  "rose-gold": { color: [0.95, 0.64, 0.53], roughness: 0.1, swatch: "#e8b4a0" },
  platinum: { color: [0.68, 0.66, 0.63], roughness: 0.12, swatch: "#bdbab4" },
  "black-rhodium": { color: [0.1, 0.1, 0.11], roughness: 0.16, swatch: "#2b2a2c" },
};

/** Colours a coloured stone can take (no blue: the house colours). */
export const STONE_COLORS = ["#ffffff", "#9b111e", "#0b6e4f", "#e75480", "#f2c14e", "#1c1c1c"] as const;

export function metalMaterial(metal: MetalId): MeshStandardMaterial {
  const look = METAL_LOOKS[metal];
  return new MeshStandardMaterial({ color: new Color().setRGB(...look.color, LinearSRGBColorSpace), metalness: 1, roughness: look.roughness, envMapIntensity: 1.15 });
}

export function setMetal(material: MeshStandardMaterial, metal: MetalId): void {
  const look = METAL_LOOKS[metal];
  material.color.setRGB(...look.color, LinearSRGBColorSpace);
  material.roughness = look.roughness;
}

export function enamelMaterial(color: string): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({ color: new Color(color), metalness: 0, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
}

/** The lighter stone of phones: a glass of the index of diamond, with its fire. */
export function lightStoneMaterial(color = "#ffffff", env: Texture | null = null): MeshPhysicalMaterial {
  const tint = new Color(color);
  return new MeshPhysicalMaterial({
    envMap: env,
    color: tint,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.0015,
    ior: 2.42,
    dispersion: 5,
    specularIntensity: 1,
    attenuationColor: tint,
    attenuationDistance: color.toLowerCase() === "#ffffff" ? Infinity : 0.002,
    envMapIntensity: 2.4,
  });
}

export type RefractionMaterial = InstanceType<typeof MeshRefractionMaterial> & {
  uniforms: Record<string, { value: unknown }>;
  defines: Record<string, string>;
};

const bvhCache = new WeakMap<BufferGeometry, MeshBVHUniformStruct>();

/**
 * The light path inside a stone, in the stone's own space, with steps scaled
 * to the stone (drei's original moves by fixed steps of 0.01 and 0.001, larger
 * than a stone of 1 mm). The light the stone sees is attached to the stone:
 * its table faces the top of the jeweller's lighting whatever the stone's
 * place on the jewel (the "oriented lighting" of iJewel3D), so every stone of
 * a pavé sparkles, not only those facing up.
 */
const TRACE = /* glsl */ `
  vec3 toStone(vec3 worldDirection) {
    return normalize((vModelMatrixInverse * vec4(worldDirection, 0.0)).xyz);
  }
  vec3 toLighting(vec3 stoneDirection) {
    return normalize(gemOrient * stoneDirection);
  }

  // Where the red and the blue leave the stone (the green is returned).
  vec3 gemExitR;
  vec3 gemExitB;

  vec3 totalInternalReflection(vec3 ro, vec3 rd, vec3 normal, float ior, mat4 modelMatrixInverse) {
    vec3 rayDirection = toStone(refract(rd, normal, 1.0 / ior));
    vec3 rayOrigin = (modelMatrixInverse * vec4(vWorldPosition, 1.0)).xyz + rayDirection * gemEpsilon;
    bool escaped = false;
    for (float i = 0.0; i < bounces; i++) {
      uvec4 faceIndices = uvec4(0u);
      vec3 faceNormal = vec3(0.0, 0.0, 1.0);
      vec3 barycoord = vec3(0.0);
      float side = 1.0;
      float dist = 0.0;
      bvhIntersectFirstHit(bvh, rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist);
      vec3 hitPos = rayOrigin + rayDirection * max(dist - gemEpsilon, 0.0);
      vec3 exitDirection = refract(rayDirection, faceNormal, ior);
      if (length(exitDirection) != 0.0) {
        // The fire: each colour leaves at its own angle (diamond bends blue more than red). Near the critical
        // angle the colours split widely, or the blue stays inside: the coloured flashes of a real stone.
        vec3 r = refract(rayDirection, faceNormal, ior * (1.0 - gemDispersion));
        vec3 b = refract(rayDirection, faceNormal, ior * (1.0 + gemDispersion));
        gemExitR = toLighting(length(r) != 0.0 ? r : reflect(rayDirection, faceNormal));
        gemExitB = toLighting(length(b) != 0.0 ? b : reflect(rayDirection, faceNormal));
        rayDirection = exitDirection;
        escaped = true;
        break;
      }
      rayDirection = reflect(rayDirection, faceNormal);
      rayOrigin = hitPos + rayDirection * gemEpsilon * 2.0;
    }
    vec3 green = toLighting(rayDirection);
    if (!escaped) {
      gemExitR = green;
      gemExitB = green;
    }
    return green;
  }
`;

/** How a stone's own space meets the lighting: its table up (one stone repeated), or the world (several stones joined). */
export type GemFrame = { orient: Matrix3; epsilon: number };

const frameCache = new WeakMap<BufferGeometry, { table: Vector3; epsilon: number }>();

/** The outward normal of the largest flat facet (the table), and a step of a ten-thousandth of the stone. */
function tableOf(geometry: BufferGeometry): { table: Vector3; epsilon: number } {
  const found = frameCache.get(geometry);
  if (found) return found;
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : pos.count;
  const at = (k: number) => new Vector3().fromBufferAttribute(pos, index ? index.getX(k) : k);
  const center = new Vector3();
  for (let i = 0; i < pos.count; i++) center.add(new Vector3().fromBufferAttribute(pos, i));
  center.divideScalar(Math.max(1, pos.count));
  const groups: { n: Vector3; area: number }[] = [];
  let edges = 0;
  let edgeCount = 0;
  for (let k = 0; k + 2 < count; k += 3) {
    const a = at(k);
    const b = at(k + 1);
    const c = at(k + 2);
    edges += a.distanceTo(b) + b.distanceTo(c) + c.distanceTo(a);
    edgeCount += 3;
    const n = new Vector3().subVectors(b, a).cross(new Vector3().subVectors(c, a));
    const area = n.length() / 2;
    if (area === 0) continue;
    n.normalize();
    const mid = a.clone().add(b).add(c).divideScalar(3).sub(center);
    if (n.dot(mid) < 0) n.negate();
    const group = groups.find((g) => g.n.dot(n) > 0.995);
    if (group) group.area += area;
    else groups.push({ n, area });
  }
  const best = groups.reduce((m, g) => (g.area > m.area ? g : m), { n: new Vector3(0, 1, 0), area: 0 });
  const made = { table: best.n, epsilon: Math.max(1e-7, (edges / Math.max(1, edgeCount)) * 0.002) };
  frameCache.set(geometry, made);
  return made;
}

export function gemFrame(geometry: BufferGeometry, oneStone: boolean, world: Matrix4): GemFrame {
  const { table, epsilon } = tableOf(geometry);
  const orient = new Matrix3();
  if (oneStone) orient.setFromMatrix4(new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(table, new Vector3(0, 1, 0))));
  else orient.setFromMatrix4(new Matrix4().extractRotation(world));
  return { orient, epsilon };
}

/**
 * True refraction: each pixel of a stone follows its ray inside the stone
 * (bounces, total internal reflection) to the jeweller's lighting
 * (./diamondEnv.ts), split in three colours with the dispersion of diamond
 * (the fire); the surface also reflects the lighting as a polished facet does
 * (Fresnel, 17 % straight on, all of it at grazing angles). "high" on
 * computers (5 bounces), "light" on phones (4 bounces).
 * The light can be turned: `rotation` turns what the stone sees with it.
 */
export function refractionMaterial(geometry: BufferGeometry, env: Texture, frame: GemFrame, color = "#ffffff", quality: "high" | "light" = "high"): RefractionMaterial {
  const material = new MeshRefractionMaterial() as RefractionMaterial;
  let bvh = bvhCache.get(geometry);
  if (!bvh) {
    bvh = new MeshBVHUniformStruct();
    bvh.updateFrom(new MeshBVH(geometry.clone().toNonIndexed(), { strategy: SAH }));
    bvhCache.set(geometry, bvh);
  }
  // The fire: the green ray is traced; red and blue split from it where it leaves the stone (three full traces would
  // cost three times as much, for almost the same colours: most of the fire is made at the last facet).
  material.defines = { ...material.defines, CHROMATIC_ABERRATIONS: "", FAST_CHROMA: "" };
  let shader = material.fragmentShader
    .replace("vec3 rayDirectionR = normalize(rayDirectionG + 1.0 * vec3(aberrationStrength / 2.0));", "vec3 rayDirectionR = gemExitR;")
    .replace("vec3 rayDirectionB = normalize(rayDirectionG - 1.0 * vec3(aberrationStrength / 2.0));", "vec3 rayDirectionB = gemExitB;")
    // (The chunk of PMREM maps it includes is not needed for this flat lighting image, and gone from recent three.js.)
    .replace("#include <cube_uv_reflection_fragment>", "")
    .replace("uniform float bounces;", "uniform float bounces;\n  uniform mat3 envRotation;\n  uniform mat3 gemOrient;\n  uniform float gemEpsilon;\n  uniform float contrast;\n  uniform float gain;\n  uniform float gemDispersion;")
    .replace(
      "vec4 textureGradient(sampler2D envMap, vec3 rayDirection, vec3 directionCamPerfect) {",
      "vec4 textureGradient(sampler2D envMap, vec3 rayDirection, vec3 directionCamPerfect) {\n      rayDirection = envRotation * rayDirection;\n      directionCamPerfect = envRotation * directionCamPerfect;",
    )
    .replace("directionCamPerfect = normalize(directionCamPerfect);", "directionCamPerfect = toLighting(toStone(normalize(directionCamPerfect)));")
    .replace(
      "float nFresnel = fresnelFunc(viewDirection, normal) * fresnel;\n    gl_FragColor = vec4(mix(diffuseColor.rgb, vec3(1.0), nFresnel), diffuseColor.a);",
      [
        "vec3 reflected = textureGradient(envMap, toLighting(toStone(reflect(viewDirection, normal))), directionCamPerfect).rgb;",
        "    float facing = clamp(dot(-viewDirection, normal), 0.0, 1.0);",
        "    float schlick = 0.172 + 0.828 * pow(1.0 - facing, 5.0);",
        "    vec3 stone = mix(diffuseColor.rgb, reflected, schlick * fresnel);",
        // Facets either dark or bright, as a well-cut stone under a jeweller's light.
        "    stone = pow(max(stone, vec3(0.0)), vec3(contrast)) * gain;",
        "    gl_FragColor = vec4(stone, diffuseColor.a);",
      ].join("\n"),
    );
  const from = shader.indexOf("vec3 totalInternalReflection(");
  const to = shader.indexOf("}", shader.indexOf("return rayDirection;", from)) + 1;
  shader = shader.slice(0, from) + TRACE + shader.slice(to);
  material.fragmentShader = shader;
  material.uniforms.envRotation = { value: new Matrix3() };
  material.uniforms.gemOrient = { value: frame.orient };
  material.uniforms.gemEpsilon = { value: frame.epsilon };
  material.uniforms.contrast = { value: 1.25 };
  material.uniforms.gain = { value: 1.2 };
  // Diamond: index 2.408 for red, 2.451 for blue, about 0.9 % on each side of 2.418; a little more, as in photographs.
  material.uniforms.gemDispersion = { value: 0.012 };
  material.uniforms.envMap!.value = env;
  material.uniforms.bvh!.value = bvh;
  material.uniforms.bounces!.value = quality === "high" ? 5 : 4;
  material.uniforms.ior!.value = 2.418;
  material.uniforms.fresnel!.value = 1;
  material.uniforms.aberrationStrength!.value = 0.02;
  (material.uniforms.color!.value as Color).set(color);
  material.needsUpdate = true;
  return material;
}

const rotation = new Matrix4();

/** Keeps a refraction material in step with the camera, the turned light and the bounces of the moment. */
export function updateRefraction(material: RefractionMaterial, camera: { matrixWorld: Matrix4; projectionMatrixInverse: Matrix4 }, width: number, height: number, lightAngle: number, bounces: number): void {
  material.uniforms.bounces!.value = bounces;
  material.uniforms.viewMatrixInverse!.value = camera.matrixWorld;
  material.uniforms.projectionMatrixInverse!.value = camera.projectionMatrixInverse;
  (material.uniforms.resolution!.value as { set(x: number, y: number): void }).set(width, height);
  rotation.makeRotationY(-lightAngle);
  (material.uniforms.envRotation!.value as Matrix3).setFromMatrix4(rotation);
}

/** The rest of the jewel, dimmed, while one layer is shown in the admin. */
export const ghostMaterial = new MeshBasicMaterial({ color: "#8a8580", transparent: true, opacity: 0.08, depthWrite: false, side: DoubleSide });

export function describe(setting: LayerSetting | undefined): string {
  return setting ? setting.role + ":" + (setting.metal ?? "") + ":" + (setting.color ?? "") : "none";
}

export type { Material };
