/*
 * Small materials of the viewer: the swatch colours of the metals, the enamel, the lighter stone of slow devices (a glass
 * of the index of diamond), the dimmed rest of the jewel in the admin. The metals themselves come from the library
 * (./library/materials.ts) and the stones from ./gems.ts (26/11/2026).
 */
import { Color, DoubleSide, MeshBasicMaterial, MeshPhysicalMaterial, type Material, type Texture } from "three";
import type { MetalId } from "@/data/models";

type MetalLook = { color: [number, number, number]; roughness: number; swatch: string };

/** Linear reflectance colours of the alloys, and the colour of their swatch (sRGB). */
/*
 * The colour of each metal is its reflectance seen straight on (F0, linear RGB), from measurements (27/11/2026):
 *  - 18 ct yellow gold = the ISO 8654 colour « 3N » (yellow), 18 ct rose gold = « 5N » (red): nominal CIELAB of ISO 8654:2018
 *    Amd 1:2019 (3N: L* 89.1, a* 5.74, b* 23.05; 5N: L* 87.0, a* 9.51, b* 18.11, D65), turned into linear sRGB;
 *  - platinum [0.765, 0.730, 0.676], palladium [0.734, 0.704, 0.662], silver [0.991, 0.985, 0.974]: physicallybased.info
 *    (from the optical constants of refractiveindex.info: Pt Werner, Pd Palm, Ag Babar);
 *  - white gold is sold rhodium plated: rhodium reflects about 78 % of the light across the visible, a hair less in the blue
 *    (Palik, Handbook of Optical Constants of Solids: rhodium) → [0.78, 0.78, 0.76];
 *  - 14 ct: no published colour found; derived: the 18 ct colour moved 30 % towards silver (yellow, less gold in the alloy),
 *    25 % towards copper (rose: more copper), 15 % towards palladium (white, plated alike);
 *  - black rhodium: no published reflectance found; a dark plating that sends back about a sixth of the light, neutral.
 * The swatches stay as the eye sees the metal in a jewel (more contrasted than its F0), for choosing.
 */
export const METAL_LOOKS: Record<MetalId, MetalLook> = {
  "yellow-gold": { color: [0.967, 0.706, 0.458], roughness: 0.1, swatch: "#e9c46f" },
  "white-gold": { color: [0.78, 0.78, 0.76], roughness: 0.08, swatch: "#e4e2dc" },
  "rose-gold": { color: [0.946, 0.649, 0.48], roughness: 0.1, swatch: "#e8b4a0" },
  platinum: { color: [0.765, 0.73, 0.676], roughness: 0.12, swatch: "#bdbab4" },
  "black-rhodium": { color: [0.16, 0.16, 0.17], roughness: 0.18, swatch: "#2b2a2c" },
  "yellow-gold-14": { color: [0.974, 0.79, 0.613], roughness: 0.1, swatch: "#e6c98a" },
  "white-gold-14": { color: [0.773, 0.768, 0.745], roughness: 0.09, swatch: "#dedbd3" },
  "rose-gold-14": { color: [0.943, 0.643, 0.49], roughness: 0.1, swatch: "#e9bcab" },
  palladium: { color: [0.734, 0.704, 0.662], roughness: 0.11, swatch: "#c4c0b8" },
  silver: { color: [0.991, 0.985, 0.974], roughness: 0.08, swatch: "#efede8" },
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
