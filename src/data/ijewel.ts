/*
 * What an export of iJewel3D (the jewellers' tool, built on WebGi) says, in the words of our own 3D scene (26/11/2026):
 * - a .glb whose materials carry the extension WEBGI_materials_diamond: the settings of each kind of stone;
 * - a .vjson file: the scene of the viewer (tone, glow, reflections, ground, lighting, background).
 * Pure functions, used by the server (reading a .glb) and by the admin (reading a .vjson). Nothing here ever throws:
 * whatever is not understood is left out (and named in the notes, in French, for the admin).
 *
 * No export of Yoni's has been seen yet (26/11/2026): the names below are those WebGi's diamond material and plugins
 * use publicly. Assumptions, to check on the first real file:
 * - keys may come in any case, with or without "_" or "-" (envMapIntensity, env_map_intensity...); settings may sit
 *   under a "params", "properties", "values", "data" or "uniforms" object;
 * - colours: a number 0xrrggbb, a string "#rrggbb" / "#rgb" / "rgb(r, g, b)", an object {r, g, b} or an array [r, g, b]:
 *   from 0 to 1 they are taken as linear (as glTF), above 1 as 0–255 sRGB;
 * - angles (envMapRotation, environment rotation) are in radians; a vector of three is an XYZ rotation;
 * - tone mapping is three.js's number (1 linear, 2 Reinhard, 3 Cineon, 4 ACES Filmic, 5 custom: Uncharted 2 in WebGi,
 *   6 AgX, 7 Neutral) or a name;
 * - in a .vjson, plugins are objects whose "type" (or "name", or their key) names them: TonemapPlugin, BloomPlugin,
 *   SSRPlugin, GroundPlugin, BakedGroundPlugin / ShadowPlugin, SSAOPlugin, DepthOfFieldPlugin, VignettePlugin,
 *   ChromaticAberrationPlugin, FilmicGrainPlugin, ProgressivePlugin, TemporalAAPlugin; the scene's environment and
 *   background sit under "scene" (or at the top).
 */
import type { DiamondParams, GroundPreset, SceneSettings, ToneMap, Vec3 } from "./scene3d.js";

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => typeof v === "object" && v !== null && !Array.isArray(v);

/** A key without case, "_", "-" or spaces: envMapIntensity, env_map_intensity and EnvMapIntensity are one. */
const norm = (key: string) => key.toLowerCase().replace(/[\s_-]+/g, "");

/** Wrappers whose content is the settings themselves. */
const WRAPPERS = new Set(["params", "properties", "values", "data", "uniforms", "pass", "settings", "options", "extras", "userdata"]);

/** The keys of an object (and of the wrappers in it, one level deep), normalised. */
function flat(source: unknown, depth = 0): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (!isPlain(source) || depth > 3) return out;
  for (const [k, v] of Object.entries(source)) {
    const key = norm(k);
    if (WRAPPERS.has(key) && isPlain(v)) {
      for (const [ik, iv] of flat(v, depth + 1)) if (!out.has(ik)) out.set(ik, iv);
    } else out.set(key, v);
  }
  return out;
}

function pick(map: Map<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) if (map.has(norm(k))) return map.get(norm(k));
  return undefined;
}

function num(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  if (isPlain(v) && "value" in v) return num(v.value);
  return undefined;
}

function bool(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === 1 || v === 0) return v === 1;
  if (v === "true" || v === "false") return v === "true";
  if (isPlain(v) && "value" in v) return bool(v.value);
  return undefined;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const degrees = (radians: number) => Math.round(((radians * 180) / Math.PI) * 100) / 100;

function vec3(v: unknown): Vec3 | undefined {
  if (Array.isArray(v) && v.length >= 3 && v.slice(0, 3).every((x) => num(x) !== undefined)) return [num(v[0])!, num(v[1])!, num(v[2])!];
  if (isPlain(v) && ["x", "y", "z"].every((k) => num(v[k]) !== undefined)) return [num(v.x)!, num(v.y)!, num(v.z)!];
  return undefined;
}

const hex2 = (c: number) => Math.round(clamp(c, 0, 255)).toString(16).padStart(2, "0");
/** Linear light (0–1) to sRGB (0–255). */
const srgb = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);

/** A colour as #rrggbb (see the assumptions at the top), or undefined. */
export function colorOf(v: unknown): string | undefined {
  if (typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 0xffffff) return "#" + v.toString(16).padStart(6, "0");
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (/^#?[0-9a-f]{6}$/.test(s)) return "#" + s.replace("#", "");
    if (/^#?[0-9a-f]{3}$/.test(s)) return "#" + [...s.replace("#", "")].map((c) => c + c).join("");
    const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
    if (rgb) return "#" + hex2(Number(rgb[1])) + hex2(Number(rgb[2])) + hex2(Number(rgb[3]));
    return undefined;
  }
  let rgb: number[] | undefined;
  if (Array.isArray(v) && v.length >= 3 && v.slice(0, 3).every((x) => num(x) !== undefined)) rgb = v.slice(0, 3).map((x) => num(x)!);
  else if (isPlain(v) && ["r", "g", "b"].every((k) => num(v[k]) !== undefined)) rgb = [num(v.r)!, num(v.g)!, num(v.b)!];
  if (!rgb) return undefined;
  const bytes = rgb.some((c) => c > 1) ? rgb : rgb.map(srgb);
  return "#" + bytes.map(hex2).join("");
}

/* ---------- Diamonds (WEBGI_materials_diamond) ---------- */

/** The settings of a stone read from the extension WEBGI_materials_diamond of a glTF material (unknown keys left out). */
export function diamondFromWebgi(ext: unknown): Partial<DiamondParams> {
  try {
    const m = flat(ext);
    const out: Partial<DiamondParams> = {};
    const color = colorOf(pick(m, "color", "colour", "diamondColor"));
    if (color) out.color = color;
    const intensity = num(pick(m, "envMapIntensity", "envIntensity"));
    if (intensity !== undefined) out.envIntensity = clamp(intensity, 0, 20);
    const dispersion = num(pick(m, "dispersion"));
    if (dispersion !== undefined) out.dispersion = clamp(dispersion, 0, 1);
    const ior = num(pick(m, "refractiveIndex", "ior", "indexOfRefraction"));
    if (ior !== undefined) out.refractiveIndex = clamp(ior, 1, 4);
    const bounces = num(pick(m, "rayBounces", "bounces"));
    if (bounces !== undefined) out.rayBounces = Math.round(clamp(bounces, 1, 12));
    const boost = vec3(pick(m, "boostFactors", "boost"));
    if (boost) out.boost = boost.map((b) => clamp(b, 0, 10)) as Vec3;
    const absorption = num(pick(m, "absorptionFactor", "absorption"));
    if (absorption !== undefined) out.absorption = clamp(absorption, 0, 50);
    const gamma = num(pick(m, "gammaFactor", "gamma"));
    if (gamma !== undefined) out.gamma = clamp(gamma, 0.05, 10);
    const rotation = pick(m, "envMapRotation", "envRotation");
    const turned = num(rotation);
    if (turned !== undefined) out.envRotation = degrees(turned);
    else {
      const xyz = vec3(rotation);
      if (xyz) out.envRotationXYZ = xyz.map(degrees) as Vec3;
    }
    const transmission = num(pick(m, "transmission"));
    if (transmission !== undefined) out.transmission = clamp(transmission, 0, 1);
    const reflectivity = num(pick(m, "reflectivity"));
    if (reflectivity !== undefined) out.reflectivity = clamp(reflectivity, 0, 1);
    const oriented = pick(m, "diamondOrientedEnvMap", "orientedEnvMap");
    const asNumber = num(oriented);
    const asBool = bool(oriented);
    if (asNumber !== undefined) out.orientedLighting = clamp(asNumber, 0, 1);
    else if (asBool !== undefined) out.orientedLighting = asBool ? 1 : 0;
    // cacheKey (WebGi's own cache of the stone's shape) and the rest are left out.
    return out;
  } catch {
    return {};
  }
}

/** The settings found on one glTF material: from its extension, else from its extras (some exports keep them there). */
export function diamondOfMaterial(material: unknown): Partial<DiamondParams> | null {
  if (!isPlain(material)) return null;
  const extensions = isPlain(material.extensions) ? material.extensions : {};
  const key = Object.keys(extensions).find((k) => norm(k) === "webgimaterialsdiamond");
  if (key) return diamondFromWebgi(extensions[key]);
  const extras = isPlain(material.extras) ? material.extras : null;
  if (extras) {
    const inner = Object.entries(extras).find(([k, v]) => norm(k).includes("diamond") && isPlain(v));
    if (inner) return diamondFromWebgi(inner[1]);
    const read = diamondFromWebgi(extras);
    if (Object.keys(read).length >= 2 && ("refractiveIndex" in read || "dispersion" in read)) return read;
  }
  return null;
}

/* ---------- The scene (.vjson) ---------- */

/** A partial scene: nested objects are partial too, completed by `merged` (./scene3d.ts) when read. */
type Partialish = Record<string, unknown>;

const TONE: Record<string, ToneMap> = { "1": "linear", "2": "reinhard", "3": "cineon", "4": "aces", "5": "uncharted2", "6": "agx", "7": "aces" };
const TONE_NAMES: [RegExp, ToneMap][] = [
  [/aces/, "aces"],
  [/agx/, "agx"],
  [/reinhard/, "reinhard"],
  [/cineon/, "cineon"],
  [/uncharted|filmic2/, "uncharted2"],
  [/linear|none/, "linear"],
];

function toneOf(v: unknown): ToneMap | undefined {
  const n = num(v);
  if (n !== undefined) return TONE[String(Math.round(n))];
  if (typeof v === "string") return TONE_NAMES.find(([re]) => re.test(v.toLowerCase()))?.[1];
  return undefined;
}

type Mapper = (m: Map<string, unknown>, scene: Partialish, notes: string[]) => string[];

const set = (scene: Partialish, path: string[], value: unknown) => {
  if (value === undefined) return;
  let at = scene;
  for (const k of path.slice(0, -1)) {
    if (!isPlain(at[k])) at[k] = {};
    at = at[k] as Partialish;
  }
  at[path[path.length - 1]!] = value;
};

/** Reads some keys of a plugin into the scene; gives back the names of what it read. */
function reader(m: Map<string, unknown>, scene: Partialish) {
  const read: string[] = [];
  const put = (path: string[], value: unknown, label: string) => {
    if (value === undefined) return;
    set(scene, path, value);
    read.push(label);
  };
  return { read, put, n: (...k: string[]) => num(pick(m, ...k)), b: (...k: string[]) => bool(pick(m, ...k)) };
}

const PLUGINS: [RegExp, string, Mapper][] = [
  [/tonemap/, "tonalité", (m, scene) => {
    const r = reader(m, scene);
    r.put(["post", "tonemap", "mode"], toneOf(pick(m, "toneMapping", "mode", "tonemapping")), "mode");
    r.put(["post", "tonemap", "exposure"], r.n("exposure", "toneMappingExposure"), "exposition");
    r.put(["post", "tonemap", "saturation"], r.n("saturation"), "saturation");
    r.put(["post", "tonemap", "contrast"], r.n("contrast"), "contraste");
    r.put(["post", "tonemap", "background"], r.b("tonemapBackground"), "fond");
    r.put(["post", "tonemap", "clipBackground"], r.b("clipBackground"), "fond transparent");
    return r.read;
  }],
  [/bloom/, "lueur", (m, scene) => {
    const r = reader(m, scene);
    r.put(["post", "bloom", "enabled"], r.b("enabled"), "activée");
    r.put(["post", "bloom", "threshold"], r.n("threshold", "bloomThreshold"), "seuil");
    r.put(["post", "bloom", "softThreshold"], r.n("softThreshold", "knee"), "seuil doux");
    r.put(["post", "bloom", "intensity"], r.n("intensity", "bloomIntensity", "strength"), "intensité");
    r.put(["post", "bloom", "radius"], r.n("radius", "bloomRadius"), "rayon");
    r.put(["post", "bloom", "power"], r.n("power", "bloomPower"), "puissance");
    r.put(["post", "bloom", "iterations"], r.n("iterations", "bloomIterations"), "passes");
    return r.read;
  }],
  [/ssr|screenspacereflection/, "reflets", (m, scene) => {
    const r = reader(m, scene);
    r.put(["post", "ssr", "enabled"], r.b("enabled"), "activés");
    r.put(["post", "ssr", "intensity"], r.n("intensity"), "intensité");
    r.put(["post", "ssr", "boost"], vec3(pick(m, "boost")), "gain");
    r.put(["post", "ssr", "radius"], r.n("objectRadius", "radius"), "rayon");
    r.put(["post", "ssr", "autoRadius"], r.b("autoRadius"), "rayon auto");
    r.put(["post", "ssr", "power"], r.n("power"), "puissance");
    r.put(["post", "ssr", "tolerance"], r.n("tolerance"), "tolérance");
    r.put(["post", "ssr", "steps"], r.n("stepCount", "steps"), "pas");
    r.put(["post", "ssr", "lowQualityFrames"], r.n("lowQualityFrames"), "images rapides");
    return r.read;
  }],
  [/ssao|ambientocclusion|\bao\b/, "ombres de contact", (m, scene) => {
    const r = reader(m, scene);
    r.put(["post", "ao", "enabled"], r.b("enabled"), "activées");
    r.put(["post", "ao", "intensity"], r.n("intensity"), "intensité");
    r.put(["post", "ao", "radius"], r.n("radius"), "rayon");
    return r.read;
  }],
  [/depthoffield|\bdof\b/, "profondeur de champ", (m, scene) => {
    const r = reader(m, scene);
    r.put(["post", "dof", "enabled"], r.b("enabled"), "activée");
    r.put(["post", "dof", "aperture"], r.n("aperture"), "ouverture");
    r.put(["post", "dof", "maxBlur"], r.n("maxBlur"), "flou");
    return r.read;
  }],
  [/vignette/, "vignettage", (m, scene) => {
    const r = reader(m, scene);
    r.put(["post", "vignette", "enabled"], r.b("enabled"), "activé");
    r.put(["post", "vignette", "offset"], r.n("offset"), "taille");
    r.put(["post", "vignette", "darkness"], r.n("darkness", "power"), "force");
    return r.read;
  }],
  [/chromatic/, "aberration chromatique", (m, scene) => {
    const r = reader(m, scene);
    r.put(["post", "chromatic", "enabled"], r.b("enabled"), "activée");
    r.put(["post", "chromatic", "offset"], r.n("offset", "intensity"), "décalage");
    return r.read;
  }],
  [/grain|noise/, "grain", (m, scene) => {
    const r = reader(m, scene);
    r.put(["post", "grain", "enabled"], r.b("enabled"), "activé");
    r.put(["post", "grain", "intensity"], r.n("intensity"), "intensité");
    return r.read;
  }],
  [/progressive/, "rendu progressif", (m, scene) => {
    const r = reader(m, scene);
    const frames = r.n("maxFrameCount", "frames", "progressive");
    r.put(["render", "progressive"], frames === undefined ? undefined : Math.round(clamp(frames, 1, 1024)), "images");
    return r.read;
  }],
  [/temporalaa|\btaa\b/, "lissage", (m, scene) => {
    const r = reader(m, scene);
    r.put(["render", "taa"], r.b("enabled"), "activé");
    return r.read;
  }],
  [/bakedground|shadow/, "ombre au sol", (m, scene) => {
    const r = reader(m, scene);
    const frames = r.n("shadowFrames", "maxFrameNumber", "frames");
    r.put(["ground", "shadowFrames"], frames === undefined ? undefined : Math.round(clamp(frames, 1, 400)), "images de l'ombre");
    r.put(["ground", "opacity"], r.n("opacity", "shadowOpacity"), "opacité");
    const enabled = r.b("enabled", "visible");
    if (enabled === false) r.put(["ground", "preset"], "soft" satisfies GroundPreset, "sans ombre");
    return r.read;
  }],
  [/ground/, "sol", (m, scene) => {
    const r = reader(m, scene);
    const visible = r.b("visible", "enabled");
    const reflective = r.b("useReflection", "reflective", "ssrGround");
    if (visible === false) r.put(["ground", "preset"], "none" satisfies GroundPreset, "caché");
    else if (reflective) r.put(["ground", "preset"], "reflective" satisfies GroundPreset, "miroir");
    else if (visible === true) r.put(["ground", "preset"], "contact" satisfies GroundPreset, "visible");
    r.put(["ground", "renderToDepth"], r.b("renderToDepth"), "fondu dans le fond");
    r.put(["ground", "limitCamera"], r.b("limitCameraAboveGround", "limitCamera"), "caméra au-dessus");
    r.put(["ground", "tonemap"], r.b("tonemapGround"), "tonalité du sol");
    const material = flat(pick(m, "material", "groundMaterial"));
    r.put(["ground", "material", "color"], colorOf(pick(material, "color")) ?? colorOf(pick(m, "color")), "couleur");
    r.put(["ground", "material", "roughness"], num(pick(material, "roughness")), "rugosité");
    r.put(["ground", "material", "metalness"], num(pick(material, "metalness")), "métal");
    return r.read;
  }],
];

/** The environment and the background, wherever the file keeps them. */
function readStage(m: Map<string, unknown>, scene: Partialish): string[] {
  const r = reader(m, scene);
  const rotation = pick(m, "envMapRotation", "environmentRotation");
  const turned = num(rotation);
  if (turned !== undefined) r.put(["envMetal", "rotation"], degrees(turned), "rotation de l'éclairage");
  else {
    const xyz = vec3(rotation);
    if (xyz) r.put(["envMetal", "rotation"], degrees(xyz[1]), "rotation de l'éclairage");
  }
  r.put(["envMetal", "intensity"], r.n("envMapIntensity", "environmentIntensity"), "intensité de l'éclairage");
  const background = pick(m, "background", "backgroundColor", "clearColor");
  const color = colorOf(isPlain(background) && "color" in background ? background.color : background);
  if (color) r.put(["backdrop"], { kind: "color", color }, "couleur du fond");
  if (background === null || background === "transparent") r.put(["post", "tonemap", "clipBackground"], true, "fond transparent");
  return r.read;
}

/**
 * The scene of a .vjson of iJewel (WebGi), in our settings (`scene` of a model), with notes in French for the admin:
 * what was taken, what was left out. Best effort: never throws; an unreadable file gives an empty scene and a note.
 */
export function sceneFromVjson(json: unknown): { scene: Partial<SceneSettings>; notes: string[] } {
  const scene: Partialish = {};
  const notes: string[] = [];
  try {
    let data = json;
    if (typeof data === "string") data = JSON.parse(data);
    if (!isPlain(data) && !Array.isArray(data)) return { scene: {}, notes: ["Ce fichier de scène iJewel ne peut pas être lu."] };
    const taken = new Map<string, string[]>();
    const unknown = new Set<string>();
    const seen = new Set<unknown>();
    const visit = (node: unknown, key: string, depth: number) => {
      if (depth > 12 || seen.has(node)) return;
      if (Array.isArray(node)) {
        for (const item of node) visit(item, key, depth + 1);
        return;
      }
      if (!isPlain(node)) return;
      seen.add(node);
      const kind = [node.type, node.name, node.plugin, key].find((v) => typeof v === "string" && v.length > 0) as string | undefined;
      const label = norm(kind ?? "");
      const plugin = PLUGINS.find(([re]) => re.test(label));
      if (plugin) {
        const read = plugin[2](flat(node), scene, notes);
        if (read.length > 0) taken.set(plugin[1], [...(taken.get(plugin[1]) ?? []), ...read]);
      } else if (/plugin$/.test(label) && typeof node.type === "string") unknown.add(node.type);
      if (/scene|viewer|environment|background|root/.test(label) || depth === 0) {
        const read = readStage(flat(node), scene);
        if (read.length > 0) taken.set("scène", [...(taken.get("scène") ?? []), ...read]);
      }
      for (const [k, v] of Object.entries(node)) if (isPlain(v) || Array.isArray(v)) visit(v, k, depth + 1);
    };
    visit(data, "", 0);
    for (const [what, list] of taken) notes.push("Repris d'iJewel : " + what + " (" + [...new Set(list)].join(", ") + ").");
    if (unknown.size > 0) notes.push("Non repris (sans équivalent ici) : " + [...unknown].slice(0, 12).join(", ") + ".");
    if (taken.size === 0) notes.push("Aucun réglage de scène reconnu dans ce fichier iJewel.");
    notes.push("Les images d'éclairage d'iJewel ne sont pas reprises : la scène garde nos éclairages, avec la rotation et l'intensité lues.");
  } catch {
    return { scene: {}, notes: ["Ce fichier de scène iJewel ne peut pas être lu."] };
  }
  // Nested objects are partial: `merged` (./scene3d.ts) completes them with the defaults when the scene is read.
  return { scene: scene as Partial<SceneSettings>, notes };
}
