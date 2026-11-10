/*
 * The private space of the jeweller's clients (/vip), mounted on /api:
 *   POST /vip/login   { code }     enter with the access code
 *   POST /vip/link    { token }    enter with the personal link (/vip/<token>)
 *   GET  /vip/me                   the client and his 3D pieces ({ state: "out" } when not entered)
 *   POST /vip/logout
 * and the admin (/admin/clients...): clients, their pieces, their code.
 * The session is a signed cookie (30 days, httpOnly). Answers are 200 with a
 * state (no error in the console of the page).
 */
import { Router, type Request, type Response } from "express";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.js";
import { serverSecret } from "../secret.js";
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

vip.post("/vip/login", async (req, res) => {
  noStore(res);
  const body = z.object({ code: z.string().max(40) }).safeParse(req.body);
  const client = body.success && body.data.code.replace(/[^0-9A-Za-z]/g, "").length >= 8 ? await prisma.client.findUnique({ where: { codeKey: codeKey(body.data.code) } }) : null;
  if (!client) {
    await new Promise((r) => setTimeout(r, 700));
    res.json({ state: "wrong" });
    return;
  }
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
  const client = id ? await prisma.client.findUnique({ where: { id }, include: { models: { include: { model: true }, orderBy: { createdAt: "desc" } } } }) : null;
  if (!client) {
    res.json({ state: "out" });
    return;
  }
  await prisma.client.update({ where: { id: client.id }, data: { lastSeenAt: new Date() } });
  // The files open for a day.
  const exp = Math.floor(Date.now() / 1000 / 3600) * 3600 + 86400;
  res.json({ state: "ok", name: client.name, pieces: client.models.filter((m) => m.model.status === "ready").map((m) => publicModel(m.model, exp)) });
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
  const rows = await prisma.client.findMany({ orderBy: { createdAt: "desc" }, include: { models: true } });
  res.json({ items: rows.map((c) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, token: c.token, lastSeenAt: c.lastSeenAt, createdAt: c.createdAt, modelIds: c.models.map((m) => m.modelId) })) });
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
  await prisma.client.delete({ where: { id: String(req.params.id) } }).catch(() => null);
  res.json({ ok: true });
});
