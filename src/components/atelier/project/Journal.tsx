/*
 * The journal of the atelier for this commission (data-journal), newest first: the day, the word of the atelier, the photos
 * (full screen with the magnifying glass of the site, src/components/Lightbox.tsx) and the films (their first image, played
 * only when he presses play, never by themselves).
 */
import { useState } from "react";
import Lightbox from "@/components/Lightbox";
import type { MediaItem } from "@/data/types";
import { useI18n } from "@/i18n";
import { day, type JournalEntry, type Project } from "@/lib/atelier";
import { SectionHead } from "../ui";

export function JournalSection({ p }: { p: Project }) {
  const { t } = useI18n();
  const w = t.privateAtelier.journal;
  const [open, setOpen] = useState<{ items: MediaItem[]; index: number } | null>(null);

  return (
    <section id="journal" data-project-section="journal" className="scroll-mt-28 border-t border-white/10 py-16 lg:py-20" aria-labelledby="journal-title">
      <SectionHead id="journal-title" eyebrow="05" title={w.title} />
      <div data-journal>
        {p.journal.length === 0 ? (
          <p className="piece-text mt-8 max-w-2xl">{w.empty}</p>
        ) : (
          <ol className="mt-10 grid gap-14 lg:grid-cols-2 lg:gap-x-16">
            {p.journal.map((u) => (
              <Entry key={u.id} entry={u} onOpen={(items, index) => setOpen({ items, index })} />
            ))}
          </ol>
        )}
      </div>
      {open ? <Lightbox items={open.items} index={open.index} onIndex={(index) => setOpen({ ...open, index })} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

function Entry({ entry, onOpen }: { entry: JournalEntry; onOpen: (items: MediaItem[], index: number) => void }) {
  const { t, intl } = useI18n();
  const w = t.privateAtelier.journal;
  const date = day(entry.date, intl);
  const photos = entry.files.filter((f) => f.kind === "image");
  const videos = entry.files.filter((f) => f.kind === "video");
  const items: MediaItem[] = photos.map((f) => ({ type: "image", src: f.url, width: f.width ?? undefined, height: f.height ?? undefined, alt: w.photoAlt(date) }));
  const single = photos.length === 1;

  return (
    <li className="border-t border-white/10 pt-6" data-journal-entry={entry.id}>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-rose-light">
        <time dateTime={entry.date ?? undefined}>{date}</time>
      </p>
      {entry.note ? <p className="mt-3 max-w-prose text-base leading-relaxed whitespace-pre-line text-bone" dir="auto">{entry.note}</p> : null}
      {photos.length > 0 ? (
        <ul className={"mt-5 grid gap-2 " + (single ? "" : "grid-cols-2")}>
          {photos.map((f, i) => (
            <li key={f.id}>
              <button type="button" onClick={() => onOpen(items, i)} aria-label={w.openPhoto} className="group block w-full cursor-zoom-in overflow-hidden bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-light" data-journal-photo>
                <img
                  src={f.url}
                  alt={w.photoAlt(date)}
                  width={f.width ?? undefined}
                  height={f.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className={"block w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] " + (single ? "h-auto max-h-[70svh]" : "aspect-square h-full")}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {videos.map((f) => (
        // Its first image before playing (#t: Safari on an iPhone shows nothing with preload="metadata" alone); never autoplay.
        <video
          key={f.id}
          src={f.url + "#t=0.1"}
          controls
          playsInline
          preload="metadata"
          aria-label={w.videoAlt(date)}
          className="mt-5 block max-h-[70svh] w-full bg-ink-soft"
          style={f.width && f.height ? { aspectRatio: f.width + " / " + f.height } : undefined}
          data-journal-video
        />
      ))}
    </li>
  );
}
