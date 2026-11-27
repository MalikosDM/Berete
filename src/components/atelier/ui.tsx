/*
 * The small pieces shared by the pages of The Private Atelier (src/pages/Vip.tsx, src/pages/atelier/*): the fields, the line
 * that answers (data-atelier-msg), the WhatsApp of the house, the confirmation of a decision (approve a design, accept a
 * quotation: role=dialog, data-confirm), the wait. The look of the site: black, white, rose gold, fine lines.
 */
import { useEffect, useRef, type InputHTMLAttributes, type ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { useI18n } from "@/i18n";
import { waLink } from "@/lib/site";

export const inputClass =
  "mt-2 block min-h-12 w-full border border-white/30 bg-ink px-4 text-base text-white placeholder:text-mist/50 focus:border-rose-light focus:outline-none disabled:opacity-60";
export const labelClass = "block text-base text-bone";

export function Field({ label, hint, ...input }: { label: string; hint?: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={labelClass}>
      {label}
      <input {...input} className={inputClass + (input.className ? " " + input.className : "")} />
      {hint ? <span className="mt-2 block text-sm text-mist">{hint}</span> : null}
    </label>
  );
}

/** The line that answers an action (sent, wrong, wait…): read by screen readers, and by the tests (data-atelier-msg). */
export function Msg({ tone = "info", children, className = "" }: { tone?: "info" | "error" | "ok"; children: ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p role={tone === "error" ? "alert" : "status"} data-atelier-msg data-tone={tone} className={"text-base " + (tone === "error" ? "text-rose-light" : tone === "ok" ? "text-white" : "text-bone") + (className ? " " + className : "")}>
      {children}
    </p>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <LoaderCircle className={className + " animate-spin"} aria-hidden="true" />;
}

export function Waiting({ children }: { children: ReactNode }) {
  return (
    <section className="mx-auto max-w-3xl px-5 pt-40 pb-24 text-center sm:px-8">
      <p className="flex items-center justify-center gap-3 text-bone" role="status">
        <Spinner className="size-5" /> {children}
      </p>
    </section>
  );
}

/** WhatsApp of the house, with a message written in the language of the page. */
export function WhatsAppLink({ message, children, className = "btn-secondary", ...rest }: { message: string; children?: ReactNode; className?: string } & Record<`data-${string}`, string | boolean | undefined>) {
  const { t } = useI18n();
  return (
    <a href={waLink(message)} target="_blank" rel="noreferrer" className={className} {...rest}>
      <BrandIcon name="whatsapp" className="size-5 shrink-0" />
      <span>{children ?? t.privateAtelier.whatsapp}</span>
    </a>
  );
}

/**
 * The confirmation of a decision of the client: a small window over the page (role=dialog, data-confirm), the decision in
 * words, « Cancel » and the button that confirms (data-confirm-yes). Escape or a click outside cancels; the focus goes to the
 * window and comes back where it was.
 */
export function ConfirmDialog({
  title,
  children,
  yes,
  busy = false,
  onYes,
  onNo,
  kind,
}: {
  title: string;
  children: ReactNode;
  yes: string;
  busy?: boolean;
  onYes: () => void;
  onNo: () => void;
  kind: string;
}) {
  const { t } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  // The latest « cancel » of the parent, without opening the window again at each of its renders.
  const no = useRef(onNo);
  useEffect(() => {
    no.current = onNo;
  }, [onNo]);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    cancel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") no.current();
      if (e.key === "Tab" && box.current) {
        const all = [...box.current.querySelectorAll<HTMLElement>("button:not([disabled])")];
        const first = all[0];
        const last = all[all.length - 1];
        if (!first || !last) return;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, []);
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-ink/80 px-4 pb-6 backdrop-blur-sm sm:items-center sm:pb-0" onMouseDown={(e) => e.target === e.currentTarget && onNo()}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-labelledby="atelier-confirm-title"
        data-confirm={kind}
        className="w-full max-w-lg border border-rose-light/40 bg-ink-soft px-6 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.6)] sm:px-9 sm:py-9"
      >
        <p className="eyebrow">{t.privateAtelier.eyebrow}</p>
        <h2 id="atelier-confirm-title" className="title-caps t-sub mt-3 tracking-[0.12em] text-white">
          {title}
        </h2>
        <div className="piece-text mt-5">{children}</div>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button ref={cancel} type="button" onClick={onNo} className="btn-secondary justify-center px-4">
            {t.privateAtelier.project.cancel}
          </button>
          <button type="button" onClick={onYes} disabled={busy} data-confirm-yes className="btn-primary disabled:opacity-60">
            {busy ? <Spinner /> : null} {yes}
          </button>
        </div>
      </div>
    </div>
  );
}

/** A title of a section of the project: the small label in rose gold, the title. */
export function SectionHead({ id, eyebrow, title, children }: { id?: string; eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="title-caps t-title mt-3 tracking-[0.12em] break-words">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
