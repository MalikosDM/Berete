/*
 * The next page warmed as the visitor heads for it (28/11/2026): when the pointer comes on the link of a piece (or a finger
 * touches it), the photo of its opening starts loading, the same file its page will ask for (the same srcset and sizes as
 * src/components/Showcase.tsx, for the computer or the phone). The page then opens on a photo already there.
 */
import { defaultCatalogue } from "@/data/catalogue";
import { cutoutSrcSet, resolveShowcase } from "@/data/showcase";

const warmed = new Set<string>();
const PIECE = /^\/(?:(?:fr|es|de|nl|ar)\/)?pieces\/([a-z0-9-]+)\/?$/;

function warm(slug: string): void {
  if (warmed.has(slug)) return;
  warmed.add(slug);
  const piece = defaultCatalogue.pieces.find((p) => p.slug === slug);
  const view = piece ? resolveShowcase(slug, piece.showcase).views[0] : undefined;
  if (!view) return;
  const computer = window.matchMedia("(min-width: 1024px)").matches;
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.setAttribute("imagesrcset", cutoutSrcSet(slug, view));
  link.setAttribute("imagesizes", computer ? "(max-width: 1023px) 92vw, 50vw" : "92vw");
  document.head.appendChild(link);
}

function onLink(e: Event): void {
  const a = (e.target as Element | null)?.closest?.("a[href]");
  const href = a?.getAttribute("href") ?? "";
  const m = PIECE.exec(href);
  if (m?.[1]) warm(m[1]);
}

/** Listens once for the whole site (src/components/Layout.tsx). */
export function prefetchOnIntent(): () => void {
  const opts = { passive: true, capture: true } as const;
  document.addEventListener("pointerover", onLink, opts);
  document.addEventListener("touchstart", onLink, opts);
  document.addEventListener("focusin", onLink, opts);
  return () => {
    document.removeEventListener("pointerover", onLink, opts);
    document.removeEventListener("touchstart", onLink, opts);
    document.removeEventListener("focusin", onLink, opts);
  };
}
