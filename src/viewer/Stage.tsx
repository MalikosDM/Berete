/*
 * Inside the 3D canvas: the jewel, its two lightings (the metal's and the stones'), the camera and its controls, the
 * ground, the stand, and the effects of the screen (reflections, bevel, glow, tone), as a jeweller's renderer arranges
 * them (26/11/2026). The camera never moves by itself: zoom goes towards the cursor (or the pinch), right-click or two
 * fingers move it, a double-click (double-tap) glides to the detail under it; only the buttons, the saved views and the
 * films move it. Once still, the image is refined (progressive rendering) to a photograph's quality.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { Bloom, BrightnessContrast, ChromaticAberration, DepthOfField, EffectComposer, HueSaturation, N8AO, Noise, Outline, ToneMapping, Vignette } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode, type EffectComposer as Composer } from "postprocessing";
import {
  Box3,
  CanvasTexture,
  Color,
  DataTexture,
  SRGBColorSpace,
  EquirectangularReflectionMapping,
  Euler,
  FramebufferTexture,
  HalfFloatType,
  Matrix4,
  Quaternion,
  RGBAFormat,
  Sphere,
  Vector2,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  type Mesh,
  type MeshPhysicalMaterial,
  type MeshStandardMaterial,
  type Object3D,
  type PerspectiveCamera,
  type Texture,
  type WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { HDRLoader } from "three/examples/jsm/loaders/HDRLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { diamondOf, type Background, type DiamondLook, type LayerSetting, type MetalId, type ModelSettings, type ModelView } from "@/data/models";
import { merged, type DiamondParams, type Ease, type PoseKind, type SceneSettings, type ToneMap, type Vec3, type ViewsSettings } from "@/data/scene3d";
import { AccumulatePass, jitter } from "./accumulate";
import { BACKGROUND_LOOKS, backgroundOfScene } from "./backgrounds";
import { between, EASE, pathDuration, poseAt, turnAt, type Pose } from "./cameraPath";
import { loadEnv } from "./envs";
import { cubeResolution, gemMaterial, modeFor, orientOf, releaseCube, setGemEnv, setGemLighting, setGemParams, stoneCube, type GemMaterial } from "./gems";
import { disposeMaterial, materialById, makeMetal, setMetalLook } from "./library/materials";
import { projectUv } from "./textures";
import { enamelMaterial, ghostMaterial, lightStoneMaterial } from "./materials";
import { splitMirrored } from "./mirror";
import { fitView, halfToFloat, lookAt, makePicker, MIN_DISTANCE, pickMesh, startView } from "./pick";
import { stablePose } from "./pose";
import { BEVEL, patchBloom, Prepass, ReflectionPass, withBevel } from "./screen";
import { Ground, Lights, SurfaceUnder, type Frame } from "./stageParts";
import { makeStand } from "./stands";
import { exportGlb } from "./export/glb";
import type { JewelFrame, PathKind, RenderApi, StageHandles } from "./types";

/* ---------- Loaders (decoders served by the site: /draco/, Meshopt inside the code) ---------- */

let gltfLoader: GLTFLoader | null = null;
function loader(): GLTFLoader {
  if (!gltfLoader) {
    const draco = new DRACOLoader().setDecoderPath("/draco/");
    gltfLoader = new GLTFLoader().setDRACOLoader(draco).setMeshoptDecoder(MeshoptDecoder);
  }
  return gltfLoader;
}

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

/** A black lighting, while the real one loads. */
const NO_LIGHT = (() => {
  const t = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat);
  t.mapping = EquirectangularReflectionMapping;
  t.needsUpdate = true;
  return t;
})();

/** What the viewer around the canvas can ask. */
export type StageApi = {
  view(kind: "front" | "side" | "top" | "reset"): void;
  getView(): ModelView | null;
  capture(): string | null;
  /** The point of the jewel under a point of the screen, in the space of the model (null: nothing there). */
  pick(clientX: number, clientY: number): [number, number, number] | null;
  /** Glides to a place (seconds 0: at once). */
  goTo(pose: Pose, seconds?: number, ease?: Ease, interpolation?: "spherical" | "linear"): void;
  /** Plays the saved views in a loop, or stops. */
  playViews(on: boolean): void;
  /** The camera at t ∈ [0, 1] of the path through the saved views (the page's scrolling). */
  seek(t: number): void;
  /** Frames the whole jewel from where the camera looks. */
  fit(): void;
  /** Brings the camera closer (below 1) or farther (above 1), towards the middle of the view. */
  zoomBy(factor: number): void;
  /** iJewel's "Compute Stable Pose". */
  stablePose(kind: PoseKind): Vec3;
  handles: StageHandles;
};

/** A point of the model on the screen (CSS pixels of the canvas), and whether the jewel hides it. */
export type AnchorFrame = { x: number; y: number; visible: boolean };

/** What the client chose: a metal per metal layer, a colour per coloured stone, a material of the library per layer (configurator). */
export type Choices = { metals: Record<string, MetalId>; colors: Record<string, string>; materials?: Record<string, string> };

type Props = {
  url: string;
  bytes: number;
  phone: boolean;
  /** The device is too slow for refraction: the stones become glass of the same index. */
  simpleStones: boolean;
  settings: ModelSettings;
  scene: SceneSettings;
  views?: ViewsSettings;
  choices: Choices;
  /** The client's turn of the lighting (radians), over the scene's. */
  lightAngle: number;
  background: Background;
  autoRotate: boolean;
  /** Radians per second of the turning (default 0.35); it waits while the visitor turns the jewel, then goes on. */
  rotateSpeed?: number;
  /** Points of the model followed on the screen ("The Art of Detail"): onAnchors gets them at every image drawn. */
  anchors?: [number, number, number][];
  onAnchors?: (frames: AnchorFrame[]) => void;
  /** Admin: one layer shown, the rest dimmed. */
  highlight: string | null;
  /** Editor: the layer outlined in rose gold. */
  selected?: string | null;
  /** Editor: a click on the jewel names its layer (null: beside it). */
  onPick?: (layer: string | null) => void;
  /** Closest and farthest distances, in times the size of the jewel (the client's viewer, by orientation). */
  distance?: [number, number] | null;
  /** The wheel and the pinch bring the jewel closer (false: they scroll the page). */
  zoom?: boolean;
  onApi: (api: StageApi | null) => void;
  onProgress: (percent: number) => void;
  onReady: (layers: string[]) => void;
  onError: () => void;
};

type LayerMeshes = Map<string, Mesh[]>;
type Loaded = { root: Object3D; layers: LayerMeshes; box: Box3; sphere: Sphere; base: Box3 };

/** Bounces of the light inside a stone while the camera moves (the settings' own once still), on phones at most. */
const MOVING_BOUNCES = { computer: 4, phone: 2 };
const PHONE_MAX_BOUNCES = 5;

const TONE: Record<ToneMap, ToneMappingMode> = {
  aces: ToneMappingMode.ACES_FILMIC,
  agx: ToneMappingMode.AGX,
  linear: ToneMappingMode.LINEAR,
  reinhard: ToneMappingMode.REINHARD,
  cineon: ToneMappingMode.OPTIMIZED_CINEON,
  uncharted2: ToneMappingMode.UNCHARTED2,
};

const MIRROR: Record<string, number> = { polished: 1, satin: 0.35, brushed: 0.45, hammered: 0.6, aged: 0.25 };

/** The metal and finish a library id names ("metal/rose-gold/brushed"), or null. */
function metalOfId(id: string | undefined): { metal: MetalId; finish: LayerSetting["finish"] } | null {
  if (!id?.startsWith("metal/")) return null;
  const [, metal, kind] = id.split("/");
  return { metal: metal as MetalId, finish: { kind: (kind ?? "polished") as NonNullable<LayerSetting["finish"]>["kind"] } };
}

export default function Stage(props: Props) {
  const { url, bytes, phone, simpleStones, settings, scene, choices, lightAngle, background, autoRotate, highlight, onApi, onProgress, onReady, onError } = props;
  const get = useThree((s) => s.get);
  const rotateSpeed = props.rotateSpeed ?? 0.35;
  const views = props.views;
  // Read at every image (never a new render for them).
  const anchors = useRef(props.anchors ?? []);
  const onAnchors = useRef(props.onAnchors);
  const visible = useRef<boolean[]>([]);
  const lastLook = useRef(0);
  const sceneRef = useRef(scene);
  const viewsRef = useRef(views);
  const lightRef = useRef(lightAngle);
  useEffect(() => {
    anchors.current = props.anchors ?? [];
    onAnchors.current = props.onAnchors;
    sceneRef.current = scene;
    viewsRef.current = views;
    lightRef.current = lightAngle;
    lastLook.current = 0;
    get().invalidate();
  });
  const [looker] = useState(() => makePicker());
  useEffect(() => () => looker.dispose(), [looker]);
  const handledUntil = useRef(0);
  const pickRef = useRef<((x: number, y: number) => Vector3 | null) | null>(null);
  const controls = useRef<CameraControls>(null);
  const composer = useRef<Composer>(null);
  const model = useRef<Loaded | null>(null);
  const gems = useRef<GemMaterial[]>([]);
  const metals = useRef<Map<string, MeshPhysicalMaterial>>(new Map());
  const mirrorCopies = useRef(0);
  const savedView = useRef<ModelView | null>(settings.view);
  const [frame, setFrame] = useState<Frame | null>(null);
  const [accumulate] = useState(() => new AccumulatePass());
  const dirty = useRef(true);
  const lastCamera = useRef("");
  const markDirty = useCallback(() => {
    dirty.current = true;
    get().invalidate();
  }, [get]);
  const exporting = useRef(false);
  // Animation of the camera (views, films): from, to, start, length.
  const flight = useRef<{ from: Pose; to: Pose; start: number; seconds: number; ease: Ease; interpolation: "spherical" | "linear" } | null>(null);
  const playing = useRef<{ start: number } | null>(null);
  const [gemEnv, setGemEnvTex] = useState<Texture>(NO_LIGHT);
  const [metalEnv, setMetalEnvTex] = useState<Texture | null>(null);
  const ownEnvs = useRef(new Map<string, Texture>());

  const post = scene.post;
  // A computer drawing without a graphics card (software rendering: some office computers, headless browsers) gets the
  // lighter version, as a phone does: the effects of the screen would take seconds per image.
  const lowEnd = useMemo(() => {
    try {
      const ctx = get().gl.getContext();
      const info = ctx.getExtension("WEBGL_debug_renderer_info");
      const renderer = info ? String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
      return /swiftshader|llvmpipe|software|basic render/i.test(renderer);
    } catch {
      return false;
    }
  }, [get]);
  const light = phone || lowEnd;
  // The first look of the screen (reflections, bevel, glow per material): computers with a graphics card only.
  const screenEffects = !light && (post.ssr.enabled || post.bevel.enabled || post.bloom.enabled);
  const [prepass] = useState(() => {
    if (typeof document === "undefined") return null;
    return new Prepass(true);
  });
  useEffect(() => () => prepass?.dispose(), [prepass]);
  const [reflection] = useState(() => (prepass ? new ReflectionPass(prepass) : null));
  useEffect(() => () => reflection?.dispose(), [reflection]);
  // What stands behind a stone, for its transmission (a copy of the image drawn before the stones).
  const sceneCopy = useRef<FramebufferTexture | null>(null);
  const needsCopy = Object.values(settings.layers).some((l) => (l.role === "diamond" || l.role === "stone") && (l.diamond?.transmission ?? 0) > 0);

  useEffect(() => {
    savedView.current = settings.view;
  }, [settings.view]);

  /* The model: meshes by layer, the box of the jewel, the first view */
  useEffect(() => {
    let alive = true;
    loader().load(
      url,
      (gltf) => {
        if (!alive) return;
        const { scene: three, invalidate } = get();
        const root = gltf.scene;
        mirrorCopies.current = splitMirrored(root);
        const byLayer: LayerMeshes = new Map();
        root.traverse((o: Object3D) => {
          const mesh = o as Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          const name = (mesh.material as Material).name || "default";
          const list = byLayer.get(name) ?? [];
          list.push(mesh);
          byLayer.set(name, list);
        });
        root.updateMatrixWorld(true);
        const base = new Box3().setFromObject(root, true);
        const box = base.clone();
        const sphere = box.getBoundingSphere(new Sphere());
        three.add(root);
        model.current = { root, layers: byLayer, box, sphere, base };
        const c = controls.current;
        if (c) {
          c.minDistance = MIN_DISTANCE;
          c.maxDistance = Math.max(sphere.radius * 10, 0.05);
          startView(c, box, get().camera as PerspectiveCamera, savedView.current, false, { scale: sceneRef.current.camera.autoScale, center: sceneRef.current.camera.autoCenter });
        }
        setFrame(frameOf(box, sphere));
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

  // The stand under the jewel (procedural, ./stands.ts).
  const stand = useMemo(() => {
    if (!scene.stand || !frame || !model.current) return null;
    const loaded = model.current;
    const size = loaded.base.getSize(new Vector3());
    const center = loaded.base.getCenter(new Vector3());
    return makeStand(scene.stand, { center: center.toArray() as [number, number, number], radius: loaded.base.getBoundingSphere(new Sphere()).radius, minY: loaded.base.min.y, size: size.toArray() as [number, number, number] });
  }, [scene.stand, frame]);
  useEffect(() => () => stand?.dispose(), [stand]);
  const standJewel = stand ? stand.jewel : null;

  /* The pose of the jewel (lying, standing...) or its place on the stand */
  const poseKey = scene.stand ? "stand:" + scene.stand : "pose:" + scene.pose.rotation.join(",");
  const posedOnce = useRef(0);
  useEffect(() => {
    const loaded = model.current;
    if (!loaded || frame === null) return;
    const root = loaded.root;
    const k = Math.PI / 180;
    if (scene.stand && standJewel) {
      root.position.copy(standJewel.position);
      root.rotation.copy(standJewel.rotation);
    } else {
      const [x, y, z] = scene.pose.rotation;
      // Turned around the middle of the jewel: it stays where it was.
      const center = loaded.base.getCenter(new Vector3());
      const q = new Quaternion().setFromEuler(new Euler(x * k, y * k, z * k, "XYZ"));
      root.quaternion.copy(q);
      root.position.copy(center.clone().sub(center.clone().applyQuaternion(q)));
    }
    root.updateMatrixWorld(true);
    loaded.box.setFromObject(root, true);
    loaded.box.getBoundingSphere(loaded.sphere);
    // A pose or a stand chosen after the first look: the camera frames the jewel (and its stand) again.
    const c = controls.current;
    if (c && posedOnce.current === frame.key) {
      const whole = loaded.box.clone();
      if (stand) whole.union(new Box3().setFromObject(stand.group));
      fitView(c, whole, get().camera as PerspectiveCamera, c.azimuthAngle, Math.min(c.polarAngle, 1.25), true);
    }
    posedOnce.current = frame.key;
    markDirty();
    // Only when the pose itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poseKey, standJewel, frame?.key]);

  /* The metal's lighting (Environment) */
  useEffect(() => {
    let alive = true;
    loadEnv(scene.envMetal.id, phone)
      .then((texture) => {
        if (!alive) return;
        const three = get().scene;
        three.environment = texture;
        setMetalEnvTex(texture);
        markDirty();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [scene.envMetal.id, phone, get, markDirty]);
  useEffect(() => {
    get().scene.environmentIntensity = scene.envMetal.intensity;
    markDirty();
  }, [scene.envMetal.intensity, get, markDirty]);

  /* The stones' lighting (Gem Environment) */
  useEffect(() => {
    let alive = true;
    loadEnv(scene.envGem.id, phone)
      .then((texture) => {
        if (!alive) return;
        setGemEnvTex(texture);
        for (const m of gems.current) if (!m.userData.diamond.env) setGemEnv(m, texture);
        markDirty();
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [scene.envGem.id, phone, markDirty]);

  /* Behind the jewel: transparent, the metal's lighting, a colour, a gradient, a named background (a room out of focus) */
  useEffect(() => {
    let alive = true;
    const three = get().scene;
    const show = (painted: Color | Texture | null, blur: number, intensity: number, rotation: number) => {
      three.background = painted;
      three.backgroundBlurriness = blur;
      three.backgroundIntensity = intensity;
      three.backgroundRotation.set(0, rotation, 0);
      markDirty();
    };
    if (post.tonemap.clipBackground) show(null, 0, 1, 0);
    else if (scene.envBackground && metalEnv) show(metalEnv, 0, scene.envMetal.intensity, (scene.envMetal.rotation * Math.PI) / 180 + lightAngle);
    else if (scene.backdrop?.kind === "color") show(new Color(scene.backdrop.color), 0, 1, 0);
    else if (scene.backdrop?.kind === "gradient") show(gradientOf(scene.backdrop.inner, scene.backdrop.outer), 0, 1, 0);
    else {
      const look = BACKGROUND_LOOKS[background];
      show(backgroundOfScene(background), 0, 1, 0);
      if (look.room) {
        const room = look.room;
        loadHdr(room.file)
          .then((texture) => alive && show(texture, room.blur, room.intensity, room.rotation))
          .catch(() => undefined);
      }
    }
    return () => {
      alive = false;
    };
  }, [background, scene.backdrop, scene.envBackground, scene.envMetal.intensity, scene.envMetal.rotation, metalEnv, lightAngle, post.tonemap.clipBackground, get, markDirty]);

  /* Materials of each layer: rebuilt when what they are changes; their settings follow live (below). */
  const look: DiamondLook = settings.diamonds ?? "realistic";
  const structure = useMemo(() => {
    const layers = Object.entries(settings.layers).map(([name, l]) => [name, l.role, l.metal, l.color, l.material, l.finish?.kind, l.finish?.angle, l.bevel, l.bloom, l.diamond?.mode, l.diamond?.env, (l.diamond?.transmission ?? 0) > 0]);
    return JSON.stringify([layers, choices, highlight, simpleStones, look]);
  }, [settings.layers, choices, highlight, simpleStones, look]);
  useEffect(() => {
    const loaded = model.current;
    if (!loaded || frame === null) return undefined;
    const gl = get().gl;
    if (needsCopy && !sceneCopy.current) sceneCopy.current = new FramebufferTexture(1, 1);
    const made = applyMaterials(loaded, {
      settings: settings.layers,
      choices,
      highlight,
      phone,
      simpleStones,
      look,
      gemEnv,
      ownEnv: (id) => ownEnvs.current.get(id) ?? null,
      renderer: gl,
      sceneTex: needsCopy ? sceneCopy.current : null,
    });
    gems.current = made.gems;
    metals.current = made.metals;
    // The stones' own lightings, when one asks for another than the scene's.
    for (const m of made.gems) {
      const id = m.userData.diamond.env;
      if (!id || ownEnvs.current.has(id)) continue;
      void loadEnv(id, phone).then((t) => {
        ownEnvs.current.set(id, t);
        for (const g of gems.current) if (g.userData.diamond.env === id) setGemEnv(g, t);
        markDirty();
      });
    }
    // The first stone drawn copies what is behind it (transmission).
    if (needsCopy && sceneCopy.current) {
      const first = loaded.root.getObjectByProperty("renderOrder", 2) as Mesh | undefined;
      if (first) {
        first.onBeforeRender = (renderer: WebGLRenderer) => {
          const copy = sceneCopy.current;
          if (!copy) return;
          const size = renderer.getDrawingBufferSize(new Vector2());
          const target = renderer.getRenderTarget();
          const w = target ? target.width : size.x;
          const h = target ? target.height : size.y;
          if (copy.image.width !== w || copy.image.height !== h) {
            copy.dispose();
            sceneCopy.current = new FramebufferTexture(w, h);
            sceneCopy.current.type = target ? target.texture.type : HalfFloatType;
            for (const g of gems.current) g.uniforms.sceneTex!.value = sceneCopy.current;
          }
          renderer.copyFramebufferToTexture(sceneCopy.current!, new Vector2(0, 0));
        };
      }
    }
    markDirty();
    return () => {
      for (const m of made.made) disposeMaterial(m);
      for (const [g, r] of made.cubes) releaseCube(g, r);
    };
    // The live settings are read below; this rebuilds only when the kind of the materials changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, structure, phone, gemEnv === NO_LIGHT, needsCopy, get]);

  /* Live settings of the stones (sliders of the editor) */
  useEffect(() => {
    for (const m of gems.current) {
      const layer = (m.userData as { layer?: string }).layer ?? "";
      setGemParams(m, paramsOf(settings.layers[layer], look, choices.materials?.[layer]), phone ? PHONE_MAX_BOUNCES : 16);
    }
    markDirty();
  }, [settings.layers, look, choices.materials, phone, markDirty]);

  /* Effects of the screen */
  useEffect(() => {
    const gl = get().gl;
    gl.toneMappingExposure = post.tonemap.exposure;
    accumulate.taa = scene.render.taa;
    if (reflection && frame) reflection.configure(post.ssr, frame.radius);
    BEVEL.bjSceneRadius.value = post.bevel.radius;
    BEVEL.bjIntensity.value = post.bevel.intensity;
    if (frame) BEVEL.bjDepthRange.value = frame.radius * 0.08;
    markDirty();
  }, [post, scene.render.taa, reflection, frame, accumulate, get, markDirty]);

  /* The camera's limits: closest and farthest (the client's viewer), never under the ground if asked */
  useEffect(() => {
    const c = controls.current;
    if (!c || !frame) return;
    const [lo, hi] = props.distance ?? [0, 0];
    c.minDistance = lo > 0 ? Math.max(MIN_DISTANCE, lo * frame.radius) : MIN_DISTANCE;
    c.maxDistance = hi > 0 ? hi * frame.radius : Math.max(frame.radius * 10, 0.05);
    c.maxPolarAngle = scene.ground.limitCamera && scene.ground.preset !== "none" ? Math.PI / 2 - 0.02 : Math.PI;
    // camera-controls' actions: DOLLY 16 for the wheel, TOUCH_DOLLY_TRUCK 4096 (pinch and move) or TOUCH_TRUCK 128 (move only).
    c.mouseButtons.wheel = props.zoom === false ? 0 : 16;
    c.touches.two = props.zoom === false ? 128 : 4096;
  }, [frame, props.distance, props.zoom, scene.ground.limitCamera, scene.ground.preset]);

  /* Shift + drag moves the jewel (as in jewellers' tools), as the right button does */
  useEffect(() => {
    const set = (e: KeyboardEvent) => {
      const c = controls.current;
      if (c && e.key === "Shift") c.mouseButtons.left = e.type === "keydown" ? 2 : 1;
    };
    window.addEventListener("keydown", set);
    window.addEventListener("keyup", set);
    return () => {
      window.removeEventListener("keydown", set);
      window.removeEventListener("keyup", set);
    };
  }, []);

  /* Every frame drawn */
  useFrame((state, delta) => {
    const c = controls.current;
    const cam = state.camera as PerspectiveCamera;
    const loaded = model.current;
    if (exporting.current) return;
    const now = performance.now();
    // A flight between two places (a view, the path of the views).
    const f = flight.current;
    if (c && f) {
      const t = Math.min(1, (now - f.start) / 1000 / Math.max(0.001, f.seconds));
      applyPose(c, cam, between(f.from, f.to, EASE[f.ease](t), f.interpolation));
      if (t >= 1) flight.current = null;
      state.invalidate();
    } else if (c && playing.current && viewsRef.current && viewsRef.current.list.length > 1) {
      const p = poseAt(viewsRef.current, (now - playing.current.start) / 1000);
      if (p) applyPose(c, cam, p);
      state.invalidate();
    } else if (c && autoRotate) {
      if (now > handledUntil.current) c.azimuthAngle += delta * rotateSpeed;
      state.invalidate();
    }
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
    // Still camera: each new image shifted by a fraction of a pixel and averaged with the previous ones.
    const key = cam.matrixWorld.elements.join(",") + "|" + cam.near + "|" + cam.far + "|" + cam.aspect + "|" + cam.zoom + "|" + cam.fov + "|" + state.size.width + "|" + state.size.height;
    const w = state.size.width * state.gl.getPixelRatio();
    const h = state.size.height * state.gl.getPixelRatio();
    const frames = progressiveFrames(sceneRef.current, light);
    let moving = false;
    if (key !== lastCamera.current || dirty.current) {
      moving = key !== lastCamera.current;
      lastCamera.current = key;
      dirty.current = false;
      accumulate.reset();
      if (accumulate.taa && moving) {
        const [jx, jy] = jitter(Math.floor(now / 16) % 16);
        cam.setViewOffset(w, h, jx, jy, w, h);
      } else cam.clearViewOffset();
      state.invalidate();
    } else if (accumulate.count < frames) {
      const [jx, jy] = jitter(accumulate.count);
      cam.setViewOffset(w, h, jx, jy, w, h);
      state.invalidate();
    } else if (cam.view?.enabled) cam.clearViewOffset();
    accumulate.moving = moving;
    drawSettings(state.gl, cam, c, w, h, moving, loaded);
    // The points followed: where they are on the screen, and (a few times a second) whether the jewel hides them.
    const points = anchors.current;
    if (points.length > 0 && onAnchors.current && loaded) {
      if (now - lastLook.current > (phone ? 320 : 180) || visible.current.length !== points.length) {
        lastLook.current = now;
        const world = points.map((p) => new Vector3(p[0], p[1], p[2]).applyMatrix4(loaded.root.matrixWorld).toArray() as [number, number, number]);
        const seen = lookAt(state.gl, state.scene, cam, world, loaded.sphere.radius, looker);
        visible.current.length = 0;
        visible.current.push(...seen);
      }
      const v = new Vector3();
      onAnchors.current(
        points.map((p, i) => {
          v.set(p[0], p[1], p[2]).applyMatrix4(loaded.root.matrixWorld).project(cam);
          const onScreen = v.z < 1 && Math.abs(v.x) <= 1.05 && Math.abs(v.y) <= 1.05;
          return { x: ((v.x + 1) / 2) * state.size.width, y: ((1 - v.y) / 2) * state.size.height, visible: onScreen && (visible.current[i] ?? true) };
        }),
      );
    }
  });

  /** Before each image: the lightings turned (and following the eye with "Fixed Env Direction"), the stones' bounces, the first look of the screen. */
  function drawSettings(gl: WebGLRenderer, cam: PerspectiveCamera, c: CameraControls | null, w: number, h: number, moving: boolean, loaded: Loaded | null) {
    const s = sceneRef.current;
    const turn = c && s.fixedEnv ? c.azimuthAngle : 0;
    const three = get().scene;
    three.environmentRotation.set(0, (s.envMetal.rotation * Math.PI) / 180 + lightRef.current + turn, 0);
    if (s.envBackground && three.background === three.environment) three.backgroundRotation.copy(three.environmentRotation);
    const max = phone ? PHONE_MAX_BOUNCES : 16;
    const ultra = s.render.quality === "ultra" ? 2 : 0;
    for (const m of gems.current) {
      const own = Math.min(max, m.userData.diamond.rayBounces + ultra);
      setGemLighting(m, s.envGem.rotation + (lightRef.current * 180) / Math.PI, turn, w, h, moving ? Math.min(own, light ? MOVING_BOUNCES.phone : MOVING_BOUNCES.computer) : own);
    }
    const p = s.post;
    const wantPrepass = screenEffects && prepass !== null && loaded !== null;
    BEVEL.bjOn.value = wantPrepass && p.bevel.enabled ? 1 : 0;
    if (wantPrepass) {
      prepass.render(gl, three, cam, w, h);
      BEVEL.bjPrepass.value = prepass.texture;
      BEVEL.bjResolution.value.set(w, h);
      reflection?.setCamera(cam);
    }
  }

  /* The visitor turning or zooming: the turning waits, a flight stops */
  useEffect(() => {
    const c = controls.current;
    if (!c) return undefined;
    const hold = () => {
      handledUntil.current = Number.POSITIVE_INFINITY;
      flight.current = null;
      playing.current = null;
    };
    const release = () => {
      handledUntil.current = performance.now() + 2500;
    };
    c.addEventListener("controlstart", hold);
    c.addEventListener("controlend", release);
    return () => {
      c.removeEventListener("controlstart", hold);
      c.removeEventListener("controlend", release);
    };
  }, [frame]);

  useEffect(() => () => accumulate.dispose(), [accumulate]);

  /* Pinching on a trackpad brings the camera closer, like the scroll wheel (see the first version of this file). */
  useEffect(() => {
    const { events, gl } = get();
    const holder = (events.connected as HTMLElement | undefined) ?? gl.domElement;
    const toControls = (deltaY: number, clientX: number, clientY: number) => holder.dispatchEvent(new WheelEvent("wheel", { deltaY, deltaMode: 0, clientX, clientY, cancelable: true }));
    let pinching = false;
    let lastScale = 1;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();
      if (pinching) return;
      const { deltaX, deltaY, deltaMode, clientX, clientY, screenX, screenY } = e;
      holder.dispatchEvent(new WheelEvent("wheel", { deltaX, deltaY, deltaMode, clientX, clientY, screenX, screenY, cancelable: true }));
    };
    type Gesture = Event & { scale: number; clientX: number; clientY: number };
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      pinching = true;
      lastScale = 1;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as Gesture;
      if (!(g.scale > 0)) return;
      const ratio = g.scale / lastScale;
      lastScale = g.scale;
      toControls(-243.7 * Math.log(ratio), g.clientX, g.clientY);
    };
    const onGestureEnd = (e: Event) => {
      e.preventDefault();
      pinching = false;
    };
    holder.addEventListener("wheel", onWheel, { capture: true, passive: false });
    if (navigator.maxTouchPoints === 0) {
      holder.addEventListener("gesturestart", onGestureStart, { passive: false });
      holder.addEventListener("gesturechange", onGestureChange, { passive: false });
      holder.addEventListener("gestureend", onGestureEnd, { passive: false });
    }
    return () => {
      holder.removeEventListener("wheel", onWheel, { capture: true });
      holder.removeEventListener("gesturestart", onGestureStart);
      holder.removeEventListener("gesturechange", onGestureChange);
      holder.removeEventListener("gestureend", onGestureEnd);
    };
  }, [get]);

  /* Double-click or double-tap: glide towards the detail under the finger; a click in the editor picks a layer */
  const onPick = props.onPick;
  useEffect(() => {
    const canvas = get().gl.domElement;
    const picker = makePicker();
    const pick = (clientX: number, clientY: number): Vector3 | null => {
      const { gl, scene: three, camera, invalidate } = get();
      const half = !gl.extensions.has("EXT_color_buffer_float");
      const rect = canvas.getBoundingClientRect();
      const cam = camera as PerspectiveCamera;
      const target = picker.target(half);
      const back = three.background;
      const override = three.overrideMaterial;
      three.background = null;
      three.overrideMaterial = picker.material;
      const hidden: Object3D[] = [];
      three.traverse((o) => {
        if (o.userData.noPick && o.visible) {
          o.visible = false;
          hidden.push(o);
        }
      });
      cam.setViewOffset(rect.width, rect.height, clientX - rect.left, clientY - rect.top, 1, 1);
      const before = gl.getRenderTarget();
      gl.setRenderTarget(target);
      gl.setClearColor(0x000000, 0);
      gl.clear();
      gl.render(three, cam);
      const pixel = new Float32Array(4);
      if (half) {
        const raw = new Uint16Array(4);
        gl.readRenderTargetPixels(target, 0, 0, 1, 1, raw);
        for (let i = 0; i < 4; i++) pixel[i] = halfToFloat(raw[i]!);
      } else gl.readRenderTargetPixels(target, 0, 0, 1, 1, pixel);
      gl.setRenderTarget(before);
      cam.clearViewOffset();
      three.background = back;
      three.overrideMaterial = override;
      for (const o of hidden) o.visible = true;
      invalidate();
      if (pixel[3]! <= 0.5) return null;
      // In the space of the model (its pose undone).
      const hit = new Vector3(pixel[0], pixel[1], pixel[2]);
      const root = model.current?.root;
      return root ? hit.applyMatrix4(new Matrix4().copy(root.matrixWorld).invert()) : hit;
    };
    pickRef.current = pick;
    const glide = (clientX: number, clientY: number) => {
      const c = controls.current;
      const local = pick(clientX, clientY);
      const root = model.current?.root;
      if (!c || !local) return;
      const hit = root ? local.clone().applyMatrix4(root.matrixWorld) : local;
      const from = c.getPosition(new Vector3());
      const distance = Math.max(MIN_DISTANCE * 1.5, from.distanceTo(hit) * 0.4);
      const to = hit.clone().add(from.sub(hit).normalize().multiplyScalar(distance));
      void c.setLookAt(to.x, to.y, to.z, hit.x, hit.y, hit.z, true);
    };
    const taps = { last: { time: 0, x: 0, y: 0 }, down: { x: 0, y: 0, time: 0 } };
    const onDouble = (e: MouseEvent) => glide(e.clientX, e.clientY);
    const onDown = (e: PointerEvent) => {
      taps.down = { x: e.clientX, y: e.clientY, time: performance.now() };
    };
    const onUp = (e: PointerEvent) => {
      const still = Math.hypot(e.clientX - taps.down.x, e.clientY - taps.down.y) <= 6 && performance.now() - taps.down.time < 400;
      // The editor: a click (not a drag) names the layer under it.
      if (onPick && still && e.button === 0) {
        const { gl, scene: three, camera } = get();
        const loaded = model.current;
        if (loaded) {
          const meshes = [...loaded.layers.values()].flat().filter((m) => m.visible);
          const hit = pickMesh(gl, three, camera as PerspectiveCamera, canvas, e.clientX, e.clientY, meshes);
          let layer: string | null = null;
          if (hit) for (const [name, list] of loaded.layers) if (list.includes(hit as Mesh)) layer = name;
          onPick(layer);
          get().invalidate();
        }
      }
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
      pickRef.current = null;
      picker.dispose();
    };
  }, [get, onPick]);

  /* What the buttons around the canvas, the editor and the exports can do */
  useEffect(() => {
    let exportState: { width: number; height: number; dpr: number; aspect: number; background: Color | Texture | null; pose: Pose | null; clearAlpha: number } | null = null;
    let turnStart: Pose | null = null;
    let path: { kind: PathKind; t: number } | null = null;
    let turnAspect = 0;
    const copyCanvas = document.createElement("canvas");
    /** The camera on the film's path: one turn (the whole jewel framed for the film's shape), or through the saved views. */
    const applyPath = () => {
      const c = controls.current;
      const loaded = model.current;
      if (!c || !path) return;
      const cam = get().camera as PerspectiveCamera;
      if (path.kind === "turn") {
        if (!turnStart || Math.abs(turnAspect - cam.aspect) > 1e-3) {
          turnAspect = cam.aspect;
          const from = exportState?.pose ?? currentPose();
          if (!from || !loaded) return;
          // As close as the whole jewel allows in the film's frame (a vertical film is narrow), from the same side.
          const half = (cam.fov * Math.PI) / 360;
          const fit = Math.min(half, Math.atan(Math.tan(half) * cam.aspect));
          const distance = (loaded.sphere.radius / Math.sin(fit)) * 1.08;
          const target = loaded.sphere.center;
          const dir = new Vector3(...from.position).sub(new Vector3(...from.target)).normalize();
          const position = target.clone().addScaledVector(dir, distance);
          turnStart = { position: position.toArray() as Vec3, target: target.toArray() as Vec3, fov: from.fov };
        }
        applyPose(c, cam, turnAt(turnStart, path.t));
      } else if (viewsRef.current && viewsRef.current.list.length > 0) {
        const once = { ...viewsRef.current, loop: false };
        const p = poseAt(once, path.t * pathDuration(once));
        if (p) applyPose(c, cam, p);
      }
    };
    const currentPose = (): Pose | null => {
      const c = controls.current;
      if (!c) return null;
      const p = c.getPosition(new Vector3());
      const t = c.getTarget(new Vector3());
      return { position: [p.x, p.y, p.z], target: [t.x, t.y, t.z], fov: (get().camera as PerspectiveCamera).fov };
    };
    const render: RenderApi = {
      async renderStill({ width, height, transparent = false, samples = 16 }) {
        const { gl, camera, scene: three, size } = get();
        const cam = camera as PerspectiveCamera;
        const c = composer.current;
        if (!exportState) {
          exportState = { width: size.width, height: size.height, dpr: gl.getPixelRatio(), aspect: cam.aspect, background: three.background as Color | Texture | null, pose: currentPose(), clearAlpha: gl.getClearAlpha() };
        }
        exporting.current = true;
        const W = Math.min(3840, Math.max(16, Math.round(width)));
        const H = Math.min(3840, Math.max(16, Math.round(height)));
        gl.setPixelRatio(1);
        gl.setSize(W, H, false);
        c?.setSize(W, H);
        cam.aspect = W / H;
        cam.updateProjectionMatrix();
        three.background = transparent ? null : exportState.background;
        gl.setClearAlpha(transparent ? 0 : 1);
        // A film's path, placed again for the film's own shape.
        applyPath();
        controls.current?.update(0);
        cam.updateMatrixWorld(true);
        accumulate.reset();
        accumulate.moving = false;
        const n = Math.max(1, Math.min(256, Math.round(samples)));
        for (let i = 0; i < n; i++) {
          const [jx, jy] = jitter(i);
          if (n > 1) cam.setViewOffset(W, H, jx, jy, W, H);
          drawSettings(gl, cam, controls.current, W, H, false, model.current);
          if (c) c.render(0.016);
          else gl.render(three, cam);
        }
        cam.clearViewOffset();
        // A 2D copy, kept after this call (the WebGL canvas is cleared once shown).
        copyCanvas.width = W;
        copyCanvas.height = H;
        const ctx = copyCanvas.getContext("2d")!;
        ctx.clearRect(0, 0, W, H);
        ctx.drawImage(gl.domElement, 0, 0, W, H);
        return copyCanvas;
      },
      setPathTime(kind: PathKind, t: number) {
        path = { kind, t };
        applyPath();
      },
      viewsDuration: () => (viewsRef.current ? pathDuration({ ...viewsRef.current, loop: false }) : 0),
      setView(index) {
        const c = controls.current;
        const v = viewsRef.current?.list[index];
        if (c && v) applyPose(c, get().camera as PerspectiveCamera, v);
      },
      views: () => viewsRef.current?.list ?? [],
      setMetal(metal) {
        for (const [layer, material] of metals.current) {
          const setting = settings.layers[layer];
          setMetalLook(material, metal ?? choices.metals[layer] ?? setting?.metal ?? "rose-gold", setting?.finish ?? { kind: "polished" });
        }
        accumulate.reset();
      },
      restore() {
        const { gl, camera, scene: three } = get();
        const cam = camera as PerspectiveCamera;
        turnStart = null;
        path = null;
        if (!exportState) return;
        gl.setPixelRatio(exportState.dpr);
        gl.setSize(exportState.width, exportState.height, false);
        composer.current?.setSize(exportState.width, exportState.height);
        cam.aspect = exportState.aspect;
        cam.updateProjectionMatrix();
        three.background = exportState.background;
        gl.setClearAlpha(exportState.clearAlpha);
        if (exportState.pose && controls.current) applyPose(controls.current, cam, exportState.pose);
        exportState = null;
        exporting.current = false;
        render.setMetal(null);
        markDirty();
      },
    };
    const handles: StageHandles = {
      render,
      jewel: () => model.current?.root ?? null,
      frame: (): JewelFrame | null => {
        const loaded = model.current;
        if (!loaded) return null;
        const size = loaded.box.getSize(new Vector3());
        return { center: loaded.sphere.center.toArray() as [number, number, number], radius: loaded.sphere.radius, minY: loaded.box.min.y, size: size.toArray() as [number, number, number] };
      },
      exportGlb: () => {
        const root = model.current?.root;
        return root ? exportGlb(root) : Promise.reject(new Error("no model"));
      },
    };
    const stageApi: StageApi = {
      handles,
      view(kind) {
        const c = controls.current;
        const loaded = model.current;
        if (!c || !loaded) return;
        flight.current = null;
        playing.current = null;
        const camera = get().camera as PerspectiveCamera;
        if (kind === "reset") return startView(c, loaded.box, camera, savedView.current, true, { scale: sceneRef.current.camera.autoScale, center: sceneRef.current.camera.autoCenter });
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
      pick(clientX, clientY) {
        const hit = pickRef.current?.(clientX, clientY);
        return hit ? [hit.x, hit.y, hit.z] : null;
      },
      capture() {
        const { gl, scene: three, camera } = get();
        if (composer.current) composer.current.render();
        else gl.render(three, camera);
        try {
          return gl.domElement.toDataURL("image/png");
        } catch {
          return null;
        }
      },
      goTo(pose, seconds = 1.2, ease = "easeInOutSine", interpolation = "spherical") {
        const c = controls.current;
        const from = currentPose();
        playing.current = null;
        if (!c || !from) return;
        if (seconds <= 0) {
          flight.current = null;
          applyPose(c, get().camera as PerspectiveCamera, pose);
          markDirty();
          return;
        }
        flight.current = { from, to: pose, start: performance.now(), seconds, ease, interpolation };
        get().invalidate();
      },
      playViews(on) {
        flight.current = null;
        playing.current = on ? { start: performance.now() } : null;
        get().invalidate();
      },
      seek(t) {
        const c = controls.current;
        const v = viewsRef.current;
        if (!c || !v || v.list.length < 2) return;
        const once = { ...v, loop: false, pause: 0 };
        const p = poseAt(once, Math.min(1, Math.max(0, t)) * pathDuration(once));
        if (p) applyPose(c, get().camera as PerspectiveCamera, p);
        get().invalidate();
      },
      fit() {
        const c = controls.current;
        const loaded = model.current;
        if (!c || !loaded) return;
        fitView(c, loaded.box, get().camera as PerspectiveCamera, c.azimuthAngle, c.polarAngle, true);
      },
      zoomBy(factor) {
        const c = controls.current;
        if (!c) return;
        void c.dollyTo(Math.min(c.maxDistance, Math.max(c.minDistance, c.distance * factor)), true);
      },
      stablePose(kind) {
        const root = model.current?.root;
        return root ? stablePose(root, kind) : [0, 0, 0];
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
            const pos = mesh.geometry.getAttribute("position");
            const middle = model.current?.sphere.center ?? new Vector3();
            const q = new Vector3();
            let far = -1;
            for (let i = 0; i < pos.count; i++) {
              q.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
              const d = q.distanceTo(middle);
              if (d > far) {
                far = d;
                p.copy(q);
              }
            }
            return p.toArray();
          }
          return p.applyMatrix4(mesh.matrixWorld).toArray();
        },
        project: (p: number[]) => {
          const { camera, size } = get();
          const v = new Vector3(p[0], p[1], p[2]).project(camera);
          return [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height];
        },
        target: () => controls.current?.getTarget(new Vector3()).toArray() ?? null,
        zoom: () => (get().camera as PerspectiveCamera).zoom,
        center: () => model.current?.sphere.center.toArray() ?? null,
        refractingStones: () => gems.current.length,
        gemModes: () => gems.current.map((g) => g.userData.mode),
        mirrorCopies: () => mirrorCopies.current,
        progressive: () => accumulate.count,
        lowEnd: () => lowEnd,
      };
    }
    return () => {
      onApi(null);
      if (debug) delete w.__berete3d;
    };
    // The handles read the latest settings through refs; only the stage itself makes them again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onApi, get, markDirty]);



  const radius = frame?.radius ?? 0.05;
  const cx = frame?.cx ?? 0;
  const cy = frame?.cy ?? 0;
  const cz = frame?.cz ?? 0;
  const look3 = BACKGROUND_LOOKS[background];
  const selectedMeshes = useMemo(() => (props.selected && model.current ? (model.current.layers.get(props.selected) ?? []) : []), [props.selected, frame]); // eslint-disable-line react-hooks/exhaustive-deps
  const bloomRef = useRef<unknown>(null);
  const bloomPatch = useRef<ReturnType<typeof patchBloom> | null>(null);
  useEffect(() => {
    if (!bloomRef.current) {
      bloomPatch.current = null;
      return;
    }
    bloomPatch.current = patchBloom(bloomRef.current, prepass);
    bloomPatch.current.set(post.bloom.power, screenEffects);
    markDirty();
  }, [post.bloom.enabled, post.bloom.power, screenEffects, prepass, markDirty]);
  const ground = scene.stand ? merged(scene.ground, { preset: scene.ground.preset === "reflective" ? "contact" : scene.ground.preset }) : scene.ground;
  return (
    <>
      <CameraControls ref={controls} makeDefault dollyToCursor smoothTime={0.25} draggingSmoothTime={0.08} dollySpeed={0.8} />
      {frame ? <Lights lights={scene.lights} frame={frame} /> : null}
      {frame && look3.surface && !scene.backdrop && !scene.envBackground && !scene.stand ? <SurfaceUnder key={background + frame.key} surface={look3.surface} frame={frame} onReady={markDirty} /> : null}
      {stand ? <primitive object={stand.group} /> : null}
      {frame && (background !== "black" || scene.ground.preset !== "contact") ? <Ground key={background + frame.key + ground.preset + (scene.stand ?? "")} ground={ground} frame={frameAfterPose(frame, model.current, stand?.group ?? null)} light={look3.light} onReady={markDirty} /> : null}
      {/* No multisampling: the progressive rendering smooths the edges once the camera stops, for much less. */}
      <EffectComposer ref={composer} multisampling={0} frameBufferType={HalfFloatType}>
        {!light && post.ao.enabled ? <N8AO halfRes screenSpaceRadius aoRadius={post.ao.radius} distanceFalloff={0.6} intensity={post.ao.intensity} quality="medium" /> : <></>}
        {screenEffects && post.ssr.enabled && reflection ? <primitive object={reflection} /> : <></>}
        <primitive object={accumulate} />
        {!light && post.dof.enabled ? <DepthOfField focusDistance={0} focalLength={Math.max(0.001, radius * 0.5)} bokehScale={post.dof.maxBlur * 6} height={720} /> : <></>}
        {!light && post.bloom.enabled ? (
          <Bloom
            ref={bloomRef as never}
            mipmapBlur
            luminanceThreshold={post.bloom.threshold}
            luminanceSmoothing={post.bloom.softThreshold}
            intensity={post.bloom.intensity}
            radius={post.bloom.radius}
            levels={Math.max(1, Math.min(8, Math.round(post.bloom.iterations)))}
            blendFunction={post.bloom.debug ? BlendFunction.SET : BlendFunction.ADD}
          />
        ) : (
          <></>
        )}
        <ToneMapping mode={TONE[post.tonemap.mode]} />
        {post.tonemap.saturation !== 1 ? <HueSaturation saturation={Math.max(-1, Math.min(1, post.tonemap.saturation - 1))} /> : <></>}
        {post.tonemap.contrast !== 1 ? <BrightnessContrast contrast={Math.max(-1, Math.min(1, (post.tonemap.contrast - 1) * 2))} /> : <></>}
        {post.chromatic.enabled ? <ChromaticAberration offset={new Vector2(post.chromatic.offset, post.chromatic.offset)} radialModulation={false} modulationOffset={0} /> : <></>}
        {post.vignette.enabled ? <Vignette offset={post.vignette.offset} darkness={post.vignette.darkness} /> : <></>}
        {post.grain.enabled ? <Noise opacity={post.grain.intensity} premultiply /> : <></>}
        {selectedMeshes.length > 0 ? <Outline selection={selectedMeshes} visibleEdgeColor={0xe8b4a0} hiddenEdgeColor={0x9c5b4f} edgeStrength={4} blur xRay={false} /> : <></>}
      </EffectComposer>
      {/* Lights the client turns in the first ambiance kept (spot of "Projecteur"). */}
      {frame && scene.envGem.id === "gem-spot" ? <spotLight position={[cx + Math.sin(lightAngle) * radius * 3, cy + radius * 4, cz + Math.cos(lightAngle) * radius * 3]} intensity={300 * radius * radius} angle={0.45} penumbra={0.6} decay={2} color="#fff6ec" /> : null}
    </>
  );
}

/** The frame of the jewel as it stands now (after its pose or its stand). */
function frameAfterPose(frame: Frame, loaded: Loaded | null, stand: Object3D | null): Frame {
  if (!loaded) return frame;
  if (stand) {
    // On a stand: the ground at the foot of the stand, as wide as it.
    const box = new Box3().setFromObject(stand).union(loaded.box);
    return { ...frameOf(box, box.getBoundingSphere(new Sphere())), key: frame.key };
  }
  const f = frameOf(loaded.box, loaded.sphere);
  return { ...f, key: frame.key };
}

function frameOf(box: Box3, sphere: Sphere): Frame {
  return {
    key: Date.now(),
    cx: sphere.center.x,
    cy: sphere.center.y,
    cz: sphere.center.z,
    radius: sphere.radius,
    minY: box.min.y,
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
  };
}

/** Images averaged once still: the scene's choice (phones: a third), more in "ultra". */
function progressiveFrames(scene: SceneSettings, phone: boolean): number {
  const base = Math.max(1, Math.min(256, Math.round(scene.render.progressive)));
  if (scene.render.quality === "ultra") return Math.min(256, base * 2);
  return phone ? Math.max(8, Math.round(base / 3)) : base;
}

function applyPose(c: CameraControls, cam: PerspectiveCamera, p: Pose): void {
  void c.setLookAt(p.position[0], p.position[1], p.position[2], p.target[0], p.target[1], p.target[2], false);
  if (p.fov !== undefined && Math.abs(cam.fov - p.fov) > 0.01) {
    cam.fov = p.fov;
    cam.updateProjectionMatrix();
  }
  c.update(0);
}

const gradients = new Map<string, Texture>();
/** A radial gradient behind the jewel (lighter in the middle), made once per pair of colours. */
function gradientOf(inner: string, outer: string): Texture {
  const key = inner + outer;
  const found = gradients.get(key);
  if (found) return found;
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(512, 460, 0, 512, 512, 760);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);
  const made = new CanvasTexture(canvas);
  made.colorSpace = SRGBColorSpace;
  gradients.set(key, made);
  return made;
}

/** The settings of a layer's stones: its own, the old rendering if chosen, and the configurator's choice of the library. */
function paramsOf(layer: LayerSetting | undefined, look: DiamondLook, chosen: string | undefined): DiamondParams {
  const own = diamondOf(layer, look);
  const lib = chosen ? materialById(chosen) : layer?.material ? materialById(layer.material) : null;
  return lib && "gem" in lib && lib.gem ? merged(own, lib.gem) : own;
}

/** Texture coordinates for a finish drawn by a texture (brushed, hammered, aged, pearls): the jewellers' files have none. */
function withUv(mesh: Mesh): void {
  const geometry = mesh.geometry as BufferGeometry;
  if (geometry.getAttribute("uv")) return;
  geometry.computeBoundingBox();
  const c = geometry.boundingBox!.getCenter(new Vector3());
  projectUv(geometry, { mode: "box", center: [c.x, c.y, c.z] });
}

type Looks = {
  settings: ModelSettings["layers"];
  choices: Choices;
  highlight: string | null;
  phone: boolean;
  simpleStones: boolean;
  look: DiamondLook;
  gemEnv: Texture;
  ownEnv: (id: string) => Texture | null;
  renderer: WebGLRenderer;
  sceneTex: Texture | null;
};

/** Gives each mesh the material of its layer: metal (with its finish and bevel), stones (traced or fast), enamel, a material of the library. */
function applyMaterials(loaded: Loaded, o: Looks): { made: Material[]; gems: GemMaterial[]; metals: Map<string, MeshPhysicalMaterial>; cubes: [BufferGeometry, number][] } {
  const made: Material[] = [];
  const gems: GemMaterial[] = [];
  const cubes: [BufferGeometry, number][] = [];
  const metals = new Map<string, MeshPhysicalMaterial>();
  for (const [name, meshes] of loaded.layers) {
    const setting: LayerSetting = o.settings[name] ?? { role: "metal", metal: "rose-gold" };
    const shown = o.highlight === null || o.highlight === name;
    const chosen = o.choices.materials?.[name];
    const libId = chosen ?? setting.material;
    const lib = libId ? materialById(libId) : null;
    const chosenMetal = metalOfId(libId);
    const isGem = setting.role === "diamond" || setting.role === "stone" || Boolean(lib && "gem" in lib && lib.gem);
    for (const mesh of meshes) {
      mesh.visible = setting.role !== "hide" || o.highlight === name;
      mesh.renderOrder = isGem ? 2 : 0;
      mesh.userData.layer = name;
      if (!shown) {
        mesh.material = ghostMaterial;
        mesh.userData.mirror = 0;
        continue;
      }
      if (isGem) {
        const params = paramsOf(setting, o.look, chosen);
        mesh.userData.mirror = 0;
        mesh.userData.bloom = setting.bloom ?? params.bloom;
        if (o.simpleStones) {
          const material = lightStoneMaterial(params.color, o.gemEnv);
          made.push(material);
          mesh.material = material;
          continue;
        }
        const geometry = mesh.geometry as BufferGeometry;
        const isInstanced = (mesh as unknown as InstancedMesh).isInstancedMesh === true;
        const mode = modeFor(mesh, params);
        let cube;
        if (mode === "fast") {
          const res = cubeResolution(isInstanced ? (mesh as unknown as InstancedMesh).count : 1);
          cube = stoneCube(o.renderer, geometry, res);
          cubes.push([geometry, res]);
        }
        const material = gemMaterial({
          geometry,
          mode,
          env: (params.env ? o.ownEnv(params.env) : null) ?? o.gemEnv,
          params,
          orient: orientOf(geometry, isInstanced, mesh.matrixWorld),
          cube,
          maxBounces: o.phone ? PHONE_MAX_BOUNCES : 16,
          sceneTex: o.sceneTex,
        });
        material.userData.layer = name;
        gems.push(material);
        made.push(material);
        mesh.material = material;
      } else if (lib && "make" in lib && lib.make && !chosenMetal) {
        withUv(mesh);
        const material = lib.make();
        made.push(material);
        mesh.material = material;
        mesh.userData.mirror = 0.3;
        mesh.userData.bloom = setting.bloom ?? false;
      } else if (setting.role === "enamel") {
        const material = withBevel(enamelMaterial(o.choices.colors[name] ?? setting.color ?? "#1c1c1c") as unknown as MeshStandardMaterial, setting.bevel ?? null);
        made.push(material);
        mesh.material = material;
        mesh.userData.mirror = 0.2;
        mesh.userData.bloom = setting.bloom ?? false;
      } else {
        const metal = chosenMetal?.metal ?? o.choices.metals[name] ?? setting.metal ?? "rose-gold";
        const finish = chosenMetal?.finish ?? setting.finish ?? { kind: "polished" as const };
        if (finish.kind !== "polished" && finish.kind !== "satin") withUv(mesh);
        let material = metals.get(name);
        if (!material) {
          material = withBevel(makeMetal(metal, finish), setting.bevel ?? null);
          metals.set(name, material);
          made.push(material);
        }
        mesh.material = material;
        mesh.userData.mirror = MIRROR[finish.kind] ?? 1;
        mesh.userData.bloom = setting.bloom ?? false;
      }
    }
  }
  return { made, gems, metals, cubes };
}
