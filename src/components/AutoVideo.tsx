import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

/* Forces a video into the muted, inline state browsers require for autoplay (React never writes the muted attribute). */
export function forceMuted(v: HTMLVideoElement): void {
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  v.setAttribute("webkit-playsinline", "");
}

type AutoVideoProps = { src: string; label: string; className?: string; loop?: boolean };

/* A video that plays by itself, muted, while it is on screen. */
export default function AutoVideo({ src, label, className = "", loop = true }: AutoVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    forceMuted(v);
    let visible = true;
    const play = () => {
      if (!visible) return;
      forceMuted(v);
      v.play()
        .then(() => setBlocked(false))
        .catch(() => {
          setBlocked(true);
          window.addEventListener("pointerdown", play, { once: true, passive: true });
          window.addEventListener("touchstart", play, { once: true, passive: true });
        });
    };
    let io: IntersectionObserver | null = null;
    if (typeof IntersectionObserver === "undefined") play();
    else {
      io = new IntersectionObserver(
        ([entry]) => {
          visible = Boolean(entry?.isIntersecting);
          if (visible) play();
          else v.pause();
        },
        { threshold: 0.15 },
      );
      io.observe(v);
    }
    return () => {
      io?.disconnect();
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("touchstart", play);
      v.pause();
    };
  }, [src]);

  const tapToPlay = () => {
    const v = ref.current;
    if (!v) return;
    forceMuted(v);
    v.play()
      .then(() => setBlocked(false))
      .catch(() => undefined);
  };

  return (
    <div className="relative h-full w-full">
      <video ref={ref} src={src} autoPlay muted loop={loop} playsInline preload="auto" disablePictureInPicture aria-label={label} className={className} />
      {blocked ? (
        <button
          type="button"
          onClick={tapToPlay}
          aria-label="Play the video"
          className="absolute top-1/2 left-1/2 z-10 inline-flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-black/50 text-white backdrop-blur-sm hover:text-rose-light"
        >
          <Play className="size-8 translate-x-0.5 fill-current" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
