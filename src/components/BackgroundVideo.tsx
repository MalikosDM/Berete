import { useEffect, useRef, useState, type ReactNode } from "react";

/*
 * Written by the platform - do not edit.
 * A full-bleed background video for the section it wraps: muted, looping,
 * inline, with a poster, a contrast overlay and a still image when the
 * visitor prefers reduced motion.
 */
const VIDEO_SRC: string | null = "/videos/background.mp4";
const VIDEO_POSTER: string | null = null;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function BackgroundVideo({
  children,
  poster,
  className = "",
  overlayClassName = "bg-black/45",
}: {
  children?: ReactNode;
  /** A still shown before the video plays, and instead of it with reduced motion. */
  poster?: string;
  className?: string;
  /** The tint laid over the video so the text on it reads (a Tailwind background class). */
  overlayClassName?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reduce, setReduce] = useState(prefersReducedMotion);
  const still = VIDEO_POSTER ?? poster ?? null;

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (video === null) return undefined;
    video.muted = true;
    const play = () => { void video.play().catch(() => undefined); };
    if (typeof IntersectionObserver === "undefined") {
      play();
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) play();
      else video.pause();
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, [reduce]);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      {VIDEO_SRC !== null && !reduce ? (
        <video
          ref={ref}
          className="absolute inset-0 -z-20 h-full w-full object-cover"
          src={VIDEO_SRC}
          poster={still ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
      ) : still !== null ? (
        <img src={still} alt="" aria-hidden="true" className="absolute inset-0 -z-20 h-full w-full object-cover" />
      ) : null}
      <div aria-hidden="true" className={`absolute inset-0 -z-10 ${overlayClassName}`} />
      {children}
    </div>
  );
}
