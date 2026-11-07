import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import Logo from "@/components/Logo";
import type { MediaItem } from "@/data/types";

type ImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & { src: string; alt: string };

/** An image that never shows a broken icon: a missing file becomes black with the logo as a watermark. */
export function Img({ src, alt, className = "", ...rest }: ImgProps) {
  const [failed, setFailed] = useState<string | null>(null);
  if (!src || failed === src) {
    const a11y = alt ? { role: "img", "aria-label": alt } : { "aria-hidden": true as const };
    return (
      <span {...a11y} className={"flex items-center justify-center overflow-hidden bg-ink-soft " + className}>
        <Logo variant="mark" position="center" className="h-1/4 w-1/2 opacity-20" />
      </span>
    );
  }
  return <img {...rest} src={src} alt={alt} onError={() => setFailed(src)} className={className} />;
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
      preload="metadata"
      aria-label={label}
      disablePictureInPicture
      className={className}
    />
  );
}

/**
 * One photo or video of the catalogue. A jewel shot on black is blended into
 * the page (no frame, "contain"); any other photo fills its box ("cover").
 */
export function MediaView({ item, alt, className = "", eager = false, fit }: { item: MediaItem; alt?: string; className?: string; eager?: boolean; fit?: "contain" | "cover" }) {
  const label = alt ?? item.alt ?? "";
  const mode = fit ?? (item.onBlack ? "contain" : "cover");
  const look = (mode === "contain" ? "object-contain " : "object-cover ") + (item.onBlack ? "mix-blend-lighten " : "");
  if (item.type === "video") return <LoopVideo item={item} label={label} className={"h-full w-full " + look + className} />;
  return (
    <Img
      src={item.src}
      alt={label}
      width={item.width}
      height={item.height}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={"h-full w-full select-none " + look + className}
    />
  );
}
