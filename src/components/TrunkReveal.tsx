import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RotateCcw, X } from "lucide-react";
import { forceMuted } from "@/components/Media";
import { cutoutSrc, cutoutSrcSet, type CutoutView } from "@/data/showcase";
import { trunkImage, type Trunk } from "@/data/trunks";
import { useI18n } from "@/i18n";
import { useReducedMotion } from "@/lib/gsap";

/**
 * Where a box is: closed; opening (its film); open (its piece above it, its buttons); lowering (its piece goes back into it,
 * before it closes); closing (its film backwards); rewinding (its piece goes back, the closed image comes back, before it
 * opens again).
 */
type Phase = "closed" | "opening" | "open" | "lowering" | "closing" | "rewinding";

/** The few sparks of the light, always at the same places (the server and the browser draw the same page). */
const SPARKS = Array.from({ length: 9 }, (_, i) => ({ x: 18 + ((i * 37) % 64), d: (i * 0.47) % 3.2, s: 2 + (i % 3), t: 3.4 + (i % 4) * 0.6 }));

/** How long its piece takes to go back into it (ms, as .trunk-jewel[data-leaving] in src/index.css); without a piece, its buttons. */
const LOWER = 750;
const LOWER_EMPTY = 320;
/** How long the closed image takes to come back over the open one before the opening is watched again (as [data-fade]). */
const REWIND = 650;
/** How long a film fades out over the image it ends on, before it goes back to its start (as .trunk-film). */
const FILM_FADE = 450;

export type TrunkPiece = { slug: string; title: string; view: CutoutView | null };

/**
 * A Signature Trunk that opens and closes again (Yoni, 21 and 22/11/2026). First closed (its image). At "Open" (a click or
 * a touch anywhere on it) the film of its opening plays, silent; at its end, its open image is under it and the film fades
 * away; its piece, cut out of its photo, rises from the box with a glow and floats above it, and two buttons come under the
 * square: "Create your trunk" (a WhatsApp message already written that names the box) and "Discover the piece" (its
 * capsule); a box whose piece is not known yet: only the first one, and no piece rises. On the open box: "Close" (its
 * buttons go, its piece goes back into it, then the film of its closing plays and it ends closed, "Open" again) and "Watch
 * the opening again" (its piece goes back, the closed image comes back, the opening plays). As many times as wanted.
 *
 * Without any jump: each film stays hidden until it really plays (the image under it is its first frame), and it fades only
 * over the image of its last frame. While a film plays, there is nothing to click. The film of the opening loads when the
 * box comes near the screen or under the pointer, the film of the closing once the box is open. A film that cannot play:
 * the box simply fades to where it was going. Asked for less motion: no film, the box is open or closed at once.
 */
export default function TrunkReveal({ name, trunk, piece, onOpen }: { slug: string; name: string; trunk: Trunk; piece: TrunkPiece | null; onOpen?: (open: boolean) => void }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("closed");
  // The card under it says when it is open (24/11/2026: its photos first, the way to its piece then, small, under them).
  useEffect(() => onOpen?.(phase === "open"), [phase, onOpen]);
  // Which film really plays (its first frame on the screen): only then it is shown.
  const [playing, setPlaying] = useState<"opening" | "closing" | null>(null);
  // The open image comes and goes in a fade (watching the opening again, a film that cannot play), else at once, under a film.
  const [fade, setFade] = useState(false);
  const [loadOpening, setLoadOpening] = useState(false);
  const [loadClosing, setLoadClosing] = useState(false);
  // Each opening plays the animations of its piece and its buttons again.
  const [round, setRound] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const openingRef = useRef<HTMLVideoElement>(null);
  const closingRef = useRef<HTMLVideoElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // The keyboard was on the box: it follows to the next button once the box has opened or closed.
  const refocus = useRef(false);
  const view = piece?.view ?? null;
  const jewel = Boolean(piece && view);

  // The film of the opening loads once the box comes near the screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || loadOpening || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setLoadOpening(true);
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadOpening]);

  // The film of the closing, once the box is open.
  useEffect(() => {
    if (phase === "open" && !reduced) setLoadClosing(true);
  }, [phase, reduced]);

  /** Plays a film from its start (it stays hidden until it plays). False when it has no file yet. */
  const start = (v: HTMLVideoElement | null, fail: () => void): boolean => {
    if (!v || !v.getAttribute("src")) return false;
    forceMuted(v);
    if (!v.paused) return true;
    if (v.currentTime !== 0) v.currentTime = 0;
    v.play().catch(fail);
    return true;
  };
  const failOpening = () => {
    setFade(true);
    setPhase((p) => (p === "opening" ? "open" : p));
  };
  const failClosing = () => {
    setFade(true);
    setPhase((p) => (p === "closing" ? "closed" : p));
  };

  // A film that waited for its file plays once it has it; one that never ends (a network that stalls) gives way.
  useEffect(() => {
    if (phase !== "opening" && phase !== "closing") return undefined;
    const opening = phase === "opening";
    start(opening ? openingRef.current : closingRef.current, opening ? failOpening : failClosing);
    const id = window.setTimeout(opening ? failOpening : failClosing, ((opening ? trunk.duration : trunk.closingDuration) + 8) * 1000);
    return () => window.clearTimeout(id);
  }, [phase, loadOpening, loadClosing, trunk.duration, trunk.closingDuration]);

  // Its piece goes back into it, then it closes, or the closed image comes back, then it opens again.
  useEffect(() => {
    if (phase !== "lowering" && phase !== "rewinding") return undefined;
    const next = phase === "lowering" ? "closing" : "opening";
    const id = window.setTimeout(
      () => {
        setFade(false);
        setPlaying(null);
        setPhase(next);
      },
      phase === "rewinding" ? Math.max(REWIND, jewel ? LOWER : 0) : jewel ? LOWER : LOWER_EMPTY,
    );
    return () => window.clearTimeout(id);
  }, [phase, jewel]);

  // A film that has faded away goes back to its start, hidden: the next time it plays from its first frame.
  useEffect(() => {
    const done = phase === "open" ? openingRef.current : phase === "closed" ? closingRef.current : null;
    if (!done) return undefined;
    const id = window.setTimeout(() => {
      if (done.paused && done.currentTime !== 0) done.currentTime = 0;
    }, FILM_FADE);
    return () => window.clearTimeout(id);
  }, [phase]);

  // The keyboard follows to the button of the new state.
  useEffect(() => {
    if (!refocus.current) return;
    const target = phase === "open" ? closeButtonRef.current : phase === "closed" ? openButtonRef.current : null;
    if (!target) return;
    refocus.current = false;
    target.focus({ preventScroll: true });
  }, [phase]);

  const keepFocus = () => {
    refocus.current = Boolean(rootRef.current?.contains(document.activeElement)) && document.activeElement !== document.body;
  };
  const open = () => {
    if (phase !== "closed") return;
    keepFocus();
    setRound((r) => r + 1);
    if (reduced) {
      setFade(true);
      setPhase("open");
      return;
    }
    setFade(false);
    setPlaying(null);
    setLoadOpening(true);
    setPhase("opening");
    // In the touch itself (a phone allows a film to play then), else as soon as it has its file (above).
    start(openingRef.current, failOpening);
  };
  const close = () => {
    if (phase !== "open") return;
    keepFocus();
    if (reduced) {
      setFade(true);
      setPhase("closed");
      return;
    }
    setPhase("lowering");
  };
  const replay = () => {
    if (phase !== "open") return;
    keepFocus();
    setRound((r) => r + 1);
    if (reduced) return;
    setFade(true);
    setPhase("rewinding");
  };

  const set = (which: "closed" | "open", ext: "avif" | "webp") => trunk.widths.map((w) => trunkImage(trunk, which, w, ext) + " " + w + "w").join(", ");
  const sizes = "(max-width: 639px) 92vw, (max-width: 1279px) 46vw, 30vw";
  const openShown = phase === "open" || phase === "lowering" || phase === "closing";
  const leaving = phase === "lowering" || phase === "rewinding";
  const picture = (which: "closed" | "open") => (
    <picture className="trunk-image absolute inset-0" data-trunk-image={which} data-shown={which === "closed" || openShown ? "" : undefined}>
      <source type="image/avif" srcSet={set(which, "avif")} sizes={sizes} />
      <img
        src={trunkImage(trunk, which, 1080, "webp")}
        srcSet={set(which, "webp")}
        sizes={sizes}
        alt={which === "closed" ? name : t.boxes.openAlt(name)}
        width={trunk.size}
        height={trunk.size}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </picture>
  );
  const film = (which: "opening" | "closing") => (
    <video
      ref={which === "opening" ? openingRef : closingRef}
      data-trunk-video={which}
      data-shown={phase === which && playing === which ? "" : undefined}
      src={(which === "opening" ? loadOpening : loadClosing) ? (which === "opening" ? trunk.opening : trunk.closing) : undefined}
      muted
      playsInline
      preload={(which === "opening" ? loadOpening : loadClosing) ? "auto" : "none"}
      disablePictureInPicture
      aria-hidden="true"
      tabIndex={-1}
      onPlaying={() => setPlaying(which)}
      onEnded={() => setPhase((p) => (p === which ? (which === "opening" ? "open" : "closed") : p))}
      className="trunk-film absolute inset-0 h-full w-full object-cover"
    />
  );
  const [lx, ly] = trunk.light;
  const [fx, fy, fs] = trunk.float;
  const style = { "--lx": lx, "--ly": ly, "--fx": fx, "--fy": fy, "--fs": fs } as CSSProperties;

  return (
    <div ref={rootRef} data-trunk-state={phase} data-trunk-fade={fade ? "" : undefined} className="trunk-reveal" style={style}>
      <div className="relative aspect-square w-full overflow-hidden bg-[#050403]" onPointerEnter={() => setLoadOpening(true)}>
        {picture("closed")}
        {picture("open")}
        {film("opening")}
        {film("closing")}
        {/* The light of the open box: a halo that breathes, a few sparks rising (decoration). */}
        <span aria-hidden="true" className="trunk-glow">
          {SPARKS.map((s, i) => (
            <i key={i} style={{ left: s.x + "%", width: s.s, height: s.s, animationDelay: s.d + "s", animationDuration: s.t + "s" }} />
          ))}
        </span>
        {/* Its piece rises from the box and floats above it; it goes back into it before the box closes. */}
        {(phase === "open" || leaving) && piece && view ? (
          <span key={"jewel" + round} data-trunk-jewel={piece.slug} data-leaving={leaving ? "" : undefined} className="trunk-jewel" aria-hidden="true">
            <span className="trunk-jewel-glow" />
            <img src={cutoutSrc(piece.slug, view, view.widths[1] ?? view.widths[0]!)} srcSet={cutoutSrcSet(piece.slug, view)} sizes="(max-width: 639px) 46vw, 18vw" alt={piece.title} width={view.width} height={view.height} decoding="async" draggable={false} />
          </span>
        ) : null}
        {phase === "closed" ? (
          <button ref={openButtonRef} type="button" onClick={open} data-trunk-open aria-label={t.boxes.openTrunk(name)} className="group absolute inset-0 flex cursor-pointer items-end justify-center pb-5 text-white">
            <span className="trunk-button inline-flex min-h-12 items-center gap-2 border border-rose-light/60 bg-ink/55 px-6 text-base font-medium uppercase tracking-[0.16em] backdrop-blur-sm transition-colors group-hover:border-rose-light group-hover:text-rose-light lg:min-h-11 lg:text-[0.75rem]">
              {t.boxes.openHint}
            </span>
          </button>
        ) : null}
        {phase === "open" || leaving ? (
          <>
            {/* Watch the opening again: discreet, in its corner (no film when less motion is asked). */}
            {reduced ? null : (
            <p key={"replay" + round} className="trunk-links absolute inset-x-0 top-0 flex justify-end bg-linear-to-b from-black/60 to-transparent px-3 pt-1 pb-8" data-leaving={leaving ? "" : undefined}>
              <button type="button" onClick={replay} disabled={phase !== "open"} data-trunk-replay className="inline-flex min-h-12 items-center gap-2 px-1 text-base text-bone hover:text-rose-light">
                <RotateCcw className="size-4" aria-hidden="true" /> {t.boxes.replay}
              </button>
            </p>
            )}
            {/* Close: where "Open" was. */}
            <p key={"close" + round} className="trunk-links absolute inset-x-0 bottom-0 flex justify-center bg-linear-to-t from-black/70 to-transparent px-3 pt-10 pb-5" data-leaving={leaving ? "" : undefined}>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={close}
                disabled={phase !== "open"}
                data-trunk-close
                aria-label={t.boxes.closeTrunk(name)}
                className="trunk-button inline-flex min-h-12 items-center gap-2 border border-rose-light/60 bg-ink/55 px-6 text-base font-medium uppercase tracking-[0.16em] text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.75rem]"
              >
                <X className="size-4" aria-hidden="true" /> {t.boxes.closeHint}
              </button>
            </p>
          </>
        ) : null}
      </div>
      {/* (Since 24/11/2026 no buttons under the open box: the card gives its photos first, then the way to its piece; Begin
          Your Creation once, at the end of the page.) */}
    </div>
  );
}
