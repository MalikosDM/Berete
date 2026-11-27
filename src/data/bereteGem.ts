/*
 * Our own way of writing a jewel's look into files (26/11/2026), so that a piece leaves the 3D editor and comes back
 * with it, or goes to a partner who reads glTF:
 *
 * - BERETE_gem, a glTF material extension of ours. Each stone material of an exported .glb carries
 *   `extensions.BERETE_gem` = { version: 1, role: "diamond" | "stone", ...the settings of the stone (DiamondParams of
 *   ./scene3d.ts: refractiveIndex, dispersion, rayBounces, envIntensity, gamma, boost, orientedLighting, envRotation,
 *   envRotationXYZ, absorption, color, transmission, reflectivity, inclusions, mode, bloom, env), sceneEnv?: the scene's
 *   lighting of the stones when the file was made }, and the file lists "BERETE_gem" in `extensionsUsed` (never in
 *   `extensionsRequired`: a reader that does not know it still shows the stone, as a clear refracting material).
 * - The scene file `<name>.berete-scene.json`: { format: "berete-scene", version: 1, name, exportedAt, settings } where
 *   `settings` is the whole ModelSettings of ./models.ts (layers, metals, first view, background, the scene with its two
 *   lightings, effects, ground, stand, pose; the camera views; the viewer; the configurators; the try-on), every value
 *   written out with its defaults, so the file says everything on its own.
 *
 * Pure functions, used by the export of the editor (src/viewer/export), the editor (reading a scene file back) and the
 * server (reading a .glb: server/models/pipeline/read.ts). Whatever a file gives is checked and kept within the ranges
 * of the editor; a value of the wrong kind is left out (never thrown), except a file that is not a scene of ours at all.
 */
import { BACKGROUNDS, DIAMOND_LOOKS, AMBIANCES, LAYER_ROLES, METALS, backgroundOf, sceneOf, tryOnOf, viewerOf, viewsOf, type LayerSetting, type ModelSettings } from "./models.js";
import { DEFAULT_SCENE, DEFAULT_TRY_ON, DEFAULT_VIEWER, DEFAULT_VIEWS, EASES, FINGERS, GROUNDS, POSES, STANDS, TONEMAPS, type DiamondParams, type EnvSettings, type Vec3 } from "./scene3d.js";

/** The name of our glTF extension. */
export const BERETE_GEM = "BERETE_gem";
export const BERETE_GEM_VERSION = 1;
export const SCENE_FORMAT = "berete-scene";
export const SCENE_VERSION = 1;
/** The end of the name of a scene file. */
export const SCENE_SUFFIX = ".berete-scene.json";

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const HEX = /^#[0-9a-f]{6}$/i;
/** A lighting id: ours ("studio-warm", "gem-studio"), or an uploaded one ("custom:<24 hex>.hdr|exr"). */
const ENV_ID = /^[a-z0-9][a-z0-9:._-]{0,79}$/i;
const hex = (v: unknown): string | undefined => (typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : undefined);
const envId = (v: unknown): string | undefined => (typeof v === "string" && ENV_ID.test(v) ? v : undefined);
const text = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.length <= max ? v : undefined);
const oneOf = <T extends string>(list: readonly T[]) => (v: unknown): T | undefined => ((list as readonly unknown[]).includes(v) ? (v as T) : undefined);

function vec3(v: unknown, lo = -1e6, hi = 1e6): Vec3 | undefined {
  if (!Array.isArray(v) || v.length !== 3 || !v.every(finite)) return undefined;
  return v.map((x: number) => clamp(x, lo, hi)) as Vec3;
}

/* ---------- The stones: BERETE_gem ---------- */

export type GemRole = "diamond" | "stone";

/** What BERETE_gem holds (version 1). */
export type BereteGem = { version: number; role: GemRole } & DiamondParams & { sceneEnv?: EnvSettings };

/** The settings of a stone, kept within the ranges of the editor; unknown or wrong values left out. */
export function gemParams(raw: unknown): Partial<DiamondParams> {
  if (!isPlain(raw)) return {};
  const out: Partial<DiamondParams> = {};
  const num = (key: keyof DiamondParams, lo: number, hi: number, round = false) => {
    const v = raw[key];
    if (finite(v)) (out as Plain)[key] = round ? Math.round(clamp(v, lo, hi)) : clamp(v, lo, hi);
  };
  if (raw.env === null) out.env = null;
  else if (envId(raw.env)) out.env = raw.env as string;
  const color = hex(raw.color);
  if (color) out.color = color;
  num("envIntensity", 0, 20);
  num("envRotation", -360, 360);
  const xyz = vec3(raw.envRotationXYZ, -360, 360);
  if (xyz) out.envRotationXYZ = xyz;
  num("dispersion", 0, 1);
  num("absorption", 0, 50);
  num("refractiveIndex", 1, 4);
  num("gamma", 0.05, 10);
  const boost = vec3(raw.boost, 0, 10);
  if (boost) out.boost = boost;
  num("transmission", 0, 1);
  num("reflectivity", 0, 1);
  num("rayBounces", 1, 16, true);
  num("orientedLighting", 0, 1);
  const mode = oneOf(["auto", "trace", "fast"] as const)(raw.mode);
  if (mode) out.mode = mode;
  if (typeof raw.bloom === "boolean") out.bloom = raw.bloom;
  if (raw.inclusions === null) out.inclusions = null;
  else if (isPlain(raw.inclusions)) {
    const { amount, scale, roughness } = raw.inclusions;
    if (finite(amount) && finite(scale) && finite(roughness)) out.inclusions = { amount: clamp(amount, 0, 1), scale: clamp(scale, 0.01, 50), roughness: clamp(roughness, 0, 1) };
  }
  return out;
}

/** The BERETE_gem extension of one stone material: its whole settings (as the viewer draws it), its role, the scene's stone lighting. */
export function gemExtension(params: DiamondParams, role: GemRole = "diamond", sceneEnv?: EnvSettings): BereteGem {
  const own = gemParams(params);
  const ext: BereteGem = { version: BERETE_GEM_VERSION, role, ...params, ...own };
  if (sceneEnv && envId(sceneEnv.id)) ext.sceneEnv = { id: sceneEnv.id, rotation: finite(sceneEnv.rotation) ? sceneEnv.rotation : 0, intensity: finite(sceneEnv.intensity) ? sceneEnv.intensity : 1 };
  return JSON.parse(JSON.stringify(ext)) as BereteGem;
}

/** A BERETE_gem extension read back: the role and the checked settings (null when it is not one of ours). */
export function gemFromExtension(ext: unknown): { role: GemRole; params: Partial<DiamondParams> } | null {
  if (!isPlain(ext)) return null;
  const params = gemParams(ext);
  if (Object.keys(params).length === 0) return null;
  return { role: ext.role === "stone" ? "stone" : "diamond", params };
}

/** The BERETE_gem settings of one glTF material (its JSON), or null when it has none. */
export function bereteGemOfMaterial(material: unknown): { role: GemRole; params: Partial<DiamondParams> } | null {
  if (!isPlain(material) || !isPlain(material.extensions)) return null;
  return gemFromExtension(material.extensions[BERETE_GEM]);
}

/* ---------- The scene file ---------- */

export type SceneFile = { format: typeof SCENE_FORMAT; version: number; name: string; exportedAt: string; settings: ModelSettings };

/** The scene file of a model: every setting written out with its defaults (`name`: the piece, for the person who opens it). */
export function sceneJson(settings: ModelSettings, name = ""): SceneFile {
  const whole: ModelSettings = {
    ...settings,
    layers: settings.layers ?? {},
    metals: settings.metals ?? [],
    view: settings.view ?? null,
    scene: sceneOf(settings),
    views: viewsOf(settings),
    viewer: viewerOf(settings),
    configurators: settings.configurators ?? [],
    tryOn: tryOnOf(settings),
  };
  return JSON.parse(JSON.stringify({ format: SCENE_FORMAT, version: SCENE_VERSION, name, exportedAt: new Date().toISOString(), settings: whole })) as SceneFile;
}

/** A scene file that cannot be taken: the message says why, in French, for the admin. */
export class SceneFileError extends Error {}

type Rule = (v: unknown) => unknown;

/**
 * `over` checked against the shape of `base`: only the keys `base` has, each of the kind of its value there (numbers
 * finite, three numbers for a vector), or what the rule of its path says. The result has only what `over` gave
 * (a partial copy); undefined when nothing could be taken.
 */
function shaped(base: unknown, over: unknown, rules: Record<string, Rule>, path = ""): unknown {
  const rule = rules[path];
  if (rule) return rule(over);
  if (isPlain(base)) {
    if (!isPlain(over)) return undefined;
    const out: Plain = {};
    for (const key of Object.keys(base)) {
      if (!(key in over)) continue;
      const v = shaped(base[key], over[key], rules, path ? path + "." + key : key);
      if (v !== undefined) out[key] = v;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  if (Array.isArray(base)) return base.length === 3 && base.every(finite) ? vec3(over) : undefined;
  if (typeof base === "number") return finite(over) ? over : undefined;
  if (typeof base === "boolean") return typeof over === "boolean" ? over : undefined;
  if (typeof base === "string") return text(over, 200);
  return undefined;
}

const lightRule: Rule = (v) => {
  if (!Array.isArray(v)) return undefined;
  const kinds = oneOf(["directional", "ambient", "point", "spot"] as const);
  return v.slice(0, 12).flatMap((l: unknown) => {
    if (!isPlain(l)) return [];
    const kind = kinds(l.kind);
    const position = vec3(l.position, -100, 100);
    if (!kind || !position || !finite(l.intensity)) return [];
    return [{ id: text(l.id, 40) ?? "light-" + Math.random().toString(36).slice(2, 8), kind, color: hex(l.color) ?? "#ffffff", intensity: clamp(l.intensity, 0, 100), position, angle: finite(l.angle) ? clamp(l.angle, 0, Math.PI / 2) : 0.5, penumbra: finite(l.penumbra) ? clamp(l.penumbra, 0, 1) : 0.5 }];
  });
};

const backdropRule: Rule = (v) => {
  if (v === null) return null;
  if (!isPlain(v)) return undefined;
  if (v.kind === "color" && hex(v.color)) return { kind: "color", color: hex(v.color) };
  if (v.kind === "gradient" && hex(v.inner) && hex(v.outer)) return { kind: "gradient", inner: hex(v.inner), outer: hex(v.outer) };
  if (v.kind === "env") return { kind: "env" };
  return undefined;
};

const SCENE_RULES: Record<string, Rule> = {
  "envMetal.id": envId,
  "envGem.id": envId,
  backdrop: backdropRule,
  lights: lightRule,
  stand: (v) => (v === null ? null : oneOf(STANDS)(v)),
  "pose.kind": oneOf(POSES),
  "post.tonemap.mode": oneOf(TONEMAPS),
  "ground.preset": oneOf(GROUNDS),
  "ground.light.color": hex,
  "ground.material.color": hex,
  "render.quality": oneOf(["auto", "high", "ultra"] as const),
};

const cameraViewsRule: Rule = (v) => {
  if (!Array.isArray(v)) return undefined;
  return v.slice(0, 40).flatMap((c: unknown, i: number) => {
    if (!isPlain(c)) return [];
    const position = vec3(c.position);
    const target = vec3(c.target);
    if (!position || !target) return [];
    return [{ id: text(c.id, 40) || "view-" + (i + 1), name: text(c.name, 60) ?? "", position, target, ...(finite(c.fov) ? { fov: clamp(c.fov, 5, 120) } : {}) }];
  });
};

const VIEWS_RULES: Record<string, Rule> = { list: cameraViewsRule, ease: oneOf(EASES), interpolation: oneOf(["spherical", "linear"] as const) };

const pair = (v: unknown) => (v === null ? null : Array.isArray(v) && v.length === 2 && v.every(finite) ? [v[0], v[1]] : undefined);
const VIEWER_RULES: Record<string, Rule> = { "distance.portrait": pair, "distance.landscape": pair, quality: oneOf(["auto", "high", "ultra"] as const) };
const TRY_ON_RULES: Record<string, Rule> = { finger: oneOf(FINGERS), axis: oneOf(["x", "y", "z"] as const) };

function configuratorsOf(v: unknown): ModelSettings["configurators"] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.slice(0, 20).flatMap((c: unknown, i: number) => {
    if (!isPlain(c) || !Array.isArray(c.layers) || !Array.isArray(c.options)) return [];
    const layers = c.layers.filter((l: unknown): l is string => typeof l === "string" && l.length <= 200).slice(0, 200);
    const options = c.options.flatMap((o: unknown) => (isPlain(o) && text(o.material, 120) && text(o.label, 60) !== undefined ? [{ material: o.material as string, label: o.label as string }] : [])).slice(0, 40);
    return [{ id: text(c.id, 40) || "config-" + (i + 1), label: text(c.label, 60) ?? "", layers, options }];
  });
}

const FINISHES = ["polished", "satin", "brushed", "hammered", "aged"] as const;

function layerOf(v: unknown): LayerSetting | undefined {
  if (!isPlain(v)) return undefined;
  const role = oneOf(LAYER_ROLES)(v.role);
  if (!role) return undefined;
  const out: LayerSetting = { role };
  const metal = oneOf(METALS)(v.metal);
  if (metal) out.metal = metal;
  const color = hex(v.color);
  if (color) out.color = color;
  const label = text(v.label, 60);
  if (label !== undefined) out.label = label;
  const material = text(v.material, 120);
  if (material) out.material = material;
  if (isPlain(v.finish) && oneOf(FINISHES)(v.finish.kind)) out.finish = { kind: v.finish.kind as (typeof FINISHES)[number], ...(finite(v.finish.angle) ? { angle: clamp(v.finish.angle, -360, 360) } : {}) };
  if (isPlain(v.diamond)) {
    const diamond = gemParams(v.diamond);
    if (Object.keys(diamond).length > 0) out.diamond = diamond;
  }
  if (finite(v.bevel)) out.bevel = clamp(v.bevel, 0, 16);
  if (typeof v.bloom === "boolean") out.bloom = v.bloom;
  return out;
}

const NAMES: Record<string, string> = {
  layers: "parties",
  metals: "métaux proposés",
  view: "vue de départ",
  background: "fond",
  ambiance: "ambiance",
  diamonds: "rendu des diamants",
  scene: "éclairages, effets, sol",
  views: "vues de caméra",
  viewer: "visualiseur du client",
  configurators: "configurateurs",
  tryOn: "essayage",
};

/**
 * A scene file read back, checked: the settings it gives (only what it holds, each value checked) and what was done,
 * in French. With `layers` (the names of the parts of the model open in the editor), only the settings of parts of
 * the same name are taken. Throws a SceneFileError (French message) when the file is not a scene of ours.
 */
export function readSceneJson(json: unknown, opts: { layers?: string[] } = {}): { settings: Partial<ModelSettings>; notes: string[] } {
  let data = json;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      throw new SceneFileError("Ce fichier n'est pas lisible (il devrait finir par " + SCENE_SUFFIX + ").");
    }
  }
  if (!isPlain(data) || data.format !== SCENE_FORMAT) throw new SceneFileError("Ce fichier n'est pas une scène Berete (" + SCENE_SUFFIX + ").");
  if (!finite(data.version) || data.version > SCENE_VERSION) throw new SceneFileError("Cette scène vient d'une version plus récente de l'éditeur : mettez le site à jour, puis réessayez.");
  const raw = data.settings;
  if (!isPlain(raw)) throw new SceneFileError("Cette scène est vide.");

  const out: Partial<ModelSettings> = {};
  const notes: string[] = [];
  if (isPlain(raw.layers)) {
    const all = Object.entries(raw.layers).slice(0, 2000);
    const wanted = opts.layers ? new Set(opts.layers) : null;
    const layers: Record<string, LayerSetting> = {};
    for (const [name, value] of all) {
      if (name.length > 200 || (wanted && !wanted.has(name))) continue;
      const layer = layerOf(value);
      if (layer) layers[name] = layer;
    }
    if (Object.keys(layers).length > 0) out.layers = layers;
    if (wanted && all.length > 0) {
      const taken = Object.keys(layers).length;
      notes.push(taken === all.length ? "Réglages des " + taken + " parties repris." : "Réglages de " + taken + " parties sur " + all.length + " repris (les autres n'existent pas dans ce modèle).");
    }
  }
  if (Array.isArray(raw.metals)) {
    const metals = raw.metals.filter((m): m is (typeof METALS)[number] => (METALS as readonly unknown[]).includes(m));
    if (metals.length > 0) out.metals = [...new Set(metals)];
  }
  if (raw.view === null) out.view = null;
  else if (isPlain(raw.view)) {
    const position = vec3(raw.view.position);
    const target = vec3(raw.view.target);
    if (position && target) out.view = { position, target };
  }
  const ambiance = oneOf(AMBIANCES)(raw.ambiance);
  if (ambiance) out.ambiance = ambiance;
  if ((BACKGROUNDS as readonly unknown[]).includes(raw.background) || raw.background === "dark" || raw.background === "light") out.background = backgroundOf(raw.background);
  const diamonds = oneOf(DIAMOND_LOOKS)(raw.diamonds);
  if (diamonds) out.diamonds = diamonds;
  const scene = shaped(DEFAULT_SCENE, raw.scene, SCENE_RULES);
  if (scene) out.scene = scene as ModelSettings["scene"];
  const views = shaped(DEFAULT_VIEWS, raw.views, VIEWS_RULES);
  if (views) out.views = views as ModelSettings["views"];
  const viewer = shaped(DEFAULT_VIEWER, raw.viewer, VIEWER_RULES);
  if (viewer) out.viewer = viewer as ModelSettings["viewer"];
  const configurators = configuratorsOf(raw.configurators);
  if (configurators) out.configurators = configurators;
  const tryOn = shaped(DEFAULT_TRY_ON, raw.tryOn, TRY_ON_RULES);
  if (tryOn) out.tryOn = tryOn as ModelSettings["tryOn"];

  const taken = Object.keys(out).filter((k) => k !== "layers").map((k) => NAMES[k] ?? k);
  if (taken.length === 0 && !out.layers) throw new SceneFileError("Aucun réglage n'a pu être repris de cette scène.");
  if (taken.length > 0) notes.unshift("Scène Berete lue : " + taken.join(", ") + ".");
  const count = out.views?.list?.length ?? 0;
  if (count > 0) notes.push(count + (count > 1 ? " vues de caméra reprises." : " vue de caméra reprise."));
  const custom = [out.scene?.envMetal?.id, out.scene?.envGem?.id].filter((id): id is string => typeof id === "string" && id.startsWith("custom:"));
  if (custom.length > 0) notes.push("Cette scène utilise un éclairage importé : il doit encore exister dans « Éclairages importés ».");
  return { settings: out, notes };
}

/**
 * The settings a scene file gives (each value checked; only what it holds), to merge into the model open in the editor:
 * `{ ...settings, ...result, layers: { ...settings.layers, ...result.layers } }`. With `layers`, only the parts of the
 * same name are taken. Throws a SceneFileError (French message) when the file is not a scene of ours.
 */
export function applySceneJson(json: unknown, layers?: string[]): Partial<ModelSettings> {
  return readSceneJson(json, { layers }).settings;
}
