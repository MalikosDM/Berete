/*
 * The pieces and the boxes. Every piece was found in the client's stories
 * and folders (see scripts/piece-media.mjs for the photos made from them).
 * The texts only describe what the photos show; they are drafts (draft: true)
 * until the client validates them. Nothing here is a figure (carats, weights,
 * prices): "seen" is the metal and the stones the photos show, the row "Metal
 * and stones" of the technical sheet, left out when the photos say nothing sure.
 */
import { group, list, sketch, st, still, yoni } from "./sources.js";
import type { PieceAtelier } from "./atelier.js";
import type { PieceShowcase } from "./showcase.js";
import type { PieceTheme } from "./themes.js";
import type { Box, Making, MakingStep, MediaItem, Piece, PieceType, Press } from "./types.js";

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
];

/** Pieces renamed since the first version of the site: old address -> new address. */
export const RENAMED_PIECES: Record<string, string> = {
  "white-hands": "kenan-yildiz-celebration-pendant",
  "t-serpent": "marcus-thuram-t-serpent-pendant",
  "the-jersey": "noah-okafor-jersey-pendant",
  rs: "angelo-stiller-as-pendant",
  butterfly: "michy-batshuayi-butterfly-chain",
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
  atelier?: PieceAtelier;
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
  making?: Partial<Record<MakingStep, Maybe>>;
};

/** The text of a first sketch: the site translates it with the title of the piece (src/i18n/content.ts). */
export const sketchAlt = (title: string) => "Illustration of the first sketch of " + title;

function piece(p: PieceInput): Piece {
  const making: Making = {};
  for (const [step, item] of Object.entries(p.making ?? {}) as [MakingStep, Maybe][]) if (item) making[step] = item;
  // The first sketch from the folder of sketches, unless the piece already has its own.
  making.sketch ??= sketch(p.slug, at(sketchAlt(p.title), "The first sketch")) ?? undefined;
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
    gallery: list(...p.gallery).slice(0, 10),
    handover: list(...(p.handover ?? [])),
    specs: [...p.specs.map(([label, value]) => ({ label, value })), ...(p.seen ? [{ label: SEEN_LABEL, value: p.seen }] : [])],
    details: (p.details ?? []).map(([title, text, photo]) => ({ title, text, photo: photo?.src || null })),
    press: p.press ?? [],
    people: p.people ?? [],
    boxSlug: p.boxSlug ?? null,
    featured: p.featured ?? false,
    draft: true,
    published: p.published ?? !REMOVED_PIECES.includes(p.slug),
    theme: p.theme ?? null,
    showcase: p.showcase ?? null,
    atelier: p.atelier ?? null,
    making,
  };
}

const at = (alt: string, caption?: string): Partial<MediaItem> => (caption ? { alt, caption } : { alt });
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

/** Texts shared by the photos of many pieces. */
const RAW = () => at("The piece in raw metal, before the setting", "This piece, before the setting");
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
    story:
      "A championship ring for the 2025 DFB-Pokal winners. The club crest sits at its heart, framed by red pear-shaped stones. The removable top opens onto a sculpted cup, and every ring carries the name and number of the player who wears it.",
    people: ["deniz-undav", "angelo-stiller", "jamie-leweling", "maximilian-mittelstaedt", "chris-fuehrich", "atakan-karazor", "vfb-stuttgart"],
    client: "VfB Stuttgart",
    theme: { preset: "victoire-rouge" },
    cover: vfb.front,
    gallery: [vfb.open, vfb.cup, vfb.engraving, vfb.profile, vfb.crest, vfb.undav, vfb.stiller, vfb.mittelstaedt, vfb.karazor, vfb.squad],
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
    making: { delivery: vfb.presentation },
  }),
  piece({
    slug: INTER,
    title: "Inter Milan — Campione d'Italia Ring",
    type: "ring",
    line: "Twenty stars for twenty titles.",
    story:
      "Twenty titles, one number. A series of rings made for the whole squad after Inter's twentieth league title: the club emblem in diamonds on a deep blue ground, a band of stars around it, and the words Campione d'Italia on the side. The top lifts off to reveal a sculpted cup, and can be worn on its own as a pendant.",
    people: ["inter-milan", "marcus-thuram"],
    client: "Inter Milan",
    theme: { preset: "victoire-nuit" },
    cover: inter.ring,
    gallery: [inter.emblem, inter.stars, inter.flag, inter.side, inter.serieA, inter.cup, inter.pendant, inter.brt, inter.squad, inter.glove],
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
    making: { delivery: inter.case },
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
    line: "The hero lifts a blue sphere, wrapped by the dragon.",
    story:
      "A sculpture in miniature, made for Kevin Schade. A figure in rose gold holds up a sphere set with blue stones, while a dragon paved with white diamonds coils around him, among dragon balls in rose gold. It started as a hand drawing; several versions were drawn before this one was chosen. It hangs from a diamond-set Cuban chain.",
    people: ["kevin-schade"],
    theme: { preset: "energie" },
    cover: yoni("kevin-schade-dragon-ball-pendant", "p18", at("Kevin Schade's Dragon Ball pendant, seen from the front")),
    gallery: [
      yoni("kevin-schade-dragon-ball-pendant", "p19", at("The Dragon Ball pendant on black, with its Cuban chain")),
      yoni("kevin-schade-dragon-ball-pendant", "p07", at("The hero in rose gold, among the dragon balls", "The hero")),
      yoni("kevin-schade-dragon-ball-pendant", "p09", at("The sphere set with blue stones", "The sphere")),
      yoni("kevin-schade-dragon-ball-pendant", "p08", at("Close-up of the dragon scales and the rose gold spheres", "The dragon, up close")),
      yoni("kevin-schade-dragon-ball-pendant", "p14", at("The hero lifting the sphere")),
      yoni("kevin-schade-dragon-ball-pendant", "p06", BACK()),
      yoni("kevin-schade-dragon-ball-pendant", "p20", at("The pendant on its chain, on a black bust")),
      st("kevin-schade", 15, at("Kevin Schade wearing the pendant", "Worn by Kevin Schade")),
      st("kevin-schade", 22, at("Film of the pendant turning in a gloved hand")),
    ],
    specs: [
      ["Type", "Pendant on a Cuban chain"],
      ["Motif", "A hero, a dragon and the dragon balls"],
    ],
    seen: "White and rose gold tones · round diamonds in pavé; blue round, baguette and square stones",
    boxSlug: "dragon-ball-trunk",
    making: {
      sketch: st("kevin-schade", 8, at("The first hand drawing of the Dragon Ball pendant", "The Original Vision")),
      raw: yoni("kevin-schade-dragon-ball-pendant", "p21", { ...RAW(), onBlack: false }),
      setting: st("kevin-schade", 20, at("From the 3D model to the stones set by hand", "From the 3D model to the setting")),
      delivery: yoni("boxes/dragon-ball-trunk", "p01", at("The orange trunk open on the Dragon Ball pendant")),
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
    theme: { preset: "bianconero" },
    cover: yoni("kenan-yildiz-celebration-pendant", "p07", at("Kenan Yildiz's pendant: two crossed hands paved with diamonds")),
    gallery: [
      yoni("kenan-yildiz-celebration-pendant", "p06", at("The celebration pendant from another angle")),
      yoni("kenan-yildiz-celebration-pendant", "p02", at("The celebration pendant in profile")),
      yoni("kenan-yildiz-celebration-pendant", "p03", at("The celebration pendant and its medallion")),
      yoni("kenan-yildiz-celebration-pendant", "v01", at("Film of the celebration pendant")),
      yoni("kenan-yildiz-celebration-pendant", "p01", { ...at("Kenan Yildiz wearing the pendant", "Worn by Kenan Yildiz"), onBlack: false }),
      st("kenan-yildiz", 2, at("Kenan Yildiz doing his celebration on the pitch", "The celebration")),
      st("kenan-yildiz", 4, at("The pendant and its medallion on black")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "Two crossed hands, his celebration"],
    ],
    seen: "White gold tone · round diamonds in pavé, baguettes at the cuffs, step-cut stones on the bail",
    making: { sketch: st("kenan-yildiz", 1, at("3D model of the pendant", "The 3D design")), raw: yoni("kenan-yildiz-celebration-pendant", "p04", RAW()) },
  }),
  piece({
    slug: "noah-okafor-jersey-pendant",
    title: "Noah Okafor — Jersey Pendant",
    type: "pendant",
    line: "A jersey worn arms crossed, set stone by stone.",
    story:
      "A jersey sculpted in volume, arms crossed like its owner on the pitch, entirely set with diamonds. The Swiss cross sits on the chest and green stones run along the sleeve. Below, triangle-cut stones form the base, and the pendant hangs from a chain of diamond flowers.",
    people: ["noah-okafor"],
    theme: { preset: "tunnel" },
    cover: yoni("noah-okafor-jersey-pendant", "p20", at("Noah Okafor's jersey pendant on a chain of diamond flowers")),
    gallery: [
      yoni("noah-okafor-jersey-pendant", "p18", at("The Swiss cross on the chest", "The Swiss cross")),
      yoni("noah-okafor-jersey-pendant", "p15", at("Green and white stones on the sleeve", "The sleeve")),
      yoni("noah-okafor-jersey-pendant", "p07", at("OKA and the number 4 on the back of the jersey", "The back")),
      yoni("noah-okafor-jersey-pendant", "p12", at("Close-up of the triangle-cut stones", "Triangle-cut stones")),
      yoni("noah-okafor-jersey-pendant", "p10", at("The collar of the jersey in rose gold")),
      yoni("noah-okafor-jersey-pendant", "p06", at("The back of the jersey pendant")),
      yoni("noah-okafor-jersey-pendant", "p16", at("The pendant, arms crossed, from another angle")),
      yoni("noah-okafor-jersey-pendant", "p01", { ...at("Noah Okafor wearing the pendant", "Worn by Noah Okafor"), onBlack: false }),
      st("noah-okafor", 11, at("Film: from the player to the jersey in diamonds")),
      st("noah-okafor", 5, at("Noah Okafor arms crossed, above the pendant that reproduces his pose", "From the pitch to the pendant")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A jersey, arms crossed, with the Swiss cross"],
    ],
    seen: "White and rose gold tones · round diamonds in pavé, pear, marquise, baguette and triangle-cut diamonds; green and red stones",
    making: { raw: yoni("noah-okafor-jersey-pendant", "p21", { ...RAW(), onBlack: false }) },
  }),
  piece({
    slug: "noah-okafor-oka-pendant",
    title: "Noah Okafor — OKA Nameplate Pendant",
    type: "pendant",
    line: "Three letters, a ball in rose gold.",
    story:
      "The letters OKA in white diamonds, crossed by rose gold patches, with a sculpted football in rose gold set on the letters. It hangs from a diamond-set Cuban chain.",
    people: ["noah-okafor"],
    theme: { preset: "tunnel", mark: "OKA" },
    cover: yoni("noah-okafor-oka-pendant", "p17", at("The OKA nameplate pendant of Noah Okafor on its Cuban chain")),
    gallery: [
      yoni("noah-okafor-oka-pendant", "p03", at("Close-up of the rose gold football", "The ball")),
      yoni("noah-okafor-oka-pendant", "p05", at("The OKA pendant on its Cuban chain, on a black bust")),
      yoni("noah-okafor-oka-pendant", "p06", at("The letter O, set with baguettes")),
      yoni("noah-okafor-oka-pendant", "p04", at("The rose gold patches on the letters")),
      yoni("noah-okafor-oka-pendant", "p09", at("The OKA pendant from the side")),
      yoni("noah-okafor-oka-pendant", "v02", { ...at("The 3D design of the OKA pendant on screen", "The 3D design"), onBlack: false }),
      yoni("noah-okafor-oka-pendant", "p01", { ...at("Noah Okafor wearing the OKA pendant", "Worn by Noah Okafor"), onBlack: false }),
      yoni("noah-okafor-oka-pendant", "p02", { ...at("The OKA pendant worn on a white jersey"), onBlack: false }),
      yoni("noah-okafor-oka-pendant", "p18", { ...at("The OKA pendant presented in its box"), onBlack: false }),
      st("noah-okafor-s24", 4, at("Film of the OKA pendant")),
    ],
    specs: [
      ["Type", "Nameplate pendant"],
      ["Motif", "The letters OKA and a football"],
    ],
    seen: "White and rose gold tones · round diamonds, baguettes",
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
    cover: yoni("noah-okafor-octagon-pendant", "p09", at("Noah Okafor's octagon pendant of baguette diamonds")),
    gallery: [
      yoni("noah-okafor-octagon-pendant", "p02", at("The octagon pendant on its tennis chain")),
      yoni("noah-okafor-octagon-pendant", "p04", at("Close-up of the baguettes and pear-shaped stones", "Baguettes and pears")),
      yoni("noah-okafor-octagon-pendant", "p06", at("The baguettes and the lines of rose gold, up close")),
      yoni("noah-okafor-octagon-pendant", "p01", at("The pendant on its tennis chain, on a black bust")),
      yoni("noah-okafor-octagon-pendant", "p10", BACK()),
      yoni("noah-okafor-octagon-pendant", "p08", BAIL()),
      st("noah-okafor-ii", 3, at("Film of the trunk and the tennis chains inside", "The trunk")),
      st("noah-okafor-ii", 5, at("The pendant and its trunk on a counter")),
    ],
    specs: [
      ["Type", "Pendant with tennis chains"],
      ["Shape", "Octagon"],
    ],
    seen: "White and rose gold tones · baguette diamonds in a herringbone, round and pear-shaped diamonds",
    boxSlug: "okafor-trunk",
    making: {
      setting: yoni("noah-okafor-octagon-pendant", "p11", { ...at("The pendant on the setting wax, its stones being set", "In the setting"), onBlack: false }),
      delivery: still("boxes/okafor-trunk/01", at("The trunk with a photograph in its lid")),
    },
  }),
  piece({
    slug: "marcus-thuram-t-serpent-pendant",
    title: "Marcus Thuram — T-Serpent Pendant",
    type: "pendant",
    line: "A letter, wrapped by a serpent.",
    story:
      "A gothic T of white diamonds and baguettes, with a rose gold serpent coiled around it. Its scales are pear-shaped diamonds, each in its own setting, and its eye is a red pear-shaped stone.",
    people: ["marcus-thuram"],
    theme: { preset: "serpent", mark: "T" },
    cover: yoni("marcus-thuram-t-serpent-pendant", "p08", at("Marcus Thuram's T-Serpent pendant: a diamond T with a rose gold serpent")),
    gallery: [
      yoni("marcus-thuram-t-serpent-pendant", "p12", at("The serpent coiled around the T")),
      yoni("marcus-thuram-t-serpent-pendant", "p02", at("The serpent's head and its red stone", "The eye")),
      yoni("marcus-thuram-t-serpent-pendant", "p01", at("The scales of the serpent, pear by pear", "The scales")),
      yoni("marcus-thuram-t-serpent-pendant", "p07", at("The tip of the T")),
      yoni("marcus-thuram-t-serpent-pendant", "p11", at("Close-up of the serpent along the T", "The setting, up close")),
      yoni("marcus-thuram-t-serpent-pendant", "p04", at("The pendant with its bail")),
      yoni("marcus-thuram-t-serpent-pendant", "p18", at("The T-Serpent pendant on black")),
      yoni("marcus-thuram-t-serpent-pendant", "v01", at("Details of the T-Serpent pendant")),
      st("thuram", 15, at("Film of the pendant on its chain")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A gothic T and a serpent"],
    ],
    seen: "White and rose gold tones · round diamonds in pavé, baguettes, triangle, pear and marquise diamonds, a large red pear-shaped stone",
    making: {
      raw: yoni("marcus-thuram-t-serpent-pendant", "08-p02", { ...at("The T-Serpent pendant before the setting", "This piece, before the setting"), onBlack: false }),
      setting: yoni("marcus-thuram-t-serpent-pendant", "v03", { ...SETTING_FILM(), onBlack: false }),
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
    cover: still("pieces/marcus-thuram-thorned-t-pendant/cover", at("Marcus Thuram's T pendant wound with rose gold thorns")),
    gallery: [
      st("thuram-ss23", 5, at("Film of the thorned T pendant")),
      st("thuram-ss23", 4, at("The thorned T next to the Jesus piece, with their chains")),
      st("thuram-ss23", 3, at("Film of the pendants on their infinity link chains")),
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
    cover: yoni("angelo-stiller-as-pendant", "p11", at("AS pendant, front view")),
    gallery: [
      yoni("angelo-stiller-as-pendant", "p07", at("Angelo Stiller's AS pendant on a diamond tennis chain")),
      yoni("angelo-stiller-as-pendant", "p08", at("AS pendant, close-up of the baguette diamonds", "Baguette diamonds")),
      yoni("angelo-stiller-as-pendant", "p05", at("Close-up of the letter A")),
      yoni("angelo-stiller-as-pendant", "p03", at("The pendant on its tennis chain, on a black bust")),
      yoni("angelo-stiller-as-pendant", "p01", at("Back of the AS pendant with the BRT mark in rose gold", "The BRT mark, on the back")),
      yoni("angelo-stiller-as-pendant", "p10", at("AS pendant, side view", "In profile")),
      yoni("angelo-stiller-as-pendant", "p04", BAIL()),
      st("angelo-stiller", 1, at("Film of the AS pendant on a bust")),
    ],
    specs: [
      ["Type", "Pendant on a tennis chain"],
      ["Motif", "The initials AS in a shield"],
      ["Signature", "BRT mark in rose gold, on the back"],
    ],
    seen: "White gold tone · baguette diamonds in a herringbone, round diamonds",
    making: {
      raw: yoni("angelo-stiller-as-pendant", "p12", { ...RAW(), onBlack: false }),
      setting: yoni("angelo-stiller-as-pendant", "v04", { ...SETTING_FILM(), onBlack: false }),
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
    cover: still("pieces/jamie-leweling-jl-pendant/cover", at("Jamie Leweling's JL pendant on its chain")),
    gallery: [
      st("jamie-leweling", 1, at("Film of the JL pendant")),
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
    story: "A tall letter L paved with white diamonds, with a cherub in rose gold resting in its corner.",
    people: ["deniz-undav"],
    theme: { preset: "sacre", tint: "#331013", mark: "L" },
    cover: still("pieces/deniz-undav-l-pendant/cover", { ...at("Deniz Undav's L pendant with a rose gold cherub"), onBlack: true }),
    gallery: [st("deniz-undav", 3, at("Deniz Undav wearing the pendant, the DFB-Pokal in his arms", "Worn by Deniz Undav"))],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "The letter L and a cherub"],
    ],
    seen: "White gold tone, rose gold cherub · round diamonds in pavé",
  }),
  piece({
    slug: "samuel-ballet-jesus-piece",
    title: "Samuel Ballet — Jesus Piece",
    type: "pendant",
    line: "Rose gold, and a crown of pear-shaped diamonds.",
    story:
      "A Jesus piece in rose gold, paved with diamonds and crowned with pear and marquise-cut stones. The back is engraved with a pattern of flowers and the BRT mark. It is worn on a twisted chain set with diamond flowers.",
    people: ["samuel-ballet"],
    theme: { preset: "sacre", tint: "#2e1a14" },
    cover: st("samuel-ballet", 2, at("Samuel Ballet's Jesus piece in rose gold with a crown of pear diamonds")),
    gallery: [
      st("samuel-ballet", 1, at("Close-up of the face and the crown", "The crown")),
      st("samuel-ballet", 4, at("The crown of pear-shaped diamonds")),
      st("samuel-ballet", 6, at("The back of the pendant, engraved with the BRT mark", "The back")),
      st("samuel-ballet", 5, at("Film of the pendant on its chain of diamond flowers")),
      st("samuel-ballet", 3, at("Film of the pendant being worn", "Worn")),
      st("collectors", 23, at("Film of the Jesus piece on its chain")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "Rose gold tone, white gold crown · round diamonds in pavé, pear-shaped diamonds in the crown",
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
    cover: yoni("malik-tillman-cross-pendant", "p17", at("Malik Tillman's cross pendant on its diamond link chain")),
    gallery: [
      yoni("malik-tillman-cross-pendant", "p13", at("The centre of the cross and its monogram", "The centre")),
      yoni("malik-tillman-cross-pendant", "p07", at("Close-up of the round and baguette diamonds")),
      yoni("malik-tillman-cross-pendant", "p14", at("The diamond-shaped bail of the cross", "The bail")),
      yoni("malik-tillman-cross-pendant", "p03", at("The back of the cross with the BRT mark", "The back")),
      yoni("malik-tillman-cross-pendant", "p06", at("The cross on its link chain, on a black bust")),
      yoni("malik-tillman-cross-pendant", "p18", at("A link of the chain, with a cross of baguettes")),
      yoni("malik-tillman-cross-pendant", "p20", { ...at("The 3D design of the cross", "The 3D design"), onBlack: false }),
      yoni("malik-tillman-cross-pendant", "p01", { ...at("The cross pendant, worn"), onBlack: false }),
      st("collectors", 13, at("Malik Tillman wearing his cross at the house", "Worn by Malik Tillman")),
      st("malik-tillman", 2, at("Film of the cross and its link chain")),
    ],
    specs: [
      ["Type", "Pendant on a link chain"],
      ["Motif", "A cross"],
      ["Signature", "BRT mark on the back"],
    ],
    seen: "White gold tone · round diamonds in halo and bezel settings, a frame of baguettes",
    making: {
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
    cover: still("pieces/malik-tillman-tm-pendant/cover", at("Malik Tillman's TM pendant")),
    gallery: [
      st("malik-tillman-ii", 4, at("The TM pendant held up in the light")),
      st("malik-tillman-ii", 2, at("Film of the TM pendant in a gloved hand")),
      st("malik-tillman-ii", 3, at("Film of the TM pendant on its Cuban chain", "With its Cuban chain")),
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
      st("nz", 1, at("Film of the medallion")),
      st("nz", 5, at("Film of the medallion on a bust")),
      st("collectors", 40, at("The FAM medallion worn with the NZ pendant", "Worn together with the NZ pendant")),
    ],
    specs: [
      ["Type", "Medallion pendant on a Cuban chain"],
      ["Motif", "The word FAM among roses"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, marquise-cut diamonds in the flowers",
    boxSlug: "nz-travel-case",
    making: { delivery: still("boxes/nz-travel-case/01", at("The NZ travel case")) },
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
      st("eljero-elia", 3, at("Close-up of the diamond border", "The border")),
      st("eljero-elia", 5, at("The medallion in profile", "In profile")),
      st("eljero-elia", 2, at("Film: the centre of the medallion turns under the finger")),
      st("eljero-elia", 6, at("Film of the clover medallion")),
      st("eljero-elia", 1, at("Film of the medallion at the handover", "The handover")),
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
  piece({
    slug: "lois-openda-script-pendant",
    title: "Loïs Openda — Script Pendant",
    type: "pendant",
    line: "Script letters and a cross of baguettes.",
    story: "Script letters drawn in rose gold over a field of white diamonds, with a cross of baguette-cut stones at the centre and pear-shaped diamonds around.",
    people: ["lois-openda"],
    theme: { preset: "sacre", tint: "#2b1913", font: "bodoni" },
    cover: still("pieces/lois-openda-nameplate-pendant/cover", at("Close-up of Loïs Openda's pendant: rose gold script and a cross of baguettes")),
    gallery: [st("lois-openda", 2, at("Film of the pendant and its chain"))],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "Script letters and a cross"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, pear-shaped diamonds, a cross of baguettes",
  }),
  piece({
    slug: "the-hand",
    title: "The Hand — Pendant",
    type: "pendant",
    line: "A rose gold hand, paved with diamonds and lit with rubies.",
    story: "A hand sculpted in volume, then set stone by stone. Rubies catch the light at every movement, and the BRT mark is engraved on the piece.",
    theme: { preset: "velours" },
    cover: yoni("the-hand", "p07", at("The Hand pendant, a diamond-paved rose gold hand holding a ruby")),
    gallery: [
      yoni("the-hand", "p04", at("The Hand held by its bail, the red stone hanging below")),
      yoni("the-hand", "p01", at("Close-up of the diamond pavé of The Hand", "Set stone by stone")),
      yoni("the-hand", "p02", at("The Hand pendant lying on its side", "In profile")),
      yoni("the-hand", "p06", at("Baguette diamonds at the wrist of The Hand", "The wrist")),
      yoni("the-hand", "p05", at("The BRT mark engraved on The Hand", "The BRT mark")),
      yoni("the-hand", "p03", at("The Hand pendant seen from above", "From above")),
      yoni("the-hand", "v01", at("Film of The Hand pendant")),
    ],
    specs: [
      ["Type", "Pendant"],
      ["Motif", "A hand"],
      ["Signature", "BRT mark engraved"],
    ],
    seen: "Rose gold tone · round diamonds in pavé, baguette and step-cut diamonds at the wrist, a red oval stone",
  }),
  piece({
    slug: "flaneur-medallion",
    title: "Flâneur — Medallion Pendant",
    type: "pendant",
    line: "A walker under his umbrella.",
    story: "A round medallion paved with diamonds, with the word FLÂNEUR and a rose gold walker holding an umbrella, worn on a tennis chain.",
    theme: { preset: "pluie" },
    cover: still("pieces/flaneur-medallion/cover", at("The Flâneur medallion held in a gloved hand")),
    gallery: [st("collectors", 3, at("Film of the Flâneur medallion on its tennis chain"))],
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
    line: "A domed medallion full of coloured stones.",
    story: "A domed medallion set with white diamonds and red, pink and blue stones, worn on a tennis chain and delivered in the Tulips on Tour case.",
    theme: { preset: "tulipes" },
    cover: yoni("tulips-on-tour-medallion", "p21", at("The Tulips on Tour medallion: tulips, a cart and a figure in coloured stones")),
    gallery: [
      yoni("tulips-on-tour-medallion", "p16", at("The figure in red and blue stones, up close", "The figure")),
      yoni("tulips-on-tour-medallion", "p07", at("Tulips in pink and green stones", "The tulips")),
      yoni("tulips-on-tour-medallion", "p12", at("A wheel set with baguettes", "The wheel")),
      yoni("tulips-on-tour-medallion", "p13", at("The script on the edge of the medallion")),
      yoni("tulips-on-tour-medallion", "p06", at("The back of the medallion, engraved with houses and the BRT mark", "The back")),
      yoni("tulips-on-tour-medallion", "p20", BAIL()),
      yoni("tulips-on-tour-medallion", "p05", at("The edge of the medallion, set with red stones", "The edge")),
      st("collectors", 54, at("Film of the medallion being worn for the first time")),
      st("collectors", 53, at("Film of the medallion taken out of its case", "Out of the case")),
    ],
    specs: [
      ["Type", "Medallion pendant"],
      ["Colours", "White diamonds, red, pink and blue stones"],
    ],
    boxSlug: "tulips-on-tour",
    making: {
      raw: yoni("tulips-on-tour-medallion", "p25", { ...RAW(), onBlack: false }),
      setting: yoni("tulips-on-tour-medallion", "v13", { ...at("Film: the medallion assembled at the bench", "At the bench"), onBlack: false }),
      delivery: yoni("boxes/tulips-on-tour", "p03", at("The medallion in its Tulips on Tour case")),
    },
  }),

  /* Chains */
  piece({
    slug: "michy-batshuayi-butterfly-chain",
    title: "Michy Batshuayi — Butterfly Chain",
    type: "chain",
    line: "A chain of diamond butterflies, and a face with butterfly wings.",
    story:
      "Rose gold links set with diamonds, with butterflies placed along the chain and purple pear-shaped stones on their wings. At its centre, a pendant: a face with baguette-cut glasses and butterfly wings, with a large pear-shaped diamond. The back of the pendant is engraved in rose gold with the BRT mark.",
    people: ["michy-batshuayi"],
    theme: { preset: "metamorphose" },
    cover: yoni("michy-batshuayi-butterfly-chain", "p54", at("Michy Batshuayi's Butterfly chain on a black bust")),
    gallery: [
      yoni("michy-batshuayi-butterfly-chain", "p68", at("The pendant: a face with butterfly wings", "The pendant")),
      yoni("michy-batshuayi-butterfly-chain", "p62", at("The face of the pendant", "The face")),
      yoni("michy-batshuayi-butterfly-chain", "p74", at("The pear diamond at the heart of the butterfly", "The centre stone")),
      yoni("michy-batshuayi-butterfly-chain", "p65", at("Close-up of a butterfly wing with purple stones", "The wing")),
      yoni("michy-batshuayi-butterfly-chain", "p57", at("A butterfly link with purple pear-shaped stones")),
      yoni("michy-batshuayi-butterfly-chain", "p69", BACK()),
      yoni("michy-batshuayi-butterfly-chain", "p66", at("The links of the Butterfly chain", "The links")),
      yoni("michy-batshuayi-butterfly-chain", "p60", at("The Butterfly chain and its pendant on a black bust")),
      st("michy-batshuayi", 3, at("Michy Batshuayi wearing the chain", "Worn by Michy Batshuayi")),
      st("michy-batshuayi", 10, at("Film: the piece in the making, its back and the finished chain", "In the making")),
    ],
    handover: [yoni("michy-batshuayi-butterfly-chain", "p17", { ...at("Michy Batshuayi wearing his chain"), onBlack: false })],
    specs: [
      ["Type", "Chain and pendant"],
      ["Motif", "Butterflies, a face with butterfly wings"],
      ["Signature", "BRT mark on the back of the pendant"],
    ],
    seen: "Rose gold tone, white gold details · round diamonds in pavé, baguettes, marquises, a large pear-shaped diamond, purple pear-shaped and round stones",
    boxSlug: "butterfly-trunk",
    making: {
      raw: yoni("michy-batshuayi-butterfly-chain", "p76", { ...RAW(), onBlack: false }),
      delivery: st("michy-batshuayi", 1, at("Michy Batshuayi opening the trunk of his chain", "Opening the trunk")),
    },
  }),
  piece({
    slug: "marcus-thuram-ruby-t-necklace",
    title: "Marcus Thuram — Ruby T Necklace",
    type: "chain",
    line: "Gothic T links, and a ruby at the end of the drop.",
    story:
      "A necklace of diamond links shaped like infinity knots, with gothic T stations along the chain. At the front, a large T in baguettes with rose gold scrolls opens onto a drop that ends with a pear-shaped red stone framed in diamonds. The clasp carries the BRT mark, and the back of the T is engraved with a pattern of flowers.",
    people: ["marcus-thuram"],
    theme: { preset: "velours", font: "gothique", mark: "T" },
    cover: yoni("marcus-thuram-ruby-t-necklace", "p02", at("Marcus Thuram's T necklace: a gothic T with rose gold scrolls")),
    gallery: [
      yoni("marcus-thuram-ruby-t-necklace", "p03", at("The baguettes of the T, up close", "Baguettes")),
      yoni("marcus-thuram-ruby-t-necklace", "p12", at("The red pear-shaped stone at the end of the drop", "The drop")),
      yoni("marcus-thuram-ruby-t-necklace", "p08", at("A rose gold scroll on the T", "The scrolls")),
      yoni("marcus-thuram-ruby-t-necklace", "p05", at("The clasp with the BRT mark", "The clasp")),
      yoni("marcus-thuram-ruby-t-necklace", "p06", at("Marquise diamonds along the T")),
      yoni("marcus-thuram-ruby-t-necklace", "p07", at("The infinity links of the necklace", "The links")),
      yoni("marcus-thuram-ruby-t-necklace", "p01", at("The whole necklace on black velvet")),
      st("thuram-ii", 1, at("Film of the necklace and the engraved back of the T", "The back")),
      st("thuram", 13, at("Film of the drop held in a gloved hand")),
    ],
    specs: [
      ["Type", "Necklace with a drop"],
      ["Motif", "Gothic T and infinity links"],
      ["Signature", "BRT mark on the clasp"],
    ],
    seen: "White gold tone, rose gold details · round diamonds in pavé, baguettes, marquise and pear-shaped diamonds, a large red pear-shaped stone",
    making: { setting: yoni("marcus-thuram-ruby-t-necklace", "v03", { ...SETTING_FILM(), onBlack: false }) },
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
    story: "A chain of twisted links in rose and yellow gold tones, set with diamond flowers along its length.",
    people: ["kevin-schade"],
    theme: { preset: "maison", texture: "silk", font: "bodoni", entrance: "glint" },
    cover: st("kevin-schade", 3, at("Kevin Schade's twisted link chain laid in its box")),
    gallery: [
      st("kevin-schade", 14, at("Film of the twisted chain and its diamond flowers")),
      st("kevin-schade", 1, at("Kevin Schade wearing his chain", "Worn by Kevin Schade")),
      st("kevin-schade", 23, at("Film of Kevin Schade with his chain")),
      st("kevin-schade", 2, at("Kevin Schade at the handover")),
    ],
    specs: [
      ["Type", "Chain"],
      ["Links", "Twisted, with diamond flowers"],
    ],
    seen: "Rose gold tone · round diamonds in pavé and in flowers, marquise-cut leaves",
  }),
  piece({
    slug: "the-safi-link",
    title: "The Safi Link — Chain",
    type: "chain",
    line: "Flowers of marquise diamonds, link after link.",
    story: "A chain whose links are flowers of marquise-cut diamonds in rose and white tones. The house introduced it as The Safi Link.",
    people: ["noah-okafor"],
    theme: { preset: "roses", glow: "#f6e2da" },
    cover: yoni("the-safi-link", "p07", at("The Safi Link chain on a black bust")),
    gallery: [
      yoni("the-safi-link", "p03", at("A flower of marquise and pear-shaped diamonds", "The flower")),
      yoni("the-safi-link", "p02", at("The clasp, a flower with the BRT mark", "The clasp")),
      yoni("the-safi-link", "p04", at("The twisted rose gold links between the flowers")),
      yoni("the-safi-link", "p05", at("The Safi Link on a black bust, from the side")),
      yoni("the-safi-link", "p01", { ...at("A chain of diamond flowers seen from behind, worn"), onBlack: false }),
      st("noah-okafor", 10, at("The Safi Link, presented by the house")),
    ],
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
    story: "A chain of diamond flowers with a diamond-set nameplate, delivered in the Sirius trunk made for it, on a red lining.",
    theme: { preset: "etoiles" },
    cover: group("pieces/sirius", [at("Sirius chain with its diamond nameplate pendant")])[0],
    gallery: [st("collectors", 52, at("Film: the Sirius trunk opened on the chain", "In its trunk"))],
    specs: [
      ["Type", "Chain and nameplate"],
      ["Box", "Sirius trunk"],
    ],
    seen: "Rose gold tone, white gold lettering · round diamonds in pavé, baguettes, marquise and pear-shaped diamonds",
    boxSlug: "sirius",
    making: { delivery: st("collectors", 52, at("The Sirius chain in its trunk", "In its trunk")) },
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
    gallery: [st("marcus-thuram", 1, at("The iced skeleton watch, presented by the house"))],
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
      st("tajon-buchanan", 2, at("Film of the iced watch on the wrist")),
      st("tajon-buchanan", 1, at("Film: Tajon Buchanan discovers his watch", "The handover")),
      st("tajon-buchanan", 3, at("Tajon Buchanan at the house")),
    ],
    specs: [
      ["Type", "Watch"],
    ],
    seen: "White gold tone · round diamonds in pavé on the case, the dial and the bracelet",
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
    gallery: [st("radja-nainggolan", 1, at("Film of the iced watch on the wrist"))],
    specs: [
      ["Type", "Watch"],
    ],
    seen: "White gold tone · round stones in pavé on the dial and the bracelet",
  }),
];

/* ---------- Drafts: folders of Yoni that match no piece of the site ---------- */

/** "Made for" of a draft: to be confirmed by Yoni (never shown on the site: the client is not public). */
export const TO_CONFIRM = "À valider par Yoni";

/**
 * A draft made from a folder of high-resolution photos that matches no piece of the site (scripts/hd-media.mjs):
 * unpublished, with its photos already in place; its title is the name of its folder (given from the photos, not by
 * Yoni) until Yoni names it. The story only says what the photos show; no figure.
 */
function draftOf(dir: string, title: string, type: PieceType, story: string, files: string[], making: Partial<Record<MakingStep, string>> = {}): Piece {
  const photo = (file: string) => yoni(dir, file, at(title));
  const [cover, ...gallery] = files.map(photo);
  return piece({
    slug: dir,
    title,
    type,
    line: "",
    story,
    client: TO_CONFIRM,
    clientPublic: false,
    published: false,
    cover,
    gallery,
    specs: [["Type", TYPE_SPEC[type]]],
    making: Object.fromEntries(Object.entries(making).map(([step, file]) => [step, yoni(dir, file, { ...at(title), onBlack: false })])),
  });
}

const TYPE_SPEC: Record<PieceType, string> = { chain: "Chain", pendant: "Pendant", ring: "Ring", bracelet: "Bracelet", watch: "Watch" };

const DRAFTS: Piece[] = [
  draftOf("chaine-cubaine-glacee-or-rose", "Chaîne cubaine glacée or rose", "chain", "A Cuban chain in rose gold tones, its links paved with round diamonds, with a clasp carrying the BRT mark. The back of the links is polished.", ["p01", "01-p02", "p03", "01-p04", "01-p06", "p04", "01-p07", "p06"], { raw: "01-f" }),
  draftOf("chaine-tennis-2-rangs", "Chaîne tennis 2 rangs", "chain", "A tennis chain of two rows of round diamonds, shown in white and in rose gold tones.", ["p01", "p02", "p03", "p04", "p05", "p06"]),
  draftOf("pendentif-initiales-de", "Pendentif initiales DE", "pendant", "The letters D and E joined by an ampersand, set with round, baguette and triangle-cut diamonds, on a Cuban chain set with diamonds.", ["p07", "p01", "p04", "p02", "p03", "p05", "p06", "v02"]),
  draftOf("pendentif-croix-christ-or-rose", "Pendentif croix Christ or rose", "pendant", "A cross of baguette diamonds with a Christ in rose gold, wound with thorns and roses. The back is engraved with a pattern and the BRT mark.", ["p05", "p01", "p04", "p02", "p03", "p07", "p06", "v01"], { raw: "v02" }),
  draftOf("croix-baguettes", "Croix baguettes", "pendant", "A cross in rose gold tones filled with baguette diamonds and edged with round diamonds. The back is engraved with a pattern and the BRT mark.", ["p12", "p09", "p11", "p05", "p04", "p08", "p06", "p10", "p03", "p01"]),
  draftOf("collier-or-rose-fermoir-croix", "Collier or rose fermoir croix", "chain", "A chain of round links paved with diamonds in rose gold tones, joined by crosses of baguette diamonds, with an oval clasp carrying the BRT mark.", ["p08", "p09", "p01", "p02", "p04", "p10", "p11", "p06", "p07", "p12"]),
  draftOf("chaine-diamants", "Chaîne diamants", "chain", "A chain in white tones whose links are set with round and pear-shaped diamonds.", ["p01", "p02", "p03"]),
  draftOf("bague-eternity-diamants-ovales", "Bague eternity diamants ovales", "ring", "An eternity band in white tones set all around with oval diamonds, the BRT mark inside.", ["p01", "p02", "p03", "p04", "p05"]),
  draftOf("pendentif-nom-en-lettres", "Pendentif nom en lettres", "pendant", "A name in script letters in rose gold tones, paved with diamonds, with a cross of baguettes and pear-shaped diamonds; the back is engraved with the BRT mark and the word Faith. It hangs from a chain of round links and crosses of baguettes.", ["p03", "p21", "p01", "p15", "p13", "p12", "p18", "p16", "p05", "v01"], { raw: "p22" }),
  draftOf("bracelet-or-rose-brt-a-pics", "Bracelet or rose BRT à pics", "pendant", "A Jesus piece in rose gold tones paved with diamonds, crowned with red pear-shaped stones and spikes. The back is engraved with a pattern and the BRT mark.", ["p10", "p11", "p06", "p02", "p13", "p03", "p04", "p18", "p17"]),
  draftOf("pendentif-tete-animal", "Pendentif tête animal", "pendant", "A panther paved with diamonds holding a champion's belt in yellow gold tones, the word LASANA on the belt. The back is engraved with a pattern and the BRT mark.", ["p10", "p08", "p05", "p04", "p02", "p09", "p06", "p03", "v02"], { raw: "v01", setting: "v07" }),
  draftOf("medaille-gravee-nathalie-jose", "Médaille gravée Nathalie José", "pendant", "A round medallion in rose gold tones with the letter N and the number 14 in baguette diamonds, among sculpted figures. The back is engraved with first names and the BRT mark.", ["p07", "p01", "p02", "p03", "p04", "p06", "p09", "p15", "p16", "v01"]),
  draftOf("chaine-cubaine-baguettes", "Chaîne cubaine baguettes", "chain", "A Cuban chain set with baguette and round diamonds, in white and rose gold tones, with a clasp carrying the BRT mark.", ["p03", "p01", "p06", "p07", "p08", "p09", "p11", "p02", "v01"]),
  draftOf("bracelet-tennis-baguettes-or-rose", "Bracelet tennis baguettes or rose", "chain", "A Cuban chain in white and rose gold tones, its links paved with round diamonds and set with baguettes.", ["p11", "p10", "p03", "p04", "p05", "p06", "p07", "p09", "p08", "v01"]),
  draftOf("chaine-cubaine-glacee", "Chaîne cubaine glacée", "chain", "A Cuban chain in white tones, its links paved with round diamonds, with a clasp carrying the BRT mark.", ["p02", "p01", "p03", "v01"], { raw: "p04" }),
];

/** Every piece: the pieces of the site, then the drafts (unpublished). */
export const PIECES: Piece[] = [...SITE_PIECES, ...DRAFTS];

/* ---------- Boxes ---------- */

/** The trunk shown first on the page Signature Trunks, with all its photos. */
export const FEATURED_BOX = "signature-trunk";

const T = (file: string, texts: Partial<MediaItem>) => yoni("boxes/signature-trunk", file, { ...texts, onBlack: false });

export const BOXES: Box[] = [
  {
    // The player whose portrait it carries is not named (not confirmed).
    slug: FEATURED_BOX,
    name: "Signature Trunk",
    description:
      "A black trunk behind a lattice of metal, a portrait engraved on its doors. Inside, a screen plays a film, and the BRT mark rests on the velvet: the presentation becomes part of the creation.",
    images: list(
      T("p01", at("The Signature Trunk closed, a portrait engraved on its doors", "Closed")),
      T("p02", at("The Signature Trunk from the side")),
      T("p03", at("The version with a player engraved full length", "Full length")),
      T("p04", at("The full-length version, from the front")),
      T("p05", at("The engraved figure, up close")),
      T("p06", at("The trunk open on its screen", "Inside")),
      T("p08", at("A film playing on the screen inside the trunk")),
      T("p09", at("The screen inside the trunk, from the front")),
      T("p10", at("The trunk opening")),
      T("p07", at("The BRT mark on the velvet", "The BRT mark")),
    ),
    pieceSlug: null,
  },
  {
    slug: "sirius",
    name: "Sirius",
    description: "A trunk made to measure for the Sirius chain, lined in red to hold the piece like a trophy.",
    images: group(
      "boxes/sirius",
      [at("The Sirius trunk, closed"), at("The Sirius trunk, opened on its red lining", "Opened"), at("The Sirius chain resting in its trunk", "The piece in its setting")],
      false,
    ),
    pieceSlug: "sirius",
  },
  {
    slug: "tulips-on-tour",
    name: "Tulips on Tour",
    description: "A custom case with its own artwork, made for one piece and one story.",
    images: list(
      yoni("boxes/tulips-on-tour", "p02", { ...at("The Tulips on Tour custom case"), onBlack: false }),
      yoni("boxes/tulips-on-tour", "p01", { ...at("The case from the side"), onBlack: false }),
      yoni("boxes/tulips-on-tour", "p03", { ...at("The case open on the medallion", "Opened"), onBlack: false }),
      yoni("boxes/tulips-on-tour", "p04", { ...at("The medallion resting in the case"), onBlack: false }),
    ),
    pieceSlug: "tulips-on-tour-medallion",
  },
  {
    slug: "dragon-ball-trunk",
    name: "Dragon Ball Trunk",
    description: "A bright orange trunk with the anime artwork on its front, made to hold the Dragon Ball pendant.",
    images: list(
      yoni("boxes/dragon-ball-trunk", "p04", { ...at("The orange Dragon Ball trunk with its artwork"), onBlack: false }),
      yoni("boxes/dragon-ball-trunk", "p01", { ...at("The orange trunk open on the Dragon Ball pendant", "Opened"), onBlack: false }),
      yoni("boxes/dragon-ball-trunk", "p02", { ...at("The trunk open, from another angle"), onBlack: false }),
      yoni("boxes/dragon-ball-trunk", "p05", { ...at("The artwork on the front of the trunk"), onBlack: false }),
    ),
    pieceSlug: "kevin-schade-dragon-ball-pendant",
  },
  {
    slug: "butterfly-trunk",
    name: "Butterfly Trunk",
    description: "A black trunk with rose gold corners, opened by Michy Batshuayi on his Butterfly chain.",
    images: list(still("boxes/butterfly-trunk/01", at("Michy Batshuayi opening the black trunk of his chain"))),
    pieceSlug: "michy-batshuayi-butterfly-chain",
  },
  {
    slug: "okafor-trunk",
    name: "Okafor Trunk",
    description: "A trunk with a photograph set in its lid; inside, the tennis chains lie in their own fitted places.",
    images: list(still("boxes/okafor-trunk/01", at("The trunk with a photograph in its lid")), still("boxes/okafor-trunk/02", at("The tennis chains in the trunk", "Inside"))),
    pieceSlug: "noah-okafor-octagon-pendant",
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
    ),
    pieceSlug: INTER,
  },
  {
    slug: "nz-travel-case",
    name: "NZ Travel Case",
    description: "A zipped black case with the NZ logo in gold, fitted with compartments for the pieces.",
    images: list(still("boxes/nz-travel-case/01", at("The NZ travel case, open"))),
    pieceSlug: "tanguy-nianzou-fam-medallion",
  },
];
