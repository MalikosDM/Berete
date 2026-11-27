/*
 * The 3D lab (26/11/2026), on the Mac only (never in the built site: its route exists in development only): the
 * procedural test ring, a sphere or a model of the admin drawn by the real stage, with any lighting, material, stand,
 * ground or scene of the editor given in the address. The scripts of .local/ make the editor's pictures with it
 * (lightings, materials, stands, ambiances) and the comparisons of the diamonds.
 *   /lab3d?jewel=ring|sphere&metalEnv=…&gemEnv=…&material=…&metal=rose-gold&bg=black&stand=…&ground=…&preset=…&w=…&h=…
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Group, type Object3D } from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { backgroundOf, type MetalId, type ModelSettings } from "@/data/models";
import { merged, type SceneSettings } from "@/data/scene3d";
import { sceneOf } from "@/data/models";
import Stage, { type StageApi } from "@/viewer/Stage";
import { testRing, testSphere } from "@/viewer/lab/testRing";
import { CUTS, cutGeometry } from "@/viewer/lab/cuts";
import { BufferAttribute, Mesh, MeshStandardMaterial } from "three";
import { SCENE_PRESETS, SIMPLE_AMBIANCES } from "@/pages/admin/editor3d/presets";
import { brilliantGeometry } from "@/viewer/lab/testRing";

function glbOf(root: Object3D): Promise<string> {
  return new Promise((resolve, reject) => {
    new GLTFExporter().parse(
      root,
      (out) => resolve(URL.createObjectURL(new Blob([out as ArrayBuffer], { type: "model/gltf-binary" }))),
      reject,
      { binary: true },
    );
  });
}

/**
 * The test sheet of the cuts: one stone of each of the thirteen cuts per row, one row per way of drawing them ("trace",
 * "fast"), 6 mm stones 9 mm apart, tables up; each stone its own layer, named "<mode>:<cut>".
 */
function cutsSheet(modes: string, quantize: boolean): Group {
  const sheet = new Group();
  const rows = modes.split(",");
  rows.forEach((mode, r) => {
    CUTS.forEach((cut, i) => {
      const geometry = cutGeometry(cut, 0.006);
      const mesh = new Mesh(geometry, new MeshStandardMaterial({ name: mode + ":" + cut }));
      // ?quantize=1: positions kept as whole numbers of 16 bits read as −1…1, as the light files of the site store them
      // (the large emerald cut of ZR0982 was black because of it, 27/11/2026).
      if (quantize) {
        const pos = geometry.getAttribute("position");
        let far = 0;
        for (let k = 0; k < pos.array.length; k++) far = Math.max(far, Math.abs(pos.array[k]!));
        const q = new Int16Array(pos.array.length);
        for (let k = 0; k < q.length; k++) q[k] = Math.round((pos.array[k]! / far) * 32767);
        geometry.setAttribute("position", new BufferAttribute(q, 3, true));
        mesh.scale.setScalar(far);
      }
      mesh.name = mode + ":" + cut;
      mesh.position.set((i - (CUTS.length - 1) / 2) * 0.009, 0, (r - (rows.length - 1) / 2) * 0.011);
      sheet.add(mesh);
    });
  });
  return sheet;
}

// ?gemDebug=1|2: the stones' measures instead of their light (read by src/viewer/gems.ts when it makes a material).
if (typeof window !== "undefined") {
  const debug = new URLSearchParams(window.location.search).get("gemDebug");
  if (debug) (window as unknown as { __gemDebug?: number }).__gemDebug = Number(debug);
}

export default function Lab3D() {
  const q = useMemo(() => new URLSearchParams(window.location.search), []);
  const [url, setUrl] = useState<string | null>(q.get("model"));
  const [ready, setReady] = useState(false);
  const jewel = q.get("jewel") ?? "ring";
  useEffect(() => {
    if (q.get("model")) return;
    const group = new Group();
    if (jewel === "cuts") group.add(cutsSheet(q.get("modes") ?? "trace,fast", q.get("quantize") === "1"));
    else if (jewel === "stone") {
      // One round brilliant of 6 mm, table up: the pictures of the stones' materials and lightings.
      const stone = new Mesh(brilliantGeometry(0.006), new MeshStandardMaterial({ name: "diamond" }));
      stone.name = "diamond";
      group.add(stone);
    }
    else group.add(jewel === "sphere" ? testSphere() : testRing());
    void glbOf(group).then(setUrl);
  }, [q, jewel]);

  const settings: ModelSettings = useMemo(() => {
    const material = q.get("material") ?? undefined;
    const metal = (q.get("metal") ?? "rose-gold") as MetalId;
    const base: ModelSettings = {
      layers: {
        metal: { role: "metal", metal },
        diamond: { role: "diamond" },
        pave: { role: "diamond" },
        sample: material ? { role: material.startsWith("gem/") ? "diamond" : material.startsWith("metal/") ? "metal" : "enamel", material } : { role: "metal", metal },
      },
      metals: [metal],
      view: null,
      ambiance: "studio",
      background: backgroundOf(q.get("bg") ?? "black"),
      diamonds: q.get("look") === "classic" ? "classic" : "realistic",
    };
    if (material?.startsWith("metal/")) {
      const [, m, kind] = material.split("/");
      base.layers.sample = { role: "metal", metal: m as MetalId, finish: { kind: (kind ?? "polished") as "polished" } };
    }
    if (jewel === "cuts") {
      for (const mode of (q.get("modes") ?? "trace,fast").split(",")) for (const cut of CUTS) base.layers[mode + ":" + cut] = { role: "diamond", diamond: { mode: mode as "trace" | "fast" } };
    }
    const json = q.get("settings");
    return json ? merged(base, JSON.parse(json)) : base;
  }, [q, jewel]);

  const simple = SIMPLE_AMBIANCES.find((a) => a.id === q.get("simple"));
  const settingsShown = useMemo(() => (simple ? simple.apply(settings) : settings), [simple, settings]);
  const scene: SceneSettings = useMemo(() => {
    let s = sceneOf(settingsShown);
    const preset = SCENE_PRESETS.find((p) => p.id === q.get("preset"));
    if (preset) s = merged(s, preset.scene);
    const over: Partial<SceneSettings> = {};
    if (q.get("metalEnv")) over.envMetal = { ...s.envMetal, id: q.get("metalEnv")! };
    if (q.get("gemEnv")) over.envGem = { ...s.envGem, id: q.get("gemEnv")! };
    if (q.get("stand")) over.stand = q.get("stand") as SceneSettings["stand"];
    if (q.get("ground")) over.ground = { ...s.ground, preset: q.get("ground") as SceneSettings["ground"]["preset"] };
    if (q.get("fixed")) over.fixedEnv = true;
    const json = q.get("scene");
    return merged(merged(s, over), json ? JSON.parse(json) : undefined);
  }, [q, settingsShown]);

  const onReady = useCallback(() => setReady(true), []);
  const noop = useCallback(() => undefined, []);
  const onApi = useCallback((api: StageApi | null) => {
    (window as unknown as { __lab?: StageApi | null }).__lab = api;
  }, []);
  const view = q.get("view");
  useEffect(() => {
    if (!ready) return;
    const api = (window as unknown as { __lab?: StageApi | null }).__lab;
    if (view === "front" || view === "side" || view === "top") window.setTimeout(() => api?.view(view), 50);
  }, [ready, view]);
  const preset = SCENE_PRESETS.find((p) => p.id === q.get("preset"));
  const background = preset ? preset.background : settingsShown.background;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a" }} data-lab-ready={ready || undefined}>
      {url ? (
        <Canvas frameloop="demand" dpr={Number(q.get("dpr") ?? 1)} camera={{ fov: scene.camera.fov, near: 0.001, far: 100, position: [0, 0.1, 0.4] }} gl={{ antialias: false, alpha: true, preserveDrawingBuffer: true }}>
          <Stage
            url={url}
            bytes={0}
            phone={q.has("phone")}
            simpleStones={false}
            settings={settingsShown}
            scene={scene}
            choices={{ metals: {}, colors: {}, materials: {} }}
            lightAngle={0}
            background={background}
            autoRotate={q.has("rotate")}
            highlight={null}
            onApi={onApi}
            onProgress={noop}
            onReady={onReady}
            onError={noop}
          />
        </Canvas>
      ) : null}
    </div>
  );
}
