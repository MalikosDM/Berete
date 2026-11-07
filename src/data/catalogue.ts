/*
 * Default content of the site. The photos and videos come from the files
 * written by scripts/import-media.mjs; the texts and the links between
 * stories, people and pieces are written here. The database starts from this
 * catalogue (server/catalogue.ts), then the admin can edit it.
 */
import generatedStories from "./stories.generated.json" with { type: "json" };
import generatedMedia from "./media.generated.json" with { type: "json" };
import type { Box, Catalogue, GeneratedMedia, GeneratedStory, MediaItem, Person, Piece, Story } from "./types.js";

export const media = generatedMedia as unknown as GeneratedMedia;

/** Photos of one folder of the import ("pieces/the-hand", "atelier"...), with their texts. */
function group(key: string, texts: (Partial<MediaItem> | undefined)[] = [], onBlack = true): MediaItem[] {
  return (media.groups[key] ?? []).map((m, i) => ({ onBlack, ...m, ...(texts[i] ?? {}) }));
}

const VFB = "vfb-stuttgart-dfb-pokal-2025";
const INTER = "campione-d-italia-2023-2024";
const DAILY_MAIL_ARTICLE =
  "https://www.dailymail.co.uk/sport/football/article-13472573/Marko-Arnautovic-Marcus-Thuram-Hakan-Calhanoglu-commission-diamond-rings-Inter-Milan-teammates-clubs-20th-Scudetto-title.html";

/* ---------- People ---------- */

const person = (slug: string, name: string, extra: Partial<Person> = {}): Person => ({
  slug,
  name,
  kind: "player",
  number: null,
  club: null,
  portrait: null,
  bio: "",
  ...extra,
});

const vfb = { club: "VfB Stuttgart" };

const PEOPLE: Person[] = [
  person("kenan-yildiz", "Kenan Yildiz"),
  person("noah-okafor", "Noah Okafor"),
  person("kevin-schade", "Kevin Schade"),
  person("marcus-thuram", "Marcus Thuram", { club: "Inter Milan" }),
  person("lois-openda", "Loïs Openda"),
  person("michy-batshuayi", "Michy Batshuayi"),
  person("radja-nainggolan", "Radja Nainggolan"),
  person("jamie-leweling", "Jamie Leweling", vfb),
  person("deniz-undav", "Deniz Undav", { ...vfb, number: 26 }),
  person("angelo-stiller", "Angelo Stiller", { ...vfb, number: 6 }),
  person("samuel-ballet", "Samuel Ballet"),
  person("keita-losene", "Keita Losene"),
  person("malik-tillman", "Malik Tillman"),
  person("sambi-lokonga", "Sambi Lokonga"),
  person("tanguy-nianzou", "Tanguy Nianzou"),
  person("tajon-buchanan", "Tajon Buchanan"),
  person("eljero-elia", "Eljero Elia"),
  person("jeff-chabot", "Jeff Chabot"),
  person("maximilian-mittelstaedt", "Maximilian Mittelstädt", { ...vfb, number: 7 }),
  person("chris-fuehrich", "Chris Führich", vfb),
  person("atakan-karazor", "Atakan Karazor", vfb),
  person("inter-milan", "Inter Milan", { kind: "club" }),
  person("vfb-stuttgart", "VfB Stuttgart", { kind: "club" }),
  person("sidney-eweka", "Sidney Eweka", { kind: "personality" }),
];

/* ---------- Stories: the Instagram highlights, in their order ---------- */

type StoryMeta = { title?: string; people?: string[]; pieceSlug?: string; articleUrl?: string };

/** The 30 highlights, in this order. Stories added later in the folders come after them. */
const STORY_META: [slug: string, meta: StoryMeta][] = [
  ["kenan-yildiz", {}],
  ["noah-okafor", {}],
  ["kevin-schade", {}],
  ["thuram", { people: ["marcus-thuram"] }],
  ["lois-openda", { title: "Loïs Openda" }],
  ["inter-milan", { pieceSlug: INTER }],
  ["michy-batshuayi", {}],
  ["radja-nainggolan", {}],
  ["collectors", { people: [] }],
  ["press", { people: [], articleUrl: DAILY_MAIL_ARTICLE }],
  ["noah-okafor-ii", { people: ["noah-okafor"] }],
  ["jamie-leweling", {}],
  ["deniz-undav", { pieceSlug: VFB }],
  ["angelo-stiller", {}],
  ["samuel-ballet", {}],
  ["keita-losene", {}],
  ["malik-tillman", {}],
  ["thuram-ii", { people: ["marcus-thuram"] }],
  ["noah-okafor-s24", { people: ["noah-okafor"] }],
  ["thuram-ss23", { people: ["marcus-thuram"] }],
  ["inter-squad", { people: ["inter-milan"] }],
  ["sambi-lokonga", {}],
  ["nz", { title: "NZ", people: ["tanguy-nianzou"] }],
  ["malik-tillman-ii", { people: ["malik-tillman"] }],
  ["tajon-buchanan", {}],
  ["eljero-elia", {}],
  ["sidney-eweka", {}],
  ["tanguy-nianzou", {}],
  ["marcus-thuram", { pieceSlug: INTER }],
  ["jeff-chabot", {}],
];

function buildStories(): Story[] {
  const files = (generatedStories as unknown as { stories: GeneratedStory[] }).stories;
  const known = new Set(PEOPLE.map((p) => p.slug));
  const order = new Map(STORY_META.map(([slug], i) => [slug, i]));
  const meta = new Map(STORY_META);
  return [...files]
    .sort((a, b) => (order.get(a.slug) ?? 1000 + a.number) - (order.get(b.slug) ?? 1000 + b.number))
    .map((g): Story => {
      const m = meta.get(g.slug) ?? {};
      const title = m.title ?? g.folderTitle;
      return {
        slug: g.slug,
        title,
        cover: g.cover,
        media: g.media.map(({ n, ...item }) => ({ ...item, alt: title + ", story " + n })),
        people: m.people ?? (known.has(g.slug) ? [g.slug] : []),
        pieceSlug: m.pieceSlug ?? null,
        articleUrl: m.articleUrl ?? null,
      };
    });
}

/* ---------- Pieces ---------- */

const TO_CONFIRM = "Shared on request";

const piece = (p: Omit<Piece, "cover" | "gallery" | "handover" | "press" | "boxSlug" | "featured" | "client" | "clientPublic"> & Partial<Piece> & { photos: MediaItem[] }): Piece => {
  const [cover, ...gallery] = p.photos;
  const { photos: _photos, ...rest } = p;
  return {
    client: null,
    clientPublic: false,
    handover: [],
    press: [],
    boxSlug: null,
    featured: false,
    cover: cover ?? { type: "image", src: "" },
    gallery,
    ...rest,
  };
};

const vfbPhotos = group("pieces/" + VFB, [
  { alt: "VfB Stuttgart championship ring, front view, set with diamonds and rubies" },
  { alt: "The ring opened: its removable top reveals the DFB-Pokal", caption: "The top lifts off" },
  { alt: "The sculpted DFB-Pokal under the top of the ring", caption: "The cup, under the top" },
  { alt: "DFB-Pokal engraving on the side of the ring", caption: "The DFB-Pokal engraving" },
  { alt: "Profile of the ring with the cup on its side", caption: "The profile" },
  { alt: "Angelo Stiller's ring with his number 6", caption: "Angelo Stiller · 6" },
  { alt: "Deniz Undav's ring with his number 26", caption: "Deniz Undav · 26" },
  { alt: "Maximilian Mittelstädt's ring with his number 7", caption: "Maximilian Mittelstädt · 7" },
  { alt: "VfB Stuttgart players with their rings at the handover", caption: "Handover to the club", onBlack: false },
  { alt: "The DFB-Pokal in the club showcase", caption: "The DFB-Pokal", onBlack: false },
  { alt: "Bild article about the VfB Stuttgart rings", onBlack: false },
]);

const interPhotos = group("pieces/" + INTER, [
  { alt: "Campione d'Italia championship ring with a diamond-set 20" },
  { alt: "Tray of Campione d'Italia rings made for the whole squad", caption: "A ring for the whole squad", onBlack: false },
  { alt: "A Campione d'Italia ring held in a white glove", caption: "Checked before the handover", onBlack: false },
]);

const PIECES: Piece[] = [
  piece({
    slug: VFB,
    title: "VfB Stuttgart — DFB-Pokal 2025",
    type: "ring",
    line: "The top lifts off and reveals the trophy.",
    story:
      "A championship ring for the 2025 DFB-Pokal winners. The removable top opens onto a sculpted cup, and every ring carries the name and number of the player who wears it. The series was handed over to the club and its champions.",
    client: "VfB Stuttgart",
    clientPublic: true,
    photos: vfbPhotos.slice(0, 8),
    handover: vfbPhotos.slice(8, 10),
    press: [{ outlet: "Bild", title: "The VfB champions receive their rings", url: null, image: vfbPhotos[10]?.src ?? null }],
    specs: [
      { label: "Type", value: "Championship ring" },
      { label: "Top", value: "Removable, reveals the trophy" },
      { label: "Personalisation", value: "Name and number of each player" },
      { label: "Series", value: "Made for the squad" },
      { label: "Metal and stones", value: TO_CONFIRM },
    ],
    people: ["deniz-undav", "angelo-stiller", "jamie-leweling", "maximilian-mittelstaedt", "chris-fuehrich", "atakan-karazor", "vfb-stuttgart"],
    featured: true,
  }),
  piece({
    slug: INTER,
    title: "Campione d'Italia 2023/2024",
    type: "ring",
    line: "A diamond-set 20 for the twentieth title.",
    story:
      "Twenty titles, one number. A series of rings made for the whole squad after Inter's twentieth league title, with a diamond-set 20 at its heart.",
    client: "Inter Milan",
    clientPublic: true,
    photos: interPhotos,
    press: [
      { outlet: "Daily Mail", title: "Arnautovic, Thuram and Calhanoglu commission diamond rings for their Inter teammates", url: DAILY_MAIL_ARTICLE, image: null },
      { outlet: "Het Nieuwsblad", title: "Inter celebrates its twentieth title with championship rings", url: null, image: null },
      { outlet: "GVA", title: "Inter celebrates its twentieth title with championship rings", url: null, image: null },
      { outlet: "FCInterNews", title: "A ring to celebrate: a special gift for the Inter players", url: null, image: null },
      { outlet: "SPORTbible", title: "Football fans debate replacing winner medals with rings", url: null, image: null },
    ],
    specs: [
      { label: "Type", value: "Championship ring" },
      { label: "Motif", value: "The number 20, set with diamonds" },
      { label: "Series", value: "Made for the whole squad" },
      { label: "Metal and stones", value: TO_CONFIRM },
    ],
    people: ["inter-milan", "marcus-thuram"],
  }),
  piece({
    slug: "the-hand",
    title: "The Hand",
    type: "pendant",
    line: "A rose gold hand, paved with diamonds and lit with rubies.",
    story:
      "Sculpted in volume, then set stone by stone. Rubies are placed to catch the light at every movement, and the BRT mark is engraved on the piece.",
    photos: group("pieces/the-hand", [
      { alt: "The Hand pendant, a diamond-paved rose gold hand holding a ruby" },
      { alt: "Close-up of the diamond pavé of The Hand", caption: "Set stone by stone" },
      { alt: "The BRT mark engraved on The Hand", caption: "The BRT mark" },
      { alt: "The Hand pendant with its ruby drop", caption: "The ruby drop" },
      { alt: "The Hand pendant lying on its side", caption: "In profile" },
      { alt: "The Hand pendant seen from above", caption: "From above" },
    ]),
    specs: [
      { label: "Type", value: "Pendant" },
      { label: "Metal", value: "Rose gold" },
      { label: "Stones", value: "Diamonds and rubies" },
      { label: "Signature", value: "BRT mark engraved" },
    ],
    people: [],
  }),
  piece({
    slug: "white-hands",
    title: "White Hands",
    type: "pendant",
    line: "Hands sculpted and paved in white diamonds.",
    story: "A sculptural pendant, paved in white diamonds from every angle.",
    photos: group("pieces/white-hands", [{ alt: "White Hands pendant paved with white diamonds" }]),
    specs: [
      { label: "Type", value: "Pendant" },
      { label: "Stones", value: "White diamonds" },
      { label: "Metal", value: TO_CONFIRM },
    ],
    people: [],
  }),
  piece({
    slug: "t-serpent",
    title: "T-Serpent",
    type: "pendant",
    line: "A letter, wrapped by a serpent.",
    story: "A diamond-set T with a rose gold serpent coiled around it, its eye lit with a red stone.",
    photos: group("pieces/t-serpent", [
      { alt: "T-Serpent pendant: a diamond T with a rose gold serpent" },
      { alt: "Close-up of the T-Serpent setting", caption: "The setting, up close" },
    ]),
    specs: [
      { label: "Type", value: "Pendant" },
      { label: "Metal", value: "White and rose gold" },
      { label: "Stones", value: TO_CONFIRM },
    ],
    people: [],
  }),
  piece({
    slug: "the-jersey",
    title: "The Jersey",
    type: "pendant",
    line: "A football jersey, set stone by stone.",
    story: "The shirt of a career, sculpted in volume and fully set, worn on a diamond chain.",
    photos: group("pieces/the-jersey", [{ alt: "The Jersey pendant, a diamond-set football jersey" }]),
    specs: [
      { label: "Type", value: "Pendant" },
      { label: "Stones", value: TO_CONFIRM },
    ],
    people: [],
  }),
  piece({
    slug: "rs",
    title: "RS",
    type: "pendant",
    line: "Two initials, with the BRT mark on the back.",
    story: "The initials R and S, set with baguette and round diamonds. The back carries the BRT mark, engraved in rose gold.",
    photos: group("pieces/rs", [
      { alt: "RS pendant on a diamond tennis chain" },
      { alt: "RS pendant, front view", caption: "The front" },
      { alt: "RS pendant, close-up of the baguette diamonds", caption: "Baguette diamonds" },
      { alt: "RS pendant, side view", caption: "In profile" },
      { alt: "Back of the RS pendant with the BRT mark in rose gold", caption: "The BRT mark, on the back" },
    ]),
    specs: [
      { label: "Type", value: "Pendant" },
      { label: "Stones", value: "Baguette and round diamonds" },
      { label: "Signature", value: "BRT mark engraved in rose gold" },
    ],
    people: [],
  }),
  piece({
    slug: "butterfly",
    title: "Butterfly",
    type: "chain",
    line: "A chain of diamond butterflies.",
    story: "Each butterfly is drawn, sculpted and set on its own, then linked into one fluid chain that moves with the person who wears it.",
    photos: group("pieces/butterfly", [
      { alt: "Butterfly chain shown on a black bust" },
      { alt: "Close-up of a butterfly wing with purple stones", caption: "The wing" },
      { alt: "The pear diamond at the heart of the butterfly", caption: "The centre stone" },
      { alt: "The links of the Butterfly chain", caption: "The links" },
    ]),
    specs: [
      { label: "Type", value: "Chain" },
      { label: "Metal", value: "Rose gold" },
      { label: "Stones", value: "Diamonds and coloured stones" },
    ],
    people: [],
  }),
  piece({
    slug: "sirius",
    title: "Sirius",
    type: "chain",
    line: "A chain and its nameplate, delivered in their own trunk.",
    story: "A statement chain with a diamond-set nameplate, delivered in the Sirius trunk made for it.",
    photos: group("pieces/sirius", [{ alt: "Sirius chain with its diamond nameplate pendant" }]),
    specs: [
      { label: "Type", value: "Chain and pendant" },
      { label: "Box", value: "Sirius trunk" },
    ],
    people: [],
    boxSlug: "sirius",
  }),
];

/* ---------- Boxes ---------- */

const BOXES: Box[] = [
  {
    slug: "sirius",
    name: "Sirius",
    description: "A trunk made to measure for the Sirius chain, lined to hold the piece like a trophy.",
    images: group(
      "boxes/sirius",
      [
        { alt: "The Sirius trunk, closed" },
        { alt: "The Sirius trunk, opened on its red lining", caption: "Opened" },
        { alt: "The Sirius chain resting in its trunk", caption: "The piece in its setting" },
      ],
      false,
    ),
    pieceSlug: "sirius",
  },
  {
    slug: "tulips-on-tour",
    name: "Tulips on Tour",
    description: "A custom case with its own artwork, made for one piece and one story.",
    images: group("boxes/tulips-on-tour", [{ alt: "The Tulips on Tour custom case" }], false),
    pieceSlug: null,
  },
];

export const defaultCatalogue: Catalogue = {
  stories: buildStories(),
  people: PEOPLE,
  pieces: PIECES,
  boxes: BOXES,
};
