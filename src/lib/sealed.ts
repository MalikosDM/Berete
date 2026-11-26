/*
 * The sealed share links (/s/<token>, server/routes/shares.ts): the 3D model is encrypted on the admin's device and
 * decrypted on the client's, with WebCrypto. The server never sees the key nor the password.
 *
 *   package    "BJS1" | header length (uint32, little-endian) | header JSON | full.glb | light.glb
 *              header: { v: 1, name, settings, size, full: <bytes>, light: <bytes> }
 *   cipher     AES-256-GCM over the whole package, one random IV of 12 bytes, a fixed additional data (below)
 *   key        with a password: PBKDF2-SHA-256 (ITERATIONS, a random salt of 16 bytes) over the password (NFC);
 *              without: 32 random bytes, written in the #fragment of the link (#k=<base64url>), never sent to the server
 *   verifier   a short known text encrypted with the same key and its own IV: the page knows at once whether the
 *              password (or the key of the link) is right, before downloading the whole model
 */
import type { ModelSettings } from "@/data/models";

/** PBKDF2-SHA-256 iterations (OWASP asks for 600 000 in 2023, at least 210 000 in its older advice). */
export const ITERATIONS = 600_000;
const MAGIC = "BJS1";
const AAD = new TextEncoder().encode("berete-sealed-share:v1");
const VERIFIER_TEXT = new TextEncoder().encode("berete-sealed-ok");

/** The two versions are views on the decrypted buffer (no copy: a model can weigh 60 MB, a phone must hold it twice). */
export type SealedPackage = { name: string; settings: ModelSettings; size: [number, number, number]; full: Uint8Array<ArrayBuffer>; light: Uint8Array<ArrayBuffer> };

/** Whether this browser can seal and open (WebCrypto exists only on HTTPS pages and localhost). */
export function canSeal(): boolean {
  return typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined" && typeof crypto.getRandomValues === "function";
}

/* ---------- base64url ---------- */

export function toB64(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64(value: string): Uint8Array<ArrayBuffer> {
  const text = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4));
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i);
  return out;
}

function random(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

/* ---------- Keys ---------- */

/** A random key for a link without password, and its raw bytes for the #fragment. */
export async function randomKey(): Promise<{ key: CryptoKey; fragment: string }> {
  const raw = random(32);
  const key = await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
  const fragment = toB64(raw);
  raw.fill(0);
  return { key, fragment };
}

/** The key of a link without password, read from its #fragment (null when missing or malformed). */
export async function fragmentKey(hash: string): Promise<CryptoKey | null> {
  const value = new URLSearchParams(hash.replace(/^#/, "")).get("k") ?? "";
  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) return null;
  try {
    return await crypto.subtle.importKey("raw", fromB64(value), { name: "AES-GCM" }, false, ["decrypt"]);
  } catch {
    return null;
  }
}

/** A new random salt (base64url) for a link with a password. */
export function newSalt(): string {
  return toB64(random(16));
}

/** The key of a password (the same on every device: the password is normalised first). */
export async function passwordKey(password: string, salt: string, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password.normalize("NFC")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: fromB64(salt), iterations, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

/* ---------- Verifier ---------- */

export async function makeVerifier(key: CryptoKey): Promise<string> {
  const iv = random(12);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: AAD }, key, VERIFIER_TEXT));
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv);
  out.set(sealed, iv.length);
  return toB64(out);
}

/** True when the key opens the verifier of the link (the right password, the whole link). */
export async function checkVerifier(key: CryptoKey, verifier: string): Promise<boolean> {
  try {
    const bytes = fromB64(verifier);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12), additionalData: AAD }, key, bytes.slice(12)));
    return plain.length === VERIFIER_TEXT.length && plain.every((b, i) => b === VERIFIER_TEXT[i]);
  } catch {
    return false;
  }
}

/* ---------- Cipher ---------- */

export async function seal(key: CryptoKey, plain: Uint8Array<ArrayBuffer>): Promise<{ iv: string; data: ArrayBuffer }> {
  const iv = random(12);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: AAD }, key, plain);
  return { iv: toB64(iv), data };
}

/** The package, or an error when the key is wrong or the file was changed. */
export async function unseal(key: CryptoKey, iv: string, data: Uint8Array<ArrayBuffer>): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv), additionalData: AAD }, key, data);
}

/* ---------- Package ---------- */

export function pack(p: SealedPackage): Uint8Array<ArrayBuffer> {
  const header = new TextEncoder().encode(JSON.stringify({ v: 1, name: p.name, settings: p.settings, size: p.size, full: p.full.byteLength, light: p.light.byteLength }));
  const out = new Uint8Array(4 + 4 + header.length + p.full.byteLength + p.light.byteLength);
  out.set(new TextEncoder().encode(MAGIC));
  new DataView(out.buffer).setUint32(4, header.length, true);
  out.set(header, 8);
  out.set(p.full, 8 + header.length);
  out.set(p.light, 8 + header.length + p.full.byteLength);
  return out;
}

export function unpack(buffer: ArrayBuffer): SealedPackage {
  const bytes = new Uint8Array(buffer);
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== MAGIC) throw new Error("Not a sealed package");
  const length = new DataView(buffer).getUint32(4, true);
  const header = JSON.parse(new TextDecoder().decode(bytes.subarray(8, 8 + length))) as { v: number; name: string; settings: ModelSettings; size?: [number, number, number]; full: number; light: number };
  const start = 8 + length;
  if (header.v !== 1 || start + header.full + header.light !== bytes.length) throw new Error("Unknown sealed package");
  return {
    name: header.name,
    settings: header.settings,
    size: Array.isArray(header.size) && header.size.length === 3 ? header.size : [0, 0, 0],
    full: bytes.subarray(start, start + header.full),
    light: bytes.subarray(start + header.full, start + header.full + header.light),
  };
}
