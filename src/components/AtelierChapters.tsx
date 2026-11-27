import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { forceMuted } from "@/components/Media";
import chapters from "@/data/atelier-chapters.generated.json" with { type: "json" };
import { useI18n } from "@/i18n";
import { useReducedMotion } from "@/lib/gsap";

/*
 * The chapters at the top of The Atelier ("01 The Birth of Form"…), as filmed moments (Yoni, 27/11/2026: the still photos
 * had to go): each chapter, full screen, one moment of a making-of of the house that shows what it says, chosen frame by
 * frame (scripts/atelier-chapters.mjs, src/data/atelier-chapters.generated.json), in the warm black and white of the atelier.
 * - Its image first (a frame of the clip itself: never a black frame), the clip fading in over it once it plays.
 * - Silent (no sound track at all), looping, playing only while its card is seen: on screen (IntersectionObserver) and not
 *   covered by the next card of the stack; it pauses as soon as it is not, or when the tab is hidden.
 * - A band of the film on a wide screen, the whole vertical film on a phone (any screen taller than wide).
 * - Asked for less motion: its image only.
 * The cards stack as the page scrolls (each sticks at the top, the next one slides over it), as the photos did.
 */

type Chapter = (typeof chapters)[number];

/** A screen taller than wide (phones, tablets held upright): the vertical clip. */
const TALL = "(max-aspect-ratio: 1/1)";
const subscribeTall = (cb: () => void) => {
  const mq = window.matchMedia(TALL);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const noop = () => () => undefined;

const shadow = "[text-shadow:0_2px_30px_rgba(0,0,0,0.75)]";

export default function AtelierChapters() {
  const { t } = useI18n();
  const steps = t.atelier.steps;
  const rootRef = useRef<HTMLElement>(null);
  /** The card seen (on screen, not covered by the next one): its clip plays. */
  const [seen, setSeen] = useState<boolean[]>(() => chapters.map(() => false));
  /** The cards near the screen: their clip is loaded (once loaded, it stays). */
  const [near, setNear] = useState<boolean[]>(() => chapters.map(() => false));

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const cards = [...root.querySelectorAll<HTMLElement>("[data-atelier-chapter]")];
    let frame = 0;
    let watching = false;
    const measure = () => {
      frame = 0;
      const vh = window.innerHeight;
      const rects = cards.map((c) => c.getBoundingClientRect());
      const visible = document.visibilityState === "visible";
      const nowSeen = rects.map((r, i) => {
        const next = rects[i + 1];
        // What is left of it on screen: above the next card, which slides over it.
        const bottom = Math.min(r.bottom, vh, next ? next.top : Infinity);
        return visible && bottom - Math.max(r.top, 0) > vh * 0.08;
      });
      const nowNear = rects.map((r) => r.top < vh * 1.6 && r.bottom > -vh * 0.6);
      setSeen((prev) => (prev.every((v, i) => v === nowSeen[i]) ? prev : nowSeen));
      setNear((prev) => (prev.every((v, i) => v || !nowNear[i]) ? prev : prev.map((v, i) => v || nowNear[i]!)));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    const watch = (on: boolean) => {
      if (on === watching) return;
      watching = on;
      if (on) {
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
      } else {
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", schedule);
      }
    };
    // The stack near the screen: then only does the page follow the scroll to know which card is seen.
    const io = new IntersectionObserver(
      ([entry]) => {
        watch(!!entry?.isIntersecting);
        schedule();
      },
      { rootMargin: "60% 0px 60% 0px" },
    );
    io.observe(root);
    document.addEventListener("visibilitychange", schedule);
    schedule();
    return () => {
      io.disconnect();
      watch(false);
      document.removeEventListener("visibilitychange", schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={rootRef} aria-labelledby="atelier-steps" data-atelier-chapters className="relative">
      <h2 id="atelier-steps" className="sr-only uppercase">
        {t.atelier.making}
      </h2>
      {chapters.map((chapter, i) => {
        const step = steps[i] ?? { title: t.atelier.step(i + 1), text: "" };
        return (
          <article key={chapter.key} data-atelier-chapter={chapter.key} data-playing={seen[i] ? "" : undefined} className="sticky top-0 h-svh w-full overflow-hidden bg-ink" style={{ zIndex: i + 1 }}>
            <div className="absolute inset-0 overflow-hidden">
              <ChapterFilm chapter={chapter} alt={t.atelier.stepAlt(step.title)} play={!!seen[i]} load={!!near[i]} />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink via-ink/55 via-35% to-ink/5" />
            </div>
            <div className="wrap relative z-10 flex h-full flex-col justify-end pb-28 md:pb-20">
              <span aria-hidden="true" className="text-rose-gold block font-display text-3xl font-light md:text-4xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className={"title-caps mt-3 t-lead text-white " + shadow}>{step.title}</h3>
              <div className="rule-rose my-4 max-w-[12rem]" aria-hidden="true" />
              <p className={"max-w-xl text-base text-bone lg:text-[1rem] " + shadow}>{step.text}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

/**
 * One filmed moment: its image (a frame of the clip, the phone one on a screen taller than wide), and over it the clip,
 * silent, looping, loaded when its card comes near and playing only while it is seen. Never a video with sound: muted, and
 * the files have no sound track.
 */
function ChapterFilm({ chapter, alt, play, load }: { chapter: Chapter; alt: string; play: boolean; load: boolean }) {
  const reduced = useReducedMotion();
  // The clip is a thing of the browser only (the page served first shows its image).
  const client = useSyncExternalStore(noop, () => true, () => false);
  const tall = useSyncExternalStore(subscribeTall, () => window.matchMedia(TALL).matches, () => false);
  const src = tall ? chapter.mobile : chapter.video;
  const ref = useRef<HTMLVideoElement>(null);
  // The clip covers its image once its first frame is drawn (the image stays under it: nothing is ever black).
  const [shown, setShown] = useState("");

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    forceMuted(v);
    if (play && load) v.play().catch(() => undefined);
    else v.pause();
  }, [play, load, src, reduced, client]);

  return (
    <>
      <picture>
        <source media={TALL} srcSet={chapter.posterMobile} width={chapter.mobileWidth} height={chapter.mobileHeight} />
        <img src={chapter.poster} alt={alt} width={chapter.width} height={chapter.height} loading="lazy" decoding="async" data-chapter-poster className="absolute inset-0 h-full w-full object-cover" />
      </picture>
      {client && !reduced ? (
        <video
          key={src}
          ref={ref}
          data-chapter-video={chapter.key}
          src={load ? src : undefined}
          muted
          loop
          playsInline
          preload={load ? "auto" : "none"}
          disablePictureInPicture
          disableRemotePlayback
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={() => setShown(src)}
          className={"absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out " + (shown === src ? "opacity-100" : "opacity-0")}
        />
      ) : null}
    </>
  );
}
