import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import Universe, { universeProps } from "@/components/Universe";
import type { Film } from "@/data/atelier";
import type { ResolvedTheme } from "@/data/themes";
import { useI18n } from "@/i18n";
import { wantsLight } from "@/lib/films";
import { getLenis } from "@/lib/gsap";

/**
 * The film of the finished piece, the first thing seen when entering its page (a "capsule"): over the whole screen, in a
 * frame made of the universe of the piece (its backdrop, its colours, its light), it starts at once with its sound (the
 * visitor has just clicked to enter; a browser that still refuses the sound plays it silent, the sound button in view).
 * "See the piece", Escape or the end of the film leave it. Once per visit and per piece (src/lib/films.ts); "Watch the
 * film" in the opening plays it again. The film itself: src/data/atelier.ts (resolveReveal), scripts/film-media.mjs.
 */
export default function PieceFilm({ title, film, poster, theme, onClose }: { title: string; film: Film; poster: string; theme: ResolvedTheme; onClose: () => void }) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const [light] = useState(wantsLight);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const leave = () => {
    if (leaving) return;
    setLeaving(true);
    videoRef.current?.pause();
    window.setTimeout(() => closeRef.current(), 450);
  };
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });

  // It starts with its sound; refused (no click before, Safari), silent with the sound button in view.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.play().catch(() => {
      v.muted = true;
      setMuted(true);
      v.play().catch(() => undefined);
    });
  }, []);

  // The page behind stays still; the focus on "See the piece" (Enter leaves at once), back to the page after.
  useEffect(() => {
    const lenis = getLenis();
    lenis?.stop();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    skipRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") leaveRef.current();
      if (e.key !== "Tab" || !rootRef.current) return;
      const items = [...rootRef.current.querySelectorAll<HTMLElement>("button")];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      lenis?.start();
    };
  }, []);

  const toggleSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (v.paused) v.play().catch(() => undefined);
  };
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => undefined);
    else v.pause();
  };

  const vars = { ...universeProps(theme).style, "--pf-ratio": String(film.width / film.height) } as CSSProperties;
  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={t.films.intro(title)}
      data-piece-film
      data-leaving={leaving ? "" : undefined}
      className="piece-film fixed inset-0 z-[90] overflow-hidden text-white"
      style={vars}
    >
      {/* The universe of the piece around the film, still; a veil keeps the words readable. */}
      <Universe theme={theme} preview />
      <div className="pf-veil absolute inset-0" />
      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-4 pt-6 pb-5 sm:gap-6 lg:flex-row lg:gap-14 lg:px-12">
        <div className="pf-frame relative shrink-0">
          <video
            ref={videoRef}
            data-piece-film-video
            src={light ? film.mobile : film.src}
            poster={poster || undefined}
            playsInline
            preload="auto"
            onClick={togglePlay}
            onTimeUpdate={(e) => setProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
            onEnded={() => leaveRef.current()}
            className="h-full w-full cursor-pointer bg-black object-cover"
          />
          <span aria-hidden="true" className="pf-progress absolute inset-x-0 bottom-0 h-[3px]" style={{ "--p": progress } as CSSProperties} />
          {film.audio ? (
            <button
              type="button"
              onClick={toggleSound}
              data-piece-film-sound={muted ? "off" : "on"}
              aria-label={muted ? t.films.soundOn : t.films.soundOff}
              className={
                "absolute end-3 top-3 inline-flex min-h-12 items-center gap-2 rounded-full border px-4 text-base backdrop-blur-sm transition-colors " +
                (muted ? "pf-sound-call border-white/70 bg-ink/70 font-medium text-white" : "border-white/30 bg-ink/50 text-white hover:border-rose-light hover:text-rose-light")
              }
            >
              {muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
              {muted ? <span>{t.films.soundOn}</span> : null}
            </button>
          ) : null}
        </div>
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center lg:w-auto lg:max-w-sm lg:items-start lg:text-start">
          <div className="hidden sm:block">
            <p className="eyebrow">{t.films.reveal}</p>
            <p data-u-title className="title-caps mt-3 t-lead leading-tight tracking-[0.06em] [text-wrap:balance]">
              {title}
            </p>
          </div>
          <button
            ref={skipRef}
            type="button"
            onClick={leave}
            data-piece-film-skip
            className="inline-flex min-h-12 w-full items-center justify-center gap-3 border border-rose-light/55 px-6 text-base font-normal uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light sm:w-auto lg:mt-4 lg:min-h-11 lg:text-[0.75rem]"
          >
            {t.films.skip} <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
