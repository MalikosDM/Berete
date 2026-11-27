/*
 * « Voir chez moi » with WebXR (27/11/2026), on Android (Chrome with ARCore) before Scene Viewer: the jewel in the camera
 * image of the page itself. A ring of light (rose gold) follows the table or the floor under the middle of the screen (hit
 * test); a tap sets the jewel there, turned towards the client, at its true size (the file is in metres) or larger; a new
 * tap moves it. Over the image (DOM overlay): what to do, the size, Close. Loaded only at the tap (./ar.ts, JewelViewer).
 * The jewel is the same as for Quick Look (./ar.ts `arScene`): its metals as they are, its stones in a plain white, lit by
 * a soft room (three's RoomEnvironment).
 */
import { ACESFilmicToneMapping, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, PMREMGenerator, RingGeometry, Scene, SRGBColorSpace, Vector3, WebGLRenderer, type Object3D } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { arScene } from "./ar";

export type XrWords = { scan: string; tap: string; placed: string; close: string; trueSize: string; larger: string };

/** The overlay over the camera image: a line of help at the top, the size and Close at the foot (48 px buttons). */
function overlayOf(words: XrWords, dir: "ltr" | "rtl") {
  const root = document.createElement("div");
  root.dir = dir;
  root.setAttribute("data-webxr-overlay", "");
  root.style.cssText = "position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:max(16px,env(safe-area-inset-top)) 16px max(20px,env(safe-area-inset-bottom));font:16px/1.4 Manrope,system-ui,sans-serif;color:#fff;pointer-events:none";
  const hint = document.createElement("p");
  hint.setAttribute("role", "status");
  hint.style.cssText = "margin:0;max-width:28rem;padding:10px 18px;border-radius:999px;background:rgba(10,10,10,0.72);text-align:center";
  hint.textContent = words.scan;
  const bar = document.createElement("div");
  bar.style.cssText = "display:flex;gap:10px;pointer-events:auto";
  const button = (label: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = "min-height:48px;padding:0 22px;border-radius:999px;border:1px solid rgba(232,180,160,0.7);background:rgba(10,10,10,0.72);color:#fff;font:inherit";
    // A tap on a button never places the jewel too.
    b.addEventListener("beforexrselect", (e) => e.preventDefault());
    bar.appendChild(b);
    return b;
  };
  const size = button(words.larger);
  const close = button(words.close);
  root.append(hint, bar);
  return { root, hint, size, close };
}

/**
 * Opens the jewel in the room (to be called from a tap of the client). Resolves once the session has started; rejects
 * when it cannot (the caller then opens Scene Viewer).
 */
export async function startWebXr(jewel: Object3D, words: XrWords, dir: "ltr" | "rtl" = "ltr"): Promise<void> {
  const xr = (navigator as Navigator & { xr?: XRSystem }).xr;
  if (!xr) throw new Error("WebXR is not available");
  const ui = overlayOf(words, dir);
  document.body.appendChild(ui.root);
  let session: XRSession;
  try {
    session = await xr.requestSession("immersive-ar", { requiredFeatures: ["hit-test"], optionalFeatures: ["dom-overlay"], domOverlay: { root: ui.root } });
  } catch (error) {
    ui.root.remove();
    throw error;
  }
  // Whatever was made is freed when the session ends (Close, the back gesture, an error on the way).
  const cleanup: (() => void)[] = [() => ui.root.remove()];
  session.addEventListener("end", () => cleanup.splice(0).reverse().forEach((f) => f()), { once: true });
  try {
    await run(session, jewel, words, ui, cleanup);
  } catch (error) {
    await session.end().catch(() => undefined);
    throw error;
  }
}

async function run(session: XRSession, jewel: Object3D, words: XrWords, ui: ReturnType<typeof overlayOf>, cleanup: (() => void)[]): Promise<void> {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%";
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType("local");

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pmrem.fromScene(room, 0.04).texture;
  scene.environment = env;
  scene.add(new HemisphereLight(0xffffff, 0x3a3330, 0.6));
  const camera = new PerspectiveCamera();
  const made = arScene(jewel);
  const holder = new Group();
  holder.visible = false;
  holder.add(made.scene);
  scene.add(holder);
  // The ring on the surface: 2.5 cm across, rose gold (the accent of the house).
  const reticle = new Mesh(new RingGeometry(0.01, 0.0125, 48).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xe8b4a0 }));
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  let larger = false;
  ui.size.addEventListener("click", () => {
    larger = !larger;
    holder.scale.setScalar(larger ? 4 : 1);
    ui.size.textContent = larger ? words.trueSize : words.larger;
  });
  ui.close.addEventListener("click", () => void session.end().catch(() => undefined));

  // The hit test of the ring, once the session runs (freed with it).
  const hit: { source?: XRHitTestSource } = {};
  const cameraAt = new Vector3();
  session.addEventListener("select", () => {
    if (!reticle.visible) return;
    holder.position.setFromMatrixPosition(reticle.matrix);
    // Turned towards the client.
    renderer.xr.getCamera().getWorldPosition(cameraAt);
    holder.rotation.set(0, Math.atan2(cameraAt.x - holder.position.x, cameraAt.z - holder.position.z), 0);
    holder.visible = true;
    ui.hint.textContent = words.placed;
  });

  cleanup.push(() => {
    renderer.setAnimationLoop(null);
    hit.source?.cancel();
    made.dispose();
    reticle.geometry.dispose();
    (reticle.material as MeshBasicMaterial).dispose();
    env.dispose();
    pmrem.dispose();
    room.dispose();
    renderer.dispose();
  });

  await renderer.xr.setSession(session);
  const viewerSpace = await session.requestReferenceSpace("viewer");
  hit.source = await session.requestHitTestSource?.({ space: viewerSpace });

  renderer.setAnimationLoop((_time, frame?: XRFrame) => {
    const space = renderer.xr.getReferenceSpace();
    if (frame && hit.source && space) {
      const pose = frame.getHitTestResults(hit.source)[0]?.getPose(space);
      reticle.visible = Boolean(pose);
      if (pose) reticle.matrix.fromArray(pose.transform.matrix);
      if (!holder.visible) ui.hint.textContent = pose ? words.tap : words.scan;
    }
    renderer.render(scene, camera);
  });
}
