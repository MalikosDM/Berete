/*
 * The AI Creation Studio (Phase 2, 27/11/2026), « Create your own piece » (src/pages/Studio.tsx), mounted on /api. No
 * account: a visitor's studio is reached by its private link (/create/<token>); the base keeps only a keyed fingerprint of
 * the token (keyOf("studio", token)). The images come from OpenAI (server/atelier/ai.ts): AI concepts for inspiration,
 * never pieces of Berete.
 *   GET    /studio/status                          { open, reason: null | "off" | "key", max, remaining }
 *   POST   /studio                                 a new studio -> { token } (made at the first concept or photo)
 *   GET    /studio/:token                          the studio: its concepts, its photos, its requests sent, the limits
 *   POST   /studio/:token/generate                 { idea, piece?, metal?, photos? } a first concept -> { concept, remaining }
 *   POST   /studio/:token/concepts/:id/variant     { variant: another | yellow | white | rose | bolder | finer | geometric | organic }
 *   PUT    /studio/:token/concepts/:id             { kept } a favourite or not
 *   DELETE /studio/:token/concepts/:id             (not once sent to Berete)
 *   POST   /studio/:token/references?name=         a photo of inspiration, sent as it is (JPEG, PNG, WebP or HEIC, 4 MB at most,
 *                                                  checked by its first bytes; 6 per studio), made lighter in the browser first
 *   DELETE /studio/:token/references/:id           (not once sent to Berete)
 *   POST   /studio/:token/email                    { email, language } the private link sent by e-mail
 *   POST   /studio/:token/requests                 { name, email, phone?, message, conceptIds, referenceIds, language } to Berete
 *   GET    /studio/:token/files/:kind/:id          an image of the studio (kind: concept | reference)
 * and the admin (« AI Studio », src/pages/admin/StudioRequests.tsx), behind its password:
 *   GET    /studio/admin/overview                  the requests with their concepts and photos, the generations and their cost
 *   PUT    /studio/admin/requests/:id              { status: new | read | archived }
 *   POST   /studio/admin/requests/:id/client       { title? } makes the client and his project, linked to the request
 *   DELETE /studio/admin/requests/:id
 *   DELETE /studio/admin/studios/:id               a whole studio, its images and its requests
 *   GET    /studio/files/:kind/:id?exp=&sig=       an image for the admin (signed address, 12 hours)
 * Guards: the switch « AI Studio » of the settings (off by default) and the key of OpenAI; per visitor (a keyed fingerprint of
 * his address, never the address) ai.perVisitorDaily images in 24 hours, ai.dailyTotal for every visitor together (both in
 * the settings of The Private Atelier); 8 images in 10 minutes at most per visitor; refusals of the safety system of the
 * service said politely. Every image keeps the ESTIMATE of its cost (costCents).
 */
import express, { Router, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.js";
import { limiter, visitor } from "../security.js";
import { requireAdmin } from "./site.js";
import { codeKey, newCode } from "./vip.js";
import { fileSig, keyOf, newToken, sameText } from "../atelier/crypto.js";
import { sendMail, siteOrigin } from "../atelier/mail.js";
import { atelierSettings } from "../atelier/settings.js";
import { audit, event, notifyTeam } from "../atelier/project.js";
import {
  AI_MODEL,
  apiKey,
  cleanIdea,
  conceptPrompt,
  estimateCents,
  makeImage,
  MAX_IDEA,
  METALS,
  MIME_OF,
  parseVariant,
  photoExt,
  PIECES,
  quality,
  studioFiles,
  variantOf,
  variationPrompt,
  VARIANTS,
  type AiInput,
  type Metal,
  type Shape,
} from "../atelier/ai.js";

export const studio = Router();
// The admin first: every address under /studio/admin asks for its password.
studio.use("/studio/admin", requireAdmin);

const DAY = 86_400_000;
const TOKEN = /^[A-Za-z0-9_-]{40,64}$/;
const ID = /^[a-z0-9]{10,40}$/i;
const MAX_REFS = 6;
const MAX_REF_BYTES = 4 * 1024 * 1024;
const LANGS = ["en", "fr", "es", "de", "nl", "ar"] as const;
type Lang = (typeof LANGS)[number];

/** 8 images in 10 minutes per visitor (the daily limits are in the settings). */
const burst = limiter(8, 10);
/** 10 new studios an hour per visitor. */
const opening = limiter(10, 60);
/** 30 photos in 10 minutes, 5 e-mails in 30 minutes, 5 requests in 10 minutes per visitor. */
const uploads = limiter(30, 10);
const mails = limiter(5, 30);
const forms = limiter(5, 10);

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
}

function refuse(res: Response, status: number, error: string, extra: Record<string, unknown> = {}): void {
  res.status(status).json({ error, ...extra });
}

const visitorKeyOf = (req: Request) => keyOf("studio-visitor", visitor(req));

/* ---------- Is the studio open, and how many images are left ---------- */

/** Images on their way (not in the base yet), per visitor and in all: counted with the others. */
const inflight = new Map<string, number>();
let inflightTotal = 0;

async function usage(visitorKey: string): Promise<{ mine: number; all: number }> {
  const since = new Date(Date.now() - DAY);
  const [mine, all] = await Promise.all([prisma.aiConcept.count({ where: { visitorKey, createdAt: { gte: since } } }), prisma.aiConcept.count({ where: { createdAt: { gte: since } } })]);
  return { mine: mine + (inflight.get(visitorKey) ?? 0), all: all + inflightTotal };
}

async function openState(): Promise<{ open: boolean; reason: "off" | "key" | null; max: number; total: number }> {
  const s = await atelierSettings();
  const reason = !s.features.aiStudio ? "off" : !apiKey() ? "key" : null;
  return { open: reason === null, reason, max: s.ai.perVisitorDaily, total: s.ai.dailyTotal };
}

async function remainingFor(req: Request, max: number): Promise<number> {
  return Math.max(0, max - (await usage(visitorKeyOf(req))).mine);
}

type Slot = { key: string; release: () => void };

/** Keeps a place for one image, or says why not (the answer is sent). */
async function reserve(req: Request, res: Response): Promise<Slot | null> {
  const state = await openState();
  if (!state.open) {
    refuse(res, 503, "closed");
    return null;
  }
  if (!burst.hit(req)) {
    refuse(res, 429, "too-many", { wait: burst.wait(req) });
    return null;
  }
  const key = visitorKeyOf(req);
  // The place is taken before counting: two requests at the same time each see the other.
  inflight.set(key, (inflight.get(key) ?? 0) + 1);
  inflightTotal += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const n = (inflight.get(key) ?? 1) - 1;
    if (n > 0) inflight.set(key, n);
    else inflight.delete(key);
    inflightTotal -= 1;
  };
  const used = await usage(key);
  if (used.mine > state.max || used.all > state.total) {
    release();
    if (used.mine > state.max) refuse(res, 429, "limit", { remaining: 0 });
    else refuse(res, 503, "busy");
    return null;
  }
  return { key, release };
}

/* ---------- The studio of a visitor ---------- */

async function studioOf(token: string) {
  if (!TOKEN.test(token)) return null;
  return prisma.aiStudio.findUnique({ where: { tokenKey: keyOf("studio", token) } });
}

/** The studio of the address, or a « missing » answer. */
async function studioOr404(req: Request, res: Response) {
  noStore(res);
  const found = await studioOf(String(req.params.token ?? ""));
  if (!found) refuse(res, 404, "missing");
  return found;
}

type ConceptRow = { id: string; prompt: string; variant: string; kept: boolean; createdAt: Date };
type ReferenceRow = { id: string; name: string; mime: string; createdAt: Date };

const fileUrl = (token: string, kind: "concept" | "reference", id: string) => "/api/studio/" + token + "/files/" + kind + "/" + id;

function conceptView(token: string, c: ConceptRow, sent: Set<string>) {
  return { id: c.id, url: fileUrl(token, "concept", c.id), prompt: c.prompt, variant: c.variant, kept: c.kept, sent: sent.has(c.id), createdAt: c.createdAt };
}

function referenceView(token: string, r: ReferenceRow, sent: Set<string>) {
  return { id: r.id, name: r.name, url: fileUrl(token, "reference", r.id), mime: r.mime, sent: sent.has(r.id), createdAt: r.createdAt };
}

const idsOf = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : []);

async function sentIds(studioId: string): Promise<{ concepts: Set<string>; references: Set<string>; requests: { id: string; createdAt: Date }[] }> {
  const requests = await prisma.aiRequest.findMany({ where: { studioId }, orderBy: { createdAt: "desc" }, select: { id: true, createdAt: true, conceptIds: true, referenceIds: true } });
  return {
    concepts: new Set(requests.flatMap((r) => idsOf(r.conceptIds))),
    references: new Set(requests.flatMap((r) => idsOf(r.referenceIds))),
    requests: requests.map((r) => ({ id: r.id, createdAt: r.createdAt })),
  };
}

studio.get("/studio/status", async (req, res) => {
  noStore(res);
  const state = await openState();
  res.json({ open: state.open, reason: state.reason, max: state.max, remaining: state.open ? await remainingFor(req, state.max) : 0 });
});

studio.post("/studio", async (req, res) => {
  noStore(res);
  const state = await openState();
  if (!state.open) return refuse(res, 503, "closed");
  if (!opening.hit(req)) return refuse(res, 429, "too-many", { wait: opening.wait(req) });
  const token = newToken();
  await prisma.aiStudio.create({ data: { tokenKey: keyOf("studio", token) } });
  res.status(201).json({ token });
});

studio.get("/studio/:token", async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  const token = String(req.params.token);
  const [concepts, references, sent, state] = await Promise.all([
    prisma.aiConcept.findMany({ where: { studioId: s.id }, orderBy: { createdAt: "desc" } }),
    prisma.aiReference.findMany({ where: { studioId: s.id }, orderBy: { createdAt: "asc" } }),
    sentIds(s.id),
    openState(),
  ]);
  res.json({
    email: s.email ?? "",
    createdAt: s.createdAt,
    concepts: concepts.map((c) => conceptView(token, c, sent.concepts)),
    references: references.map((r) => referenceView(token, r, sent.references)),
    requests: sent.requests,
    open: state.open,
    reason: state.reason,
    max: state.max,
    remaining: state.open ? await remainingFor(req, state.max) : 0,
  });
});

/* ---------- Generations ---------- */

const GenerateIn = z.object({
  idea: z.string().max(4000),
  piece: z.enum(PIECES).nullable().optional(),
  metal: z.enum(METALS).nullable().optional(),
  photos: z.boolean().optional(),
});

function sendFailure(res: Response, error: "refused" | "timeout" | "unavailable"): void {
  refuse(res, error === "refused" ? 422 : error === "timeout" ? 504 : 502, error);
}

/** Keeps a new concept: its row, then its file (the row goes again when the file cannot be written). */
async function keepConcept(studioId: string, data: { prompt: string; variant: string; ext: string; costCents: number; visitorKey: string }, image: Buffer) {
  const row = await prisma.aiConcept.create({ data: { studioId, ...data, model: AI_MODEL } });
  try {
    studioFiles.write(studioId, "c", row.id, row.ext, image);
  } catch (error) {
    await prisma.aiConcept.delete({ where: { id: row.id } }).catch(() => undefined);
    throw error;
  }
  return row;
}

/** The photos of inspiration of a studio the service can read (JPEG, PNG, WebP; a HEIC photo stays for Berete only). */
async function inspirationOf(studioId: string): Promise<AiInput[]> {
  const refs = await prisma.aiReference.findMany({ where: { studioId, ext: { in: ["jpg", "png", "webp"] } }, orderBy: { createdAt: "asc" }, take: MAX_REFS });
  const inputs: AiInput[] = [];
  for (const r of refs) {
    const data = studioFiles.read(studioId, "r", r.id, r.ext);
    if (data) inputs.push({ data, mime: MIME_OF[r.ext] ?? "image/jpeg", name: "inspiration-" + (inputs.length + 1) + "." + r.ext });
  }
  return inputs;
}

studio.post("/studio/:token/generate", async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  const body = GenerateIn.safeParse(req.body);
  const idea = cleanIdea(body.success ? body.data.idea : "");
  if (!body.success || !idea) return refuse(res, 400, "empty");
  if (idea.length > MAX_IDEA) return refuse(res, 400, "too-long");
  const slot = await reserve(req, res);
  if (!slot) return;
  try {
    const inputs = body.data.photos ? await inspirationOf(s.id) : [];
    const piece = body.data.piece ?? null;
    const metal = body.data.metal ?? null;
    const prompt = conceptPrompt(idea, { piece, metal, shape: null, photos: inputs.length > 0, another: false });
    const image = await makeImage(prompt, inputs, slot.key.slice(0, 32));
    if ("error" in image) return sendFailure(res, image.error);
    const row = await keepConcept(s.id, { prompt: idea, variant: variantOf({ piece, metal, fromPhotos: inputs.length > 0 }), ext: image.ext, costCents: estimateCents(inputs.length), visitorKey: slot.key }, image.data);
    slot.release();
    const state = await openState();
    res.status(201).json({ concept: conceptView(String(req.params.token), row, new Set()), remaining: await remainingFor(req, state.max) });
  } finally {
    slot.release();
  }
});

studio.post("/studio/:token/concepts/:id/variant", async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  const body = z.object({ variant: z.enum(VARIANTS) }).safeParse(req.body);
  const id = String(req.params.id);
  const source = body.success && ID.test(id) ? await prisma.aiConcept.findFirst({ where: { id, studioId: s.id } }) : null;
  if (!source || !body.success) return refuse(res, 404, "missing");
  const slot = await reserve(req, res);
  if (!slot) return;
  try {
    const was = parseVariant(source.variant);
    const v = body.data.variant;
    let prompt: string;
    let inputs: AiInput[] = [];
    let variant: string;
    if (v === "another") {
      prompt = conceptPrompt(source.prompt, { piece: was.piece, metal: was.metal, shape: was.shape, photos: false, another: true });
      variant = variantOf({ piece: was.piece, metal: was.metal, shape: was.shape, another: true });
    } else {
      // Another metal or another shape: the concept itself, changed in one thing only.
      const image = studioFiles.read(s.id, "c", source.id, source.ext);
      if (!image) return refuse(res, 404, "missing");
      inputs = [{ data: image, mime: MIME_OF[source.ext] ?? "image/jpeg", name: "concept." + source.ext }];
      prompt = variationPrompt(v);
      const isMetal = (METALS as readonly string[]).includes(v);
      variant = variantOf({ piece: was.piece, metal: isMetal ? (v as Metal) : was.metal, shape: isMetal ? was.shape : (v as Shape), fromPhotos: was.fromPhotos });
    }
    const made = await makeImage(prompt, inputs, slot.key.slice(0, 32));
    if ("error" in made) return sendFailure(res, made.error);
    const row = await keepConcept(s.id, { prompt: source.prompt, variant, ext: made.ext, costCents: estimateCents(inputs.length), visitorKey: slot.key }, made.data);
    slot.release();
    const state = await openState();
    res.status(201).json({ concept: conceptView(String(req.params.token), row, new Set()), remaining: await remainingFor(req, state.max) });
  } finally {
    slot.release();
  }
});

studio.put("/studio/:token/concepts/:id", async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  const body = z.object({ kept: z.boolean() }).safeParse(req.body);
  if (!body.success) return refuse(res, 400, "bad");
  const done = await prisma.aiConcept.updateMany({ where: { id: String(req.params.id), studioId: s.id }, data: { kept: body.data.kept } });
  if (done.count === 0) return refuse(res, 404, "missing");
  res.json({ ok: true, kept: body.data.kept });
});

studio.delete("/studio/:token/concepts/:id", async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  const c = await prisma.aiConcept.findFirst({ where: { id: String(req.params.id), studioId: s.id } });
  if (!c) return refuse(res, 404, "missing");
  if ((await sentIds(s.id)).concepts.has(c.id)) return refuse(res, 409, "sent");
  await prisma.aiConcept.delete({ where: { id: c.id } });
  studioFiles.remove(s.id, "c", c.id, c.ext);
  res.json({ ok: true });
});

/* ---------- Photos of inspiration ---------- */

studio.post("/studio/:token/references", express.raw({ type: () => true, limit: MAX_REF_BYTES + 1024 }), async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  if (!(await openState()).open) return refuse(res, 503, "closed");
  if (!uploads.hit(req)) return refuse(res, 429, "too-many", { wait: uploads.wait(req) });
  const data = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const ext = photoExt(data);
  if (!ext || data.length > MAX_REF_BYTES) return refuse(res, 400, "file");
  if ((await prisma.aiReference.count({ where: { studioId: s.id } })) >= MAX_REFS) return refuse(res, 400, "too-many-refs");
  const name =
    String(req.query.name ?? "")
      .replace(/[\p{Cc}/\\]+/gu, " ")
      .trim()
      .slice(0, 120) || "photo." + ext;
  const row = await prisma.aiReference.create({ data: { studioId: s.id, name, mime: MIME_OF[ext]!, ext, size: data.length } });
  try {
    studioFiles.write(s.id, "r", row.id, ext, data);
  } catch (error) {
    await prisma.aiReference.delete({ where: { id: row.id } }).catch(() => undefined);
    throw error;
  }
  res.status(201).json({ reference: referenceView(String(req.params.token), row, new Set()) });
});

studio.delete("/studio/:token/references/:id", async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  const r = await prisma.aiReference.findFirst({ where: { id: String(req.params.id), studioId: s.id } });
  if (!r) return refuse(res, 404, "missing");
  if ((await sentIds(s.id)).references.has(r.id)) return refuse(res, 409, "sent");
  await prisma.aiReference.delete({ where: { id: r.id } });
  studioFiles.remove(s.id, "r", r.id, r.ext);
  res.json({ ok: true });
});

/* ---------- The files ---------- */

async function sendStudioFile(res: Response, studioId: string, kind: string, id: string, cache: string): Promise<void> {
  if (!ID.test(id)) return refuse(res, 404, "missing");
  const row =
    kind === "concept"
      ? await prisma.aiConcept.findFirst({ where: { id, studioId }, select: { ext: true } })
      : kind === "reference"
        ? await prisma.aiReference.findFirst({ where: { id, studioId }, select: { ext: true } })
        : null;
  const data = row ? studioFiles.read(studioId, kind === "concept" ? "c" : "r", id, row.ext) : null;
  if (!row || !data) return refuse(res, 404, "missing");
  res.setHeader("Content-Type", MIME_OF[row.ext] ?? "application/octet-stream");
  res.setHeader("Cache-Control", cache);
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Content-Disposition", "inline; filename=\"" + (kind === "concept" ? "ai-concept-" : "inspiration-") + id + "." + row.ext + "\"");
  res.send(data);
}

studio.get("/studio/:token/files/:kind/:id", async (req, res) => {
  const token = String(req.params.token);
  const s = await studioOf(token);
  if (!s) {
    noStore(res);
    return refuse(res, 404, "missing");
  }
  await sendStudioFile(res, s.id, String(req.params.kind), String(req.params.id), "private, max-age=86400");
});

/* ---------- The private link by e-mail, the request to Berete ---------- */

const Language = z.enum(LANGS).catch("en");
const studioLink = (token: string, lang: Lang) => siteOrigin() + (lang === "en" ? "" : "/" + lang) + "/create/" + token;

const SIGN: Record<Lang, string> = {
  en: "\n\nBERETE\nMade by us. Inspired by you.",
  fr: "\n\nBERETE\nCréé par nous. Inspiré par vous.",
  es: "\n\nBERETE\nMade by us. Inspired by you.",
  de: "\n\nBERETE\nMade by us. Inspired by you.",
  nl: "\n\nBERETE\nMade by us. Inspired by you.",
  ar: "\n\nBERETE\nMade by us. Inspired by you.",
};

/** The e-mails to the visitor, in the language of his page. */
const STUDIO_MAILS: Record<Lang, { link: (link: string) => { subject: string; text: string }; request: (name: string, link: string) => { subject: string; text: string } }> = {
  en: {
    link: (link) => ({
      subject: "Your BERETE AI Creation Studio",
      text: "Here is the private link to your AI Creation Studio, with your concepts:\n" + link + "\n\nKeep it to yourself: it opens your studio without an account. The concepts are AI images for inspiration; they are not pieces made by Berete.",
    }),
    request: (name, link) => ({
      subject: "Your request has reached BERETE",
      text: "Thank you, " + name + ". Your request and the concepts you chose have reached Berete; the house will contact you shortly for a private consultation.\n\nYour studio stays at its private link:\n" + link,
    }),
  },
  fr: {
    link: (link) => ({
      subject: "Votre studio de création IA BERETE",
      text: "Voici le lien privé de votre studio de création IA, avec vos concepts :\n" + link + "\n\nGardez-le pour vous : il ouvre votre studio sans compte. Les concepts sont des images IA pour l'inspiration ; ce ne sont pas des pièces réalisées par Berete.",
    }),
    request: (name, link) => ({
      subject: "Votre demande est bien arrivée chez BERETE",
      text: "Merci, " + name + ". Votre demande et les concepts choisis sont bien arrivés chez Berete ; la maison vous contactera très vite pour une consultation privée.\n\nVotre studio reste à son lien privé :\n" + link,
    }),
  },
  es: {
    link: (link) => ({
      subject: "Su estudio de creación con IA de BERETE",
      text: "Este es el enlace privado de su estudio de creación con IA, con sus conceptos:\n" + link + "\n\nGuárdelo para usted: abre su estudio sin cuenta. Los conceptos son imágenes de IA para inspirarse; no son piezas realizadas por Berete.",
    }),
    request: (name, link) => ({
      subject: "Su solicitud ha llegado a BERETE",
      text: "Gracias, " + name + ". Su solicitud y los conceptos elegidos han llegado a Berete; la casa se pondrá en contacto con usted muy pronto para una consulta privada.\n\nSu estudio sigue en su enlace privado:\n" + link,
    }),
  },
  de: {
    link: (link) => ({
      subject: "Ihr BERETE KI-Kreationsstudio",
      text: "Hier ist der private Link zu Ihrem KI-Kreationsstudio mit Ihren Konzepten:\n" + link + "\n\nBehalten Sie ihn für sich: Er öffnet Ihr Studio ohne Konto. Die Konzepte sind KI-Bilder zur Inspiration, keine von Berete gefertigten Stücke.",
    }),
    request: (name, link) => ({
      subject: "Ihre Anfrage ist bei BERETE eingegangen",
      text: "Vielen Dank, " + name + ". Ihre Anfrage und die gewählten Konzepte sind bei Berete eingegangen; das Haus meldet sich in Kürze für eine private Beratung.\n\nIhr Studio bleibt unter seinem privaten Link erreichbar:\n" + link,
    }),
  },
  nl: {
    link: (link) => ({
      subject: "Uw BERETE AI-creatiestudio",
      text: "Hier is de privélink naar uw AI-creatiestudio, met uw concepten:\n" + link + "\n\nHoud hem voor uzelf: hij opent uw studio zonder account. De concepten zijn AI-beelden ter inspiratie; het zijn geen stukken gemaakt door Berete.",
    }),
    request: (name, link) => ({
      subject: "Uw aanvraag is bij BERETE aangekomen",
      text: "Dank u, " + name + ". Uw aanvraag en de gekozen concepten zijn bij Berete aangekomen; het huis neemt zeer binnenkort contact met u op voor een privéconsultatie.\n\nUw studio blijft bereikbaar via zijn privélink:\n" + link,
    }),
  },
  ar: {
    link: (link) => ({
      subject: "استوديو الإبداع بالذكاء الاصطناعي من BERETE",
      text: "إليك الرابط الخاص باستوديو الإبداع بالذكاء الاصطناعي، مع تصوّراتك:\n" + link + "\n\nاحتفظ به لنفسك: فهو يفتح الاستوديو دون حساب. التصوّرات صور مولّدة بالذكاء الاصطناعي للإلهام، وليست قطعًا صنعتها Berete.",
    }),
    request: (name, link) => ({
      subject: "وصل طلبك إلى BERETE",
      text: "شكرًا لك، " + name + ". وصل طلبك والتصوّرات التي اخترتها إلى Berete، وستتواصل معك الدار قريبًا جدًا لاستشارة خاصة.\n\nيبقى الاستوديو متاحًا عبر رابطه الخاص:\n" + link,
    }),
  },
};

const Email = z.string().trim().toLowerCase().max(200).pipe(z.email());

studio.post("/studio/:token/email", async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  const body = z.object({ email: Email, language: Language.optional() }).safeParse(req.body);
  if (!body.success) return refuse(res, 400, "email");
  if (!mails.hit(req)) return refuse(res, 429, "too-many", { wait: mails.wait(req) });
  const lang = body.data.language ?? "en";
  await prisma.aiStudio.update({ where: { id: s.id }, data: { email: body.data.email } });
  const m = STUDIO_MAILS[lang].link(studioLink(String(req.params.token), lang));
  await sendMail(body.data.email, m.subject, m.text + SIGN[lang], "studio");
  res.json({ ok: true });
});

const RequestIn = z.object({
  name: z.string().trim().min(1).max(120),
  email: Email,
  phone: z.string().trim().max(40).default(""),
  message: z.string().trim().max(3000).default(""),
  conceptIds: z.array(z.string().max(40)).max(60).default([]),
  referenceIds: z.array(z.string().max(40)).max(MAX_REFS).default([]),
  language: Language.optional(),
  /** Hidden from people: a robot fills it. */
  company: z.string().max(200).optional(),
});

studio.post("/studio/:token/requests", async (req, res) => {
  const s = await studioOr404(req, res);
  if (!s) return;
  const body = RequestIn.safeParse(req.body);
  if (!body.success) {
    const field = body.error.issues[0]?.path[0];
    return refuse(res, 400, field === "name" ? "name" : field === "email" ? "email" : "bad");
  }
  if (!forms.hit(req)) return refuse(res, 429, "too-many", { wait: forms.wait(req) });
  const d = body.data;
  // A robot: thanked, nothing kept.
  if (d.company) return void res.status(201).json({ ok: true, request: { id: "", createdAt: new Date() } });
  const [concepts, references] = await Promise.all([
    prisma.aiConcept.findMany({ where: { studioId: s.id, id: { in: d.conceptIds } }, select: { id: true, prompt: true } }),
    prisma.aiReference.findMany({ where: { studioId: s.id, id: { in: d.referenceIds } }, select: { id: true } }),
  ]);
  if (!d.message && concepts.length === 0) return refuse(res, 400, "message");
  const lang = d.language ?? "en";
  const request = await prisma.aiRequest.create({
    data: { studioId: s.id, name: d.name, email: d.email, phone: d.phone, message: d.message, conceptIds: concepts.map((c) => c.id), referenceIds: references.map((r) => r.id), language: lang },
  });
  // The concepts sent are kept among the favourites; the studio keeps the e-mail of its visitor.
  if (concepts.length) await prisma.aiConcept.updateMany({ where: { id: { in: concepts.map((c) => c.id) } }, data: { kept: true } });
  if (!s.email) await prisma.aiStudio.update({ where: { id: s.id }, data: { email: d.email } });
  const link = studioLink(String(req.params.token), lang);
  const m = STUDIO_MAILS[lang].request(d.name, link);
  await sendMail(d.email, m.subject, m.text + SIGN[lang], "studio");
  await notifyTeam(
    "AI Studio — nouvelle demande de " + d.name,
    [
      "Une demande de consultation est arrivée depuis le studio de création IA.",
      "",
      "Nom : " + d.name,
      "E-mail : " + d.email,
      ...(d.phone ? ["Téléphone : " + d.phone] : []),
      "Langue : " + lang,
      "Concepts choisis : " + concepts.length + " — photos d'inspiration : " + references.length,
      "",
      d.message || "(sans message)",
      "",
      "Voir la demande dans l'admin, onglet « AI Studio ».",
    ].join("\n"),
  );
  res.status(201).json({ ok: true, request: { id: request.id, createdAt: request.createdAt } });
});

/* ---------- The admin ---------- */

/** The address of an image for the admin, signed for 12 hours (the same address for an hour: the browser keeps it). */
function adminUrl(kind: "concept" | "reference", id: string): string {
  const exp = Math.floor(Date.now() / 3_600_000) * 3600 + 12 * 3600;
  return "/api/studio/files/" + kind + "/" + id + "?exp=" + exp + "&sig=" + fileSig("studio-" + kind, id, "admin", exp);
}

/** Midnight of today and the first day of this month, in Dubai (UTC+4, no summer time). */
function dubaiStarts(now = Date.now()): { day: Date; month: Date } {
  const shift = 4 * 3_600_000;
  const local = new Date(now + shift);
  const day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - shift;
  const month = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - shift;
  return { day: new Date(day), month: new Date(month) };
}

studio.get("/studio/admin/overview", async (_req, res) => {
  noStore(res);
  const { day, month } = dubaiStarts();
  const [settings, requests, today, thisMonth, last24, all, studios, latest] = await Promise.all([
    atelierSettings(),
    prisma.aiRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { studio: { select: { id: true, email: true, createdAt: true, _count: { select: { concepts: true } } } } } }),
    prisma.aiConcept.aggregate({ where: { createdAt: { gte: day } }, _count: true, _sum: { costCents: true } }),
    prisma.aiConcept.aggregate({ where: { createdAt: { gte: month } }, _count: true, _sum: { costCents: true } }),
    prisma.aiConcept.count({ where: { createdAt: { gte: new Date(Date.now() - DAY) } } }),
    prisma.aiConcept.aggregate({ _count: true, _sum: { costCents: true } }),
    prisma.aiStudio.count(),
    prisma.aiConcept.findMany({ orderBy: { createdAt: "desc" }, take: 48 }),
  ]);
  const conceptIds = requests.flatMap((r) => idsOf(r.conceptIds));
  const referenceIds = requests.flatMap((r) => idsOf(r.referenceIds));
  const clientIds = requests.map((r) => r.clientId).filter((v): v is string => Boolean(v));
  const projectIds = requests.map((r) => r.projectId).filter((v): v is string => Boolean(v));
  const [concepts, references, clients, projects] = await Promise.all([
    prisma.aiConcept.findMany({ where: { id: { in: conceptIds } } }),
    prisma.aiReference.findMany({ where: { id: { in: referenceIds } } }),
    prisma.client.findMany({ where: { id: { in: clientIds } }, select: { id: true, name: true } }),
    prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, title: true } }),
  ]);
  const conceptById = new Map(concepts.map((c) => [c.id, c]));
  const referenceById = new Map(references.map((r) => [r.id, r]));
  const studioCost = await prisma.aiConcept.groupBy({ by: ["studioId"], where: { studioId: { in: [...new Set(requests.map((r) => r.studioId))] } }, _sum: { costCents: true } });
  const costOf = new Map(studioCost.map((g) => [g.studioId, g._sum.costCents ?? 0]));
  const conceptOut = (c: (typeof concepts)[number]) => ({ id: c.id, url: adminUrl("concept", c.id), prompt: c.prompt, variant: c.variant, kept: c.kept, costCents: c.costCents, model: c.model, createdAt: c.createdAt, studioId: c.studioId });
  res.json({
    settings: { open: settings.features.aiStudio, key: Boolean(apiKey()), perVisitorDaily: settings.ai.perVisitorDaily, dailyTotal: settings.ai.dailyTotal, quality: quality(), centsPerImage: estimateCents(0) },
    usage: {
      today: { count: today._count, cents: today._sum.costCents ?? 0 },
      month: { count: thisMonth._count, cents: thisMonth._sum.costCents ?? 0 },
      all: { count: all._count, cents: all._sum.costCents ?? 0 },
      last24h: last24,
      studios,
    },
    requests: requests.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      message: r.message,
      language: r.language,
      status: r.status,
      createdAt: r.createdAt,
      studio: { id: r.studio.id, email: r.studio.email, createdAt: r.studio.createdAt, concepts: r.studio._count.concepts, cents: costOf.get(r.studioId) ?? 0 },
      concepts: idsOf(r.conceptIds)
        .map((id) => conceptById.get(id))
        .filter((c): c is (typeof concepts)[number] => Boolean(c))
        .map(conceptOut),
      references: idsOf(r.referenceIds)
        .map((id) => referenceById.get(id))
        .filter((x): x is (typeof references)[number] => Boolean(x))
        .map((x) => ({ id: x.id, name: x.name, mime: x.mime, size: x.size, url: adminUrl("reference", x.id) })),
      client: r.clientId ? (clients.find((c) => c.id === r.clientId) ?? { id: r.clientId, name: "" }) : null,
      project: r.projectId ? (projects.find((p) => p.id === r.projectId) ?? { id: r.projectId, title: "" }) : null,
    })),
    generations: latest.map(conceptOut),
  });
});

studio.put("/studio/admin/requests/:id", async (req, res) => {
  const body = z.object({ status: z.enum(["new", "read", "archived"]) }).safeParse(req.body);
  if (!body.success) return refuse(res, 400, "Statut inconnu.");
  const done = await prisma.aiRequest.updateMany({ where: { id: String(req.params.id), status: { not: "project" } }, data: { status: body.data.status } });
  if (done.count === 0) return refuse(res, 404, "Demande introuvable (ou déjà devenue un projet).");
  res.json({ ok: true });
});

/** The title of the project from the request: the idea of its first concept, else the first line of the message. */
function titleOf(prompt: string | undefined, message: string, name: string): string {
  const raw = (prompt || message.split("\n")[0] || "").trim();
  if (!raw) return "Création sur mesure — " + name;
  const short = raw.length > 80 ? raw.slice(0, 78).replace(/\s+\S*$/, "") + "…" : raw;
  return short.charAt(0).toUpperCase() + short.slice(1);
}

studio.post("/studio/admin/requests/:id/client", async (req, res) => {
  const body = z.object({ title: z.string().trim().max(160).optional() }).safeParse(req.body ?? {});
  const r = await prisma.aiRequest.findUnique({ where: { id: String(req.params.id) } });
  if (!r) return refuse(res, 404, "Demande introuvable.");
  if (r.clientId) return refuse(res, 409, "Le client et son projet existent déjà.", { clientId: r.clientId, projectId: r.projectId });
  const first = idsOf(r.conceptIds)[0];
  const concept = first ? await prisma.aiConcept.findUnique({ where: { id: first }, select: { prompt: true } }) : null;
  const title = (body.success && body.data.title) || titleOf(concept?.prompt, r.message, r.name);
  const code = newCode();
  const made = await prisma.$transaction(async (tx) => {
    const client = await tx.client.create({ data: { name: r.name, email: r.email || null, phone: r.phone || null, token: randomBytes(24).toString("base64url"), codeKey: codeKey(code) } });
    const project = await tx.project.create({ data: { clientId: client.id, title } });
    await tx.aiRequest.update({ where: { id: r.id }, data: { clientId: client.id, projectId: project.id, status: "project" } });
    return { clientId: client.id, projectId: project.id };
  });
  await event(made.projectId, "project-created", "admin", { from: "ai-studio", requestId: r.id });
  await audit(req, "admin", "ai-request-to-project", made.projectId, { requestId: r.id, clientId: made.clientId, title });
  res.status(201).json({ ...made, title, code });
});

studio.delete("/studio/admin/requests/:id", async (req, res) => {
  await prisma.aiRequest.deleteMany({ where: { id: String(req.params.id) } });
  res.json({ ok: true });
});

studio.delete("/studio/admin/studios/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!ID.test(id)) return refuse(res, 404, "Studio introuvable.");
  const done = await prisma.aiStudio.deleteMany({ where: { id } });
  if (done.count) studioFiles.removeStudio(id);
  res.json({ ok: true });
});

studio.get("/studio/files/:kind/:id", async (req, res) => {
  const kind = String(req.params.kind);
  const id = String(req.params.id);
  const exp = Number(req.query.exp);
  const sig = String(req.query.sig ?? "");
  if ((kind !== "concept" && kind !== "reference") || !Number.isInteger(exp) || exp < Date.now() / 1000 || !sameText(sig, fileSig("studio-" + kind, id, "admin", exp))) {
    noStore(res);
    return refuse(res, 403, "Adresse expirée.");
  }
  const row = kind === "concept" ? await prisma.aiConcept.findUnique({ where: { id }, select: { studioId: true } }) : await prisma.aiReference.findUnique({ where: { id }, select: { studioId: true } });
  if (!row) {
    noStore(res);
    return refuse(res, 404, "missing");
  }
  await sendStudioFile(res, row.studioId, kind, id, "private, max-age=3600");
});
