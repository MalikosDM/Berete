/*
 * The names the 3D editor shows (French, simple) and its complete scenes ("Ambiances", like iJewel's Scene Presets):
 * each sets both lightings, the background, the ground and a few effects at once.
 */
import type { Background, MetalId, ModelSettings } from "@/data/models";
import { DEFAULT_POST, DEFAULT_SCENE, merged, type Ease, type GroundPreset, type PoseKind, type SceneSettings, type StandId, type ToneMap } from "@/data/scene3d";

export type ScenePreset = { id: string; name: string; description: string; background: Background; scene: Partial<SceneSettings> & { post?: Partial<SceneSettings["post"]> } };

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: "studio-berete",
    name: "Studio Berete",
    description: "Le studio chaud de la maison : le métal doux, les pierres vives, une ombre légère.",
    background: "studio-dark",
    scene: { envMetal: { id: "studio-warm", rotation: 0, intensity: 1 }, envGem: { id: "gem-studio", rotation: 0, intensity: 1 }, ground: { preset: "contact" } as SceneSettings["ground"] },
  },
  {
    id: "vitrine",
    name: "Vitrine",
    description: "Comme dans la vitrine d'un joaillier : spots au plafond, un sol qui reflète la pièce.",
    background: "black",
    scene: { envMetal: { id: "three-point", rotation: 0, intensity: 1 }, envGem: { id: "gem-vitrine", rotation: 0, intensity: 1 }, ground: { preset: "reflective" } as SceneSettings["ground"] },
  },
  {
    id: "noir-profond",
    name: "Noir profond",
    description: "Tout noir, une seule lumière : des éclats rares et francs, un contraste fort.",
    background: "black",
    scene: { envMetal: { id: "studio-dark", rotation: 0, intensity: 1 }, envGem: { id: "gem-spot", rotation: 0, intensity: 1.1 }, ground: { preset: "none" } as SceneSettings["ground"], post: { vignette: { enabled: true, offset: 0.3, darkness: 0.6 } } as SceneSettings["post"] },
  },
  {
    id: "lumiere-du-jour",
    name: "Lumière du jour",
    description: "Un fond clair, la lumière neutre d'un ciel doux, une ombre très douce.",
    background: "studio-light",
    scene: { envMetal: { id: "daylight", rotation: 0, intensity: 1 }, envGem: { id: "gem-bands", rotation: 0, intensity: 1 }, ground: { preset: "soft" } as SceneSettings["ground"] },
  },
  {
    id: "contre-jour",
    name: "Contre-jour",
    description: "La lumière derrière la pièce : ses contours s'allument sur un fond sombre.",
    background: "studio-dark",
    scene: { envMetal: { id: "backlight", rotation: 0, intensity: 1 }, envGem: { id: "gem-backlight", rotation: 0, intensity: 1 }, ground: { preset: "contact" } as SceneSettings["ground"] },
  },
  {
    id: "editorial",
    name: "Éditorial marbre",
    description: "Le marbre noir de la maison, de grandes lumières douces : une image de magazine.",
    background: "marble",
    scene: { envMetal: { id: "softbox-wide", rotation: 0, intensity: 1 }, envGem: { id: "gem-points", rotation: 0, intensity: 1 }, ground: { preset: "soft" } as SceneSettings["ground"], post: { vignette: { enabled: true, offset: 0.4, darkness: 0.4 } } as SceneSettings["post"] },
  },
];

export const GROUND_NAMES: Record<GroundPreset, string> = { none: "Aucun sol", soft: "Ombre douce", contact: "Ombre de contact", reflective: "Sol réfléchissant" };
export const POSE_NAMES: Record<PoseKind, string> = { auto: "Telle que le fichier", flat: "À plat", standing: "Debout", angle: "En angle" };
export const STAND_NAMES_FR: Record<StandId, string> = { "ring-box": "Écrin à bague ouvert", display: "Présentoir", cone: "Cône", marble: "Socle en marbre noir Berete", bust: "Buste pour pendentif" };
export const TONEMAP_NAMES: Record<ToneMap, string> = { aces: "ACES Filmic (conseillé)", agx: "AgX", neutral: "Neutre (Neutral)", linear: "Linéaire", reinhard: "Reinhard", cineon: "Cineon", uncharted2: "Uncharted 2" };
export const EASE_NAMES: Record<Ease, string> = { easeInOutSine: "Douce (conseillé)", linear: "Constante", easeInOutQuad: "Douce, plus marquée", easeInOutCubic: "Très douce", easeOutCubic: "Rapide puis lente", easeInOutQuart: "Lente aux deux bouts", easeOutExpo: "Très rapide puis lente" };
export const METAL_NAMES_FR: Record<string, string> = {
  "yellow-gold": "Or jaune 18 carats",
  "white-gold": "Or blanc 18 carats",
  "rose-gold": "Or rose 18 carats",
  platinum: "Platine",
  "black-rhodium": "Rhodium noir",
  "yellow-gold-14": "Or jaune 14 carats",
  "white-gold-14": "Or blanc 14 carats",
  "rose-gold-14": "Or rose 14 carats",
  palladium: "Palladium",
  silver: "Argent",
};
export const FINISH_NAMES: Record<string, string> = { polished: "Poli", satin: "Satiné", brushed: "Brossé", hammered: "Martelé", aged: "Vieilli" };
export const BACKGROUND_NAMES_FR: Record<Background, string> = {
  "studio-dark": "Studio sombre",
  black: "Noir",
  "studio-light": "Studio clair",
  white: "Blanc",
  rose: "Rosé",
  wood: "Table en noyer",
  velvet: "Velours noir",
  satin: "Satin champagne",
  leather: "Cuir blanc",
  marble: "Marbre noir Berete",
};

/* ---------- The simple mode (27/11/2026) ---------- */

type SimpleAmbiance = { id: string; name: string; background: Background; scene: Partial<SceneSettings> & { post?: Partial<SceneSettings["post"]> } };

/**
 * The six ambiances of the simple mode, each a whole scene tested on ZR0982 and the client's Rhino files (no black metal,
 * no black stone): the metal's lighting, the stones' (« auto »: chosen per cut by the engine), the background, the
 * ground and the effects at once. Every other setting goes back to the engine's.
 */
const SIMPLE: SimpleAmbiance[] = [
  {
    id: "studio-blanc",
    name: "Studio blanc",
    background: "white",
    scene: { envMetal: { id: "studio-clair", rotation: 0, intensity: 1 }, envGem: { id: "auto", rotation: 0, intensity: 1 }, ground: { preset: "soft" } as SceneSettings["ground"] },
  },
  {
    id: "studio-noir",
    name: "Studio noir",
    background: "studio-dark",
    scene: { envMetal: { id: "studio-clair", rotation: 0, intensity: 0.95 }, envGem: { id: "auto", rotation: 0, intensity: 1 }, ground: { preset: "contact" } as SceneSettings["ground"] },
  },
  {
    id: "chaud",
    name: "Chaud",
    background: "studio-dark",
    scene: { envMetal: { id: "studio-warm", rotation: 0, intensity: 1.15 }, envGem: { id: "gem-tente", rotation: 0, intensity: 1 }, ground: { preset: "contact" } as SceneSettings["ground"], post: { tonemap: { ...DEFAULT_POST.tonemap, saturation: 1.06 } } as SceneSettings["post"] },
  },
  {
    id: "vitrine",
    name: "Vitrine",
    background: "black",
    scene: { envMetal: { id: "softbox-wide", rotation: 0, intensity: 1 }, envGem: { id: "gem-vitrine", rotation: 0, intensity: 1 }, ground: { preset: "reflective" } as SceneSettings["ground"] },
  },
  {
    id: "marbre-berete",
    name: "Marbre noir Berete",
    background: "marble",
    scene: { envMetal: { id: "softbox-wide", rotation: 0, intensity: 1 }, envGem: { id: "auto", rotation: 0, intensity: 1 }, ground: { preset: "soft" } as SceneSettings["ground"], post: { vignette: { enabled: true, offset: 0.4, darkness: 0.35 } } as SceneSettings["post"] },
  },
  {
    id: "transparent",
    name: "Fond transparent",
    background: "black",
    scene: { envMetal: { id: "studio-clair", rotation: 0, intensity: 1 }, envGem: { id: "auto", rotation: 0, intensity: 1 }, ground: { preset: "none" } as SceneSettings["ground"], post: { tonemap: { ...DEFAULT_POST.tonemap, clipBackground: true } } as SceneSettings["post"] },
  },
];

export const SIMPLE_AMBIANCES = SIMPLE.map((a) => ({
  ...a,
  /** The settings with this whole scene: what the stones and metals are stays, the scene is the ambiance's. */
  apply(settings: ModelSettings): ModelSettings {
    const scene = merged(DEFAULT_SCENE, { ...a.scene, ambiance: a.id } as Partial<SceneSettings>);
    return { ...settings, background: a.background, scene };
  },
}));

/** The ambiance the settings are in (null: changed in the expert mode, or none chosen yet). */
export function ambianceOf(settings: ModelSettings): string | null {
  const id = (settings.scene as { ambiance?: string } | undefined)?.ambiance;
  if (id && SIMPLE.some((a) => a.id === id)) return id;
  if (!settings.scene) return "studio-noir";
  return null;
}

export const SIMPLE_METALS: { id: MetalId; name: string }[] = [
  { id: "yellow-gold", name: "Or jaune" },
  { id: "white-gold", name: "Or blanc" },
  { id: "rose-gold", name: "Or rose" },
  { id: "platinum", name: "Platine" },
  { id: "black-rhodium", name: "Rhodium noir" },
];

/** The stones of the simple mode: a colour each (the library's material behind it). */
export const SIMPLE_STONES: { id: string; name: string; material: string }[] = [
  { id: "white", name: "Diamant blanc", material: "gem/diamond" },
  { id: "yellow", name: "Jaune", material: "gem/diamond-yellow" },
  { id: "pink", name: "Rose", material: "gem/diamond-pink" },
  { id: "champagne", name: "Champagne", material: "gem/diamond-champagne" },
  { id: "black", name: "Noir", material: "gem/diamond-black" },
  { id: "blue", name: "Bleu", material: "gem/sapphire-blue" },
  { id: "red", name: "Rouge", material: "gem/ruby" },
  { id: "green", name: "Vert", material: "gem/emerald" },
];

/** The views of the simple mode: azimuth and polar angle of the camera (radians), the whole jewel framed. */
export const SIMPLE_VIEWS = [
  { id: "front", name: "Face", azimuth: 0, polar: Math.PI / 2 - 0.05 },
  { id: "side", name: "Profil", azimuth: Math.PI / 2, polar: Math.PI / 2 - 0.05 },
  { id: "three-quarter", name: "3/4", azimuth: Math.PI / 4, polar: 1.0 },
  { id: "top", name: "Dessus", azimuth: 0, polar: 0.0001 },
] as const;

/** Image of a library entry in the editor (made by our own engine: scripts of the 3D lab). */
export function thumb(kind: "hdri" | "mat" | "stand" | "preset" | "ground" | "ambiance", id: string): string {
  return "/media/3d-lib/" + kind + "-" + id.replace(/[^a-z0-9-]+/gi, "_") + ".webp";
}
