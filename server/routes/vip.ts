/*
 * The private space of the jeweller's clients (/vip), mounted on /api:
 *   POST /vip/login   { code }     enter with the access code
 *   POST /vip/link    { token }    enter with the personal link (/vip/<token>)
 *   GET  /vip/me                   the client, his 3D pieces and the follow-up of his commission (its step among the six
 *                                  of The Bespoke Journey, its estimated date and its last change, the news of the atelier,
 *                                  newest first) ({ state: "out" } when not entered)
 *   GET  /vip/files/:id            a photo or a video of a news: only to the client it was sent to (his session), or to the
 *                                  admin (signed address, 12 hours); with Range (the videos on an iPhone)
 *   POST /vip/logout
 * and the admin (/admin/clients...): clients, their pieces, their code, and the follow-up (Yoni, 24/11/2026):
 *   GET  /admin/clients/:id/tracking                  the step, the date and its history, the news
 *   PUT  /admin/clients/:id/tracking                  { stage?, estimatedAt? } (a new date is kept in the history)
 *   POST /admin/clients/:id/uploads                   { name, size } starts the sending of a photo or a video
 *   PUT  /admin/clients/:id/uploads/:uploadId?offset  a piece of it (8 MB at most)
 *   POST /admin/clients/:id/updates                   { note, date, files: [{ uploadId, name, size, width?, height? }] }
 *   DELETE /admin/clients/:id/updates/:updateId       a news and its files
 * The session is a signed cookie (30 days, httpOnly). Answers are 200 with a
 * state (no error in the console of the page).
 */
import express, { Router, type Request, type Response } from "express";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../db.js";
import { clientFiles, storage } from "../models/storage.js";
import { serverSecret } from "../secret.js";
import { limiter } from "../security.js";
import { publicModel } from "./models.js";
import { requireAdmin } from "./site.js";

export const vip = Router();

const COOKIE = "bj_vip";
const SESSION_DAYS = 30;
/** Letters and digits that cannot be confused (no 0/O, 1/I/L). */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

function newCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code.slice(0, 4) + "-" + code.slice(4);
}

/** The fingerprint kept in the base: the code itself is shown once, never stored. */
function codeKey(code: string): string {
  const clean = code.toUpperCase().replace(/[^0-9A-Z]/g, "");
  return createHmac("sha256", serverSecret()).update("vip-code:" + clean).digest("base64url");
}

function sign(value: string): string {
  return createHmac("sha256", serverSecret()).update("vip-session:" + value).digest("base64url");
}

function openSession(req: Request, res: Response, clientId: string): void {
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400;
  const value = clientId + "." + exp;
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.setHeader("Set-Cookie", COOKIE + "=" + value + "." + sign(value) + "; Path=/; Max-Age=" + SESSION_DAYS * 86400 + "; HttpOnly; SameSite=Lax" + (secure ? "; Secure" : ""));
}

function sessionClient(req: Request): string | null {
  const cookie = (req.headers.cookie ?? "").split(";").map((c) => c.trim()).find((c) => c.startsWith(COOKIE + "="));
  if (!cookie) return null;
  const [id = "", exp = "", sig = ""] = cookie.slice(COOKIE.length + 1).split(".");
  const expected = sign(id + "." + exp);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(exp) < Date.now() / 1000) return null;
  return id;
}

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
}

/* ---------- Clients ---------- */

/** 10 wrong codes in 15 minutes per visitor, then every code is wrong until the wait is over. */
const codeTries = limiter(10, 15);

vip.post("/vip/login", async (req, res) => {
  noStore(res);
  const body = z.object({ code: z.string().max(40) }).safeParse(req.body);
  const client = codeTries.allowed(req) && body.success && body.data.code.replace(/[^0-9A-Za-z]/g, "").length >= 8 ? await prisma.client.findUnique({ where: { codeKey: codeKey(body.data.code) } }) : null;
  if (!client) {
    codeTries.hit(req);
    await new Promise((r) => setTimeout(r, 700));
    res.json({ state: "wrong" });
    return;
  }
  codeTries.clear(req);
  openSession(req, res, client.id);
  res.json({ state: "ok", name: client.name });
});

vip.post("/vip/link", async (req, res) => {
  noStore(res);
  const body = z.object({ token: z.string().max(80) }).safeParse(req.body);
  const client = body.success && /^[A-Za-z0-9_-]{20,64}$/.test(body.data.token) ? await prisma.client.findUnique({ where: { token: body.data.token } }) : null;
  if (!client) {
    res.json({ state: "missing" });
    return;
  }
  openSession(req, res, client.id);
  res.json({ state: "ok", name: client.name });
});

vip.get("/vip/me", async (req, res) => {
  noStore(res);
  const id = sessionClient(req);
  const client = id
    ? await prisma.client.findUnique({
        where: { id },
        include: {
          models: { include: { model: true }, orderBy: { createdAt: "desc" } },
          updates: { include: { files: { orderBy: { position: "asc" } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
          dateChanges: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      })
    : null;
  if (!client) {
    res.json({ state: "out" });
    return;
  }
  await prisma.client.update({ where: { id: client.id }, data: { lastSeenAt: new Date() } });
  // The files open for a day.
  const exp = Math.floor(Date.now() / 1000 / 3600) * 3600 + 86400;
  // "Updated on 20 February, previously 1 March": only when the last change led to the date shown and replaced another one.
  const last = client.dateChanges[0];
  const estimatedAt = dayOf(client.estimatedAt);
  const dateChange = last && last.previous && estimatedAt && dayOf(last.next) === estimatedAt ? { previous: dayOf(last.previous), at: last.createdAt } : null;
  res.json({
    state: "ok",
    name: client.name,
    pieces: client.models.filter((m) => m.model.status === "ready").map((m) => publicModel(m.model, exp)),
    stage: client.stage,
    estimatedAt,
    dateChange,
    updates: client.updates.map((u) => updateView(u, false)),
  });
});

/* ---------- The photos and videos of the news ---------- */

/** The admin sees the files through a signed address (its <img> and <video> cannot carry the password): 12 hours. */
function adminFileSig(id: string, exp: number): string {
  return createHmac("sha256", serverSecret()).update("vip-file-admin:" + id + "/" + exp).digest("base64url").slice(0, 32);
}

function fileUrl(id: string, admin: boolean): string {
  if (!admin) return "/api/vip/files/" + id;
  const exp = Math.floor(Date.now() / 1000 / 3600) * 3600 + 12 * 3600;
  return "/api/vip/files/" + id + "?exp=" + exp + "&sig=" + adminFileSig(id, exp);
}

/** "2027-03-12" for a day kept without its time (@db.Date), null for none. */
function dayOf(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** A day given as "2027-03-12" (a real day of the calendar), as a Date at midnight UTC; null when it is not one. */
function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime()) || dayOf(date) !== value ? null : date;
}

type FileRow = { id: string; kind: string; name: string; size: number; width: number | null; height: number | null };
type UpdateRow = { id: string; note: string; date: Date; createdAt: Date; files: FileRow[] };

function updateView(u: UpdateRow, admin: boolean) {
  return {
    id: u.id,
    date: dayOf(u.date),
    note: u.note,
    createdAt: u.createdAt,
    files: u.files.map((f) => ({ id: f.id, kind: f.kind as "image" | "video", url: fileUrl(f.id, admin), width: f.width, height: f.height, ...(admin ? { name: f.name, size: f.size } : {}) })),
  };
}

vip.get("/vip/files/:id", async (req, res) => {
  const id = String(req.params.id);
  const file = /^[a-z0-9]{10,40}$/i.test(id) ? await prisma.clientUpdateFile.findUnique({ where: { id }, include: { update: { select: { clientId: true } } } }) : null;
  const exp = Number(req.query.exp ?? -1);
  const sig = String(req.query.sig ?? "");
  const expected = Number.isInteger(exp) && exp > Date.now() / 1000 ? adminFileSig(id, exp) : "";
  const admin = expected !== "" && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  const found = file && (admin || sessionClient(req) === file.update.clientId) ? clientFiles.file(file.update.clientId, file.id, file.ext) : null;
  // Someone else's file, or none: the same answer (nothing says that it exists).
  if (!file || !found) {
    res.setHeader("Cache-Control", "no-store");
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Sent as they are, with Range (sendFile): Safari on an iPhone plays a video only by ranges. A QuickTime film (an
  // iPhone video) is announced as MP4: the same container, which Chrome and Firefox then play too.
  res.sendFile(found, {
    headers: {
      "Content-Type": file.mime === "video/quicktime" ? "video/mp4" : file.mime,
      "Cache-Control": "private, max-age=86400, no-transform",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
});

vip.post("/vip/logout", (_req, res) => {
  noStore(res);
  res.setHeader("Set-Cookie", COOKIE + "=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax");
  res.json({ state: "out" });
});

/* ---------- Admin ---------- */

const ClientIn = z.object({
  name: z.string().trim().min(1).max(200),
  email: z
    .string()
    .trim()
    .max(320)
    .nullable()
    .optional()
    .transform((v) => v || null),
  phone: z
    .string()
    .trim()
    .max(40)
    .nullable()
    .optional()
    .transform((v) => v || null),
  modelIds: z.array(z.string().min(1).max(64)).max(500).default([]),
});

/** Only the models that exist (a model deleted meanwhile is left out). */
async function existingModels(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  return (await prisma.model3D.findMany({ where: { id: { in: ids } }, select: { id: true } })).map((m) => m.id);
}

vip.get("/admin/clients", requireAdmin, async (_req, res) => {
  const rows = await prisma.client.findMany({ orderBy: { createdAt: "desc" }, include: { models: true, _count: { select: { updates: true } } } });
  res.json({
    items: rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      token: c.token,
      lastSeenAt: c.lastSeenAt,
      createdAt: c.createdAt,
      modelIds: c.models.map((m) => m.modelId),
      stage: c.stage,
      estimatedAt: dayOf(c.estimatedAt),
      updates: c._count.updates,
    })),
  });
});

vip.post("/admin/clients", requireAdmin, async (req, res) => {
  const body = ClientIn.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Indiquez au moins le nom du client." });
    return;
  }
  const code = newCode();
  const { modelIds: asked, ...data } = body.data;
  const modelIds = await existingModels(asked);
  const client = await prisma.client.create({ data: { ...data, token: randomBytes(24).toString("base64url"), codeKey: codeKey(code), models: { create: modelIds.map((modelId) => ({ modelId })) } } });
  res.status(201).json({ id: client.id, token: client.token, code });
});

vip.put("/admin/clients/:id", requireAdmin, async (req, res) => {
  const body = ClientIn.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Indiquez au moins le nom du client." });
    return;
  }
  const id = String(req.params.id);
  const { modelIds: asked, ...data } = body.data;
  const modelIds = await existingModels(asked);
  const done = await prisma
    .$transaction([prisma.client.update({ where: { id }, data }), prisma.clientModel.deleteMany({ where: { clientId: id } }), prisma.clientModel.createMany({ data: modelIds.map((modelId) => ({ clientId: id, modelId })), skipDuplicates: true })])
    .catch(() => null);
  if (!done) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  res.json({ ok: true });
});

/** A new code (the old one stops working). */
vip.post("/admin/clients/:id/code", requireAdmin, async (req, res) => {
  const code = newCode();
  const done = await prisma.client.update({ where: { id: String(req.params.id) }, data: { codeKey: codeKey(code) } }).catch(() => null);
  if (!done) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  res.json({ code });
});

vip.delete("/admin/clients/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const done = await prisma.client.delete({ where: { id } }).catch(() => null);
  // With the photos and videos of his news.
  if (done) clientFiles.removeClient(id);
  res.json({ ok: true });
});

/* ---------- Admin: the follow-up of the commission ---------- */

/** The six steps of The Bespoke Journey are 0 to 5; 6: every step done, the piece handed over. */
const LAST_STAGE = 6;
/** A photo is made lighter in the browser first (src/lib/photos.ts); a video goes as it is. */
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;
const MAX_FILES = 12;
const CHUNK_BYTES = 8 * 1024 * 1024;

async function trackingOf(id: string) {
  const c = await prisma.client.findUnique({
    where: { id },
    include: {
      dateChanges: { orderBy: { createdAt: "desc" } },
      updates: { include: { files: { orderBy: { position: "asc" } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
    },
  });
  if (!c) return null;
  return {
    stage: c.stage,
    estimatedAt: dayOf(c.estimatedAt),
    dateChanges: c.dateChanges.map((d) => ({ id: d.id, previous: dayOf(d.previous), next: dayOf(d.next), at: d.createdAt })),
    updates: c.updates.map((u) => updateView(u, true)),
  };
}

vip.get("/admin/clients/:id/tracking", requireAdmin, async (req, res) => {
  const tracking = await trackingOf(String(req.params.id));
  if (!tracking) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  res.json(tracking);
});

vip.put("/admin/clients/:id/tracking", requireAdmin, async (req, res) => {
  const body = z
    .object({
      stage: z.number().int().min(0).max(LAST_STAGE).optional(),
      estimatedAt: z.string().max(10).nullable().optional(),
    })
    .safeParse(req.body);
  const date = body.success && typeof body.data.estimatedAt === "string" ? parseDay(body.data.estimatedAt) : null;
  if (!body.success || (typeof body.data.estimatedAt === "string" && !date)) {
    res.status(400).json({ error: "Étape ou date invalide." });
    return;
  }
  const id = String(req.params.id);
  const client = await prisma.client.findUnique({ where: { id }, select: { estimatedAt: true } });
  if (!client) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  const { stage, estimatedAt } = body.data;
  // A new date (or the date taken away) is kept in the history: the old one, the new one, when.
  const changed = estimatedAt !== undefined && dayOf(client.estimatedAt) !== dayOf(date);
  await prisma.$transaction([
    prisma.client.update({ where: { id }, data: { ...(stage !== undefined ? { stage } : {}), ...(changed ? { estimatedAt: date } : {}) } }),
    ...(changed ? [prisma.clientDateChange.create({ data: { clientId: id, previous: client.estimatedAt, next: date } })] : []),
  ]);
  res.json(await trackingOf(id));
});

/** What the first bytes of a file say it is: a photo or a video a browser can show, else null (anything else is refused). */
function mediaKind(head: Buffer): { kind: "image" | "video"; mime: string; ext: string } | null {
  if (head.length < 12) return null;
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return { kind: "image", mime: "image/jpeg", ext: "jpg" };
  if (head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { kind: "image", mime: "image/png", ext: "png" };
  if (head.toString("latin1", 0, 4) === "RIFF" && head.toString("latin1", 8, 12) === "WEBP") return { kind: "image", mime: "image/webp", ext: "webp" };
  if (head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) return { kind: "video", mime: "video/webm", ext: "webm" };
  const box = head.toString("latin1", 4, 8);
  const brand = head.toString("latin1", 8, 12);
  if (box === "ftyp") {
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|heif)$/.test(brand)) return { kind: "image", mime: "image/heic", ext: "heic" };
    if (brand === "avif" || brand === "avis") return { kind: "image", mime: "image/avif", ext: "avif" };
    if (brand === "qt  ") return { kind: "video", mime: "video/quicktime", ext: "mov" };
    return { kind: "video", mime: "video/mp4", ext: "mp4" };
  }
  // An older QuickTime film starts with another box.
  if (/^(moov|mdat|wide|free|skip)$/.test(box)) return { kind: "video", mime: "video/quicktime", ext: "mov" };
  return null;
}

function headOf(uploadId: string): Buffer {
  const fd = fs.openSync(storage.uploadPath(uploadId), "r");
  try {
    const head = Buffer.alloc(16);
    const read = fs.readSync(fd, head, 0, 16, 0);
    return head.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

/** The size of an upload being received, -1 when there is none (an id not made of safe characters included). */
function uploadSize(uploadId: string): number {
  try {
    return storage.uploadSize(uploadId);
  } catch {
    return -1;
  }
}

vip.post("/admin/clients/:id/uploads", requireAdmin, async (req, res) => {
  const body = z.object({ name: z.string().min(1).max(200), size: z.number().int().positive() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Fichier invalide." });
    return;
  }
  if (body.data.size > MAX_VIDEO_BYTES) {
    res.status(413).json({ error: "Fichier trop lourd (300 Mo au plus pour une vidéo)." });
    return;
  }
  if (!(await prisma.client.findUnique({ where: { id: String(req.params.id) }, select: { id: true } }))) {
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  const uploadId = randomBytes(12).toString("hex");
  storage.startUpload(uploadId);
  res.status(201).json({ uploadId, chunkBytes: CHUNK_BYTES });
});

vip.put("/admin/clients/:id/uploads/:uploadId", requireAdmin, express.raw({ type: () => true, limit: CHUNK_BYTES + 1024 }), (req, res) => {
  const uploadId = String(req.params.uploadId);
  const offset = Number(req.query.offset ?? -1);
  const have = uploadSize(uploadId);
  if (have < 0) {
    res.status(404).json({ error: "Envoi introuvable, recommencez." });
    return;
  }
  // A piece sent twice (network retry) is not added twice.
  if (offset !== have) {
    res.status(409).json({ error: "Morceau inattendu.", received: have });
    return;
  }
  const buf: unknown = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    res.status(400).json({ error: "Morceau vide." });
    return;
  }
  if (have + buf.length > MAX_VIDEO_BYTES) {
    storage.removeUpload(uploadId);
    res.status(413).json({ error: "Fichier trop lourd (300 Mo au plus pour une vidéo)." });
    return;
  }
  res.json({ received: storage.appendUpload(uploadId, buf) });
});

const UpdateIn = z.object({
  note: z.string().trim().max(2000).default(""),
  date: z.string().max(10).optional(),
  files: z
    .array(
      z.object({
        uploadId: z.string().regex(/^[a-f0-9]{24}$/),
        name: z.string().min(1).max(200),
        size: z.number().int().positive(),
        width: z.number().int().positive().max(20000).nullable().optional(),
        height: z.number().int().positive().max(20000).nullable().optional(),
      }),
    )
    .max(MAX_FILES)
    .default([]),
});

vip.post("/admin/clients/:id/updates", requireAdmin, async (req, res) => {
  const body = UpdateIn.safeParse(req.body);
  const date = body.success ? (body.data.date ? parseDay(body.data.date) : parseDay(dayOf(new Date())!)) : null;
  if (!body.success || !date || (body.data.note === "" && body.data.files.length === 0)) {
    res.status(400).json({ error: "Ajoutez un mot ou au moins une photo ou une vidéo." });
    return;
  }
  const clientId = String(req.params.id);
  const drop = () => body.data.files.forEach((f) => storage.removeUpload(f.uploadId));
  if (!(await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }))) {
    drop();
    res.status(404).json({ error: "Client introuvable." });
    return;
  }
  // Each file arrived whole, and is a photo or a video (its first bytes say it, not its name).
  const files: { uploadId: string; name: string; size: number; width: number | null; height: number | null; kind: string; mime: string; ext: string }[] = [];
  for (const f of body.data.files) {
    const type = uploadSize(f.uploadId) === f.size ? mediaKind(headOf(f.uploadId)) : null;
    if (!type || (type.kind === "image" && f.size > MAX_IMAGE_BYTES)) {
      drop();
      res.status(type ? 413 : 415).json({ error: type ? "Photo trop lourde (25 Mo au plus)." : "« " + f.name + " » n'est pas arrivé en entier, ou n'est ni une photo ni une vidéo lisible." });
      return;
    }
    files.push({ uploadId: f.uploadId, name: f.name, size: f.size, width: f.width ?? null, height: f.height ?? null, ...type });
  }
  const update = await prisma.clientUpdate.create({
    data: {
      clientId,
      note: body.data.note,
      date,
      files: { create: files.map((f, position) => ({ position, kind: f.kind, mime: f.mime, ext: f.ext, name: f.name, size: f.size, width: f.width, height: f.height })) },
    },
    include: { files: { orderBy: { position: "asc" } } },
  });
  try {
    update.files.forEach((row, i) => clientFiles.adopt(files[i]!.uploadId, clientId, row.id, row.ext));
  } catch (error) {
    await prisma.clientUpdate.delete({ where: { id: update.id } }).catch(() => null);
    update.files.forEach((row) => clientFiles.remove(clientId, row.id, row.ext));
    drop();
    throw error;
  }
  res.status(201).json(updateView(update, true));
});

vip.delete("/admin/clients/:id/updates/:updateId", requireAdmin, async (req, res) => {
  const clientId = String(req.params.id);
  const update = await prisma.clientUpdate.findFirst({ where: { id: String(req.params.updateId), clientId }, include: { files: true } });
  if (!update) {
    res.status(404).json({ error: "Nouvelle introuvable, elle a peut-être déjà été supprimée." });
    return;
  }
  await prisma.clientUpdate.delete({ where: { id: update.id } });
  for (const f of update.files) clientFiles.remove(clientId, f.id, f.ext);
  res.json({ ok: true });
});
