// The title and description of the pages that show one piece or one person.
import { defaultCatalogue } from "@/data/catalogue";
import { TYPE_LABELS } from "@/data/relations";
import type { Catalogue } from "@/data/types";
import { normalizePath, type SeoExtras } from "./head";

function clip(text: string, max = 158): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function extrasFor(path: string, cat: Catalogue = defaultCatalogue): SeoExtras | undefined {
  const p = normalizePath(path);
  const piece = /^\/pieces\/([a-z0-9-]+)$/.exec(p);
  if (piece) {
    const found = cat.pieces.find((x) => x.slug === piece[1]);
    if (!found) return undefined;
    const label = TYPE_LABELS[found.type];
    return { title: found.title, description: clip(found.title + ", " + label.toLowerCase() + " by Berete Jewellers, Dubai. " + found.line + " " + found.story) };
  }
  const person = /^\/players\/([a-z0-9-]+)$/.exec(p);
  if (person) {
    const found = cat.people.find((x) => x.slug === person[1]);
    if (!found) return undefined;
    const what = found.kind === "club" ? "club" : found.kind === "personality" ? "personality" : "player";
    return {
      title: found.name + (found.kind === "player" ? ", Player" : found.kind === "club" ? ", Club" : ""),
      description: clip("The stories and the custom pieces of " + found.name + " (" + what + ") with Berete Jewellers, custom high jewellery made in Dubai."),
    };
  }
  return undefined;
}

/** Every page of one piece or one person, for the prerender. */
export function dynamicPaths(cat: Catalogue = defaultCatalogue): string[] {
  return [...cat.pieces.map((x) => "/pieces/" + x.slug), ...cat.people.map((x) => "/players/" + x.slug)];
}
