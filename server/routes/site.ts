import express, { Router, type NextFunction, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { PIECE_TYPES } from "../../src/data/types.js";
import { MakingSchema, MediaItemSchema, MediaListSchema, PressSchema, readCatalogue, SpecSchema, toBox, toPerson, toPiece, toStory } from "../catalogue.js";
import { prisma } from "../db.js";

/**
 * The API of the site, mounted on /api:
 *   GET  /catalogue          stories, people, pieces and boxes
 *   POST /contact            { name, email, message }
 *   POST /callback           { name, phone, interest }
 *   GET  /media/:id          a file uploaded from /admin
 * and the admin (/admin/...), behind ADMIN_PASSWORD.
 */
export const site = Router();

site.get("/health", (_req, res) => {
  res.json({ ok: true });
});

site.get("/catalogue", async (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.json(await readCatalogue());
});

/* ---------- Visitors ---------- */

const ContactIn = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  message: z.string().trim().min(1).max(5000),
  /** Honeypot: humans leave it empty. */
  company: z.string().max(0).optional(),
});

site.post("/contact", async (req, res) => {
  const p = ContactIn.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ error: "Please check the form and try again." });
    return;
  }
  const { name, email, message } = p.data;
  await prisma.contactMessage.create({ data: { name, email, message } });
  res.status(201).json({ ok: true });
});

const CallbackIn = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(5).max(40),
  interest: z.string().trim().max(200).optional(),
});

site.post("/callback", async (req, res) => {
  const p = CallbackIn.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ error: "Please check your name and number." });
    return;
  }
  await prisma.callbackRequest.create({ data: { name: p.data.name, phone: p.data.phone, interest: p.data.interest || null } });
  res.status(201).json({ ok: true });
});

site.get("/media/:id", async (req, res) => {
  const file = await prisma.mediaFile.findUnique({ where: { id: String(req.params.id) } });
  if (file === null) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const buf = Buffer.from(file.data, "base64");
  res.setHeader("Content-Type", file.mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Accept-Ranges", "bytes");
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
  if (m) {
    const start = m[1] ? Number(m[1]) : 0;
    const end = m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
    if (start <= end && start < buf.length) {
      res.status(206);
      res.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + buf.length);
      res.setHeader("Content-Length", String(end - start + 1));
      res.end(buf.subarray(start, end + 1));
      return;
    }
  }
  res.setHeader("Content-Length", String(buf.length));
  res.end(buf);
});

/* ---------- Admin ---------- */

function adminToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("berete-admin").digest("hex");
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = adminToken();
  const header = req.headers.authorization ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    res.status(401).json({ error: "Session expirée, reconnectez-vous." });
    return;
  }
  next();
}

site.post("/admin/login", async (req, res) => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    res.status(503).json({ error: "Le mot de passe admin n'est pas défini (ADMIN_PASSWORD dans le fichier .env)." });
    return;
  }
  const body = z.object({ password: z.string().max(200) }).safeParse(req.body);
  const given = Buffer.from(body.success ? body.data.password : "");
  const expected = Buffer.from(password);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    await new Promise((r) => setTimeout(r, 600));
    res.status(401).json({ error: "Mot de passe incorrect." });
    return;
  }
  res.json({ token: adminToken() });
});

function fileName(header: unknown): string {
  try {
    return decodeURIComponent(String(header ?? "")).slice(0, 200);
  } catch {
    return "";
  }
}

site.post("/admin/upload", requireAdmin, express.raw({ type: () => true, limit: "80mb" }), async (req, res) => {
  const buf: unknown = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    res.status(400).json({ error: "Fichier vide." });
    return;
  }
  const mime = String(req.headers["content-type"] ?? "application/octet-stream").split(";")[0].trim();
  if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
    res.status(415).json({ error: "Seules les photos et les vidéos sont acceptées." });
    return;
  }
  const name = fileName(req.headers["x-file-name"]);
  const file = await prisma.mediaFile.create({ data: { mime, name, size: buf.length, data: buf.toString("base64") } });
  res.status(201).json({ url: "/api/media/" + file.id, type: mime.startsWith("video/") ? "video" : "image" });
});

site.get("/admin/messages", requireAdmin, async (_req, res) => {
  const [messages, callbacks] = await Promise.all([
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.callbackRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  res.json({ messages, callbacks });
});

/* One editor per kind: stories, people, pieces, boxes. */

const Slug = z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/, "minuscules, chiffres et tirets");
const optText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null));
const Slugs = z.array(Slug).max(100).default([]);

const StoryIn = z.object({
  slug: Slug,
  title: z.string().trim().min(1).max(200),
  cover: z.string().max(500).default(""),
  media: MediaListSchema.default([]),
  people: Slugs,
  pieceSlug: optText(200),
  articleUrl: optText(500),
});

const PersonIn = z.object({
  slug: Slug,
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["player", "club", "personality"]).default("player"),
  number: z.number().int().min(0).max(999).nullable().default(null),
  club: optText(200),
  portrait: optText(500),
  bio: z.string().max(5000).default(""),
});

const PieceIn = z.object({
  slug: Slug,
  title: z.string().trim().min(1).max(200),
  type: z.enum(PIECE_TYPES),
  line: z.string().max(500).default(""),
  story: z.string().max(5000).default(""),
  client: optText(200),
  clientPublic: z.boolean().default(false),
  cover: MediaItemSchema,
  gallery: MediaListSchema.default([]),
  handover: MediaListSchema.default([]),
  specs: z.array(SpecSchema).max(40).default([]),
  press: z.array(PressSchema).max(20).default([]),
  people: Slugs,
  boxSlug: optText(200),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  making: MakingSchema.optional(),
});

const BoxIn = z.object({
  slug: Slug,
  name: z.string().trim().min(1).max(200),
  description: z.string().max(3000).default(""),
  images: MediaListSchema.default([]),
  pieceSlug: optText(200),
});

type Delegate = {
  findMany(args: object): Promise<{ id: string }[]>;
  create(args: { data: object }): Promise<{ id: string }>;
  update(args: { where: { id: string }; data: object }): Promise<{ id: string }>;
  delete(args: { where: { id: string } }): Promise<unknown>;
  aggregate(args: object): Promise<{ _max: { sortOrder: number | null } }>;
};

const KINDS: Record<string, { schema: z.ZodType<object>; table: () => Delegate; view: (row: never) => object }> = {
  stories: { schema: StoryIn, table: () => prisma.story as unknown as Delegate, view: toStory },
  people: { schema: PersonIn, table: () => prisma.person as unknown as Delegate, view: toPerson },
  pieces: { schema: PieceIn, table: () => prisma.piece as unknown as Delegate, view: toPiece },
  boxes: { schema: BoxIn, table: () => prisma.box as unknown as Delegate, view: toBox },
};

function kindOf(req: Request, res: Response) {
  const kind = KINDS[String(req.params.kind)];
  if (!kind) res.status(404).json({ error: "Rubrique inconnue." });
  return kind;
}

function invalid(res: Response, error: z.ZodError): void {
  res.status(400).json({ error: "Formulaire incomplet ou invalide : " + error.issues.map((i) => i.path.join(".") || "champ").join(", ") + "." });
}

async function guard(res: Response, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "P2002") {
      res.status(409).json({ error: "Cette adresse (slug) est déjà utilisée, choisissez-en une autre." });
      return;
    }
    if (code === "P2025") {
      res.status(404).json({ error: "Élément introuvable, il a peut-être déjà été supprimé." });
      return;
    }
    throw error;
  }
}

site.get("/admin/:kind", requireAdmin, async (req, res) => {
  const kind = kindOf(req, res);
  if (!kind) return;
  const rows = await kind.table().findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  res.json({ items: rows.map((r) => ({ id: r.id, ...kind.view(r as never) })) });
});

site.post("/admin/:kind", requireAdmin, async (req, res) => {
  const kind = kindOf(req, res);
  if (!kind) return;
  const p = kind.schema.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const last = await kind.table().aggregate({ _max: { sortOrder: true } });
    const row = await kind.table().create({ data: { ...p.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    res.status(201).json({ id: row.id });
  });
});

site.post("/admin/:kind/reorder", requireAdmin, async (req, res) => {
  const kind = kindOf(req, res);
  if (!kind) return;
  const p = z.object({ ids: z.array(z.string().min(1)).max(1000) }).safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    for (const [i, id] of p.data.ids.entries()) await kind.table().update({ where: { id }, data: { sortOrder: i + 1 } });
    res.json({ ok: true });
  });
});

site.put("/admin/:kind/:id", requireAdmin, async (req, res) => {
  const kind = kindOf(req, res);
  if (!kind) return;
  const p = kind.schema.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    await kind.table().update({ where: { id: String(req.params.id) }, data: p.data });
    res.json({ ok: true });
  });
});

site.delete("/admin/:kind/:id", requireAdmin, async (req, res) => {
  const kind = kindOf(req, res);
  if (!kind) return;
  await guard(res, async () => {
    await kind.table().delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  });
});
