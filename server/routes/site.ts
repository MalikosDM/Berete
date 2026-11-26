import express, { Router, type NextFunction, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { HOUSE_PHOTO_PLACES } from "../../src/data/house.js";
import { publicCatalogue } from "../../src/data/relations.js";
import { cleanAtelier } from "../../src/data/atelier.js";
import { cleanAngles } from "../../src/data/angles.js";
import { cleanDetailPoints } from "../../src/data/details3d.js";
import { cleanShowcase } from "../../src/data/showcase.js";
import { cleanTheme } from "../../src/data/themes.js";
import { PIECE_TYPES } from "../../src/data/types.js";
import { defaultCatalogue } from "../../src/data/catalogue.js";
import { DetailSchema, MakingSchema, MediaItemSchema, MediaListSchema, PressSchema, readCatalogue, readHouse, SpecSchema, toBox, toPerson, toPiece, toStory, TranslationsSchema } from "../catalogue.js";
import { prisma } from "../db.js";
import { Prisma } from "../generated/prisma/client.js";
import { grantAccess } from "../access-state.js";
import { alertHouse } from "../alerts.js";
import { serverSecret } from "../secret.js";
import { limiter } from "../security.js";

/**
 * The API of the site, mounted on /api:
 *   GET  /catalogue          stories, people, the published pieces, boxes and the photos of The House
 *   POST /contact            { name, email, instagram?, message, photos? (up to 6: { name, type, data in base64 }) }
 *   POST /callback           { name, phone, interest }
 *   GET  /media/:id          a file uploaded from /admin
 * and the admin (/admin/...), behind ADMIN_PASSWORD.
 */
export const site = Router();

/** The check of the server (deploy/update.sh, Docker): the base answers. */
site.get("/health", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false });
  }
});

site.get("/catalogue", async (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  // The visitors never receive the unpublished pieces (removed from the catalogue, drafts): the admin reads them.
  res.json(publicCatalogue(await readCatalogue()));
});

/* ---------- Visitors ---------- */

/** 5 forms in 10 minutes per visitor (beyond, the page offers WhatsApp, the request already written). */
const formTries = limiter(5, 10);

const Language = z.enum(["en", "fr", "es", "de", "nl", "ar"]).catch("en").default("en");

/** The photos of a message: at most 6, each at most 4 MB (the browser makes them lighter first: about 0.3 to 1.5 MB). */
export const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;

const PhotoIn = z.object({
  name: z.string().max(200).catch(""),
  type: z.enum(PHOTO_TYPES),
  /** The file in base64 (without the "data:" prefix). */
  data: z.string().min(16).max(Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 4),
});

const ContactIn = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  instagram: z.string().max(200).optional(),
  message: z.string().trim().min(1).max(5000),
  photos: z.array(PhotoIn).max(MAX_PHOTOS).default([]),
  /** Honeypot: humans leave it empty. */
  company: z.string().max(0).optional(),
  /** When the form was opened (ms since 1970): a form sent in less than 3 seconds is a robot. */
  startedAt: z.number().int().positive().optional(),
  /** The language of the page: the answer is written in it. */
  language: Language,
});

/** What the first bytes of a file say it is: a photo the house can open, else null (anything else is refused). */
function photoKind(buf: Buffer): (typeof PHOTO_TYPES)[number] | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (buf.toString("latin1", 4, 8) === "ftyp" && /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1|heif)$/.test(buf.toString("latin1", 8, 12))) return "image/heic";
  return null;
}

site.post("/contact", async (req, res) => {
  if (!formTries.hit(req)) {
    res.status(429).json({ error: "Too many requests, please try again later." });
    return;
  }
  const p = ContactIn.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ error: "Please check the form and try again." });
    return;
  }
  const { name, email, message, language, startedAt } = p.data;
  // A robot (filled in less than 3 seconds): thanked like anyone, never kept.
  if (startedAt !== undefined && Date.now() - startedAt < 3000) {
    res.status(201).json({ ok: true });
    return;
  }
  const photos: { name: string; mime: string; data: Buffer }[] = [];
  for (const photo of p.data.photos) {
    const data = Buffer.from(photo.data, "base64");
    const mime = photoKind(data);
    if (!mime || data.length > MAX_PHOTO_BYTES) {
      res.status(400).json({ error: "Please check the photos and try again." });
      return;
    }
    photos.push({ name: photo.name.replace(/[\r\n/\\]+/g, " ").trim().slice(0, 120) || "photo", mime, data });
  }
  // A handle ("@name", a link to the profile) kept as its name; anything else as it was written.
  const instagram = instagramHandle(p.data.instagram ?? null) ?? (p.data.instagram?.trim().slice(0, 100) || null);
  const saved = await prisma.contactMessage.create({
    data: {
      name,
      email,
      instagram,
      message,
      language,
      photos: { create: photos.map((photo, position) => ({ position, name: photo.name, mime: photo.mime, size: photo.data.length, data: new Uint8Array(photo.data) })) },
    },
  });
  alertHouse({ kind: "message", id: saved.id, name, email, instagram, message, language, photos });
  res.status(201).json({ ok: true });
});

const CallbackIn = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().trim().min(5).max(40),
  interest: z.string().trim().max(200).optional(),
  language: Language,
});

site.post("/callback", async (req, res) => {
  if (!formTries.hit(req)) {
    res.status(429).json({ error: "Too many requests, please try again later." });
    return;
  }
  const p = CallbackIn.safeParse(req.body);
  if (!p.success) {
    res.status(400).json({ error: "Please check your name and number." });
    return;
  }
  await prisma.callbackRequest.create({ data: { name: p.data.name, phone: p.data.phone, interest: p.data.interest || null, language: p.data.language } });
  alertHouse({ kind: "callback", name: p.data.name, phone: p.data.phone, interest: p.data.interest || null, language: p.data.language });
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

/** How long an admin session lasts: a working day, then the password again. */
const ADMIN_HOURS = 12;
/** 5 wrong passwords, then 15 minutes to wait (per visitor). */
const adminTries = limiter(5, 15);

/**
 * The key of the admin sessions: the secret of the server and the password. A new password closes every session
 * opened with the old one.
 */
function adminKey(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", serverSecret()).update("berete-admin:" + password).digest("hex");
}

/** A session token: "<expiry in seconds>.<signature>". */
function adminToken(exp: number): string | null {
  const key = adminKey();
  return key === null ? null : exp + "." + createHmac("sha256", key).update("admin-session:" + exp).digest("base64url");
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const exp = Number(given.split(".")[0]);
  const expected = Number.isInteger(exp) && exp > Date.now() / 1000 ? adminToken(exp) : null;
  if (!expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
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
  if (!adminTries.allowed(req)) {
    const minutes = adminTries.wait(req);
    res.status(429).json({ error: "Trop d'essais. Réessayez dans " + minutes + (minutes > 1 ? " minutes." : " minute.") });
    return;
  }
  const body = z.object({ password: z.string().max(200) }).safeParse(req.body);
  const given = Buffer.from(body.success ? body.data.password : "");
  const expected = Buffer.from(password);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    adminTries.hit(req);
    await new Promise((r) => setTimeout(r, 600));
    res.status(401).json({ error: "Mot de passe incorrect." });
    return;
  }
  adminTries.clear(req);
  // The admin sees the site under construction on this device (server/access.ts).
  grantAccess(req, res);
  res.json({ token: adminToken(Math.floor(Date.now() / 1000) + ADMIN_HOURS * 3600) });
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
    prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { photos: { select: { id: true, name: true, mime: true, size: true, position: true }, orderBy: { position: "asc" } } },
    }),
    prisma.callbackRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);
  res.json({ messages, callbacks });
});

/** A photo of a message: for the admin only (never cached, never public). */
site.get("/admin/messages/:id/photos/:photoId", requireAdmin, async (req, res) => {
  const photo = await prisma.contactPhoto.findFirst({ where: { id: String(req.params.photoId), messageId: String(req.params.id) } });
  if (!photo) {
    res.status(404).json({ error: "Photo introuvable." });
    return;
  }
  res.setHeader("Content-Type", photo.mime);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline; filename*=UTF-8''" + encodeURIComponent(photo.name));
  res.end(Buffer.from(photo.data));
});

/** A message deleted from the admin, with its photos. */
site.delete("/admin/messages/:id", requireAdmin, async (req, res) => {
  const { count } = await prisma.contactMessage.deleteMany({ where: { id: String(req.params.id) } });
  if (count === 0) {
    res.status(404).json({ error: "Message introuvable, il a peut-être déjà été supprimé." });
    return;
  }
  res.json({ ok: true });
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

/** "@name", "instagram.com/name/" or "https://www.instagram.com/name?igsh=…" -> "name"; null when nothing is left. */
function instagramHandle(v: string | null): string | null {
  if (!v) return null;
  const handle = v
    .replace(/^https?:\/\//i, "")
    .replace(/^(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .split(/[/?#]/)[0]!
    .trim();
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle : null;
}
const Slugs = z.array(Slug).max(100).default([]);

const StoryIn = z.object({
  slug: Slug,
  title: z.string().trim().min(1).max(200),
  cover: z.string().max(500).default(""),
  media: MediaListSchema.default([]),
  people: Slugs,
  pieceSlug: optText(200),
  articleUrl: optText(500),
  translations: TranslationsSchema.default({}),
});

const PersonIn = z.object({
  slug: Slug,
  name: z.string().trim().min(1).max(200),
  kind: z.enum(["player", "club", "personality"]).default("player"),
  number: z.number().int().min(0).max(999).nullable().default(null),
  club: optText(200),
  portrait: optText(500),
  /** The username alone: "@name" or a profile address become "name". */
  instagram: optText(200)
    .refine((v) => v === null || instagramHandle(v) !== null, { message: "Instagram : le pseudo seul, sans espace (ex. beretejewellers)." })
    .transform((v) => instagramHandle(v)),
  bio: z.string().max(5000).default(""),
  translations: TranslationsSchema.default({}),
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
  details: z.array(DetailSchema).max(30).default([]),
  press: z.array(PressSchema).max(20).default([]),
  people: Slugs,
  boxSlug: optText(200),
  featured: z.boolean().default(false),
  draft: z.boolean().default(false),
  published: z.boolean().default(true),
  /** The universe of the page: only the known parts are kept; none: the universe of the house. */
  theme: z
    .unknown()
    .optional()
    .transform((v) => cleanTheme(v) ?? Prisma.DbNull),
  /** How the opening shows the jewel: one view or the showcase, the views and their order; none: by the rule. */
  showcase: z
    .unknown()
    .optional()
    .transform((v) => cleanShowcase(v) ?? Prisma.DbNull),
  /** Its atelier: the film of each kind (or none) and the image before it plays; none: its own films. */
  atelier: z
    .unknown()
    .optional()
    .transform((v) => cleanAtelier(v) ?? Prisma.DbNull),
  /** "The Art of Detail" in 3D: the points of its model tied to its details; none: none placed. */
  detailPoints: z
    .unknown()
    .optional()
    .transform((v) => cleanDetailPoints(v) ?? Prisma.DbNull),
  /** The text of each photo of "Every Angle", by its address: a title, a text, their translations. */
  angles: z
    .unknown()
    .optional()
    .transform((v) => cleanAngles(v)),
  making: MakingSchema.optional(),
  translations: TranslationsSchema.default({}),
});

const BoxIn = z.object({
  slug: Slug,
  name: z.string().trim().min(1).max(200),
  description: z.string().max(3000).default(""),
  images: MediaListSchema.default([]),
  pieceSlug: optText(200),
  published: z.boolean().default(true),
  translations: TranslationsSchema.default({}),
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

/* The photos of The House (before the editors: "house" is not one of their kinds). */

const HOUSE_KEYS = new Set(HOUSE_PHOTO_PLACES.map((p) => p.key));

site.get("/admin/house", requireAdmin, async (_req, res) => {
  res.json({ places: HOUSE_PHOTO_PLACES, photos: await readHouse() });
});

site.put("/admin/house/:key", requireAdmin, async (req, res) => {
  const key = String(req.params.key);
  if (!HOUSE_KEYS.has(key)) {
    res.status(404).json({ error: "Emplacement inconnu." });
    return;
  }
  const p = z.object({ photo: MediaItemSchema.nullable() }).safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  if (p.data.photo === null) await prisma.housePhoto.deleteMany({ where: { key } });
  else await prisma.housePhoto.upsert({ where: { key }, create: { key, photo: p.data.photo }, update: { photo: p.data.photo } });
  res.json({ ok: true });
});

/* The page "Détourages": a cut-out view excluded (or brought back) everywhere, without touching the rest of the piece. */

site.put("/admin/cutouts/:slug", requireAdmin, async (req, res) => {
  const p = z.object({ excluded: z.array(z.string().regex(/^[a-z0-9-]{1,40}$/)).max(40) }).safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  const piece = await prisma.piece.findUnique({ where: { slug: String(req.params.slug) }, select: { id: true, showcase: true } });
  if (!piece) {
    res.status(404).json({ error: "Pièce introuvable." });
    return;
  }
  const next = cleanShowcase({ ...(cleanShowcase(piece.showcase) ?? {}), excluded: p.data.excluded });
  await prisma.piece.update({ where: { id: piece.id }, data: { showcase: next ?? Prisma.DbNull } });
  res.json({ ok: true, showcase: next });
});

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
    // From now on his order stays, whatever the catalogue brings (server/catalogue.ts); back to the order of the catalogue, the
    // catalogue leads again.
    const kindName = String(req.params.kind);
    if (kindName === "pieces" || kindName === "boxes") {
      const key = "admin-ordered:" + kindName;
      const rows = kindName === "pieces" ? await prisma.piece.findMany({ select: { id: true, slug: true } }) : await prisma.box.findMany({ select: { id: true, slug: true } });
      const slugOf = new Map(rows.map((r) => [r.id, r.slug]));
      const listed = (kindName === "pieces" ? defaultCatalogue.pieces : defaultCatalogue.boxes).map((x) => x.slug);
      const given = p.data.ids.map((id) => slugOf.get(id)).filter((x): x is string => x !== undefined && listed.includes(x));
      const catalogueOrder = listed.filter((x) => given.includes(x));
      if (given.join("|") === catalogueOrder.join("|")) await prisma.serverSetting.deleteMany({ where: { key } });
      else await prisma.serverSetting.upsert({ where: { key }, create: { key, value: "1" }, update: { value: "1" } });
    }
    res.json({ ok: true });
  });
});

site.put("/admin/:kind/:id", requireAdmin, async (req, res) => {
  const kind = kindOf(req, res);
  if (!kind) return;
  const p = kind.schema.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const id = String(req.params.id);
    const before = req.params.kind === "pieces" ? await prisma.piece.findUnique({ where: { id }, select: { slug: true } }) : null;
    await kind.table().update({ where: { id }, data: p.data });
    // A piece that changes its address keeps its 3D model.
    const slug = (p.data as { slug?: string }).slug;
    if (before && slug && before.slug !== slug) await prisma.model3D.updateMany({ where: { pieceSlug: before.slug }, data: { pieceSlug: slug } });
    res.json({ ok: true });
  });
});

site.delete("/admin/:kind/:id", requireAdmin, async (req, res) => {
  const kind = kindOf(req, res);
  if (!kind) return;
  await guard(res, async () => {
    const id = String(req.params.id);
    const before = req.params.kind === "pieces" ? await prisma.piece.findUnique({ where: { id }, select: { slug: true } }) : null;
    await kind.table().delete({ where: { id } });
    // Its 3D model stays in the admin, free for another piece.
    if (before) await prisma.model3D.updateMany({ where: { pieceSlug: before.slug }, data: { pieceSlug: null } });
    res.json({ ok: true });
  });
});
