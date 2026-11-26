/*
 * The ring try-on (26/11/2026), like the jewellers' tools offer it, with our own code: the client's hand is followed live
 * in the image of his camera (./hands.ts: no 3D hand, only its 21 points), and the ring sits on the chosen finger, placed
 * by the setting of the admin (./TryOnEditor.tsx, the same reckoning: ./place.ts).
 *
 * Over everything, full screen, opened by a tap of the client only (the parent shows the button): the video in full
 * screen (cover), a transparent 3D canvas over it whose orthographic camera sees exactly the video's pixels (what the
 * hand tracking finds on the image stays on the image; the depth comes from the world points of the hand). The ring on
 * the base segment of the finger, a cylinder drawn in the depth only along the finger (and its neighbours) so that the
 * back of the band goes behind the finger. The back camera first on a phone, the front one mirrored. Hand lost: the ring
 * fades away and « Show the back of your hand » comes. A photo (the image and the ring together) is saved as a JPEG.
 * The camera needs https (the browser refuses it otherwise: said in words).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import { CylinderGeometry, Matrix4, MeshBasicMaterial, type Mesh, type Object3D, type OrthographicCamera } from "three";
import { FINGERS, type Finger, type TryOnSettings } from "@/data/scene3d";
import type { TryOnWords } from "@/viewer/words/tryon";
import { loadHandTracker, type Delegate, type Hand, type HandTracker } from "./hands";
import { fingerFrame, fingerOccluder, handInScene, measureRing, ringMatrix, ringPoints, type Point3 } from "./place";
import { prepareRing, useRoomEnvironment, type TryOnRing } from "./ring";

type Props = {
  /** The ring as the viewer draws it (metres). */
  jewel: Object3D;
  settings: TryOnSettings;
  words: TryOnWords;
  onClose(): void;
  /** Only for the checks: the processor or the graphics card for the hand tracking (default: GPU, else CPU). */
  delegate?: Delegate;
};

type Facing = "user" | "environment";
type Problem = "needsHttps" | "cameraDenied" | "cameraMissing" | "unsupported" | "failed";

/** What the hand tracking leaves for the 3D scene, read at every image drawn (never a React render). */
type Pose = { ready: boolean; ring: Matrix4; occluders: (Matrix4 | null)[] };
type Stats = { renders: number; frames: number; detections: number; detectMs: number };

/** The fingers on each side of a finger: they hide the sides of the band when the fingers are together. */
const NEIGHBOURS: Record<Finger, Finger[]> = { index: ["middle"], middle: ["index", "ring"], ring: ["middle", "little"], little: ["ring"] };

/** A hand not seen for this long: the ring fades away. */
const LOST_MS = 300;
/**
 * Detection longer than this on average (most of the 33 ms of an image at 30 fps): only every other image of the video is
 * searched, and on the others the hand is carried on from its last two positions, so the ring still moves at every image.
 */
const SLOW_MS = 26;

const isPhone = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

const roundBtn =
  "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-white/25 bg-ink/60 text-bone backdrop-blur-md transition-colors hover:border-rose-light hover:text-rose-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-light";

export default function TryOn({ jewel, settings, words, onClose, delegate }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const storeRef = useRef<RootState | null>(null);
  const pose = useRef<Pose>({ ready: false, ring: new Matrix4(), occluders: [null, null, null] });
  const stats = useRef<Stats>({ renders: 0, frames: 0, detections: 0, detectMs: 0 });

  const [phase, setPhase] = useState<"starting" | "running" | "error">("starting");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [facing, setFacing] = useState<Facing>(() => (isPhone() ? "environment" : "user"));
  const [mirror, setMirror] = useState(false);
  const [canSwitch, setCanSwitch] = useState(false);
  const [seen, setSeen] = useState(false);
  const [finger, setFinger] = useState<Finger>(settings.finger);
  const [attempt, setAttempt] = useState(0);
  const [usedDelegate, setUsedDelegate] = useState<Delegate | null>(null);
  const [saved, setSaved] = useState(false);
  const seenRef = useRef(false);

  // The ring: a copy of the jewel, its hole measured once (and again if the admin changes the axis).
  const ring = useMemo(() => prepareRing(jewel), [jewel]);
  useEffect(() => () => ring.dispose(), [ring]);
  const fit = useMemo(() => measureRing(ringPoints(ring.root), settings.axis), [ring, settings.axis]);

  // Read by the loop of the hand tracking (never restarted for them).
  const live = useRef({ fit, settings, finger });
  useEffect(() => {
    live.current = { fit, settings, finger };
  }, [fit, settings, finger]);

  /* Escape, the page behind kept still, the focus on the close button */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const html = document.documentElement;
    const overflow = html.style.overflow;
    html.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      html.style.overflow = overflow;
    };
  }, [onClose]);

  // Said at once, before any start: the camera needs https, the tracking needs a camera API and WebAssembly.
  const blocked: Problem | null =
    typeof window === "undefined"
      ? null
      : !window.isSecureContext
        ? "needsHttps"
        : !navigator.mediaDevices?.getUserMedia || typeof WebAssembly === "undefined"
          ? "unsupported"
          : null;

  /* The camera and the hand tracking */
  useEffect(() => {
    let alive = true;
    if (blocked) return;
    const stop = (stream: MediaStream | null) => stream?.getTracks().forEach((t) => t.stop());
    (async () => {
      let stream: MediaStream | null = null;
      try {
        const tracker = trackerRef.current ?? loadHandTracker({ delegate });
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!alive) return stop(stream);
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return stop(stream);
        video.srcObject = stream;
        await video.play().catch(() => undefined);
        const ready = await tracker;
        if (!alive) return;
        trackerRef.current = ready;
        ready.reset();
        setUsedDelegate(ready.delegate);
        const mode = stream.getVideoTracks()[0]?.getSettings().facingMode;
        setMirror(mode ? mode === "user" : facing === "user");
        navigator.mediaDevices
          .enumerateDevices()
          .then((list) => alive && setCanSwitch(list.filter((d) => d.kind === "videoinput").length > 1))
          .catch(() => undefined);
        setPhase("running");
      } catch (error) {
        if (!alive) return;
        stop(stream);
        const name = (error as { name?: string })?.name ?? "";
        setProblem(
          name === "NotAllowedError" || name === "SecurityError"
            ? "cameraDenied"
            : name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError"
              ? "cameraMissing"
              : "failed",
        );
        setPhase("error");
      }
    })();
    return () => {
      alive = false;
      stop(streamRef.current);
      streamRef.current = null;
    };
  }, [facing, attempt, delegate, blocked]);

  /* The loop: one search of the hand per new image of the video, the pose for the 3D scene */
  useEffect(() => {
    if (phase !== "running") return;
    const video = videoRef.current;
    if (!video) return;
    let stopped = false;
    let handle = 0;
    let count = 0;
    let average = 0;
    let lastSeen = -Infinity;
    let lastTime = -1;
    let fallingBack = false;
    const rvfc = typeof video.requestVideoFrameCallback === "function";

    // The last two hands found, to carry the hand on between two searches.
    let previous: { hand: Hand; t: number } | null = null;
    let latest: { hand: Hand; t: number } | null = null;

    const place = (hand: Hand): boolean => {
      const { fit: f, settings: s, finger: which } = live.current;
      const scene = handInScene(hand.image, hand.world, hand.side, video.videoWidth, video.videoHeight);
      const frameOf = fingerFrame(scene, which, s.along);
      if (!frameOf || !(frameOf.diameter > 2)) return false;
      const p = pose.current;
      p.ring.copy(ringMatrix(frameOf, f, s));
      p.occluders[0] = fingerOccluder(frameOf, 0.94);
      NEIGHBOURS[which].forEach((n, i) => {
        const other = fingerFrame(scene, n, 0.5);
        p.occluders[i + 1] = other ? fingerOccluder(other, 0.9) : null;
      });
      for (let i = NEIGHBOURS[which].length + 1; i < p.occluders.length; i++) p.occluders[i] = null;
      p.ready = true;
      return true;
    };

    const detect = (tracker: HandTracker, now: number): boolean => {
      const hand = tracker.detect(video, now).hands[0];
      if (!hand || hand.world.length < 21 || hand.image.length < 21) {
        previous = latest = null;
        return false;
      }
      previous = latest;
      latest = { hand, t: now };
      return place(hand);
    };

    // Between two searches: where the hand would be now at the speed it had (at most one interval ahead).
    const carry = (now: number) => {
      if (!previous || !latest || latest.hand.side !== previous.hand.side) return;
      const span = latest.t - previous.t;
      if (span <= 0 || span > 200) return;
      const k = Math.min((now - latest.t) / span, 1);
      const ahead = (a: Point3[], b: Point3[]): Point3[] => b.map((q, i) => ({ x: q.x + (q.x - a[i].x) * k, y: q.y + (q.y - a[i].y) * k, z: q.z + (q.z - a[i].z) * k }));
      place({ ...latest.hand, image: ahead(previous.hand.image, latest.hand.image), world: ahead(previous.hand.world, latest.hand.world) });
    };

    const step = () => {
      if (stopped) return;
      const tracker = trackerRef.current;
      if (tracker && video.readyState >= 2 && video.videoWidth > 0 && (rvfc || video.currentTime !== lastTime)) {
        lastTime = video.currentTime;
        count++;
        stats.current.frames++;
        if (average > SLOW_MS && count % 2 === 1) {
          if (seenRef.current) {
            carry(performance.now());
            storeRef.current?.invalidate();
          }
        } else {
          const t0 = performance.now();
          let found = false;
          try {
            found = detect(tracker, t0);
          } catch {
            // The graphics card failed while running (it happens on some phones): the processor takes over.
            if (tracker.delegate === "GPU" && !fallingBack) {
              fallingBack = true;
              trackerRef.current = null;
              loadHandTracker({ delegate: "CPU" })
                .then((t) => {
                  if (stopped) return;
                  trackerRef.current = t;
                  setUsedDelegate("CPU");
                })
                .catch(() => {
                  if (stopped) return;
                  setProblem("failed");
                  setPhase("error");
                });
            }
          }
          const spent = performance.now() - t0;
          average = average ? average * 0.9 + spent * 0.1 : spent;
          stats.current.detections++;
          stats.current.detectMs = average;
          if (found) {
            lastSeen = t0;
            if (!seenRef.current) {
              seenRef.current = true;
              setSeen(true);
            }
          } else if (seenRef.current && t0 - lastSeen > LOST_MS) {
            seenRef.current = false;
            setSeen(false);
          }
          storeRef.current?.invalidate();
        }
      }
      schedule();
    };
    const schedule = () => {
      if (stopped) return;
      if (rvfc) handle = video.requestVideoFrameCallback(step);
      else handle = requestAnimationFrame(step);
    };
    schedule();

    // The measures of the moment, on the overlay (read by the checks): images drawn and searches per second, ms per search.
    let lastRenders = 0;
    let lastFrames = 0;
    let lastDetections = 0;
    const timer = window.setInterval(() => {
      const root = rootRef.current;
      const s = stats.current;
      if (root) {
        root.dataset.fps = String(s.renders - lastRenders);
        root.dataset.videoFps = String(s.frames - lastFrames);
        root.dataset.detectFps = String(s.detections - lastDetections);
        root.dataset.detectMs = s.detectMs.toFixed(1);
      }
      lastRenders = s.renders;
      lastFrames = s.frames;
      lastDetections = s.detections;
    }, 1000);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      if (rvfc) video.cancelVideoFrameCallback(handle);
      else cancelAnimationFrame(handle);
    };
  }, [phase]);

  const countDrawn = useCallback(() => {
    stats.current.renders++;
  }, []);

  /* The photo: the image as shown (cropped, mirrored), then the ring over it */
  const capture = useCallback(async () => {
    const st = storeRef.current;
    const video = videoRef.current;
    if (!st || !video || !video.videoWidth) return;
    const glCanvas = st.gl.domElement;
    const out = document.createElement("canvas");
    out.width = glCanvas.width;
    out.height = glCanvas.height;
    const ctx = out.getContext("2d");
    if (!ctx) return;
    if (mirror) {
      ctx.translate(out.width, 0);
      ctx.scale(-1, 1);
    }
    const s = Math.max(out.width / video.videoWidth, out.height / video.videoHeight);
    const w = video.videoWidth * s;
    const h = video.videoHeight * s;
    ctx.drawImage(video, (out.width - w) / 2, (out.height - h) / 2, w, h);
    if (seenRef.current) {
      // Drawn again just now: the canvas of the ring keeps its image only until the browser shows it.
      st.gl.render(st.scene, st.camera);
      ctx.drawImage(glCanvas, 0, 0);
    }
    const blob = await new Promise<Blob | null>((resolve) => out.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    const name = "berete-try-on-" + new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") + ".jpg";
    const file = new File([blob], name, { type: "image/jpeg" });
    const done = () => {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2200);
    };
    // A phone: the share sheet (« Save image » puts it in the photos). Elsewhere a download.
    if (isPhone() && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file] });
        return done();
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    done();
  }, [mirror]);

  const shownProblem = blocked ?? (phase === "error" ? problem : null);
  const message = shownProblem ? words[shownProblem] : null;

  const overlay = (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={words.tryOn}
      data-tryon=""
      data-delegate={usedDelegate ?? ""}
      data-hand={seen ? "1" : "0"}
      data-phase={blocked ? "error" : phase}
      className="fixed inset-0 z-[2147483000] overflow-hidden bg-ink font-sans text-bone"
    >
      {/* The image of the camera and the ring over it, mirrored together for the front camera. */}
      <div className="absolute inset-0" style={mirror ? { transform: "scaleX(-1)" } : undefined}>
        <video ref={videoRef} playsInline muted autoPlay className="absolute inset-0 size-full object-cover" />
        {phase !== "error" && usedDelegate !== null && (
          <Canvas
            orthographic
            frameloop="demand"
            dpr={[1, 2]}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            camera={{ manual: true, position: [0, 0, 5000], near: 1, far: 10000, zoom: 1 }}
            onCreated={(state) => {
              storeRef.current = state;
              // The glass of the stones sees what is behind it at half the resolution: half the cost, the same look.
              state.gl.transmissionResolutionScale = 0.5;
            }}
            style={{ position: "absolute", inset: 0, opacity: seen ? 1 : 0, transition: "opacity 300ms ease", pointerEvents: "none" }}
          >
            <TryOnScene ring={ring} pose={pose} videoRef={videoRef} onDrawn={countDrawn} />
          </Canvas>
        )}
      </div>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4" style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}>
        {canSwitch && phase === "running" ? (
          <button type="button" className={roundBtn} aria-label={words.switchCamera} title={words.switchCamera} onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M4 9a8 8 0 0 1 14.3-3.5M20 4v4h-4M20 15a8 8 0 0 1-14.3 3.5M4 20v-4h4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : (
          <span />
        )}
        <button ref={closeRef} type="button" className={roundBtn} aria-label={words.close} title={words.close} onClick={onClose}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {phase === "starting" && !blocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="size-10 animate-spin rounded-full border border-white/15 border-t-rose-light motion-reduce:animate-none" aria-hidden="true" />
          <p className="text-base text-bone" role="status">
            {words.loading}
          </p>
          <p className="text-base text-mist">{words.privacy}</p>
        </div>
      )}

      {message && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center">
          <p className="max-w-md text-base leading-relaxed text-bone" role="alert">
            {message}
          </p>
          {shownProblem !== "needsHttps" && shownProblem !== "unsupported" && (
            <button
              type="button"
              className="inline-flex min-h-12 items-center justify-center border border-rose-light px-6 text-base font-medium text-rose-light hover:bg-rose-light hover:text-ink"
              onClick={() => {
                setProblem(null);
                setPhase("starting");
                setAttempt((n) => n + 1);
              }}
            >
              {words.retry}
            </button>
          )}
        </div>
      )}

      {phase === "running" && !seen && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-6">
          <p className="bg-ink/70 px-6 py-3 text-center font-display text-xl text-bone backdrop-blur-md" role="status">
            {words.showHand}
          </p>
        </div>
      )}

      {phase === "running" && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 px-4 pb-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
          <button
            type="button"
            className="group inline-flex size-16 items-center justify-center rounded-full border-2 border-rose-light bg-ink/40 backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-light"
            aria-label={words.capture}
            title={words.capture}
            onClick={() => void capture()}
          >
            <span className="size-11 rounded-full bg-bone/90 transition-transform group-active:scale-90" aria-hidden="true" />
          </button>
          <div role="radiogroup" aria-label={words.finger} className="grid w-full max-w-md grid-cols-4 gap-2">
            {FINGERS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={finger === f}
                onClick={() => setFinger(f)}
                className={
                  "min-h-12 border bg-ink/60 px-1 text-base leading-tight backdrop-blur-md transition-colors " +
                  (finger === f ? "border-rose-light text-rose-light" : "border-white/20 text-bone hover:border-white/50")
                }
              >
                {words.fingers[f]}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {saved ? words.captured : ""}
      </p>
      {saved && (
        <p className="pointer-events-none absolute inset-x-0 top-20 mx-auto w-fit bg-ink/70 px-5 py-2 text-base text-rose-light backdrop-blur-md" aria-hidden="true">
          {words.captured}
        </p>
      )}
    </div>
  );

  // Over the whole page, or inside the element in full screen (an overlay outside it would not be seen).
  if (typeof document === "undefined") return null;
  return createPortal(overlay, document.fullscreenElement ?? document.body);
}

/* ---------- The 3D scene over the video ---------- */

function TryOnScene({ ring, pose, videoRef, onDrawn }: { ring: TryOnRing; pose: RefObject<Pose>; videoRef: RefObject<HTMLVideoElement | null>; onDrawn(): void }) {
  useRoomEnvironment(1);
  const geometry = useMemo(() => new CylinderGeometry(1, 1, 1, 32, 1), []);
  // Drawn into the depth only, before everything: what is behind the finger is hidden, the video stays seen.
  const material = useMemo(() => new MeshBasicMaterial({ colorWrite: false }), []);
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const rootRef = useRef<Object3D>(null);
  const occluders = useRef<(Mesh | null)[]>([]);
  const last = useRef("");

  useFrame((state) => {
    const video = videoRef.current;
    const { size } = state;
    // The camera sees the part of the video the screen shows (object-fit: cover), in the video's pixels.
    if (video && video.videoWidth > 0) {
      const s = Math.max(size.width / video.videoWidth, size.height / video.videoHeight);
      const halfW = size.width / s / 2;
      const halfH = size.height / s / 2;
      const key = halfW.toFixed(2) + "x" + halfH.toFixed(2);
      if (key !== last.current) {
        last.current = key;
        const camera = state.camera as OrthographicCamera;
        camera.left = -halfW;
        camera.right = halfW;
        camera.top = halfH;
        camera.bottom = -halfH;
        camera.zoom = 1;
        camera.updateProjectionMatrix();
      }
    }
    const p = pose.current;
    const root = rootRef.current;
    if (root) {
      root.visible = p.ready;
      if (p.ready) {
        root.matrix.copy(p.ring);
        root.matrixWorldNeedsUpdate = true;
      }
    }
    occluders.current.forEach((mesh, i) => {
      if (!mesh) return;
      const m = p.occluders[i];
      mesh.visible = p.ready && m !== null;
      if (m) {
        mesh.matrix.copy(m);
        mesh.matrixWorldNeedsUpdate = true;
      }
    });
    onDrawn();
  });

  return (
    <>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(m: Mesh | null) => {
            occluders.current[i] = m;
          }}
          geometry={geometry}
          material={material}
          renderOrder={-1}
          matrixAutoUpdate={false}
          frustumCulled={false}
          visible={false}
        />
      ))}
      <primitive ref={rootRef} object={ring.root} />
    </>
  );
}
