/*
 * The export of the 3D editor (26/11/2026), our own equivalent of iJewel3D's Export and Batch Renderer: still images up
 * to 4K (PNG, JPEG, WebP, the background transparent if asked), films (one turn around the jewel, or the path through
 * the saved camera views) encoded in the browser, and a series (every saved view × every metal) in one zip.
 *
 * Everything goes through RenderApi (../types.ts): the stage draws each image on demand, at the size asked, so a film
 * is made image by image (never in real time) and a 4K film takes as long as it needs, without dropping a frame.
 * Films: WebCodecs (H.264) muxed into an .mp4 by mp4-muxer; where WebCodecs or H.264 is missing, MediaRecorder on a
 * canvas stream (an .mp4 in Safari, a .webm in browsers that only know that). The result says which one was used.
 * A .webm (VP9) is made on request too, up to 4K, the same way: WebCodecs (VP9, else VP8) muxed by webm-muxer (same
 * author as mp4-muxer, loaded only then), else MediaRecorder. Safari encodes no VP9: `canMakeWebm()` says no there.
 */
import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { Zip, ZipPassThrough } from "three/examples/jsm/libs/fflate.module.js";
import type { MetalId } from "@/data/models";
import type { PathKind, RenderApi } from "../types";

export type ImageFormat = "png" | "jpeg" | "webp";

/** The largest side the stage draws (RenderApi.renderStill). */
export const MAX_SIDE = 3840;
export const FILM_SECONDS = { min: 6, max: 15 } as const;

const IMAGE_TYPES: Record<ImageFormat, string> = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" };
/** Quality of the lossy formats (JPEG, WebP): high, these images are for print and social networks. */
const IMAGE_QUALITY = 0.95;

/**
 * File names of the metals in a series: French, without accents or spaces (`vue-01_or-rose.png`). A Record over every
 * MetalId, so that a metal added to ../../data/models.ts asks for its name here.
 */
export const METAL_FILE_NAMES: Record<MetalId, string> = {
  "yellow-gold": "or-jaune",
  "white-gold": "or-blanc",
  "rose-gold": "or-rose",
  platinum: "platine",
  "black-rhodium": "rhodium-noir",
  "yellow-gold-14": "or-jaune-14k",
  "white-gold-14": "or-blanc-14k",
  "rose-gold-14": "or-rose-14k",
  palladium: "palladium",
  silver: "argent",
};

/** A RenderApi that can also put the camera exactly on one saved view (asked of the stage; see `cameraOnView`). */
export type SeriesRenderApi = RenderApi & { setView?: (index: number) => void };

export type ImageOptions = { format: ImageFormat; width: number; height: number; transparent?: boolean; samples?: number };

export type FilmOptions = {
  path: PathKind;
  /** Length of the film, 6 to 15 s. For "views", the path through the views is stretched or squeezed to fill it. */
  seconds: number;
  fps?: number;
  width: number;
  height: number;
  /** Images averaged for each frame of the film (default 4: smooth edges, still quick). */
  samples?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
  /** "auto" (default): WebCodecs, else MediaRecorder. The others force one (tests, or a browser that misbehaves). */
  encoder?: "auto" | "webcodecs" | "mediarecorder";
  /** "mp4" (default, H.264) or "webm" (VP9; see `canMakeWebm`). */
  container?: FilmContainer;
};

export type FilmContainer = "mp4" | "webm";

export type FilmResult = { blob: Blob; mime: string; encoder: "webcodecs" | "mediarecorder" };

export type SeriesOptions = {
  /** Indices in `api.views()`; all of them by default. Without any saved view, the camera as it stands. */
  views?: number[];
  /** The metals, one image each per view; none: the metals as they are. */
  metals: MetalId[];
  format: ImageFormat;
  width: number;
  height: number;
  transparent?: boolean;
  samples?: number;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
};

/* ---------- Small helpers ---------- */

const clampSide = (v: number) => Math.max(16, Math.min(MAX_SIDE, Math.round(Number.isFinite(v) ? v : 16)));
/** H.264 (4:2:0) needs even sizes. */
const even = (v: number) => Math.max(16, clampSide(v) & ~1);

export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("Export arrêté", "AbortError");
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("image-encode"))), type, type === "image/png" ? undefined : IMAGE_QUALITY);
  });
}

/** The extension that goes with a file type (the type of the blob made, which may differ from the one asked). */
export function extensionOf(type: string): string {
  const t = type.split(";")[0].trim();
  const known: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/x-matroska": "mkv",
    "application/zip": "zip",
    "model/gltf-binary": "glb",
    "model/vnd.usdz+zip": "usdz",
    "application/json": "json",
  };
  return known[t] ?? "bin";
}

/** A name fit for a file: lower case, no accents, dashes. */
export function fileSlug(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Size of a film: 1080p or 4K (2160p), square, vertical 9:16 or horizontal 16:9. */
export function filmSize(quality: "1080p" | "4k", shape: "square" | "vertical" | "wide"): { width: number; height: number } {
  const short = quality === "4k" ? 2160 : 1080;
  const long = quality === "4k" ? 3840 : 1920;
  if (shape === "square") return { width: short, height: short };
  return shape === "vertical" ? { width: short, height: long } : { width: long, height: short };
}

/** The length of a film: for "views" the natural length of the path (its views and pauses), kept within 6 to 15 s. */
export function naturalFilmSeconds(api: RenderApi, path: PathKind): number {
  const natural = path === "views" ? api.viewsDuration() : 8;
  return Math.max(FILM_SECONDS.min, Math.min(FILM_SECONDS.max, Math.round(natural || 8)));
}

/* ---------- Still image ---------- */

/** One image of the jewel. Transparent only in PNG and WebP: a JPEG always has the background. */
export async function exportImage(api: RenderApi, opts: ImageOptions): Promise<Blob> {
  const transparent = Boolean(opts.transparent) && opts.format !== "jpeg";
  try {
    const canvas = await api.renderStill({ width: clampSide(opts.width), height: clampSide(opts.height), transparent, samples: opts.samples });
    return await canvasToBlob(canvas, IMAGE_TYPES[opts.format]);
  } finally {
    api.restore();
  }
}

/* ---------- Film ---------- */

/** About 12 Mbit/s for 1080p, 40 Mbit/s for 4K (by the number of pixels, between 8 and 40); VP9 needs about 30 % less. */
function bitrateFor(width: number, height: number, container: FilmContainer = "mp4"): number {
  const h264 = Math.min(40e6, Math.max(8e6, ((width * height) / (1920 * 1080)) * 12e6));
  return Math.round(container === "webm" ? h264 * 0.7 : h264);
}

/** H.264 profiles tried in order: High, then Main, then Baseline, at a level that holds the size (5.1 for 4K, 4.0 for 1080p). */
function codecCandidates(width: number, height: number): string[] {
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16);
  if (macroblocks > 8192) return ["avc1.640033", "avc1.640034", "avc1.4d0033", "avc1.420033"];
  return ["avc1.640028", "avc1.64002a", "avc1.4d0028", "avc1.42e028"];
}

/**
 * VP9 profile 0 (8 bits, 4:2:0) at a level that holds the size (5.1 up to 4K, 4.1 up to 1080p), then VP8 (an older
 * browser): both go in a .webm.
 */
function vpCandidates(width: number, height: number): string[] {
  return width * height > 2_228_224 ? ["vp09.00.51.08", "vp09.00.50.08", "vp09.00.61.08", "vp8"] : ["vp09.00.41.08", "vp09.00.40.08", "vp09.00.31.08", "vp8"];
}

async function pickEncoderConfig(width: number, height: number, fps: number, container: FilmContainer = "mp4"): Promise<VideoEncoderConfig | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  const webm = container === "webm";
  for (const codec of webm ? vpCandidates(width, height) : codecCandidates(width, height)) {
    const config: VideoEncoderConfig = {
      codec,
      width,
      height,
      bitrate: bitrateFor(width, height, container),
      bitrateMode: "variable",
      framerate: fps,
      latencyMode: "quality",
      ...(webm ? {} : { avc: { format: "avc" as const } }),
    };
    try {
      const support = await VideoEncoder.isConfigSupported(config);
      if (support.supported) return config;
    } catch {
      /* a codec string this browser does not parse: try the next */
    }
  }
  return null;
}

/** Where the camera is for frame `i` of `frames`: a turn ends just before its start (the film loops), a path on its last view. */
function pathTime(path: PathKind, i: number, frames: number): number {
  if (frames <= 1) return 0;
  return path === "turn" ? i / frames : i / (frames - 1);
}

/** Waits until the encoder has taken a frame (its "dequeue" event), or a short while where that event does not exist. */
function encoderDequeued(encoder: VideoEncoder): Promise<void> {
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      encoder.removeEventListener("dequeue", done);
      resolve();
    };
    const timer = setTimeout(done, 40);
    encoder.addEventListener("dequeue", done);
  });
}

type FilmPlan = { path: PathKind; frames: number; fps: number; width: number; height: number; samples: number; container: FilmContainer; onProgress?: (f: number) => void; signal?: AbortSignal };

/** What the encoded chunks go into: an .mp4 (mp4-muxer) or a .webm (webm-muxer, loaded only for a .webm). */
type FilmMuxer = { add(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void; finish(): Blob };

async function muxerFor(plan: FilmPlan, codec: string): Promise<FilmMuxer> {
  const { width, height, fps } = plan;
  if (plan.container === "webm") {
    const webm = await import("webm-muxer");
    const target = new webm.ArrayBufferTarget();
    const muxer = new webm.Muxer({ target, video: { codec: codec.startsWith("vp8") ? "V_VP8" : "V_VP9", width, height, frameRate: fps } });
    return {
      add: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      finish: () => {
        muxer.finalize();
        return new Blob([target.buffer], { type: "video/webm" });
      },
    };
  }
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({ target, video: { codec: "avc", width, height, frameRate: fps }, fastStart: "in-memory" });
  return {
    add: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    finish: () => {
      muxer.finalize();
      return new Blob([target.buffer], { type: "video/mp4" });
    },
  };
}

async function encodeWithWebCodecs(api: RenderApi, plan: FilmPlan, config: VideoEncoderConfig): Promise<FilmResult> {
  const { frames, fps, width, height } = plan;
  const muxer = await muxerFor(plan, config.codec);
  let failure: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.add(chunk, meta),
    error: (e) => {
      failure = e;
    },
  });
  try {
    encoder.configure(config);
    const frameDuration = 1e6 / fps;
    const keyEvery = Math.max(1, Math.round(fps * 2));
    for (let i = 0; i < frames; i++) {
      throwIfAborted(plan.signal);
      if (failure) throw failure;
      api.setPathTime(plan.path, pathTime(plan.path, i, frames));
      const canvas = await api.renderStill({ width, height, transparent: false, samples: plan.samples });
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * frameDuration), duration: Math.round(frameDuration) });
      try {
        encoder.encode(frame, { keyFrame: i % keyEvery === 0 });
      } finally {
        frame.close();
      }
      // Frames are rendered faster than a 4K encoder takes them sometimes: keep its queue short (memory).
      while (encoder.encodeQueueSize > 2 && !failure) await encoderDequeued(encoder);
      plan.onProgress?.(((i + 1) / frames) * 0.97);
    }
    await encoder.flush();
    if (failure) throw failure;
    const blob = muxer.finish();
    plan.onProgress?.(1);
    return { blob, mime: blob.type, encoder: "webcodecs" };
  } finally {
    if (encoder.state !== "closed") encoder.close();
  }
}

/** The types MediaRecorder is asked for, best first: an .mp4 where the browser makes one (Safari, recent Chrome), else .webm. */
const RECORDER_TYPES = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
/** For a .webm asked: VP9 first. */
const RECORDER_WEBM = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

/**
 * The fallback: MediaRecorder on a canvas stream. The recorder is paused while each frame is drawn and runs 1/fps of
 * a second on each, so the film has its true length however slowly the frames are drawn.
 */
async function encodeWithMediaRecorder(api: RenderApi, plan: FilmPlan): Promise<FilmResult> {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") throw new Error("no-encoder");
  const mime = (plan.container === "webm" ? RECORDER_WEBM : RECORDER_TYPES).find((t) => MediaRecorder.isTypeSupported(t));
  if (!mime) throw new Error("no-encoder");
  const { frames, fps, width, height } = plan;
  // Our own canvas: the stage may hand back a different canvas, or a WebGL one whose image goes once shown.
  const out = document.createElement("canvas");
  out.width = width;
  out.height = height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("no-encoder");
  const stream = out.captureStream(0);
  const track = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack;
  const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrateFor(width, height, plan.container) });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });
  // Milliseconds the recorder has run so far: each frame runs until the film reaches its end time, so the delays of
  // the timers (a few ms each) do not add up over the film.
  let recorded = 0;
  try {
    for (let i = 0; i < frames; i++) {
      throwIfAborted(plan.signal);
      api.setPathTime(plan.path, pathTime(plan.path, i, frames));
      const still = await api.renderStill({ width, height, transparent: false, samples: plan.samples });
      ctx.drawImage(still, 0, 0, width, height);
      if (recorder.state === "inactive") recorder.start();
      else recorder.resume();
      const resumed = performance.now();
      track.requestFrame();
      await sleep(Math.max(4, ((i + 1) * 1000) / fps - recorded - 1));
      recorder.pause();
      recorded += performance.now() - resumed;
      plan.onProgress?.(((i + 1) / frames) * 0.97);
    }
    recorder.resume();
    recorder.stop();
    await stopped;
    const type = mime.split(";")[0];
    plan.onProgress?.(1);
    return { blob: new Blob(chunks, { type }), mime: type, encoder: "mediarecorder" };
  } finally {
    if (recorder.state !== "inactive") recorder.stop();
    track.stop();
  }
}

/** A film of the jewel: one turn, or the path through the saved views. The screen comes back as before at the end. */
export async function exportFilm(api: RenderApi, opts: FilmOptions): Promise<FilmResult> {
  const fps = Math.max(1, Math.min(60, Math.round(opts.fps ?? 30)));
  const seconds = Math.max(FILM_SECONDS.min, Math.min(FILM_SECONDS.max, opts.seconds));
  const plan: FilmPlan = {
    path: opts.path,
    frames: Math.max(1, Math.round(seconds * fps)),
    fps,
    width: even(opts.width),
    height: even(opts.height),
    samples: Math.max(1, Math.round(opts.samples ?? 4)),
    container: opts.container === "webm" ? "webm" : "mp4",
    onProgress: opts.onProgress,
    signal: opts.signal,
  };
  const mode = opts.encoder ?? "auto";
  try {
    if (mode !== "mediarecorder") {
      const config = await pickEncoderConfig(plan.width, plan.height, fps, plan.container);
      if (config) {
        try {
          return await encodeWithWebCodecs(api, plan, config);
        } catch (error) {
          if (isAbort(error) || mode === "webcodecs") throw error;
          // The encoder said yes, then failed (a hardware encoder that gave up): the other way, once.
          console.warn("[export] WebCodecs failed, MediaRecorder instead", error);
          plan.onProgress?.(0);
        }
      } else if (mode === "webcodecs") {
        throw new Error("no-encoder");
      }
    }
    return await encodeWithMediaRecorder(api, plan);
  } finally {
    api.restore();
  }
}

/** Safari, and every browser of an iPhone or iPad (all WebKit): no VP9 encoder. */
function isWebKitOnly(): boolean {
  if (typeof navigator === "undefined") return true;
  const ua = navigator.userAgent;
  return /iP(hone|ad|od)/.test(ua) || (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|CriOS|FxiOS|Edg\/|Android/.test(ua)) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua) && !/Chrome\//.test(ua));
}

/**
 * The browser can make a .webm (VP9) film: WebCodecs with a VP9 encoder at 1080p, or MediaRecorder for "video/webm;
 * codecs=vp9". Never in Safari (it encodes no VP9): the option is hidden there.
 */
export async function canMakeWebm(): Promise<boolean> {
  if (isWebKitOnly()) return false;
  if (typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined") {
    try {
      const support = await VideoEncoder.isConfigSupported({ codec: "vp09.00.41.08", width: 1920, height: 1080, bitrate: 8e6, framerate: 30 });
      if (support.supported) return true;
    } catch {
      /* not parsed: try MediaRecorder */
    }
  }
  return typeof MediaRecorder !== "undefined" && typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported("video/webm;codecs=vp9");
}

/* ---------- Series ---------- */

let warnedNoSetView = false;

/**
 * Puts the camera on saved view `index`: the stage's own `setView` when it has one; else a time on the path through
 * the views, assuming each view opens an equal share of it (its pause, then the move to the next).
 */
function cameraOnView(api: SeriesRenderApi, index: number, count: number): void {
  if (typeof api.setView === "function") {
    api.setView(index);
    return;
  }
  if (!warnedNoSetView) {
    warnedNoSetView = true;
    console.warn("[export] RenderApi.setView is missing: views placed on the path by time (approximate)");
  }
  api.setPathTime("views", count > 1 ? index / count : 0);
}

/** Every chosen view in every chosen metal, one image each, in one zip (images stored as they are: already compressed). */
export async function exportSeries(api: SeriesRenderApi, opts: SeriesOptions): Promise<Blob> {
  const saved = api.views();
  const views = (opts.views ?? saved.map((_, i) => i)).filter((i) => i >= 0 && i < saved.length);
  const shots: (number | null)[] = views.length > 0 ? views : [null];
  const metals: (MetalId | null)[] = opts.metals.length > 0 ? opts.metals : [null];
  const total = shots.length * metals.length;
  const transparent = Boolean(opts.transparent) && opts.format !== "jpeg";
  const width = clampSide(opts.width);
  const height = clampSide(opts.height);

  // Streamed into the zip one image at a time: a series of 4K PNGs is never held twice in memory.
  const parts: Uint8Array[] = [];
  let zipError: Error | null = null;
  const zip = new Zip((err, chunk) => {
    if (err) zipError = err;
    else parts.push(chunk);
  });
  const used = new Set<string>();
  let done = 0;
  try {
    for (const metal of metals) {
      if (metal) api.setMetal(metal);
      for (const view of shots) {
        throwIfAborted(opts.signal);
        if (view !== null) cameraOnView(api, view, saved.length);
        const canvas = await api.renderStill({ width, height, transparent, samples: opts.samples });
        const blob = await canvasToBlob(canvas, IMAGE_TYPES[opts.format]);
        const viewName = view === null ? "vue-actuelle" : "vue-" + String(view + 1).padStart(2, "0");
        let name = metal ? `${viewName}_${METAL_FILE_NAMES[metal] ?? fileSlug(metal)}` : viewName;
        while (used.has(name)) name += "-bis";
        used.add(name);
        const file = new ZipPassThrough(`${name}.${extensionOf(blob.type)}`);
        zip.add(file);
        file.push(new Uint8Array(await blob.arrayBuffer()), true);
        if (zipError) throw zipError;
        opts.onProgress?.(++done / total);
      }
    }
    zip.end();
    if (zipError) throw zipError;
    return new Blob(parts as BlobPart[], { type: "application/zip" });
  } catch (error) {
    zip.terminate();
    throw error;
  } finally {
    api.setMetal(null);
    api.restore();
  }
}

/* ---------- Download ---------- */

/** Hands a file to the browser's downloads. */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Safari starts the download a little later: the address is kept a minute.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
