/*
 * Writing a version of the jewel (.glb): metal simplified within a given
 * error, sharp-edged normals, stones with flat facets, repeated meshes as
 * EXT_mesh_gpu_instancing, everything compressed with Meshopt. glTF counts in
 * metres: the mm of the pipeline are divided by 1000.
 */
import fs from "node:fs";
import { Document, Logger, NodeIO, PropertyType, type Material } from "@gltf-transform/core";
import { EXTMeshGPUInstancing, KHRMeshQuantization } from "@gltf-transform/extensions";
import { dedup, meshopt, prune } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptSimplifier } from "meshoptimizer";
import type { Analysis, Part } from "./build.js";
import { compact, creaseNormals, type Shaded } from "./geometry.js";
import type { Progress } from "./read.js";

export type Version = {
  /** Largest error allowed when simplifying the metal (mm). */
  error: number;
  /** Bits of the positions (per block, per mesh). */
  bits: number;
};

export const VERSIONS = {
  /** Computers: the metal within 0.01 mm. */
  full: { error: 0.01, bits: 16 },
  /** Phones: within 0.03 mm, still below what the eye sees at the closest zoom. */
  light: { error: 0.03, bits: 14 },
} satisfies Record<string, Version>;

/** Meshes below this many triangles are not simplified (stones, small parts). */
const SIMPLIFY_FROM = 3000;

export type Written = { bytes: number; triangles: number; drawn: number };

/** Placeholder looks, by kind: the viewer gives each layer its real material. */
function placeholder(doc: Document, name: string, stone: boolean, cache: Map<string, Material>): Material {
  let material = cache.get(name);
  if (!material) {
    material = doc.createMaterial(name);
    if (stone) material.setBaseColorFactor([1, 1, 1, 1]).setMetallicFactor(0).setRoughnessFactor(0);
    else material.setBaseColorFactor([0.97, 0.74, 0.62, 1]).setMetallicFactor(1).setRoughnessFactor(0.15);
    cache.set(name, material);
  }
  return material;
}

function simplified(part: Part, error: number): Part["soup"] {
  const triangles = part.soup.indices.length / 3;
  if (part.stone || triangles < SIMPLIFY_FROM) return part.soup;
  // A part smaller than the error would vanish: it is simplified less.
  for (let e = error; e >= error / 30; e /= 3) {
    const [indices] = MeshoptSimplifier.simplify(part.soup.indices, part.soup.positions, 3, 0, e, ["ErrorAbsolute"]);
    if (indices.length >= Math.min(36, part.soup.indices.length)) return compact(part.soup.positions, indices);
  }
  return part.soup;
}

/** Flat facets: each triangle its own three vertices and normal. */
function flat(soup: Part["soup"]): Shaded {
  return creaseNormals(soup, 0.5);
}

export async function writeVersion(analysis: Analysis, version: Version, file: string, progress: Progress): Promise<Written> {
  await MeshoptSimplifier.ready;
  await MeshoptEncoder.ready;
  const doc = new Document().setLogger(new Logger(Logger.Verbosity.WARN));
  doc.createBuffer();
  const scene = doc.createScene("jewel");
  doc.getRoot().setDefaultScene(scene);
  const instancing = doc.createExtension(EXTMeshGPUInstancing).setRequired(true);
  doc.createExtension(KHRMeshQuantization);
  const materials = new Map<string, Material>();
  let triangles = 0;
  let drawn = 0;

  for (const [i, part] of analysis.parts.entries()) {
    const soup = simplified(part, version.error);
    const shaded = part.stone ? flat(soup) : creaseNormals(soup, 35);
    const positions = new Float32Array(shaded.positions.length);
    for (let k = 0; k < positions.length; k++) positions[k] = shaded.positions[k]! / 1000;
    const vertexCount = positions.length / 3;
    const indices = vertexCount < 65536 ? Uint16Array.from(shaded.indices) : shaded.indices;
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(positions))
      .setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(shaded.normals))
      .setIndices(doc.createAccessor().setType("SCALAR").setArray(indices))
      .setMaterial(placeholder(doc, part.material, part.stone, materials));
    const mesh = doc.createMesh(part.material).addPrimitive(prim);
    const node = doc.createNode(part.material).setMesh(mesh);
    const count = shaded.indices.length / 3;
    if (part.instances) {
      const n = part.instances.length;
      const t = new Float32Array(n * 3);
      const r = new Float32Array(n * 4);
      const s = new Float32Array(n * 3);
      for (const [j, inst] of part.instances.entries()) {
        t.set(inst.t.map((v) => v / 1000), j * 3);
        r.set(inst.r, j * 4);
        s.set(inst.s, j * 3);
      }
      const batch = instancing
        .createInstancedMesh()
        .setAttribute("TRANSLATION", doc.createAccessor().setType("VEC3").setArray(t))
        .setAttribute("ROTATION", doc.createAccessor().setType("VEC4").setArray(r))
        .setAttribute("SCALE", doc.createAccessor().setType("VEC3").setArray(s));
      node.setExtension("EXT_mesh_gpu_instancing", batch);
      triangles += count;
      drawn += count * n;
    } else {
      triangles += count;
      drawn += count;
    }
    scene.addChild(node);
    progress((i + 1) / analysis.parts.length, "simplify");
  }

  // Materials are never merged: alike for now, each is a layer the jeweller sets on its own.
  await doc.transform(dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH] }), prune(), meshopt({ encoder: MeshoptEncoder, level: "high", quantizePosition: version.bits, quantizeNormal: 10 }));
  const io = new NodeIO().registerExtensions([EXTMeshGPUInstancing, KHRMeshQuantization]);
  const { EXTMeshoptCompression } = await import("@gltf-transform/extensions");
  io.registerExtensions([EXTMeshoptCompression]).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
  const bytes = await io.writeBinary(doc);
  fs.writeFileSync(file, bytes);
  return { bytes: bytes.byteLength, triangles, drawn };
}
