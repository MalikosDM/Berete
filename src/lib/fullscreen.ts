/*
 * Full screen that one can always leave (Yoni, 24/11/2026: "quand j'appuie sur le bouton, il n'est pas fonctionnel"). The
 * frame that holds the film and its buttons goes full screen (never the bare <video>: its buttons would be gone), so the same
 * button enters and leaves; Escape and the gesture of the system leave too. Safari on a Mac: webkitRequestFullscreen /
 * webkitExitFullscreen. An iPhone has no full screen for an element: the film goes into the player of the system, whose own
 * "Done" brings it back. On leaving, the page is where it was (its scroll), the film goes on, its sound as it was.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { getLenis } from "@/lib/gsap";

type FsElement = HTMLElement & { webkitRequestFullscreen?: () => void };
type FsVideo = HTMLVideoElement & { webkitEnterFullscreen?: () => void; webkitDisplayingFullscreen?: boolean };
type FsDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };

/** The element shown full screen now, if any (standard or Safari). */
export function fullscreenElement(): Element | null {
  const doc = document as FsDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

/** Leaves full screen (standard or Safari). */
export function exitFullscreen(): void {
  const doc = document as FsDocument;
  if (doc.fullscreenElement && doc.exitFullscreen) void doc.exitFullscreen().catch(() => undefined);
  else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) doc.webkitExitFullscreen();
}

/**
 * The full screen of a frame and its film: whether it is full screen, and the toggle of its button. The page comes back to
 * where it was when it leaves (whatever made it leave: the button, Escape, the system).
 */
export function useFullscreen(frameRef: RefObject<HTMLElement | null>, videoRef: RefObject<HTMLVideoElement | null>) {
  const [full, setFull] = useState(false);
  const scroll = useRef<number | null>(null);
  const wasPlaying = useRef(false);

  useEffect(() => {
    const onChange = () => {
      const on = fullscreenElement() === frameRef.current && frameRef.current !== null;
      setFull(on);
      if (on || scroll.current === null) return;
      // Back on the page: where it was, the film going on.
      const y = scroll.current;
      scroll.current = null;
      const back = () => {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
        else window.scrollTo(0, y);
      };
      back();
      window.requestAnimationFrame(back);
      const video = videoRef.current;
      if (video && wasPlaying.current && video.paused) void video.play().catch(() => undefined);
    };
    // Escape always leaves it (the browser does it too; this one for the browsers that let the page hear the key).
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreenElement() === frameRef.current && frameRef.current !== null) exitFullscreen();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      document.removeEventListener("keydown", onKey);
    };
  }, [frameRef, videoRef]);

  const toggle = useCallback(() => {
    const frame = frameRef.current as FsElement | null;
    const video = videoRef.current as FsVideo | null;
    if (!frame) return;
    if (fullscreenElement() === frame) {
      exitFullscreen();
      return;
    }
    scroll.current = window.scrollY;
    wasPlaying.current = Boolean(video && !video.paused);
    if (frame.requestFullscreen) void frame.requestFullscreen().catch(() => video?.webkitEnterFullscreen?.());
    else if (frame.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    // An iPhone: the player of the system (its "Done" brings the film back to the page).
    else video?.webkitEnterFullscreen?.();
  }, [frameRef, videoRef]);

  return { full, toggle };
}
