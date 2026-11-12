/*
 * Stones fused into the metal. Some exports join the stones and the metal in
 * one surface (a boolean union): only the top of each stone is left, glued to
 * the metal, with nothing to separate it (the VfB ring 0542: hundreds of
 * stones, one piece of metal). Each one is found by its shape:
 * - a flat table (its triangles within 4 µm of one plane, as exports draw a
 *   facet a little bumpy);
 * - all around it, the crown: the surface slopes down and outward, never up
 *   again, and ends at a clear edge (the setting, a girdle), well within the
 *   size a crown can have around such a table;
 * - its facets face every way around the table (a curved band of metal slopes
 *   one way only), the table is a fair part of it (a bead or a dome of metal
 *   only has a tiny flat spot on top, and keeps curving) and it is steep
 *   enough (a plate with a slight bevel is not a stone);
 * - stones come in a setting: a piece is searched further only if it holds at
 *   least four clean crowns (whole, centred on their table, not too long) with
 *   tables of the same size. A sculpted surface (hair, clouds, a bail) can
 *   show a lone flat spot with slopes around it, never such a series. Then
 *   every crown of the piece is a stone, even one partly under another part
 *   of the jewel or joined to its neighbour.
 * Each stone found is taken out of the metal and made whole again: its crown
 * as drawn, closed below by a girdle and a pavilion of the usual angle, hidden
 * in the metal as in the real jewel. Lengths in mm.
 */
import { Vector3 } from "three";
import { ConvexHull } from "three/examples/jsm/math/ConvexHull.js";
import { compact, type Soup } from "./geometry.js";

export type FusedStone = {
  /** The whole stone, closed and convex. */
  soup: Soup;
  /** Outward normal of its table: how the jeweller's light is turned for it. */
  up: [number, number, number];
  /** Largest width of its crown (mm). */
  width: number;
  /** A round outline (a brilliant), or another shape (baguette, pentagon, kite...). */
  round: boolean;
};

/** Triangles of a table: within this distance of the plane of its largest triangle (mm), and within 4° of its normal. */
const FLAT = 0.004;
const FLAT_COS = Math.cos((4 * Math.PI) / 180);
/** Smallest table looked at (mm²): the table of a stone of about 0.3 mm. */
const TABLE_MIN = 0.01;
const DEG = Math.PI / 180;

/** Clean crowns of the same size a piece must hold to be a setting of fused stones. */
const SERIES = 4;

/** Pieces of metal with fewer triangles are not searched (a link, a bead). */
export const FUSED_SEARCH_FROM = 2000;

export function fusedStones(soup: Soup): { metal: Soup; stones: FusedStone[] } {
  const P = soup.positions;
  const I = soup.indices;
  const T = I.length / 3;
  const V = P.length / 3;
  if (T < FUSED_SEARCH_FROM) return { metal: soup, stones: [] };

  // Normal, area and plane of each triangle.
  const N = new Float64Array(T * 3);
  const A = new Float64Array(T);
  const D = new Float64Array(T);
  for (let t = 0; t < T; t++) {
    const a = I[t * 3]! * 3;
    const b = I[t * 3 + 1]! * 3;
    const c = I[t * 3 + 2]! * 3;
    const ux = P[b]! - P[a]!;
    const uy = P[b + 1]! - P[a + 1]!;
    const uz = P[b + 2]! - P[a + 2]!;
    const vx = P[c]! - P[a]!;
    const vy = P[c + 1]! - P[a + 1]!;
    const vz = P[c + 2]! - P[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    A[t] = l / 2;
    if (l > 0) {
      N[t * 3] = nx / l;
      N[t * 3 + 1] = ny / l;
      N[t * 3 + 2] = nz / l;
    }
    D[t] = N[t * 3]! * P[a]! + N[t * 3 + 1]! * P[a + 1]! + N[t * 3 + 2]! * P[a + 2]!;
  }

  // Neighbours across each edge shared by exactly two triangles.
  const edgeKey = new Float64Array(T * 3);
  for (let t = 0; t < T; t++) {
    for (let k = 0; k < 3; k++) {
      const a = I[t * 3 + k]!;
      const b = I[t * 3 + ((k + 1) % 3)]!;
      edgeKey[t * 3 + k] = Math.min(a, b) * V + Math.max(a, b);
    }
  }
  const order = new Uint32Array(T * 3);
  for (let i = 0; i < order.length; i++) order[i] = i;
  order.sort((x, y) => edgeKey[x]! - edgeKey[y]!);
  const nb = new Int32Array(T * 3).fill(-1);
  for (let i = 0; i < order.length; ) {
    let j = i + 1;
    while (j < order.length && edgeKey[order[j]!] === edgeKey[order[i]!]) j++;
    if (j - i === 2) {
      const p = order[i]!;
      const q = order[i + 1]!;
      nb[p] = (q / 3) | 0;
      nb[q] = (p / 3) | 0;
    }
    i = j;
  }

  // Flat patches, grown from the largest triangles.
  const patch = new Int32Array(T).fill(-1);
  const byArea = new Uint32Array(T);
  for (let t = 0; t < T; t++) byArea[t] = t;
  byArea.sort((x, y) => A[y]! - A[x]!);
  const patchArea: number[] = [];
  const patchNormal: number[] = [];
  const stack: number[] = [];
  for (const seed of byArea) {
    if (patch[seed]! >= 0) continue;
    const id = patchArea.length;
    const nx = N[seed * 3]!;
    const ny = N[seed * 3 + 1]!;
    const nz = N[seed * 3 + 2]!;
    const d = D[seed]!;
    let area = 0;
    patch[seed] = id;
    stack.push(seed);
    while (stack.length > 0) {
      const t = stack.pop()!;
      area += A[t]!;
      for (let k = 0; k < 3; k++) {
        const u = nb[t * 3 + k]!;
        if (u < 0 || patch[u]! >= 0) continue;
        // A sliver's own normal is unsure: its corners decide.
        if (N[u * 3]! * nx + N[u * 3 + 1]! * ny + N[u * 3 + 2]! * nz < (A[u]! > 2e-4 ? FLAT_COS : 0.9)) continue;
        let on = true;
        for (let j = 0; j < 3 && on; j++) {
          const v = I[u * 3 + j]! * 3;
          on = Math.abs(nx * P[v]! + ny * P[v + 1]! + nz * P[v + 2]! - d) <= FLAT;
        }
        if (!on) continue;
        patch[u] = id;
        stack.push(u);
      }
    }
    patchArea.push(area);
    patchNormal.push(nx, ny, nz);
  }
  const patches = patchArea.length;
  const patchStart = new Uint32Array(patches + 1);
  for (let t = 0; t < T; t++) patchStart[patch[t]! + 1]!++;
  for (let i = 0; i < patches; i++) patchStart[i + 1]! += patchStart[i]!;
  const fill = patchStart.slice(0, patches);
  const patchTris = new Uint32Array(T);
  for (let t = 0; t < T; t++) patchTris[fill[patch[t]!]!++] = t;

  const claimed = new Int32Array(T).fill(-1);
  const seen = new Int32Array(T).fill(-1);
  let run = 0;
  type Crown = { tris: number[]; center: number[]; up: number[]; clean: boolean; tableArea: number; reach: number };
  const crowns: Crown[] = [];
  const tables: number[] = [];
  for (let s = 0; s < patches; s++) if (patchArea[s]! >= TABLE_MIN && patchArea[s]! <= 400) tables.push(s);
  tables.sort((a, b) => patchArea[b]! - patchArea[a]!);

  for (const table of tables) {
    if (claimed[patchTris[patchStart[table]!]!]! >= 0) continue;
    run++;
    const crown = findCrown(table);
    if (!crown) continue;
    const id = crowns.length;
    crowns.push(crown);
    for (const t of crown.tris) claimed[t] = id;
  }

  /** The crown around a table, or null when it is not a stone. */
  function findCrown(table: number): Crown | null {
    const nx = patchNormal[table * 3]!;
    const ny = patchNormal[table * 3 + 1]!;
    const nz = patchNormal[table * 3 + 2]!;
    const tris: number[] = [];
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = patchStart[table]!; k < patchStart[table + 1]!; k++) {
      const t = patchTris[k]!;
      tris.push(t);
      seen[t] = run;
      for (let j = 0; j < 3; j++) {
        const v = I[t * 3 + j]! * 3;
        cx += (P[v]! * A[t]!) / 3;
        cy += (P[v + 1]! * A[t]!) / 3;
        cz += (P[v + 2]! * A[t]!) / 3;
      }
    }
    const tableArea = patchArea[table]!;
    cx /= tableArea;
    cy /= tableArea;
    cz /= tableArea;
    // Two directions across the table.
    const ex = Math.abs(nx) < 0.9 ? 1 : 0;
    const ey = ex ? 0 : 1;
    let ax = ey * nz;
    let ay = -ex * nz;
    let az = ex * ny - ey * nx;
    const al = Math.hypot(ax, ay, az);
    ax /= al;
    ay /= al;
    az /= al;
    const bx = ny * az - nz * ay;
    const by = nz * ax - nx * az;
    const bz = nx * ay - ny * ax;
    const flat = (x: number, y: number, z: number) => [(x - cx) * ax + (y - cy) * ay + (z - cz) * az, (x - cx) * bx + (y - cy) * by + (z - cz) * bz] as const;
    const heightOf = (x: number, y: number, z: number) => (x - cx) * nx + (y - cy) * ny + (z - cz) * nz;

    // The table: convex, and how far it reaches.
    const tablePoints: (readonly [number, number])[] = [];
    let reach = 0;
    for (const t of tris) {
      for (let j = 0; j < 3; j++) {
        const v = I[t * 3 + j]! * 3;
        const p = flat(P[v]!, P[v + 1]!, P[v + 2]!);
        tablePoints.push(p);
        reach = Math.max(reach, Math.hypot(p[0], p[1]));
      }
    }
    const tableHull = hull2d(tablePoints);
    if (tableArea < 0.85 * polygonArea(tableHull)) return null;
    // A crown reaches at most this far: a brilliant's girdle is 1.6 times the reach of its table.
    const limit = 2.6 * reach;

    // The crown: from the table outward, down and never up again, until a clear edge.
    let beyond = 0;
    let sharp = 0;
    let soft = 0;
    for (let i = 0; i < tris.length; i++) {
      const t = tris[i]!;
      for (let e = 0; e < 3; e++) {
        const u = nb[t * 3 + e]!;
        if (u < 0) continue;
        if (seen[u] === run) continue;
        const a = I[t * 3 + e]!;
        const b = I[t * 3 + ((e + 1) % 3)]!;
        let w = I[u * 3]!;
        if (w === a || w === b) w = I[u * 3 + 1]!;
        if (w === a || w === b) w = I[u * 3 + 2]!;
        const len = Math.hypot(P[b * 3]! - P[a * 3]!, P[b * 3 + 1]! - P[a * 3 + 1]!, P[b * 3 + 2]! - P[a * 3 + 2]!);
        const dot = N[t * 3]! * N[u * 3]! + N[t * 3 + 1]! * N[u * 3 + 1]! + N[t * 3 + 2]! * N[u * 3 + 2]!;
        const bend = Math.acos(Math.max(-1, Math.min(1, dot))) / DEG;
        const rise = N[t * 3]! * (P[w * 3]! - P[a * 3]!) + N[t * 3 + 1]! * (P[w * 3 + 1]! - P[a * 3 + 1]!) + N[t * 3 + 2]! * (P[w * 3 + 2]! - P[a * 3 + 2]!);
        const valley = rise > 0 && bend > 4;
        const cosTilt = N[u * 3]! * nx + N[u * 3 + 1]! * ny + N[u * 3 + 2]! * nz;
        const tilt = Math.acos(Math.max(-1, Math.min(1, cosTilt))) / DEG;
        const ux = (P[I[u * 3]! * 3]! + P[I[u * 3 + 1]! * 3]! + P[I[u * 3 + 2]! * 3]!) / 3;
        const uy = (P[I[u * 3]! * 3 + 1]! + P[I[u * 3 + 1]! * 3 + 1]! + P[I[u * 3 + 2]! * 3 + 1]!) / 3;
        const uz = (P[I[u * 3]! * 3 + 2]! + P[I[u * 3 + 1]! * 3 + 2]! + P[I[u * 3 + 2]! * 3 + 2]!) / 3;
        const h = heightOf(ux, uy, uz);
        const [fu, fv] = flat(ux, uy, uz);
        // Facing outward: the slope goes down away from the table.
        const outward = tilt < 3 || (N[u * 3]! * ax + N[u * 3 + 1]! * ay + N[u * 3 + 2]! * az) * fu + (N[u * 3]! * bx + N[u * 3 + 1]! * by + N[u * 3 + 2]! * bz) * fv > 0;
        const fits = claimed[u]! < 0 && !valley && tilt <= 65 && outward && h <= 0.003;
        if (fits && Math.hypot(fu, fv) > limit) {
          beyond += A[u]!;
          continue;
        }
        if (fits) {
          seen[u] = run;
          tris.push(u);
          continue;
        }
        if (valley || bend >= 15) sharp += len;
        else soft += len;
      }
      if (tris.length > 200_000) return null;
    }

    let area = 0;
    let side = 0;
    let steep = 0;
    let lowest = 0;
    let widest = 0;
    const places = new Uint8Array(36);
    const facing = new Float64Array(36);
    const seenFrom: (readonly [number, number])[] = [];
    for (const t of tris) {
      area += A[t]!;
      for (let j = 0; j < 3; j++) {
        const v = I[t * 3 + j]! * 3;
        const p = flat(P[v]!, P[v + 1]!, P[v + 2]!);
        seenFrom.push(p);
        lowest = Math.min(lowest, heightOf(P[v]!, P[v + 1]!, P[v + 2]!));
        widest = Math.max(widest, Math.hypot(p[0], p[1]));
      }
      if (patch[t] === table) continue;
      side += A[t]!;
      const cosTilt = N[t * 3]! * nx + N[t * 3 + 1]! * ny + N[t * 3 + 2]! * nz;
      if (cosTilt >= Math.cos(8 * DEG)) continue;
      if (cosTilt <= Math.cos(20 * DEG)) steep += A[t]!;
      // Where it is around the table, and which way it faces.
      const ux = (P[I[t * 3]! * 3]! + P[I[t * 3 + 1]! * 3]! + P[I[t * 3 + 2]! * 3]!) / 3;
      const uy = (P[I[t * 3]! * 3 + 1]! + P[I[t * 3 + 1]! * 3 + 1]! + P[I[t * 3 + 2]! * 3 + 1]!) / 3;
      const uz = (P[I[t * 3]! * 3 + 2]! + P[I[t * 3 + 1]! * 3 + 2]! + P[I[t * 3 + 2]! * 3 + 2]!) / 3;
      const [fu, fv] = flat(ux, uy, uz);
      places[sector(Math.atan2(fv, fu))] = 1;
      const fa = N[t * 3]! * ax + N[t * 3 + 1]! * ay + N[t * 3 + 2]! * az;
      const fb = N[t * 3]! * bx + N[t * 3 + 1]! * by + N[t * 3 + 2]! * bz;
      facing[sector(Math.atan2(fb, fa))]! += A[t]!;
    }
    const width = 2 * widest;
    const height = -lowest;
    // A dome keeps curving past where a crown would end.
    if (beyond > 0.02 * area) return null;
    // The crown ends at a clear edge: the setting, a girdle.
    if (sharp < 0.7 * (sharp + soft)) return null;
    // The table is a fair part of it (a dome's flat top is tiny), not all of it (a plate with a bevel).
    const share = (2 * reach) / width;
    if (share < 0.35 || share > 0.92) return null;
    if (height < 0.06 * width || height > 0.35 * width) return null;
    if (steep < 0.25 * side) return null;
    // All around the table (a stone partly under another part of the jewel is still found).
    let around = 0;
    for (const p of places) around += p;
    if (around < 22) return null;
    // Facets facing several ways: the sides of a step cut (three are enough: the fourth can be joined to a
    // neighbour), or a brilliant's facets turning around it (a half is enough, the rest may be under another part
    // of the jewel). A curved band of metal faces two ways only, a ramp one.
    const ways = new Uint8Array(36);
    for (let k = 0; k < 36; k++) ways[k] = facing[k]! >= 0.01 * side ? 1 : 0;
    let groups = 0;
    let broadest = 0;
    const start = ways.indexOf(0);
    if (start < 0) broadest = 36;
    else {
      let length = 0;
      for (let i = 1; i <= 36; i++) {
        if (ways[(start + i) % 36]) length++;
        else if (length > 0) {
          groups++;
          broadest = Math.max(broadest, length);
          length = 0;
        }
      }
    }
    if (groups < 3 && broadest < 9) return null;
    // Clean: the outline of the crown, seen from above, centred on the table and not too long.
    const outline = hull2d(seenFrom);
    let wide = 0;
    let narrow = Infinity;
    for (let k = 0; k < 36; k++) {
      const c = Math.cos(k * 5 * DEG);
      const s = Math.sin(k * 5 * DEG);
      let lo = Infinity;
      let hi = -Infinity;
      for (const [u, v] of outline) {
        lo = Math.min(lo, u * c + v * s);
        hi = Math.max(hi, u * c + v * s);
      }
      wide = Math.max(wide, hi - lo);
      narrow = Math.min(narrow, hi - lo);
    }
    let mu = 0;
    let mv = 0;
    let twice = 0;
    for (let i = 0; i < outline.length; i++) {
      const p = outline[i]!;
      const q = outline[(i + 1) % outline.length]!;
      const cross = p[0] * q[1] - q[0] * p[1];
      twice += cross;
      mu += (p[0] + q[0]) * cross;
      mv += (p[1] + q[1]) * cross;
    }
    const offset = twice !== 0 ? Math.hypot(mu / (3 * twice), mv / (3 * twice)) : Infinity;
    const clean = offset <= 0.04 * wide && narrow >= 0.33 * wide && share >= 0.4;
    return { tris, center: [cx, cy, cz], up: [nx, ny, nz], clean, tableArea, reach };
  }

  // A setting: clean crowns with tables of the same size, at least SERIES of them.
  const clean = crowns.filter((c) => c.clean);
  const series = clean.some((a) => clean.filter((b) => Math.abs(b.tableArea / a.tableArea - 1) <= 0.15 && Math.abs(b.reach / a.reach - 1) <= 0.08).length >= SERIES);
  if (!series) return { metal: soup, stones: [] };

  const stones: FusedStone[] = [];
  for (const crown of crowns) {
    const stone = wholeStone(soup, crown.tris, crown.center, crown.up, patch, A);
    if (stone) stones.push(stone);
    else for (const t of crown.tris) claimed[t] = -1;
  }
  if (stones.length === 0) return { metal: soup, stones: [] };

  // The metal without the tops of the stones.
  const kept = new Uint32Array(I.length);
  let n = 0;
  for (let t = 0; t < T; t++) {
    if (claimed[t]! >= 0) continue;
    kept[n++] = I[t * 3]!;
    kept[n++] = I[t * 3 + 1]!;
    kept[n++] = I[t * 3 + 2]!;
  }
  return { metal: compact(P, kept.slice(0, n)), stones };
}

function sector(angle: number): number {
  return Math.min(35, Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 36));
}

/** Convex hull of points in a plane (monotone chain), counter-clockwise. */
function hull2d(points: readonly (readonly [number, number])[]): [number, number][] {
  const pts = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o: readonly number[], a: readonly number[], b: readonly number[]) => (a[0]! - o[0]!) * (b[1]! - o[1]!) - (a[1]! - o[1]!) * (b[0]! - o[0]!);
  const lower: [number, number][] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop();
    lower.push([p[0], p[1]]);
  }
  const upper: [number, number][] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i]!;
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop();
    upper.push([p[0], p[1]]);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function polygonArea(polygon: readonly (readonly [number, number])[]): number {
  let a = 0;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i]!;
    const q = polygon[(i + 1) % polygon.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(a) / 2;
}

/** A polygon cut down to `count` corners, the least useful ones dropped first (Visvalingam). */
function fewerCorners(polygon: [number, number][], count: number): [number, number][] {
  const out = polygon.slice();
  const weight = (i: number) => {
    const p = out[(i + out.length - 1) % out.length]!;
    const q = out[i]!;
    const r = out[(i + 1) % out.length]!;
    return Math.abs((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  };
  while (out.length > count) {
    let worst = 0;
    let least = Infinity;
    for (let i = 0; i < out.length; i++) {
      const w = weight(i);
      if (w < least) {
        least = w;
        worst = i;
      }
    }
    out.splice(worst, 1);
  }
  return out;
}

/** Pavilion depth below the girdle, compared with the width: a brilliant's 43 %. */
const PAVILION = 0.43;
/** Girdle thickness, compared with the width. */
const GIRDLE = 0.03;

/** Pavilion facets, from the girdle: a brilliant's 41°. */
const PAVILION_ANGLE = 41 * DEG;

/**
 * A whole stone from its crown, closed (as the light traced inside a stone
 * needs it) and convex: the planes of its facets as drawn (each pushed out
 * just enough to hold every point of the crown, so that it covers the hole
 * it leaves in the metal), a girdle along its outline and a pavilion of
 * 41° facets below; a few dozen flat facets, as a cut stone has. When the
 * facets cannot be told apart, the convex hull of its points, a girdle and a
 * point below.
 */
function wholeStone(soup: Soup, tris: number[], center: number[], up: number[], patch: Int32Array, area: Float64Array): FusedStone | null {
  const P = soup.positions;
  const I = soup.indices;
  const [cx, cy, cz] = center as [number, number, number];
  const [nx, ny, nz] = up as [number, number, number];
  const ex = Math.abs(nx) < 0.9 ? 1 : 0;
  const ey = ex ? 0 : 1;
  let ax = ey * nz;
  let ay = -ex * nz;
  let az = ex * ny - ey * nx;
  const al = Math.hypot(ax, ay, az);
  ax /= al;
  ay /= al;
  az /= al;
  const bx = ny * az - nz * ay;
  const by = nz * ax - nx * az;
  const bz = nx * ay - ny * ax;

  // The crown's points, in the stone's own frame (across, across, up).
  const index = new Map<number, number>();
  const local: number[] = [];
  for (const t of tris) {
    for (let j = 0; j < 3; j++) {
      const v = I[t * 3 + j]!;
      if (index.has(v)) continue;
      index.set(v, local.length / 3);
      const x = P[v * 3]! - cx;
      const y = P[v * 3 + 1]! - cy;
      const z = P[v * 3 + 2]! - cz;
      local.push(x * ax + y * ay + z * az, x * bx + y * by + z * bz, x * nx + y * ny + z * nz);
    }
  }
  const count = local.length / 3;
  if (count < 4) return null;
  let lowest = 0;
  const flatPoints: [number, number][] = [];
  for (let i = 0; i < count; i++) {
    lowest = Math.min(lowest, local[i * 3 + 2]!);
    flatPoints.push([local[i * 3]!, local[i * 3 + 1]!]);
  }
  const outline = hull2d(flatPoints);
  if (outline.length < 3) return null;
  let widest = 0;
  let narrowest = Infinity;
  for (let k = 0; k < 18; k++) {
    const c = Math.cos(k * 10 * DEG);
    const s = Math.sin(k * 10 * DEG);
    let lo = Infinity;
    let hi = -Infinity;
    for (const [u, v] of outline) {
      const d = u * c + v * s;
      lo = Math.min(lo, d);
      hi = Math.max(hi, d);
    }
    widest = Math.max(widest, hi - lo);
    narrowest = Math.min(narrowest, hi - lo);
  }
  const round = narrowest >= 0.92 * widest && outline.length >= 8;

  // The girdle: the outline, at most 16 corners, pushed out until it holds every point of the crown.
  const corners = fewerCorners(outline, 16);
  const lines = corners.map((p, i) => {
    const q = corners[(i + 1) % corners.length]!;
    let mx = q[1] - p[1];
    let my = p[0] - q[0];
    const ml = Math.hypot(mx, my) || 1;
    mx /= ml;
    my /= ml;
    let reach = -Infinity;
    for (const [u, v] of outline) reach = Math.max(reach, u * mx + v * my);
    return { mx, my, reach: reach + 0.005 * widest };
  });
  const girdle: [number, number][] = [];
  for (let i = 0; i < lines.length; i++) {
    const l1 = lines[(i + lines.length - 1) % lines.length]!;
    const l2 = lines[i]!;
    const det = l1.mx * l2.my - l1.my * l2.mx;
    if (Math.abs(det) < 1e-9) continue;
    girdle.push([(l1.reach * l2.my - l2.reach * l1.my) / det, (l1.mx * l2.reach - l2.mx * l1.reach) / det]);
  }
  const bottom = lowest - GIRDLE * widest;
  let gu = 0;
  let gv = 0;
  for (const [u, v] of girdle) {
    gu += u / girdle.length;
    gv += v / girdle.length;
  }
  const back = (x: number, y: number, z: number) => [cx + x * ax + y * bx + z * nx, cy + x * ay + y * by + z * ny, cz + x * az + y * bz + z * nz];

  // The planes of its facets, in the stone's frame.
  const groups = new Map<number, { area: number; n: number[]; c: number[] }>();
  let crownArea = 0;
  for (const t of tris) {
    const g = groups.get(patch[t]!) ?? { area: 0, n: [0, 0, 0], c: [0, 0, 0] };
    const pts = [0, 1, 2].map((j) => {
      const k = index.get(I[t * 3 + j]!)! * 3;
      return [local[k]!, local[k + 1]!, local[k + 2]!];
    });
    const [p, q, r] = pts as [number[], number[], number[]];
    const ux = q[0]! - p[0]!;
    const uy = q[1]! - p[1]!;
    const uz = q[2]! - p[2]!;
    const vx = r[0]! - p[0]!;
    const vy = r[1]! - p[1]!;
    const vz = r[2]! - p[2]!;
    // Area-weighted normal (twice the area).
    g.n[0]! += uy * vz - uz * vy;
    g.n[1]! += uz * vx - ux * vz;
    g.n[2]! += ux * vy - uy * vx;
    const a = area[t]!;
    for (let k = 0; k < 3; k++) g.c[k]! += ((p[k]! + q[k]! + r[k]!) / 3) * a;
    g.area += a;
    crownArea += a;
    groups.set(patch[t]!, g);
  }
  const planes: { n: number[]; d: number }[] = [];
  for (const g of [...groups.values()].sort((x, y) => y.area - x.area).slice(0, 48)) {
    if (g.area < 0.01 * crownArea) continue;
    const l = Math.hypot(g.n[0]!, g.n[1]!, g.n[2]!);
    if (l === 0) continue;
    const n = g.n.map((x) => x / l);
    if (n[2]! < 0.3) continue;
    let d = (n[0]! * g.c[0]! + n[1]! * g.c[1]! + n[2]! * g.c[2]!) / g.area;
    for (let i = 0; i < count; i++) d = Math.max(d, n[0]! * local[i * 3]! + n[1]! * local[i * 3 + 1]! + n[2]! * local[i * 3 + 2]!);
    planes.push({ n, d });
  }
  if (planes.length >= 5) {
    for (const l of lines) {
      planes.push({ n: [l.mx, l.my, 0], d: l.reach });
      const sa = Math.sin(PAVILION_ANGLE);
      const ca = Math.cos(PAVILION_ANGLE);
      planes.push({ n: [l.mx * sa, l.my * sa, -ca], d: sa * l.reach - ca * bottom });
    }
    const faces = polytope(planes, 2 * widest, bottom - 2 * widest, widest);
    if (faces) {
      const positions: number[] = [];
      const indices: number[] = [];
      for (const face of faces) {
        const base = positions.length / 3;
        for (const p of face) positions.push(...back(p[0]!, p[1]!, p[2]!));
        for (let k = 1; k + 1 < face.length; k++) indices.push(base, base + k, base + k + 1);
      }
      return { soup: { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) }, up: [nx, ny, nz], width: widest, round };
    }
  }

  const points: Vector3[] = [];
  for (let i = 0; i < count; i++) points.push(new Vector3(local[i * 3]!, local[i * 3 + 1]!, local[i * 3 + 2]!));
  for (const [u, v] of girdle) points.push(new Vector3(u, v, lowest), new Vector3(u, v, bottom));
  points.push(new Vector3(gu, gv, bottom - PAVILION * widest));

  const hull = new ConvexHull().setFromPoints(points);
  const ids = new Map<Vector3, number>();
  const positions: number[] = [];
  const indices: number[] = [];
  const idOf = (p: Vector3) => {
    let id = ids.get(p);
    if (id === undefined) {
      id = positions.length / 3;
      ids.set(p, id);
      // Back to the jewel's frame.
      positions.push(...back(p.x, p.y, p.z));
    }
    return id;
  };
  for (const face of hull.faces) {
    const corner: number[] = [];
    let edge = face.edge;
    do {
      corner.push(idOf(edge.head().point));
      edge = edge.next;
    } while (edge !== face.edge);
    for (let k = 1; k + 1 < corner.length; k++) indices.push(corner[0]!, corner[k]!, corner[k + 1]!);
  }
  if (indices.length < 12) return null;
  return { soup: { positions: Float32Array.from(positions), indices: Uint32Array.from(indices) }, up: [nx, ny, nz], width: widest, round };
}

/**
 * The convex solid where n·p <= d for every plane: a box (half-width `half`,
 * from `low` to `high` along z) cut by each plane in turn. Its faces, each a
 * polygon turning counter-clockwise seen from outside; null if it comes out
 * flat or open.
 */
function polytope(planes: { n: number[]; d: number }[], half: number, low: number, high: number): number[][][] | null {
  const eps = 1e-7 * half;
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => [
    [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]],
    [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
    [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
    [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]],
    [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]],
    [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
  ];
  let faces: number[][][] = box(-half, half, -half, half, low, high);
  for (const { n, d } of planes) {
    const side = (p: number[]) => n[0]! * p[0]! + n[1]! * p[1]! + n[2]! * p[2]! - d;
    const next: number[][][] = [];
    const cut: number[][] = [];
    for (const face of faces) {
      const kept: number[][] = [];
      for (let i = 0; i < face.length; i++) {
        const p = face[i]!;
        const q = face[(i + 1) % face.length]!;
        const sp = side(p);
        const sq = side(q);
        if (sp <= eps) kept.push(p);
        if (Math.abs(sp) <= eps) cut.push(p);
        if ((sp <= eps) !== (sq <= eps) && Math.abs(sp - sq) > 0) {
          const t = sp / (sp - sq);
          const x = [p[0]! + (q[0]! - p[0]!) * t, p[1]! + (q[1]! - p[1]!) * t, p[2]! + (q[2]! - p[2]!) * t];
          kept.push(x);
          cut.push(x);
        }
      }
      if (kept.length >= 3) next.push(kept);
    }
    // The new face, along the plane: its points in turn around their middle.
    const unique: number[][] = [];
    for (const p of cut) if (!unique.some((q) => Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!) <= 10 * eps)) unique.push(p);
    if (unique.length >= 3) {
      const m = [0, 1, 2].map((k) => unique.reduce((sum, p) => sum + p[k]!, 0) / unique.length);
      const e = Math.abs(n[0]!) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      let u = [n[1]! * e[2]! - n[2]! * e[1]!, n[2]! * e[0]! - n[0]! * e[2]!, n[0]! * e[1]! - n[1]! * e[0]!];
      const ul = Math.hypot(u[0]!, u[1]!, u[2]!);
      u = u.map((x) => x / ul);
      const v = [n[1]! * u[2]! - n[2]! * u[1]!, n[2]! * u[0]! - n[0]! * u[2]!, n[0]! * u[1]! - n[1]! * u[0]!];
      const angle = (p: number[]) => {
        const r = [p[0]! - m[0]!, p[1]! - m[1]!, p[2]! - m[2]!];
        return Math.atan2(r[0]! * v[0]! + r[1]! * v[1]! + r[2]! * v[2]!, r[0]! * u[0]! + r[1]! * u[1]! + r[2]! * u[2]!);
      };
      next.push(unique.sort((a, b) => angle(a) - angle(b)));
    }
    faces = next;
    if (faces.length < 4) return null;
  }
  // Points a face repeats (cut exactly at a corner) are dropped.
  const clean = faces
    .map((face) => face.filter((p, i) => {
      const q = face[(i + 1) % face.length]!;
      return Math.hypot(p[0]! - q[0]!, p[1]! - q[1]!, p[2]! - q[2]!) > 10 * eps;
    }))
    .filter((face) => face.length >= 3);
  if (clean.length < 4) return null;
  // The box must be gone: no point left on its walls (an open stone, its planes do not close it).
  for (const face of clean) for (const p of face) if (Math.abs(p[0]!) >= half - eps || Math.abs(p[1]!) >= half - eps || p[2]! <= low + eps || p[2]! >= high - eps) return null;
  return clean;
}
