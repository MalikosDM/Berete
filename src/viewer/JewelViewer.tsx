/*
 * The 3D viewer of a jewel: the canvas, its buttons (views, reset, turning,
 * full screen, image) and the panel of choices, beside it on a computer and
 * under it on a phone: the metal of each metal layer, the colour of coloured
 * stones, the background, the lighting and its direction, then the buttons
 * the page gives (WhatsApp).
 * Loaded only when shown (three.js is heavy): see ./index.tsx.
 */
import type { Object3D } from "three";
import { lazy, Suspense, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Box, Camera, Expand, Hand, Maximize, Minimize, Minus, Pause, Play, Plus, RotateCcw, Rotate3d, Share2, SlidersHorizontal, Sun } from "lucide-react";
import { AMBIANCES, BACKGROUNDS, backgroundOf, METALS, sceneOf, tryOnOf, viewerOf, viewsOf, type Ambiance, type Background, type MetalId, type ModelView, type PublicModel } from "@/data/models";
import { AMBIANCE_SCENES, type SceneSettings } from "@/data/scene3d";
import { TRY_ON_WORDS, type TryOnLang } from "./words/tryon";
import { canQuickLook, canSceneViewer, openQuickLook, sceneViewerUrl } from "./ar";
import type { Messages } from "@/i18n";
import Logo from "@/components/Logo";
import { METAL_LOOKS, STONE_COLORS } from "./materials";
import { BACKGROUND_LOOKS, backgroundCss, swatchCss } from "./backgrounds";
import Stage, { type Choices, type StageApi } from "./Stage";
import { CANVAS_SIZE, PANEL, VIEWER_GRID } from "./layout";
import { exitFullscreen, fullscreenElement } from "@/lib/fullscreen";

export type ViewerHandle = {
  getView(): ModelView | null;
  capture(): string | null;
  /** The model is loaded and drawn (the admin then makes its still image, when it has none). */
  isReady(): boolean;
  /** The camera at t ∈ [0, 1] of the path through the saved views (the page's scrolling). */
  seek(t: number): void;
};

const TryOn = lazy(() => import("./tryon/TryOn"));

/** The language of the page, for the try-on words. */
function pageLang(): TryOnLang {
  const lang = (typeof document === "undefined" ? "en" : document.documentElement.lang || "en").slice(0, 2) as TryOnLang;
  return lang in TRY_ON_WORDS ? lang : "en";
}

/** The metal chosen for each metal layer, for the WhatsApp message. */
export type Selection = { layer: string; label: string; metal: MetalId }[];

type Props = {
  model: PublicModel;
  words: Messages["viewer"];
  /** Admin: show one layer, dim the others. */
  highlight?: string | null;
  /** Admin: the settings being edited (else those of the model). */
  settings?: PublicModel["settings"];
  onSelection?: (selection: Selection) => void;
  /** Buttons at the foot of the panel of choices (WhatsApp). */
  actions?: ReactNode;
  className?: string;
  ref?: Ref<ViewerHandle>;
};

/** A phone or a small tablet: the light version, a lighter stone material, no glow, at most 1.5 pixels per point. */
function isPhone(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return coarse && Math.min(window.screen.width, window.screen.height) < 900;
}

function hasWebgl(): boolean {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/** One group of choices in the panel: its name, the current choice beside it, the choices under. */
function Group({ title, value, layer, children }: { title: string; value?: string; layer?: string; children: ReactNode }) {
  return (
    <div className="border-t border-white/10 px-5 py-5 first:border-t-0 sm:px-6" data-metal-layer={layer}>
      <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-medium uppercase tracking-[0.2em] text-rose-light">{title}</span>
        {value ? <span className="text-base text-bone">{value}</span> : null}
      </p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function swatchStyle(color: string): React.CSSProperties {
  return { backgroundImage: "radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, " + color + " 34%, " + color + " 62%, rgba(0,0,0,0.55) 100%)" };
}

export default function JewelViewer({ model, words, highlight = null, settings: edited, onSelection, actions, className = "", ref }: Props) {
  const settings = edited ?? model.settings;
  const phone = useMemo(() => isPhone(), []);
  const webgl = useMemo(() => hasWebgl(), []);
  const maxDpr = phone ? 1.5 : 2;
  // Starts at 1.5 pixels per point at most, then goes up (or down) with the measured fluidity.
  const [dpr, setDpr] = useState(() => Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 1.5));
  const [simpleStones, setSimpleStones] = useState(false);
  const readyAt = useRef(0);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [ambiance, setAmbiance] = useState<Ambiance>(settings.ambiance);
  const [background, setBackground] = useState<Background>(() => backgroundOf(settings.background));
  const [lightAngle, setLightAngle] = useState(0);
  // The visitor's own choice of turning; until then, the jeweller's (viewer options).
  const [rotateChoice, setRotateChoice] = useState<boolean | null>(null);
  const [full, setFull] = useState(false);
  const [choices, setChoices] = useState<Choices>({ metals: {}, colors: {}, materials: {} });
  const [present, setPresent] = useState<string[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const api = useRef<StageApi | null>(null);
  const panelTitle = useId();
  // The hint over the jewel fades at the first touch of it.
  const [touched, setTouched] = useState(false);
  // On a computer the panel scrolls by itself when its choices are higher than the jewel: the wheel then scrolls it, not the page.
  const panelScroll = useRef<HTMLDivElement>(null);
  const panelContent = useRef<HTMLDivElement>(null);
  const [panelScrolls, setPanelScrolls] = useState(false);
  useEffect(() => {
    const box = panelScroll.current;
    const content = panelContent.current;
    if (!box || !content || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setPanelScrolls(box.scrollHeight > box.clientHeight + 1));
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  // The jeweller's lighting and background, when changed in the admin.
  const [given, setGiven] = useState({ ambiance: settings.ambiance, background: settings.background });
  if (given.ambiance !== settings.ambiance || given.background !== settings.background) {
    setGiven({ ambiance: settings.ambiance, background: settings.background });
    setAmbiance(settings.ambiance);
    setBackground(backgroundOf(settings.background));
  }

  useImperativeHandle(ref, () => ({ getView: () => api.current?.getView() ?? null, capture: () => api.current?.capture() ?? null, isReady: () => readyAt.current > 0 && api.current !== null, seek: (t: number) => api.current?.seek(t) }), []);

  // The scene the jeweller set (lightings, effects, ground...); the client's choice of lighting stands for one of the three first ones.
  const options = useMemo(() => viewerOf(settings), [settings]);
  const views = useMemo(() => viewsOf(settings), [settings]);
  const tryOn = useMemo(() => tryOnOf(settings), [settings]);
  const scene: SceneSettings = useMemo(() => {
    const saved = sceneOf(settings);
    if (ambiance === settings.ambiance) return { ...saved, render: { ...saved.render, quality: options.quality === "auto" ? saved.render.quality : options.quality } };
    const pick = AMBIANCE_SCENES[ambiance] ?? AMBIANCE_SCENES.studio!;
    return { ...saved, envMetal: { ...saved.envMetal, id: pick.envMetal, intensity: pick.metalIntensity }, envGem: { ...saved.envGem, id: pick.envGem } };
  }, [settings, ambiance, options.quality]);
  // Closest and farthest, by the shape of the frame (tall or wide).
  const [portrait, setPortrait] = useState(false);
  const frameBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frameBox.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => setPortrait(el.clientHeight > el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const distance = (portrait ? options.distance.portrait : options.distance.landscape) ?? null;
  const [touring, setTouring] = useState(false);
  const [trying, setTrying] = useState<Object3D | null>(null);
  const [copied, setCopied] = useState(false);
  const lang = useMemo(() => pageLang(), []);
  const tryWords = TRY_ON_WORDS[lang];
  const autoRotate = rotateChoice ?? options.autoRotate;
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: model.name, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Closed by the visitor.
    }
  };
  const quickLook = useMemo(() => canQuickLook(), []);
  const sceneViewer = useMemo(() => canSceneViewer(), []);
  const showAr = options.ar && (quickLook || sceneViewer);
  const viewInSpace = () => {
    const jewel = api.current?.handles.jewel();
    if (!jewel) return;
    if (quickLook) void openQuickLook(jewel, model.name);
    else if (sceneViewer) window.location.href = sceneViewerUrl(new URL(model.files.full, window.location.href).href, model.name, window.location.href);
  };

  const offered = settings.metals.length > 0 ? METALS.filter((m) => settings.metals.includes(m)) : [...METALS];
  const metalLayers = present.filter((name) => (settings.layers[name]?.role ?? "metal") === "metal");
  const stoneLayers = present.filter((name) => settings.layers[name]?.role === "stone");
  const labelOf = (name: string, i: number) => settings.layers[name]?.label || (metalLayers.length > 1 ? words.metal + " " + (i + 1) : words.metal);
  const metalOf = useCallback((name: string): MetalId => choices.metals[name] ?? settings.layers[name]?.metal ?? "rose-gold", [choices.metals, settings.layers]);

  // The metals chosen, for the WhatsApp message of the page.
  const selectionKey = metalLayers.map((n) => n + ":" + metalOf(n)).join("|");
  useEffect(() => {
    onSelection?.(metalLayers.map((name, i) => ({ layer: name, label: labelOf(name, i), metal: metalOf(name) })));
    // Only when the choice itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const onProgress = useCallback((p: number) => setProgress(p), []);
  const onReady = useCallback((names: string[]) => {
    readyAt.current = performance.now();
    setPresent(names);
    setStatus("ready");
  }, []);
  const onError = useCallback(() => setStatus("error"), []);
  const onApi = useCallback((a: StageApi | null) => {
    api.current = a;
  }, []);

  // Full screen: the browser's own when it has one (not on iPhone), else the viewer covers the page.
  const toggleFull = async () => {
    const el = wrap.current;
    if (!el) return;
    if (fullscreenElement()) {
      exitFullscreen();
      return;
    }
    if (full) {
      setFull(false);
      return;
    }
    const webkit = el as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (document.fullscreenEnabled && el.requestFullscreen) {
      await el.requestFullscreen().catch(() => setFull(true));
    } else if (webkit.webkitRequestFullscreen) webkit.webkitRequestFullscreen();
    else setFull(true);
  };
  const [native, setNative] = useState(false);
  useEffect(() => {
    const onChange = () => setNative(fullscreenElement() === wrap.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);
  const isFull = full || native;
  useEffect(() => {
    if (!full) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

  const capture = () => {
    const data = api.current?.capture();
    if (!data) return;
    const a = document.createElement("a");
    a.href = data;
    a.download = "berete-" + (model.name || "jewel").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".png";
    a.click();
  };

  const dark = !BACKGROUND_LOOKS[background].light;
  const iconBtn = "inline-flex size-12 items-center justify-center rounded-full border backdrop-blur-sm transition-colors " + (dark ? "border-white/25 bg-ink/60 text-white hover:border-rose-light hover:text-rose-light" : "border-ink/20 bg-white/70 text-ink hover:border-rose-deep hover:text-rose-deep");
  const viewBtn = "inline-flex min-h-12 items-center justify-center rounded-full border px-4 text-base backdrop-blur-sm transition-colors " + (dark ? "border-white/25 bg-ink/60 text-white hover:border-rose-light hover:text-rose-light" : "border-ink/20 bg-white/70 text-ink hover:border-rose-deep hover:text-rose-deep");
  const ring = (on: boolean) => "relative size-12 shrink-0 rounded-full p-[3px] transition-transform hover:scale-105 " + (on ? "bg-rose-gold" : "bg-white/15");
  const hint = phone ? words.hintTouch : words.hint;

  return (
    <div ref={wrap} data-viewer className={VIEWER_GRID + " " + (isFull ? "fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-ink lg:overflow-hidden" : "lg:gap-4 " + className)}>
      {/* The wheel over the jewel brings it closer and never scrolls the page as well (data-lenis-prevent: the smooth
          scrolling of the site leaves it alone). */}
      <div
        ref={frameBox}
        data-lenis-prevent
        onPointerDownCapture={() => setTouched(true)}
        onWheelCapture={() => setTouched(true)}
        className={"relative w-full overflow-hidden " + (isFull ? "min-h-[60svh] flex-1 lg:h-full lg:min-h-0" : CANVAS_SIZE)}
        style={{ background: backgroundCss(background) }}
      >
        {webgl && status !== "error" ? (
          <Canvas
            key={attempt}
            frameloop="demand"
            dpr={dpr}
            camera={{ fov: 30, near: 0.001, far: 100, position: [0, 0.1, 0.4] }}
            gl={{ antialias: phone, powerPreference: "high-performance", alpha: false }}
            onCreated={({ gl }) => {
              gl.transmissionResolutionScale = phone ? 0.6 : 1;
            }}
            className="touch-none"
            aria-label={words.canvasLabel(model.name)}
          >
            {/* Too slow: fewer pixels first; still very slow at one pixel per point, simpler stones. */}
            <PerformanceMonitor
              ms={300}
              iterations={6}
              onDecline={({ fps }) => {
                // Simpler stones only on a phone that stays really slow (under 15 images per second) at one
                // pixel per point, well after loading (the first images, while the stones are prepared, are slow everywhere).
                if (phone && dpr <= 1 && fps < 15 && readyAt.current > 0 && performance.now() - readyAt.current > 5000) setSimpleStones(true);
                setDpr((d) => Math.max(1, Math.round((d - 0.25) * 4) / 4));
              }}
              onIncline={() => setDpr((d) => Math.min(maxDpr, Math.round((d + 0.25) * 4) / 4))}
            />
            <Stage
              url={phone ? model.files.light : model.files.full}
              bytes={phone ? model.bytes.light : model.bytes.full}
              phone={phone}
              simpleStones={simpleStones}
              settings={settings}
              scene={scene}
              views={views}
              choices={choices}
              lightAngle={lightAngle}
              distance={distance}
              zoom={options.zoom}
              background={background}
              autoRotate={autoRotate}
              highlight={highlight}
              onApi={onApi}
              onProgress={onProgress}
              onReady={onReady}
              onError={onError}
            />
          </Canvas>
        ) : null}

        {/* Loading: the saved image of the jewel and the percentage */}
        {status !== "ready" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-ink" role="status" aria-live="polite">
            {model.poster ? <img src={model.poster} alt="" className="absolute inset-0 h-full w-full object-contain opacity-60 blur-[2px]" /> : null}
            <span className="relative flex flex-col items-center gap-4 px-6 text-center">
              {!model.poster ? <Logo variant="mark" position="center" className="h-12 w-24 opacity-60" /> : null}
              {!webgl ? (
                <span className="text-base text-bone">{words.noWebgl}</span>
              ) : status === "error" ? (
                <>
                  <span className="text-base text-bone">{words.failed}</span>
                  <button type="button" onClick={() => (setStatus("loading"), setProgress(0), setAttempt((a) => a + 1))} className="inline-flex min-h-12 items-center rounded-full border border-white/40 px-6 text-base text-white hover:border-rose-light hover:text-rose-light">
                    {words.retry}
                  </button>
                </>
              ) : (
                <>
                  <span className="text-base text-bone" data-viewer-progress={progress}>{progress < 99 ? words.loading(progress) : words.preparing}</span>
                  <span className="block h-px w-48 bg-white/15">
                    <span className="block h-px bg-rose-gold transition-[width] duration-300" style={{ width: Math.max(progress, 3) + "%" }} />
                  </span>
                </>
              )}
            </span>
          </div>
        ) : null}

        {status === "ready" ? (
          <>
            {/* At the top: the views on the left, try it on and see it at home on the right (never over one another) */}
            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2 sm:inset-x-4 sm:top-4">
            <div className="pointer-events-auto flex min-w-0 flex-wrap gap-2" data-viewer-views>
              {options.views && views.list.length > 0 ? (
                <>
                  {views.list.map((v) => (
                    <button key={v.id} type="button" className={viewBtn} data-saved-view={v.id} onClick={() => (setTouring(false), api.current?.goTo(v, views.duration, views.ease, views.interpolation))}>
                      {v.name}
                    </button>
                  ))}
                  {views.list.length > 1 ? (
                    <button type="button" className={viewBtn} aria-pressed={touring} data-views-tour onClick={() => setTouring((t) => (api.current?.playViews(!t), !t))}>
                      {touring ? <Pause className="me-2 size-4" aria-hidden="true" /> : <Play className="me-2 size-4" aria-hidden="true" />} {touring ? words.stopViews : words.playViews}
                    </button>
                  ) : null}
                </>
              ) : (
                <>
                  <button type="button" className={viewBtn} onClick={() => api.current?.view("front")}>{words.views.front}</button>
                  <button type="button" className={viewBtn} onClick={() => api.current?.view("side")}>{words.views.side}</button>
                  <button type="button" className={viewBtn} onClick={() => api.current?.view("top")}>{words.views.top}</button>
                </>
              )}
            </div>
            {(options.tryOn && tryOn.enabled) || showAr ? (
              <div className="pointer-events-auto flex shrink-0 flex-col items-end gap-2">
                {options.tryOn && tryOn.enabled ? (
                  <button type="button" className={viewBtn} onClick={() => setTrying(api.current?.handles.jewel() ?? null)} data-try-on>
                    <Hand className="me-2 size-4" aria-hidden="true" /> {tryWords.tryOn}
                  </button>
                ) : null}
                {showAr ? (
                  <button type="button" className={viewBtn} onClick={viewInSpace} data-view-ar>
                    <Box className="me-2 size-4" aria-hidden="true" /> {tryWords.viewInSpace}
                  </button>
                ) : null}
              </div>
            ) : null}
            </div>
            {/* At the foot: the configurator's chips, then the buttons (never over one another) */}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-2 sm:inset-x-4 sm:bottom-4">
            {/* The configurator: the jeweller's choices of material, in chips at the foot of the jewel */}
            {options.configurator && (settings.configurators ?? []).length > 0 ? (
              <div className="pointer-events-auto grid justify-items-center gap-2" data-configurator>
                {(settings.configurators ?? []).map((cfg) => {
                  const current = cfg.options.find((o) => cfg.layers.every((l) => choices.materials?.[l] === o.material))?.material ?? null;
                  return (
                    <div key={cfg.id} role="radiogroup" aria-label={cfg.label} className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-white/15 bg-ink/70 p-1 backdrop-blur-sm">
                      <span className="px-3 text-sm uppercase tracking-[0.18em] text-rose-light">{cfg.label}</span>
                      {cfg.options.map((o) => (
                        <button
                          key={o.material}
                          type="button"
                          role="radio"
                          aria-checked={current === o.material}
                          data-config-option={o.material}
                          onClick={() =>
                            setChoices((c) => {
                              // A metal of the library also shows in the panel's swatches (and the swatches undo it).
                              const metal = o.material.startsWith("metal/") ? (o.material.split("/")[1] as MetalId) : null;
                              return {
                                ...c,
                                materials: { ...c.materials, ...Object.fromEntries(cfg.layers.map((l) => [l, o.material])) },
                                metals: metal ? { ...c.metals, ...Object.fromEntries(cfg.layers.map((l) => [l, metal])) } : c.metals,
                              };
                            })
                          }
                          className={"min-h-12 rounded-full px-4 text-base transition-colors " + (current === o.material ? "bg-white font-medium text-ink" : "text-bone hover:text-rose-light")}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : null}
            {/* Actions */}
            <div className="flex items-end justify-between gap-3">
              <p className={"pointer-events-none hidden max-w-[50%] text-base transition-opacity duration-700 lg:block " + (touched ? "opacity-0 " : "") + (dark ? "text-mist" : "text-ink/70")}>{hint}</p>
              <div className="pointer-events-auto ms-auto flex flex-wrap justify-end gap-2">
              {options.zoom && options.zoomButtons && !phone ? (
                <>
                  <button type="button" className={iconBtn} onClick={() => api.current?.zoomBy(0.75)} aria-label={words.zoomIn} title={words.zoomIn} data-zoom-in>
                    <Plus className="size-5" aria-hidden="true" />
                  </button>
                  <button type="button" className={iconBtn} onClick={() => api.current?.zoomBy(1.33)} aria-label={words.zoomOut} title={words.zoomOut} data-zoom-out>
                    <Minus className="size-5" aria-hidden="true" />
                  </button>
                </>
              ) : null}
              <button type="button" className={iconBtn} onClick={() => api.current?.fit()} aria-label={words.fit} title={words.fit} data-fit>
                <Expand className="size-5" aria-hidden="true" />
              </button>
              <button type="button" className={iconBtn} onClick={() => api.current?.view("reset")} aria-label={words.reset} title={words.reset}>
                <RotateCcw className="size-5" aria-hidden="true" />
              </button>
              <button type="button" className={iconBtn + (autoRotate ? " !border-rose-light !text-rose-light" : "")} onClick={() => setRotateChoice(!autoRotate)} aria-pressed={autoRotate} aria-label={autoRotate ? words.stopRotate : words.autoRotate} title={autoRotate ? words.stopRotate : words.autoRotate}>
                {autoRotate ? <Pause className="size-5" aria-hidden="true" /> : <Rotate3d className="size-5" aria-hidden="true" />}
              </button>
              {!phone ? (
                <button type="button" className={iconBtn} onClick={capture} aria-label={words.capture} title={words.capture}>
                  <Camera className="size-5" aria-hidden="true" />
                </button>
              ) : null}
              {options.share ? (
                <button type="button" className={iconBtn} onClick={() => void share()} aria-label={copied ? words.copied : words.share} title={copied ? words.copied : words.share} data-share>
                  <Share2 className="size-5" aria-hidden="true" />
                </button>
              ) : null}
              {options.fullscreen ? (
                <button type="button" className={iconBtn} onClick={() => void toggleFull()} aria-label={isFull ? words.exitFullscreen : words.fullscreen} title={isFull ? words.exitFullscreen : words.fullscreen}>
                  {isFull ? <Minimize className="size-5" aria-hidden="true" /> : <Maximize className="size-5" aria-hidden="true" />}
                </button>
              ) : null}
            </div>
              </div>
            </div>
            {copied ? <p role="status" className="absolute start-1/2 top-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-base text-ink">{words.copied}</p> : null}
            {/* "Drag to turn", at the first sight of the jewel */}
            {options.prompt && !touched ? (
              <div className="viewer-prompt pointer-events-none absolute inset-0 flex items-center justify-center" data-viewer-prompt aria-hidden="true">
                <span className="flex items-center gap-3 rounded-full border border-white/20 bg-ink/60 px-5 py-3 text-base text-white backdrop-blur-sm">
                  <Hand className="viewer-prompt-hand size-5 text-rose-light" aria-hidden="true" /> {words.dragToTurn}
                </span>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {trying ? (
        <Suspense fallback={null}>
          <TryOn jewel={trying} settings={tryOn} words={tryWords} onClose={() => setTrying(null)} />
        </Suspense>
      ) : null}
      {/* The panel of choices: beside the jewel (computer), under it (phone) */}
      <div role="group" aria-labelledby={panelTitle} data-viewer-panel className={"relative " + PANEL + (isFull ? " border-x-0 border-b-0 lg:border-y-0 lg:border-e-0 lg:border-s" : " border-t-0 lg:border-t")}>
        <div ref={panelScroll} data-lenis-prevent={panelScrolls ? "" : undefined} className="lg:absolute lg:inset-0 lg:overflow-y-auto lg:overscroll-contain">
          <div ref={panelContent} className="flex min-h-full flex-col">
            <p id={panelTitle} className="eyebrow flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <SlidersHorizontal className="size-4" aria-hidden="true" /> {words.customize}
            </p>

            {status === "ready" ? (
              <div>
                {offered.length > 1
                  ? metalLayers.map((name, i) => {
                      const current = metalOf(name);
                      return (
                        <Group key={name} layer={name} title={labelOf(name, i)} value={words.metals[current]}>
                          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={labelOf(name, i)}>
                            {offered.map((metal) => (
                              <button
                                key={metal}
                                type="button"
                                role="radio"
                                aria-checked={current === metal}
                                aria-label={words.metals[metal]}
                                data-metal={metal}
                                onClick={() =>
                                  setChoices((c) => {
                                    const materials = { ...c.materials };
                                    delete materials[name];
                                    return { ...c, metals: { ...c.metals, [name]: metal }, materials };
                                  })
                                }
                                className={"group " + ring(current === metal)}
                              >
                                <span className="block h-full w-full rounded-full border border-ink/40" style={swatchStyle(METAL_LOOKS[metal].swatch)} />
                                <span className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 text-base text-ink opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                                  {words.metals[metal]}
                                </span>
                              </button>
                            ))}
                          </div>
                        </Group>
                      );
                    })
                  : null}
                {stoneLayers.map((name) => {
                  const current = choices.colors[name] ?? settings.layers[name]?.color ?? "#9b111e";
                  const colors = [...new Set([settings.layers[name]?.color ?? "#9b111e", ...STONE_COLORS])];
                  return (
                    <Group key={name} title={settings.layers[name]?.label || words.stoneColor}>
                      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={words.stoneColor}>
                        {colors.map((color) => (
                          <button key={color} type="button" role="radio" aria-checked={current === color} aria-label={color} onClick={() => setChoices((c) => ({ ...c, colors: { ...c.colors, [name]: color } }))} className={ring(current === color)}>
                            <span className="block h-full w-full rounded-full" style={swatchStyle(color)} />
                          </button>
                        ))}
                      </div>
                    </Group>
                  );
                })}
                <Group title={words.background} value={words.backgrounds[background]}>
                  <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={words.background}>
                    {BACKGROUNDS.map((b) => (
                      <button key={b} type="button" role="radio" aria-checked={background === b} aria-label={words.backgrounds[b]} title={words.backgrounds[b]} data-background={b} onClick={() => setBackground(b)} className={ring(background === b)}>
                        <span className="block h-full w-full rounded-full border border-white/10" style={{ background: swatchCss(b) }} />
                      </button>
                    ))}
                  </div>
                </Group>
                <Group title={words.ambiance}>
                  <div className="grid grid-cols-3 gap-1 rounded-full border border-white/15 p-1" role="radiogroup" aria-label={words.ambiance}>
                    {AMBIANCES.map((a) => (
                      <button key={a} type="button" role="radio" aria-checked={ambiance === a} data-ambiance={a} onClick={() => setAmbiance(a)} className={"min-h-12 min-w-0 rounded-full px-2 text-base transition-colors " + (ambiance === a ? "bg-white font-medium text-ink" : "text-bone hover:text-rose-light")}>
                        {words.ambiances[a]}
                      </button>
                    ))}
                  </div>
                  <label className="mt-5 block">
                    <span className="flex items-center gap-2 text-base text-bone">
                      <Sun className="size-4 text-rose-light" aria-hidden="true" /> {words.light}
                    </span>
                    <input type="range" min={-180} max={180} step={1} value={Math.round((lightAngle * 180) / Math.PI)} onChange={(e) => setLightAngle((Number(e.target.value) * Math.PI) / 180)} className="mt-1 block h-12 w-full cursor-pointer accent-[#e8b4a0]" />
                  </label>
                </Group>
                {/* How to move the jewel: over it on a computer (until it is touched), here on a phone. */}
                <ul className="grid gap-1 border-t border-white/10 px-5 py-5 text-base text-mist sm:px-6 lg:hidden">
                  {hint.split(" · ").map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="grid gap-8 px-5 py-6 sm:px-6" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="grid gap-4">
                    <span className="h-3 w-28 bg-white/10" />
                    <span className="flex gap-3">
                      {[0, 1, 2, 3, 4].map((j) => (
                        <span key={j} className="size-12 rounded-full bg-white/[0.06]" />
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* When the panel scrolls, the choices fade under the buttons: there are more above them. */}
            {actions ? (
              <div className={"relative mt-auto grid gap-3 border-t border-white/10 bg-ink-soft px-5 py-5 sm:px-6 lg:sticky lg:bottom-0" + (panelScrolls ? " lg:before:pointer-events-none lg:before:absolute lg:before:inset-x-0 lg:before:bottom-full lg:before:h-12 lg:before:bg-linear-to-t lg:before:from-ink-soft lg:before:to-transparent" : "")}>
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
