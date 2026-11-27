/*
 * The secrets of The Private Atelier (27/11/2026): passwords kept as a fingerprint (scrypt and its salt, like the access
 * password of the site), one-time codes and tokens kept as a keyed fingerprint (HMAC with the secret of the server), the
 * secret of an authenticator app sealed with the secret of the server (AES-256-GCM), the codes of an authenticator app
 * (TOTP, RFC 6238: 6 digits, 30 seconds, SHA-1, the step before and after accepted), signed addresses of the files.
 */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { serverSecret } from "../secret.js";

function scrypt(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scryptCallback(password.normalize("NFC"), salt, 32, { N: 16384, r: 8, p: 1 }, (e, key) => (e ? reject(e) : resolve(key))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  return "scrypt$" + salt + "$" + (await scrypt(password, salt)).toString("base64url");
}

export async function passwordMatches(password: string, hash: string | null | undefined): Promise<boolean> {
  const [kind, salt = "", expected = ""] = (hash ?? "").split("$");
  if (kind !== "scrypt" || !salt || !expected) {
    // The same time whether the account exists or not.
    await scrypt(password, "no-account-here");
    return false;
  }
  const given = await scrypt(password, salt);
  const want = Buffer.from(expected, "base64url");
  return given.length === want.length && timingSafeEqual(given, want);
}

/**
 * A strong password: 12 characters at least, letters and digits (or signs), never a common or obvious one. Returns the
 * reason when it is not ("short", "simple", "common"), null when it is.
 */
export function weakPassword(password: string, email = ""): "short" | "simple" | "common" | null {
  if (password.length < 12) return "short";
  if (password.length > 200) return "simple";
  const kinds = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (kinds < 2 || new Set(password).size < 6) return "simple";
  const low = password.toLowerCase();
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (/^(password|motdepasse|azerty|qwerty|123456|berete|letmein|welcome)/.test(low) || (local.length >= 4 && low.includes(local))) return "common";
  return null;
}

/** A keyed fingerprint of a token or a code (what the base keeps). */
export function keyOf(purpose: string, value: string): string {
  return createHmac("sha256", serverSecret()).update("atelier:" + purpose + ":" + value).digest("base64url");
}

/** A random token for a link (32 bytes). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** A code of 6 digits sent by e-mail. */
export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function sameText(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ---------- The secret of an authenticator app, sealed ---------- */

function sealKey(): Buffer {
  return createHash("sha256").update("atelier-seal:" + serverSecret()).digest();
}

export function seal(text: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sealKey(), iv);
  const body = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}

export function unseal(value: string | null | undefined): string | null {
  try {
    const [iv, tag, body] = (value ?? "").split(".").map((p) => Buffer.from(p, "base64url"));
    if (!iv || !tag || !body) return null;
    const decipher = createDecipheriv("aes-256-gcm", sealKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/* ---------- TOTP (an authenticator app) ---------- */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function newTotpSecret(): string {
  const bytes = randomBytes(20);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Bytes(secret: string): Buffer {
  let bits = "";
  for (const c of secret.replace(/=+$/, "").toUpperCase()) {
    const v = BASE32.indexOf(c);
    if (v < 0) continue;
    bits += v.toString(2).padStart(5, "0");
  }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Bytes(secret)).update(counter).digest();
  const offset = mac[mac.length - 1]! & 0xf;
  const value = ((mac[offset]! & 0x7f) << 24) | (mac[offset + 1]! << 16) | (mac[offset + 2]! << 8) | mac[offset + 3]!;
  return String(value % 1_000_000).padStart(6, "0");
}

/** The step of a code that matches (the one before, now, the one after), or null. */
export function totpMatches(secret: string, code: string, now = Date.now()): number | null {
  const clean = code.replace(/\D/g, "");
  if (clean.length !== 6) return null;
  const step = Math.floor(now / 30_000);
  for (const s of [step, step - 1, step + 1]) if (sameText(totpAt(secret, s), clean)) return s;
  return null;
}

export function totpUri(secret: string, account: string): string {
  return "otpauth://totp/" + encodeURIComponent("BERETE:" + account) + "?secret=" + secret + "&issuer=BERETE&algorithm=SHA1&digits=6&period=30";
}

/* ---------- Signed addresses of the files ---------- */

/** A signature for a file of a client, valid until `exp` (seconds), bound to the one who may read it. */
export function fileSig(kind: string, id: string, owner: string, exp: number): string {
  return createHmac("sha256", serverSecret()).update("atelier-file:" + kind + "/" + id + "/" + owner + "/" + exp).digest("base64url").slice(0, 32);
}

export function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
