/*
 * The pieces and the boxes. Every piece was found in the client's stories
 * and folders (see scripts/piece-media.mjs for the photos made from them).
 * The texts only describe what the photos show; they are drafts (draft: true)
 * until the client validates them. Nothing here is a figure (carats, weights,
 * prices): "seen" is the metal and the stones the photos show, the row "Metal
 * and stones" of the technical sheet, left out when the photos say nothing sure.
 */
import { anglesOf } from "./angles.js";
import { extra, group, hdGallery, list, sketch, st, still, yoni } from "./sources.js";
import type { PieceAtelier } from "./atelier.js";
import type { PieceDetailPoints } from "./details3d.js";
import type { PieceShowcase } from "./showcase.js";
import type { PieceTheme } from "./themes.js";
import { trunkPhotos } from "./trunks.js";
import type { Box, Making, MakingKey, MediaItem, Piece, PieceType, Press } from "./types.js";

export const VFB = "vfb-stuttgart-dfb-pokal-2025";
export const INTER = "campione-d-italia-2023-2024";
export const DAILY_MAIL_ARTICLE =
  "https://www.dailymail.co.uk/sport/football/article-13472573/Marko-Arnautovic-Marcus-Thuram-Hakan-Calhanoglu-commission-diamond-rings-Inter-Milan-teammates-clubs-20th-Scudetto-title.html";

/** The row of the technical sheet that says what the photos show (a draft until the jeweller confirms it). */
export const SEEN_LABEL = "Precious Materials";
/** Its name before the wording of November 2026: the row of a piece edited in the admin since then may still carry it. */
export const OLD_SEEN_LABEL = "Metal and stones";

/**
 * The pieces Yoni asked to remove from the catalogue (19 November 2026): kept unpublished, so he can publish them again
 * from the admin. Their addresses lead to the page of their player, else to the creations (server/index.ts, vercel.json).
 */
export const REMOVED_PIECES = [
  "jack-nameplate-pendant",
  "marcus-thuram-infinity-chain",
  "marcus-thuram-snowflake-pendant",
  "marcus-thuram-jesus-piece",
  "marcus-thuram-signet-ring",
  "marcus-thuram-t-monster-pendant",
  "jeff-chabot-jc-pendant",
  "tanguy-nianzou-nz-pendant",
  "tanguy-nianzou-nz-ring",
  "sidney-eweka-999-pendant",
  // The tennis chain of two rows (folder 03), crossed out by Yoni on his albums (20/11/2026).
  "two-row-tennis-chain",
  // Too few photos (feedback of Yoni, 21/11/2026): back on the site the day they have more.
  "flaneur-medallion",
  "two-tone-iced-cuban-chain",
  "white-iced-cuban-chain",
  "pear-link-chain",
];

/** Pieces worn together (22/11/2026): a pendant and the chain it is worn on. The page of each leads to the other. */
export const WORN_TOGETHER: [pendant: string, chain: string][] = [
  ["michy-batshuayi-butterfly-pendant", "butterfly-chain"],
  // The chain of Noah Okafor's jersey pendant detaches from it and closes into the Safi Link (Yoni, 23/11/2026).
  ["noah-okafor-jersey-pendant", "the-safi-link"],
];

/** The piece worn with this one, and what it is to it (its chain, or its pendant); null when none. */
export function wornWith(slug: string): { slug: string; is: "chain" | "pendant" } | null {
  for (const [pendant, chain] of WORN_TOGETHER) {
    if (slug === pendant) return { slug: chain, is: "chain" };
    if (slug === chain) return { slug: pendant, is: "pendant" };
  }
  return null;
}

/** A professional photo of the JL pendant of Jamie Leweling (23/11/2026), with what it shows (src/data/views.ts). */
const JL = (name: string, view: string) => extra("jamie-leweling-jl-pendant", name, { view });

/** The top of the Inter ring, a pendant of its own (Yoni, 23/11/2026). */
export const INTER_PENDANT = "campione-d-italia-pendant";

/** The ring of Bosnia and Herzegovina for the World Cup 2026 (Yoni, 23/11/2026). */
export const BOSNIA = "bosnia-and-herzegovina-world-cup-2026-ring";

/** The folder of hd of the Butterfly of Michy Batshuayi (folder 23): its pendant and its chain. */
const BUTTERFLY = "michy-batshuayi-butterfly-chain";

/** Pieces renamed since the first version of the site: old address -> new address. */
export const RENAMED_PIECES: Record<string, string> = {
  "white-hands": "kenan-yildiz-celebration-pendant",
  "t-serpent": "marcus-thuram-t-serpent-pendant",
  "the-jersey": "noah-okafor-jersey-pendant",
  rs: "angelo-stiller-as-pendant",
  butterfly: "michy-batshuayi-butterfly-pendant",
  // The Butterfly of Michy Batshuayi is two pieces since 22/11/2026 (Yoni): its old address is the pendant's.
  "michy-batshuayi-butterfly-chain": "michy-batshuayi-butterfly-pendant",
  // "Bouzou — Pendant" (folder 14) is the pendant of Loïs Openda (Yoni, 21/11/2026): one piece, at his address.
  "script-nameplate-pendant": "lois-openda-script-pendant",
};

type Maybe = MediaItem | null | undefined;

type PieceInput = {
  slug: string;
  title: string;
  type: PieceType;
  line: string;
  story: string;
  people?: string[];
  client?: string;
  /** Whether the client may be named on the site (by default: when there is one). */
  clientPublic?: boolean;
  /** Shown on the site (by default; false: kept in the admin only). */
  published?: boolean;
  /** The universe of the page (src/data/themes.ts). */
  theme?: PieceTheme;
  showcase?: PieceShowcase;
  /** The name of its sketch in the folder of sketches, when it is not its address (a piece renamed: the file keeps its name). */
  sketch?: string;
  atelier?: PieceAtelier;
  detailPoints?: PieceDetailPoints;
  cover: Maybe;
  gallery: Maybe[];
  handover?: Maybe[];
  specs: [label: string, value: string][];
  /** The symbols of the piece: [title, text, the photo that shows it]. */
  details?: [title: string, text: string, photo: Maybe][];
  /** The metal and the stones seen in the photos (row "Precious Materials"), to be confirmed by the jeweller. No figure. */
  seen?: string;
  press?: Press[];
  boxSlug?: string;
  featured?: boolean;
  making?: Partial<Record<MakingKey, Maybe>>;
};

/** The text of a first sketch: the site translates it with the title of the piece (src/i18n/content.ts). */
export const sketchAlt = (title: string) => "Yoni Berete's hand drawing the first sketch of " + title;

function piece(p: PieceInput): Piece {
  const making: Making = {};
  for (const [step, item] of Object.entries(p.making ?? {}) as [MakingKey, Maybe][]) if (item) making[step] = item;
  // The first sketch from the folder of sketches (the hand of Yoni drawing the piece, since 20/11/2026), else the image
  // the piece gives for this step (Dragon Ball: its first hand drawing, from the stories).
  making.sketch = sketch(p.sketch ?? p.slug, at(sketchAlt(p.title), "The first sketch")) ?? making.sketch;
  if (!making.sketch) delete making.sketch;
  return {
    slug: p.slug,
    title: p.title,
    type: p.type,
    line: p.line,
    story: p.story,
    client: p.client ?? null,
    clientPublic: p.clientPublic ?? p.client !== undefined,
    cover: p.cover ?? { type: "image", src: "" },
    gallery: list(...p.gallery),
    handover: list(...(p.handover ?? [])),
    specs: [...p.specs.map(([label, value]) => ({ label, value })), ...(p.seen ? [{ label: SEEN_LABEL, value: p.seen }] : [])],
    details: (p.details ?? []).map(([title, text, photo]) => ({ title, text, photo: photo?.src || null })),
    // The text of each of its photos in "Every Angle" (src/data/angles.json).
    angles: anglesOf(p.slug, null),
    press: p.press ?? [],
    people: p.people ?? [],
    boxSlug: p.boxSlug ?? null,
    featured: p.featured ?? false,
    draft: true,
    published: p.published ?? !REMOVED_PIECES.includes(p.slug),
    theme: p.theme ?? null,
    showcase: p.showcase ?? null,
    atelier: p.atelier ?? null,
    detailPoints: p.detailPoints ?? null,
    making,
  };
}

const at = (alt: string, caption?: string): Partial<MediaItem> => (caption ? { alt, caption } : { alt });

/**
 * The professional photos of a box (00 Contexte Yoni/Boites (photos pro), scripts/trunk-media.mjs), in their order, each
 * with its texts (what the photo shows).
 */
const proImages = (slug: string, texts: Partial<MediaItem>[]): MediaItem[] =>
  trunkPhotos(slug).map((p, i) => ({ type: "image", src: p.src, width: p.width, height: p.height, onBlack: false, ...texts[i] }));

/* ---------- Photos of the site folders ---------- */

/** The VfB Stuttgart ring: the photos of the club (the press page of Bild) and the high-resolution photos of Yoni. */
const vfbPhotos = group("pieces/" + VFB, [], false);
const V = (file: string, texts: Partial<MediaItem>) => yoni(VFB, file, texts);
const vfb = {
  front: V("p17", at("VfB Stuttgart championship ring, front view, set with diamonds and red stones")),
  open: V("p13", at("The ring opened: its removable top reveals the DFB-Pokal", "The top lifts off")),
  cup: V("p14", at("The sculpted DFB-Pokal under the top of the ring", "The cup, under the top")),
  engraving: V("p15", at("DFB-Pokal engraving on the side of the ring", "The DFB-Pokal engraving")),
  profile: V("p16", at("Profile of the ring with the cup on its side", "The profile")),
  crest: V("p20", at("The VfB Stuttgart crest set on the top of the ring", "The crest")),
  undav: V("p6", at("Deniz Undav's ring with his number 26", "Deniz Undav · 26")),
  stiller: V("p12", at("Angelo Stiller's ring with his number 6", "Angelo Stiller · 6")),
  mittelstaedt: V("p11", at("Maximilian Mittelstädt's ring with his number 7", "Maximilian Mittelstädt · 7")),
  karazor: V("p18", at("Atakan Karazor's ring with his number 16", "Atakan Karazor · 16")),
  squad: V("p22", at("Rings of the squad, side by side", "A ring for each player")),
  presentation: V("p7", { ...at("VfB Stuttgart players with their rings at the handover", "The Moment of Victory"), onBlack: false }),
  showcase: V("p8", { ...at("The DFB-Pokal in the club showcase"), onBlack: false }),
  shown: V("p4", { ...at("A VfB Stuttgart player shows his ring"), onBlack: false }),
};

/** The Inter Milan ring: the high-resolution photos of Yoni, each detail with the photo that shows it. */
const I = (file: string, texts: Partial<MediaItem>) => yoni(INTER, file, texts);
const inter = {
  ring: I("p40", at("The Campione d'Italia ring: the Inter emblem in diamonds on a deep blue ground")),
  top: I("p8", at("The emblem of the ring seen from above")),
  emblem: I("p52", at("The Inter emblem set in diamonds on a blue ground, inside a ring of stars", "The emblem")),
  stars: I("p53", at("Close-up of the stars and of the black and blue stones around the emblem", "The stars")),
  flag: I("p12", at("Forza Inter above the Italian flag, on the side of the ring", "Forza Inter")),
  side: I("p6", at("Campione d'Italia written on the side of the ring", "On the side")),
  serieA: I("p15", at("The Serie A logo with the 20, next to the words Campione d'Italia", "The Serie A logo")),
  cup: I("p43", at("The top of the ring lifted off, next to the cup it covers", "The top lifts off")),
  pendant: I("p44", at("The top of the ring with its bail, worn as a pendant", "Worn as a pendant")),
  brt: I("p11", at("The BRT mark on the side of the ring", "The BRT mark")),
  squad: I("p60", { ...at("Tray of Campione d'Italia rings made for the whole squad", "A ring for the whole squad"), onBlack: false }),
  glove: I("p64", { ...at("A Campione d'Italia ring held in a white glove", "Checked before the handover"), onBlack: false }),
  case: I("p20", { ...at("The ring in its Campione d'Italia case"), onBlack: false }),
  caseOpen: I("p22", { ...at("The Campione d'Italia case, open, with the ring and its card"), onBlack: false }),
  received: ["p17", "p25", "p28"].map((f) => I(f, { ...at("An Inter player receives his ring"), onBlack: false })),
};

/**
 * The photos of a piece in the order of its sorted folder (scripts/hd-media.mjs, "gallery"): the first is its cover, the
 * others its gallery. A photo written here (`own`) keeps its texts; every other one says what it shows (src/data/views.ts).
 * Before its folder is sorted (no gallery yet), the photos written here, in their order.
 */
/**
 * The cover and the gallery of a piece from its folder of hd, in the order of the folder; `files`: only these files of the
 * folder, in this order (a folder that serves two pieces: the Butterfly pendant and its chain).
 */
/** The photos of a folder in their order, one of them first (the hero and the cover asked by Yoni, 23/11/2026). */
function lead(dir: string, file: string): string[] {
  return [file, ...hdGallery(dir).map((g) => g.file).filter((f) => f !== file)];
}

function sorted(dir: string, own: Maybe[], files?: string[]): { cover: Maybe; gallery: Maybe[] } {
  const known = new Map(list(...own).map((m) => [m.src, m]));
  const all = hdGallery(dir);
  const order = files ? files.map((file) => all.find((g) => g.file === file) ?? { file }) : all;
  const items = order.length > 0 ? order.map(({ file, view }) => {
    const m = yoni(dir, file);
    if (!m) return null;
    const mine = known.get(m.src);
    if (mine) return view && !mine.view ? { ...mine, view } : mine;
    return { ...m, ...(view ? { view, ...(OFF_BLACK.has(view) ? { onBlack: false } : {}) } : {}) };
  }) : own;
  // Its photos and films from the stories (not in its folder) follow, in their order.
  const others = order.length > 0 ? list(...own).filter((m) => !m.src.startsWith("/media/hd/" + dir + "/")) : [];
  const [cover, ...gallery] = list(...items, ...others);
  return { cover, gallery };
}

/** Views of photos that are not shot on black (worn, in the hand, in a case, a film): they fill their frame. */
const OFF_BLACK = new Set(["worn", "hand", "case", "film"]);

/** One more photo among the details of a sorted gallery: after the last detail (else at the end). */
function afterDetails({ cover, gallery }: { cover: Maybe; gallery: Maybe[] }, item: Maybe): { cover: Maybe; gallery: Maybe[] } {
  const last = gallery.map((m) => m?.view).lastIndexOf("detail");
  const place = last < 0 ? gallery.length : last + 1;
  return { cover, gallery: [...gallery.slice(0, place), item, ...gallery.slice(place)] };
}

/** Texts shared by the photos of many pieces. */
const RAW = () => at("The piece in raw metal, before the setting", "This piece, before the setting");
/* The steps of "The Making of a Masterpiece" taken from the films of each piece (21/11/2026: src/data/making.ts). */
const SET = () => ({ ...at("The stones set by hand, under magnification", "In the setting"), onBlack: false });
const POLISH = () => ({ ...at("The piece polished at the wheel", "At the polishing wheel"), onBlack: false });
const MODEL = () => ({ ...at("The model of the piece, before casting", "The model"), onBlack: false });
const CHECKED = () => ({ ...at("The finished piece checked in gloves", "Checked by hand"), onBlack: false });
const IN_BOX = () => ({ ...at("The piece in its box", "In its box"), onBlack: false });
const IN_TRUNK = () => ({ ...at("The piece in its trunk", "In its trunk"), onBlack: false });
const HANDED = () => ({ ...at("The piece handed over", "Handed over"), onBlack: false });
const raw = (dir: string, file: string) => yoni(dir, file, { ...RAW(), onBlack: false });
const SETTING_FILM = () => at("Film: the stones set by hand", "In the setting");
const BACK = () => at("The back of the pendant with the BRT mark", "The back");
const BAIL = () => at("The bail set with diamonds", "The bail");

/**
 * The "Special project" of the home page: the two championship rings side by side, both opening onto their trophy.
 * closed / open: the photos of the ring shut and with its top lifted (addresses of photos of the piece).
 */
export const SPECIAL_PROJECT: { slug: string; trophy: string; closed: string; open: string }[] = [
  { slug: INTER, trophy: "Campione d'Italia 2023/2024", closed: inter.top?.src ?? "", open: inter.cup?.src ?? "" },
  { slug: VFB, trophy: "DFB-Pokal 2025", closed: vfb.front?.src ?? "", open: vfb.open?.src ?? "" },
];

/* ---------- The pieces ---------- */

const SITE_PIECES: Piece[] = [
  /* Rings */
  piece({
    slug: VFB,
    title: "VfB Stuttgart — DFB-Pokal 2025 Ring",
    type: "ring",
    line: "The top lifts off and reveals the trophy.",
    // In four parts (22–23/11/2026): the inspiration, the design, the technique, the details; only the facts already known
    // (the red stones around the crest are cut as shields, not pears).
    story:
      "## Winners of the 2025 DFB-Pokal\n\n" +
      "A championship ring for the VfB Stuttgart squad that won the 2025 DFB-Pokal.\n\n" +
      "## The Crest at the Centre\n\n" +
      "At its heart, the enamelled club crest, framed by red stones cut in the shape of a shield.\n\n" +
      "## A Top That Lifts Off\n\n" +
      "The top is removable: lifted, it uncovers a sculpted cup, and the side of the ring carries the DFB-Pokal engraving.\n\n" +
      "## One Ring per Player\n\n" +
      "Every ring carries the name and number of the player who wears it.",
    people: ["deniz-undav", "angelo-stiller", "jamie-leweling", "maximilian-mittelstaedt", "chris-fuehrich", "atakan-karazor", "vfb-stuttgart"],
    client: "VfB Stuttgart",
    theme: { preset: "victoire-rouge" },
    // The crest ring face on as the hero (Yoni, 23/11/2026).
    showcase: { size: "large", views: ["p13", "p12", "p18"] },
    ...sorted(VFB, [vfb.front, vfb.open, vfb.cup, vfb.engraving, vfb.profile, vfb.crest, vfb.undav, vfb.stiller, vfb.mittelstaedt, vfb.karazor, vfb.squad]),
    handover: [vfb.presentation, vfb.showcase, vfb.shown, st("collectors", 41, at("VfB Stuttgart players with the ring", "The squad and its ring"))],
    press: [{ outlet: "Bild", title: "The VfB champions receive their rings", url: null, image: vfbPhotos[10]?.src ?? null }],
    specs: [
      ["Type", "Championship ring"],
      ["Top", "Removable, reveals the trophy"],
      ["Personalisation", "Name and number of each player"],
      ["Series", "Created for the squad"],
    ],
    seen: "Rose and white gold tones · round diamonds in pavé, baguettes, triangle-cut stones, red stones; an enamelled crest",
    featured: true,
    boxSlug: "dfb-pokal-2025-display",
    making: { raw: raw(VFB, "08-v05-6s"), setting: yoni(VFB, "08-v05-19s", SET()), polishing: yoni(VFB, "08-v05-4_6s", POLISH()), delivery: vfb.presentation },
  }),
  piece({
    slug: INTER,
    title: "Inter Milan — Campione d'Italia Ring",
    type: "ring",
    line: "Twenty stars for twenty titles.",
    // In four parts (22–23/11/2026), from the facts of its details only; the 20 is polished rose gold, not set.
    story:
      "## The Twentieth Title\n\n" +
      "After Inter Milan's twentieth league title, a ring was made for every player of the squad.\n\n" +
      "## The Club, Detail by Detail\n\n" +
      "The emblem is set in diamonds on a deep blue ground, inside a band of stars, circled by the black and blue stripes of the shirt. On the sides: Forza Inter above the Italian flag, the Serie A logo with its 20, and the words Inter Milan Campione d'Italia.\n\n" +
      "## The Hidden Cup\n\n" +
      "Six months of work went into the ring. Its top lifts off onto a sculpted cup hidden beneath, and can be worn on its own as a pendant.\n\n" +
      "## One Star for Each Title\n\n" +
      "Twenty stars and twenty diamonds, one of each for every title, and the 20 itself in polished rose gold.\n\n" +
      "> Twenty titles, one number.",
    people: ["inter-milan", "marcus-thuram"],
    client: "Inter Milan",
    theme: { preset: "victoire-nuit" },
    // Its face view as the hero (Yoni, 23/11/2026).
    showcase: { size: "large", views: ["p08", "p13", "p54", "p04", "p44"] },
    ...sorted(INTER, [inter.ring, inter.emblem, inter.stars, inter.flag, inter.side, inter.serieA, inter.cup, inter.pendant, inter.brt, inter.squad, inter.glove]),
    handover: [st("inter-squad", 2, at("Inter players with their rings", "The Moment of Victory")), ...inter.received, st("inter-squad", 5, at("An Inter player receives his ring"))],
    press: [
      { outlet: "Daily Mail", title: "Arnautovic, Thuram and Calhanoglu commission diamond rings for their Inter teammates", url: DAILY_MAIL_ARTICLE, image: null },
      { outlet: "Het Nieuwsblad", title: "Inter celebrates its twentieth title with championship rings", url: null, image: null },
      { outlet: "GVA", title: "Inter celebrates its twentieth title with championship rings", url: null, image: null },
      { outlet: "FCInterNews", title: "A ring to celebrate: a special gift for the Inter players", url: null, image: null },
      { outlet: "SPORTbible", title: "Football fans debate replacing winner medals with rings", url: null, image: null },
    ],
    specs: [
      ["Type", "Championship ring"],
      ["Motif", "The club emblem and the number 20"],
      ["Top", "Removable, can be worn as a pendant"],
      ["Series", "Created for the whole squad"],
    ],
    // What the jeweller told about the ring (meeting of 9 November 2026), each detail with the photo that shows it.
    details: [
      ["Six Months of Craftsmanship", "The ring took six months of work.", null],
      ["Twenty stars, twenty diamonds", "One star and one diamond for each of the club's twenty league titles.", inter.emblem],
      ["The colours of the shirt", "Black, blue, black, blue: the stripes of the Inter shirt run all around the emblem.", inter.stars],
      ["The Italian flag", "The green, white and red of the Italian flag, on the side of the ring.", inter.flag],
      ["Forza Inter", "Above the flag, the cry of the supporters: Forza Inter.", inter.flag],
      ["The Serie A logo", "The logo of the Serie A, with the number 20 added to it.", inter.serieA],
      ["Campione d'Italia", "Inter Milan Campione d'Italia, written around the ring.", inter.side],
      ["The Secret Within", "The top lifts off and reveals the cup hidden underneath.", inter.cup],
      ["Beyond a Ring", "The top can also be worn on its own, as a pendant.", inter.pendant],
    ],
    seen: "White gold tone, rose gold stars and 20 · round diamonds in pavé, baguettes; blue, green and red enamel",
    boxSlug: "campione-d-italia-case",
    // setting2: baguettes set on its side (08/v25, the same session as 08/v24 and 08/v26: confirmed by Yoni, 21/11/2026).
    making: { raw: raw(INTER, "v02-14_6s"), setting: yoni(INTER, "v02-27_4s", SET()), setting2: yoni(INTER, "08-v25-3s", { ...at("Baguettes set on the side of the ring", "In the setting"), onBlack: false }), polishing: yoni(INTER, "v02-34_4s", POLISH()), delivery: inter.case },
  }),
  piece({
    slug: "tanguy-nianzou-nz-ring",
    title: "Tanguy Nianzou — NZ Ring",
    type: "ring",
    line: "His initials, on a ring paved all around.",
    story: "A wide ring in rose gold tones, paved with diamonds on every face, with the letters NZ raised on its top.",
    people: ["tanguy-nianzou"],
    cover: still("pieces/tanguy-nianzou-nz-ring/cover", at("The NZ ring of Tanguy Nianzou, held between two gloved fingers")),
    gallery: [st("tanguy-nianzou", 2, at("Film of the NZ ring turning in the hand"))],
    specs: [
      ["Type", "Ring"],
      ["Motif", "The initials NZ"],
      ["Setting", "Diamonds on every face"],
    ],
  }),
  piece({
    slug: "marcus-thuram-signet-ring",
    title: "Marcus Thuram — Iced Signet Ring",
    type: "ring",
    line: "A signet ring with no metal left to see.",
    story: "A broad signet ring, set with diamonds over its whole surface, shown on the hand of the man who wears it.",
    people: ["marcus-thuram"],
    cover: still("pieces/marcus-thuram-signet-ring/cover", at("The iced signet ring of Marcus Thuram, worn on the hand")),
    gallery: [st("marcus-thuram", 5, at("Film of the signet ring on the hand"))],
    specs: [
      ["Type", "Signet ring"],
    ],
    seen: "White gold tone · round diamonds in pavé, baguettes along the edge, a pear-shaped stone",
  }),

  /* Pendants */
  piece({
    slug: "kevin-schade-dragon-ball-pendant",
    title: "Kevin Schade — Dragon Ball Pendant",
    type: "pendant",
    // The official text of Yoni (22/11/2026), word for word, in two parts with their titles ("## "); its last words set apart
    // as a closing quote ("> "), and its line (src/data/story.ts).
    line: "Not power taken, but power entrusted.",
    story:
      "## The Vision Behind the Creation\n\n" +
      "A lifelong admirer of Dragon Ball Z, Kevin Schade challenged Berete to create an extraordinary, never-before-seen piece inspired by Goku and his iconic Genki Dama — a technique Kevin himself had celebrated on the football pitch.\n\n" +
      "In the Dragon Ball universe, the Spirit Bomb gathers energy from the world around Goku — humans, animals, plants, and even the atmosphere — uniting these different sources into one immense sphere.\n\n" +
      "We translated this principle into diamonds.\n\n" +
      "Different cuts, settings and orientations represent the diversity of energy sources contributing to a single collective force.\n\n" +
      "But to us, energy was never meant to remain still.\n\n" +
      "We therefore engineered the diamond-set Spirit Bomb to rotate, bringing movement to the very heart of the creation.\n\n" +
      "Every detail has a purpose. Nothing is accidental.\n\n" +
      "## The Art of Craftsmanship\n\n" +
      "The rotating Spirit Bomb combines round, emerald and princess-cut diamonds through multiple setting techniques, including prong, bezel, channel and reverse settings.\n\n" +
      "Even the inverted diamonds carry meaning, symbolising the unseen contributions that form a greater whole.\n\n" +
      "Beneath the sphere, Goku channels the gathered energy, surrounded by the seven iconic Dragon Balls, each distinguished by its number of stars.\n\n" +
      "A creation where symbolism, engineering and high jewellery become one.\n\n" +
      "> Not power taken, but power entrusted.",
    people: ["kevin-schade"],
    // Its own world inside the universe "Énergie" (20/11/2026): black, the sphere of light of the Genkidama, the light
    // rising to it (the chain of Kevin Schade keeps the universe as it is). Nothing official of Dragon Ball.
    theme: { preset: "energie", base: "#020407", tint: "#061624", glow: "#bfe6ff", backdrop: "genkidama", effects: ["genkidama", "impact"] },
    // Its main view much larger at the opening (feedback of Yoni, 21/11/2026), whole, on a computer and on a phone.
    // 23/11/2026 (Yoni): the view with its chain alone and larger at the opening; its back no longer first (at the end of
    // its photos).
    showcase: { size: "large", mode: "single", views: ["p19"] },
    ...sorted("kevin-schade-dragon-ball-pendant", [
      yoni("kevin-schade-dragon-ball-pendant", "p19", at("The Dragon Ball pendant on black, with its Cuban chain")),
      yoni("kevin-schade-dragon-ball-pendant", "p18", at("Kevin Schade's Dragon Ball pendant, seen from the front")),
      yoni("kevin-schade-dragon-ball-pendant", "p07", at("The hero in rose gold, among the dragon balls", "The hero")),
      yoni("kevin-schade-dragon-ball-pendant", "p09", at("The sphere set with blue stones", "The sphere")),
      yoni("kevin-schade-dragon-ball-pendant", "p08", at("Close-up of the dragon scales and the rose gold spheres", "The dragon, up close")),
      yoni("kevin-schade-dragon-ball-pendant", "p14", at("The hero lifting the sphere")),
      yoni("kevin-schade-dragon-ball-pendant", "p06", BACK()),
      yoni("kevin-schade-dragon-ball-pendant", "p20", at("The pendant on its chain, on a black bust")),
      st("kevin-schade", 22, at("Film of the pendant turning in a gloved hand")),
    ]),
    // Only what the text of Yoni says (22/11/2026); what the photos seemed to show is no longer written.
    specs: [
      ["Motif", "Goku and the Spirit Bomb, surrounded by the seven Dragon Balls"],
      ["Spirit Bomb", "Rotating, diamond-set"],
      ["Diamond cuts", "Round, emerald, princess"],
      ["Settings", "Prong, bezel, channel, reverse"],
    ],
    boxSlug: "dragon-ball-trunk",
    making: {
      sketch: st("kevin-schade", 8, at("The first hand drawing of the Dragon Ball pendant", "The Original Vision")),
      raw: yoni("kevin-schade-dragon-ball-pendant", "p21", { ...RAW(), onBlack: false }),
      setting: yoni("kevin-schade-dragon-ball-pendant", "v01-17_5s", SET()),
      polishing: yoni("kevin-schade-dragon-ball-pendant", "v01-10s", POLISH()),
      // Its trunk open on it, in its professional photo (22/11/2026).
      delivery: proImages("dragon-ball-trunk", [{}, {}, at("The orange trunk open on the Dragon Ball pendant")])[2] ?? yoni("boxes/dragon-ball-trunk", "p01", at("The orange trunk open on the Dragon Ball pendant")),
    },
  }),
  piece({
    slug: "kenan-yildiz-celebration-pendant",
    title: "Kenan Yildiz — Celebration Pendant",
    type: "pendant",
    line: "His celebration, crossed in diamonds.",
    story:
      "Two hands crossed in the gesture of his goal celebration, sculpted in volume and paved with white diamonds, with baguette-cut stones at the cuffs. A round medallion sits on the bail.",
    people: ["kenan-yildiz"],
    // Its stadium darkened by Yoni (23/11/2026); the piece larger (Yoni: at least 30 % larger).
    theme: { preset: "bianconero" },
    showcase: { size: "large" },
    ...sorted("kenan-yildiz-celebration-pendant", [
      yoni("kenan-yildiz-celebration-pendant", "p07", at("Kenan Yildiz's pendant: two crossed hands paved with diamonds")),
      yoni("kenan-yildiz-celebration-pendant", "p06", at("The celebration pendant from another angle")),
      yoni("kenan-yildiz-celebration-pendant", "p02", at("The celebration pendant in profile")),
      yoni("kenan-yildiz-celebration-pendant", "p03", at("The celebration pendant and its medallion")),
      yoni("kenan-yildiz-celebration-pendant", "v01", at("Film of the celebration pendant")),
      yoni("kenan-yildiz-celebration-pendant", "p01", { ...at("Kenan Yildiz wearing the pendant", "Worn by Kenan Yildiz"), onBlack: false }),
      st("kenan-yildiz", 4, at("The pendant and its medallion on black")),
    ]),
    specs: [
      ["Type", "Pendant"],
      ["Motif", "Two crossed hands, his celebration"],
    ],
    seen: "White gold tone · round diamonds in pavé, baguettes at the cuffs, step-cut stones on the bail",
    // Its first step: the hand of Yoni drawing it (folder of sketches; before 20/11/2026, the 3D model of story 1).
  }),
  piece({
    slug: "noah-okafor-jersey-pendant",
    title: "Noah Okafor — Jersey Pendant",
    type: "pendant",
    // What Yoni told of it (22–23/11/2026), in four parts: Oka4, the crown of the four siblings, the two flags, the chain that
    // becomes the Safi Link.
    line: "His celebration, his family and his two flags, set in diamonds.",
    story:
      "## Half Swiss, Half Nigerian\n\n" +
      "Noah Okafor is half Swiss, half Nigerian. His pendant carries both, in the pose of his goal celebration: a jersey, arms crossed.\n\n" +
      "## Two Flags on One Jersey\n\n" +
      "The Swiss emblem sits on the chest, a white cross on a shield of red stones. The flag of Nigeria circles the sleeve, and the three stripes of the jersey take up its colours.\n\n" +
      "## A Chain That Becomes the Safi Link\n\n" +
      "The chain detaches and clips into the pendant. Removed, it closes with a connecting piece and becomes a chain of its own: the Safi Link. Decorative details, down to the triangle-cut stones of the base, are there to show the craft.\n\n" +
      "## Oka4\n\n" +
      "On the back, OKA and the number 4: read aloud, Oka4 becomes Okafor. Above the 4, a crown for the four Okafor siblings.\n\n" +
      "> Two flags, four siblings, one name.",
    people: ["noah-okafor"],
    // Its own world since 23/11/2026 (Yoni): spotlights in the colours of Nigeria and Switzerland.
    theme: { preset: "okafor-jersey" },
    // The jersey with its chain as the hero (Yoni, 23/11/2026).
    showcase: { size: "large", views: ["p20", "p06", "p02"] },
    ...sorted("noah-okafor-jersey-pendant", [
      yoni("noah-okafor-jersey-pendant", "p20", at("Noah Okafor's jersey pendant on a chain of diamond flowers")),
      yoni("noah-okafor-jersey-pendant", "p18", at("The Swiss cross on the chest", "The Swiss cross")),
      yoni("noah-okafor-jersey-pendant", "p15", at("Green and white stones on the sleeve", "The sleeve")),
      yoni("noah-okafor-jersey-pendant", "p07", at("OKA and the number 4 on the back of the jersey", "The back")),
      yoni("noah-okafor-jersey-pendant", "p12", at("Close-up of the triangle-cut stones", "Triangle-cut stones")),
      yoni("noah-okafor-jersey-pendant", "p10", at("The collar of the jersey in rose gold")),
      yoni("noah-okafor-jersey-pendant", "p06", at("The back of the jersey pendant")),
      yoni("noah-okafor-jersey-pendant", "p16", at("The pendant, arms crossed, from another angle")),
      yoni("noah-okafor-jersey-pendant", "p01", { ...at("Noah Okafor wearing the pendant", "Worn by Noah Okafor"), onBlack: false }),
      // Not the story 11 (the same edit as its film v01, a duplicate).
    ]),
    specs: [
      ["Type", "Pendant"],
      ["Motif", "His goal celebration: a jersey, arms crossed"],
      ["Chain", "Detachable, worn on its own as the Safi Link"],
    ],
    seen: "White and rose gold tones · round diamonds in pavé, pear, marquise, baguette and triangle-cut diamonds; green and red stones",
    making: { raw: raw("noah-okafor-jersey-pendant", "p21"), setting: yoni("noah-okafor-jersey-pendant", "v02-21_2s", SET()), delivery: yoni("noah-okafor-jersey-pendant", "v02-12_2s", IN_TRUNK()) },
  }),
  piece({
    slug: "noah-okafor-oka-pendant",
    title: "Noah Okafor — OKA Nameplate Pendant",
    type: "pendant",
    // Its first piece with Berete; the camouflage of a friend's Swiss military service hides two maps (Yoni, 22–23/11/2026).
    line: "His first piece with Berete: two maps hidden in a camouflage.",
    story:
      "## A Friend's Military Service\n\n" +
      "The first piece Noah Okafor created with Berete. Its idea came from a friend's Swiss military service.\n\n" +
      "## Three Letters in Camouflage\n\n" +
      "The letters OKA are set in white diamonds and crossed by patches of polished rose gold, drawn like a camouflage.\n\n" +
      "## Gold Over Diamonds\n\n" +
      "Baguettes fill the letters and round diamonds edge them, down to their flanks, beneath raised patches of rose gold. The pendant hangs from a Cuban chain of white and rose gold links, lined with baguettes.\n\n" +
      "## Two Maps and a Ball\n\n" +
      "Within the camouflage hide the map of Switzerland and the map of Nigeria, side by side. On the K, a small football in rose gold, for the game.",
    people: ["noah-okafor"],
    // Its own world since 23/11/2026 (Yoni): a camouflage in rose gold over the lines of a map.
    theme: { preset: "okafor-oka" },
    ...sorted("noah-okafor-oka-pendant", [
      yoni("noah-okafor-oka-pendant", "p17", at("The OKA nameplate pendant of Noah Okafor on its Cuban chain")),
      yoni("noah-okafor-oka-pendant", "p03", at("Close-up of the rose gold football", "The ball")),
      yoni("noah-okafor-oka-pendant", "p05", at("The OKA pendant on its Cuban chain, on a black bust")),
      yoni("noah-okafor-oka-pendant", "p06", at("The letter O, set with baguettes")),
      yoni("noah-okafor-oka-pendant", "p04", at("The rose gold patches on the letters")),
      yoni("noah-okafor-oka-pendant", "p09", at("The OKA pendant from the side")),
      yoni("noah-okafor-oka-pendant", "v02", { ...at("The 3D design of the OKA pendant on screen", "The 3D design"), onBlack: false }),
      yoni("noah-okafor-oka-pendant", "p01", { ...at("Noah Okafor wearing the OKA pendant", "Worn by Noah Okafor"), onBlack: false }),
      yoni("noah-okafor-oka-pendant", "p02", { ...at("The OKA pendant worn on a white jersey"), onBlack: false }),
      yoni("noah-okafor-oka-pendant", "p18", { ...at("The OKA pendant presented in its box"), onBlack: false }),
    ]),
    specs: [
      ["Type", "Nameplate pendant"],
      ["Motif", "The letters OKA in camouflage, and a football"],
    ],
    seen: "White and rose gold tones · round diamonds, baguettes",
    making: { raw: raw("noah-okafor-oka-pendant", "v02-19_8s"), setting: yoni("noah-okafor-oka-pendant", "v02-31_9s", SET()), polishing: yoni("noah-okafor-oka-pendant", "v02-42_4s", POLISH()), delivery: yoni("noah-okafor-oka-pendant", "p18", IN_BOX()) },
  }),
  piece({
    slug: "noah-okafor-octagon-pendant",
    title: "Noah Okafor — Octagon Pendant",
    type: "pendant",
    line: "An octagon of baguettes, worn on tennis chains.",
    story:
      "An octagonal pendant built from baguette-cut diamonds, crossed by lines of rose gold and set with pear-shaped stones. It is worn over several tennis chains, which came in a trunk with a photograph set in its lid.",
    people: ["noah-okafor"],
    theme: { preset: "tunnel" },
    ...sorted("noah-okafor-octagon-pendant", [
      yoni("noah-okafor-octagon-pendant", "p09", at("Noah Okafor's octagon pendant of baguette diamonds")),
      yoni("noah-okafor-octagon-pendant", "p02", at("The octagon pendant on its tennis chain")),
      yoni("noah-okafor-octagon-pendant", "p04", at("Close-up of the baguettes and pear-shaped stones", "Baguettes and pears")),
      yoni("noah-okafor-octagon-pendant", "p06", at("The baguettes and the lines of rose gold, up close")),
      yoni("noah-okafor-octagon-pendant", "p01", at("The pendant on its tennis chain, on a black bust")),
      yoni("noah-okafor-octagon-pendant", "p10", BACK()),
      yoni("noah-okafor-octagon-pendant", "p08", BAIL()),
      st("noah-okafor-ii", 3, at("Film of the trunk and the tennis chains inside", "The trunk")),
      st("noah-okafor-ii", 5, at("The pendant and its trunk on a counter")),
    ]),
    specs: [
      ["Type", "Pendant with tennis chains"],
      ["Shape", "Octagon"],
    ],
    seen: "White and rose gold tones · baguette diamonds in a herringbone, round and pear-shaped diamonds",
    boxSlug: "okafor-trunk",
    making: {
      raw: raw("noah-okafor-octagon-pendant", "v02-13s"),
      setting: yoni("noah-okafor-octagon-pendant", "p11", { ...at("The pendant on the setting wax, its stones being set", "In the setting"), onBlack: false }),
      polishing: yoni("noah-okafor-octagon-pendant", "v02-9s", POLISH()),
      // Confirmed by Yoni (21/11/2026): the trunk with a photograph and the tennis chains are those of the octagon.
      delivery: st("noah-okafor-ii", 5, { ...at("Noah Okafor opens the trunk of his octagon pendant, wearing it", "Handed over"), onBlack: false }),
    },
  }),
  piece({
    slug: "marcus-thuram-t-serpent-pendant",
    title: "Marcus Thuram — T-Serpent Pendant",
    type: "pendant",
    // T9 (Yoni, 22–23/11/2026): the serpent of Inter draws his 9; its scales, a setting invented by the house.
    line: "T for Thuram, and a serpent that draws his 9.",
    story:
      "## One T After Another\n\n" +
      "Marcus Thuram has created several T's with Berete, each more evolved than the one before. This one carries his number and his club.\n\n" +
      "## T9\n\n" +
      "A gothic T of white diamonds and baguettes, and a rose gold serpent coiled around it into a 9: his number at Inter, a club whose mascot is the serpent.\n\n" +
      "## A Setting Invented for the Scales\n\n" +
      "The scales are a setting invented by Berete: pear-shaped diamonds, each in its own rose gold setting, laid one over the next along the body.\n\n" +
      "## The Head of the Serpent\n\n" +
      "Its head is a large red pear-shaped stone, resting against the letter.",
    people: ["marcus-thuram"],
    theme: { preset: "serpent", mark: "T" },
    // Its front view as the cover of its world in the gallery (Yoni, 23/11/2026).
    ...sorted("marcus-thuram-t-serpent-pendant", [
      yoni("marcus-thuram-t-serpent-pendant", "p08", at("Marcus Thuram's T-Serpent pendant: a diamond T with a rose gold serpent")),
      yoni("marcus-thuram-t-serpent-pendant", "p12", at("The serpent coiled around the T")),
      yoni("marcus-thuram-t-serpent-pendant", "p02", at("The serpent's head and its red stone", "The eye")),
      yoni("marcus-thuram-t-serpent-pendant", "p01", at("The scales of the serpent, pear by pear", "The scales")),
      yoni("marcus-thuram-t-serpent-pendant", "p07", at("The tip of the T")),
      yoni("marcus-thuram-t-serpent-pendant", "p11", at("Close-up of the serpent along the T", "The setting, up close")),
      yoni("marcus-thuram-t-serpent-pendant", "p04", at("The pendant with its bail")),
      yoni("marcus-thuram-t-serpent-pendant", "p18", at("The T-Serpent pendant on black")),
      yoni("marcus-thuram-t-serpent-pendant", "v01", at("Details of the T-Serpent pendant")),
    ], lead("marcus-thuram-t-serpent-pendant", "p08")),
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A gothic T and a serpent that draws a 9"],
      ["Settings", "Pear-shaped scales, in a setting invented by the house"],
    ],
    seen: "White and rose gold tones · round diamonds in pavé, baguettes, triangle, pear and marquise diamonds, a large red pear-shaped stone",
    making: {
      raw: yoni("marcus-thuram-t-serpent-pendant", "08-p02", { ...at("The T-Serpent pendant before the setting", "This piece, before the setting"), onBlack: false }),
      setting: yoni("marcus-thuram-t-serpent-pendant", "v03", { ...SETTING_FILM(), onBlack: false }),
      // The scales set one by one (08/v19, the same as in its making-of 08/v14: confirmed by Yoni, 21/11/2026).
      setting2: yoni("marcus-thuram-t-serpent-pendant", "08-v19-2s", { ...at("The scales of the serpent, set one by one", "In the setting"), onBlack: false }),
    },
  }),
  piece({
    slug: "marcus-thuram-t-monster-pendant",
    title: "Marcus Thuram — T-Monster Pendant",
    type: "pendant",
    line: "A dripping T, gripped by a hand.",
    story:
      "A T in white diamonds whose arms drip like melting ice, gripped by a sculpted hand. The house named it T-Monster, and Marcus Thuram was photographed wearing it.",
    people: ["marcus-thuram"],
    cover: still("pieces/marcus-thuram-t-monster-pendant/cover", at("The T-Monster pendant of Marcus Thuram in a white glove")),
    gallery: [
      st("marcus-thuram", 6, at("Film of the T-Monster pendant in front of the house logo")),
      st("marcus-thuram", 2, at("Film of the T-Monster pendant in a white glove")),
      st("thuram-ss23", 6, at("Marcus Thuram wearing his T-Monster piece", "Worn by Marcus Thuram")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A dripping T, a sculpted hand"],
    ],
    seen: "White gold tone · round diamonds in pavé",
  }),
  piece({
    slug: "marcus-thuram-thorned-t-pendant",
    title: "Marcus Thuram — Thorned T Pendant",
    type: "pendant",
    line: "A T in diamonds, wound with rose gold thorns.",
    story: "A dripping T paved with white diamonds, wound with branches of rose gold thorns from top to bottom.",
    people: ["marcus-thuram"],
    theme: { preset: "roses", tint: "#2a1216", font: "gothique", mark: "T" },
    // Its studio image first (Yoni, 23/11/2026), its older photos after it.
    cover: extra("marcus-thuram-thorned-t-pendant", "studio", at("Marcus Thuram's T pendant wound with rose gold thorns")),
    gallery: [
      extra("marcus-thuram-thorned-t-pendant", "studio", at("Marcus Thuram's T pendant wound with rose gold thorns")),
      still("pieces/marcus-thuram-thorned-t-pendant/cover", { ...at("Marcus Thuram's T pendant wound with rose gold thorns"), onBlack: false }),
      st("thuram-ss23", 5, at("Film of the thorned T pendant")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A dripping T and rose gold thorns"],
    ],
    seen: "White gold tone, rose gold thorns · round diamonds in pavé",
  }),
  piece({
    slug: "marcus-thuram-jesus-piece",
    title: "Marcus Thuram — Jesus Piece",
    type: "pendant",
    line: "A face in white diamonds, a crown of red stones.",
    story:
      "A Jesus piece paved in white diamonds, crowned with red stones and rose gold leaves. Marcus Thuram wears it on an infinity link chain.",
    people: ["marcus-thuram"],
    cover: still("pieces/marcus-thuram-jesus-piece/cover", at("Marcus Thuram's Jesus piece with its crown of red stones")),
    gallery: [
      st("thuram-ss23", 1, at("Marcus Thuram wearing his infinity link chain and Jesus piece", "Worn by Marcus Thuram")),
      st("thuram-ss23", 3, at("Film of the Jesus piece and its chain")),
      st("thuram-ss23", 4, at("Film of the Jesus piece next to the thorned T")),
      st("collectors", 15, at("The Jesus piece next to a photo of Marcus Thuram")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A face crowned with red stones"],
    ],
    seen: "White gold tone, rose gold crown · round diamonds in pavé, red pear-shaped stones",
  }),
  piece({
    slug: "marcus-thuram-snowflake-pendant",
    title: "Marcus Thuram — Snowflake Pendant",
    type: "pendant",
    line: "A snowflake that fills the palm.",
    story: "A six-branched snowflake, its facets paved with white diamonds, large enough to fill the palm of the hand.",
    people: ["marcus-thuram"],
    cover: still("pieces/marcus-thuram-snowflake-pendant/cover", at("Marcus Thuram's snowflake pendant in the palm of a hand")),
    gallery: [st("marcus-thuram", 3, at("Film of the snowflake pendant in the hand")), st("marcus-thuram", 4, at("The snowflake pendant, shared by Marcus Thuram"))],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A six-branched snowflake"],
    ],
    seen: "White gold tone · round diamonds in pavé",
  }),
  piece({
    slug: "angelo-stiller-as-pendant",
    title: "Angelo Stiller — AS Pendant",
    type: "pendant",
    line: "Two initials in a shield, with the BRT mark on the back.",
    story:
      "His initials A and S, drawn into a shield and set with baguette and round diamonds. The back carries the BRT mark in rose gold. It hangs from a diamond tennis chain.",
    people: ["angelo-stiller"],
    theme: { preset: "stuttgart", mark: "AS" },
    ...sorted("angelo-stiller-as-pendant", [
      yoni("angelo-stiller-as-pendant", "p11", at("AS pendant, front view")),
      yoni("angelo-stiller-as-pendant", "p07", at("Angelo Stiller's AS pendant on a diamond tennis chain")),
      yoni("angelo-stiller-as-pendant", "p08", at("AS pendant, close-up of the baguette diamonds", "Baguette diamonds")),
      yoni("angelo-stiller-as-pendant", "p05", at("Close-up of the letter A")),
      yoni("angelo-stiller-as-pendant", "p03", at("The pendant on its tennis chain, on a black bust")),
      yoni("angelo-stiller-as-pendant", "p01", at("Back of the AS pendant with the BRT mark in rose gold", "The BRT mark, on the back")),
      yoni("angelo-stiller-as-pendant", "p10", at("AS pendant, side view", "In profile")),
      yoni("angelo-stiller-as-pendant", "p04", BAIL()),
    ]),
    specs: [
      ["Type", "Pendant on a tennis chain"],
      ["Motif", "The initials AS in a shield"],
      ["Signature", "BRT mark in rose gold, on the back"],
    ],
    seen: "White gold tone · baguette diamonds in a herringbone, round diamonds",
    making: {
      raw: raw("angelo-stiller-as-pendant", "p12"),
      // The seats cut, no stone yet (18/v04): the preparation of the setting (confirmed by Yoni, 21/11/2026).
      preparation: yoni("angelo-stiller-as-pendant", "v04-2s", { ...at("The seats of the stones cut into the AS, before the setting", "This piece, before the setting"), onBlack: false }),
      delivery: yoni("angelo-stiller-as-pendant", "v03-3s", CHECKED()),
    },
  }),
  piece({
    slug: "jamie-leweling-jl-pendant",
    title: "Jamie Leweling — JL Initials Pendant",
    type: "pendant",
    line: "His initials, in baguettes framed with rose gold.",
    story: "The letters J and L, filled with baguette-cut diamonds and outlined with round stones and a fine rose gold edge.",
    people: ["jamie-leweling"],
    theme: { preset: "stuttgart", mark: "JL" },
    // The real professional photos sent by Yoni (23/11/2026, scripts/extra-media.mjs), on black, the front view as the hero:
    // they replace the AI studio image; the photos where Jamie Leweling wears it go to "Worn by".
    cover: JL("front", "front"),
    gallery: [
      JL("front", "front"),
      JL("left", "angle"),
      JL("right", "angle"),
      JL("bail", "bail"),
      JL("baguettes", "detail"),
      JL("foot", "detail"),
      JL("back", "back"),
      st("jamie-leweling", 2, at("Jamie Leweling wearing his JL pendant with his DFB-Pokal medal", "Worn by Jamie Leweling")),
      st("collectors", 7, at("Jamie Leweling wearing the JL pendant")),
    ],
    specs: [
      ["Type", "Initials pendant"],
    ],
    seen: "Rose and white gold tones · step-cut diamonds, round stones on the edge",
  }),
  piece({
    slug: "deniz-undav-l-pendant",
    title: "Deniz Undav — L Pendant",
    type: "pendant",
    line: "A letter in diamonds, an angel in rose gold.",
    story:
      "A tall letter L paved with white diamonds, with a cherub in rose gold resting in its corner. Its bail is set with diamonds too, and the back is engraved with a pattern of interlaced circles and the BRT mark in rose gold.",
    people: ["deniz-undav"],
    theme: { preset: "sacre", tint: "#331013", mark: "L" },
    // Its photos in HD (folder 38, 20/11/2026).
    ...sorted("deniz-undav-l-pendant", []),
    specs: [
      ["Type", "Pendant"],
      ["Motif", "The letter L and a cherub"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "White gold tone, rose gold cherub · round diamonds in pavé",
    making: {
      raw: raw("deniz-undav-l-pendant", "v01-2s"),
      setting: yoni("deniz-undav-l-pendant", "v01-15_4s", SET()),
      polishing: yoni("deniz-undav-l-pendant", "v02", { ...at("Film: the pendant polished at the bench", "At the bench"), onBlack: false }),
    },
  }),
  piece({
    slug: "samuel-ballet-jesus-piece",
    title: "Samuel Ballet — Jesus Piece",
    type: "pendant",
    line: "Rose gold, and a crown of pear-shaped diamonds.",
    story:
      "A Jesus piece in rose gold, paved with diamonds and crowned with pear and marquise-cut stones. Its back is engraved with flowers, the BRT mark standing in relief among them. It is worn on a twisted chain set with diamond flowers.",
    people: ["samuel-ballet"],
    theme: { preset: "sacre", tint: "#2e1a14" },
    cover: st("samuel-ballet", 2, at("Samuel Ballet's Jesus piece in rose gold with a crown of pear diamonds")),
    gallery: [
      st("samuel-ballet", 5, at("Film of the pendant on its chain of diamond flowers")),
      st("samuel-ballet", 1, at("Close-up of the face and the crown", "The crown")),
      st("samuel-ballet", 4, at("The crown of pear-shaped diamonds")),
      st("samuel-ballet", 6, at("The back of the pendant, engraved with the BRT mark", "The back")),
      st("samuel-ballet", 3, at("Film of the pendant being worn", "Worn")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "Rose gold tone, white gold crown · round diamonds in pavé, pear-shaped diamonds in the crown",
    making: {
      raw: raw("samuel-ballet-jesus-piece", "v21-25_8s"),
      setting: yoni("samuel-ballet-jesus-piece", "v21-6_9s", SET()),
      polishing: yoni("samuel-ballet-jesus-piece", "v21-35_4s", POLISH()),
      delivery: still("pieces/samuel-ballet-jesus-piece/delivery", CHECKED()),
      // Worn on its chain (story 15/05 at 8.4 s; confirmed by Yoni, 21/11/2026, for this piece only).
      worn: still("pieces/samuel-ballet-jesus-piece/worn", { ...at("The Jesus piece worn on its chain", "Worn"), onBlack: false }),
    },
  }),
  piece({
    slug: "malik-tillman-cross-pendant",
    title: "Malik Tillman — Cross Pendant",
    type: "pendant",
    line: "A cross in round and baguette diamonds.",
    story:
      "A large cross edged with round diamonds in their own settings, its centre filled with baguettes, hanging from a diamond-shaped bail on a chunky diamond link chain. The back is engraved with the BRT mark.",
    people: ["malik-tillman"],
    theme: { preset: "sacre" },
    ...sorted("malik-tillman-cross-pendant", [
      yoni("malik-tillman-cross-pendant", "p17", at("Malik Tillman's cross pendant on its diamond link chain")),
      yoni("malik-tillman-cross-pendant", "p13", at("The centre of the cross and its monogram", "The centre")),
      yoni("malik-tillman-cross-pendant", "p07", at("Close-up of the round and baguette diamonds")),
      yoni("malik-tillman-cross-pendant", "p14", at("The diamond-shaped bail of the cross", "The bail")),
      yoni("malik-tillman-cross-pendant", "p03", at("The back of the cross with the BRT mark", "The back")),
      yoni("malik-tillman-cross-pendant", "p06", at("The cross on its link chain, on a black bust")),
      yoni("malik-tillman-cross-pendant", "p18", at("A link of the chain, with a cross of baguettes")),
      yoni("malik-tillman-cross-pendant", "p20", { ...at("The 3D design of the cross", "The 3D design"), onBlack: false }),
      yoni("malik-tillman-cross-pendant", "p01", { ...at("The cross pendant, worn"), onBlack: false }),
    ]),
    specs: [
      ["Type", "Pendant on a link chain"],
      ["Motif", "A cross"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "White gold tone · round diamonds in halo and bezel settings, a frame of baguettes",
    making: {
      raw: raw("malik-tillman-cross-pendant", "v02-13_5s"),
      setting: yoni("malik-tillman-cross-pendant", "v03", { ...SETTING_FILM(), onBlack: false }),
      delivery: st("malik-tillman", 1, at("Malik Tillman discovering his cross at the house", "Handed over at the house")),
    },
  }),
  piece({
    slug: "malik-tillman-tm-pendant",
    title: "Malik Tillman — TM Pendant",
    type: "pendant",
    line: "A gothic T over an M.",
    story: "His initials in gothic letters, the T set over the M, both set with diamonds. It is worn on a diamond-set Cuban chain in rose gold.",
    people: ["malik-tillman"],
    theme: { preset: "facettes", tint: "#2a1a16", glow: "#e8b4a0", font: "gothique", mark: "TM" },
    // Its studio image first (Yoni, 23/11/2026), its older photos after it.
    cover: extra("malik-tillman-tm-pendant", "studio", at("Malik Tillman's TM pendant")),
    gallery: [
      extra("malik-tillman-tm-pendant", "studio", at("Malik Tillman's TM pendant")),
      still("pieces/malik-tillman-tm-pendant/cover", { ...at("Malik Tillman's TM pendant"), onBlack: false }),
      st("malik-tillman-ii", 4, at("The TM pendant held up in the light")),
      st("malik-tillman-ii", 1, at("Post about Malik Tillman's TM pendant")),
    ],
    specs: [
      ["Type", "Pendant on a Cuban chain"],
      ["Motif", "The initials TM in gothic letters"],
    ],
    seen: "Rose and white gold tones · round diamonds, claw-set and in pavé",
  }),
  piece({
    slug: "tanguy-nianzou-fam-medallion",
    title: "Tanguy Nianzou — FAM Medallion",
    type: "pendant",
    line: "Family first, among the roses.",
    story:
      "A round medallion paved with diamonds, its edge ribbed like a coin. The word FAM stands out in polished letters among rose gold roses, and marquise-cut diamonds are set in the flowers, one for each member of the family. It hangs from a diamond-set Cuban chain.",
    people: ["tanguy-nianzou"],
    theme: { preset: "roses", mark: "FAM" },
    cover: still("pieces/tanguy-nianzou-fam-medallion/cover", at("Tanguy Nianzou's FAM medallion on its Cuban chain")),
    gallery: [
      st("nz", 6, at("Close-up of the rose gold roses and a marquise diamond", "The roses")),
      st("nz", 2, at("The FAM medallion and its story: one marquise diamond for each family member")),
      st("nz", 5, at("Film of the medallion on a bust")),
    ],
    specs: [
      ["Type", "Medallion pendant on a Cuban chain"],
      ["Motif", "The word FAM among roses"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, marquise-cut diamonds in the flowers",
    boxSlug: "nz-travel-case",
  }),
  piece({
    slug: "tanguy-nianzou-nz-pendant",
    title: "Tanguy Nianzou — NZ Pendant",
    type: "pendant",
    line: "His two letters, sharp as a signature.",
    story: "The letters NZ with sharp, angled ends, paved with diamonds and hung from a diamond-set Cuban chain.",
    people: ["tanguy-nianzou"],
    cover: still("pieces/tanguy-nianzou-nz-pendant/cover", at("Tanguy Nianzou's NZ pendant on a Cuban chain")),
    gallery: [st("tanguy-nianzou", 1, at("The NZ pendant on black")), st("collectors", 40, at("The NZ pendant worn with the FAM medallion"))],
    specs: [
      ["Type", "Initials pendant on a Cuban chain"],
      ["Motif", "The letters NZ"],
    ],
    seen: "Rose and white gold tones · round diamonds in pavé",
  }),
  piece({
    slug: "eljero-elia-clover-medallion",
    title: "Eljero Elia — Clover Medallion",
    type: "pendant",
    line: "A clover at the heart of a medallion.",
    story:
      "A round medallion in yellow gold tones, with a raised border of diamonds and a four-leaf clover paved at its centre. In the film, the centre turns under the finger.",
    people: ["eljero-elia"],
    theme: { preset: "emeraude" },
    cover: st("eljero-elia", 4, at("Eljero Elia's clover medallion on black")),
    gallery: [
      st("eljero-elia", 5, at("The medallion in profile", "In profile")),
      st("eljero-elia", 6, at("Film of the clover medallion")),
      st("eljero-elia", 2, at("Film: the centre of the medallion turns under the finger")),
      st("eljero-elia", 3, at("Close-up of the diamond border", "The border")),
      st("collectors", 6, at("Eljero Elia wearing his clover medallion", "Worn by Eljero Elia")),
    ],
    specs: [
      ["Type", "Medallion pendant"],
      ["Motif", "A four-leaf clover"],
    ],
    seen: "Yellow gold tone · round diamonds in pavé",
  }),
  piece({
    slug: "sidney-eweka-999-pendant",
    title: "Sidney Eweka — 999 Star Pendant",
    type: "pendant",
    line: "Three nines under a star.",
    story: "The number 999 set with diamonds in white and yellow gold tones, under a star. It was drawn first as a 3D model, then made to match it.",
    people: ["sidney-eweka"],
    cover: still("pieces/sidney-eweka-999-pendant/cover", at("Sidney Eweka's 999 pendant under its star")),
    gallery: [
      st("sidney-eweka", 3, at("The 999 pendant up close")),
      st("sidney-eweka", 4, at("The 999 pendant, real piece", "The real piece")),
      st("sidney-eweka", 6, at("Film of the 999 pendants on a mirror")),
      st("sidney-eweka", 1, at("Film of Sidney Eweka discovering his pendant", "Worn by Sidney Eweka")),
      st("collectors", 34, at("Sidney Eweka wearing the 999 pendant")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "The number 999 under a star"],
    ],
    seen: "White and gold tones · round diamonds in pavé",
    making: { sketch: st("sidney-eweka", 5, at("The 3D design of the 999 pendant", "The 3D design")) },
  }),
  piece({
    slug: "jeff-chabot-jc-pendant",
    title: "Jeff Chabot — JC Initials Pendant",
    type: "pendant",
    line: "Two letters, interlaced.",
    story: "His initials J and C interlaced, in white metal set with diamonds, worn on a fine chain.",
    people: ["jeff-chabot"],
    cover: still("pieces/jeff-chabot-jc-pendant/cover", at("Jeff Chabot's JC pendant")),
    gallery: [
      st("jeff-chabot", 5, at("Post about the JC pendant", "The details")),
      st("jeff-chabot", 3, at("Film of the JC pendant")),
      st("jeff-chabot", 1, at("Film of Jeff Chabot wearing the pendant", "Worn by Jeff Chabot")),
      st("jeff-chabot", 2, at("Jeff Chabot wearing his JC pendant")),
    ],
    specs: [
      ["Type", "Initials pendant"],
      ["Motif", "The letters J and C, interlaced"],
    ],
    seen: "White gold tone · round diamonds in pavé",
  }),
  /*
   * One piece with "Bouzou — Pendant" (an album of Yoni, folder 14) since 21/11/2026 (Yoni: the same pendant): its photos,
   * its film and its cut-out from the folder, the close-up of the stories after the other details, the hand of Yoni
   * (its sketch). The address of "Bouzou" leads here (RENAMED_PIECES).
   */
  piece({
    slug: "lois-openda-script-pendant",
    title: "Loïs Openda — Script Pendant",
    type: "pendant",
    line: "Script letters and a cross of baguettes.",
    story:
      "A name written in script letters in rose gold tones, paved with diamonds and outlined in polished gold, with marquise and pear-shaped diamonds and a cross of baguettes in its first letter; a band of baguettes runs around its edge. The back is engraved with the BRT mark and the word Faith. It hangs on the Cross Infinity chain: round links paved with diamonds, joined by crosses of baguettes.",
    people: ["lois-openda"],
    theme: { preset: "sacre", tint: "#2b1913", font: "bodoni" },
    ...afterDetails(
      sorted("lois-openda-script-pendant", []),
      still("pieces/lois-openda-nameplate-pendant/cover", { ...at("Close-up of Loïs Openda's pendant: rose gold script and a cross of baguettes", "The script and its cross"), view: "detail" }),
    ),
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A name in script letters"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, baguettes, marquise and pear-shaped diamonds",
    making: { raw: raw("lois-openda-script-pendant", "p22"), delivery: yoni("lois-openda-script-pendant", "v01-1_2s", IN_TRUNK()) },
  }),
  piece({
    slug: "the-hand",
    title: "The Hand — Pendant",
    type: "pendant",
    line: "A rose gold hand, paved with diamonds, holding a red stone.",
    story: "A hand in rose gold, set stone by stone with diamonds. A red oval stone catches the light at every movement, and the BRT mark is engraved at the wrist.",
    theme: { preset: "infini" },
    ...sorted("the-hand", [
      yoni("the-hand", "p07", at("The Hand pendant, a diamond-paved rose gold hand holding a ruby")),
      yoni("the-hand", "p04", at("The Hand held by its bail, the red stone hanging below")),
      yoni("the-hand", "p01", at("Close-up of the diamond pavé of The Hand", "Set stone by stone")),
      yoni("the-hand", "p02", at("The Hand pendant lying on its side", "In profile")),
      yoni("the-hand", "p06", at("Baguette diamonds at the wrist of The Hand", "The wrist")),
      yoni("the-hand", "p05", at("The BRT mark engraved on The Hand", "The BRT mark")),
      yoni("the-hand", "p03", at("The Hand pendant seen from above", "From above")),
      yoni("the-hand", "v01", at("Film of The Hand pendant")),
    ]),
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A hand"],
      ["Signature", "BRT mark engraved"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, baguette and step-cut diamonds at the wrist, a red oval stone",
    boxSlug: "the-hand-cube",
    making: { delivery: yoni("the-hand", "v01-13_6s", IN_BOX()) },
  }),
  piece({
    slug: "flaneur-medallion",
    title: "Flâneur — Medallion Pendant",
    type: "pendant",
    line: "A walker under his umbrella.",
    story: "A round medallion paved with diamonds, with the word FLÂNEUR and a rose gold walker holding an umbrella, worn on a tennis chain.",
    theme: { preset: "flaneur" },
    cover: still("pieces/flaneur-medallion/cover", at("The Flâneur medallion held in a gloved hand")),
    gallery: [],
    specs: [
      ["Type", "Medallion pendant"],
      ["Motif", "A walker under an umbrella"],
    ],
    seen: "Rose gold tone · round white stones in pavé",
  }),
  piece({
    slug: "jack-nameplate-pendant",
    title: "JACK — Nameplate Pendant",
    type: "pendant",
    line: "A name in rose gold, under a horned head.",
    story: "The name JACK in diamond-set letters edged with rose gold, under a white horned head, worn on a Cuban chain.",
    cover: still("pieces/jack-nameplate-pendant/cover", at("The JACK nameplate pendant, worn")),
    gallery: [st("collectors", 29, at("The JACK pendant on its Cuban chain")), st("collectors", 2, at("The JACK pendant, worn"))],
    specs: [
      ["Type", "Nameplate pendant"],
      ["Motif", "The name JACK and a horned head"],
    ],
  }),
  piece({
    slug: "tulips-on-tour-medallion",
    title: "Tulips on Tour — Medallion Pendant",
    type: "pendant",
    // The piece of a Dutch shoe designer, named after his collection (Yoni, 22–23/11/2026): neither he nor a brand is named.
    line: "Tulips for Amsterdam, and a collection taken across Europe.",
    story:
      "## A Collection on Tour\n\n" +
      "Tulips on Tour is the name of a collection by a Dutch shoe designer, which he promoted across Europe. This medallion is his.\n\n" +
      "## Amsterdam in Bloom\n\n" +
      "The tulips evoke Amsterdam. On a domed medallion, they bloom beside a cart and a small figure, in white diamonds and red, pink and blue stones.\n\n" +
      "## A Scene in Relief\n\n" +
      "The scene rises in layers above the diamond ground: tulips held in fine bezels, a wheel drawn in baguettes, red stones all around the edge.\n\n" +
      "## The Tour on the Back\n\n" +
      "On the back, the figure and its cart pass engraved houses, above the BRT mark. The medallion is worn on a tennis chain and comes in its own Tulips on Tour case.",
    theme: { preset: "tulipes" },
    ...sorted("tulips-on-tour-medallion", [
      yoni("tulips-on-tour-medallion", "p21", at("The Tulips on Tour medallion: tulips, a cart and a figure in coloured stones")),
      yoni("tulips-on-tour-medallion", "p16", at("The figure in red and blue stones, up close", "The figure")),
      yoni("tulips-on-tour-medallion", "p07", at("Tulips in pink and green stones", "The tulips")),
      yoni("tulips-on-tour-medallion", "p12", at("A wheel set with baguettes", "The wheel")),
      yoni("tulips-on-tour-medallion", "p13", at("The script on the edge of the medallion")),
      yoni("tulips-on-tour-medallion", "p06", at("The back of the medallion, engraved with houses and the BRT mark", "The back")),
      yoni("tulips-on-tour-medallion", "p20", BAIL()),
      yoni("tulips-on-tour-medallion", "p05", at("The edge of the medallion, set with red stones", "The edge")),
      st("collectors", 54, at("Film of the medallion being worn for the first time")),
    ]),
    specs: [
      ["Type", "Medallion pendant"],
      ["Motif", "Tulips, a cart and a figure"],
      ["Colours", "White diamonds, red, pink and blue stones"],
    ],
    boxSlug: "tulips-on-tour",
    making: {
      setting: yoni("tulips-on-tour-medallion", "p25", { ...at("The scene set with its stones, before it goes into its frame", "In the setting"), onBlack: false }),
      // Its last adjustment at the bench (24/v13, confirmed by Yoni, 21/11/2026).
      finishing: yoni("tulips-on-tour-medallion", "v13-0_5s", { ...at("The last adjustment of the medallion at the bench", "At the bench"), onBlack: false }),
      delivery: yoni("boxes/tulips-on-tour", "p04", IN_BOX()),
    },
  }),

  /*
   * The Butterfly of Michy Batshuayi: since 22/11/2026 (Yoni) the pendant, and its chain as a piece of its own (below). Both
   * come from folder 23 (public/media/hd/michy-batshuayi-butterfly-chain/): the five photos of the chain alone go to the
   * chain; its three films (v03 worn, v09 in a gloved hand, v15 close over it: all three show the pendant), its raw piece,
   * its making-of and its trunk stay with the pendant. The old address of the chain leads here (RENAMED_PIECES).
   */
  piece({
    slug: "michy-batshuayi-butterfly-pendant",
    title: "Michy Batshuayi — Butterfly Pendant",
    type: "pendant",
    line: "A face with butterfly wings, worn on the Butterfly Chain.",
    story:
      "A face with baguette-cut glasses and butterfly wings, with a large pear-shaped diamond. The back of the pendant is engraved in rose gold with the BRT mark.\n\nIt is worn on the Butterfly Chain.",
    people: ["michy-batshuayi"],
    // The hand of Yoni draws it on its chain: its sketch keeps the name of its old address.
    sketch: "michy-batshuayi-butterfly-chain",
    theme: { preset: "metamorphose" },
    showcase: { size: "large", views: ["p54", "p68"] },
    ...sorted(
      BUTTERFLY,
      [
        yoni(BUTTERFLY, "p68", at("The pendant: a face with butterfly wings", "The pendant")),
        yoni(BUTTERFLY, "p54", at("The Butterfly Pendant on its chain, on a black bust")),
        yoni(BUTTERFLY, "p62", at("The face of the pendant", "The face")),
        yoni(BUTTERFLY, "p74", at("The pear diamond at the heart of the butterfly", "The centre stone")),
        yoni(BUTTERFLY, "p69", BACK()),
      ],
      // The pendant on its chain first (Yoni, 23/11/2026: the hero, the first photo and the cover of its gallery).
      ["p54", "p68", "v15", "v09", "p63", "p73", "p74", "p62", "p70", "p75", "p72", "p71", "p52", "p69", "p20", "p48", "p22", "p17", "p41", "v03"],
    ),
    handover: [yoni(BUTTERFLY, "p17", { ...at("Michy Batshuayi wearing his Butterfly Pendant"), onBlack: false })],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A face with butterfly wings"],
      ["Signature", "BRT mark on the back of the pendant"],
    ],
    seen: "Rose gold tone, white gold details · round diamonds in pavé, baguettes, marquises, a large pear-shaped diamond, purple pear-shaped and round stones",
    boxSlug: "butterfly-trunk",
    making: {
      raw: raw(BUTTERFLY, "p77"),
      setting: still("pieces/michy-batshuayi-butterfly-chain/setting", SET()),
      delivery: yoni(BUTTERFLY, "v01-4_8s", IN_TRUNK()),
    },
  }),

  /* Chains */
  // The chain of the Butterfly pendant, alone (22/11/2026): the five photos of the chain without its pendant.
  piece({
    slug: "butterfly-chain",
    title: "Michy Batshuayi — Butterfly Chain",
    type: "chain",
    line: "A chain of diamond butterflies.",
    story: "Rose gold links set with diamonds, with butterflies placed along the chain and purple pear-shaped stones on their wings.\n\nIt carries the Butterfly Pendant.",
    people: ["michy-batshuayi"],
    theme: { preset: "metamorphose" },
    ...sorted(
      BUTTERFLY,
      [
        yoni(BUTTERFLY, "p60", at("The Butterfly Chain on its own, on a black bust")),
        yoni(BUTTERFLY, "p66", at("The links of the Butterfly chain", "The links")),
      ],
      ["p60", "p56", "p59", "p55", "p66"],
    ),
    specs: [
      ["Type", "Chain"],
      ["Motif", "Butterflies"],
    ],
  }),
  piece({
    slug: "marcus-thuram-ruby-t-necklace",
    title: "Marcus Thuram — Ruby T Necklace",
    type: "chain",
    line: "Gothic T links, and a red stone at the end of the drop.",
    story:
      "A necklace of diamond links shaped like infinity knots, with gothic T stations along the chain. At the front, a large T in baguettes with rose gold scrolls opens onto a drop that ends with a pear-shaped red stone framed in diamonds. The clasp carries the BRT mark, and the back of the T is engraved with a pattern of flowers.",
    people: ["marcus-thuram"],
    // 23/11/2026 (Yoni): no universe any more, all black; the full piece as the hero and the first photo, as large as
    // possible (second call: « première photo hero full piece, agrandir au max »).
    theme: { preset: "noir" },
    showcase: { size: "large", mode: "single", views: ["p01"] },
    ...sorted("marcus-thuram-ruby-t-necklace", [
      yoni("marcus-thuram-ruby-t-necklace", "p02", at("Marcus Thuram's T necklace: a gothic T with rose gold scrolls")),
      yoni("marcus-thuram-ruby-t-necklace", "p03", at("The baguettes of the T, up close", "Baguettes")),
      yoni("marcus-thuram-ruby-t-necklace", "p12", at("The red pear-shaped stone at the end of the drop", "The drop")),
      yoni("marcus-thuram-ruby-t-necklace", "p08", at("A rose gold scroll on the T", "The scrolls")),
      yoni("marcus-thuram-ruby-t-necklace", "p05", at("The clasp with the BRT mark", "The clasp")),
      yoni("marcus-thuram-ruby-t-necklace", "p06", at("Marquise diamonds along the T")),
      yoni("marcus-thuram-ruby-t-necklace", "p07", at("The infinity links of the necklace", "The links")),
      yoni("marcus-thuram-ruby-t-necklace", "p01", at("The whole necklace on black velvet")),
      st("thuram", 13, at("Film of the drop held in a gloved hand")),
    ], lead("marcus-thuram-ruby-t-necklace", "p01")),
    specs: [
      ["Type", "Necklace with a drop"],
      ["Motif", "Gothic T and infinity links"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "White gold tone, rose gold details · round diamonds in pavé, baguettes, marquise and pear-shaped diamonds, a large red pear-shaped stone",
    making: {
      raw: raw("marcus-thuram-ruby-t-necklace", "v02-6_5s"),
      setting: yoni("marcus-thuram-ruby-t-necklace", "v03", { ...SETTING_FILM(), onBlack: false }),
      polishing: yoni("marcus-thuram-ruby-t-necklace", "v02-24s", POLISH()),
    },
  }),
  piece({
    slug: "marcus-thuram-infinity-chain",
    title: "Marcus Thuram — Infinity Link Chain",
    type: "chain",
    line: "Infinity links, set with diamonds.",
    story: "Chains of infinity links set with diamonds, worn by Marcus Thuram with his Jesus piece.",
    people: ["marcus-thuram"],
    cover: still("pieces/marcus-thuram-infinity-chain/cover", at("Marcus Thuram's infinity link chains on a bust")),
    gallery: [
      st("thuram-ss23", 4, at("Film of the infinity link chains")),
      st("thuram-ss23", 3, at("Film of the chain with the Jesus piece")),
      st("thuram-ss23", 1, at("Marcus Thuram wearing his infinity link chain", "Worn by Marcus Thuram")),
    ],
    specs: [
      ["Type", "Chain"],
      ["Links", "Infinity links"],
    ],
    seen: "White and rose gold tones · round diamonds in pavé",
  }),
  piece({
    slug: "kevin-schade-twisted-chain",
    title: "Kevin Schade — Twisted Link Chain",
    type: "chain",
    line: "Twisted links, set with diamond flowers.",
    story: "Twisted links in a single tone of rose gold, with diamond flowers set along the whole chain.",
    people: ["kevin-schade"],
    theme: { preset: "forge" },
    cover: st("kevin-schade", 3, at("Kevin Schade's twisted link chain laid in its box")),
    gallery: [
      st("kevin-schade", 14, at("Film of the twisted chain and its diamond flowers")),
      st("kevin-schade", 1, at("Kevin Schade wearing his chain", "Worn by Kevin Schade")),
    ],
    specs: [
      ["Type", "Chain"],
      ["Links", "Twisted, with diamond flowers"],
    ],
    seen: "Rose gold tone · round diamonds in pavé and in flowers, marquise-cut leaves",
    // Its handover: he wears the chain only, not the Dragon Ball pendant (story 03/02, confirmed by Yoni, 21/11/2026).
    making: { delivery: st("kevin-schade", 2, { ...at("Kevin Schade, wearing his chain, at its handover", "Handed over"), onBlack: false }) },
  }),
  piece({
    slug: "the-safi-link",
    title: "The Safi Link — Chain",
    type: "chain",
    line: "Flowers of marquise diamonds, link after link.",
    // The chain of the jersey pendant of Noah Okafor, worn on its own (Yoni, 22–23/11/2026); one tone of rose gold.
    story:
      "This is the chain of Noah Okafor's jersey pendant. Unclipped from the jersey, it is closed by a connecting piece and worn alone, under the name the house gave it: the Safi Link.\n\n" +
      "Its links are flowers of marquise-cut diamonds in rose gold, and the clasp is a flower too, around the BRT mark.",
    people: ["noah-okafor"],
    theme: { preset: "roses", glow: "#f6e2da" },
    ...sorted("the-safi-link", [
      yoni("the-safi-link", "p07", at("The Safi Link chain on a black bust")),
      yoni("the-safi-link", "p03", at("A flower of marquise and pear-shaped diamonds", "The flower")),
      yoni("the-safi-link", "p02", at("The clasp, a flower with the BRT mark", "The clasp")),
      yoni("the-safi-link", "p04", at("The twisted rose gold links between the flowers")),
      yoni("the-safi-link", "p05", at("The Safi Link on a black bust, from the side")),
      yoni("the-safi-link", "p01", { ...at("A chain of diamond flowers seen from behind, worn"), onBlack: false }),
    ]),
    specs: [
      ["Type", "Chain"],
      ["Links", "Flowers of marquise-cut diamonds"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, marquise-cut diamonds",
  }),
  piece({
    slug: "sirius",
    title: "Sirius — Chain",
    type: "chain",
    line: "A chain and its nameplate, delivered in their own trunk.",
    story:
      "A chain of twisted links in rose gold tones, paved with diamonds, with flowers of round diamonds and leaves of marquise-cut diamonds, closed by a clasp signed BRT. It carries a nameplate that spells SIRIUS in baguettes, the two S drawn as dollar signs, framed by a row of diamond flowers, with two horned masks in rose gold at its corners and pear-shaped diamonds on its sides. The back of the plate is engraved with a pattern and the BRT mark. Chain and plate are delivered in the Sirius trunk made for them, on a red lining.",
    // Its Japanese night since 21/11/2026 (the starry sky before).
    theme: { preset: "japon" },
    // Its photos in HD (folder 37, 20/11/2026): the chain, the plate, the trunk.
    ...sorted("sirius", []),
    specs: [
      ["Type", "Chain and nameplate"],
      ["Box", "Sirius trunk"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "Rose gold tone, white gold lettering · round diamonds in pavé, baguettes, marquise and pear-shaped diamonds",
    boxSlug: "sirius",
    making: {
      raw: yoni("sirius", "p30", { ...at("The parts of the nameplate laid out before they are put together", "Before the assembly"), onBlack: false }),
      delivery: yoni("sirius", "p04", IN_TRUNK()),
    },
  }),

  /* Watches */
  piece({
    slug: "marcus-thuram-skeleton-watch",
    title: "Marcus Thuram — Iced Skeleton Watch",
    type: "watch",
    line: "An open dial, a case and bracelet in diamonds.",
    story: "A square watch with a skeleton dial, its case and bracelet entirely set with diamonds, shown with a Cuban chain.",
    people: ["marcus-thuram"],
    theme: { preset: "mecanique" },
    cover: still("pieces/marcus-thuram-skeleton-watch/cover", at("A square watch with a skeleton dial, fully set with diamonds")),
    gallery: [],
    specs: [
      ["Type", "Watch"],
      ["Dial", "Skeleton"],
    ],
    seen: "White gold tone · round diamonds in pavé on the case, the bracelet and the numerals",
  }),
  piece({
    slug: "tajon-buchanan-iced-watch",
    title: "Tajon Buchanan — Iced Square Watch",
    type: "watch",
    line: "A square watch, set from the case to the clasp.",
    story: "A square watch with Roman numerals, its case, dial and bracelet set with diamonds.",
    people: ["tajon-buchanan"],
    theme: { preset: "mecanique" },
    cover: still("pieces/tajon-buchanan-iced-watch/cover", at("Tajon Buchanan's square watch set with diamonds, on the wrist")),
    gallery: [
      st("tajon-buchanan", 3, at("Tajon Buchanan at the house")),
    ],
    specs: [
      ["Type", "Watch"],
    ],
    seen: "White gold tone · round diamonds in pavé on the case, the dial and the bracelet",
    making: { delivery: still("pieces/tajon-buchanan-iced-watch/delivery", HANDED()) },
  }),
  piece({
    slug: "radja-nainggolan-iced-watch",
    title: "Radja Nainggolan — Iced Watch",
    type: "watch",
    line: "A diamond dial on a diamond bracelet.",
    story: "A watch with a dial paved with diamonds and a bracelet set link by link.",
    people: ["radja-nainggolan"],
    theme: { preset: "mecanique" },
    cover: still("pieces/radja-nainggolan-iced-watch/cover", at("Radja Nainggolan's iced watch on his wrist")),
    gallery: [],
    specs: [
      ["Type", "Watch"],
    ],
    seen: "White gold tone · round stones in pavé on the dial and the bracelet",
  }),
];

/* ---------- The pieces published on 20/11/2026: the drafts made from the folders of Yoni, named from their photos ---------- */

/**
 * A piece made for a private collector, from a folder of Yoni sorted photo by photo (scripts/hd-media.mjs): its photos in
 * their order, each saying what it shows. Its title is the name of its album in the phone of Yoni, cleaned up in English
 * ("Bouzou — Pendant", "Rose 20 mm Cuban Chain"; never the name of a stone), else it describes the piece; its texts only
 * say what the photos show, no figure but the sizes given by Yoni, the coloured stones by their colour. Yoni can rename
 * it, hide it or write its story from the admin.
 */
function collected(p: Omit<PieceInput, "cover" | "gallery">): Piece {
  return piece({ ...p, ...sorted(p.slug, []) });
}

/** The pieces published on 20/11/2026 (tests/galleries.spec.ts). */
export const NEW_PIECES = [
  "rose-iced-cuban-chain",
  "wide-rose-iced-cuban-chain",
  "two-tone-iced-cuban-chain",
  "white-iced-cuban-chain",
  "baguette-cuban-chain",
  "cross-infinity-chain",
  "brt-flower-chain",
  "pear-link-chain",
  "jesus-piece-red-flowers",
  "ampersand-initials-pendant",
  "thorns-and-roses-crucifix",
  "baguette-cross-pendant",
  "crown-of-thorns-jesus-piece",
  "panther-champion-pendant",
  "celestial-initial-medallion",
  "oval-eternity-band",
];

/** The night of the celebration of Lasana Keita, as the press told it (5 September 2026, Paris). */
const KEITA_NIGHT =
  "Paris, 5 September 2026: a knockout in the first round. Then the fighter known as the “Black Panther” walked out of the cage, sat down in the front row and applauded himself, a celebration that went viral. Behind his pendant, this page tells that night: the knockout, the open cage, the celebration.";

const COLLECTED: Piece[] = [
  /* Pendants */
  collected({
    slug: "ampersand-initials-pendant",
    title: "D&E — Pendant",
    type: "pendant",
    line: "Two initials joined by an ampersand.",
    story:
      "Two bold initials joined by an ampersand, paved with diamonds and outlined in polished white gold tones, with touches of baguettes. The bail is set with baguettes, and the pendant hangs on a wide Cuban chain paved with diamonds.",
    theme: { preset: "facettes" },
    specs: [
      ["Type", "Chain and pendant"],
      ["Motif", "Two initials and an ampersand"],
    ],
    seen: "White gold tone · round diamonds in pavé, baguettes",
    making: { delivery: yoni("ampersand-initials-pendant", "v02-19s", IN_BOX()) },
  }),
  collected({
    slug: "thorns-and-roses-crucifix",
    title: "Jesus Cross",
    type: "pendant",
    line: "A Christ in rose gold, wound with thorns and roses.",
    story:
      "A cross paved with baguette diamonds carries a Christ sculpted in rose gold, wound with a thorny vine and sculpted roses. The back is carved with a star pattern and the BRT mark in rose gold.",
    theme: { preset: "roses", font: "sacre" },
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A Christ, thorns and roses"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "White gold tone cross, rose gold Christ and roses · baguettes",
    making: { raw: yoni("thorns-and-roses-crucifix", "v02-0_8s", MODEL()), setting: yoni("thorns-and-roses-crucifix", "v02-20_5s", SET()), polishing: yoni("thorns-and-roses-crucifix", "v02-27_5s", POLISH()) },
  }),
  collected({
    slug: "baguette-cross-pendant",
    title: "Baguette Cross",
    type: "pendant",
    line: "Rows of baguettes, inside a border of diamonds.",
    story:
      "A cross in rose gold tones filled with rows of baguette diamonds inside a border of round diamonds, under a bail set with baguettes. Turned over, its arms are carved with stars, the BRT mark at their crossing.",
    theme: { preset: "sacre" },
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A cross"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "Rose gold tone · baguettes, round diamonds",
  }),
  collected({
    slug: "crown-of-thorns-jesus-piece",
    title: "Jesus Piece — Red Crown",
    type: "pendant",
    line: "A crown of red stones and spikes.",
    story:
      "A crown of thorns, set with red pear-shaped stones and sharp polished spikes, rests on a Jesus piece in rose gold tones, entirely paved with diamonds. The lips are polished gold, and the tall bail carries a cross of diamonds over baguettes. On the carved back, the BRT mark stands out in white gold.",
    theme: { preset: "sacre", tint: "#331013" },
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A crown of thorns"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, baguettes, red pear-shaped stones",
  }),
  collected({
    slug: "panther-champion-pendant",
    title: "Lasana Keita — Panther Pendant",
    type: "pendant",
    client: "Lasana Keita",
    // The fighter on its photos, with his belts, is the person of the circle « Keita Losene » (Malik, 23/11/2026; which name is
    // right is to be confirmed: nothing renamed).
    people: ["keita-losene"],
    line: "A panther holding a champion's belt.",
    // Its second paragraph: the celebration that the universe of its page tells (feedback of Yoni, 21/11/2026, from the
    // press: nothing beyond what it said).
    story:
      "A panther paved with diamonds, its jaws open and its claws polished black, holds a champion's belt in yellow and rose gold tones.\n\n" + KEITA_NIGHT,
    theme: { preset: "keita" },
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A panther and a champion's belt"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "White gold tone panther, yellow gold tone belt · round diamonds in pavé",
    making: {
      raw: raw("panther-champion-pendant", "v01-5s"),
      setting: yoni("panther-champion-pendant", "v08", { ...SETTING_FILM(), onBlack: false }),
      // Confirmed by Yoni (21/11/2026): the LASANA plates of its belt (08/p01), then the panther set before its plates (08/v08).
      parts: yoni("panther-champion-pendant", "08-p01", { ...at("The LASANA plates of the belt, before the assembly", "Before the assembly"), onBlack: false }),
      assembly: yoni("panther-champion-pendant", "08-v08-1s", { ...at("The panther set with its stones, before the plates of its belt", "Before the belt plates"), onBlack: false }),
      polishing: yoni("panther-champion-pendant", "v01-21s", POLISH()),
      delivery: yoni("panther-champion-pendant", "v02-1s", IN_TRUNK()),
    },
  }),
  collected({
    slug: "celestial-initial-medallion",
    title: "N14 — Medallion",
    type: "pendant",
    line: "An initial and a number, under a web of stars.",
    story:
      "A large round medallion in rose gold tones: an initial and a number woven in baguettes, an openwork web of stars set with round diamonds, and a sculpted figure pouring waves of diamonds. A border of marquise-cut diamonds frames it, under a bail crowned with a marquise flower.",
    theme: { preset: "n14" },
    specs: [
      ["Type", "Medallion pendant"],
      ["Motif", "An initial, a number and a web of stars"],
    ],
    seen: "Rose gold tone · baguettes, round diamonds, marquise-cut diamonds",
    making: { delivery: yoni("celestial-initial-medallion", "v03-44_8s", CHECKED()) },
  }),

  collected({
    slug: "jesus-piece-red-flowers",
    title: "Jesus Piece — Red Flowers",
    type: "pendant",
    line: "A crown of red flowers in rose gold.",
    story:
      "Flowers of red pear-shaped stones, in rose gold settings, crown a Jesus piece in white gold tones paved with diamonds from edge to edge. At the centre of its back, carved with stars, sits the BRT mark in rose gold.",
    theme: { preset: "velours", font: "sacre" },
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A crown of red flowers"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "White gold tone, rose gold crown · round diamonds in pavé, baguettes, red pear-shaped stones",
    making: {
      // Its first sketch: the one drawn for it when it was shown as Marcus Thuram's (the same piece).
      sketch: sketch("marcus-thuram-jesus-piece", at(sketchAlt("Jesus Piece — Red Flowers"), "The first sketch")) ?? undefined,
      raw: raw("jesus-piece-red-flowers", "v01-19s"),
      setting: yoni("jesus-piece-red-flowers", "v01-30s", SET()),
      polishing: yoni("jesus-piece-red-flowers", "v01-40s", POLISH()),
    },
  }),

  /* Chains */
  collected({
    slug: "cross-infinity-chain",
    title: "Cross Infinity Chain",
    type: "chain",
    line: "Round links paved with diamonds, joined by crosses.",
    story:
      "A chain of round links in rose gold tones, each one paved with diamonds, joined by crosses of baguettes. Its oval clasp is paved too, with baguettes around the BRT mark. In its photos it carries the pendant of Loïs Openda.",
    theme: { preset: "sacre", tint: "#2b1913", font: "bodoni" },
    specs: [
      ["Type", "Chain"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, baguettes",
  }),
  collected({
    slug: "brt-flower-chain",
    title: "BRT Flower Chain",
    type: "chain",
    line: "Twisted links, flowers of diamonds, a clasp signed BRT.",
    story:
      "Along twisted links in rose gold tones, paved with diamonds, run flowers of round diamonds with leaves of marquise-cut diamonds. Its rectangular clasp is paved with diamonds around the BRT mark; seen from the back, it is polished smooth.",
    theme: { preset: "roses" },
    specs: [
      ["Type", "Chain"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, marquise-cut diamonds",
    making: {
      raw: raw("brt-flower-chain", "v02-5s"),
      setting: yoni("brt-flower-chain", "v04", { ...SETTING_FILM(), onBlack: false }),
      polishing: yoni("brt-flower-chain", "v02-24_8s", POLISH()),
    },
  }),
  collected({
    slug: "baguette-cuban-chain",
    title: "Baguette Cuban Chain",
    type: "chain",
    line: "Baguettes in every link, white and rose in turn.",
    story:
      "A heavy Cuban chain with angular links, each one a field of baguettes framed by round diamonds, the links alternating white and rose gold tones; the back is polished in both tones. Its domed clasp is paved, with the letters BRT and the diamond of the house in rose gold.",
    theme: { preset: "facettes" },
    specs: [
      ["Type", "Chain"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "White and rose gold tones · baguettes, round diamonds in pavé",
  }),
  collected({
    slug: "rose-iced-cuban-chain",
    title: "14 mm Cuban Chain",
    type: "chain",
    line: "A 14 mm Cuban chain, paved link by link, its clasp signed BRT.",
    story: "A 14 mm Cuban chain in rose gold tones, every link paved with round diamonds and polished on the back. Its flat clasp is set with diamonds around the BRT mark.",
    theme: { preset: "velours" },
    specs: [
      ["Type", "Chain"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "Rose gold tone · round diamonds in pavé",
    making: { raw: raw("rose-iced-cuban-chain", "f-2_6s"), setting: yoni("rose-iced-cuban-chain", "f-14_3s", SET()), polishing: yoni("rose-iced-cuban-chain", "f-24s", POLISH()) },
  }),
  collected({
    slug: "wide-rose-iced-cuban-chain",
    title: "Rose 20 mm Cuban Chain",
    type: "chain",
    line: "A 20 mm Cuban chain, densely paved, under a domed clasp.",
    story: "A 20 mm Cuban chain in rose gold tones, each link densely paved with round diamonds, the back polished. The domed clasp is paved too, with the letters BRT raised in polished gold.",
    theme: { preset: "maison", tint: "#33171a", glow: "#f2b0a8", texture: "facets", font: "geometrie" },
    specs: [
      ["Type", "Chain"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "Rose gold tone · round diamonds in pavé",
  }),
  collected({
    slug: "two-tone-iced-cuban-chain",
    title: "Two-Tone Iced Cuban Chain",
    type: "chain",
    line: "Rounded links, white and rose in turn.",
    story: "A heavy Cuban chain whose rounded links alternate white and rose gold tones, each one fully paved with diamonds.",
    theme: { preset: "facettes", tint: "#2a1a16", glow: "#e8b4a0" },
    specs: [["Type", "Chain"]],
    seen: "White and rose gold tones · round diamonds in pavé",
  }),
  collected({
    slug: "white-iced-cuban-chain",
    title: "White Iced Cuban Chain",
    type: "chain",
    line: "White links, paved, under a domed clasp.",
    story: "A Cuban chain in white gold tones, each link paved with round diamonds. The domed clasp is paved too, with the letters BRT and the diamond of the house in rose gold.",
    theme: { preset: "facettes" },
    specs: [
      ["Type", "Chain"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "White gold tone, rose gold lettering · round diamonds in pavé",
    making: {
      raw: yoni("white-iced-cuban-chain", "p04", { ...RAW(), onBlack: false }),
      setting: yoni("white-iced-cuban-chain", "v01", { ...SETTING_FILM(), onBlack: false }),
    },
  }),
  collected({
    slug: "two-row-tennis-chain",
    title: "Two-Row Tennis Chain",
    type: "chain",
    line: "Two rows of diamonds, side by side.",
    story: "A tennis chain of two rows of round diamonds, each one held by its own claws. It is shown in two versions: white gold tones and rose gold tones.",
    theme: { preset: "maison", texture: "silk", font: "bodoni", entrance: "glint" },
    specs: [["Type", "Chain"]],
    seen: "White and rose gold tones · round diamonds in claw settings",
  }),
  collected({
    slug: "pear-link-chain",
    title: "Infinity Pear Chain",
    type: "chain",
    line: "Links of diamonds, each holding a pear.",
    story: "A chain in white gold tones made of figure-of-eight links, each loop outlined with round diamonds and holding a pear-shaped diamond, joined by short paved bars.",
    theme: { preset: "pluie" },
    specs: [["Type", "Chain"]],
    seen: "White gold tone · round and pear-shaped diamonds",
  }),

  /* Rings */
  collected({
    slug: "oval-eternity-band",
    title: "Oval Eternity Ring",
    type: "ring",
    line: "Oval diamonds, all the way around.",
    story: "An eternity band in white gold tones, set all around with oval diamonds in claw settings. Inside, the polished band carries the BRT mark.",
    theme: { preset: "facettes", font: "bodoni" },
    specs: [
      ["Type", "Ring"],
      ["Signature", "BRT mark inside"],
    ],
    seen: "White gold tone · oval diamonds in claw settings",
  }),
  /* The top of the Inter ring worn as a pendant (Yoni, 23/11/2026: « le top de l'Inter Milan devient une chaîne »): its photos
     sent on WhatsApp (scripts/extra-media.mjs), the same players and the same world as the ring. Its 3D file (ZP0975-BJ001.3dm)
     lacks the meshes of its metal: not published. */
  piece({
    slug: INTER_PENDANT,
    title: "Inter Milan — Campione d'Italia Pendant",
    type: "pendant",
    line: "The top of the Inter ring, worn as a pendant.",
    story:
      "The top of the Campione d'Italia ring lifts off and becomes a pendant.\n\n" +
      "The Inter emblem in diamonds on its deep blue ground, inside its band of stars, is then worn on a chain, close to the heart.",
    people: ["inter-milan", "marcus-thuram"],
    client: "Inter Milan",
    theme: { preset: "victoire-nuit" },
    cover: extra(INTER_PENDANT, "black", at("The top of the Inter ring worn as a pendant, on black")),
    gallery: [
      extra(INTER_PENDANT, "black", at("The top of the Inter ring worn as a pendant, on black")),
      extra(INTER_PENDANT, "worn", { ...at("The Inter pendant worn on a chain"), onBlack: false }),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "The top of the Campione d'Italia ring"],
    ],
  }),

  /* The Bosnia and Herzegovina ring (Yoni, 23/11/2026): its photos retouched on black, in his order (scripts/extra-media.mjs);
     its texts say only what the photos show, no name of a player. All black, no universe for now. */
  piece({
    slug: BOSNIA,
    title: "Bosnia and Herzegovina — World Cup 2026 Ring",
    type: "ring",
    line: "The map of Bosnia in yellow enamel, framed by blue baguettes.",
    story:
      "A ring in yellow gold. At its centre, the map of Bosnia and Herzegovina in yellow enamel, crossed by the blue band and its stars, rests on a pavé of diamonds inside a surround of blue baguette stones. World Cup runs above it, 2026 below.\n\n" +
      "Fleurs-de-lis in polished gold stand out from the diamonds, and the words First World Cup Game run along the side of the top. Touches of green enamel edge the shank.",
    theme: { preset: "noir" },
    cover: extra(BOSNIA, "b04497", at("The Bosnia and Herzegovina World Cup 2026 ring, the map of Bosnia in yellow enamel at its centre")),
    gallery: [
      extra(BOSNIA, "b04499", at("The ring turned slightly, the words First World Cup running down its side")),
      extra(BOSNIA, "b04512", at("The top of the ring face on: World Cup, the map of Bosnia, 2026")),
      extra(BOSNIA, "b04509", at("The map of Bosnia with its blue band and stars, on a pavé of diamonds inside blue baguettes")),
      extra(BOSNIA, "b04487", at("A fleur-de-lis in polished gold on the diamond pavé of the side, above a line of green enamel")),
      extra(BOSNIA, "b04504", at("The ring seen from above and from the side, First World Cup Game in raised letters around its top")),
      extra(BOSNIA, "b04506", at("A name and a number in polished gold over baguettes, on the side of the ring")),
      extra(BOSNIA, "b04507", at("The side of the ring: a name and a number on a field of baguettes, under First World Cup Game")),
      extra(BOSNIA, "b04508", at("The same side of the ring, reflected on black")),
      extra(BOSNIA, "b04513", at("The shoulder of the ring: a fleur-de-lis on the pavé, a band of green enamel, sculpted gold beneath")),
      extra(BOSNIA, "b04514", at("A fleur-de-lis raised over the diamonds, beside a band of green enamel")),
      extra(BOSNIA, "b04462", at("The side of the ring, a fleur-de-lis on its pavé")),
      extra(BOSNIA, "b04467", at("The top of the ring, tilted: the map of Bosnia between World Cup and 2026")),
      extra(BOSNIA, "b04469", at("The top of the ring in the light, its blue baguettes all around the map")),
      extra(BOSNIA, "b04470", at("Under the ring: sculpted gold edged with green enamel")),
      extra(BOSNIA, "b04478", at("The side of the ring, a name and a number over baguettes, above a band of green enamel")),
      extra(BOSNIA, "b04489", at("The ring in profile: First World Cup Game around the top, a name and a number on the side")),
    ],
    specs: [
      ["Type", "Ring"],
      ["Motif", "The map of Bosnia and Herzegovina, World Cup 2026"],
    ],
    seen: "Yellow gold tone · round diamonds in pavé, baguettes, blue baguette stones; yellow, blue and green enamel",
    boxSlug: "world-cup-display",
  }),
];

/** Every piece: the pieces of the site, then the pieces published on 20/11/2026. */
export const PIECES: Piece[] = [...SITE_PIECES, ...COLLECTED];

/* ---------- Boxes ---------- */

/** The trunk shown first on the page Signature Trunks. */
export const FEATURED_BOX = "signature-trunk";

const T = (file: string, texts: Partial<MediaItem>) => yoni("boxes/signature-trunk", file, { ...texts, onBlack: false });

/**
 * The boxes Yoni asked to remove (21/11/2026): kept unpublished in the admin (he can publish them again), shown nowhere;
 * their old address leads to the page of the trunks.
 */
export const REMOVED_BOXES = ["nz-travel-case"];

/**
 * The Signature Trunks, in the order of their page (Yoni, 22/11/2026): each opens (src/data/trunks.ts), then its piece
 * rises from it. `pieceSlug`: the address of its piece; null while it is not known (only "Create your trunk" then, and no
 * piece rising): fill it here or in the admin ("Pièce liée") once Yoni says which piece it holds.
 */
export const BOXES: Box[] = ([
  {
    // The player whose portrait it carries is not named (not confirmed).
    slug: FEATURED_BOX,
    name: "Signature Trunk",
    description:
      "A black trunk behind a lattice of metal, a portrait engraved on its doors. Inside, a screen plays a film, and the BRT mark rests on the velvet: the presentation becomes part of the creation.",
    images: list(
      ...proImages(FEATURED_BOX, [
        at("The Signature Trunk closed, a portrait engraved on its doors", "Closed"),
        at("The version with a player engraved full length", "Full length"),
        at("The trunk open on its screen", "Inside"),
        at("The trunk open, the portrait on its door"),
      ]),
      T("p05", at("The engraved figure, up close")),
      T("p09", at("The screen inside the trunk, from the front")),
      T("p07", at("The BRT mark on the velvet", "The BRT mark")),
    ),
    pieceSlug: null,
  },
  {
    slug: "sirius",
    name: "Sirius",
    description: "A trunk made to measure for the Sirius chain, lined in red to hold the piece like a trophy.",
    images: proImages("sirius", [
      at("The Sirius trunk, closed"),
      at("The horned mask on the trunk, beside its display"),
      at("The Sirius trunk, opened on its red lining", "Opened"),
      at("The chain on its display, beside the open trunk"),
    ]),
    pieceSlug: "sirius",
  },
  {
    slug: "tulips-on-tour",
    name: "Tulips on Tour",
    description: "A custom case with its own artwork, made for one piece and one story.",
    images: proImages("tulips-on-tour", [
      at("The Tulips on Tour custom case"),
      at("The back of the case, with the BRT mark"),
      at("The case open", "Opened"),
      at("The medallion on its display, beside the case"),
    ]),
    pieceSlug: "tulips-on-tour-medallion",
  },
  {
    slug: "dragon-ball-trunk",
    name: "Dragon Ball Trunk",
    description: "A bright orange trunk with the anime artwork on its front, made to hold the Dragon Ball pendant.",
    images: proImages("dragon-ball-trunk", [
      at("The orange Dragon Ball trunk with its artwork"),
      at("The back of the trunk"),
      at("The orange trunk open on the Dragon Ball pendant", "Opened"),
      at("The trunk open, from another angle"),
    ]),
    pieceSlug: "kevin-schade-dragon-ball-pendant",
  },
  {
    // The drawing on its front is not named (rights, as Dragon Ball).
    slug: "the-hand-cube",
    name: "The Hand Cube",
    description: "A black cube with a drawing in rose gold on its front. It opens on the pendant, lit from inside, and folds into a display.",
    images: proImages("the-hand-cube", [
      at("The cube closed, its drawing in rose gold"),
      at("The cube from the side"),
      at("The cube open on The Hand, lit from inside", "Opened"),
      at("The cube folded into a display"),
    ]),
    pieceSlug: "the-hand",
  },
  {
    // The name and the number on its side are not written (a player of the squad).
    slug: "dfb-pokal-2025-display",
    name: "DFB-Pokal 2025 Display",
    description: "A glass display on a golden base: the crest of VfB Stuttgart and its stadium drawn in gold, DFB-Pokal Sieger 2025 on its front.",
    images: proImages("dfb-pokal-2025-display", [
      at("The display from the front"),
      at("The display from the side"),
      at("The display open, its lit cushion", "Opened"),
      at("Its back, VfB Stuttgart DFB-Pokal Sieger 2025"),
    ]),
    pieceSlug: VFB,
  },
  {
    // Its piece: the Bosnia and Herzegovina ring (Yoni, 23/11/2026); the names on the four displays are not written.
    slug: "world-cup-display",
    name: "World Cup Display",
    description: "A glass display on a blue and gold base: a golden fleur-de-lis on its front, a coat of arms on its side, and the engraving 12.06.2026 First World Cup Game.",
    images: proImages("world-cup-display", [
      at("The display from the front, its engraving"),
      at("The display from the side"),
      at("Its side with the coat of arms"),
      at("The display open", "Opened"),
      at("Four displays side by side"),
    ]),
    pieceSlug: BOSNIA,
  },
  {
    // Its piece is not known yet; the player on its photograph is not named.
    slug: "photo-case",
    name: "Photo Case",
    description: "A grey trunk in crocodile-textured leather, a photograph on its front and the BRT mark on its back. Inside, black suede and a tray with a round place.",
    images: proImages("photo-case", [
      at("The trunk and its photograph"),
      at("Its other side, with the BRT mark"),
      at("The trunk open, beside its tray", "Opened"),
    ]),
    pieceSlug: null,
  },
  {
    // Its piece is not known yet.
    slug: "brt-coral-case",
    name: "BRT Coral Case",
    description: "A black trunk with the BRT mark. Inside, coral suede and a round tray.",
    images: proImages("brt-coral-case", [
      at("The trunk closed, with the BRT mark"),
      at("The trunk from the side"),
      at("The trunk open on its coral suede", "Opened"),
      at("The trunk open, beside its round tray"),
    ]),
    pieceSlug: null,
  },
  {
    // Its piece is not known yet.
    slug: "trophy-trunk",
    name: "Trophy Trunk",
    description: "A black trunk with a photograph on its front: a crowd in red smoke, a trophy held high. Inside, black suede and the BRT mark.",
    images: proImages("trophy-trunk", [
      at("The trunk and its photograph"),
      at("Its other side, with the BRT mark"),
      at("The trunk open on its black suede", "Opened"),
      at("The trunk open, from above"),
    ]),
    pieceSlug: null,
  },
  {
    slug: "campione-d-italia-case",
    name: "Campione d'Italia Case",
    description: "A black case marked Campione d'Italia 2023/2024, with a place for the ring and its card.",
    images: list(
      inter.caseOpen,
      inter.case,
      still("boxes/campione-d-italia-case/01", at("The Campione d'Italia case, open, with the ring and its card")),
      still("boxes/campione-d-italia-case/02", at("The ring in its case", "The ring in place")),
      // Its real photos sent by Yoni (23/11/2026).
      ...[1, 2, 3, 4, 5, 6].map((n) =>
        extra("boxes/campione-d-italia-case", "p" + n, {
          ...at(n === 3 ? "The lid of the Campione d'Italia case, up close" : n >= 5 ? "The Campione d'Italia case open, with the small ring box and the card" : "The Campione d'Italia case open, with the medal on its ribbon and the card"),
          onBlack: false,
        }),
      ),
    ),
    pieceSlug: INTER,
  },
  {
    slug: "butterfly-trunk",
    name: "Butterfly Trunk",
    description: "A black trunk with rose gold corners, opened by Michy Batshuayi on his Butterfly chain.",
    images: list(still("boxes/butterfly-trunk/01", at("Michy Batshuayi opening the black trunk of his chain"))),
    pieceSlug: "michy-batshuayi-butterfly-pendant",
  },
  {
    slug: "okafor-trunk",
    name: "Okafor Trunk",
    description: "A trunk with a photograph set in its lid; inside, the tennis chains lie in their own fitted places.",
    images: list(still("boxes/okafor-trunk/01", at("The trunk with a photograph in its lid")), still("boxes/okafor-trunk/02", at("The tennis chains in the trunk", "Inside"))),
    pieceSlug: "noah-okafor-octagon-pendant",
  },
  {
    slug: "nz-travel-case",
    name: "NZ Travel Case",
    description: "A zipped black case with the NZ logo in gold, fitted with compartments for the pieces.",
    images: list(still("boxes/nz-travel-case/01", at("The NZ travel case, open"))),
    pieceSlug: "tanguy-nianzou-fam-medallion",
  },
] satisfies Omit<Box, "published">[]).map((b) => ({ ...b, published: !REMOVED_BOXES.includes(b.slug) }));
