/*
 * The 3D editor of the admin (26/11/2026), arranged as jewellers' tools are: on the left, one click with a picture
 * (lightings of the metal and of the stones, background, ambiances, stand, ground, pose, export, series, advanced,
 * try-on); in the middle, the jewel and its toolbar; on the right, the tabs of every setting. In simple French; every
 * setting applies at once, « Enregistrer » and « Annuler » are at the foot of the page.
 */
import { lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Box, Download, Gem, Hand, Layers, Mountain, Move3d, Palette, SlidersHorizontal, Sparkles, Sun } from "lucide-react";
import { BACKGROUNDS, sceneOf, tryOnOf, viewerOf, viewsOf, type LayerSetting, type ModelSettings, type PublicModel } from "@/data/models";
import { GEM_ENVS, GROUNDS, merged, METAL_ENVS, POSES, STANDS, type SceneSettings, type TryOnSettings, type ViewerOptions, type ViewsSettings } from "@/data/scene3d";
import { hdriName } from "@/viewer/hdri";
import { swatchCss } from "@/viewer/backgrounds";
import type { StageApi } from "@/viewer/Stage";
import EditorCanvas from "./EditorCanvas";
import { Range, Tile } from "./controls";
import { TABS, type EditorCtx, type LayerInfo, type TabId } from "./context";
import { BACKGROUND_NAMES_FR, GROUND_NAMES, POSE_NAMES, SCENE_PRESETS, STAND_NAMES_FR, thumb } from "./presets";
import { CamerasTab, ConfiguratorTab, EffectsTab, ExportTab, PartsTab, RenderTab, SceneTab, ViewTab } from "./tabs";

const TryOnEditor = lazy(() => import("@/viewer/tryon/TryOnEditor"));

type Drawer = "metal" | "gem" | "background" | "ambiance" | "stand" | "ground" | "pose" | "advanced" | "tryon" | null;

const LEFT: { id: Exclude<Drawer, null> | "export" | "series"; name: string; icon: ReactNode }[] = [
  { id: "metal", name: "Éclairage du métal", icon: <Sun className="size-5" aria-hidden="true" /> },
  { id: "gem", name: "Éclairage des pierres", icon: <Gem className="size-5" aria-hidden="true" /> },
  { id: "background", name: "Fond", icon: <Palette className="size-5" aria-hidden="true" /> },
  { id: "ambiance", name: "Ambiances", icon: <Sparkles className="size-5" aria-hidden="true" /> },
  { id: "stand", name: "Socle", icon: <Box className="size-5" aria-hidden="true" /> },
  { id: "ground", name: "Sol", icon: <Mountain className="size-5" aria-hidden="true" /> },
  { id: "pose", name: "Pose", icon: <Move3d className="size-5" aria-hidden="true" /> },
  { id: "export", name: "Exporter", icon: <Download className="size-5" aria-hidden="true" /> },
  { id: "series", name: "Rendu en série", icon: <Layers className="size-5" aria-hidden="true" /> },
  { id: "advanced", name: "Réglages avancés", icon: <SlidersHorizontal className="size-5" aria-hidden="true" /> },
  { id: "tryon", name: "Essayage", icon: <Hand className="size-5" aria-hidden="true" /> },
];

type Props = {
  model: PublicModel;
  layers: LayerInfo[];
  settings: ModelSettings;
  token: string;
  onChange: (next: ModelSettings) => void;
  onApi?: (api: StageApi | null) => void;
};

export default function Editor3D({ model, layers, settings, token, onChange, onApi }: Props) {
  const [api, setApi] = useState<StageApi | null>(null);
  const [tab, setTab] = useState<TabId>("parts");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const scene = useMemo(() => sceneOf(settings), [settings]);
  const views = useMemo(() => viewsOf(settings), [settings]);
  const viewer = useMemo(() => viewerOf(settings), [settings]);
  const tryOn = useMemo(() => tryOnOf(settings), [settings]);
  const takeApi = useCallback(
    (a: StageApi | null) => {
      setApi(a);
      onApi?.(a);
    },
    [onApi],
  );
  const onLayers = useCallback(() => undefined, []);
  const onPick = useCallback((layer: string | null) => {
    setSelected(layer);
    if (layer) setTab("parts");
  }, []);

  const c: EditorCtx = {
    model,
    layers,
    settings,
    scene,
    views,
    viewer,
    tryOn,
    api,
    selected,
    highlight,
    token,
    set: onChange,
    setScene: (next: SceneSettings) => onChange({ ...settings, scene: next }),
    setViews: (next: ViewsSettings) => onChange({ ...settings, views: next }),
    setViewer: (next: ViewerOptions) => onChange({ ...settings, viewer: next }),
    setTryOn: (next: TryOnSettings) => onChange({ ...settings, tryOn: next }),
    setLayer: (name: string, patch: Partial<LayerSetting>) => {
      const before = settings.layers[name] ?? { role: (layers.find((l) => l.name === name)?.guess as LayerSetting["role"]) ?? "metal" };
      const next: LayerSetting = { ...before, ...patch };
      for (const k of Object.keys(patch) as (keyof LayerSetting)[]) if (patch[k] === undefined) delete next[k];
      onChange({ ...settings, layers: { ...settings.layers, [name]: next } });
    },
    select: setSelected,
    setHighlight,
    showTab: (t: TabId) => {
      setTab(t);
      setDrawer(null);
    },
  };

  const openLeft = (id: (typeof LEFT)[number]["id"]) => {
    if (id === "export" || id === "series") {
      setTab("export");
      setDrawer(null);
      if (id === "series") window.setTimeout(() => document.querySelector("[data-export-series], [data-series]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
      return;
    }
    setDrawer(id);
  };

  return (
    // As wide as the screen (the admin's column is narrower): the jewel needs the room, as in jewellers' tools.
    <div className="relative left-1/2 grid w-[calc(100vw-3rem)] max-w-[1800px] -translate-x-1/2 grid-cols-[minmax(0,1fr)] gap-px border border-white/15 bg-white/10 lg:h-[min(88svh,960px)] lg:grid-cols-[15rem_minmax(0,1fr)_23rem] xl:grid-cols-[17rem_minmax(0,1fr)_26rem]" data-editor-3d>
      {/* Left: one click, with a picture */}
      <aside className="order-2 min-h-0 overflow-y-auto bg-ink p-3 lg:order-none" aria-label="Choix rapides" data-editor-left>
        {drawer === null ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
            {LEFT.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => openLeft(item.id)} className="flex min-h-12 w-full items-center gap-3 border border-white/15 px-3 py-2 text-start text-base text-white hover:border-rose-light hover:text-rose-light" data-left={item.id}>
                  <span className="text-rose-light">{item.icon}</span>
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid gap-3" data-drawer={drawer}>
            <button type="button" onClick={() => setDrawer(null)} className="flex min-h-12 items-center gap-2 text-base text-bone hover:text-rose-light">
              <ArrowLeft className="size-4" aria-hidden="true" /> {LEFT.find((l) => l.id === drawer)?.name}
            </button>
            <DrawerContent drawer={drawer} c={c} />
          </div>
        )}
      </aside>

      {/* Middle: the jewel */}
      <div className="order-1 min-h-[60svh] bg-ink lg:order-none lg:min-h-0" data-editor-middle>
        <EditorCanvas model={model} settings={settings} scene={scene} views={views} selected={selected} highlight={highlight} onPick={onPick} onApi={takeApi} onLayers={onLayers} />
      </div>

      {/* Right: the tabs */}
      <section className="order-3 flex min-h-0 flex-col bg-ink lg:order-none" aria-label="Réglages" data-editor-right>
        <div role="tablist" aria-label="Réglages" className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/15 p-1" data-editor-tabs>
          {TABS.map(([id, name]) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={"min-h-12 shrink-0 px-3 text-base " + (tab === id ? "bg-white font-medium text-ink" : "text-bone hover:text-rose-light")} data-tab={id}>
              {name}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3" data-lenis-prevent>
          {tab === "view" ? <ViewTab c={c} /> : null}
          {tab === "parts" ? <PartsTab c={c} /> : null}
          {tab === "scene" ? <SceneTab c={c} /> : null}
          {tab === "render" ? <RenderTab c={c} /> : null}
          {tab === "effects" ? <EffectsTab c={c} /> : null}
          {tab === "cameras" ? <CamerasTab c={c} /> : null}
          {tab === "configurator" ? <ConfiguratorTab c={c} /> : null}
          {tab === "export" ? <ExportTab c={c} /> : null}
        </div>
      </section>
    </div>
  );
}

function TryOnDialog({ c }: { c: EditorCtx }) {
  const [jewel] = useState(() => c.api?.handles.jewel() ?? null);
  return (
    <>
      <p className="text-sm text-mist">Réglez la bague sur le doigt (le cylindre) : le client la verra ainsi dans l'essayage.</p>
      <div role="dialog" aria-modal="true" aria-label="Essayage" className="fixed inset-0 z-[120] overflow-y-auto bg-black/80 p-4" data-tryon-editor>
        <div className="mx-auto grid max-w-5xl gap-4 border border-white/20 bg-ink p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-lg text-white">Essayage de la bague</p>
            <button type="button" className="inline-flex min-h-12 items-center border border-white/30 px-5 text-base text-white hover:border-rose-light hover:text-rose-light" onClick={() => c.showTab("parts")} data-close-tryon>
              Fermer
            </button>
          </div>
          <Suspense fallback={<p className="text-base text-bone">Chargement…</p>}>
            <TryOnEditor jewel={jewel} settings={c.tryOn} onChange={c.setTryOn} />
          </Suspense>
        </div>
      </div>
    </>
  );
}

function DrawerContent({ drawer, c }: { drawer: Exclude<Drawer, null>; c: EditorCtx }) {
  const { scene } = c;
  const grid = "grid grid-cols-2 gap-2";
  if (drawer === "metal" || drawer === "gem") {
    const ids = drawer === "metal" ? METAL_ENVS : GEM_ENVS;
    const current = drawer === "metal" ? scene.envMetal : scene.envGem;
    const set = (patch: Partial<typeof current>) => c.setScene({ ...scene, [drawer === "metal" ? "envMetal" : "envGem"]: { ...current, ...patch } });
    return (
      <>
        <p className="text-sm text-mist">{drawer === "metal" ? "La lumière du métal, de la céramique et des perles (Environment)." : "La lumière des pierres : plus vive et plus contrastée (Gem Environment)."}</p>
        <div className={grid}>
          {ids.map((id) => (
            <Tile key={id} name={hdriName(id)} image={thumb("hdri", id)} active={current.id === id} data={id} onClick={() => set({ id })} />
          ))}
        </div>
        <Range name="Rotation" value={current.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => set({ rotation })} />
        <Range name="Intensité" value={current.intensity} min={0} max={3} step={0.01} onChange={(intensity) => set({ intensity })} />
      </>
    );
  }
  if (drawer === "background") {
    return (
      <div className={grid}>
        {BACKGROUNDS.map((b) => (
          <Tile key={b} name={BACKGROUND_NAMES_FR[b]} swatch={swatchCss(b)} active={!scene.backdrop && !scene.envBackground && c.settings.background === b} data={b} onClick={() => c.set({ ...c.settings, background: b, scene: { ...scene, backdrop: null, envBackground: false } })} />
        ))}
        <Tile name="Couleur unie" swatch="#0a0a0a" active={scene.backdrop?.kind === "color"} onClick={() => (c.setScene({ ...scene, envBackground: false, backdrop: { kind: "color", color: "#0a0a0a" } }), c.showTab("scene"))} />
        <Tile name="Dégradé" swatch="radial-gradient(circle, #3a3532, #0a0a0a)" active={scene.backdrop?.kind === "gradient"} onClick={() => (c.setScene({ ...scene, envBackground: false, backdrop: { kind: "gradient", inner: "#3a3532", outer: "#0a0a0a" } }), c.showTab("scene"))} />
        <Tile name="Éclairage du métal" image={thumb("hdri", scene.envMetal.id)} active={scene.envBackground} onClick={() => c.setScene({ ...scene, envBackground: true, backdrop: null })} />
      </div>
    );
  }
  if (drawer === "ambiance") {
    return (
      <div className="grid gap-2">
        {SCENE_PRESETS.map((p) => (
          <Tile
            key={p.id}
            name={p.name}
            hint={p.description}
            image={thumb("preset", p.id)}
            active={false}
            data={p.id}
            onClick={() => c.set({ ...c.settings, background: p.background, scene: merged(scene, { ...p.scene, backdrop: null, envBackground: false }) })}
          />
        ))}
      </div>
    );
  }
  if (drawer === "stand") {
    return (
      <div className={grid}>
        <Tile name="Aucun socle" swatch="#0a0a0a" active={scene.stand === null} onClick={() => c.setScene({ ...scene, stand: null })} />
        {STANDS.map((s) => (
          <Tile key={s} name={STAND_NAMES_FR[s]} image={thumb("stand", s)} active={scene.stand === s} data={s} onClick={() => c.setScene({ ...scene, stand: s })} />
        ))}
      </div>
    );
  }
  if (drawer === "ground") {
    return (
      <>
        <div className={grid}>
          {GROUNDS.map((g) => (
            <Tile key={g} name={GROUND_NAMES[g]} image={thumb("ground", g)} active={scene.ground.preset === g} data={g} onClick={() => c.setScene({ ...scene, ground: { ...scene.ground, preset: g } })} />
          ))}
        </div>
        <button type="button" className="min-h-12 text-start text-base text-bone underline hover:text-rose-light" onClick={() => c.showTab("scene")}>
          Tous les réglages du sol
        </button>
      </>
    );
  }
  if (drawer === "pose") {
    return (
      <>
        <p className="text-sm text-mist">« Calculer » cherche la position où le bijou repose naturellement (Compute Stable Pose).</p>
        <div className="grid gap-2">
          {POSES.map((k) => (
            <button
              key={k}
              type="button"
              data-pose={k}
              onClick={() => c.setScene({ ...scene, stand: null, pose: { kind: k, rotation: c.api?.stablePose(k) ?? [0, 0, 0] } })}
              className={"min-h-12 border px-3 text-start text-base " + (scene.pose.kind === k ? "border-rose-light text-white" : "border-white/15 text-bone hover:border-white/40")}
            >
              {POSE_NAMES[k]}
            </button>
          ))}
        </div>
      </>
    );
  }
  if (drawer === "advanced") {
    const p = scene.post;
    return (
      <div className="grid gap-3">
        <p className="text-base text-white">Éclairage du métal</p>
        <Range name="Rotation" value={scene.envMetal.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => c.setScene({ ...scene, envMetal: { ...scene.envMetal, rotation } })} />
        <Range name="Intensité" value={scene.envMetal.intensity} min={0} max={3} step={0.01} onChange={(intensity) => c.setScene({ ...scene, envMetal: { ...scene.envMetal, intensity } })} />
        <p className="text-base text-white">Éclairage des pierres</p>
        <Range name="Rotation" value={scene.envGem.rotation} min={-180} max={180} step={1} unit="°" onChange={(rotation) => c.setScene({ ...scene, envGem: { ...scene.envGem, rotation } })} />
        <Range name="Intensité" value={scene.envGem.intensity} min={0} max={3} step={0.01} onChange={(intensity) => c.setScene({ ...scene, envGem: { ...scene.envGem, intensity } })} />
        <p className="text-base text-white">Biseau à l'écran (SSBevel)</p>
        <Range name="Rayon" value={p.bevel.radius} min={0} max={8} step={0.1} onChange={(radius) => c.setScene({ ...scene, post: { ...p, bevel: { ...p.bevel, radius, enabled: radius > 0 } } })} />
        <Range name="Intensité" value={p.bevel.intensity} min={0} max={1} step={0.01} onChange={(intensity) => c.setScene({ ...scene, post: { ...p, bevel: { ...p.bevel, intensity } } })} />
      </div>
    );
  }
  // Try-on: the ring on a cylinder standing for the finger, in a larger window.
  return <TryOnDialog c={c} />;
}

