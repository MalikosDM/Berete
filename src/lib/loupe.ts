/*
 * The loupe copies of the photos (scripts/loupe.mjs): by address of a photo of the site, its copy taken from the original
 * (up to 3200 px), for the viewer only (src/components/Lightbox.tsx). The list is loaded the first time a photo is opened,
 * never with the pages, so the pages stay as light as they were.
 */
import { useEffect, useState } from "react";

export type Loupe = { src: string; width: number; height: number };
type Loupes = Record<string, Loupe>;

let list: Loupes | null = null;
let loading: Promise<Loupes> | null = null;

function load(): Promise<Loupes> {
  loading ??= import("@/data/loupe.generated.json").then((m) => (list = m.default as Loupes));
  return loading;
}

/** The list of the loupe copies, once loaded (null until then). */
export function useLoupes(): Loupes | null {
  const [loupes, setLoupes] = useState<Loupes | null>(list);
  useEffect(() => {
    if (loupes) return;
    let on = true;
    load()
      .then((l) => on && setLoupes(l))
      .catch(() => undefined);
    return () => {
      on = false;
    };
  }, [loupes]);
  return loupes;
}

/** The loupe copy of a photo, if it has one. */
export function loupeOf(loupes: Loupes | null, src: string): Loupe | null {
  return loupes?.[src] ?? null;
}

const preloaded = new Set<string>();

/** Starts loading a loupe copy (the photo before or after the one shown). */
export function preloadLoupe(loupe: Loupe | null): void {
  if (!loupe || preloaded.has(loupe.src) || typeof Image === "undefined") return;
  preloaded.add(loupe.src);
  const img = new Image();
  img.decoding = "async";
  img.src = loupe.src;
}
