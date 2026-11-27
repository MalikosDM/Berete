/*
 * The hand followed in the camera image, for the ring try-on (26/11/2026): MediaPipe Tasks Vision's HandLandmarker, loaded
 * only when a client starts the try-on (its code, its WebAssembly and its model: about 17 MB the first time, then from the
 * browser's cache), and served by the site itself: /mediapipe/wasm/ and /mediapipe/hand_landmarker.task
 * (scripts/mediapipe-assets.mjs puts them in public/). The graphics card does the work (GPU), else the processor (CPU).
 *
 * For each image of the video: the 21 points of each hand (image and world), lightly smoothed (one-euro filter: still when
 * the hand is still, quick when it moves), so that the ring never shakes.
 */
import type { HandLandmarker as Landmarker } from "@mediapipe/tasks-vision";
import type { Point3, Side } from "./place";
import { OneEuro } from "./smooth";

export type Delegate = "GPU" | "CPU";

export type Hand = {
  /** 21 points of the image: x, y from 0 to 1 across the frame as the camera gives it (never mirrored), z the depth (scale of x). */
  image: Point3[];
  /** 21 points in metres, around the middle of the hand, axes of the camera (x right, y down, z away). */
  world: Point3[];
  /**
   * Which hand it is in the image as given (checked on 26/11/2026 with a left hand seen from its back, and the same image
   * flipped: MediaPipe 0.10.17 says "Left" then "Right", in agreement with its own world points).
   */
  side: Side;
  score: number;
};

export type HandFrame = { hands: Hand[]; /** ms (performance.now) */ time: number };

export type HandTracker = {
  delegate: Delegate;
  /** The hands of the image of the video at this moment. */
  detect(video: HTMLVideoElement, now?: number): HandFrame;
  /** Forget the smoothing (a new camera, a hand lost for long). */
  reset(): void;
};

const WASM_BASE = "/mediapipe/wasm";
const MODEL = "/mediapipe/hand_landmarker.task";

/* ---------- Smoothing ---------- */

/** The filters of one hand: 21 points × (x, y, z) for the image and for the world. */
class HandSmoother {
  side: Side | null = null;
  last = 0;
  // Image points move across the frame (0..1 per second): quick to follow. World points turn slowly around the hand.
  private image = Array.from({ length: 63 }, (_, i) => new OneEuro(i % 3 === 2 ? 0.8 : 1.4, i % 3 === 2 ? 2 : 6));
  private world = Array.from({ length: 63 }, () => new OneEuro(1.0, 20));
  smooth(points: Point3[], world: boolean, t: number): Point3[] {
    const filters = world ? this.world : this.image;
    return points.map((p, i) => ({ x: filters[i * 3].filter(p.x, t), y: filters[i * 3 + 1].filter(p.y, t), z: filters[i * 3 + 2].filter(p.z, t) }));
  }
}

/* ---------- Loading ---------- */

type Loaded = { landmarker: Landmarker; delegate: Delegate };
let loading: Promise<Loaded> | null = null;
let loadedDelegate: Delegate | null = null;

async function create(delegate: Delegate, numHands: number): Promise<Loaded> {
  const vision = await import("@mediapipe/tasks-vision");
  const files = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
  const landmarker = await vision.HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: "VIDEO",
    numHands,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });
  return { landmarker, delegate };
}

/**
 * The hand tracker, made once and kept for the visit (opening the try-on again is immediate). `delegate`: the GPU first,
 * the CPU when the GPU cannot start; a delegate asked explicitly replaces the one made before (checks).
 */
export async function loadHandTracker(opts: { delegate?: Delegate; numHands?: number } = {}): Promise<HandTracker> {
  const numHands = opts.numHands ?? 1;
  if (opts.delegate && loadedDelegate && opts.delegate !== loadedDelegate && loading) {
    const old = loading;
    loading = null;
    void old.then((l) => l.landmarker.close()).catch(() => undefined);
  }
  if (!loading) {
    const wanted = opts.delegate ?? "GPU";
    loading = create(wanted, numHands).catch((error: unknown) => {
      if (wanted === "CPU" || opts.delegate === "GPU") throw error;
      // No WebGL 2 for MediaPipe here (an old phone, a browser without the graphics card): the processor does it.
      return create("CPU", numHands);
    });
    loading.then(
      (l) => (loadedDelegate = l.delegate),
      () => {
        loading = null;
        loadedDelegate = null;
      },
    );
  }
  const { landmarker, delegate } = await loading;
  return tracker(landmarker, delegate);
}

function tracker(landmarker: Landmarker, delegate: Delegate): HandTracker {
  let lastStamp = 0;
  let smoothers: HandSmoother[] = [];
  return {
    delegate,
    detect(video, now = performance.now()) {
      // MediaPipe wants times that always grow.
      const stamp = Math.max(Math.round(now), lastStamp + 1);
      lastStamp = stamp;
      const result = landmarker.detectForVideo(video, stamp);
      const hands: Hand[] = [];
      const count = result.landmarks.length;
      if (smoothers.length > count) smoothers = smoothers.slice(0, count);
      for (let i = 0; i < count; i++) {
        const category = result.handedness[i]?.[0];
        const side: Side = category?.categoryName === "Left" ? "left" : "right";
        let s = smoothers[i];
        if (!s || s.side !== side || now - s.last > 400) {
          s = new HandSmoother();
          smoothers[i] = s;
        }
        s.side = side;
        s.last = now;
        hands.push({
          image: s.smooth(result.landmarks[i], false, now),
          world: s.smooth(result.worldLandmarks[i] ?? [], true, now),
          side,
          score: category?.score ?? 0,
        });
      }
      return { hands, time: now };
    },
    reset() {
      smoothers = [];
    },
  };
}
