/*
 * Small materials of the viewer: the swatch colours of the metals, the enamel, the lighter stone of slow devices (a glass
 * of the index of diamond), the dimmed rest of the jewel in the admin. The metals themselves come from the library
 * (./library/materials.ts) and the stones from ./gems.ts (26/11/2026).
 */
import { Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, type Material, type Texture } from "three";
import type { MetalId } from "@/data/models";

type MetalLook = { color: [number, number, number]; roughness: number; swatch: string };

/** Linear reflectance colours of the alloys, and the colour of their swatch (sRGB). */
export const METAL_LOOKS: Record<MetalId, MetalLook> = {
  "yellow-gold": { color: [0.96, 0.74, 0.4], roughness: 0.1, swatch: "#e9c46f" },
  "white-gold": { color: [0.84, 0.83, 0.8], roughness: 0.08, swatch: "#e4e2dc" },
  "rose-gold": { color: [0.95, 0.64, 0.53], roughness: 0.1, swatch: "#e8b4a0" },
  platinum: { color: [0.68, 0.66, 0.63], roughness: 0.12, swatch: "#bdbab4" },
  "black-rhodium": { color: [0.1, 0.1, 0.11], roughness: 0.16, swatch: "#2b2a2c" },
  // 14 carats (26/11/2026): a little less gold in the alloy, a paler colour.
  "yellow-gold-14": { color: [0.93, 0.76, 0.48], roughness: 0.1, swatch: "#e6c98a" },
  "white-gold-14": { color: [0.82, 0.8, 0.76], roughness: 0.09, swatch: "#dedbd3" },
  "rose-gold-14": { color: [0.94, 0.67, 0.57], roughness: 0.1, swatch: "#e9bcab" },
  palladium: { color: [0.73, 0.7, 0.65], roughness: 0.11, swatch: "#c4c0b8" },
  silver: { color: [0.97, 0.96, 0.92], roughness: 0.08, swatch: "#efede8" },
};

/** Colours a coloured stone can take (no blue: the house colours). */
export const STONE_COLORS = ["#ffffff", "#9b111e", "#0b6e4f", "#e75480", "#f2c14e", "#1c1c1c"] as const;

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

/** The rest of the jewel, dimmed, while one layer is shown in the admin. */
export const ghostMaterial = new MeshBasicMaterial({ color: "#8a8580", transparent: true, opacity: 0.08, depthWrite: false, side: DoubleSide });


export type { Material };
