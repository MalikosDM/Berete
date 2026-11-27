/*
 * The jewel as a .glb file (26/11/2026), with three's GLTFExporter (binary). The jewel is copied first, so that the
 * screen never changes while the file is made: the copy shares the geometry, only its materials are swapped.
 *
 * glTF knows standard (PBR) materials only. Our diamonds are shader materials: each becomes a physical look-alike (its
 * tint, transmission 1, its refractive index, roughness 0), so that any glTF reader shows a clear stone, and carries our
 * own extension BERETE_gem (src/data/bereteGem.ts) with the whole of its settings, its role and the scene's lighting of
 * the stones: our import (server/models/pipeline/read.ts) recognises the layer as stones with those settings. The
 * metals keep their PBR values (colour, metalness, roughness, and what KHR_materials_* say of a physical material).
 * Every material is named after its layer, so that the layers come back as they were.
 * Repeated stones (InstancedMesh) stay instanced: EXT_mesh_gpu_instancing, which GLTFExporter (r182) writes.
 */
import { Color, MeshPhysicalMaterial, MeshStandardMaterial, type Material, type Mesh, type Object3D } from "three";
import { GLTFExporter, type GLTFExporterPlugin, type GLTFWriter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { BERETE_GEM, gemExtension, type BereteGem, type GemRole } from "@/data/bereteGem";
import { diamondOf, sceneOf, type LayerSetting, type ModelSettings } from "@/data/models";
import { DEFAULT_DIAMOND, merged, type DiamondParams } from "@/data/scene3d";
import { materialById } from "../library/materials";

export type GlbOptions = {
  /**
   * The settings of the model as the editor holds them: the stones are then found by the role of their layer (whatever
   * material draws them), with their settings and the scene's lighting of the stones written in BERETE_gem. Without
   * them, a stone is a material that carries its settings (`userData.diamond`, the viewer's stones).
   */
  settings?: ModelSettings;
};

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

/** A stone as glTF can say it: clear, refracting, polished. Its true settings travel in BERETE_gem. */
function stoneLookAlike(name: string, params: DiamondParams, side: Material["side"]): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({
    name,
    color: colorOf(params.color) ?? new Color(0xffffff),
    metalness: 0,
    roughness: 0,
    transmission: 1,
    thickness: 0.001,
    ior: Math.max(1, Math.min(2.333, params.refractiveIndex)),
    side,
  });
}

/** Any other material glTF does not know (Lambert, Phong...): a standard one of the same colour. */
function standardLookAlike(source: Material, name: string): MeshStandardMaterial {
  const colored = source as Material & { color?: Color; map?: MeshStandardMaterial["map"] };
  return new MeshStandardMaterial({ name, color: colored.color?.clone() ?? new Color(0xffffff), map: colored.map ?? null, metalness: 0, roughness: 0.5, side: source.side, transparent: source.transparent, opacity: source.opacity });
}

/** Standard, physical and basic materials go as they are (GLTFExporter writes them, the basic one as "unlit"). */
function exportable(material: Material): boolean {
  const m = material as Material & { isMeshStandardMaterial?: boolean; isMeshBasicMaterial?: boolean };
  return Boolean(m.isMeshStandardMaterial || m.isMeshBasicMaterial);
}

/** A material that draws a stone in the viewer (its settings in userData.diamond; only the stones are shader materials). */
function drawsStone(material: Material): boolean {
  const m = material as Material & { isShaderMaterial?: boolean };
  return Boolean(material.userData?.diamond) || Boolean(material.userData?.gem) || Boolean(m.isShaderMaterial);
}

/** The layer is a stone in the settings: role diamond or stone, or a stone of the library chosen for it. */
function stoneLayer(setting: LayerSetting | undefined): boolean {
  if (!setting) return false;
  if (setting.role === "diamond" || setting.role === "stone") return true;
  const lib = setting.material ? materialById(setting.material) : undefined;
  return Boolean(lib && "gem" in lib && lib.gem);
}

/** The settings of a stone: what its material draws (the editor's live values), else its layer's, else the defaults. */
function stoneParams(material: Material, setting: LayerSetting | undefined, settings: ModelSettings | undefined): DiamondParams {
  const drawn = material.userData?.diamond as Partial<DiamondParams> | undefined;
  if (drawn && typeof drawn === "object") return merged(DEFAULT_DIAMOND, drawn);
  const own = diamondOf(setting, settings?.diamonds ?? "realistic");
  const lib = setting?.material ? materialById(setting.material) : undefined;
  return lib && "gem" in lib && lib.gem ? merged(own, lib.gem) : own;
}

/** Writes BERETE_gem on the materials that are stones (and names it in `extensionsUsed`). */
class BereteGemWriter implements GLTFExporterPlugin {
  readonly name = BERETE_GEM;
  constructor(
    private readonly writer: GLTFWriter,
    private readonly gems: Map<Material, BereteGem>,
  ) {}

  async writeMaterialAsync(material: Material, materialDef: { [key: string]: unknown }): Promise<void> {
    const ext = this.gems.get(material);
    if (!ext) return;
    const extensions = (materialDef.extensions ?? {}) as Record<string, unknown>;
    extensions[BERETE_GEM] = ext;
    materialDef.extensions = extensions;
    this.writer.extensionsUsed[BERETE_GEM] = true;
  }
}

/** The jewel as a binary glTF (.glb), placed as the viewer shows it (its own and its parents' transforms, in metres). */
export async function exportGlb(root: Object3D, opts: GlbOptions = {}): Promise<Blob> {
  const { settings } = opts;
  const sceneEnv = settings ? sceneOf(settings).envGem : undefined;
  root.updateWorldMatrix(true, true);
  const copy = root.clone(true);
  copy.matrixAutoUpdate = true;
  root.matrixWorld.decompose(copy.position, copy.quaternion, copy.scale);
  copy.updateMatrix();

  // One replacement per material and layer: a material shared by many meshes of a layer stays one material in the file.
  // The stones of a layer (the viewer gives each of its meshes its own material) share one when their settings are the same.
  const swapped = new Map<string, Material>();
  const ids = new Map<Material, number>();
  const made: Material[] = [];
  const gems = new Map<Material, BereteGem>();
  const stones = new Map<string, Material>();
  const swap = (material: Material, layer: string | undefined): Material => {
    if (!ids.has(material)) ids.set(material, ids.size);
    const key = ids.get(material) + "|" + (layer ?? "");
    const known = swapped.get(key);
    if (known) return known;
    const setting = layer ? settings?.layers[layer] : undefined;
    const name = layer || material.name || "";
    let replacement: Material;
    if (stoneLayer(setting) || drawsStone(material)) {
      const params = stoneParams(material, setting, settings);
      const role: GemRole = setting?.role === "stone" ? "stone" : "diamond";
      const ext = gemExtension(params, role, sceneEnv);
      const same = name + "|" + material.side + "|" + JSON.stringify(ext);
      const shared = stones.get(same);
      if (shared) replacement = shared;
      else {
        replacement = stoneLookAlike(name || "diamond", params, material.side);
        replacement.userData = layer ? { layer } : {};
        gems.set(replacement, ext);
        stones.set(same, replacement);
        made.push(replacement);
      }
    } else if (!exportable(material)) {
      replacement = standardLookAlike(material, name);
      replacement.userData = layer ? { layer } : {};
      made.push(replacement);
    } else if (name && material.name !== name) {
      // A metal (or enamel) named after its layer: the layers come back by name when the file is read again.
      replacement = material.clone();
      replacement.name = name;
      made.push(replacement);
    } else replacement = material;
    swapped.set(key, replacement);
    return replacement;
  };
  copy.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const layer = typeof mesh.userData?.layer === "string" ? (mesh.userData.layer as string) : undefined;
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map((m) => swap(m, layer)) : swap(mesh.material, layer);
  });

  try {
    const exporter = new GLTFExporter().register((writer) => new BereteGemWriter(writer, gems));
    const result = await exporter.parseAsync(copy, { binary: true, onlyVisible: true });
    if (!(result instanceof ArrayBuffer)) throw new Error("glb-export");
    return new Blob([result], { type: "model/gltf-binary" });
  } finally {
    for (const material of made) material.dispose();
  }
}
