/*
 * The middle of the 3D editor (26/11/2026): the jewel in its scene, the gestures jewellers know (drag to turn, wheel or
 * pinch to zoom, shift + drag or two fingers to move), a click outlines a part in rose gold, and the toolbar: full
 * screen, back to the first view, frame the jewel, views in a loop, animation, turning, capture, .glb file.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Camera, Expand, Film, FileBox, Maximize, Minimize, Pause, Play, RotateCcw, Rotate3d } from "lucide-react";
import { backgroundOf, type ModelSettings, type PublicModel } from "@/data/models";
import type { SceneSettings, ViewsSettings } from "@/data/scene3d";
import Stage, { type StageApi } from "@/viewer/Stage";
import type { LayerAnalysis } from "@/viewer/auto";
import { backgroundCss } from "@/viewer/backgrounds";
import { download, fileSlug } from "@/viewer/export/exporter";
import { exitFullscreen, fullscreenElement } from "@/lib/fullscreen";

type Props = {
  model: PublicModel;
  settings: ModelSettings;
  scene: SceneSettings;
  views: ViewsSettings;
  selected: string | null;
  highlight: string | null;
  onPick: (layer: string | null) => void;
  onApi: (api: StageApi | null) => void;
  onLayers: (names: string[]) => void;
  /** What the engine read of each layer (the simple mode's lists). */
  onAnalysis?: (analysis: Record<string, LayerAnalysis>) => void;
  /** The import's guesses by layer (metal, diamond...). */
  guesses?: Record<string, string>;
  /** The turning, when the simple mode holds it. */
  autoRotate?: boolean;
  onAutoRotate?: (on: boolean) => void;
};

const NO_CHOICES = { metals: {}, colors: {}, materials: {} };

export default function EditorCanvas({ model, settings, scene, views, selected, highlight, onPick, onApi, onLayers, onAnalysis, guesses, ...turning }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const api = useRef<StageApi | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const [ownRotate, setOwnRotate] = useState(false);
  const autoRotate = turning.autoRotate ?? ownRotate;
  const setAutoRotate = (next: boolean | ((on: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(autoRotate) : next;
    if (turning.onAutoRotate) turning.onAutoRotate(value);
    else setOwnRotate(value);
  };
  const [looping, setLooping] = useState(false);
  const [full, setFull] = useState(false);
  const [note, setNote] = useState("");
  const background = backgroundOf(settings.background);

  const onReady = useCallback(
    (names: string[]) => {
      setStatus("ready");
      onLayers(names);
    },
    [onLayers],
  );
  const onError = useCallback(() => setStatus("error"), []);
  const onProgress = useCallback((p: number) => setProgress(p), []);
  const takeApi = useCallback(
    (a: StageApi | null) => {
      api.current = a;
      onApi(a);
    },
    [onApi],
  );

  useEffect(() => {
    const onChange = () => setFull(fullscreenElement() === wrap.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);
  const toggleFull = () => {
    const el = wrap.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    if (!el) return;
    if (fullscreenElement()) return exitFullscreen();
    if (el.requestFullscreen) void el.requestFullscreen().catch(() => undefined);
    else el.webkitRequestFullscreen?.();
  };
  const say = (text: string) => {
    setNote(text);
    window.setTimeout(() => setNote(""), 2500);
  };

  const capture = () => {
    const data = api.current?.capture();
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = fileSlug(model.name || "bijou") + ".png";
    a.click();
  };
  const glb = async () => {
    try {
      const blob = await api.current!.handles.exportGlb();
      download(blob, fileSlug(model.name || "bijou") + ".glb");
      say("Fichier .glb enregistré.");
    } catch {
      say("Le fichier .glb n'a pas pu être fait.");
    }
  };

  const tool = "inline-flex size-12 shrink-0 items-center justify-center border border-white/20 bg-ink/70 text-white backdrop-blur-sm hover:border-rose-light hover:text-rose-light disabled:opacity-40 aria-pressed:border-rose-light aria-pressed:text-rose-light";
  return (
    <div ref={wrap} className={"relative flex min-h-[60svh] flex-col bg-ink lg:min-h-0 " + (full ? "h-full" : "h-full")} data-editor-canvas>
      <div role="toolbar" aria-label="Outils de la vue" className="absolute start-2 top-2 z-10 flex flex-wrap gap-1.5" data-editor-toolbar>
        <button type="button" className={tool} onClick={toggleFull} aria-label={full ? "Quitter le plein écran" : "Plein écran"} title={full ? "Quitter le plein écran" : "Plein écran"} data-tool="fullscreen">
          {full ? <Minimize className="size-5" aria-hidden="true" /> : <Maximize className="size-5" aria-hidden="true" />}
        </button>
        <button type="button" className={tool} onClick={() => api.current?.view("reset")} aria-label="Revenir à la première vue" title="Revenir à la première vue" data-tool="reset">
          <RotateCcw className="size-5" aria-hidden="true" />
        </button>
        <button type="button" className={tool} onClick={() => api.current?.fit()} aria-label="Recadrer sur le bijou" title="Recadrer sur le bijou" data-tool="fit">
          <Expand className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={tool}
          aria-pressed={looping}
          disabled={views.list.length < 2}
          onClick={() => setLooping((on) => (api.current?.playViews(!on), !on))}
          aria-label={views.list.length < 2 ? "Vues en boucle (enregistrez au moins deux vues)" : looping ? "Arrêter les vues en boucle" : "Vues en boucle"}
          title={views.list.length < 2 ? "Enregistrez au moins deux vues de caméra" : "Vues en boucle"}
          data-tool="loop"
        >
          {looping ? <Pause className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
        </button>
        <button type="button" className={tool} disabled aria-label="Animation (ce fichier n'a pas d'animation)" title="Ce fichier n'a pas d'animation" data-tool="animation">
          <Film className="size-5" aria-hidden="true" />
        </button>
        <button type="button" className={tool} aria-pressed={autoRotate} onClick={() => setAutoRotate((a) => !a)} aria-label={autoRotate ? "Arrêter la rotation" : "Rotation automatique"} title="Rotation automatique" data-tool="rotate">
          <Rotate3d className="size-5" aria-hidden="true" />
        </button>
        <button type="button" className={tool} onClick={capture} aria-label="Capture de l'image (PNG)" title="Capture de l'image (PNG)" data-tool="capture">
          <Camera className="size-5" aria-hidden="true" />
        </button>
        <button type="button" className={tool} onClick={() => void glb()} aria-label="Exporter le fichier 3D (.glb)" title="Exporter le fichier 3D (.glb)" data-tool="glb">
          <FileBox className="size-5" aria-hidden="true" />
        </button>
      </div>
      {note ? <p role="status" className="absolute end-2 top-2 z-10 bg-white px-3 py-2 text-base text-ink">{note}</p> : null}
      <div
        className="relative min-h-0 flex-1"
        style={{ background: scene.post.tonemap.clipBackground ? "repeating-conic-gradient(#2a2626 0% 25%, #1a1717 0% 50%) 50% / 24px 24px" : backgroundCss(background) }}
        data-lenis-prevent
      >
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ fov: scene.camera.fov, near: 0.001, far: 100, position: [0, 0.1, 0.4] }}
          gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}
          className="touch-none"
          aria-label={model.name + " en 3D (éditeur)"}
        >
          <Stage
            url={model.files.full}
            bytes={model.bytes.full}
            phone={false}
            simpleStones={false}
            settings={settings}
            scene={scene}
            views={views}
            choices={NO_CHOICES}
            lightAngle={0}
            background={background}
            autoRotate={autoRotate}
            highlight={highlight}
            selected={selected}
            onPick={onPick}
            onApi={takeApi}
            onProgress={onProgress}
            onReady={onReady}
            onAnalysis={onAnalysis}
            guesses={guesses}
            onError={onError}
          />
        </Canvas>
        {status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-ink" role="status">
            <span className="text-base text-bone">{status === "error" ? "Le modèle n'a pas pu être chargé." : progress < 99 ? "Chargement du modèle · " + progress + " %" : "Préparation du modèle"}</span>
          </div>
        ) : null}
        <p className="pointer-events-none absolute bottom-2 start-2 hidden text-sm text-mist lg:block">Glisser : tourner · Molette : zoomer · Maj + glisser ou clic droit : déplacer · Clic : choisir une partie</p>
      </div>
    </div>
  );
}
