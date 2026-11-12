/*
 * From the triangles of a file to the meshes of the viewer:
 * - each layer is cut in separate pieces; pieces of the same shape (same
 *   number of triangles and vertices, same sizes within 1 %) are copies: each
 *   is placed on the first by alignment of its vertices (Kabsch), and all are
 *   drawn as one repeated mesh (EXT_mesh_gpu_instancing);
 * - in a file without layers (STL), a small, (almost) convex piece found at
 *   least 3 times, or with the 174 triangles of Rhino's round brilliant or the
 *   40 of its fancy cuts, is a stone; so is any piece with the shape of a cut
 *   stone (a table on top, a point or an edge below, flat facets: `looksCut`),
 *   however many triangles the jeweller's export gave it and even alone (the
 *   centre stone of a ring); everything else is metal;
 * - in such a file, stones fused into the metal (only their crown left, glued
 *   to it: `fusedStones`) are taken out of it and made whole again;
 * - the other pieces of a layer are joined, in a few blocks.
 * Lengths in mm.
 */
import { align, alignFree, boundsOf, centered, connectedPieces, extract, isConvex, looksCut, merge, mirrored, renumbered, sameShape, shapeOf, tableShare, type Placement, type Shape, type Soup } from "./geometry.js";
import { FUSED_SEARCH_FROM, fusedStones, type FusedStone } from "./fused.js";
import type { Progress, Source } from "./read.js";

export type Instance = { t: [number, number, number]; r: [number, number, number, number]; s: [number, number, number] };

export type Part = {
  /** Name of the material: the layer of the file, or "metal", "stone_round_0.8mm"... */
  material: string;
  soup: Soup;
  /** Null: drawn once, where it is. */
  instances: Instance[] | null;
  /** A cut stone: flat facets, never simplified. */
  stone: boolean;
  /** Stones joined in one mesh: for each vertex, the outward normal of its stone's table (the light is turned for each). */
  ups?: Float32Array;
};

export type StoneCount = {
  material: string;
  count: number;
  triangles: number;
  size: string;
  /** Rhino's round brilliant (174 triangles) or fancy cut (40): surely a stone. Otherwise it should be checked. */
  known: boolean;
  /** Fused into the metal in the file, made whole again. */
  fused?: boolean;
};

export type Analysis = {
  parts: Part[];
  stones: StoneCount[];
  /** Separate pieces found in the file. */
  pieces: number;
  /** Copies whose alignment failed, kept as they are. */
  unaligned: number;
  /** Size of the jewel (mm). */
  size: [number, number, number];
};

const KNOWN_STONES = new Set([174, 40]);
const STONE_MAX_TRIANGLES = 2000;
/** Unique pieces are joined in blocks of about this many triangles. */
const BLOCK_TRIANGLES = 400_000;

type Piece = { soup: Soup; shape: Shape };

function fmt(mm: number): string {
  return mm >= 10 ? mm.toFixed(0) : mm.toFixed(1);
}

function stoneName(triangles: number, shape: Shape): string {
  const [, b, c] = shape.extents;
  if (triangles === 174 || (c > 0 && b / c >= 0.97)) return "stone_round_" + fmt((b + c) / 2) + "mm";
  return "stone_fancy_" + fmt(b) + "x" + fmt(c) + "mm";
}

/** Fused stones by shape and size, in steps of half a millimetre (hundreds of them, in few layers). */
function fusedName(stone: FusedStone): string {
  const size = Math.max(0.5, Math.round(stone.width * 2) / 2);
  return (stone.round ? "stone_round_" : "stone_fancy_") + fmt(size) + "mm";
}

/** Fused stones drawn together in one mesh. */
const FUSED_PER_MESH = 4;

/** Stones in groups of `size`, each of neighbours (in the order of a Z-curve through their centres). */
function neighbours(stones: FusedStone[], size: number): FusedStone[][] {
  const centres = stones.map((s) => {
    const b = boundsOf(s.soup.positions);
    return [0, 1, 2].map((k) => (b.min[k]! + b.max[k]!) / 2);
  });
  const lo = [0, 1, 2].map((k) => Math.min(...centres.map((c) => c[k]!)));
  const hi = [0, 1, 2].map((k) => Math.max(...centres.map((c) => c[k]!)));
  const code = (c: number[]) => {
    const q = [0, 1, 2].map((k) => Math.min(1023, Math.floor(((c[k]! - lo[k]!) / Math.max(1e-9, hi[k]! - lo[k]!)) * 1024)));
    let z = 0;
    for (let bit = 9; bit >= 0; bit--) for (let k = 0; k < 3; k++) z = z * 2 + ((q[k]! >> bit) & 1);
    return z;
  };
  const order = stones.map((s, i) => ({ s, z: code(centres[i]!) })).sort((a, b) => a.z - b.z);
  const out: FusedStone[][] = [];
  for (let i = 0; i < order.length; i += size) out.push(order.slice(i, i + size).map((o) => o.s));
  return out;
}

/** For each vertex of the joined stones, its stone's table direction. */
function upsOf(stones: FusedStone[]): Float32Array {
  let n = 0;
  for (const s of stones) n += s.soup.positions.length;
  const ups = new Float32Array(n);
  let o = 0;
  for (const s of stones) {
    for (let v = 0; v < s.soup.positions.length; v += 3) ups.set(s.up, o + v);
    o += s.soup.positions.length;
  }
  return ups;
}

const IDENTITY: [number, number, number, number] = [0, 0, 0, 1];

/** Translation, rotation and scale of a 4×4 matrix (column-major). */
function decompose(m: Float32Array): Instance {
  let sx = Math.hypot(m[0]!, m[1]!, m[2]!);
  const sy = Math.hypot(m[4]!, m[5]!, m[6]!);
  const sz = Math.hypot(m[8]!, m[9]!, m[10]!);
  const det = m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) - m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) + m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);
  if (det < 0) sx = -sx;
  const r00 = m[0]! / sx;
  const r10 = m[1]! / sx;
  const r20 = m[2]! / sx;
  const r01 = m[4]! / sy;
  const r11 = m[5]! / sy;
  const r21 = m[6]! / sy;
  const r02 = m[8]! / sz;
  const r12 = m[9]! / sz;
  const r22 = m[10]! / sz;
  const trace = r00 + r11 + r22;
  let x: number;
  let y: number;
  let z: number;
  let w: number;
  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1);
    w = 0.25 / s;
    x = (r21 - r12) * s;
    y = (r02 - r20) * s;
    z = (r10 - r01) * s;
  } else if (r00 > r11 && r00 > r22) {
    const s = 2 * Math.sqrt(1 + r00 - r11 - r22);
    w = (r21 - r12) / s;
    x = 0.25 * s;
    y = (r01 + r10) / s;
    z = (r02 + r20) / s;
  } else if (r11 > r22) {
    const s = 2 * Math.sqrt(1 + r11 - r00 - r22);
    w = (r02 - r20) / s;
    x = (r01 + r10) / s;
    y = 0.25 * s;
    z = (r12 + r21) / s;
  } else {
    const s = 2 * Math.sqrt(1 + r22 - r00 - r11);
    w = (r10 - r01) / s;
    x = (r02 + r20) / s;
    y = (r12 + r21) / s;
    z = 0.25 * s;
  }
  const len = Math.hypot(x, y, z, w) || 1;
  return { t: [m[12]!, m[13]!, m[14]!], r: [x / len, y / len, z / len, w / len], s: [sx, sy, sz] };
}

/** Determinant of the rotation-and-scale part of a 4×4 matrix (column-major): negative for a mirror image. */
function det3(m: Float32Array): number {
  return m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) - m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) + m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);
}

/** The matrix × a mirror across x: placed on the mirrored mesh (`mirrored`, x negated), it puts the copy back where it was. */
function timesMirror(m: Float32Array): Float32Array {
  const out = m.slice();
  out[0] = -m[0]!;
  out[1] = -m[1]!;
  out[2] = -m[2]!;
  return out;
}

/** Joins pieces drawn once into blocks, neighbours together (sorted along the longest side of the jewel). */
function blocks(pieces: Piece[], axis: 0 | 1 | 2): Soup[] {
  const sorted = [...pieces].sort((a, b) => a.shape.center[axis] - b.shape.center[axis]);
  const out: Soup[] = [];
  let current: Soup[] = [];
  let count = 0;
  for (const piece of sorted) {
    current.push(piece.soup);
    count += piece.soup.indices.length / 3;
    if (count >= BLOCK_TRIANGLES) {
      out.push(merge(current));
      current = [];
      count = 0;
    }
  }
  if (current.length > 0) out.push(merge(current));
  return out;
}

export function analyse(source: Source, progress: Progress): Analysis {
  const parts: Part[] = [];
  const stoneCounts = new Map<string, StoneCount>();
  let pieceCount = 0;
  let unaligned = 0;

  // The longest side of the jewel, to keep neighbouring pieces in the same block.
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const layer of source.layers) {
    for (const soup of layer.soups) {
      const b = boundsOf(soup.positions);
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k]!, b.min[k]!);
        hi[k] = Math.max(hi[k]!, b.max[k]!);
      }
    }
    for (const rep of layer.repeated) {
      for (const m of rep.matrices) {
        for (let k = 0; k < 3; k++) {
          lo[k] = Math.min(lo[k]!, m[12 + k]!);
          hi[k] = Math.max(hi[k]!, m[12 + k]!);
        }
      }
    }
  }
  const size: [number, number, number] = [hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!];
  const axis = (size[0] >= size[1] && size[0] >= size[2] ? 0 : size[1] >= size[2] ? 1 : 2) as 0 | 1 | 2;

  const totalLayers = source.layers.length;
  for (const [layerIndex, layer] of source.layers.entries()) {
    const report = (f: number) => progress((layerIndex + f) / totalLayers, "pieces");

    // Meshes already repeated in the file (glTF nodes, Rhino blocks).
    for (const rep of layer.repeated) {
      const triangles = rep.soup.indices.length / 3;
      const shape = shapeOf(rep.soup.positions);
      const stone = triangles < STONE_MAX_TRIANGLES && rep.matrices.length >= 3 && isConvex({ positions: centered(rep.soup.positions, shape.center), indices: rep.soup.indices }, shape.extents[2]);
      // Copies seen in a mirror (a negative scale) get a mirrored mesh of their own: the viewer draws all the copies of
      // a mesh with the same side of their faces outward, and they would show their inside (a missing stone).
      const straight = rep.matrices.filter((m) => det3(m) >= 0);
      const mirror = rep.matrices.filter((m) => det3(m) < 0).map(timesMirror);
      if (straight.length > 0) parts.push({ material: layer.name, soup: rep.soup, instances: straight.map(decompose), stone });
      if (mirror.length > 0) parts.push({ material: layer.name, soup: mirrored(rep.soup), instances: mirror.map(decompose), stone });
      pieceCount += rep.matrices.length;
    }
    if (layer.soups.length === 0) continue;

    // Separate pieces of the rest of the layer.
    const joined = layer.soups.length === 1 ? layer.soups[0]! : merge(layer.soups);
    const found = connectedPieces(joined);
    pieceCount += found.count;
    const scratch = new Int32Array(joined.positions.length / 3).fill(-1);
    const buckets = new Map<string, Piece[][]>();
    for (let i = 0; i < found.count; i++) {
      const soup = extract(joined, found.list, found.offsets[i]!, found.offsets[i + 1]!, scratch);
      const piece = { soup, shape: shapeOf(soup.positions) };
      const key = soup.indices.length + ":" + soup.positions.length;
      let clusters = buckets.get(key);
      if (!clusters) {
        clusters = [];
        buckets.set(key, clusters);
      }
      const cluster = clusters.find((c) => sameShape(c[0]!.shape, piece.shape));
      if (cluster) cluster.push(piece);
      else clusters.push([piece]);
      if (i % 500 === 0) report((0.5 * i) / found.count);
    }

    const single = new Map<string, Piece[]>();
    const addSingle = (material: string, piece: Piece) => {
      const list = single.get(material) ?? [];
      list.push(piece);
      single.set(material, list);
    };
    // Stones that could not be placed as copies: joined, where they are, one mesh per kind.
    const looseStones = new Map<string, Soup[]>();
    const addLooseStone = (material: string, piece: Piece) => {
      const list = looseStones.get(material) ?? [];
      list.push(piece.soup);
      looseStones.set(material, list);
    };
    const instanceOf = (placed: Placement): Instance => ({ t: placed.translation, r: placed.rotation, s: [1, 1, 1] });
    const clusters = [...buckets.values()].flat();
    for (const [c, cluster] of clusters.entries()) {
      const model = cluster[0]!;
      const triangles = model.soup.indices.length / 3;
      const size = model.shape.extents[2];
      const local = centered(model.soup.positions, model.shape.center);
      const localSoup = { positions: local, indices: model.soup.indices };
      const convex = triangles < STONE_MAX_TRIANGLES && isConvex(localSoup, size);
      // A cut stone: convex with a flat table on top (a bead of metal has none), or the shape of a cut stone however
      // finely it was exported (the centre stone of a ring, drawn with 100 000 triangles, is found once).
      const cut = looksCut(localSoup, { ...model.shape, center: [0, 0, 0] });
      const known = KNOWN_STONES.has(triangles) || cut;
      const isStone = cut || (convex && (KNOWN_STONES.has(triangles) || (cluster.length >= 3 && tableShare(localSoup, size) >= 0.05)));
      // Told apart only in a file without layers; in a layered file, the layer says what it is.
      const material = !source.layered ? (isStone ? stoneName(triangles, model.shape) : "metal") : layer.name;
      const stone = isStone;

      // Each copy placed on the first one: as it is, seen in a mirror, or with its vertices in another order.
      const tolerance = Math.max(0.002, 0.002 * size);
      const direct: Instance[] = [{ t: model.shape.center, r: IDENTITY, s: [1, 1, 1] }];
      const mirror: Instance[] = [];
      const mirrorPieces: Piece[] = [];
      let mirrorSoup: Soup | null = null;
      let mirrorRenumbered: Float32Array | null = null;
      let mirrorShape: Shape | null = null;
      const localShape: Shape = { ...model.shape, center: [0, 0, 0] };
      for (const copy of cluster.slice(1)) {
        let placed = align(local, copy.soup.positions, copy.shape.center);
        if (placed.error <= tolerance) {
          direct.push(instanceOf(placed));
          continue;
        }
        mirrorSoup ??= mirrored(localSoup);
        mirrorRenumbered ??= renumbered(mirrorSoup);
        placed = align(mirrorSoup.positions, copy.soup.positions, copy.shape.center);
        if (placed.error > tolerance) placed = align(mirrorRenumbered, copy.soup.positions, copy.shape.center);
        if (placed.error <= tolerance) {
          mirror.push(instanceOf(placed));
          mirrorPieces.push(copy);
          continue;
        }
        const free = alignFree(local, localShape, copy.soup.positions, copy.shape, tolerance);
        if (free) {
          direct.push(instanceOf(free));
          continue;
        }
        mirrorShape ??= { ...shapeOf(mirrorSoup.positions), center: [0, 0, 0] };
        const freeMirror = alignFree(mirrorSoup.positions, mirrorShape, copy.soup.positions, copy.shape, tolerance);
        if (freeMirror) {
          mirror.push(instanceOf(freeMirror));
          mirrorPieces.push(copy);
          continue;
        }
        unaligned++;
        if (stone) addLooseStone(material, copy);
        else addSingle(material, copy);
      }
      if (direct.length > 1) parts.push({ material, soup: localSoup, instances: direct, stone });
      else if (stone) addLooseStone(material, model);
      else addSingle(material, model);
      if (mirror.length > 1 && mirrorSoup) parts.push({ material, soup: mirrorSoup, instances: mirror, stone });
      else for (const piece of mirrorPieces) (stone ? addLooseStone : addSingle)(material, piece);

      if (stone && !source.layered) {
        const count = stoneCounts.get(material) ?? { material, count: 0, triangles, size: material.replace(/^stone_(round|fancy)_/, ""), known: known && size >= 0.6 };
        count.count += cluster.length;
        stoneCounts.set(material, count);
      }
      if (c % 200 === 0) report(0.5 + (0.5 * c) / clusters.length);
    }
    for (const [material, soups] of looseStones) parts.push({ material, soup: merge(soups), instances: null, stone: true });
    // Stones fused into the metal (a file without layers): out of the metal, whole again, joined by kind.
    if (!source.layered) {
      const fused = new Map<string, FusedStone[]>();
      for (const piece of single.get("metal") ?? []) {
        if (piece.soup.indices.length / 3 < FUSED_SEARCH_FROM) continue;
        const found = fusedStones(piece.soup);
        if (found.stones.length === 0) continue;
        piece.soup = found.metal;
        for (const stone of found.stones) {
          const material = fusedName(stone);
          const list = fused.get(material) ?? [];
          list.push(stone);
          fused.set(material, list);
        }
      }
      for (const [material, stones] of fused) {
        // A few neighbouring stones per mesh: the light traced inside a stone then searches among a few stones, not
        // hundreds (the viewer traces each pixel of a stone through the mesh it belongs to).
        for (const group of neighbours(stones, FUSED_PER_MESH)) parts.push({ material, soup: merge(group.map((s) => s.soup)), instances: null, stone: true, ups: upsOf(group) });
        // Counted apart from the separate stones of the same layer.
        stoneCounts.set(material + " fused", { material, count: stones.length, triangles: 0, size: material.replace(/^stone_(round|fancy)_/, ""), known: true, fused: true });
      }
    }
    for (const [material, pieces] of single) for (const soup of blocks(pieces, axis)) parts.push({ material, soup, instances: null, stone: false });
    report(1);
  }
  return { parts, stones: [...stoneCounts.values()].sort((a, b) => b.count - a.count), pieces: pieceCount, unaligned, size };
}
