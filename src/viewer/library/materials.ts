/*
 * The library of materials of the 3D editor (26/11/2026), its « Bibliothèque de matières »: the metals in five finishes,
 * enamels, pearls with their orient, lacquered ceramic, onyx, mother-of-pearl — MeshPhysicalMaterial with physically
 * based values, their textures made by code (../textures.ts) — and the stones, given as settings of the stones' own
 * renderer (../gems.ts), which draws them.
 * Each entry is plain data (`spec`) and the function that builds it, so that any material, as it is or retouched, can
 * be saved to a .json file and read back (`exportMaterial`, `importMaterial`).
 * The textured finishes need UVs in metres on the jewel (../textures.ts `projectUv` for a file that has none).
 */
import { Color, LinearSRGBColorSpace, MeshPhysicalMaterial, type Material, type Texture } from "three";
import { METALS, type LayerSetting, type MetalId } from "@/data/models";
import { DEFAULT_DIAMOND, type DiamondParams } from "@/data/scene3d";
import { agedColor, agedRoughness, brushedNormal, hammeredNormal, nacreOrient, pearlOrient, tiled } from "../textures";

export type MaterialCategory = "metals" | "gems" | "pearls" | "other";
export const CATEGORY_NAMES: Record<MaterialCategory, string> = { metals: "Métaux", gems: "Pierres", pearls: "Perles et nacre", other: "Émaux, céramique, onyx" };

/* ---------- Textures owned by a material ---------- */

const OWN = "bereteTextures";

/** Forgets (and frees) the textures a material of the library made for itself. */
function release(material: Material): void {
  const own = material.userData[OWN] as Texture[] | undefined;
  if (own) for (const texture of own) texture.dispose();
  material.userData[OWN] = [];
}

function own(material: Material, texture: Texture): Texture {
  ((material.userData[OWN] as Texture[] | undefined) ?? (material.userData[OWN] = [])).push(texture);
  return texture;
}

/** Frees a material of the library and the textures it made for itself (the shared masters stay). */
export function disposeMaterial(material: Material): void {
  release(material);
  material.dispose();
}

/* ---------- Metals ---------- */

export type MetalFinish = NonNullable<LayerSetting["finish"]>;
export type FinishKind = MetalFinish["kind"];
export const FINISHES: readonly FinishKind[] = ["polished", "satin", "brushed", "hammered", "aged"];
export const FINISH_NAMES: Record<FinishKind, string> = { polished: "poli", satin: "satiné", brushed: "brossé", hammered: "martelé", aged: "vieilli" };

export const METAL_NAMES: Record<MetalId, string> = {
  "yellow-gold": "Or jaune 18 ct",
  "white-gold": "Or blanc 18 ct",
  "rose-gold": "Or rose 18 ct",
  platinum: "Platine",
  "black-rhodium": "Rhodium noir",
  "yellow-gold-14": "Or jaune 14 ct",
  "white-gold-14": "Or blanc 14 ct",
  "rose-gold-14": "Or rose 14 ct",
  palladium: "Palladium",
  silver: "Argent",
};

/**
 * Linear reflectance of each alloy (F0, what a metal reflects straight on), the colour of its swatch (sRGB) and the
 * roughness of its polished finish: the same values as METAL_LOOKS of ../materials.ts, so nothing changes for a metal
 * already shown (one table can be made from the other).
 */
export const METAL_COLORS: Record<MetalId, { linear: [number, number, number]; swatch: string; roughness: number }> = {
  "yellow-gold": { linear: [0.96, 0.74, 0.4], swatch: "#e9c46f", roughness: 0.1 },
  "white-gold": { linear: [0.84, 0.83, 0.8], swatch: "#e4e2dc", roughness: 0.08 },
  "rose-gold": { linear: [0.95, 0.64, 0.53], swatch: "#e8b4a0", roughness: 0.1 },
  platinum: { linear: [0.68, 0.66, 0.63], swatch: "#bdbab4", roughness: 0.12 },
  "black-rhodium": { linear: [0.1, 0.1, 0.11], swatch: "#2b2a2c", roughness: 0.16 },
  "yellow-gold-14": { linear: [0.93, 0.76, 0.48], swatch: "#e6c98a", roughness: 0.1 },
  "white-gold-14": { linear: [0.82, 0.8, 0.76], swatch: "#dedbd3", roughness: 0.09 },
  "rose-gold-14": { linear: [0.94, 0.67, 0.57], swatch: "#e9bcab", roughness: 0.1 },
  palladium: { linear: [0.73, 0.7, 0.65], swatch: "#c4c0b8", roughness: 0.11 },
  silver: { linear: [0.97, 0.96, 0.92], swatch: "#efede8", roughness: 0.08 },
};

/** Size of one repetition of each finish's texture on the jewel (metres): hammer dents of about 1.6 mm, lines of a few µm. */
const HAMMER_TILE = 0.016;
const BRUSH_TILE = 0.004;
const AGED_TILE = 0.012;

/**
 * Gives a material the look of a metal in a finish, in place (its own textures of before are freed).
 * Brushed: the light of a brushed metal is stretched across its lines, which the material's anisotropy draws (the
 * roughness across the lines much higher than along them); at a jeweller's distance the lines themselves are far finer
 * than a pixel, so a normal map alone would only shimmer or vanish in its mipmaps. A faint map of lines is added for the
 * close-ups. `angle` (degrees) turns both, in the UVs of the jewel (0: the lines along u).
 */
export function setMetalLook(material: MeshPhysicalMaterial, metal: MetalId, finish: MetalFinish = { kind: "polished" }): void {
  const look = METAL_COLORS[metal] ?? METAL_COLORS["yellow-gold"];
  release(material);
  material.metalness = 1;
  material.color.setRGB(...look.linear, LinearSRGBColorSpace);
  material.envMapIntensity = 1.15;
  material.map = null;
  material.normalMap = null;
  material.roughnessMap = null;
  material.normalScale.set(1, 1);
  material.anisotropy = 0;
  material.anisotropyRotation = 0;
  const angle = Number.isFinite(finish.angle) ? (finish.angle as number) : 0;
  switch (finish.kind) {
    case "satin":
      material.roughness = Math.min(0.48, look.roughness + 0.26);
      break;
    case "brushed":
      material.roughness = 0.24;
      material.anisotropy = 0.8;
      // Across the lines. three.js measures it in the tangent frame of the normal map, whose UVs already turn by the
      // angle (the map's rotation): the angle is given once, to the map, and both turn together.
      material.anisotropyRotation = Math.PI / 2;
      material.normalMap = own(material, tiled(brushedNormal(), BRUSH_TILE, angle));
      material.normalScale.set(0.2, 0.2);
      break;
    case "hammered":
      material.roughness = look.roughness + 0.03;
      material.normalMap = own(material, tiled(hammeredNormal(), HAMMER_TILE));
      material.normalScale.set(0.75, 0.75);
      break;
    case "aged":
      // The roughness map gives the whole roughness (×1); the colour map darkens the metal in its patina.
      material.roughness = 1;
      material.roughnessMap = own(material, tiled(agedRoughness(), AGED_TILE));
      material.map = own(material, tiled(agedColor(), AGED_TILE));
      break;
    default:
      material.roughness = look.roughness;
  }
  material.userData.metal = metal;
  material.userData.finish = finish.kind === "brushed" ? { kind: finish.kind, angle } : { kind: finish.kind };
  material.needsUpdate = true;
}

export function makeMetal(metal: MetalId, finish: MetalFinish = { kind: "polished" }): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({ metalness: 1 });
  material.name = "metal/" + metal + "/" + finish.kind;
  setMetalLook(material, metal, finish);
  return material;
}

/* ---------- Enamels and other materials ---------- */

/** A vitreous enamel: the colour under a glassy clear coat. */
export function makeEnamel(color: string, roughness = 0.3): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({ name: "enamel", color: new Color(color), metalness: 0, roughness, clearcoat: 1, clearcoatRoughness: 0.04, ior: 1.52 });
}

/** The settings of a pearl, of lacquered ceramic, of onyx, of mother-of-pearl. */
export type PhysicalSpec = {
  kind: "physical";
  color: string;
  roughness: number;
  metalness: number;
  ior: number;
  specularIntensity: number;
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenColor: string;
  sheenRoughness: number;
  /** The orient: thin layers of nacre that colour the light they reflect. */
  iridescence: number;
  iridescenceIOR: number;
  /** nm: the thinnest and the thickest layers; the orient map moves between them (without a map: the thickest). */
  iridescenceThickness: [number, number];
  /** Where the layers are thicker: "pearl", soft clouds; "nacre", wavy bands; "none". */
  orient: "pearl" | "nacre" | "none";
  /** Size of one repetition of the orient map, metres. */
  orientScale: number;
};

const PHYSICAL: PhysicalSpec = {
  kind: "physical",
  color: "#ffffff",
  roughness: 0.3,
  metalness: 0,
  ior: 1.5,
  specularIntensity: 1,
  clearcoat: 0,
  clearcoatRoughness: 0.05,
  sheen: 0,
  sheenColor: "#ffffff",
  sheenRoughness: 0.5,
  iridescence: 0,
  iridescenceIOR: 1.6,
  iridescenceThickness: [300, 400],
  orient: "none",
  orientScale: 0.01,
};

export function makePhysical(spec: PhysicalSpec): MeshPhysicalMaterial {
  const material = new MeshPhysicalMaterial({
    color: new Color(spec.color),
    roughness: spec.roughness,
    metalness: spec.metalness,
    ior: spec.ior,
    specularIntensity: spec.specularIntensity,
    clearcoat: spec.clearcoat,
    clearcoatRoughness: spec.clearcoatRoughness,
    sheen: spec.sheen,
    sheenColor: new Color(spec.sheenColor),
    sheenRoughness: spec.sheenRoughness,
    iridescence: spec.iridescence,
    iridescenceIOR: spec.iridescenceIOR,
    iridescenceThicknessRange: [spec.iridescenceThickness[0], spec.iridescenceThickness[1]],
  });
  if (spec.iridescence > 0 && spec.orient !== "none") material.iridescenceThicknessMap = own(material, tiled(spec.orient === "nacre" ? nacreOrient() : pearlOrient(), spec.orientScale));
  return material;
}

/* ---------- Stones ---------- */

/**
 * The colour of a tinted stone as the stones' renderer makes it: exp(−absorption × path × (1 − tint) × 3), the path in
 * sizes of the stone (../gems.ts). From the colour the stone should show where the light has travelled 1.5 times its
 * size (a deep colour, not black: shorter paths lighter, longer ones darker, as in a real cut stone), the tint and the
 * density that give it.
 */
const REFERENCE_PATH = 1.5;
function tinted(target: string): Pick<DiamondParams, "color" | "absorption"> {
  const c = new Color(target);
  const density = [c.r, c.g, c.b].map((v) => -Math.log(Math.max(v, 1e-4)));
  // The most absorbed channel keeps a little tint (0.08), so the darkest colour is not reached at once.
  const absorption = Math.max(0.05, Math.max(...density) / (3 * REFERENCE_PATH * 0.92));
  const tint = density.map((d) => Math.min(1, Math.max(0, 1 - d / (3 * REFERENCE_PATH * absorption))));
  return { color: "#" + new Color().setRGB(tint[0]!, tint[1]!, tint[2]!, LinearSRGBColorSpace).getHexString(), absorption: Math.round(absorption * 1000) / 1000 };
}

const CORUNDUM = { refractiveIndex: 1.77, dispersion: 0.0035 };
const STONES: { id: string; name: string; colour: string; gem: Partial<DiamondParams> }[] = [
  { id: "gem/diamond", name: "Diamant", colour: "#ffffff", gem: { color: "#ffffff", absorption: 0, dispersion: DEFAULT_DIAMOND.dispersion } },
  { id: "gem/diamond-no-fire", name: "Diamant sans dispersion", colour: "#f2f2f2", gem: { color: "#ffffff", absorption: 0, dispersion: 0 } },
  { id: "gem/diamond-yellow", name: "Diamant jaune", colour: "#f4cc48", gem: { ...tinted("#f4cc48"), dispersion: DEFAULT_DIAMOND.dispersion } },
  { id: "gem/diamond-pink", name: "Diamant rose", colour: "#efa0b4", gem: { ...tinted("#efa0b4"), dispersion: DEFAULT_DIAMOND.dispersion } },
  { id: "gem/diamond-champagne", name: "Diamant champagne", colour: "#d6ae86", gem: { ...tinted("#d6ae86"), dispersion: DEFAULT_DIAMOND.dispersion } },
  // Black: opaque to the eye, a mirror surface: almost no light comes back from inside.
  { id: "gem/diamond-black", name: "Diamant noir", colour: "#141414", gem: { color: "#050505", absorption: 8, transmission: 0, reflectivity: 0.85, dispersion: 0, envIntensity: 1.2 } },
  // Corundum (index 1.76–1.77, dispersion 0.018 against 0.044 for diamond), emerald (1.57, 0.014).
  { id: "gem/sapphire-blue", name: "Saphir bleu", colour: "#1d3c9e", gem: { ...tinted("#1d3c9e"), ...CORUNDUM } },
  { id: "gem/sapphire-pink", name: "Saphir rose", colour: "#e2558f", gem: { ...tinted("#e2558f"), ...CORUNDUM } },
  { id: "gem/ruby", name: "Rubis", colour: "#b0102c", gem: { ...tinted("#b0102c"), ...CORUNDUM } },
  { id: "gem/emerald", name: "Émeraude", colour: "#0f7f4c", gem: { ...tinted("#0f7f4c"), refractiveIndex: 1.57, dispersion: 0.0025 } },
];
const INCLUSIONS = { amount: 0.3, scale: 1, roughness: 0.5 };

/* ---------- Swatches (CSS, while the 3D swatch is not drawn) ---------- */

const mix = (hex: string, toward: string, k: number) => {
  const a = new Color(hex);
  const b = new Color(toward);
  return "#" + a.lerp(b, k).getHexString();
};

function metalSwatch(metal: MetalId, kind: FinishKind): string {
  const base = METAL_COLORS[metal].swatch;
  const light = mix(base, "#ffffff", 0.55);
  const dark = mix(base, "#000000", kind === "aged" ? 0.7 : 0.45);
  const body = "linear-gradient(135deg, " + light + " 0%, " + base + " 42%, " + dark + " 100%)";
  if (kind === "polished") return "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.75) 0 7%, rgba(255,255,255,0) 22%), " + body;
  if (kind === "brushed") return "repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0 1px, rgba(0,0,0,0.08) 1px 2px), " + body;
  if (kind === "hammered") return "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.3) 0 18%, rgba(0,0,0,0.12) 52%) 0 0 / 9px 9px, " + body;
  if (kind === "aged") return "radial-gradient(circle at 60% 60%, rgba(0,0,0,0.35) 0, rgba(0,0,0,0) 60%), " + body;
  return body;
}

const glossy = (colour: string) => "radial-gradient(circle at 32% 28%, " + mix(colour, "#ffffff", 0.75) + " 0%, " + colour + " 38%, " + mix(colour, "#000000", 0.6) + " 100%)";
const gemSwatch = (colour: string) => "radial-gradient(circle at 35% 30%, #ffffff 0%, " + mix(colour, "#ffffff", 0.4) + " 16%, " + colour + " 52%, " + mix(colour, "#000000", 0.55) + " 100%)";

/* ---------- The entries ---------- */

export type MetalSpec = { kind: "metal"; metal: MetalId; finish: MetalFinish };
export type EnamelSpec = { kind: "enamel"; color: string; roughness: number };
export type GemSpec = { kind: "gem"; gem: Partial<DiamondParams> };
export type MaterialSpec = MetalSpec | EnamelSpec | PhysicalSpec | GemSpec;

type EntryBase = { id: string; name: string; category: MaterialCategory; /** CSS colour or gradient */ swatch: string };
/** A material the editor builds (metals, enamels, pearls...). */
export type MaterialEntry = EntryBase & { spec: MetalSpec | EnamelSpec | PhysicalSpec; make(): Material; gem?: undefined };
/** A stone: settings for the stones' renderer. */
export type GemEntry = EntryBase & { spec: GemSpec; gem: Partial<DiamondParams>; make?: undefined };
export type LibraryEntry = MaterialEntry | GemEntry;

/** The material of a spec (not a stone). */
export function buildMaterial(spec: MetalSpec | EnamelSpec | PhysicalSpec): Material {
  if (spec.kind === "metal") return makeMetal(spec.metal, spec.finish);
  if (spec.kind === "enamel") return makeEnamel(spec.color, spec.roughness);
  return makePhysical(spec);
}

function entry(id: string, name: string, category: MaterialCategory, swatch: string, spec: MetalSpec | EnamelSpec | PhysicalSpec): MaterialEntry {
  const made: MaterialEntry = { id, name, category, swatch, spec, make: () => buildMaterial(made.spec) };
  return made;
}

function physical(id: string, name: string, category: MaterialCategory, over: Partial<PhysicalSpec>, swatch?: string): MaterialEntry {
  const spec: PhysicalSpec = { ...PHYSICAL, ...over, kind: "physical" };
  return entry(id, name, category, swatch ?? glossy(spec.color), spec);
}

const ENTRIES: LibraryEntry[] = [
  ...METALS.flatMap((metal) =>
    FINISHES.map((kind) =>
      entry("metal/" + metal + "/" + kind, METAL_NAMES[metal] + " · " + FINISH_NAMES[kind], "metals", metalSwatch(metal, kind), {
        kind: "metal",
        metal,
        finish: kind === "brushed" ? { kind, angle: 0 } : { kind },
      }),
    ),
  ),
  ...STONES.flatMap(({ id, name, colour, gem }): GemEntry[] => [
    { id, name, category: "gems", swatch: gemSwatch(colour), spec: { kind: "gem", gem }, gem },
    { id: id + "/inclusions", name: name + " · inclusions", category: "gems", swatch: gemSwatch(mix(colour, "#808080", 0.25)), spec: { kind: "gem", gem: { ...gem, inclusions: INCLUSIONS } }, gem: { ...gem, inclusions: INCLUSIONS } },
  ]),
  // Pearls: a soft lustre (a rough body under a clear, glossy skin, a little of a mirror in it: the layers of nacre reflect),
  // a rosy sheen at the edges, and the orient: thin-film colours over the pearl, moving with its orient map. The film's
  // index (1.3) is kept apart from the pearl's (1.6): with the two alike, a thin film gives no colour at all.
  physical(
    "pearl/white",
    "Perle blanche",
    "pearls",
    { color: "#c9c0b6", roughness: 0.3, metalness: 0.3, ior: 1.6, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 1, sheenColor: "#f2cfcb", sheenRoughness: 0.3, iridescence: 1, iridescenceIOR: 1.3, iridescenceThickness: [300, 460], orient: "pearl", orientScale: 0.008 },
    glossy("#efe7de"),
  ),
  physical(
    "pearl/cream",
    "Perle crème",
    "pearls",
    { color: "#d2bf9e", roughness: 0.32, metalness: 0.22, ior: 1.6, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 1, sheenColor: "#f1d3b4", sheenRoughness: 0.35, iridescence: 0.9, iridescenceIOR: 1.3, iridescenceThickness: [330, 480], orient: "pearl", orientScale: 0.008 },
    glossy("#e9d6b4"),
  ),
  // Tahiti: a dark grey body, a peacock overtone, green to aubergine-rose (layers of 430–560 nm; no plain blue).
  physical(
    "pearl/tahiti",
    "Perle noire de Tahiti",
    "pearls",
    { color: "#2e312e", roughness: 0.26, metalness: 0.3, ior: 1.6, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.7, sheenColor: "#6f8c76", sheenRoughness: 0.4, iridescence: 0.85, iridescenceIOR: 1.3, iridescenceThickness: [430, 560], orient: "pearl", orientScale: 0.008 },
    "radial-gradient(circle at 32% 28%, #c9d6c4 0%, #5d6b5c 30%, #3a2f38 70%, #141414 100%)",
  ),
  physical(
    "pearl/nacre",
    "Nacre",
    "pearls",
    { color: "#dcd8d2", roughness: 0.14, metalness: 0.6, ior: 1.53, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.3, sheenColor: "#ffffff", sheenRoughness: 0.4, iridescence: 1, iridescenceIOR: 1.3, iridescenceThickness: [280, 560], orient: "nacre", orientScale: 0.016 },
    "linear-gradient(135deg, #f6f3ee 0%, #e9e2f0 30%, #e2efe9 55%, #f3e6dc 80%, #d8d4cc 100%)",
  ),
  ...(
    [
      ["enamel/black", "Émail noir", "#0b0b0b"],
      ["enamel/white", "Émail blanc", "#f4f2ef"],
      ["enamel/red", "Émail rouge", "#9b111e"],
      ["enamel/green", "Émail vert", "#0b6e4f"],
      ["enamel/pink", "Émail rose", "#df7b95"],
    ] as const
  ).map(([id, name, color]) => entry(id, name, "other", glossy(color), { kind: "enamel", color, roughness: 0.3 })),
  physical("ceramic/black", "Céramique laquée noire", "other", { color: "#0a0a0a", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.03 }),
  physical("ceramic/white", "Céramique laquée blanche", "other", { color: "#f4f2ef", roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.04 }),
  physical("onyx", "Onyx", "other", { color: "#060606", roughness: 0.06, ior: 1.54, clearcoat: 0.6, clearcoatRoughness: 0.02 }),
];

const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export function materialById(id: string): LibraryEntry | undefined {
  return BY_ID.get(id);
}

export function libraryOf(category: MaterialCategory): LibraryEntry[] {
  return ENTRIES.filter((e) => e.category === category);
}

/** Every entry, in the order of the library. */
export function library(): readonly LibraryEntry[] {
  return ENTRIES;
}

/* ---------- Overrides, saving and reading back ---------- */

export const MATERIAL_FORMAT = "berete-material";
export const MATERIAL_VERSION = 1;

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v);

/** What a value may be, by its key: the range of a number. */
const RANGES: Record<string, [number, number]> = {
  roughness: [0, 1],
  metalness: [0, 1],
  ior: [1, 2.333],
  specularIntensity: [0, 1],
  clearcoat: [0, 1],
  clearcoatRoughness: [0, 1],
  sheen: [0, 1],
  sheenRoughness: [0, 1],
  iridescence: [0, 1],
  iridescenceIOR: [1, 2.333],
  iridescenceThickness: [0, 2000],
  orientScale: [0.0005, 1],
  angle: [-360, 360],
  envIntensity: [0, 10],
  envRotation: [-360, 360],
  envRotationXYZ: [-360, 360],
  dispersion: [0, 0.1],
  absorption: [0, 50],
  refractiveIndex: [1, 3.5],
  gamma: [0.1, 4],
  boost: [0, 10],
  transmission: [0, 1],
  reflectivity: [0, 1],
  rayBounces: [1, 12],
  orientedLighting: [0, 1],
  amount: [0, 1],
  scale: [0.01, 100],
};
const CHOICES: Record<string, readonly string[]> = { orient: ["pearl", "nacre", "none"], mode: ["auto", "trace", "fast"] };
/** Given by the id, never changed by a file: what the material is. */
const FIXED = new Set(["kind", "metal", "finish.kind"]);
const COLOUR = /^#[0-9a-f]{6}$/i;

/** `value` if it has the shape of `reference` (numbers in their range, colours #rrggbb...), else undefined. */
function clean(value: unknown, reference: unknown, key: string, path: string): unknown {
  if (FIXED.has(path)) return undefined;
  if (key === "inclusions") {
    if (value === null) return null;
    if (!isPlain(value)) return undefined;
    return clean(value, INCLUSIONS, "", path);
  }
  if (key === "env") return value === null || (typeof value === "string" && /^[a-z0-9-]{1,40}$/.test(value)) ? value : undefined;
  if (typeof reference === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    const range = RANGES[key];
    const v = range ? Math.min(range[1], Math.max(range[0], value)) : value;
    return key === "rayBounces" ? Math.round(v) : v;
  }
  if (typeof reference === "boolean") return typeof value === "boolean" ? value : undefined;
  if (typeof reference === "string") {
    if (typeof value !== "string") return undefined;
    if (CHOICES[key]) return CHOICES[key].includes(value) ? value : undefined;
    if (COLOUR.test(reference)) return COLOUR.test(value) ? value.toLowerCase() : undefined;
    return undefined;
  }
  if (Array.isArray(reference)) {
    if (!Array.isArray(value) || value.length !== reference.length) return undefined;
    const items = value.map((v, i) => clean(v, reference[i], key, path));
    return items.every((v) => v !== undefined) ? items : undefined;
  }
  if (isPlain(reference)) {
    if (!isPlain(value)) return undefined;
    const out: Plain = {};
    for (const [k, ref] of Object.entries(reference)) {
      if (!(k in value)) continue;
      const v = clean(value[k], ref, k, path ? path + "." + k : k);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return undefined;
}

/** The shape every override of an entry is checked against (a stone: all the settings of a stone). */
function referenceOf(entry: LibraryEntry): Plain {
  if (entry.spec.kind === "gem") return { kind: "gem", gem: { ...DEFAULT_DIAMOND, ...entry.spec.gem } };
  if (entry.spec.kind === "metal") return { ...entry.spec, finish: { kind: entry.spec.finish.kind, angle: entry.spec.finish.angle ?? 0 } };
  return entry.spec as Plain;
}

function deepMerge(base: Plain, over: Plain): Plain {
  const out: Plain = { ...base };
  for (const [k, v] of Object.entries(over)) out[k] = isPlain(v) && isPlain(base[k]) ? deepMerge(base[k] as Plain, v) : v;
  return out;
}

/** What `value` changes of `base` (same shape), deeply; null when nothing. */
function difference(value: Plain, base: Plain, fallback: Plain): Plain | null {
  const out: Plain = {};
  for (const [k, v] of Object.entries(value)) {
    const was = k in base ? base[k] : fallback[k];
    if (isPlain(v) && isPlain(was)) {
      const d = difference(v, was, isPlain(fallback[k]) ? (fallback[k] as Plain) : {});
      if (d) out[k] = d;
    } else if (JSON.stringify(v) !== JSON.stringify(was)) out[k] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** The spec of an entry with overrides (checked: whatever has not the right shape is left out). */
export function withOverrides(entry: LibraryEntry, overrides: unknown): MaterialSpec {
  const checked = clean(overrides, referenceOf(entry), "", "");
  return (isPlain(checked) ? deepMerge(entry.spec as Plain, checked) : entry.spec) as MaterialSpec;
}

/** A material of the library with overrides: built (metals, pearls...) or the settings of a stone; null for an unknown id. */
export function materialFrom(id: string, overrides: unknown = {}): { material: Material } | { gem: Partial<DiamondParams> } | null {
  const found = materialById(id);
  if (!found) return null;
  const spec = withOverrides(found, overrides);
  return spec.kind === "gem" ? { gem: spec.gem } : { material: buildMaterial(spec) };
}

/**
 * A material as a .json file: { "format": "berete-material", "version": 1, "id": "...", "name": "...", "params": {...} },
 * the params being the whole spec of the material with its overrides (a metal's metal and finish come from its id).
 */
export function exportMaterial(input: LibraryEntry | { id: string; overrides?: unknown }): string {
  const found = "spec" in input ? input : materialById(input.id);
  const params = found ? withOverrides(found, "spec" in input ? {} : input.overrides) : {};
  return JSON.stringify({ format: MATERIAL_FORMAT, version: MATERIAL_VERSION, id: found?.id ?? String(input.id), name: found?.name ?? "", params }, null, 2);
}

export type ImportResult = { id: string; overrides: Plain } | { error: string };

/**
 * Reads a material file (its text, or the object already parsed): the id of the library and what the file changes of
 * it. Never throws: a file that is not a material, of a newer version or of an unknown material gives an error, in
 * French, for the editor to show; values of the wrong kind or out of range are left out or brought within range.
 */
export function importMaterial(json: unknown): ImportResult {
  let data: unknown = json;
  if (typeof json === "string") {
    try {
      data = JSON.parse(json);
    } catch {
      return { error: "Fichier illisible : ce n’est pas un fichier de matière (JSON)." };
    }
  }
  if (!isPlain(data) || data.format !== MATERIAL_FORMAT) return { error: "Ce fichier n’est pas une matière Berete." };
  if (typeof data.version !== "number" || data.version < 1) return { error: "Version du fichier de matière inconnue." };
  if (data.version > MATERIAL_VERSION) return { error: "Ce fichier vient d’une version plus récente de l’éditeur." };
  if (typeof data.id !== "string") return { error: "Le fichier ne dit pas de quelle matière il s’agit." };
  const found = materialById(data.id);
  if (!found) return { error: "Matière inconnue dans la bibliothèque : « " + data.id.slice(0, 80) + " »." };
  const checked = clean(isPlain(data.params) ? data.params : {}, referenceOf(found), "", "");
  const overrides = isPlain(checked) ? difference(checked, found.spec as Plain, referenceOf(found)) : null;
  return { id: found.id, overrides: overrides ?? {} };
}
