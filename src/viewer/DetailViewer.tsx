/*
 * "The Art of Detail" in 3D: the model of the piece turning slowly by itself, nothing else over it (turn it with the
 * finger or the mouse, zoom), and its details pointed at: a fine thread from a point of the jewel to a small label (the
 * number and the title of the detail; the number only on a phone, the list under it says the rest). The points stay on
 * the jewel while it turns; a point behind it fades, then comes back (src/viewer/Stage.tsx, lookAt).
 * In the admin (mode "admin"): it does not turn, and a click on the jewel gives the point under it (onPick).
 * Loaded only when shown: see ./index.tsx.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import { backgroundOf, type PublicModel } from "@/data/models";
import type { Messages } from "@/i18n";
import Logo from "@/components/Logo";
import { backgroundCss } from "./backgrounds";
import Stage, { type AnchorFrame, type StageApi } from "./Stage";

export type DetailMark = { n: number; title: string; at: [number, number, number] };

type Props = {
  model: PublicModel;
  marks: DetailMark[];
  words: Messages["viewer"];
  mode?: "page" | "admin";
  /** Admin: the point of the jewel clicked. */
  onPick?: (at: [number, number, number]) => void;
  /** Admin: the number of the detail being placed (its label stands out). */
  active?: number | null;
  className?: string;
};

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

const NO_CHOICES = { metals: {}, colors: {} };
/** The length of a thread (CSS pixels): longer on a computer, where the label holds the title. */
const THREAD = { wide: 74, narrow: 34 };

export default function DetailViewer({ model, marks, words, mode = "page", onPick, active = null, className = "" }: Props) {
  const admin = mode === "admin";
  const phone = useMemo(() => isPhone(), []);
  const webgl = useMemo(() => hasWebgl(), []);
  const [dpr, setDpr] = useState(() => Math.min(typeof window === "undefined" ? 1 : window.devicePixelRatio || 1, 1.5));
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState(0);
  const api = useRef<StageApi | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const dots = useRef<(HTMLSpanElement | null)[]>([]);
  const threads = useRef<(SVGLineElement | null)[]>([]);
  const labels = useRef<(HTMLSpanElement | null)[]>([]);
  // Out of the screen, it rests (no turning, nothing drawn).
  const [onScreen, setOnScreen] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setOnScreen(!!entry?.isIntersecting), { rootMargin: "100px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // The wheel zooms only once the jewel was clicked (else it scrolls the page, as anywhere else); a pinch always zooms.
  const engaged = useRef(false);

  const anchors = useMemo(() => marks.map((m) => m.at), [marks]);
  // Every image: each point, its thread and its label moved by hand (no render of the page for them).
  const onAnchors = useCallback(
    (frames: AnchorFrame[]) => {
      const el = box.current;
      if (!el) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const wide = w >= 640;
      const thread = wide ? THREAD.wide : THREAD.narrow;
      frames.forEach((f, i) => {
        const dot = dots.current[i];
        const line = threads.current[i];
        const label = labels.current[i];
        if (!dot || !line || !label) return;
        // Outwards from the middle of the jewel; the label kept inside the frame.
        let dx = f.x - w / 2;
        let dy = f.y - h / 2;
        const d = Math.hypot(dx, dy) || 1;
        dx /= d;
        dy /= d;
        const ex = Math.min(w - 14, Math.max(14, f.x + dx * thread));
        const ey = Math.min(h - 14, Math.max(14, f.y + dy * thread * 0.8));
        const right = wide ? ex + label.offsetWidth + 8 < w && (dx >= 0 || ex - label.offsetWidth - 8 < 0) : true;
        const shown = f.visible ? "1" : "0";
        dot.style.transform = "translate3d(" + f.x + "px," + f.y + "px,0)";
        dot.style.opacity = shown;
        line.setAttribute("x1", String(f.x));
        line.setAttribute("y1", String(f.y));
        line.setAttribute("x2", String(ex));
        line.setAttribute("y2", String(ey));
        line.style.opacity = shown;
        label.style.transform = wide ? "translate3d(" + (right ? ex + 6 : ex - 6) + "px," + ey + "px,0) translate(" + (right ? "0" : "-100%") + ",-50%)" : "translate3d(" + ex + "px," + ey + "px,0) translate(-50%,-50%)";
        label.style.opacity = shown;
        label.dataset.visible = f.visible ? "true" : "false";
      });
    },
    [],
  );

  const onApi = useCallback((a: StageApi | null) => {
    api.current = a;
  }, []);
  const onReady = useCallback(() => setStatus("ready"), []);
  const onError = useCallback(() => setStatus("error"), []);

  // Admin: a click on the jewel (not a turn) gives its point.
  const down = useRef<{ x: number; y: number } | null>(null);
  const settings = model.settings;
  return (
    <div
      ref={box}
      data-detail-3d={mode}
      data-detail-3d-status={status}
      className={"relative w-full overflow-hidden " + className}
      style={{ background: backgroundCss(backgroundOf(settings.background)) }}
      onPointerDownCapture={(e) => {
        engaged.current = true;
        down.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUpCapture={(e) => {
        const d = down.current;
        down.current = null;
        if (!admin || !onPick || !d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
        const at = api.current?.pick(e.clientX, e.clientY);
        if (at) onPick(at);
      }}
      onPointerLeave={() => {
        engaged.current = false;
      }}
      onWheelCapture={(e) => {
        // Not engaged: the wheel goes on to the page (a pinch, the Ctrl key, always zooms).
        if (!engaged.current && !e.ctrlKey) e.stopPropagation();
      }}
    >
      {webgl && status !== "error" ? (
        <Canvas
          frameloop="demand"
          dpr={dpr}
          camera={{ fov: 30, near: 0.001, far: 100, position: [0, 0.1, 0.4] }}
          gl={{ antialias: phone, powerPreference: "high-performance", alpha: false }}
          onCreated={({ gl }) => {
            gl.transmissionResolutionScale = phone ? 0.6 : 1;
          }}
          className={"touch-none" + (admin ? " cursor-crosshair" : "")}
          aria-label={words.canvasLabel(model.name)}
        >
          <PerformanceMonitor ms={300} iterations={6} onDecline={() => setDpr((d) => Math.max(1, Math.round((d - 0.25) * 4) / 4))} onIncline={() => setDpr((d) => Math.min(phone ? 1.5 : 2, Math.round((d + 0.25) * 4) / 4))} />
          <Stage
            url={phone ? model.files.light : model.files.full}
            bytes={phone ? model.bytes.light : model.bytes.full}
            phone={phone}
            simpleStones={false}
            settings={settings}
            choices={NO_CHOICES}
            ambiance={settings.ambiance}
            lightAngle={0}
            background={backgroundOf(settings.background)}
            autoRotate={!admin && onScreen}
            rotateSpeed={0.2}
            anchors={anchors}
            onAnchors={onAnchors}
            highlight={null}
            onApi={onApi}
            onProgress={setProgress}
            onReady={onReady}
            onError={onError}
          />
        </Canvas>
      ) : null}

      {/* The threads, the points and the labels of the details (drawn by onAnchors; the list under the jewel says them in words). */}
      <div aria-hidden="true" className={"pointer-events-none absolute inset-0 transition-opacity duration-700 " + (status === "ready" ? "opacity-100" : "opacity-0")}>
        <svg className="absolute inset-0 h-full w-full overflow-visible">
          {marks.map((m, i) => (
            <line
              key={m.n}
              ref={(el) => {
                threads.current[i] = el;
              }}
              className="detail-thread"
              data-active={active === m.n ? "" : undefined}
            />
          ))}
        </svg>
        {marks.map((m, i) => (
          <span
            key={"dot" + m.n}
            ref={(el) => {
              dots.current[i] = el;
            }}
            className="detail-dot"
            data-active={active === m.n ? "" : undefined}
          />
        ))}
        {marks.map((m, i) => (
          <span
            key={"label" + m.n}
            ref={(el) => {
              labels.current[i] = el;
            }}
            data-detail-label={m.n}
            data-active={active === m.n ? "" : undefined}
            className="detail-label"
          >
            <span className="detail-label-n">{String(m.n).padStart(2, "0")}</span>
            <span className="detail-label-title">{m.title}</span>
          </span>
        ))}
      </div>

      {status !== "ready" ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-ink/80" role="status" aria-live="polite">
          {model.poster ? <img src={model.poster} alt="" className="absolute inset-0 h-full w-full object-contain opacity-50 blur-[2px]" /> : <Logo variant="mark" position="center" className="h-12 w-24 opacity-60" />}
          <span className="relative px-6 text-center text-base text-bone">
            {!webgl ? words.noWebgl : status === "error" ? words.failed : progress < 99 ? words.loading(progress) : words.preparing}
          </span>
        </div>
      ) : null}
    </div>
  );
}
