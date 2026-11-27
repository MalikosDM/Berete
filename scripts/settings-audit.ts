/*
 * The test of every setting of the 3D editor (27/11/2026), on the ring ZR0982 (a big emerald cut, two baguettes) and on
 * one of the client's Rhino files (the octagon « N » v1). For each slider, switch and choice of the expert editor (and
 * the simple mode's choices), a low and a high value (or each option) are drawn by our own engine in the 3D lab, with the
 * settings given in the address only (the models are never saved), and the two pictures are compared over the jewel:
 * mean difference, and its direction (brighter, darker, more colour, more contrast, glow, blur…). The stones are also
 * measured by the engine (StageApi.measureStones: mean brightness, share of black and of flat white), at every extreme
 * and at the darkest and brightest combinations of the stones' sliders under every lighting.
 * Then, in the real editor, each control is moved by hand (Playwright) and the picture must change at once; « Enregistrer »
 * is intercepted (never sent) to check that the control writes the setting it should.
 * Out: docs/3d-reglages-testes.md (the table), public/media/3d-lib/help/<key>-a|b.webp (the help pictures, ZR0982),
 * .local/settings-audit/results.json (all the numbers).
 *
 * Needs the development server (npx vite --port 5390) and the API (3001), ADMIN_PASSWORD in .env (read, never printed).
 *   npx tsx scripts/settings-audit.ts                      everything (about an hour)
 *   PHASE=lab,extremes,ui,doc  ONLY=exposure,ior  MODELS=ZR  LIB=0 (without the 82 materials of the library)
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium, type Page } from "@playwright/test";
import { GEM_ENVS, GROUNDS, METAL_ENVS, STANDS, TONEMAPS, type Vec3 } from "../src/data/scene3d";
import { BACKGROUNDS, LAYER_ROLES, METALS } from "../src/data/models";
import { LOOK_NAMES, LOOKS } from "../src/viewer/looks";
import { libraryOf } from "../src/viewer/library/materials";
import { HDRI } from "../src/viewer/hdri/library";
import { BACKGROUND_NAMES_FR, FINISH_NAMES, GROUND_NAMES, METAL_NAMES_FR, POSE_NAMES, SCENE_PRESETS, SIMPLE_AMBIANCES, SIMPLE_METALS, SIMPLE_STONES, SIMPLE_VIEWS, STAND_NAMES_FR, TONEMAP_NAMES } from "../src/pages/admin/editor3d/presets";
import { HELP, helpOf } from "../src/pages/admin/editor3d/help";

const LAB = process.env.LAB_URL ?? "http://localhost:5390";
const API = process.env.API_URL ?? "http://localhost:3001";
const SIZE = 800;
const HELP_SIZE = 160;
const OUT_HELP = path.resolve("public/media/3d-lib/help");
const DOC = path.resolve("docs/3d-reglages-testes.md");
const WORK = path.resolve(process.env.AUDIT_WORK ?? ".local/settings-audit");
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;
const PHASES = (process.env.PHASE ?? "lab,extremes,ui,doc").split(",");
const WITH_LIBRARY = process.env.LIB !== "0";
const MODELS = [
  { id: "cmw9zbffw0004bjvuk2xabqkb", short: "ZR", name: "ZR0982 (bague : une grosse pierre taille émeraude, deux baguettes)" },
  { id: "cmwxiz28t0002rvvuiz3uzyxg", short: "N", name: "Octogone « N » v1 (fichier Rhino du client : pavé de petites pierres)" },
].filter((m) => !process.env.MODELS || process.env.MODELS.split(",").includes(m.short));

/* ---------- Types ---------- */

type Json = Record<string, unknown>;
type Val = unknown;
type Patch = { settings?: Json; scene?: Json; query?: Record<string, string>; js?: string };
type Target = "stone" | "metal" | "ring" | "frame" | "bg" | "ground";
/** What the high value should do, compared with the low one (on the case's region). */
type Expect = "brighter" | "darker" | "saturated" | "desaturated" | "contrast" | "flatter" | "warmer" | "cooler" | "glow" | "less-glow" | "blurrier" | "sharper" | "changes" | "hidden" | "same" | "any";
type Ctx = { id: string; short: string; name: string; file: string; settings: Json; stones: string[]; metals: string[]; big: string; masks: Masks | null; poses: Record<string, Vec3>; picks: { stone: [number, number]; band: [number, number] } | null };
type UiStep = [string, Val];
type Ui = { tab?: string; part?: "stone" | "metal"; drawer?: string; before?: UiStep[]; control?: string; value?: Val; simple?: boolean; /** checks only the first number of three */ vecX?: boolean; /** the client's viewer only: the editor's picture does not change */ noLive?: boolean; /** what « Enregistrer » must hold (else the paths the lab changes) */ want?: (v: Val) => Json };
type Base = { key: string; tab: string; name: string; expected: string; target: Target; pre?: (c: Ctx) => Patch; ui?: Ui | false; note?: string; /** enough that one of the two models shows it (a stone always drawn exactly on the other one) */ needOne?: boolean };
type RangeCase = Base & { kind: "range" | "toggle" | "color" | "vec3"; expect: Expect; a: Val; b: Val; apply: (c: Ctx, v: Val) => Patch };
type ChoiceCase = Base & { kind: "choice"; options: [Val, string][]; base: Val; pair?: [Val, Val]; expectOf?: (v: Val) => Expect; apply: (c: Ctx, v: Val) => Patch };
type StaticCase = Base & { kind: "static"; check: { file: string; pattern: RegExp }; why: string };
type Case = RangeCase | ChoiceCase | StaticCase;

/* ---------- Small helpers ---------- */

const isPlain = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
function deep(a: Json, b: Json | undefined): Json {
  if (!b) return a;
  const out: Json = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isPlain(v) && isPlain(out[k]) ? deep(out[k] as Json, v) : v;
  return out;
}
const each = (names: string[], v: Json) => Object.fromEntries(names.map((n) => [n, v]));
/** A stone setting on every layer of stones. */
const S = (c: Ctx, d: Json, more: Json = {}): Patch => ({ settings: { layers: each(c.stones, { ...more, diamond: d }) } });
/** A setting on every metal layer. */
const M = (c: Ctx, l: Json): Patch => ({ settings: { layers: each(c.metals, l) } });
const SC = (scene: Json): Patch => ({ scene });
const POST = (post: Json): Patch => ({ scene: { post } });
const join = (...patches: (Patch | undefined)[]): Patch => {
  let out: Patch = {};
  for (const p of patches) {
    if (!p) continue;
    out = { settings: deep(out.settings ?? {}, p.settings), scene: deep(out.scene ?? {}, p.scene), query: { ...(out.query ?? {}), ...(p.query ?? {}) }, js: [out.js, p.js].filter(Boolean).join(";") || undefined };
  }
  return out;
};
const fr = (n: number, d = 2) => n.toFixed(d).replace(".", ",").replace("-", "−");
const pct = (a: number, b: number) => (a > 1e-4 ? (b >= a ? "+" : "−") + Math.round((Math.abs(b - a) / a) * 100) + " %" : fr(b - a));
const lightPre = (kind: string, intensity = 2): Patch => SC({ lights: [{ id: "t", kind, color: "#fff4e8", intensity, position: [0.6, 1, 0.8], angle: 0.5, penumbra: 0.6 }] });
const light = { ground: { preset: "contact" } };
void light;

/* ---------- Every control of the editor ---------- */

const CASES: Case[] = [
  /* Vue */
  { key: "quality", tab: "Vue", name: "Qualité", expected: "Très haute : plus de rebonds dans les pierres, image plus lisse", kind: "choice", target: "stone", options: [["auto", "Automatique"], ["high", "Haute"], ["ultra", "Très haute"]], base: "auto", pair: ["high", "ultra"], expectOf: (v) => (v === "high" ? "same" : "changes"), needOne: true, note: "Sur un ordinateur, « Automatique » est « Haute ».", apply: (_, v) => SC({ render: { quality: v } }), ui: { tab: "view" } },
  { key: "fov", tab: "Vue", name: "Champ de vision", expected: "Plus de perspective quand il grandit", kind: "range", target: "frame", expect: "changes", a: 12, b: 60, apply: (_, v) => SC({ camera: { fov: v } }), ui: { tab: "view" } },
  { key: "auto-scale", tab: "Vue", name: "Mise à l'échelle automatique (Auto Scale)", expected: "Le bijou cadré entier à la première vue", kind: "toggle", target: "frame", expect: "changes", a: false, b: true, apply: (_, v) => SC({ camera: { autoScale: v } }), ui: { tab: "view" } },
  { key: "auto-center", tab: "Vue", name: "Centrage automatique (Auto Center)", expected: "La première vue vise le milieu du bijou", kind: "toggle", target: "frame", expect: "changes", a: false, b: true, apply: (_, v) => SC({ camera: { autoCenter: v } }), ui: { tab: "view" } },
  ...(
    [
      ["client-zoom", "Zoom à la molette et au pincement", /zoom=\{options\.zoom\}/],
      ["client-zoom-buttons", "Boutons + et −", /options\.zoomButtons/],
      ["client-prompt", "Invite « Glissez pour tourner »", /options\.prompt/],
      ["client-auto-rotate", "Rotation automatique au départ", /options\.autoRotate/],
      ["client-views", "Vues enregistrées et visite guidée", /options\.views/],
      ["client-configurator", "Configurateur (pastilles en bas)", /options\.configurator/],
      ["client-share", "Bouton Partager", /options\.share/],
      ["client-fullscreen", "Plein écran", /options\.fullscreen/],
      ["client-try-on", "Essayage (bagues)", /options\.tryOn/],
      ["client-ar", "Voir chez moi (réalité augmentée)", /options\.ar/],
      ["client-quality", "Qualité chez le client", /options\.quality/],
      ["zoom-limit", "Limiter le zoom (écran en hauteur / en largeur)", /options\.distance\.(portrait|landscape)/],
    ] as [string, string, RegExp][]
  ).map(([key, name, pattern]): StaticCase => {
    const field = { "client-zoom": "zoom", "client-zoom-buttons": "zoomButtons", "client-prompt": "prompt", "client-auto-rotate": "autoRotate", "client-views": "views", "client-configurator": "configurator", "client-share": "share", "client-fullscreen": "fullscreen", "client-try-on": "tryOn", "client-ar": "ar", "client-quality": "quality" }[key];
    const value = key === "client-quality" ? "ultra" : key === "client-auto-rotate";
    return { key, tab: "Vue", name, expected: "Un bouton ou un geste chez le client", target: "frame", kind: "static", check: { file: "src/viewer/JewelViewer.tsx", pattern }, why: "Pas un réglage de l'image : lu par le visualiseur du client (vérifié dans son code ; boutons testés par tests/editor3d.spec.ts).", ui: field ? { tab: "view", noLive: true, value, want: (v) => ({ viewer: { [field]: v } }) } : false };
  }),
  { key: "rotate-speed", tab: "Vue", name: "Vitesse de la rotation automatique (Rotate Speed)", expected: "Le bijou tourne plus ou moins vite, dans un sens ou dans l'autre", kind: "range", target: "frame", expect: "changes", a: -1.5, b: 1.5, apply: (_, v) => ({ js: `(() => { const d = window.__berete3d; const v = d.getView(); const p = v.position, t = v.target; const r = Math.hypot(p[0] - t[0], p[1] - t[1], p[2] - t[2]); d.look(Math.atan2(p[0] - t[0], p[2] - t[2]) + ${Number(v)}, Math.acos((p[1] - t[1]) / r)); })()` }), ui: { tab: "view", noLive: true, want: (v) => ({ viewer: { rotateSpeed: v } }) }, note: "Images : la caméra là où la rotation l'amène au bout d'une seconde. La vitesse elle-même est lue par le visualiseur du client (src/viewer/JewelViewer.tsx → Stage : rotateSpeed)." },
  { key: "camera-pan", tab: "Vue", name: "Déplacement latéral (Pan)", expected: "Le client peut ou non faire glisser le bijou", target: "frame", kind: "static", check: { file: "src/viewer/Stage.tsx", pattern: /props\.pan !== false/ }, why: "Un geste du client, pas une image (lu par la scène : clic droit, Maj + glisser, deux doigts).", ui: { tab: "view", noLive: true, value: false, want: (v) => ({ viewer: { pan: v } }) } },
  { key: "polar-limits", tab: "Vue", name: "Limites d'angle de la caméra (Polar Angle Limits)", expected: "La caméra du client ne monte ni ne descend au-delà", target: "frame", kind: "static", check: { file: "src/viewer/Stage.tsx", pattern: /props\.polarLimits/ }, why: "Un mouvement de caméra du client, pas une image (lu par la scène : angles en degrés depuis le dessus).", ui: { tab: "view", noLive: true, value: true, want: () => ({ viewer: { polarLimits: [20, 100] } }) } },
  { key: "zoom-near", tab: "Vue", name: "Au plus près / au plus loin", expected: "Les distances limites du zoom chez le client", target: "frame", kind: "static", check: { file: "src/viewer/Stage.tsx", pattern: /props\.distance/ }, why: "Limite la caméra du client (lue par la scène : minDistance / maxDistance)." },

  /* Parties : la matière */
  { key: "role", tab: "Parties", name: "Rôle", expected: "La partie change de matière (cachée : elle disparaît)", kind: "choice", target: "stone", options: LAYER_ROLES.map((r) => [r, { metal: "Métal", diamond: "Diamant", stone: "Pierre de couleur", enamel: "Émail", hide: "Masquer" }[r]] as [Val, string]), base: "diamond", pair: ["diamond", "stone"], expectOf: (v) => (v === "hide" ? "hidden" : "changes"), apply: (c, v) => ({ settings: { layers: each(c.stones, { role: v, ...(v === "stone" || v === "enamel" ? { color: "#9b111e" } : {}), ...(v === "stone" ? { diamond: { absorption: 0.4 } } : {}) }) } }), ui: { tab: "parts", part: "stone", value: "stone" }, note: "« Pierre de couleur » : rouge (la couleur que montre le champ), densité de couleur 0,4." },
  { key: "metal", tab: "Parties", name: "Métal", expected: "La couleur et l'éclat de l'alliage", kind: "choice", target: "metal", options: METALS.map((m) => [m, METAL_NAMES_FR[m] ?? m] as [Val, string]), base: "rose-gold", pair: ["rose-gold", "white-gold"], expectOf: (v) => (v === "black-rhodium" ? "darker" : v === "rose-gold-14" ? "any" : "changes"), note: "L'or rose 14 carats a presque la couleur de l'or rose 18 carats (valeurs mesurées des alliages) : écart faible, normal.", apply: (c, v) => M(c, { metal: v }), ui: { tab: "parts", part: "metal", value: "white-gold" } },
  { key: "finish", tab: "Parties", name: "Finition", expected: "Poli, satiné, brossé, martelé, vieilli", kind: "choice", target: "metal", options: (Object.entries(FINISH_NAMES) as [Val, string][]).filter(([k]) => k !== "brushed"), base: "polished", pair: ["polished", "satin"], apply: (c, v) => M(c, { finish: { kind: v } }), ui: { tab: "parts", part: "metal", value: "satin" } },
  { key: "brush-angle", tab: "Parties", name: "Sens du brossage", expected: "Les lignes du brossage tournent", note: "Ne se montre plus que sur un métal déjà brossé (la finition « Brossé » est retirée des choix, voir plus bas).", kind: "range", target: "metal", expect: "changes", a: 0, b: 90, apply: (c, v) => M(c, { finish: { kind: "brushed", angle: v } }), ui: { tab: "parts", part: "metal", before: [["finish", "brushed"]] } },
  { key: "metal-color", tab: "Parties", name: "Teinte du métal (Metal Color)", expected: "Le métal prend la teinte choisie", kind: "color", target: "metal", expect: "warmer", a: null, b: "#e9c46f", apply: (c, v) => (v ? M(c, { metalColor: v }) : {}), ui: { tab: "parts", part: "metal" } },
  { key: "roughness", tab: "Parties", name: "Rugosité (Roughness)", expected: "Reflets plus flous, métal plus doux", kind: "range", target: "metal", expect: "flatter", a: 0.05, b: 0.6, apply: (c, v) => M(c, { roughness: v }), ui: { tab: "parts", part: "metal" } },
  { key: "clearcoat", tab: "Parties", name: "Vernis (Clearcoat)", expected: "Un deuxième reflet, net, par-dessus", kind: "range", target: "metal", expect: "changes", a: 0, b: 1, apply: (c, v) => M(c, { clearcoat: v }), ui: { tab: "parts", part: "metal" } },
  { key: "metal-lut", tab: "Parties", name: "Teinte de la matière (LUT), métal", expected: "Le métal plus chaud, plus froid, plus vif…", kind: "choice", target: "metal", options: [["", "Aucune"], ...LOOKS.map((l) => [l, LOOK_NAMES[l]] as [Val, string])], base: "", pair: ["", "chaud"], expectOf: (v) => ({ chaud: "warmer", froid: "cooler", vif: "saturated", "noir-et-blanc": "desaturated" } as Record<string, Expect>)[v as string] ?? "changes", apply: (c, v) => (v ? M(c, { lut: v }) : {}), ui: { tab: "parts", part: "metal", value: "chaud" } },
  { key: "stone-color", tab: "Parties", name: "Couleur (pierre de couleur, émail)", expected: "La pierre prend la couleur choisie", kind: "color", target: "stone", expect: "changes", a: "#9b111e", b: "#0b6e4f", apply: (c, v) => ({ settings: { layers: each(c.stones, { role: "stone", color: v, diamond: { absorption: 0.4 } }) } }), ui: { tab: "parts", part: "stone", before: [["role", "stone"]] } },
  { key: "bevel-layer", tab: "Parties", name: "Biseau à l'écran, cette matière (SSBevel)", expected: "Les arêtes du métal plus arrondies", kind: "range", target: "metal", expect: "changes", a: -1, b: 16, apply: (c, v) => (Number(v) < 0 ? {} : M(c, { bevel: v })), ui: { tab: "parts", part: "metal" } },
  { key: "bloom-layer", tab: "Parties", name: "Lueur sur cette matière (Bloom)", expected: "Les éclats des pierres rayonnent", kind: "toggle", target: "stone", expect: "changes", a: false, b: true, pre: () => POST({ bloom: { threshold: 1.2, intensity: 0.6 } }), apply: (c, v) => ({ settings: { layers: each(c.stones, { bloom: v }) } }), ui: { tab: "effects", before: [["bloom-threshold", 1.2], ["bloom-intensity", 0.6], ["@tab", "parts"], ["@part", "stone"]], value: false }, note: "Mesuré avec une lueur plus forte que celle par défaut (seuil 1,2, intensité 0,6) pour qu'elle se voie." },

  /* Parties : la pierre */
  { key: "gem-env", tab: "Parties", name: "Éclairage de la pierre (Environment)", expected: "Une autre lumière dans cette pierre", kind: "choice", target: "stone", options: [["", "Celui de la scène"], ...GEM_ENVS.filter((x) => x !== "auto").map((id) => [id, HDRI[id]?.name ?? id] as [Val, string])], base: "", pair: ["", "gem-bands"], needOne: true, note: "Quand l'éclairage choisi est celui que « Automatique » prend déjà pour cette taille de pierre, rien ne change (normal).", apply: (c, v) => (v ? S(c, { env: v }) : {}), ui: { tab: "parts", part: "stone", value: "gem-bands" } },
  { key: "gem-color", tab: "Parties", name: "Couleur (Color)", expected: "La pierre teintée", kind: "color", target: "stone", expect: "saturated", a: "#ffffff", b: "#e8a0b4", apply: (c, v) => S(c, { color: v }), ui: { tab: "parts", part: "stone" } },
  { key: "env-intensity", tab: "Parties", name: "Luminosité (Env Intensity)", expected: "Pierre plus lumineuse", kind: "range", target: "stone", expect: "brighter", a: 0.5, b: 3, apply: (c, v) => S(c, { envIntensity: v }), ui: { tab: "parts", part: "stone" } },
  { key: "env-rotation", tab: "Parties", name: "Rotation de l'éclairage (Env Rotation Offset)", expected: "Les éclats changent de place", kind: "range", target: "stone", expect: "changes", a: 0, b: 120, apply: (c, v) => S(c, { envRotation: v }), ui: { tab: "parts", part: "stone" } },
  { key: "env-rotation-xyz", tab: "Parties", name: "Rotation de l'éclairage X / Y / Z", expected: "Les éclats changent de place", kind: "vec3", target: "stone", expect: "changes", a: [0, 0, 0], b: [90, 0, 0], apply: (c, v) => S(c, { envRotationXYZ: v }), ui: { tab: "parts", part: "stone", vecX: true } },
  { key: "dispersion", tab: "Parties", name: "Feu (Dispersion)", expected: "Plus d'éclats colorés", kind: "range", target: "stone", expect: "saturated", a: 0, b: 0.03, apply: (c, v) => S(c, { dispersion: v }), ui: { tab: "parts", part: "stone" } },
  { key: "absorption", tab: "Parties", name: "Densité de couleur (Absorption)", expected: "Pierre teintée plus foncée", kind: "range", target: "stone", expect: "darker", a: 0, b: 1, pre: (c) => S(c, { color: "#e8a0b4" }), apply: (c, v) => S(c, { absorption: v }), ui: { tab: "parts", part: "stone", before: [["gem-color", "#e8a0b4"]] }, note: "Mesuré sur une pierre teintée rose (sans effet sur une pierre blanche, comme dans iJewel). Bornée à 1 : à 4, la moitié de la pierre était noire (à 1,1 déjà 40 %)." },
  { key: "ior", tab: "Parties", name: "Indice de réfraction (Refractive Index)", expected: "La lumière pliée autrement : plus de brillant", kind: "range", target: "stone", expect: "changes", a: 1.5, b: 2.9, apply: (c, v) => S(c, { refractiveIndex: v }), ui: { tab: "parts", part: "stone" } },
  { key: "gamma", tab: "Parties", name: "Contraste intérieur (Gamma)", expected: "Plus de contraste dans la pierre", kind: "range", target: "stone", expect: "contrast", a: 0.6, b: 1.6, apply: (c, v) => S(c, { gamma: v }), ui: { tab: "parts", part: "stone" } },
  { key: "boost", tab: "Parties", name: "Gain par couleur (RGB Boost)", expected: "Pierre plus lumineuse (ou teintée)", kind: "vec3", target: "stone", expect: "brighter", a: [0.6, 0.6, 0.6], b: [1.6, 1.6, 1.6], apply: (c, v) => S(c, { boost: v }), ui: { tab: "parts", part: "stone", vecX: true } },
  { key: "transmission", tab: "Parties", name: "Transparence vers l'arrière (Transmission)", expected: "On voit ce qui est derrière la pierre", kind: "range", target: "stone", expect: "changes", a: 0, b: 0.6, apply: (c, v) => S(c, { transmission: v }), ui: { tab: "parts", part: "stone" } },
  { key: "reflectivity", tab: "Parties", name: "Reflet de surface (Reflectivity)", expected: "Plus de reflet sur le dessus", kind: "range", target: "stone", expect: "brighter", a: 0, b: 1, apply: (c, v) => S(c, { reflectivity: v }), ui: { tab: "parts", part: "stone" } },
  { key: "bounces", tab: "Parties", name: "Rebonds de la lumière (Ray Bounces)", expected: "Plus de lumière qui ressort de la pierre", kind: "range", target: "stone", expect: "changes", a: 1, b: 16, apply: (c, v) => S(c, { rayBounces: v }), ui: { tab: "parts", part: "stone" } },
  { key: "oriented", tab: "Parties", name: "Éclairage orienté (Diamond Oriented Lighting)", expected: "La lumière suit le dessus de chaque pierre", kind: "range", target: "stone", expect: "changes", a: 0, b: 1, pre: () => SC({ pose: { kind: "auto", rotation: [70, 0, 0] } }), apply: (c, v) => S(c, { orientedLighting: v }), needOne: true, ui: { tab: "parts", part: "stone", before: [["pose-rotation", [70, 0, 0]]], value: 0 }, note: "Mesuré le bijou incliné de 70°. N'agit que sur les pierres répétées (le pavé du N) : une pierre seule (l'émeraude de ZR0982) suit déjà son propre dessus, comme prévu par le moteur." },
  { key: "gem-mode", tab: "Parties", name: "Calcul", expected: "Exact ou rapide (même aspect, autre vitesse)", kind: "choice", target: "stone", options: [["auto", "Automatique"], ["trace", "Lancer de rayons"], ["fast", "Rapide"]], base: "auto", pair: ["trace", "fast"], expectOf: () => "any", apply: (c, v) => S(c, { mode: v }), ui: { tab: "parts", part: "stone", value: "fast" } },
  { key: "cube-size", tab: "Parties", name: "Précision de la carte intérieure (Cube Map Size)", expected: "Calcul rapide : intérieur plus ou moins net", kind: "choice", target: "stone", options: [["auto", "Automatique"], ["256", "256"], ["512", "512"], ["1024", "1024"]], base: "auto", expectOf: (v) => (v === "1024" ? "changes" : "any"), needOne: true, note: "Seulement les pierres en calcul rapide (le pavé du N) ; les pierres de ZR0982 sont toujours calculées exactement, et « Automatique » choisit 256 pour un grand pavé.", pre: (c) => S(c, { mode: "fast" }), apply: (c, v) => S(c, { mode: "fast", cubeSize: v === "auto" ? "auto" : Number(v) }), ui: { tab: "parts", part: "stone", before: [["gem-mode", "fast"]], value: "256" } },
  { key: "gem-lut", tab: "Parties", name: "Teinte de la matière (LUT), pierre", expected: "La pierre plus chaude, plus froide, plus vive…", kind: "choice", target: "stone", options: [["", "Aucune"], ...LOOKS.map((l) => [l, LOOK_NAMES[l]] as [Val, string])], base: "", pair: ["", "froid"], expectOf: (v) => ({ chaud: "warmer", froid: "cooler", "noir-et-blanc": "desaturated" } as Record<string, Expect>)[v as string] ?? "changes", apply: (c, v) => (v ? S(c, { lut: v }) : {}), ui: { tab: "parts", part: "stone", value: "froid" } },
  { key: "thin-film", tab: "Parties", name: "Film irisé (Thin Film)", expected: "Reflets irisés sur la pierre", kind: "toggle", target: "stone", expect: "changes", a: false, b: true, apply: (c, v) => (v ? S(c, { thinFilm: { amount: 0.5, thickness: 380 } }) : {}), ui: { tab: "parts", part: "stone" } },
  { key: "thin-film-amount", tab: "Parties", name: "Film irisé : force", expected: "Reflets irisés plus forts", kind: "range", target: "stone", expect: "changes", a: 0.1, b: 1, apply: (c, v) => S(c, { thinFilm: { amount: v, thickness: 380 } }), ui: { tab: "parts", part: "stone", before: [["thin-film", true]] } },
  { key: "thin-film-thickness", tab: "Parties", name: "Film irisé : épaisseur", expected: "Les couleurs des reflets changent", kind: "range", target: "stone", expect: "changes", a: 200, b: 900, apply: (c, v) => S(c, { thinFilm: { amount: 1, thickness: v } }), ui: { tab: "parts", part: "stone", before: [["thin-film", true]] } },
  { key: "inclusions", tab: "Parties", name: "Inclusions", expected: "Un nuage dans la pierre", kind: "toggle", target: "stone", expect: "changes", a: false, b: true, apply: (c, v) => (v ? S(c, { inclusions: { amount: 0.6, scale: 1, roughness: 0.5 } }) : {}), ui: { tab: "parts", part: "stone" }, note: "Allumées à la quantité 0,6 (à 0,3, l'ancien départ, le nuage ne se voyait pas)." },
  { key: "inclusions-amount", tab: "Parties", name: "Inclusions : quantité", expected: "Plus de nuage", kind: "range", target: "stone", expect: "changes", a: 0.1, b: 1, apply: (c, v) => S(c, { inclusions: { amount: v, scale: 1, roughness: 0.5 } }), ui: { tab: "parts", part: "stone", before: [["inclusions", true]] } },
  { key: "inclusions-scale", tab: "Parties", name: "Inclusions : échelle", expected: "Taches plus grandes", kind: "range", target: "stone", expect: "changes", a: 0.3, b: 3, apply: (c, v) => S(c, { inclusions: { amount: 0.6, scale: v, roughness: 0.5 } }), ui: { tab: "parts", part: "stone", before: [["inclusions", true]] } },
  { key: "inclusions-roughness", tab: "Parties", name: "Inclusions : rugosité", expected: "Taches plus floues", kind: "range", target: "stone", expect: "changes", a: 0, b: 1, apply: (c, v) => S(c, { inclusions: { amount: 0.6, scale: 1, roughness: v } }), ui: { tab: "parts", part: "stone", before: [["inclusions", true]] } },
  { key: "pose-rotation", tab: "Parties", name: "Position du bijou : rotation", expected: "Le bijou tourne sur lui-même", kind: "vec3", target: "frame", expect: "changes", a: [0, 0, 0], b: [60, 0, 0], apply: (_, v) => SC({ pose: { kind: "auto", rotation: v } }), ui: { tab: "parts", vecX: true } },
  ...(WITH_LIBRARY
    ? ([
        { key: "library-gems", tab: "Parties", name: "Bibliothèque de matières : pierres", expected: "La pierre prend la matière choisie", kind: "choice", target: "stone", options: libraryOf("gems").map((m) => [m.id, m.name] as [Val, string]), base: "", expectOf: (v) => (v === "gem/diamond" ? "any" : "changes"), apply: (c, v) => (v ? { settings: { layers: each(c.stones, { role: "diamond", material: v }) } } : {}), ui: false },
        { key: "library-metals", tab: "Parties", name: "Bibliothèque de matières : métaux", expected: "Le métal prend la matière choisie", kind: "choice", target: "metal", options: libraryOf("metals").filter((m) => !m.id.endsWith("/brushed")).map((m) => [m.id, m.name] as [Val, string]), base: "metal/rose-gold/polished", expectOf: (v) => (v === "metal/rose-gold/polished" || v === "metal/rose-gold-14/polished" ? "any" : "changes"), apply: (c, v) => { const [, metal, kind] = String(v).split("/"); return M(c, { role: "metal", metal, finish: { kind: kind ?? "polished" } }); }, ui: false },
        { key: "library-other", tab: "Parties", name: "Bibliothèque de matières : perles et autres", expected: "La partie prend la matière choisie", kind: "choice", target: "metal", options: [...libraryOf("pearls"), ...libraryOf("other")].map((m) => [m.id, m.name] as [Val, string]), base: "", apply: (c, v) => (v ? M(c, { role: "enamel", material: v }) : {}), ui: false },
      ] as ChoiceCase[])
    : []),

  /* Scène */
  { key: "background", tab: "Scène", name: "Fond", expected: "Ce qu'on voit derrière le bijou change", kind: "choice", target: "bg", options: [...BACKGROUNDS.map((b) => [b, BACKGROUND_NAMES_FR[b]] as [Val, string]), ["__color", "Couleur unie"], ["__gradient", "Dégradé"], ["__env", "L'éclairage du métal"]], base: "studio-dark", pair: ["studio-dark", "studio-light"], expectOf: (v) => (v === "__gradient" ? "any" : "changes"), note: "« Dégradé » part des mêmes couleurs que « Studio sombre » (centre et bords se règlent ensuite).", apply: (_, v) => (v === "__color" ? SC({ backdrop: { kind: "color", color: "#0a0a0a" } }) : v === "__gradient" ? SC({ backdrop: { kind: "gradient", inner: "#3a3532", outer: "#0a0a0a" } }) : v === "__env" ? SC({ envBackground: true }) : { settings: { background: v } }), ui: { tab: "scene", value: "studio-light" } },
  { key: "backdrop-color", tab: "Scène", name: "Fond : couleur unie", expected: "Le fond prend la couleur", kind: "color", target: "bg", expect: "brighter", a: "#0a0a0a", b: "#f4f2ef", apply: (_, v) => SC({ backdrop: { kind: "color", color: v } }), ui: { tab: "scene", before: [["background", "__color"]] } },
  { key: "backdrop-inner", tab: "Scène", name: "Fond dégradé : centre", expected: "Le centre du fond change", kind: "color", target: "bg", expect: "brighter", a: "#3a3532", b: "#f4f2ef", apply: (_, v) => SC({ backdrop: { kind: "gradient", inner: v, outer: "#0a0a0a" } }), ui: { tab: "scene", before: [["background", "__gradient"]] } },
  { key: "backdrop-outer", tab: "Scène", name: "Fond dégradé : bords", expected: "Les bords du fond changent", kind: "color", target: "bg", expect: "brighter", a: "#0a0a0a", b: "#f4f2ef", apply: (_, v) => SC({ backdrop: { kind: "gradient", inner: "#3a3532", outer: v } }), ui: { tab: "scene", before: [["background", "__gradient"]] } },
  { key: "env-metal", tab: "Scène", name: "Éclairage du métal (Environment)", expected: "Une autre lumière sur le métal (jamais noir)", kind: "choice", target: "metal", options: METAL_ENVS.filter((id) => id !== "studio-dark").map((id) => [id, HDRI[id]?.name ?? id] as [Val, string]), base: "studio-clair", pair: ["studio-clair", "three-point"], apply: (_, v) => SC({ envMetal: { id: v } }), ui: { tab: "scene", value: "three-point" } },
  { key: "env-metal-rotation", tab: "Scène", name: "Éclairage du métal : rotation", expected: "Les reflets bougent sur le métal", kind: "range", target: "metal", expect: "changes", a: 0, b: 120, apply: (_, v) => SC({ envMetal: { rotation: v } }), ui: { tab: "scene" } },
  { key: "env-metal-intensity", tab: "Scène", name: "Éclairage du métal : intensité", expected: "Métal plus clair", kind: "range", target: "metal", expect: "brighter", a: 0.4, b: 2.5, apply: (_, v) => SC({ envMetal: { intensity: v } }), ui: { tab: "scene" } },
  { key: "env-gem", tab: "Scène", name: "Éclairage des pierres (Gem Environment)", expected: "Une autre lumière dans les pierres (jamais noires)", kind: "choice", target: "stone", options: GEM_ENVS.map((id) => [id, id === "auto" ? "Automatique" : (HDRI[id]?.name ?? id)] as [Val, string]), base: "auto", pair: ["auto", "gem-bands"], needOne: true, note: "« Automatique » choisit déjà un de ces éclairages pour chaque taille de pierre : le même choisi à la main ne change rien sur ce bijou (normal).", expectOf: (v) => (v === "gem-tente" ? "any" : "changes"), apply: (_, v) => SC({ envGem: { id: v } }), ui: { tab: "scene", value: "gem-bands" } },
  { key: "env-gem-rotation", tab: "Scène", name: "Éclairage des pierres : rotation", expected: "Les éclats changent de facette", kind: "range", target: "stone", expect: "changes", a: 0, b: 120, apply: (_, v) => SC({ envGem: { rotation: v } }), ui: { tab: "scene" } },
  { key: "env-gem-intensity", tab: "Scène", name: "Éclairage des pierres : intensité", expected: "Pierres plus lumineuses", kind: "range", target: "stone", expect: "brighter", a: 0.5, b: 2.5, apply: (_, v) => SC({ envGem: { intensity: v } }), ui: { tab: "scene" } },
  { key: "drawer-metal-intensity", tab: "À gauche", name: "Éclairage du métal : intensité (à gauche)", expected: "Métal plus clair (le même réglage que l'onglet Scène)", kind: "range", target: "metal", expect: "brighter", a: 0.4, b: 2.5, apply: (_, v) => SC({ envMetal: { intensity: v } }), ui: { drawer: "metal" } },
  { key: "drawer-gem-intensity", tab: "À gauche", name: "Éclairage des pierres : intensité (à gauche)", expected: "Pierres plus lumineuses (le même réglage que l'onglet Scène)", kind: "range", target: "stone", expect: "brighter", a: 0.5, b: 2.5, apply: (_, v) => SC({ envGem: { intensity: v } }), ui: { drawer: "gem" } },
  { key: "fixed-env", tab: "Scène", name: "Éclairage fixe quand la pièce tourne (Fixed Env Direction)", expected: "Vu de côté : la lumière a suivi la caméra", kind: "toggle", target: "ring", expect: "changes", a: false, b: true, apply: (_, v) => ({ scene: { fixedEnv: v }, query: { view: "side" } }), ui: false, note: "Mesuré vue de profil (de face, la caméra n'a pas tourné : aucun écart possible)." },
  { key: "ground", tab: "Scène", name: "Sol (Ground)", expected: "Rien, une ombre douce, une ombre de contact, un miroir", needOne: true, kind: "choice", target: "ground", options: GROUNDS.map((g) => [g, GROUND_NAMES[g]] as [Val, string]), base: "contact", pair: ["contact", "reflective"], pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => SC({ ground: { preset: v } }), ui: { tab: "scene", before: [["background", "studio-light"]], value: "reflective" } },
  { key: "ground-size", tab: "Scène", name: "Sol : taille", expected: "L'ombre (ou le sol) plus grande",  needOne: true, note: "Le N tient debout sur une arête : son ombre de contact est presque invisible ; mesuré sous la bague ZR0982.", kind: "range", target: "ground", expect: "changes", a: 0.8, b: 4, pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => SC({ ground: { size: v } }), ui: { tab: "scene", before: [["background", "studio-light"]] } },
  { key: "ground-height", tab: "Scène", name: "Sol : hauteur sous le bijou", expected: "L'ombre s'éloigne",  needOne: true, note: "Le N tient debout sur une arête : son ombre de contact est presque invisible ; mesuré sous la bague ZR0982.", kind: "range", target: "ground", expect: "changes", a: 0, b: 12, pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => SC({ ground: { height: v } }), ui: { tab: "scene", before: [["background", "studio-light"]] } },
  { key: "ground-opacity", tab: "Scène", name: "Sol : opacité", expected: "L'ombre plus forte",  needOne: true, note: "Le N tient debout sur une arête : son ombre de contact est presque invisible ; mesuré sous la bague ZR0982.", kind: "range", target: "ground", expect: "darker", a: 0.2, b: 1, pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => SC({ ground: { opacity: v } }), ui: { tab: "scene", before: [["background", "studio-light"]] } },
  { key: "ground-render-to-depth", tab: "Scène", name: "Sol miroir : se fondre dans le fond (Render to Depth)", expected: "Le bord du miroir disparaît", kind: "toggle", target: "ground", expect: "changes", a: false, b: true, pre: () => join({ settings: { background: "studio-light" } }, SC({ ground: { preset: "reflective" } })), apply: (_, v) => SC({ ground: { renderToDepth: v } }), ui: { tab: "scene", before: [["background", "studio-light"], ["ground", "reflective"]], value: false } },
  { key: "ground-limit-camera", tab: "Scène", name: "Pas de caméra sous le sol (Limit Camera)", expected: "La caméra s'arrête au niveau du sol", target: "frame", kind: "static", check: { file: "src/viewer/Stage.tsx", pattern: /scene\.ground\.limitCamera && scene\.ground\.preset !== "none"/ }, why: "Un mouvement de caméra, pas une image (lu par la scène : maxPolarAngle)." },
  ...(
    [
      ["shadow-frames", "Ombre douce : images (Shadow Frames)", "Ombre plus lisse", "changes", 2, 120, (v: Val) => ({ shadowFrames: v })],
      ["shadow-color", "Ombre douce : couleur", "L'ombre teintée", "changes", "#000000", "#7a4a3a", (v: Val) => ({ light: { color: v } })],
      ["shadow-intensity", "Ombre douce : intensité", "L'ombre plus marquée", "changes", 0.3, 2.5, (v: Val) => ({ light: { intensity: v } })],
      ["shadow-direction", "Ombre douce : direction de la lumière", "L'ombre part d'un autre côté", "changes", [0, 1, 0.2], [1, 0.6, 0], (v: Val) => ({ light: { direction: v } })],
      ["shadow-radius", "Ombre douce : rayon", "Ombre plus floue", "changes", 0.2, 3, (v: Val) => ({ light: { radius: v } })],
      ["shadow-bias", "Ombre douce : biais (Bias)", "L'ombre se décale un peu", "changes", 0, 0.01, (v: Val) => ({ light: { bias: v } })],
      ["shadow-focus", "Ombre douce : netteté (Focus)", "Ombre plus franche", "changes", 0, 1, (v: Val) => ({ light: { focus: v } })],
      ["shadow-spread", "Ombre douce : étalement (Spread)", "Ombre plus douce", "changes", 1, 16, (v: Val) => ({ light: { spread: v } })],
    ] as [string, string, string, Expect, Val, Val, (v: Val) => Json][]
  ).map(([key, name, expected, expect, a, b, f]): RangeCase => ({ key, tab: "Scène", name, expected, kind: Array.isArray(a) ? "vec3" : typeof a === "string" ? "color" : "range", target: "ground", expect, a, b, pre: () => join({ settings: { background: "studio-light" } }, SC({ ground: { preset: "soft" } })), apply: (_, v) => SC({ ground: f(v) }), ui: { tab: "scene", before: [["background", "studio-light"], ["ground", "soft"]], vecX: Array.isArray(a) } })),
  ...(
    [
      ["mirror-color", "Sol miroir : couleur", "Le sol teinté", "changes", "#1a1817", "#7a4a3a", (v: Val) => ({ material: { color: v } })],
      ["mirror-roughness", "Sol miroir : rugosité", "Reflet plus terne", "changes", 0, 1, (v: Val) => ({ material: { roughness: v } })],
      ["mirror-metalness", "Sol miroir : métal", "Reflet coloré comme du métal", "changes", 0, 1, (v: Val) => ({ material: { metalness: v } })],
      ["mirror-blur", "Flou du sol miroir (Mirror Blur)", "Reflet plus flou", "changes", 0, 1, (v: Val) => ({ mirrorBlur: v })],
    ] as [string, string, string, Expect, Val, Val, (v: Val) => Json][]
  ).map(([key, name, expected, expect, a, b, f]): RangeCase => ({ key, tab: "Scène", name, expected, kind: typeof a === "string" ? "color" : "range", target: "ground", expect, a, b, pre: () => join({ settings: { background: "studio-light" } }, SC({ ground: { preset: "reflective" } })), apply: (_, v) => SC({ ground: f(v) }), ui: { tab: "scene", before: [["background", "studio-light"], ["ground", "reflective"]] } })),
  { key: "add-light", tab: "Scène", name: "Lumières en plus : ajouter", expected: "Une lumière de plus sur le bijou", kind: "choice", target: "metal", options: [["", "Aucune"], ["directional", "Directionnelle"], ["spot", "Spot"], ["point", "Point"]], base: "", expectOf: (v) => (v === "directional" ? "any" : "changes"), note: "Une lumière directionnelle ne fait qu'un petit reflet net sur un métal poli (le métal prend sa lumière de son éclairage) ; « Ambiante » est retirée.", apply: (_, v) => (v ? lightPre(String(v), 1.5) : {}), ui: false },
  { key: "light-color", tab: "Scène", name: "Lumière en plus : couleur", expected: "La lumière teinte le bijou", kind: "color", target: "metal", expect: "warmer", a: "#ffffff", b: "#ff9a50", apply: (_, v) => SC({ lights: [{ id: "t", kind: "point", color: v, intensity: 3, position: [0.6, 1, 0.8], angle: 0.5, penumbra: 0.6 }] }), ui: { tab: "scene", before: [["@click", "[data-add-light=point]"]], control: "light-color-0" } },
  { key: "light-intensity", tab: "Scène", name: "Lumière en plus : intensité", expected: "Bijou plus éclairé", kind: "range", target: "metal", expect: "brighter", a: 0, b: 4, apply: (_, v) => SC({ lights: [{ id: "t", kind: "point", color: "#fff4e8", intensity: v, position: [0.6, 1, 0.8], angle: 0.5, penumbra: 0.6 }] }), ui: { tab: "scene", before: [["@click", "[data-add-light=point]"]], control: "light-intensity-0" } },
  { key: "light-position", tab: "Scène", name: "Lumière en plus : position", expected: "La lumière vient d'ailleurs", kind: "vec3", target: "metal", expect: "changes", a: [0.6, 1, 0.8], b: [-1, 0.2, -0.8], apply: (_, v) => SC({ lights: [{ id: "t", kind: "point", color: "#fff4e8", intensity: 3, position: v, angle: 0.5, penumbra: 0.6 }] }), ui: { tab: "scene", before: [["@click", "[data-add-light=point]"]], control: "light-position-0", vecX: true } },
  { key: "light-angle", tab: "Scène", name: "Spot : ouverture", expected: "Le rond de lumière plus large", kind: "range", target: "metal", expect: "changes", a: 0.15, b: 1.1, apply: (_, v) => SC({ lights: [{ id: "t", kind: "spot", color: "#fff4e8", intensity: 3, position: [0.6, 1, 0.8], angle: v, penumbra: 0.6 }] }), ui: { tab: "scene", before: [["@click", "[data-add-light=spot]"]], control: "light-angle-0" } },

  /* Rendu */
  { key: "progressive", tab: "Rendu", name: "Images de lissage à l'arrêt (rendu progressif)", expected: "Image plus lisse, arêtes sans escalier", kind: "range", target: "ring", expect: "changes", a: 4, b: 128, apply: (_, v) => SC({ render: { progressive: v } }), ui: { tab: "render" } },
  { key: "taa", tab: "Rendu", name: "Lissage en mouvement (TAA)", expected: "Moins de scintillement quand le bijou tourne", target: "ring", kind: "static", check: { file: "src/viewer/Stage.tsx", pattern: /accumulate\.taa = scene\.render\.taa/ }, why: "N'agit que pendant le mouvement (aucun écart possible sur une image immobile) ; lu par la scène." },

  /* Effets */
  { key: "ssr", tab: "Effets", name: "Reflets à l'écran (SSR) : activer", expected: "Le métal reflète les pierres et les griffes", kind: "toggle", target: "metal", expect: "changes", a: false, b: true, apply: (_, v) => POST({ ssr: { enabled: v } }), ui: { tab: "effects", value: false } },
  ...(
    [
      ["ssr-intensity", "SSR : intensité", "Reflets plus forts", "brighter", 0, 3, (v: Val) => ({ intensity: v })],
      ["ssr-boost", "SSR : gain (Boost RGB)", "Reflets plus forts", "brighter", [0.3, 0.3, 0.3], [3, 3, 3], (v: Val) => ({ boost: v })],
      ["ssr-auto-radius", "SSR : rayon automatique (Auto Radius)", "Portée des reflets suit le bijou", "changes", false, true, (v: Val) => ({ autoRadius: v })],
      ["ssr-radius", "SSR : rayon de l'objet (Object Radius)", "Reflets plus lointains", "changes", 0.1, 4, (v: Val) => ({ radius: v })],
      ["ssr-power", "SSR : puissance (Power)", "Seuls les reflets francs restent", "changes", 0.3, 3, (v: Val) => ({ power: v })],
      ["ssr-tolerance", "SSR : tolérance", "Trous des reflets bouchés", "changes", 0, 2, (v: Val) => ({ tolerance: v })],
      ["ssr-steps", "SSR : pas (Step Count)", "Reflets plus complets", "changes", 4, 64, (v: Val) => ({ steps: v })],
      ["ssr-ignore-front", "SSR : ignorer les rayons vers l'avant", "Moins de faux reflets", "changes", false, true, (v: Val) => ({ ignoreFront: v })],
      ["ssr-front-factor", "SSR : masque des rayons avant", "Plus ou moins de reflets vers vous", "changes", -1, 1, (v: Val) => ({ ignoreFront: true, frontFactor: v })],
    ] as [string, string, string, Expect, Val, Val, (v: Val) => Json][]
  ).map(([key, name, expected, expect, a, b, f]): RangeCase => ({ key, tab: "Effets", name, expected, kind: Array.isArray(a) ? "vec3" : typeof a === "boolean" ? "toggle" : "range", target: "metal", expect, a, b, apply: (_, v) => POST({ ssr: f(v) }), ui: { tab: "effects", vecX: Array.isArray(a), value: typeof a === "boolean" ? !(key === "ssr-auto-radius" || key === "ssr-ignore-front") : undefined } })),
  { key: "tonemap", tab: "Effets", name: "Tons (Tonemapping) : mode", expected: "Une autre façon de rendre la lumière", kind: "choice", target: "ring", options: TONEMAPS.map((t) => [t, TONEMAP_NAMES[t]] as [Val, string]), base: "aces", pair: ["aces", "neutral"], apply: (_, v) => POST({ tonemap: { mode: v } }), ui: { tab: "effects", value: "neutral" } },
  { key: "exposure", tab: "Effets", name: "Exposition (Exposure)", expected: "Toute l'image plus claire", kind: "range", target: "ring", expect: "brighter", a: 0.5, b: 2.2, apply: (_, v) => POST({ tonemap: { exposure: v } }), ui: { tab: "effects" } },
  { key: "saturation", tab: "Effets", name: "Saturation", expected: "Couleurs plus vives", kind: "range", target: "ring", expect: "saturated", a: 0, b: 1.5, note: "Bornée à 1,5 : à 2, toute l'image virait au rouge (fond compris).", apply: (_, v) => POST({ tonemap: { saturation: v } }), ui: { tab: "effects" } },
  { key: "contrast", tab: "Effets", name: "Contraste (Contrast)", expected: "Plus d'écart entre sombre et clair", kind: "range", target: "ring", expect: "contrast", a: 0.85, b: 1.2, note: "Borné entre 0,85 et 1,2 : à 0,6 l'image devenait grise, à 1,4 le métal brûlait en blanc.", apply: (_, v) => POST({ tonemap: { contrast: v } }), ui: { tab: "effects" } },
  { key: "clip", tab: "Effets", name: "Fond transparent (Clip Background)", expected: "Le fond disparaît (transparent)", kind: "toggle", target: "bg", expect: "changes", a: false, b: true, apply: (_, v) => POST({ tonemap: { clipBackground: v } }), ui: { tab: "effects" } },
  { key: "scene-lut", tab: "Effets", name: "Teinte de la scène (LUT de scène)", expected: "Toute l'image plus chaude, froide, vive…", kind: "choice", target: "ring", options: [["", "Aucune"], ...LOOKS.map((l) => [l, LOOK_NAMES[l]] as [Val, string])], base: "", pair: ["", "vif"], expectOf: (v) => ({ chaud: "warmer", froid: "cooler", vif: "saturated", doux: "flatter", "noir-et-blanc": "desaturated" } as Record<string, Expect>)[v as string] ?? "changes", apply: (_, v) => (v ? POST({ lut: { id: v, intensity: 1 } }) : {}), ui: { tab: "effects", value: "vif" } },
  { key: "scene-lut-intensity", tab: "Effets", name: "Teinte de la scène : force", expected: "La teinte plus marquée", kind: "range", target: "ring", expect: "saturated", a: 0.2, b: 1, apply: (_, v) => POST({ lut: { id: "vif", intensity: v } }), ui: { tab: "effects", before: [["scene-lut", "vif"]], value: 0.2 } },
  { key: "bloom", tab: "Effets", name: "Lueur (Bloom) : activer", expected: "Une lueur autour des éclats", kind: "toggle", target: "ring", expect: "changes", a: false, b: true, apply: (_, v) => POST({ bloom: { enabled: v, threshold: 1.2, intensity: 0.6 } }), ui: { tab: "effects", before: [["bloom-threshold", 1.2], ["bloom-intensity", 0.6]], value: false }, note: "Mesuré avec seuil 1,2 et intensité 0,6 (la lueur par défaut est volontairement très discrète)." },
  ...(
    [
      ["bloom-threshold", "Lueur : seuil (Threshold)", "Moins d'éclats rayonnent", "changes", 0.8, 6, (v: Val) => ({ threshold: v, intensity: 0.6 })],
      ["bloom-soft-threshold", "Lueur : seuil doux (Soft Threshold)", "Passage plus progressif (visible sur la grosse pierre de ZR0982, à peine sur le pavé du N)", "changes", 0, 2, (v: Val) => ({ threshold: 1.2, intensity: 0.6, softThreshold: v })],
      ["bloom-intensity", "Lueur : intensité", "Lueur plus forte", "glow", 0, 1.5, (v: Val) => ({ threshold: 1.2, intensity: v })],
      ["bloom-radius", "Lueur : rayon", "Lueur plus large", "glow", 0, 1, (v: Val) => ({ threshold: 1.2, intensity: 0.6, radius: v })],
      ["bloom-power", "Lueur : puissance (Power)", "La lueur reste sur les éclats forts", "changes", 0.2, 4, (v: Val) => ({ threshold: 1.2, intensity: 0.6, power: v })],
      ["bloom-iterations", "Lueur : itérations", "0 : éteinte ; plus : plus large", "changes", 0, 7, (v: Val) => ({ threshold: 1.2, intensity: 0.6, iterations: v })],
      ["bloom-debug", "Lueur : mode contrôle (Debug)", "Ne montre que ce qui rayonne", "changes", false, true, (v: Val) => ({ threshold: 1.2, intensity: 0.6, debug: v })],
    ] as [string, string, string, Expect, Val, Val, (v: Val) => Json][]
  ).map(([key, name, expected, expect, a, b, f]): RangeCase => ({ key, tab: "Effets", name, expected, kind: typeof a === "boolean" ? "toggle" : "range", target: "ring", expect, a, b, apply: (_, v) => POST({ bloom: f(v) }), ui: { tab: "effects", before: ([["bloom-threshold", 1.2], ["bloom-intensity", 0.6]] as UiStep[]).filter(([k]) => k !== key) } })),
  { key: "bevel", tab: "Effets", name: "Biseau à l'écran (SSBevel) : activer", expected: "Arêtes arrondies", kind: "toggle", target: "metal", expect: "changes", a: false, b: true, apply: (_, v) => POST({ bevel: { enabled: v, radius: 4 } }), ui: { tab: "effects", value: false } },
  { key: "bevel-radius", tab: "Effets", name: "Biseau : rayon (scène)", expected: "Arrondi plus large", kind: "range", target: "metal", expect: "changes", a: 0, b: 8, apply: (_, v) => POST({ bevel: { radius: v } }), ui: { tab: "effects" } },
  { key: "bevel-intensity", tab: "Effets", name: "Biseau : intensité", expected: "Arrondi plus marqué", kind: "range", target: "metal", expect: "changes", a: 0, b: 1, apply: (_, v) => POST({ bevel: { intensity: v, radius: 4 } }), ui: { tab: "effects", value: 0 } },
  { key: "ao", tab: "Effets", name: "Ombres dans les creux (AO) : activer", expected: "Creux plus sombres", kind: "toggle", target: "ring", expect: "darker", a: false, b: true, apply: (_, v) => POST({ ao: { enabled: v } }), ui: { tab: "effects", value: false } },
  { key: "ao-intensity", tab: "Effets", name: "AO : intensité", expected: "Creux plus sombres", kind: "range", target: "ring", expect: "darker", a: 0, b: 6, apply: (_, v) => POST({ ao: { intensity: v } }), ui: { tab: "effects" } },
  { key: "ao-radius", tab: "Effets", name: "AO : rayon", expected: "Creux assombris plus larges", kind: "range", target: "ring", expect: "darker", a: 2, b: 80, apply: (_, v) => POST({ ao: { radius: v } }), ui: { tab: "effects" } },
  { key: "dof", tab: "Effets", name: "Profondeur de champ : activer", expected: "Une partie floue", kind: "toggle", target: "ring", expect: "blurrier", a: false, b: true, apply: (_, v) => POST({ dof: { enabled: v, aperture: 0.1, maxBlur: 1.2 } }), ui: { tab: "effects", before: [["dof-aperture", 0.1], ["dof-blur", 1.2]] }, note: "Mesuré avec une zone nette fine (0,1) et un flou de 1,2." },
  { key: "dof-blur", tab: "Effets", name: "Profondeur de champ : flou maximal", expected: "Plus de flou hors de la zone nette", kind: "range", target: "ring", expect: "blurrier", a: 0.1, b: 2, apply: (_, v) => POST({ dof: { enabled: true, aperture: 0.1, maxBlur: v } }), ui: { tab: "effects", before: [["dof", true], ["dof-aperture", 0.1]] } },
  { key: "dof-aperture", tab: "Effets", name: "Profondeur de la zone nette (Aperture)", expected: "Plus de bijou net", kind: "range", target: "ring", expect: "sharper", a: 0.05, b: 1, apply: (_, v) => POST({ dof: { enabled: true, aperture: v, maxBlur: 1.2 } }), ui: { tab: "effects", before: [["dof", true], ["dof-blur", 1.2], ["dof-aperture", 0.05]] } },
  { key: "vignette", tab: "Effets", name: "Vignette : activer", expected: "Coins plus sombres", note: "Mesurée sur le fond « Studio clair » (sur un fond sombre, les coins sont déjà presque noirs).", kind: "toggle", target: "frame", expect: "darker", a: false, b: true, pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => POST({ vignette: { enabled: v } }), ui: { tab: "effects" } },
  { key: "vignette-offset", tab: "Effets", name: "Vignette : distance", expected: "L'assombrissement entre plus ou moins", kind: "range", target: "frame", expect: "changes", a: 0, b: 1, pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => POST({ vignette: { enabled: true, offset: v, darkness: 0.7 } }), ui: { tab: "effects", before: [["vignette", true]] } },
  { key: "vignette-darkness", tab: "Effets", name: "Vignette : obscurité", expected: "Coins plus sombres", kind: "range", target: "frame", expect: "darker", a: 0, b: 1, pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => POST({ vignette: { enabled: true, darkness: v } }), ui: { tab: "effects", before: [["vignette", true]] } },
  { key: "chromatic", tab: "Effets", name: "Aberration chromatique : activer", expected: "Liseré coloré sur les bords", kind: "toggle", target: "ring", expect: "changes", a: false, b: true, apply: (_, v) => POST({ chromatic: { enabled: v, offset: 0.003 } }), ui: { tab: "effects" } },
  { key: "chromatic-offset", tab: "Effets", name: "Aberration chromatique : décalage", expected: "Liseré plus large", kind: "range", target: "ring", expect: "changes", a: 0, b: 0.004, apply: (_, v) => POST({ chromatic: { enabled: true, offset: v } }), ui: { tab: "effects", before: [["chromatic", true]] } },
  { key: "grain", tab: "Effets", name: "Grain : activer", expected: "Grain de film", note: "Mesuré sur le bijou et un fond clair : le grain suit la lumière (presque rien dans le noir).", kind: "toggle", target: "ring", expect: "changes", a: false, b: true, pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => POST({ grain: { enabled: v, intensity: 0.08 } }), ui: { tab: "effects" } },
  { key: "grain-intensity", tab: "Effets", name: "Grain : intensité", expected: "Grain plus fort", kind: "range", target: "ring", expect: "changes", a: 0, b: 0.15, pre: () => ({ settings: { background: "studio-light" } }), apply: (_, v) => POST({ grain: { enabled: true, intensity: v } }), ui: { tab: "effects", before: [["grain", true]] } },

  /* Vues de caméra, configurateur : the client's content, not a picture */
  ...(
    [
      ["views-duration", "Durée d'une vue à l'autre (Duration)", /duration/],
      ["views-ease", "Mouvement (Ease)", /ease/],
      ["views-interpolation", "Trajet (Interpolation)", /interpolation/],
      ["views-pause", "Pause à chaque vue (View Pause Time)", /pause/],
      ["views-loop", "Boucler toutes les vues (Loop All Views)", /loop/],
    ] as [string, string, RegExp][]
  ).map(([key, name, pattern]): StaticCase => ({ key, tab: "Vues de caméra", name, expected: "Le parcours de la caméra entre les vues", target: "frame", kind: "static", check: { file: "src/viewer/cameraPath.ts", pattern }, why: "Un mouvement de caméra, pas une image (lu par le parcours des vues, src/viewer/cameraPath.ts)." })),
  { key: "seek-on-scroll", tab: "Vues de caméra", name: "La caméra suit le défilement (Seek on Scroll)", expected: "Sur la page de la pièce, la caméra suit le défilement", target: "frame", kind: "static", check: { file: "src/components/Piece3D.tsx", pattern: /views\.seekOnScroll/ }, why: "Agit sur la page de la pièce (lu par src/components/Piece3D.tsx)." },
  { key: "config-part", tab: "Configurateur", name: "Parties et matières proposées", expected: "Les pastilles du client", target: "frame", kind: "static", check: { file: "src/viewer/JewelViewer.tsx", pattern: /settings\.configurators/ }, why: "Le contenu des pastilles du client (lu par son visualiseur ; testé par tests/editor3d.spec.ts)." },

  /* À gauche : les choix en un clic (the same settings as the tabs, by their pictures) */
  { key: "presets", tab: "À gauche", name: "Ambiances (images)", expected: "Toute une scène d'un clic (métal jamais noir, pierres lisibles)", kind: "choice", target: "ring", options: [["", "Aucune"], ...SCENE_PRESETS.map((p) => [p.id, p.name] as [Val, string])], base: "", apply: (_, v) => (v ? { query: { preset: String(v) } } : {}), ui: false },
  { key: "stand", tab: "À gauche", name: "Socle", expected: "Le bijou posé sur un socle", kind: "choice", target: "frame", options: [["", "Aucun socle"], ...STANDS.map((s) => [s, STAND_NAMES_FR[s]] as [Val, string])], base: "", apply: (_, v) => (v ? { query: { stand: String(v) } } : {}), ui: false },
  { key: "pose", tab: "À gauche", name: "Pose (Compute Stable Pose)", expected: "Le bijou posé à plat, debout, en angle", kind: "choice", target: "frame", options: Object.entries(POSE_NAMES) as [Val, string][], base: "auto", expectOf: (v) => (v === "auto" ? "same" : "any"), apply: (c, v) => SC({ pose: { kind: v, rotation: c.poses[String(v)] ?? [0, 0, 0] } }), ui: false, note: "« Telle que le fichier » ne tourne pas le bijou ; « Debout » ou « En angle » peuvent tomber sur la position du fichier quand il est déjà posé ainsi." },

  /* Mode simple */
  { key: "simple-ambiance", tab: "Mode simple", name: "1. Ambiance", expected: "Toute une scène (métal jamais noir, pierres lisibles)", kind: "choice", target: "ring", options: SIMPLE_AMBIANCES.map((a) => [a.id, a.name] as [Val, string]), base: "studio-noir", apply: (_, v) => ({ query: { simple: String(v) } }), ui: { simple: true } },
  { key: "simple-metal", tab: "Mode simple", name: "2. Métal", expected: "Le métal de toutes les parties", kind: "choice", target: "metal", options: SIMPLE_METALS.map((m) => [m.id, m.name] as [Val, string]), base: "rose-gold", expectOf: (v) => (v === "black-rhodium" ? "darker" : "changes"), apply: (c, v) => M(c, { role: "metal", metal: v }), ui: { simple: true } },
  { key: "simple-stone", tab: "Mode simple", name: "3. Pierres", expected: "La couleur de toutes les pierres", kind: "choice", target: "stone", options: SIMPLE_STONES.map((s) => [s.material, s.name] as [Val, string]), base: "gem/diamond", apply: (c, v) => ({ settings: { layers: each(c.stones, { role: "diamond", material: v }) } }), ui: { simple: true } },
  { key: "simple-view", tab: "Mode simple", name: "4. Vue", expected: "La caméra de face, de profil, de 3/4, de dessus", kind: "choice", target: "frame", options: SIMPLE_VIEWS.map((v) => [v.id, v.name] as [Val, string]), base: "front", apply: (_, v) => { const view = SIMPLE_VIEWS.find((x) => x.id === v)!; return { js: `window.__berete3d.look(${view.azimuth}, ${view.polar})` }; }, ui: false },
];

/* ---------- The lab: one picture ---------- */

type Img = { w: number; h: number; rgb: Uint8Array; alpha: Uint8Array };
type Shot = { img: Img; stones: Record<string, { mean: number; black: number; white: number; pixels: number }>; ms: number; errors: string[]; broken: boolean };
/** Errors of the page while a picture is drawn (a setting that breaks the drawing). */
const pageErrors: string[] = [];
const broken: { key: string; model: string; value: string; errors: string[] }[] = [];
let current = { key: "", model: "", value: "" };

let token = "";
async function login(): Promise<void> {
  const env = fs.readFileSync(".env", "utf8").match(/ADMIN_PASSWORD="?([^"\n]*)/)?.[1];
  if (!env) throw new Error("ADMIN_PASSWORD manquant dans .env");
  const res = await fetch(API + "/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: env }) });
  if (!res.ok) throw new Error("connexion à l'admin refusée");
  token = ((await res.json()) as { token: string }).token;
}
async function modelRow(id: string): Promise<{ name: string; settings: Json; preview: { files: { full: string } }; layers: { name: string; guess: string }[] }> {
  const res = await fetch(API + "/api/admin/models/" + id, { headers: { Authorization: "Bearer " + token } });
  return (await res.json()) as never;
}

const cache = new Map<string, Shot>();
function remember(url: string, shot: Shot) {
  cache.set(url, shot);
  if (cache.size > 40) cache.delete(cache.keys().next().value!);
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const d = (window as unknown as { __berete3d?: { progressive(): number } }).__berete3d;
    if (!d) return;
    const t0 = performance.now();
    let last = -1;
    let same = 0;
    while (performance.now() - t0 < 14000) {
      await new Promise((r) => setTimeout(r, 120));
      const n = d.progressive();
      if (n === last && n >= 8) {
        if (++same >= 5) return;
      } else {
        same = 0;
        last = n;
      }
    }
  });
}

/** One picture; a drawing that failed is tried once more (the development server reloads the page when a file changes). */
async function shoot(page: Page, c: Ctx, patch: Patch): Promise<Shot> {
  const first = await shootSafe(page, c, patch);
  if (!first.broken) return first;
  await page.waitForTimeout(2500);
  const again = await shootSafe(page, c, patch);
  if (!again.broken) broken.pop();
  return again;
}

async function shootSafe(page: Page, c: Ctx, patch: Patch): Promise<Shot> {
  try {
    return await shootOnce(page, c, patch);
  } catch (x) {
    // The page reloaded under us (a file of the site changed): a broken picture, tried again by shoot().
    broken.push({ ...current, errors: [String(x).slice(0, 200)] });
    return { img: { w: SIZE, h: SIZE, rgb: new Uint8Array(SIZE * SIZE * 3), alpha: new Uint8Array(SIZE * SIZE) }, stones: {}, ms: 0, errors: [String(x).slice(0, 200)], broken: true };
  }
}

async function shootOnce(page: Page, c: Ctx, patch: Patch): Promise<Shot> {
  const settings = deep(deep(structuredClone(c.settings), patch.settings), patch.scene ? { scene: patch.scene } : undefined);
  const q = new URLSearchParams({ model: c.file, settings: JSON.stringify(settings), ...(patch.query ?? {}) });
  const url = LAB + "/lab3d?debug3d&" + q.toString() + (patch.js ? "#" + patch.js : "");
  const hit = cache.get(url);
  if (hit) return hit;
  const t0 = Date.now();
  pageErrors.length = 0;
  await page.goto(url.split("#")[0]!);
  const ready = await page.waitForSelector("[data-lab-ready]", { timeout: 60_000 }).then(() => true, () => false);
  const blank = (): Shot => ({ img: { w: SIZE, h: SIZE, rgb: new Uint8Array(SIZE * SIZE * 3), alpha: new Uint8Array(SIZE * SIZE) }, stones: {}, ms: Date.now() - t0, errors: [...pageErrors], broken: true });
  if (!ready || (await page.locator("canvas").count()) === 0) {
    const shot = blank();
    broken.push({ ...current, errors: shot.errors.slice(0, 4) });
    console.log("  !! dessin cassé : " + current.key + " = " + current.value + " (" + current.model + ") " + shot.errors.slice(0, 2).join(" / "));
    return shot;
  }
  await page.waitForTimeout(350);
  if (patch.js) {
    await page.evaluate(patch.js);
    await page.waitForTimeout(900);
  }
  await settle(page);
  const data = await page.evaluate(() => document.querySelector("canvas")?.toDataURL("image/png") ?? "");
  if (!data) {
    const shot = blank();
    broken.push({ ...current, errors: shot.errors.slice(0, 4) });
    console.log("  !! dessin cassé : " + current.key + " = " + current.value + " (" + current.model + ") " + shot.errors.slice(0, 2).join(" / "));
    return shot;
  }
  const raw = await sharp(Buffer.from(data.split(",")[1]!, "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = raw.info.width * raw.info.height;
  const rgb = new Uint8Array(n * 3);
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const a = raw.data[i * 4 + 3]! / 255;
    alpha[i] = raw.data[i * 4 + 3]!;
    // Over the page's black (#0a0a0a), as the lab shows it.
    for (let k = 0; k < 3; k++) rgb[i * 3 + k] = Math.round(raw.data[i * 4 + k]! * a + 10 * (1 - a));
  }
  const stones = (await page.evaluate(() => (window as unknown as { __berete3d: { measureStones(): unknown } }).__berete3d.measureStones())) as Shot["stones"];
  const shot: Shot = { img: { w: raw.info.width, h: raw.info.height, rgb, alpha }, stones, ms: Date.now() - t0, errors: [...pageErrors], broken: false };
  remember(url, shot);
  return shot;
}

/* ---------- Masks and measures ---------- */

type Masks = { full: Uint8Array; stone: Uint8Array; big: Uint8Array; metal: Uint8Array; band: Uint8Array; halo: Uint8Array; bg: Uint8Array; frame: Uint8Array; /** under the jewel, where its shadow or reflection falls */ ground: Uint8Array; boxes: Record<"stone" | "metal" | "ring" | "band", [number, number, number, number]> };

function grow(m: Uint8Array, w: number, h: number, r: number, shrink = false): Uint8Array {
  // A square neighbourhood, in two passes (rows, then columns).
  const pass = (src: Uint8Array, horizontal: boolean) => {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let v = shrink ? 1 : 0;
        for (let d = -r; d <= r; d++) {
          const xx = horizontal ? x + d : x;
          const yy = horizontal ? y : y + d;
          const inside = xx >= 0 && yy >= 0 && xx < w && yy < h ? src[yy * w + xx]! : 0;
          if (shrink ? !inside : inside) {
            v = shrink ? 0 : 1;
            break;
          }
        }
        out[y * w + x] = v;
      }
    return out;
  };
  return pass(pass(m, true), false);
}
const and = (a: Uint8Array, b: Uint8Array) => a.map((v, i) => (v && b[i] ? 1 : 0));
const not = (a: Uint8Array) => a.map((v) => (v ? 0 : 1));
const count = (m: Uint8Array) => m.reduce((s, v) => s + v, 0);
function box(m: Uint8Array, w: number, h: number): [number, number, number, number] {
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return [x0, y0, Math.max(x0, x1), Math.max(y0, y1)];
}

async function masksOf(page: Page, c: Ctx): Promise<Masks> {
  const clip: Patch = { scene: { ground: { preset: "none" }, post: { tonemap: { clipBackground: true }, bloom: { enabled: false } } } };
  const only = async (visible: string[] | null) => {
    const layers: Json = {};
    if (visible) for (const n of [...c.stones, ...c.metals]) if (!visible.includes(n)) layers[n] = { role: "hide" };
    const s = await shoot(page, c, join(clip, { settings: { layers } }));
    return s.img.alpha.map((a) => (a > 96 ? 1 : 0));
  };
  const w = SIZE, h = SIZE;
  const full = await only(null);
  const stone = await only(c.stones);
  let big = stone;
  let bigCount = 0;
  if (c.stones.length > 1) {
    for (const n of c.stones) {
      const m = await only([n]);
      if (count(m) > bigCount) {
        bigCount = count(m);
        big = m;
        c.big = n;
      }
    }
  } else c.big = c.stones[0] ?? "";
  const metal = grow(and(full, not(stone)), w, h, 1, true);
  const ring = box(full, w, h);
  const mb = box(metal, w, h);
  // The band: a square at the bottom middle of the metal.
  const side = Math.round(Math.min((mb[2] - mb[0]) * 0.42, (mb[3] - mb[1]) * 0.45));
  const bx = Math.round((mb[0] + mb[2]) / 2 - side / 2);
  const by = Math.max(0, mb[3] - side - 4);
  const bandBox: [number, number, number, number] = [bx, by, bx + side, by + side];
  const band = new Uint8Array(w * h);
  for (let y = by; y < by + side && y < h; y++) for (let x = bx; x < bx + side && x < w; x++) band[y * w + x] = metal[y * w + x]!;
  const big3 = grow(big, w, h, 1);
  // Under the jewel: from a little above its lowest point to the bottom of the picture, a little wider than it, the jewel left out.
  const away = not(grow(full, w, h, 3));
  const ground = new Uint8Array(w * h);
  const gx0 = Math.max(0, Math.round(ring[0] - (ring[2] - ring[0]) * 0.15)), gx1 = Math.min(w - 1, Math.round(ring[2] + (ring[2] - ring[0]) * 0.15));
  const gy0 = Math.max(0, Math.round(ring[3] - (ring[3] - ring[1]) * 0.2));
  for (let y = gy0; y < h; y++) for (let x = gx0; x <= gx1; x++) ground[y * w + x] = away[y * w + x]!;
  return {
    ground,
    full: grow(full, w, h, 3),
    stone: grow(stone, w, h, 1),
    big: big3,
    metal,
    band,
    halo: and(grow(full, w, h, 18), not(grow(full, w, h, 3))),
    bg: not(grow(full, w, h, 24)),
    frame: new Uint8Array(w * h).fill(1),
    boxes: { stone: box(big, w, h), metal: mb, ring, band: bandBox },
  };
}

type Stats = { lum: number; sat: number; contrast: number; warm: number; white: number; black: number; sharp: number; halo: number; n: number };
function stats(img: Img, m: Uint8Array, halo: Uint8Array): Stats {
  const { w, h, rgb } = img;
  let n = 0, sl = 0, sl2 = 0, ss = 0, sw = 0, white = 0, black = 0, sharp = 0, ns = 0;
  const L = (i: number) => (0.2126 * rgb[i * 3]! + 0.7152 * rgb[i * 3 + 1]! + 0.0722 * rgb[i * 3 + 2]!) / 255;
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (!m[i]) continue;
      const r = rgb[i * 3]! / 255, g = rgb[i * 3 + 1]! / 255, b = rgb[i * 3 + 2]! / 255;
      const l = L(i);
      n++;
      sl += l;
      sl2 += l * l;
      ss += Math.max(r, g, b) - Math.min(r, g, b);
      sw += r - b;
      if (l > 0.96) white++;
      if (l < 0.04) black++;
      if (m[i - 1] && m[i + 1] && m[i - w] && m[i + w]) {
        sharp += Math.abs(4 * l - L(i - 1) - L(i + 1) - L(i - w) - L(i + w));
        ns++;
      }
    }
  let hl = 0, hn = 0;
  for (let i = 0; i < halo.length; i++) {
    if (!halo[i]) continue;
    hl += L(i);
    hn++;
  }
  const mean = n ? sl / n : 0;
  return { lum: mean, sat: n ? ss / n : 0, contrast: n ? Math.sqrt(Math.max(0, sl2 / n - mean * mean)) : 0, warm: n ? sw / n : 0, white: n ? white / n : 0, black: n ? black / n : 0, sharp: ns ? sharp / ns : 0, halo: hn ? hl / hn : 0, n };
}
function difference(a: Img, b: Img, m: Uint8Array): { mad: number; big: number } {
  let n = 0, s = 0, big = 0;
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    let d = 0;
    for (let k = 0; k < 3; k++) d += Math.abs(a.rgb[i * 3 + k]! - b.rgb[i * 3 + k]!);
    d /= 3;
    n++;
    s += d;
    if (d > 12) big++;
  }
  return { mad: n ? s / n : 0, big: n ? big / n : 0 };
}
const regionOf = (masks: Masks, t: Target) => ({ stone: masks.stone, metal: masks.metal, ring: masks.full, frame: masks.frame, bg: masks.bg, ground: masks.ground })[t];

/** Whether the high value went the expected way, and in words. */
function direction(expect: Expect, A: Stats, B: Stats): { ok: boolean | null; text: string } {
  const d = (k: keyof Stats) => B[k] - A[k];
  switch (expect) {
    case "brighter":
      return { ok: d("lum") > 0.004, text: "lumière " + fr(A.lum) + " → " + fr(B.lum) };
    case "darker":
      return { ok: d("lum") < -0.003, text: "lumière " + fr(A.lum) + " → " + fr(B.lum) };
    case "saturated":
      return { ok: d("sat") > 0.003, text: "couleur " + fr(A.sat, 3) + " → " + fr(B.sat, 3) };
    case "desaturated":
      return { ok: d("sat") < -0.003, text: "couleur " + fr(A.sat, 3) + " → " + fr(B.sat, 3) };
    case "contrast":
      return { ok: d("contrast") > 0.003, text: "contraste " + fr(A.contrast, 3) + " → " + fr(B.contrast, 3) };
    case "flatter":
      return { ok: d("contrast") < -0.003 || B.sharp < A.sharp * 0.97, text: "contraste " + fr(A.contrast, 3) + " → " + fr(B.contrast, 3) + ", netteté " + pct(A.sharp, B.sharp) };
    case "warmer":
      return { ok: d("warm") > 0.003, text: "chaleur (rouge − bleu) " + fr(A.warm, 3) + " → " + fr(B.warm, 3) };
    case "cooler":
      return { ok: d("warm") < -0.003, text: "chaleur (rouge − bleu) " + fr(A.warm, 3) + " → " + fr(B.warm, 3) };
    case "glow":
      return { ok: d("halo") > 0.0015, text: "halo autour du bijou " + fr(A.halo, 3) + " → " + fr(B.halo, 3) };
    case "less-glow":
      return { ok: d("halo") < -0.0015, text: "halo autour du bijou " + fr(A.halo, 3) + " → " + fr(B.halo, 3) };
    case "blurrier":
      return { ok: B.sharp < A.sharp * 0.97, text: "netteté " + pct(A.sharp, B.sharp) };
    case "sharper":
      return { ok: B.sharp > A.sharp * 1.03, text: "netteté " + pct(A.sharp, B.sharp) };
    default:
      return { ok: null, text: "" };
  }
}

/* ---------- Results ---------- */

type One = { model: string; mad: number; big: number; visible: boolean; ok: boolean; text: string; stonesA?: number[]; stonesB?: number[]; metalA?: number; metalB?: number; note?: string };
type OptionRow = { value: string; label: string; perModel: One[] };
type Row = { key: string; tab: string; name: string; expected: string; kind: string; perModel: One[]; options?: OptionRow[]; staticOk?: boolean; why?: string; ui?: { live: number; saved: boolean | null; detail: string } | null; note?: string };
type Unsafe = { key: string; model: string; value: string; what: string };

type Extreme = { model: string; combo: string; env: string; layer: string; mean: number; black: number; white: number; ok: boolean };
// A partial run (ONLY, PHASE) keeps the numbers of the run before for what it does not measure again.
const previous = fs.existsSync(path.join(WORK, "results.json")) ? (JSON.parse(fs.readFileSync(path.join(WORK, "results.json"), "utf8")) as { rows: Record<string, Row>; unsafe: Unsafe[]; extremes: Extreme[] }) : null;
const results: Record<string, Row> = previous?.rows ?? {};
let unsafe: Unsafe[] = previous?.unsafe ?? [];
let extremes: Extreme[] = previous?.extremes ?? [];
function save() {
  fs.mkdirSync(WORK, { recursive: true });
  fs.writeFileSync(path.join(WORK, "results.json"), JSON.stringify({ when: new Date().toISOString(), rows: results, unsafe, extremes, broken }, null, 1));
}

const visibleOf = (d: { mad: number; big: number }) => d.mad >= 0.8 || d.big >= 0.01;
const stoneSafe = (s: { mean: number; black: number; white: number }) => s.mean >= 0.12 && s.mean <= 0.88 && s.black < 0.4 && s.white < 0.45;
const darkOnPurpose = (v: string) => /black|noir|onyx|hide/.test(v);

function checkSafety(key: string, c: Ctx, value: string, shot: Shot, target: Target) {
  if (darkOnPurpose(value)) return;
  if (["stone", "ring"].includes(target) || key.startsWith("env-gem") || key.includes("ambiance") || key === "presets")
    for (const [layer, s] of Object.entries(shot.stones)) if (s.pixels >= 30 && !stoneSafe(s)) unsafe.push({ key, model: c.short, value, what: `pierres « ${layer} » moyenne ${fr(s.mean)}, noir ${Math.round(s.black * 100)} %, blanc ${Math.round(s.white * 100)} %` });
  if (["metal", "ring"].includes(target) && c.masks && !key.startsWith("light-")) {
    const st = stats(shot.img, c.masks.metal, c.masks.halo);
    if (st.lum < 0.12 || st.white > 0.5) unsafe.push({ key, model: c.short, value, what: `métal moyenne ${fr(st.lum)}, blanc ${Math.round(st.white * 100)} %` });
  }
}

/* ---------- Help pictures (ZR0982 only) ---------- */

async function helpPicture(c: Ctx, key: string, side: "a" | "b", shot: Shot, target: Target) {
  if (c.short !== "ZR" || !c.masks || !HELP[key]?.pair) return;
  const { w, h } = shot.img;
  const b = target === "stone" ? c.masks.boxes.stone : target === "metal" ? c.masks.boxes.band : target === "ring" ? c.masks.boxes.ring : ([0, 0, w - 1, h - 1] as [number, number, number, number]);
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
  const half = Math.min(w, h) / 2;
  const s = target === "frame" || target === "bg" || target === "ground" ? half : Math.min(half, Math.max(b[2] - b[0], b[3] - b[1]) * 0.62);
  const left = Math.round(Math.max(0, Math.min(w - 2 * s, cx - s)));
  const top = Math.round(Math.max(0, Math.min(h - 2 * s, cy - s)));
  fs.mkdirSync(OUT_HELP, { recursive: true });
  await sharp(Buffer.from(shot.img.rgb), { raw: { width: w, height: h, channels: 3 } })
    .extract({ left, top, width: Math.round(2 * s), height: Math.round(2 * s) })
    .resize(HELP_SIZE, HELP_SIZE)
    .webp({ quality: 80 })
    .toFile(path.join(OUT_HELP, key + "-" + side + ".webp"));
}

/* ---------- The engine changing during a test (other people edit it: the development server reloads it) ---------- */

function engineStamp(): string {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) walk(f);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(f + ":" + fs.statSync(f).mtimeMs);
    }
  };
  walk("src/viewer");
  for (const f of ["src/data/scene3d.ts", "src/data/models.ts", "src/pages/Lab3D.tsx"]) out.push(f + ":" + fs.statSync(f).mtimeMs);
  return out.join("|");
}

/* ---------- The lab phase ---------- */

function oneOf(c: Ctx, A: Shot, B: Shot, target: Target, expect: Expect): One {
  const m = c.masks!;
  const region = regionOf(m, target);
  const d = difference(A.img, B.img, region);
  const visible = visibleOf(d);
  const sa = stats(A.img, region, m.halo);
  const sb = stats(B.img, region, m.halo);
  const dir = direction(expect, sa, sb);
  let ok: boolean;
  if (expect === "same") ok = !visible;
  else if (expect === "any") ok = true;
  else if (expect === "hidden") ok = visible;
  else ok = visible && dir.ok !== false;
  if (A.broken || B.broken) ok = false;
  const stones = (s: Shot) => Object.values(s.stones).filter((x) => x.pixels >= 30).map((x) => x.mean);
  const metal = (s: Shot) => stats(s.img, m.metal, m.halo).lum;
  return { model: c.short, mad: d.mad, big: d.big, visible, ok, text: "écart " + fr(d.mad, 1) + (d.big >= 0.005 ? " (" + Math.round(d.big * 100) + " % des points)" : "") + (dir.text ? ", " + dir.text : ""), stonesA: stones(A), stonesB: stones(B), metalA: metal(A), metalB: metal(B) };
}

async function labPhase(page: Page, ctxs: Ctx[]) {
  for (const c of ctxs) {
    console.log("· " + c.name);
    c.masks = await masksOf(page, c);
    // The poses the « Pose » buttons compute, and two points to focus on (the big stone, the band).
    await shoot(page, c, {});
    c.poses = (await page.evaluate(() => {
      const d = (window as unknown as { __berete3d: { stablePose(k: string): number[] } }).__berete3d;
      return Object.fromEntries(["auto", "flat", "standing", "angle"].map((k) => [k, d.stablePose(k)]));
    })) as Record<string, Vec3>;
    const sb = c.masks.boxes.stone, bb = c.masks.boxes.band;
    c.picks = { stone: [(sb[0] + sb[2]) / 2, (sb[1] + sb[3]) / 2], band: [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2 + (bb[3] - bb[1]) * 0.25] };
  }
  for (const k of CASES) {
    if (ONLY && !ONLY.includes(k.key)) continue;
    // A case measured while the engine changed is measured again (at most twice), from fresh pictures.
    if (process.env.SKIP_DONE && results[k.key] && (results[k.key]!.perModel.length || results[k.key]!.options?.length || k.kind === "static")) continue;
    for (let attempt = 0; attempt < 3; attempt++) {
      const stamp = engineStamp();
      const brokenBefore = broken.length;
      await labCase(page, ctxs, k).catch((x) => console.log("  !!   " + k.key + " " + String(x).slice(0, 200)));
      if (broken.length > brokenBefore && attempt < 2) {
        cache.clear();
        console.log("  (dessin cassé pendant « " + k.key + " » : mesuré à nouveau)");
        await page.waitForTimeout(3000);
        continue;
      }
      if (engineStamp() === stamp) break;
      cache.clear();
      console.log("  (le moteur a changé pendant « " + k.key + " » : mesuré à nouveau)");
      await page.waitForTimeout(3000);
    }
  }
  await focusCase(page, ctxs);
}

async function labCase(page: Page, ctxs: Ctx[], k: Case) {
  {
    unsafe = unsafe.filter((u) => u.key !== k.key);
    if (k.kind === "static") {
      const src = fs.readFileSync(k.check.file, "utf8");
      results[k.key] = { key: k.key, tab: k.tab, name: k.name, expected: k.expected, kind: k.kind, perModel: [], staticOk: k.check.pattern.test(src), why: k.why, ui: results[k.key]?.ui ?? null };
      return;
    }
    const row: Row = { key: k.key, tab: k.tab, name: k.name, expected: k.expected, kind: k.kind, perModel: [], note: k.note, ui: results[k.key]?.ui ?? null };
    for (const c of ctxs) {
      const pre = k.pre?.(c);
      current = { key: k.key, model: c.short, value: "" };
      if (k.kind === "choice") {
        row.options ??= [];
        current.value = String(k.base);
        const base = await shoot(page, c, join(pre, k.apply(c, k.base)));
        for (const [value, label] of k.options) {
          current.value = String(value);
          const shot = await shoot(page, c, join(pre, k.apply(c, value)));
          checkSafety(k.key, c, String(value), shot, k.target);
          let opt = row.options.find((o) => o.value === String(value));
          if (!opt) row.options.push((opt = { value: String(value), label, perModel: [] }));
          const expect: Expect = value === k.base ? "same" : (k.expectOf?.(value) ?? "changes");
          opt.perModel.push(oneOf(c, base, shot, k.target, expect));
          if (k.pair) {
            if (value === k.pair[0]) await helpPicture(c, k.key, "a", shot, k.target);
            if (value === k.pair[1]) await helpPicture(c, k.key, "b", shot, k.target);
          }
        }
      } else {
        current.value = JSON.stringify(k.a);
        const A = await shoot(page, c, join(pre, k.apply(c, k.a)));
        current.value = JSON.stringify(k.b);
        const B = await shoot(page, c, join(pre, k.apply(c, k.b)));
        checkSafety(k.key, c, JSON.stringify(k.a), A, k.target);
        checkSafety(k.key, c, JSON.stringify(k.b), B, k.target);
        row.perModel.push(oneOf(c, A, B, k.target, k.expect));
        await helpPicture(c, k.key, "a", A, k.target);
        await helpPicture(c, k.key, "b", B, k.target);
      }
    }
    if (k.needOne) {
      const settleOne = (list: One[]) => {
        if (!list.some((x) => x.ok && x.visible)) return;
        for (const x of list) {
          if (x.ok) continue;
          x.ok = true;
          x.note = "sans objet sur ce bijou";
        }
      };
      if (row.options) row.options.forEach((o) => settleOne(o.perModel));
      else settleOne(row.perModel);
    }
    results[k.key] = row;
    const flat = row.options ? row.options.flatMap((o) => o.perModel) : row.perModel;
    console.log((flat.every((x) => x.ok) ? "  ok   " : "  ??   ") + k.key + "  " + (row.options ? row.options.filter((o) => o.perModel.some((x) => !x.ok)).map((o) => o.value + ":" + o.perModel.map((x) => x.text).join("|")).join("; ") : row.perModel.map((x) => x.model + " " + x.text).join(" ; ")));
    save();
  }
}

/** The point in focus (depth of field): on the big stone, then on the band; each sharper where it is focused. */
async function focusCase(page: Page, ctxs: Ctx[]) {
  if (!ONLY || ONLY.includes("dof-focus")) {
    const row: Row = { key: "dof-focus", tab: "Effets", name: "Mise au point par clic", expected: "L'endroit cliqué devient net", kind: "button", perModel: [], ui: results["dof-focus"]?.ui ?? null };
    for (const c of ctxs) {
      await shoot(page, c, {});
      const pick = async (p: [number, number]) => (await page.evaluate(([x, y]) => (window as unknown as { __berete3d: { pick(x: number, y: number): number[] | null } }).__berete3d.pick(x!, y!), p)) as Vec3 | null;
      const onStone = await pick(c.picks!.stone);
      const onBand = await pick(c.picks!.band);
      const dof = (focus: Vec3 | null) => POST({ dof: { enabled: true, aperture: 0.08, maxBlur: 1.4, focus } });
      const A = await shoot(page, c, dof(onStone));
      const B = await shoot(page, c, dof(onBand));
      const m = c.masks!;
      const sharpA = stats(A.img, m.big, m.halo).sharp, sharpB = stats(B.img, m.big, m.halo).sharp;
      const bandA = stats(A.img, m.band, m.halo).sharp, bandB = stats(B.img, m.band, m.halo).sharp;
      const d = difference(A.img, B.img, m.full);
      const ok = Boolean(onStone && onBand) && sharpA > sharpB * 1.03 && bandB > bandA * 1.03;
      row.perModel.push({ model: c.short, mad: d.mad, big: d.big, visible: visibleOf(d), ok, text: `pierre nette ${pct(sharpB, sharpA)} quand on la vise, bas de l'anneau ${pct(bandA, bandB)} quand on le vise` + (onStone && onBand ? "" : " (point non trouvé)") });
      if (c.short === "ZR" && onStone && onBand) {
        // No pair of pictures for a button (the help says how to use it).
      }
    }
    results["dof-focus"] = row;
    console.log((row.perModel.every((x) => x.ok) ? "  ok   " : "  ??   ") + "dof-focus  " + row.perModel.map((x) => x.model + " " + x.text).join(" ; "));
    save();
  }
}

/* ---------- The darkest and brightest stones (every lighting) ---------- */

async function extremesPhase(page: Page, ctxs: Ctx[]) {
  const dark = { envIntensity: 0.5, gamma: 1.6, boost: [0.6, 0.6, 0.6], refractiveIndex: 1.5, rayBounces: 1, reflectivity: 0, transmission: 0.6, dispersion: 0 };
  const bright = { envIntensity: 3, gamma: 0.6, boost: [1.6, 1.6, 1.6], refractiveIndex: 2.9, rayBounces: 16, reflectivity: 1, transmission: 0, dispersion: 0.03 };
  const combos: [string, (c: Ctx, env: string) => Patch][] = [
    ["sombre", (c, env) => join(S(c, dark), SC({ envGem: { id: env, intensity: 0.5 } }), POST({ tonemap: { exposure: 0.5 } }))],
    ["clair", (c, env) => join(S(c, bright), SC({ envGem: { id: env, intensity: 2.5 } }), POST({ tonemap: { exposure: 2.2 } }))],
  ];
  extremes = extremes.filter((e) => !ctxs.some((c) => c.short === e.model));
  for (const c of ctxs)
    for (const [combo, patch] of combos)
      for (const env of GEM_ENVS) {
        const shot = await shoot(page, c, patch(c, env));
        for (const [layer, s] of Object.entries(shot.stones)) {
          if (s.pixels < 30) continue;
          extremes.push({ model: c.short, combo, env, layer, mean: s.mean, black: s.black, white: s.white, ok: stoneSafe(s) });
        }
        const worst = Object.values(shot.stones).filter((s) => s.pixels >= 30);
        console.log(`  ${c.short} ${combo} ${env}: ` + worst.map((s) => `${fr(s.mean)} n${Math.round(s.black * 100)} b${Math.round(s.white * 100)}`).join(" | "));
        save();
      }
}

/* ---------- In the real editor: each control moved by hand ---------- */

async function uiPhase(ctx: Ctx) {
  const browser = await chromium.launch({ args: ["--mute-audio", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  let saved: ((body: Json) => void) | null = null;
  // Nothing is ever written: every request that is not a reading is answered here, never sent.
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    if (req.method() === "GET" || req.method() === "HEAD") return route.continue();
    if (/\/api\/admin\/login/.test(req.url())) return route.continue();
    try {
      const body = req.postDataJSON() as Json;
      saved?.(body);
    } catch {
      // A picture (the poster): answered, never kept.
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.addInitScript(([t]) => {
    sessionStorage.setItem("bj-admin-token", t!);
    sessionStorage.setItem("bj-admin-tab", "3d");
    localStorage.setItem("bj-3d-mode", "expert");
  }, [token]);
  await page.goto(LAB + "/admin?debug3d");
  await page.locator("[data-model-card] [data-open-model]").first().waitFor({ timeout: 60_000 });
  const cards = page.locator("[data-model-card]").filter({ has: page.locator("[data-open-model]") });
  const row = await modelRow(ctx.id);
  for (let i = 0; i < (await cards.count()); i++) {
    if ((await cards.nth(i).locator("p.text-xl").textContent()) === row.name) {
      await cards.nth(i).locator("[data-open-model]").click();
      break;
    }
  }
  await page.locator("[data-editor-3d]").waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __berete3d?: unknown }).__berete3d) && !document.querySelector("[data-editor-canvas] [role=status]"), null, { timeout: 120_000 });
  const canvas = page.locator("[data-editor-canvas] canvas");
  const snap = async () => {
    await settle(page);
    const png = await canvas.screenshot();
    const raw = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    return { w: raw.info.width, h: raw.info.height, rgb: new Uint8Array(raw.data), alpha: new Uint8Array(0) } as Img;
  };
  const openDetails = (key: string) =>
    page.evaluate((k) => {
      let d = document.querySelector(`[data-control="${k}"]`)?.closest("details") ?? null;
      while (d) {
        d.open = true;
        d = d.parentElement?.closest("details") ?? null;
      }
    }, key);
  const setControl = async (key: string, value: Val, vecX = false) => {
    if (key === "@tab") return page.locator(`[data-tab="${String(value)}"]`).click();
    if (key === "@part") return selectPart(value === "metal" ? metal : ctx.big);
    if (key === "@click") {
      await page.evaluate((sel) => {
        let d = document.querySelector(sel)?.closest("details") ?? null;
        while (d) {
          d.open = true;
          d = d.parentElement?.closest("details") ?? null;
        }
      }, String(value));
      return page.locator(String(value)).first().click();
    }
    await openDetails(key);
    const el = page.locator(`[data-control="${key}"]`).first();
    await el.waitFor({ timeout: 8000 });
    if (vecX) return page.locator(`[data-control="${key}-x"] input[type=range]`).fill(String((value as number[])[0]));
    if ((await el.locator("select").count()) > 0) return el.locator("select").first().selectOption(String(value));
    if ((await el.locator("input[type=color]").count()) > 0) return el.locator("input[type=color]").first().fill(String(value));
    if ((await el.locator("input[type=checkbox]").count()) > 0) return el.locator("input[type=checkbox]").first().setChecked(Boolean(value));
    return el.locator("input[type=range]").first().fill(String(value));
  };
  const selectPart = async (name: string) => {
    const opt = page.locator(`[data-part="${name}"] [role=option]`);
    if ((await opt.getAttribute("aria-selected")) !== "true") await opt.click();
  };
  const metal = ctx.metals[0]!;
  for (const k of CASES) {
    if (ONLY && !ONLY.includes(k.key)) continue;
    if (!k.ui || REMOVED[k.key]) continue;
    const ui = k.ui;
    if (ui.simple) continue;
    const value = ui.value !== undefined ? ui.value : k.kind === "choice" ? k.pair?.[1] : k.kind === "static" ? true : (k as RangeCase).b;
    try {
      if (ui.tab) await page.locator(`[data-tab="${ui.tab}"]`).click();
      if (ui.drawer) await page.locator(`[data-left="${ui.drawer}"]`).click();
      if (ui.part === "stone") await selectPart(ctx.big);
      if (ui.part === "metal") await selectPart(metal);
      for (const [key, v] of ui.before ?? []) await setControl(key, v, Array.isArray(v));
      const A = await snap();
      let body: Json | null = null;
      const got = new Promise<void>((resolve) => {
        saved = (b) => {
          body = b;
          resolve();
        };
      });
      await setControl(ui.control ?? k.key, value, ui.vecX);
      const B = await snap();
      const live = difference(A, B, new Uint8Array(A.w * A.h).fill(1)).mad;
      await page.locator("[data-save-model]").click();
      await Promise.race([got, new Promise((r) => setTimeout(r, 6000))]);
      saved = null;
      const s = (body as { settings?: Json } | null)?.settings ?? null;
      // What the control writes: the paths that differ between its low and high values, with the value set by hand.
      let want: Json = {};
      if (ui.want) want = ui.want(value);
      else if (k.kind !== "static") {
        const flat = (p: Patch) => ({ ...(p.settings ?? {}), ...(p.scene ? { scene: p.scene } : {}) }) as Json;
        const lo = flat(k.apply(ctx, k.kind === "choice" ? k.base : (k as RangeCase).a));
        const hi = flat(k.apply(ctx, k.kind === "choice" ? (k.pair?.[1] ?? value) : (k as RangeCase).b));
        const set = flat(k.apply(ctx, value));
        for (const p of changed(lo, hi)) {
          // The editor changes the part chosen only; the lab changed every part of the same kind.
          if (p[0] === "layers" && p[1] !== (ui.part === "metal" ? metal : ctx.big)) continue;
          put(want, p, at(set, p));
        }
      }
      const okSaved = s ? contains(s, want, ui.vecX) : null;
      results[k.key] ??= { key: k.key, tab: k.tab, name: k.name, expected: k.expected, kind: k.kind, perModel: [] };
      results[k.key]!.ui = { live: ui.noLive ? -1 : live, saved: okSaved, detail: s ? (Object.keys(want).length ? "" : "rien à vérifier") : "aucune sauvegarde" };
      console.log((live >= 0.3 && okSaved ? "  ok   " : "  ??   ") + "éditeur " + k.key + "  image " + fr(live, 2) + "  enregistré " + okSaved);
      // « Enregistrer » answered without being sent: the editor reads the model again (unchanged), every setting is back.
      await page.waitForTimeout(800);
      await page.locator("[data-drawer] button").first().click({ timeout: 500 }).catch(() => undefined);
    } catch (x) {
      results[k.key] ??= { key: k.key, tab: k.tab, name: k.name, expected: k.expected, kind: k.kind, perModel: [] };
      results[k.key]!.ui = { live: 0, saved: false, detail: "erreur : " + String(x).slice(0, 160) };
      console.log("  !!   éditeur " + k.key + " " + String(x).slice(0, 200));
      await page.goto(LAB + "/admin?debug3d").catch(() => undefined);
      await page.locator("[data-model-card] [data-open-model]").first().waitFor({ timeout: 60_000 }).catch(() => undefined);
      for (let i = 0; i < (await cards.count()); i++) if ((await cards.nth(i).locator("p.text-xl").textContent()) === row.name) await cards.nth(i).locator("[data-open-model]").click();
      await page.locator("[data-editor-3d]").waitFor({ timeout: 60_000 }).catch(() => undefined);
      await page.waitForFunction(() => Boolean((window as unknown as { __berete3d?: unknown }).__berete3d) && !document.querySelector("[data-editor-canvas] [role=status]"), null, { timeout: 120_000 }).catch(() => undefined);
    }
    save();
  }
  // « Mise au point par clic »: armed, then a click on the jewel; the point is saved, the tab stays « Effets ».
  if (!ONLY || ONLY.includes("dof-focus")) {
    let ok = false;
    let detail: string;
    try {
      await page.locator('[data-tab="effects"]').click();
      await openDetails("dof-focus");
      await page.locator("[data-dof-pick]").click();
      const box = (await canvas.boundingBox())!;
      // The middle of the jewel: the big stone's centre on the screen.
      const at = (await page.evaluate((name) => {
        const d = (window as unknown as { __berete3d: { layerCenter(n: string): number[]; project(p: number[]): number[] } }).__berete3d;
        return d.project(d.layerCenter(name));
      }, ctx.big)) as [number, number];
      await page.mouse.click(box.x + at[0], box.y + at[1]);
      await page.waitForTimeout(500);
      const stayed = (await page.locator('[data-tab-panel="effects"]').count()) > 0;
      let body: Json | null = null;
      const got = new Promise<void>((r) => (saved = (b) => ((body = b), r())));
      await page.locator("[data-save-model]").click();
      await Promise.race([got, new Promise((r) => setTimeout(r, 6000))]);
      saved = null;
      const dof = ((body as { settings?: { scene?: { post?: { dof?: { enabled?: boolean; focus?: unknown } } } } } | null)?.settings?.scene?.post?.dof) ?? {};
      ok = stayed && dof.enabled === true && Array.isArray(dof.focus) && dof.focus.length === 3;
      detail = `point enregistré ${JSON.stringify(dof.focus ?? null)}, profondeur de champ ${dof.enabled ? "allumée" : "éteinte"}, onglet Effets ${stayed ? "gardé" : "perdu"}`;
    } catch (x) {
      detail = "erreur : " + String(x).slice(0, 160);
    }
    const row = results["dof-focus"];
    if (row) row.ui = { live: -1, saved: ok, detail: ok ? "" : detail };
    console.log((ok ? "  ok   " : "  ??   ") + "éditeur dof-focus  " + detail);
    save();
    await page.waitForTimeout(800);
  }
  // A stone saved as .bgem, then a stone loaded from a .bgem whose numbers are out of bounds (and a key that is not ours).
  if (!ONLY || ONLY.includes("bgem")) {
    let detail: string;
    let ok = false;
    try {
      await page.locator('[data-tab="parts"]').click();
      await selectPart(ctx.big);
      const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 10_000 }), page.locator("[data-save-gem]").click()]);
      const file = path.join(WORK, "test.bgem");
      fs.mkdirSync(WORK, { recursive: true });
      await dl.saveAs(file);
      const savedGem = JSON.parse(fs.readFileSync(file, "utf8")) as { format?: string; version?: number; diamond?: Json };
      const formatOk = savedGem.format === "berete-gem" && savedGem.version === 1 && typeof savedGem.diamond?.refractiveIndex === "number";
      fs.writeFileSync(file, JSON.stringify({ format: "berete-gem", version: 1, name: "Essai", diamond: { refractiveIndex: 9, envIntensity: 0.01, boost: [5, 5, 5], rayBounces: 40.7, gamma: -3, color: "red", evil: 1, thinFilm: { amount: 4, thickness: 5 } } }));
      let body: Json | null = null;
      const got = new Promise<void>((r) => (saved = (b) => ((body = b), r())));
      await page.locator("[data-gem-file]").setInputFiles(file);
      await page.waitForTimeout(600);
      await page.locator("[data-save-model]").click();
      await Promise.race([got, new Promise((r) => setTimeout(r, 6000))]);
      saved = null;
      const d = ((body as { settings?: Json } | null)?.settings?.layers as Record<string, { diamond?: Json }> | undefined)?.[ctx.big]?.diamond ?? {};
      const clamped = d.refractiveIndex === 2.9 && d.envIntensity === 0.5 && JSON.stringify(d.boost) === "[1.6,1.6,1.6]" && d.rayBounces === 16 && d.gamma === 0.6 && !("evil" in d) && d.color !== "red" && JSON.stringify(d.thinFilm) === JSON.stringify({ amount: 1, thickness: 100 });
      ok = formatOk && clamped;
      detail = `fichier enregistré ${formatOk ? "au bon format" : "MAUVAIS FORMAT"} ; pierre chargée : indice ${d.refractiveIndex}, luminosité ${d.envIntensity}, gain ${JSON.stringify(d.boost)}, rebonds ${d.rayBounces}, contraste ${d.gamma}, clé inconnue ${"evil" in d ? "gardée" : "ignorée"}, couleur invalide ${d.color !== "red" ? "ignorée" : "gardée"}`;
      fs.rmSync(file, { force: true });
    } catch (x) {
      detail = "erreur : " + String(x).slice(0, 160);
    }
    results.bgem = { key: "bgem", tab: "Parties", name: "Enregistrer / charger une pierre (.bgem)", expected: "Le fichier garde tous les réglages ; au chargement, seuls nos réglages, dans les bornes des curseurs", kind: "button", perModel: [{ model: ctx.short, mad: 0, big: 0, visible: true, ok, text: detail }], ui: { live: -1, saved: ok, detail: "" } };
    console.log((ok ? "  ok   " : "  ??   ") + "éditeur bgem  " + detail);
    save();
    await page.waitForTimeout(800);
  }
  // The simple mode: each button writes its choice.
  await page.locator("[data-close-expert]").click();
  const simple: [string, string, (v: string) => Json][] = [
    ["simple-ambiance", "data-ambiance", (v) => ({ scene: { ambiance: v } })],
    ["simple-metal", "data-metal", (v) => ({ layers: { [metal]: { metal: v } } })],
    ["simple-stone", "data-stone", (v) => ({ layers: { [ctx.big]: { material: SIMPLE_STONES.find((s) => s.id === v)?.material } } })],
  ];
  for (const [key, attr, want] of simple) {
    if (ONLY && !ONLY.includes(key)) continue;
    const ids = await page.locator(`[${attr}]`).evaluateAll((els, a) => els.map((e) => e.getAttribute(a)!), attr);
    let all = true;
    let live = 99;
    for (const id of ids) {
      const A = await snap();
      let body: Json | null = null;
      const got = new Promise<void>((r) => (saved = (b) => ((body = b), r())));
      await page.locator(`[${attr}="${id}"]`).first().click();
      const B = await snap();
      const d = difference(A, B, new Uint8Array(A.w * A.h).fill(1)).mad;
      await page.locator("[data-save-model]").click();
      await Promise.race([got, new Promise((r) => setTimeout(r, 6000))]);
      saved = null;
      const s = (body as { settings?: Json } | null)?.settings;
      const ok = s ? contains(s, want(id)) : false;
      all &&= ok;
      // The first button can be the one already chosen: no change to see.
      if (d > 0.05) live = Math.min(live, d);
      await page.waitForTimeout(800);
    }
    results[key] ??= { key, tab: "Mode simple", name: key, expected: "", kind: "choice", perModel: [] };
    results[key]!.ui = { live: live === 99 ? 0 : live, saved: all, detail: ids.length + " boutons" };
    console.log((all ? "  ok   " : "  ??   ") + "éditeur " + key + " " + ids.length + " boutons");
    save();
  }
  await page.locator("[data-open-expert]").click().catch(() => undefined);
  await browser.close();
}

/** The paths (lists of keys) where two patches differ. */
function changed(a: unknown, b: unknown, at: string[] = []): string[][] {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.length > 0 && a.every(isPlain) && b.every(isPlain)) return a.flatMap((x, i) => changed(x, b[i], [...at, String(i)]));
  if (isPlain(a) || isPlain(b)) {
    const x = isPlain(a) ? a : {}, y = isPlain(b) ? b : {};
    return [...new Set([...Object.keys(x), ...Object.keys(y)])].flatMap((k) => changed(x[k], y[k], [...at, k]));
  }
  return JSON.stringify(a) === JSON.stringify(b) ? [] : [at];
}
const at = (o: unknown, p: string[]): unknown => p.reduce<unknown>((v, k) => (isPlain(v) || Array.isArray(v) ? (v as Record<string, unknown>)[k] : undefined), o);
function put(o: Json, p: string[], v: unknown) {
  let cur = o;
  p.slice(0, -1).forEach((k) => (cur = (cur[k] ??= {}) as Json));
  cur[p[p.length - 1]!] = v;
}

/** `whole` has every value of `part` (numbers within 1e-6; only the first of three numbers when asked). */
function contains(whole: unknown, part: unknown, vecX = false): boolean {
  if (isPlain(part)) return (isPlain(whole) || Array.isArray(whole)) && Object.entries(part).every(([k, v]) => contains((whole as Record<string, unknown>)[k], v, vecX));
  if (Array.isArray(part)) return Array.isArray(whole) && (vecX ? Math.abs(Number(whole[0]) - Number(part[0])) < 1e-6 : part.every((v, i) => contains(whole[i], v)));
  if (typeof part === "number") return typeof whole === "number" && Math.abs(whole - part) < 1e-6;
  if (part === null || part === undefined) return whole === null || whole === undefined;
  return whole === part;
}

/* ---------- The table (docs/3d-reglages-testes.md) ---------- */

/** The extremes in one line: how many of the pictures of each combination stay readable, and which lightings fail. */
function extremesLine(): string {
  if (!extremes.length) return "";
  const part = (combo: string, word: string) => {
    const shots = new Map<string, boolean>();
    for (const e of extremes.filter((x) => x.combo === combo)) shots.set(e.model + "|" + e.env, (shots.get(e.model + "|" + e.env) ?? true) && e.ok);
    const bad = [...shots].filter(([, ok]) => !ok).map(([k]) => k);
    if (!bad.length) return ` côté ${word} : lisible partout (${shots.size} images)`;
    const name = (env: string) => (env === "auto" ? "Automatique" : (HDRI[env]?.name ?? env));
    const good = shots.size - bad.length;
    return ` côté ${word} : ${good} ${good > 1 ? "images lisibles" : "image lisible"} sur ${shots.size} ; encore ${combo === "sombre" ? "trop sombres" : "trop blanches"} : ` + MODELS.map((m) => {
      const list = bad.filter((k) => k.startsWith(m.short + "|")).map((k) => name(k.split("|")[1]!));
      return list.length ? m.short + " " + list.join(", ") : "";
    }).filter(Boolean).join(" ; ");
  };
  return " Pierres poussées toutes ensemble au même bout (garde commune du moteur) —" + part("clair", "clair") + " ;" + part("sombre", "sombre") + ".";
}

/**
 * What was repaired after looking at the numbers and the pictures (27/11/2026): « réparé » only while the measure says it
 * works now, else « à revoir ».
 */
const REPAIRED: Record<string, string> = {
  "env-gem-intensity": "le moteur ne lisait cette intensité nulle part : elle multiplie maintenant la luminosité de chaque pierre (src/viewer/Stage.tsx).",
  "drawer-gem-intensity": "même réparation (le curseur « Intensité » de l'éclairage des pierres, à gauche).",
  "cube-size": "la taille choisie était perdue en route (la fusion des réglages garde « auto » sous un nombre) : le moteur lit maintenant celle de la pierre (src/viewer/Stage.tsx).",
  "bloom-layer": "la lueur ne savait plus quelles matières rayonnent : le seuil effaçait le choix par matière (src/viewer/screen.ts) ; et dans l'éditeur, chaque réglage de la lueur refaisait l'effet sans ce choix ni la puissance (src/viewer/Stage.tsx).",
  "bloom-power": "la puissance n'arrivait jamais à l'écran : la lueur recevait son nouveau calcul sans être refaite (src/viewer/screen.ts) ; et dans l'éditeur elle se perdait dès qu'un autre réglage de la lueur bougeait (src/viewer/Stage.tsx).",
  "scene-lut-intensity": "la force ne changeait rien : la teinte remplaçait l'image au lieu de s'y mélanger (src/viewer/Stage.tsx, mélange « normal »).",
  role: "« Pierre de couleur » et « Émail » restaient blancs ou noirs : ils prennent la couleur que montre le champ, et une pierre de couleur une densité 0,4 (à 1,2, une grande pierre était à moitié noire).",
  "stone-color": "même réparation que « Rôle » (densité de couleur 0,4 au passage en pierre de couleur).",
  inclusions: "allumées à 0,3, elles ne se voyaient pas : départ à 0,6.",
};
/** Still to fix outside the editor, in one simple line (the engine or the library of materials). */
const TODO: Record<string, string> = {
  "library-gems": "les pierres « avec inclusions » de la bibliothèque allument un nuage à 0,3, trop faible pour se voir (src/viewer/library/materials.ts : à monter vers 0,6, comme le bouton « Inclusions »).",
};
/** Below the measure's threshold but checked by eye on the two pictures (the change is real, small in this framing). */
const BY_EYE: Record<string, string> = {
  "mirror-blur": "le reflet de l'anneau dans le sol s'efface à 1 (comparé à l'œil) ; ce reflet n'occupe qu'un coin de l'image cadrée.",
};
/** Controls taken out of the editor, and why (the setting stays readable in saved models), by their key. */
const REMOVED: Record<string, { name: string; why: string }> = {
  "env-metal-studio-dark": { name: "Éclairage du métal « Studio sombre » (onglet Scène et images à gauche)", why: "le métal devenait noir sur les deux bijoux (moyenne 0,02 sur ZR0982, 0,10 sur le N). Il reste affiché pour un modèle qui l'utilise déjà, et dans l'ambiance « Noir profond », où un spot éclaire le métal." },
  "finish-brushed": { name: "Finition « Brossé » (et les métaux brossés de la bibliothèque)", why: "le métal devenait presque blanc et plat (81 à 88 % de blanc sur ZR0982, 54 à 76 % sur le N). Cause : l'anisotropie 0,8 de la matière brossée (src/viewer/library/materials.ts) sous le studio clair ; à corriger dans le moteur, puis à remettre. Un modèle déjà brossé la garde, avec son « Sens du brossage »." },
  bevel: { name: "Biseau à l'écran (SSBevel) : activer", why: "l'arrondi fait la moyenne des normales du fichier, déjà lisses : rien ne changeait sur les deux bijoux (écart 0,0 à 0,5). Il faudrait le recalculer à partir de la profondeur, comme iJewel : signalé pour le moteur." },
  "bevel-radius": { name: "Biseau : rayon (scène)", why: "même raison (et le curseur « Rayon » du biseau dans « Réglages avancés », à gauche)." },
  "bevel-intensity": { name: "Biseau : intensité", why: "même raison (et le curseur « Intensité » du biseau dans « Réglages avancés »)." },
  "bevel-layer": { name: "Biseau à l'écran, par matière (onglet Parties)", why: "même raison." },
  "add-light-ambient": { name: "Lumière en plus « Ambiante »", why: "elle n'éclaire que les matières mates (émail, perles, socles) : le métal et les pierres, qui prennent leur lumière de leurs éclairages, ne changeaient pas (écart 0,0 sur les deux bijoux)." },
};

function doc() {
  cleanHelp();
  const tabs = ["Vue", "Parties", "Scène", "Rendu", "Effets", "Vues de caméra", "Configurateur", "À gauche", "Mode simple"];
  const lines: string[] = [];
  const all = Object.values(results);
  const verdictOf = (r: Row): string => {
    const fixed = REPAIRED[r.key];
    const flat = r.options ? r.options.flatMap((o) => o.perModel) : r.perModel;
    const one = Boolean((CASES.find((k) => k.key === r.key) as { needOne?: boolean } | undefined)?.needOne) || r.key === "bloom-soft-threshold";
    const groupOk = (list: One[]) => list.every((x) => x.ok) || (one && list.some((x) => x.ok && x.visible));
    const okLab = r.kind === "static" ? Boolean(r.staticOk) : flat.length > 0 && (r.options ? r.options.every((o) => groupOk(o.perModel)) : groupOk(r.perModel));
    // In the editor the jewel is small in a large canvas: 0,1 is a change; none needed where the lab saw none on ZR0982 either.
    // The simple mode's buttons: each one checked to write its choice; their pictures are measured in the lab.
    if (r.key.startsWith("simple-") && r.ui) r.ui.live = -1;
    const zrSilent = (r.options ? r.options.flatMap((o) => o.perModel) : r.perModel).filter((x) => x.model === "ZR").every((x) => !x.visible);
    const okUi = !r.ui || (r.ui.saved !== false && (r.ui.live >= 0.1 || r.ui.live === -1 || r.kind === "static" || zrSilent));
    if (REMOVED[r.key]) return "**retiré** — " + REMOVED[r.key]!.why;
    const eye = !okLab && okUi ? BY_EYE[r.key] : undefined;
    const base = (okLab || eye) && okUi ? (fixed ? "réparé" : "OK") : "à revoir";
    const v = fixed ? { note: fixed } : eye ? { note: "vu à l'œil : " + eye } : null;
    const ui = r.ui ? (r.ui.saved && (r.ui.live >= 0.1 || r.ui.live === -1 || zrSilent) ? " · éditeur ✓" : r.ui.saved ? " · éditeur : enregistré, image " + fr(r.ui.live, 2) : " · éditeur ✗ " + r.ui.detail) : "";
    const why = base === "à revoir" ? " — " + (TODO[r.key] ?? "la mesure ne voit pas l'effet attendu sur ces deux bijoux.") : "";
    return "**" + base + "**" + ui + (v?.note ? " — " + v.note : "") + why;
  };
  const measured = (r: Row): string => {
    if (r.kind === "static") return r.why ?? "";
    if (r.options) {
      const per = MODELS.map((m) => {
        const ones = r.options!.map((o) => ({ o, x: o.perModel.find((p) => p.model === m.short) })).filter((p) => p.x);
        if (!ones.length) return "";
        const vis = ones.filter((p) => p.x!.visible && p.o.value !== String((CASES.find((k) => k.key === r.key) as ChoiceCase | undefined)?.base));
        const mads = vis.map((p) => p.x!.mad);
        const one = Boolean((CASES.find((k) => k.key === r.key) as { needOne?: boolean } | undefined)?.needOne);
        const bad = ones.filter((p) => !p.x!.ok && !(one && p.o.perModel.some((y) => y.ok && y.visible))).map((p) => p.o.label + " (" + p.x!.text + ")");
        return `${m.short} : ${ones.length} options, ${vis.length} visibles` + (mads.length ? ` (écart ${fr(Math.min(...mads), 1)} à ${fr(Math.max(...mads), 1)})` : "") + (bad.length ? " ; à revoir : " + bad.join(", ") : "");
      }).filter(Boolean);
      return per.join(" · ");
    }
    return r.perModel.map((x) => {
      const st = x.stonesA && x.stonesA.length && x.stonesB && x.stonesB.length ? `, pierres ${fr(Math.min(...x.stonesA))} → ${fr(Math.min(...x.stonesB))}` : "";
      return `${x.model} : ${x.text}${st}`;
    }).join(" · ");
  };
  lines.push("# Réglages de l'éditeur 3D : chacun testé", "");
  lines.push(`Mis à jour le ${new Date().toLocaleDateString("fr-FR")} par \`npx tsx scripts/settings-audit.ts\` (serveur de développement lancé).`, "");
  lines.push("## Comment c'est testé", "");
  lines.push("- **Deux bijoux** : " + MODELS.map((m) => m.name).join(" ; ") + ". Ils ne sont jamais enregistrés : chaque réglage est donné dans l'adresse du laboratoire 3D (/lab3d), qui dessine le bijou avec notre moteur.");
  lines.push("- **Pour chaque réglage**, une valeur basse et une valeur haute (ou chaque choix de la liste) sont dessinées, puis les deux images sont comparées **sur le bijou** : l'écart moyen des points (0 à 255 ; visible à partir de 0,8, ou quand 1 % des points changent nettement) et le **sens** attendu : plus clair ou plus sombre, plus ou moins de couleur, de contraste, de chaleur, de halo autour du bijou, de netteté. Les réglages des pierres se mesurent sur les pierres, ceux du métal sur le métal, ceux de la scène et des effets sur tout le bijou, ceux du fond sur le fond, ceux du sol sous le bijou.");
  lines.push("- **Les pierres** sont aussi mesurées par le moteur lui-même (`measureStones` : luminosité moyenne, part de noir et de blanc plat). Une pierre est lisible quand sa moyenne est entre 0,12 et 0,88, avec moins de 40 % de noir et moins de 45 % de blanc plat. Chaque curseur est mesuré à ses deux bouts (les autres réglages par défaut) ; **les combinaisons les plus sombres et les plus claires** de tous les curseurs des pierres ensemble sont mesurées sous chacun des éclairages des pierres (plus bas).");
  lines.push("- **Dans le vrai éditeur**, chaque réglage est ensuite bougé à la main (Playwright) : l'image doit changer tout de suite, et « Enregistrer » est intercepté (jamais envoyé) pour vérifier que le réglage écrit bien ce qu'il doit. « éditeur ✓ » dans la colonne Résultat.");
  lines.push("- Les réglages qui ne changent pas l'image (boutons du client, mouvements de caméra) sont vérifiés dans le code qui les lit.");
  lines.push("- Les petites images d'aide (« ? » à côté de chaque réglage) sortent de ces mêmes rendus, sur ZR0982 : l'émeraude pour les pierres, l'anneau pour le métal, la bague entière pour la scène et les effets.", "");
  const counts = { total: all.length, ok: 0, repaired: 0, removed: 0, todo: 0 };
  for (const r of all) {
    const v = verdictOf(r);
    if (v.startsWith("**OK")) counts.ok++;
    else if (v.startsWith("**réparé")) counts.repaired++;
    else if (!v.startsWith("**retiré")) counts.todo++;
  }
  counts.removed = Object.keys(REMOVED).length;
  lines.push(`**Bilan** : ${counts.total} réglages testés (${all.reduce((s, r) => s + (r.options?.length ?? 1), 0)} valeurs ou choix) : ${counts.ok} OK, ${counts.repaired} réparés, ${counts.removed} retirés${counts.todo ? `, ${counts.todo} à revoir` : ""}.` + extremesLine(), "");
  for (const tab of tabs) {
    const rows = all.filter((r) => r.tab === tab);
    if (!rows.length) continue;
    lines.push(`## ${tab}`, "", "| Réglage | Effet attendu | Effet mesuré | Résultat |", "| --- | --- | --- | --- |");
    for (const r of rows) {
      const k = CASES.find((x) => x.key === r.key);
      const note = k ? k.note : r.note;
      lines.push(`| ${k?.name ?? r.name} | ${k?.expected ?? r.expected} | ${measured(r).replace(/\|/g, "/")}${note ? " *(" + note + ")*" : ""} | ${verdictOf(r)} |`);
    }
    lines.push("");
  }
  lines.push("## Pierres aux extrêmes", "");
  lines.push("Tous les curseurs des pierres poussés ensemble vers le plus sombre (luminosité 0,5, contraste 1,6, gain 0,6, indice 1,5, 1 rebond, sans reflet, transparence 0,6, intensité de l'éclairage des pierres 0,5, exposition 0,5) puis vers le plus clair (luminosité 3, contraste 0,6, gain 1,6, indice 2,9, 16 rebonds, reflet 1, feu 0,03, intensité 2,5, exposition 2,2), sous chacun des éclairages des pierres.", "");
  lines.push("La garde commune du moteur (src/viewer/gems.ts, 27/11/2026) garde la lumière d'une pierre (intensité × gain) entre 0,7 et 2,8, adoucit le contraste intérieur à ces bouts, ajoute un fond de lumière douce et limite l'exposition vue par les pierres entre 0,75 et 1,6.", "");
  if (extremes.length) lines.push("**Résultat** :" + extremesLine(), "");
  lines.push("| Bijou | Combinaison | Éclairage | Pierres : moyenne (noir, blanc plat) | Lisible |", "| --- | --- | --- | --- | --- |");
  const byShot = new Map<string, typeof extremes>();
  for (const e of extremes) byShot.set(e.model + "|" + e.combo + "|" + e.env, [...(byShot.get(e.model + "|" + e.combo + "|" + e.env) ?? []), e]);
  for (const [k, list] of byShot) {
    const [model, combo, env] = k.split("|");
    lines.push(`| ${model} | ${combo} | ${env === "auto" ? "Automatique" : (HDRI[env!]?.name ?? env)} | ${list.map((e) => `${fr(e.mean)} (${Math.round(e.black * 100)} %, ${Math.round(e.white * 100)} %)`).join(" ; ")} | ${list.every((e) => e.ok) ? "oui" : "**non**"} |`);
  }
  lines.push("");
  if (unsafe.length) {
    lines.push("## Valeurs signalées par la mesure (pierres ou métal hors limites)", "");
    for (const u of unsafe) lines.push(`- ${u.key} = ${u.value} (${u.model}) : ${u.what}`);
    lines.push("");
  }
  lines.push("## Retirés, et pourquoi", "");
  if (!Object.keys(REMOVED).length) lines.push("Aucun réglage retiré.");
  for (const r of Object.values(REMOVED)) lines.push(`- **${r.name}** : ${r.why}`);
  lines.push("");
  fs.mkdirSync(path.dirname(DOC), { recursive: true });
  fs.writeFileSync(DOC, lines.join("\n"));
  console.log("→ " + path.relative(process.cwd(), DOC) + " (" + counts.total + " réglages)");
}

/** The help pictures of a control that has none any more (removed, or a help without pictures): deleted. */
function cleanHelp() {
  if (!fs.existsSync(OUT_HELP)) return;
  const keep = new Set(Object.entries(HELP).filter(([k, h]) => h.pair && !REMOVED[k]).flatMap(([k]) => [k + "-a.webp", k + "-b.webp"]));
  const gone = fs.readdirSync(OUT_HELP).filter((f) => !keep.has(f));
  for (const f of gone) fs.rmSync(path.join(OUT_HELP, f));
  if (gone.length) console.log("Images d'aide retirées : " + gone.join(", "));
  const missing = [...keep].filter((f) => !fs.existsSync(path.join(OUT_HELP, f)));
  if (missing.length) console.log("Images d'aide manquantes : " + missing.join(", "));
}

/* ---------- Static checks: every control has a help ---------- */

function consistency() {
  const files = ["src/pages/admin/editor3d/tabs.tsx", "src/pages/admin/editor3d/Editor3D.tsx"];
  const missing: string[] = [];
  for (const f of files) {
    const src = fs.readFileSync(f, "utf8");
    for (const line of src.split("\n")) {
      if (line.includes("<Section") || line.includes('help="')) continue;
      for (const m of line.matchAll(/\bdata="([a-z0-9-]+)"/g)) if (!helpOf(m[1]) && !line.includes("<Tile")) missing.push(m[1]!);
    }
  }
  const pairs = Object.entries(HELP).filter(([, h]) => h.pair).map(([k]) => k);
  const made = new Set(CASES.map((k) => k.key));
  const noCase = pairs.filter((k) => !made.has(k));
  if (missing.length) console.log("Réglages sans aide : " + [...new Set(missing)].join(", "));
  if (noCase.length) console.log("Aides avec images sans test : " + noCase.join(", "));
}

/* ---------- Run ---------- */

async function main() {
  consistency();
  if (PHASES.includes("doc") && PHASES.length === 1) return doc();
  await login();
  const ctxs: Ctx[] = [];
  for (const m of MODELS) {
    const row = await modelRow(m.id);
    const layers = row.settings.layers as Record<string, { role: string }>;
    const names = row.layers.map((l) => l.name);
    const roleOf = (n: string) => layers[n]?.role ?? row.layers.find((l) => l.name === n)?.guess;
    ctxs.push({ ...m, file: row.preview.files.full, settings: row.settings, stones: names.filter((n) => ["diamond", "stone"].includes(roleOf(n) ?? "")), metals: names.filter((n) => roleOf(n) === "metal"), big: "", masks: null, poses: {}, picks: null });
  }
  const before = JSON.stringify(await Promise.all(MODELS.map((m) => modelRow(m.id).then((r) => r.settings))));
  if (PHASES.includes("lab") || PHASES.includes("extremes")) {
    const browser = await chromium.launch({ args: ["--mute-audio", "--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
    const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
    page.on("pageerror", (e) => pageErrors.push(e.message.slice(0, 240)));
    page.on("console", (m) => m.type() === "error" && pageErrors.push(m.text().slice(0, 240)));
    if (PHASES.includes("lab")) await labPhase(page, ctxs);
    else for (const c of ctxs) c.masks = await masksOf(page, c);
    if (PHASES.includes("extremes")) await extremesPhase(page, ctxs);
    await browser.close();
  }
  if (PHASES.includes("ui")) {
    const zr = ctxs.find((c) => c.short === "ZR") ?? ctxs[0]!;
    if (!zr.big) zr.big = zr.stones.slice().sort((a, b) => b.length - a.length)[0]!;
    if (!zr.big || zr.big === "") zr.big = zr.stones[0]!;
    if (zr.short === "ZR") zr.big = zr.stones.find((s) => /8\.1x12/.test(s)) ?? zr.big;
    await uiPhase(zr);
  }
  save();
  // The models were never saved: checked again.
  const after = JSON.stringify(await Promise.all(MODELS.map((m) => modelRow(m.id).then((r) => r.settings))));
  if (after !== before) console.log("ATTENTION : les réglages d'un modèle de test ont changé pendant l'audit.");
  if (PHASES.includes("doc")) doc();
}

await main();
