/*
 * 3D models of jewels (the viewer, the admin "3D", the API). A file of the
 * jeweller (.3dm, .glb, .stl) has no real materials: each of its layers gets
 * a role (metal, diamond...) chosen in the admin, stored with the model.
 */

import { AMBIANCE_SCENES, CLASSIC_DIAMOND, DEFAULT_DIAMOND, DEFAULT_SCENE, DEFAULT_TRY_ON, DEFAULT_VIEWER, DEFAULT_VIEWS, merged, type Configurator, type DiamondParams, type SceneSettings, type TryOnSettings, type ViewerOptions, type ViewsSettings } from "./scene3d.js";

/**
 * The metals the client can choose, in the order of the swatches: 18 carats first (the five of the first versions,
 * offered by default), then 14 carats, palladium and silver (26/11/2026, the library of the 3D editor).
 */
export const METALS = ["yellow-gold", "white-gold", "rose-gold", "platinum", "black-rhodium", "yellow-gold-14", "white-gold-14", "rose-gold-14", "palladium", "silver"] as const;
export type MetalId = (typeof METALS)[number];
/** Offered to the client when the jeweller has not chosen. */
export const CLASSIC_METALS: MetalId[] = ["yellow-gold", "white-gold", "rose-gold", "platinum", "black-rhodium"];

export const LAYER_ROLES = ["metal", "diamond", "stone", "enamel", "hide"] as const;
export type LayerRole = (typeof LAYER_ROLES)[number];

/** Lighting of the scene: soft studio, warm, or one spotlight that makes the stones sparkle. */
export const AMBIANCES = ["studio", "warm", "spotlight"] as const;
/**
 * How the diamonds are drawn (25/11/2026): "realistic", a warm studio light, the sparkles only where the light strikes, a light
 * fire (index 2.42); "classic", the rendering before (brighter everywhere), kept to compare.
 */
export const DIAMOND_LOOKS = ["realistic", "classic"] as const;
export type DiamondLook = (typeof DIAMOND_LOOKS)[number];
export type Ambiance = (typeof AMBIANCES)[number];

/** Backgrounds of the viewer: plain colours, studio gradients, and settings (a surface in front of a room out of focus). */
export const BACKGROUNDS = ["studio-dark", "black", "studio-light", "white", "rose", "wood", "velvet", "satin", "leather", "marble"] as const;
export type Background = (typeof BACKGROUNDS)[number];

/** A background from the settings (the first versions only had "dark" and "light"). */
export function backgroundOf(value: unknown): Background {
  if (value === "dark") return "studio-dark";
  if (value === "light" || value === "cream") return "studio-light";
  if (value === "grey") return "studio-dark";
  return (BACKGROUNDS as readonly unknown[]).includes(value) ? (value as Background) : "studio-dark";
}

export type LayerSetting = {
  role: LayerRole;
  /** Metal shown first (role "metal"). */
  metal?: MetalId;
  /** Colour of a coloured stone or of an enamel, #rrggbb. */
  color?: string;
  /** Name shown to the client above the swatches of this metal ("Links", "Flowers"...). */
  label?: string;
  /** A material of the library (src/viewer/library): a finish of metal, a stone, a pearl... (else the one of its role). */
  material?: string;
  /** Metal finish: polished (default), satin, brushed (with the direction of the brushing, degrees), hammered, aged. */
  finish?: { kind: "polished" | "satin" | "brushed" | "hammered" | "aged"; angle?: number };
  /** Settings of a stone (role diamond or stone), over the defaults. */
  diamond?: Partial<DiamondParams>;
  /** Edges rounded on the screen for this material, 0–16 (null: the scene's). */
  bevel?: number;
  /** Glow on this material. */
  bloom?: boolean;
};

/** A camera place, in the units of the model (metres). */
export type ModelView = { position: [number, number, number]; target: [number, number, number] };

export type ModelSettings = {
  /** By layer name (the materials of the optimised file). */
  layers: Record<string, LayerSetting>;
  /** Metals offered to the client. */
  metals: MetalId[];
  /** First view; null: the whole jewel, seen from the front and above. */
  view: ModelView | null;
  ambiance: Ambiance;
  background: Background;
  /** How the diamonds are drawn (missing in the settings saved before 25/11/2026: realistic). */
  diamonds?: DiamondLook;
  /** The scene of the 3D editor (26/11/2026): lightings, effects, ground, stand... (missing: from `ambiance`). */
  scene?: Partial<SceneSettings>;
  views?: Partial<ViewsSettings>;
  viewer?: Partial<ViewerOptions>;
  configurators?: Configurator[];
  tryOn?: Partial<TryOnSettings>;
};

export const DEFAULT_SETTINGS: ModelSettings = { layers: {}, metals: [...CLASSIC_METALS], view: null, ambiance: "studio", background: "studio-dark", diamonds: "realistic" };

/** The whole scene of a model: what was saved over the defaults (a model saved before 26/11: its ambiance). */
export function sceneOf(settings: ModelSettings): SceneSettings {
  const from = AMBIANCE_SCENES[settings.ambiance] ?? AMBIANCE_SCENES.studio!;
  const base: SceneSettings = {
    ...DEFAULT_SCENE,
    envMetal: { ...DEFAULT_SCENE.envMetal, id: from.envMetal, intensity: from.metalIntensity },
    envGem: { ...DEFAULT_SCENE.envGem, id: settings.diamonds === "classic" ? "gem-classic" : from.envGem },
    ground: { ...DEFAULT_SCENE.ground, preset: settings.background === "black" ? "none" : DEFAULT_SCENE.ground.preset },
  };
  return merged(base, settings.scene);
}

export function viewsOf(settings: ModelSettings): ViewsSettings {
  return merged(DEFAULT_VIEWS, settings.views);
}

export function viewerOf(settings: ModelSettings): ViewerOptions {
  return merged(DEFAULT_VIEWER, settings.viewer);
}

export function tryOnOf(settings: ModelSettings): TryOnSettings {
  return merged(DEFAULT_TRY_ON, settings.tryOn);
}

/** The settings of the stones of a layer: the defaults, the old rendering if chosen, then the layer's own. */
export function diamondOf(layer: LayerSetting | undefined, look: DiamondLook = "realistic"): DiamondParams {
  const base = look === "classic" ? merged(DEFAULT_DIAMOND, CLASSIC_DIAMOND) : DEFAULT_DIAMOND;
  const own = merged(base, layer?.diamond);
  // A coloured stone keeps its colour when its settings have none.
  if (layer?.role === "stone" && !layer.diamond?.color && layer.color) return { ...own, color: layer.color, absorption: own.absorption || 1.2 };
  return own;
}

/** What a visitor receives to show a model. */
export type PublicModel = {
  id: string;
  name: string;
  /** The two versions: computers and phones. */
  files: { full: string; light: string };
  /** Their weights in bytes, for the loading percentage. */
  bytes: { full: number; light: number };
  /** Still image shown while loading, if the jeweller saved a view. */
  poster: string | null;
  /** Size of the jewel (mm). */
  size: [number, number, number];
  settings: ModelSettings;
};

/** The layer roles guessed from a file, before the jeweller checks them. */
export function settingFor(name: string, guess: LayerRole): LayerSetting {
  if (guess === "metal") return { role: "metal", metal: "rose-gold" };
  if (guess === "stone") return { role: "stone", color: "#9b111e" };
  return { role: guess };
}
