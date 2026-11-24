import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import type { FeatureFilmData } from "@/data/featureFilms";
import { useI18n } from "@/i18n";


/**
 * A film in its own section (Yoni, 22-23/11/2026; 24/11/2026: the film of the finished piece on every page of a piece, right
 * after its opening): it plays silently, in a loop, when it comes on screen and rests when it leaves — no button to press; a
 * small button gives its sound (when it has one), another shows it full screen. Always whole in the screen, never cut nor
 * wider than it. Never before it is near (its file is asked for then), never on its own with "reduce motion" (a button plays
 * it). On a phone, its lighter copy.
 */
export default function FeatureFilm({ film, id, anchor, label, eyebrow, title, children, data, flip = false, compact = false }: { film: FeatureFilmData; id: string; anchor?: string; label: string; eyebrow: string; title: string; children?: ReactNode; data: string; flip?: boolean; compact?: boolean }) {
  const { t } = useI18n();
  const frameRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | undefined>(undefined);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const still = useRef(false);

  useEffect(() => {
    const frame = frameRef.current;
    const video = videoRef.current;
    if (!frame || !video || typeof IntersectionObserver === "undefined") return undefined;
    still.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const phone = window.matchMedia("(max-width: 767px)").matches || Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    const file = phone && film.mobile ? film.mobile : film.video;
    // Its file near the screen; it plays while it is on screen.
    const near = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setSrc(file);
          near.disconnect();
        }
      },
      { rootMargin: "60% 0px" },
    );
    const seen = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting && !still.current) {
          setSrc(file);
          void video.play().catch(() => undefined);
        } else if (!e.isIntersecting) video.pause();
      },
      { threshold: 0.35 },
    );
    near.observe(frame);
    seen.observe(frame);
    return () => {
      near.disconnect();
      seen.disconnect();
    };
  }, [film.video, film.mobile]);

  // Its file just given: it starts if it is on screen.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src || still.current) return;
    const r = frameRef.current?.getBoundingClientRect();
    if (r && r.bottom > 0 && r.top < window.innerHeight) void video.play().catch(() => undefined);
  }, [src]);

  const toggleSound = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = !muted;
    video.muted = next;
    setMuted(next);
    if (!next) void video.play().catch(() => undefined);
  };
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (!src) setSrc(film.video);
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  };
  const fullScreen = () => {
    const frame = frameRef.current as (HTMLDivElement & { webkitRequestFullscreen?: () => void }) | null;
    const video = videoRef.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (!video) return;
    if (!src) setSrc(film.video);
    void video.play().catch(() => undefined);
    if (frame?.requestFullscreen) void frame.requestFullscreen().catch(() => video.webkitEnterFullscreen?.());
    else if (frame?.webkitRequestFullscreen) frame.webkitRequestFullscreen();
    else video.webkitEnterFullscreen?.();
  };

  const btn = "inline-flex size-12 items-center justify-center rounded-full border border-white/35 bg-ink/60 text-white backdrop-blur-sm transition-colors hover:border-rose-light hover:text-rose-light lg:size-10";
  // Whole in the screen: as high as the screen allows (under the menu), as wide as the page allows.
  const tall = compact ? "min(74svh, 40rem" : "min(86svh, 52rem";
  return (
    <section id={anchor} aria-labelledby={id} data-feature-film={data} className="scroll-mt-24 border-t border-white/10">
      <div className={"mx-auto grid items-center gap-8 px-5 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:px-12 " + (compact ? "max-w-[1240px] py-14 lg:py-16" : "max-w-[1400px] py-16 lg:py-24")}>
        <div className={"flex justify-center lg:col-span-7 " + (flip ? "lg:order-2" : "")}>
          <div
            ref={frameRef}
            data-feature-frame
            className="feature-film relative max-w-full overflow-hidden border border-white/10 bg-black"
            style={{ aspectRatio: film.width + " / " + film.height, height: tall + ", calc((100vw - 2.5rem) * " + film.height + " / " + film.width + "))" }}
          >
            <video
              ref={videoRef}
              src={src}
              poster={film.poster}
              muted={muted}
              loop
              playsInline
              preload="none"
              aria-label={label}
              data-feature-video
              onPlaying={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onClick={togglePlay}
              className="h-full w-full cursor-pointer object-contain"
            />
            <div className="absolute end-2.5 bottom-2.5 flex gap-1.5">
              <button type="button" onClick={togglePlay} data-feature-play aria-label={playing ? t.feature.pause : t.feature.play} className={btn}>
                {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4 translate-x-0.5" aria-hidden="true" />}
              </button>
              {film.audio ? (
                <button type="button" onClick={toggleSound} data-feature-sound aria-pressed={!muted} aria-label={muted ? t.feature.soundOn : t.feature.soundOff} className={btn}>
                  {muted ? <VolumeX className="size-4" aria-hidden="true" /> : <Volume2 className="size-4" aria-hidden="true" />}
                </button>
              ) : null}
              <button type="button" onClick={fullScreen} data-feature-fullscreen aria-label={t.feature.fullscreen} className={btn}>
                <Maximize className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <div className={"lg:col-span-5 " + (flip ? "lg:order-1" : "")}>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={id} className="title-caps mt-4 t-title leading-[1.15] tracking-[0.1em] text-white [text-wrap:balance]">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </section>
  );
}
