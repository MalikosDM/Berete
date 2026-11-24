import { useState } from "react";
import { Check } from "lucide-react";
import Lightbox from "@/components/Lightbox";
import type { MediaItem } from "@/data/types";
import { useI18n } from "@/i18n";
import type { VipSpace, VipUpdate } from "@/lib/models";

/*
 * The follow-up of a commission in the client space (/vip), like a parcel tracking (Yoni, 24/11/2026): the six steps of
 * The Bespoke Journey with the step of the piece, its estimated date (and, when it changed, that it changed), the news of
 * the atelier, newest first: photos full screen with the magnifying glass, videos played in place.
 */

/** A day ("2027-03-12") in words in the language of the page: "12 March 2027", "1er mars 2027". */
function dayInWords(intl: string, day: string, year = true): string {
  const date = new Date(day + "T00:00:00Z");
  if (Number.isNaN(date.getTime())) return day;
  const words = new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }).format(date);
  // French writes the first day of a month "1er".
  return intl.startsWith("fr") && date.getUTCDate() === 1 ? words.replace(/^1(?=\s)/, "1er") : words;
}

/** The day of the visitor's calendar on which something happened ("2027-02-20"). */
function localDay(at: string): string {
  const d = new Date(at);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** The estimated date and the six steps, the step of the piece in rose gold, the steps done marked, the next ones dimmed. */
export function VipJourney({ space }: { space: VipSpace }) {
  const { t, intl } = useI18n();
  const w = t.vip;
  const steps = t.process.steps;
  const stage = Math.max(0, Math.min(steps.length, space.stage));
  const finished = stage >= steps.length;
  const change = space.dateChange;
  const changedOn = change ? localDay(change.at) : "";

  return (
    <section aria-labelledby="vip-journey" data-vip-journey data-stage={stage}>
      {space.estimatedAt && !finished ? (
        <div className="mb-12 border-b border-white/10 pb-10" data-vip-estimate>
          <p className="eyebrow">{w.estimated}</p>
          <p className="title-caps tracking-[0.12em] t-title mt-3 text-white">
            <time dateTime={space.estimatedAt}>{dayInWords(intl, space.estimatedAt)}</time>
          </p>
          {change ? (
            <p className="mt-3 text-sm text-mist" data-vip-estimate-changed>
              {w.estimateChanged(dayInWords(intl, changedOn, changedOn.slice(0, 4) !== String(new Date().getFullYear())), dayInWords(intl, change.previous))}
            </p>
          ) : null}
        </div>
      ) : null}

      <h2 id="vip-journey" className="eyebrow">
        {w.journey}
      </h2>
      <p className="mt-3 text-sm text-mist" data-vip-progress>
        {finished ? w.delivered : w.stepOf(stage + 1, steps.length)}
      </p>

      <ol className="mt-8">
        {steps.map((step, i) => {
          const status = i < stage ? "done" : i === stage ? "current" : "next";
          return (
            <li key={step.title} className="flex gap-5" data-step={status} aria-current={status === "current" ? "step" : undefined}>
              <span className="flex flex-col items-center" aria-hidden="true">
                <span
                  className={
                    "mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors " +
                    (status === "done" ? "border-rose-light bg-rose-light text-ink" : status === "current" ? "border-rose-light shadow-[0_0_0_6px_rgba(232,180,160,0.12)]" : "border-white/25")
                  }
                >
                  {status === "done" ? <Check className="size-3" strokeWidth={2.5} /> : status === "current" ? <span className="size-2 rounded-full bg-rose-light" /> : null}
                </span>
                {i < steps.length - 1 ? <span className={"my-2 w-px flex-1 " + (i < stage ? "bg-rose-light/60" : "bg-white/12")} /> : null}
              </span>
              <div className={"min-w-0 " + (i < steps.length - 1 ? "pb-8" : "")}>
                <p className={"text-xs font-medium uppercase tracking-[0.22em] " + (status === "next" ? "text-white/50" : "text-rose-light")}>
                  <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  <span className="mx-2 opacity-60">·</span>
                  {status === "done" ? w.stepDone : status === "current" ? w.stepCurrent : w.stepNext}
                </p>
                <h3 className={"title-caps mt-2 text-base break-words " + (status === "current" ? "text-white" : status === "done" ? "text-bone" : "text-white/50")}>{step.title}</h3>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** The news of the atelier, newest first. */
export function VipNews({ updates }: { updates: VipUpdate[] }) {
  const { t } = useI18n();
  const w = t.vip;
  const [open, setOpen] = useState<{ items: MediaItem[]; index: number } | null>(null);

  return (
    <section aria-labelledby="vip-news" data-vip-news>
      <h2 id="vip-news" className="eyebrow">
        {w.news}
      </h2>
      {updates.length === 0 ? (
        <p className="mt-6 text-base text-mist">{w.noNews}</p>
      ) : (
        <ol className="mt-8 grid gap-14">
          {updates.map((u) => (
            <NewsItem key={u.id} update={u} onOpen={(items, index) => setOpen({ items, index })} />
          ))}
        </ol>
      )}
      {open ? <Lightbox items={open.items} index={open.index} onIndex={(index) => setOpen({ ...open, index })} onClose={() => setOpen(null)} /> : null}
    </section>
  );
}

function NewsItem({ update, onOpen }: { update: VipUpdate; onOpen: (items: MediaItem[], index: number) => void }) {
  const { t, intl } = useI18n();
  const w = t.vip;
  const date = dayInWords(intl, update.date);
  const photos = update.files.filter((f) => f.kind === "image");
  const videos = update.files.filter((f) => f.kind === "video");
  const items: MediaItem[] = photos.map((f) => ({ type: "image", src: f.url, width: f.width ?? undefined, height: f.height ?? undefined, alt: w.photoAlt(date) }));
  const single = photos.length === 1;

  return (
    <li className="border-t border-white/10 pt-6" data-vip-news-item={update.id}>
      <p className="text-xs font-medium uppercase tracking-[0.22em] text-rose-light">
        <time dateTime={update.date}>{date}</time>
      </p>
      {update.note ? <p className="mt-3 max-w-prose text-base leading-relaxed whitespace-pre-line text-bone">{update.note}</p> : null}
      {photos.length > 0 ? (
        <ul className={"mt-5 grid gap-2 " + (single ? "" : "grid-cols-2")}>
          {photos.map((f, i) => (
            <li key={f.id}>
              <button type="button" onClick={() => onOpen(items, i)} aria-label={w.openPhoto} className="group block w-full cursor-zoom-in overflow-hidden bg-ink-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-light" data-vip-photo>
                <img
                  src={f.url}
                  alt={w.photoAlt(date)}
                  width={f.width ?? undefined}
                  height={f.height ?? undefined}
                  loading="lazy"
                  decoding="async"
                  className={"block w-full object-cover transition-transform duration-700 group-hover:scale-[1.02] " + (single ? "h-auto max-h-[80svh]" : "aspect-square h-full")}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {videos.map((f) => (
        // The first image shows before playing (#t: Safari on an iPhone shows nothing with preload="metadata" alone).
        <video
          key={f.id}
          src={f.url + "#t=0.1"}
          controls
          playsInline
          preload="metadata"
          aria-label={w.videoAlt(date)}
          className="mt-5 block max-h-[80svh] w-full bg-ink-soft"
          style={f.width && f.height ? { aspectRatio: f.width + " / " + f.height } : undefined}
          data-vip-video
        />
      ))}
    </li>
  );
}
