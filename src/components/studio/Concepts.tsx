/*
 * The concepts of a studio (src/pages/Studio.tsx): a card per image, always labelled « AI concept · for inspiration » (never a
 * piece of Berete), the heart that keeps it among the favourites, its variations (another interpretation, another metal,
 * another shape) and a larger view. The images come from the private link of the studio (server/routes/studio.ts).
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Heart, LoaderCircle, Maximize2, Sparkles, Trash2, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { METAL_KEYS, SHAPE_KEYS, variantParts, type StudioConcept, type VariantKey } from "@/lib/studio";

export type Busy = { where: "new" } | { where: string; variant: VariantKey } | null;
export type Problem = { where: string; code: string; wait: number } | null;

/** The words under a concept: its piece, metal, shape, « from your photos », « another interpretation ». */
export function useVariantLabel(): (variant: string) => string {
  const { t } = useI18n();
  const s = t.studio;
  return (variant) =>
    variantParts(variant)
      .map((p) => {
        if (p.startsWith("piece:")) return s.pieces[p.slice(6) as keyof typeof s.pieces] ?? "";
        if (p === "photos") return s.fromPhotos;
        if (p === "another") return s.variants.another;
        return (s.variants as Record<string, string>)[p] ?? "";
      })
      .filter(Boolean)
      .join(" · ");
}

export function ProblemText({ problem }: { problem: { code: string; wait: number } }) {
  const { t } = useI18n();
  const s = t.studio;
  const text = problem.code === "too-many" ? s.tooMany(problem.wait) : ((s.errors as Record<string, string>)[problem.code] ?? s.errors.unavailable);
  return (
    <p role="alert" data-studio-error={problem.code} className="text-base text-rose-light">
      {text}
    </p>
  );
}

/** The label every image carries. */
export function AiLabel({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span data-ai-label className={"pointer-events-none inline-flex items-center gap-1.5 bg-ink/80 px-2.5 py-1 text-base leading-tight text-bone backdrop-blur-sm lg:text-[0.75rem] lg:tracking-[0.12em] lg:uppercase " + className}>
      <Sparkles className="size-3.5 shrink-0 text-rose-light" aria-hidden="true" />
      {t.studio.aiLabel}
    </span>
  );
}

/** The waiting card while an image takes shape. */
export function PendingCard() {
  const { t } = useI18n();
  return (
    <div role="status" data-studio-pending className="flex aspect-square w-full flex-col items-center justify-center gap-3 border border-white/15 bg-ink-soft bg-[radial-gradient(circle_at_center,rgba(232,180,160,0.14),transparent_62%)] p-6 text-center">
      <LoaderCircle className="size-8 animate-spin text-rose-light" aria-hidden="true" />
      <p className="text-base text-bone">{t.studio.generating}</p>
      <p className="text-base text-mist">{t.studio.generatingHint}</p>
    </div>
  );
}

type CardProps = {
  concept: StudioConcept;
  readOnly: boolean;
  busy: Busy;
  problem: Problem;
  onKeep: (c: StudioConcept) => void;
  onVariant: (c: StudioConcept, v: VariantKey) => void;
  onRemove: (c: StudioConcept) => void;
  onOpen: (c: StudioConcept) => void;
};

export function ConceptCard({ concept, readOnly, busy, problem, onKeep, onVariant, onRemove, onOpen }: CardProps) {
  const { t } = useI18n();
  const s = t.studio;
  const label = useVariantLabel();
  const [open, setOpen] = useState(false);
  const panelId = "variants-" + concept.id;
  const working = busy !== null;
  const tags = label(concept.variant);
  const chip = "min-h-12 border px-3 text-base transition-colors disabled:opacity-50 lg:min-h-10 lg:text-[0.875rem] border-white/25 text-bone hover:border-rose-light hover:text-rose-light";

  return (
    <article data-concept={concept.id} data-kept={concept.kept ? "1" : undefined} className="flex flex-col border border-white/12 bg-ink-soft/40">
      <div className="relative aspect-square overflow-hidden bg-ink">
        <button type="button" onClick={() => onOpen(concept)} className="group block size-full cursor-zoom-in" aria-label={s.enlarge}>
          <img src={concept.url} alt={s.alt(concept.prompt)} loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
          <Maximize2 className="absolute end-3 bottom-3 size-5 text-white/70 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
        </button>
        <AiLabel className="absolute start-0 top-0" />
        {!readOnly ? (
          <button
            type="button"
            onClick={() => onKeep(concept)}
            aria-pressed={concept.kept}
            aria-label={s.keep}
            data-keep
            className={"absolute end-1 top-1 inline-flex size-12 items-center justify-center bg-ink/70 backdrop-blur-sm transition-colors " + (concept.kept ? "text-rose-light" : "text-white hover:text-rose-light")}
          >
            <Heart className="size-5" fill={concept.kept ? "currentColor" : "none"} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-2 text-base text-bone">{concept.prompt}</p>
        {tags || concept.sent ? (
          <p className="text-base text-mist lg:text-[0.875rem]">
            {tags}
            {concept.sent ? <span className="ms-2 inline-block border border-rose-light/50 px-2 text-rose-light">{s.sentBadge}</span> : null}
          </p>
        ) : null}
        {!readOnly ? (
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId} data-explore className="btn-secondary">
              {s.explore}
              <ChevronDown className={"size-4 transition-transform " + (open ? "rotate-180" : "")} aria-hidden="true" />
            </button>
            {!concept.sent ? (
              <button type="button" onClick={() => onRemove(concept)} aria-label={s.remove} title={s.remove} className="inline-flex size-12 shrink-0 items-center justify-center text-mist hover:text-rose-light">
                <Trash2 className="size-5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
        {!readOnly && open ? (
          <div id={panelId} className="grid gap-3 border-t border-white/10 pt-3" data-variants>
            <button type="button" disabled={working} onClick={() => onVariant(concept, "another")} data-variant="another" className={chip + " w-full"}>
              {busy && busy.where === concept.id && "variant" in busy && busy.variant === "another" ? <LoaderCircle className="me-2 inline size-4 animate-spin" aria-hidden="true" /> : null}
              {s.variants.another}
            </button>
            {[
              { name: s.groupMetal, keys: METAL_KEYS as readonly VariantKey[] },
              { name: s.groupShape, keys: SHAPE_KEYS as readonly VariantKey[] },
            ].map((g) => (
              <div key={g.name} role="group" aria-label={g.name} className="grid gap-2">
                <p className="text-base text-mist lg:text-[0.8125rem]">{g.name}</p>
                <div className="flex flex-wrap gap-2">
                  {g.keys.map((k) => (
                    <button key={k} type="button" disabled={working} onClick={() => onVariant(concept, k)} data-variant={k} className={chip}>
                      {busy && busy.where === concept.id && "variant" in busy && busy.variant === k ? <LoaderCircle className="me-2 inline size-4 animate-spin" aria-hidden="true" /> : null}
                      {s.variants[k]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {problem && problem.where === concept.id ? <ProblemText problem={problem} /> : null}
      </div>
    </article>
  );
}

/** A concept in large, with its label; Escape or the cross closes it. */
export function ConceptViewer({ concept, onClose }: { concept: StudioConcept; onClose: () => void }) {
  const { t } = useI18n();
  const s = t.studio;
  const label = useVariantLabel();
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      before?.focus?.();
    };
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" aria-label={s.enlarge} data-studio-viewer className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/92 p-4 sm:p-8" onClick={onClose}>
      <button ref={close} type="button" onClick={onClose} aria-label={s.close} className="absolute end-3 top-3 inline-flex size-12 items-center justify-center text-white hover:text-rose-light">
        <X className="size-6" aria-hidden="true" />
      </button>
      <figure className="flex max-h-full w-full max-w-[min(88svh,56rem)] flex-col gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={concept.url} alt={s.alt(concept.prompt)} className="aspect-square w-full object-contain" />
          <AiLabel className="absolute start-0 top-0" />
        </div>
        <figcaption className="text-base text-bone">
          {concept.prompt}
          {label(concept.variant) ? <span className="block text-mist">{label(concept.variant)}</span> : null}
          <span className="mt-1 block text-mist">{s.conceptsNote}</span>
        </figcaption>
      </figure>
    </div>
  );
}
