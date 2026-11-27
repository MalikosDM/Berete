/*
 * The 3D viewer of a jewel: the canvas, its buttons (views, reset, turning,
 * full screen, image) and the panel of choices, beside it on a computer and
 * under it on a phone: the metal of each metal layer, the colour of coloured
 * stones, the background, the lighting and its direction, then the buttons
 * the page gives (WhatsApp).
 * Every word follows the language of the page (27/11/2026), the names of the configurator's chips too: made from their
 * material (./words/viewer.ts), the admin's French names kept for a French page. One control per part: a metal part
 * offered by the configurator (chips at the foot) has no swatches in the panel. While it loads: the still image of the
 * jewel and a thin bar, then the 3D arrives in a fade. `bare` (the embed code, src/pages/Embed3D.tsx): the jewel alone,
 * as large as its frame, without the panel (the metals then in chips at the foot); `transparent`, `logo`, `autoRotate`.
 * Loaded only when shown (three.js is heavy): see ./index.tsx.
 */
import type { Object3D } from "three";
import { lazy, Suspense, useCallback, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { Box, Camera, Expand, Hand, Maximize, Minimize, Minus, Pause, Play, Plus, RotateCcw, Rotate3d, Share2, SlidersHorizontal, Sun } from "lucide-react";
import { AMBIANCES, BACKGROUNDS, backgroundOf, METALS, sceneOf, tryOnOf, viewerOf, viewsOf, type Ambiance, type Background, type MetalId, type ModelView, type PublicModel } from "@/data/models";
import { AMBIANCE_SCENES, type SceneSettings } from "@/data/scene3d";
import { TRY_ON_WORDS } from "./words/tryon";
import { freeLabel, groupLabel, optionLabel, stoneColorName, VIEWER_WORDS, viewerLang, viewName } from "./words/viewer";
import { canQuickLook, canSceneViewer, canWebXrAr, openQuickLook, sceneViewerUrl } from "./ar";
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
  /** The jewel alone, as large as its frame, without the panel of choices (the embed code). */
  bare?: boolean;
  /** No background behind the jewel: the page under it shows through. */
  transparent?: boolean;
  /** The small logo of the house in a corner. */
  logo?: boolean;
  /** Turning by itself at first (else the jeweller's choice). */
  autoRotate?: boolean;
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

/** The library material a part shows (the client's chip, else the jeweller's): its metal when it is a metal ("metal/<metal>/<finish>"). */
function metalOfMaterial(id: string | undefined): MetalId | null {
  if (!id?.startsWith("metal/")) return null;
  const metal = id.split("/")[1] as MetalId;
  return (METALS as readonly string[]).includes(metal) ? metal : null;
}

/** How long the still image takes to give way to the 3D (ms). */
const FADE_MS = 700;

export default function JewelViewer({ model, words, highlight = null, settings: edited, onSelection, actions, className = "", bare = false, transparent = false, logo = false, autoRotate: rotateAtFirst, ref }: Props) {
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
  // The still image fades away once the 3D is drawn, then leaves.
  const [posterGone, setPosterGone] = useState(false);
  useEffect(() => {
    if (status !== "ready") return undefined;
    const timer = window.setTimeout(() => setPosterGone(true), FADE_MS + 100);
    return () => window.clearTimeout(timer);
  }, [status]);
  const [attempt, setAttempt] = useState(0);
  const [ambiance, setAmbiance] = useState<Ambiance>(settings.ambiance);
  const [background, setBackground] = useState<Background>(() => backgroundOf(settings.background));
  const [lightAngle, setLightAngle] = useState(0);
  // The visitor's own choice of turning; until then, the jeweller's (viewer options).
  const [rotateChoice, setRotateChoice] = useState<boolean | null>(rotateAtFirst ?? null);
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
    // Transparent: nothing drawn behind the jewel (its shadow stays; a mirror floor would hang in the air).
    const clear = (s: SceneSettings): SceneSettings =>
      transparent ? { ...s, post: { ...s.post, tonemap: { ...s.post.tonemap, clipBackground: true } }, ground: s.ground.preset === "reflective" ? { ...s.ground, preset: "contact" } : s.ground } : s;
    if (ambiance === settings.ambiance) return clear({ ...saved, render: { ...saved.render, quality: options.quality === "auto" ? saved.render.quality : options.quality } });
    const pick = AMBIANCE_SCENES[ambiance] ?? AMBIANCE_SCENES.studio!;
    return clear({ ...saved, envMetal: { ...saved.envMetal, id: pick.envMetal, intensity: pick.metalIntensity }, envGem: { ...saved.envGem, id: pick.envGem } });
  }, [settings, ambiance, options.quality, transparent]);
  // Closest and farthest, by the shape of the frame (tall or wide).
  const [portrait, setPortrait] = useState(false);
  // A narrow frame (a small embed, a narrow window): fewer buttons over the jewel (no + and −, no image).
  const [narrow, setNarrow] = useState(false);
  const frameBox = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = frameBox.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      setPortrait(el.clientHeight > el.clientWidth);
      setNarrow(el.clientWidth < 480);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const distance = (portrait ? options.distance.portrait : options.distance.landscape) ?? null;
  const [touring, setTouring] = useState(false);
  const [trying, setTrying] = useState<Object3D | null>(null);
  const [copied, setCopied] = useState(false);
  // The language of the page (the words given come from its bundle): the try-on, the view at home, the chips.
  const lang = useMemo(() => viewerLang(words), [words]);
  const tryWords = TRY_ON_WORDS[lang];
  const more = VIEWER_WORDS[lang];
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
  // The jewel in the client's own space: Quick Look on an iPhone; WebXR where the browser has it (Android), else Scene Viewer.
  const quickLook = useMemo(() => canQuickLook(), []);
  const sceneViewer = useMemo(() => canSceneViewer(), []);
  const [webXr, setWebXr] = useState(false);
  useEffect(() => {
    if (!options.ar || quickLook) return undefined;
    let alive = true;
    void canWebXrAr().then((ok) => alive && setWebXr(ok));
    return () => {
      alive = false;
    };
  }, [options.ar, quickLook]);
  const showAr = options.ar && (quickLook || webXr || sceneViewer);
  const [arState, setArState] = useState<"idle" | "busy" | "failed">("idle");
  const openSceneViewer = () => {
    window.location.href = sceneViewerUrl(new URL(model.files.full, window.location.href).href, model.name, window.location.href);
  };
  const viewInSpace = async () => {
    const jewel = api.current?.handles.jewel();
    if (!jewel || arState === "busy") return;
    setArState("busy");
    try {
      if (quickLook) await openQuickLook(jewel, model.name);
      else if (webXr) {
        try {
          const { startWebXr } = await import("./webxr");
          await startWebXr(jewel, { scan: more.arScan, tap: more.arTap, placed: more.arPlaced, close: tryWords.close, trueSize: more.arTrueSize, larger: more.arLarger }, lang === "ar" ? "rtl" : "ltr");
        } catch (error) {
          // The session could not start (no ARCore, refused): Google's own viewer, where there is one.
          if (!sceneViewer) throw error;
          openSceneViewer();
        }
      } else if (sceneViewer) openSceneViewer();
      setArState("idle");
    } catch {
      setArState("failed");
      window.setTimeout(() => setArState("idle"), 3000);
    }
  };

  const offered = settings.metals.length > 0 ? METALS.filter((m) => settings.metals.includes(m)) : [...METALS];
  const metalLayers = present.filter((name) => (settings.layers[name]?.role ?? "metal") === "metal");
  const stoneLayers = present.filter((name) => settings.layers[name]?.role === "stone");
  const labelOf = (name: string, i: number) => freeLabel(settings.layers[name]?.label ?? "", lang, words) || (metalLayers.length > 1 ? words.metal + " " + (i + 1) : words.metal);
  // The metal a part shows, in the order the 3D reads it (./Stage.tsx): a library metal chosen or set, then the swatches, then the jeweller's.
  const metalOf = useCallback(
    (name: string): MetalId => metalOfMaterial(choices.materials?.[name] ?? settings.layers[name]?.material) ?? choices.metals[name] ?? settings.layers[name]?.metal ?? "rose-gold",
    [choices.materials, choices.metals, settings.layers],
  );
  // The material a part shows, as the configurator names them: its chip is the one lit, from the first image.
  const materialOf = (name: string): string | undefined => {
    const layer = settings.layers[name];
    const own = choices.materials?.[name] ?? layer?.material;
    if (own) return own;
    const role = layer?.role ?? "metal";
    if (role === "metal") return "metal/" + metalOf(name) + "/" + (layer?.finish?.kind ?? "polished");
    if (role === "diamond") return "gem/diamond";
    return undefined;
  };
  // The configurator's groups the client sees, and the parts they cover: those parts have no swatches (one control per part).
  // (Only the parts this file has: a configurator brought from another model may name parts it does not have.)
  const configurators = options.configurator
    ? (settings.configurators ?? []).map((cfg) => ({ ...cfg, layers: cfg.layers.filter((l) => present.includes(l)) })).filter((cfg) => cfg.options.length > 0 && cfg.layers.length > 0)
    : [];
  const covered = new Set(configurators.flatMap((cfg) => cfg.layers));
  const swatchLayers = offered.length > 1 ? metalLayers.filter((name) => !covered.has(name)) : [];
  /** A swatch: the metal of the part, keeping its finish (a library metal set by the jeweller is replaced by the same finish in the new metal). */
  const chooseMetal = (name: string, metal: MetalId) =>
    setChoices((c) => {
      const materials = { ...c.materials };
      const set = settings.layers[name]?.material;
      if (set?.startsWith("metal/")) materials[name] = "metal/" + metal + "/" + (set.split("/")[2] ?? "polished");
      else delete materials[name];
      return { ...c, metals: { ...c.metals, [name]: metal }, materials };
    });

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

  // On a transparent background the page under it is unknown: the buttons keep their own dark backing.
  const dark = transparent || !BACKGROUND_LOOKS[background].light;
  const iconBtn = "inline-flex size-12 items-center justify-center rounded-full border backdrop-blur-sm transition-colors " + (dark ? "border-white/25 bg-ink/60 text-white hover:border-rose-light hover:text-rose-light" : "border-ink/20 bg-white/70 text-ink hover:border-rose-deep hover:text-rose-deep");
  const viewBtn = "inline-flex min-h-12 items-center justify-center rounded-full border px-4 text-base backdrop-blur-sm transition-colors " + (dark ? "border-white/25 bg-ink/60 text-white hover:border-rose-light hover:text-rose-light" : "border-ink/20 bg-white/70 text-ink hover:border-rose-deep hover:text-rose-deep");
  const ring = (on: boolean) => "relative size-12 shrink-0 rounded-full p-[3px] transition-transform hover:scale-105 " + (on ? "bg-rose-gold" : "bg-white/15");
  const hint = phone ? words.hintTouch : words.hint;
  // A pill on one line; on a narrow frame the name of the group takes its own line and the card keeps soft corners.
  const chipRow = "flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-3xl border border-white/15 bg-ink/70 p-1 backdrop-blur-sm";
  const chipTitle = "px-3 text-sm uppercase tracking-[0.18em] text-rose-light " + (narrow ? "basis-full pt-1.5 text-center" : "");
  const chip = (on: boolean) => "min-h-12 rounded-full px-4 text-base transition-colors " + (on ? "bg-white font-medium text-ink" : "text-bone hover:text-rose-light");
  const showPoster = status !== "ready" || !posterGone;
  const retry = () => {
    setStatus("loading");
    setProgress(0);
    setPosterGone(false);
    setAttempt((a) => a + 1);
  };

  return (
    <div
      ref={wrap}
      data-viewer
      data-viewer-bare={bare || undefined}
      // The viewer speaks the language of its words, right to left in Arabic, even on a page that stands alone (a 3D link).
      lang={lang}
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={
        (bare ? "relative h-full w-full " : VIEWER_GRID + " ") +
        (isFull ? "fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-ink lg:overflow-hidden" : bare ? className : "lg:gap-4 " + className)
      }
    >
      {/* The wheel over the jewel brings it closer and never scrolls the page as well (data-lenis-prevent: the smooth
          scrolling of the site leaves it alone). */}
      <div
        ref={frameBox}
        data-lenis-prevent
        onPointerDownCapture={() => setTouched(true)}
        onWheelCapture={() => setTouched(true)}
        className={"relative w-full overflow-hidden " + (isFull ? "min-h-[60svh] flex-1 lg:h-full lg:min-h-0" : bare ? "h-full" : CANVAS_SIZE)}
        style={{ background: transparent ? "transparent" : backgroundCss(background) }}
      >
        {webgl && status !== "error" ? (
          <Canvas
            key={attempt}
            frameloop="demand"
            dpr={dpr}
            camera={{ fov: 30, near: 0.001, far: 100, position: [0, 0.1, 0.4] }}
            gl={{ antialias: phone, powerPreference: "high-performance", alpha: transparent }}
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
              pan={options.pan !== false}
              polarLimits={options.polarLimits ?? null}
              rotateSpeed={options.rotateSpeed ?? 0.35}
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

        {/* Loading: the still image of the jewel (else the mark of the house) and a thin bar of rose gold; once the 3D is
            drawn, the image fades away over it. */}
        {showPoster ? (
          <div
            className={"absolute inset-0 transition-opacity ease-out motion-reduce:transition-none " + (status === "ready" ? "pointer-events-none opacity-0" : "opacity-100")}
            style={{ transitionDuration: FADE_MS + "ms", background: transparent ? "transparent" : backgroundCss(background) }}
            role="status"
            aria-live="polite"
            data-viewer-loading={status}
          >
            {model.poster ? (
              // Blended with the background (lighter on a dark one, darker on a light one): the jewel shows, not the image's own background.
              <img src={model.poster} alt="" decoding="async" data-viewer-poster className={(transparent ? "" : BACKGROUND_LOOKS[background].light ? "mix-blend-darken " : "mix-blend-lighten ") + "absolute left-1/2 top-1/2 max-h-full max-w-full -translate-x-1/2 -translate-y-1/2 [mask-image:radial-gradient(closest-side,#000_75%,transparent_100%)] [-webkit-mask-image:radial-gradient(closest-side,#000_75%,transparent_100%)]"} />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center">
                <Logo variant="mark" position="center" className="h-12 w-24 opacity-60" />
              </span>
            )}
            {status === "ready" ? null : !webgl || status === "error" ? (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/70 px-6 text-center">
                <span className="text-base text-bone">{!webgl ? words.noWebgl : words.failed}</span>
                {webgl ? (
                  <button type="button" onClick={retry} className="inline-flex min-h-12 items-center rounded-full border border-white/40 px-6 text-base text-white hover:border-rose-light hover:text-rose-light">
                    {words.retry}
                  </button>
                ) : null}
              </span>
            ) : (
              <>
                <span className={"absolute inset-x-4 bottom-5 text-center text-base " + (dark ? "text-bone" : "text-ink/80")} data-viewer-progress={progress}>
                  <span className={"rounded-full px-3 py-1 " + (dark ? "bg-ink/55" : "bg-white/60")}>{progress < 99 ? words.loading(progress) : words.preparing}</span>
                </span>
                <span className="absolute inset-x-0 bottom-0 block h-0.5 bg-white/10" aria-hidden="true">
                  <span className="block h-full bg-rose-gold transition-[width] duration-300" style={{ width: Math.max(progress, 3) + "%" }} />
                </span>
              </>
            )}
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
                      {viewName(v.name, lang, words)}
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
                  <button type="button" className={viewBtn} onClick={() => void viewInSpace()} aria-busy={arState === "busy"} data-view-ar={quickLook ? "quick-look" : webXr ? "webxr" : "scene-viewer"}>
                    <Box className="me-2 size-4" aria-hidden="true" /> {arState === "busy" ? tryWords.arPreparing : tryWords.viewInSpace}
                  </button>
                ) : null}
                {arState === "failed" ? <p role="alert" className="rounded-full bg-ink/80 px-4 py-2 text-base text-bone">{tryWords.arFailed}</p> : null}
              </div>
            ) : null}
            </div>
            {/* At the foot: the chips (the configurator; without the panel, the metals too), then the buttons (never over one another) */}
            <div className="pointer-events-none absolute inset-x-3 bottom-3 flex flex-col gap-2 sm:inset-x-4 sm:bottom-4">
            {configurators.length > 0 || (bare && swatchLayers.length > 0) ? (
              <div className="pointer-events-auto grid justify-items-center gap-2" data-configurator>
                {configurators.map((cfg) => {
                  // The chip lit is the material the parts show (their first one too), so the chips always say what the 3D shows.
                  const current = cfg.options.find((o) => cfg.layers.every((l) => materialOf(l) === o.material))?.material ?? null;
                  const title = groupLabel(cfg, lang, words);
                  return (
                    <div key={cfg.id} role="radiogroup" aria-label={title} className={chipRow} data-configurator-group={cfg.id}>
                      <span className={chipTitle}>{title}</span>
                      {cfg.options.map((o) => (
                        <button
                          key={o.material}
                          type="button"
                          role="radio"
                          aria-checked={current === o.material}
                          data-config-option={o.material}
                          onClick={() =>
                            setChoices((c) => {
                              // A metal of the library also counts for the swatches (one state for both: the parts of a
                              // configurator have no swatches, but the WhatsApp message names their metal).
                              const metal = metalOfMaterial(o.material);
                              return {
                                ...c,
                                materials: { ...c.materials, ...Object.fromEntries(cfg.layers.map((l) => [l, o.material])) },
                                metals: metal ? { ...c.metals, ...Object.fromEntries(cfg.layers.map((l) => [l, metal])) } : c.metals,
                              };
                            })
                          }
                          className={chip(current === o.material)}
                        >
                          {optionLabel(o, lang, words.metals)}
                        </button>
                      ))}
                    </div>
                  );
                })}
                {/* Without the panel (the embed code): the metals of the parts no configurator offers, as small swatches. */}
                {bare
                  ? swatchLayers.map((name, i) => {
                      const current = metalOf(name);
                      return (
                        <div key={name} role="radiogroup" aria-label={labelOf(name, i)} className={chipRow + (narrow ? "" : " pe-2")} data-metal-layer={name}>
                          {narrow ? null : <span className={chipTitle}>{labelOf(name, i)}</span>}
                          {offered.map((metal) => (
                            <button key={metal} type="button" role="radio" aria-checked={current === metal} aria-label={words.metals[metal]} title={words.metals[metal]} data-metal={metal} onClick={() => chooseMetal(name, metal)} className={ring(current === metal)}>
                              <span className="block h-full w-full rounded-full border border-ink/40" style={swatchStyle(METAL_LOOKS[metal].swatch)} />
                            </button>
                          ))}
                        </div>
                      );
                    })
                  : null}
              </div>
            ) : null}
            {/* Actions */}
            <div className="flex items-end justify-between gap-3">
              {logo ? (
                <span className={"pointer-events-none flex shrink-0 items-center self-center rounded-full " + (transparent || BACKGROUND_LOOKS[background].light ? "bg-ink/60 px-3 py-1.5 backdrop-blur-sm" : "")} data-viewer-logo>
                  <Logo variant="full" className="h-10 w-14 opacity-90" />
                  <span className="sr-only">{more.logo}</span>
                </span>
              ) : null}
              {!bare ? <p className={"pointer-events-none hidden max-w-[50%] text-base transition-opacity duration-700 lg:block " + (touched ? "opacity-0 " : "") + (dark ? "text-mist" : "text-ink/70")}>{hint}</p> : null}
              <div className="pointer-events-auto ms-auto flex flex-wrap justify-end gap-2">
              {options.zoom && options.zoomButtons && !phone && !narrow ? (
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
              {!phone && !narrow ? (
                <button type="button" className={iconBtn} onClick={capture} aria-label={words.capture} title={words.capture}>
                  <Camera className="size-5" aria-hidden="true" />
                </button>
              ) : null}
              {/* Sharing from a frame of another site would share the frame: the page around it is what is shared. */}
              {options.share && !bare ? (
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
      {/* The panel of choices: beside the jewel (computer), under it (phone); none for the embed code */}
      {bare ? null : (
      <div role="group" aria-labelledby={panelTitle} data-viewer-panel className={"relative " + PANEL + (isFull ? " border-x-0 border-b-0 lg:border-y-0 lg:border-e-0 lg:border-s" : " border-t-0 lg:border-t")}>
        <div ref={panelScroll} data-lenis-prevent={panelScrolls ? "" : undefined} className="lg:absolute lg:inset-0 lg:overflow-y-auto lg:overscroll-contain">
          <div ref={panelContent} className="flex min-h-full flex-col">
            <p id={panelTitle} className="eyebrow flex items-center gap-3 border-b border-white/10 px-5 py-4 sm:px-6">
              <SlidersHorizontal className="size-4" aria-hidden="true" /> {words.customize}
            </p>

            {status === "ready" ? (
              <div>
                {/* The metal of each part, unless the configurator offers it (its chips at the foot of the jewel). */}
                {swatchLayers.map((name, i) => {
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
                            onClick={() => chooseMetal(name, metal)}
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
                })}
                {stoneLayers.filter((name) => !covered.has(name)).map((name) => {
                  const current = choices.colors[name] ?? settings.layers[name]?.color ?? "#9b111e";
                  const colors = [...new Set([settings.layers[name]?.color ?? "#9b111e", ...STONE_COLORS])];
                  return (
                    <Group key={name} title={freeLabel(settings.layers[name]?.label ?? "", lang, words) || words.stoneColor}>
                      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={words.stoneColor}>
                        {colors.map((color) => (
                          <button key={color} type="button" role="radio" aria-checked={current === color} aria-label={stoneColorName(color, lang)} title={stoneColorName(color, lang)} onClick={() => setChoices((c) => ({ ...c, colors: { ...c.colors, [name]: color } }))} className={ring(current === color)}>
                            <span className="block h-full w-full rounded-full" style={swatchStyle(color)} />
                          </button>
                        ))}
                      </div>
                    </Group>
                  );
                })}
                {transparent ? null : (
                  <Group title={words.background} value={words.backgrounds[background]}>
                    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={words.background}>
                      {BACKGROUNDS.map((b) => (
                        <button key={b} type="button" role="radio" aria-checked={background === b} aria-label={words.backgrounds[b]} title={words.backgrounds[b]} data-background={b} onClick={() => setBackground(b)} className={ring(background === b)}>
                          <span className="block h-full w-full rounded-full border border-white/10" style={{ background: swatchCss(b) }} />
                        </button>
                      ))}
                    </div>
                  </Group>
                )}
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
      )}
    </div>
  );
}
