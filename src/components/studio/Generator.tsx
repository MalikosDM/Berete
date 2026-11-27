/*
 * The generator of the AI Creation Studio (src/pages/Studio.tsx): Yoni's message first, calm and clear; the idea in words, the
 * piece and the metal (both optional), the photos of inspiration (made lighter in the browser: src/lib/photos.ts) and whether
 * the AI may look at them; then « Generate a concept » and how many are left today.
 */
import { useId, useRef, useState, type FormEvent } from "react";
import { ImageIcon, ImagePlus, Info, LoaderCircle, Sparkles, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { METAL_KEYS, PIECE_KEYS, type MetalKey, type PieceKey, type StudioReference } from "@/lib/studio";
import { ProblemText, type Busy, type Problem } from "./Concepts";

export const MAX_IDEA = 600;
export const MAX_REFS = 6;

type Props = {
  busy: Busy;
  problem: Problem;
  remaining: number;
  max: number;
  references: StudioReference[];
  uploading: number;
  onGenerate: (input: { idea: string; piece: PieceKey | null; metal: MetalKey | null; photos: boolean }) => void;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (r: StudioReference) => void;
  onFieldProblem: (code: string | null) => void;
};

function Chips<K extends string>({ label, keys, words, value, onChange }: { label: string; keys: readonly K[]; words: Record<K, string>; value: K | null; onChange: (v: K | null) => void }) {
  const { t } = useI18n();
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="grid gap-2">
      <p id={id} className="text-base text-bone">
        {label} <span className="text-mist">({t.studio.optional})</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={value === k}
            onClick={() => onChange(value === k ? null : k)}
            data-chip={k}
            className={"min-h-12 border px-4 text-base transition-colors lg:min-h-10 lg:text-[0.875rem] " + (value === k ? "border-rose-light text-rose-light" : "border-white/25 text-bone hover:border-white/50")}
          >
            {words[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Generator({ busy, problem, remaining, max, references, uploading, onGenerate, onAddPhotos, onRemovePhoto, onFieldProblem }: Props) {
  const { t } = useI18n();
  const s = t.studio;
  const fieldId = useId();
  const countId = useId();
  const refsId = useId();
  const [idea, setIdea] = useState("");
  const [piece, setPiece] = useState<PieceKey | null>(null);
  const [metal, setMetal] = useState<MetalKey | null>(null);
  const [usePhotos, setUsePhotos] = useState(true);
  const field = useRef<HTMLTextAreaElement>(null);
  const files = useRef<HTMLInputElement>(null);
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const working = busy !== null;
  const fieldProblem = problem?.where === "field" ? problem : null;
  const room = MAX_REFS - references.length - uploading;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (working) return;
    const text = idea.trim();
    if (!text || text.length > MAX_IDEA) {
      onFieldProblem(text ? "too-long" : "empty");
      field.current?.focus();
      return;
    }
    onFieldProblem(null);
    onGenerate({ idea: text, piece, metal, photos: usePhotos && references.length > 0 });
  };

  return (
    <div className="grid gap-6 border border-white/15 p-5 sm:p-8" data-studio-generator>
      {/* Yoni's message, near the generator: calm, clear. */}
      <p role="note" data-studio-notice className="flex gap-3 border-s-2 border-rose-light/70 ps-4 text-base leading-relaxed text-bone">
        <Info className="mt-0.5 size-5 shrink-0 text-rose-light" aria-hidden="true" />
        <span>{s.notice}</span>
      </p>

      <form onSubmit={submit} noValidate className="grid gap-6" data-studio-form>
        <div className="grid gap-2">
          <label htmlFor={fieldId} className="text-base text-bone">
            {s.ideaLabel}
          </label>
          <textarea
            id={fieldId}
            ref={field}
            name="idea"
            rows={5}
            maxLength={MAX_IDEA}
            value={idea}
            readOnly={working}
            onChange={(e) => {
              setIdea(e.target.value);
              if (fieldProblem) onFieldProblem(null);
            }}
            placeholder={s.ideaPlaceholder}
            aria-invalid={Boolean(fieldProblem)}
            aria-describedby={countId}
            className="block w-full border border-white/30 bg-ink px-4 py-3 text-base text-white placeholder:text-mist/80 focus:border-rose-light focus:outline-none"
          />
          <span id={countId} className="text-end text-base text-mist lg:text-[0.8125rem]">
            <span dir="ltr">{idea.length + " / " + MAX_IDEA}</span>
          </span>
          {fieldProblem ? <ProblemText problem={fieldProblem} /> : null}
        </div>

        <Chips label={s.pieceLabel} keys={PIECE_KEYS} words={s.pieces} value={piece} onChange={setPiece} />
        <Chips label={s.metalLabel} keys={METAL_KEYS} words={s.metals} value={metal} onChange={setMetal} />

        <div className="grid gap-3" role="group" aria-labelledby={refsId}>
          <div>
            <p id={refsId} className="text-base text-bone">
              {s.refsLabel} <span className="text-mist">({s.optional})</span>
            </p>
            <p className="mt-1 text-base text-mist lg:text-[0.875rem]">{s.refsHint}</p>
          </div>
          {references.length > 0 || uploading > 0 ? (
            <ul className="flex flex-wrap gap-3" data-studio-refs>
              {references.map((r) => (
                <li key={r.id} className="relative size-20 border border-white/15 bg-ink-soft">
                  {broken.has(r.id) ? (
                    <span className="flex size-full items-center justify-center text-mist" title={r.name}>
                      <ImageIcon className="size-6" aria-hidden="true" />
                      <span className="sr-only">{r.name}</span>
                    </span>
                  ) : (
                    <img src={r.url} alt={r.name} className="size-full object-cover" onError={() => setBroken((b) => new Set(b).add(r.id))} />
                  )}
                  {!r.sent ? (
                    <button type="button" onClick={() => onRemovePhoto(r)} aria-label={s.refsRemove(r.name)} className="absolute -end-3 -top-3 inline-flex size-12 items-center justify-center">
                      <span className="inline-flex size-7 items-center justify-center rounded-full bg-ink text-white ring-1 ring-white/40 hover:text-rose-light">
                        <X className="size-4" aria-hidden="true" />
                      </span>
                    </button>
                  ) : null}
                </li>
              ))}
              {Array.from({ length: uploading }, (_, i) => (
                <li key={"up-" + i} role="status" className="flex size-20 items-center justify-center border border-white/15 bg-ink-soft" aria-label={s.refsAdding}>
                  <LoaderCircle className="size-5 animate-spin text-rose-light" aria-hidden="true" />
                </li>
              ))}
            </ul>
          ) : null}
          {room > 0 ? (
            <div>
              <input
                ref={files}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                multiple
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                data-studio-file
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  onAddPhotos(list);
                }}
              />
              <button type="button" onClick={() => files.current?.click()} className="inline-flex min-h-12 items-center gap-2 border border-dashed border-white/35 px-4 text-base text-bone hover:border-rose-light hover:text-rose-light lg:min-h-11">
                <ImagePlus className="size-5" aria-hidden="true" />
                {s.refsAdd}
              </button>
            </div>
          ) : null}
          {problem?.where === "refs" ? <ProblemText problem={problem} /> : null}
          {references.length > 0 ? (
            <label className="flex min-h-12 cursor-pointer items-start gap-3 text-base text-bone">
              <input type="checkbox" checked={usePhotos} onChange={(e) => setUsePhotos(e.target.checked)} className="mt-1 size-5 shrink-0" data-studio-use-photos />
              <span>
                {s.refsUse}
                <span className="block text-mist lg:text-[0.875rem]">{s.refsUseHint}</span>
              </span>
            </label>
          ) : null}
        </div>

        <div className="grid gap-3">
          <button type="submit" disabled={working || remaining <= 0} data-studio-generate className="btn-primary w-full disabled:opacity-60">
            {busy?.where === "new" ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Sparkles className="size-5" aria-hidden="true" />}
            {s.generate}
          </button>
          <p className="text-center text-base text-mist lg:text-[0.875rem]" data-studio-remaining>
            {s.remaining(remaining, max)}
          </p>
          {problem?.where === "new" ? <ProblemText problem={problem} /> : null}
        </div>
      </form>
    </div>
  );
}
