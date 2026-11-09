/*
 * Reading a 3D file into layers of triangles, in mm:
 * - STL (binary or text), read piece by piece (files of several hundred MB);
 * - glTF binary (.glb), its materials being the layers (exports of Rhino via iJewel3D);
 * - Rhino (.3dm), its layers and its blocks (repeated stones).
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

export type Source = {
  layers: Layer[];
  /** False for an STL: no layers, the parts are sorted by shape (stones, metal). */
  layered: boolean;
  triangles: number;
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

/* ---------- glTF binary ---------- */

async function gltfIo(): Promise<NodeIO> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "draco3d.decoder": await draco3d.createDecoderModule() });
  // Extensions of other viewers (WEBGI_*...) are skipped without a message.
  io.setLogger(new Logger(Logger.Verbosity.ERROR));
  return io;
}

export async function readGlb(file: string, progress: Progress): Promise<Source> {
  progress(0, "read");
  const io = await gltfIo();
  const doc: Document = await io.read(file);
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
  Mesh: { createFromBrep?: (brep: unknown, params: unknown) => unknown[] | null };
  MeshingParameters: { qualityRenderMesh?: unknown; default?: unknown };
};
type RhinoFile = {
  objects(): { count: number; get(i: number): RhinoObject; findId(id: string): RhinoObject | null };
  layers(): { count: number; get(i: number): { name: string; fullPath?: string } };
  instanceDefinitions(): { count: number; get(i: number): RhinoIdef; findId(id: string): RhinoIdef | null };
  settings(): { modelUnitSystem: unknown };
  delete?: () => void;
};
type RhinoObject = { geometry(): RhinoGeometry; attributes(): { layerIndex: number; isInstanceDefinitionObject: boolean; visible: boolean } };
type RhinoGeometry = Record<string, unknown> & { objectType: unknown };
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

/** The triangles of one Rhino geometry: meshes, polysurfaces (their render mesh), extrusions. */
function rhinoSoups(rhino: RhinoModule, geometry: RhinoGeometry, scale: number): Soup[] {
  const type = geometry.objectType;
  const types = rhino.ObjectType;
  if (type === types.Mesh) {
    const soup = rhinoMeshSoup(geometry, scale);
    return soup ? [soup] : [];
  }
  const meshes: Record<string, unknown>[] = [];
  if (type === types.Brep) {
    const faces = (geometry.faces as () => { count: number; get(i: number): { getMesh(t: unknown): Record<string, unknown> | null } })();
    let missing = false;
    for (let i = 0; i < faces.count; i++) {
      const m = faces.get(i).getMesh(rhino.MeshType.Any);
      if (m) meshes.push(m);
      else missing = true;
    }
    // No render mesh saved in the file: Rhino's own meshing, when available.
    if (missing && rhino.Mesh.createFromBrep) {
      meshes.length = 0;
      const made = rhino.Mesh.createFromBrep(geometry, rhino.MeshingParameters.qualityRenderMesh ?? rhino.MeshingParameters.default) ?? [];
      for (const m of made) meshes.push(m as Record<string, unknown>);
    }
  } else if (type === types.Extrusion || type === types.SubD) {
    const getMesh = geometry.getMesh as ((t: unknown) => Record<string, unknown> | null) | undefined;
    const m = getMesh?.call(geometry, rhino.MeshType.Any);
    if (m) meshes.push(m);
  }
  return meshes.map((m) => rhinoMeshSoup(m, scale)).filter((s): s is Soup => s !== null);
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
  // The geometry of a block, in mm in its own space, by layer.
  const blocks = new Map<string, { layer: string; soup: Soup; rep: Map<string, Repeated> }[]>();
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
      let parts = blocks.get(key);
      if (!parts) {
        parts = rhinoSoups(rhino, geometry, scale).map((soup) => ({ layer: layerName, soup, rep: new Map() }));
        blocks.set(key, parts);
      }
      for (const part of parts) {
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
    if (attributes.isInstanceDefinitionObject || attributes.visible === false) continue;
    const geometry = obj.geometry();
    const layerName = layerNames[attributes.layerIndex] ?? "default";
    if (geometry.objectType === rhino.ObjectType.InstanceReference) {
      const m = Float32Array.from((geometry.xform as { toFloatArray(rowMajor: boolean): number[] }).toFloatArray(false));
      for (let k = 12; k < 15; k++) m[k]! *= scale;
      place(String(geometry.parentIdefId), multiply(Z_UP_TO_Y_UP, m), 0);
    } else {
      for (const soup of rhinoSoups(rhino, geometry, scale)) {
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
  if (triangles === 0) throw new Error("Aucune surface trouvée dans ce fichier .3dm (enregistrez-le avec les maillages de rendu).");
  return { layers: [...layers.values()].filter((l) => l.soups.length > 0 || l.repeated.length > 0), layered: true, triangles };
}

export async function readModel(file: string, kind: "stl" | "glb" | "3dm", progress: Progress): Promise<Source> {
  if (kind === "stl") return readStl(file, progress);
  if (kind === "3dm") return read3dm(file, progress);
  return readGlb(file, progress);
}
