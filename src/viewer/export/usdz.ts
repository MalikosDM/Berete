/*
 * The jewel as a .usdz file to download (26/11/2026): the file Apple's devices open in AR Quick Look, Keynote or
 * Reality Composer. The same path as the "Voir chez moi" of the viewer (../ar.ts, made on the iPhone itself), kept
 * here in its few lines, so that the viewer's own file stays as it is: three's USDZExporter, the metals as they are
 * drawn, the stones in a plain tint (USD has no diamond: their colour, or white), plain meshes (the copies of an
 * instanced mesh become meshes sharing one shape), in metres (true size), set on its lowest point and centred.
 */
import { Box3, Color, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry, type InstancedMesh, type Material, type Object3D } from "three";

const isStandard = (m: Material): m is MeshStandardMaterial => (m as MeshStandardMaterial).isMeshStandardMaterial === true;

/** A stone in USD: its tint (from its settings), polished, not a metal. One per colour. */
function stoneMaterial(m: Material, stones: Map<string, MeshStandardMaterial>): MeshStandardMaterial {
  const tint = (m.userData?.diamond as { color?: unknown } | undefined)?.color;
  const physical = m as Material & { color?: Color };
  const color = typeof tint === "string" ? tint : physical.color && (m as { transmission?: number }).transmission ? "#" + physical.color.getHexString() : "#ffffff";
  let stone = stones.get(color);
  if (!stone) {
    stone = new MeshStandardMaterial({ name: "stone-" + color.slice(1), color: new Color(color), metalness: 0, roughness: 0.05 });
    stones.set(color, stone);
  }
  return stone;
}

/** A metal as USD reads it (a standard material); any other material (a stone, a glass) as a stone. */
function usdMaterial(m: Material, stones: Map<string, MeshStandardMaterial>, made: Map<Material, MeshStandardMaterial>): MeshStandardMaterial {
  const known = made.get(m);
  if (known) return known;
  const physical = m as Material & { transmission?: number };
  if (!isStandard(m) || (physical.transmission ?? 0) > 0.5) return stoneMaterial(m, stones);
  const copy = new MeshStandardMaterial({
    name: m.name,
    color: m.color.clone(),
    metalness: m.metalness,
    roughness: m.roughness,
    map: m.map,
    normalMap: m.normalMap,
    roughnessMap: m.roughnessMap,
    metalnessMap: m.metalnessMap,
    side: m.side,
  });
  made.set(m, copy);
  return copy;
}

/** Normals for a shape without them (it would be drawn black): computed on a copy, the viewer's shape untouched. */
function withNormals(geometry: BufferGeometry, copies: BufferGeometry[]): BufferGeometry {
  if (geometry.attributes.normal) return geometry;
  const copy = geometry.clone();
  copy.computeVertexNormals();
  copies.push(copy);
  return copy;
}

function usdScene(jewel: Object3D): { scene: Group; dispose(): void } {
  const stones = new Map<string, MeshStandardMaterial>();
  const made = new Map<Material, MeshStandardMaterial>();
  const geometries: BufferGeometry[] = [];
  jewel.updateMatrixWorld(true);
  // In the jewel's frame, its own pose (as the viewer turned it) kept.
  const toParent = jewel.parent ? jewel.parent.matrixWorld.clone().invert() : new Matrix4();
  const holder = new Group();
  const meshMatrix = new Matrix4();
  jewel.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.visible) return;
    const material = usdMaterial(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material, stones, made);
    const geometry = withNormals(mesh.geometry, geometries);
    const base = toParent.clone().multiply(mesh.matrixWorld);
    const inst = mesh as unknown as InstancedMesh;
    const count = inst.isInstancedMesh ? inst.count : 1;
    for (let i = 0; i < count; i++) {
      const copy = new Mesh(geometry, material);
      copy.name = (mesh.userData?.layer as string | undefined) ?? mesh.name;
      copy.matrixAutoUpdate = false;
      if (inst.isInstancedMesh) {
        inst.getMatrixAt(i, meshMatrix);
        copy.matrix.copy(base).multiply(meshMatrix);
      } else copy.matrix.copy(base);
      copy.matrix.decompose(copy.position, copy.quaternion, copy.scale);
      holder.add(copy);
    }
  });
  holder.updateMatrixWorld(true);
  const box = new Box3().setFromObject(holder, true);
  const centre = box.getCenter(new Vector3());
  holder.position.set(-centre.x, -box.min.y, -centre.z);
  holder.updateMatrix();
  const scene = new Group();
  scene.add(holder);
  return {
    scene,
    dispose() {
      for (const m of stones.values()) m.dispose();
      for (const m of made.values()) m.dispose();
      for (const g of geometries) g.dispose();
    },
  };
}

/** The jewel as a .usdz (a zip of USD files), set on a horizontal plane in AR. */
export async function exportUsdz(jewel: Object3D): Promise<Blob> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const { scene, dispose } = usdScene(jewel);
  try {
    const data = await new USDZExporter().parseAsync(scene, {
      quickLookCompatible: true,
      ar: { anchoring: { type: "plane" }, planeAnchoring: { alignment: "horizontal" } },
    });
    return new Blob([data as BlobPart], { type: "model/vnd.usdz+zip" });
  } finally {
    dispose();
  }
}
