import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Img } from "@/components/Media";
import { useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { primeStoryVideo } from "./player";
import StoryViewer from "./StoryViewer";

/* The stories already watched, remembered in the browser. */
const SEEN_KEY = "bj-stories-seen";
const NONE: string[] = [];
const listeners = new Set<() => void>();
let seenCache: string[] | null = null;

function readSeen(): string[] {
  if (seenCache === null) {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
      seenCache = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    } catch {
      seenCache = [];
    }
  }
  return seenCache;
}

function subscribeSeen(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function markSeen(slug: string): void {
  const current = readSeen();
  if (current.includes(slug)) return;
  seenCache = [...current, slug];
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(seenCache));
  } catch {
    /* storage unavailable: kept for this visit */
  }
  listeners.forEach((l) => l());
}

/**
 * The highlights bar under the navigation: it stays on screen, shrinks on
 * scroll, and scrolls sideways. Each bubble opens the full screen viewer.
 */
export default function StoriesBar() {
  const { t, dir } = useI18n();
  const { stories } = useCatalogue();
  const [compact, setCompact] = useState(false);
  const seen = useSyncExternalStore(subscribeSeen, readSeen, () => NONE);
  const [open, setOpen] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 60);
    const id = window.requestAnimationFrame(onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // A vertical mouse wheel over the bar scrolls it sideways, toward the end of the row.
  // Right to left, the row starts at 0 and goes to negative positions.
  const sign = dir === "rtl" ? -1 : 1;
  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      const done = Math.abs(el.scrollLeft);
      if (max <= 0 || (e.deltaY < 0 && done <= 0) || (e.deltaY > 0 && done >= max - 1)) return;
      e.preventDefault();
      e.stopPropagation();
      el.scrollLeft += sign * e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [sign]);

  if (stories.length === 0) return null;

  const bubble = compact ? "size-11 lg:size-12" : "size-16 lg:size-[4.75rem]";
  const arrow = "absolute top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-ink/70 text-white transition-colors hover:border-rose-light hover:text-rose-light md:inline-flex";

  return (
    <>
      <nav
        aria-label={t.stories.bar}
        data-stories-bar
        className={"fixed inset-x-0 top-18 z-40 transition-[background-color,padding] duration-500 lg:top-22 " + (compact ? "bg-ink/80 py-2 backdrop-blur-md" : "bg-linear-to-b from-ink/70 to-transparent py-3")}
      >
        <div className="relative mx-auto max-w-[1600px] md:px-16">
          <button type="button" aria-label={t.stories.previous} onClick={() => scroller.current?.scrollBy({ left: -sign * 360, behavior: "smooth" })} className={arrow + " start-2"}>
            <ChevronLeft className="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
          <div ref={scroller} className="no-scrollbar flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 md:px-1">
            <ul className="flex gap-2">
              {stories.map((s, i) => (
                <li key={s.slug} className="shrink-0 snap-start">
                  <button
                    type="button"
                    data-story-bubble={s.slug}
                    onClick={() => {
                      primeStoryVideo(s);
                      setOpen(i);
                    }}
                    className={"group flex flex-col items-center gap-1.5 transition-[width] duration-500 " + (compact ? "w-12 lg:w-14" : "w-24 lg:w-28")}
                    aria-label={t.stories.open(s.title)}
                  >
                    <span className={"block rounded-full p-[2px] transition-opacity duration-500 bg-rose-gold " + (seen.includes(s.slug) ? "opacity-60" : "opacity-100")}>
                      <span className={"block overflow-hidden rounded-full border-2 border-ink bg-ink-soft transition-all duration-500 " + bubble}>
                        <Img src={s.cover} alt="" width={160} height={160} loading={i < 8 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" />
                      </span>
                    </span>
                    <span
                      data-story-name
                      className={
                        "block w-full text-center text-base leading-[1.2] font-medium text-white [overflow-wrap:normal] [text-wrap:balance] transition-[opacity,max-height] duration-500 " +
                        (compact ? "max-h-0 opacity-0" : "max-h-[2.6em] opacity-100")
                      }
                    >
                      {s.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <span aria-hidden="true" className="w-2 shrink-0" />
          </div>
          <button type="button" aria-label={t.stories.next} onClick={() => scroller.current?.scrollBy({ left: sign * 360, behavior: "smooth" })} className={arrow + " end-2"}>
            <ChevronRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </div>
      </nav>
      {open !== null ? <StoryViewer stories={stories} start={open} onClose={() => setOpen(null)} onSeen={markSeen} /> : null}
    </>
  );
}
