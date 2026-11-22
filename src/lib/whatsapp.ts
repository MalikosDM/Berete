/*
 * The message of every WhatsApp button, written for the page it is on (feedback of Yoni, 21/11/2026): the visitor only has
 * to press Send, and Yoni knows at once where the contact comes from. From a piece: the piece by its name as shown on the
 * page; from a person: the creations made for them; from a collection, The Atelier, The House... : that page; elsewhere a
 * greeting. In the language chosen on the site (src/i18n/ui/*.ts, "whatsapp"). The link itself: waLink in src/lib/site.ts.
 */
import { useLocation } from "react-router";
import { collectionBySlug, subcategoryBySlug } from "@/data/collections";
import { RENAMED_PIECES } from "@/data/pieces";
import type { Catalogue } from "@/data/types";
import { collectionWords, useI18n, type Messages } from "@/i18n";
import { stripLocale } from "@/i18n/locales";
import { useCatalogue } from "@/lib/catalogue";

/** The message for an address of the site ("/fr/pieces/sirius" or "/pieces/sirius"), from the catalogue of its language. */
export function whatsAppMessage(t: Messages, cat: Catalogue, pathname: string): string {
  const [section = "", slug = "", sub = ""] = stripLocale(pathname).split("/").filter(Boolean);
  const w = t.whatsapp;
  switch (section) {
    case "":
      return w.pages.home;
    case "pieces": {
      const piece = cat.pieces.find((p) => p.slug === (RENAMED_PIECES[slug] ?? slug));
      return piece ? w.piece(piece.title) : w.pages.creations;
    }
    case "creations": {
      // A collection, or one of its sub-categories (/creations/pendants/jesus-pieces).
      const collection = (sub ? subcategoryBySlug(slug, sub) : undefined) ?? (slug ? collectionBySlug(slug) : undefined);
      return collection ? w.collection(collectionWords(t, collection.slug, collection).name) : w.pages.creations;
    }
    case "players": {
      const person = slug ? cat.people.find((p) => p.slug === slug) : undefined;
      return person ? w.person(person.name) : w.pages.circle;
    }
    case "atelier":
      return w.pages.atelier;
    case "boxes":
      return w.pages.trunks;
    case "process":
      return w.pages.journey;
    case "about":
      return w.pages.house;
    default:
      return w.hello;
  }
}

/** The message of the page on screen. */
export function useWhatsAppMessage(): string {
  const { t } = useI18n();
  const cat = useCatalogue();
  const { pathname } = useLocation();
  return whatsAppMessage(t, cat, pathname);
}
