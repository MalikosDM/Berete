/*
 * The 3D models, mounted on /api:
 *   GET  /models/pieces               the models shown on the pages of the pieces, by piece
 *   GET  /models/piece/:slug          the model shown on the page of one piece (or null)
 *   GET  /view/:token                 a private link (POST with { password } when it has one)
 *   GET  /models/:id/files/:file      full.glb, light.glb, poster.webp (signed address, given by the two above)
 * and the admin (/admin/models..., /admin/links..., /admin/pieces/:slug/model), behind ADMIN_PASSWORD:
 *   upload by pieces (big files), processing in the background, layers and
 *   their roles, the piece it is shown on (one model per piece), private links.
 */
import express, { Router, type Request, type Response } from "express";
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { AMBIANCES, BACKGROUNDS, backgroundOf, DEFAULT_SETTINGS, LAYER_ROLES, METALS, type ModelSettings, type PublicModel } from "../../src/data/models.js";
import { prisma } from "../db.js";
import { enqueue, rememberLayers } from "../models/jobs.js";
import { MODEL_FILES, storage, type ModelFile } from "../models/storage.js";
import { serverSecret } from "../secret.js";
import { requireAdmin } from "./site.js";

const scrypt = promisify(scryptCb) as (password: string, salt: string, keylen: number) => Promise<Buffer>;

export const models = Router();

/* ---------- Signed addresses of the files ---------- */

function secret(): string {
  return serverSecret();
}

function signature(id: string, file: string, exp: number): string {
  return createHmac("sha256", secret()).update(id + "/" + file + "/" + exp).digest("base64url").slice(0, 32);
}

/** exp: seconds since 1970 after which the address stops working; 0: never (models shown on the site). */
function fileUrl(id: string, file: ModelFile, exp: number, version: number): string {
  return "/api/models/" + id + "/files/" + file + "?exp=" + exp + "&v=" + version + "&sig=" + signature(id, file, exp);
}

type Row = Awaited<ReturnType<typeof prisma.model3D.findUniqueOrThrow>>;

export const SettingsSchema = z.object({
  layers: z.record(
    z.string().max(200),
    z.object({
      role: z.enum(LAYER_ROLES),
      metal: z.enum(METALS).optional(),
      color: z
        .string()
        .regex(/^#[0-9a-f]{6}$/i)
        .optional(),
      label: z.string().max(60).optional(),
    }),
  ),
  metals: z.array(z.enum(METALS)).max(METALS.length),
  view: z.object({ position: z.tuple([z.number(), z.number(), z.number()]), target: z.tuple([z.number(), z.number(), z.number()]) }).nullable(),
  ambiance: z.enum(AMBIANCES),
  background: z.preprocess(backgroundOf, z.enum(BACKGROUNDS)),
});

export function settingsOf(v: unknown): ModelSettings {
  const parsed = SettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...(typeof v === "object" && v !== null ? v : {}) });
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

function sizeOf(row: Row): [number, number, number] {
  const size = (row.stats as { size?: unknown }).size;
  return Array.isArray(size) && size.length === 3 ? (size as [number, number, number]) : [0, 0, 0];
}

export function publicModel(row: Row, exp: number): PublicModel {
  const sizes = row.sizes as { full?: number; light?: number };
  const version = Math.floor(row.updatedAt.getTime() / 1000);
  return {
    id: row.id,
    name: row.name,
    files: { full: fileUrl(row.id, "full.glb", exp, version), light: fileUrl(row.id, "light.glb", exp, version) },
    bytes: { full: sizes.full ?? 0, light: sizes.light ?? 0 },
    poster: row.hasPoster ? fileUrl(row.id, "poster.webp", exp, version) : null,
    size: sizeOf(row),
    settings: settingsOf(row.settings),
  };
}

/** The value, or `fallback` when reading it fails (an id not made of safe characters). */
function safely<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

/* ---------- Visitors ---------- */

// The models shown on the pages of the pieces, by piece: asked once per visit (not at each page).
models.get("/models/pieces", async (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  const rows = await prisma.model3D.findMany({ where: { status: "ready", pieceSlug: { not: null } }, orderBy: { updatedAt: "asc" } });
  const out: Record<string, PublicModel> = {};
  for (const row of rows) out[row.pieceSlug!] = publicModel(row, 0);
  res.json(out);
});

// A piece without a model answers null (not 404: no error in the console of its page).
models.get("/models/piece/:slug", async (req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  const row = await prisma.model3D.findFirst({ where: { pieceSlug: String(req.params.slug), status: "ready" }, orderBy: { updatedAt: "desc" } });
  res.json(row ? publicModel(row, 0) : null);
});

const CONTENT_TYPES: Record<ModelFile, string> = { "full.glb": "model/gltf-binary", "light.glb": "model/gltf-binary", "poster.webp": "image/webp" };

models.get("/models/:id/files/:file", (req, res) => {
  const id = String(req.params.id);
  const file = String(req.params.file) as ModelFile;
  const exp = Number(req.query.exp ?? -1);
  const sig = String(req.query.sig ?? "");
  const expected = signature(id, file, exp);
  const valid = MODEL_FILES.includes(file) && Number.isInteger(exp) && exp >= 0 && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  if (!valid || (exp !== 0 && exp < Date.now() / 1000)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const found = safely(() => storage.file(id, file), null);
  if (!found) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  // Already compressed (Meshopt, WebP): sent as they are, with their length (the viewer shows a percentage).
  res.sendFile(found, {
    headers: {
      "Content-Type": CONTENT_TYPES[file],
      "Cache-Control": (exp === 0 ? "public" : "private") + ", max-age=86400, no-transform",
      "X-Robots-Tag": "noindex",
    },
  });
});

/**
 * A private link: { state: "ok", model } when the link is valid (and its password given), else
 * { state: "missing" | "expired" | "password" | "wrong" }, always with the status 200 (the page
 * shows each case in words, without an error in the console).
 */
async function openLink(req: Request, res: Response, password: string | null): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const token = String(req.params.token);
  const link = /^[A-Za-z0-9_-]{20,64}$/.test(token) ? await prisma.viewLink.findUnique({ where: { token }, include: { model: true } }) : null;
  if (!link || link.model.status !== "ready") {
    res.json({ state: "missing" });
    return;
  }
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    res.json({ state: "expired" });
    return;
  }
  if (link.passwordHash) {
    if (password === null) {
      res.json({ state: "password" });
      return;
    }
    const [salt = "", hash = ""] = link.passwordHash.split("$").slice(1);
    const given = await scrypt(password, salt, 32);
    const expected = Buffer.from(hash, "base64url");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      await new Promise((r) => setTimeout(r, 600));
      res.json({ state: "wrong" });
      return;
    }
  }
  // The files open for a day, or until the link expires.
  const day = Math.floor(Date.now() / 1000 / 3600) * 3600 + 86400;
  const exp = link.expiresAt ? Math.min(day, Math.floor(link.expiresAt.getTime() / 1000)) : day;
  res.json({ state: "ok", title: link.title || link.model.name, expiresAt: link.expiresAt, model: publicModel(link.model, exp) });
}

models.get("/view/:token", (req, res) => openLink(req, res, null));
models.post("/view/:token", (req, res) => {
  const body = z.object({ password: z.string().max(200) }).safeParse(req.body);
  return openLink(req, res, body.success ? body.data.password : "");
});

/* ---------- Admin ---------- */

const KINDS: Record<string, "stl" | "glb" | "3dm"> = { ".stl": "stl", ".glb": "glb", ".3dm": "3dm" };
const MAX_BYTES = 800 * 1024 * 1024;
const CHUNK_BYTES = 8 * 1024 * 1024;

function adminView(row: Row & { links?: { id: string; token: string; title: string; expiresAt: Date | null; passwordHash: string | null; createdAt: Date }[] }) {
  return {
    id: row.id,
    name: row.name,
    sourceName: row.sourceName,
    sourceKind: row.sourceKind,
    status: row.status,
    progress: row.progress,
    step: row.step,
    error: row.error,
    sizes: row.sizes,
    stats: row.stats,
    layers: row.layers,
    settings: settingsOf(row.settings),
    pieceSlug: row.pieceSlug,
    createdAt: row.createdAt,
    preview: row.status === "ready" ? publicModel(row, Math.floor(Date.now() / 1000) + 12 * 3600) : null,
    links: (row.links ?? []).map((l) => ({ id: l.id, token: l.token, title: l.title, expiresAt: l.expiresAt, hasPassword: Boolean(l.passwordHash), createdAt: l.createdAt })),
  };
}

models.post("/admin/models/uploads", requireAdmin, (req, res) => {
  const body = z.object({ name: z.string().min(1).max(200), size: z.number().int().positive() }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Fichier invalide." });
    return;
  }
  const ext = path.extname(body.data.name).toLowerCase();
  if (!KINDS[ext]) {
    res.status(415).json({ error: "Formats acceptés : .3dm (Rhino), .glb, .stl." });
    return;
  }
  if (body.data.size > MAX_BYTES) {
    res.status(413).json({ error: "Fichier trop lourd (800 Mo au plus)." });
    return;
  }
  const uploadId = randomBytes(12).toString("hex");
  storage.startUpload(uploadId);
  res.status(201).json({ uploadId, chunkBytes: CHUNK_BYTES });
});

models.put("/admin/models/uploads/:uploadId", requireAdmin, express.raw({ type: () => true, limit: CHUNK_BYTES + 1024 }), (req, res) => {
  const uploadId = String(req.params.uploadId);
  const offset = Number(req.query.offset ?? -1);
  const have = safely(() => storage.uploadSize(uploadId), -1);
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
  if (have + buf.length > MAX_BYTES) {
    storage.removeUpload(uploadId);
    res.status(413).json({ error: "Fichier trop lourd (800 Mo au plus)." });
    return;
  }
  res.json({ received: storage.appendUpload(uploadId, buf) });
});

models.post("/admin/models/uploads/:uploadId/complete", requireAdmin, async (req, res) => {
  const uploadId = String(req.params.uploadId);
  const body = z.object({ name: z.string().min(1).max(200), size: z.number().int().positive() }).safeParse(req.body);
  const ext = body.success ? path.extname(body.data.name).toLowerCase() : "";
  const have = safely(() => storage.uploadSize(uploadId), -1);
  if (!body.success || !KINDS[ext] || have !== body.data.size) {
    res.status(400).json({ error: "Le fichier n'est pas arrivé en entier, recommencez." });
    return;
  }
  const name = path.basename(body.data.name, path.extname(body.data.name));
  const row = await prisma.model3D.create({ data: { name, sourceName: body.data.name, sourceKind: KINDS[ext]!, status: "queued", settings: DEFAULT_SETTINGS } });
  storage.adopt(uploadId, row.id, ext.slice(1));
  enqueue(row.id);
  res.status(201).json({ id: row.id });
});

models.get("/admin/models", requireAdmin, async (_req, res) => {
  const rows = await prisma.model3D.findMany({ orderBy: { createdAt: "desc" }, include: { links: true } });
  res.json({ items: rows.map(adminView) });
});

models.get("/admin/models/:id", requireAdmin, async (req, res) => {
  const row = await prisma.model3D.findUnique({ where: { id: String(req.params.id) }, include: { links: { orderBy: { createdAt: "desc" } } } });
  if (!row) {
    res.status(404).json({ error: "Modèle introuvable." });
    return;
  }
  res.json(adminView(row));
});

models.put("/admin/models/:id", requireAdmin, async (req, res) => {
  const body = z
    .object({
      name: z.string().trim().min(1).max(200),
      settings: SettingsSchema,
      pieceSlug: z
        .string()
        .max(200)
        .nullable()
        .transform((v) => (v && v.trim() ? v.trim() : null)),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Réglages invalides : " + body.error.issues.map((i) => i.path.join(".")).join(", ") });
    return;
  }
  const id = String(req.params.id);
  // One model per piece: the one chosen here replaces the one the piece had.
  const slug = body.data.pieceSlug;
  const row = await prisma
    .$transaction([...(slug ? [prisma.model3D.updateMany({ where: { pieceSlug: slug, id: { not: id } }, data: { pieceSlug: null } })] : []), prisma.model3D.update({ where: { id }, data: body.data })])
    .catch(() => null);
  if (!row) {
    res.status(404).json({ error: "Modèle introuvable." });
    return;
  }
  await rememberLayers(body.data.settings);
  res.json({ ok: true });
});

/** The model shown on the page of a piece, chosen from the piece (null: none). One model per piece. */
models.put("/admin/pieces/:slug/model", requireAdmin, async (req, res) => {
  const slug = String(req.params.slug);
  const body = z.object({ modelId: z.string().min(1).max(64).nullable() }).safeParse(req.body);
  if (!body.success || !/^[a-z0-9-]{1,200}$/.test(slug)) {
    res.status(400).json({ error: "Choix invalide." });
    return;
  }
  const { modelId } = body.data;
  const done = await prisma
    .$transaction([prisma.model3D.updateMany({ where: { pieceSlug: slug, ...(modelId ? { id: { not: modelId } } : {}) }, data: { pieceSlug: null } }), ...(modelId ? [prisma.model3D.update({ where: { id: modelId }, data: { pieceSlug: slug } })] : [])])
    .catch(() => null);
  if (!done) {
    res.status(404).json({ error: "Modèle introuvable." });
    return;
  }
  res.json({ ok: true });
});

models.post("/admin/models/:id/poster", requireAdmin, express.raw({ type: () => true, limit: "6mb" }), async (req, res) => {
  const id = String(req.params.id);
  const buf: unknown = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0 || !String(req.headers["content-type"]).startsWith("image/webp")) {
    res.status(400).json({ error: "Image invalide." });
    return;
  }
  const row = await prisma.model3D.findUnique({ where: { id } });
  if (!row) {
    res.status(404).json({ error: "Modèle introuvable." });
    return;
  }
  storage.write(id, "poster.webp", buf);
  await prisma.model3D.update({ where: { id }, data: { hasPoster: true } });
  res.json({ ok: true });
});

models.post("/admin/models/:id/reprocess", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const row = await prisma.model3D.update({ where: { id }, data: { status: "queued", progress: 0, error: null } }).catch(() => null);
  if (!row) {
    res.status(404).json({ error: "Modèle introuvable." });
    return;
  }
  enqueue(id);
  res.json({ ok: true });
});

models.delete("/admin/models/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  await prisma.model3D.delete({ where: { id } }).catch(() => null);
  storage.remove(id);
  res.json({ ok: true });
});

models.post("/admin/models/:id/links", requireAdmin, async (req, res) => {
  const body = z
    .object({
      title: z.string().trim().max(200).default(""),
      expiresAt: z.iso.datetime({ offset: true }).nullable().default(null),
      password: z.string().max(200).nullable().default(null),
    })
    .safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Lien invalide." });
    return;
  }
  const model = await prisma.model3D.findUnique({ where: { id: String(req.params.id) } });
  if (!model) {
    res.status(404).json({ error: "Modèle introuvable." });
    return;
  }
  let passwordHash: string | null = null;
  if (body.data.password) {
    const salt = randomBytes(16).toString("base64url");
    passwordHash = "scrypt$" + salt + "$" + (await scrypt(body.data.password, salt, 32)).toString("base64url");
  }
  const link = await prisma.viewLink.create({
    data: { token: randomBytes(24).toString("base64url"), modelId: model.id, title: body.data.title, expiresAt: body.data.expiresAt ? new Date(body.data.expiresAt) : null, passwordHash },
  });
  res.status(201).json({ id: link.id, token: link.token });
});

models.delete("/admin/links/:id", requireAdmin, async (req, res) => {
  await prisma.viewLink.delete({ where: { id: String(req.params.id) } }).catch(() => null);
  res.json({ ok: true });
});
