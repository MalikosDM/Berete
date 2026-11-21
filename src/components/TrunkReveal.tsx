import { useEffect, useRef, useState, type CSSProperties } from "react";
import { RotateCcw, X } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { forceMuted } from "@/components/Media";
import type { Trunk } from "@/data/trunks";
import { useI18n } from "@/i18n";
import { useReducedMotion } from "@/lib/gsap";
import { waLink } from "@/lib/site";

type State = "closed" | "opening" | "open";

/** The few sparks of the golden light, always at the same places (the server and the browser draw the same page). */
const SPARKS = Array.from({ length: 9 }, (_, i) => ({ x: 18 + ((i * 37) % 64), d: (i * 0.47) % 3.2, s: 2 + (i % 3), t: 3.4 + (i % 4) * 0.6 }));

/**
 * A Signature Trunk that opens (feedback of Yoni, 21/11/2026): first closed (its image), at a click or a touch the film of
 * its opening plays in its place, silent, and its golden light comes out, made a little brighter by a halo that breathes and
 * a few sparks (src/index.css, ".trunk-glow"); at the end it stays open (its image, faded in over the last frame of the
 * film: no jump) and the button to create one's own appears in its light, a WhatsApp message already written that names
 * it. Two small links: watch the opening again, close it. The film loads only when the trunk comes near the screen or
 * under the pointer. Asked for less motion: the click shows it open at once, with its button.
 */
export default function TrunkReveal({ name, trunk }: { name: string; trunk: Trunk }) {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [state, setState] = useState<State>("closed");
  const [load, setLoad] = useState(false);
  // The film shows its first frame: the closed image can go.
  const [playing, setPlaying] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // The film loads once the trunk comes near the screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || load || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setLoad(true);
      },
      { rootMargin: "240px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [load]);

  // Opening: the film from its first frame; if it cannot play, the trunk simply opens.
  useEffect(() => {
    const v = videoRef.current;
    if (state !== "opening" || !v) return;
    forceMuted(v);
    v.currentTime = 0;
    v.play().catch(() => setState("open"));
  }, [state, load]);

  const open = () => {
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

  const set = (state: "closed" | "open", ext: string) => trunk.widths.map((w) => trunk.base + "/" + state + "-" + w + "." + ext + " " + w + "w").join(", ");
  const sizes = "(max-width: 639px) 92vw, (max-width: 1279px) 46vw, 30vw";
  const picture = (which: "closed" | "open", shown: boolean) => (
    <picture className={"absolute inset-0 transition-opacity ease-out " + (which === "open" ? "duration-500 " : "duration-300 ") + (shown ? "opacity-100" : "opacity-0")} data-trunk-image={which}>
      <source type="image/avif" srcSet={set(which, "avif")} sizes={sizes} />
      <img src={trunk.base + "/" + which + "-1080.webp"} srcSet={set(which, "webp")} sizes={sizes} alt={which === "closed" ? name : ""} width={trunk.size} height={trunk.size} loading="lazy" decoding="async" className="h-full w-full object-cover" />
    </picture>
  );
  const [lx, ly] = trunk.light;

  return (
    <div ref={rootRef} data-trunk-state={state} className="trunk-reveal" style={{ "--lx": lx, "--ly": ly } as CSSProperties}>
      <div className="relative aspect-square w-full overflow-hidden bg-[#050403]" onPointerEnter={() => setLoad(true)}>
        <video
          ref={videoRef}
          data-trunk-video
          src={load ? trunk.video : undefined}
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
        {picture("closed", state === "closed" || (state === "opening" && !playing))}
        {picture("open", state === "open")}
        {/* The golden light, a little brighter: a halo that breathes, a few sparks rising (decoration). */}
        <span aria-hidden="true" className="trunk-glow">
          {SPARKS.map((s, i) => (
            <i key={i} style={{ left: s.x + "%", width: s.s, height: s.s, animationDelay: s.d + "s", animationDuration: s.t + "s" }} />
          ))}
        </span>
        {state === "closed" ? (
          <button type="button" onClick={open} data-trunk-open aria-label={t.boxes.openTrunk(name)} className="group absolute inset-0 flex cursor-pointer items-end justify-center pb-5 text-white">
            <span className="inline-flex min-h-11 items-center gap-2 border border-rose-light/60 bg-ink/55 px-5 text-base font-semibold uppercase tracking-[0.16em] backdrop-blur-sm transition-colors group-hover:border-rose-light group-hover:text-rose-light">
              {t.boxes.openHint}
            </span>
          </button>
        ) : null}
        {state === "open" ? (
          <a
            href={waLink(t.whatsapp.trunk(name))}
            target="_blank"
            rel="noreferrer"
            data-trunk-create
            className="trunk-create absolute inline-flex min-h-12 items-center gap-2.5 whitespace-nowrap bg-white px-5 text-base font-semibold tracking-[0.06em] text-ink shadow-[0_0_44px_rgba(255,214,150,0.55)] transition-colors hover:bg-rose-light"
          >
            <BrandIcon name="whatsapp" className="size-4.5" /> {t.boxes.createOwn}
          </a>
        ) : null}
        {state === "open" ? (
          // Discreet, at the foot of the square (the names of the trunks stay aligned under their squares).
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
    </div>
  );
}
