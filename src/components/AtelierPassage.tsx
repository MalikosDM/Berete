import { useEffect, useRef, useState } from "react";
import { ArrowRight, Play } from "lucide-react";
import AtelierRoom from "@/components/AtelierRoom";
import { forceMuted } from "@/components/Media";
import Reveal from "@/components/Reveal";
import { filmTime, type ResolvedAtelier } from "@/data/atelier";
import type { Piece } from "@/data/types";
import { useI18n } from "@/i18n";
import { wantsLight } from "@/lib/films";
import { useReducedMotion } from "@/lib/gsap";

/** The short side of the light copy of a film, at most (scripts/import-media.mjs: 720p, 540p from a small film). */
const LIGHT_SHORT = 720;

/**
 * Whether the frame of the making-of shows more pixels than its light copy holds: a computer with a sharp screen (a Retina
 * Mac: its frame of 34rem is 1088 pixels wide) takes the film in HD; a phone, a slow connection or a plain screen keep the
 * light copy. The film covers its frame (object-fit: cover): the short side of the film drawn, in pixels of the screen.
 */
function wantsHd(frame: HTMLElement, width: number, height: number): boolean {
  if (wantsLight() || !width || !height) return false;
  const box = frame.getBoundingClientRect();
  const scale = Math.max(box.width / width, box.height / height);
  return Math.min(width, height) * scale * (window.devicePixelRatio || 1) > LIGHT_SHORT * 1.1;
}

/** The width of the image of a film (scripts/import-media.mjs: its long side at most 1280 px). */
export const posterWidth = (w: number, h: number) => Math.round(w * Math.min(1, 1280 / Math.max(w, h)));

/**
 * The passage of a piece page towards its atelier (after its photos): its making-of, the two films it holds, and the way
 * in. Its making-of plays here by itself, silent and in a loop, while it is on screen (like the other films of the page,
 * asked by Yoni on 20/11/2026), in its light copy, in HD on a sharp computer screen (21/11/2026); it loads only once on
 * screen, pauses off screen and while the atelier is open. With the sound, from
 * its start: once the visitor has entered (src/components/AtelierRoom.tsx). Asked for less motion: its image only.
 */
export default function AtelierPassage({ piece, madeFor, atelier }: { piece: Piece; madeFor: string; atelier: ResolvedAtelier }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { making, reveal, poster } = atelier;
  const reduced = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hd, setHd] = useState(false);

  // The copy the frame deserves, chosen once the page is there (the server writes the light one; nothing is loaded yet).
  useEffect(() => {
    const v = videoRef.current;
    if (v) setHd(wantsHd(v, making.width, making.height));
  }, [making.width, making.height]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || reduced || open) return undefined;
    forceMuted(v);
    if (typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) v.play().catch(() => undefined);
        else v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      v.pause();
    };
  }, [reduced, open, making.mobile, hd]);

  const chapters = [{ n: "01", name: t.films.making, time: making.duration }, ...(reveal ? [{ n: "02", name: t.films.reveal, time: reveal.duration }] : [])];
  const enter = () => setOpen(true);
  return (
    <section aria-labelledby="atelier-passage-title" data-atelier-passage className="atelier-passage relative overflow-hidden border-y border-white/10">
      <div className="mx-auto grid max-w-[1600px] items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12 lg:py-32">
        {/* The way in is never hidden by an animation (a keyboard reaches it at once). */}
        <div className="lg:col-span-5">
          <p className="eyebrow">{t.films.eyebrow}</p>
          <h2 id="atelier-passage-title" className="title-caps tracking-[0.12em] mt-5 t-title leading-[1.08] text-white [text-wrap:balance]">
            {t.films.enter}
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-bone">{t.films.lead(piece.title, reveal !== null)}</p>
          <ol className="mt-8 max-w-md border-t border-white/15">
            {chapters.map((c) => (
              <li key={c.n} className="flex items-baseline gap-4 border-b border-white/15 py-4">
                <span className="text-rose-gold w-8 font-display text-xl">{c.n}</span>
                <span className="title-caps flex-1 text-lg tracking-[0.12em] text-white">{c.name}</span>
                <span className="text-base text-mist tabular-nums">{filmTime(c.time)}</span>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={enter}
            data-enter-atelier
            className="mt-10 inline-flex min-h-12 items-center justify-center gap-3 border border-rose-light/55 px-6 text-base font-normal uppercase tracking-[0.12em] text-white transition-colors hover:border-rose-light hover:text-rose-light lg:min-h-11 lg:text-[0.75rem]"
          >
            <Play className="size-5 fill-current" aria-hidden="true" /> {t.films.enter}
          </button>
        </div>

        <Reveal className="lg:col-span-6 lg:col-start-7" delay={0.1}>
          {/* The image of the making-of: a second way in, for the pointer (the button above is the way in for the keyboard). */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={enter}
            className="group relative mx-auto block aspect-[4/5] w-full max-w-[34rem] cursor-pointer overflow-hidden border border-rose-light/20 bg-black shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]"
          >
            <video
              ref={videoRef}
              data-atelier-preview
              data-hd={hd ? "" : undefined}
              src={hd ? making.src : making.mobile}
              poster={poster || undefined}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              className="h-full w-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-[1.04]"
            />
            <span className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-black/20" />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="inline-flex size-20 items-center justify-center rounded-full border border-white/50 bg-black/45 text-white backdrop-blur-sm transition-colors group-hover:border-rose-light group-hover:text-rose-light">
                <Play className="size-7 translate-x-0.5 fill-current" />
              </span>
            </span>
            <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 p-5 text-start">
              <span className="title-caps text-lg tracking-[0.12em] text-white">{piece.title}</span>
              <ArrowRight className="size-5 shrink-0 text-rose-light rtl:-scale-x-100" />
            </span>
          </button>
        </Reveal>
      </div>
      {open ? <AtelierRoom title={piece.title} madeFor={madeFor} slug={piece.slug} atelier={atelier} onClose={() => setOpen(false)} /> : null}
    </section>
  );
}
