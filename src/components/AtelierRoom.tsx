import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, LoaderCircle, Maximize, Minimize, Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { posterBehind } from "@/components/Media";
import { media } from "@/data/catalogue";
import { makingSteps } from "@/data/making";
import type { MakingStep } from "@/data/types";
import { useCatalogue } from "@/lib/catalogue";
import { useFullscreen } from "@/lib/fullscreen";
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
 * On the page The Atelier (27/11/2026, as on YouTube): "Up next", the other making-of films beside the film (under it on a
 * phone), the closest first (src/data/atelier.ts, upNextOrder); one of them plays in the same room. At the end of a film,
 * "Enter the World" (the page of its finished piece) and "Next film" (the first of the list): the visitor never leaves the
 * site, from the atelier to another making-of, then to a finished piece.
 */

/** One film of "Up next": its piece, its image, its length. */
export type UpNextFilm = { slug: string; title: string; poster: string; srcSet?: string; duration: number };

type Props = {
  title: string;
  /** "Inter Milan", "a private collector": under the title. */
  madeFor: string;
  /** The kind of piece (the French and Spanish words agree with it). */
  type?: string;
  slug: string;
  atelier: ResolvedAtelier;
  /** The page The Atelier: a link "Enter the World" leads to the page of the piece. */
  world?: boolean;
  /** The other making-of films, the closest first ("Up next"); one chosen plays in this room (onPick). */
  upNext?: UpNextFilm[];
  onPick?: (slug: string) => void;
  onClose: () => void;
};

const posterOf = (film: Film) => film.posters[film.poster] ?? film.posters[0] ?? "";

export default function AtelierRoom({ title, madeFor, type, slug, atelier, world = false, upNext = [], onPick, onClose }: Props) {
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
  // Another film chosen in "Up next": the same room starts again with it, from its making-of.
  const [shownSlug, setShownSlug] = useState(slug);
  if (shownSlug !== slug) {
    setShownSlug(slug);
    setKind("making");
    setEnded(false);
    setInterlude(false);
    setTime(0);
  }
  const next = onPick ? upNext[0] : undefined;
  const endRef = useRef<HTMLDivElement>(null);
  const film = kind === "reveal" && atelier.reveal ? atelier.reveal : atelier.making;
  const poster = kind === "making" ? atelier.poster : posterOf(film);
  const src = light ? film.mobile : film.src;
  const filmName = kind === "making" ? t.films.making : t.films.reveal;
  const bench = media.groups["atelier"]?.[2];
  // The steps of its making (wax, setting, polishing…), when the house has them: in small under its name (25/11/2026).
  const cat = useCatalogue();
  const piece = cat.pieces.find((p) => p.slug === slug);
  const box = piece?.boxSlug ? cat.boxes.find((b) => b.slug === piece.boxSlug) : undefined;
  const steps = piece ? makingSteps(piece, box?.images[0]).map((x) => x.step) : [];
  const STEP_NAMES: Record<MakingStep, { title: string }> = t.piece.steps;
  // Full screen: the film with its controls, and the same button (or Escape) leaves it (src/lib/fullscreen.ts).
  const filmRef = useRef<HTMLDivElement>(null);
  const { full, toggle: toggleFull } = useFullscreen(filmRef, videoRef);

  // The room is one step of the history: the back gesture (or button) of the phone leaves it.
  const pushed = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    // Once (a second run of the effect in development would add a second step); another film of "Up next" takes the place of
    // the one before (one step for the whole visit of the room).
    const state = window.history.state as { atelier?: string } | null;
    if (state?.atelier !== slug) {
      if (state?.atelier) window.history.replaceState({ ...state, atelier: slug }, "");
      else window.history.pushState({ ...state, atelier: slug }, "");
    }
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
  /** Another film of "Up next", in this room; the focus on its play button (the list may change under the pointer). */
  const pick = (next: string) => {
    onPick?.(next);
    playRef.current?.focus({ preventScroll: true });
  };
  const onChapter = (e: ReactMouseEvent<HTMLButtonElement>) => choose(e.currentTarget.dataset.chapter === "reveal" ? "reveal" : "making");
  const onEnded = () => {
    if (kind === "making" && atelier.reveal) setInterlude(true);
    else setEnded(true);
  };

  // The end of a film: the focus on its first choice (a keyboard goes on from there).
  useEffect(() => {
    if (ended) endRef.current?.querySelector<HTMLElement>("a[href], button")?.focus({ preventScroll: true });
  }, [ended]);

  // Escape leaves, wherever the focus is (a click on the film leaves it on the page).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.fullscreenElement) return;
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
  const frame = { "--fa": film.width + " / " + film.height, "--fr": String(film.width / film.height), "--fh": "min(76svh, calc(50vw * " + film.height + " / " + film.width + "))" } as CSSProperties;
  const wide = film.width > film.height;
  const list = !!onPick && upNext.length > 0;
  const endBtn = "inline-flex min-h-12 flex-1 items-center justify-center gap-3 border px-4 py-3 text-center text-base leading-tight font-normal uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.75rem]";
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
      style={frame}
      className="atelier-room fixed inset-0 z-[95] overflow-x-hidden overflow-y-auto overscroll-contain bg-[#0b0806] text-white lg:overflow-hidden"
    >
      {/* The room: a photo of the bench in the dark, the lamp, the wood, the grain */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* A real photo of the atelier of the house, blurred and darkened (25/11/2026: the film is watched in his atelier, never in
            a black window). */}
        {bench ? <img src={bench.src} alt="" data-atelier-scene className="absolute inset-0 h-full w-full scale-110 object-cover opacity-[0.5] blur-[10px]" /> : null}
        <span className="ar-dim absolute inset-0" />
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
            <h2 id="atelier-room-title" className="title-caps tracking-[0.12em] mt-2 t-title leading-[1.1] break-words text-white lg:mt-4">
              {title}
            </h2>
            {madeFor !== t.common.privateCollector ? <p className="mt-1 text-base text-bone lg:mt-3">{t.common.madeFor(madeFor, type)}</p> : null}
            {steps.length > 0 ? (
              <ul data-atelier-steps className="mt-3 hidden flex-wrap gap-x-3 gap-y-1 text-[0.75rem] uppercase tracking-[0.16em] text-mist sm:flex lg:mt-5">
                {steps.map((step, i) => (
                  <li key={step} className="flex items-center gap-3">
                    {i > 0 ? <span aria-hidden="true" className="inline-block h-px w-3 bg-rose-light/60" /> : null}
                    {STEP_NAMES[step]?.title ?? step}
                  </li>
                ))}
              </ul>
            ) : null}
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
        <div ref={filmRef} data-atelier-film className="ar-film lg:relative lg:h-[var(--fh)] lg:[aspect-ratio:var(--fa)] lg:max-w-[52vw]">
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
              style={posterBehind(poster || undefined)}
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
              // The end of the film: its two ways on (27/11/2026): the page of its finished piece, the next making-of; "Watch again"
              // small under them. A film wider than tall (short on a phone): the two side by side, without the name.
              <div ref={endRef} data-atelier-end className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-black/85 px-4 py-4">
                {wide ? null : <p className="title-caps mb-2 text-center t-lead tracking-[0.12em] text-white">{title}</p>}
                <div className={"flex w-full gap-3 " + (wide ? "max-w-md flex-row" : "max-w-xs flex-col")}>
                  {world ? (
                    <Link to={"/pieces/" + slug} replace data-atelier-end-world className={endBtn + " border-rose-light/70 hover:bg-rose-light/10"}>
                      {t.common.enterWorld} <ArrowRight className="size-5 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
                    </Link>
                  ) : (
                    <button type="button" onClick={close} className={endBtn + " border-rose-light/55"}>
                      {t.films.leave}
                    </button>
                  )}
                  {next ? (
                    <button type="button" onClick={() => pick(next.slug)} data-atelier-next={next.slug} className={endBtn + " border-white/40"}>
                      <SkipForward className="size-5 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
                      <span className="flex flex-col items-center">
                        {t.films.nextFilm}
                        {wide ? <span className="sr-only">{" · " + next.title}</span> : <span className="mt-1 text-base normal-case tracking-normal text-mist lg:text-[0.8125rem]">{next.title}</span>}
                      </span>
                    </button>
                  ) : null}
                </div>
                <button type="button" onClick={replay} data-atelier-replay className="inline-flex min-h-12 items-center gap-2 px-3 text-base text-mist transition-colors hover:text-rose-light lg:min-h-10 lg:text-[0.8125rem]">
                  <RotateCcw className="size-4" aria-hidden="true" /> {t.films.replay}
                </button>
              </div>
            ) : null}
          </div>

          {/* The controls, on a dark band at the foot of the film */}
          <div className={"absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/90 via-black/60 to-transparent px-4 pt-12 pb-[max(1rem,env(safe-area-inset-bottom))] lg:px-5 lg:pb-4 " + (ended ? "hidden" : "")}>
            <div className="mb-2 flex gap-2 lg:hidden">
              {chapters.length > 1
                ? chapters.map((c) => (
                    <button
                      key={c.kind}
                      type="button"
                      data-chapter={c.kind}
                      aria-current={kind === c.kind ? "true" : undefined}
                      onClick={onChapter}
                      className={"inline-flex min-h-12 flex-1 items-center justify-center px-3 text-center text-base leading-tight font-normal transition-colors " + (kind === c.kind ? "border border-rose-light/55 text-white" : "border border-white/35 bg-black/40 text-white")}
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
              <button type="button" onClick={toggleFull} data-atelier-fullscreen aria-pressed={full} aria-label={full ? t.viewer.exitFullscreen : t.feature.fullscreen} className={btn}>
                {full ? <Minimize className="size-5" aria-hidden="true" /> : <Maximize className="size-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        {/* Leave (computers), then "Up next": beside the film on a computer, under it on a phone (the room scrolls down to it). */}
        <div className={"ar-side lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:items-end lg:self-stretch lg:justify-self-end lg:py-8 " + (list ? "" : "hidden")}>
          <div className="hidden lg:flex lg:flex-col lg:items-end">
            <button type="button" onClick={close} data-atelier-close className="inline-flex min-h-12 items-center gap-3 border border-white/35 bg-black/40 px-5 text-base font-medium uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.75rem]">
              <X className="size-5" aria-hidden="true" /> {t.films.leave}
            </button>
            {world ? (
              <Link to={"/pieces/" + slug} replace data-atelier-world className="mt-3 flex min-h-12 items-center justify-end gap-2 text-base font-medium uppercase tracking-[0.12em] text-white hover:text-rose-light">
                {t.common.enterWorld} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
          {list ? (
            <nav aria-labelledby="atelier-upnext-title" data-atelier-upnext className="w-full lg:mt-6 lg:flex lg:min-h-0 lg:w-[21rem] lg:flex-1 lg:flex-col">
              <h3 id="atelier-upnext-title" className="eyebrow [text-shadow:0_2px_18px_rgba(0,0,0,0.9)]">
                {t.films.upNext}
              </h3>
              <ol className="mt-3 border-t border-white/15 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:pe-2">
                {upNext.map((f) => (
                  <li key={f.slug} className="border-b border-white/10">
                    <button type="button" onClick={() => pick(f.slug)} data-upnext={f.slug} className="group flex min-h-12 w-full items-center gap-4 py-3 text-start transition-colors">
                      <span className="relative block aspect-[4/5] w-20 shrink-0 overflow-hidden border border-white/10 bg-black lg:w-16">
                        {f.poster ? (
                          <img
                            src={f.poster}
                            srcSet={f.srcSet}
                            sizes="(max-width: 1023px) 80px, 64px"
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
                          />
                        ) : null}
                        <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                          <Play className="size-5 translate-x-px fill-current text-white" />
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="title-caps block text-base leading-snug tracking-[0.08em] break-words text-white transition-colors group-hover:text-rose-light">{f.title}</span>
                        <span className="mt-1 block text-base text-mist tabular-nums lg:text-[0.8125rem]">
                          <span className="sr-only">{t.films.duration(filmTime(f.duration))}</span>
                          <span aria-hidden="true">{filmTime(f.duration)}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          ) : null}
        </div>
      </div>

    </div>
  );
  return createPortal(room, document.body);
}
