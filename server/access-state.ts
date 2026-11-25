/*
 * The settings of the site « under construction » (server/access.ts) and the cookie of the private access: in the base
 * (table ServerSetting, so in the nightly backups, kept through updates, reinstalls and restores):
 *   access.construction   "on" | "off"    (missing = on: the site never opens to the public by mistake)
 *   access.password       scrypt$<salt>$<hash>   only the fingerprint of the password, never the password
 */
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { prisma } from "./db.js";
import { serverSecret } from "./secret.js";

const CONSTRUCTION_KEY = "access.construction";
const PASSWORD_KEY = "access.password";
const COOKIE = "bj_access";
const DAYS = 180;
export const MIN_PASSWORD = 6;

type State = { construction: boolean; hash: string | null };
/** Closed until the base says otherwise: a base that cannot be read never opens the site. */
let state: State = { construction: true, hash: null };
let loadedAt = 0;
let loading: Promise<void> | null = null;

async function read(): Promise<State> {
  const rows = await prisma.serverSetting.findMany({ where: { key: { in: [CONSTRUCTION_KEY, PASSWORD_KEY] } } });
  const construction = rows.find((r) => r.key === CONSTRUCTION_KEY)?.value;
  return { construction: construction !== "off", hash: rows.find((r) => r.key === PASSWORD_KEY)?.value || null };
}

/** The settings from the base (at the start, after a change, and every few seconds: a change made in the Terminal). */
export async function loadAccess(): Promise<State> {
  loading ??= read()
    .then((s) => {
      state = s;
      loadedAt = Date.now();
    })
    .finally(() => {
      loading = null;
    });
  await loading.catch(() => undefined);
  return state;
}

export function refreshAccess(): void {
  if (Date.now() - loadedAt > 5000) void loadAccess();
}

export function accessState(): { construction: boolean; hasPassword: boolean } {
  return { construction: state.construction, hasPassword: state.hash !== null };
}

/* ---------- The password: only its fingerprint (scrypt, with a salt) ---------- */

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password.normalize("NFC"), salt, 32, { N: 16384, r: 8, p: 1 }, (e, key) => (e ? reject(e) : resolve(key))));
}

export async function matches(password: string, hash: string | null): Promise<boolean> {
  const [kind, salt = "", expected = ""] = (hash ?? "").split("$");
  if (kind !== "scrypt" || !salt || !expected) return false;
  const given = await scrypt(password, salt);
  const want = Buffer.from(expected, "base64url");
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function setPassword(password: string | null): Promise<void> {
  if (password === null) {
    await prisma.serverSetting.deleteMany({ where: { key: PASSWORD_KEY } });
  } else {
    const salt = randomBytes(16).toString("base64url");
    const value = "scrypt$" + salt + "$" + (await scrypt(password, salt)).toString("base64url");
    await prisma.serverSetting.upsert({ where: { key: PASSWORD_KEY }, create: { key: PASSWORD_KEY, value }, update: { value } });
  }
  await loadAccess();
}

export async function setConstruction(on: boolean): Promise<void> {
  const value = on ? "on" : "off";
  await prisma.serverSetting.upsert({ where: { key: CONSTRUCTION_KEY }, create: { key: CONSTRUCTION_KEY, value }, update: { value } });
  await loadAccess();
}

/* ---------- The cookies ---------- */

export function cookie(req: Request, name: string): string {
  const found = (req.headers.cookie ?? "").split(";").map((c) => c.trim()).find((c) => c.startsWith(name + "="));
  return found ? found.slice(name.length + 1) : "";
}

/** Signed with the secret of the server and the salt of the current password: a new password closes every device. */
function accessSig(exp: number): string {
  const generation = (state.hash ?? "none").split("$")[1] ?? "none";
  return createHmac("sha256", serverSecret()).update("site-access:" + exp + ":" + generation).digest("base64url");
}

export function valid(value: string, sig: (exp: number) => string): boolean {
  const [exp = "", given = ""] = value.split(".");
  const n = Number(exp);
  if (!Number.isInteger(n) || n < Date.now() / 1000) return false;
  const expected = sig(n);
  return given.length === expected.length && timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function setCookie(req: Request, res: Response, name: string, value: string, seconds: number): void {
  const secure = req.secure || req.headers["x-forwarded-proto"] === "https";
  res.append("Set-Cookie", name + "=" + value + "; Path=/; Max-Age=" + seconds + "; HttpOnly; SameSite=Lax" + (secure ? "; Secure" : ""));
}

/** Opens the site on this device for 180 days (the private access, or the admin once logged in). */
export function grantAccess(req: Request, res: Response): void {
  const exp = Math.floor(Date.now() / 1000) + DAYS * 86400;
  setCookie(req, res, COOKIE, exp + "." + accessSig(exp), DAYS * 86400);
}

export function hasAccess(req: Request): boolean {
  return valid(cookie(req, COOKIE), accessSig);
}
