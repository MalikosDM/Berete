// The title and description of the pages that show one piece or one person, in the language of the address.
import { defaultCatalogue } from "@/data/catalogue";
import share from "@/data/share.generated.json";
import { madeFor } from "@/data/relations";
import type { Catalogue } from "@/data/types";
import { bundleOf, LOCALE_INFO, localeOfPath, stripLocale } from "@/i18n";
import { localizeCatalogue } from "@/i18n/content";
import { listOf } from "@/i18n/format";
import { normalizePath, type SeoExtras } from "./head";

function clip(text: string, max = 158): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

/** `cat`: the catalogue already in the language of the page; by default the built-in one, translated here. */
export function extrasFor(path: string, cat?: Catalogue): SeoExtras | undefined {
  const p = normalizePath(path);
  const locale = localeOfPath(p);
  const bundle = bundleOf(locale);
  const t = bundle.ui;
  const c = cat ?? localizeCatalogue(defaultCatalogue, locale, bundle.content, t.stories.alt, t.piece.sketchAlt);
  const neutral = stripLocale(p);
  const piece = /^\/pieces\/([a-z0-9-]+)$/.exec(neutral);
  if (piece) {
    const found = c.pieces.find((x) => x.slug === piece[1]);
    if (!found) return undefined;
    const who = madeFor(c, found, t.common.privateCollector, (names) => listOf(LOCALE_INFO[locale].intl, names));
    // Its main photo on black (scripts/share-images.ts); a piece added since then shares the image of the site.
    const image = (share.pieces as Record<string, { src: string; width: number; height: number } | undefined>)[found.slug];
    return {
      title: found.title,
      description: clip(t.seo.pieceDescription(found.title, t.types[found.type], who) + " " + found.line + " " + found.story),
      ...(image ? { image: image.src, imageWidth: image.width, imageHeight: image.height } : {}),
    };
  }
  const person = /^\/players\/([a-z0-9-]+)$/.exec(neutral);
  if (person) {
    const found = c.people.find((x) => x.slug === person[1]);
    if (!found) return undefined;
    return { title: t.seo.personTitle(found.name, found.kind), description: clip(t.seo.personDescription(found.name, found.kind)) };
  }
  return undefined;
}

/** Every page of one piece or one person (without language), for the prerender. */
export function dynamicPaths(cat: Catalogue = defaultCatalogue): string[] {
  return [...cat.pieces.map((x) => "/pieces/" + x.slug), ...cat.people.map((x) => "/players/" + x.slug)];
}
