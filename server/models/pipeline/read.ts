/*
 * Reading a 3D file into layers of triangles, in mm:
 * - STL (binary or text), read piece by piece (files of several hundred MB);
 * - OBJ (text), read piece by piece, its materials (or groups) being the layers;
 * - glTF (.glb, or .gltf in one file), its materials being the layers, with their colour (exports of Rhino via
 *   iJewel3D); the stone settings of our own export (BERETE_gem, src/data/bereteGem.ts) or of an iJewel export
 *   (WEBGI_materials_diamond) are read with them; copies drawn by EXT_mesh_gpu_instancing are kept as copies;
 * - FBX (./fbx.ts), its materials being the layers;
 * - Rhino (.3dm), its layers (with their colour) and its blocks (repeated stones). Curves, dimensions and texts are
 *   taken out before rhino3dm reads the file (./archive3dm.ts: one it cannot read would stop it there). A polysurface
 *   saved without its render mesh (rhino3dm cannot make one) is meshed here from its NURBS (./nurbs.ts); a face that
 *   cannot be meshed reliably leaves its volume counted in `skipped`, as are the pictures placed in the file.
 * A mesh drawn several times (glTF nodes sharing a mesh, Rhino blocks) is
 * kept once with the placement of each copy.
 */
import fs from "node:fs";
import { Logger, NodeIO, type Document, type Node as GltfNode } from "@gltf-transform/core";
import { ALL_EXTENSIONS, type InstancedMesh } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { bereteGemOfMaterial } from "../../../src/data/bereteGem.js";
import { diamondOfMaterial, colorOf } from "../../../src/data/ijewel.js";
import type { DiamondParams } from "../../../src/data/scene3d.js";
import { volumesOnly } from "./archive3dm.js";
import { readFbx } from "./fbx.js";
import { weld, Welder, type Soup } from "./geometry.js";
import { meshBrep, type RhinoBrep } from "./nurbs.js";

/** Several copies of one mesh: its triangles and one 4×4 matrix (column-major) per copy. */
export type Repeated = { soup: Soup; matrices: Float32Array[] };

export type Layer = {
  name: string;
  soups: Soup[];
  repeated: Repeated[];
  /** Its own colour (#rrggbb): the Rhino layer's, or the base colour of the material of a glTF or an FBX. */
  color?: string;
  /** Stone settings given by the file: our own export (BERETE_gem) or an iJewel export (WEBGI_materials_diamond). */
  diamond?: Partial<DiamondParams>;
};

/** What a file holds and the model does not show (a .3dm only). */
export type Skipped = {
  /**
   * Volumes saved without their render mesh that could not be meshed here either: missing from the model.
   * Polysurfaces and surfaces, extrusions, SubD; a block counts once per copy. `byLayer`: how many on each layer.
   */
  noMesh: { breps: number; extrusions: number; subds: number; layers: string[]; byLayer?: Record<string, number> };
  /** Volumes (or block copies) rhino3dm could not read at all: left out, the rest of the file read; missing from the model. */
  unreadable?: number;
  /** Objects that are not part of the jewel, left out: pictures placed in Rhino (a flat frame with a photo). */
  stray: { count: number; names: string[] };
  /** Objects hidden in Rhino, left out as Rhino does (a hidden object of a block counts once per copy). */
  hidden: number;
  /** Objects on a layer turned off in Rhino (or under a parent layer turned off), left out as Rhino does. */
  offLayers?: number;
  /** Objects of a layout (page space), not of the model. */
  layout?: number;
  /** Curves, dimensions, texts, points: drawings, never shown. */
  drawings: number;
  /** The drawings by kind (curve, annotation, point, pointset, textdot, hatch, detail, clipplane, other). */
  drawingKinds?: Record<string, number>;
  /** Polysurfaces without any area (a surface shrunk to a curve, a closed shell flat as a sheet): nothing to draw. */
  empty?: number;
};

/** The volumes missing from the model (not meshed, or not readable at all): a model with any is incomplete. */
export function missingVolumes(skipped: Skipped | undefined): number {
  return skipped ? skipped.noMesh.breps + skipped.noMesh.extrusions + skipped.noMesh.subds + (skipped.unreadable ?? 0) : 0;
}

export type SourceKind = "stl" | "obj" | "glb" | "gltf" | "3dm" | "fbx";

/** The unit of the file and what was done to reach mm. */
export type Units = {
  /** The unit as the file gives it (Rhino's "Millimeters", FBX's "cm"...), or the one taken when it gives none. */
  file: string;
  /** "file": stated in the file; "assumed": the format states none (STL, OBJ, glTF), mm taken; "size": guessed from the size of the jewel. */
  from: "file" | "assumed" | "size";
  mmPerUnit: number;
  /** A scale was applied to reach mm. */
  applied: boolean;
};

/** What an iJewel export said of its stones: the materials with diamond settings, and the settings read on each. */
export type IjewelReport = { materials: { name: string; params: string[] }[] };

export type Source = {
  layers: Layer[];
  /** False for an STL (or an OBJ with a single material): no layers, the parts are sorted by shape (stones, metal). */
  layered: boolean;
  triangles: number;
  skipped?: Skipped;
  units: Units;
  /** Volumes of a .3dm saved without render meshes, meshed here from their NURBS. */
  tessellated?: number;
  ijewel?: IjewelReport;
};

export type Progress = (fraction: number, step: string) => void;

function layerOf(layers: Map<string, Layer>, name: string): Layer {
  let layer = layers.get(name);
  if (!layer) {
    layer = { name, soups: [], repeated: [] };
    layers.set(name, layer);
  }
  return layer;
}

/* ---------- STL ---------- */

const CHUNK_TRIANGLES = 100_000;

export async function readStl(file: string, progress: Progress): Promise<Source> {
  const size = fs.statSync(file).size;
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(84);
    fs.readSync(fd, head, 0, 84, 0);
    const declared = head.readUInt32LE(80);
    if (size >= 84 && 84 + declared * 50 === size) return readBinaryStl(fd, declared, progress);
    const start = head.toString("latin1", 0, 5).toLowerCase();
    if (start === "solid") return await readTextStl(file, size, progress);
    // A binary file whose count is wrong: read every whole triangle.
    return readBinaryStl(fd, Math.floor((size - 84) / 50), progress);
  } finally {
    fs.closeSync(fd);
  }
}

function readBinaryStl(fd: number, triangles: number, progress: Progress): Source {
  const welder = new Welder(Math.ceil(triangles * 0.6));
  const indices = new Uint32Array(triangles * 3);
  const chunk = Buffer.alloc(CHUNK_TRIANGLES * 50);
  const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
  let n = 0;
  for (let first = 0; first < triangles; first += CHUNK_TRIANGLES) {
    const count = Math.min(CHUNK_TRIANGLES, triangles - first);
    fs.readSync(fd, chunk, 0, count * 50, 84 + first * 50);
    for (let t = 0; t < count; t++) {
      const o = t * 50 + 12;
      // Rhino counts up along Z, glTF along Y: (x, y, z) becomes (x, z, -y).
      const a = welder.add(view.getFloat32(o, true), view.getFloat32(o + 8, true), -view.getFloat32(o + 4, true));
      const b = welder.add(view.getFloat32(o + 12, true), view.getFloat32(o + 20, true), -view.getFloat32(o + 16, true));
      const c = welder.add(view.getFloat32(o + 24, true), view.getFloat32(o + 32, true), -view.getFloat32(o + 28, true));
      if (a === b || b === c || a === c) continue;
      indices[n++] = a;
      indices[n++] = b;
      indices[n++] = c;
    }
    progress((first + count) / triangles, "read");
  }
  const soup = { positions: welder.positions(), indices: indices.slice(0, n) };
  return { layers: [{ name: "model", soups: [soup], repeated: [] }], layered: false, triangles, units: MM_ASSUMED };
}

/** STL, OBJ and glTF state no unit: the mm of jewellers' files. */
const MM_ASSUMED: Units = { file: "mm", from: "assumed", mmPerUnit: 1, applied: false };
/** A jewel smaller than 2 units across: read as metres (glTF's own unit). */
const METRES_GUESSED: Units = { file: "m", from: "size", mmPerUnit: 1000, applied: true };

async function readTextStl(file: string, size: number, progress: Progress): Promise<Source> {
  const welder = new Welder(1 << 16);
  let indices = new Uint32Array(1 << 16);
  let n = 0;
  let corner: number[] = [];
  let rest = "";
  let read = 0;
  const vertex = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
  for await (const part of fs.createReadStream(file, { encoding: "latin1", highWaterMark: 4 << 20 })) {
    const text = rest + String(part);
    read += String(part).length;
    const cut = text.lastIndexOf("\n");
    rest = text.slice(cut + 1);
    vertex.lastIndex = 0;
    const body = text.slice(0, cut + 1);
    for (let m = vertex.exec(body); m; m = vertex.exec(body)) {
      corner.push(welder.add(Number(m[1]), Number(m[3]), -Number(m[2])));
      if (corner.length === 3) {
        const [a, b, c] = corner as [number, number, number];
        corner = [];
        if (a === b || b === c || a === c) continue;
        if (n + 3 > indices.length) {
          const grown = new Uint32Array(indices.length * 2);
          grown.set(indices);
          indices = grown;
        }
        indices[n++] = a;
        indices[n++] = b;
        indices[n++] = c;
      }
    }
    progress(Math.min(1, read / size), "read");
  }
  const soup = { positions: welder.positions(), indices: indices.slice(0, n) };
  return { layers: [{ name: "model", soups: [soup], repeated: [] }], layered: false, triangles: n / 3, units: MM_ASSUMED };
}

/* ---------- OBJ ---------- */

/** Triangles of one material and group of an OBJ: indices into the list of all its vertices. */
type ObjBucket = { material: string; group: string; corners: Uint32Array; n: number };

/**
 * An OBJ, read piece by piece. Its materials are its layers (Rhino writes one per layer
 * material); with a single material, its groups (2 to 200); else no layers, sorted by shape
 * as an STL. Y is up (as Rhino writes it by default, "Map Rhino Z to OBJ Y"); in mm, or in
 * metres when the jewel is smaller than 2 units across (as a glTF).
 */
export async function readObj(file: string, progress: Progress): Promise<Source> {
  const size = Math.max(1, fs.statSync(file).size);
  let vertices = new Float32Array(3 << 16);
  let nv = 0;
  const buckets = new Map<string, ObjBucket>();
  let material = "";
  let group = "";
  let bucket: ObjBucket | null = null;
  const face: number[] = [];
  const space = (c: number) => c === 32 || c === 9;

  const parse = (text: string) => {
    const c0 = text.charCodeAt(0);
    if (c0 === 118 /* v */ && space(text.charCodeAt(1))) {
      const parts = text.split(/\s+/);
      if (nv * 3 + 3 > vertices.length) {
        const grown = new Float32Array(vertices.length * 2);
        grown.set(vertices);
        vertices = grown;
      }
      vertices[nv * 3] = Number(parts[1]) || 0;
      vertices[nv * 3 + 1] = Number(parts[2]) || 0;
      vertices[nv * 3 + 2] = Number(parts[3]) || 0;
      nv++;
    } else if (c0 === 102 /* f */ && space(text.charCodeAt(1))) {
      const parts = text.split(/\s+/);
      face.length = 0;
      for (let i = 1; i < parts.length; i++) {
        const token = parts[i]!;
        if (!token) continue;
        const slash = token.indexOf("/");
        const k = parseInt(slash < 0 ? token : token.slice(0, slash), 10);
        if (!k) continue;
        // 1 is the first vertex, -1 the last one read.
        const index = k > 0 ? k - 1 : nv + k;
        if (index >= 0) face.push(index);
      }
      if (face.length < 3) return;
      if (!bucket) {
        const key = material + "\u0000" + group;
        bucket = buckets.get(key) ?? { material, group, corners: new Uint32Array(1 << 12), n: 0 };
        buckets.set(key, bucket);
      }
      // A polygon becomes a fan of triangles.
      for (let i = 1; i + 1 < face.length; i++) {
        if (bucket.n + 3 > bucket.corners.length) {
          const grown = new Uint32Array(bucket.corners.length * 2);
          grown.set(bucket.corners);
          bucket.corners = grown;
        }
        bucket.corners[bucket.n++] = face[0]!;
        bucket.corners[bucket.n++] = face[i]!;
        bucket.corners[bucket.n++] = face[i + 1]!;
      }
    } else if (text.startsWith("usemtl") && space(text.charCodeAt(6))) {
      material = text.slice(7).trim();
      bucket = null;
    } else if ((c0 === 103 /* g */ || c0 === 111 /* o */) && space(text.charCodeAt(1))) {
      group = text.slice(2).trim();
      bucket = null;
    }
  };

  let rest = "";
  let read = 0;
  for await (const part of fs.createReadStream(file, { encoding: "utf8", highWaterMark: 4 << 20 })) {
    const chunk = String(part);
    read += chunk.length;
    const text = rest + chunk;
    let start = 0;
    for (let end = text.indexOf("\n", start); end >= 0; end = text.indexOf("\n", start)) {
      const line = text.slice(start, end).trim();
      if (line) parse(line);
      start = end + 1;
    }
    rest = text.slice(start);
    progress(Math.min(0.8, (0.8 * read) / size), "read");
  }
  if (rest.trim()) parse(rest.trim());

  const used = [...buckets.values()].filter((b) => b.n > 0);
  const materials = new Set(used.map((b) => b.material));
  const groups = new Set(used.map((b) => b.group));
  const by = materials.size >= 2 ? "material" : groups.size >= 2 && groups.size <= 200 ? "group" : null;
  // Units: a jewel smaller than 2 units across is taken as metres.
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (let v = 0; v < nv * 3; v += 3) {
    for (let k = 0; k < 3; k++) {
      lo[k] = Math.min(lo[k]!, vertices[v + k]!);
      hi[k] = Math.max(hi[k]!, vertices[v + k]!);
    }
  }
  const largest = Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!);
  const scale = largest > 0 && largest < 2 ? 1000 : 1;
  const named = new Map<string, ObjBucket[]>();
  for (const b of used) {
    const name = by === "material" ? b.material || "default" : by === "group" ? b.group || "default" : "model";
    named.set(name, [...(named.get(name) ?? []), b]);
  }
  const layers: Layer[] = [];
  let triangles = 0;
  for (const [name, list] of named) {
    const corners = list.reduce((s, b) => s + b.n, 0);
    const welder = new Welder(Math.ceil(corners * 0.2));
    const indices = new Uint32Array(corners);
    let n = 0;
    for (const b of list) {
      for (let t = 0; t + 2 < b.n; t += 3) {
        const i0 = b.corners[t]!;
        const i1 = b.corners[t + 1]!;
        const i2 = b.corners[t + 2]!;
        // A face pointing to a vertex the file never gave is dropped.
        if (i0 >= nv || i1 >= nv || i2 >= nv) continue;
        const a = welder.add(vertices[i0 * 3]! * scale, vertices[i0 * 3 + 1]! * scale, vertices[i0 * 3 + 2]! * scale);
        const c = welder.add(vertices[i1 * 3]! * scale, vertices[i1 * 3 + 1]! * scale, vertices[i1 * 3 + 2]! * scale);
        const d = welder.add(vertices[i2 * 3]! * scale, vertices[i2 * 3 + 1]! * scale, vertices[i2 * 3 + 2]! * scale);
        if (a === c || c === d || a === d) continue;
        indices[n++] = a;
        indices[n++] = c;
        indices[n++] = d;
      }
    }
    if (n === 0) continue;
    triangles += n / 3;
    layers.push({ name, soups: [{ positions: welder.positions(), indices: indices.slice(0, n) }], repeated: [] });
  }
  progress(1, "read");
  if (triangles === 0) throw new Error("Aucune face trouvée dans ce fichier .obj.");
  return { layers, layered: by !== null, triangles, units: scale === 1 ? MM_ASSUMED : METRES_GUESSED };
}

/* ---------- Matrices (4×4, column-major as glTF) ---------- */

function multiply(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c * 4 + r] = a[r]! * b[c * 4]! + a[4 + r]! * b[c * 4 + 1]! + a[8 + r]! * b[c * 4 + 2]! + a[12 + r]! * b[c * 4 + 3]!;
  return out;
}

function rotationMatrix(x: number, y: number, z: number, w: number): Float32Array {
  return Float32Array.from([1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1]);
}

/** Rhino counts up along Z, glTF along Y: a quarter turn around X. */
const Z_UP_TO_Y_UP = rotationMatrix(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);

/* ---------- glTF ---------- */

async function gltfIo(): Promise<NodeIO> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });
  // Extensions of other viewers (WEBGI_*...) are skipped without a message.
  io.setLogger(new Logger(Logger.Verbosity.ERROR));
  // A texture that cannot be found is left empty: only the shapes and the names of the materials are used.
  io.setStrictResources(false);
  return io;
}

type GltfJson = { buffers?: { uri?: string }[]; images?: { uri?: string }[]; materials?: unknown[] };

const outside = (uri: string | undefined) => uri !== undefined && !uri.startsWith("data:");
const ONE_FILE = "Ce fichier glTF renvoie à d'autres fichiers (.bin) : exportez-le en .glb (un seul fichier), ou en STL/OBJ.";
/** An empty image, in place of the textures a .gltf keeps in other files (never read: no file outside the upload is opened). */
const PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/** The JSON of a .glb (null when the file is not one). */
function glbJson(file: string): GltfJson | null {
  const fd = fs.openSync(file, "r");
  try {
    const head = Buffer.alloc(20);
    // "glTF", then the first chunk, "JSON".
    if (fs.readSync(fd, head, 0, 20, 0) < 20 || head.readUInt32LE(0) !== 0x46546c67 || head.readUInt32LE(16) !== 0x4e4f534a) return null;
    const text = Buffer.alloc(head.readUInt32LE(12));
    fs.readSync(fd, text, 0, text.length, 20);
    return JSON.parse(text.toString("utf8")) as GltfJson;
  } finally {
    fs.closeSync(fd);
  }
}

/** A .glb, or a .gltf in one file (its data inside): one sent with its .bin apart cannot be read. Also its raw JSON. */
async function gltfDocument(io: NodeIO, file: string): Promise<{ doc: Document; json: GltfJson }> {
  const glb = glbJson(file);
  if (glb) {
    if (glb.buffers?.some((b) => outside(b.uri))) throw new Error(ONE_FILE);
    return { doc: await io.read(file), json: glb };
  }
  let json: GltfJson;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as GltfJson;
  } catch {
    throw new Error("Ce fichier glTF ne peut pas être lu : exportez-le en .glb.");
  }
  if (json.buffers?.some((b) => outside(b.uri))) throw new Error(ONE_FILE);
  for (const image of json.images ?? []) if (outside(image.uri)) image.uri = PIXEL;
  return { doc: await io.readJSON({ json: json as Parameters<NodeIO["readJSON"]>[0]["json"], resources: {} }), json };
}

/**
 * The stone settings of an iJewel export, by material name (WEBGI_materials_diamond, or the same settings kept in the
 * material's extras), read from the raw JSON: gltf-transform does not keep extensions it does not know.
 */
function ijewelDiamonds(json: GltfJson): Map<string, Partial<DiamondParams>> {
  const out = new Map<string, Partial<DiamondParams>>();
  for (const [i, material] of (json.materials ?? []).entries()) {
    const params = diamondOfMaterial(material);
    if (!params || Object.keys(params).length === 0) continue;
    const name = (material as { name?: unknown }).name;
    out.set(typeof name === "string" && name ? name : "#" + i, params);
  }
  return out;
}

/** The stone settings of our own export (BERETE_gem on a material), by material name; read from the raw JSON too. */
function bereteGems(json: GltfJson): Map<string, Partial<DiamondParams>> {
  const out = new Map<string, Partial<DiamondParams>>();
  for (const [i, material] of (json.materials ?? []).entries()) {
    const gem = bereteGemOfMaterial(material);
    if (!gem) continue;
    const name = (material as { name?: unknown }).name;
    out.set(typeof name === "string" && name ? name : "#" + i, gem.params);
  }
  return out;
}

/** A 4×4 matrix (column-major) from a translation, a rotation (quaternion) and a scale. */
function compose(t: number[], q: number[], s: number[]): Float32Array {
  const m = rotationMatrix(q[0]!, q[1]!, q[2]!, q[3]!);
  for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) m[c * 4 + r]! *= s[c]!;
  m[12] = t[0]!;
  m[13] = t[1]!;
  m[14] = t[2]!;
  return m;
}

/** The copies a node draws with EXT_mesh_gpu_instancing (their matrices in the node's space), or null. */
function instancesOf(node: GltfNode): Float32Array[] | null {
  const ext = node.getExtension<InstancedMesh>("EXT_mesh_gpu_instancing");
  if (!ext) return null;
  const t = ext.getAttribute("TRANSLATION");
  const r = ext.getAttribute("ROTATION");
  const s = ext.getAttribute("SCALE");
  const count = Math.max(t?.getCount() ?? 0, r?.getCount() ?? 0, s?.getCount() ?? 0);
  if (count === 0) return null;
  const out: Float32Array[] = [];
  for (let i = 0; i < count; i++) {
    const tv = t ? t.getElement(i, [0, 0, 0]) : [0, 0, 0];
    const rv = r ? r.getElement(i, [0, 0, 0, 1]) : [0, 0, 0, 1];
    const sv = s ? s.getElement(i, [1, 1, 1]) : [1, 1, 1];
    out.push(compose(tv, rv, sv));
  }
  return out;
}

/** A .glb or a .gltf. */
export async function readGltf(file: string, progress: Progress): Promise<Source> {
  progress(0, "read");
  const io = await gltfIo();
  const { doc, json } = await gltfDocument(io, file);
  progress(0.5, "read");
  const root = doc.getRoot();
  const diamonds = ijewelDiamonds(json);
  const gems = bereteGems(json);
  const materialList = root.listMaterials();
  // Which meshes are drawn more than once (several nodes, or copies of EXT_mesh_gpu_instancing).
  const uses = new Map<object, number>();
  const instances = new Map<object, Float32Array[]>();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;
    const copies = instancesOf(node);
    if (copies) instances.set(node, copies);
    uses.set(mesh, (uses.get(mesh) ?? 0) + (copies ? Math.max(2, copies.length) : 1));
  }
  // World matrices. A single root node without mesh that only scales and
  // places the jewel (viewers fit models to their screen this way) keeps only
  // its rotation: the meshes keep the units they were drawn in.
  const worlds = new Map<object, Float32Array>();
  const sceneRoots = (root.getDefaultScene() ?? root.listScenes()[0])?.listChildren() ?? [];
  const visit = (node: (typeof sceneRoots)[number], parent: Float32Array, wrapper: boolean) => {
    let local: Float32Array = Float32Array.from(node.getMatrix());
    if (wrapper) {
      const r = node.getRotation();
      local = rotationMatrix(r[0], r[1], r[2], r[3]);
    }
    const world = multiply(parent, local);
    worlds.set(node, world);
    for (const child of node.listChildren()) visit(child, world, false);
  };
  const identity = Float32Array.from([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const single = sceneRoots.length === 1 && !sceneRoots[0]!.getMesh() && sceneRoots[0]!.listChildren().length > 0;
  for (const node of sceneRoots) visit(node, identity, single);
  // Units: glTF counts in metres, exports of Rhino often keep mm. A jewel
  // smaller than 2 units across is taken as metres.
  const lo = [Infinity, Infinity, Infinity];
  const hi = [-Infinity, -Infinity, -Infinity];
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    const nodeWorld = worlds.get(node);
    if (!mesh || !nodeWorld) continue;
    const places = instances.get(node)?.map((copy) => multiply(nodeWorld, copy)) ?? [nodeWorld];
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const min = pos.getMin([]);
      const max = pos.getMax([]);
      for (const world of places) {
        for (const x of [min[0]!, max[0]!]) for (const y of [min[1]!, max[1]!]) for (const z of [min[2]!, max[2]!]) {
          for (let k = 0; k < 3; k++) {
            const v = world[k]! * x + world[4 + k]! * y + world[8 + k]! * z + world[12 + k]!;
            lo[k] = Math.min(lo[k]!, v);
            hi[k] = Math.max(hi[k]!, v);
          }
        }
      }
    }
  }
  const largest = Math.max(hi[0]! - lo[0]!, hi[1]! - lo[1]!, hi[2]! - lo[2]!);
  const scale = largest > 0 && largest < 2 ? 1000 : 1;
  const layers = new Map<string, Layer>();
  const repeatedOf = new Map<object, Repeated[]>();
  let triangles = 0;
  const nodes = root.listNodes().filter((node) => node.getMesh() && worlds.has(node));
  for (const [i, node] of nodes.entries()) {
    const mesh = node.getMesh()!;
    const copies = instances.get(node);
    // Each copy of the node (one, or those of EXT_mesh_gpu_instancing), its translation in mm.
    const placements = (copies ? copies.map((copy) => multiply(worlds.get(node)!, copy)) : [Float32Array.from(worlds.get(node)!)]).map((m) => {
      for (let k = 12; k < 15; k++) m[k]! *= scale;
      return m;
    });
    const world = placements[0]!;
    const shared = (uses.get(mesh) ?? 0) > 1;
    let reps = repeatedOf.get(mesh);
    for (const [p, prim] of mesh.listPrimitives().entries()) {
      if (prim.getMode() !== 4) continue; // triangles only
      const pos = prim.getAttribute("POSITION")?.getArray();
      if (!pos) continue;
      const material = prim.getMaterial();
      const name = material?.getName() || "default";
      const layer = layerOf(layers, name);
      if (material && !layer.color) {
        // glTF colours are linear: shown as sRGB.
        const [r, g, b] = material.getBaseColorFactor();
        layer.color = colorOf([r, g, b]);
      }
      if (material && !layer.diamond) {
        const index = "#" + materialList.indexOf(material);
        // Our own extension first (a file of this editor), then an iJewel export's.
        const params = gems.get(material.getName()) ?? gems.get(index) ?? diamonds.get(material.getName()) ?? diamonds.get(index);
        if (params) layer.diamond = params;
      }
      if (shared) {
        if (!reps) {
          reps = [];
          repeatedOf.set(mesh, reps);
        }
        let rep = reps[p];
        if (!rep) {
          const soup = weld(pos, prim.getIndices()?.getArray() ?? null, scale);
          // The geometry is in mm, the matrix keeps its rotation and scale.
          rep = { soup, matrices: [] };
          reps[p] = rep;
          layer.repeated.push(rep);
        }
        rep.matrices.push(...placements);
        triangles += (rep.soup.indices.length / 3) * placements.length;
      } else {
        const soup = weld(pos, prim.getIndices()?.getArray() ?? null, scale);
        const moved = new Float32Array(soup.positions.length);
        const m = world;
        for (let v = 0; v < soup.positions.length; v += 3) {
          const x = soup.positions[v]!;
          const y = soup.positions[v + 1]!;
          const z = soup.positions[v + 2]!;
          moved[v] = m[0]! * x + m[4]! * y + m[8]! * z + m[12]!;
          moved[v + 1] = m[1]! * x + m[5]! * y + m[9]! * z + m[13]!;
          moved[v + 2] = m[2]! * x + m[6]! * y + m[10]! * z + m[14]!;
        }
        layer.soups.push({ positions: moved, indices: soup.indices });
        triangles += soup.indices.length / 3;
      }
    }
    if (i % 200 === 0) progress(0.5 + (0.5 * i) / nodes.length, "read");
  }
  progress(1, "read");
  // The report names the stones an iJewel export set (BERETE_gem ones are ours: no note needed).
  const found = [...layers.values()].filter((l) => l.diamond && !gems.has(l.name));
  return {
    layers: [...layers.values()],
    layered: true,
    triangles,
    units: scale === 1 ? MM_ASSUMED : METRES_GUESSED,
    ...(diamonds.size > 0 ? { ijewel: { materials: found.map((l) => ({ name: l.name, params: Object.keys(l.diamond!) })) } } : {}),
  };
}

/* ---------- Rhino ---------- */

type RhinoModule = Record<string, unknown> & {
  File3dm: { fromByteArray(bytes: Uint8Array): RhinoFile | null };
  ObjectType: Record<string, unknown>;
  MeshType: Record<string, unknown>;
  UnitSystem: Record<string, unknown>;
  ObjectMaterialSource: Record<string, unknown>;
  ObjectMode?: Record<string, unknown>;
  ActiveSpace?: Record<string, unknown>;
  Brep: { createFromSurface?: (surface: unknown) => RhinoGeometry | null };
};
type RhinoFile = {
  objects(): { count: number; get(i: number): RhinoObject; findId(id: string): RhinoObject | null };
  layers(): { count: number; get(i: number): { name: string; fullPath?: string; color?: { r: number; g: number; b: number }; visible?: boolean; id?: string; parentLayerId?: string } };
  instanceDefinitions(): { count: number; get(i: number): RhinoIdef; findId(id: string): RhinoIdef | null };
  materials(): { count: number; get(i: number): { getBitmapTexture?: () => { fileName?: string } | null } | null };
  settings(): { modelUnitSystem: unknown };
  delete?: () => void;
};
type RhinoObject = {
  geometry(): RhinoGeometry;
  attributes(): { layerIndex: number; isInstanceDefinitionObject: boolean; visible: boolean; mode?: unknown; activeSpace?: unknown; name?: string; materialIndex: number; materialSource: unknown };
};
type RhinoGeometry = Record<string, unknown> & { objectType: unknown; getBoundingBox?: () => { min: number[]; max: number[] } };
type RhinoIdef = { getObjectIds(): string[]; id: string };

const MM_PER_UNIT: Record<string, number> = { Millimeters: 1, Centimeters: 10, Decimeters: 100, Meters: 1000, Kilometers: 1_000_000, Microns: 0.001, Nanometers: 0.000001, Inches: 25.4, Feet: 304.8, Yards: 914.4, Mils: 0.0254, Microinches: 0.0000254, None: 1 };

/**
 * The placement of a block copy (an InstanceReference): its transformation as a 4×4 column-major matrix, in mm (the
 * geometry of the block is turned into mm first, so only the translation takes the unit). Read row by row from
 * rhino3dm (M00, M01, M02, M03...), the order it documents, and transposed: a copy is p ↦ M·p, M's last column its
 * translation. Checked on Yoni's three files (27/11/2026): each of the 2 935 copies falls where Rhino puts it
 * (scripts/rhino-check.ts).
 */
function placementOf(geometry: RhinoGeometry, scale: number): Float32Array {
  const r = (geometry.xform as { toFloatArray(rowDominant: boolean): number[] }).toFloatArray(true);
  return Float32Array.from([r[0]!, r[4]!, r[8]!, r[12]!, r[1]!, r[5]!, r[9]!, r[13]!, r[2]!, r[6]!, r[10]!, r[14]!, r[3]! * scale, r[7]! * scale, r[11]! * scale, r[15]!]);
}

/**
 * Volumes saved without their render mesh are meshed here from their NURBS (./nurbs.ts). Checked on Yoni's three
 * files of 26/11/2026 (3 234 faces, 264 closed volumes): every face meshed, every closed volume without a crack.
 */
const MESH_NURBS = true;

function rhinoMeshSoup(mesh: Record<string, unknown>, scale: number): Soup | null {
  const vertices = (mesh.vertices as () => { count: number; get(i: number): number[] })();
  const faces = (mesh.faces as () => { count: number; get(i: number): number[] })();
  const pos = new Float32Array(vertices.count * 3);
  for (let i = 0; i < vertices.count; i++) {
    const v = vertices.get(i);
    pos[i * 3] = v[0]!;
    pos[i * 3 + 1] = v[1]!;
    pos[i * 3 + 2] = v[2]!;
  }
  const idx: number[] = [];
  for (let i = 0; i < faces.count; i++) {
    const [a, b, c, d] = faces.get(i) as [number, number, number, number];
    idx.push(a, b, c);
    if (c !== d) idx.push(a, c, d);
  }
  if (idx.length === 0) return null;
  return weld(pos, idx, scale);
}

/** A volume Rhino saved without its render mesh, by kind (see Skipped). */
type Missing = "breps" | "extrusions" | "subds" | null;

/** The triangles of a polysurface made from its NURBS; `complete`: every face meshed (or without area). */
function nurbsSoups(brep: RhinoGeometry | null | undefined, scale: number): { soups: Soup[]; complete: boolean } {
  if (!brep || !MESH_NURBS) return { soups: [], complete: false };
  try {
    const made = meshBrep(brep as unknown as RhinoBrep, scale);
    // No face failed: complete, even when it draws nothing (a surface shrunk to a curve has no area: `empty` below).
    return { soups: made.soup ? [made.soup] : [], complete: made.failed === 0 };
  } catch {
    return { soups: [], complete: false };
  }
}

/** A volume of the file that draws nothing although nothing failed: without any area (counted in Skipped.empty). */
const isEmptyVolume = (r: { soups: Soup[]; missing: Missing }) => r.missing === null && r.soups.length === 0;

/**
 * The triangles of one Rhino geometry: meshes, polysurfaces (their render mesh, else meshed here from their NURBS),
 * extrusions, lone surfaces, SubD. `missing`: a volume that could not be meshed (a polysurface with only some faces
 * meshed counts as missing too, its meshed faces are kept); `tessellated`: meshed here from its NURBS. Curves, texts
 * and the like give nothing and are not missing.
 */
function rhinoSoups(rhino: RhinoModule, geometry: RhinoGeometry, scale: number): { soups: Soup[]; missing: Missing; tessellated: boolean } {
  const type = geometry.objectType;
  const types = rhino.ObjectType;
  if (type === types.Mesh) {
    const soup = rhinoMeshSoup(geometry, scale);
    return { soups: soup ? [soup] : [], missing: null, tessellated: false };
  }
  const meshes: Record<string, unknown>[] = [];
  if (type === types.Brep) {
    const faces = (geometry.faces as () => { count: number; get(i: number): { getMesh(t: unknown): Record<string, unknown> | null } })();
    let unmeshed = false;
    for (let i = 0; i < faces.count; i++) {
      const m = faces.get(i).getMesh(rhino.MeshType.Any);
      if (m) meshes.push(m);
      else unmeshed = true;
    }
    if (unmeshed) {
      // No render mesh saved in the file (or only for some faces): the whole polysurface meshed here.
      const made = nurbsSoups(geometry, scale);
      if (made.complete || made.soups.length > 0) return { soups: made.soups, missing: made.complete ? null : "breps", tessellated: made.complete };
      return { soups: meshes.map((m) => rhinoMeshSoup(m, scale)).filter((s): s is Soup => s !== null), missing: "breps", tessellated: false };
    }
  } else if (type === types.Extrusion || type === types.SubD) {
    const getMesh = geometry.getMesh as ((t: unknown) => Record<string, unknown> | null) | undefined;
    const m = getMesh?.call(geometry, rhino.MeshType.Any);
    if (m) meshes.push(m);
    else if (type === types.Extrusion) {
      const toBrep = geometry.toBrep as ((split: boolean) => RhinoGeometry | null) | undefined;
      const made = nurbsSoups(toBrep?.call(geometry, true), scale);
      return { soups: made.soups, missing: made.complete ? null : "extrusions", tessellated: made.complete };
    } else return { soups: [], missing: "subds", tessellated: false };
  } else if (type === types.Surface) {
    // A lone surface keeps no render mesh in the file.
    const made = nurbsSoups(rhino.Brep.createFromSurface?.(geometry), scale);
    return { soups: made.soups, missing: made.complete ? null : "breps", tessellated: made.complete };
  }
  return { soups: meshes.map((m) => rhinoMeshSoup(m, scale)).filter((s): s is Soup => s !== null), missing: null, tessellated: false };
}

const IMAGE_NAME = /\.(jpe?g|png|bmp|gif|tiff?|webp|heic|psd)$/i;

/**
 * A picture placed in Rhino (its command "Picture": a flat frame named after the photo, with
 * the photo as its material), to trace a drawing: never part of the jewel.
 */
function isPicture(rhino: RhinoModule, doc: RhinoFile, obj: RhinoObject): boolean {
  const geometry = obj.geometry();
  const types = rhino.ObjectType;
  if (geometry.objectType !== types.Brep && geometry.objectType !== types.Surface && geometry.objectType !== types.Mesh) return false;
  const box = geometry.getBoundingBox?.();
  if (!box) return false;
  const sides = [0, 1, 2].map((k) => box.max[k]! - box.min[k]!);
  const wide = Math.max(...sides);
  if (!(wide > 0) || Math.min(...sides) > wide * 1e-4) return false;
  const attributes = obj.attributes();
  if (IMAGE_NAME.test((attributes.name ?? "").trim())) return true;
  if (attributes.materialSource !== rhino.ObjectMaterialSource.MaterialFromObject || attributes.materialIndex < 0) return false;
  return Boolean(doc.materials().get(attributes.materialIndex)?.getBitmapTexture?.()?.fileName);
}

/** What `rhinoSoups` gives nothing for and is not a volume: curves, dimensions, texts, points... */
function isDrawing(rhino: RhinoModule, geometry: RhinoGeometry): boolean {
  const t = rhino.ObjectType;
  return ![t.Mesh, t.Brep, t.Surface, t.Extrusion, t.SubD, t.InstanceReference].includes(geometry.objectType);
}

/**
 * The file as rhino3dm reads it: without its drawings (./archive3dm.ts), and without the objects rhino3dm cannot read
 * (it stops at the first one, silently: the object it stopped at is taken out and the file read again).
 */
function openRhino(rhino: RhinoModule, bytes: Uint8Array): { doc: RhinoFile; drawings: number; drawingKinds: Record<string, number>; unreadable: number } {
  const skip = new Set<number>();
  let best: { doc: RhinoFile; kept: number; count: number } | null = null;
  let drawings = 0;
  let drawingKinds: Record<string, number> = {};
  // The original number of the record rhino3dm stopped at.
  let stoppedAt = -1;
  for (let attempt = 0; attempt < 40; attempt++) {
    const pruned = volumesOnly(bytes, skip);
    const doc = rhino.File3dm.fromByteArray(pruned.bytes);
    if (!doc) break;
    // Every record read gives one object: fewer, and rhino3dm stopped at the record after the last one it read (or
    // dropped one on the way without a word).
    const count = doc.objects().count;
    const done = pruned.kept < 0 || count >= pruned.kept;
    const at = done ? Infinity : pruned.records[count]!;
    if (best && at <= stoppedAt) {
      // Taking the object out did not get it further: it was dropped, not stopped at. The best reading is kept.
      doc.delete?.();
      skip.delete([...skip].pop()!);
      break;
    }
    best?.doc.delete?.();
    best = { doc, kept: pruned.kept, count };
    drawings = Object.values(pruned.dropped).reduce((sum, n) => sum + n, 0);
    drawingKinds = { ...pruned.dropped };
    stoppedAt = at;
    if (done) break;
    skip.add(at);
  }
  if (!best) throw new Error("Ce fichier .3dm ne peut pas être lu.");
  // The records kept are volumes and block copies: each one that gave no object is a missing piece.
  const lost = best.kept > 0 ? Math.max(0, best.kept - best.count) : 0;
  return { doc: best.doc, drawings, drawingKinds, unreadable: skip.size + lost };
}

/** The name of a value of a rhino3dm enum, in lower case ("curve", "annotation"...), as ./archive3dm.ts names kinds. */
const nameOf = (values: Record<string, unknown>, value: unknown) => (Object.entries(values).find(([, v]) => v === value)?.[0] ?? "other").toLowerCase();

const hexOf = (c: { r: number; g: number; b: number } | undefined) =>
  c && [c.r, c.g, c.b].every((x) => Number.isFinite(x)) ? "#" + [c.r, c.g, c.b].map((x) => Math.round(Math.min(255, Math.max(0, x))).toString(16).padStart(2, "0")).join("") : undefined;

export async function read3dm(file: string, progress: Progress): Promise<Source> {
  progress(0, "read");
  const { default: rhino3dm } = (await import("rhino3dm")) as unknown as { default: () => Promise<RhinoModule> };
  const rhino = await rhino3dm();
  const { doc, drawings, drawingKinds, unreadable } = openRhino(rhino, new Uint8Array(fs.readFileSync(file)));
  const unitName = Object.entries(rhino.UnitSystem).find(([, v]) => v === doc.settings().modelUnitSystem)?.[0] ?? "Millimeters";
  const scale = MM_PER_UNIT[unitName] ?? 1;
  const layerNames: string[] = [];
  const layerColors: (string | undefined)[] = [];
  const fileLayers = doc.layers();
  // Two layers of the same name in different groups (图层01 and 组名1::图层01) that both hold objects keep their full
  // path, never merged; otherwise the short name (the one the jeweller sees, remembered from one model to the next).
  const used = new Set<number>();
  for (let i = 0; i < doc.objects().count; i++) used.add(doc.objects().get(i).attributes().layerIndex);
  const usedNames = new Map<string, number>();
  for (const i of used) if (i >= 0 && i < fileLayers.count) usedNames.set(fileLayers.get(i).name, (usedNames.get(fileLayers.get(i).name) ?? 0) + 1);
  for (let i = 0; i < fileLayers.count; i++) {
    const layer = fileLayers.get(i);
    const name = layer.name || "Layer " + (i + 1);
    layerNames.push((usedNames.get(layer.name) ?? 0) > 1 && layer.fullPath ? layer.fullPath : name);
    layerColors.push(hexOf(layer.color));
  }
  // A layer is shown when it is on and so is every layer above it (Rhino hides the layers under a parent turned off).
  const layerById = new Map<string, number>();
  for (let i = 0; i < fileLayers.count; i++) {
    const id = fileLayers.get(i).id;
    if (id) layerById.set(id, i);
  }
  const layerOn: boolean[] = [];
  for (let i = 0; i < fileLayers.count; i++) {
    let on = true;
    let at: number | undefined = i;
    for (let depth = 0; at !== undefined && depth < 64; depth++) {
      const layer = fileLayers.get(at);
      if (layer.visible === false) {
        on = false;
        break;
      }
      at = layer.parentLayerId ? layerById.get(layer.parentLayerId) : undefined;
    }
    layerOn.push(on);
  }
  const hiddenMode = rhino.ObjectMode?.Hidden;
  const pageSpace = rhino.ActiveSpace?.PageSpace;
  /** Why Rhino does not show an object of the model (null: it does). A copy of a block on a layer turned off is not shown, nor is an object of a block on such a layer. */
  const unseen = (a: ReturnType<RhinoObject["attributes"]>): "hidden" | "offLayers" | "layout" | null => {
    if (a.visible === false || (hiddenMode !== undefined && a.mode === hiddenMode)) return "hidden";
    if (a.layerIndex >= 0 && a.layerIndex < layerOn.length && !layerOn[a.layerIndex]) return "offLayers";
    if (pageSpace !== undefined && a.activeSpace === pageSpace) return "layout";
    return null;
  };
  const layers = new Map<string, Layer>();
  const layerAt = (index: number) => {
    const name = layerNames[index] ?? "default";
    const layer = layerOf(layers, name);
    if (!layer.color && layerColors[index]) layer.color = layerColors[index];
    return layer;
  };
  let triangles = 0;
  let tessellated = 0;
  const skipped: Skipped = {
    noMesh: { breps: 0, extrusions: 0, subds: 0, layers: [], byLayer: {} },
    stray: { count: 0, names: [] },
    hidden: 0,
    drawings,
    ...(Object.keys(drawingKinds).length > 0 ? { drawingKinds } : {}),
    ...(unreadable ? { unreadable } : {}),
  };
  const miss = (kind: Missing, layer: string) => {
    if (!kind) return;
    skipped.noMesh[kind]++;
    if (!skipped.noMesh.layers.includes(layer)) skipped.noMesh.layers.push(layer);
    skipped.noMesh.byLayer![layer] = (skipped.noMesh.byLayer![layer] ?? 0) + 1;
  };
  // Objects left out, each counted once (an object of a block too, however many copies of the block there are).
  const leftOut = new Set<string>();
  const leave = (why: "hidden" | "offLayers" | "layout" | "empty", key: string) => {
    if (leftOut.has(why + key)) return;
    leftOut.add(why + key);
    if (why === "hidden") skipped.hidden++;
    else skipped[why] = (skipped[why] ?? 0) + 1;
  };
  // The geometry of a block, in mm in its own space, by layer; `missing`: a volume that could not be meshed.
  const blocks = new Map<string, { parts: { layer: number; soup: Soup; rep: Map<number, Repeated> }[]; missing: Missing; tessellated: boolean; empty: boolean; layer: number }>();
  const turned = (soup: Soup): Soup => {
    const p = soup.positions;
    const out = new Float32Array(p.length);
    for (let v = 0; v < p.length; v += 3) {
      out[v] = p[v]!;
      out[v + 1] = p[v + 2]!;
      out[v + 2] = -p[v + 1]!;
    }
    return { positions: out, indices: soup.indices };
  };

  // A copy of a block: each object of the block placed by `matrix` (the copy's placement, after its parents': a copy
  // inside a block is placed by its own transformation, then by the copy of that block).
  const place = (idefId: string, matrix: Float32Array, depth: number) => {
    if (depth > 8) return;
    const idef = doc.instanceDefinitions().findId(idefId);
    if (!idef) return;
    for (const id of idef.getObjectIds()) {
      const obj = doc.objects().findId(id);
      // Missing: a curve, text... of the block, taken out before reading (./archive3dm.ts).
      if (!obj) continue;
      const geometry = obj.geometry();
      const attributes = obj.attributes();
      const layerIndex = attributes.layerIndex;
      const key = idefId + ":" + id;
      const why = unseen(attributes);
      if (why) {
        leave(why, key);
        continue;
      }
      if (geometry.objectType === rhino.ObjectType.InstanceReference) {
        place(String(geometry.parentIdefId), multiply(matrix, placementOf(geometry, scale)), depth + 1);
        continue;
      }
      if (isDrawing(rhino, geometry)) continue;
      let block = blocks.get(key);
      if (!block) {
        const made = rhinoSoups(rhino, geometry, scale);
        const empty = isEmptyVolume(made);
        block = { parts: made.soups.map((soup) => ({ layer: layerIndex, soup, rep: new Map() })), missing: made.missing, tessellated: made.tessellated && !empty, empty, layer: layerIndex };
        blocks.set(key, block);
      }
      if (block.empty) leave("empty", key);
      // Each copy of a volume that could not be meshed is missing.
      miss(block.missing, layerNames[block.layer] ?? "default");
      if (block.tessellated) tessellated++;
      for (const part of block.parts) {
        const layer = layerAt(part.layer);
        let rep = part.rep.get(part.layer);
        if (!rep) {
          rep = { soup: part.soup, matrices: [] };
          part.rep.set(part.layer, rep);
          layer.repeated.push(rep);
        }
        rep.matrices.push(matrix);
        triangles += part.soup.indices.length / 3;
      }
    }
  };

  const objects = doc.objects();
  for (let i = 0; i < objects.count; i++) {
    const obj = objects.get(i);
    const attributes = obj.attributes();
    if (attributes.isInstanceDefinitionObject) continue;
    const why = unseen(attributes);
    if (why) {
      leave(why, String(i));
      continue;
    }
    const geometry = obj.geometry();
    const layerName = layerNames[attributes.layerIndex] ?? "default";
    if (geometry.objectType === rhino.ObjectType.InstanceReference) {
      place(String(geometry.parentIdefId), multiply(Z_UP_TO_Y_UP, placementOf(geometry, scale)), 0);
    } else if (isPicture(rhino, doc, obj)) {
      skipped.stray.count++;
      if (skipped.stray.names.length < 20) skipped.stray.names.push((attributes.name ?? "").trim() || layerName);
    } else if (isDrawing(rhino, geometry)) {
      skipped.drawings++;
      const kind = nameOf(rhino.ObjectType, geometry.objectType);
      skipped.drawingKinds = { ...skipped.drawingKinds, [kind]: (skipped.drawingKinds?.[kind] ?? 0) + 1 };
    } else {
      const made = rhinoSoups(rhino, geometry, scale);
      const { soups, missing } = made;
      miss(missing, layerName);
      if (isEmptyVolume(made)) leave("empty", String(i));
      else if (made.tessellated) tessellated++;
      for (const soup of soups) {
        layerAt(attributes.layerIndex).soups.push(turned(soup));
        triangles += soup.indices.length / 3;
      }
    }
    if (i % 20 === 0) progress(i / objects.count, "read");
  }
  doc.delete?.();
  // A block drawn once is ordinary geometry.
  for (const layer of layers.values()) {
    layer.repeated = layer.repeated.filter((rep) => {
      if (rep.matrices.length > 1) return true;
      const m = rep.matrices[0]!;
      const p = rep.soup.positions;
      const moved = new Float32Array(p.length);
      for (let v = 0; v < p.length; v += 3) {
        moved[v] = m[0]! * p[v]! + m[4]! * p[v + 1]! + m[8]! * p[v + 2]! + m[12]!;
        moved[v + 1] = m[1]! * p[v]! + m[5]! * p[v + 1]! + m[9]! * p[v + 2]! + m[13]!;
        moved[v + 2] = m[2]! * p[v]! + m[6]! * p[v + 1]! + m[10]! * p[v + 2]! + m[14]!;
      }
      layer.soups.push({ positions: moved, indices: rep.soup.indices });
      return false;
    });
  }
  progress(1, "read");
  if (triangles === 0) {
    const missing = missingVolumes(skipped);
    const where = Object.entries(skipped.noMesh.byLayer ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, n]) => "« " + name + " » : " + n)
      .join(", ");
    throw new Error(
      missing > 0
        ? "Rien à montrer : " + missing + (missing > 1 ? " volumes n'ont pas pu être maillés" : " volume n'a pas pu être maillé") + (where ? " (calques " + where + ")" : "") + ". Demandez au dessinateur d'ouvrir le fichier dans Rhino, de passer en vue Ombrée, puis d'enregistrer sans cocher « Enregistrer petit » ; ou d'exporter en GLB ou en OBJ."
        : "Aucun volume trouvé dans ce fichier .3dm (seulement des courbes, des cotes, des objets cachés ou sur des calques éteints).",
    );
  }
  return {
    layers: [...layers.values()].filter((l) => l.soups.length > 0 || l.repeated.length > 0),
    layered: true,
    triangles,
    skipped,
    units: { file: unitName, from: "file", mmPerUnit: scale, applied: scale !== 1 },
    ...(tessellated > 0 ? { tessellated } : {}),
  };
}

export async function readModel(file: string, kind: SourceKind, progress: Progress): Promise<Source> {
  if (kind === "stl") return readStl(file, progress);
  if (kind === "obj") return readObj(file, progress);
  if (kind === "3dm") return read3dm(file, progress);
  if (kind === "fbx") return readFbx(file, progress);
  return readGltf(file, progress);
}
