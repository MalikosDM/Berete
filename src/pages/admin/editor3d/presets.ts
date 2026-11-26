/*
 * The names the 3D editor shows (French, simple) and its complete scenes ("Ambiances", like iJewel's Scene Presets):
 * each sets both lightings, the background, the ground and a few effects at once.
 */
import type { Background } from "@/data/models";
import type { Ease, GroundPreset, PoseKind, SceneSettings, StandId, ToneMap } from "@/data/scene3d";

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
export const TONEMAP_NAMES: Record<ToneMap, string> = { aces: "ACES Filmic (conseillé)", agx: "AgX", linear: "Linéaire", reinhard: "Reinhard", cineon: "Cineon", uncharted2: "Uncharted 2" };
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

/** Image of a library entry in the editor (made by our own engine: scripts of the 3D lab). */
export function thumb(kind: "hdri" | "mat" | "stand" | "preset" | "ground", id: string): string {
  return "/media/3d-lib/" + kind + "-" + id.replace(/[^a-z0-9-]+/gi, "_") + ".webp";
}
