/*
 * « Imaginez votre création » (Private Enquiries, Yoni 23/11/2026): the visitor describes the piece he dreams of, the
 * server asks OpenAI for a first proposal (Images API, model gpt-image-1, 1024 x 1024) and sends it back; the visitor can
 * then join it, with his idea, to the private correspondence (POST /api/contact, src/pages/Contact.tsx). The key
 * (OPENAI_API_KEY) stays on the server: the browser never sees it. Without the key, the step does not show at all.
 *   GET  /imagine/status   { enabled }
 *   POST /imagine          { idea: 1 to 600 characters } -> { image: a JPEG in base64, type: "image/jpeg" }
 * Refusals: { error: "disabled" | "empty" | "too-long" | "too-many" (with `wait`, minutes) | "refused" (the idea is
 * refused by the service) | "timeout" | "unavailable", message (French / English) }; the page says them in its language.
 * Limits: 5 images in 10 minutes per visitor (like the forms), IMAGINE_DAILY_MAX a day for all visitors together
 * (default 200, so the bill stays small), 60 seconds at most per image. OPENAI_IMAGE_QUALITY: low, medium (default),
 * high or auto.
 */
import { createHmac } from "node:crypto";
import { Router, type Response } from "express";
import { serverSecret } from "./secret.js";
import { limiter, visitor } from "./security.js";

export const MAX_IDEA = 600;
const ENDPOINT = "https://api.openai.com/v1/images/generations";
const MODEL = "gpt-image-1";
const TIMEOUT = 60_000;
const QUALITIES = ["low", "medium", "high", "auto"] as const;

const apiKey = () => process.env.OPENAI_API_KEY?.trim() ?? "";
const quality = () => {
  const wanted = process.env.OPENAI_IMAGE_QUALITY?.trim().toLowerCase() ?? "";
  return (QUALITIES as readonly string[]).includes(wanted) ? wanted : "medium";
};

/** 5 images in 10 minutes per visitor. */
const tries = limiter(5, 10);

/** All visitors together: at most IMAGINE_DAILY_MAX images in 24 hours. */
const DAY = 86_400_000;
const made: number[] = [];
function dailyRoom(): boolean {
  const max = Number(process.env.IMAGINE_DAILY_MAX) > 0 ? Number(process.env.IMAGINE_DAILY_MAX) : 200;
  const now = Date.now();
  while (made.length > 0 && now - made[0]! >= DAY) made.shift();
  if (made.length >= max) return false;
  made.push(now);
  return true;
}

/** The words of the visitor, on one line, without control characters. */
export function cleanIdea(value: unknown): string {
  return typeof value === "string" ? value.replace(/\p{Cc}+/gu, " ").replace(/\s+/g, " ").trim() : "";
}

/** The prompt sent to the service: the words of the visitor wrapped in the photograph the house wants. */
export function promptFor(idea: string): string {
  return [
    "Photograph of one single bespoke high-jewellery piece, made by a haute joaillerie house from this client's idea:",
    `"${idea.replace(/"/g, "'")}".`,
    "The piece is shown alone, whole, centred and in sharp focus, on a pure black background, in soft studio lighting with fine reflections on the metal and sparkle in the stones, like a luxury jewellery catalogue photograph.",
    "Precious metal in rose gold or white gold, set with diamonds, following what the client describes (metal, stones, shapes, symbols); finely crafted, realistic and wearable.",
    "No caption, no written text, no watermark and no logo in the image (letters or numbers only when they are part of the jewel itself, as the client describes); no person, no hands, no mannequin, no props.",
  ].join(" ");
}

function refuse(res: Response, status: number, error: string, message: string, extra: Record<string, unknown> = {}): void {
  res.status(status).json({ error, message, ...extra });
}

/** An anonymous mark of the visitor for the abuse checks of the service (never the address itself). */
function anonymous(address: string): string | undefined {
  try {
    return createHmac("sha256", serverSecret()).update("imagine:" + address).digest("hex").slice(0, 32);
  } catch {
    return undefined;
  }
}

type ImagesAnswer = { data?: { b64_json?: string }[]; error?: { code?: string | null; type?: string; message?: string } };

export const imagine = Router();

imagine.get("/imagine/status", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ enabled: apiKey() !== "" });
});

imagine.post("/imagine", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const key = apiKey();
  if (!key) return refuse(res, 503, "disabled", "Ce service n'est pas disponible. / This service is not available.");
  const idea = cleanIdea((req.body as { idea?: unknown } | undefined)?.idea);
  if (!idea) return refuse(res, 400, "empty", "Décrivez votre idée. / Describe your idea.");
  if (idea.length > MAX_IDEA) return refuse(res, 400, "too-long", `${MAX_IDEA} caractères au plus. / ${MAX_IDEA} characters at most.`);
  if (!tries.hit(req)) {
    return refuse(res, 429, "too-many", "Trop de demandes, réessayez plus tard. / Too many requests, please try again later.", { wait: tries.wait(req) });
  }
  if (!dailyRoom()) return refuse(res, 503, "unavailable", "Le service est très demandé, réessayez plus tard. / The service is busy, please try again later.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const answer = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        prompt: promptFor(idea),
        n: 1,
        size: "1024x1024",
        quality: quality(),
        output_format: "jpeg",
        output_compression: 90,
        user: anonymous(visitor(req)),
      }),
      signal: controller.signal,
    });
    const body = (await answer.json().catch(() => null)) as ImagesAnswer | null;
    if (!answer.ok) {
      const reason = [body?.error?.code, body?.error?.type, body?.error?.message].filter(Boolean).join(" ");
      if (answer.status === 400 && /moderation|safety|content.?policy|rejected/i.test(reason)) {
        return refuse(res, 422, "refused", "Cette idée ne peut pas être imaginée ici. / This idea cannot be imagined here.");
      }
      console.error("imagine: the service answered", answer.status, body?.error?.code ?? "", body?.error?.message ?? "");
      return refuse(res, 502, "unavailable", "L'image n'a pas pu être créée. / The image could not be created.");
    }
    const image = body?.data?.[0]?.b64_json ?? "";
    const head = Buffer.from(image.slice(0, 8), "base64");
    if (head.length < 3 || head[0] !== 0xff || head[1] !== 0xd8 || head[2] !== 0xff) {
      console.error("imagine: no image in the answer of the service");
      return refuse(res, 502, "unavailable", "L'image n'a pas pu être créée. / The image could not be created.");
    }
    res.json({ image, type: "image/jpeg" });
  } catch (error) {
    if (controller.signal.aborted) return refuse(res, 504, "timeout", "L'image a pris trop de temps. / The image took too long.");
    console.error("imagine: the service could not be reached", error);
    refuse(res, 502, "unavailable", "L'image n'a pas pu être créée. / The image could not be created.");
  } finally {
    clearTimeout(timer);
  }
});
