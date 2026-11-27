/*
 * The jewel in the client's own space (26/11/2026), with the tools of his phone:
 *   - iPhone and iPad (Safari): AR Quick Look. The .usdz file is made on the device from the jewel as the viewer draws it
 *     (three's USDZExporter): its metals as they are, its stones in a plain white (Quick Look has no diamond), in metres
 *     (true size: a ring of 2 cm stays 2 cm, the client can enlarge it with two fingers), set on its lowest point.
 *   - Android (Chrome), where the browser has it: WebXR « immersive-ar » first (27/11/2026, ./webxr.ts, loaded only at the
 *     tap): the jewel in the camera image of the page itself, placed on a table or the floor with a tap (hit test), at
 *     its true size or larger. Otherwise, or when the session cannot start:
 *   - Android (Chrome): Scene Viewer, Google's own viewer, opened by an intent with the address of a .glb file. Google's
 *     application fetches the file itself, without the cookies of the site: the address must open without them (a signed
 *     link), and be absolute (https).
 */
import { Box3, Color, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry, type InstancedMesh, type Material, type Object3D } from "three";

/** AR Quick Look is there (Safari on iOS and iPadOS): a link with rel="ar" is understood. */
export function canQuickLook(): boolean {
  if (typeof document === "undefined") return false;
  const a = document.createElement("a");
  return a.relList?.supports?.("ar") === true;
}

/** Scene Viewer can be asked (Android, Chrome or a browser of its family; not Firefox, not a headset). */
export function canSceneViewer(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /android/i.test(ua) && !/firefox|fxios|oculusbrowser|quest/i.test(ua);
}

/** WebXR can show the jewel in the room (Chrome on Android with ARCore, some headsets): asked once, never throws. */
let webXr: Promise<boolean> | null = null;
export function canWebXrAr(): Promise<boolean> {
  webXr ??= (async () => {
    try {
      const xr = typeof navigator === "undefined" ? undefined : (navigator as Navigator & { xr?: XRSystem }).xr;
      return Boolean(xr && window.isSecureContext && (await xr.isSessionSupported("immersive-ar")));
    } catch {
      return false;
    }
  })();
  return webXr;
}

/**
 * The address that opens Scene Viewer on the jewel (`glbAbsoluteUrl`: an https .glb reachable without cookies). Without
 * Scene Viewer on the phone, the browser comes back to `fallbackUrl` (the page of the moment by default).
 */
export function sceneViewerUrl(glbAbsoluteUrl: string, title: string, fallbackUrl?: string): string {
  const fallback = fallbackUrl ?? (typeof location !== "undefined" ? location.href : glbAbsoluteUrl);
  const query = "file=" + encodeURIComponent(glbAbsoluteUrl) + "&mode=ar_preferred&title=" + encodeURIComponent(title);
  return (
    "intent://arvr.google.com/scene-viewer/1.2?" +
    query +
    "#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;S.browser_fallback_url=" +
    encodeURIComponent(fallback) +
    ";end;"
  );
}

/* ---------- Quick Look ---------- */

const isStandard = (m: Material): m is MeshStandardMaterial => (m as MeshStandardMaterial).isMeshStandardMaterial === true;

/** A metal as Quick Look reads it; a stone (any other material, or a glass) in a plain white. */
function arMaterial(m: Material, stone: MeshStandardMaterial, made: Map<Material, MeshStandardMaterial>): MeshStandardMaterial {
  const known = made.get(m);
  if (known) return known;
  const physical = m as Material & { transmission?: number };
  if (!isStandard(m) || (physical.transmission ?? 0) > 0.5) return stone;
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

/** Normals for a shape without them (Quick Look would draw it black): computed on a copy, the viewer's shape untouched. */
function withNormals(geometry: BufferGeometry, copies: BufferGeometry[]): BufferGeometry {
  if (geometry.attributes.normal) return geometry;
  const copy = geometry.clone();
  copy.computeVertexNormals();
  copies.push(copy);
  return copy;
}

/**
 * The jewel for the .usdz (and for WebXR, ./webxr.ts): plain meshes (the copies of an instanced mesh, the stones repeated, become meshes of their own
 * sharing one shape), the materials Quick Look reads, placed on y = 0 and centred.
 */
export function arScene(jewel: Object3D): { scene: Group; dispose(): void } {
  const stone = new MeshStandardMaterial({ name: "stone", color: new Color("#ffffff"), metalness: 0, roughness: 0.05 });
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
    const material = arMaterial(Array.isArray(mesh.material) ? mesh.material[0] : mesh.material, stone, made);
    const geometry = withNormals(mesh.geometry, geometries);
    const base = toParent.clone().multiply(mesh.matrixWorld);
    const inst = mesh as unknown as InstancedMesh;
    const count = inst.isInstancedMesh ? inst.count : 1;
    for (let i = 0; i < count; i++) {
      const copy = new Mesh(geometry, material);
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
      stone.dispose();
      for (const m of made.values()) m.dispose();
      for (const g of geometries) g.dispose();
    },
  };
}

/** Opens the jewel in AR Quick Look (to be called from a tap of the client: Safari opens it only then). */
export async function openQuickLook(jewel: Object3D, name: string): Promise<void> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");
  const { scene, dispose } = arScene(jewel);
  let data: ArrayBuffer | Uint8Array;
  try {
    data = await new USDZExporter().parseAsync(scene, {
      quickLookCompatible: true,
      ar: { anchoring: { type: "plane" }, planeAnchoring: { alignment: "horizontal" } },
    });
  } finally {
    dispose();
  }
  const blob = new Blob([data as BlobPart], { type: "model/vnd.usdz+zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.rel = "ar";
  a.href = url;
  // Safari wants a name for a file made on the device, and an image inside the link to open Quick Look.
  a.download = (name.normalize("NFD").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "berete") + ".usdz";
  a.style.display = "none";
  a.appendChild(document.createElement("img"));
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
