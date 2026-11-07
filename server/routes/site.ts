import express, { Router, type NextFunction, type Request, type Response } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "../db.js";

/**
 * The site's own API, mounted on /api: pieces (capsules), players and boxes.
 * The tables are seeded once, on the first call, when they are empty.
 */
export const site = Router();

type Category = "CHAINS" | "PENDANTS" | "RINGS";

const SETTING_VIDEO = "/images/fournies/01-video-sertissage.mp4";

const SEED_PIECES = [
  {
    slug: "vfb-stuttgart-dfb-pokal-2025",
    title: "VfB Stuttgart",
    category: "RINGS" as Category,
    subtitle: "DFB-Pokal 2025",
    year: "2025",
    intro: "A championship ring for the DFB-Pokal winners. The top lifts off and reveals the trophy.",
    story:
      "Designed for the club, made for every player. The removable top opens onto a sculpted DFB-Pokal, and each ring carries the name and number of the player who wears it. The full series was handed over to the club and its champions.",
    coverImage: "/images/vfb-ring-front.webp",
    gallery: [
      { src: "/images/vfb-ring-front.webp", alt: "VfB Stuttgart championship ring, front view, set with diamonds", caption: "Front view" },
      { src: "/images/vfb-ring-open.webp", alt: "VfB Stuttgart ring opened, its removable top revealing the DFB-Pokal trophy", caption: "The top lifts off and reveals the trophy" },
      { src: "/images/vfb-team.webp", alt: "VfB Stuttgart players wearing their championship rings", caption: "Handover to the club" }
    ],
    videos: [{ src: SETTING_VIDEO, caption: "Set stone by stone" }],
    specs: [
      { label: "Type", value: "Championship ring" },
      { label: "Top", value: "Removable, reveals the trophy" },
      { label: "Personalisation", value: "Name and number of each player" },
      { label: "Series", value: "Made for the whole squad" },
      { label: "Metal and stones", value: "Details to be confirmed" }
    ],
    press: [{ outlet: "Bild", title: "The VfB champions receive their rings", url: null }],
    customBox: true,
    featured: true,
    sortOrder: 1
  },
  {
    slug: "campione-d-italia-2023-2024",
    title: "Campione d'Italia",
    category: "RINGS" as Category,
    subtitle: "2023/2024 · The 20th title",
    year: "2023/2024",
    intro: "A series of rings for a historic twentieth league title.",
    story:
      "Twenty titles, one number. The ring places a diamond-set 20 at its heart, a symbol of the season and of the players who made it. Produced as a series for the champions.",
    coverImage: "/images/inter-ring-20.webp",
    gallery: [
      { src: "/images/inter-ring-20.webp", alt: "Campione d'Italia championship ring with a diamond-set number 20", caption: "The 20th title" }
    ],
    videos: [],
    specs: [
      { label: "Type", value: "Championship ring" },
      { label: "Motif", value: "Number 20, set with diamonds" },
      { label: "Series", value: "Made for the champions" },
      { label: "Metal and stones", value: "Details to be confirmed" }
    ],
    press: [],
    customBox: true,
    featured: false,
    sortOrder: 2
  },
  {
    slug: "the-hand",
    title: "The Hand",
    category: "PENDANTS" as Category,
    subtitle: "Diamond pendant with rubies",
    year: null,
    intro: "A sculpted hand, fully paved with diamonds and lit with rubies.",
    story:
      "A statement piece, made to be seen. The hand is sculpted in volume, then set stone by stone, with rubies placed to catch the light at every movement.",
    coverImage: "/images/the-hand.webp",
    gallery: [
      { src: "/images/the-hand.webp", alt: "The Hand pendant, a diamond-paved hand with rubies", caption: "Diamonds and rubies" }
    ],
    videos: [],
    specs: [
      { label: "Type", value: "Pendant" },
      { label: "Stones", value: "Diamonds and rubies" },
      { label: "Setting", value: "Set by hand, stone by stone" },
      { label: "Metal", value: "Details to be confirmed" }
    ],
    press: [],
    customBox: true,
    featured: false,
    sortOrder: 3
  },
  {
    slug: "butterfly",
    title: "Butterfly",
    category: "CHAINS" as Category,
    subtitle: "Diamond butterfly chain",
    year: null,
    intro: "A chain of diamond butterflies, light on the skin, impossible to miss.",
    story:
      "Each butterfly is drawn, sculpted and set on its own, then linked into one fluid chain. A piece that moves with the person who wears it.",
    coverImage: "/images/butterfly-necklace.webp",
    gallery: [
      { src: "/images/butterfly-necklace.webp", alt: "Butterfly chain of diamond butterflies shown on a black bust", caption: "Worn on the bust" }
    ],
    videos: [],
    specs: [
      { label: "Type", value: "Chain" },
      { label: "Motif", value: "Diamond butterflies" },
      { label: "Setting", value: "Set by hand" },
      { label: "Metal", value: "Details to be confirmed" }
    ],
    press: [],
    customBox: true,
    featured: false,
    sortOrder: 4
  }
];

const VFB = "vfb-stuttgart-dfb-pokal-2025";
const INTER = "campione-d-italia-2023-2024";

const SEED_PLAYERS = [
  { slug: "deniz-undav", name: "Deniz Undav", number: 26, club: "VfB Stuttgart", piece: VFB },
  { slug: "angelo-stiller", name: "Angelo Stiller", number: 6, club: "VfB Stuttgart", piece: VFB },
  { slug: "maximilian-mittelstaedt", name: "Maximilian Mittelstädt", number: 7, club: "VfB Stuttgart", piece: VFB },
  { slug: "chris-fuehrich", name: "Chris Führich", number: null, club: "VfB Stuttgart", piece: VFB },
  { slug: "atakan-karazor", name: "Atakan Karazor", number: null, club: "VfB Stuttgart", piece: VFB },
  { slug: "marcus-thuram", name: "Marcus Thuram", number: null, club: "Inter", piece: INTER },
  { slug: "tanguy-nianzou", name: "Tanguy Nianzou", number: null, club: "VfB Stuttgart", piece: VFB }
];

const SEED_BOXES = [
  {
    slug: "sirius",
    name: "Sirius",
    description: "A black trunk made to measure, lined to hold the piece like a trophy. Custom boxes available on selected pieces, as an option.",
    image: "/images/sirius-box.webp",
    pieceSlug: VFB,
    sortOrder: 1
  }
];

let seeding: Promise<void> | null = null;

async function seed(): Promise<void> {
  const [pieceCount, playerCount, boxCount] = await Promise.all([
    prisma.piece.count(),
    prisma.player.count(),
    prisma.box.count()
  ]);

  const ids = new Map<string, string>();
  if (pieceCount === 0) {
    for (const p of SEED_PIECES) {
      const data = {
        title: p.title,
        category: p.category,
        subtitle: p.subtitle,
        year: p.year,
        intro: p.intro,
        story: p.story,
        coverImage: p.coverImage,
        gallery: p.gallery,
        videos: p.videos,
        specs: p.specs,
        press: p.press,
        customBox: p.customBox,
        featured: p.featured,
        sortOrder: p.sortOrder
      };
      const saved = await prisma.piece.upsert({
        where: { slug: p.slug },
        update: {},
        create: { slug: p.slug, ...data }
      });
      ids.set(p.slug, saved.id);
    }
  }

  if (playerCount === 0) {
    if (ids.size === 0) {
      const pieces = await prisma.piece.findMany({ select: { id: true, slug: true } });
      for (const p of pieces) ids.set(p.slug, p.id);
    }
    let order = 1;
    for (const pl of SEED_PLAYERS) {
      const pieceId = ids.get(pl.piece) ?? null;
      await prisma.player.upsert({
        where: { slug: pl.slug },
        update: {},
        create: {
          slug: pl.slug,
          name: pl.name,
          number: pl.number,
          club: pl.club,
          portrait: null,
          bio: "Provisional text: the story of this piece and the player who wears it will be written here.",
          sortOrder: order,
          pieceId
        }
      });
      order += 1;
    }
  }

  if (boxCount === 0) {
    for (const b of SEED_BOXES) {
      await prisma.box.upsert({ where: { slug: b.slug }, update: {}, create: b });
    }
  }
}

async function ensureSeeded(): Promise<void> {
  if (seeding === null) {
    seeding = seed().catch((error: unknown) => {
      seeding = null;
      throw error;
    });
  }
  await seeding;
}

const pieceSummarySelect = {
  slug: true,
  title: true,
  category: true,
  subtitle: true,
  year: true,
  intro: true,
  coverImage: true,
  customBox: true,
  featured: true,
  sortOrder: true
} as const;

const playerSummarySelect = {
  slug: true,
  name: true,
  number: true,
  club: true,
  portrait: true
} as const;

const CategoryQuery = z.enum(["CHAINS", "PENDANTS", "RINGS"]);
const Slug = z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/);

site.get("/pieces", async (req, res) => {
  await ensureSeeded();
  const raw = typeof req.query.category === "string" ? req.query.category.toUpperCase() : undefined;
  const parsed = raw === undefined || raw === "" || raw === "ALL" ? null : CategoryQuery.safeParse(raw);
  if (parsed !== null && !parsed.success) {
    res.status(400).json({ error: "Unknown category." });
    return;
  }
  const pieces = await prisma.piece.findMany({
    where: parsed === null ? {} : { category: parsed.data },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: pieceSummarySelect
  });
  res.json(fix({ pieces }));
});

site.get("/pieces/:slug", async (req, res) => {
  await ensureSeeded();
  const slug = Slug.safeParse(String(req.params.slug));
  if (!slug.success) {
    res.status(404).json({ error: "Piece not found." });
    return;
  }
  const piece = await prisma.piece.findUnique({
    where: { slug: slug.data },
    include: { players: { orderBy: { sortOrder: "asc" }, select: playerSummarySelect } }
  });
  if (piece === null) {
    res.status(404).json({ error: "Piece not found." });
    return;
  }
  res.json(fix({ piece }));
});

site.get("/players", async (_req, res) => {
  await ensureSeeded();
  await ensureCatalogue();
  const players = await prisma.player.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { ...playerSummarySelect, kind: true, bio: true, piece: { select: pieceSummarySelect } }
  });
  res.json(fix({ players }));
});

site.get("/players/:slug", async (req, res) => {
  await ensureSeeded();
  const slug = Slug.safeParse(String(req.params.slug));
  if (!slug.success) {
    res.status(404).json({ error: "Player not found." });
    return;
  }
  await ensureCatalogue();
  const player = await prisma.player.findUnique({
    where: { slug: slug.data },
    select: { ...playerSummarySelect, kind: true, bio: true, gallery: true, piece: { select: pieceSummarySelect } }
  });
  if (player === null) {
    res.status(404).json({ error: "Player not found." });
    return;
  }
  const stories = await prisma.story.findMany({
    where: { ownerSlug: slug.data },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { slug: true, title: true, club: true, pieceName: true, coverImage: true, media: true, jewelSlug: true, articleUrl: true }
  });
  const allJewels = await prisma.jewel.findMany({
    orderBy: [{ capsule: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: { ...jewelSummarySelect, playerSlugs: true }
  });
  const jewels = allJewels
    .filter((j) => j.playerSlugs.split(",").map((s) => s.trim()).includes(slug.data))
    .map(({ playerSlugs: _p, ...j }) => j);
  res.json(fix({ player: { ...player, stories, jewels } }));
});

site.get("/boxes", async (_req, res) => {
  await ensureSeeded();
  const boxes = await prisma.box.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { slug: true, name: true, description: true, image: true, pieceSlug: true }
  });
  res.json(fix({ boxes }));
});

/* ---------- Stories, capsules and jewels ---------- */

type StepMedia = { src: string; type: "image" | "video"; alt: string };
type StepsMap = {
  idea: StepMedia[];
  design: StepMedia[];
  casting: StepMedia[];
  setting: StepMedia[];
  polish: StepMedia[];
  piece: StepMedia[];
  delivered: StepMedia[];
};

const im = (src: string, alt: string): StepMedia => ({ src, type: "image", alt });
const vd = (src: string, alt: string): StepMedia => ({ src, type: "video", alt });
const mkSteps = (s: Partial<StepsMap>): StepsMap => ({ idea: [], design: [], casting: [], setting: [], polish: [], piece: [], delivered: [], ...s });

const SPECS_TBC = [
  { label: "Gold", value: "To be confirmed" },
  { label: "Carats", value: "To be confirmed" },
  { label: "Stones", value: "To be confirmed" },
  { label: "Diamonds", value: "To be confirmed" }
];

const SEED_CAPSULES = [
  {
    slug: "champions",
    title: "Champions",
    tagline: "Titles, worn forever.",
    intro: "Championship rings made for the clubs and the players who lifted the trophy.",
    coverImage: "/images/vfb-team.jpg",
    sortOrder: 1,
    jewels: [
      {
        slug: "vfb-stuttgart-dfb-pokal-2025",
        title: "VfB Stuttgart DFB-Pokal 2025",
        type: "ring",
        line: "The top lifts off and reveals the trophy.",
        client: "VfB Stuttgart",
        clientPublic: true,
        coverImage: "/images/vfb-ring-front.jpg",
        steps: mkSteps({
          setting: [vd(SETTING_VIDEO, "Stones set by hand at the atelier")],
          piece: [im("/images/vfb-ring-front.jpg", "VfB Stuttgart ring, front view"), im("/images/vfb-ring-open.jpg", "VfB Stuttgart ring opened, revealing the cup")],
          delivered: [im("/images/vfb-team.jpg", "VfB Stuttgart squad receiving their rings"), im("/images/sirius-box.webp", "Black Sirius presentation trunk")]
        }),
        specs: SPECS_TBC,
        press: [{ outlet: "Bild", title: "The VfB champions receive their rings", url: "" }],
        customBox: true,
        sortOrder: 1
      },
      {
        slug: "campione-d-italia-2023-2024",
        title: "Campione d'Italia 2023/2024",
        type: "ring",
        line: "A diamond-set 20 for the twentieth title.",
        client: "Inter",
        clientPublic: true,
        coverImage: "/images/inter-ring-20.jpg",
        steps: mkSteps({ piece: [im("/images/inter-ring-20.jpg", "Campione d'Italia ring with a diamond-set 20")] }),
        specs: SPECS_TBC,
        press: [],
        customBox: true,
        sortOrder: 2
      }
    ]
  },
  {
    slug: "icons",
    title: "Icons",
    tagline: "Symbols, sculpted in light.",
    intro: "Signature pendants, each one a symbol drawn for the person who wears it.",
    coverImage: "/images/the-hand.jpg",
    sortOrder: 2,
    jewels: [
      {
        slug: "the-hand",
        title: "The Hand",
        type: "pendant",
        line: "A diamond hand lit with rubies.",
        client: null,
        clientPublic: false,
        coverImage: "/images/the-hand.jpg",
        steps: mkSteps({ piece: [im("/images/the-hand.jpg", "The Hand pendant, diamonds and rubies")] }),
        specs: SPECS_TBC,
        press: [],
        customBox: false,
        sortOrder: 1
      },
      { slug: "t-serpent", title: "T-Serpent", type: "pendant", line: null, client: null, clientPublic: false, coverImage: "", steps: mkSteps({}), specs: SPECS_TBC, press: [], customBox: false, sortOrder: 2 },
      { slug: "rs", title: "RS", type: "pendant", line: null, client: null, clientPublic: false, coverImage: "", steps: mkSteps({}), specs: SPECS_TBC, press: [], customBox: false, sortOrder: 3 }
    ]
  },
  {
    slug: "statement-chains",
    title: "Statement Chains",
    tagline: "Links that carry a name.",
    intro: "Chains made to be seen, drawn link by link.",
    coverImage: "/images/butterfly-necklace.webp",
    sortOrder: 3,
    jewels: [
      {
        slug: "butterfly",
        title: "Butterfly",
        type: "chain",
        line: "A chain of diamond butterflies.",
        client: null,
        clientPublic: false,
        coverImage: "/images/butterfly-necklace.webp",
        steps: mkSteps({ piece: [im("/images/butterfly-necklace.webp", "Butterfly chain on a black bust")] }),
        specs: SPECS_TBC,
        press: [],
        customBox: false,
        sortOrder: 1
      },
      {
        slug: "sirius",
        title: "Sirius",
        type: "chain",
        line: null,
        client: null,
        clientPublic: false,
        coverImage: "",
        steps: mkSteps({ delivered: [im("/images/sirius-box.webp", "Black Sirius presentation trunk")] }),
        specs: SPECS_TBC,
        press: [],
        customBox: true,
        sortOrder: 2
      }
    ]
  }
];

type SeedStory = { slug: string; title: string; club: string | null; pieceName: string | null; jewelSlug: string | null; ownerSlug: string | null };
const st = (slug: string, title: string, owner: string | null = slug): SeedStory => ({ slug, title, club: null, pieceName: null, jewelSlug: null, ownerSlug: owner });

/* The highlights of Berete's Instagram, in the same order. */
const SEED_STORIES: SeedStory[] = [
  st("kenan-yildiz", "Kenan Yildiz"),
  st("noah-okafor", "Noah Okafor"),
  st("kevin-schade", "Kevin Schade"),
  st("thuram", "Thuram", "marcus-thuram"),
  st("lois-openda", "Loïs Openda"),
  { slug: "inter-milan", title: "Inter Milan", club: "Inter", pieceName: "Campione d'Italia 2023/2024", jewelSlug: "campione-d-italia-2023-2024", ownerSlug: "inter-milan" },
  st("michy-batshuayi", "Michy Batshuayi"),
  st("radja-nainggolan", "Radja Nainggolan"),
  st("collectors", "Collectors", null),
  st("press", "Press", null),
  st("noah-okafor-ii", "Noah Okafor II", "noah-okafor"),
  st("jamie-leweling", "Jamie Leweling"),
  { slug: "deniz-undav", title: "Deniz Undav", club: "VfB Stuttgart", pieceName: "DFB-Pokal 2025", jewelSlug: "vfb-stuttgart-dfb-pokal-2025", ownerSlug: "deniz-undav" },
  st("angelo-stiller", "Angelo Stiller"),
  st("samuel-ballet", "Samuel Ballet"),
  st("keita", "Keita Losene", "keita-losene"),
  st("malik-tillman", "Malik Tillman"),
  st("thuram-ii", "Thuram II", "marcus-thuram"),
  st("noah-okafor-iii", "Noah Okafor S24", "noah-okafor"),
  st("thuram-ss23", "Thuram SS23", "marcus-thuram"),
  st("inter-squad", "Inter Squad", "inter-milan"),
  st("sambi-lokonga", "Sambi Lokonga"),
  st("nz", "NZ", "tanguy-nianzou"),
  st("malik-tillman-ii", "Malik Tillman II", "malik-tillman"),
  st("tajon-buchanan", "Tajon Buchanan"),
  st("eljero-elia", "Eljero Elia"),
  st("sidney-eweka", "Sidney Eweka"),
  st("tanguy-nianzou", "Tanguy Nianzou"),
  { slug: "marcus-thuram", title: "Marcus Thuram", club: "Inter", pieceName: "Campione d'Italia 2023/2024", jewelSlug: "campione-d-italia-2023-2024", ownerSlug: "marcus-thuram" },
  st("jeff-chabot", "Jeff Chabot")
];

const STORY_LIST_FLAG = "stories-instagram-30-v2";

type SeedPerson = { slug: string; name: string; kind: "player" | "club" | "personality"; number: number | null; club: string | null };
const pl = (slug: string, name: string, number: number | null = null, club: string | null = null): SeedPerson => ({ slug, name, kind: "player", number, club });

const SEED_PEOPLE: SeedPerson[] = [
  pl("kenan-yildiz", "Kenan Yildiz"),
  pl("noah-okafor", "Noah Okafor"),
  pl("kevin-schade", "Kevin Schade"),
  pl("marcus-thuram", "Marcus Thuram", null, "Inter"),
  pl("lois-openda", "Loïs Openda"),
  pl("michy-batshuayi", "Michy Batshuayi"),
  pl("radja-nainggolan", "Radja Nainggolan"),
  pl("jamie-leweling", "Jamie Leweling"),
  pl("deniz-undav", "Deniz Undav", 26, "VfB Stuttgart"),
  pl("angelo-stiller", "Angelo Stiller", 6, "VfB Stuttgart"),
  pl("samuel-ballet", "Samuel Ballet"),
  pl("keita-losene", "Keita Losene"),
  pl("malik-tillman", "Malik Tillman"),
  pl("sambi-lokonga", "Sambi Lokonga"),
  pl("tajon-buchanan", "Tajon Buchanan"),
  pl("eljero-elia", "Eljero Elia"),
  pl("tanguy-nianzou", "Tanguy Nianzou"),
  pl("jeff-chabot", "Jeff Chabot"),
  pl("maximilian-mittelstaedt", "Maximilian Mittelstädt", 7, "VfB Stuttgart"),
  pl("chris-fuehrich", "Chris Führich", null, "VfB Stuttgart"),
  pl("atakan-karazor", "Atakan Karazor", null, "VfB Stuttgart"),
  { slug: "inter-milan", name: "Inter Milan", kind: "club", number: null, club: null },
  { slug: "vfb-stuttgart", name: "VfB Stuttgart", kind: "club", number: null, club: null },
  { slug: "sidney-eweka", name: "Sidney Eweka", kind: "personality", number: null, club: null }
];

const PEOPLE_FLAG = "people-v1";

/* Creates the players, clubs and personalities once and links the two championship pieces. Later admin edits stay. */
async function syncPeople(): Promise<void> {
  const done = await prisma.siteFlag.findUnique({ where: { key: PEOPLE_FLAG } });
  if (done !== null) return;
  let order = 0;
  for (const p of SEED_PEOPLE) {
    order += 1;
    await prisma.player.upsert({
      where: { slug: p.slug },
      update: { name: p.name, kind: p.kind, sortOrder: order },
      create: { slug: p.slug, name: p.name, kind: p.kind, number: p.number, club: p.club, portrait: null, bio: "", sortOrder: order }
    });
  }
  await prisma.jewel.updateMany({
    where: { slug: VFB },
    data: { playerSlugs: "deniz-undav,angelo-stiller,jamie-leweling,maximilian-mittelstaedt,chris-fuehrich,atakan-karazor,vfb-stuttgart" }
  });
  await prisma.jewel.updateMany({ where: { slug: INTER }, data: { playerSlugs: "inter-milan" } });
  await prisma.siteFlag.create({ data: { key: PEOPLE_FLAG } });
}

/* Applies the list above once: stories already in the base keep their photos and videos,
   the others are created, and stories not in the list are removed. Later admin edits stay. */
async function syncStories(): Promise<void> {
  const done = await prisma.siteFlag.findUnique({ where: { key: STORY_LIST_FLAG } });
  if (done !== null) return;
  const existing = await prisma.story.findMany({ select: { slug: true } });
  const present = new Set(existing.map((s) => s.slug));
  await prisma.$transaction([
    prisma.story.deleteMany({ where: { slug: { notIn: SEED_STORIES.map((s) => s.slug) } } }),
    ...SEED_STORIES.map((s, i) =>
      present.has(s.slug)
        ? prisma.story.update({ where: { slug: s.slug }, data: { title: s.title, ownerSlug: s.ownerSlug, sortOrder: i + 1 } })
        : prisma.story.create({ data: { ...s, coverImage: null, media: [], sortOrder: i + 1 } })
    ),
    prisma.siteFlag.create({ data: { key: STORY_LIST_FLAG } })
  ]);
}

/* Files sent by the owner for the highlights ("NN Story name - XX"), in the order XX.
   Each file is added once to its story and to the gallery of the person the story belongs to;
   a file already present is skipped. */
const STORY_FILES_FLAG = "story-files-kenan-yildiz-04-07";
const STORY_FILES: { story: string; files: StepMedia[] }[] = [
  {
    story: "kenan-yildiz",
    files: [
      im("/images/fournies/01-kenan-yildiz---04.jpg", "Kenan Yildiz, story à la une (4)"),
      vd("/images/fournies/01-kenan-yildiz---05.mp4", "Kenan Yildiz, story à la une (5)"),
      vd("/images/fournies/01-kenan-yildiz---06.mp4", "Kenan Yildiz, story à la une (6)"),
      im("/images/fournies/01-kenan-yildiz---07.jpg", "Kenan Yildiz, story à la une (7)")
    ]
  }
];

/* Files 01 to 03 of the same story: placed before the files already there, in the order XX;
   file 01 becomes the cover. Also placed first in the gallery of the person the story belongs to. */
const STORY_FIRST_FILES_FLAG = "story-files-kenan-yildiz-01-03";
const STORY_FIRST_FILES: { story: string; files: StepMedia[] }[] = [
  {
    story: "kenan-yildiz",
    files: [
      vd("/images/fournies/01-kenan-yildiz---01.mp4", "Kenan Yildiz, story à la une (1)"),
      vd("/images/fournies/01-kenan-yildiz---02.mp4", "Kenan Yildiz, story à la une (2)"),
      vd("/images/fournies/01-kenan-yildiz---03.mp4", "Kenan Yildiz, story à la une (3)")
    ]
  }
];

function srcOf(v: unknown): string {
  return v !== null && typeof v === "object" && "src" in v ? String((v as { src: unknown }).src) : "";
}

async function addStoryFiles(): Promise<void> {
  const done = await prisma.siteFlag.findUnique({ where: { key: STORY_FILES_FLAG } });
  if (done !== null) return;
  for (const entry of STORY_FILES) {
    const story = await prisma.story.findUnique({ where: { slug: entry.story } });
    if (story === null) continue;
    const media = Array.isArray(story.media) ? story.media : [];
    const inStory = new Set(media.map(srcOf));
    const toStory = entry.files.filter((f) => !inStory.has(f.src));
    if (toStory.length > 0) {
      await prisma.story.update({ where: { id: story.id }, data: { media: [...media, ...toStory] } });
    }
    const owner = story.ownerSlug;
    if (!owner) continue;
    const player = await prisma.player.findUnique({ where: { slug: owner } });
    if (player === null) continue;
    const gallery = Array.isArray(player.gallery) ? player.gallery : [];
    const inGallery = new Set(gallery.map(srcOf));
    const toGallery = entry.files.filter((f) => !inGallery.has(f.src));
    if (toGallery.length > 0) {
      await prisma.player.update({ where: { id: player.id }, data: { gallery: [...gallery, ...toGallery] } });
    }
  }
  await prisma.siteFlag.create({ data: { key: STORY_FILES_FLAG } });
}

async function addStoryFirstFiles(): Promise<void> {
  const done = await prisma.siteFlag.findUnique({ where: { key: STORY_FIRST_FILES_FLAG } });
  if (done !== null) return;
  for (const entry of STORY_FIRST_FILES) {
    const story = await prisma.story.findUnique({ where: { slug: entry.story } });
    if (story === null) continue;
    const media = Array.isArray(story.media) ? story.media : [];
    const inStory = new Set(media.map(srcOf));
    const toStory = entry.files.filter((f) => !inStory.has(f.src));
    const cover = entry.files[0]?.src ?? null;
    await prisma.story.update({
      where: { id: story.id },
      data: { media: [...toStory, ...media], coverImage: cover ?? story.coverImage }
    });
    const owner = story.ownerSlug;
    if (!owner) continue;
    const player = await prisma.player.findUnique({ where: { slug: owner } });
    if (player === null) continue;
    const gallery = Array.isArray(player.gallery) ? player.gallery : [];
    const inGallery = new Set(gallery.map(srcOf));
    const toGallery = entry.files.filter((f) => !inGallery.has(f.src));
    if (toGallery.length > 0) {
      await prisma.player.update({ where: { id: player.id }, data: { gallery: [...toGallery, ...gallery] } });
    }
  }
  await prisma.siteFlag.create({ data: { key: STORY_FIRST_FILES_FLAG } });
}

let catalogue: Promise<void> | null = null;

async function seedCatalogue(): Promise<void> {
  const capsuleCount = await prisma.capsule.count();
  if (capsuleCount === 0) {
    for (const c of SEED_CAPSULES) {
      await prisma.capsule.create({
        data: {
          slug: c.slug,
          title: c.title,
          tagline: c.tagline,
          intro: c.intro,
          coverImage: c.coverImage,
          sortOrder: c.sortOrder,
          jewels: { create: c.jewels }
        }
      });
    }
  }
  await syncStories();
  await syncPeople();
  await addStoryFiles();
  await addStoryFirstFiles();
}

async function ensureCatalogue(): Promise<void> {
  if (catalogue === null) {
    catalogue = seedCatalogue().catch((error: unknown) => {
      catalogue = null;
      throw error;
    });
  }
  await catalogue;
}

const jewelSummarySelect = { slug: true, title: true, type: true, line: true, client: true, clientPublic: true, coverImage: true } as const;

site.get("/stories", async (_req, res) => {
  await ensureCatalogue();
  const stories = await prisma.story.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { slug: true, title: true, club: true, pieceName: true, coverImage: true, media: true, jewelSlug: true, articleUrl: true }
  });
  res.json(fix({ stories }));
});

site.get("/capsules", async (_req, res) => {
  await ensureCatalogue();
  const rows = await prisma.capsule.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { jewels: true } } }
  });
  res.json({
    capsules: rows.map((c) => ({ slug: c.slug, title: c.title, tagline: c.tagline, coverImage: fixPath(c.coverImage), count: c._count.jewels }))
  });
});

site.get("/capsules/:slug", async (req, res) => {
  await ensureCatalogue();
  const slug = Slug.safeParse(String(req.params.slug));
  if (!slug.success) {
    res.status(404).json({ error: "Capsule not found." });
    return;
  }
  const capsule = await prisma.capsule.findUnique({
    where: { slug: slug.data },
    include: { jewels: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: jewelSummarySelect } }
  });
  if (capsule === null) {
    res.status(404).json({ error: "Capsule not found." });
    return;
  }
  res.json(fix({ capsule }));
});

site.get("/jewels/:slug", async (req, res) => {
  await ensureCatalogue();
  const slug = Slug.safeParse(String(req.params.slug));
  if (!slug.success) {
    res.status(404).json({ error: "Piece not found." });
    return;
  }
  const jewel = await prisma.jewel.findUnique({
    where: { slug: slug.data },
    include: {
      capsule: {
        select: { slug: true, title: true, jewels: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { slug: true, title: true } } }
      }
    }
  });
  if (jewel === null) {
    res.status(404).json({ error: "Piece not found." });
    return;
  }
  const list = jewel.capsule.jewels;
  const index = list.findIndex((j) => j.slug === jewel.slug);
  const next = list.length > 1 ? list[(index + 1) % list.length] : null;
  const { capsule, ...rest } = jewel;
  res.json(fix({ jewel: { ...rest, capsule: { slug: capsule.slug, title: capsule.title }, next } }));
});

site.get("/jewels", async (_req, res) => {
  await ensureCatalogue();
  const jewels = await prisma.jewel.findMany({
    orderBy: [{ capsule: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    select: { ...jewelSummarySelect, capsule: { select: { slug: true, title: true } } }
  });
  res.json(fix({ jewels }));
});

/* ---------- Media paths: old .webp names point to the real photos ---------- */

const FIXES: Record<string, string> = {
  "/images/vfb-ring-front.webp": "/images/vfb-ring-front.jpg",
  "/images/vfb-ring-open.webp": "/images/vfb-ring-open.jpg",
  "/images/vfb-team.webp": "/images/vfb-team.jpg",
  "/images/inter-ring-20.webp": "/images/inter-ring-20.jpg",
  "/images/the-hand.webp": "/images/the-hand.jpg"
};

function fixPath(s: string): string {
  return FIXES[s] ?? s;
}

function fix<T>(v: T): T {
  if (typeof v === "string") return fixPath(v) as T;
  if (Array.isArray(v)) return v.map((x: unknown) => fix(x)) as T;
  if (v !== null && typeof v === "object" && !(v instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = fix(x);
    return out as T;
  }
  return v;
}

/* ---------- Admin ---------- */

function adminToken(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return createHmac("sha256", password).update("berete-admin").digest("hex");
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = adminToken();
  const header = req.headers.authorization ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || given.length !== token.length || !timingSafeEqual(Buffer.from(given), Buffer.from(token))) {
    res.status(401).json({ error: "Session expirée, reconnectez-vous." });
    return;
  }
  next();
}

site.post("/admin/login", async (req, res) => {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    res.status(503).json({ error: "Le mot de passe admin n'est pas encore défini (ADMIN_PASSWORD dans l'onglet Environnement)." });
    return;
  }
  const body = z.object({ password: z.string().max(200) }).safeParse(req.body);
  if (!body.success || body.data.password !== password) {
    await new Promise((r) => setTimeout(r, 600));
    res.status(401).json({ error: "Mot de passe incorrect." });
    return;
  }
  res.json({ token: adminToken() });
});

site.post("/admin/upload", requireAdmin, express.raw({ type: () => true, limit: "80mb" }), async (req, res) => {
  const buf: unknown = req.body;
  if (!Buffer.isBuffer(buf) || buf.length === 0) {
    res.status(400).json({ error: "Fichier vide." });
    return;
  }
  const mime = String(req.headers["content-type"] ?? "application/octet-stream").split(";")[0].trim();
  if (!mime.startsWith("image/") && !mime.startsWith("video/")) {
    res.status(415).json({ error: "Seules les photos et les vidéos sont acceptées." });
    return;
  }
  let name = "";
  try {
    name = decodeURIComponent(String(req.headers["x-file-name"] ?? "")).slice(0, 200);
  } catch {
    name = "";
  }
  const file = await prisma.mediaFile.create({ data: { mime, name, size: buf.length, data: buf.toString("base64") } });
  res.status(201).json({ url: "/api/media/" + file.id, type: mime.startsWith("video/") ? "video" : "image" });
});

site.get("/media/:id", async (req, res) => {
  const file = await prisma.mediaFile.findUnique({ where: { id: String(req.params.id) } });
  if (file === null) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const buf = Buffer.from(file.data, "base64");
  res.setHeader("Content-Type", file.mime);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Accept-Ranges", "bytes");
  const range = req.headers.range;
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      const start = m[1] ? Number(m[1]) : 0;
      const end = m[2] ? Math.min(Number(m[2]), buf.length - 1) : buf.length - 1;
      if (start <= end && start < buf.length) {
        res.status(206);
        res.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + buf.length);
        res.setHeader("Content-Length", String(end - start + 1));
        res.end(buf.subarray(start, end + 1));
        return;
      }
    }
  }
  res.setHeader("Content-Length", String(buf.length));
  res.end(buf);
});

const optText = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null));
const SlugIn = z.string().trim().min(1).max(200).regex(/^[a-z0-9-]+$/);
const MediaItem = z.object({ src: z.string().min(1).max(500), type: z.enum(["image", "video"]), alt: z.string().max(300).default("") });
const MediaListIn = z.array(MediaItem).max(40).default([]);
const Reorder = z.object({ ids: z.array(z.string().min(1)).max(1000) });

const StoryIn = z.object({
  slug: SlugIn,
  title: z.string().trim().min(1).max(200),
  club: optText(200),
  pieceName: optText(200),
  jewelSlug: optText(200),
  articleUrl: optText(500),
  ownerSlug: optText(200),
  coverImage: optText(500),
  media: MediaListIn
});

const CapsuleIn = z.object({
  slug: SlugIn,
  title: z.string().trim().min(1).max(200),
  tagline: z.string().max(300).default(""),
  intro: z.string().max(3000).default(""),
  coverImage: z.string().max(500).default("")
});

const JewelIn = z.object({
  slug: SlugIn,
  title: z.string().trim().min(1).max(200),
  type: z.enum(["chain", "pendant", "ring", "bracelet", "watch"]),
  line: optText(500),
  client: optText(200),
  clientPublic: z.boolean().default(false),
  coverImage: z.string().max(500).default(""),
  steps: z.object({ idea: MediaListIn, design: MediaListIn, casting: MediaListIn, setting: MediaListIn, polish: MediaListIn, piece: MediaListIn, delivered: MediaListIn }),
  specs: z.array(z.object({ label: z.string().max(100), value: z.string().max(300) })).max(40).default([]),
  press: z
    .array(z.object({ outlet: z.string().max(200).default(""), title: z.string().max(300).default(""), url: z.string().max(500).nullable().default("").transform((v) => v ?? "") }))
    .max(20)
    .default([]),
  customBox: z.boolean().default(false),
  playerSlugs: z.string().max(2000).default(""),
  capsuleId: z.string().min(1)
});

function invalid(res: Response, error: z.ZodError): void {
  res.status(400).json({ error: "Formulaire incomplet ou invalide : " + error.issues.map((i) => i.path.join(".") || "champ").join(", ") + "." });
}

async function guard(res: Response, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "P2002") {
      res.status(409).json({ error: "Ce slug est déjà utilisé, choisissez-en un autre." });
      return;
    }
    if (code === "P2025") {
      res.status(404).json({ error: "Élément introuvable, il a peut-être déjà été supprimé." });
      return;
    }
    if (code === "P2003") {
      res.status(400).json({ error: "La capsule choisie n'existe pas." });
      return;
    }
    throw error;
  }
}

/* Stories */

site.get("/admin/stories", requireAdmin, async (_req, res) => {
  await ensureCatalogue();
  const items = await prisma.story.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  res.json(fix({ items }));
});

site.post("/admin/stories", requireAdmin, async (req, res) => {
  const p = StoryIn.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const last = await prisma.story.aggregate({ _max: { sortOrder: true } });
    const item = await prisma.story.create({ data: { ...p.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    res.status(201).json({ item });
  });
});

site.post("/admin/stories/reorder", requireAdmin, async (req, res) => {
  const p = Reorder.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    await prisma.$transaction(p.data.ids.map((id, i) => prisma.story.update({ where: { id }, data: { sortOrder: i + 1 } })));
    res.json({ ok: true });
  });
});

site.put("/admin/stories/:id", requireAdmin, async (req, res) => {
  const p = StoryIn.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const item = await prisma.story.update({ where: { id: String(req.params.id) }, data: p.data });
    res.json({ item });
  });
});

site.delete("/admin/stories/:id", requireAdmin, async (req, res) => {
  await guard(res, async () => {
    await prisma.story.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  });
});

/* Players, clubs, personalities */

const PlayerIn = z.object({
  slug: SlugIn,
  name: z.string().trim().min(1).max(200),
  number: z.number().int().nullable().optional().transform((v) => v ?? null),
  club: optText(200),
  kind: z.enum(["player", "club", "personality"]).default("player"),
  portrait: optText(500),
  bio: z.string().max(5000).default("")
});

site.get("/admin/players", requireAdmin, async (_req, res) => {
  await ensureSeeded();
  await ensureCatalogue();
  const items = await prisma.player.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  res.json(fix({ items }));
});

site.post("/admin/players", requireAdmin, async (req, res) => {
  const p = PlayerIn.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const last = await prisma.player.aggregate({ _max: { sortOrder: true } });
    const item = await prisma.player.create({ data: { ...p.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    res.status(201).json({ item });
  });
});

site.post("/admin/players/reorder", requireAdmin, async (req, res) => {
  const p = Reorder.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    await prisma.$transaction(p.data.ids.map((id, i) => prisma.player.update({ where: { id }, data: { sortOrder: i + 1 } })));
    res.json({ ok: true });
  });
});

site.put("/admin/players/:id", requireAdmin, async (req, res) => {
  const p = PlayerIn.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const item = await prisma.player.update({ where: { id: String(req.params.id) }, data: p.data });
    res.json({ item });
  });
});

site.delete("/admin/players/:id", requireAdmin, async (req, res) => {
  await guard(res, async () => {
    await prisma.player.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  });
});

/* Capsules */

site.get("/admin/capsules", requireAdmin, async (_req, res) => {
  await ensureCatalogue();
  const items = await prisma.capsule.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { jewels: true } } } });
  res.json(fix({ items }));
});

site.post("/admin/capsules", requireAdmin, async (req, res) => {
  const p = CapsuleIn.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const last = await prisma.capsule.aggregate({ _max: { sortOrder: true } });
    const item = await prisma.capsule.create({ data: { ...p.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    res.status(201).json({ item });
  });
});

site.post("/admin/capsules/reorder", requireAdmin, async (req, res) => {
  const p = Reorder.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    await prisma.$transaction(p.data.ids.map((id, i) => prisma.capsule.update({ where: { id }, data: { sortOrder: i + 1 } })));
    res.json({ ok: true });
  });
});

site.put("/admin/capsules/:id", requireAdmin, async (req, res) => {
  const p = CapsuleIn.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const item = await prisma.capsule.update({ where: { id: String(req.params.id) }, data: p.data });
    res.json({ item });
  });
});

site.delete("/admin/capsules/:id", requireAdmin, async (req, res) => {
  await guard(res, async () => {
    await prisma.capsule.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  });
});

/* Jewels (pieces) */

site.get("/admin/jewels", requireAdmin, async (_req, res) => {
  await ensureCatalogue();
  const items = await prisma.jewel.findMany({
    orderBy: [{ capsule: { sortOrder: "asc" } }, { sortOrder: "asc" }, { createdAt: "asc" }],
    include: { capsule: { select: { title: true } } }
  });
  res.json(fix({ items }));
});

site.post("/admin/jewels", requireAdmin, async (req, res) => {
  const p = JewelIn.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const last = await prisma.jewel.aggregate({ _max: { sortOrder: true }, where: { capsuleId: p.data.capsuleId } });
    const item = await prisma.jewel.create({ data: { ...p.data, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    res.status(201).json({ item });
  });
});

site.post("/admin/jewels/reorder", requireAdmin, async (req, res) => {
  const p = Reorder.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    await prisma.$transaction(p.data.ids.map((id, i) => prisma.jewel.update({ where: { id }, data: { sortOrder: i + 1 } })));
    res.json({ ok: true });
  });
});

site.put("/admin/jewels/:id", requireAdmin, async (req, res) => {
  const p = JewelIn.safeParse(req.body);
  if (!p.success) return invalid(res, p.error);
  await guard(res, async () => {
    const item = await prisma.jewel.update({ where: { id: String(req.params.id) }, data: p.data });
    res.json({ item });
  });
});

site.delete("/admin/jewels/:id", requireAdmin, async (req, res) => {
  await guard(res, async () => {
    await prisma.jewel.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  });
});
