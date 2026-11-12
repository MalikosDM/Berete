/*
 * Geometry tools of the 3D pipeline, on plain typed arrays (files of several
 * million triangles): welding, connected pieces, shape of a piece, alignment
 * of two copies, convexity, normals with sharp edges. Lengths are in mm.
 */

/** Triangles sharing their vertices: 3 numbers per vertex, 3 vertex numbers per triangle. */
export type Soup = { positions: Float32Array; indices: Uint32Array };

/** Vertices closer than this are one vertex (mm). */
export const WELD_STEP = 1e-4;

/**
 * Gives one number per position: the same number to positions closer than
 * `step` (an open-addressing table on the rounded coordinates).
 */
export class Welder {
  count = 0;
  private cap: number;
  private mask: number;
  private keys: Int32Array;
  private vals: Int32Array;
  private pos: Float32Array;
  private readonly inv: number;

  constructor(expected: number, step = WELD_STEP) {
    this.inv = 1 / step;
    this.cap = 1 << Math.max(10, Math.ceil(Math.log2(Math.max(16, expected) * 2)));
    this.mask = this.cap - 1;
    this.keys = new Int32Array(this.cap * 3);
    this.vals = new Int32Array(this.cap).fill(-1);
    this.pos = new Float32Array(Math.max(48, expected * 3));
  }

  private static hash(x: number, y: number, z: number): number {
    let h = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca77) ^ Math.imul(z, 0xc2b2ae3d);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;
    return h;
  }

  add(x: number, y: number, z: number): number {
    const qx = Math.round(x * this.inv);
    const qy = Math.round(y * this.inv);
    const qz = Math.round(z * this.inv);
    const keys = this.keys;
    const vals = this.vals;
    let h = Welder.hash(qx, qy, qz) & this.mask;
    for (;;) {
      const v = vals[h]!;
      if (v === -1) break;
      if (keys[h * 3] === qx && keys[h * 3 + 1] === qy && keys[h * 3 + 2] === qz) return v;
      h = (h + 1) & this.mask;
    }
    const index = this.count++;
    vals[h] = index;
    keys[h * 3] = qx;
    keys[h * 3 + 1] = qy;
    keys[h * 3 + 2] = qz;
    if (index * 3 + 3 > this.pos.length) {
      const grown = new Float32Array(this.pos.length * 2);
      grown.set(this.pos);
      this.pos = grown;
    }
    this.pos[index * 3] = x;
    this.pos[index * 3 + 1] = y;
    this.pos[index * 3 + 2] = z;
    if (this.count * 2 > this.cap) this.grow();
    return index;
  }

  private grow(): void {
    const oldKeys = this.keys;
    const oldVals = this.vals;
    this.cap *= 2;
    this.mask = this.cap - 1;
    this.keys = new Int32Array(this.cap * 3);
    this.vals = new Int32Array(this.cap).fill(-1);
    for (let i = 0; i < oldVals.length; i++) {
      const v = oldVals[i]!;
      if (v === -1) continue;
      const x = oldKeys[i * 3]!;
      const y = oldKeys[i * 3 + 1]!;
      const z = oldKeys[i * 3 + 2]!;
      let h = Welder.hash(x, y, z) & this.mask;
      while (this.vals[h] !== -1) h = (h + 1) & this.mask;
      this.vals[h] = v;
      this.keys[h * 3] = x;
      this.keys[h * 3 + 1] = y;
      this.keys[h * 3 + 2] = z;
    }
  }

  positions(): Float32Array {
    return this.pos.slice(0, this.count * 3);
  }
}

/** Welds a list of triangles (positions, optional indices) and drops the flat ones. */
export function weld(positions: ArrayLike<number>, indices: ArrayLike<number> | null, scale = 1): Soup {
  const vertexCount = Math.floor(positions.length / 3);
  const welder = new Welder(vertexCount);
  const map = new Uint32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) map[i] = welder.add(positions[i * 3]! * scale, positions[i * 3 + 1]! * scale, positions[i * 3 + 2]! * scale);
  const corners = indices ? indices.length : vertexCount;
  const out = new Uint32Array(corners);
  let n = 0;
  for (let t = 0; t + 2 < corners; t += 3) {
    const a = map[indices ? indices[t]! : t]!;
    const b = map[indices ? indices[t + 1]! : t + 1]!;
    const c = map[indices ? indices[t + 2]! : t + 2]!;
    if (a === b || b === c || a === c) continue;
    out[n++] = a;
    out[n++] = b;
    out[n++] = c;
  }
  return { positions: welder.positions(), indices: out.slice(0, n) };
}

/** Connected pieces: the triangles of piece i are list[offsets[i]..offsets[i+1]], in file order. */
export type Pieces = { count: number; offsets: Uint32Array; list: Uint32Array };

export function connectedPieces(soup: Soup): Pieces {
  const vertexCount = soup.positions.length / 3;
  const idx = soup.indices;
  const triCount = idx.length / 3;
  const parent = new Int32Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) parent[i] = i;
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]!]!;
      x = parent[x]!;
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) {
      if (ra < rb) parent[rb] = ra;
      else parent[ra] = rb;
    }
  };
  for (let t = 0; t < triCount; t++) {
    union(idx[t * 3]!, idx[t * 3 + 1]!);
    union(idx[t * 3]!, idx[t * 3 + 2]!);
  }
  const label = new Int32Array(vertexCount).fill(-1);
  const triPiece = new Int32Array(triCount);
  let count = 0;
  for (let t = 0; t < triCount; t++) {
    const r = find(idx[t * 3]!);
    if (label[r] === -1) label[r] = count++;
    triPiece[t] = label[r]!;
  }
  const offsets = new Uint32Array(count + 1);
  for (let t = 0; t < triCount; t++) offsets[triPiece[t]! + 1]!++;
  for (let i = 0; i < count; i++) offsets[i + 1]! += offsets[i]!;
  const fill = offsets.slice(0, count);
  const list = new Uint32Array(triCount);
  for (let t = 0; t < triCount; t++) list[fill[triPiece[t]!]!++] = t;
  return { count, offsets, list };
}

/**
 * The triangles list[start..end] of a soup as their own soup, vertices
 * numbered in order of first use (copies made the same way keep the same
 * order). `scratch`: one -1 per vertex of the soup, given back as found.
 */
export function extract(soup: Soup, list: Uint32Array, start: number, end: number, scratch: Int32Array): Soup {
  const triCount = end - start;
  const indices = new Uint32Array(triCount * 3);
  const touched = new Int32Array(triCount * 3);
  let nv = 0;
  for (let k = 0; k < triCount; k++) {
    const t = list[start + k]!;
    for (let j = 0; j < 3; j++) {
      const v = soup.indices[t * 3 + j]!;
      let l = scratch[v]!;
      if (l < 0) {
        l = nv++;
        scratch[v] = l;
        touched[l] = v;
      }
      indices[k * 3 + j] = l;
    }
  }
  const positions = new Float32Array(nv * 3);
  for (let l = 0; l < nv; l++) {
    const v = touched[l]!;
    positions[l * 3] = soup.positions[v * 3]!;
    positions[l * 3 + 1] = soup.positions[v * 3 + 1]!;
    positions[l * 3 + 2] = soup.positions[v * 3 + 2]!;
    scratch[v] = -1;
  }
  return { positions, indices };
}

/** Eigen decomposition of a symmetric n×n matrix (Jacobi): values and vectors (columns). */
function jacobi(a: number[][], n: number): { values: number[]; vectors: number[][] } {
  const m = a.map((row) => row.slice());
  const v: number[][] = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += m[p]![q]! * m[p]![q]!;
    if (off < 1e-30) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = m[p]![q]!;
        if (Math.abs(apq) < 1e-300) continue;
        const theta = (m[q]![q]! - m[p]![p]!) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const mkp = m[k]![p]!;
          const mkq = m[k]![q]!;
          m[k]![p] = c * mkp - s * mkq;
          m[k]![q] = s * mkp + c * mkq;
        }
        for (let k = 0; k < n; k++) {
          const mpk = m[p]![k]!;
          const mqk = m[q]![k]!;
          m[p]![k] = c * mpk - s * mqk;
          m[q]![k] = s * mpk + c * mqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }
  return { values: m.map((row, i) => row[i]!), vectors: v };
}

export type Shape = {
  /** Centre of the vertices. */
  center: [number, number, number];
  /** Sizes along the main axes of the piece, smallest first (the same whatever its rotation). */
  extents: [number, number, number];
  /** The main axes (unit vectors), in the same order. */
  axes: [number, number, number][];
};

export function shapeOf(positions: Float32Array): Shape {
  const n = positions.length / 3;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += positions[i * 3]!;
    cy += positions[i * 3 + 1]!;
    cz += positions[i * 3 + 2]!;
  }
  cx /= n;
  cy /= n;
  cz /= n;
  let xx = 0;
  let xy = 0;
  let xz = 0;
  let yy = 0;
  let yz = 0;
  let zz = 0;
  for (let i = 0; i < n; i++) {
    const x = positions[i * 3]! - cx;
    const y = positions[i * 3 + 1]! - cy;
    const z = positions[i * 3 + 2]! - cz;
    xx += x * x;
    xy += x * y;
    xz += x * z;
    yy += y * y;
    yz += y * z;
    zz += z * z;
  }
  const { vectors } = jacobi(
    [
      [xx, xy, xz],
      [xy, yy, yz],
      [xz, yz, zz],
    ],
    3,
  );
  const ext: { e: number; axis: [number, number, number] }[] = [];
  for (let k = 0; k < 3; k++) {
    const ax = vectors[0]![k]!;
    const ay = vectors[1]![k]!;
    const az = vectors[2]![k]!;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const d = (positions[i * 3]! - cx) * ax + (positions[i * 3 + 1]! - cy) * ay + (positions[i * 3 + 2]! - cz) * az;
      if (d < lo) lo = d;
      if (d > hi) hi = d;
    }
    ext.push({ e: hi - lo, axis: [ax, ay, az] });
  }
  ext.sort((a, b) => a.e - b.e);
  return { center: [cx, cy, cz], extents: [ext[0]!.e, ext[1]!.e, ext[2]!.e], axes: ext.map((x) => x.axis) };
}

/** Two pieces of the same shape: sizes equal within `tolerance` (1 %) of the largest. */
export function sameShape(a: Shape, b: Shape, tolerance = 0.01): boolean {
  const size = Math.max(a.extents[2], b.extents[2]);
  for (let k = 0; k < 3; k++) if (Math.abs(a.extents[k]! - b.extents[k]!) > tolerance * Math.max(a.extents[k]!, b.extents[k]!, 0.05 * size)) return false;
  return true;
}

/** The positions moved so that their centre is at 0. */
export function centered(positions: Float32Array, center: readonly number[]): Float32Array {
  const out = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    out[i] = positions[i]! - center[0]!;
    out[i + 1] = positions[i + 1]! - center[1]!;
    out[i + 2] = positions[i + 2]! - center[2]!;
  }
  return out;
}

export type Placement = {
  /** Rotation as a quaternion x, y, z, w. */
  rotation: [number, number, number, number];
  translation: [number, number, number];
  /** Largest distance between a moved vertex of the model and the vertex of the copy (mm). */
  error: number;
};

/**
 * The rotation and the move that put `model` (centred at 0) on `copy`, vertex
 * for vertex (Horn's quaternion solution of the Kabsch problem).
 */
export function align(model: Float32Array, copy: Float32Array, center: readonly number[]): Placement {
  const n = model.length / 3;
  let sxx = 0;
  let sxy = 0;
  let sxz = 0;
  let syx = 0;
  let syy = 0;
  let syz = 0;
  let szx = 0;
  let szy = 0;
  let szz = 0;
  for (let i = 0; i < n; i++) {
    const px = model[i * 3]!;
    const py = model[i * 3 + 1]!;
    const pz = model[i * 3 + 2]!;
    const qx = copy[i * 3]! - center[0]!;
    const qy = copy[i * 3 + 1]! - center[1]!;
    const qz = copy[i * 3 + 2]! - center[2]!;
    sxx += px * qx;
    sxy += px * qy;
    sxz += px * qz;
    syx += py * qx;
    syy += py * qy;
    syz += py * qz;
    szx += pz * qx;
    szy += pz * qy;
    szz += pz * qz;
  }
  const N = [
    [sxx + syy + szz, syz - szy, szx - sxz, sxy - syx],
    [syz - szy, sxx - syy - szz, sxy + syx, szx + sxz],
    [szx - sxz, sxy + syx, -sxx + syy - szz, syz + szy],
    [sxy - syx, szx + sxz, syz + szy, -sxx - syy + szz],
  ];
  const { values, vectors } = jacobi(N, 4);
  let best = 0;
  for (let k = 1; k < 4; k++) if (values[k]! > values[best]!) best = k;
  let w = vectors[0]![best]!;
  let x = vectors[1]![best]!;
  let y = vectors[2]![best]!;
  let z = vectors[3]![best]!;
  const len = Math.hypot(w, x, y, z) || 1;
  w /= len;
  x /= len;
  y /= len;
  z /= len;
  // Rotation matrix of the quaternion.
  const r00 = 1 - 2 * (y * y + z * z);
  const r01 = 2 * (x * y - z * w);
  const r02 = 2 * (x * z + y * w);
  const r10 = 2 * (x * y + z * w);
  const r11 = 1 - 2 * (x * x + z * z);
  const r12 = 2 * (y * z - x * w);
  const r20 = 2 * (x * z - y * w);
  const r21 = 2 * (y * z + x * w);
  const r22 = 1 - 2 * (x * x + y * y);
  let error = 0;
  for (let i = 0; i < n; i++) {
    const px = model[i * 3]!;
    const py = model[i * 3 + 1]!;
    const pz = model[i * 3 + 2]!;
    const dx = r00 * px + r01 * py + r02 * pz + center[0]! - copy[i * 3]!;
    const dy = r10 * px + r11 * py + r12 * pz + center[1]! - copy[i * 3 + 1]!;
    const dz = r20 * px + r21 * py + r22 * pz + center[2]! - copy[i * 3 + 2]!;
    const d = dx * dx + dy * dy + dz * dz;
    if (d > error) error = d;
  }
  return { rotation: [x, y, z, w], translation: [center[0]!, center[1]!, center[2]!], error: Math.sqrt(error) };
}

/**
 * Whether a piece is (almost) convex, like a cut stone: no vertex stands more
 * than 1 % of its size outside the plane of a face. Its centre must be at 0.
 */
export function isConvex(soup: Soup, size: number): boolean {
  const p = soup.positions;
  const idx = soup.indices;
  const n = p.length / 3;
  const tolerance = 0.01 * size;
  let checks = 0;
  let outside = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]! * 3;
    const b = idx[t + 1]! * 3;
    const c = idx[t + 2]! * 3;
    const ux = p[b]! - p[a]!;
    const uy = p[b + 1]! - p[a + 1]!;
    const uz = p[b + 2]! - p[a + 2]!;
    const vx = p[c]! - p[a]!;
    const vy = p[c + 1]! - p[a + 1]!;
    const vz = p[c + 2]! - p[a + 2]!;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-12) continue;
    nx /= len;
    ny /= len;
    nz /= len;
    let d = nx * p[a]! + ny * p[a + 1]! + nz * p[a + 2]!;
    // The plane faces away from the centre.
    if (d < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
      d = -d;
    }
    for (let i = 0; i < n; i++) {
      checks++;
      if (nx * p[i * 3]! + ny * p[i * 3 + 1]! + nz * p[i * 3 + 2]! - d > tolerance) outside++;
    }
  }
  return checks > 0 && outside / checks < 0.01;
}

/** One soup made of several. */
export function merge(soups: readonly Soup[]): Soup {
  let v = 0;
  let i = 0;
  for (const s of soups) {
    v += s.positions.length;
    i += s.indices.length;
  }
  const positions = new Float32Array(v);
  const indices = new Uint32Array(i);
  let vo = 0;
  let io = 0;
  for (const s of soups) {
    positions.set(s.positions, vo);
    const base = vo / 3;
    for (let k = 0; k < s.indices.length; k++) indices[io + k] = s.indices[k]! + base;
    vo += s.positions.length;
    io += s.indices.length;
  }
  return { positions, indices };
}

/** A soup moved by a 4×4 matrix (column-major, as glTF). */
export function transformed(soup: Soup, m: ArrayLike<number>): Soup {
  const p = soup.positions;
  const out = new Float32Array(p.length);
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!;
    const y = p[i + 1]!;
    const z = p[i + 2]!;
    out[i] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
    out[i + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
    out[i + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
  }
  // A mirroring matrix turns the faces inside out: their order is reversed.
  const det = m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) - m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) + m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!);
  if (det >= 0) return { positions: out, indices: soup.indices };
  const idx = soup.indices.slice();
  for (let t = 0; t < idx.length; t += 3) {
    const b = idx[t + 1]!;
    idx[t + 1] = idx[t + 2]!;
    idx[t + 2] = b;
  }
  return { positions: out, indices: idx };
}

/** Keeps only the vertices still used by the triangles. */
export function compact(positions: Float32Array, indices: Uint32Array): Soup {
  const map = new Int32Array(positions.length / 3).fill(-1);
  let n = 0;
  const out = new Uint32Array(indices.length);
  for (let k = 0; k < indices.length; k++) {
    const v = indices[k]!;
    if (map[v] === -1) map[v] = n++;
    out[k] = map[v]!;
  }
  const pos = new Float32Array(n * 3);
  for (let v = 0; v < map.length; v++) {
    const m = map[v]!;
    if (m === -1) continue;
    pos[m * 3] = positions[v * 3]!;
    pos[m * 3 + 1] = positions[v * 3 + 1]!;
    pos[m * 3 + 2] = positions[v * 3 + 2]!;
  }
  return { positions: pos, indices: out };
}

export type Shaded = { positions: Float32Array; normals: Float32Array; indices: Uint32Array };

/**
 * Normals for polished metal: smooth across gentle curves, but a sharp edge
 * (faces more than `angle` degrees apart) stays sharp. A vertex on such an
 * edge is split in one vertex per side.
 */
export function creaseNormals(soup: Soup, angle = 35): Shaded {
  const p = soup.positions;
  const idx = soup.indices;
  const vertexCount = p.length / 3;
  const triCount = idx.length / 3;
  const fn = new Float32Array(triCount * 3); // area-weighted
  const un = new Float32Array(triCount * 3); // unit
  for (let t = 0; t < triCount; t++) {
    const a = idx[t * 3]! * 3;
    const b = idx[t * 3 + 1]! * 3;
    const c = idx[t * 3 + 2]! * 3;
    const ux = p[b]! - p[a]!;
    const uy = p[b + 1]! - p[a + 1]!;
    const uz = p[b + 2]! - p[a + 2]!;
    const vx = p[c]! - p[a]!;
    const vy = p[c + 1]! - p[a + 1]!;
    const vz = p[c + 2]! - p[a + 2]!;
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    fn[t * 3] = nx;
    fn[t * 3 + 1] = ny;
    fn[t * 3 + 2] = nz;
    const len = Math.hypot(nx, ny, nz) || 1;
    un[t * 3] = nx / len;
    un[t * 3 + 1] = ny / len;
    un[t * 3 + 2] = nz / len;
  }
  // Faces around each vertex.
  const start = new Uint32Array(vertexCount + 1);
  for (let k = 0; k < idx.length; k++) start[idx[k]! + 1]!++;
  for (let v = 0; v < vertexCount; v++) start[v + 1]! += start[v]!;
  const fill = start.slice(0, vertexCount);
  const around = new Uint32Array(idx.length);
  for (let k = 0; k < idx.length; k++) around[fill[idx[k]!]!++] = (k / 3) | 0;

  const cos = Math.cos((angle * Math.PI) / 180);
  const outPos: number[] = [];
  const outNor: number[] = [];
  const outIdx = new Uint32Array(idx.length);
  // For each vertex, the normals already made for it and their new numbers.
  const madeStart = new Int32Array(vertexCount).fill(-1);
  const madeNext: number[] = [];
  const madeNormal: number[] = [];
  const madeIndex: number[] = [];
  let count = 0;
  for (let k = 0; k < idx.length; k++) {
    const v = idx[k]!;
    const t = (k / 3) | 0;
    const tx = un[t * 3]!;
    const ty = un[t * 3 + 1]!;
    const tz = un[t * 3 + 2]!;
    let nx = 0;
    let ny = 0;
    let nz = 0;
    for (let j = start[v]!; j < start[v + 1]!; j++) {
      const g = around[j]!;
      if (un[g * 3]! * tx + un[g * 3 + 1]! * ty + un[g * 3 + 2]! * tz >= cos) {
        nx += fn[g * 3]!;
        ny += fn[g * 3 + 1]!;
        nz += fn[g * 3 + 2]!;
      }
    }
    const len = Math.hypot(nx, ny, nz);
    if (len > 0) {
      nx /= len;
      ny /= len;
      nz /= len;
    } else {
      nx = tx;
      ny = ty;
      nz = tz;
    }
    let found = -1;
    for (let m = madeStart[v]!; m !== -1; m = madeNext[m]!) {
      if (madeNormal[m * 3]! * nx + madeNormal[m * 3 + 1]! * ny + madeNormal[m * 3 + 2]! * nz > 0.9999) {
        found = madeIndex[m]!;
        break;
      }
    }
    if (found === -1) {
      found = count++;
      outPos.push(p[v * 3]!, p[v * 3 + 1]!, p[v * 3 + 2]!);
      outNor.push(nx, ny, nz);
      const m = madeIndex.length;
      madeIndex.push(found);
      madeNormal.push(nx, ny, nz);
      madeNext.push(madeStart[v]!);
      madeStart[v] = m;
    }
    outIdx[k] = found;
  }
  return { positions: Float32Array.from(outPos), normals: Float32Array.from(outNor), indices: outIdx };
}

/** Size of the box around positions. */
export function boundsOf(positions: Float32Array): { min: [number, number, number]; max: [number, number, number] } {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const v = positions[i + k]!;
      if (v < min[k]!) min[k] = v;
      if (v > max[k]!) max[k] = v;
    }
  }
  return { min, max };
}

/** A piece seen in a mirror (x turned over), its faces still facing out. */
export function mirrored(soup: Soup): Soup {
  const positions = soup.positions.slice();
  for (let i = 0; i < positions.length; i += 3) positions[i] = -positions[i]!;
  const indices = soup.indices.slice();
  for (let t = 0; t < indices.length; t += 3) {
    const b = indices[t + 1]!;
    indices[t + 1] = indices[t + 2]!;
    indices[t + 2] = b;
  }
  return { positions, indices };
}

/** The same piece with its vertices numbered in order of first use (after its faces were turned over, Rhino numbers them so). */
export function renumbered(soup: Soup): Float32Array {
  const map = new Int32Array(soup.positions.length / 3).fill(-1);
  const out = new Float32Array(soup.positions.length);
  let n = 0;
  for (let k = 0; k < soup.indices.length; k++) {
    const v = soup.indices[k]!;
    if (map[v] !== -1) continue;
    map[v] = n;
    out[n * 3] = soup.positions[v * 3]!;
    out[n * 3 + 1] = soup.positions[v * 3 + 1]!;
    out[n * 3 + 2] = soup.positions[v * 3 + 2]!;
    n++;
  }
  return out;
}

type M3 = number[];

function rotate(m: M3, p: Float32Array, out: Float32Array): void {
  for (let i = 0; i < p.length; i += 3) {
    const x = p[i]!;
    const y = p[i + 1]!;
    const z = p[i + 2]!;
    out[i] = m[0]! * x + m[1]! * y + m[2]! * z;
    out[i + 1] = m[3]! * x + m[4]! * y + m[5]! * z;
    out[i + 2] = m[6]! * x + m[7]! * y + m[8]! * z;
  }
}

/** For each moved vertex, the nearest vertex of the copy, and the largest of these distances. */
function nearest(moved: Float32Array, copy: Float32Array, match: Int32Array, stopAbove = Infinity): number {
  const n = moved.length / 3;
  let worst = 0;
  for (let i = 0; i < n; i++) {
    let best = Infinity;
    let bestJ = -1;
    const x = moved[i * 3]!;
    const y = moved[i * 3 + 1]!;
    const z = moved[i * 3 + 2]!;
    for (let j = 0; j < n; j++) {
      const dx = copy[j * 3]! - x;
      const dy = copy[j * 3 + 1]! - y;
      const dz = copy[j * 3 + 2]! - z;
      const d = dx * dx + dy * dy + dz * dz;
      if (d < best) {
        best = d;
        bestJ = j;
      }
    }
    match[i] = bestJ;
    if (best > worst) worst = best;
    if (worst > stopAbove) return Math.sqrt(worst);
  }
  return Math.sqrt(worst);
}

/** Largest number of vertices of a piece placed without the order of its vertices. */
export const FREE_ALIGN_MAX_VERTICES = 600;

/**
 * Places `model` (centred) on a copy whose vertices are not in the same order:
 * main axes first (turned in small steps around its axis for a round stone),
 * then nearest vertices and alignment, a few times (ICP).
 */
export function alignFree(model: Float32Array, modelShape: Shape, copy: Float32Array, copyShape: Shape, tolerance: number): Placement | null {
  const n = model.length / 3;
  if (n > FREE_ALIGN_MAX_VERTICES || copy.length !== model.length) return null;
  const q = centered(copy, copyShape.center);
  const a = modelShape.axes;
  const b = copyShape.axes;
  const round = modelShape.extents[2] > 0 && modelShape.extents[1] / modelShape.extents[2] >= 0.97;
  const candidates: M3[] = [];
  for (const sx of [1, -1]) {
    for (const sy of [1, -1]) {
      for (const sz of [1, -1]) {
        const s = [sx, sy, sz];
        const m: M3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let k = 0; k < 3; k++) for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r * 3 + c]! += s[k]! * b[k]![r]! * a[k]![c]!;
        const det = m[0]! * (m[4]! * m[8]! - m[5]! * m[7]!) - m[1]! * (m[3]! * m[8]! - m[5]! * m[6]!) + m[2]! * (m[3]! * m[7]! - m[4]! * m[6]!);
        if (det < 0) continue;
        if (!round) {
          candidates.push(m);
          continue;
        }
        // Turned around the axis of the stone (its smallest size) in steps of 5°.
        const [ux, uy, uz] = b[0]!;
        for (let step = 0; step < 72; step++) {
          const t = (step * Math.PI) / 36;
          const c = Math.cos(t);
          const si = Math.sin(t);
          const r: M3 = [c + ux * ux * (1 - c), ux * uy * (1 - c) - uz * si, ux * uz * (1 - c) + uy * si, uy * ux * (1 - c) + uz * si, c + uy * uy * (1 - c), uy * uz * (1 - c) - ux * si, uz * ux * (1 - c) - uy * si, uz * uy * (1 - c) + ux * si, c + uz * uz * (1 - c)];
          const rm: M3 = [0, 0, 0, 0, 0, 0, 0, 0, 0];
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) rm[i * 3 + j]! += r[i * 3 + k]! * m[k * 3 + j]!;
          candidates.push(rm);
        }
      }
    }
  }
  const moved = new Float32Array(model.length);
  const match = new Int32Array(n);
  let best: M3 | null = null;
  let bestError = Infinity;
  for (const m of candidates) {
    rotate(m, model, moved);
    const e = nearest(moved, q, match, bestError * bestError);
    if (e < bestError) {
      bestError = e;
      best = m;
    }
  }
  if (!best || bestError > 0.25 * modelShape.extents[2]) return null;
  // Refine: pair each vertex with its nearest, align, again.
  let placed: Placement | null = null;
  let m = best;
  const ordered = new Float32Array(model.length);
  for (let iteration = 0; iteration < 6; iteration++) {
    rotate(m, model, moved);
    nearest(moved, q, match);
    for (let i = 0; i < n; i++) {
      ordered[i * 3] = copy[match[i]! * 3]!;
      ordered[i * 3 + 1] = copy[match[i]! * 3 + 1]!;
      ordered[i * 3 + 2] = copy[match[i]! * 3 + 2]!;
    }
    placed = align(model, ordered, copyShape.center);
    const [x, y, z, w] = placed.rotation;
    m = [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
    if (placed.error <= tolerance) break;
  }
  if (!placed || placed.error > tolerance) return null;
  // Each vertex must have its own partner.
  const seen = new Uint8Array(n);
  for (let i = 0; i < n; i++) seen[match[i]!] = 1;
  for (let i = 0; i < n; i++) if (!seen[i]) return null;
  return placed;
}

/** Share of the surface taken by its largest flat facet (the table of a cut stone). */
export function tableShare(soup: Soup, size: number): number {
  const p = soup.positions;
  const idx = soup.indices;
  const planes: { nx: number; ny: number; nz: number; d: number; area: number }[] = [];
  let total = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]! * 3;
    const b = idx[t + 1]! * 3;
    const c = idx[t + 2]! * 3;
    const ux = p[b]! - p[a]!;
    const uy = p[b + 1]! - p[a + 1]!;
    const uz = p[b + 2]! - p[a + 2]!;
    const vx = p[c]! - p[a]!;
    const vy = p[c + 1]! - p[a + 1]!;
    const vz = p[c + 2]! - p[a + 2]!;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len === 0) continue;
    total += len / 2;
    nx /= len;
    ny /= len;
    nz /= len;
    const d = nx * p[a]! + ny * p[a + 1]! + nz * p[a + 2]!;
    const plane = planes.find((q) => q.nx * nx + q.ny * ny + q.nz * nz > 0.9999 && Math.abs(q.d - d) < 0.002 * size);
    if (plane) plane.area += len / 2;
    else planes.push({ nx, ny, nz, d, area: len / 2 });
  }
  return total > 0 ? Math.max(0, ...planes.map((q) => q.area)) / total : 0;
}

/** What tells a cut stone from a piece of metal, measured on a piece (see `looksCut`). */
export type CutMeasure = {
  /** Flat facets that hold 95 % of the surface (a cut stone: some tens; a smooth metal surface: thousands). */
  facets: number;
  /** Share of the surface taken by the largest facet (the table). */
  table: number;
  /** Flat surface facing the opposite way, compared with the table (a stone ends in a point or an edge). */
  opposite: number;
  /** Thickness along the table's normal, compared with the smallest width across it (a stone is lower than wide). */
  depth: number;
  /** Share of vertices outside the plane of a facet (convex: none). */
  outside: number;
  /** Narrowest width near the bottom (the last eighth of the thickness), compared with the narrowest width: a stone
   * ends in a point or an edge (small), a bead or a domed piece of metal stays wide (large). */
  tip: number;
  /** Two large facets (5 % of the surface or more) facing exactly opposite ways with the same area (1 for twins): the
   * two ends of a bar or the two sides of a plate of metal. A stone has none. */
  twins: number;
};

/**
 * The facets of a piece and how they stand. The triangles are grouped by plane, whatever their number: a jeweller's
 * export can draw each facet of a stone with thousands of triangles. Null when the piece is plainly not faceted (more
 * than 3000 planes: a smooth surface).
 */
export function cutMeasure(soup: Soup, shape: Shape): CutMeasure | null {
  const p = soup.positions;
  const idx = soup.indices;
  const [cx, cy, cz] = shape.center;
  const size = shape.extents[2];
  const near = 0.003 * size;
  type Plane = { nx: number; ny: number; nz: number; d: number; area: number };
  const planes: Plane[] = [];
  const cells = new Map<string, Plane[]>();
  let total = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t]! * 3;
    const b = idx[t + 1]! * 3;
    const c = idx[t + 2]! * 3;
    const ux = p[b]! - p[a]!;
    const uy = p[b + 1]! - p[a + 1]!;
    const uz = p[b + 2]! - p[a + 2]!;
    const vx = p[c]! - p[a]!;
    const vy = p[c + 1]! - p[a + 1]!;
    const vz = p[c + 2]! - p[a + 2]!;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-14) continue;
    const area = len / 2;
    total += area;
    nx /= len;
    ny /= len;
    nz /= len;
    const d = nx * (p[a]! - cx) + ny * (p[a + 1]! - cy) + nz * (p[a + 2]! - cz);
    const key = Math.round(nx * 60) + "," + Math.round(ny * 60) + "," + Math.round(nz * 60);
    let cell = cells.get(key);
    if (!cell) {
      cell = [];
      cells.set(key, cell);
    }
    const plane = cell.find((q) => q.nx * nx + q.ny * ny + q.nz * nz > 0.9998 && Math.abs(q.d - d) < near);
    if (plane) plane.area += area;
    else {
      const made = { nx, ny, nz, d, area };
      cell.push(made);
      planes.push(made);
      if (planes.length > 3000) return null;
    }
  }
  if (total === 0) return null;
  planes.sort((x, y) => y.area - x.area);
  let covered = 0;
  let facets = 0;
  while (facets < planes.length && covered < 0.95 * total) covered += planes[facets++]!.area;
  const table = planes[0]!;
  let twins = 0;
  const large = planes.filter((q) => q.area >= 0.05 * total);
  for (const [i, q] of large.entries()) {
    for (const r of large.slice(i + 1)) if (q.nx * r.nx + q.ny * r.ny + q.nz * r.nz < -0.995) twins = Math.max(twins, Math.min(q.area, r.area) / Math.max(q.area, r.area));
  }
  let opposite = 0;
  for (const q of planes) if (q.nx * table.nx + q.ny * table.ny + q.nz * table.nz < -0.99) opposite += q.area;
  // Thickness along the table's normal, and widths across it (along the main axes of the piece seen from above).
  const n = p.length / 3;
  const ux = Math.abs(table.nx) < 0.9 ? 1 : 0;
  const uy = ux === 1 ? 0 : 1;
  // Two directions across the table.
  let ax = uy * table.nz - 0 * table.ny;
  let ay = 0 * table.nx - ux * table.nz;
  let az = ux * table.ny - uy * table.nx;
  const al = Math.hypot(ax, ay, az) || 1;
  ax /= al;
  ay /= al;
  az /= al;
  const bx = table.ny * az - table.nz * ay;
  const by = table.nz * ax - table.nx * az;
  const bz = table.nx * ay - table.ny * ax;
  const span = (dx: number, dy: number, dz: number) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < n; i++) {
      const v = p[i * 3]! * dx + p[i * 3 + 1]! * dy + p[i * 3 + 2]! * dz;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    return hi - lo;
  };
  let width = Infinity;
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 8;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    width = Math.min(width, span(ax * c + bx * s, ay * c + by * s, az * c + bz * s));
  }
  const thickness = span(table.nx, table.ny, table.nz);
  // The bottom: the vertices in the last eighth of the thickness, away from the table.
  let top = -Infinity;
  for (let i = 0; i < n; i++) top = Math.max(top, p[i * 3]! * table.nx + p[i * 3 + 1]! * table.ny + p[i * 3 + 2]! * table.nz);
  const bottom: number[] = [];
  for (let i = 0; i < n; i++) if (top - (p[i * 3]! * table.nx + p[i * 3 + 1]! * table.ny + p[i * 3 + 2]! * table.nz) >= 0.875 * thickness) bottom.push(i);
  let tipWidth = Infinity;
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 8;
    const c = Math.cos(angle);
    const s2 = Math.sin(angle);
    const dx = ax * c + bx * s2;
    const dy = ay * c + by * s2;
    const dz = az * c + bz * s2;
    let lo = Infinity;
    let hi = -Infinity;
    for (const i of bottom) {
      const v = p[i * 3]! * dx + p[i * 3 + 1]! * dy + p[i * 3 + 2]! * dz;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    tipWidth = Math.min(tipWidth, bottom.length > 0 ? hi - lo : 0);
  }
  // Convex: no vertex beyond the plane of a main facet (1.5 % of the size), on up to 4000 vertices.
  const main = planes.slice(0, Math.min(facets, 200));
  const step = Math.max(1, Math.floor(n / 4000));
  const tolerance = 0.015 * size;
  let checks = 0;
  let out = 0;
  for (const q of main) {
    let { nx, ny, nz, d } = q;
    if (d < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
      d = -d;
    }
    for (let i = 0; i < n; i += step) {
      checks++;
      if (nx * (p[i * 3]! - cx) + ny * (p[i * 3 + 1]! - cy) + nz * (p[i * 3 + 2]! - cz) - d > tolerance) out++;
    }
  }
  return { facets, table: table.area / total, opposite: opposite / table.area, depth: thickness / Math.max(width, 1e-9), outside: checks > 0 ? out / checks : 1, tip: tipWidth / Math.max(width, 1e-9), twins };
}

/**
 * Whether a piece has the shape of a cut stone, however finely it was exported and even if it is the only one of its
 * kind (the centre stone of a ring). Always: a large flat facet (the table, 4 % of the surface or more) across its
 * thinnest side, no flat side as large opposite (a plate of metal has two), no two large equal facets facing each other
 * (the ends of a bar), and a bottom that ends in a point or an edge (the culet; a bead of metal stays round). Then either flat facets (95 % of its surface on at most 160 planes)
 * and convex (allowing a few twisted facets, as Rhino draws the pavilion of a tapered baguette), or, for the simplified
 * stones some jewellers place (a smooth cone under the table), strictly convex with a stone's proportions. From 0.4
 * to 40 mm.
 */
export function looksCut(soup: Soup, shape: Shape): boolean {
  const size = shape.extents[2];
  if (size < 0.4 || size > 40) return false;
  const m = cutMeasure(soup, shape);
  if (m === null || m.table < 0.04 || m.opposite > 0.3 || m.depth > 1.05 || m.tip > 0.45 || m.twins > 0.7) return false;
  const faceted = m.facets <= 160 && m.outside <= 0.06;
  const simplified = m.outside <= 0.005 && m.opposite <= 0.1 && m.depth >= 0.4 && m.depth <= 0.9 && size <= 15;
  return faceted || simplified;
}
