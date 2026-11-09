/*
 * The processing of the 3D models, one at a time, each in a child process
 * (worker.ts): its progress is written in the base, read by the admin. A job
 * cut by a restart of the server starts again.
 */
import { fork } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_SETTINGS, settingFor, type LayerSetting, type ModelSettings } from "../../src/data/models.js";
import { prisma } from "../db.js";
import type { PipelineResult } from "./pipeline/index.js";
import { storage } from "./storage.js";

const here = fileURLToPath(import.meta.url);
// worker.ts while developing (tsx), worker.js once built.
const WORKER = path.join(path.dirname(here), "worker" + path.extname(here));

const queue: string[] = [];
let running = false;

export function enqueue(id: string): void {
  if (!queue.includes(id)) queue.push(id);
  void pump();
}

async function pump(): Promise<void> {
  if (running) return;
  running = true;
  try {
    for (let id = queue.shift(); id; id = queue.shift()) await run(id).catch((e: unknown) => console.error("3D job", id, e));
  } finally {
    running = false;
  }
}

/**
 * Settings of a processed model: what the jeweller set is kept; a new layer
 * gets the role last given to a layer of the same name (LayerMemory), else
 * the role guessed from its shape.
 */
export async function mergeSettings(current: Partial<ModelSettings>, result: PipelineResult): Promise<ModelSettings> {
  const layers = { ...(current.layers ?? {}) };
  const names = result.layers.map((l) => l.name);
  const memory = new Map((await prisma.layerMemory.findMany({ where: { name: { in: names } } })).map((m) => [m.name, m.setting as LayerSetting]));
  for (const layer of result.layers) layers[layer.name] ??= memory.get(layer.name) ?? settingFor(layer.name, layer.guess);
  return { ...DEFAULT_SETTINGS, ...current, layers };
}

/** Remembers the roles the jeweller gave, for the next models with the same layer names. */
export async function rememberLayers(settings: ModelSettings): Promise<void> {
  for (const [name, setting] of Object.entries(settings.layers)) {
    await prisma.layerMemory.upsert({ where: { name }, create: { name, setting }, update: { setting } });
  }
}

async function run(id: string): Promise<void> {
  const model = await prisma.model3D.findUnique({ where: { id } });
  if (!model) return;
  const original = storage.original(id);
  if (!original) {
    await prisma.model3D.update({ where: { id }, data: { status: "failed", error: "Le fichier d'origine est introuvable." } });
    return;
  }
  await prisma.model3D.update({ where: { id }, data: { status: "processing", progress: 0, step: "read", error: null } });
  const child = fork(WORKER, [original, model.sourceKind, storage.folder(id)], { stdio: ["ignore", "inherit", "inherit", "ipc"] });
  let result: PipelineResult | null = null;
  let failure = "";
  let lastWrite = 0;
  child.on("message", (m: { type: string; percent?: number; step?: string; result?: PipelineResult; message?: string }) => {
    if (m.type === "progress") {
      const now = Date.now();
      if (now - lastWrite < 400 && m.percent !== 100) return;
      lastWrite = now;
      void prisma.model3D.update({ where: { id }, data: { progress: m.percent ?? 0, step: m.step ?? "" } }).catch(() => undefined);
    } else if (m.type === "done") result = m.result ?? null;
    else if (m.type === "error") failure = m.message ?? "";
  });
  const code = await new Promise<number | null>((resolve) => {
    child.on("exit", (c) => resolve(c));
    child.on("error", (e) => {
      failure = e.message;
      resolve(1);
    });
  });
  const done = result as PipelineResult | null;
  if (code !== 0 || !done) {
    await prisma.model3D.update({ where: { id }, data: { status: "failed", error: failure || "Le traitement s'est arrêté (code " + code + ")." } });
    return;
  }
  const fresh = await prisma.model3D.findUnique({ where: { id } });
  const settings = await mergeSettings((fresh?.settings ?? {}) as Partial<ModelSettings>, done);
  await prisma.model3D.update({
    where: { id },
    data: {
      status: "ready",
      progress: 100,
      step: "",
      sizes: { original: storage.size(id, path.basename(original)), full: storage.size(id, "full.glb"), light: storage.size(id, "light.glb") },
      stats: done.stats,
      layers: done.layers,
      settings,
    },
  });
}

/** At start: the jobs a restart cut, and the unfinished uploads of yesterday. */
export async function resumeJobs(): Promise<void> {
  storage.cleanUploads();
  const pending = await prisma.model3D.findMany({ where: { status: { in: ["queued", "processing"] } }, orderBy: { createdAt: "asc" } });
  for (const m of pending) enqueue(m.id);
}
