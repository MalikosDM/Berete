/*
 * Inside the 3D canvas: the jewel, its lighting, the camera and its controls.
 * The camera never moves by itself: zoom goes towards the cursor (or the
 * pinch), right-click or two fingers move it, a double-click (double-tap)
 * glides to the detail under it. Only the buttons of the viewer frame the
 * whole jewel again.
 */
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls, ContactShadows } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode, type EffectComposer as Composer } from "postprocessing";
import {
  Box3,
  Color,
  EquirectangularReflectionMapping,
  FloatType,
  HalfFloatType,
  Matrix4,
  type InstancedMesh,
  Mesh,
  PerspectiveCamera,
  ShaderMaterial,
  Sphere,
  Vector3,
  WebGLRenderTarget,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
  type Texture,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { Ambiance, Background, LayerSetting, MetalId, ModelSettings, ModelView } from "@/data/models";
import { enamelMaterial, ghostMaterial, lightStoneMaterial, metalMaterial, refractionMaterial, setMetal, updateRefraction, type RefractionMaterial } from "./materials";

/* ---------- Loaders (decoders served by the site: /draco/, Meshopt inside the code) ---------- */

let gltfLoader: GLTFLoader | null = null;
function loader(): GLTFLoader {
  if (!gltfLoader) {
    const draco = new DRACOLoader().setDecoderPath("/draco/");
    gltfLoader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
  }
  return gltfLoader;
}

export const AMBIANCE_LOOKS: Record<Ambiance, { file: string; intensity: number; stone: number }> = {
  studio: { file: "/hdri/studio_small_09.hdr", intensity: 1, stone: 1 },
  warm: { file: "/hdri/brown_photostudio_02.hdr", intensity: 1.05, stone: 1.05 },
  spotlight: { file: "/hdri/studio_small_03.hdr", intensity: 0.45, stone: 1.25 },
};

const hdrCache = new Map<string, Promise<Texture>>();
function loadHdr(file: string): Promise<Texture> {
  let promise = hdrCache.get(file);
  if (!promise) {
    promise = new HDRLoader().loadAsync(file).then((texture) => {
      texture.mapping = EquirectangularReflectionMapping;
      return texture;
    });
    promise.catch(() => hdrCache.delete(file));
    hdrCache.set(file, promise);
  }
  return promise;
}

export const BACKGROUNDS: Record<Background, string> = { dark: "#0a0a0a", light: "#f4f2ef" };

/** What the viewer around the canvas can ask. */
export type StageApi = {
  view(kind: "front" | "side" | "top" | "reset"): void;
  getView(): ModelView | null;
  capture(): string | null;
};

export type Choices = { metals: Record<string, MetalId>; colors: Record<string, string> };

type Props = {
  url: string;
  bytes: number;
  phone: boolean;
  settings: ModelSettings;
  choices: Choices;
  ambiance: Ambiance;
  lightAngle: number;
  background: Background;
  autoRotate: boolean;
  /** Admin: one layer shown, the rest dimmed. */
  highlight: string | null;
  onApi: (api: StageApi | null) => void;
  onProgress: (percent: number) => void;
  onReady: (layers: string[]) => void;
  onError: () => void;
};

type LayerMeshes = Map<string, Mesh[]>;

const MIN_DISTANCE = 0.002; // 2 mm from the surface: a stone of 0.8 mm fills most of the view

/** The point of the jewel under a pixel, read from the GPU (positions drawn in a 1×1 image). */
function makePicker() {
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

type Loaded = { root: Object3D; layers: LayerMeshes; box: Box3; sphere: Sphere };
/** Where the jewel stands, in plain numbers, for the lights and the shadow. */
type Frame = { key: number; cx: number; cy: number; cz: number; radius: number; minY: number; width: number; height: number };

export default function Stage(props: Props) {
  const { url, bytes, phone, settings, choices, ambiance, lightAngle, background, autoRotate, highlight, onApi, onProgress, onReady, onError } = props;
  // The scene, the renderer and the camera are read when needed (get), never kept from a render.
  const get = useThree((s) => s.get);
  const controls = useRef<CameraControls>(null);
  const composer = useRef<Composer>(null);
  const model = useRef<Loaded | null>(null);
  const envMap = useRef<Texture | null>(null);
  const refraction = useRef<RefractionMaterial[]>([]);
  const savedView = useRef<ModelView | null>(settings.view);
  const angle = useRef(lightAngle);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [envVersion, setEnvVersion] = useState(0);

  useEffect(() => {
    savedView.current = settings.view;
  }, [settings.view]);
  useEffect(() => {
    angle.current = lightAngle;
  }, [lightAngle]);

  /* The model: meshes by layer, the box of the jewel, the first view */
  useEffect(() => {
    let alive = true;
    loader().load(
      url,
      (gltf) => {
        if (!alive) return;
        const { scene, invalidate } = get();
        const root = gltf.scene;
        const byLayer: LayerMeshes = new Map();
        root.traverse((o: Object3D) => {
          const mesh = o as Mesh;
          if (!mesh.isMesh) return;
          const name = (mesh.material as Material).name || "default";
          const list = byLayer.get(name) ?? [];
          list.push(mesh);
          byLayer.set(name, list);
        });
        root.updateMatrixWorld(true);
        const box = new Box3().setFromObject(root, true);
        const sphere = box.getBoundingSphere(new Sphere());
        scene.add(root);
        model.current = { root, layers: byLayer, box, sphere };
        const c = controls.current;
        if (c) {
          c.minDistance = MIN_DISTANCE;
          c.maxDistance = Math.max(sphere.radius * 10, 0.05);
          startView(c, box, get().camera as PerspectiveCamera, savedView.current, false);
        }
        setFrame({ key: Date.now(), cx: sphere.center.x, cy: sphere.center.y, cz: sphere.center.z, radius: sphere.radius, minY: box.min.y, width: Math.max(box.max.x - box.min.x, box.max.z - box.min.z), height: box.max.y - box.min.y });
        onReady([...byLayer.keys()]);
        invalidate();
      },
      (e) => {
        if (!alive) return;
        const total = e.lengthComputable && e.total > 0 ? e.total : bytes;
        onProgress(Math.min(99, Math.round((100 * e.loaded) / Math.max(total, 1))));
      },
      () => alive && onError(),
    );
    return () => {
      alive = false;
      const loaded = model.current;
      if (!loaded) return;
      get().scene.remove(loaded.root);
      loaded.root.traverse((o: Object3D) => {
        const mesh = o as Mesh;
        if (mesh.isMesh) (mesh.geometry as BufferGeometry).dispose();
      });
      model.current = null;
    };
  }, [url, bytes, onProgress, onReady, onError, get]);

  /* Lighting */
  useEffect(() => {
    let alive = true;
    loadHdr(AMBIANCE_LOOKS[ambiance].file)
      .then((texture) => {
        if (!alive) return;
        const { scene, invalidate } = get();
        scene.environment = texture;
        scene.environmentIntensity = AMBIANCE_LOOKS[ambiance].intensity;
        envMap.current = texture;
        setEnvVersion((v) => v + 1);
        invalidate();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [ambiance, get]);

  useEffect(() => {
    const { scene, invalidate } = get();
    scene.environmentRotation.set(0, lightAngle, 0);
    invalidate();
  }, [lightAngle, get]);

  useEffect(() => {
    const { scene, invalidate } = get();
    scene.background = new Color(BACKGROUNDS[background]);
    invalidate();
  }, [background, get]);

  /* Materials of each layer */
  useEffect(() => {
    const loaded = model.current;
    if (!loaded || frame === null) return undefined;
    const { made, refracting } = applyMaterials(loaded, envMap.current, { settings: settings.layers, choices, highlight, phone, ambiance });
    refraction.current = refracting;
    get().invalidate();
    return () => {
      for (const m of made) m.dispose();
    };
  }, [frame, envVersion, settings.layers, choices, highlight, phone, ambiance, get]);

  /* Every frame drawn: the stones follow the camera, near and far follow the distance */
  useFrame((state, delta) => {
    const c = controls.current;
    if (c && autoRotate) {
      c.azimuthAngle += delta * 0.35;
      state.invalidate();
    }
    const cam = state.camera as PerspectiveCamera;
    const loaded = model.current;
    if (c && loaded) {
      const distance = Math.max(c.distance, MIN_DISTANCE);
      const near = Math.max(distance / 100, 1e-5);
      const far = distance + loaded.sphere.radius * 6;
      if (Math.abs(cam.near - near) > near * 0.05 || Math.abs(cam.far - far) > far * 0.05) {
        cam.near = near;
        cam.far = far;
        cam.updateProjectionMatrix();
      }
    }
    if (refraction.current.length > 0) {
      const w = state.size.width * state.gl.getPixelRatio();
      const h = state.size.height * state.gl.getPixelRatio();
      for (const m of refraction.current) updateRefraction(m, cam, w, h, angle.current);
    }
  });

  /* Double-click or double-tap: glide towards the detail under the finger */
  useEffect(() => {
    const canvas = get().gl.domElement;
    const picker = makePicker();
    const pick = (clientX: number, clientY: number): Vector3 | null => {
      const { gl, scene, camera, invalidate } = get();
      const half = !gl.extensions.has("EXT_color_buffer_float");
      const rect = canvas.getBoundingClientRect();
      const cam = camera as PerspectiveCamera;
      const target = picker.target(half);
      const background = scene.background;
      const override = scene.overrideMaterial;
      scene.background = null;
      scene.overrideMaterial = picker.material;
      cam.setViewOffset(rect.width, rect.height, clientX - rect.left, clientY - rect.top, 1, 1);
      const before = gl.getRenderTarget();
      gl.setRenderTarget(target);
      gl.setClearColor(0x000000, 0);
      gl.clear();
      gl.render(scene, cam);
      const pixel = new Float32Array(4);
      if (half) {
        const raw = new Uint16Array(4);
        gl.readRenderTargetPixels(target, 0, 0, 1, 1, raw);
        for (let i = 0; i < 4; i++) pixel[i] = halfToFloat(raw[i]!);
      } else gl.readRenderTargetPixels(target, 0, 0, 1, 1, pixel);
      gl.setRenderTarget(before);
      cam.clearViewOffset();
      scene.background = background;
      scene.overrideMaterial = override;
      invalidate();
      return pixel[3]! > 0.5 ? new Vector3(pixel[0], pixel[1], pixel[2]) : null;
    };
    const glide = (clientX: number, clientY: number) => {
      const c = controls.current;
      const hit = pick(clientX, clientY);
      if (!c || !hit) return;
      const from = c.getPosition(new Vector3());
      const distance = Math.max(MIN_DISTANCE * 1.5, from.distanceTo(hit) * 0.4);
      const to = hit.clone().add(from.sub(hit).normalize().multiplyScalar(distance));
      void c.setLookAt(to.x, to.y, to.z, hit.x, hit.y, hit.z, true);
    };
    const taps = { last: { time: 0, x: 0, y: 0 }, down: { x: 0, y: 0 } };
    const onDouble = (e: MouseEvent) => glide(e.clientX, e.clientY);
    const onDown = (e: PointerEvent) => {
      taps.down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch" || Math.hypot(e.clientX - taps.down.x, e.clientY - taps.down.y) > 12) return;
      const now = performance.now();
      if (now - taps.last.time < 320 && Math.hypot(e.clientX - taps.last.x, e.clientY - taps.last.y) < 40) {
        glide(e.clientX, e.clientY);
        taps.last = { time: 0, x: 0, y: 0 };
      } else taps.last = { time: now, x: e.clientX, y: e.clientY };
    };
    canvas.addEventListener("dblclick", onDouble);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    return () => {
      canvas.removeEventListener("dblclick", onDouble);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      picker.dispose();
    };
  }, [get]);

  /* What the buttons around the canvas can do */
  useEffect(() => {
    const stageApi: StageApi = {
      view(kind) {
        const c = controls.current;
        const loaded = model.current;
        if (!c || !loaded) return;
        const camera = get().camera as PerspectiveCamera;
        if (kind === "reset") return startView(c, loaded.box, camera, savedView.current, true);
        const [azimuth, polar] = { front: [0, Math.PI / 2], side: [Math.PI / 2, Math.PI / 2], top: [0, 0.0001] }[kind] as [number, number];
        fitView(c, loaded.box, camera, azimuth, polar, true);
      },
      getView() {
        const c = controls.current;
        if (!c) return null;
        const p = c.getPosition(new Vector3());
        const t = c.getTarget(new Vector3());
        return { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z] };
      },
      capture() {
        const { gl, scene, camera } = get();
        if (composer.current) composer.current.render();
        else gl.render(scene, camera);
        try {
          return gl.domElement.toDataURL("image/png");
        } catch {
          return null;
        }
      },
    };
    onApi(stageApi);
    // Tests: with ?debug3d in the address, the camera and the layers can be read (and set) from the page.
    const w = window as unknown as Record<string, unknown>;
    const debug = new URLSearchParams(window.location.search).has("debug3d");
    if (debug) {
      w.__berete3d = {
        ...stageApi,
        solo: (name: string | null) => {
          for (const [k, meshes] of model.current?.layers ?? []) for (const m of meshes) m.visible = name === null || k === name;
          get().invalidate();
        },
        lookAt: (p: number[], t: number[]) => {
          void controls.current?.setLookAt(p[0]!, p[1]!, p[2]!, t[0]!, t[1]!, t[2]!, false);
          get().invalidate();
        },
        layerCenter: (name: string) => {
          const box = new Box3();
          for (const m of model.current?.layers.get(name) ?? []) box.expandByObject(m, true);
          return box.getCenter(new Vector3()).toArray();
        },
        /** World place of copy `index` of the first mesh of a layer. */
        instancePoint: (name: string, index: number) => {
          const mesh = model.current?.layers.get(name)?.[0];
          if (!mesh) return null;
          const inst = mesh as unknown as InstancedMesh;
          const p = new Vector3();
          if (inst.isInstancedMesh) {
            const m = new Matrix4();
            inst.getMatrixAt(Math.min(index, inst.count - 1), m);
            p.setFromMatrixPosition(m);
          } else {
            mesh.geometry.computeBoundingSphere();
            p.copy(mesh.geometry.boundingSphere!.center);
          }
          return p.applyMatrix4(mesh.matrixWorld).toArray();
        },
        /** Where a world point is on the canvas, in CSS pixels. */
        project: (p: number[]) => {
          const { camera, size } = get();
          const v = new Vector3(p[0], p[1], p[2]).project(camera);
          return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
        },
        target: () => controls.current?.getTarget(new Vector3()).toArray() ?? null,
        center: () => model.current?.sphere.center.toArray() ?? null,
      };
    }
    return () => {
      onApi(null);
      if (debug) delete w.__berete3d;
    };
  }, [onApi, get]);

  const radius = frame?.radius ?? 0.05;
  const cx = frame?.cx ?? 0;
  const cy = frame?.cy ?? 0;
  const cz = frame?.cz ?? 0;
  return (
    <>
      <CameraControls ref={controls} makeDefault dollyToCursor smoothTime={0.25} draggingSmoothTime={0.08} dollySpeed={0.8} />
      {ambiance === "spotlight" ? (
        <spotLight position={[cx + Math.sin(lightAngle) * radius * 3, cy + radius * 4, cz + Math.cos(lightAngle) * radius * 3]} intensity={300 * radius * radius} angle={0.45} penumbra={0.6} decay={2} color="#fff6ec" />
      ) : null}
      {ambiance === "warm" ? <directionalLight position={[cx + Math.sin(lightAngle + 1) * radius * 3, cy + radius * 2, cz + Math.cos(lightAngle + 1) * radius * 3]} intensity={1.1} color="#ffcf9e" /> : null}
      {/* The soft shadow under the jewel shows on the light background (on black, it would only draw a darker square). */}
      {frame && background === "light" ? (
        <ContactShadows
          key={background + frame.key}
          position={[cx, frame.minY - radius * 0.002, cz]}
          scale={frame.width * 1.5}
          far={Math.max(frame.height, radius * 0.2) * 1.5}
          blur={2.4}
          opacity={0.45}
          resolution={512}
          frames={1}
          color="#000000"
        />
      ) : null}
      {!phone ? (
        <EffectComposer ref={composer} multisampling={4}>
          <Bloom mipmapBlur luminanceThreshold={1.1} luminanceSmoothing={0.25} intensity={0.22} radius={0.5} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      ) : null}
    </>
  );
}

type Looks = { settings: ModelSettings["layers"]; choices: Choices; highlight: string | null; phone: boolean; ambiance: Ambiance };

/** Gives each mesh the material of its layer's role; returns the materials made (to dispose) and the refracting ones. */
function applyMaterials(loaded: Loaded, env: Texture | null, { settings, choices, highlight, phone, ambiance }: Looks): { made: Material[]; refracting: RefractionMaterial[] } {
  const made: Material[] = [];
  const refracting: RefractionMaterial[] = [];
  const metalByLayer = new Map<string, MeshStandardMaterial>();
  for (const [name, meshes] of loaded.layers) {
    const setting: LayerSetting = settings[name] ?? { role: "metal", metal: "rose-gold" };
    const shown = highlight === null || highlight === name;
    for (const mesh of meshes) {
      mesh.visible = setting.role !== "hide" || highlight === name;
      if (!shown) {
        mesh.material = ghostMaterial;
        continue;
      }
      if (setting.role === "metal" || setting.role === "hide") {
        const metal = choices.metals[name] ?? setting.metal ?? "rose-gold";
        let material = metalByLayer.get(name);
        if (!material) {
          material = metalMaterial(metal);
          metalByLayer.set(name, material);
          made.push(material);
        }
        setMetal(material, metal);
        mesh.material = material;
      } else if (setting.role === "enamel") {
        const material = enamelMaterial(choices.colors[name] ?? setting.color ?? "#1c1c1c");
        made.push(material);
        mesh.material = material;
      } else {
        const color = setting.role === "stone" ? (choices.colors[name] ?? setting.color ?? "#9b111e") : "#ffffff";
        if (!phone && env) {
          const material = refractionMaterial(mesh.geometry as BufferGeometry, env, color);
          (material.uniforms.color!.value as Color).multiplyScalar(AMBIANCE_LOOKS[ambiance].stone);
          refracting.push(material);
          made.push(material);
          mesh.material = material;
        } else {
          const material = lightStoneMaterial(color);
          made.push(material);
          mesh.material = material;
        }
      }
    }
  }
  return { made, refracting };
}

/** The first view: the one the jeweller saved, else the whole jewel seen from the front and above, its long side across the screen. */
function startView(c: CameraControls, box: Box3, camera: PerspectiveCamera, view: ModelView | null, smooth: boolean): void {
  if (view) {
    void c.setLookAt(...view.position, ...view.target, smooth);
    return;
  }
  const wide = box.max.x - box.min.x >= box.max.z - box.min.z;
  fitView(c, box, camera, wide ? 0.25 : Math.PI / 2 + 0.25, 1.0, smooth);
}

/** Places the camera at these angles, as close as possible with the whole box on screen (with a margin). */
function fitView(c: CameraControls, box: Box3, camera: PerspectiveCamera, azimuth: number, polar: number, smooth: boolean): void {
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
  void c.setLookAt(position.x, position.y, position.z, center.x, center.y, center.z, smooth);
}

function halfToFloat(h: number): number {
  const s = (h & 0x8000) >> 15;
  const e = (h & 0x7c00) >> 10;
  const f = h & 0x03ff;
  if (e === 0) return (s ? -1 : 1) * Math.pow(2, -14) * (f / 1024);
  if (e === 31) return f ? NaN : (s ? -1 : 1) * Infinity;
  return (s ? -1 : 1) * Math.pow(2, e - 15) * (1 + f / 1024);
}
