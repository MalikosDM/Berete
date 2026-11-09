/*
 * The 3D pipeline: a file of the jeweller (.3dm, .glb, .stl) becomes two
 * versions for the viewer, "full" (computers) and "light" (phones), plus the
 * list of its layers with a guessed role. The original is never changed.
 */
import fs from "node:fs";
import path from "node:path";
import { analyse, type StoneCount } from "./build.js";
import { readModel, type Progress } from "./read.js";
import { VERSIONS, writeVersion } from "./write.js";

export type SourceKind = "stl" | "glb" | "3dm";

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
};

export type ModelStats = {
  kind: SourceKind;
  sourceTriangles: number;
  pieces: number;
  unaligned: number;
  /** Size of the jewel (mm). */
  size: [number, number, number];
  stones: StoneCount[];
  /** An STL without separable stones: they are fused into the metal or missing. */
  stonesMissing: boolean;
  versions: Record<keyof typeof VERSIONS, { bytes: number; triangles: number; drawn: number }>;
  seconds: number;
};

export type PipelineResult = { stats: ModelStats; layers: LayerInfo[] };

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
  const full = await writeVersion(analysis, VERSIONS.full, path.join(outDir, "full.glb"), step("full"));
  const light = await writeVersion(analysis, VERSIONS.light, path.join(outDir, "light.glb"), step("light"));

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
  const layers: LayerInfo[] = [...byName.values()].map(({ lo, hi, stoneCopies, ...info }) => {
    const size = [0, 1, 2].map((k) => (hi[k]! > lo[k]! ? hi[k]! - lo[k]! : 0)) as [number, number, number];
    let guess: LayerRole = "metal";
    let check = false;
    if (info.name.startsWith("stone_")) {
      guess = "diamond";
      // An unusual cut, or smaller than 0.6 mm: maybe a bead of metal.
      check = !analysis.stones.find((s) => s.material === info.name)?.known;
    }
    else if (info.name === "metal") guess = "metal";
    // A layer named after its material (Diamonds, Gems, Gold 18K, 钻石, 金...).
    else if (STONE_NAMES.test(info.name)) guess = "diamond";
    else if (METAL_NAMES.test(info.name)) guess = "metal";
    // Many small convex copies: diamonds.
    else if (stoneCopies >= 50 || (stoneCopies > 0 && stoneCopies === info.copies)) guess = "diamond";
    // A large share of the jewel: metal.
    else if (info.triangles >= 0.1 * total || Math.max(...size) >= 0.3 * jewel) guess = "metal";
    // A few small objects: to check.
    else check = true;
    return { ...info, size, guess, check };
  });

  const stats: ModelStats = {
    kind,
    sourceTriangles: source.triangles,
    pieces: analysis.pieces,
    unaligned: analysis.unaligned,
    size: analysis.size,
    stones: analysis.stones,
    stonesMissing: kind === "stl" && analysis.stones.length === 0,
    versions: { full, light },
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
  return { stats, layers };
}
