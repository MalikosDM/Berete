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
import { SCENE_PRESETS } from "@/pages/admin/editor3d/presets";

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

export default function Lab3D() {
  const q = useMemo(() => new URLSearchParams(window.location.search), []);
  const [url, setUrl] = useState<string | null>(q.get("model"));
  const [ready, setReady] = useState(false);
  const jewel = q.get("jewel") ?? "ring";
  useEffect(() => {
    if (q.get("model")) return;
    const group = new Group();
    group.add(jewel === "sphere" ? testSphere() : testRing());
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
    const json = q.get("settings");
    return json ? merged(base, JSON.parse(json)) : base;
  }, [q]);

  const scene: SceneSettings = useMemo(() => {
    let s = sceneOf(settings);
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
  }, [q, settings]);

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
  const background = preset ? preset.background : settings.background;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0a0a0a" }} data-lab-ready={ready || undefined}>
      {url ? (
        <Canvas frameloop="demand" dpr={Number(q.get("dpr") ?? 1)} camera={{ fov: scene.camera.fov, near: 0.001, far: 100, position: [0, 0.1, 0.4] }} gl={{ antialias: false, alpha: true, preserveDrawingBuffer: true }}>
          <Stage
            url={url}
            bytes={0}
            phone={q.has("phone")}
            simpleStones={false}
            settings={settings}
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
