/*
 * Checks a model converted from a Rhino file (.3dm) against the file itself (27/11/2026): every solid object of a
 * visible layer must be in the converted GLB, in its place, and nothing else. Read independently of the pipeline
 * (server/models/pipeline): only the bytes given to rhino3dm are the same (./archive3dm.ts takes the curves out of
 * them, or rhino3dm stops at the first curve of some files and reads nothing after it).
 *
 * From the file (rhino3dm): every object, its type, its layer (visible or not, its parents counted), whether it is
 * hidden, in a layout, or a picture placed to trace a drawing; the blocks and every copy of them, nested copies
 * included, with their transformation; the unit. From the GLB: every copy of every mesh (EXT_mesh_gpu_instancing) and
 * every separate piece of the other meshes, in mm, Z up as in Rhino.
 *
 * Checks:
 *  - inside: every vertex of the GLB lies in the box of a solid object of a visible layer (nothing moved, nothing
 *    invented, nothing from a hidden object or a drawing);
 *  - covered: every such object is drawn (the GLB fills the box of points sure to be on it: its vertices, points of
 *    its edges);
 *  - copies: every copy of a block (a stone) has a piece of the GLB of its size at its place;
 *  - hidden: no piece of the GLB has the place and the size of a hidden object (or a picture);
 *  - apart: the parts of the GLB away from the main piece are those away from it in the file.
 *
 *   npx tsx scripts/rhino-check.ts <original.3dm> <full.glb>   (prints the inventory and the result; exit 1 on failure)
 */
import fs from "node:fs";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, type InstancedMesh } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { volumesOnly } from "../server/models/pipeline/archive3dm.js";

export type Vec = [number, number, number];
export type Box = { lo: Vec; hi: Vec };

/* ---------- rhino3dm, as little of it as needed ---------- */

type Enum = Record<string, unknown>;
type Point = number[];
type RBox = { min: Point; max: Point };
type RXform = { toFloatArray(rowDominant: boolean): number[] };
type RGeometry = {
  objectType: unknown;
  getBoundingBox(accurate?: boolean): RBox;
  parentIdefId?: string;
  xform?: RXform;
  vertices?: () => { count: number; get(i: number): Point | { location: Point } };
  edges?: () => { count: number; get(i: number): { domain: number[]; pointAt(t: number): Point } };
  toBrep?: (split: boolean) => RGeometry | null;
  isSolid?: boolean;
};
type RAttributes = { layerIndex: number; visible: boolean; mode: unknown; isInstanceDefinitionObject: boolean; activeSpace?: unknown; name?: string; materialIndex: number; materialSource: unknown; id: string };
type RObject = { geometry(): RGeometry; attributes(): RAttributes };
type RLayer = { name: string; fullPath: string; visible: boolean; id: string; parentLayerId: string };
type RFile = {
  objects(): { count: number; get(i: number): RObject; findId(id: string): RObject | null };
  layers(): { count: number; get(i: number): RLayer };
  instanceDefinitions(): { count: number; get(i: number): { name: string; id: string; getObjectIds(): string[] }; findId(id: string): { name: string; id: string; getObjectIds(): string[] } | null };
  materials(): { get(i: number): { getBitmapTexture?: () => { fileName?: string } | null } | null };
  settings(): { modelUnitSystem: unknown };
};
type Rhino = {
  File3dm: { fromByteArray(bytes: Uint8Array): RFile | null };
  ObjectType: Enum;
  ObjectMode: Enum;
  UnitSystem: Enum;
  ActiveSpace?: Enum;
  ObjectMaterialSource: Enum;
};

let rhinoModule: Promise<Rhino> | null = null;
function loadRhino(): Promise<Rhino> {
  rhinoModule ??= import("rhino3dm").then((m) => (m as unknown as { default: () => Promise<Rhino> }).default());
  return rhinoModule;
}

const nameOf = (e: Enum, v: unknown) => Object.entries(e).find(([, x]) => x === v)?.[0] ?? String(v);

const MM: Record<string, number> = { Millimeters: 1, Centimeters: 10, Decimeters: 100, Meters: 1000, Kilometers: 1e6, Microns: 0.001, Nanometers: 1e-6, Inches: 25.4, Feet: 304.8, Yards: 914.4, Mils: 0.0254, Microinches: 0.0000254, None: 1 };
const SOLID = new Set(["Brep", "Surface", "Mesh", "Extrusion", "SubD"]);
const IMAGE = /\.(jpe?g|png|bmp|gif|tiff?|webp|heic|psd)$/i;

/** 4×4 column-major. */
type Mat = number[];
function mul(a: Mat, b: Mat): Mat {
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r]! += a[k * 4 + r]! * b[c * 4 + k]!;
  return out;
}
const apply = (m: Mat, p: Point): Vec => [m[0]! * p[0]! + m[4]! * p[1]! + m[8]! * p[2]! + m[12]!, m[1]! * p[0]! + m[5]! * p[1]! + m[9]! * p[2]! + m[13]!, m[2]! * p[0]! + m[6]! * p[1]! + m[10]! * p[2]! + m[14]!];
/** A Rhino transformation, read row by row (M00, M01...), as a column-major matrix. */
function fromRhino(x: RXform): Mat {
  const r = x.toFloatArray(true);
  return [r[0]!, r[4]!, r[8]!, r[12]!, r[1]!, r[5]!, r[9]!, r[13]!, r[2]!, r[6]!, r[10]!, r[14]!, r[3]!, r[7]!, r[11]!, r[15]!];
}

const emptyBox = (): Box => ({ lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] });
function grow(b: Box, p: Point): void {
  for (let k = 0; k < 3; k++) {
    if (p[k]! < b.lo[k]!) b.lo[k] = p[k]!;
    if (p[k]! > b.hi[k]!) b.hi[k] = p[k]!;
  }
}
const isEmpty = (b: Box) => !(b.lo[0] <= b.hi[0]);
const centerOf = (b: Box): Vec => [(b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, (b.lo[2] + b.hi[2]) / 2];
const sizeOf = (b: Box): Vec => [b.hi[0] - b.lo[0], b.hi[1] - b.lo[1], b.hi[2] - b.lo[2]];
const diag = (b: Box) => Math.hypot(...sizeOf(b));
const expand = (b: Box, t: number): Box => ({ lo: b.lo.map((x) => x - t) as Vec, hi: b.hi.map((x) => x + t) as Vec });
const join = (a: Box, b: Box): Box => ({ lo: a.lo.map((x, k) => Math.min(x, b.lo[k]!)) as Vec, hi: a.hi.map((x, k) => Math.max(x, b.hi[k]!)) as Vec });
const overlaps = (a: Box, b: Box) => [0, 1, 2].every((k) => a.lo[k]! <= b.hi[k]! && b.lo[k]! <= a.hi[k]!);
const contains = (b: Box, p: Point) => [0, 1, 2].every((k) => p[k]! >= b.lo[k]! && p[k]! <= b.hi[k]!);
const fmt = (v: number[]) => "(" + v.map((x) => x.toFixed(2)).join(", ") + ")";
export const boxText = (b: Box) => fmt(b.lo) + "–" + fmt(b.hi);

/* ---------- The file ---------- */

export type FileObject = {
  index: number;
  type: string;
  layer: string;
  /** Its layer and every parent layer visible. */
  layerVisible: boolean;
  visible: boolean;
  mode: string;
  /** Inside a block definition (drawn through its copies only). */
  inBlock: boolean;
  /** In a layout (page space), not in the model. */
  page: boolean;
  name: string;
  box: Box;
  block?: { name: string; xform: number[] };
};

/** A solid of the model as Rhino shows it: an object, or one copy of an object of a block. In mm, Z up. */
export type Solid = {
  type: string;
  layer: string;
  /** "object", or the path of blocks of a copy (Round_JFR, or Outer/Inner for a nested copy). */
  from: string;
  /** A box sure to hold the solid (its estimated box, larger than it or equal). */
  outer: Box;
  /** A box sure to be inside the solid's real box (of points on it: vertices, points of its edges); empty if unknown. */
  inner: Box;
  /** Mesh copies: the centre of the copy's box, exactly where its mesh is placed. */
  center: Vec;
  /** A closed polysurface flat as a sheet: no volume, maybe no area at all (a surface shrunk to a curve), so it may draw nothing. */
  flat?: boolean;
};

/** An object Rhino does not show (or that is not part of the jewel), with the reason. */
export type Left = { why: "hidden" | "hidden layer" | "layout" | "picture" | "drawing"; type: string; layer: string; box: Box; from: string };

export type Inventory = {
  units: string;
  mmPerUnit: number;
  layers: { index: number; path: string; visible: boolean; parent: string | null }[];
  blocks: { name: string; objects: number; copies: number }[];
  objects: FileObject[];
  solids: Solid[];
  left: Left[];
  /** Objects taken out of the bytes before rhino3dm reads them (curves, dimensions, texts...), by kind. */
  drawings: Record<string, number>;
};

/** Points sure to be on a geometry, in its own space: mesh vertices; brep vertices and points along its edges. */
function pointsOn(rhino: Rhino, g: RGeometry): Point[] {
  const t = nameOf(rhino.ObjectType, g.objectType);
  const out: Point[] = [];
  const brep = t === "Extrusion" ? g.toBrep?.(true) : g;
  if (!brep) return out;
  if (t === "Mesh" || t === "SubD") {
    const v = g.vertices?.();
    if (v) for (let i = 0; i < v.count; i++) {
      const p = v.get(i);
      out.push(Array.isArray(p) ? p : p.location);
    }
    return out;
  }
  const verts = brep.vertices?.();
  if (verts) for (let i = 0; i < verts.count; i++) {
    const p = verts.get(i);
    out.push(Array.isArray(p) ? p : p.location);
  }
  const edges = brep.edges?.();
  if (edges) for (let i = 0; i < edges.count; i++) {
    const e = edges.get(i);
    const [a, b] = e.domain as [number, number];
    for (let s = 0; s <= 8; s++) out.push(e.pointAt(a + ((b - a) * s) / 8));
  }
  return out;
}

export async function readInventory(file: string): Promise<Inventory> {
  const rhino = await loadRhino();
  const pruned = volumesOnly(new Uint8Array(fs.readFileSync(file)));
  const doc = rhino.File3dm.fromByteArray(pruned.bytes);
  if (!doc) throw new Error("rhino3dm cannot read " + file);
  const units = nameOf(rhino.UnitSystem, doc.settings().modelUnitSystem);
  const s = MM[units] ?? 1;
  // Rhino → the GLB's frame in mm: Z up (Rhino) becomes Y up (glTF): (x, y, z) → (x, z, −y).
  const toGlb: Mat = [s, 0, 0, 0, 0, 0, -s, 0, 0, s, 0, 0, 0, 0, 0, 1];

  const fileLayers = doc.layers();
  const layers: Inventory["layers"] = [];
  const byId = new Map<string, number>();
  for (let i = 0; i < fileLayers.count; i++) {
    const l = fileLayers.get(i);
    byId.set(l.id, i);
    layers.push({ index: i, path: l.fullPath || l.name, visible: l.visible, parent: null });
  }
  for (let i = 0; i < fileLayers.count; i++) {
    const p = byId.get(fileLayers.get(i).parentLayerId);
    layers[i]!.parent = p === undefined ? null : layers[p]!.path;
  }
  const layerVisible = (i: number): boolean => {
    let l: number | undefined = i;
    for (let depth = 0; l !== undefined && depth < 32; depth++) {
      if (!fileLayers.get(l).visible) return false;
      l = byId.get(fileLayers.get(l).parentLayerId);
    }
    return true;
  };

  const objects: FileObject[] = [];
  const solids: Solid[] = [];
  const left: Left[] = [];
  const copies = new Map<string, number>();
  const all = doc.objects();
  const page = rhino.ActiveSpace?.PageSpace;

  const isPicture = (o: RObject, box: Box) => {
    const sides = sizeOf(box);
    const wide = Math.max(...sides);
    if (!(wide > 0) || Math.min(...sides) > wide * 1e-4) return false;
    const a = o.attributes();
    if (IMAGE.test((a.name ?? "").trim())) return true;
    if (a.materialSource !== rhino.ObjectMaterialSource.MaterialFromObject || a.materialIndex < 0) return false;
    return Boolean(doc.materials().get(a.materialIndex)?.getBitmapTexture?.()?.fileName);
  };

  /** The boxes of a geometry placed by `m` (file space → GLB frame). */
  const placed = (g: RGeometry, m: Mat): { outer: Box; inner: Box; center: Vec; flat?: boolean } => {
    const b = g.getBoundingBox(false);
    const outer = emptyBox();
    for (const x of [b.min[0]!, b.max[0]!]) for (const y of [b.min[1]!, b.max[1]!]) for (const z of [b.min[2]!, b.max[2]!]) grow(outer, apply(m, [x, y, z]));
    const inner = emptyBox();
    for (const p of pointsOn(rhino, g)) grow(inner, apply(m, p));
    // A mesh: its placed vertices give its exact box (the corners of its own box, turned, give a larger one).
    const sides = [b.max[0]! - b.min[0]!, b.max[1]! - b.min[1]!, b.max[2]! - b.min[2]!];
    const flat = g.isSolid === true && Math.min(...sides) <= 1e-6 * Math.max(...sides, 1e-9);
    return { outer, inner, center: centerOf(isEmpty(inner) ? outer : inner), ...(flat ? { flat } : {}) };
  };

  const expandCopy = (idefId: string, m: Mat, path: string, depth: number) => {
    if (depth > 16) return;
    const idef = doc.instanceDefinitions().findId(idefId);
    if (!idef) return;
    const here = path ? path + "/" + idef.name : idef.name;
    copies.set(idef.name, (copies.get(idef.name) ?? 0) + 1);
    for (const id of idef.getObjectIds()) {
      const o = all.findId(id);
      if (!o) continue; // a curve of the block, taken out of the bytes
      const a = o.attributes();
      const g = o.geometry();
      const t = nameOf(rhino.ObjectType, g.objectType);
      const layer = layers[a.layerIndex]?.path ?? String(a.layerIndex);
      if (t === "InstanceReference" && g.xform && g.parentIdefId) {
        if (!layerVisible(a.layerIndex) || a.visible === false) continue;
        expandCopy(g.parentIdefId, mul(m, fromRhino(g.xform)), here, depth + 1);
        continue;
      }
      const p = placed(g, m);
      const why: Left["why"] | null = !SOLID.has(t) ? "drawing" : a.visible === false || nameOf(rhino.ObjectMode, a.mode) === "Hidden" ? "hidden" : !layerVisible(a.layerIndex) ? "hidden layer" : null;
      if (why) left.push({ why, type: t, layer, box: p.outer, from: here });
      else solids.push({ type: t, layer, from: here, ...p });
    }
  };

  for (let i = 0; i < all.count; i++) {
    const o = all.get(i);
    const a = o.attributes();
    const g = o.geometry();
    const t = nameOf(rhino.ObjectType, g.objectType);
    const layer = layers[a.layerIndex]?.path ?? String(a.layerIndex);
    const bb = g.getBoundingBox(false);
    const box = emptyBox();
    for (const x of [bb.min[0]!, bb.max[0]!]) for (const y of [bb.min[1]!, bb.max[1]!]) for (const z of [bb.min[2]!, bb.max[2]!]) grow(box, apply(toGlb, [x, y, z]));
    const rec: FileObject = { index: i, type: t, layer, layerVisible: layerVisible(a.layerIndex), visible: a.visible !== false, mode: nameOf(rhino.ObjectMode, a.mode), inBlock: a.isInstanceDefinitionObject, page: page !== undefined && a.activeSpace === page, name: (a.name ?? "").trim(), box };
    if (t === "InstanceReference" && g.xform) rec.block = { name: doc.instanceDefinitions().findId(g.parentIdefId ?? "")?.name ?? "?", xform: g.xform.toFloatArray(true) };
    objects.push(rec);
    if (rec.inBlock) continue;
    const why: Left["why"] | null = !rec.visible || rec.mode === "Hidden" ? "hidden" : !rec.layerVisible ? "hidden layer" : rec.page ? "layout" : t !== "InstanceReference" && !SOLID.has(t) ? "drawing" : SOLID.has(t) && isPicture(o, box) ? "picture" : null;
    if (why) {
      left.push({ why, type: t, layer, box, from: rec.block ? rec.block.name : "object" });
      continue;
    }
    if (t === "InstanceReference" && g.xform && g.parentIdefId) expandCopy(g.parentIdefId, mul(toGlb, fromRhino(g.xform)), "", 0);
    else solids.push({ type: t, layer, from: "object", ...placed(g, toGlb) });
  }
  const idefs = doc.instanceDefinitions();
  const blocks: Inventory["blocks"] = [];
  for (let i = 0; i < idefs.count; i++) {
    const d = idefs.get(i);
    blocks.push({ name: d.name, objects: d.getObjectIds().length, copies: copies.get(d.name) ?? 0 });
  }
  return { units, mmPerUnit: s, layers, blocks, objects, solids, left, drawings: pruned.dropped };
}

/* ---------- The GLB ---------- */

/** One drawn thing of the GLB: a copy of a mesh, or a separate piece of a mesh drawn once. mm, Y up. */
export type Drawn = { material: string; copy: boolean; box: Box; center: Vec; vertices: Float64Array };

export async function readGlb(file: string): Promise<Drawn[]> {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.read(file);
  const out: Drawn[] = [];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const world = node.getWorldMatrix() as unknown as Mat;
    const inst = node.getExtension<InstancedMesh>("EXT_mesh_gpu_instancing");
    const placements: Mat[] = [];
    if (inst) {
      const T = inst.getAttribute("TRANSLATION");
      const R = inst.getAttribute("ROTATION");
      const S = inst.getAttribute("SCALE");
      const n = (T ?? R ?? S)?.getCount() ?? 0;
      for (let i = 0; i < n; i++) {
        const t = T ? T.getElement(i, []) : [0, 0, 0];
        const [x, y, z, w] = (R ? R.getElement(i, []) : [0, 0, 0, 1]) as [number, number, number, number];
        const sc = S ? S.getElement(i, []) : [1, 1, 1];
        const m = [(1 - 2 * (y * y + z * z)) * sc[0]!, 2 * (x * y + z * w) * sc[0]!, 2 * (x * z - y * w) * sc[0]!, 0, 2 * (x * y - z * w) * sc[1]!, (1 - 2 * (x * x + z * z)) * sc[1]!, 2 * (y * z + x * w) * sc[1]!, 0, 2 * (x * z + y * w) * sc[2]!, 2 * (y * z - x * w) * sc[2]!, (1 - 2 * (x * x + y * y)) * sc[2]!, 0, t[0]!, t[1]!, t[2]!, 1];
        placements.push(mul(world, m));
      }
    } else placements.push(world);
    for (const prim of mesh.listPrimitives()) {
      const material = prim.getMaterial()?.getName() ?? "";
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const n = pos.getCount();
      const local = new Float64Array(n * 3);
      const v: number[] = [];
      for (let i = 0; i < n; i++) {
        pos.getElement(i, v);
        local[i * 3] = v[0]!;
        local[i * 3 + 1] = v[1]!;
        local[i * 3 + 2] = v[2]!;
      }
      if (inst) {
        for (const m of placements) {
          const verts = new Float64Array(n * 3);
          const box = emptyBox();
          for (let i = 0; i < n; i++) {
            const p = apply(m, [local[i * 3]!, local[i * 3 + 1]!, local[i * 3 + 2]!]).map((x) => x * 1000) as Vec;
            verts.set(p, i * 3);
            grow(box, p);
          }
          out.push({ material, copy: true, box, center: centerOf(box), vertices: verts });
        }
        continue;
      }
      // Separate pieces: triangles sharing a vertex (welded by position: flat facets repeat their vertices).
      const m = placements[0]!;
      const world3 = new Float64Array(n * 3);
      for (let i = 0; i < n; i++) world3.set(apply(m, [local[i * 3]!, local[i * 3 + 1]!, local[i * 3 + 2]!]).map((x) => x * 1000), i * 3);
      const key = new Map<string, number>();
      const weld = new Int32Array(n);
      for (let i = 0; i < n; i++) {
        const k = Math.round(world3[i * 3]! * 1e4) + "," + Math.round(world3[i * 3 + 1]! * 1e4) + "," + Math.round(world3[i * 3 + 2]! * 1e4);
        const found = key.get(k);
        if (found === undefined) key.set(k, i);
        weld[i] = found ?? i;
      }
      const parent = Int32Array.from({ length: n }, (_, i) => i);
      const find = (i: number): number => {
        while (parent[i] !== i) {
          parent[i] = parent[parent[i]!]!;
          i = parent[i]!;
        }
        return i;
      };
      const idx = prim.getIndices();
      const count = idx ? idx.getCount() : n;
      for (let t = 0; t < count; t += 3) {
        const a = find(weld[idx ? idx.getScalar(t) : t]!);
        for (let k = 1; k < 3; k++) {
          const b = find(weld[idx ? idx.getScalar(t + k) : t + k]!);
          if (a !== b) parent[b] = a;
        }
      }
      const groups = new Map<number, number[]>();
      for (let i = 0; i < n; i++) {
        const r = find(weld[i]!);
        const list = groups.get(r);
        if (list) list.push(i);
        else groups.set(r, [i]);
      }
      for (const list of groups.values()) {
        const verts = new Float64Array(list.length * 3);
        const box = emptyBox();
        list.forEach((i, j) => {
          const p: Vec = [world3[i * 3]!, world3[i * 3 + 1]!, world3[i * 3 + 2]!];
          verts.set(p, j * 3);
          grow(box, p);
        });
        out.push({ material, copy: false, box, center: centerOf(box), vertices: verts });
      }
    }
  }
  return out;
}

/* ---------- The comparison ---------- */

/** Boxes found near a point, through a grid. */
class Grid {
  private cells = new Map<string, number[]>();
  constructor(
    private boxes: Box[],
    private cell: number,
  ) {
    boxes.forEach((b, i) => {
      const lo = b.lo.map((x) => Math.floor(x / cell));
      const hi = b.hi.map((x) => Math.floor(x / cell));
      // Very large boxes would fill too many cells: they go in a list of their own, always tried.
      if ((hi[0]! - lo[0]! + 1) * (hi[1]! - lo[1]! + 1) * (hi[2]! - lo[2]! + 1) > 20000) {
        this.big.push(i);
        return;
      }
      for (let x = lo[0]!; x <= hi[0]!; x++) for (let y = lo[1]!; y <= hi[1]!; y++) for (let z = lo[2]!; z <= hi[2]!; z++) {
        const k = x + "," + y + "," + z;
        const list = this.cells.get(k);
        if (list) list.push(i);
        else this.cells.set(k, [i]);
      }
    });
  }
  private big: number[] = [];
  near(p: Point): number[] {
    const k = p.map((x) => Math.floor(x / this.cell)).join(",");
    return [...(this.cells.get(k) ?? []), ...this.big];
  }
  holding(p: Point): number[] {
    return this.near(p).filter((i) => contains(this.boxes[i]!, p));
  }
  /** Boxes overlapping a box. */
  overlapping(b: Box): number[] {
    const lo = b.lo.map((x) => Math.floor(x / this.cell));
    const hi = b.hi.map((x) => Math.floor(x / this.cell));
    const found = new Set<number>(this.big);
    for (let x = lo[0]!; x <= hi[0]!; x++) for (let y = lo[1]!; y <= hi[1]!; y++) for (let z = lo[2]!; z <= hi[2]!; z++) for (const i of this.cells.get(x + "," + y + "," + z) ?? []) found.add(i);
    return [...found].filter((i) => overlaps(this.boxes[i]!, b));
  }
}

/** Groups of boxes that touch (within `tol`), largest first. */
export function clusters(boxes: Box[], tol: number): { box: Box; members: number[] }[] {
  const parent = boxes.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[a]!.lo[0] - boxes[b]!.lo[0]);
  const open: number[] = [];
  for (const i of order) {
    const b = expand(boxes[i]!, tol);
    for (let j = open.length - 1; j >= 0; j--) {
      const o = open[j]!;
      if (expand(boxes[o]!, tol).hi[0] < b.lo[0]) {
        open.splice(j, 1);
        continue;
      }
      if (overlaps(expand(boxes[o]!, tol), b)) parent[find(o)] = find(i);
    }
    open.push(i);
  }
  const out = new Map<number, { box: Box; members: number[] }>();
  boxes.forEach((b, i) => {
    const r = find(i);
    const c = out.get(r);
    if (c) {
      c.box = join(c.box, b);
      c.members.push(i);
    } else out.set(r, { box: b, members: [i] });
  });
  return [...out.values()].sort((a, b) => b.members.length - a.members.length || diag(b.box) - diag(a.box));
}

export type Result = {
  failures: string[];
  /** Plain lines: what the file holds, what the GLB draws. */
  report: string[];
  /** Groups of solids away from the main piece in the file (more than `APART` mm from it). */
  apartInFile: { box: Box; solids: number; layers: string[] }[];
  apartInGlb: { box: Box; pieces: number }[];
};

/** A part further than this from the main piece (mm) is apart. */
const APART = 1;

/**
 * `slack`: how far (mm) the GLB may stray from the surfaces of the file: the full version is simplified within 0.01 mm,
 * the light one within 0.03 mm, where a sliver thinner than that may fold (0.05 for full, 0.15 for light).
 */
export function compare(inv: Inventory, drawn: Drawn[], slack = 0.05): Result {
  const failures: string[] = [];
  const report: string[] = [];
  const solids = inv.solids;
  const tolOf = (b: Box) => slack + 0.01 * diag(b);
  const outers = solids.map((s) => expand(s.outer, tolOf(s.outer)));
  const size = solids.reduce((b, s) => join(b, s.outer), emptyBox());
  const grid = new Grid(outers, Math.max(1, diag(size) / 60));

  report.push("Unit: " + inv.units + (inv.mmPerUnit !== 1 ? " (×" + inv.mmPerUnit + " to mm)" : ""));
  report.push("Layers: " + inv.layers.length + (inv.layers.some((l) => !l.visible) ? " (hidden: " + inv.layers.filter((l) => !l.visible).map((l) => l.path).join(", ") + ")" : ", all visible"));
  report.push("Blocks: " + inv.blocks.map((b) => b.name + " (" + b.objects + " object" + (b.objects > 1 ? "s" : "") + ", " + b.copies + " cop" + (b.copies > 1 ? "ies" : "y") + ")").join(", "));
  const types = new Map<string, number>();
  for (const o of inv.objects) types.set((o.inBlock ? "in a block: " : "") + o.type, (types.get((o.inBlock ? "in a block: " : "") + o.type) ?? 0) + 1);
  report.push("Objects read: " + [...types].map(([t, n]) => n + " " + t).join(", ") + (Object.keys(inv.drawings).length ? "; taken out before reading: " + Object.entries(inv.drawings).map(([t, n]) => n + " " + t).join(", ") : ""));
  const whys = new Map<string, number>();
  for (const l of inv.left) whys.set(l.why, (whys.get(l.why) ?? 0) + 1);
  const flats = solids.filter((s) => s.flat).length;
  report.push("Solids to show: " + solids.length + " (" + solids.filter((s) => s.from !== "object").length + " block copies" + (flats ? ", " + flats + " closed but flat as a sheet (no volume)" : "") + "); left out: " + ([...whys].map(([w, n]) => n + " " + w).join(", ") || "none"));
  report.push("GLB: " + drawn.filter((d) => d.copy).length + " mesh copies, " + drawn.filter((d) => !d.copy).length + " separate pieces drawn once");

  // inside: every vertex of the GLB in the box of a solid to show.
  let outside = 0;
  const strays: Box[] = [];
  for (const d of drawn) {
    let bad = 0;
    const box = emptyBox();
    for (let i = 0; i < d.vertices.length; i += 3) {
      const p = [d.vertices[i]!, d.vertices[i + 1]!, d.vertices[i + 2]!];
      if (grid.holding(p).length === 0) {
        bad++;
        grow(box, p);
      }
    }
    if (bad > 0) {
      outside += bad;
      strays.push(box);
    }
  }
  if (outside > 0) {
    const where = clusters(strays, 0.5).slice(0, 5).map((c) => boxText(c.box));
    failures.push(outside + " vertices of the GLB are outside every solid of the file (around " + where.join("; ") + ")");
  }

  // covered: the GLB fills the inner box of every solid.
  const drawnBoxes = drawn.map((d) => d.box);
  const drawnGrid = new Grid(drawnBoxes, Math.max(1, diag(size) / 60));
  const missing: string[] = [];
  for (const s of solids) {
    if (isEmpty(s.inner) || s.flat) continue;
    const tol = tolOf(s.outer);
    const area = expand(s.outer, tol);
    const reach = emptyBox();
    // Every GLB piece overlapping the solid's box, and its vertices in it.
    for (const c of drawnGrid.overlapping(area)) {
      const d = drawn[c]!;
      for (let i = 0; i < d.vertices.length; i += 3) {
        const p = [d.vertices[i]!, d.vertices[i + 1]!, d.vertices[i + 2]!];
        if (contains(area, p)) grow(reach, p);
      }
    }
    const short = isEmpty(reach) ? Infinity : Math.max(...[0, 1, 2].map((k) => Math.max(reach.lo[k]! - s.inner.lo[k]!, s.inner.hi[k]! - reach.hi[k]!)));
    if (short > tol) missing.push(s.type + " of « " + s.layer + " » (" + s.from + ") " + boxText(s.inner) + (isFinite(short) ? ", " + short.toFixed(2) + " mm short" : ", nothing drawn"));
  }
  if (missing.length > 0) failures.push(missing.length + " solids of the file are not drawn (whole): " + missing.slice(0, 8).join("; "));

  // copies: every block copy (a mesh: its box is exact) has a piece of its size at its place, one piece each.
  const centers = new Grid(
    drawn.map((d) => expand({ lo: d.center, hi: d.center }, 0.2)),
    1,
  );
  const used = new Set<number>();
  const lost: string[] = [];
  let matched = 0;
  for (const s of solids) {
    if (s.from === "object" || s.type !== "Mesh") continue;
    const want = sizeOf(s.inner);
    const tol = 0.02 + 0.01 * diag(s.inner);
    const near = centers.near(s.center).filter((i) => !used.has(i) && Math.hypot(...[0, 1, 2].map((k) => drawn[i]!.center[k]! - s.center[k]!)) <= tol && [0, 1, 2].every((k) => Math.abs(sizeOf(drawn[i]!.box)[k]! - want[k]!) <= tol));
    if (near.length === 0) lost.push((s.from + " at " + fmt(s.center)).trim());
    else {
      used.add(near[0]!);
      matched++;
    }
  }
  if (lost.length > 0) failures.push(lost.length + " block copies have no piece of their size at their place: " + lost.slice(0, 8).join("; "));
  report.push("Block copies found in place in the GLB: " + matched + " / " + solids.filter((s) => s.from !== "object" && s.type === "Mesh").length);

  // hidden: nothing drawn with the place and size of an object left out (unless a shown solid has them too).
  const shown = solids.map((s) => s.outer);
  const ghosts: string[] = [];
  for (const l of inv.left) {
    if (l.why === "drawing") continue;
    const tol = 0.05 + 0.02 * diag(l.box);
    const same = (b: Box) => [0, 1, 2].every((k) => Math.abs(b.lo[k]! - l.box.lo[k]!) <= tol && Math.abs(b.hi[k]! - l.box.hi[k]!) <= tol);
    if (shown.some(same)) continue;
    const hit = drawn.findIndex((d) => same(d.box));
    if (hit >= 0) ghosts.push(l.why + " " + l.type + " of « " + l.layer + " » " + boxText(l.box));
  }
  if (ghosts.length > 0) failures.push(ghosts.length + " objects Rhino does not show are drawn: " + ghosts.slice(0, 8).join("; "));

  // apart: the parts away from the main piece, in the file and in the GLB.
  const fileGroups = clusters(
    solids.map((s) => (isEmpty(s.inner) ? s.outer : s.inner)),
    APART,
  );
  const glbGroups = clusters(drawnBoxes, APART);
  const main = fileGroups[0];
  const apartInFile = fileGroups.slice(1).map((g) => ({ box: g.box, solids: g.members.length, layers: [...new Set(g.members.map((i) => solids[i]!.layer))] }));
  const mainGlb = glbGroups.find((g) => main && overlaps(expand(g.box, APART), main.box)) ?? glbGroups[0];
  const apartInGlb = glbGroups.filter((g) => g !== mainGlb && !(main && overlaps(expand(g.box, APART), expand(main.box, 0)) && g.members.length > 0 && contains(expand(main.box, APART), g.box.lo) && contains(expand(main.box, APART), g.box.hi))).map((g) => ({ box: g.box, pieces: g.members.length }));
  if (main) report.push("Main piece in the file: " + boxText(main.box) + " (" + main.members.length + " solids)");
  if (mainGlb) report.push("Main piece in the GLB: " + boxText(mainGlb.box) + " (" + mainGlb.members.length + " pieces)");
  for (const a of apartInFile) report.push("Apart in the file: " + a.solids + " solid" + (a.solids > 1 ? "s" : "") + " of « " + a.layers.join(" », « ") + " » at " + boxText(a.box) + ", " + gap(a.box, main!.box).toFixed(1) + " mm from the main piece");
  if (main && mainGlb) {
    const off = Math.max(...[0, 1, 2].flatMap((k) => [Math.abs(mainGlb.box.lo[k]! - main.box.lo[k]!), Math.abs(mainGlb.box.hi[k]! - main.box.hi[k]!)]));
    if (off > 0.05 + 0.01 * diag(main.box)) failures.push("The main piece of the GLB " + boxText(mainGlb.box) + " is not the main piece of the file " + boxText(main.box));
  }
  for (const g of apartInGlb) {
    const inFile = apartInFile.some((a) => overlaps(expand(a.box, APART), g.box));
    if (!inFile) failures.push("A part of the GLB is apart from the main piece, but not in the file: " + g.pieces + " pieces at " + boxText(g.box));
  }
  for (const a of apartInFile) {
    if (!glbGroups.some((g) => overlaps(expand(g.box, APART), a.box))) failures.push("A part apart in the file is missing from the GLB: " + boxText(a.box));
  }
  return { failures, report, apartInFile, apartInGlb };
}

/** Distance between two boxes (0 when they touch). */
function gap(a: Box, b: Box): number {
  return Math.hypot(...[0, 1, 2].map((k) => Math.max(0, a.lo[k]! - b.hi[k]!, b.lo[k]! - a.hi[k]!)));
}

export async function checkModel(original: string, glb: string, slack?: number): Promise<Result & { inventory: Inventory }> {
  const inventory = await readInventory(original);
  const drawn = await readGlb(glb);
  return { ...compare(inventory, drawn, slack ?? (/light\.glb$/.test(glb) ? 0.15 : 0.05)), inventory };
}

// As a command.
if (process.argv[1] && import.meta.url === new URL("file://" + fs.realpathSync(process.argv[1])).href) {
  const [original, glb] = process.argv.slice(2);
  if (!original || !glb) {
    console.log("npx tsx scripts/rhino-check.ts <original.3dm> <full.glb>");
    process.exit(2);
  }
  const r = await checkModel(original, glb);
  for (const line of r.report) console.log(line);
  for (const l of r.inventory.left.filter((l) => l.why !== "drawing").slice(0, 60)) console.log("  left out (" + l.why + "): " + l.type + " « " + l.layer + " » " + l.from + " " + boxText(l.box));
  console.log(r.failures.length === 0 ? "OK" : "FAILED:\n- " + r.failures.join("\n- "));
  process.exit(r.failures.length === 0 ? 0 : 1);
}

/* ---------- A test file ---------- */

/**
 * A small .3dm made here (in centimetres, to check the unit), with what Yoni's three files lack: a layer turned off, a
 * layer under a parent turned off, an object of a block on a layer turned off, a copy of a block on a layer turned off,
 * a hidden object, a copy of a block inside a block (nested, turned), copies turned, stretched and mirrored, a curve,
 * and a piece far from the jewel. Expected: 1 hidden object, 4 objects on layers turned off, 1 drawing, 1 piece apart.
 */
export async function makeTestFile(): Promise<Uint8Array> {
  type T = Record<string, number> & { toFloatArray(rowDominant: boolean): number[] };
  type R = Record<string, unknown> & {
    File3dm: new () => { objects(): Record<string, (...a: unknown[]) => string>; layers(): { add(l: unknown): number; get(i: number): { id: string } }; instanceDefinitions(): { add(...a: unknown[]): number; get(i: number): { id: string } }; settings(): { modelUnitSystem: unknown }; toByteArray(): Uint8Array };
    Layer: new () => { name: string; visible: boolean; parentLayerId: string };
    ObjectAttributes: new () => { layerIndex: number; visible: boolean; mode: unknown; name: string };
    Mesh: new () => { vertices(): { add(x: number, y: number, z: number): number }; faces(): { addTriFace(a: number, b: number, c: number): number }; normals(): { computeNormals(): void } };
    Brep: { createFromBoundingBox(b: unknown): unknown };
    BoundingBox: new (min: number[], max: number[]) => unknown;
    Transform: { identity(): T; translationXYZ(x: number, y: number, z: number): T; rotation(angle: number, axis: number[], center: number[]): T; multiply(a: T, b: T): T };
    InstanceReference: new (idefId: string, xform: T) => unknown;
    UnitSystem: Enum;
    ObjectMode: Enum;
  };
  const rhino = (await loadRhino()) as unknown as R;
  const doc = new rhino.File3dm();
  doc.settings().modelUnitSystem = rhino.UnitSystem.Centimeters;
  const layer = (name: string, visible: boolean, parent?: number) => {
    const l = new rhino.Layer();
    l.name = name;
    l.visible = visible;
    if (parent !== undefined) l.parentLayerId = doc.layers().get(parent).id;
    return doc.layers().add(l);
  };
  const metal = layer("Metal 01", true);
  const gem = layer("Gem 01", true);
  const off = layer("Off", false);
  const parent = layer("Parent", false);
  const child = layer("Child", true, parent);
  const offInBlock = layer("Off in block", false);
  const attrs = (layerIndex: number, hidden = false) => {
    const a = new rhino.ObjectAttributes();
    a.layerIndex = layerIndex;
    if (hidden) {
      a.visible = false;
      a.mode = rhino.ObjectMode.Hidden;
    }
    return a;
  };
  const box = (lo: number[], hi: number[]) => rhino.Brep.createFromBoundingBox(new rhino.BoundingBox(lo, hi));
  // A stone: an octahedron 1 mm across, its point lower than its top is high (so a wrong turn shows).
  const stone = new rhino.Mesh();
  for (const p of [[0, 0, 0.03], [0.05, 0, 0], [0, 0.04, 0], [-0.05, 0, 0], [0, -0.04, 0], [0, 0, -0.06]]) stone.vertices().add(p[0]!, p[1]!, p[2]!);
  for (const f of [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 1], [5, 2, 1], [5, 3, 2], [5, 4, 3], [5, 1, 4]]) stone.faces().addTriFace(f[0]!, f[1]!, f[2]!);
  const hiddenPart = box([-0.02, -0.02, -0.02], [0.02, 0.02, 0.02]);
  const defs = doc.instanceDefinitions();
  defs.add("Stone", "", "", "", [0, 0, 0], [stone, hiddenPart], [attrs(gem), attrs(offInBlock)]);
  const stoneId = defs.get(0).id;
  const t = (x: number, y: number, z: number) => rhino.Transform.translationXYZ(x, y, z);
  const turn = (deg: number, axis: number[]) => rhino.Transform.rotation((deg * Math.PI) / 180, axis, [0, 0, 0]);
  const scaled = (sx: number, sy: number, sz: number) => {
    const m = rhino.Transform.identity();
    m.m00 = sx;
    m.m11 = sy;
    m.m22 = sz;
    return m;
  };
  const copy = (id: string, xform: T) => new rhino.InstanceReference(id, xform) as unknown;
  // A block of two stones, each placed in it: copies inside a copy.
  defs.add("Pair", "", "", "", [0, 0, 0], [copy(stoneId, t(-0.06, 0, 0)), copy(stoneId, rhino.Transform.multiply(t(0.06, 0, 0), turn(45, [0, 0, 1])))], [attrs(gem), attrs(gem)]);
  const pairId = defs.get(1).id;
  const objects = doc.objects();
  objects.addBrep!(box([-1, -0.5, -0.2], [1, 0.5, 0.2]), attrs(metal));
  objects.addInstanceObject!(new rhino.InstanceReference(stoneId, t(0.5, 0.2, 0.25)), attrs(gem));
  objects.addInstanceObject!(new rhino.InstanceReference(stoneId, rhino.Transform.multiply(t(0.2, -0.2, 0.25), turn(30, [0, 0, 1]))), attrs(gem));
  objects.addInstanceObject!(new rhino.InstanceReference(stoneId, rhino.Transform.multiply(t(-0.2, 0.2, 0.24), scaled(1.5, 1, 1))), attrs(gem));
  objects.addInstanceObject!(new rhino.InstanceReference(stoneId, rhino.Transform.multiply(t(0.7, -0.3, 0.25), scaled(-1, 1, 1))), attrs(gem));
  objects.addInstanceObject!(new rhino.InstanceReference(pairId, t(-0.6, -0.2, 0.25)), attrs(gem));
  objects.addInstanceObject!(new rhino.InstanceReference(pairId, rhino.Transform.multiply(t(-0.6, 0.25, 0.25), turn(90, [1, 0, 0]))), attrs(gem));
  // Not shown: a hidden object, a box on a layer off, a box under a parent off, a copy on a layer off; a curve.
  objects.addBrep!(box([5, 5, 5], [5.5, 5.5, 5.5]), attrs(metal, true));
  objects.addBrep!(box([-5, 0, 0], [-4.5, 0.5, 0.5]), attrs(off));
  objects.addBrep!(box([0, -5, 0], [0.5, -4.5, 0.5]), attrs(child));
  objects.addInstanceObject!(new rhino.InstanceReference(stoneId, t(0, 0, 3)), attrs(off));
  objects.addLine!([-1, 0, 0.5], [1, 0, 0.5]);
  // A piece far from the jewel, shown: kept where it is.
  objects.addBrep!(box([30, 0, 0], [30.2, 0.2, 0.2]), attrs(metal));
  return doc.toByteArray();
}
