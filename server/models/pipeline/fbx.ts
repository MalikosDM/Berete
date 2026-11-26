/*
 * Reading an FBX (binary or text, version 7 and later) with three.js's FBXLoader, in Node (26/11/2026). Its materials
 * are the layers (with their base colour); a geometry drawn by several objects is kept once with each copy's place.
 * Units: FBX counts in centimetres unless its UnitScaleFactor says otherwise (cm per unit): everything comes out in mm.
 * The loader is made never to touch a browser: textures are not loaded (only shapes and material names matter), and
 * the two places where it reads `window` (embedded pictures, the size of a camera's screen) get a stand-in.
 */
import fs from "node:fs";
import type { Progress, Source, Layer, Repeated } from "./read.js";
import { weld } from "./geometry.js";

/** Within this size (mm) a jewel read in cm is believable; beyond, the file's unit is taken as mm. */
const LARGEST_JEWEL = 1000;

export async function readFbx(file: string, progress: Progress): Promise<Source> {
  progress(0, "read");
  const THREE = await import("three");
  const { FBXLoader } = await import("three/examples/jsm/loaders/FBXLoader.js");
  const bytes = fs.readFileSync(file);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

  const scope = globalThis as unknown as { window?: unknown };
  const hadWindow = "window" in scope;
  const ownWindow = scope.window;
  const load = THREE.TextureLoader.prototype.load;
  let group: import("three").Group;
  try {
    if (!hadWindow) scope.window = { URL: { createObjectURL: () => "" }, innerWidth: 1, innerHeight: 1 };
    THREE.TextureLoader.prototype.load = function () {
      return new THREE.Texture();
    };
    // Its own warnings (unsupported textures, animations...) say nothing about the shapes.
    const warn = console.warn;
    console.warn = () => undefined;
    try {
      group = new FBXLoader().parse(buffer, "");
    } catch (e) {
      throw new Error("Ce fichier .fbx ne peut pas être lu (" + (e instanceof Error ? e.message : String(e)) + "). Exportez-le en GLB, OBJ ou STL.", { cause: e });
    } finally {
      console.warn = warn;
    }
  } finally {
    THREE.TextureLoader.prototype.load = load;
    if (!hadWindow) delete scope.window;
    else scope.window = ownWindow;
  }
  progress(0.5, "read");

  // Units: cm per unit (FBX's own default is the centimetre).
  const factor = Number(group.userData.unitScaleFactor);
  const cmPerUnit = Number.isFinite(factor) && factor > 0 ? factor : 1;
  group.updateMatrixWorld(true);
  const meshes: import("three").Mesh[] = [];
  group.traverse((o) => {
    const mesh = o as import("three").Mesh;
    if (mesh.isMesh && mesh.geometry?.getAttribute("position")) meshes.push(mesh);
  });
  // A jewel bigger than a metre in cm was drawn in mm with the default unit left in the file.
  const box = new THREE.Box3();
  for (const mesh of meshes) box.expandByObject(mesh);
  const largest = box.isEmpty() ? 0 : Math.max(...box.getSize(new THREE.Vector3()).toArray());
  let mmPerUnit = cmPerUnit * 10;
  let guessed = false;
  if (largest * mmPerUnit > LARGEST_JEWEL && largest * cmPerUnit <= LARGEST_JEWEL) {
    mmPerUnit = cmPerUnit;
    guessed = true;
  }

  const layers = new Map<string, Layer>();
  const layerOf = (name: string, color: string | undefined) => {
    let layer = layers.get(name);
    if (!layer) {
      layer = { name, soups: [], repeated: [], ...(color ? { color } : {}) };
      layers.set(name, layer);
    }
    return layer;
  };
  const uses = new Map<object, number>();
  for (const mesh of meshes) uses.set(mesh.geometry, (uses.get(mesh.geometry) ?? 0) + 1);
  const repeatedOf = new Map<object, Repeated[]>();
  let triangles = 0;
  for (const [m, mesh] of meshes.entries()) {
    const geometry = mesh.geometry;
    const position = geometry.getAttribute("position")!;
    const index = geometry.getIndex();
    const count = index ? index.count : position.count;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const groups = geometry.groups.length > 0 ? geometry.groups : [{ start: 0, count, materialIndex: 0 }];
    const world = Float32Array.from(mesh.matrixWorld.elements);
    for (let k = 12; k < 15; k++) world[k]! *= mmPerUnit;
    const shared = (uses.get(geometry) ?? 0) > 1;
    let reps = repeatedOf.get(geometry);
    for (const [g, part] of groups.entries()) {
      const material = materials[part.materialIndex ?? 0] ?? materials[0];
      const name = material?.name || "default";
      const color = (material as { color?: import("three").Color } | undefined)?.color?.getHexString();
      const layer = layerOf(name, color ? "#" + color : undefined);
      const end = Math.min(count, part.start + part.count);
      const corners: number[] = [];
      for (let c = part.start; c + 2 < end; c += 3) corners.push(index ? index.getX(c) : c, index ? index.getX(c + 1) : c + 1, index ? index.getX(c + 2) : c + 2);
      if (corners.length === 0) continue;
      const positions = position.array as ArrayLike<number>;
      const stride = (position as { data?: { stride: number } }).data?.stride ?? 3;
      const offset = (position as { offset?: number }).offset ?? 0;
      const plain = new Float32Array(position.count * 3);
      for (let v = 0; v < position.count; v++) {
        plain[v * 3] = positions[v * stride + offset]!;
        plain[v * 3 + 1] = positions[v * stride + offset + 1]!;
        plain[v * 3 + 2] = positions[v * stride + offset + 2]!;
      }
      if (shared) {
        if (!reps) {
          reps = [];
          repeatedOf.set(geometry, reps);
        }
        let rep = reps[g];
        if (!rep) {
          rep = { soup: weld(plain, corners, mmPerUnit), matrices: [] };
          reps[g] = rep;
          layer.repeated.push(rep);
        }
        rep.matrices.push(world);
        triangles += rep.soup.indices.length / 3;
      } else {
        const soup = weld(plain, corners, mmPerUnit);
        const moved = new Float32Array(soup.positions.length);
        const e = world;
        for (let v = 0; v < soup.positions.length; v += 3) {
          const x = soup.positions[v]!;
          const y = soup.positions[v + 1]!;
          const z = soup.positions[v + 2]!;
          moved[v] = e[0]! * x + e[4]! * y + e[8]! * z + e[12]!;
          moved[v + 1] = e[1]! * x + e[5]! * y + e[9]! * z + e[13]!;
          moved[v + 2] = e[2]! * x + e[6]! * y + e[10]! * z + e[14]!;
        }
        layer.soups.push({ positions: moved, indices: soup.indices });
        triangles += soup.indices.length / 3;
      }
    }
    if (m % 50 === 0) progress(0.5 + (0.5 * m) / meshes.length, "read");
  }
  progress(1, "read");
  if (triangles === 0) throw new Error("Aucune face trouvée dans ce fichier .fbx.");
  const unitName = cmPerUnit === 0.1 ? "mm" : cmPerUnit === 1 ? "cm" : cmPerUnit === 100 ? "m" : cmPerUnit === 2.54 ? "inch" : cmPerUnit + " cm";
  return {
    layers: [...layers.values()],
    layered: layers.size > 1,
    triangles,
    units: { file: unitName, from: guessed ? "size" : "file", mmPerUnit, applied: mmPerUnit !== 1 },
  };
}
