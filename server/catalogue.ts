/*
 * The catalogue in the database.
 *
 * syncCatalogue() runs when the server starts:
 * - an entry of src/data/catalogue.ts that was never written is created;
 *   an entry deleted from /admin is not written again (SeededEntry);
 * - the photos and videos written by scripts/import-media.mjs (/media/...)
 *   follow the folders: when files are added or removed there, the list is
 *   updated; files uploaded from /admin are kept after them.
 * Texts edited from /admin are never overwritten.
 */
import { z } from "zod";
import { defaultCatalogue } from "../src/data/catalogue.js";
import { PIECE_TYPES, type Box, type Catalogue, type MediaItem, type Person, type Piece, type Press, type Spec, type Story } from "../src/data/types.js";
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

function list<T>(schema: z.ZodType<T>, v: unknown): T[] {
  const parsed = z.array(schema).safeParse(v);
  return parsed.success ? parsed.data : [];
}

/** The imported files follow the folders; the rest of the list (admin uploads) stays. */
export function mergeImported(current: MediaItem[], defaults: MediaItem[]): MediaItem[] {
  const imported = (l: MediaItem[]) => l.filter((m) => m.src.startsWith(IMPORTED)).map((m) => m.src).sort().join("|");
  if (imported(current) === imported(defaults)) return current;
  return [...defaults, ...current.filter((m) => !m.src.startsWith(IMPORTED))];
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
});

export const toPerson = (r: PersonRow): Person => ({
  slug: r.slug,
  name: r.name,
  kind: r.kind === "club" || r.kind === "personality" ? r.kind : "player",
  number: r.number,
  club: r.club,
  portrait: r.portrait,
  bio: r.bio,
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
});

export const toBox = (r: BoxRow): Box => ({
  slug: r.slug,
  name: r.name,
  description: r.description,
  images: mediaList(r.images),
  pieceSlug: r.pieceSlug,
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

async function once(key: string, seeded: Set<string>, create: () => Promise<unknown>): Promise<void> {
  if (seeded.has(key)) return;
  await create();
  await prisma.seededEntry.create({ data: { key } });
}

export async function syncCatalogue(cat: Catalogue = defaultCatalogue): Promise<void> {
  const seeded = new Set((await prisma.seededEntry.findMany({ select: { key: true } })).map((e) => e.key));

  for (const [i, s] of cat.stories.entries()) {
    const row = await prisma.story.findUnique({ where: { slug: s.slug } });
    if (row === null) {
      await once("story:" + s.slug, seeded, () =>
        prisma.story.create({
          data: { slug: s.slug, title: s.title, cover: s.cover, media: s.media, people: s.people, pieceSlug: s.pieceSlug, articleUrl: s.articleUrl, sortOrder: i + 1 },
        }),
      );
      continue;
    }
    await mark("story:" + s.slug, seeded);
    const current = mediaList(row.media);
    const media = mergeImported(current, s.media);
    const cover = row.cover === "" || row.cover.startsWith(IMPORTED) ? s.cover : row.cover;
    if (media !== current || cover !== row.cover) await prisma.story.update({ where: { id: row.id }, data: { media, cover } });
  }

  for (const [i, p] of cat.people.entries()) {
    const exists = await prisma.person.findUnique({ where: { slug: p.slug }, select: { id: true } });
    if (exists === null) await once("person:" + p.slug, seeded, () => prisma.person.create({ data: { ...p, sortOrder: i + 1 } }));
    else await mark("person:" + p.slug, seeded);
  }

  for (const [i, p] of cat.pieces.entries()) {
    const row = await prisma.piece.findUnique({ where: { slug: p.slug } });
    if (row === null) {
      await once("piece:" + p.slug, seeded, () => prisma.piece.create({ data: { ...p, sortOrder: i + 1 } }));
      continue;
    }
    await mark("piece:" + p.slug, seeded);
    const currentGallery = mediaList(row.gallery);
    const currentHandover = mediaList(row.handover);
    const gallery = mergeImported(currentGallery, p.gallery);
    const handover = mergeImported(currentHandover, p.handover);
    const cover = mediaOne(row.cover);
    const nextCover = cover.src === "" || (cover.src.startsWith(IMPORTED) && cover.src !== p.cover.src) ? p.cover : cover;
    if (gallery !== currentGallery || handover !== currentHandover || nextCover !== cover) {
      await prisma.piece.update({ where: { id: row.id }, data: { gallery, handover, cover: nextCover } });
    }
  }

  for (const [i, b] of cat.boxes.entries()) {
    const row = await prisma.box.findUnique({ where: { slug: b.slug } });
    if (row === null) {
      await once("box:" + b.slug, seeded, () => prisma.box.create({ data: { ...b, sortOrder: i + 1 } }));
      continue;
    }
    await mark("box:" + b.slug, seeded);
    const current = mediaList(row.images);
    const images = mergeImported(current, b.images);
    if (images !== current) await prisma.box.update({ where: { id: row.id }, data: { images } });
  }
}

/** An entry already in the base counts as written: deleting it later from /admin is final. */
async function mark(key: string, seeded: Set<string>): Promise<void> {
  if (seeded.has(key)) return;
  await prisma.seededEntry.create({ data: { key } });
  seeded.add(key);
}
