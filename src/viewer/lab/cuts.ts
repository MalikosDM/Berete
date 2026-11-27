/*
 * The thirteen cuts of the stones' test sheet (27/11/2026), made by code: round brilliant, princess, emerald, asscher,
 * baguette, pear, oval, marquise, heart, cushion, radiant, trillion, octagon. Each one is a closed, flat-faceted solid,
 * table up (+Y), the middle of its girdle at y = 0, its longest side `size` long. Not jewellers' exact proportions:
 * stones close enough to real ones to test the renderer on every family of facets — the brilliant's many small facets,
 * the step cuts' long parallel steps (the "hall of mirrors" of an emerald cut), the pointed or cleft outlines.
 */
import { BufferGeometry, Float32BufferAttribute, Vector3 } from "three";
import { brilliantGeometry } from "./testRing";

export const CUTS = ["round", "princess", "emerald", "asscher", "baguette", "pear", "oval", "marquise", "heart", "cushion", "radiant", "trillion", "octagon"] as const;
export type CutId = (typeof CUTS)[number];

/** French names, for the sheet and the admin. */
export const CUT_NAMES: Record<CutId, string> = {
  round: "Rond brillant",
  princess: "Princesse",
  emerald: "Émeraude",
  asscher: "Asscher",
  baguette: "Baguette",
  pear: "Poire",
  oval: "Ovale",
  marquise: "Marquise",
  heart: "Cœur",
  cushion: "Coussin",
  radiant: "Radiant",
  trillion: "Trillion",
  octagon: "Octogone",
};

type P2 = [number, number];

/* ---------- Outlines (x across, z along; closed, counter-clockwise seen from above, around the origin) ---------- */

function circle(n: number, rx = 1, rz = 1): P2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * rx, Math.sin(a) * rz];
  });
}

/** A rectangle w × h with its corners cut by c (a chamfered rectangle: emerald, asscher, octagon, radiant). */
function chamfered(w: number, h: number, c: number): P2[] {
  const x = w / 2;
  const z = h / 2;
  if (c <= 0) return [[x, -z], [x, z], [-x, z], [-x, -z]];
  return [[x, -z + c], [x, z - c], [x - c, z], [-x + c, z], [-x, z - c], [-x, -z + c], [-x + c, -z], [x - c, -z]];
}

function marquise(n: number): P2[] {
  // A lens: two arcs of radius 1.25 whose centres are 0.75 off the axis (length 2, width 1).
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2;
    const side = t < 1 ? 1 : -1;
    const u = t < 1 ? t : t - 1;
    const zz = -1 + 2 * u;
    const xx = -0.75 + Math.sqrt(1.5625 - zz * zz);
    pts.push(side > 0 ? [xx, zz] : [-xx, -zz]);
  }
  return pts;
}

function pear(n: number): P2[] {
  // A round end (circle of radius 0.62 around z = −0.35) and a point at z = 1, joined by gently curved sides.
  const r = 0.62;
  const cz = -0.35;
  const tip = 1;
  const d = tip - cz;
  const tangent = Math.acos(r / d); // angle of the tangent points from the axis towards the tip
  const pts: P2[] = [];
  const arcN = Math.round(n * 0.62);
  for (let i = 0; i <= arcN; i++) {
    const a = Math.PI / 2 + tangent + (i / arcN) * (2 * Math.PI - 2 * tangent);
    pts.push([Math.cos(a) * r, cz + Math.sin(a) * r]);
  }
  const sideN = Math.round((n - arcN) / 2);
  const start = pts[pts.length - 1]!;
  for (let i = 1; i < sideN; i++) {
    const t = i / sideN;
    const bulge = Math.sin(t * Math.PI) * 0.05;
    pts.push([start[0] * (1 - t) + bulge, start[1] * (1 - t) + tip * t]);
  }
  pts.push([0, tip]);
  const first = pts[0]!;
  for (let i = 1; i < sideN; i++) {
    const t = 1 - i / sideN;
    const bulge = Math.sin(t * Math.PI) * 0.05;
    pts.push([first[0] * (1 - t) - bulge, first[1] * (1 - t) + tip * t]);
  }
  return pts;
}

function heart(n: number): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push([x / 17, y / 17]);
  }
  return pts.reverse();
}

function superellipse(n: number, p: number, rx: number, rz: number): P2[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [Math.sign(c) * Math.abs(c) ** (2 / p) * rx, Math.sign(s) * Math.abs(s) ** (2 / p) * rz];
  });
}

function trillion(n: number): P2[] {
  // A triangle with slightly convex sides and softened corners.
  const corners = [0, 1, 2].map((k) => {
    const a = Math.PI / 2 + (k * 2 * Math.PI) / 3;
    return [Math.cos(a), Math.sin(a)] as P2;
  });
  const pts: P2[] = [];
  const per = Math.floor(n / 3);
  for (let k = 0; k < 3; k++) {
    const a = corners[k]!;
    const b = corners[(k + 1) % 3]!;
    for (let i = 0; i < per; i++) {
      const t = 0.06 + (i / per) * 0.88;
      const mx = a[0] * (1 - t) + b[0] * t;
      const mz = a[1] * (1 - t) + b[1] * t;
      const out = Math.sin(t * Math.PI) * 0.12;
      const len = Math.hypot(mx, mz) || 1;
      pts.push([mx + (mx / len) * out, mz + (mz / len) * out]);
    }
  }
  return pts;
}

/** The point where the ray from the centre at angle `a` leaves the outline (the outline seen as a star from the centre). */
function polar(outline: P2[], a: number, c: P2): P2 {
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  let best = Infinity;
  for (let i = 0; i < outline.length; i++) {
    const p = outline[i]!;
    const q = outline[(i + 1) % outline.length]!;
    const ex = q[0] - p[0];
    const ez = q[1] - p[1];
    const den = dx * ez - dz * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((p[0] - c[0]) * ez - (p[1] - c[1]) * ex) / den;
    const u = ((p[0] - c[0]) * dz - (p[1] - c[1]) * dx) / den;
    if (t > 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) best = Math.min(best, t);
  }
  return [c[0] + dx * best, c[1] + dz * best];
}

/* ---------- Building the solid ---------- */

class Solid {
  positions: number[] = [];
  /** A flat facet (convex, ordered); wound so that its normal points away from `inside`. */
  facet(pts: Vector3[], inside: Vector3) {
    const clean = pts.filter((p, i) => p.distanceTo(pts[(i + 1) % pts.length]!) > 1e-9);
    if (clean.length < 3) return;
    const n = new Vector3();
    for (let i = 0; i < clean.length; i++) {
      const a = clean[i]!;
      const b = clean[(i + 1) % clean.length]!;
      n.x += (a.y - b.y) * (a.z + b.z);
      n.y += (a.z - b.z) * (a.x + b.x);
      n.z += (a.x - b.x) * (a.y + b.y);
    }
    if (n.lengthSq() < 1e-18) return;
    const centre = clean.reduce((s, p) => s.add(p), new Vector3()).divideScalar(clean.length);
    const flip = n.dot(centre.clone().sub(inside)) < 0;
    const list = flip ? [...clean].reverse() : clean;
    for (let i = 1; i + 1 < list.length; i++) {
      for (const p of [list[0]!, list[i]!, list[i + 1]!]) this.positions.push(p.x, p.y, p.z);
    }
  }
  /** Joins two rings point to point (same count): quads, each split along its shorter diagonal if not flat. */
  band(a: Vector3[], b: Vector3[], inside: Vector3) {
    for (let i = 0; i < a.length; i++) {
      const j = (i + 1) % a.length;
      const quad = [a[i]!, a[j]!, b[j]!, b[i]!];
      const n1 = new Vector3().subVectors(quad[1]!, quad[0]!).cross(new Vector3().subVectors(quad[2]!, quad[0]!)).normalize();
      const n2 = new Vector3().subVectors(quad[2]!, quad[0]!).cross(new Vector3().subVectors(quad[3]!, quad[0]!)).normalize();
      if (n1.lengthSq() === 0 || n2.lengthSq() === 0 || n1.dot(n2) > 0.9999) this.facet(quad, inside);
      else {
        this.facet([quad[0]!, quad[1]!, quad[2]!], inside);
        this.facet([quad[0]!, quad[2]!, quad[3]!], inside);
      }
    }
  }
  /** Joins ring a (n points) to ring b (k·n points): a fan from each point of a. */
  stitch(a: Vector3[], b: Vector3[], inside: Vector3) {
    const k = b.length / a.length;
    for (let i = 0; i < a.length; i++) {
      const fan = [a[i]!];
      for (let s = 0; s <= k; s++) fan.push(b[(i * k + s) % b.length]!);
      for (let s = 1; s + 1 < fan.length; s++) this.facet([fan[0]!, fan[s]!, fan[s + 1]!], inside);
      this.facet([a[i]!, b[((i + 1) * k) % b.length]!, a[(i + 1) % a.length]!], inside);
    }
  }
  geometry(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute("position", new Float32BufferAttribute(this.positions, 3));
    g.computeVertexNormals();
    return g;
  }
}

/**
 * A brilliant-style cut on any outline seen as a star from its centre: table (8 sides), 8 stars, 8 kites, 32 upper
 * girdle facets, the girdle, 32 lower girdle facets, 16 pavilion mains to a pointed culet.
 */
function brilliantOn(outline: P2[], centre: P2 = [0, 0]): BufferGeometry {
  const s = new Solid();
  const crown = 0.3;
  const pavilion = 0.86;
  const girdle = 0.03;
  const at = (scale: number, a: number, y: number) => {
    const [x, z] = polar(outline, a, centre);
    return new Vector3(centre[0] + (x - centre[0]) * scale, y, centre[1] + (z - centre[1]) * scale);
  };
  const ring = (n: number, scale: number, y: number, offset = 0) => Array.from({ length: n }, (_, i) => at(scale, ((i + offset) / n) * Math.PI * 2, y));
  const inside = new Vector3(centre[0], 0, centre[1]);
  const table = ring(8, 0.57, crown);
  const stars = ring(8, 0.8, crown * 0.55, 0.5);
  const top = ring(32, 1, girdle);
  const bottom = ring(32, 1, -girdle);
  const lower = ring(16, 0.42, -pavilion * 0.6, 0.5);
  const culet = new Vector3(centre[0], -pavilion, centre[1]);
  s.facet(table, inside);
  for (let i = 0; i < 8; i++) s.facet([table[i]!, stars[i]!, table[(i + 1) % 8]!], inside);
  // Kites (table corner, star before, girdle point, star after), cut in two along the table–girdle line.
  for (let i = 0; i < 8; i++) {
    const g = top[i * 4]!;
    s.facet([table[i]!, stars[(i + 7) % 8]!, g], inside);
    s.facet([table[i]!, g, stars[i]!], inside);
  }
  // Upper girdle facets: each star to the girdle between two kites.
  for (let i = 0; i < 8; i++) for (let k = 0; k < 4; k++) s.facet([stars[i]!, top[i * 4 + k]!, top[(i * 4 + k + 1) % 32]!], inside);
  s.band(top, bottom, inside);
  // Lower girdle facets and the pavilion mains.
  for (let i = 0; i < 16; i++) {
    s.facet([bottom[i * 2]!, bottom[(i * 2 + 1) % 32]!, lower[i]!], inside);
    s.facet([bottom[(i * 2 + 1) % 32]!, bottom[(i * 2 + 2) % 32]!, lower[i]!], inside);
    s.facet([lower[i]!, bottom[(i * 2 + 2) % 32]!, lower[(i + 1) % 16]!], inside);
    s.facet([lower[i]!, lower[(i + 1) % 16]!, culet], inside);
  }
  return s.geometry();
}

/** The outline moved inwards by d (a convex polygon: each side moved parallel to itself), its corners recomputed. */
function inset(poly: P2[], d: number): P2[] {
  const n = poly.length;
  const lines = poly.map((p, i) => {
    const q = poly[(i + 1) % n]!;
    const ex = q[0] - p[0];
    const ez = q[1] - p[1];
    const len = Math.hypot(ex, ez) || 1;
    // Inward normal of a counter-clockwise polygon.
    const nx = -ez / len;
    const nz = ex / len;
    return { p: [p[0] + nx * d, p[1] + nz * d] as P2, e: [ex / len, ez / len] as P2 };
  });
  return lines.map((l, i) => {
    const m = lines[(i + n - 1) % n]!;
    const den = m.e[0] * l.e[1] - m.e[1] * l.e[0];
    if (Math.abs(den) < 1e-12) return l.p;
    const t = ((l.p[0] - m.p[0]) * l.e[1] - (l.p[1] - m.p[1]) * l.e[0]) / den;
    return [m.p[0] + m.e[0] * t, m.p[1] + m.e[1] * t] as P2;
  });
}

/** The part of a convex polygon on the inner side of the line through p along e (Sutherland–Hodgman). */
function clip(poly: P2[], p: P2, e: P2): P2[] {
  const side = (q: P2) => e[0] * (q[1] - p[1]) - e[1] * (q[0] - p[0]);
  const out: P2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa >= 0 !== sb >= 0) {
      const t = sa / (sa - sb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

function closestOnPolygon(poly: P2[], q: P2): P2 {
  let inside = true;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) < -1e-12) inside = false;
  }
  if (inside) return q;
  let best: P2 = poly[0]!;
  let bd = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const ex = b[0] - a[0];
    const ez = b[1] - a[1];
    const len2 = ex * ex + ez * ez || 1e-18;
    const t = Math.max(0, Math.min(1, ((q[0] - a[0]) * ex + (q[1] - a[1]) * ez) / len2));
    const c: P2 = [a[0] + ex * t, a[1] + ez * t];
    const d = Math.hypot(c[0] - q[0], c[1] - q[1]);
    if (d < bd) {
      bd = d;
      best = c;
    }
  }
  return best;
}

/**
 * The outline moved inwards by d, keeping one point per corner of the outline (so that the steps join point to point):
 * where a short side has vanished, its corners meet on the true inset polygon (the steps of the pavilion end in a keel,
 * never cross).
 */
function insetClamped(poly: P2[], d: number, half: number): P2[] {
  const k = Math.min(d, half * 0.995);
  const naive = inset(poly, k);
  let true_ = poly;
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i]!;
    const q = poly[(i + 1) % n]!;
    const ex = q[0] - p[0];
    const ez = q[1] - p[1];
    const len = Math.hypot(ex, ez) || 1;
    const nx = -ez / len;
    const nz = ex / len;
    true_ = clip(true_, [p[0] + nx * k, p[1] + nz * k], [ex / len, ez / len]);
    if (true_.length < 3) return naive.map(() => [0, 0] as P2);
  }
  return naive.map((v) => closestOnPolygon(true_, v));
}

/**
 * A step cut on a convex outline: three steps from the girdle to the table on the crown, four steps on the pavilion to a
 * keel (a line: the long, parallel facets of an emerald cut).
 */
function stepOn(outline: P2[], keelDepth = 0.62): BufferGeometry {
  const s = new Solid();
  const xs = outline.map((p) => p[0]);
  const zs = outline.map((p) => p[1]);
  const half = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2;
  const girdle = 0.025 * half * 2;
  const crown = 0.22 * half * 2;
  const inside = new Vector3(0, 0, 0);
  const ring = (poly: P2[], y: number) => poly.map(([x, z]) => new Vector3(x, y, z));
  const top = ring(outline, girdle);
  const bottom = ring(outline, -girdle);
  const crownSteps = [
    ring(insetClamped(outline, half * 0.12, half), girdle + crown * 0.42),
    ring(insetClamped(outline, half * 0.22, half), girdle + crown * 0.76),
    ring(insetClamped(outline, half * 0.3, half), girdle + crown),
  ];
  s.band(top, bottom, inside);
  s.band(crownSteps[0]!, top, inside);
  s.band(crownSteps[1]!, crownSteps[0]!, inside);
  s.band(crownSteps[2]!, crownSteps[1]!, inside);
  s.facet(crownSteps[2]!, inside);
  const depth = keelDepth * half * 2;
  const pav = [0.3, 0.6, 0.85, 1].map((t, k) => ring(insetClamped(outline, half * t, half), -girdle - depth * [0.25, 0.55, 0.82, 1][k]!));
  s.band(bottom, pav[0]!, inside);
  s.band(pav[0]!, pav[1]!, inside);
  s.band(pav[1]!, pav[2]!, inside);
  s.band(pav[2]!, pav[3]!, inside);
  // The keel: the last ring is flat (a line or a thin sliver); close it.
  s.facet([...pav[3]!].reverse(), inside);
  return s.geometry();
}

/** A cut, its longest side `size` long (any unit), table up, the girdle's middle at y = 0. */
export function cutGeometry(cut: CutId, size: number): BufferGeometry {
  let g: BufferGeometry;
  switch (cut) {
    case "round":
      g = brilliantGeometry(1);
      break;
    case "princess":
      g = brilliantOn(chamfered(1.8, 1.8, 0.02));
      break;
    case "radiant":
      g = brilliantOn(chamfered(1.6, 2, 0.28));
      break;
    case "oval":
      g = brilliantOn(circle(128, 0.7, 1));
      break;
    case "marquise":
      g = brilliantOn(marquise(128));
      break;
    case "pear":
      g = brilliantOn(pear(128), [0, -0.2]);
      break;
    case "heart":
      g = brilliantOn(heart(160), [0, 0.05]);
      break;
    case "cushion":
      g = brilliantOn(superellipse(128, 3.2, 1, 1.08));
      break;
    case "trillion":
      g = brilliantOn(trillion(120));
      break;
    case "emerald":
      g = stepOn(chamfered(1.38, 2, 0.24));
      break;
    case "asscher":
      g = stepOn(chamfered(2, 2, 0.5), 0.6);
      break;
    case "baguette":
      g = stepOn(chamfered(0.8, 2, 0), 0.55);
      break;
    case "octagon":
      g = stepOn(chamfered(2, 2, 0.586), 0.6);
      break;
  }
  g.computeBoundingBox();
  const box = g.boundingBox!;
  const longest = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  const cx = (box.max.x + box.min.x) / 2;
  const cz = (box.max.z + box.min.z) / 2;
  g.translate(-cx, 0, -cz);
  g.scale(size / longest, size / longest, size / longest);
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}
