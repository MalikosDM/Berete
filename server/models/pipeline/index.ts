/*
 * The 3D pipeline: a file of the jeweller (.3dm, .glb, .gltf, .obj, .stl, .fbx) becomes
 * two versions for the viewer, "full" (computers) and "light" (phones), plus the
 * list of its layers with a guessed role. The original is never changed. What the
 * file holds and the model does not show is reported (stats.skipped): a model with
 * volumes missing (stats.incomplete > 0) stays a draft, never shown on the site.
 * Like iJewel3D's import (26/11/2026): layers named as iJewel names them (Metal 01, Gem 01...) take that role; each
 * layer keeps its own colour; the file is checked (triangles, units, faces inside out, copies: stats.checks), and what
 * the admin should know is said in simple French (stats.notes).
 */
import fs from "node:fs";
import path from "node:path";
import type { DiamondParams } from "../../../src/data/scene3d.js";
import { apartParts, type Apart } from "./apart.js";
import { analyse, type StoneCount } from "./build.js";
import { missingVolumes, readModel, type IjewelReport, type Progress, type Skipped, type SourceKind, type Units } from "./read.js";
import { VERSIONS, writeVersion } from "./write.js";

export type { IjewelReport, Skipped, SourceKind, Units };

export type LayerRole = "metal" | "diamond" | "stone" | "enamel" | "hide";

/** A layer of the model, as the admin shows it. */
export type LayerInfo = {
  name: string;
  /** Separate meshes, and how many times they are drawn in all. */
  meshes: number;
  copies: number;
  triangles: number;
  /** Size of the box around the layer (mm). */
  size: [number, number, number];
  guess: LayerRole;
  /** The guess is uncertain: the jeweller should check it. */
  check: boolean;
  /** Its own colour in the file (#rrggbb): the Rhino layer's, or the base colour of its material (glTF, FBX). */
  color?: string;
  /** Stone settings given by an iJewel export (WEBGI_materials_diamond on its material). */
  diamond?: Partial<DiamondParams>;
};

/**
 * What the file was checked for at import, as iJewel does. Missing in the stats of models processed before 26/11/2026.
 * - triangles: of the file, every copy counted; tooMany: above 200 000, iJewel's limit (our versions are simplified
 *   anyway: `drawn` is what the full version draws); target and keep: the simplification to propose (200 000, the share
 *   of the triangles it keeps), null when not too many;
 * - units: what the file says (or what was taken), and whether a scale was applied to reach mm; `label` in French;
 * - flipped: closed pieces whose faces looked inward, turned outward automatically (each copy counted);
 * - instanced: identical stones drawn as copies of one mesh; copies: all copies of any mesh.
 */
export type ImportChecks = {
  triangles: number;
  tooMany: boolean;
  target: number | null;
  keep: number | null;
  drawn: number;
  units: Units & { label: string };
  flipped: number;
  instanced: number;
  copies: number;
};

export type ModelStats = {
  kind: SourceKind;
  sourceTriangles: number;
  pieces: number;
  unaligned: number;
  /** Size of the jewel (mm). */
  size: [number, number, number];
  stones: StoneCount[];
  /** An STL (or an OBJ without layers) without separable stones: they are fused into the metal or missing. */
  stonesMissing: boolean;
  /** What the file holds and the model does not show (a .3dm). */
  skipped?: Skipped;
  /** Volumes missing from the model (saved without render mesh, and that could not be meshed here): more than 0, the model is incomplete. */
  incomplete: number;
  /** Volumes of a .3dm saved without render mesh, meshed here from their NURBS. */
  tessellated?: number;
  /** What an iJewel export said of its stones (their settings are put on their layers). */
  ijewel?: IjewelReport;
  /**
   * Pieces kept away from the main piece in the file (./apart.ts), left where they are: their groups, and the box of the
   * main piece (also in the GLB: extras `mainBox` of its scene, in metres). Missing when the model is all one piece.
   */
  apart?: Apart;
  checks?: ImportChecks;
  /** What the admin should know of this file, in simple French. */
  notes?: string[];
  versions: Record<keyof typeof VERSIONS, { bytes: number; triangles: number; drawn: number }>;
  seconds: number;
};

export type PipelineResult = { stats: ModelStats; layers: LayerInfo[] };

/** iJewel3D's limit of triangles. */
const IJEWEL_TRIANGLES = 200_000;

/** The layer names iJewel3D reads: these say what the layer is, whatever its shape (spaces or "_" tolerated, any case). */
function ijewelRole(name: string): LayerRole | null {
  const n = name.trim().toLowerCase().replace(/[\s_]+/g, " ");
  if (/^m[ée]tal( ?\d{1,2})?$/.test(n) || n === "head") return "metal";
  if (/^(gems?|diamonds?)( ?\d{1,2})?$/.test(n)) return "diamond";
  return null;
}

const RHINO_UNITS: Record<string, string> = { Millimeters: "millimètres", Centimeters: "centimètres", Meters: "mètres", Inches: "pouces", Feet: "pieds", Microns: "microns", None: "sans unité" };
const SHORT_UNITS: Record<string, string> = { mm: "millimètres", cm: "centimètres", m: "mètres", inch: "pouces" };

/** The unit of the file, said in French. */
function unitsLabel(kind: SourceKind, units: Units): string {
  const name = RHINO_UNITS[units.file] ?? SHORT_UNITS[units.file] ?? units.file;
  const where = kind === "3dm" ? " (Rhino)" : kind === "fbx" ? " (FBX)" : "";
  if (units.from === "assumed") return "Millimètres (le format ne donne pas l'unité)";
  if (units.from === "size") return (units.mmPerUnit === 1000 ? "Mètres" : "Millimètres") + ", déduits de la taille du bijou" + (units.applied ? ", convertis en millimètres" : "");
  const label = name.charAt(0).toUpperCase() + name.slice(1) + where;
  return units.applied ? label + ", convertis en millimètres" : label;
}

const plural = (n: number, one: string, many: string) => n.toLocaleString("fr-FR") + " " + (n > 1 ? many : one);

/** The drawings of a .3dm by kind, in French ("49 courbes, 7 cotes ou textes"), or "" when none. */
const DRAWING_WORDS: Record<string, [string, string]> = {
  curve: ["courbe", "courbes"],
  annotation: ["cote ou texte", "cotes ou textes"],
  textdot: ["étiquette", "étiquettes"],
  point: ["point", "points"],
  pointset: ["nuage de points", "nuages de points"],
  hatch: ["hachure", "hachures"],
  detail: ["vue de mise en page", "vues de mise en page"],
  clipplane: ["plan de coupe", "plans de coupe"],
};
function drawingsText(skipped: Skipped | undefined): string {
  if (!skipped || skipped.drawings <= 0) return "";
  const kinds = Object.entries(skipped.drawingKinds ?? {}).filter(([, n]) => n > 0);
  const named = kinds.filter(([k]) => DRAWING_WORDS[k]);
  const others = skipped.drawings - named.reduce((s, [, n]) => s + n, 0);
  const parts = named.sort((a, b) => b[1] - a[1]).map(([k, n]) => plural(n, DRAWING_WORDS[k]![0], DRAWING_WORDS[k]![1]));
  if (others > 0) parts.push(plural(others, named.length ? "autre dessin" : "dessin (courbe, cote, texte)", named.length ? "autres dessins" : "dessins (courbes, cotes, textes)"));
  return parts.length > 1 ? parts.slice(0, -1).join(", ") + " et " + parts[parts.length - 1] : parts[0]!;
}

/** Layer names that say what they are, in the languages of jewellers' files. */
const STONE_NAMES = /diam|gem|stone|pierre|brill|zircon|ruby|rubis|sapph|saphir|emerald|émeraude|钻|石/i;
const METAL_NAMES = /metal|métal|gold|\bor\b|platin|silver|argent|金|银|铂/i;

const STEPS: Record<string, [number, number]> = {
  read: [0, 0.3],
  pieces: [0.3, 0.5],
  full: [0.5, 0.78],
  light: [0.78, 1],
};

export async function runPipeline(input: string, kind: SourceKind, outDir: string, onProgress: (percent: number, step: string) => void): Promise<PipelineResult> {
  const started = Date.now();
  fs.mkdirSync(outDir, { recursive: true });
  const step = (name: string): Progress => (fraction) => {
    const [a, b] = STEPS[name]!;
    onProgress(Math.round(100 * (a + (b - a) * Math.min(1, Math.max(0, fraction)))), name);
  };
  const source = await readModel(input, kind, step("read"));
  const analysis = analyse(source, step("pieces"));
  // Pieces away from the main one stay where they are; the viewer is given the box of the main piece to frame it.
  const apart = apartParts(analysis.parts);
  const extras = apart ? { mainBox: { min: apart.main.min.map((v) => v / 1000), max: apart.main.max.map((v) => v / 1000) }, apartShare: apart.share } : undefined;
  const full = await writeVersion(analysis, VERSIONS.full, path.join(outDir, "full.glb"), step("full"), extras);
  const light = await writeVersion(analysis, VERSIONS.light, path.join(outDir, "light.glb"), step("light"), extras);

  // The layers, with a guessed role.
  const byName = new Map<string, LayerInfo & { lo: number[]; hi: number[]; stoneCopies: number }>();
  for (const part of analysis.parts) {
    let info = byName.get(part.material);
    if (!info) {
      info = { name: part.material, meshes: 0, copies: 0, triangles: 0, size: [0, 0, 0], guess: "metal", check: false, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity], stoneCopies: 0 };
      byName.set(part.material, info);
    }
    const copies = part.instances?.length ?? 1;
    info.meshes++;
    info.copies += copies;
    info.triangles += (part.soup.indices.length / 3) * copies;
    if (part.stone) info.stoneCopies += copies;
    const p = part.soup.positions;
    const places = part.instances?.map((i) => i.t) ?? [[0, 0, 0]];
    // The box of the layer: its vertices (drawn once) or the centres of its copies.
    if (!part.instances) {
      for (let v = 0; v < p.length; v += 3) {
        for (let k = 0; k < 3; k++) {
          info.lo[k] = Math.min(info.lo[k]!, p[v + k]!);
          info.hi[k] = Math.max(info.hi[k]!, p[v + k]!);
        }
      }
    } else {
      for (const t of places) {
        for (let k = 0; k < 3; k++) {
          info.lo[k] = Math.min(info.lo[k]!, t[k]!);
          info.hi[k] = Math.max(info.hi[k]!, t[k]!);
        }
      }
    }
  }
  const total = [...byName.values()].reduce((s, l) => s + l.triangles, 0);
  const jewel = Math.max(...analysis.size, 1);
  const fromFile = new Map(source.layers.map((l) => [l.name, l]));
  const layers: LayerInfo[] = [...byName.values()].map(({ lo, hi, stoneCopies, ...info }) => {
    const size = [0, 1, 2].map((k) => (hi[k]! > lo[k]! ? hi[k]! - lo[k]! : 0)) as [number, number, number];
    const own = fromFile.get(info.name);
    const extra = { ...(own?.color ? { color: own.color } : {}), ...(own?.diamond ? { diamond: own.diamond } : {}) };
    let guess: LayerRole = "metal";
    let check = false;
    const named = ijewelRole(info.name);
    // Named as iJewel names it, or given stone settings by an iJewel export: no doubt.
    if (named) guess = named;
    else if (own?.diamond) guess = "diamond";
    else if (info.name.startsWith("stone_")) {
      guess = "diamond";
      // An unusual cut, or smaller than 0.6 mm: maybe a bead of metal.
      check = !analysis.stones.find((s) => s.material === info.name)?.known;
    }
    else if (info.name === "metal") guess = "metal";
    // A layer named after its material (Diamonds, Gems, Gold 18K, 钻石, 金...).
    else if (STONE_NAMES.test(info.name)) guess = "diamond";
    else if (METAL_NAMES.test(info.name)) guess = "metal";
    // Many small convex copies: diamonds (to check when the layer also holds other pieces).
    else if (stoneCopies >= 50 || (stoneCopies > 0 && stoneCopies === info.copies)) {
      guess = "diamond";
      check = stoneCopies < info.copies;
    }
    // A large share of the jewel: metal.
    else if (info.triangles >= 0.1 * total || Math.max(...size) >= 0.3 * jewel) guess = "metal";
    // A few small objects: to check.
    else check = true;
    return { ...info, size, guess, check, ...extra };
  });

  const tooMany = source.triangles > IJEWEL_TRIANGLES;
  const checks: ImportChecks = {
    triangles: source.triangles,
    tooMany,
    target: tooMany ? IJEWEL_TRIANGLES : null,
    keep: tooMany ? Math.round((IJEWEL_TRIANGLES / source.triangles) * 1000) / 1000 : null,
    drawn: full.drawn,
    units: { ...source.units, label: unitsLabel(kind, source.units) },
    flipped: analysis.flipped,
    instanced: analysis.instanced,
    copies: analysis.copies,
  };
  const incomplete = missingVolumes(source.skipped);
  const stats: ModelStats = {
    kind,
    sourceTriangles: source.triangles,
    pieces: analysis.pieces,
    unaligned: analysis.unaligned,
    size: analysis.size,
    stones: analysis.stones,
    stonesMissing: !source.layered && analysis.stones.length === 0,
    ...(source.skipped ? { skipped: source.skipped } : {}),
    incomplete,
    ...(source.tessellated ? { tessellated: source.tessellated } : {}),
    ...(source.ijewel ? { ijewel: source.ijewel } : {}),
    ...(apart ? { apart } : {}),
    checks,
    notes: notesOf(source.skipped, incomplete, source.tessellated ?? 0, checks, source.ijewel, apart),
    versions: { full, light },
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
  return { stats, layers };
}

/** What the admin should know of the file, in simple French (no jargon). */
function notesOf(skipped: Skipped | undefined, incomplete: number, tessellated: number, checks: ImportChecks, ijewel: IjewelReport | undefined, apart: Apart | null): string[] {
  const notes: string[] = [];
  if (tessellated > 0) notes.push(plural(tessellated, "volume était enregistré", "volumes étaient enregistrés") + " sans maillage de rendu : ils ont été maillés ici, à partir de leurs surfaces.");
  if (incomplete > 0) {
    const where = Object.entries(skipped?.noMesh.byLayer ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, n]) => "« " + name + " » : " + n.toLocaleString("fr-FR"))
      .join(", ");
    notes.push(
      plural(incomplete, "volume n'a pas pu être maillé", "volumes n'ont pas pu être maillés") + (where ? " (calques " + where + ")" : "") + " : le modèle reste un brouillon. Demandez au dessinateur d'ouvrir le fichier dans Rhino, de passer en vue Ombrée, puis d'enregistrer sans cocher « Enregistrer petit » ; ou d'exporter en GLB ou en OBJ.",
    );
  }
  if (skipped?.unreadable) notes.push(plural(skipped.unreadable, "objet du fichier n'a pas pu être lu : il a été laissé de côté", "objets du fichier n'ont pas pu être lus : ils ont été laissés de côté") + ".");
  if (skipped && skipped.stray.count > 0) notes.push(plural(skipped.stray.count, "image de référence placée", "images de référence placées") + " dans le fichier " + (skipped.stray.count > 1 ? "ne font" : "ne fait") + " pas partie du bijou : laissée" + (skipped.stray.count > 1 ? "s" : "") + " de côté.");
  if (skipped && skipped.hidden > 0) notes.push(plural(skipped.hidden, "objet caché", "objets cachés") + " dans Rhino " + (skipped.hidden > 1 ? "ne sont" : "n'est") + " pas montré" + (skipped.hidden > 1 ? "s" : "") + ", comme dans Rhino.");
  if (skipped?.offLayers) notes.push(plural(skipped.offLayers, "objet est sur un calque éteint", "objets sont sur des calques éteints") + " dans Rhino : " + (skipped.offLayers > 1 ? "ils ne sont" : "il n'est") + " pas montré" + (skipped.offLayers > 1 ? "s" : "") + ", comme dans Rhino.");
  if (skipped?.layout) notes.push(plural(skipped.layout, "objet est dans une mise en page", "objets sont dans une mise en page") + " de Rhino, pas dans le modèle : laissé" + (skipped.layout > 1 ? "s" : "") + " de côté.");
  const drawn = drawingsText(skipped);
  if (drawn) notes.push("Le fichier contient aussi " + drawn + " : " + (skipped!.drawings > 1 ? "ce ne sont pas des volumes" : "ce n'est pas un volume") + ", rien n'en est montré (comme dans le rendu de Rhino).");
  if (skipped?.empty) notes.push(plural(skipped.empty, "surface n'a", "surfaces n'ont") + " aucune épaisseur ni aire (réduite" + (skipped.empty > 1 ? "s" : "") + " à une courbe) : rien à montrer.");
  if (apart && apart.groups.length > 0) {
    const pieces = apart.groups.reduce((n, g) => n + g.pieces, 0);
    const layers = [...new Set(apart.groups.flatMap((g) => g.layers))];
    const gap = apart.groups[0]!.gap;
    const far = gap >= 10 ? Math.round(gap).toLocaleString("fr-FR") : gap.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
    notes.push(plural(pieces, "pièce est posée", "pièces sont posées") + " à part dans le fichier (" + (layers.length > 1 ? "calques " : "calque ") + layers.slice(0, 4).map((l) => "« " + l + " »").join(", ") + "), à " + far + " mm du bijou au plus près : " + (pieces > 1 ? "elles sont gardées là où le fichier les met" : "elle est gardée là où le fichier la met") + ", comme dans Rhino.");
  }
  if (checks.flipped > 0) notes.push(plural(checks.flipped, "pièce avait ses faces à l'envers", "pièces avaient leurs faces à l'envers") + " : remise" + (checks.flipped > 1 ? "s" : "") + " à l'endroit.");
  if (checks.tooMany) notes.push("Le fichier compte " + checks.triangles.toLocaleString("fr-FR") + " triangles (iJewel en accepte " + IJEWEL_TRIANGLES.toLocaleString("fr-FR") + ") : nos versions sont allégées, " + checks.drawn.toLocaleString("fr-FR") + " triangles affichés sur ordinateur.");
  if (checks.units.applied || checks.units.from === "size") notes.push("Unité du fichier : " + checks.units.label.charAt(0).toLowerCase() + checks.units.label.slice(1) + ".");
  if (checks.instanced > 0) notes.push(plural(checks.instanced, "pierre identique est dessinée", "pierres identiques sont dessinées") + " en copies d'une même forme (plus léger).");
  if (ijewel && ijewel.materials.length > 0) notes.push("Réglages des pierres repris de l'export iJewel pour " + plural(ijewel.materials.length, "matière", "matières") + " : " + ijewel.materials.map((m) => "« " + m.name + " »").join(", ") + ".");
  return notes;
}
