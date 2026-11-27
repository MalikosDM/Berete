/*
 * Admin « Private Atelier »: what its screens share. The shapes of the answers of the server (server/routes/atelier-admin.ts,
 * server/atelier/project.ts → projectView), the French words of the steps, events and actions, the amounts (the server
 * counts in cents; Yoni types euros), the dates, the device read from a browser's name, and small pieces of interface.
 */
import { useCallback, useState, type ReactNode } from "react";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { METALS } from "@/data/models";
import { fr } from "@/i18n/ui/fr";
import { SIMPLE_STONES } from "../editor3d/presets";
import { btn } from "../ui";

/* ---------- Where we are ---------- */

export type Nav = "dashboard" | "clients" | "settings" | "outbox" | "audit";
export type Place = { nav: Nav; clientId: string | null; projectId: string | null };
export type Go = (next: Partial<Place> & { nav?: Nav }) => void;

/* ---------- The answers of the server ---------- */

export type Money = { currency: string; total: number; designFee: number; paid: number; credited: number; remaining: number; deposit: number; depositPaid: boolean };

export type ModelView = { id: string; name: string; poster: string | null } | null;

export type VersionView = {
  id: string;
  number: number;
  label: string;
  changes: string;
  publishedAt: string | null;
  model: ModelView;
  modelId?: string | null;
  modelName?: string | null;
  modelStatus?: string | null;
  approved: boolean;
};

export type QuoteView = {
  id: string;
  number: number;
  status: "draft" | "sent" | "accepted" | "superseded";
  versionId: string | null;
  versionNumber: number | null;
  materials: string;
  priceCents: number;
  feesCents: number;
  feesLabel: string;
  totalCents: number;
  leadTime: string;
  schedule: string;
  terms: string;
  sentAt: string | null;
  acceptedAt: string | null;
  supersededAt: string | null;
  sha256: string | null;
  pdfUrl: string | null;
  acceptedEmail?: string | null;
  acceptedIp?: string | null;
  acceptedUa?: string | null;
};

export type PaymentView = { id: string; kind: string; amountCents: number; currency: string; status: string; paidAt: string | null; method: string | null; receiptNumber: string | null; receiptUrl: string | null; createdAt: string | null };

export type FileView = { id: string; name: string; kind: string; mime: string; size: number; url: string };

export type ThreadItem =
  | { type: "message"; id: string; author: "client" | "house"; body: string; at: string; readAt: string | null; files: FileView[] }
  | { type: "event"; id: string; kind: string; at: string; data: Record<string, unknown> | null; actor?: string };

export type JournalView = { id: string; date: string | null; note: string; draft: boolean; createdAt: string | null; files: { id: string; kind: "image" | "video"; url: string; width: number | null; height: number | null }[] };

export type StepView = { index: number; label: string; state: "done" | "current" | "pending"; updatedAt: string | null; note: string };

export type ProjectView = {
  id: string;
  title: string;
  currency: string;
  createdAt: string | null;
  client: { id: string; name: string; email?: string | null; accessEnabled?: boolean; activated?: boolean };
  designFee: { cents: number; paidAt: string | null; method: string };
  allowedMetals: string[];
  allowedStones: string[];
  versions: VersionView[];
  latestVersionId: string | null;
  approval: { versionId: string; number: number | null; at: string | null; email?: string; ip?: string; userAgent?: string } | null;
  approvals?: { versionId: string; at: string | null; email: string; ip: string; userAgent: string }[];
  requests: { id: string; versionId: string; number: number | null; comment: string; point: unknown; at: string | null }[];
  quotes: QuoteView[];
  currentQuoteId: string | null;
  canAccept: "approve-first" | "terms-missing" | "ok" | null;
  money: Money | null;
  payment: { block: "off" | "keys" | "approve" | "quote" | "paid" | null; testMode: boolean; options: { kind: string; amount: number }[]; methods: string[] };
  payments: PaymentView[];
  order: { acceptedAt: string | null; productionAt: string | null };
  step: number;
  steps: StepView[];
  delivery: { from: string | null; to: string | null } | null;
  journal: JournalView[];
  thread: ThreadItem[];
};

export type AuditRow = { id: string; actor: string; action: string; target: string; data: Record<string, unknown> | null; ip: string; createdAt: string };

export type ClientRow = { id: string; name: string; email: string | null; phone: string | null; token: string; lastSeenAt: string | null; createdAt: string; modelIds: string[]; stage: number; estimatedAt: string | null; updates: number };

export type Settings = {
  terms: string;
  features: { payment: boolean; aiStudio: boolean; whatsappNotify: boolean; siteTexts: boolean; clientAccess: boolean };
  methods: string[];
  inviteDays: number;
  ai: { perVisitorDaily: number; dailyTotal: number };
};

export type SettingsStatus = { stripeKeys: boolean; stripeTestMode: boolean; webhookUrl: string; smtp: boolean; openai: boolean; whatsapp: { ready: boolean; needs: string[] } };

/* ---------- Words ---------- */

/** The ten steps of the making, in French for the admin (the client reads Yoni's English names). */
export const STEPS_FR = [
  "Design validé",
  "Paiement confirmé",
  "Fabrication lancée",
  "Travail de l'or et montage",
  "Sertissage des pierres",
  "Polissage et finitions",
  "Contrôle qualité",
  "Studio photo",
  "Prête pour la livraison",
  "Livrée",
];

export const stepFr = (step: number) => (step >= 0 ? (STEPS_FR[step] ?? "") : "Pas encore commencée");

/** The metals of the 3D viewer, under their French names. */
export const METAL_CHOICES = METALS.map((id) => ({ id: id as string, name: fr.viewer.metals[id] ?? id }));

/** The stones a client may choose: a colour each (the stones of the simple mode of the 3D editor). */
const STONE_FR: Record<string, string> = { white: "Diamant blanc", yellow: "Diamant jaune", pink: "Diamant rose", champagne: "Diamant champagne", black: "Diamant noir", blue: "Pierre bleue", red: "Pierre rouge", green: "Pierre verte" };
export const STONE_CHOICES = SIMPLE_STONES.map((s) => ({ id: s.id, name: STONE_FR[s.id] ?? s.name }));

export const FEE_METHODS = ["Virement bancaire", "Carte bancaire", "Espèces", "Paiement en ligne"];

export const PAYMENT_KIND_FR: Record<string, string> = { deposit: "Acompte (50 %)", full: "Paiement total", balance: "Solde" };
export const PAYMENT_STATUS_FR: Record<string, string> = { pending: "En attente", paid: "Payé", review: "À vérifier (montant différent)", failed: "Échoué", canceled: "Abandonné" };
export const QUOTE_STATUS_FR: Record<QuoteView["status"], string> = { draft: "Brouillon", sent: "Envoyé au client", accepted: "Accepté par le client", superseded: "Remplacé" };

const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" ? v : "?");

/** A line of the history of a project, in French. */
export function eventFr(kind: string, data: Record<string, unknown> | null): string {
  const d = data ?? {};
  switch (kind) {
    case "project-created":
      return "Projet créé";
    case "version-draft":
      return "Brouillon de la version " + num(d.version) + " créé";
    case "version-published":
      return "Version publiée : " + (typeof d.label === "string" ? d.label : "v" + num(d.version));
    case "change-requested":
      return "Le client demande une modification (version " + num(d.version) + ")";
    case "design-approved":
      return "Le client a validé le design (version " + num(d.version) + ")";
    case "quote-draft":
      return "Brouillon du devis Q" + num(d.quote) + " créé";
    case "quote-sent":
      return "Devis Q" + num(d.quote) + " envoyé au client";
    case "quote-superseded":
      return "Devis Q" + num(d.quote) + " remplacé par Q" + num(d.by);
    case "quote-accepted":
      return "Le client a accepté le devis Q" + num(d.quote);
    case "order-accepted":
      return "Commande acceptée par Berete";
    case "production-authorized":
      return "Fabrication autorisée (commande acceptée et acompte reçu)";
    case "step":
      return "Étape : " + stepFr(typeof d.step === "number" ? d.step : -1);
    case "journal":
      return "Nouvelle page du journal de l'atelier publiée";
    case "delivery":
      return "Fenêtre de livraison : " + (d.from ? dayShort(String(d.from)) : "?") + " – " + (d.to ? dayShort(String(d.to)) : "?");
    case "payment-confirmed":
      return "Paiement reçu : " + (typeof d.amountCents === "number" ? money(d.amountCents, String(d.currency ?? "EUR")) : "") + (d.receipt ? " (reçu " + String(d.receipt) + ")" : "");
    case "payment-review":
      return "Paiement à vérifier : montant différent de celui demandé";
    default:
      return kind;
  }
}

/** What the journal of the actions says, in French. */
export const ACTION_FR: Record<string, string> = {
  settings: "Réglages modifiés",
  invite: "Invitation envoyée",
  "access-cut": "Accès coupé",
  "access-restored": "Accès rendu",
  "access-created": "Accès créé par le client",
  "session-revoked": "Appareil déconnecté",
  "project-created": "Projet créé",
  "project-updated": "Réglages du projet modifiés",
  "version-created": "Version créée (brouillon)",
  "version-updated": "Brouillon de version modifié",
  "version-published": "Version publiée",
  "version-deleted": "Brouillon de version supprimé",
  "quote-created": "Devis créé (brouillon)",
  "quote-updated": "Brouillon de devis modifié",
  "quote-sent": "Devis envoyé",
  "quote-accepted": "Devis accepté par le client",
  "order-accepted": "Commande acceptée",
  step: "Étape de fabrication",
  "journal-published": "Page du journal publiée",
  message: "Message",
  notify: "Client prévenu",
  "change-requested": "Modification demandée par le client",
  "design-approved": "Design validé par le client",
  "payment-started": "Paiement commencé par le client",
};

export const LOGIN_FR: Record<string, string> = {
  signin: "Connexion",
  magic: "Connexion par lien",
  "signin-failed": "Mot de passe faux",
  "signin-paused": "Connexions suspendues (trop d'essais)",
  "code-failed": "Code faux",
  "invite-used": "Invitation utilisée (accès créé)",
  "password-changed": "Mot de passe changé",
  "session-revoked": "Appareil déconnecté par le client",
  "session-revoked-admin": "Appareil déconnecté par Berete",
  signout: "Déconnexion",
  "access-cut": "Accès coupé par Berete",
  "access-restored": "Accès rendu par Berete",
};

export function actorFr(actor: string): string {
  if (actor === "admin") return "Berete";
  if (actor === "stripe") return "Stripe";
  if (actor === "system") return "Le site";
  if (actor.startsWith("client")) return "Le client";
  return actor;
}

/* ---------- Amounts and dates ---------- */

export function money(cents: number, currency = "EUR"): string {
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2) + " " + currency;
  }
}

/** "12 500,50" or "12500.5" → 1250050 cents; null when it is not an amount. */
export function toCents(text: string): number | null {
  const clean = text.replace(/[\s\u00a0\u202f€]/g, "").replace(",", ".");
  if (clean === "") return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** 125050 → "1250,50"; 100000 → "1000". */
export const centsToText = (cents: number) => (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2).replace(".", ","));

/** "27 nov. 2026 à 14:05". */
export function when(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** "12 mars 2027" for a day kept without its time. */
export function dayShort(day: string | null | undefined): string {
  if (!day) return "";
  return new Date(day.slice(0, 10) + "T00:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Today in the calendar of the computer or the phone: "2026-11-27". */
export function today(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

/** "iPhone · Safari" from the name a browser gives itself. */
export function deviceOf(ua: string | null | undefined): string {
  if (!ua) return "Appareil inconnu";
  const device = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Macintosh|Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Appareil";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "navigateur";
  return device + " · " + browser;
}

/* ---------- Small pieces ---------- */

/** The errors of a screen: the session ended (back to the password), or a sentence. */
export function useFail(onExpired: () => void): [string, (x: unknown) => void, (s: string) => void] {
  const [err, setErr] = useState("");
  const fail = useCallback(
    (x: unknown) => {
      if (x instanceof Error && x.message === "expired") onExpired();
      else setErr(x instanceof Error ? x.message : "Une erreur est survenue, réessayez.");
    },
    [onExpired],
  );
  return [err, fail, setErr];
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    window.prompt("Copiez ce texte :", text);
    return false;
  }
}

export function CopyButton({ text, label = "Copier" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={btn}
      onClick={() =>
        void copyText(text).then((ok) => {
          if (!ok) return;
          setDone(true);
          window.setTimeout(() => setDone(false), 2000);
        })
      }
    >
      {done ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />} {done ? "Copié" : label}
    </button>
  );
}

export function Loading({ label = "Chargement" }: { label?: string }) {
  return (
    <p className="flex items-center gap-3 py-10 text-base text-bone" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> {label}
    </p>
  );
}

export function ErrorLine({ text, ...rest }: { text: string } & Record<`data-${string}`, string | boolean | undefined>) {
  if (!text) return null;
  return (
    <p role="alert" className="text-base text-rose-light" {...rest}>
      {text}
    </p>
  );
}

/** A section of a screen: a title in capitals, a sentence, its content. */
export function Block({ id, title, intro, children, aside, ...rest }: { id?: string; title: string; intro?: ReactNode; children: ReactNode; aside?: ReactNode } & Record<`data-${string}`, string | boolean | undefined>) {
  return (
    <section id={id} className="grid scroll-mt-52 gap-5 border border-white/15 p-4 sm:p-7" {...rest}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="title-caps t-sub tracking-[0.12em]">{title}</h3>
          {intro ? <p className="mt-2 max-w-3xl text-base text-mist">{intro}</p> : null}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** A switch (a checkbox drawn as a switch, like « Site en construction »). */
export function Switch({ label, hint, checked, disabled, onChange, ...rest }: { label: string; hint?: ReactNode; checked: boolean; disabled?: boolean; onChange: (v: boolean) => void } & Record<`data-${string}`, string | boolean | undefined>) {
  return (
    <label className={"flex min-h-12 items-center justify-between gap-6 border-t border-white/10 py-3 text-base text-white " + (disabled ? "cursor-not-allowed" : "cursor-pointer")}>
      <span className="min-w-0">
        <span className="block">{label}</span>
        {hint ? <span className="mt-1 block text-base text-mist">{hint}</span> : null}
      </span>
      <span className={"relative inline-flex shrink-0 items-center" + (disabled ? " opacity-50" : "")}>
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} {...rest} />
        <span className="h-7 w-12 rounded-full border border-white/30 bg-ink transition-colors peer-checked:border-rose-light peer-checked:bg-rose-deep/40 peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-rose-light" />
        <span className="absolute left-1 size-5 rounded-full bg-bone transition-transform peer-checked:translate-x-5 peer-checked:bg-rose-light" />
      </span>
    </label>
  );
}

/** A small state written in a frame: neutral, good (rose gold), or something waits (rose light, bold). */
export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "wait" }) {
  const cls = tone === "good" ? "border-rose-light/60 text-rose-light" : tone === "wait" ? "border-rose-light bg-rose-deep/30 text-white" : "border-white/25 text-bone";
  return <span className={"inline-flex min-h-8 items-center border px-2.5 text-base " + cls}>{children}</span>;
}

/** Saved: a short line that goes away. */
export function useFlash(): [string, (key: string) => void] {
  const [saved, setSaved] = useState("");
  const flash = useCallback((key: string) => {
    setSaved(key);
    window.setTimeout(() => setSaved((s) => (s === key ? "" : s)), 2500);
  }, []);
  return [saved, flash];
}

export function Saved({ show, text = "Enregistré" }: { show: boolean; text?: string }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-base text-rose-light" role="status">
      <Check className="size-4" aria-hidden="true" /> {text}
    </span>
  );
}

export const labelCls = "block text-base text-bone";
export const areaCls = "py-3";
