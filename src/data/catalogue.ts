/*
 * Default content of the site. The photos and videos come from the files
 * written by scripts/import-media.mjs; the texts and the links between
 * stories, people and pieces are written here and in ./pieces.ts. The database starts from this
 * catalogue (server/catalogue.ts), then the admin can edit it.
 */
import { BOXES, DAILY_MAIL_ARTICLE, INTER, PIECES } from "./pieces.js";
import { storyFiles } from "./sources.js";
import type { Catalogue, Person, Story } from "./types.js";

export { media } from "./sources.js";

/* ---------- People ---------- */

const person = (slug: string, name: string, extra: Partial<Person> = {}): Person => ({
  slug,
  name,
  kind: "player",
  number: null,
  club: null,
  portrait: null,
  instagram: null,
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
  ["kenan-yildiz", { pieceSlug: "kenan-yildiz-celebration-pendant" }],
  ["noah-okafor", { pieceSlug: "noah-okafor-jersey-pendant" }],
  ["kevin-schade", { pieceSlug: "kevin-schade-dragon-ball-pendant" }],
  ["thuram", { people: ["marcus-thuram"], pieceSlug: "marcus-thuram-t-serpent-pendant" }],
  ["lois-openda", { title: "Loïs Openda", pieceSlug: "lois-openda-script-pendant" }],
  ["inter-milan", { pieceSlug: INTER }],
  ["michy-batshuayi", { pieceSlug: "michy-batshuayi-butterfly-chain" }],
  ["radja-nainggolan", { pieceSlug: "radja-nainggolan-iced-watch" }],
  ["collectors", { people: [] }],
  ["press", { people: [], articleUrl: DAILY_MAIL_ARTICLE }],
  ["noah-okafor-ii", { people: ["noah-okafor"], pieceSlug: "noah-okafor-octagon-pendant" }],
  ["jamie-leweling", { pieceSlug: "jamie-leweling-jl-pendant" }],
  ["deniz-undav", { pieceSlug: "deniz-undav-l-pendant" }],
  ["angelo-stiller", { pieceSlug: "angelo-stiller-as-pendant" }],
  ["samuel-ballet", { pieceSlug: "samuel-ballet-jesus-piece" }],
  ["keita-losene", {}],
  ["malik-tillman", { pieceSlug: "malik-tillman-cross-pendant" }],
  ["thuram-ii", { people: ["marcus-thuram"], pieceSlug: "marcus-thuram-ruby-t-necklace" }],
  ["noah-okafor-s24", { people: ["noah-okafor"], pieceSlug: "noah-okafor-oka-pendant" }],
  ["thuram-ss23", { people: ["marcus-thuram"], pieceSlug: "marcus-thuram-jesus-piece" }],
  ["inter-squad", { people: ["inter-milan"], pieceSlug: INTER }],
  ["sambi-lokonga", {}],
  ["nz", { title: "NZ", people: ["tanguy-nianzou"], pieceSlug: "tanguy-nianzou-fam-medallion" }],
  ["malik-tillman-ii", { people: ["malik-tillman"], pieceSlug: "malik-tillman-tm-pendant" }],
  ["tajon-buchanan", { pieceSlug: "tajon-buchanan-iced-watch" }],
  ["eljero-elia", { pieceSlug: "eljero-elia-clover-medallion" }],
  ["sidney-eweka", { pieceSlug: "sidney-eweka-999-pendant" }],
  ["tanguy-nianzou", { pieceSlug: "tanguy-nianzou-nz-pendant" }],
  ["marcus-thuram", { pieceSlug: "marcus-thuram-t-monster-pendant" }],
  ["jeff-chabot", { pieceSlug: "jeff-chabot-jc-pendant" }],
];

function buildStories(): Story[] {
  const files = storyFiles;
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

export const defaultCatalogue: Catalogue = {
  stories: buildStories(),
  people: PEOPLE,
  pieces: PIECES,
  boxes: BOXES,
};
