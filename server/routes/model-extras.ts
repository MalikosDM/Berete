/*
 * The comforts of the 3D editor of the admin (27/11/2026), mounted on /api before the routes of the models, behind
 * ADMIN_PASSWORD:
 *   GET    /admin/3d-presets                     the scene presets (« Préréglages de scène »), newest first
 *   POST   /admin/3d-presets                     { name, part: { scene, background, ambiance, diamonds }, image? }
 *   DELETE /admin/3d-presets/:id
 *   GET    /admin/3d-versions/:modelId           the settings a model had before each save (« Versions »), newest first
 *   DELETE /admin/3d-versions/:modelId/:versionId
 * Each successful save of a model (PUT /admin/models/:id, server/routes/models.ts) keeps the settings it had before as a
 * version: the last 20 per model. Deleting a model deletes its versions.
 * Kept in the base as JSON, in ServerSetting rows (so in the nightly backups, no migration):
 *   3d.presets              [{ id, name, createdAt, from, part, image }]   at most 60
 *   3d.versions.<modelId>   [{ id, at, settings }]                          at most 20
 */
import { randomBytes } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { SettingsSchema, settingsOf } from "./models.js";
import { requireAdmin } from "./site.js";

export const modelExtras = Router();

const PRESETS_KEY = "3d.presets";
const MAX_PRESETS = 60;
const MAX_VERSIONS = 20;
const versionsKey = (modelId: string) => "3d.versions." + modelId;

/** The scene of a model, without its parts, views or configurators: what a preset carries. */
const PresetPart = SettingsSchema.pick({ scene: true, background: true, ambiance: true, diamonds: true });

export type Preset = { id: string; name: string; createdAt: string; from: string | null; part: z.infer<typeof PresetPart>; image: string | null };
export type Version = { id: string; at: string; settings: unknown };

/* ---------- The rows, read and written one after the other (two saves at once never lose a version) ---------- */

let queue: Promise<unknown> = Promise.resolve();
function inTurn<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => undefined);
  return next;
}

async function readList<T>(key: string): Promise<T[]> {
  const row = await prisma.serverSetting.findUnique({ where: { key } });
  if (!row) return [];
  try {
    const value = JSON.parse(row.value) as unknown;
    return Array.isArray(value) ? (value as T[]) : [];
  } catch {
    return [];
  }
}

async function writeList<T>(key: string, list: T[]): Promise<void> {
  if (list.length === 0) {
    await prisma.serverSetting.deleteMany({ where: { key } });
    return;
  }
  const value = JSON.stringify(list);
  await prisma.serverSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

const newId = () => randomBytes(9).toString("base64url");

/* ---------- Versions: kept around each save of a model ---------- */

/** Keeps `before` as a version of the model (read with its defaults, as the editor reads it), when the save changed it. */
async function remember(modelId: string, before: unknown): Promise<void> {
  const row = await prisma.model3D.findUnique({ where: { id: modelId }, select: { settings: true } });
  const settings = settingsOf(before);
  if (!row || JSON.stringify(settingsOf(row.settings)) === JSON.stringify(settings)) return;
  await inTurn(async () => {
    const list = await readList<Version>(versionsKey(modelId));
    list.unshift({ id: newId(), at: new Date().toISOString(), settings });
    await writeList(versionsKey(modelId), list.slice(0, MAX_VERSIONS));
  });
}

// Before the save of server/routes/models.ts: the settings as they are, kept once the save went through (its answer 200),
// before that answer leaves: the list of versions read right after a save has it. requireAdmin runs there; here only a
// request that says it is the admin's has its model read.
modelExtras.put("/admin/models/:id", (req: Request, res: Response, next: NextFunction) => {
  if (!(req.headers.authorization ?? "").startsWith("Bearer ")) return next();
  const id = String(req.params.id);
  prisma.model3D
    .findUnique({ where: { id }, select: { settings: true } })
    .then((before) => {
      if (!before) return;
      const answer = res.json.bind(res);
      res.json = ((body: unknown) => {
        if (res.statusCode !== 200) return answer(body);
        remember(id, before.settings)
          .catch((e: unknown) => console.error("3d version", e))
          .finally(() => answer(body));
        return res;
      }) as Response["json"];
    })
    .catch(() => undefined)
    .finally(() => next());
});

// A model deleted: its versions go with it.
modelExtras.delete("/admin/models/:id", (req: Request, res: Response, next: NextFunction) => {
  const id = String(req.params.id);
  res.on("finish", () => {
    if (res.statusCode === 200) inTurn(() => writeList(versionsKey(id), [])).catch(() => undefined);
  });
  next();
});

modelExtras.get("/admin/3d-versions/:modelId", requireAdmin, async (req, res) => {
  res.json({ items: await readList<Version>(versionsKey(String(req.params.modelId))) });
});

modelExtras.delete("/admin/3d-versions/:modelId/:versionId", requireAdmin, async (req, res) => {
  const key = versionsKey(String(req.params.modelId));
  const id = String(req.params.versionId);
  const removed = await inTurn(async () => {
    const list = await readList<Version>(key);
    const kept = list.filter((v) => v.id !== id);
    await writeList(key, kept);
    return kept.length < list.length;
  });
  if (!removed) {
    res.status(404).json({ error: "Version introuvable." });
    return;
  }
  res.json({ ok: true });
});

/* ---------- Scene presets ---------- */

const PresetBody = z.object({
  name: z.string().trim().min(1).max(80),
  from: z.string().max(200).nullable().optional(),
  part: PresetPart,
  // A small picture of the scene (WebP made in the browser), shown in the list.
  image: z
    .string()
    .max(80_000)
    .regex(/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/)
    .nullable()
    .optional(),
});

modelExtras.get("/admin/3d-presets", requireAdmin, async (_req, res) => {
  res.json({ items: await readList<Preset>(PRESETS_KEY) });
});

modelExtras.post("/admin/3d-presets", requireAdmin, async (req, res) => {
  const body = PresetBody.safeParse(req.body);
  if (!body.success || JSON.stringify(body.data.part).length > 200_000) {
    res.status(400).json({ error: "Préréglage invalide." });
    return;
  }
  const preset: Preset = { id: newId(), name: body.data.name, createdAt: new Date().toISOString(), from: body.data.from ?? null, part: body.data.part, image: body.data.image ?? null };
  const full = await inTurn(async () => {
    const list = await readList<Preset>(PRESETS_KEY);
    if (list.length >= MAX_PRESETS) return true;
    await writeList(PRESETS_KEY, [preset, ...list]);
    return false;
  });
  if (full) {
    res.status(409).json({ error: "Déjà " + MAX_PRESETS + " préréglages : supprimez-en un d'abord." });
    return;
  }
  res.status(201).json(preset);
});

modelExtras.delete("/admin/3d-presets/:id", requireAdmin, async (req, res) => {
  const id = String(req.params.id);
  const removed = await inTurn(async () => {
    const list = await readList<Preset>(PRESETS_KEY);
    const kept = list.filter((p) => p.id !== id);
    await writeList(PRESETS_KEY, kept);
    return kept.length < list.length;
  });
  if (!removed) {
    res.status(404).json({ error: "Préréglage introuvable." });
    return;
  }
  res.json({ ok: true });
});
