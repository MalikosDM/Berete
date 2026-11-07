/*
 * The story player: ONE <video> element for every video of every story.
 * The tap on a bubble starts it inside the gesture, so the browser allows the
 * sound from then on (iOS Safari included). The visitor's sound choice is kept
 * for the whole visit.
 */
import type { MediaItem, Story } from "@/data/types";

const SOUND_KEY = "bj-story-sound";
let element: HTMLVideoElement | null = null;
let soundChoice: boolean | null = null;

export function storyVideo(): HTMLVideoElement | null {
  if (typeof document === "undefined") return null;
  if (element === null) {
    const v = document.createElement("video");
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.setAttribute("disablepictureinpicture", "");
    v.preload = "auto";
    v.dataset.storyVideo = "";
    v.className = "pointer-events-none h-full w-full object-cover";
    element = v;
  }
  return element;
}

/** Sound is on by default; muting it from a story keeps it muted for the visit. */
export function soundWanted(): boolean {
  if (soundChoice === null) {
    try {
      soundChoice = sessionStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      soundChoice = true;
    }
  }
  return soundChoice;
}

export function setSoundWanted(on: boolean): void {
  soundChoice = on;
  try {
    sessionStorage.setItem(SOUND_KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable: kept in memory for the visit */
  }
}

export function setSound(v: HTMLVideoElement, on: boolean): void {
  v.muted = !on;
  v.defaultMuted = !on;
  if (on) v.removeAttribute("muted");
  else v.setAttribute("muted", "");
}

export const isAbort = (e: unknown): boolean => e instanceof DOMException && e.name === "AbortError";

/** The items of a story; a story without files shows its cover. */
export function itemsOf(story: Story): MediaItem[] {
  if (story.media.length > 0) return story.media;
  return story.cover ? [{ type: "image", src: story.cover, alt: story.title }] : [];
}

/**
 * Called inside the tap on a bubble. Starts the shared video in the gesture so
 * that the sound is allowed for the rest of the visit, then lets the viewer
 * take over.
 */
export function primeStoryVideo(story: Story): void {
  const v = storyVideo();
  if (!v) return;
  const first = itemsOf(story)[0];
  const anyVideo = first?.type === "video" ? first : itemsOf(story).find((m) => m.type === "video");
  setSound(v, soundWanted());
  if (anyVideo) {
    if (v.getAttribute("src") !== anyVideo.src) v.src = anyVideo.src;
    const started = v.play();
    if (first?.type !== "video") v.pause();
    started.catch(() => undefined);
  }
}

/** Warms the cache with the next file, so the next step starts at once. */
export function preload(item: MediaItem | undefined): void {
  if (!item || typeof document === "undefined") return;
  const image = item.type === "image" ? item.src : item.poster;
  if (image) {
    const img = new Image();
    img.decoding = "async";
    img.src = image;
  }
  if (item.type === "video" && !document.querySelector('link[data-story-prefetch="' + item.src + '"]')) {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = item.src;
    link.dataset.storyPrefetch = item.src;
    document.head.appendChild(link);
  }
}
