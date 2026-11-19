/*
 * The universe of each piece: the page of a piece is the same for every piece (its structure does not change), but its
 * background, colours, texture, light and motion follow the identity of the piece (src/components/Universe.tsx).
 *
 * A piece names a preset (a universe of the house) and may change any of its parts; the admin edits the same object
 * ("Univers de la page"). A piece without one gets the universe of the house. The colours live in the background only:
 * the accent of the site (buttons, links, lines) stays rose gold, and the texts stay white and light grey on a deep
 * background (contrast AA). Blue never comes into the interface; only the night blue of Inter Milan, deep and dark,
 * lives in the background of its own page.
 */

export const THEME_TEXTURES = ["grain", "silk", "rays", "stripes", "scales", "petals", "facets", "pitch", "clockwork", "rain", "stars"] as const;
export const THEME_LIGHTS = ["halo", "spotlight", "beam", "aura", "ember"] as const;
export const THEME_MOTIONS = ["none", "drift", "pulse", "sparkle", "flutter", "rise", "rotate"] as const;

export type ThemeTexture = (typeof THEME_TEXTURES)[number];
export type ThemeLight = (typeof THEME_LIGHTS)[number];
export type ThemeMotion = (typeof THEME_MOTIONS)[number];

/** What a piece (or the admin) writes: a preset, and the parts it changes. */
export type PieceTheme = {
  preset?: string;
  /** The deep background (almost black). */
  base?: string;
  /** The colour of the universe, in the depth of the background. */
  tint?: string;
  /** The colour of its light. */
  glow?: string;
  texture?: ThemeTexture;
  light?: ThemeLight;
  motion?: ThemeMotion;
};

export type ResolvedTheme = { preset: string; base: string; tint: string; glow: string; texture: ThemeTexture; light: ThemeLight; motion: ThemeMotion };

type Preset = { name: string; theme: Omit<ResolvedTheme, "preset"> };

/** The universes of the house, with their name in the admin (French). */
export const THEME_PRESETS: Record<string, Preset> = {
  maison: { name: "La Maison (par défaut)", theme: { base: "#0a0a0a", tint: "#2b1a16", glow: "#e8b4a0", texture: "grain", light: "halo", motion: "drift" } },
  energie: { name: "Énergie (puissance, cinéma)", theme: { base: "#0b0806", tint: "#3a1707", glow: "#d9773f", texture: "rays", light: "aura", motion: "pulse" } },
  metamorphose: { name: "Métamorphose (mouvement, élégance)", theme: { base: "#0b0a0e", tint: "#2a1838", glow: "#c9a0dc", texture: "silk", light: "halo", motion: "flutter" } },
  "victoire-nuit": { name: "Victoire, bleu nuit (Inter Milan)", theme: { base: "#04060c", tint: "#0b1733", glow: "#e8c9a8", texture: "stripes", light: "spotlight", motion: "sparkle" } },
  "victoire-rouge": { name: "Victoire, rouge profond (VfB Stuttgart)", theme: { base: "#0a0605", tint: "#330c10", glow: "#e8b4a0", texture: "facets", light: "spotlight", motion: "sparkle" } },
  terrain: { name: "Terrain (football, joueur)", theme: { base: "#070a08", tint: "#0f2618", glow: "#e8d2b8", texture: "pitch", light: "spotlight", motion: "drift" } },
  serpent: { name: "Serpent (écailles, pierre rouge)", theme: { base: "#0b0606", tint: "#3a0d13", glow: "#d46a62", texture: "scales", light: "ember", motion: "drift" } },
  velours: { name: "Velours rubis", theme: { base: "#0b0707", tint: "#2e1015", glow: "#e8b4a0", texture: "silk", light: "ember", motion: "drift" } },
  sacre: { name: "Lumière sacrée", theme: { base: "#0a0807", tint: "#2a1f14", glow: "#f0d3a8", texture: "grain", light: "beam", motion: "rise" } },
  roses: { name: "Roseraie", theme: { base: "#0b0708", tint: "#33141c", glow: "#e8a9a0", texture: "petals", light: "halo", motion: "drift" } },
  emeraude: { name: "Émeraude (trèfle)", theme: { base: "#060a07", tint: "#10291a", glow: "#d8c27a", texture: "grain", light: "halo", motion: "sparkle" } },
  facettes: { name: "Facettes (géométrie, baguettes)", theme: { base: "#09090a", tint: "#1f1e22", glow: "#f4f2ef", texture: "facets", light: "spotlight", motion: "sparkle" } },
  etoiles: { name: "Nuit étoilée", theme: { base: "#070708", tint: "#1b1820", glow: "#f4f2ef", texture: "stars", light: "halo", motion: "sparkle" } },
  mecanique: { name: "Mécanique (montres)", theme: { base: "#08090a", tint: "#1c1d20", glow: "#dadcdf", texture: "clockwork", light: "spotlight", motion: "rotate" } },
  pluie: { name: "Promenade sous la pluie", theme: { base: "#09090a", tint: "#1e1d20", glow: "#e8b4a0", texture: "rain", light: "halo", motion: "drift" } },
  tulipes: { name: "Tulipes (Amsterdam)", theme: { base: "#0b0607", tint: "#3a1221", glow: "#f0a9a0", texture: "petals", light: "halo", motion: "drift" } },
};

export const DEFAULT_PRESET = "maison";

/** The names of the parts in the admin (French). */
export const TEXTURE_NAMES: Record<ThemeTexture, string> = {
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
};
export const LIGHT_NAMES: Record<ThemeLight, string> = { halo: "Halo", spotlight: "Projecteur", beam: "Rayons du haut", aura: "Aura qui respire", ember: "Braise" };
export const MOTION_NAMES: Record<ThemeMotion, string> = { none: "Aucune", drift: "Particules qui flottent", pulse: "Ondes d'énergie", sparkle: "Scintillements", flutter: "Envol (ailes)", rise: "Poussière de lumière", rotate: "Rotation lente" };

const HEX = /^#[0-9a-f]{6}$/i;
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T => (typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback);
const color = (value: unknown, fallback: string) => (typeof value === "string" && HEX.test(value) ? value.toLowerCase() : fallback);

/** The full universe of a piece: its preset, with the parts it changes (a wrong value keeps the preset's). */
export function resolveTheme(theme: PieceTheme | null | undefined): ResolvedTheme {
  const preset = theme?.preset && THEME_PRESETS[theme.preset] ? theme.preset : DEFAULT_PRESET;
  const p = THEME_PRESETS[preset]!.theme;
  return {
    preset,
    base: color(theme?.base, p.base),
    tint: color(theme?.tint, p.tint),
    glow: color(theme?.glow, p.glow),
    texture: pick(theme?.texture, THEME_TEXTURES, p.texture),
    light: pick(theme?.light, THEME_LIGHTS, p.light),
    motion: pick(theme?.motion, THEME_MOTIONS, p.motion),
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
  return Object.keys(out).length > 0 ? out : null;
}
