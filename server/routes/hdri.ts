/*
 * Lightings uploaded by the admin (26/11/2026, « Éclairages importés » of the 3D editor): a Radiance .hdr or an
 * OpenEXR .exr, checked by its first bytes ("#?RADIANCE" / "#?RGBE"; 76 2f 31 01), 40 MB at most, stored with the 3D
 * files (never in Git: storage/ is ignored; MODELS_DIR on the VPS, so in the nightly backups):
 *   storage/hdri/<24 hex>.<hdr|exr>   the file as sent, never changed
 *   storage/hdri/<24 hex>.json        its name, size in pixels, weight, date
 * Routes (mounted at the root, before the routes of the site):
 *   GET    /api/admin/hdri          the list (admin)
 *   POST   /api/admin/hdri?name=…   the file as the body (application/octet-stream) (admin)
 *   DELETE /api/admin/hdri/:id      (admin)
 *   GET    /hdri/custom/<file>      the file, kept a year by browsers (its name never changes: a new upload is a new
 *                                   name); open as the other lightings are, private pages included (server/access.ts
 *                                   PRIVATE_FILES lets /hdri/<set>/<file> through). Also at /api/hdri/custom/<file>,
 *                                   for the dev server (Vite passes only /api to this server).
 * The viewer reads it by the id "custom:<file>" (src/viewer/envs.ts).
 */
import express, { Router, type NextFunction, type Request, type Response } from "express";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { requireAdmin } from "./site.js";

const ROOT = path.join(path.resolve(process.env.MODELS_DIR ?? "storage"), "hdri");
export const MAX_HDRI_BYTES = 40 * 1024 * 1024;
const MAX_FILES = 60;
const ID = /^[a-f0-9]{24}$/;
const FILE = /^([a-f0-9]{24})\.(hdr|exr)$/;
const TYPES = { hdr: "image/vnd.radiance", exr: "image/x-exr" } as const;
type Ext = keyof typeof TYPES;

export type CustomHdri = {
  id: string;
  /** What the viewer is given: "custom:<id>.<ext>". */
  envId: string;
  name: string;
  ext: Ext;
  bytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
  url: string;
};

type Meta = Omit<CustomHdri, "id" | "envId" | "url">;

/** The kind of a file by its first bytes (never by its name). */
export function hdriKind(head: Buffer): Ext | null {
  const start = head.toString("latin1", 0, 10);
  if (start.startsWith("#?RADIANCE") || start.startsWith("#?RGBE")) return "hdr";
  if (head.length >= 4 && head.readUInt32LE(0) === 0x01312f76) return "exr";
  return null;
}

/** Size of a Radiance image: the line after the header ("-Y 1024 +X 2048"). */
function hdrSize(buf: Buffer): { width: number; height: number } | null {
  const head = buf.toString("latin1", 0, Math.min(buf.length, 8192));
  const m = head.match(/\n\n([-+])Y\s+(\d+)\s+([-+])X\s+(\d+)\s*\n/) ?? head.match(/\n\n([-+])X\s+(\d+)\s+([-+])Y\s+(\d+)\s*\n/);
  if (!m) return null;
  const yFirst = /\n\n[-+]Y/.test(m[0]);
  const a = Number(m[2]);
  const b = Number(m[4]);
  return yFirst ? { width: b, height: a } : { width: a, height: b };
}

/** Size of an OpenEXR image: its "dataWindow" attribute (box2i), read from the header. */
function exrSize(buf: Buffer): { width: number; height: number } | null {
  let at = 8;
  const end = Math.min(buf.length, 1 << 20);
  const cstring = () => {
    const zero = buf.indexOf(0, at);
    if (zero < 0 || zero >= end || zero - at > 255) return null;
    const s = buf.toString("latin1", at, zero);
    at = zero + 1;
    return s;
  };
  while (at < end) {
    const name = cstring();
    if (name === null) return null;
    if (name === "") return null;
    const type = cstring();
    if (type === null || at + 4 > end) return null;
    const size = buf.readInt32LE(at);
    at += 4;
    if (size < 0 || at + size > end) return null;
    if (name === "dataWindow" && type === "box2i" && size === 16) {
      const width = buf.readInt32LE(at + 8) - buf.readInt32LE(at) + 1;
      const height = buf.readInt32LE(at + 12) - buf.readInt32LE(at + 4) + 1;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    at += size;
  }
  return null;
}

/** A name fit to show: no folder, no control characters, 120 characters at most. */
function cleanName(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  const base = raw.split(/[\\/]/).pop() ?? "";
  const visible = [...base].filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127).join("");
  return visible.trim().slice(0, 120) || "Éclairage";
}

function folder(): string {
  fs.mkdirSync(ROOT, { recursive: true });
  return ROOT;
}

function urlOf(id: string, ext: Ext): string {
  return "/hdri/custom/" + id + "." + ext;
}

function readMeta(id: string): Meta | null {
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(ROOT, id + ".json"), "utf8")) as Meta;
    if (meta.ext !== "hdr" && meta.ext !== "exr") return null;
    if (!fs.existsSync(path.join(ROOT, id + "." + meta.ext))) return null;
    return meta;
  } catch {
    return null;
  }
}

/** Every uploaded lighting, the newest first. */
export function listHdri(): CustomHdri[] {
  if (!fs.existsSync(ROOT)) return [];
  const out: CustomHdri[] = [];
  for (const entry of fs.readdirSync(ROOT)) {
    const m = /^([a-f0-9]{24})\.json$/.exec(entry);
    if (!m) continue;
    const meta = readMeta(m[1]!);
    if (meta) out.push({ id: m[1]!, envId: "custom:" + m[1] + "." + meta.ext, ...meta, url: urlOf(m[1]!, meta.ext) });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export const hdri = Router();

hdri.get("/api/admin/hdri", requireAdmin, (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ items: listHdri(), maxBytes: MAX_HDRI_BYTES });
});

/** The body as it is, 40 MB at most: a heavier file is refused in French before anything is kept. */
function rawBody(req: Request, res: Response, next: NextFunction): void {
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > MAX_HDRI_BYTES) {
    res.status(413).json({ error: "Fichier trop lourd : 40 Mo au plus." });
    return;
  }
  express.raw({ type: () => true, limit: MAX_HDRI_BYTES })(req, res, (error?: unknown) => {
    if (error) {
      const tooLarge = typeof error === "object" && error !== null && (error as { type?: string }).type === "entity.too.large";
      res.status(tooLarge ? 413 : 400).json({ error: tooLarge ? "Fichier trop lourd : 40 Mo au plus." : "Le fichier n'a pas pu être reçu. Réessayez." });
      return;
    }
    next();
  });
}

hdri.post("/api/admin/hdri", requireAdmin, rawBody, (req, res) => {
  const body = req.body as unknown;
  const buf = Buffer.isBuffer(body) ? body : null;
  if (!buf || buf.length < 16) {
    res.status(400).json({ error: "Le fichier est vide." });
    return;
  }
  const ext = hdriKind(buf.subarray(0, 16));
  if (!ext) {
    res.status(415).json({ error: "Ce fichier n'est ni un .hdr (Radiance) ni un .exr (OpenEXR)." });
    return;
  }
  if (listHdri().length >= MAX_FILES) {
    res.status(409).json({ error: "Trop d'éclairages importés (" + MAX_FILES + " au plus) : supprimez-en un d'abord." });
    return;
  }
  const size = ext === "hdr" ? hdrSize(buf) : exrSize(buf);
  const id = randomBytes(12).toString("hex");
  const dir = folder();
  const meta: Meta = { name: cleanName(req.query.name), ext, bytes: buf.length, width: size?.width ?? null, height: size?.height ?? null, createdAt: new Date().toISOString() };
  const file = path.join(dir, id + "." + ext);
  fs.writeFileSync(file + ".part", buf);
  fs.renameSync(file + ".part", file);
  fs.writeFileSync(path.join(dir, id + ".json"), JSON.stringify(meta));
  res.status(201).json({ item: { id, envId: "custom:" + id + "." + ext, ...meta, url: urlOf(id, ext) } satisfies CustomHdri });
});

hdri.delete("/api/admin/hdri/:id", requireAdmin, (req, res) => {
  const id = String(req.params.id).replace(/\.(hdr|exr)$/, "");
  if (!ID.test(id)) {
    res.status(400).json({ error: "Éclairage inconnu." });
    return;
  }
  const meta = readMeta(id);
  if (!meta) {
    res.status(404).json({ error: "Cet éclairage n'existe plus." });
    return;
  }
  for (const name of [id + "." + meta.ext, id + ".json"]) fs.rmSync(path.join(ROOT, name), { force: true });
  res.json({ ok: true });
});

function sendFile(req: Request, res: Response, next: NextFunction): void {
  const m = FILE.exec(String(req.params.file));
  if (!m) return next();
  const file = path.join(ROOT, m[0]);
  fs.stat(file, (error, stats) => {
    if (error || !stats.isFile()) {
      res.status(404).setHeader("Cache-Control", "no-store");
      res.type("text/plain").send("Not found");
      return;
    }
    res.sendFile(file, {
      headers: {
        "Content-Type": TYPES[m[2] as Ext],
        // A new upload is a new name: the file at this address never changes.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}

hdri.get("/hdri/custom/:file", sendFile);
hdri.get("/api/hdri/custom/:file", sendFile);
