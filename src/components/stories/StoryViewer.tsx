import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { ArrowRight, ArrowUpRight, Play, Volume2, VolumeX, X } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { Img } from "@/components/Media";
import { pieceByMedia } from "@/data/relations";
import type { Story } from "@/data/types";
import { Link, useI18n } from "@/i18n";
import { useCatalogue } from "@/lib/catalogue";
import { getLenis } from "@/lib/gsap";
import { waLink } from "@/lib/site";
import { isAbort, itemsOf, preload, setSound, setSoundWanted, soundWanted, storyVideo } from "./player";

const IMAGE_MS = 5000;
const HOLD_MS = 220;

type Props = {
  stories: Story[];
  start: number;
  /** The step to open the first story at (a piece page opens it on the piece). */
  startStep?: number;
  onClose: () => void;
  onSeen?: (slug: string) => void;
};

/**
 * Full screen story viewer: progress bars, tap right / left for the next /
 * previous step (mirrored right to left, in Arabic), swipe for the next / previous story, long press to pause,
 * close with the cross or a swipe down. Photos last 5 s; videos their real
 * length, in the one shared <video> element.
 */
export default function StoryViewer({ stories, start, startStep = 0, onClose, onSeen }: Props) {
  const [s, setS] = useState(start);
  const [m, setM] = useState(startStep);
  const [progress, setProgress] = useState(0);
  const [held, setHeld] = useState(false);
  const [soundOn, setSoundOn] = useState(soundWanted);
  // The step whose video could not start, even muted: it shows a play button.
  const [blockedStep, setBlockedStep] = useState<string | null>(null);

  const { t, dir } = useI18n();
  const rtl = dir === "rtl";
  const cat = useCatalogue();
  const byMedia = useMemo(() => pieceByMedia(cat), [cat]);
  const story = stories[s];
  const items = story ? itemsOf(story) : [];
  const item = items[m];
  // The piece shown in this photo or video, else the piece of the story.
  const pieceSlug = (item && byMedia.get(item.src)) ?? story?.pieceSlug ?? null;
  const piece = pieceSlug ? cat.pieces.find((p) => p.slug === pieceSlug) : undefined;
  const isVideo = item?.type === "video";
  const stepKey = s + ":" + m;
  const blocked = blockedStep === stepKey;
  const stepRef = useRef(stepKey);

  const videoRef = useRef<HTMLVideoElement | null>(storyVideo());
  const hostRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const elapsed = useRef(0);
  const press = useRef<{ x: number; y: number; t: number; holding: boolean; timer: number } | null>(null);

  /* ---------- Navigation ---------- */

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
    } else {
      setM(0);
      elapsed.current = 0;
    }
  }, [s]);

  const next = useCallback(() => {
    if (m < items.length - 1) setM(m + 1);
    else nextStory();
  }, [m, items.length, nextStory]);

  const prev = useCallback(() => {
    if (m > 0) setM(m - 1);
    else prevStory();
  }, [m, prevStory]);

  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
    stepRef.current = stepKey;
  }, [next, stepKey]);

  useEffect(() => {
    if (story) onSeen?.(story.slug);
  }, [story, onSeen]);

  /* ---------- Page behind: locked while the viewer is open ---------- */

  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      lenis?.start();
      document.body.style.overflow = before;
      focused?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") (rtl ? prev : next)();
      else if (e.key === "ArrowLeft") (rtl ? next : prev)();
      else if (e.key === " ") {
        e.preventDefault();
        setHeld((h) => !h);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose, rtl]);

  /* ---------- The shared video element lives in the viewer while it is open ---------- */

  useEffect(() => {
    const host = hostRef.current;
    const v = videoRef.current;
    if (!host || !v) return undefined;
    host.appendChild(v);
    const onError = () => nextRef.current();
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("error", onError);
      v.pause();
      v.remove();
    };
  }, []);

  /** play() forced: with sound if wanted; refused, it starts again muted and shows the muted icon. */
  const play = useCallback((v: HTMLVideoElement) => {
    const wanted = soundWanted();
    setSound(v, wanted);
    const step = stepRef.current;
    const blockStep = () => setBlockedStep(step);
    const started = () => {
      setSoundOn(!v.muted);
      setBlockedStep(null);
    };
    v.play()
      .then(started)
      .catch((e: unknown) => {
        if (isAbort(e)) return;
        if (!v.muted) {
          setSound(v, false);
          v.play()
            .then(started)
            .catch((e2: unknown) => {
              if (!isAbort(e2)) blockStep();
            });
        } else blockStep();
      });
  }, []);

  const src = item?.src ?? "";
  const heldRef = useRef(held);
  useEffect(() => {
    heldRef.current = held;
  }, [held]);

  // Each step: reset the timer, load the step in the shared video, warm up the next one.
  useEffect(() => {
    elapsed.current = 0;
    stepRef.current = s + ":" + m;
    const v = videoRef.current;
    if (v) {
      if (isVideo) {
        if (v.getAttribute("src") !== src) {
          v.poster = item?.poster ?? "";
          v.src = src;
        } else {
          try {
            v.currentTime = 0;
          } catch {
            /* not loaded yet */
          }
        }
        if (!heldRef.current) play(v);
      } else v.pause();
    }
    const following = items[m + 1] ?? (stories[s + 1] ? itemsOf(stories[s + 1]!)[0] : undefined);
    preload(following);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per step
  }, [s, m, src, isVideo, play]);

  // Long press: pause and resume.
  const wasHeld = useRef(held);
  useEffect(() => {
    if (wasHeld.current === held) return;
    wasHeld.current = held;
    const v = videoRef.current;
    if (!v || !isVideo) return;
    if (held) v.pause();
    else if (!v.ended) play(v);
  }, [held, isVideo, play]);

  // Progress: 5 s for a photo, the real length of a video.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = t - last;
      last = t;
      let p: number;
      const v = videoRef.current;
      if (isVideo && v) {
        p = v.ended ? 1 : v.duration && Number.isFinite(v.duration) ? v.currentTime / v.duration : 0;
      } else {
        if (!held) elapsed.current += dt;
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
  }, [s, m, held, isVideo]);

  /* ---------- Sound ---------- */

  const toggleSound = () => {
    const on = !soundOn;
    setSoundWanted(on);
    setSoundOn(on);
    const v = videoRef.current;
    if (!v) return;
    setSound(v, on);
    if (v.paused && !held && !v.ended && isVideo) play(v);
  };

  /* ---------- Gestures ---------- */

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    const timer = window.setTimeout(() => {
      if (press.current) {
        press.current.holding = true;
        setHeld(true);
      }
    }, HOLD_MS);
    press.current = { x: e.clientX, y: e.clientY, t: performance.now(), holding: false, timer };
  };

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (p && !p.holding && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 12) window.clearTimeout(p.timer);
  };

  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    window.clearTimeout(p.timer);
    if (p.holding) setHeld(false);
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (dy > 80 && Math.abs(dy) > Math.abs(dx)) return onClose();
    // A swipe toward the start of the line shows the next story; a tap on the first third goes back.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) return (rtl ? dx > 0 : dx < 0) ? nextStory() : prevStory();
    if (p.holding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const fromStart = rtl ? rect.right - e.clientX : e.clientX - rect.left;
    if (fromStart < rect.width / 3) prev();
    else next();
  };

  const onCancel = () => {
    if (press.current) window.clearTimeout(press.current.timer);
    press.current = null;
    setHeld(false);
  };

  if (!story) return null;
  const first = s === 0 && m === 0;

  return (
    <div role="dialog" aria-modal="true" aria-label={t.stories.dialog(story.title)} data-lenis-prevent data-story={story.slug} data-step={m} className="fixed inset-0 z-[95] flex justify-center bg-black">
      <div className="relative h-full w-full overflow-hidden sm:max-w-[min(28rem,56svh)]">
        <div
          data-story-surface
          className="absolute inset-0 touch-none select-none [-webkit-touch-callout:none]"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onCancel}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div ref={hostRef} className={isVideo ? "h-full w-full" : "hidden"} />
          {item && !isVideo ? <Img key={item.src} src={item.src} alt={item.alt || story.title} draggable={false} className="h-full w-full object-cover" /> : null}
          {!item ? <Img src="" alt={story.title} className="h-full w-full" /> : null}
        </div>

        {isVideo && blocked ? (
          <button
            type="button"
            onClick={() => videoRef.current && play(videoRef.current)}
            aria-label={t.stories.play}
            className="absolute top-1/2 left-1/2 z-10 inline-flex size-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/50 text-white backdrop-blur-sm"
          >
            <Play className="size-10 translate-x-0.5 fill-current" aria-hidden="true" />
          </button>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/75 to-transparent px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-12">
          <div className="flex gap-1" aria-hidden="true">
            {items.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35">
                <span data-progress={i === m ? "" : undefined} className="block h-full bg-white" style={{ width: (i < m ? 100 : i === m ? progress * 100 : 0) + "%" }} />
              </span>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="truncate ps-1 text-base font-medium text-white">{story.title}</p>
            <div className="flex shrink-0 items-center">
              {isVideo ? (
                <button type="button" onClick={toggleSound} aria-pressed={soundOn} aria-label={soundOn ? t.stories.soundOff : t.stories.soundOn} className="pointer-events-auto inline-flex size-12 items-center justify-center text-white">
                  {soundOn ? <Volume2 className="size-6" aria-hidden="true" /> : <VolumeX className="size-6" aria-hidden="true" />}
                </button>
              ) : null}
              <button ref={closeRef} type="button" onClick={onClose} aria-label={t.stories.close} className="pointer-events-auto inline-flex size-12 items-center justify-center text-white">
                <X className="size-7" aria-hidden="true" />
              </button>
            </div>
          </div>
          {first && !held ? <p className="sr-only">{t.stories.help}</p> : null}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black via-black/70 to-transparent px-4 pt-20 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto flex flex-col gap-3">
            {story.articleUrl ? (
              <a href={story.articleUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center justify-center gap-2 bg-white px-5 text-base font-semibold text-ink">
                {t.common.readArticle} <ArrowUpRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
              </a>
            ) : null}
            <div className="flex gap-3">
              <a href={waLink(t.whatsapp.piece(piece?.title ?? story.title))} target="_blank" rel="noreferrer" className={"inline-flex min-h-12 flex-1 items-center justify-center gap-2 px-5 text-base font-semibold " + (story.articleUrl ? "border border-white/60 text-white" : "bg-white text-ink")}>
                <BrandIcon name="whatsapp" className="size-5" /> {t.stories.want}
              </a>
              {piece ? (
                <Link
                  to={"/pieces/" + piece.slug}
                  onClick={onClose}
                  data-see-piece={piece.slug}
                  aria-label={t.stories.seePieceLabel(piece.title)}
                  className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 border border-white/40 bg-black/30 px-4 text-base font-medium text-white backdrop-blur-sm"
                >
                  {t.common.seePiece} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
