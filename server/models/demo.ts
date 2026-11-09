/*
 * The test model of the jeweller (ZN1242-bj001, a two-tone bracelet sent as a
 * .glb exported by iJewel3D), already optimised in storage/demo/ (kept in
 * git, 12 MB), with the roles of its layers checked by eye:
 *   图层01  the flowers and their settings, white gold (334 meshes)
 *   图层05  the 13 twisted links, rose gold
 *   图层09  the round diamonds (one mesh drawn 3601 times)
 *   图层10  the larger stones (199)
 *   图层04  the "BRT" logo with its diamond, rose gold
 * Written once in the base at start (deleted from /admin, it is not written again).
 * These layer names are remembered: another file with the same names gets the same roles.
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS, type ModelSettings } from "../../src/data/models.js";
import { prisma } from "../db.js";
import { storage } from "./storage.js";

const DEMO_ID = "demo-zn1242";
const SOURCE = path.resolve("storage/demo/ZN1242-bj001");

export const DEMO_SETTINGS: ModelSettings = {
  ...DEFAULT_SETTINGS,
  layers: {
    图层01: { role: "metal", metal: "white-gold", label: "Flowers" },
    图层05: { role: "metal", metal: "rose-gold", label: "Links" },
    图层09: { role: "diamond" },
    图层10: { role: "diamond" },
    图层04: { role: "metal", metal: "rose-gold", label: "BRT logo" },
  },
};

export async function seedDemo(): Promise<void> {
  const result = path.join(SOURCE, "result.json");
  if (!fs.existsSync(result) || !fs.existsSync(path.join(SOURCE, "full.glb"))) return;
  const key = "model:" + DEMO_ID;
  if (await prisma.seededEntry.findUnique({ where: { key } })) return;
  const { stats, layers } = JSON.parse(fs.readFileSync(result, "utf8")) as { stats: object; layers: object[] };
  for (const file of ["full.glb", "light.glb"]) fs.copyFileSync(path.join(SOURCE, file), path.join(storage.folder(DEMO_ID), file));
  await prisma.model3D.create({
    data: {
      id: DEMO_ID,
      name: "ZN1242-bj001",
      sourceName: "ZN1242-bj001.glb",
      sourceKind: "glb",
      status: "ready",
      progress: 100,
      sizes: { original: 39343704, full: storage.size(DEMO_ID, "full.glb"), light: storage.size(DEMO_ID, "light.glb") },
      stats,
      layers,
      settings: DEMO_SETTINGS,
    },
  });
  for (const [name, setting] of Object.entries(DEMO_SETTINGS.layers)) {
    await prisma.layerMemory.upsert({ where: { name }, create: { name, setting }, update: {} });
  }
  await prisma.seededEntry.create({ data: { key } });
}
