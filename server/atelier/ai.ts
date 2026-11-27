/*
 * The AI Creation Studio (Phase 2, 27/11/2026), « Create your own piece »: the images asked from OpenAI (Images API, model
 * gpt-image-1), the words wrapped around the idea of the visitor, the estimate of their cost, and the files of each studio.
 *   - A first concept comes from the words alone (POST /v1/images/generations), or, when the visitor lets the AI look at his
 *     inspiration photos, from his words and his photos (POST /v1/images/edits, the photos as inspiration only).
 *   - A variation of a concept (metal, shape) starts from the concept itself (an edit that keeps its design); « Another
 *     interpretation » is a new image of the same words.
 * The key (OPENAI_API_KEY) stays on the server. OPENAI_API_BASE (tests only: the local stand-in tests/support/fake-openai.mjs)
 * changes the address of the service, https://api.openai.com by default. OPENAI_IMAGE_QUALITY: low, medium (default), high.
 * Every image is an AI concept for inspiration, never a piece of Berete: no logo, no text, no brand in it (the words say so).
 * The cost kept with each image is an ESTIMATE in cents (the published prices of gpt-image-1 for a square image: low ≈ 1,
 * medium ≈ 4, high ≈ 17; about 1 more per photo sent with it), never the invoice of OpenAI.
 * Files: storage/studio/<studio>/c-<concept>.<ext> (the concepts) and r-<reference>.<ext> (the photos of the visitor), never
 * in Git, served only through the private link of the studio or a signed address of the admin (server/routes/studio.ts).
 */
import fs from "node:fs";
import path from "node:path";

export const AI_MODEL = "gpt-image-1";
export const MAX_IDEA = 600;
const TIMEOUT = 90_000;
const QUALITIES = ["low", "medium", "high"] as const;
type Quality = (typeof QUALITIES)[number];
const COST: Record<Quality, number> = { low: 1, medium: 4, high: 17 };

export const apiKey = () => process.env.OPENAI_API_KEY?.trim() ?? "";
const apiBase = () => (process.env.OPENAI_API_BASE?.trim() || "https://api.openai.com").replace(/\/+$/, "");
export function quality(): Quality {
  const wanted = process.env.OPENAI_IMAGE_QUALITY?.trim().toLowerCase() ?? "";
  return (QUALITIES as readonly string[]).includes(wanted) ? (wanted as Quality) : "medium";
}
/** The estimated cost of one image, in cents: its quality, and about one cent per image sent with it. */
export const estimateCents = (inputs: number) => COST[quality()] + inputs;

/* ---------- The words ---------- */

export const PIECES = ["pendant", "ring", "chain", "bracelet"] as const;
export const METALS = ["yellow", "white", "rose"] as const;
export const SHAPES = ["bolder", "finer", "geometric", "organic"] as const;
export type Piece = (typeof PIECES)[number];
export type Metal = (typeof METALS)[number];
export type Shape = (typeof SHAPES)[number];
/** What a visitor may ask of a concept: another interpretation, another metal, another shape. */
export const VARIANTS = ["another", ...METALS, ...SHAPES] as const;
export type Variant = (typeof VARIANTS)[number];

const PIECE_WORDS: Record<Piece, string> = { pendant: "a pendant", ring: "a ring", chain: "a chain necklace", bracelet: "a bracelet" };
const METAL_WORDS: Record<Metal, string> = { yellow: "polished 18k yellow gold", white: "polished 18k white gold", rose: "polished 18k rose gold" };
const SHAPE_WORDS: Record<Shape, string> = {
  bolder: "make it bolder and more sculptural: larger volumes and a stronger presence",
  finer: "make it finer and more delicate: slimmer lines and lighter volumes",
  geometric: "make it more geometric: clean lines, facets and precise angles",
  organic: "make it more organic: soft, flowing curves",
};

/** The words of the visitor, on one line, without control characters. */
export function cleanIdea(value: unknown): string {
  return typeof value === "string" ? value.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim() : "";
}

const RULES =
  "No caption, no written text, no watermark, no logo or monogram of any brand or house (letters or numbers only when they are part of the jewel itself, as the client describes); never the signature design of another jewellery or fashion house; no person, no face, no hands, no mannequin, no props.";
const PHOTO =
  "The piece is shown alone, whole, centred and in sharp focus, on a pure black background, in soft studio lighting with fine reflections on the metal and sparkle in the stones, like a luxury jewellery catalogue photograph.";

/** The kept settings of a concept ("rose,bolder"): its metal and its shape. */
export function parseVariant(value: string): { metal: Metal | null; shape: Shape | null; piece: Piece | null; fromPhotos: boolean } {
  const parts = value.split(",");
  const metal = METALS.find((m) => parts.includes(m));
  const shape = SHAPES.find((s) => parts.includes(s));
  const piece = PIECES.find((p) => parts.includes("piece:" + p));
  return { metal: metal ?? null, shape: shape ?? null, piece: piece ?? null, fromPhotos: parts.includes("photos") };
}

export function variantOf(v: { metal?: Metal | null; shape?: Shape | null; piece?: Piece | null; fromPhotos?: boolean; another?: boolean }): string {
  return [v.piece ? "piece:" + v.piece : "", v.metal ?? "", v.shape ?? "", v.fromPhotos ? "photos" : "", v.another ? "another" : ""].filter(Boolean).join(",");
}

/** The words of a new concept from the idea (and, when given, the photos of inspiration sent with it). */
export function conceptPrompt(idea: string, o: { piece: Piece | null; metal: Metal | null; shape: Shape | null; photos: boolean; another: boolean }): string {
  return [
    "Concept image, for inspiration only, of one single bespoke high-jewellery piece imagined from this client's idea:",
    `"${idea.replace(/"/g, "'")}".`,
    o.piece ? `The piece is ${PIECE_WORDS[o.piece]}.` : "",
    o.metal ? `Made in ${METAL_WORDS[o.metal]}.` : "Precious metal (rose, yellow or white gold) following what the client describes.",
    o.shape ? SHAPE_WORDS[o.shape].replace(/^make it/, "Its style:") + "." : "",
    "Set with diamonds unless the idea says otherwise; finely crafted, realistic and wearable.",
    o.photos ? "The attached photos are the client's inspirations: take their shapes, motifs or mood as inspiration only; do not copy any logo, brand, text or person that appears in them." : "",
    o.another ? "Offer a clearly different interpretation from the first concepts already made: another composition and another silhouette, the same idea." : "",
    PHOTO,
    RULES,
  ]
    .filter(Boolean)
    .join(" ");
}

/** The words of a variation that starts from the concept itself: the same design, one change. */
export function variationPrompt(change: Metal | Shape): string {
  const what = (METALS as readonly string[]).includes(change) ? `the metal becomes ${METAL_WORDS[change as Metal]} (every metal part)` : SHAPE_WORDS[change as Shape] + ", keeping the same idea and motifs";
  return [
    "This image is an AI concept of a bespoke jewel. Keep the same piece, the same composition and framing, and the pure black background; change only this:",
    what + ".",
    PHOTO,
    RULES,
  ].join(" ");
}

/* ---------- The service ---------- */

export type AiImage = { data: Buffer; ext: "jpg" | "png" | "webp" };
export type AiFailure = { error: "refused" | "timeout" | "unavailable" };
export type AiInput = { data: Buffer; mime: string; name: string };

function kindOf(buf: Buffer): AiImage["ext"] | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
}

type ImagesAnswer = { data?: { b64_json?: string }[]; error?: { code?: string | null; type?: string; message?: string } };

/**
 * One image: from the words alone, or from the words and the images given (an edit). `user`: an anonymous mark of the
 * visitor for the abuse checks of the service (never his address).
 */
export async function makeImage(prompt: string, inputs: AiInput[], user: string): Promise<AiImage | AiFailure> {
  const key = apiKey();
  if (!key) return { error: "unavailable" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    let answer: Response;
    if (inputs.length === 0) {
      answer = await fetch(apiBase() + "/v1/images/generations", {
        method: "POST",
        headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
        body: JSON.stringify({ model: AI_MODEL, prompt, n: 1, size: "1024x1024", quality: quality(), output_format: "jpeg", output_compression: 90, user }),
        signal: controller.signal,
      });
    } else {
      const form = new FormData();
      form.append("model", AI_MODEL);
      form.append("prompt", prompt);
      form.append("n", "1");
      form.append("size", "1024x1024");
      form.append("quality", quality());
      form.append("output_format", "jpeg");
      form.append("output_compression", "90");
      form.append("user", user);
      for (const input of inputs) form.append("image[]", new Blob([new Uint8Array(input.data)], { type: input.mime }), input.name);
      answer = await fetch(apiBase() + "/v1/images/edits", { method: "POST", headers: { Authorization: "Bearer " + key }, body: form, signal: controller.signal });
    }
    const body = (await answer.json().catch(() => null)) as ImagesAnswer | null;
    if (!answer.ok) {
      const reason = [body?.error?.code, body?.error?.type, body?.error?.message].filter(Boolean).join(" ");
      // The safety system of the service refused the words or the photos.
      if ((answer.status === 400 || answer.status === 422) && /moderation|safety|content.?policy|rejected|not allowed/i.test(reason)) return { error: "refused" };
      console.error("studio: the image service answered", answer.status, body?.error?.code ?? "", body?.error?.message ?? "");
      return { error: "unavailable" };
    }
    const data = Buffer.from(body?.data?.[0]?.b64_json ?? "", "base64");
    const ext = kindOf(data);
    if (!ext) {
      console.error("studio: no image in the answer of the service");
      return { error: "unavailable" };
    }
    return { data, ext };
  } catch (error) {
    if (controller.signal.aborted) return { error: "timeout" };
    console.error("studio: the image service could not be reached", error);
    return { error: "unavailable" };
  } finally {
    clearTimeout(timer);
  }
}

/* ---------- The files of a studio ---------- */

const ROOT = path.resolve(process.env.MODELS_DIR ?? "storage", "studio");
const SAFE_ID = /^[a-z0-9]{10,40}$/i;
const SAFE_EXT = /^(jpg|png|webp|heic)$/;

export const studioFiles = {
  file(studioId: string, kind: "c" | "r", id: string, ext: string): string | null {
    if (!SAFE_ID.test(studioId) || !SAFE_ID.test(id) || !SAFE_EXT.test(ext)) return null;
    return path.join(ROOT, studioId, kind + "-" + id + "." + ext);
  },
  write(studioId: string, kind: "c" | "r", id: string, ext: string, data: Buffer): void {
    const file = this.file(studioId, kind, id, ext);
    if (!file) throw new Error("Bad file");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  },
  read(studioId: string, kind: "c" | "r", id: string, ext: string): Buffer | null {
    const file = this.file(studioId, kind, id, ext);
    try {
      return file ? fs.readFileSync(file) : null;
    } catch {
      return null;
    }
  },
  remove(studioId: string, kind: "c" | "r", id: string, ext: string): void {
    const file = this.file(studioId, kind, id, ext);
    if (file) fs.rmSync(file, { force: true });
  },
  removeStudio(studioId: string): void {
    if (SAFE_ID.test(studioId)) fs.rmSync(path.join(ROOT, studioId), { recursive: true, force: true });
  },
};

export const MIME_OF: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic" };

/** What the first bytes of a photo of the visitor say it is (anything else is refused). */
export function photoExt(buf: Buffer): "jpg" | "png" | "webp" | "heic" | null {
  const k = kindOf(buf);
  if (k) return k;
  if (buf.length >= 12 && buf.toString("latin1", 4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|heif)$/.test(buf.toString("latin1", 8, 12))) return "heic";
  return null;
}
