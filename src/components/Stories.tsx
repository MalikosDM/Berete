import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Link } from "react-router";
import { ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Play, Volume2, VolumeX, X } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import SafeImage from "@/components/SafeImage";
import { asRecord, pickList, str, useApi, type Rec } from "@/pages/Creations";
import { pieceMessage, waLink } from "@/lib/site";
import { getLenis } from "@/lib/gsap";
import { forceMuted } from "@/components/AutoVideo";

type Media = { src: string; type: "image" | "video"; alt: string };
export type Story = { slug: string; title: string; club: string; pieceName: string; coverImage: string; coverType: "image" | "video"; media: Media[]; jewelSlug: string; articleUrl: string };
type Slide = Media | null;

const SEEN_KEY = "bj-stories-seen";
const IMAGE_MS = 5000;

/* The visitor's sound choice, kept for every story during the visit. */
let soundChoice = true;

/* ONE video element reused for every segment of every story: once a tap has allowed it to play with sound, it stays allowed (iOS Safari included). */
let sharedVideo: HTMLVideoElement | null = null;

function getStoryVideo(): HTMLVideoElement | null {
  if (typeof document === "undefined") return null;
  if (sharedVideo === null) {
    const v = document.createElement("video");
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.setAttribute("disablepictureinpicture", "");
    v.preload = "auto";
    v.className = "pointer-events-none h-full w-full object-cover";
    sharedVideo = v;
  }
  return sharedVideo;
}

function setSound(v: HTMLVideoElement, on: boolean): void {
  if (on) {
    v.muted = false;
    v.defaultMuted = false;
    v.removeAttribute("muted");
  } else forceMuted(v);
}

function isAbort(e: unknown): boolean {
  return e instanceof DOMException && e.name === "AbortError";
}

/* Called inside the tap on a bubble: starts the shared video in the gesture, so the browser allows the sound. */
function primeStoryVideo(story: Story): void {
  const v = getStoryVideo();
  if (!v) return;
  const first = slidesOf(story)[0];
  setSound(v, soundChoice);
  if (first && first.type === "video") {
    if (v.getAttribute("src") !== first.src) v.src = first.src;
    v.play().catch(() => undefined);
  } else {
    v.load();
  }
}

function toMedia(v: unknown): Media[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x): Media => {
      const o = asRecord(x);
      const src = str(o.src, str(o.url));
      const type: Media["type"] = str(o.type) === "video" || /\.(mp4|webm|mov)(#.*)?$/i.test(src) ? "video" : "image";
      return { src, type, alt: str(o.alt) };
    })
    .filter((m) => m.src !== "");
}

export function toStory(r: Rec): Story {
  const media = toMedia(r.media);
  const first = media[0];
  return {
    slug: str(r.slug),
    title: str(r.title),
    club: str(r.club),
    pieceName: str(r.pieceName),
    coverImage: first ? first.src : str(r.coverImage),
    coverType: first ? first.type : "image",
    media,
    jewelSlug: str(r.jewelSlug),
    articleUrl: str(r.articleUrl),
  };
}

function slidesOf(s: Story): Slide[] {
  if (s.media.length > 0) return s.media;
  if (s.coverImage) return [{ src: s.coverImage, type: "image", alt: s.title }];
  return [null];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function readSeen(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export default function Stories() {
  const { data, loading, error } = useApi("/api/stories", pickList("stories"));
  const stories = useMemo(() => (data ?? []).map((x) => toStory(asRecord(x))).filter((s) => s.title !== ""), [data]);
  const [compact, setCompact] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSeen(readSeen());
    const onScroll = () => setCompact(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;
      e.preventDefault();
      e.stopPropagation();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [stories.length]);

  const markSeen = useCallback((slug: string) => {
    setSeen((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  if (error || (!loading && stories.length === 0)) return null;

  const circle = compact ? "size-11" : "size-16 sm:size-[4.5rem]";

  return (
    <>
      <div
        className={
          "fixed inset-x-0 top-18 z-40 transition-[background-color,padding] duration-500 lg:top-22 " +
          (compact ? "bg-ink/70 py-2 backdrop-blur-md" : "bg-transparent py-3")
        }
      >
        <div className="relative mx-auto max-w-[1600px] md:px-14">
          <button
            type="button"
            aria-label="Previous stories"
            onClick={() => scroller.current?.scrollBy({ left: -320, behavior: "smooth" })}
            className="absolute top-1/2 left-2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white hover:text-rose-light md:inline-flex"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <div
            ref={scroller}
            role="list"
            aria-label="Featured stories"
            className="no-scrollbar flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 sm:gap-5 md:[mask-image:linear-gradient(to_right,transparent,black_28px,black_calc(100%-28px),transparent)]"
          >
            {loading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <span key={i} role="listitem" className={"shrink-0 animate-pulse rounded-full bg-white/10 " + circle} />
                ))
              : stories.map((s, i) => {
                  const wasSeen = seen.includes(s.slug);
                  return (
                    <div key={s.slug} role="listitem" className="shrink-0 snap-start">
                      <button type="button" onClick={() => { primeStoryVideo(s); setOpen(i); }} className="group flex flex-col items-center gap-1.5" aria-label={"Open the story of " + s.title}>
                        <span className={"block rounded-full p-[2px] transition-all duration-500 " + (wasSeen ? "bg-white/30" : "bg-rose-gold")}>
                          <span className={"flex items-center justify-center overflow-hidden rounded-full border-2 border-ink bg-ink-soft transition-all duration-500 " + circle}>
                            {s.coverImage ? (
                              s.coverType === "video" ? (
                                <video src={s.coverImage + "#t=0.1"} muted playsInline preload="metadata" aria-hidden="true" tabIndex={-1} className="h-full w-full object-cover" />
                              ) : (
                                <SafeImage src={s.coverImage} alt="" width={144} height={144} className="h-full w-full object-cover" />
                              )
                            ) : (
                              <span className="text-rose-gold font-display text-lg">{initials(s.title)}</span>
                            )}
                          </span>
                        </span>
                        <span
                          className={
                            "block w-[6.5rem] overflow-hidden text-center text-[12px] font-medium uppercase leading-[1.25] tracking-[0.04em] text-white [text-wrap:balance] transition-all duration-500 " +
                            (compact ? "max-h-0 opacity-0" : "max-h-[2.6rem] opacity-100")
                          }
                        >
                          {s.title}
                        </span>
                      </button>
                    </div>
                  );
                })}
            <span aria-hidden="true" className="w-px shrink-0" />
          </div>
          <button
            type="button"
            aria-label="Next stories"
            onClick={() => scroller.current?.scrollBy({ left: 320, behavior: "smooth" })}
            className="absolute top-1/2 right-2 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-ink/60 text-white hover:text-rose-light md:inline-flex"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>
      {open !== null ? <Viewer stories={stories} start={open} onClose={() => setOpen(null)} onSeen={markSeen} /> : null}
    </>
  );
}

type ViewerProps = { stories: Story[]; start: number; onClose: () => void; onSeen: (slug: string) => void };

export function Viewer({ stories, start, onClose, onSeen }: ViewerProps) {
  const [s, setS] = useState(start);
  const [m, setM] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [soundOn, setSoundOn] = useState(soundChoice);
  const [blocked, setBlocked] = useState(false);
  const story = stories[s];
  const slides = slidesOf(story);
  const slide = slides[m] ?? null;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  if (videoRef.current === null) videoRef.current = getStoryVideo();
  const hostRef = useRef<HTMLDivElement>(null);
  const refused = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const elapsed = useRef(0);
  const press = useRef<{ x: number; y: number; held: boolean; timer: number } | null>(null);

  const nextStory = useCallback(() => {
    if (s < stories.length - 1) {
      setS(s + 1);
      setM(0);
    } else onClose();
  }, [s, stories.length, onClose]);

  const prevStory = useCallback(() => {
    if (s > 0) {
      setS(s - 1);
      setM(0);
    } else elapsed.current = 0;
  }, [s]);

  const next = useCallback(() => {
    if (m < slides.length - 1) setM(m + 1);
    else nextStory();
  }, [m, slides.length, nextStory]);

  const prev = useCallback(() => {
    if (m > 0) setM(m - 1);
    else prevStory();
  }, [m, prevStory]);

  const nextRef = useRef(next);
  nextRef.current = next;

  useEffect(() => {
    onSeen(story.slug);
  }, [story.slug, onSeen]);

  useEffect(() => {
    elapsed.current = 0;
    setProgress(0);
    setBlocked(false);
  }, [s, m]);

  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      lenis?.start();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const isVideo = slide?.type === "video";

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      let p = 0;
      const v = videoRef.current;
      if (isVideo) {
        if (v) p = v.ended ? 1 : v.duration && Number.isFinite(v.duration) ? v.currentTime / v.duration : 0;
      } else {
        if (!paused) elapsed.current += dt;
        p = elapsed.current / IMAGE_MS;
      }
      setProgress(Math.min(1, p));
      if (p >= 1) {
        nextRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [s, m, paused, isVideo]);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const startVideo = useCallback((v: HTMLVideoElement) => {
    const wanted = soundChoice && !refused.current;
    setSound(v, wanted);
    setSoundOn(wanted);
    v.play()
      .then(() => setBlocked(false))
      .catch((e: unknown) => {
        if (isAbort(e)) return;
        if (!v.muted) {
          refused.current = true;
          setSound(v, false);
          setSoundOn(false);
          v.play()
            .then(() => setBlocked(false))
            .catch((e2: unknown) => {
              if (!isAbort(e2)) setBlocked(true);
            });
        } else setBlocked(true);
      });
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const v = videoRef.current;
    if (!host || !v) return undefined;
    host.appendChild(v);
    return () => {
      v.pause();
      v.remove();
    };
  }, []);

  const slideSrc = slide?.src ?? "";

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    if (!isVideo) {
      v.pause();
      return undefined;
    }
    if (v.getAttribute("src") !== slideSrc) v.src = slideSrc;
    else {
      try {
        v.currentTime = 0;
      } catch {
        /* not loaded yet */
      }
    }
    if (!pausedRef.current) startVideo(v);
    return () => v.pause();
  }, [s, m, slideSrc, isVideo, startVideo]);

  const wasPaused = useRef(paused);
  useEffect(() => {
    const before = wasPaused.current;
    wasPaused.current = paused;
    const v = videoRef.current;
    if (!v || !isVideo || before === paused) return;
    if (paused) v.pause();
    else if (!v.ended) startVideo(v);
  }, [paused, isVideo, startVideo]);

  const toggleSound = () => {
    const on = !soundOn;
    soundChoice = on;
    refused.current = false;
    setSoundOn(on);
    const v = videoRef.current;
    if (!v) return;
    setSound(v, on);
    if (on && v.paused && !paused && !v.ended) {
      v.play()
        .then(() => setBlocked(false))
        .catch(() => undefined);
    }
  };

  const tapToPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    refused.current = false;
    startVideo(v);
  };

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    const timer = window.setTimeout(() => {
      if (press.current) {
        press.current.held = true;
        setPaused(true);
      }
    }, 220);
    press.current = { x: e.clientX, y: e.clientY, held: false, timer };
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (p && !p.held && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) window.clearTimeout(p.timer);
  };

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    if (p.held) setPaused(false);
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) {
      onClose();
      return;
    }
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) nextStory();
      else prevStory();
      return;
    }
    if (p.held) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 3) prev();
    else next();
  };

  const onCancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    setPaused(false);
  };

  const piece = story.pieceName || story.title;

  return (
    <div role="dialog" aria-modal="true" aria-label={"Story: " + story.title} data-lenis-prevent className="fixed inset-0 z-[95] flex justify-center bg-black">
      <div className="relative h-full w-full overflow-hidden sm:max-w-md">
        <div
          className="absolute inset-0 touch-none select-none [-webkit-touch-callout:none]"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div ref={hostRef} className={isVideo ? "h-full w-full" : "hidden"} />
          {slide === null ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-ink-soft">
              <span className="text-rose-gold font-display text-7xl">{initials(story.title)}</span>
              <span className="text-base text-bone">Photos coming soon</span>
            </div>
          ) : slide.type === "video" ? (
            null
          ) : (
            <img key={slide.src} src={slide.src} alt={slide.alt || story.title} draggable={false} className="h-full w-full object-cover" />
          )}
        </div>

        {isVideo && blocked ? (
          <button
            type="button"
            onClick={tapToPlay}
            aria-label="Play the video"
            className="absolute top-1/2 left-1/2 z-10 inline-flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/50 text-white backdrop-blur-sm hover:text-rose-light"
          >
            <Play className="size-10 translate-x-0.5 fill-current" aria-hidden="true" />
          </button>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/70 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-10">
          <div className="flex gap-1" aria-hidden="true">
            {slides.map((_, i) => (
              <span key={i} className="h-0.5 flex-1 overflow-hidden bg-white/30">
                <span className="block h-full bg-white" style={{ width: (i < m ? 100 : i === m ? progress * 100 : 0) + "%" }} />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-medium uppercase tracking-[0.18em] text-white">{story.title}</span>
            <div className="flex items-center gap-1">
              {isVideo ? (
                <button type="button" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? "Mute the sound" : "Turn the sound on"} className="pointer-events-auto inline-flex size-11 items-center justify-center text-white hover:text-rose-light">
                  {soundOn ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5" aria-hidden="true" />}
                </button>
              ) : null}
              <button ref={closeRef} type="button" onClick={onClose} aria-label="Close the story" className="pointer-events-auto inline-flex size-11 items-center justify-center text-white">
                <X className="size-6" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black via-black/70 to-transparent px-5 pt-16 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <p className="title-caps text-2xl tracking-[0.12em] text-white">{story.title}</p>
          {story.club ? <p className="mt-1 text-sm uppercase tracking-[0.2em] text-rose-light">{story.club}</p> : null}
          {story.pieceName ? <p className="mt-2 text-base text-bone">{story.pieceName}</p> : null}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {story.articleUrl ? (
              <a href={story.articleUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-white px-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink hover:bg-rose-light">
                Read the article <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            ) : story.jewelSlug ? (
              <Link to={"/pieces/" + story.jewelSlug} onClick={onClose} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-white px-5 text-sm font-semibold uppercase tracking-[0.16em] text-ink hover:bg-rose-light">
                View the piece <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
            <a href={waLink(pieceMessage(piece))} target="_blank" rel="noreferrer" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 border border-white/50 px-5 text-sm font-semibold uppercase tracking-[0.16em] text-white hover:border-rose-light hover:text-rose-light">
              <BrandIcon name="whatsapp" className="size-5" /> Want yours? WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
