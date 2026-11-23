/*
 * Reading a 3D file into layers of triangles, in mm:
 * - STL (binary or text), read piece by piece (files of several hundred MB);
 * - OBJ (text), read piece by piece, its materials (or groups) being the layers;
 * - glTF (.glb, or .gltf in one file), its materials being the layers (exports of Rhino via iJewel3D);
 * - Rhino (.3dm), its layers and its blocks (repeated stones). Only what Rhino saved as
 *   triangles can be read (meshes, render meshes of the polysurfaces): a polysurface saved
 *   without its render mesh is counted in `skipped`, as are the pictures placed in the file.
 * A mesh drawn several times (glTF nodes sharing a mesh, Rhino blocks) is
 * kept once with the placement of each copy.
 */
import fs from "node:fs";
import { Logger, NodeIO, type Document } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import draco3d from "draco3dgltf";
import { weld, Welder, type Soup } from "./geometry.js";

/** Several copies of one mesh: its triangles and one 4×4 matrix (column-major) per copy. */
export type Repeated = { soup: Soup; matrices: Float32Array[] };

export type Layer = { name: string; soups: Soup[]; repeated: Repeated[] };

/** What a file holds and the model does not show (a .3dm only). */
export type Skipped = {
  /**
   * Volumes saved without their render mesh (rhino3dm cannot make one): missing from the
   * model. Polysurfaces and surfaces, extrusions, SubD; a block counts once per copy.
   */
  noMesh: { breps: number; extrusions: number; subds: number; layers: string[] };
  /** Objects that are not part of the jewel, left out: pictures placed in Rhino (a flat frame with a photo). */
  stray: { count: number; names: string[] };
  /** Objects hidden in Rhino, left out as Rhino does. */
  hidden: number;
  /** Curves, dimensions, texts, points: drawings, never shown. */
  drawings: number;
};

/** The volumes missing from the model: a model with any is incomplete. */
export function missingVolumes(skipped: Skipped | undefined): number {
  return skipped ? skipped.noMesh.breps + skipped.noMesh.extrusions + skipped.noMesh.subds : 0;
}

export type SourceKind = "stl" | "obj" | "glb" | "gltf" | "3dm";

export type Source = {
  layers: Layer[];
  /** False for an STL (or an OBJ with a single material): no layers, the parts are sorted by shape (stones, metal). */
  layered: boolean;
  triangles: number;
  skipped?: Skipped;
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
  return { layers: [{ name: "model", soups: [soup], repeated: [] }], layered: false, triangles };
}

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
  return { layers: [{ name: "model", soups: [soup], repeated: [] }], layered: false, triangles: n / 3 };
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
  return { layers, layered: by !== null, triangles };
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

type GltfJson = { buffers?: { uri?: string }[]; images?: { uri?: string }[] };

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

/** A .glb, or a .gltf in one file (its data inside): one sent with its .bin apart cannot be read. */
async function gltfDocument(io: NodeIO, file: string): Promise<Document> {
  const glb = glbJson(file);
  if (glb) {
    if (glb.buffers?.some((b) => outside(b.uri))) throw new Error(ONE_FILE);
    return io.read(file);
  }
  let json: GltfJson;
  try {
    json = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as GltfJson;
  } catch {
    throw new Error("Ce fichier glTF ne peut pas être lu : exportez-le en .glb.");
  }
  if (json.buffers?.some((b) => outside(b.uri))) throw new Error(ONE_FILE);
  for (const image of json.images ?? []) if (outside(image.uri)) image.uri = PIXEL;
  return io.readJSON({ json: json as Parameters<NodeIO["readJSON"]>[0]["json"], resources: {} });
}

/** A .glb or a .gltf. */
export async function readGltf(file: string, progress: Progress): Promise<Source> {
  progress(0, "read");
  const io = await gltfIo();
  const doc: Document = await gltfDocument(io, file);
  progress(0.5, "read");
  const root = doc.getRoot();
  // Which meshes are drawn more than once.
  const uses = new Map<object, number>();
  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (mesh) uses.set(mesh, (uses.get(mesh) ?? 0) + 1);
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
    const world = worlds.get(node);
    if (!mesh || !world) continue;
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const min = pos.getMin([]);
      const max = pos.getMax([]);
      for (const x of [min[0]!, max[0]!]) for (const y of [min[1]!, max[1]!]) for (const z of [min[2]!, max[2]!]) {
        for (let k = 0; k < 3; k++) {
          const v = world[k]! * x + world[4 + k]! * y + world[8 + k]! * z + world[12 + k]!;
          lo[k] = Math.min(lo[k]!, v);
          hi[k] = Math.max(hi[k]!, v);
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
    const world = Float32Array.from(worlds.get(node)!);
    for (let k = 12; k < 15; k++) world[k]! *= scale;
    const shared = (uses.get(mesh) ?? 0) > 1;
    let reps = repeatedOf.get(mesh);
    for (const [p, prim] of mesh.listPrimitives().entries()) {
      if (prim.getMode() !== 4) continue; // triangles only
      const pos = prim.getAttribute("POSITION")?.getArray();
      if (!pos) continue;
      const name = prim.getMaterial()?.getName() || "default";
      const layer = layerOf(layers, name);
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
        rep.matrices.push(world);
        triangles += rep.soup.indices.length / 3;
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
  return { layers: [...layers.values()], layered: true, triangles };
}

/* ---------- Rhino ---------- */

type RhinoModule = Record<string, unknown> & {
  File3dm: { fromByteArray(bytes: Uint8Array): RhinoFile | null };
  ObjectType: Record<string, unknown>;
  MeshType: Record<string, unknown>;
  UnitSystem: Record<string, unknown>;
  ObjectMaterialSource: Record<string, unknown>;
  Mesh: { createFromBrep?: (brep: unknown, params: unknown) => unknown[] | null };
  MeshingParameters: { qualityRenderMesh?: unknown; default?: unknown };
};
type RhinoFile = {
  objects(): { count: number; get(i: number): RhinoObject; findId(id: string): RhinoObject | null };
  layers(): { count: number; get(i: number): { name: string; fullPath?: string } };
  instanceDefinitions(): { count: number; get(i: number): RhinoIdef; findId(id: string): RhinoIdef | null };
  materials(): { count: number; get(i: number): { getBitmapTexture?: () => { fileName?: string } | null } | null };
  settings(): { modelUnitSystem: unknown };
  delete?: () => void;
};
type RhinoObject = {
  geometry(): RhinoGeometry;
  attributes(): { layerIndex: number; isInstanceDefinitionObject: boolean; visible: boolean; name?: string; materialIndex: number; materialSource: unknown };
};
type RhinoGeometry = Record<string, unknown> & { objectType: unknown; getBoundingBox?: () => { min: number[]; max: number[] } };
type RhinoIdef = { getObjectIds(): string[]; id: string };

const MM_PER_UNIT: Record<string, number> = { Millimeters: 1, Centimeters: 10, Meters: 1000, Inches: 25.4, Feet: 304.8, Microns: 0.001, None: 1 };

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

/**
 * The triangles of one Rhino geometry: meshes, polysurfaces (their render mesh), extrusions,
 * SubD. `missing`: a volume saved without its render mesh (rhino3dm cannot make one; a
 * polysurface with only some faces meshed counts as missing too, its meshed faces are kept).
 * Curves, texts and the like give nothing and are not missing.
 */
function rhinoSoups(rhino: RhinoModule, geometry: RhinoGeometry, scale: number): { soups: Soup[]; missing: Missing } {
  const type = geometry.objectType;
  const types = rhino.ObjectType;
  if (type === types.Mesh) {
    const soup = rhinoMeshSoup(geometry, scale);
    return { soups: soup ? [soup] : [], missing: null };
  }
  const meshes: Record<string, unknown>[] = [];
  let missing: Missing = null;
  if (type === types.Brep) {
    const faces = (geometry.faces as () => { count: number; get(i: number): { getMesh(t: unknown): Record<string, unknown> | null } })();
    let unmeshed = false;
    for (let i = 0; i < faces.count; i++) {
      const m = faces.get(i).getMesh(rhino.MeshType.Any);
      if (m) meshes.push(m);
      else unmeshed = true;
    }
    // No render mesh saved in the file: Rhino's own meshing, when available.
    if (unmeshed && rhino.Mesh.createFromBrep) {
      const made = rhino.Mesh.createFromBrep(geometry, rhino.MeshingParameters.qualityRenderMesh ?? rhino.MeshingParameters.default) ?? [];
      if (made.length > 0) {
        meshes.length = 0;
        for (const m of made) meshes.push(m as Record<string, unknown>);
        unmeshed = false;
      }
    }
    if (unmeshed) missing = "breps";
  } else if (type === types.Extrusion || type === types.SubD) {
    const getMesh = geometry.getMesh as ((t: unknown) => Record<string, unknown> | null) | undefined;
    const m = getMesh?.call(geometry, rhino.MeshType.Any);
    if (m) meshes.push(m);
    else missing = type === types.Extrusion ? "extrusions" : "subds";
  } else if (type === types.Surface) {
    // A lone surface keeps no render mesh in the file.
    missing = "breps";
  }
  return { soups: meshes.map((m) => rhinoMeshSoup(m, scale)).filter((s): s is Soup => s !== null), missing };
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

export async function read3dm(file: string, progress: Progress): Promise<Source> {
  progress(0, "read");
  const { default: rhino3dm } = (await import("rhino3dm")) as unknown as { default: () => Promise<RhinoModule> };
  const rhino = await rhino3dm();
  const doc = rhino.File3dm.fromByteArray(new Uint8Array(fs.readFileSync(file)));
  if (!doc) throw new Error("Ce fichier .3dm ne peut pas être lu.");
  const unitName = Object.entries(rhino.UnitSystem).find(([, v]) => v === doc.settings().modelUnitSystem)?.[0] ?? "Millimeters";
  const scale = MM_PER_UNIT[unitName] ?? 1;
  const layerNames: string[] = [];
  const fileLayers = doc.layers();
  for (let i = 0; i < fileLayers.count; i++) layerNames.push(fileLayers.get(i).name || "Layer " + (i + 1));
  const layers = new Map<string, Layer>();
  let triangles = 0;
  const skipped: Skipped = { noMesh: { breps: 0, extrusions: 0, subds: 0, layers: [] }, stray: { count: 0, names: [] }, hidden: 0, drawings: 0 };
  const miss = (kind: Missing, layer: string) => {
    if (!kind) return;
    skipped.noMesh[kind]++;
    if (!skipped.noMesh.layers.includes(layer)) skipped.noMesh.layers.push(layer);
  };
  // The geometry of a block, in mm in its own space, by layer; `missing`: a volume without its render mesh.
  const blocks = new Map<string, { parts: { layer: string; soup: Soup; rep: Map<string, Repeated> }[]; missing: Missing; layer: string }>();
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

  const place = (idefId: string, matrix: Float32Array, depth: number) => {
    if (depth > 8) return;
    const idef = doc.instanceDefinitions().findId(idefId);
    if (!idef) return;
    for (const id of idef.getObjectIds()) {
      const obj = doc.objects().findId(id);
      if (!obj) continue;
      const geometry = obj.geometry();
      const layerName = layerNames[obj.attributes().layerIndex] ?? "default";
      if (geometry.objectType === rhino.ObjectType.InstanceReference) {
        const inner = Float32Array.from((geometry.xform as { toFloatArray(rowMajor: boolean): number[] }).toFloatArray(false));
        for (let k = 12; k < 15; k++) inner[k]! *= scale;
        place(String(geometry.parentIdefId), multiply(matrix, inner), depth + 1);
        continue;
      }
      const key = idefId + ":" + id;
      let block = blocks.get(key);
      if (!block) {
        const { soups, missing } = rhinoSoups(rhino, geometry, scale);
        block = { parts: soups.map((soup) => ({ layer: layerName, soup, rep: new Map() })), missing, layer: layerName };
        blocks.set(key, block);
      }
      // Each copy of a volume without its render mesh is missing.
      miss(block.missing, block.layer);
      for (const part of block.parts) {
        const layer = layerOf(layers, part.layer);
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
    if (attributes.visible === false) {
      skipped.hidden++;
      continue;
    }
    const geometry = obj.geometry();
    const layerName = layerNames[attributes.layerIndex] ?? "default";
    if (geometry.objectType === rhino.ObjectType.InstanceReference) {
      const m = Float32Array.from((geometry.xform as { toFloatArray(rowMajor: boolean): number[] }).toFloatArray(false));
      for (let k = 12; k < 15; k++) m[k]! *= scale;
      place(String(geometry.parentIdefId), multiply(Z_UP_TO_Y_UP, m), 0);
    } else if (isPicture(rhino, doc, obj)) {
      skipped.stray.count++;
      if (skipped.stray.names.length < 20) skipped.stray.names.push((attributes.name ?? "").trim() || layerName);
    } else if (isDrawing(rhino, geometry)) {
      skipped.drawings++;
    } else {
      const { soups, missing } = rhinoSoups(rhino, geometry, scale);
      miss(missing, layerName);
      for (const soup of soups) {
        layerOf(layers, layerName).soups.push(turned(soup));
        triangles += soup.indices.length / 3;
      }
    }
    if (i % 100 === 0) progress(i / objects.count, "read");
  }
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
    throw new Error(
      missing > 0
        ? "Rien à montrer : " + missing + (missing > 1 ? " volumes de métal ignorés" : " volume de métal ignoré") + " (enregistrés sans maillage de rendu). Réenregistrez depuis Rhino avec les maillages de rendu, ou exportez en STL/OBJ/GLB."
        : "Aucune surface trouvée dans ce fichier .3dm.",
    );
  }
  return { layers: [...layers.values()].filter((l) => l.soups.length > 0 || l.repeated.length > 0), layered: true, triangles, skipped };
}

export async function readModel(file: string, kind: SourceKind, progress: Progress): Promise<Source> {
  if (kind === "stl") return readStl(file, progress);
  if (kind === "obj") return readObj(file, progress);
  if (kind === "3dm") return read3dm(file, progress);
  return readGltf(file, progress);
}
