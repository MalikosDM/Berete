/*
 * The jewel as a .glb file (26/11/2026), with three's GLTFExporter (binary). The jewel is copied first, so that the
 * screen never changes while the file is made: the copy shares the geometry, only its materials are swapped.
 *
 * glTF knows standard (PBR) materials only. Our diamonds are shader materials: each becomes a physical look-alike
 * (its tint, transmission 1, its refractive index or 2.42, roughness 0), and its own settings (`userData.diamond`)
 * travel in the material's `extras`, so that our viewer, or a jeweller's tool that reads them, finds them again.
 * Repeated stones (InstancedMesh) stay instanced: EXT_mesh_gpu_instancing, which GLTFExporter (r182) writes.
 * Names of objects and materials are kept.
 */
import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type Material, type Mesh, type Object3D } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

/** A copy that JSON can hold (glTF extras), or undefined when the value cannot be written. */
function jsonSafe<T>(value: T): T | undefined {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return undefined;
  }
}

/** The settings and extras of a material, kept apart from anything JSON cannot write (textures, functions...). */
function cleanUserData(userData: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(userData ?? {})) {
    const safe = jsonSafe(value);
    if (safe !== undefined) out[key] = safe;
  }
  return out;
}

const finite = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

function colorOf(value: unknown): Color | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const color = new Color();
    color.setStyle(value);
    return color;
  } catch {
    return null;
  }
}

/** A stone of the viewer as glTF can say it: clear, refracting, polished. */
function diamondLookAlike(source: Material): MeshPhysicalMaterial {
  const settings = (source.userData?.diamond ?? null) as Record<string, unknown> | null;
  const ior = finite(settings?.refractiveIndex) ?? finite(settings?.ior) ?? 2.42;
  const material = new MeshPhysicalMaterial({
    name: source.name || "diamond",
    color: colorOf(settings?.color) ?? new Color(0xffffff),
    metalness: 0,
    roughness: 0,
    transmission: 1,
    ior: Math.max(1, ior),
    side: source.side,
  });
  material.userData = cleanUserData(source.userData);
  if (!settings) material.userData.diamond = { refractiveIndex: ior };
  return material;
}

/** Any other material glTF does not know (Lambert, Phong...): a standard one of the same colour. */
function standardLookAlike(source: Material): MeshStandardMaterial {
  const colored = source as Material & { color?: Color; map?: MeshStandardMaterial["map"] };
  const material = new MeshStandardMaterial({ name: source.name, color: colored.color?.clone() ?? new Color(0xffffff), map: colored.map ?? null, metalness: 0, roughness: 0.5, side: source.side, transparent: source.transparent, opacity: source.opacity });
  material.userData = cleanUserData(source.userData);
  return material;
}

/** Standard, physical and basic materials go as they are (GLTFExporter writes them, the basic one as "unlit"). */
function exportable(material: Material): boolean {
  const m = material as Material & { isMeshStandardMaterial?: boolean; isMeshBasicMaterial?: boolean };
  return Boolean(m.isMeshStandardMaterial || m.isMeshBasicMaterial);
}

function isStone(material: Material): boolean {
  const m = material as Material & { isShaderMaterial?: boolean };
  // In the viewer only the stones are shader materials (their settings in userData.diamond).
  return Boolean(material.userData?.diamond) || Boolean(m.isShaderMaterial);
}

/** The jewel as a binary glTF (.glb), placed as the viewer shows it (its own and its parents' transforms, in metres). */
export async function exportGlb(root: Object3D): Promise<Blob> {
  root.updateWorldMatrix(true, true);
  const copy = root.clone(true);
  copy.matrixAutoUpdate = true;
  root.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
  copy.updateMatrix();

  // One replacement per material: a material shared by many meshes stays one material in the file.
  const swapped = new Map<Material, Material>();
  const made: Material[] = [];
  const swap = (material: Material): Material => {
    if (exportable(material)) return material;
    let replacement = swapped.get(material);
    if (!replacement) {
      replacement = isStone(material) ? diamondLookAlike(material) : standardLookAlike(material);
      swapped.set(material, replacement);
      made.push(replacement);
    }
    return replacement;
  };
  copy.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });

  try {
    const result = await new GLTFExporter().parseAsync(copy, { binary: true, onlyVisible: true });
    if (!(result instanceof ArrayBuffer)) throw new Error("glb-export");
    return new Blob([result], { type: "model/gltf-binary" });
  } finally {
    for (const material of made) material.dispose();
  }
}
