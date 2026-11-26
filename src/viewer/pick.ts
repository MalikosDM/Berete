/*
 * Reading the jewel from the GPU (26/11/2026, moved out of ./Stage.tsx): the point of the jewel under a pixel (a
 * double-click glides to it, the admin places the points of "The Art of Detail"), which points the jewel hides, and
 * the first view of the camera.
 */
import { Box3, FloatType, HalfFloatType, ShaderMaterial, Vector3, WebGLRenderTarget, type Object3D, type PerspectiveCamera, type Scene, type WebGLRenderer } from "three";
import type { CameraControls } from "@react-three/drei";
import type { ModelView } from "@/data/models";

export const MIN_DISTANCE = 0.002; // 2 mm from the surface: a stone of 0.8 mm fills most of the view

/** The point of the jewel under a pixel, read from the GPU (positions drawn in a 1×1 image). */
export function makePicker() {
  const material = new ShaderMaterial({
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 world = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          world = instanceMatrix * world;
        #endif
        world = modelMatrix * world;
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vWorld;
      void main() { gl_FragColor = vec4(vWorld, 1.0); }`,
  });
  let target: WebGLRenderTarget | null = null;
  return { material, target: (half: boolean) => (target ??= new WebGLRenderTarget(1, 1, { type: half ? HalfFloatType : FloatType })), dispose: () => (material.dispose(), target?.dispose()) };
}

/**
 * Which points the jewel hides from the camera: the positions of the jewel are drawn in a small image (the size of a
 * thumbnail), and a point is seen when nothing of the jewel stands between it and the camera around its place.
 */
export function lookAt(
  gl: WebGLRenderer,
  scene: Scene,
  cam: PerspectiveCamera,
  points: [number, number, number][],
  radius: number,
  looker: ReturnType<typeof makePicker>,
): boolean[] {
  const half = !gl.extensions.has("EXT_color_buffer_float");
  const W = 128;
  const H = Math.max(16, Math.round(W / Math.max(cam.aspect, 0.1)));
  const target = looker.target(half);
  if (target.width !== W || target.height !== H) target.setSize(W, H);
  const view = cam.view?.enabled ? { ...cam.view } : null;
  if (view) cam.clearViewOffset();
  const background = scene.background;
  const override = scene.overrideMaterial;
  scene.background = null;
  scene.overrideMaterial = looker.material;
  const hidden: Object3D[] = [];
  scene.traverse((o) => {
    if (o.userData.noPick && o.visible) {
      o.visible = false;
      hidden.push(o);
    }
  });
  const before = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.setClearColor(0x000000, 0);
  gl.clear();
  gl.render(scene, cam);
  const data = new Float32Array(W * H * 4);
  if (half) {
    const raw = new Uint16Array(W * H * 4);
    gl.readRenderTargetPixels(target, 0, 0, W, H, raw);
    for (let i = 0; i < raw.length; i++) data[i] = halfToFloat(raw[i]!);
  } else gl.readRenderTargetPixels(target, 0, 0, W, H, data);
  gl.setRenderTarget(before);
  scene.background = background;
  scene.overrideMaterial = override;
  for (const o of hidden) o.visible = true;
  if (view) cam.setViewOffset(view.fullWidth, view.fullHeight, view.offsetX, view.offsetY, view.width, view.height);

  const eye = cam.getWorldPosition(new Vector3());
  const tolerance = radius * 0.04;
  const v = new Vector3();
  const hit = new Vector3();
  return points.map((p) => {
    v.set(p[0], p[1], p[2]);
    const distance = v.distanceTo(eye);
    v.project(cam);
    if (v.z >= 1) return false;
    const px = Math.round(((v.x + 1) / 2) * W);
    const py = Math.round(((v.y + 1) / 2) * H);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = px + dx;
        const y = py + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const i = (y * W + x) * 4;
        // Nothing of the jewel there, or the jewel no nearer than the point itself: seen.
        if (data[i + 3]! < 0.5) return true;
        hit.set(data[i]!, data[i + 1]!, data[i + 2]!);
        if (hit.distanceTo(eye) >= distance - tolerance) return true;
      }
    }
    return false;
  });
}

/** The first view: the one the jeweller saved, else the whole jewel seen from the front and above, its long side across the screen. */
export function startView(c: CameraControls, box: Box3, camera: PerspectiveCamera, view: ModelView | null, smooth: boolean, auto: { scale: boolean; center: boolean } = { scale: true, center: true }): void {
  void c.zoomTo(1, smooth);
  if (view) {
    void c.setLookAt(...view.position, ...view.target, smooth);
    return;
  }
  // "Auto Scale" and "Auto Center" off (the editor's Vue): the jewel where its file puts it, seen from a fixed distance.
  if (!auto.scale || !auto.center) {
    const target = auto.center ? box.getCenter(new Vector3()) : new Vector3(0, 0, 0);
    const distance = auto.scale ? Math.max(MIN_DISTANCE, box.getSize(new Vector3()).length() * 1.6) : 0.12;
    void c.setLookAt(target.x, target.y + distance * 0.45, target.z + distance * 0.9, target.x, target.y, target.z, smooth);
    return;
  }
  const wide = box.max.x - box.min.x >= box.max.z - box.min.z;
  fitView(c, box, camera, wide ? 0.25 : Math.PI / 2 + 0.25, 1.0, smooth);
}

/** Places the camera at these angles, as close as possible with the whole box on screen (with a margin). */
export function fitView(c: CameraControls, box: Box3, camera: PerspectiveCamera, azimuth: number, polar: number, smooth: boolean): void {
  const center = box.getCenter(new Vector3());
  const toCamera = new Vector3().setFromSphericalCoords(1, polar, azimuth);
  const forward = toCamera.clone().negate();
  const right = new Vector3().crossVectors(forward, Math.abs(toCamera.y) > 0.999 ? new Vector3(0, 0, -1) : new Vector3(0, 1, 0)).normalize();
  const up = new Vector3().crossVectors(right, forward).normalize();
  const tanV = Math.tan((camera.fov * Math.PI) / 360);
  const tanH = tanV * camera.aspect;
  const margin = 1.12;
  let distance = MIN_DISTANCE;
  const corner = new Vector3();
  for (let i = 0; i < 8; i++) {
    corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(center);
    const depth = corner.dot(toCamera);
    distance = Math.max(distance, depth + (Math.abs(corner.dot(right)) * margin) / tanH, depth + (Math.abs(corner.dot(up)) * margin) / tanV);
  }
  const position = center.clone().addScaledVector(toCamera, distance);
  void c.zoomTo(1, smooth);
  void c.setLookAt(position.x, position.y, position.z, center.x, center.y, center.z, smooth);
}

export function halfToFloat(h: number): number {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const f = h & 0x03ff;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : (s ? -1 : 1) * Infinity;
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}

/** Which mesh is under a pixel: each mesh drawn in its own flat number into a 1 × 1 image (the editor's click). */
export function pickMesh(gl: WebGLRenderer, scene: Scene, camera: PerspectiveCamera, canvas: HTMLCanvasElement, clientX: number, clientY: number, meshes: Object3D[]): Object3D | null {
  const rect = canvas.getBoundingClientRect();
  const target = new WebGLRenderTarget(1, 1);
  const swapped: [import("three").Mesh, import("three").Material | import("three").Material[]][] = [];
  const made: ShaderMaterial[] = [];
  const hidden: Object3D[] = [];
  const ids = new Set(meshes);
  scene.traverse((o) => {
    if (!o.visible) return;
    const mesh = o as import("three").Mesh;
    if (!mesh.isMesh) return;
    if (!ids.has(o)) {
      o.visible = false;
      hidden.push(o);
      return;
    }
  });
  meshes.forEach((o, i) => {
    const mesh = o as import("three").Mesh;
    const id = i + 1;
    const material = new ShaderMaterial({
      vertexShader: /* glsl */ `
        void main() {
          vec4 p = vec4(position, 1.0);
          #ifdef USE_INSTANCING
            p = instanceMatrix * p;
          #endif
          gl_Position = projectionMatrix * modelViewMatrix * p;
        }`,
      fragmentShader: `void main() { gl_FragColor = vec4(${((id & 255) / 255).toFixed(6)}, ${(((id >> 8) & 255) / 255).toFixed(6)}, 0.0, 1.0); }`,
    });
    made.push(material);
    swapped.push([mesh, mesh.material]);
    mesh.material = material;
  });
  const background = scene.background;
  scene.background = null;
  camera.setViewOffset(rect.width, rect.height, clientX - rect.left, clientY - rect.top, 1, 1);
  const before = gl.getRenderTarget();
  gl.setRenderTarget(target);
  gl.setClearColor(0x000000, 0);
  gl.clear();
  gl.render(scene, camera);
  const pixel = new Uint8Array(4);
  gl.readRenderTargetPixels(target, 0, 0, 1, 1, pixel);
  gl.setRenderTarget(before);
  camera.clearViewOffset();
  scene.background = background;
  for (const [mesh, material] of swapped) mesh.material = material;
  for (const o of hidden) o.visible = true;
  for (const m of made) m.dispose();
  target.dispose();
  const id = pixel[0]! + pixel[1]! * 256;
  return pixel[3]! > 0 && id > 0 ? (meshes[id - 1] ?? null) : null;
}
