/*
 * The catalogue (pieces, people, stories, boxes) in one language. Its texts
 * are written in English (src/data, then /admin); each language translates
 * them in content/<lang>.ts, keyed by the English text. A text edited in the
 * admin uses its own translation when the admin gives one, else the
 * dictionary, else stays in English until it is translated.
 */
import type { Box, Catalogue, MediaItem, Person, Piece, Story, Translations } from "@/data/types";
import type { Locale } from "./locales";

/** "text": a sentence, translated in every language. "name": a proper name, written in another script only where needed (Arabic). */
export type TextKind = "text" | "name";

export type Visitor = {
  /** A text of the catalogue; `own` is the translation given in the admin, if any. */
  text: (source: string, kind: TextKind, own?: string) => string;
  /** The text of a story photo without its own: "Kevin Schade, story 3". */
  storyAlt: (title: string, index: number) => string;
};

const STORY_ALT = /^(.*), story (\d+)$/;
/** The caption of a player's own ring: "Deniz Undav · 26". */
const NAMED_NUMBER = /^(.+) · (\d+)$/;

function ownOf(translations: Translations | undefined, field: string, locale?: Locale): string | undefined {
  if (!locale || locale === "en" || !translations) return undefined;
  const value = translations[locale]?.[field];
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function mediaTexts(m: MediaItem, v: Visitor, names: Set<string>): MediaItem {
  if (!m.alt && !m.caption) return m;
  const out: MediaItem = { ...m };
  if (m.alt) out.alt = v.text(m.alt, "text");
  if (m.caption) {
    const named = NAMED_NUMBER.exec(m.caption);
    out.caption = named && names.has(named[1]!) ? v.text(named[1]!, "name") + " · " + named[2] : v.text(m.caption, "text");
  }
  return out;
}

/** The same catalogue, each of its texts passed through `v`. `locale` picks the translations given in the admin. */
export function mapTexts(cat: Catalogue, v: Visitor, locale?: Locale): Catalogue {
  const names = new Set(cat.people.map((p) => p.name));
  const m = (item: MediaItem) => mediaTexts(item, v, names);

  const stories = cat.stories.map((s): Story => {
    const title = v.text(s.title, "text", ownOf(s.translations, "title", locale));
    return {
      ...s,
      title,
      media: s.media.map((item) => {
        const alt = item.alt ? STORY_ALT.exec(item.alt) : null;
        if (alt && alt[1] === s.title) return { ...item, alt: v.storyAlt(title, Number(alt[2])), ...(item.caption ? { caption: v.text(item.caption, "text") } : {}) };
        return m(item);
      }),
    };
  });

  const people = cat.people.map(
    (p): Person => ({
      ...p,
      name: v.text(p.name, "name", ownOf(p.translations, "name", locale)),
      club: p.club ? v.text(p.club, "name") : p.club,
      bio: p.bio ? v.text(p.bio, "text", ownOf(p.translations, "bio", locale)) : p.bio,
    }),
  );

  const pieces = cat.pieces.map((p): Piece => {
    const making: Piece["making"] = {};
    for (const [step, item] of Object.entries(p.making) as [keyof Piece["making"], MediaItem | undefined][]) if (item) making[step] = m(item);
    return {
      ...p,
      title: v.text(p.title, "text", ownOf(p.translations, "title", locale)),
      line: p.line ? v.text(p.line, "text", ownOf(p.translations, "line", locale)) : p.line,
      story: p.story ? v.text(p.story, "text", ownOf(p.translations, "story", locale)) : p.story,
      client: p.client ? v.text(p.client, "name") : p.client,
      cover: m(p.cover),
      gallery: p.gallery.map(m),
      handover: p.handover.map(m),
      making,
      specs: p.specs.map((s) => ({ label: v.text(s.label, "text"), value: v.text(s.value, "text") })),
      press: p.press.map((x) => ({ ...x, title: v.text(x.title, "text") })),
    };
  });

  const boxes = cat.boxes.map(
    (b): Box => ({
      ...b,
      name: v.text(b.name, "text", ownOf(b.translations, "name", locale)),
      description: b.description ? v.text(b.description, "text", ownOf(b.translations, "description", locale)) : b.description,
      images: b.images.map(m),
    }),
  );

  return { stories, people, pieces, boxes };
}

/** The catalogue in this language, with this dictionary (English text -> translation). */
export function localizeCatalogue(cat: Catalogue, locale: Locale, dictionary: Record<string, string>, storyAlt: Visitor["storyAlt"]): Catalogue {
  if (locale === "en") return cat;
  return mapTexts(
    cat,
    {
      text: (source, _kind, own) => own ?? dictionary[source] ?? source,
      storyAlt,
    },
    locale,
  );
}

/** Every text of the catalogue to translate, by kind (scripts/i18n-check.ts). */
export function catalogueTexts(cat: Catalogue): { text: string[]; name: string[] } {
  const text = new Set<string>();
  const name = new Set<string>();
  mapTexts(cat, {
    text: (source, kind) => {
      if (source.trim() !== "") (kind === "name" ? name : text).add(source);
      return source;
    },
    storyAlt: (title, index) => title + ", story " + index,
  });
  for (const t of text) name.delete(t);
  return { text: [...text], name: [...name] };
}
