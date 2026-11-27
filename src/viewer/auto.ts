/*
 * The engine's own choices (27/11/2026): a file opened without any setting comes out right at once. For each layer of the
 * jewel it decides whether it is a stone or metal — by its name first (Metal, Gem, Diamond, pierre…), then by its shape
 * (a small closed solid of flat facets, often repeated, is a stone; smooth curved surfaces are metal) — and, for the
 * stones, which family of cut it is: a step cut (emerald, baguette, asscher, octagon: long parallel facets in four to
 * eight directions) or a brilliant-style cut (round, oval, pear…: facets in many directions). From that it chooses the
 * stones' lighting, the bounces of the light and the way of drawing them, as a jeweller's renderer expert would.
 * The admin's « Revenir au réglage parfait » puts every layer back to these choices.
 */
import { Matrix4, Quaternion, Vector3, type BufferGeometry, type InstancedMesh, type Mesh } from "three";
import type { LayerSetting } from "@/data/models";
import type { DiamondParams } from "@/data/scene3d";
import { stoneShape } from "./gems";

export type CutFamily = "step" | "brilliant";

export type LayerAnalysis = {
  kind: "stone" | "metal";
  /** Only for stones of one cut (not for many stones joined in one mesh). */
  cut: CutFamily | null;
  /** How many stones (instances) the layer holds. */
  copies: number;
  /** Longest side of one stone (or of the layer), millimetres. */
  sizeMm: number;
  triangles: number;
  /** Why, in simple French (the admin shows it). */
  why: string;
  /** The whole layer lies apart from the jewel in the file (a leftover, a reference): hidden unless shown. */
  apart?: boolean;
};

const STONE_NAME = /(^|[^a-z])(gem|gems|diamond|diamant|diamants|stone|stones|pierre|pierres|brillant|ruby|rubis|sapphire|saphir|emerald|emeraude|émeraude|crystal|cz)([^a-z]|$)|^gem ?\d|^diamond/i;
const METAL_NAME = /(^|[^a-z])(metal|métal|metals|gold|or|platinum|platine|silver|argent|head|prong|prongs|griffe|griffes|shank|band|anneau|chaton|setting|bezel)([^a-z]|$)|^metal ?\d/i;

/** What the name of a layer says, if anything. */
export function roleByName(name: string): "stone" | "metal" | null {
  const n = name.trim();
  if (/^stone_(round|fancy)/i.test(n)) return "stone";
  if (STONE_NAME.test(n)) return "stone";
  if (METAL_NAME.test(n)) return "metal";
  return null;
}

/**
 * Facets of a stone: the share of its area carried by its 40 most common directions (a cut stone: nearly all of it; a
 * smooth metal surface: little), and the number of directions around its table axis (step cut: few).
 */
function facets(geometry: BufferGeometry, table: Vector3): { flat: number; azimuths: number; inclined: number } {
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const count = index ? index.count : pos.count;
  const bins = new Map<string, number>();
  const az = new Map<number, number>();
  let total = 0;
  let inclined = 0;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  const n = new Vector3();
  const u = new Vector3(1, 0, 0);
  if (Math.abs(table.x) > 0.9) u.set(0, 0, 1);
  const e1 = new Vector3().crossVectors(table, u).normalize();
  const e2 = new Vector3().crossVectors(table, e1).normalize();
  const step = Math.max(1, Math.floor(count / 3 / 20000)) * 3;
  for (let k = 0; k + 2 < count; k += step) {
    a.fromBufferAttribute(pos, index ? index.getX(k) : k);
    b.fromBufferAttribute(pos, index ? index.getX(k + 1) : k + 1);
    c.fromBufferAttribute(pos, index ? index.getX(k + 2) : k + 2);
    n.subVectors(b, a).cross(c.sub(a));
    const area = n.length();
    if (area === 0) continue;
    n.divideScalar(area);
    total += area;
    const key = Math.round(n.x * 40) + "," + Math.round(n.y * 40) + "," + Math.round(n.z * 40);
    bins.set(key, (bins.get(key) ?? 0) + area);
    const up = Math.abs(n.dot(table));
    // Crown and pavilion facets lean 15° to 75° from the table; a plate of metal (a letter, a disc) has only faces
    // parallel to it and sides square to it.
    if (up > 0.26 && up < 0.966) inclined += area;
    // Neither the table (or culet) nor the girdle: the crown and pavilion facets.
    if (up > 0.15 && up < 0.97) {
      const angle = Math.atan2(n.dot(e2), n.dot(e1));
      const bin = Math.round(((angle + Math.PI) / (2 * Math.PI)) * 36) % 36;
      az.set(bin, (az.get(bin) ?? 0) + area);
    }
  }
  const sorted = [...bins.values()].sort((x, y) => y - x);
  const top = sorted.slice(0, 40).reduce((s, v) => s + v, 0);
  const azTotal = [...az.values()].reduce((s, v) => s + v, 0) || 1;
  const azimuths = [...az.values()].filter((v) => v / azTotal > 0.02).length;
  return { flat: total > 0 ? top / total : 0, azimuths, inclined: total > 0 ? inclined / total : 0 };
}

/** Reads one layer of the jewel (its meshes) and says what it is. */
export function analyseLayer(name: string, meshes: Mesh[], pipelineGuess?: string): LayerAnalysis {
  const first = meshes[0];
  let copies = 0;
  let triangles = 0;
  for (const m of meshes) {
    const g = m.geometry as BufferGeometry;
    const tri = (g.getIndex()?.count ?? g.getAttribute("position").count) / 3;
    const inst = (m as unknown as InstancedMesh).isInstancedMesh ? (m as unknown as InstancedMesh).count : 1;
    copies += inst;
    triangles += tri;
  }
  const byName = roleByName(name);
  if (!first) return { kind: byName ?? "metal", cut: null, copies, sizeMm: 0, triangles, why: "Partie vide." };
  const geometry = first.geometry as BufferGeometry;
  const shape = stoneShape(geometry);
  // The size of one stone in the world (instances carry their own scale).
  const scale = new Vector3();
  const world = new Matrix4().copy(first.matrixWorld);
  if ((first as unknown as InstancedMesh).isInstancedMesh) {
    const im = new Matrix4();
    (first as unknown as InstancedMesh).getMatrixAt(0, im);
    world.multiply(im);
  }
  world.decompose(new Vector3(), new Quaternion(), scale);
  const sizeMm = shape.size * Math.max(scale.x, scale.y, scale.z) * 1000;
  const joined = Boolean(geometry.getAttribute("_gemup"));
  const f = facets(geometry, shape.table);
  const perCopy = triangles / Math.max(1, copies);
  // A stone's shape: small, faceted (most of its area in few directions), most of it in facets leaning from its table
  // (crown and pavilion), convex for one cut. Strong evidence only: a flat letter of metal is faceted too.
  const faceted = f.flat > 0.8;
  const small = sizeMm > 0 && sizeMm < 25;
  const shapeSaysStone = joined || (faceted && small && f.inclined > 0.45 && (shape.convex || perCopy < 400));
  void perCopy;
  let kind: "stone" | "metal";
  let why: string;
  if (byName) {
    kind = byName;
    why = kind === "stone" ? "Reconnue comme pierre par son nom." : "Reconnue comme métal par son nom.";
    if (kind === "metal" && shapeSaysStone && copies >= 6) {
      kind = "stone";
      why = "Nommée comme du métal, mais sa forme est celle de pierres taillées (" + copies + " exemplaires) : traitée comme pierre.";
    }
  } else if (shapeSaysStone) {
    kind = "stone";
    why = joined ? "Pierres serties dans le métal, retrouvées par leur forme." : "Reconnue comme pierre par sa forme (facettes taillées" + (copies > 1 ? ", " + copies + " exemplaires" : "") + ").";
  } else if (pipelineGuess === "diamond") {
    kind = "stone";
    why = "Reconnue comme pierre à l'import.";
  } else if (pipelineGuess === "metal" || pipelineGuess === undefined) {
    kind = "metal";
    why = faceted ? "Facettes planes mais sans couronne ni pavillon (une plaque, une lettre) : reconnue comme métal." : "Surfaces lisses : reconnue comme métal.";
  } else {
    kind = "metal";
    why = "Surfaces lisses : reconnue comme métal.";
  }
  const cut: CutFamily | null = kind === "stone" && !joined ? (f.azimuths > 0 && f.azimuths <= 14 ? "step" : "brilliant") : null;
  return { kind, cut, copies, sizeMm: Math.round(sizeMm * 100) / 100, triangles, why };
}

/** The role the engine gives a layer that has no setting of its own. */
export function autoLayer(a: LayerAnalysis | undefined, guess?: string): LayerSetting {
  const kind = a?.kind ?? (guess === "diamond" ? "stone" : "metal");
  return kind === "stone" ? { role: "diamond" } : { role: "metal", metal: "white-gold" };
}

/**
 * The stones' lighting the engine chooses for a family of cut: bands in steps for the step cuts (their long facets each
 * catch one), the white tent for the others (its thin dark seams draw the arrows of a brilliant); measured on the 13 cuts
 * of the test sheet (27/11/2026).
 */
export function autoGemEnv(cut: CutFamily | null): string {
  return cut === "step" ? "gem-escalier" : "gem-tente";
}

/**
 * The stone settings the engine adjusts by itself when the layer does not set them: more bounces for step cuts and large
 * stones (their long inner paths), fewer for a pavé of small stones (where they cost and do not show).
 */
export function autoDiamond(a: LayerAnalysis | undefined, own: Partial<DiamondParams> | undefined): Partial<DiamondParams> {
  const out: Partial<DiamondParams> = {};
  if (!a || a.kind !== "stone") return out;
  if (own?.rayBounces === undefined) out.rayBounces = a.cut === "step" ? 8 : a.sizeMm >= 4 ? 7 : a.copies >= 30 ? 4 : 5;
  return out;
}

/**
 * A pendant modelled lying flat (its thickness under half its other sides, its middle filled — not a bracelet or a ring
 * lying down) is stood up facing the camera, its stones in front, its bail up (27/11/2026: the client's Rhino pendants
 * opened lying on the ground, seen at an angle). The bail is found where the box reaches farther than the bulk of the
 * jewel (a narrow loop at one end pulls the box, not the bulk). Null: the file's own pose is the right one.
 */
export function uprightPose(points: Vector3[], stones: Vector3[]): Quaternion | null {
  if (points.length < 50) return null;
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  const mean = new Vector3();
  for (const p of points) {
    min.min(p);
    max.max(p);
    mean.add(p);
  }
  mean.divideScalar(points.length);
  const size = new Vector3().subVectors(max, min);
  const center = new Vector3().addVectors(min, max).multiplyScalar(0.5);
  if (!(size.y < 0.5 * Math.min(size.x, size.z))) return null;
  let middle = 0;
  for (const p of points) if (Math.abs(p.x - center.x) < 0.15 * size.x && Math.abs(p.z - center.z) < 0.15 * size.z) middle++;
  if (middle / points.length < 0.02) return null;
  // The stones' side faces the camera.
  let stoneY = 0;
  for (const p of stones) stoneY += p.y;
  const front = stones.length > 0 && stoneY / stones.length < center.y ? -1 : 1;
  const tilt = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (front * Math.PI) / 2);
  // The bail: of the four ends of the stood-up jewel, the one whose last slice is narrowest compared with the jewel's
  // width (a loop at one end); turned up by a quarter turn (a jewel is drawn square to the axes of its file).
  const flat = points.map((p) => p.clone().sub(center).applyQuaternion(tilt));
  let best = { ratio: 0.6, turn: 0 };
  for (const [dx, dy, turn] of [
    [0, 1, 0],
    [1, 0, Math.PI / 2],
    [0, -1, Math.PI],
    [-1, 0, -Math.PI / 2],
  ] as const) {
    let far = -Infinity;
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of flat) {
      far = Math.max(far, p.x * dx + p.y * dy);
      const across = p.x * dy - p.y * dx;
      lo = Math.min(lo, across);
      hi = Math.max(hi, across);
    }
    let near = Infinity;
    for (const p of flat) near = Math.min(near, p.x * dx + p.y * dy);
    const cut = far - 0.12 * (far - near);
    let a = Infinity;
    let b = -Infinity;
    for (const p of flat) {
      if (p.x * dx + p.y * dy < cut) continue;
      const across = p.x * dy - p.y * dx;
      a = Math.min(a, across);
      b = Math.max(b, across);
    }
    const ratio = (b - a) / Math.max(1e-9, hi - lo);
    if (ratio < best.ratio) best = { ratio, turn };
  }
  const roll = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), best.turn);
  return roll.multiply(tilt);
}
