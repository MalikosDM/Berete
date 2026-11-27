/*
 * The sign-in of the clients of The Private Atelier (27/11/2026): sessions kept in the base (revocable: by the client, by
 * Berete, all of them when the access is cut), a signed cookie that carries only the id of the session, the log of the
 * sign-ins, the challenges of the second factor. Older spaces (/vip with a link or an access code) open a session too.
 */
import { createHmac } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../db.js";
import { serverSecret } from "../secret.js";
import { visitor } from "../security.js";
import { sameText } from "./crypto.js";

export const COOKIE = "bj_client";
const SESSION_DAYS = 30;

function sign(value: string): string {
  return createHmac("sha256", serverSecret()).update("atelier-session:" + value).digest("base64url");
}

export function agentOf(req: Request): string {
  return String(req.headers["user-agent"] ?? "").slice(0, 300);
}

/** Opens a session for a client on this device. */
export async function openClientSession(req: Request, res: Response, clientId: string): Promise<void> {
  const session = await prisma.clientSession.create({
    data: { clientId, ip: visitor(req), userAgent: agentOf(req), expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) },
  });
  const value = session.id;
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.append("Set-Cookie", COOKIE + "=" + value + "." + sign(value) + "; Path=/; Max-Age=" + SESSION_DAYS * 86400 + "; HttpOnly; SameSite=Lax" + (secure ? "; Secure" : ""));
}

export function closeCookie(req: Request, res: Response): void {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.append("Set-Cookie", COOKIE + "=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax" + (secure ? "; Secure" : ""));
}

/** The id of the session in the cookie, when its signature is right. */
export function cookieSession(req: Request): string | null {
  const cookie = (req.headers.cookie ?? "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(COOKIE + "="));
  if (!cookie) return null;
  const [id = "", sig = ""] = cookie.slice(COOKIE.length + 1).split(".");
  if (!/^[a-z0-9]{10,40}$/i.test(id)) return null;
  return sameText(sig, sign(id)) ? id : null;
}

export type ClientSessionInfo = { sessionId: string; clientId: string; email: string; name: string };

/** The client of this request: his session alive (not revoked, not expired) and his access open. */
export async function currentClient(req: Request): Promise<ClientSessionInfo | null> {
  const id = cookieSession(req);
  if (!id) return null;
  const s = await prisma.clientSession.findUnique({ where: { id }, include: { client: { select: { id: true, name: true, loginEmail: true, email: true, accessEnabled: true } } } });
  if (!s || s.revokedAt || s.expiresAt.getTime() < Date.now() || !s.client.accessEnabled) return null;
  // The last time it was seen (at most once a minute).
  if (Date.now() - s.lastSeenAt.getTime() > 60_000) await prisma.clientSession.update({ where: { id }, data: { lastSeenAt: new Date() } });
  return { sessionId: s.id, clientId: s.client.id, email: s.client.loginEmail ?? s.client.email ?? "", name: s.client.name };
}

declare module "express-serve-static-core" {
  interface Request {
    atelierClient?: ClientSessionInfo;
  }
}

/** Only a client signed in; otherwise the same quiet answer everywhere ({ state: "out" }, no error in the page). */
export async function requireClient(req: Request, res: Response, next: NextFunction): Promise<void> {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const c = await currentClient(req);
  if (!c) {
    res.status(401).json({ state: "out" });
    return;
  }
  req.atelierClient = c;
  next();
}

export async function logLogin(req: Request, event: string, clientId: string | null, email = ""): Promise<void> {
  await prisma.clientLogin.create({ data: { clientId, email: email.slice(0, 200), event, ip: visitor(req), userAgent: agentOf(req) } });
}

/* ---------- The challenge of the second factor (after the password or a sign-in link) ---------- */

const CHALLENGE_MINUTES = 10;

export function challengeFor(clientId: string): string {
  const exp = Math.floor(Date.now() / 1000) + CHALLENGE_MINUTES * 60;
  const value = clientId + "." + exp;
  return value + "." + createHmac("sha256", serverSecret()).update("atelier-2fa:" + value).digest("base64url");
}

export function challengeClient(challenge: string): string | null {
  const [id = "", exp = "", sig = ""] = challenge.split(".");
  if (!/^[a-z0-9]{10,40}$/i.test(id) || !/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return null;
  const expected = createHmac("sha256", serverSecret()).update("atelier-2fa:" + id + "." + exp).digest("base64url");
  return sameText(sig, expected) ? id : null;
}
