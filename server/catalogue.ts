/*
 * The catalogue in the database.
 *
 * syncCatalogue() runs when the server starts:
 * - an entry of src/data/catalogue.ts that was never written is created;
 *   an entry deleted from /admin is not written again (SeededEntry);
 * - the photos and videos written by scripts/import-media.mjs (/media/...)
 *   follow the folders: when files are added or removed there, the list is
 *   updated; files uploaded from /admin are kept after them.
 * - the texts follow the catalogue as long as nobody edited them from /admin
 *   (seedHash: fingerprint of the texts last written from the catalogue).
 *   Texts edited from /admin are never overwritten.
 * - a piece renamed in the catalogue (RENAMED_PIECES) keeps its row.
 */
import { createHash } from "node:crypto";
import { z } from "zod";
import { defaultCatalogue } from "../src/data/catalogue.js";
import { RENAMED_PIECES } from "../src/data/pieces.js";
import { MAKING_STEPS, PIECE_TYPES, type Box, type Catalogue, type Making, type MediaItem, type Person, type Piece, type Press, type Spec, type Story, type Translations } from "../src/data/types.js";
import { prisma } from "./db.js";

const IMPORTED = "/media/";

/* ---------- Validation of the JSON columns (also used by the admin) ---------- */

export const MediaItemSchema = z.object({
  type: z.enum(["image", "video"]),
  src: z.string().min(1).max(500),
  poster: z.string().max(500).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  duration: z.number().nonnegative().optional(),
  audio: z.boolean().optional(),
  alt: z.string().max(300).optional(),
  caption: z.string().max(300).optional(),
  onBlack: z.boolean().optional(),
});
export const MediaListSchema = z.array(MediaItemSchema).max(200);
export const MakingSchema = z.object(Object.fromEntries(MAKING_STEPS.map((k) => [k, MediaItemSchema.optional()])) as Record<(typeof MAKING_STEPS)[number], z.ZodOptional<typeof MediaItemSchema>>);
/** Texts written in /admin for another language, by field: { fr: { title: "..." } }. */
export const TranslationsSchema = z
  .object({ fr: z.record(z.string().max(40), z.string().max(5000)), es: z.record(z.string().max(40), z.string().max(5000)), de: z.record(z.string().max(40), z.string().max(5000)), nl: z.record(z.string().max(40), z.string().max(5000)), ar: z.record(z.string().max(40), z.string().max(5000)) })
  .partial();
export const SpecSchema = z.object({ label: z.string().max(100), value: z.string().max(300) });
export const PressSchema = z.object({
  outlet: z.string().max(200),
  title: z.string().max(300),
  url: z.string().max(500).nullable(),
  image: z.string().max(500).nullable(),
});

const EMPTY_MEDIA: MediaItem = { type: "image", src: "" };

function mediaList(v: unknown): MediaItem[] {
  const parsed = MediaListSchema.safeParse(v);
  return parsed.success ? parsed.data : [];
}

function mediaOne(v: unknown): MediaItem {
  const parsed = MediaItemSchema.safeParse(v);
  return parsed.success ? parsed.data : EMPTY_MEDIA;
}

function translationsOf(v: unknown): Translations {
  const parsed = TranslationsSchema.safeParse(v);
  return parsed.success ? parsed.data : {};
}

function makingOf(v: unknown): Making {
  const parsed = MakingSchema.safeParse(v);
  if (!parsed.success) return {};
  const out: Making = {};
  for (const step of MAKING_STEPS) if (parsed.data[step]) out[step] = parsed.data[step];
  return out;
}

function list<T>(schema: z.ZodType<T>, v: unknown): T[] {
  const parsed = z.array(schema).safeParse(v);
  return parsed.success ? parsed.data : [];
}

/** What identifies an imported file: its address and its size (a file redone under the same name changes size). */
const fileKey = (m: MediaItem) => [m.src, m.width ?? "", m.height ?? "", m.duration ?? "", m.poster ?? ""].join(",");

/** The imported files follow the folders; the rest of the list (admin uploads) stays. */
export function mergeImported(current: MediaItem[], defaults: MediaItem[]): MediaItem[] {
  const imported = (l: MediaItem[]) => l.filter((m) => m.src.startsWith(IMPORTED)).map(fileKey).sort().join("|");
  if (imported(current) === imported(defaults)) return current;
  return [...defaults, ...current.filter((m) => !m.src.startsWith(IMPORTED))];
}

/**
 * The steps of "How it was made" of a piece edited from /admin: a step brought
 * by the import (a file of /media/, or none yet) follows the catalogue, a
 * photo chosen in the admin stays.
 */
function mergeMaking(current: Making, defaults: Making): Making {
  let out = current;
  for (const step of MAKING_STEPS) {
    const want = defaults[step];
    const have = current[step];
    if (!want || (have && (!have.src.startsWith(IMPORTED) || fileKey(have) === fileKey(want)))) continue;
    out = { ...out, [step]: want };
  }
  return out;
}

/* ---------- Rows <-> catalogue types ---------- */

type StoryRow = Awaited<ReturnType<typeof prisma.story.findMany>>[number];
type PersonRow = Awaited<ReturnType<typeof prisma.person.findMany>>[number];
type PieceRow = Awaited<ReturnType<typeof prisma.piece.findMany>>[number];
type BoxRow = Awaited<ReturnType<typeof prisma.box.findMany>>[number];

export const toStory = (r: StoryRow): Story => ({
  slug: r.slug,
  title: r.title,
  cover: r.cover,
  media: mediaList(r.media),
  people: r.people,
  pieceSlug: r.pieceSlug,
  articleUrl: r.articleUrl,
  translations: translationsOf(r.translations),
});

export const toPerson = (r: PersonRow): Person => ({
  slug: r.slug,
  name: r.name,
  kind: r.kind === "club" || r.kind === "personality" ? r.kind : "player",
  number: r.number,
  club: r.club,
  portrait: r.portrait,
  bio: r.bio,
  translations: translationsOf(r.translations),
});

export const toPiece = (r: PieceRow): Piece => ({
  slug: r.slug,
  title: r.title,
  type: (PIECE_TYPES as readonly string[]).includes(r.type) ? (r.type as Piece["type"]) : "pendant",
  line: r.line,
  story: r.story,
  client: r.client,
  clientPublic: r.clientPublic,
  cover: mediaOne(r.cover),
  gallery: mediaList(r.gallery),
  handover: mediaList(r.handover),
  specs: list<Spec>(SpecSchema, r.specs),
  press: list<Press>(PressSchema, r.press),
  people: r.people,
  boxSlug: r.boxSlug,
  featured: r.featured,
  draft: r.draft,
  making: makingOf(r.making),
  translations: translationsOf(r.translations),
});

export const toBox = (r: BoxRow): Box => ({
  slug: r.slug,
  name: r.name,
  description: r.description,
  images: mediaList(r.images),
  pieceSlug: r.pieceSlug,
  translations: translationsOf(r.translations),
});

const order = [{ sortOrder: "asc" as const }, { createdAt: "asc" as const }];

export async function readCatalogue(): Promise<Catalogue> {
  const [stories, people, pieces, boxes] = await Promise.all([
    prisma.story.findMany({ orderBy: order }),
    prisma.person.findMany({ orderBy: order }),
    prisma.piece.findMany({ orderBy: order }),
    prisma.box.findMany({ orderBy: order }),
  ]);
  return { stories: stories.map(toStory), people: people.map(toPerson), pieces: pieces.map(toPiece), boxes: boxes.map(toBox) };
}

/* ---------- Sync from src/data/catalogue.ts ---------- */

/** JSON with sorted keys: the base does not keep the order of the keys. */
function stable(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
  if (v !== null && typeof v === "object") {
    return "{" + Object.keys(v).filter((k) => (v as Record<string, unknown>)[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + stable((v as Record<string, unknown>)[k])).join(",") + "}";
  }
  return JSON.stringify(v) ?? "null";
}

const fingerprint = (v: unknown) => createHash("sha1").update(stable(v)).digest("hex");

/* The texts of each kind: what the admin edits, apart from the imported media. */
const storyTexts = (s: Story) => ({ title: s.title, people: s.people, pieceSlug: s.pieceSlug, articleUrl: s.articleUrl });
const personTexts = (p: Person) => ({ name: p.name, kind: p.kind, number: p.number, club: p.club, portrait: p.portrait, bio: p.bio });
const pieceTexts = (p: Piece) => ({
  title: p.title,
  type: p.type,
  line: p.line,
  story: p.story,
  client: p.client,
  clientPublic: p.clientPublic,
  specs: p.specs,
  press: p.press,
  people: p.people,
  boxSlug: p.boxSlug,
  featured: p.featured,
  draft: p.draft,
  making: p.making,
});
const boxTexts = (b: Box) => ({ name: b.name, description: b.description, pieceSlug: b.pieceSlug });

/**
 * The new texts of the catalogue, when the base still holds the texts last
 * written from it (or texts written before fingerprints existed); null when
 * nothing changes or when the texts were edited from /admin.
 */
function textUpdate<T>(current: T, wanted: T, seedHash: string | null): { texts: T; seedHash: string } | null {
  const target = fingerprint(wanted);
  if (seedHash === target) return null;
  const untouched = seedHash === null || fingerprint(current) === seedHash;
  return untouched ? { texts: wanted, seedHash: target } : null;
}

async function once(key: string, seeded: Set<string>, create: () => Promise<unknown>): Promise<void> {
  if (seeded.has(key)) return;
  await create();
  await prisma.seededEntry.create({ data: { key } });
}

/** A piece renamed in the catalogue keeps its row and the links to it. */
async function applyRenames(): Promise<void> {
  for (const [from, to] of Object.entries(RENAMED_PIECES)) {
    const old = await prisma.piece.findUnique({ where: { slug: from }, select: { id: true } });
    if (old !== null) {
      const taken = await prisma.piece.findUnique({ where: { slug: to }, select: { id: true } });
      if (taken === null) await prisma.piece.update({ where: { id: old.id }, data: { slug: to } });
      else await prisma.piece.delete({ where: { id: old.id } });
    }
    await prisma.story.updateMany({ where: { pieceSlug: from }, data: { pieceSlug: to } });
    await prisma.box.updateMany({ where: { pieceSlug: from }, data: { pieceSlug: to } });
  }
}

export async function syncCatalogue(cat: Catalogue = defaultCatalogue): Promise<void> {
  const seeded = new Set((await prisma.seededEntry.findMany({ select: { key: true } })).map((e) => e.key));
  await applyRenames();

  for (const [i, s] of cat.stories.entries()) {
    const row = await prisma.story.findUnique({ where: { slug: s.slug } });
    if (row === null) {
      await once("story:" + s.slug, seeded, () =>
        prisma.story.create({
          data: { slug: s.slug, title: s.title, cover: s.cover, media: s.media, people: s.people, pieceSlug: s.pieceSlug, articleUrl: s.articleUrl, sortOrder: i + 1, seedHash: fingerprint(storyTexts(s)) },
        }),
      );
      continue;
    }
    await mark("story:" + s.slug, seeded);
    const current = mediaList(row.media);
    const media = mergeImported(current, s.media);
    const cover = row.cover === "" || row.cover.startsWith(IMPORTED) ? s.cover : row.cover;
    const texts = textUpdate(storyTexts(toStory(row)), storyTexts(s), row.seedHash);
    if (media !== current || cover !== row.cover || texts) {
      await prisma.story.update({ where: { id: row.id }, data: { media, cover, ...(texts ? { ...texts.texts, seedHash: texts.seedHash } : {}) } });
    }
  }

  for (const [i, p] of cat.people.entries()) {
    const row = await prisma.person.findUnique({ where: { slug: p.slug } });
    if (row === null) {
      await once("person:" + p.slug, seeded, () => prisma.person.create({ data: { ...p, sortOrder: i + 1, seedHash: fingerprint(personTexts(p)) } }));
      continue;
    }
    await mark("person:" + p.slug, seeded);
    const texts = textUpdate(personTexts(toPerson(row)), personTexts(p), row.seedHash);
    if (texts) await prisma.person.update({ where: { id: row.id }, data: { ...texts.texts, seedHash: texts.seedHash } });
  }

  for (const [i, p] of cat.pieces.entries()) {
    const row = await prisma.piece.findUnique({ where: { slug: p.slug } });
    if (row === null) {
      await once("piece:" + p.slug, seeded, () => prisma.piece.create({ data: { ...p, sortOrder: i + 1, seedHash: fingerprint(pieceTexts(p)) } }));
      continue;
    }
    await mark("piece:" + p.slug, seeded);
    const currentGallery = mediaList(row.gallery);
    const currentHandover = mediaList(row.handover);
    const gallery = mergeImported(currentGallery, p.gallery);
    const handover = mergeImported(currentHandover, p.handover);
    const cover = mediaOne(row.cover);
    const nextCover = cover.src === "" || (cover.src.startsWith(IMPORTED) && fileKey(cover) !== fileKey(p.cover)) ? p.cover : cover;
    const texts = textUpdate(pieceTexts(toPiece(row)), pieceTexts(p), row.seedHash);
    // A piece that follows the catalogue gets its steps with its texts; an edited one still gets the imported photos.
    const currentMaking = makingOf(row.making);
    const making = texts ? currentMaking : mergeMaking(currentMaking, p.making);
    if (gallery !== currentGallery || handover !== currentHandover || nextCover !== cover || making !== currentMaking || texts) {
      await prisma.piece.update({
        where: { id: row.id },
        // A piece that follows the catalogue also follows its order.
        data: { gallery, handover, cover: nextCover, ...(making !== currentMaking ? { making } : {}), ...(texts ? { ...texts.texts, seedHash: texts.seedHash, sortOrder: i + 1 } : {}) },
      });
    }
  }

  for (const [i, b] of cat.boxes.entries()) {
    const row = await prisma.box.findUnique({ where: { slug: b.slug } });
    if (row === null) {
      await once("box:" + b.slug, seeded, () => prisma.box.create({ data: { ...b, sortOrder: i + 1, seedHash: fingerprint(boxTexts(b)) } }));
      continue;
    }
    await mark("box:" + b.slug, seeded);
    const current = mediaList(row.images);
    const images = mergeImported(current, b.images);
    const texts = textUpdate(boxTexts(toBox(row)), boxTexts(b), row.seedHash);
    if (images !== current || texts) await prisma.box.update({ where: { id: row.id }, data: { images, ...(texts ? { ...texts.texts, seedHash: texts.seedHash, sortOrder: i + 1 } : {}) } });
  }
}

/** An entry already in the base counts as written: deleting it later from /admin is final. */
async function mark(key: string, seeded: Set<string>): Promise<void> {
  if (seeded.has(key)) return;
  await prisma.seededEntry.create({ data: { key } });
  seeded.add(key);
}
