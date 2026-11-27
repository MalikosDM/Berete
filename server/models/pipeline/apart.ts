/*
 * Parts of a model away from the main piece (27/11/2026). A jeweller's file may keep pieces beside the jewel: Yoni's
 * OKA pendant (Noah Okafor) has three small pieces 23 cm from it, the second octagon « N » the letters of its motif
 * drawn again 2 cm to its left. They are part of the file and Rhino shows them: they stay where the file puts them
 * (never moved, never left out). The admin is told (a note), and the box of the main piece goes into the GLB (the
 * extras of its scene, `mainBox`, with `apartShare`, the share of the triangles outside it), so that the viewer can
 * frame the jewel itself rather than the jewel and its far pieces.
 * Pieces: every copy of a repeated mesh, every separate piece of the other meshes; two pieces closer than GAP belong
 * together; the main piece is the group with the most triangles. Lengths in mm, Y up (as the GLB).
 */
import type { Part } from "./build.js";
import { connectedPieces } from "./geometry.js";

/** Pieces closer than this (mm) belong together. */
export const GAP = 1;

type V3 = [number, number, number];

export type ApartGroup = {
  /** Separate pieces (copies counted), and the layers they are on. */
  pieces: number;
  layers: string[];
  min: V3;
  max: V3;
  /** Distance to the main piece (mm). */
  gap: number;
  /** Share of the drawn triangles (0–1). */
  share: number;
};

export type Apart = {
  /** Box of the main piece (mm). */
  main: { min: V3; max: V3 };
  /** The groups away from it, nearest first. */
  groups: ApartGroup[];
  /** Share of the drawn triangles outside the main piece (0–1). */
  share: number;
};

type Piece = { min: V3; max: V3; triangles: number; layer: string };

/** A point turned by a copy's rotation (quaternion x, y, z, w), scaled, then moved. */
function placed(p: V3, inst: NonNullable<Part["instances"]>[number]): V3 {
  const [x, y, z, w] = inst.r;
  const v: V3 = [p[0] * inst.s[0], p[1] * inst.s[1], p[2] * inst.s[2]];
  // v + 2w(q × v) + 2 q × (q × v)
  const c1: V3 = [y * v[2] - z * v[1], z * v[0] - x * v[2], x * v[1] - y * v[0]];
  const c2: V3 = [y * c1[2] - z * c1[1], z * c1[0] - x * c1[2], x * c1[1] - y * c1[0]];
  return [v[0] + 2 * (w * c1[0] + c2[0]) + inst.t[0], v[1] + 2 * (w * c1[1] + c2[1]) + inst.t[1], v[2] + 2 * (w * c1[2] + c2[2]) + inst.t[2]];
}

function piecesOf(parts: readonly Part[]): Piece[] {
  const out: Piece[] = [];
  for (const part of parts) {
    const p = part.soup.positions;
    const idx = part.soup.indices;
    if (part.instances) {
      const lo: V3 = [Infinity, Infinity, Infinity];
      const hi: V3 = [-Infinity, -Infinity, -Infinity];
      for (let v = 0; v < p.length; v += 3) {
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k]!, p[v + k]!);
          hi[k] = Math.max(hi[k]!, p[v + k]!);
        }
      }
      if (!(lo[0] <= hi[0])) continue;
      for (const inst of part.instances) {
        const min: V3 = [Infinity, Infinity, Infinity];
        const max: V3 = [-Infinity, -Infinity, -Infinity];
        for (const x of [lo[0], hi[0]]) for (const y of [lo[1], hi[1]]) for (const z of [lo[2], hi[2]]) {
          const q = placed([x, y, z], inst);
          for (let k = 0; k < 3; k++) {
            min[k] = Math.min(min[k]!, q[k]!);
            max[k] = Math.max(max[k]!, q[k]!);
          }
        }
        out.push({ min, max, triangles: idx.length / 3, layer: part.material });
      }
      continue;
    }
    const found = connectedPieces(part.soup);
    for (let i = 0; i < found.count; i++) {
      const min: V3 = [Infinity, Infinity, Infinity];
      const max: V3 = [-Infinity, -Infinity, -Infinity];
      for (let k = found.offsets[i]!; k < found.offsets[i + 1]!; k++) {
        const t = found.list[k]!;
        for (let j = 0; j < 3; j++) {
          const v = idx[t * 3 + j]! * 3;
          for (let a = 0; a < 3; a++) {
            const c = p[v + a]!;
            if (c < min[a]!) min[a] = c;
            if (c > max[a]!) max[a] = c;
          }
        }
      }
      out.push({ min, max, triangles: found.offsets[i + 1]! - found.offsets[i]!, layer: part.material });
    }
  }
  return out;
}

const gapBetween = (a: { min: V3; max: V3 }, b: { min: V3; max: V3 }) => Math.hypot(...[0, 1, 2].map((k) => Math.max(0, a.min[k]! - b.max[k]!, b.min[k]! - a.max[k]!)));

/** The groups of pieces away from the main piece, or null when the model is all one piece. */
export function apartParts(parts: readonly Part[]): Apart | null {
  const pieces = piecesOf(parts);
  if (pieces.length < 2) return null;
  // Pieces whose boxes come within GAP of each other, joined: sorted along x, each piece is compared with the next ones
  // until they start beyond its end (no allocation: tens of thousands of stones of an STL stay quick).
  const parent = Int32Array.from({ length: pieces.length }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  const order = pieces.map((_, i) => i).sort((a, b) => pieces[a]!.min[0] - pieces[b]!.min[0]);
  for (let s = 0; s < order.length; s++) {
    const a = pieces[order[s]!]!;
    for (let t = s + 1; t < order.length; t++) {
      const b = pieces[order[t]!]!;
      if (b.min[0] > a.max[0] + GAP) break;
      if (a.min[1] - GAP <= b.max[1] && b.min[1] - GAP <= a.max[1] && a.min[2] - GAP <= b.max[2] && b.min[2] - GAP <= a.max[2]) {
        const ra = find(order[s]!);
        const rb = find(order[t]!);
        if (ra !== rb) parent[ra] = rb;
      }
    }
  }
  type Group = { min: V3; max: V3; triangles: number; pieces: number; layers: Set<string> };
  const groups = new Map<number, Group>();
  let total = 0;
  for (const [i, piece] of pieces.entries()) {
    total += piece.triangles;
    const r = find(i);
    const g = groups.get(r);
    if (!g) {
      groups.set(r, { min: [...piece.min], max: [...piece.max], triangles: piece.triangles, pieces: 1, layers: new Set([piece.layer]) });
      continue;
    }
    for (let k = 0; k < 3; k++) {
      g.min[k] = Math.min(g.min[k]!, piece.min[k]!);
      g.max[k] = Math.max(g.max[k]!, piece.max[k]!);
    }
    g.triangles += piece.triangles;
    g.pieces++;
    g.layers.add(piece.layer);
  }
  if (groups.size < 2) return null;
  const list = [...groups.values()].sort((a, b) => b.triangles - a.triangles);
  const main = list[0]!;
  const away = list
    .slice(1)
    .map((g) => ({ pieces: g.pieces, layers: [...g.layers].sort(), min: g.min, max: g.max, gap: gapBetween(g, main), share: g.triangles / total }))
    .sort((a, b) => a.gap - b.gap);
  return { main: { min: main.min, max: main.max }, groups: away, share: 1 - main.triangles / total };
}
