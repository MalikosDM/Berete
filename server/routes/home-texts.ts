import { Router } from "express";
import { z } from "zod";
import { cleanHomeTexts, HOME_BLOCKS, HOME_TEXTS_KEY, type HomeTexts } from "../../src/data/homeTexts.js";
import { prisma } from "../db.js";
import { requireAdmin } from "./site.js";

/**
 * The texts beside the pieces of the home page (src/data/homeTexts.ts), mounted on /api:
 *   GET /home-texts          the texts written in the admin ({ texts: { <block>: { <lang>: text } } }; the rest: the lines)
 *   GET /admin/home-texts    the same and the blocks of the page (the admin, « Textes de l'accueil »)
 *   PUT /admin/home-texts    { texts }: replaces them all (an empty text: back to the line of the piece)
 * Kept in the table ServerSetting (key home.texts): no migration, in the backups.
 */
export const homeTexts = Router();

async function readTexts(): Promise<HomeTexts> {
  try {
    const row = await prisma.serverSetting.findUnique({ where: { key: HOME_TEXTS_KEY } });
    return row ? cleanHomeTexts(JSON.parse(row.value)) : {};
  } catch {
    // An unreadable value (or the base not reachable): the page shows the lines of the pieces.
    return {};
  }
}

homeTexts.get("/home-texts", async (_req, res) => {
  res.setHeader("Cache-Control", "no-cache");
  res.json({ texts: await readTexts() });
});

homeTexts.get("/admin/home-texts", requireAdmin, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json({ blocks: HOME_BLOCKS, texts: await readTexts() });
});

const TextsIn = z.object({ texts: z.record(z.string().max(80), z.record(z.string().max(8), z.string().max(4000))) });

homeTexts.put("/admin/home-texts", requireAdmin, async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = TextsIn.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Textes invalides." });
    return;
  }
  const texts = cleanHomeTexts(body.data.texts);
  if (Object.keys(texts).length === 0) await prisma.serverSetting.deleteMany({ where: { key: HOME_TEXTS_KEY } });
  else {
    const value = JSON.stringify(texts);
    await prisma.serverSetting.upsert({ where: { key: HOME_TEXTS_KEY }, create: { key: HOME_TEXTS_KEY, value }, update: { value } });
  }
  res.json({ texts });
});
