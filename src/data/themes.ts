/*
 * The universe of each piece: the page of a piece keeps the same structure for every piece, but entering it means
 * entering the world of the piece. A universe is made of:
 *   - a full-screen backdrop: an AI background when there is one (src/data/universes.generated.json, made by
 *     `npm run universes`), else a procedural composition (deep colours, light, texture, smoke, particles);
 *   - the typography of its title (free licensed fonts, served by the site: public/fonts/universe);
 *   - a cinematic entrance of 1 to 2 seconds, the first time the page opens in a visit (never on a return);
 *   - its own effects, ambient and during the scroll (src/components/universe), light on phones;
 *   - sometimes a watermark (a glyph, a number) in the depth of the backdrop.
 *
 * A piece names a preset (a universe of the house) and may change any of its parts; the admin edits the same object
 * ("Univers de la page"). A piece without one gets the universe of the house. The colours live in the backdrop, the
 * title and the effects only: the accent of the interface (buttons, links, lines) stays rose gold, and the texts stay
 * light on a dark ground (contrast AA). Blue never comes into the interface; only the night blue of Inter Milan, deep and
 * dark, lives in the backdrop of its own page.
 */
import universes from "./universes.generated.json" with { type: "json" };

export const THEME_TEXTURES = ["none", "grain", "silk", "rays", "stripes", "scales", "petals", "facets", "pitch", "clockwork", "rain", "stars", "origins"] as const;
export const THEME_LIGHTS = ["halo", "spotlight", "beam", "aura", "ember"] as const;
/** The former slow motion of the backdrop: kept for the universes written before the effects (it maps to an effect). */
export const THEME_MOTIONS = ["none", "drift", "pulse", "sparkle", "flutter", "rise", "rotate"] as const;
export const THEME_ENTRANCES = ["ignite", "flash", "smoke", "stars", "flutter", "tunnel", "spotlight", "glint", "bloom", "rain", "tick"] as const;
export const THEME_EFFECTS = ["dust", "embers", "glints", "lightning", "speedlines", "impact", "butterflies", "iridescence", "confetti", "twenty-stars", "petals", "rain", "stars", "smoke"] as const;

export type ThemeTexture = (typeof THEME_TEXTURES)[number];
export type ThemeLight = (typeof THEME_LIGHTS)[number];
export type ThemeMotion = (typeof THEME_MOTIONS)[number];
export type ThemeEntrance = (typeof THEME_ENTRANCES)[number];
export type ThemeEffect = (typeof THEME_EFFECTS)[number];

/** The typography of a title: one weight of one free font (OFL), served by the site. */
export type ThemeFontSpec = {
  /** Its name in the admin (French). */
  name: string;
  /** The CSS family, before the fonts of the site (Arabic and the missing letters fall back to them). */
  family: string | null;
  /** Its file in public/fonts/universe (null: the font of the site). */
  file: string | null;
  weight: number;
  italic?: boolean;
  /** Capitals or not, the spacing of the letters, and a size factor (some fonts are wider, others narrower). */
  caps: boolean;
  tracking: string;
  scale: number;
};

export const THEME_FONTS = {
  maison: { name: "La Maison (Cormorant, la police du site)", family: null, file: null, weight: 300, caps: true, tracking: "0.06em", scale: 1 },
  pinceau: { name: "Pinceau japonais (Shojumaru)", family: "Shojumaru", file: "shojumaru-latin-400-normal", weight: 400, caps: true, tracking: "0.03em", scale: 0.8 },
  aerien: { name: "Fine et aérienne (Italiana)", family: "Italiana", file: "italiana-latin-400-normal", weight: 400, caps: true, tracking: "0.1em", scale: 1 },
  trophee: { name: "Gravée, trophée (Cinzel)", family: "Cinzel", file: "cinzel-latin-600-normal", weight: 600, caps: true, tracking: "0.07em", scale: 0.86 },
  "gothique-allemande": { name: "Gothique allemande (Grenze Gotisch)", family: "Grenze Gotisch", file: "grenze-gotisch-latin-600-normal", weight: 600, caps: false, tracking: "0.01em", scale: 1.04 },
  stade: { name: "Sportive, stade (Big Shoulders)", family: "Big Shoulders Display", file: "big-shoulders-display-latin-700-normal", weight: 700, caps: true, tracking: "0.02em", scale: 1.22 },
  gothique: { name: "Lettres gothiques (Pirata One)", family: "Pirata One", file: "pirata-one-latin-400-normal", weight: 400, caps: false, tracking: "0.02em", scale: 1.12 },
  sacre: { name: "Capitales sacrées (Marcellus SC)", family: "Marcellus SC", file: "marcellus-sc-latin-400-normal", weight: 400, caps: false, tracking: "0.05em", scale: 1 },
  bodoni: { name: "Italique de joaillier (Bodoni Moda)", family: "Bodoni Moda", file: "bodoni-moda-latin-500-italic", weight: 500, italic: true, caps: false, tracking: "0", scale: 1.04 },
  cadran: { name: "Cadran de montre (Michroma)", family: "Michroma", file: "michroma-latin-400-normal", weight: 400, caps: true, tracking: "0.04em", scale: 0.7 },
  deco: { name: "Art déco parisien (Poiret One)", family: "Poiret One", file: "poiret-one-latin-400-normal", weight: 400, caps: true, tracking: "0.1em", scale: 1 },
  douce: { name: "Douce et vivante (Fraunces)", family: "Fraunces", file: "fraunces-latin-600-italic", weight: 600, italic: true, caps: false, tracking: "0", scale: 1.02 },
  geometrie: { name: "Géométrique, facettes (Syncopate)", family: "Syncopate", file: "syncopate-latin-700-normal", weight: 700, caps: true, tracking: "0.06em", scale: 0.72 },
  etoile: { name: "Fine et espacée (Tenor Sans)", family: "Tenor Sans", file: "tenor-sans-latin-400-normal", weight: 400, caps: true, tracking: "0.14em", scale: 0.94 },
} satisfies Record<string, ThemeFontSpec>;

export type ThemeFont = keyof typeof THEME_FONTS;
export const THEME_FONT_KEYS = Object.keys(THEME_FONTS) as ThemeFont[];

/** The brush font of the watermark when it is a Japanese glyph (only the part of the font that holds 力 is served). */
export const MARK_BRUSH_FILE = "yuji-boku-115-400-normal";

/** The AI backgrounds made by `npm run universes` (their files are in public/media/universes). */
export type Backdrop = {
  name: string;
  /** Width / height of the image. */
  ratio: number;
  /** Where the heart of the image is (0 to 1): it is placed behind the piece. */
  focusX: number;
  focusY: number;
  /** The widths of the files, landscape ("<id>-<w>") and portrait for phones ("<id>-m-<w>"), each in AVIF and WebP. */
  widths: number[];
  mobileWidths: number[];
};
export const BACKDROPS = universes.backdrops as Record<string, Backdrop>;

/** What a piece (or the admin) writes: a preset, and the parts it changes. */
export type PieceTheme = {
  preset?: string;
  /** The deep background (almost black). */
  base?: string;
  /** The colour of the universe, in the depth of the background. */
  tint?: string;
  /** The colour of its light and its particles. */
  glow?: string;
  texture?: ThemeTexture;
  light?: ThemeLight;
  motion?: ThemeMotion;
  font?: ThemeFont;
  /** An AI background (a key of BACKDROPS), an image sent from the admin ("/media/..."), or "" for none. */
  backdrop?: string;
  entrance?: ThemeEntrance;
  effects?: ThemeEffect[];
  /** A watermark in the depth of the backdrop: a glyph, a number (4 characters at most), or "" for none. */
  mark?: string;
};

export type ResolvedTheme = {
  preset: string;
  base: string;
  tint: string;
  glow: string;
  texture: ThemeTexture;
  light: ThemeLight;
  motion: ThemeMotion;
  font: ThemeFont;
  backdrop: string;
  entrance: ThemeEntrance;
  effects: ThemeEffect[];
  mark: string;
};

type Preset = { name: string; theme: Omit<ResolvedTheme, "preset" | "motion"> };

/** The universes of the house, with their name in the admin (French). */
export const THEME_PRESETS: Record<string, Preset> = {
  maison: {
    name: "La Maison (par défaut)",
    theme: { base: "#0a0a0a", tint: "#2b1a16", glow: "#e8b4a0", texture: "grain", light: "halo", font: "maison", backdrop: "", entrance: "ignite", effects: ["dust", "glints", "smoke"], mark: "" },
  },
  energie: {
    name: "Énergie (puissance, manga cinéma) : Kevin Schade, Dragon Ball",
    theme: { base: "#080504", tint: "#3a1707", glow: "#ffb45a", texture: "grain", light: "aura", font: "pinceau", backdrop: "dragon", entrance: "flash", effects: ["embers", "lightning", "speedlines", "impact"], mark: "力" },
  },
  metamorphose: {
    name: "Métamorphose (mouvement, élégance) : Butterfly",
    theme: { base: "#07050b", tint: "#2a1838", glow: "#d9b8f0", texture: "grain", light: "halo", font: "aerien", backdrop: "butterfly", entrance: "flutter", effects: ["butterflies", "iridescence", "dust"], mark: "" },
  },
  "victoire-nuit": {
    name: "Victoire, stade de nuit (Inter Milan)",
    theme: { base: "#03050b", tint: "#0b1733", glow: "#f0d49a", texture: "grain", light: "spotlight", font: "trophee", backdrop: "inter", entrance: "stars", effects: ["twenty-stars", "confetti", "glints"], mark: "" },
  },
  "victoire-rouge": {
    name: "Nuit de finale, fumée rouge (VfB Stuttgart)",
    theme: { base: "#070303", tint: "#330c10", glow: "#ff5a4a", texture: "grain", light: "spotlight", font: "gothique-allemande", backdrop: "vfb", entrance: "smoke", effects: ["smoke", "embers", "glints"], mark: "" },
  },
  tunnel: {
    name: "Tunnel du vestiaire, avant-match (Noah Okafor)",
    theme: { base: "#040805", tint: "#0e2a18", glow: "#e9f5ea", texture: "origins", light: "spotlight", font: "stade", backdrop: "tunnel", entrance: "tunnel", effects: ["speedlines", "dust", "glints"], mark: "" },
  },
  terrain: {
    name: "Terrain (football, joueur)",
    theme: { base: "#050906", tint: "#0f2618", glow: "#e8d2b8", texture: "pitch", light: "spotlight", font: "stade", backdrop: "", entrance: "spotlight", effects: ["dust", "glints"], mark: "" },
  },
  bianconero: {
    name: "Bianconero (rayures noir et blanc, célébration)",
    theme: { base: "#060606", tint: "#232325", glow: "#f4f2ef", texture: "stripes", light: "spotlight", font: "geometrie", backdrop: "", entrance: "glint", effects: ["confetti", "glints", "dust", "smoke"], mark: "" },
  },
  stuttgart: {
    name: "Rouge et blanc du VfB (joueurs du club)",
    theme: { base: "#080404", tint: "#3a0d10", glow: "#ffd9cf", texture: "facets", light: "spotlight", font: "geometrie", backdrop: "", entrance: "glint", effects: ["embers", "glints", "smoke"], mark: "" },
  },
  serpent: {
    name: "Serpent (écailles, pierre rouge)",
    theme: { base: "#090404", tint: "#3a0d13", glow: "#ff7a6a", texture: "scales", light: "ember", font: "gothique", backdrop: "", entrance: "glint", effects: ["embers", "glints", "smoke"], mark: "" },
  },
  velours: {
    name: "Velours rubis",
    theme: { base: "#090505", tint: "#2e1015", glow: "#ff9a8a", texture: "silk", light: "ember", font: "bodoni", backdrop: "", entrance: "spotlight", effects: ["dust", "glints", "smoke"], mark: "" },
  },
  sacre: {
    name: "Lumière sacrée",
    theme: { base: "#090706", tint: "#2a1f14", glow: "#f6dcae", texture: "grain", light: "beam", font: "sacre", backdrop: "", entrance: "spotlight", effects: ["dust", "glints"], mark: "" },
  },
  roses: {
    name: "Roseraie",
    theme: { base: "#0a0607", tint: "#33141c", glow: "#f2b0a8", texture: "petals", light: "halo", font: "bodoni", backdrop: "", entrance: "bloom", effects: ["petals", "glints", "smoke"], mark: "" },
  },
  emeraude: {
    name: "Émeraude (trèfle, chance)",
    theme: { base: "#040905", tint: "#10291a", glow: "#e2cd84", texture: "grain", light: "halo", font: "douce", backdrop: "", entrance: "glint", effects: ["dust", "glints", "smoke"], mark: "" },
  },
  facettes: {
    name: "Facettes (géométrie, baguettes)",
    theme: { base: "#08080a", tint: "#1f1e22", glow: "#f4f2ef", texture: "facets", light: "spotlight", font: "geometrie", backdrop: "", entrance: "glint", effects: ["glints", "dust", "smoke"], mark: "" },
  },
  etoiles: {
    name: "Nuit étoilée",
    theme: { base: "#060608", tint: "#1b1820", glow: "#f4f2ef", texture: "stars", light: "halo", font: "etoile", backdrop: "", entrance: "stars", effects: ["stars", "glints"], mark: "" },
  },
  mecanique: {
    name: "Mécanique (montres)",
    theme: { base: "#07080a", tint: "#1c1d20", glow: "#e6e8eb", texture: "clockwork", light: "spotlight", font: "cadran", backdrop: "", entrance: "tick", effects: ["glints", "dust", "smoke"], mark: "" },
  },
  pluie: {
    name: "Promenade sous la pluie",
    theme: { base: "#08080a", tint: "#1e1d20", glow: "#f0c9a8", texture: "none", light: "halo", font: "deco", backdrop: "", entrance: "rain", effects: ["rain", "dust", "smoke"], mark: "" },
  },
  tulipes: {
    name: "Tulipes (Amsterdam)",
    theme: { base: "#0a0506", tint: "#3a1221", glow: "#ffb0a0", texture: "petals", light: "halo", font: "douce", backdrop: "", entrance: "bloom", effects: ["petals", "glints"], mark: "" },
  },
};

export const DEFAULT_PRESET = "maison";

/** The names of the parts in the admin (French). */
export const TEXTURE_NAMES: Record<ThemeTexture, string> = {
  none: "Aucune",
  grain: "Grain fin",
  silk: "Soie",
  rays: "Rayons d'énergie",
  stripes: "Rayures (maillot)",
  scales: "Écailles",
  petals: "Pétales",
  facets: "Facettes",
  pitch: "Terrain",
  clockwork: "Cadrans",
  rain: "Pluie",
  stars: "Étoiles",
  origins: "Origines (croix suisses, motifs nigérians)",
};
export const LIGHT_NAMES: Record<ThemeLight, string> = { halo: "Halo", spotlight: "Projecteur", beam: "Rayons du haut", aura: "Aura qui respire", ember: "Braise" };
export const MOTION_NAMES: Record<ThemeMotion, string> = { none: "Aucune", drift: "Particules qui flottent", pulse: "Ondes d'énergie", sparkle: "Scintillements", flutter: "Envol (ailes)", rise: "Poussière de lumière", rotate: "Rotation lente" };
export const ENTRANCE_NAMES: Record<ThemeEntrance, string> = {
  ignite: "La lumière s'allume (par défaut)",
  flash: "Flash d'énergie et onde de choc",
  smoke: "La fumée se dissipe sous le projecteur",
  stars: "Les étoiles s'allument une à une",
  flutter: "Envol de papillons",
  tunnel: "Les lumières du tunnel s'allument",
  spotlight: "Le projecteur s'allume",
  glint: "Un éclat de lumière traverse la pièce",
  bloom: "Les pétales s'ouvrent",
  rain: "La pluie commence",
  tick: "Les rouages se mettent en marche",
};
export const EFFECT_NAMES: Record<ThemeEffect, string> = {
  dust: "Poussière de lumière",
  embers: "Braises qui montent",
  glints: "Éclats de diamant",
  lightning: "Éclairs",
  speedlines: "Lignes de vitesse au scroll",
  impact: "Impact à l'ouverture d'une photo",
  butterflies: "Papillons de lumière au scroll",
  iridescence: "Reflets irisés",
  confetti: "Confettis",
  "twenty-stars": "Vingt étoiles (Inter)",
  petals: "Pétales qui tombent",
  rain: "Pluie",
  stars: "Étoiles et étoile filante",
  smoke: "Fumée",
};

/** Every former motion becomes one of the effects. */
const MOTION_EFFECT: Record<ThemeMotion, ThemeEffect | null> = { none: null, drift: "dust", pulse: "embers", sparkle: "glints", flutter: "butterflies", rise: "dust", rotate: null };

const HEX = /^#[0-9a-f]{6}$/i;
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback);
const color = (value: unknown, fallback: string) => (typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback);
const isFont = (value: unknown): value is ThemeFont => typeof value === "string" && value in THEME_FONTS;
/** An AI background of the house, or an image of the site (an address of /media/). */
const isBackdrop = (value: unknown): value is string => typeof value === "string" && (value === "" || value in BACKDROPS || /^\/media\/[\w./-]+\.(webp|jpe?g|png|avif)$/i.test(value));
const effectsOf = (value: unknown): ThemeEffect[] | null =>
  Array.isArray(value) ? [...new Set(value.filter((x): x is ThemeEffect => typeof x === "string" && (THEME_EFFECTS as readonly string[]).includes(x)))] : null;
const markOf = (value: unknown): string | null => (typeof value === "string" ? [...value.trim()].slice(0, 4).join("") : null);

/** The full universe of a piece: its preset, with the parts it changes (a wrong value keeps the preset's). */
export function resolveTheme(theme: PieceTheme | null | undefined): ResolvedTheme {
  const preset = theme?.preset && THEME_PRESETS[theme.preset] ? theme.preset : DEFAULT_PRESET;
  const p = THEME_PRESETS[preset]!.theme;
  // A universe written before the effects, with a motion of its own: that motion becomes its first effect.
  const motion = pick(theme?.motion, THEME_MOTIONS, "none");
  const fromMotion = theme?.effects === undefined && theme?.motion !== undefined ? MOTION_EFFECT[motion] : null;
  const effects = effectsOf(theme?.effects) ?? (fromMotion ? [...new Set([fromMotion, ...p.effects])] : p.effects);
  return {
    preset,
    base: color(theme?.base, p.base),
    tint: color(theme?.tint, p.tint),
    glow: color(theme?.glow, p.glow),
    texture: pick(theme?.texture, THEME_TEXTURES, p.texture),
    light: pick(theme?.light, THEME_LIGHTS, p.light),
    motion,
    font: isFont(theme?.font) ? theme.font : p.font,
    backdrop: isBackdrop(theme?.backdrop) ? theme.backdrop : p.backdrop,
    entrance: pick(theme?.entrance, THEME_ENTRANCES, p.entrance),
    effects,
    mark: markOf(theme?.mark) ?? p.mark,
  };
}

/** A theme as stored: only the known parts, without the empty ones. */
export function cleanTheme(value: unknown): PieceTheme | null {
  if (value === null || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const out: PieceTheme = {};
  if (typeof v.preset === "string" && THEME_PRESETS[v.preset]) out.preset = v.preset;
  for (const key of ["base", "tint", "glow"] as const) if (typeof v[key] === "string" && HEX.test(v[key] as string)) out[key] = (v[key] as string).toLowerCase();
  if (typeof v.texture === "string" && (THEME_TEXTURES as readonly string[]).includes(v.texture)) out.texture = v.texture as ThemeTexture;
  if (typeof v.light === "string" && (THEME_LIGHTS as readonly string[]).includes(v.light)) out.light = v.light as ThemeLight;
  if (typeof v.motion === "string" && (THEME_MOTIONS as readonly string[]).includes(v.motion)) out.motion = v.motion as ThemeMotion;
  if (isFont(v.font)) out.font = v.font;
  if (isBackdrop(v.backdrop)) out.backdrop = v.backdrop;
  if (typeof v.entrance === "string" && (THEME_ENTRANCES as readonly string[]).includes(v.entrance)) out.entrance = v.entrance as ThemeEntrance;
  const effects = effectsOf(v.effects);
  if (effects) out.effects = effects;
  const mark = markOf(v.mark);
  if (mark !== null) out.mark = mark;
  return Object.keys(out).length > 0 ? out : null;
}

/** The file of the title font of a universe, to load it early (its <link rel="preload">), or null. */
export function titleFontFile(theme: ResolvedTheme): string | null {
  const file = (THEME_FONTS[theme.font] as ThemeFontSpec).file;
  return file ? "/fonts/universe/" + file + ".woff2" : null;
}
