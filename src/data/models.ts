/*
 * 3D models of jewels (the viewer, the admin "3D", the API). A file of the
 * jeweller (.3dm, .glb, .stl) has no real materials: each of its layers gets
 * a role (metal, diamond...) chosen in the admin, stored with the model.
 */

/** The metals the client can choose, in the order of the swatches. */
export const METALS = ["yellow-gold", "white-gold", "rose-gold", "platinum", "black-rhodium"] as const;
export type MetalId = (typeof METALS)[number];

export const LAYER_ROLES = ["metal", "diamond", "stone", "enamel", "hide"] as const;
export type LayerRole = (typeof LAYER_ROLES)[number];

/** Lighting of the scene: soft studio, warm, or one spotlight that makes the stones sparkle. */
export const AMBIANCES = ["studio", "warm", "spotlight"] as const;
export type Ambiance = (typeof AMBIANCES)[number];

/** Backgrounds of the viewer: flat colours and studio gradients (lighter in the middle). */
export const BACKGROUNDS = ["black", "studio-dark", "grey", "white", "studio-light", "cream", "rose"] as const;
export type Background = (typeof BACKGROUNDS)[number];

/** A background from the settings (the first versions only had "dark" and "light"). */
export function backgroundOf(value: unknown): Background {
  if (value === "dark") return "studio-dark";
  if (value === "light") return "studio-light";
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
};

export const DEFAULT_SETTINGS: ModelSettings = { layers: {}, metals: [...METALS], view: null, ambiance: "studio", background: "studio-dark" };

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
