/*
 * Meshing the NURBS of a Rhino file ourselves (26/11/2026). A jeweller's .3dm often keeps its volumes as NURBS
 * polysurfaces without the render mesh Rhino draws them with (saved with "Save small", or never shown shaded), and
 * rhino3dm.js cannot make one. Each face is meshed here from what rhino3dm gives of it: its surface (a NURBS, evaluated
 * here with its derivatives) and the 3D curves of its edges (rhino3dm gives no 2D trimming curves):
 * - each edge is cut once, finer where it bends, and its points are shared by the faces it borders (no crack); its
 *   ends are the vertices of the polysurface;
 * - each point of a face's loops is found on the surface (its u, v) by Newton steps from its neighbour, else from the
 *   nearest points of a coarse grid (where a derivative vanishes, at a triple knot, Newton stops short), and only then
 *   on the surface extended a little past its ends (an edge may run beyond its surface within the file's tolerance);
 * - on a closed surface, a seam (an edge found twice in a loop) is put on the side of the domain the loop goes along it
 *   (counter-clockwise), the other points follow their neighbours; at a pole (a side shrunk to one point) the free
 *   parameter is the one of the next point of the edge;
 * - a flat face is triangulated in its plane from its loops alone; a curved face gets a grid of points inside its
 *   loops, as fine as its curvature asks (within CHORD of the surface, ANGLE at most between neighbouring normals), is
 *   triangulated in its (u, v) stretched to the lengths of the surface (cdt2d keeps the loops), then made Delaunay by
 *   flipping (no sliver); a surface shrunk to a curve has no area and gives nothing;
 * - the triangles of each face are checked: their area must be the area inside its loops, every point of its loops must
 *   lie on the surface. A face that fails is left out and its volume counted as not meshed (the model stays a draft).
 * On Yoni's three files (26/11/2026: 3 234 faces, 264 closed volumes) every face is meshed and every closed volume comes
 * out without a crack, within the boxes Rhino gives (.local/scripts/import-nurbs.ts).
 * Lengths are in the units of the file until the end; the soup returned is in mm.
 */
import cdt2d from "cdt2d";
import { weld, type Soup } from "./geometry.js";

/** Largest distance between the triangles and the surface (mm). */
export const CHORD = 0.005;
/** Largest angle between the normals of two neighbouring points (radians): smooth polished gold. */
export const ANGLE = (10 * Math.PI) / 180;
/** Longest side of a triangle on a curved face (mm). */
const MAX_EDGE = 1;
/** Points of a face's grid, at most. */
const MAX_GRID = 40_000;
/** A point of a loop farther from its surface than this (mm) was not found on it: the face fails. */
const OFF_SURFACE = 0.05;

/** Why the last face failed, and its number of points (read by the check scripts). */
export const trace: { reason: string; points: number; verbose: boolean; loops: string[]; input?: { points: [number, number][]; loops: number[][] } } = { reason: "", points: 0, verbose: false, loops: [] };
function fail(reason: string): null {
  trace.reason = reason;
  return null;
}

type List<T> = { count: number; get(i: number): T };
export type RhinoCurve = { domain: number[]; spanCount: number; pointAt(t: number): number[]; isLinear(): boolean };
type RhinoKnots = { count: number; get(i: number): number };
type RhinoNurbsSurface = {
  degree(direction: number): number;
  isClosed(direction: number): boolean;
  knotsU(): RhinoKnots;
  knotsV(): RhinoKnots;
  points(): { countU: number; countV: number; get(u: number, v: number): number[] };
  delete?: () => void;
};
type RhinoSurface = { toNurbsSurface(): RhinoNurbsSurface | null };
type RhinoTrim = { edgeIndex: number; isReversed: boolean; startVertexIndex: number; endVertexIndex: number };
type RhinoFace = { orientationIsReversed: boolean; underlyingSurface(): RhinoSurface | null; loops: List<{ trims: List<RhinoTrim> }> };
export type RhinoBrep = { faces(): List<RhinoFace>; edges(): List<RhinoCurve>; vertices(): List<{ location: number[] }> };

type V3 = [number, number, number];

/* ---------- NURBS surfaces ---------- */

/** The span of the knots `K` (one extra knot at each end, as in the books) that holds t. `last`: number of points − 1. */
function spanOf(K: Float64Array, deg: number, last: number, t: number): number {
  if (t >= K[last + 1]!) {
    let s = last;
    while (s > deg && K[s]! >= K[last + 1]!) s--;
    return s;
  }
  if (t <= K[deg]!) {
    let s = deg;
    while (s < last && K[s + 1]! <= K[deg]!) s++;
    return s;
  }
  let lo = deg;
  let hi = last + 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (t < K[mid]!) hi = mid;
    else lo = mid;
  }
  return lo;
}

/** The deg + 1 basis functions at t and their first derivatives (Piegl & Tiller, A2.3). `ndu`: (deg + 1)² numbers. */
function basisAt(K: Float64Array, deg: number, span: number, t: number, N: Float64Array, D: Float64Array, ndu: Float64Array, left: Float64Array, right: Float64Array): void {
  const w = deg + 1;
  ndu[0] = 1;
  for (let j = 1; j <= deg; j++) {
    left[j] = t - K[span + 1 - j]!;
    right[j] = K[span + j]! - t;
    let saved = 0;
    for (let r = 0; r < j; r++) {
      const gap = right[r + 1]! + left[j - r]!;
      ndu[j * w + r] = gap;
      const temp = gap !== 0 ? ndu[r * w + j - 1]! / gap : 0;
      ndu[r * w + j] = saved + right[r + 1]! * temp;
      saved = left[j - r]! * temp;
    }
    ndu[j * w + j] = saved;
  }
  for (let r = 0; r <= deg; r++) {
    N[r] = ndu[r * w + deg]!;
    let d = 0;
    if (r >= 1) {
      const gap = ndu[deg * w + r - 1]!;
      if (gap !== 0) d += ndu[(r - 1) * w + deg - 1]! / gap;
    }
    if (r <= deg - 1) {
      const gap = ndu[deg * w + r]!;
      if (gap !== 0) d -= ndu[r * w + deg - 1]! / gap;
    }
    D[r] = deg * d;
  }
}

/** A NURBS surface copied out of rhino3dm: evaluated here (thousands of points per face, with derivatives). */
export class Nurbs {
  readonly u0: number;
  readonly u1: number;
  readonly v0: number;
  readonly v1: number;
  private readonly Nu: Float64Array;
  private readonly Du: Float64Array;
  private readonly Nv: Float64Array;
  private readonly Dv: Float64Array;
  private readonly work: Float64Array;
  private readonly left: Float64Array;
  private readonly right: Float64Array;
  /** S, ∂S/∂u, ∂S/∂v of the last evaluation. */
  readonly out = new Float64Array(9);

  constructor(
    readonly p: number,
    readonly q: number,
    readonly nu: number,
    readonly nv: number,
    readonly U: Float64Array,
    readonly V: Float64Array,
    /** Homogeneous points (x·w, y·w, z·w, w), point (i, j) at (i·nv + j)·4. */
    readonly cw: Float64Array,
    readonly closedU: boolean,
    readonly closedV: boolean,
  ) {
    this.u0 = U[p]!;
    this.u1 = U[nu]!;
    this.v0 = V[q]!;
    this.v1 = V[nv]!;
    this.Nu = new Float64Array(p + 1);
    this.Du = new Float64Array(p + 1);
    this.Nv = new Float64Array(q + 1);
    this.Dv = new Float64Array(q + 1);
    const m = Math.max(p, q) + 1;
    this.work = new Float64Array(m * m);
    this.left = new Float64Array(m + 1);
    this.right = new Float64Array(m + 1);
  }

  /** The NURBS form of a rhino3dm surface (null when it has none). */
  static of(surface: RhinoSurface | null): Nurbs | null {
    const ns = surface?.toNurbsSurface();
    if (!ns) return null;
    try {
      const p = ns.degree(0);
      const q = ns.degree(1);
      const points = ns.points();
      const nu = points.countU;
      const nv = points.countV;
      const ku = ns.knotsU();
      const kv = ns.knotsV();
      if (p < 1 || q < 1 || nu <= p || nv <= q || ku.count !== nu + p - 1 || kv.count !== nv + q - 1) return null;
      // openNURBS keeps no knot at the very ends: one is added on each side (never used by the evaluation).
      const full = (k: RhinoKnots) => {
        const out = new Float64Array(k.count + 2);
        for (let i = 0; i < k.count; i++) out[i + 1] = k.get(i);
        out[0] = out[1]!;
        out[k.count + 1] = out[k.count]!;
        return out;
      };
      const cw = new Float64Array(nu * nv * 4);
      for (let i = 0; i < nu; i++) {
        for (let j = 0; j < nv; j++) {
          const c = points.get(i, j);
          const o = (i * nv + j) * 4;
          cw[o] = c[0]!;
          cw[o + 1] = c[1]!;
          cw[o + 2] = c[2]!;
          cw[o + 3] = c.length > 3 && c[3]! > 0 ? c[3]! : 1;
        }
      }
      const U = full(ku);
      const V = full(kv);
      if (!(U[nu]! > U[p]!) || !(V[nv]! > V[q]!) || !cw.every(Number.isFinite)) return null;
      return new Nurbs(p, q, nu, nv, U, V, cw, ns.isClosed(0), ns.isClosed(1));
    } finally {
      ns.delete?.();
    }
  }

  /** Point and first derivatives at (u, v), in `out`. */
  eval(u: number, v: number): Float64Array {
    const { p, q, nv, cw, Nu, Du, Nv, Dv, out } = this;
    const su = spanOf(this.U, p, this.nu - 1, u);
    const sv = spanOf(this.V, q, nv - 1, v);
    basisAt(this.U, p, su, u, Nu, Du, this.work, this.left, this.right);
    basisAt(this.V, q, sv, v, Nv, Dv, this.work, this.left, this.right);
    let x = 0, y = 0, z = 0, w = 0, xu = 0, yu = 0, zu = 0, wu = 0, xv = 0, yv = 0, zv = 0, wv = 0;
    for (let i = 0; i <= p; i++) {
      const row = (su - p + i) * nv + sv - q;
      for (let j = 0; j <= q; j++) {
        const o = (row + j) * 4;
        const b = Nu[i]! * Nv[j]!;
        const bu = Du[i]! * Nv[j]!;
        const bv = Nu[i]! * Dv[j]!;
        const cx = cw[o]!, cy = cw[o + 1]!, cz = cw[o + 2]!, cww = cw[o + 3]!;
        x += b * cx;
        y += b * cy;
        z += b * cz;
        w += b * cww;
        xu += bu * cx;
        yu += bu * cy;
        zu += bu * cz;
        wu += bu * cww;
        xv += bv * cx;
        yv += bv * cy;
        zv += bv * cz;
        wv += bv * cww;
      }
    }
    if (!(w > 0)) w = 1e-12;
    const X = x / w, Y = y / w, Z = z / w;
    out[0] = X;
    out[1] = Y;
    out[2] = Z;
    out[3] = (xu - wu * X) / w;
    out[4] = (yu - wu * Y) / w;
    out[5] = (zu - wu * Z) / w;
    out[6] = (xv - wv * X) / w;
    out[7] = (yv - wv * Y) / w;
    out[8] = (zv - wv * Z) / w;
    return out;
  }

  point(u: number, v: number): V3 {
    const o = this.eval(u, v);
    return [o[0]!, o[1]!, o[2]!];
  }

  /** The euclidean point (i, j). */
  cv(i: number, j: number): V3 {
    const o = (i * this.nv + j) * 4;
    const w = this.cw[o + 3]!;
    return [this.cw[o]! / w, this.cw[o + 1]! / w, this.cw[o + 2]! / w];
  }

  /** The distinct knots inside the domain, along u (0) or v (1). */
  breaks(dir: 0 | 1): number[] {
    const K = dir === 0 ? this.U : this.V;
    const lo = dir === 0 ? this.u0 : this.v0;
    const hi = dir === 0 ? this.u1 : this.v1;
    const out = [lo];
    for (const k of K) if (k > out[out.length - 1]! && k < hi) out.push(k);
    out.push(hi);
    return out;
  }

  /**
   * t brought back into the domain: around a closed direction; else kept within `beyond` × the domain past its ends (an
   * edge of the file may run a little beyond its surface, on the surface extended).
   */
  wrap(dir: 0 | 1, t: number, beyond = 0): number {
    const lo = dir === 0 ? this.u0 : this.v0;
    const hi = dir === 0 ? this.u1 : this.v1;
    if (dir === 0 ? this.closedU : this.closedV) {
      const period = hi - lo;
      while (t < lo) t += period;
      while (t > hi) t -= period;
      return t;
    }
    const m = beyond * (hi - lo);
    return Math.min(hi + m, Math.max(lo - m, t));
  }
}

const sub = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!];
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
const cross = (a: ArrayLike<number>, b: ArrayLike<number>): V3 => [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
const len = (a: ArrayLike<number>) => Math.hypot(a[0]!, a[1]!, a[2]!);
const angle = (a: ArrayLike<number>, b: ArrayLike<number>) => {
  const la = len(a);
  const lb = len(b);
  if (la === 0 || lb === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (la * lb))));
};

/** The unit normal at (u, v) of the last evaluation (null at a pole). */
function normalOf(o: Float64Array): V3 | null {
  const n = cross([o[3]!, o[4]!, o[5]!], [o[6]!, o[7]!, o[8]!]);
  const l = len(n);
  return l > 1e-14 ? [n[0] / l, n[1] / l, n[2] / l] : null;
}

/* ---------- Tolerances in the units of the file ---------- */

type Tol = { chord: number; edge: number; offSurface: number; pole: number; plane: number };

/* ---------- How finely a curved face is cut ---------- */

/**
 * The parameters of the grid lines along u (0) or v (1): each knot span cut in as many equal parts as the surface bends
 * there (within the chord tolerance, ANGLE between neighbouring normals and tangents, no part longer than `maxEdge`).
 */
function gridParams(s: Nurbs, dir: 0 | 1, tol: Tol, angleTol: number): { params: number[]; spacing: number } {
  const spans = s.breaks(dir);
  const others = s.breaks(dir === 0 ? 1 : 0);
  const olo = others[0]!;
  const ohi = others[others.length - 1]!;
  // Iso-lines measured: the ends, three in between and some knots of the other direction.
  const at = new Set<number>([olo, ohi, olo + (ohi - olo) * 0.25, olo + (ohi - olo) * 0.5, olo + (ohi - olo) * 0.75]);
  const step = Math.max(1, Math.ceil(others.length / 6));
  for (let k = 0; k < others.length; k += step) at.add(others[k]!);
  const params = [spans[0]!];
  let spacing = Infinity;
  const m = 8;
  for (let k = 0; k + 1 < spans.length; k++) {
    const a = spans[k]!;
    const b = spans[k + 1]!;
    let need = 1;
    let longest = 0;
    for (const t of at) {
      let length = 0;
      let turnT = 0;
      let turnN = 0;
      let prevP: V3 | null = null;
      let prevD: V3 | null = null;
      let prevN: V3 | null = null;
      for (let i = 0; i <= m; i++) {
        const x = a + ((b - a) * i) / m;
        const o = dir === 0 ? s.eval(x, t) : s.eval(t, x);
        const P: V3 = [o[0]!, o[1]!, o[2]!];
        const n = normalOf(o);
        if (prevP) {
          const d = sub(P, prevP);
          length += len(d);
          if (prevD && len(d) > 0) turnT += angle(prevD, d);
          if (len(d) > 0) prevD = d;
        }
        if (n && prevN) turnN += angle(prevN, n);
        if (n) prevN = n;
        prevP = P;
      }
      longest = Math.max(longest, length);
      const chordParts = turnT > 0 && length > 0 ? Math.sqrt((turnT * length) / (8 * tol.chord)) : 0;
      need = Math.max(need, Math.ceil(Math.max(turnN / angleTol, turnT / angleTol, chordParts, length / tol.edge) - 1e-9));
    }
    need = Math.min(need, 64);
    if (longest > 0) spacing = Math.min(spacing, longest / need);
    for (let i = 1; i <= need; i++) params.push(a + ((b - a) * i) / need);
  }
  return { params, spacing };
}

/* ---------- Edges ---------- */

type EdgeSamples = { ids: number[]; points: V3[] };

/** Points along an edge: its spans, cut again where the chord leaves the curve, it turns, or a part is longer than `maxLen`. */
function sampleEdge(curve: RhinoCurve, tol: Tol, angleTol: number, maxLen: number): V3[] {
  const [t0, t1] = curve.domain as [number, number];
  const at = (t: number): V3 => {
    const p = curve.pointAt(t);
    return [p[0]!, p[1]!, p[2]!];
  };
  const linear = curve.isLinear();
  const first = linear ? 1 : Math.max(4, Math.min(64, (curve.spanCount | 0) * 2));
  const out: V3[] = [at(t0)];
  let budget = 4000;
  const refine = (ta: number, pa: V3, tb: number, pb: V3, depth: number) => {
    const chord = sub(pb, pa);
    const chordLen = len(chord);
    let split = chordLen > maxLen;
    let tm = 0;
    let pm: V3 | null = null;
    if (!linear || split) {
      tm = (ta + tb) / 2;
      pm = at(tm);
      if (!linear) {
        // Distance from the middle point to the chord, and the turn at it.
        const am = sub(pm, pa);
        const off = chordLen > 0 ? len(cross(am, chord)) / chordLen : len(am);
        split ||= off > tol.chord || angle(am, sub(pb, pm)) > angleTol;
      }
    }
    if (split && pm && depth < 14 && budget-- > 0) {
      refine(ta, pa, tm, pm, depth + 1);
      refine(tm, pm, tb, pb, depth + 1);
    } else out.push(pb);
  };
  let ta = t0;
  let pa = out[0]!;
  for (let k = 1; k <= first; k++) {
    const tb = t0 + ((t1 - t0) * k) / first;
    const pb = at(tb);
    refine(ta, pa, tb, pb, 0);
    ta = tb;
    pa = pb;
  }
  return out;
}

/* ---------- Faces ---------- */

/** A point of a loop on its face: its vertex, its place, its (u, v); `pole`: at a side shrunk to a point; `fixedU/V`: on a seam. */
type LoopPoint = { id: number; P: V3; u: number; v: number; pole: boolean; fixedU?: boolean; fixedV?: boolean };

/** Signed area of a closed polygon. */
function areaOf(points: readonly (readonly [number, number])[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const q = points[(i + 1) % points.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/**
 * Triangles inside loops of points: `loops` are lists of point numbers into `points`; an edge found twice (a seam
 * crossed there and back) cancels itself. cdt2d keeps the edges of the loops (its own Delaunay pass is far too slow on
 * thousands of points); `smooth`: the triangles are then made Delaunay by flipping (no sliver on a curved face). Null
 * when the triangles do not fill the loops exactly.
 */
function triangulate(points: [number, number][], loops: number[][], smooth: boolean): [number, number, number][] | null {
  if (trace.verbose) trace.input = { points, loops };
  const counts = new Map<string, [number, number, number]>();
  for (const loop of loops) {
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i]!;
      const b = loop[(i + 1) % loop.length]!;
      if (a === b) continue;
      const key = Math.min(a, b) + ":" + Math.max(a, b);
      const c = counts.get(key);
      if (c) c[2]++;
      else counts.set(key, [a, b, 1]);
    }
  }
  const edges: [number, number][] = [];
  for (const [a, b, n] of counts.values()) if (n % 2 === 1) edges.push([a, b]);
  if (edges.length < 3) return fail("fewer than 3 edges");
  let tris: [number, number, number][];
  try {
    tris = cdt2d(points, edges, { exterior: false, delaunay: false });
  } catch (e) {
    return fail("cdt2d: " + String(e));
  }
  let expected = 0;
  for (const loop of loops) expected += areaOf(loop.map((i) => points[i]!));
  expected = Math.abs(expected);
  let got = 0;
  for (const t of tris) {
    const [a, b, c] = [points[t[0]]!, points[t[1]]!, points[t[2]]!];
    const s = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    if (s < 0) {
      const k = t[1];
      t[1] = t[2];
      t[2] = k;
    }
    got += Math.abs(s) / 2;
  }
  if (!(expected > 0) || Math.abs(got - expected) > 0.005 * expected) return fail("area " + got.toPrecision(4) + " for " + expected.toPrecision(4));
  if (smooth) flipToDelaunay(points, tris, edges);
  return tris;
}

/**
 * Lawson's flips: an edge whose opposite corner lies inside the circle of a triangle is swapped for the other diagonal,
 * until none is left; the edges of the loops are never swapped. Triangles counter-clockwise, changed in place.
 */
function flipToDelaunay(points: [number, number][], tris: [number, number, number][], fixedEdges: [number, number][]): void {
  const n = tris.length;
  const N = points.length;
  const V = new Int32Array(n * 3);
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) V[t * 3 + k] = tris[t]![k]!;
  const next = (h: number) => (h % 3 === 2 ? h - 2 : h + 1);
  const prev = (h: number) => (h % 3 === 0 ? h + 2 : h - 1);
  const opp = new Int32Array(n * 3).fill(-1);
  const open = new Map<number, number>();
  for (let h = 0; h < n * 3; h++) {
    const a = V[h]!;
    const b = V[next(h)]!;
    const back = open.get(b * N + a);
    if (back !== undefined) {
      opp[h] = back;
      opp[back] = h;
      open.delete(b * N + a);
    } else open.set(a * N + b, h);
  }
  const fixed = new Set<number>(fixedEdges.map(([a, b]) => Math.min(a, b) * N + Math.max(a, b)));
  const orient = (a: number, b: number, c: number) => {
    const A = points[a]!, B = points[b]!, C = points[c]!;
    return (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
  };
  // Whether d lies inside the circle through a, b, c (counter-clockwise), beyond rounding.
  const inside = (a: number, b: number, c: number, d: number) => {
    const D = points[d]!;
    const adx = points[a]![0] - D[0], ady = points[a]![1] - D[1];
    const bdx = points[b]![0] - D[0], bdy = points[b]![1] - D[1];
    const cdx = points[c]![0] - D[0], cdy = points[c]![1] - D[1];
    const al = adx * adx + ady * ady, bl = bdx * bdx + bdy * bdy, cl = cdx * cdx + cdy * cdy;
    const det = al * (bdx * cdy - cdx * bdy) - bl * (adx * cdy - cdx * ady) + cl * (adx * bdy - bdx * ady);
    const scale = al * (Math.abs(bdx * cdy) + Math.abs(cdx * bdy)) + bl * (Math.abs(adx * cdy) + Math.abs(cdx * ady)) + cl * (Math.abs(adx * bdy) + Math.abs(bdx * ady));
    return det > 1e-9 * scale;
  };
  const stack: number[] = [];
  for (let h = 0; h < n * 3; h++) if (opp[h]! > h) stack.push(h);
  let budget = 60 * n + 1000;
  while (stack.length > 0 && budget-- > 0) {
    const h = stack.pop()!;
    const o = opp[h]!;
    if (o < 0) continue;
    const a = V[h]!;
    const b = V[next(h)]!;
    if (fixed.has(Math.min(a, b) * N + Math.max(a, b))) continue;
    const c = V[prev(h)]!;
    const d = V[prev(o)]!;
    if (!inside(a, b, c, d) || orient(c, a, d) <= 0 || orient(d, b, c) <= 0) continue;
    // (a, b, c) and (b, a, d) become (c, a, d) and (d, b, c).
    const A = opp[next(h)]!; // b→c
    const B = opp[prev(h)]!; // c→a
    const C = opp[next(o)]!; // a→d
    const D = opp[prev(o)]!; // d→b
    const t1 = h - (h % 3);
    const t2 = o - (o % 3);
    V[t1] = c;
    V[t1 + 1] = a;
    V[t1 + 2] = d;
    V[t2] = d;
    V[t2 + 1] = b;
    V[t2 + 2] = c;
    const link = (x: number, y: number) => {
      opp[x] = y;
      if (y >= 0) opp[y] = x;
    };
    link(t1, B);
    link(t1 + 1, C);
    link(t2, D);
    link(t2 + 1, A);
    link(t1 + 2, t2 + 2);
    stack.push(t1, t1 + 1, t2, t2 + 1);
  }
  for (let t = 0; t < n; t++) tris[t] = [V[t * 3]!, V[t * 3 + 1]!, V[t * 3 + 2]!];
}

/** What meshing a polysurface gave: its triangles (mm), its faces, those that failed. */
export type BrepMesh = { soup: Soup | null; faces: number; failed: number };

/**
 * The triangles of a polysurface (a Brep of rhino3dm), in mm. `scale`: mm per unit of the file. Faces that cannot be
 * meshed reliably are left out and counted in `failed`.
 */
export type FaceReport = { face: number; flat: boolean; grid: [number, number]; points: number; ms: number; failed: string | null };

export function meshBrep(brep: RhinoBrep, scale: number, options: { angle?: number; onFace?: (report: FaceReport) => void } = {}): BrepMesh {
  const angleTol = options.angle ?? ANGLE;
  const tol: Tol = { chord: CHORD / scale, edge: MAX_EDGE / scale, offSurface: OFF_SURFACE / scale, pole: 0.002 / scale, plane: 0.0002 / scale };
  const faceList = brep.faces();
  const edgeList = brep.edges();
  const vertexList = brep.vertices();
  const positions: number[] = [];
  const add = (p: ArrayLike<number>) => {
    positions.push(p[0]!, p[1]!, p[2]!);
    return positions.length / 3 - 1;
  };
  const brepVertex: number[] = [];
  for (let i = 0; i < vertexList.count; i++) brepVertex.push(add(vertexList.get(i).location));

  // The faces: surface, loops of trims, flat or curved; which faces each edge borders, and the vertices at its ends.
  type Trim = { edge: number; reversed: boolean };
  type Face = { surface: Nurbs | null; reversed: boolean; loops: Trim[][]; flat: boolean; empty?: boolean; grid: { u: number[]; v: number[] } | null; spacing: number };
  const faces: Face[] = [];
  const edgeEnds = new Map<number, [number, number]>();
  const edgeFaces = new Map<number, number[]>();
  for (let f = 0; f < faceList.count; f++) {
    const face = faceList.get(f);
    const surface = Nurbs.of(face.underlyingSurface());
    const loops: Trim[][] = [];
    const loopList = face.loops;
    for (let l = 0; l < loopList.count; l++) {
      const trims = loopList.get(l).trims;
      const loop: Trim[] = [];
      for (let t = 0; t < trims.count; t++) {
        const trim = trims.get(t);
        loop.push({ edge: trim.edgeIndex, reversed: trim.isReversed });
        if (trim.edgeIndex < 0) continue;
        edgeEnds.set(trim.edgeIndex, trim.isReversed ? [trim.endVertexIndex, trim.startVertexIndex] : [trim.startVertexIndex, trim.endVertexIndex]);
        const list = edgeFaces.get(trim.edgeIndex) ?? [];
        if (!list.includes(f)) list.push(f);
        edgeFaces.set(trim.edgeIndex, list);
      }
      loops.push(loop);
    }
    faces.push({ surface, reversed: face.orientationIsReversed, loops, flat: false, grid: null, spacing: Infinity });
  }

  // Flat faces need no point inside; curved ones get their grid. A surface shrunk to a curve or a point has no area:
  // nothing to draw.
  for (const face of faces) {
    const s = face.surface;
    if (!s) continue;
    if (shrunk(s, tol)) {
      face.empty = true;
      continue;
    }
    face.flat = isFlat(s, tol);
    if (face.flat) continue;
    let chord = tol.chord;
    let edge = tol.edge;
    let angleNow = angleTol;
    for (let attempt = 0; attempt < 4; attempt++) {
      const u = gridParams(s, 0, { ...tol, chord, edge }, angleNow);
      const v = gridParams(s, 1, { ...tol, chord, edge }, angleNow);
      face.grid = { u: u.params, v: v.params };
      // Edges follow the coarser direction (an edge along the fine one is cut by its own curvature).
      face.spacing = Math.max(u.spacing === Infinity ? 0 : u.spacing, v.spacing === Infinity ? 0 : v.spacing) || Infinity;
      if (u.params.length * v.params.length <= MAX_GRID) break;
      chord *= 2;
      edge *= 1.5;
      angleNow *= 1.5;
    }
  }

  // Each edge cut once: no longer than the grid of the curved faces it borders.
  const edges = new Map<number, EdgeSamples>();
  for (const [e, ends] of edgeEnds) {
    let maxLen = Infinity;
    for (const f of edgeFaces.get(e) ?? []) if (!faces[f]!.flat && faces[f]!.surface) maxLen = Math.min(maxLen, Math.max(1.2 * faces[f]!.spacing, tol.chord * 4));
    const points = sampleEdge(edgeList.get(e), tol, angleTol, Math.min(maxLen, tol.edge * 4));
    // The ends are the vertices of the polysurface, shared with the other edges.
    const ids = points.map((p, k) => {
      const end = k === 0 ? ends[0] : k === points.length - 1 ? ends[1] : -1;
      if (end < 0 || end >= vertexList.count) return add(p);
      points[k] = Array.from(vertexList.get(end).location).slice(0, 3) as V3;
      return brepVertex[end]!;
    });
    edges.set(e, { ids, points });
  }

  const indices: number[] = [];
  let failed = 0;
  for (const [f, face] of faces.entries()) {
    if (face.empty) continue;
    const started = performance.now();
    trace.reason = face.surface ? "" : "no NURBS surface";
    trace.points = 0;
    const tris = face.surface ? meshFace(face.surface, face, edges, positions, add, tol) : null;
    options.onFace?.({ face: f, flat: face.flat, grid: [face.grid?.u.length ?? 0, face.grid?.v.length ?? 0], points: trace.points, ms: performance.now() - started, failed: tris ? null : trace.reason || "?" });
    if (!tris) {
      failed++;
      continue;
    }
    for (let t = 0; t < tris.length; t += 3) {
      const a = tris[t]!;
      const b = tris[t + 1]!;
      const c = tris[t + 2]!;
      if (a === b || b === c || a === c) continue;
      if (face.reversed) indices.push(a, c, b);
      else indices.push(a, b, c);
    }
  }
  const soup = indices.length > 0 ? weld(positions, indices, scale) : null;
  return { soup: soup && soup.indices.length > 0 ? soup : null, faces: faces.length, failed };
}

/** A surface whose rows (or columns) of points all coincide: it is a curve or a point, without any area. */
function shrunk(s: Nurbs, tol: Tol): boolean {
  const same = (a: V3, b: V3) => len(sub(a, b)) <= tol.pole * 0.1;
  let rows = true;
  let columns = true;
  for (let i = 0; i < s.nu && (rows || columns); i++) {
    for (let j = 0; j < s.nv; j++) {
      if (rows && i > 0 && !same(s.cv(i, j), s.cv(0, j))) rows = false;
      if (columns && j > 0 && !same(s.cv(i, j), s.cv(i, 0))) columns = false;
    }
  }
  return rows || columns;
}

/** A surface whose points all lie in one plane. */
function isFlat(s: Nurbs, tol: Tol): boolean {
  const n = frameNormal(s);
  if (!n) return false;
  const o = s.point((s.u0 + s.u1) / 2, (s.v0 + s.v1) / 2);
  for (let i = 0; i < s.nu; i++) for (let j = 0; j < s.nv; j++) if (Math.abs(dot(sub(s.cv(i, j), o), n)) > tol.plane) return false;
  return true;
}

/** The normal of the surface (u × v) at its middle, or at the first point of a coarse grid where it has one. */
function frameNormal(s: Nurbs): V3 | null {
  for (const [a, b] of [[0.5, 0.5], [0.25, 0.25], [0.75, 0.75], [0.25, 0.75], [0.75, 0.25], [0.1, 0.9], [0.9, 0.1]] as const) {
    const n = normalOf(s.eval(s.u0 + (s.u1 - s.u0) * a, s.v0 + (s.v1 - s.v0) * b));
    if (n) return n;
  }
  return null;
}

/** The sides of a surface shrunk to one point (poles): 0 v = v0, 1 u = u1, 2 v = v1, 3 u = u0. */
export function polesOf(s: Nurbs, tol: Tol): { side: number; at: V3 }[] {
  const out: { side: number; at: V3 }[] = [];
  const sides: [number, () => V3[]][] = [
    [0, () => Array.from({ length: s.nu }, (_, i) => s.cv(i, 0))],
    [1, () => Array.from({ length: s.nv }, (_, j) => s.cv(s.nu - 1, j))],
    [2, () => Array.from({ length: s.nu }, (_, i) => s.cv(i, s.nv - 1))],
    [3, () => Array.from({ length: s.nv }, (_, j) => s.cv(0, j))],
  ];
  for (const [side, points] of sides) {
    const list = points();
    if (list.every((p) => len(sub(p, list[0]!)) <= tol.pole * 0.1)) out.push({ side, at: list[0]! });
  }
  return out;
}

/** The (u, v) of a point of the surface, by Newton steps from (u, v); also its distance to the surface. */
export function project(s: Nurbs, P: V3, u: number, v: number, beyond = 0): { u: number; v: number; d: number } {
  const distance = (a: number, b: number) => {
    const o = s.eval(a, b);
    return Math.hypot(o[0]! - P[0], o[1]! - P[1], o[2]! - P[2]);
  };
  let current = distance(u, v);
  for (let iter = 0; iter < 24; iter++) {
    const o = s.eval(u, v);
    const r = [o[0]! - P[0], o[1]! - P[1], o[2]! - P[2]];
    const Su = [o[3]!, o[4]!, o[5]!];
    const Sv = [o[6]!, o[7]!, o[8]!];
    const a = dot(Su, Su);
    const b = dot(Su, Sv);
    const c = dot(Sv, Sv);
    const g1 = dot(Su, r);
    const g2 = dot(Sv, r);
    const det = a * c - b * b;
    let du: number;
    let dv: number;
    if (det > 1e-12 * a * c && det > 0) {
      du = -(c * g1 - b * g2) / det;
      dv = -(a * g2 - b * g1) / det;
    } else if (a >= c && a > 0) {
      du = -g1 / a;
      dv = 0;
    } else if (c > 0) {
      du = 0;
      dv = -g2 / c;
    } else break;
    // Never more than a quarter of the domain at once.
    const qu = (s.u1 - s.u0) / 4;
    const qv = (s.v1 - s.v0) / 4;
    du = Math.max(-qu, Math.min(qu, du));
    dv = Math.max(-qv, Math.min(qv, dv));
    // A step that goes away from the point is halved: the steps never leave the hollow of the surface they start in.
    let nu = s.wrap(0, u + du, beyond);
    let nv = s.wrap(1, v + dv, beyond);
    let next = distance(nu, nv);
    for (let k = 0; k < 8 && next > current; k++) {
      du /= 2;
      dv /= 2;
      nu = s.wrap(0, u + du, beyond);
      nv = s.wrap(1, v + dv, beyond);
      next = distance(nu, nv);
    }
    if (next > current) break;
    u = nu;
    v = nv;
    current = next;
    if (Math.abs(du) * Math.sqrt(a) + Math.abs(dv) * Math.sqrt(c) < 1e-10) break;
  }
  // The point found on the surface extended keeps the (u, v) of the nearest side.
  return { u: s.wrap(0, u), v: s.wrap(1, v), d: current };
}

/** How far past the ends of its domain a surface is extended to find the points of its edges. */
const BEYOND = 0.05;

/** A coarse grid of the surface, to start Newton from the nearest of its points. */
export function searchGrid(s: Nurbs): { u: number; v: number; P: V3 }[] {
  const along = (dir: 0 | 1) => {
    const br = s.breaks(dir);
    const out: number[] = [];
    const per = Math.max(3, Math.min(6, Math.floor(60 / br.length)));
    for (let k = 0; k + 1 < br.length; k++) for (let i = 0; i < per; i++) out.push(br[k]! + ((br[k + 1]! - br[k]!) * i) / per);
    out.push(br[br.length - 1]!);
    return out;
  };
  const out: { u: number; v: number; P: V3 }[] = [];
  for (const u of along(0)) for (const v of along(1)) out.push({ u, v, P: s.point(u, v) });
  return out;
}

/**
 * Newton from the given guess, then from the nearest points of the coarse grid if it does not reach the point; on the
 * surface extended past its ends only when the point is not found on the surface itself.
 */
function locate(s: Nurbs, P: V3, guess: { u: number; v: number } | null, grid: () => { u: number; v: number; P: V3 }[], tol: Tol): { u: number; v: number; d: number } {
  // Found exactly: no other start is tried. Close (edges lie on their faces within the tolerance of the file, often
  // 0.001 to 0.01 mm): the surface extended is not tried. Newton can stop short where a derivative vanishes (a triple
  // knot), a little off the point: the other starts find it.
  const exact = tol.chord * 0.004;
  const close = tol.offSurface * 0.2;
  let best = guess ? project(s, P, guess.u, guess.v) : null;
  if (best && best.d <= exact) return best;
  const seeds = grid()
    .map((g) => ({ g, d: len(sub(g.P, P)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 8)
    .map(({ g }) => g);
  for (const g of seeds) {
    const r = project(s, P, g.u, g.v);
    if (!best || r.d < best.d) best = r;
    if (best.d <= exact) return best;
  }
  if (best!.d <= close) return best!;
  for (const g of [best!, ...seeds.slice(0, 3)]) {
    const r = project(s, P, g.u, g.v, BEYOND);
    if (r.d < best!.d) best = r;
    if (best!.d <= exact) break;
  }
  return best!;
}

/**
 * The triangles of one face (vertex numbers), or null when it cannot be meshed reliably. Points along the edges are
 * the edges' own (shared); points inside are added to `positions`.
 */
function meshFace(
  s: Nurbs,
  face: { reversed: boolean; loops: { edge: number; reversed: boolean }[][]; flat: boolean; grid: { u: number[]; v: number[] } | null },
  edges: Map<number, EdgeSamples>,
  positions: number[],
  add: (p: ArrayLike<number>) => number,
  tol: Tol,
): number[] | null {
  // The loops as runs of edge points, one run per trim (the last point of a run is the first of the next). An edge
  // found twice in a loop is a seam: the loop goes along it on both sides of the domain of a closed surface.
  type Run = { id: number; P: V3 }[] & { seam?: boolean };
  const runs: Run[][] = [];
  for (const loop of face.loops) {
    const list: Run[] = [];
    for (const trim of loop) {
      if (trim.edge < 0) continue; // a trim along a pole: no edge, the loop goes straight on
      const samples = edges.get(trim.edge);
      if (!samples) return fail("edge without points");
      let points = samples.ids.map((id, k) => ({ id, P: samples.points[k]! }));
      if (trim.reversed) points = points.reverse();
      const run: Run = points;
      run.seam = loop.filter((t) => t.edge === trim.edge).length > 1;
      list.push(run);
    }
    if (list.length > 0) runs.push(list);
  }
  if (runs.length === 0) return fail("no loop");

  if (face.flat) {
    // In the plane of the face: its loops alone.
    const n = frameNormal(s);
    if (!n) return fail("no normal");
    const e1 = Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 1, 0]);
    const l1 = len(e1);
    const ex: V3 = [e1[0] / l1, e1[1] / l1, e1[2] / l1];
    const ey = cross(n, ex);
    const origin = runs[0]![0]![0]!.P;
    const points: [number, number][] = [];
    const ids: number[] = [];
    const index = new Map<number, number>();
    const at = new Map<string, number>();
    const loops: number[][] = [];
    for (const list of runs) {
      const loop: number[] = [];
      for (const run of list) {
        for (let k = 0; k + 1 < run.length; k++) {
          const { id, P } = run[k]!;
          let i = index.get(id);
          if (i === undefined) {
            const d = sub(P, origin);
            const x = dot(d, ex);
            const y = dot(d, ey);
            // Two vertices at the same place (not welded in the file) are one point of the plane.
            const key = x.toPrecision(12) + ":" + y.toPrecision(12);
            i = at.get(key);
            if (i === undefined) {
              i = points.length;
              points.push([x, y]);
              ids.push(id);
              at.set(key, i);
            }
            index.set(id, i);
          }
          if (loop[loop.length - 1] !== i) loop.push(i);
        }
      }
      while (loop.length > 1 && loop[0] === loop[loop.length - 1]) loop.pop();
      if (loop.length >= 2) loops.push(loop);
    }
    const tris = triangulate(points, loops, false);
    if (!tris) return null;
    trace.points = points.length;
    return tris.flatMap((t) => [ids[t[0]]!, ids[t[1]]!, ids[t[2]]!]);
  }

  // A curved face: each point of its loops found on the surface.
  if (!face.grid) return fail("no grid");
  let coarse: { u: number; v: number; P: V3 }[] | null = null;
  const grid = () => (coarse ??= searchGrid(s));
  const poles = polesOf(s, tol);
  const loopsUv: LoopPoint[][] = [];
  for (const list of runs) {
    const loop: LoopPoint[] = [];
    let guess: { u: number; v: number } | null = null;
    for (const run of list) {
      const placed: LoopPoint[] = [];
      for (const { id, P } of run) {
        const pole = poles.find((q) => len(sub(P, q.at)) <= tol.pole);
        const r = locate(s, P, guess, grid, tol);
        if (!pole && r.d > tol.offSurface) return fail("point off the surface by " + r.d.toPrecision(3));
        const point: LoopPoint = { id, P, u: r.u, v: r.v, pole: Boolean(pole) };
        if (pole) {
          if (pole.side === 0) point.v = s.v0;
          else if (pole.side === 2) point.v = s.v1;
          else if (pole.side === 1) point.u = s.u1;
          else point.u = s.u0;
        }
        placed.push(point);
        if (!pole) guess = { u: point.u, v: point.v };
      }
      // At a pole, the free parameter is the one of the nearest point of the same trim.
      for (const [k, point] of placed.entries()) {
        if (!point.pole) continue;
        const side = poles.find((q) => len(sub(point.P, q.at)) <= tol.pole)!.side;
        let near: LoopPoint | undefined;
        for (let d = 1; d < placed.length && !near; d++) near = [placed[k - d], placed[k + d]].find((x) => x && !x.pole);
        if (!near) continue;
        if (side === 0 || side === 2) point.u = near.u;
        else point.v = near.v;
      }
      // A seam of a surface closed along u: the outer loop goes up it at u1 and down it at u0 (counter-clockwise);
      // closed along v: along it at v0 towards u1, back at v1. Which way it goes is read inside the run (a seam all
      // around a closed surface starts and ends at the same corner).
      if (run.seam && placed.length >= 2) {
        // How far the run stays from the ends of the domain (a seam found within the tolerance of the file).
        const off = (dir: 0 | 1) => {
          const lo = dir === 0 ? s.u0 : s.v0;
          const hi = dir === 0 ? s.u1 : s.v1;
          let worst = 0;
          for (const p of placed) {
            const t = dir === 0 ? p.u : p.v;
            worst = Math.max(worst, Math.min(Math.abs(t - lo), Math.abs(hi - t)) / (hi - lo));
          }
          return worst;
        };
        const way = (dir: 0 | 1) => {
          const period = dir === 0 ? s.u1 - s.u0 : s.v1 - s.v0;
          let sum = 0;
          for (let k = 1; k < placed.length; k++) {
            const d = dir === 0 ? placed[k]!.u - placed[k - 1]!.u : placed[k]!.v - placed[k - 1]!.v;
            if (Math.abs(d) < period / 2) sum += d;
          }
          return sum;
        };
        const offU = s.closedU ? off(0) : Infinity;
        const offV = s.closedV ? off(1) : Infinity;
        if (offU <= offV && offU < 0.05 && way(1) !== 0) {
          const u = way(1) > 0 ? s.u1 : s.u0;
          for (const p of placed) {
            p.u = u;
            p.fixedU = true;
          }
        } else if (offV < 0.05 && way(0) !== 0) {
          const v = way(0) > 0 ? s.v0 : s.v1;
          for (const p of placed) {
            p.v = v;
            p.fixedV = true;
          }
        }
      }
      loop.push(...placed.slice(0, -1));
    }
    if (loop.length >= 2) loopsUv.push(loop);
  }
  if (loopsUv.length === 0) return fail("loops too short");

  if (trace.verbose) {
    trace.loops = [
      `domain u ${s.u0}..${s.u1} v ${s.v0}..${s.v1} closed ${s.closedU}/${s.closedV} poles ${poles.map((p) => p.side).join(",")} deg ${s.p}x${s.q} cvs ${s.nu}x${s.nv}`,
      ...runs.map((list) => list.map((run) => (run.seam ? "S" : "") + run.length).join(" ")),
      ...loopsUv.map((loop) => loop.map((p) => `${p.u.toFixed(4)},${p.v.toFixed(4)}${p.pole ? "P" : ""}${p.fixedU ? "U" : ""}${p.fixedV ? "V" : ""}`).join(" ")),
    ];
  }
  // Elsewhere along a closed surface, each point takes the side of the domain its neighbour is on.
  for (const loop of loopsUv) {
    for (const dir of [0, 1] as const) {
      if (!(dir === 0 ? s.closedU : s.closedV)) continue;
      const lo = dir === 0 ? s.u0 : s.v0;
      const hi = dir === 0 ? s.u1 : s.v1;
      const period = hi - lo;
      const get = (p: LoopPoint) => (dir === 0 ? p.u : p.v);
      const set = (p: LoopPoint, t: number) => (dir === 0 ? (p.u = t) : (p.v = t));
      const fixed = (p: LoopPoint) => (dir === 0 ? p.fixedU : p.fixedV) === true;
      // Start from the point least likely to be on the wrong side: on a seam already placed, else the farthest from it.
      let start = loop.findIndex(fixed);
      if (start < 0) {
        let far = 1e-6 * period;
        for (const [k, p] of loop.entries()) {
          const room = Math.min(get(p) - lo, hi - get(p));
          if (!p.pole && room > far) {
            far = room;
            start = k;
          }
        }
      }
      if (start < 0) continue;
      for (let i = 1; i < loop.length; i++) {
        const k = (start + i) % loop.length;
        if (fixed(loop[k]!)) continue;
        const prev = get(loop[(k - 1 + loop.length) % loop.length]!);
        const t = get(loop[k]!);
        let best = t;
        for (const c of [t - period, t + period]) if (Math.abs(c - prev) < Math.abs(best - prev)) best = c;
        set(loop[k]!, best);
      }
      if (loop.some((p) => get(p) < lo - 1e-3 * period || get(p) > hi + 1e-3 * period)) return fail("loop beyond the seam");
    }
  }

  // In (u, v) stretched to the average lengths of the surface.
  const { u: gu, v: gv } = face.grid;
  let su = 0;
  let sv = 0;
  let n = 0;
  for (let i = 0; i < gu.length; i += Math.max(1, Math.floor(gu.length / 12))) {
    for (let j = 0; j < gv.length; j += Math.max(1, Math.floor(gv.length / 12))) {
      const o = s.eval(gu[i]!, gv[j]!);
      su += Math.hypot(o[3]!, o[4]!, o[5]!);
      sv += Math.hypot(o[6]!, o[7]!, o[8]!);
      n++;
    }
  }
  su = su / n || 1;
  sv = sv / n || 1;
  const points: [number, number][] = [];
  const ids: (number | null)[] = [];
  const uv: [number, number][] = [];
  const index = new Map<string, number>();
  const pointOf = (u: number, v: number, id: number | null) => {
    const key = (u * su).toPrecision(12) + ":" + (v * sv).toPrecision(12);
    let i = index.get(key);
    if (i === undefined) {
      i = points.length;
      points.push([u * su, v * sv]);
      uv.push([u, v]);
      ids.push(id);
      index.set(key, i);
    }
    return i;
  };
  const loops: number[][] = [];
  const segments: [number, number, number, number][] = [];
  for (const loop of loopsUv) {
    const list: number[] = [];
    for (const p of loop) {
      const i = pointOf(p.u, p.v, p.id);
      if (list[list.length - 1] !== i) list.push(i);
    }
    while (list.length > 1 && list[0] === list[list.length - 1]) list.pop();
    if (list.length < 2) continue;
    loops.push(list);
    for (let k = 0; k < list.length; k++) {
      const a = points[list[k]!]!;
      const b = points[list[(k + 1) % list.length]!]!;
      segments.push([a[0], a[1], b[0], b[1]]);
    }
  }
  if (loops.length === 0) return fail("no loop in (u, v)");

  // The grid inside the loops, away from them (no sliver against an edge).
  const hash = new SegmentHash(segments);
  for (let j = 1; j + 1 < gv.length; j++) {
    const v = gv[j]!;
    const y = v * sv;
    const crossings: number[] = [];
    for (const [ax, ay, bx, by] of segments) if (ay <= y !== by <= y) crossings.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
    crossings.sort((a, b) => a - b);
    let c = 0;
    for (let i = 1; i + 1 < gu.length; i++) {
      const x = gu[i]! * su;
      while (c < crossings.length && crossings[c]! < x) c++;
      if (c % 2 === 0) continue;
      const room = 0.4 * Math.min(((gu[i + 1]! - gu[i - 1]!) / 2) * su, ((gv[j + 1]! - gv[j - 1]!) / 2) * sv);
      if (hash.near(x, y, room)) continue;
      pointOf(gu[i]!, v, null);
    }
  }
  const tris = triangulate(points, loops, true);
  if (!tris) return null;
  trace.points = points.length;
  const out: number[] = [];
  for (const t of tris) {
    for (const k of t) {
      let id = ids[k]!;
      if (id === null) {
        id = add(s.point(uv[k]![0], uv[k]![1]));
        ids[k] = id;
      }
      out.push(id);
    }
  }
  return out;
}

/** Segments of the loops in cells, to find quickly whether a point is close to one. */
class SegmentHash {
  private readonly cells = new Map<number, number[]>();
  private readonly size: number;
  private readonly x0: number;
  private readonly y0: number;

  constructor(private readonly segments: [number, number, number, number][]) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [ax, ay, bx, by] of segments) {
      minX = Math.min(minX, ax, bx);
      minY = Math.min(minY, ay, by);
      maxX = Math.max(maxX, ax, bx);
      maxY = Math.max(maxY, ay, by);
    }
    this.x0 = minX;
    this.y0 = minY;
    this.size = Math.max(maxX - minX, maxY - minY, 1e-12) / 64;
    for (const [s, [ax, ay, bx, by]] of segments.entries()) {
      const i0 = Math.floor((Math.min(ax, bx) - minX) / this.size);
      const i1 = Math.floor((Math.max(ax, bx) - minX) / this.size);
      const j0 = Math.floor((Math.min(ay, by) - minY) / this.size);
      const j1 = Math.floor((Math.max(ay, by) - minY) / this.size);
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const key = i * 100003 + j;
          const list = this.cells.get(key);
          if (list) list.push(s);
          else this.cells.set(key, [s]);
        }
      }
    }
  }

  /** Whether a segment passes within `r` of (x, y). */
  near(x: number, y: number, r: number): boolean {
    const i0 = Math.floor((x - r - this.x0) / this.size);
    const i1 = Math.floor((x + r - this.x0) / this.size);
    const j0 = Math.floor((y - r - this.y0) / this.size);
    const j1 = Math.floor((y + r - this.y0) / this.size);
    const seen = new Set<number>();
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        for (const s of this.cells.get(i * 100003 + j) ?? []) {
          if (seen.has(s)) continue;
          seen.add(s);
          const [ax, ay, bx, by] = this.segments[s]!;
          const dx = bx - ax;
          const dy = by - ay;
          const l2 = dx * dx + dy * dy;
          const t = l2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
          if (Math.hypot(ax + t * dx - x, ay + t * dy - y) < r) return true;
        }
      }
    }
    return false;
  }
}
