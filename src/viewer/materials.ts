/*
 * The materials of the viewer. Metals: physically based colours (reflectance
 * of each alloy, linear values) and a polished surface. Diamonds: true
 * refraction with dispersion (rays traced inside the stone, MeshRefractionMaterial
 * of drei) on computers; on phones a lighter glass of the same index (2.42).
 */
import { BufferGeometry, Color, DoubleSide, LinearSRGBColorSpace, Matrix3, Matrix4, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, type Material, type Texture } from "three";
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
 * True refraction: each pixel of a stone follows its ray inside the stone
 * (bounces, total internal reflection) to the jeweller's lighting
 * (./diamondEnv.ts), split in three colours with the dispersion of diamond
 * (the fire); the surface also reflects the lighting as a polished facet does
 * (Fresnel, 17 % straight on, all of it at grazing angles). "high" on
 * computers (5 bounces, each colour traced on its own), "light" on phones.
 * The light can be turned: `rotation` turns what the stone sees with it.
 */
export function refractionMaterial(geometry: BufferGeometry, env: Texture, color = "#ffffff", quality: "high" | "light" = "high"): RefractionMaterial {
  const material = new MeshRefractionMaterial() as RefractionMaterial;
  let bvh = bvhCache.get(geometry);
  if (!bvh) {
    bvh = new MeshBVHUniformStruct();
    bvh.updateFrom(new MeshBVH(geometry.clone().toNonIndexed(), { strategy: SAH }));
    bvhCache.set(geometry, bvh);
  }
  material.defines = { ...material.defines, CHROMATIC_ABERRATIONS: "" };
  if (quality === "light") material.defines.FAST_CHROMA = "";
  else delete material.defines.FAST_CHROMA;
  material.fragmentShader = material.fragmentShader
    // (The chunk of PMREM maps it includes is not needed for this flat lighting image, and gone from recent three.js.)
    .replace("#include <cube_uv_reflection_fragment>", "")
    .replace("uniform float bounces;", "uniform float bounces;\n  uniform mat3 envRotation;\n  uniform float contrast;\n  uniform float gain;")
    .replace(
      "vec4 textureGradient(sampler2D envMap, vec3 rayDirection, vec3 directionCamPerfect) {",
      "vec4 textureGradient(sampler2D envMap, vec3 rayDirection, vec3 directionCamPerfect) {\n      rayDirection = envRotation * rayDirection;\n      directionCamPerfect = envRotation * directionCamPerfect;",
    )
    .replace(
      "float nFresnel = fresnelFunc(viewDirection, normal) * fresnel;\n    gl_FragColor = vec4(mix(diffuseColor.rgb, vec3(1.0), nFresnel), diffuseColor.a);",
      [
        "vec3 reflected = textureGradient(envMap, reflect(viewDirection, normal), directionCamPerfect).rgb;",
        "    float facing = clamp(dot(-viewDirection, normal), 0.0, 1.0);",
        "    float schlick = 0.172 + 0.828 * pow(1.0 - facing, 5.0);",
        "    vec3 stone = mix(diffuseColor.rgb, reflected, schlick * fresnel);",
        // Facets either dark or bright, as a well-cut stone under a jeweller's light.
        "    stone = pow(max(stone, vec3(0.0)), vec3(contrast)) * gain;",
        "    gl_FragColor = vec4(stone, diffuseColor.a);",
      ].join("\n"),
    );
  material.uniforms.envRotation = { value: new Matrix3() };
  material.uniforms.contrast = { value: 1.15 };
  material.uniforms.gain = { value: 1.3 };
  material.uniforms.envMap!.value = env;
  material.uniforms.bvh!.value = bvh;
  material.uniforms.bounces!.value = quality === "high" ? 5 : 3;
  material.uniforms.ior!.value = 2.418;
  material.uniforms.fresnel!.value = 1;
  material.uniforms.aberrationStrength!.value = quality === "high" ? 0.03 : 0.02;
  (material.uniforms.color!.value as Color).set(color);
  material.needsUpdate = true;
  return material;
}

const rotation = new Matrix4();

/** Keeps a refraction material in step with the camera and the turned light. */
export function updateRefraction(material: RefractionMaterial, camera: { matrixWorld: Matrix4; projectionMatrixInverse: Matrix4 }, width: number, height: number, lightAngle: number): void {
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
