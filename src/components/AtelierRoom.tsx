import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, LoaderCircle, Pause, Play, RotateCcw, Volume2, VolumeX, X } from "lucide-react";
import { media } from "@/data/catalogue";
import { filmTime, type Film, type FilmKind, type ResolvedAtelier } from "@/data/atelier";
import { Link, useI18n } from "@/i18n";
import { wantsLight } from "@/lib/films";
import { getLenis, useReducedMotion } from "@/lib/gsap";

/*
 * The atelier of a piece, full screen (src/data/atelier.ts): a warm room (the lamp over the bench, the grain of the
 * wood, a photo of the bench in the dark), its making-of large, then its finished piece, "The Final Reveal".
 * - Plays only because the visitor entered (a click): the sound off at first, a button turns it on; play, pause, a bar
 *   to move in the film; at the end of the making-of, the finished piece follows.
 * - Left with the button, the Escape key or the back gesture of the phone (the room is one step of the history).
 * - Phones: the lighter copy of each film (or a computer asking to save data, a slow connection).
 * Every text and button sits on a dark band (readable over any frame); nothing moves when the visitor asks for reduced
 * motion, apart from the film itself.
 */

type Props = {
  title: string;
  /** "Inter Milan", "a private collector": under the title. */
  madeFor: string;
  slug: string;
  atelier: ResolvedAtelier;
  /** The page The Atelier: a link "Enter the World" leads to the page of the piece. */
  world?: boolean;
  onClose: () => void;
};

const posterOf = (film: Film) => film.posters[film.poster] ?? film.posters[0] ?? "";

export default function AtelierRoom({ title, madeFor, slug, atelier, world = false, onClose }: Props) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playRef = useRef<HTMLButtonElement>(null);
  const [light] = useState(wantsLight);
  const [kind, setKind] = useState<FilmKind>("making");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [interlude, setInterlude] = useState(false);
  const [ended, setEnded] = useState(false);
  const film = kind === "reveal" && atelier.reveal ? atelier.reveal : atelier.making;
  const poster = kind === "making" ? atelier.poster : posterOf(film);
  const src = light ? film.mobile : film.src;
  const filmName = kind === "making" ? t.films.making : t.films.reveal;
  const bench = media.groups["atelier"]?.[2];

  // The room is one step of the history: the back gesture (or button) of the phone leaves it.
  const pushed = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    // Once (a second run of the effect in development would add a second step).
    if ((window.history.state as { atelier?: string } | null)?.atelier !== slug) window.history.pushState({ ...(window.history.state as object | null), atelier: slug }, "");
    pushed.current = true;
    const onPop = () => {
      pushed.current = false;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [slug]);
  const close = useCallback(() => {
    if (pushed.current && (window.history.state as { atelier?: string } | null)?.atelier === slug) window.history.back();
    else onCloseRef.current();
  }, [slug]);

  // The page behind stays still; the focus comes back to what opened the room.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const lenis = getLenis();
    lenis?.stop();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    playRef.current?.focus({ preventScroll: true });
    return () => {
      lenis?.start();
      document.body.style.overflow = overflow;
      before?.focus?.({ preventScroll: true });
    };
  }, []);

  // A new film (the making-of, then the finished piece): from its start, playing.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setTime(0);
    setWaiting(true);
    v.load();
    v.play().catch(() => {
      // A browser that refuses the sound without a new gesture: silent, then playing.
      v.muted = true;
      setMuted(true);
      v.play().catch(() => setPlaying(false));
    });
  }, [src]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  // After the making-of, its title card, then the finished piece.
  useEffect(() => {
    if (!interlude) return undefined;
    const id = window.setTimeout(() => {
      setInterlude(false);
      setKind("reveal");
    }, reduced ? 900 : 1600);
    return () => window.clearTimeout(id);
  }, [interlude, reduced]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (ended) return replay();
    if (v.paused) void v.play().catch(() => undefined);
    else v.pause();
  };
  const choose = (next: FilmKind) => {
    setEnded(false);
    setInterlude(false);
    if (next === kind) {
      const v = videoRef.current;
      if (v) {
        v.currentTime = 0;
        void v.play().catch(() => undefined);
      }
    } else setKind(next);
  };
  const replay = () => choose("making");
  const onChapter = (e: ReactMouseEvent<HTMLButtonElement>) => choose(e.currentTarget.dataset.chapter === "reveal" ? "reveal" : "making");
  const onEnded = () => {
    if (kind === "making" && atelier.reveal) setInterlude(true);
    else setEnded(true);
  };

  // Escape leaves, wherever the focus is (a click on the film leaves it on the page).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Tab stays inside the room.
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !rootRef.current) return;
    const items = [...rootRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled]), [tabindex='0']")].filter((el) => el.offsetParent !== null);
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const chapters: { kind: FilmKind; name: string; film: Film }[] = [{ kind: "making", name: t.films.making, film: atelier.making }];
  if (atelier.reveal) chapters.push({ kind: "reveal", name: t.films.reveal, film: atelier.reveal });
  const duration = film.duration || 1;
  const frame = { "--fa": film.width + " / " + film.height, "--fh": "min(80svh, calc(50vw * " + film.height + " / " + film.width + "))" } as CSSProperties;
  const btn = "inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light";

  const room = (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="atelier-room-title"
      data-atelier-room={slug}
      data-film={kind}
      data-lenis-prevent
      onKeyDown={onKeyDown}
      className="atelier-room fixed inset-0 z-[95] overflow-hidden bg-[#0b0806] text-white"
    >
      {/* The room: a photo of the bench in the dark, the lamp, the wood, the grain */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {bench ? <img src={bench.src} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.16] blur-[6px]" /> : null}
        <span className="ar-lamp absolute inset-0" />
        <span className="ar-bench absolute inset-x-0 bottom-0 h-[22svh]" />
        <span className="ar-grain absolute inset-0" />
      </div>

      <div className="relative grid h-full lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-12 lg:px-12">
        {/* The piece and the two films (computers) */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 bg-linear-to-b from-black/85 via-black/45 to-transparent px-4 pt-4 pb-10 lg:static lg:block lg:bg-none lg:p-0">
          <div className="min-w-0 [text-shadow:0_2px_18px_rgba(0,0,0,0.9)]">
            <p className="eyebrow">
              <span className="hidden lg:inline">{t.atelier.title} · </span>
              <span data-film-name>{filmName}</span>
            </p>
            <h2 id="atelier-room-title" className="title-caps mt-2 t-title leading-[1.1] tracking-[0.08em] break-words text-white lg:mt-4">
              {title}
            </h2>
            <p className="mt-1 text-base text-bone lg:mt-3">{t.common.madeFor(madeFor)}</p>
            {world ? (
              // "Enter the World" on phones, under the name of the piece (computers: under the button to leave).
              <Link to={"/pieces/" + slug} replace data-atelier-world className="mt-2 inline-flex min-h-12 items-center gap-2 text-base font-medium uppercase tracking-[0.1em] text-rose-light lg:hidden">
                {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            ) : null}
            <ol className="mt-10 hidden border-t border-white/15 lg:block">
              {chapters.map((c, i) => (
                <li key={c.kind} className="border-b border-white/15">
                  <button
                    type="button"
                    data-chapter={c.kind}
                    aria-current={kind === c.kind ? "true" : undefined}
                    onClick={onChapter}
                    className={"flex min-h-14 w-full items-center gap-4 py-3 text-start transition-colors hover:text-rose-light " + (kind === c.kind ? "text-white" : "text-mist")}
                  >
                    <span className="text-rose-gold w-8 font-display text-xl">{String(i + 1).padStart(2, "0")}</span>
                    <span className="title-caps flex-1 text-lg tracking-[0.12em]">{c.name}</span>
                    <span className="text-base text-mist tabular-nums">{filmTime(c.film.duration)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <button type="button" onClick={close} data-atelier-close aria-label={t.films.leave} className={btn + " lg:hidden"}>
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>

        {/* The film */}
        <div style={frame} className="absolute inset-0 lg:relative lg:inset-auto lg:h-[var(--fh)] lg:[aspect-ratio:var(--fa)] lg:max-w-[52vw]">
          <div className="ar-frame absolute inset-0 overflow-hidden bg-black lg:border lg:border-rose-light/20">
            <video
              ref={videoRef}
              data-atelier-video
              src={src}
              poster={poster || undefined}
              muted={muted}
              playsInline
              preload="auto"
              disablePictureInPicture
              aria-label={filmName + " · " + title}
              onClick={toggle}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onWaiting={() => setWaiting(true)}
              onPlaying={() => setWaiting(false)}
              onCanPlay={() => setWaiting(false)}
              onEnded={onEnded}
              className="h-full w-full object-contain"
            />
            {waiting && playing ? (
              <span role="status" className="absolute inset-0 flex items-center justify-center">
                <LoaderCircle className={"size-10 text-rose-light " + (reduced ? "" : "animate-spin")} aria-hidden="true" />
                <span className="sr-only">{t.films.loading}</span>
              </span>
            ) : null}
            {interlude ? (
              <div data-interlude className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
                <span className="text-rose-gold font-display text-3xl">02</span>
                <p className={"title-caps mt-3 t-lead tracking-[0.14em] text-white " + (reduced ? "" : "ar-rise")}>{t.films.reveal}</p>
              </div>
            ) : null}
            {ended ? (
              <div data-atelier-end className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 px-6">
                <p className="title-caps mb-4 text-center t-lead tracking-[0.12em] text-white">{title}</p>
                <button type="button" onClick={replay} className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-3 border border-white/40 px-7 text-base font-medium uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.8125rem]">
                  <RotateCcw className="size-5" aria-hidden="true" /> {t.films.replay}
                </button>
                {world ? (
                  <Link to={"/pieces/" + slug} replace className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-3 bg-white px-7 text-base font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]">
                    {t.common.enterWorld} <ArrowRight className="size-5 rtl:-scale-x-100" aria-hidden="true" />
                  </Link>
                ) : (
                  <button type="button" onClick={close} className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-3 bg-white px-7 text-base font-medium uppercase tracking-[0.12em] text-ink transition-colors hover:bg-rose-light lg:min-h-11 lg:text-[0.8125rem]">
                    {t.films.leave}
                  </button>
                )}
              </div>
            ) : null}
          </div>

          {/* The controls, on a dark band at the foot of the film */}
          <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/90 via-black/60 to-transparent px-4 pt-12 pb-[max(1rem,env(safe-area-inset-bottom))] lg:px-5 lg:pb-4">
            <div className="mb-2 flex gap-2 lg:hidden">
              {chapters.length > 1
                ? chapters.map((c) => (
                    <button
                      key={c.kind}
                      type="button"
                      data-chapter={c.kind}
                      aria-current={kind === c.kind ? "true" : undefined}
                      onClick={onChapter}
                      className={"inline-flex min-h-12 flex-1 items-center justify-center px-3 text-center text-base leading-tight font-medium transition-colors " + (kind === c.kind ? "bg-white text-ink" : "border border-white/35 bg-black/40 text-white")}
                    >
                      {c.name}
                    </button>
                  ))
                : null}
            </div>
            <div className="flex items-center gap-3">
              <button ref={playRef} type="button" onClick={toggle} data-atelier-play aria-label={playing ? t.films.pause : t.films.play} className={btn}>
                {playing ? <Pause className="size-5 fill-current" aria-hidden="true" /> : <Play className="size-5 translate-x-px fill-current" aria-hidden="true" />}
              </button>
              {/* The time of a film runs left to right, in Arabic too (as on every player). */}
              <input
                type="range"
                dir="ltr"
                data-atelier-seek
                min={0}
                max={duration}
                step={0.1}
                value={Math.min(time, duration)}
                aria-label={t.films.seek(filmName)}
                aria-valuetext={filmTime(time) + " / " + filmTime(duration)}
                onChange={(e) => {
                  const v = videoRef.current;
                  if (v) v.currentTime = Number(e.target.value);
                  setTime(Number(e.target.value));
                  setEnded(false);
                }}
                style={{ "--p": (Math.min(time, duration) / duration) * 100 + "%" } as CSSProperties}
                className="ar-seek h-12 min-w-0 flex-1 cursor-pointer"
              />
              <span dir="ltr" className="hidden text-base text-bone tabular-nums sm:inline">
                {filmTime(time)} / {filmTime(duration)}
              </span>
              {film.audio ? (
                <button type="button" onClick={() => setMuted((m) => !m)} data-atelier-sound aria-pressed={!muted} aria-label={muted ? t.films.soundOn : t.films.soundOff} className={btn}>
                  {muted ? <VolumeX className="size-5" aria-hidden="true" /> : <Volume2 className="size-5" aria-hidden="true" />}
                </button>
              ) : (
                <span className="sr-only">{t.films.silent}</span>
              )}
            </div>
          </div>
        </div>

        {/* Leave (computers) */}
        <div className="hidden self-start justify-self-end pt-8 lg:block">
          <button type="button" onClick={close} data-atelier-close className="inline-flex min-h-12 items-center gap-3 border border-white/35 bg-black/40 px-5 text-base font-medium uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.8125rem]">
            <X className="size-5" aria-hidden="true" /> {t.films.leave}
          </button>
          {world ? (
            <Link to={"/pieces/" + slug} replace data-atelier-world className="mt-3 flex min-h-12 items-center justify-end gap-2 text-base font-medium uppercase tracking-[0.12em] text-white hover:text-rose-light">
              {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>

    </div>
  );
  return createPortal(room, document.body);
}
