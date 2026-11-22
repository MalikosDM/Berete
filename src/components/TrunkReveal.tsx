import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, RotateCcw, X } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { forceMuted } from "@/components/Media";
import { cutoutSrc, cutoutSrcSet, type CutoutView } from "@/data/showcase";
import type { Trunk } from "@/data/trunks";
import { Link, useI18n } from "@/i18n";
import { useReducedMotion } from "@/lib/gsap";
import { waLink } from "@/lib/site";

type State = "closed" | "opening" | "open";

/** The few sparks of the light, always at the same places (the server and the browser draw the same page). */
const SPARKS = Array.from({ length: 9 }, (_, i) => ({ x: 18 + ((i * 37) % 64), d: (i * 0.47) % 3.2, s: 2 + (i % 3), t: 3.4 + (i % 4) * 0.6 }));

/** How long a box takes to open from its photos (ms): the closed one fades in a light, the open one appears in it. */
const PHOTO_OPENING = 1700;

export type TrunkPiece = { slug: string; title: string; view: CutoutView | null };

/**
 * A Signature Trunk that opens (Yoni, 21 and 22/11/2026). First closed (its image); at a click or a touch it opens: the
 * film of its opening plays in its place, silent, or, without a film, its closed photo fades into a light coming out of
 * the box and its open photo appears in it. Then its piece, cut out of its photo, rises from the box with a glow and stays
 * floating above it; two buttons come under the square: "Create your trunk" (a WhatsApp message already written that
 * names the box) and "Discover the piece" (its capsule). A box whose piece is not known yet: only the first one, and no
 * piece rises. Two small links on the square: watch the opening again, close it. The film loads only when the box comes
 * near the screen or under the pointer. Asked for less motion: the click shows it open at once, its piece in place.
 */
export default function TrunkReveal({ slug, name, trunk, piece }: { slug: string; name: string; trunk: Trunk; piece: TrunkPiece | null }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>("closed");
  const [load, setLoad] = useState(false);
  // The film shows its first frame: the closed image can go.
  const [playing, setPlaying] = useState(false);
  // Each opening plays its animations again.
  const [round, setRound] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const film = Boolean(trunk.video);

  // The film loads once the box comes near the screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!film || !el || load || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setLoad(true);
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [film, load]);

  // Opening: the film from its first frame (if it cannot play, the box simply opens), or the photos in their light.
  useEffect(() => {
    if (state !== "opening") return undefined;
    if (!film) {
      const id = window.setTimeout(() => setState("open"), PHOTO_OPENING);
      return () => window.clearTimeout(id);
    }
    const v = videoRef.current;
    if (!v) return undefined;
    forceMuted(v);
    v.currentTime = 0;
    v.play().catch(() => setState("open"));
    return undefined;
  }, [state, load, film, round]);

  const open = () => {
    setRound((r) => r + 1);
    if (reduced) {
      setState("open");
      return;
    }
    setLoad(true);
    setPlaying(false);
    setState("opening");
  };
  const close = () => {
    videoRef.current?.pause();
    setPlaying(false);
    setState("closed");
  };

  const set = (which: "closed" | "open", ext: string) => trunk.widths.map((w) => trunk.base + "/" + which + "-" + w + "." + ext + " " + w + "w").join(", ");
  const sizes = "(max-width: 639px) 92vw, (max-width: 1279px) 46vw, 30vw";
  const shown = (which: "closed" | "open") => (which === "closed" ? state === "closed" || (state === "opening" && film && !playing) : state === "open" || (state === "opening" && !film));
  const picture = (which: "closed" | "open") => (
    <picture className="trunk-image absolute inset-0" data-trunk-image={which} data-shown={shown(which) ? "" : undefined}>
      <source type="image/avif" srcSet={set(which, "avif")} sizes={sizes} />
      <img src={trunk.base + "/" + which + "-1080.webp"} srcSet={set(which, "webp")} sizes={sizes} alt={which === "closed" ? name : ""} width={trunk.size} height={trunk.size} loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </picture>
  );
  const [lx, ly] = trunk.light;
  const [fx, fy, fs] = trunk.float;
  const view = piece?.view ?? null;
  const style = { "--lx": lx, "--ly": ly, "--fx": fx, "--fy": fy, "--fs": fs } as CSSProperties;

  return (
    <div ref={rootRef} data-trunk-state={state} data-trunk-kind={film ? "film" : "photos"} className="trunk-reveal" style={style}>
      <div className="relative aspect-square w-full overflow-hidden bg-[#050403]" onPointerEnter={() => film && setLoad(true)}>
        {film ? (
          <video
            ref={videoRef}
            data-trunk-video
            src={load ? trunk.video : undefined}
            poster={trunk.base + "/closed-720.webp"}
            muted
            playsInline
            preload={load ? "auto" : "none"}
            disablePictureInPicture
            aria-hidden="true"
            tabIndex={-1}
            onPlaying={() => setPlaying(true)}
            onEnded={() => setState("open")}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {picture("closed")}
        {picture("open")}
        {/* The light coming out of a box that opens from its photos (decoration). */}
        {!film && state === "opening" ? <span key={"burst" + round} aria-hidden="true" className="trunk-burst" /> : null}
        {/* The light of the open box: a halo that breathes, a few sparks rising (decoration). */}
        <span aria-hidden="true" className="trunk-glow">
          {SPARKS.map((s, i) => (
            <i key={i} style={{ left: s.x + "%", width: s.s, height: s.s, animationDelay: s.d + "s", animationDuration: s.t + "s" }} />
          ))}
        </span>
        {/* Its piece rises from the box and floats above it. */}
        {state === "open" && piece && view ? (
          <span key={"jewel" + round} data-trunk-jewel={piece.slug} className="trunk-jewel" aria-hidden="true">
            <span className="trunk-jewel-glow" />
            <img src={cutoutSrc(piece.slug, view, view.widths[1] ?? view.widths[0]!)} srcSet={cutoutSrcSet(piece.slug, view)} sizes="(max-width: 639px) 46vw, 18vw" alt="" width={view.width} height={view.height} decoding="async" draggable={false} />
          </span>
        ) : null}
        {state === "closed" ? (
          <button type="button" onClick={open} data-trunk-open aria-label={t.boxes.openTrunk(name)} className="group absolute inset-0 flex cursor-pointer items-end justify-center pb-5 text-white">
            <span className="inline-flex min-h-11 items-center gap-2 border border-rose-light/60 bg-ink/55 px-5 text-base font-semibold uppercase tracking-[0.16em] backdrop-blur-sm transition-colors group-hover:border-rose-light group-hover:text-rose-light">
              {t.boxes.openHint}
            </span>
          </button>
        ) : null}
        {state === "open" ? (
          // Discreet, at the foot of the square.
          <p className="trunk-links absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-x-5 bg-linear-to-t from-black/75 to-transparent px-3 pt-8 pb-1 text-base">
            <button type="button" onClick={open} data-trunk-replay className="inline-flex min-h-11 items-center gap-2 text-bone hover:text-rose-light">
              <RotateCcw className="size-4" aria-hidden="true" /> {t.boxes.replay}
            </button>
            <button type="button" onClick={close} data-trunk-close className="inline-flex min-h-11 items-center gap-2 text-bone hover:text-rose-light">
              <X className="size-4" aria-hidden="true" /> {t.boxes.closeTrunk}
            </button>
          </p>
        ) : null}
      </div>
      {/* Its two ways on, once it is open. */}
      <div className={"trunk-actions grid transition-[grid-template-rows] duration-500 ease-out " + (state === "open" ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          {state === "open" ? (
            <div key={"actions" + round} data-trunk-actions={slug} className="trunk-actions-in flex flex-wrap gap-3 pt-5">
              <a
                href={waLink(t.whatsapp.trunk(name))}
                target="_blank"
                rel="noreferrer"
                data-trunk-create
                className="inline-flex min-h-12 flex-1 basis-48 items-center justify-center gap-2.5 bg-white px-3 text-center text-base font-semibold tracking-[0.04em] text-ink transition-colors hover:bg-rose-light"
              >
                <BrandIcon name="whatsapp" className="size-4.5" /> {t.boxes.createOwn}
              </a>
              {piece ? (
                <Link to={"/pieces/" + piece.slug} data-trunk-piece={piece.slug} className="inline-flex min-h-12 flex-1 basis-48 items-center justify-center gap-2.5 border border-rose-light/70 px-3 text-center text-base font-semibold tracking-[0.04em] text-white transition-colors hover:border-rose-light hover:text-rose-light">
                  {t.boxes.discoverPiece} <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
