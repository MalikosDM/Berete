/*
 * The Private Atelier, the side of the client (27/11/2026): one typed call per route of server/routes/atelier-client.ts
 * (the shapes of server/atelier/project.ts, projectView, as the client sees them). Every call is same-origin with its
 * cookie; a session that is over (401) answers { state: "out" }, a project that is not his (404) { state: "missing" },
 * a cut connection { state: "error" }. The amounts come from the server only (cents of the currency of the project).
 */
import type { PublicModel } from "@/data/models";
import { HAS_SERVER } from "@/lib/site";

export type Out = { state: "out" };
export type Failed = { state: "error" } | { state: "bad" } | { state: "missing" };

async function call<T>(method: "GET" | "POST" | "DELETE", path: string, body?: unknown): Promise<T | Out | Failed> {
  if (!HAS_SERVER) return { state: "error" };
  try {
    const res = await fetch("/api/vip/atelier/" + path, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json", ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) return { state: "out" };
    if (res.status === 404) return { state: "missing" };
    const json = (await res.json().catch(() => null)) as T | null;
    if (!json) return { state: "error" };
    return json;
  } catch {
    return { state: "error" };
  }
}

/* ---------- The invitation, signing in ---------- */

export type InviteCheck = { state: "ok"; name: string; email: string } | { state: "used" | "expired" | "missing" | "wait" };
export const inviteCheck = (token: string) => call<InviteCheck>("POST", "invite/check", { token });

export type WeakReason = "short" | "simple" | "common";
export type InviteAccept = { state: "ok" } | { state: "weak"; reason: WeakReason } | { state: "used" | "expired" | "missing" | "wait" };
export const inviteAccept = (token: string, password: string) => call<InviteAccept>("POST", "invite/accept", { token, password });

export type CodeVia = "email" | "totp";
export type CodeAsked = { state: "code"; via: CodeVia; challenge: string };
export type SigninAnswer = { state: "ok" } | CodeAsked | { state: "wrong" } | { state: "wait"; minutes?: number } | { state: "paused" };
export const signin = (email: string, password: string) => call<SigninAnswer>("POST", "signin", { email, password });

export type CodeAnswer = { state: "ok" | "wrong" | "expired" } | { state: "wait"; minutes?: number };
export const signinCode = (challenge: string, code: string) => call<CodeAnswer>("POST", "signin/code", { challenge, code });

export type MagicAnswer = { state: "sent" } | { state: "wait"; minutes?: number };
export const sendMagic = (email: string) => call<MagicAnswer>("POST", "magic", { email });

export type MagicUse = { state: "ok" | "expired" | "wait" } | CodeAsked;
export const magicUse = (token: string) => call<MagicUse>("POST", "magic/use", { token });

export const signout = () => call<Out>("POST", "signout", {});

/* ---------- His space ---------- */

export type TwoFactor = "off" | "email" | "totp";
export type ProjectCard = { id: string; title: string; step: number; versions: number; unread: number; createdAt: string };
export type Me = { state: "ok"; name: string; email: string | null; twoFactor: TwoFactor; projects: ProjectCard[] };
export const atelierMe = () => call<Me>("GET", "me");

export type SessionRow = { id: string; current: boolean; userAgent: string; ip: string; createdAt: string; lastSeenAt: string };
export type LoginRow = { event: string; ip: string; userAgent: string; at: string };
export type Security = { state: "ok"; twoFactor: TwoFactor; sessions: SessionRow[]; logins: LoginRow[] };
export const security = () => call<Security>("GET", "security");

export const setTwoFactor = (mode: "email" | "off") => call<{ state: "ok" }>("POST", "security/2fa", { mode });
export const totpStart = () => call<{ state: "ok"; secret: string; uri: string }>("POST", "security/totp/start", {});
export const totpConfirm = (code: string) => call<{ state: "ok" | "wrong" }>("POST", "security/totp/confirm", { code });
export type PasswordAnswer = { state: "ok" | "wrong" } | { state: "weak"; reason: WeakReason };
export const changePassword = (current: string, next: string) => call<PasswordAnswer>("POST", "security/password", { current, next });
export const revokeSession = (id: string) => call<{ state: "ok" }>("DELETE", "security/sessions/" + encodeURIComponent(id));

/* ---------- A project (projectView of server/atelier/project.ts, the client's side) ---------- */

export type Version = {
  id: string;
  number: number;
  label: string;
  changes: string;
  publishedAt: string | null;
  model: PublicModel | null;
  approved: boolean;
};

export type Point = { x: number; y: number; z: number };

export type QuoteStatus = "sent" | "accepted" | "superseded";
export type Quote = {
  id: string;
  number: number;
  status: QuoteStatus;
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
};

export type Money = { currency: string; total: number; designFee: number; paid: number; credited: number; remaining: number; deposit: number; depositPaid: boolean };
export type PayOption = "deposit" | "full" | "balance";
export type PaymentBlock = "off" | "keys" | "approve" | "quote" | "paid" | null;
export type Payment = { id: string; kind: PayOption; amountCents: number; currency: string; status: string; paidAt: string | null; method: string | null; receiptNumber: string | null; receiptUrl: string | null; createdAt: string | null };

export type StepState = "done" | "current" | "pending";
export type Step = { index: number; label: string; state: StepState; updatedAt: string | null; note: string };

export type JournalFile = { id: string; kind: "image" | "video"; url: string; width: number | null; height: number | null };
export type JournalEntry = { id: string; date: string | null; note: string; createdAt: string | null; files: JournalFile[] };

export type MessageFile = { id: string; name: string; kind: string; mime: string; size: number; url: string };
export type ThreadMessage = { type: "message"; id: string; author: "client" | "house"; body: string; at: string; readAt: string | null; files: MessageFile[] };
export type ThreadEvent = { type: "event"; id: string; kind: string; at: string; data: Record<string, unknown> | null };

export type Project = {
  id: string;
  title: string;
  currency: string;
  createdAt: string | null;
  client: { id: string; name: string };
  designFee: { cents: number; paidAt: string | null; method: string };
  allowedMetals: string[];
  allowedStones: string[];
  versions: Version[];
  latestVersionId: string | null;
  approval: { versionId: string; number: number | null; at: string | null } | null;
  requests: { id: string; versionId: string; number: number | null; comment: string; point: Point | null; at: string | null }[];
  quotes: Quote[];
  currentQuoteId: string | null;
  canAccept: "ok" | "approve-first" | "terms-missing" | null;
  money: Money | null;
  payment: { block: PaymentBlock; testMode: boolean; options: { kind: PayOption; amount: number }[]; methods: string[] };
  payments: Payment[];
  order: { acceptedAt: string | null; productionAt: string | null };
  step: number;
  steps: Step[];
  delivery: { from: string | null; to: string | null } | null;
  journal: JournalEntry[];
  thread: (ThreadMessage | ThreadEvent)[];
};

export const project = (id: string) => call<{ state: "ok"; project: Project }>("GET", "projects/" + encodeURIComponent(id));

export const requestChange = (id: string, versionId: string, comment: string, point: Point | null) =>
  call<{ state: "ok" }>("POST", "projects/" + encodeURIComponent(id) + "/requests", { versionId, comment, point });

export const approveDesign = (id: string, versionId: string) => call<{ state: "ok" }>("POST", "projects/" + encodeURIComponent(id) + "/approve", { versionId });

export type AcceptAnswer = { state: "ok" | "approve-first" | "terms-missing" | "changed" };
export const acceptQuote = (id: string, quoteId: string) => call<AcceptAnswer>("POST", "projects/" + encodeURIComponent(id) + "/quotes/" + encodeURIComponent(quoteId) + "/accept", {});

export type PayAnswer = { state: "ok"; url: string } | { state: Exclude<PaymentBlock, null> | "unavailable" };
export const pay = (id: string, option: PayOption) => call<PayAnswer>("POST", "projects/" + encodeURIComponent(id) + "/pay", { option });

export type Attachment = { name: string; mime: string; data: string };
export const sendMessage = (id: string, body: string, files: Attachment[]) => call<{ state: "ok" }>("POST", "projects/" + encodeURIComponent(id) + "/messages", { body, files });

export const markRead = (id: string) => call<{ state: "ok" }>("POST", "projects/" + encodeURIComponent(id) + "/read", {});

/* ---------- Words for people ---------- */

/** An amount in cents in the language of the page: "€12,500.00", "12 500,00 €". */
export function money(cents: number, currency: string, intl: string): string {
  try {
    return new Intl.NumberFormat(intl, { style: "currency", currency }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2) + " " + currency;
  }
}

/** A day kept without its time ("2027-03-12") in words: "12 March 2027". */
export function day(value: string | null | undefined, intl: string, month: "long" | "short" = "long"): string {
  if (!value) return "";
  const d = new Date(value.length === 10 ? value + "T00:00:00Z" : value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(intl, { day: "numeric", month, year: "numeric", timeZone: value.length === 10 ? "UTC" : "Asia/Dubai" }).format(d);
}

/** A moment (ISO) with its hour, in the visitor's time: "12 Dec 2026, 14:05". */
export function moment(value: string | null | undefined, intl: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d);
}

/** A device in a few words from its user agent ("Safari · iPhone"), "" when nothing is recognised. */
export function deviceOf(ua: string): string {
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac OS X|Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [browser, os].filter(Boolean).join(" · ");
}
