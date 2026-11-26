import { useEffect, useState, type RefObject } from "react";
import { useI18n } from "@/i18n";

/** Moves a film to a time (seconds). */
function moveTo(v: HTMLVideoElement | null, to: number): void {
  if (v) v.currentTime = to;
}

/**
 * The bar of a film (Yoni, 25/11/2026): where the film is, and a handle to pull forward or back, with the mouse as with a
 * finger. Its track is a fine line of rose gold; its hit area stays 48 px high on a phone (the rule of the buttons).
 */
export default function SeekBar({ video, className = "" }: { video: RefObject<HTMLVideoElement | null>; className?: string }) {
  const { t } = useI18n();
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const v = video.current;
    if (!v) return undefined;
    let frame = 0;
    const read = () => {
      setTime(v.currentTime);
      if (Number.isFinite(v.duration) && v.duration > 0) setDuration(v.duration);
    };
    // Smooth while it plays, at once when it is moved or loaded.
    const loop = () => {
      read();
      frame = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      read();
    };
    v.addEventListener("loadedmetadata", read);
    v.addEventListener("durationchange", read);
    v.addEventListener("seeked", read);
    v.addEventListener("playing", start);
    v.addEventListener("pause", stop);
    v.addEventListener("ended", stop);
    read();
    if (!v.paused) start();
    return () => {
      cancelAnimationFrame(frame);
      v.removeEventListener("loadedmetadata", read);
      v.removeEventListener("durationchange", read);
      v.removeEventListener("seeked", read);
      v.removeEventListener("playing", start);
      v.removeEventListener("pause", stop);
      v.removeEventListener("ended", stop);
    };
  }, [video]);

  const seek = (to: number) => {
    moveTo(video.current, to);
    setTime(to);
  };
  const share = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  return (
    <input
      type="range"
      min={0}
      max={duration || 1}
      step={0.04}
      value={Math.min(time, duration || 1)}
      disabled={duration === 0}
      onChange={(e) => seek(Number(e.currentTarget.value))}
      // A drag on the bar never reaches what is under it (the zoom of a photo, the click that plays the film).
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      aria-label={t.feature.progress}
      aria-valuetext={Math.round(time) + " s / " + Math.round(duration) + " s"}
      data-seek
      className={"seek " + className}
      style={{ ["--seek" as string]: share + "%" }}
    />
  );
}
