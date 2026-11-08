import { useEffect, useRef, useState, type ImgHTMLAttributes, type RefObject } from "react";
import Logo from "@/components/Logo";
import type { MediaItem } from "@/data/types";
import { afterLoad } from "@/lib/idle";
import { SIZES_FOR, srcSetOf } from "@/lib/responsive";

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & { src: string; alt: string };

/**
 * An image that never shows a broken icon: a missing file becomes black with the logo as a watermark.
 * When one of its smaller copies (srcSet) is missing, it shows the photo itself.
 */
export function Img({ src, alt, className = "", srcSet, sizes, ...rest }: ImgProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const [plain, setPlain] = useState<string | null>(null);
  if (!src || failed === src) {
    const a11y = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true as const };
    return (
      <span {...a11y} className={"flex items-center justify-center overflow-hidden bg-ink-soft " + className}>
        <Logo variant="mark" position="center" className="h-1/4 w-1/2 opacity-20" />
      </span>
    );
  }
  const copies = srcSet && plain !== src ? { srcSet, sizes } : {};
  return <img {...rest} {...copies} src={src} alt={alt} onError={() => (copies.srcSet ? setPlain(src) : setFailed(src))} className={className} />;
}

/** Forces a video into the muted, inline state browsers require to play it by itself. */
export function forceMuted(v: HTMLVideoElement): void {
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
}

/** A silent video that loops only while it is on screen (atelier, details of a piece). */
export function LoopVideo({ item, label, className = "" }: { item: MediaItem; label: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    forceMuted(v);
    if (typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [item.src]);

  return (
    <video
      ref={ref}
      src={item.src}
      poster={item.poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      disablePictureInPicture
      className={className}
    />
  );
}

/**
 * One photo or video of the catalogue. A jewel shot on black is blended into
 * the page (no frame, "contain"); any other photo fills its box ("cover").
 * `sizes`: the width it takes on screen, so the browser picks the lightest
 * copy that stays sharp (src/lib/responsive.ts).
 * `eager`: a photo of the top of the page, put in the page at once. The others
 * wait until the page has loaded (or until they are on screen), then load as
 * the visitor comes near them. `priority`: the one main photo of the page,
 * downloaded before anything else.
 */
export function MediaView({ item, alt, className = "", eager = false, priority = false, fit, sizes = SIZES_FOR.half }: { item: MediaItem; alt?: string; className?: string; eager?: boolean; priority?: boolean; fit?: "contain" | "cover"; sizes?: string }) {
  const [spot, ready] = useWhenNeeded(eager || priority);
  const label = alt ?? item.alt ?? "";
  const mode = fit ?? (item.onBlack ? "contain" : "cover");
  const look = (mode === "contain" ? "object-contain " : "object-cover ") + (item.onBlack ? "mix-blend-lighten " : "");
  if (!ready) return <span ref={spot} aria-hidden="true" className={"block h-full w-full " + className} />;
  if (item.type === "video") return <LoopVideo item={item} label={label} className={"h-full w-full " + look + className} />;
  return (
    <Img
      src={item.src}
      srcSet={srcSetOf(item.src, item.width)}
      sizes={sizes}
      alt={label}
      width={item.width}
      height={item.height}
      loading={eager || priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      draggable={false}
      className={"h-full w-full select-none " + look + className}
    />
  );
}

/** Once the first page has loaded, the next pages show their photos at once. */
let pageLoaded = false;

/**
 * Whether a photo may be put in the page: at once for the top of the page; for
 * the others, once the page has loaded (they then load as the visitor comes
 * near them), or as soon as they are on screen. Before that, an empty box of
 * the same size holds their place.
 */
function useWhenNeeded(eager: boolean): [RefObject<HTMLSpanElement | null>, boolean] {
  const spot = useRef<HTMLSpanElement>(null);
  const [ready, setReady] = useState(eager || pageLoaded);
  useEffect(() => {
    if (ready) return undefined;
    const cancel = afterLoad(
      () => {
        pageLoaded = true;
        setReady(true);
      },
      { delay: 1000 },
    );
    let io: IntersectionObserver | null = null;
    if (spot.current && typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) setReady(true);
      });
      io.observe(spot.current);
    }
    return () => {
      cancel();
      io?.disconnect();
    };
  }, [ready]);
  return [spot, ready];
}
