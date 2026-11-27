import { useEffect, useState } from "react";
import { cleanHomeTexts, type HomeLang, type HomeTexts } from "@/data/homeTexts";
import { afterLoad } from "@/lib/idle";
import { HAS_SERVER } from "@/lib/site";

/*
 * The texts beside the pieces of the home page written in the admin (src/data/homeTexts.ts): the page renders at once with
 * the lines of the pieces (also the pre-render and the version without its server), then shows the texts of the admin, asked
 * once the page has loaded (/api/home-texts), once per visit.
 */

let known: HomeTexts | null = null;
let asking: Promise<HomeTexts> | null = null;

function ask(): Promise<HomeTexts> {
  asking ??= fetch("/api/home-texts", { headers: { Accept: "application/json" } })
    .then((res) => (res.ok ? res.json() : null))
    .then((json: unknown) => cleanHomeTexts(json && typeof json === "object" ? (json as { texts?: unknown }).texts : null))
    .catch(() => ({}))
    .then((texts) => (known = texts));
  return asking;
}

export function useHomeTexts(): HomeTexts {
  const [texts, setTexts] = useState<HomeTexts>(() => known ?? {});
  useEffect(() => {
    if (!HAS_SERVER) return undefined;
    // Already asked once in this visit: its first state holds them.
    if (known) return undefined;
    let alive = true;
    const cancel = afterLoad(() => {
      void ask().then((t) => {
        if (alive) setTexts(t);
      });
    });
    return () => {
      alive = false;
      cancel();
    };
  }, []);
  return texts;
}

/** The text of a block in a language: the one written in the admin, else the line of its piece. */
export function homeText(texts: HomeTexts, block: string, lang: string, line: string | undefined): string {
  return texts[block]?.[lang as HomeLang] ?? line ?? "";
}
