/*
 * Share links sealed on the admin's device (26/11/2026), like those of iJewel3D: /s/<token>.
 * The admin page (src/pages/admin/SealedShare.tsx) downloads the two versions of a model, packs them with its name and
 * settings, and encrypts the whole in the browser (AES-256-GCM, src/lib/sealed.ts). The key is derived from an optional
 * password (PBKDF2-SHA-256) or is a random key carried only in the #fragment of the link: neither the password nor the
 * key ever reach this server. It keeps the ciphertext (storage/shares/<token>.bin) and what the page needs to decrypt it.
 *
 * Mounted at the root of the app (server/index.ts), next to the other routers:
 *   POST   /api/admin/shares                     a new link (model, days, hasPassword, salt, iv, iterations, verifier, bytes)
 *   PUT    /api/admin/shares/:id/blob?offset=N   the ciphertext, by pieces of 8 MB at most
 *   POST   /api/admin/shares/:id/complete        the last piece arrived: the link opens
 *   GET    /api/admin/shares?model=<id>          the links of a model
 *   DELETE /api/admin/shares/:id                 a link and its file
 *   GET    /api/s/:token                         public: what the page needs to decrypt (nothing about the piece itself)
 *   GET    /api/s/:token/blob                    public: the ciphertext
 *   GET    /s/:token (and /<lang>/s/:token)      the page (the empty page of the app), for a visitor who has entered the
 *                                               site; while under construction the others get it from the gate
 *                                               (server/access.ts).
 * An expired link answers 410 and its file is deleted (also checked at start and every hour); its row is kept 30 days
 * more so that the page can say "expired" rather than "not found".
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import express, { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { limiter } from "../security.js";
import { requireAdmin } from "./site.js";

export const shares = Router();

/* ---------- Files: storage/shares/<token>.bin (the ciphertext), <token>.part while it arrives ---------- */

const ROOT = path.resolve(process.env.MODELS_DIR ?? "storage");
const SHARES = path.join(ROOT, "shares");
const TOKEN = /^[A-Za-z0-9_-]{32}$/;
const B64 = /^[A-Za-z0-9_-]+$/;

const DAYS = [1, 3, 7, 14, 30] as const;
const MAX_BYTES = 400 * 1024 * 1024;
const CHUNK_BYTES = 8 * 1024 * 1024;
/** At least the iterations of OWASP's advice for PBKDF2-SHA-256 (210 000 when the page was written). */
const MIN_ITERATIONS = 210_000;
const MAX_ITERATIONS = 5_000_000;
const KEEP_EXPIRED_DAYS = 30;
const DAY = 24 * 3600 * 1000;

function check(token: string): string {
  if (!TOKEN.test(token)) throw new Error("Bad token");
  return token;
}

const files = {
  blob(token: string): string {
    return path.join(SHARES, check(token) + ".bin");
  },
  part(token: string): string {
    fs.mkdirSync(SHARES, { recursive: true });
    return path.join(SHARES, check(token) + ".part");
  },
  /** Size of the ciphertext when it has fully arrived, else -1. */
  ready(token: string): number {
    try {
      return fs.statSync(this.blob(token)).size;
    } catch {
      return -1;
    }
  },
  partSize(token: string): number {
    try {
      return fs.statSync(this.part(token)).size;
    } catch {
      return -1;
    }
  },
  remove(token: string): void {
    if (!TOKEN.test(token)) return;
    fs.rmSync(path.join(SHARES, token + ".bin"), { force: true });
    fs.rmSync(path.join(SHARES, token + ".part"), { force: true });
  },
};

/* ---------- Cleaning: expired files at once, their rows 30 days later, unfinished uploads after a day ---------- */

export async function cleanShares(): Promise<void> {
  const now = Date.now();
  const expired = await prisma.sealedShare.findMany({ where: { expiresAt: { lt: new Date(now) } }, select: { token: true } });
  for (const s of expired) files.remove(s.token);
  await prisma.sealedShare.deleteMany({ where: { expiresAt: { lt: new Date(now - KEEP_EXPIRED_DAYS * DAY) } } });
  // An upload left unfinished for a day: the link is forgotten.
  const stale = await prisma.sealedShare.findMany({ where: { createdAt: { lt: new Date(now - DAY) }, expiresAt: { gte: new Date(now) } }, select: { id: true, token: true } });
  for (const s of stale) {
    if (files.ready(s.token) >= 0) continue;
    files.remove(s.token);
    await prisma.sealedShare.delete({ where: { id: s.id } }).catch(() => null);
  }
  // A file without its row (a model deleted with its links, a link deleted while its file was in use).
  if (!fs.existsSync(SHARES)) return;
  const known = new Set((await prisma.sealedShare.findMany({ where: { expiresAt: { gte: new Date(now) } }, select: { token: true } })).map((s) => s.token));
  for (const name of fs.readdirSync(SHARES)) {
    const token = name.replace(/\.(?:bin|part)$/, "");
    if (!known.has(token)) fs.rmSync(path.join(SHARES, name), { force: true });
  }
}

function cleanLater(): void {
  cleanShares().catch((error: unknown) => console.error("Sealed shares: cleaning failed", error instanceof Error ? error.message : error));
}
setTimeout(cleanLater, 15_000).unref();
setInterval(cleanLater, 3600 * 1000).unref();

/** A link that exists (expired or not): the gate serves its page, which then says what it is (server/access.ts). */
export async function shareExists(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) return false;
  return (await prisma.sealedShare.findUnique({ where: { token }, select: { id: true } })) !== null;
}

/* ---------- The page ---------- */

const DIST = path.resolve(process.env.STATIC_DIR ?? "dist");

// The empty page of the app (it asks the API, then decrypts in the browser). Never indexed, never kept by a cache.
shares.get(/^\/(?:(?:fr|es|de|nl|ar)\/)?s\/[A-Za-z0-9_-]{32}\/?$/, (_req, res, next) => {
  const shell = path.join(DIST, "app.html");
  fs.stat(shell, (error) => (error ? next() : res.sendFile(shell, { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } })));
});

/* ---------- Visitors ---------- */

/** What a visitor may ask: 60 looks and 20 downloads per 10 minutes and per address (the machine itself is never limited). */
const looks = limiter(60, 10);
const downloads = limiter(20, 10);

function privateAnswer(res: Response): void {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Referrer-Policy", "no-referrer");
}

type Found = { state: "missing" } | { state: "expired" } | { state: "ok"; share: Awaited<ReturnType<typeof prisma.sealedShare.findUniqueOrThrow>> };

async function findShare(token: string): Promise<Found> {
  const share = TOKEN.test(token) ? await prisma.sealedShare.findUnique({ where: { token } }) : null;
  if (!share) return { state: "missing" };
  if (share.expiresAt.getTime() <= Date.now()) {
    files.remove(share.token);
    return { state: "expired" };
  }
  if (files.ready(share.token) !== share.bytes) return { state: "missing" };
  return { state: "ok", share };
}

function answerNotOk(res: Response, found: Found): boolean {
  if (found.state === "expired") {
    res.status(410).json({ state: "expired" });
    return true;
  }
  if (found.state === "missing") {
    res.status(404).json({ state: "missing" });
    return true;
  }
  return false;
}

shares.get("/api/s/:token", async (req, res) => {
  privateAnswer(res);
  if (!looks.hit(req)) {
    res.status(429).json({ state: "busy" });
    return;
  }
  const found = await findShare(String(req.params.token));
  if (answerNotOk(res, found) || found.state !== "ok") return;
  const { share } = found;
  res.json({ state: "ok", hasPassword: share.hasPassword, salt: share.salt, iv: share.iv, iterations: share.iterations, verifier: share.verifier, bytes: share.bytes, expiresAt: share.expiresAt });
});

shares.get("/api/s/:token/blob", async (req, res) => {
  privateAnswer(res);
  if (!downloads.hit(req)) {
    res.status(429).json({ state: "busy" });
    return;
  }
  const found = await findShare(String(req.params.token));
  if (answerNotOk(res, found) || found.state !== "ok") return;
  // Encrypted, so incompressible: sent as it is, with its length (the page shows a percentage).
  res.sendFile(files.blob(found.share.token), { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "no-store, no-transform" } });
});

/* ---------- Admin ---------- */

function adminRow(share: Awaited<ReturnType<typeof prisma.sealedShare.findUniqueOrThrow>>) {
  return { id: share.id, token: share.token, expiresAt: share.expiresAt, hasPassword: share.hasPassword, bytes: share.bytes, createdAt: share.createdAt, ready: files.ready(share.token) === share.bytes };
}

const NewShare = z
  .object({
    modelId: z.string().min(1).max(64),
    days: z
      .number()
      .int()
      .refine((d) => (DAYS as readonly number[]).includes(d))
      .default(7),
    hasPassword: z.boolean(),
    salt: z.string().max(64).default(""),
    iv: z.string().min(16).max(32).regex(B64),
    iterations: z.number().int().min(0).max(MAX_ITERATIONS).default(0),
    verifier: z.string().min(40).max(200).regex(B64),
    bytes: z.number().int().positive().max(MAX_BYTES),
  })
  .refine((v) => (v.hasPassword ? v.iterations >= MIN_ITERATIONS && v.salt.length >= 16 && B64.test(v.salt) : v.iterations === 0 && v.salt === ""), "password settings");

shares.post("/api/admin/shares", requireAdmin, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = NewShare.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Lien invalide." });
    return;
  }
  const { modelId, days, ...rest } = body.data;
  const model = await prisma.model3D.findUnique({ where: { id: modelId }, select: { status: true } });
  if (!model) {
    res.status(404).json({ error: "Modèle introuvable." });
    return;
  }
  if (model.status !== "ready") {
    res.status(409).json({ error: "Ce modèle n'est pas prêt : il ne peut pas être partagé." });
    return;
  }
  const share = await prisma.sealedShare.create({ data: { ...rest, modelId, token: randomBytes(24).toString("base64url"), expiresAt: new Date(Date.now() + days * DAY) } });
  fs.writeFileSync(files.part(share.token), Buffer.alloc(0));
  res.status(201).json({ id: share.id, token: share.token, chunkBytes: CHUNK_BYTES, expiresAt: share.expiresAt });
});

async function adminShare(req: Request, res: Response) {
  const share = await prisma.sealedShare.findUnique({ where: { id: String(req.params.id) } });
  if (!share) res.status(404).json({ error: "Lien introuvable, recommencez." });
  return share;
}

shares.put("/api/admin/shares/:id/blob", requireAdmin, express.raw({ type: () => true, limit: CHUNK_BYTES + 1024 }), async (req, res) => {
  const share = await adminShare(req, res);
  if (!share) return;
  const offset = Number(req.query.offset ?? -1);
  const have = files.partSize(share.token);
  if (have < 0) {
    res.status(409).json({ error: "Ce lien est déjà envoyé." });
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
  if (have + buf.length > share.bytes) {
    files.remove(share.token);
    await prisma.sealedShare.delete({ where: { id: share.id } }).catch(() => null);
    res.status(413).json({ error: "Envoi plus lourd que prévu, recommencez." });
    return;
  }
  fs.appendFileSync(files.part(share.token), buf);
  res.json({ received: have + buf.length });
});

shares.post("/api/admin/shares/:id/complete", requireAdmin, async (req, res) => {
  const share = await adminShare(req, res);
  if (!share) return;
  if (files.partSize(share.token) !== share.bytes) {
    res.status(400).json({ error: "Le fichier n'est pas arrivé en entier, recommencez." });
    return;
  }
  fs.renameSync(files.part(share.token), files.blob(share.token));
  res.json(adminRow(share));
});

shares.get("/api/admin/shares", requireAdmin, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const modelId = typeof req.query.model === "string" ? req.query.model.slice(0, 64) : "";
  const rows = await prisma.sealedShare.findMany({ where: modelId ? { modelId } : {}, orderBy: { createdAt: "desc" } });
  // A link whose upload is still going on (or was abandoned) is not listed.
  res.json({ items: rows.map(adminRow).filter((r) => r.ready || r.expiresAt.getTime() <= Date.now()) });
});

shares.delete("/api/admin/shares/:id", requireAdmin, async (req, res) => {
  const share = await prisma.sealedShare.findUnique({ where: { id: String(req.params.id) } });
  if (share) {
    files.remove(share.token);
    await prisma.sealedShare.delete({ where: { id: share.id } }).catch(() => null);
  }
  res.json({ ok: true });
});
