/*
 * A commission of The Private Atelier as the client sees it (only what Berete published for him) and as Berete sees it in the
 * admin (everything, drafts and traces included); its history (ProjectEvent), the journal of who did what (AuditLog), the
 * notifications to the client (an e-mail that only says something waits, with the way to his secure space), the
 * confirmation of a payment (once, by the notification of Stripe only), the ten steps of the making.
 */
import type { Request } from "express";
import { prisma } from "../db.js";
import { publicModel } from "../routes/models.js";
import { visitor } from "../security.js";
import { fileSig } from "./crypto.js";
import { MAILS, sendMail, siteOrigin, teamAddress } from "./mail.js";
import { formatMoney, moneyOf, type Money } from "./money.js";
import { atelierFiles, receiptPdf } from "./pdf.js";
import { atelierSettings } from "./settings.js";
import { stripeKeys, stripeTestMode } from "./stripe.js";

/** The ten steps of the making (Yoni, 27/11/2026), in English as he wrote them (the page translates them). */
export const STEPS = [
  "Design Approved",
  "Payment Confirmed",
  "Production Started",
  "Goldwork & Construction",
  "Stone Setting",
  "Polishing & Finishing",
  "Quality Control",
  "Photography Studio",
  "Ready for Delivery",
  "Delivered",
] as const;

export const PAYMENT_KINDS = { deposit: "50% deposit", full: "Full payment", balance: "Balance" } as const;
export type PaymentKind = keyof typeof PAYMENT_KINDS;

export async function event(projectId: string, kind: string, actor: string, data: Record<string, unknown> = {}): Promise<void> {
  await prisma.projectEvent.create({ data: { projectId, kind, actor, data: data as object } });
}

export async function audit(req: Request | null, actor: string, action: string, target = "", data: Record<string, unknown> = {}): Promise<void> {
  await prisma.auditLog.create({ data: { actor, action, target, data: data as object, ip: req ? visitor(req) : "" } });
}

/** An e-mail to the client: only that something waits in his Private Atelier, and the way there. */
export async function notifyClient(projectId: string, what: string): Promise<void> {
  const p = await prisma.project.findUnique({ where: { id: projectId }, include: { client: true } });
  const to = p?.client.loginEmail ?? p?.client.email;
  if (!p || !to || !p.client.accessEnabled) return;
  const m = MAILS.notice(p.client.name, what, siteOrigin() + "/vip/project/" + p.id);
  await sendMail(to, m.subject, m.text, "notice");
}

/** An e-mail to the team of the house. */
export async function notifyTeam(subject: string, text: string): Promise<void> {
  const to = teamAddress();
  if (to) await sendMail(to, subject, text + "\n\n" + siteOrigin() + "/admin", "team");
}

const dayLabel = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dubai" });
export const versionLabel = (number: number, at: Date | null) => "Design v" + number + (at ? " — " + dayLabel(at) : "");
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);
const dayOf = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null);

/** A signed address of a file of a client (a day for him, 12 hours for the admin). */
export function atelierFileUrl(kind: string, id: string, owner: string, admin: boolean): string {
  const exp = Math.floor(Date.now() / 1000 / 3600) * 3600 + (admin ? 12 : 24) * 3600;
  const who = admin ? "admin" : owner;
  return "/api/vip/atelier/files/" + kind + "/" + id + "?exp=" + exp + "&sig=" + fileSig(kind, id, who, exp) + (admin ? "&as=admin" : "");
}

function journalFileUrl(id: string, admin: boolean): string {
  // The photos and films of the journal: the files of the news of the client (server/routes/vip.ts), his session or the admin.
  return admin ? atelierFileUrl("journal", id, "admin", true) : "/api/vip/files/" + id;
}

async function full(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      versions: { include: { model: true }, orderBy: { number: "desc" } },
      changeRequests: { orderBy: { createdAt: "desc" } },
      approvals: { orderBy: { createdAt: "desc" } },
      quotes: { orderBy: { number: "desc" } },
      payments: { orderBy: { createdAt: "asc" } },
      steps: true,
      messages: { include: { files: true }, orderBy: { createdAt: "asc" } },
      events: { orderBy: { createdAt: "asc" } },
      updates: { include: { files: { orderBy: { position: "asc" } } }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
    },
  });
}
type Full = NonNullable<Awaited<ReturnType<typeof full>>>;

/** The quotation in force: the last one sent or accepted, never a draft nor a superseded one. */
export function currentQuote(p: Pick<Full, "quotes">) {
  return p.quotes.find((q) => q.status === "sent" || q.status === "accepted") ?? null;
}

/** The approval of the version a quotation prices (the latest approval of that version). */
export function approvalOf(p: Pick<Full, "approvals">, versionId: string | null | undefined) {
  return versionId ? (p.approvals.find((a) => a.versionId === versionId) ?? null) : null;
}

export function moneyOfProject(p: Pick<Full, "quotes" | "payments" | "currency" | "designFeeCents">): Money | null {
  const q = currentQuote(p);
  if (!q || q.status !== "accepted") return null;
  const paid = p.payments.filter((x) => x.status === "paid" && x.quoteId === q.id).reduce((s, x) => s + x.amountCents, 0);
  // Payments confirmed under a quotation replaced since then still count (the money was received).
  const before = p.payments.filter((x) => x.status === "paid" && x.quoteId !== q.id).reduce((s, x) => s + x.amountCents, 0);
  return moneyOf({ currency: p.currency, priceCents: q.priceCents, feesCents: q.feesCents, designFeeCents: p.designFeeCents, paidCents: paid + before });
}

/** Why the payment cannot be offered now (null: it can). */
export async function paymentBlock(p: Pick<Full, "quotes" | "payments" | "approvals" | "currency" | "designFeeCents">): Promise<"off" | "keys" | "approve" | "quote" | "paid" | null> {
  const settings = await atelierSettings();
  if (!settings.features.payment) return "off";
  if (!stripeKeys()) return "keys";
  const q = currentQuote(p);
  if (!q || q.status !== "accepted") return "quote";
  if (!approvalOf(p, q.versionId)) return "approve";
  const m = moneyOfProject(p);
  if (!m || m.remaining <= 0) return "paid";
  return null;
}

/** The step reached: -1 before anything, else the highest step done or current. */
function stepsOf(p: Full) {
  return STEPS.map((label, i) => {
    const row = p.steps.find((s) => s.step === i);
    const state = i < p.step || (i === p.step && i === STEPS.length - 1) ? "done" : i === p.step ? "current" : "pending";
    return { index: i, label, state, updatedAt: row && i <= p.step ? iso(row.updatedAt) : null, note: i <= p.step ? (row?.note ?? "") : "" };
  });
}

export async function projectView(projectId: string, opts: { admin: boolean; preview?: boolean }) {
  const p = await full(projectId);
  if (!p) return null;
  const admin = opts.admin && !opts.preview;
  const owner = p.clientId;
  const exp = Math.floor(Date.now() / 1000 / 3600) * 3600 + 86400;
  const versions = p.versions.filter((v) => admin || v.publishedAt);
  const published = p.versions.filter((v) => v.publishedAt);
  const latest = published[0] ?? null;
  const quotes = p.quotes.filter((q) => admin || q.status !== "draft");
  const q = currentQuote(p);
  const money = moneyOfProject(p);
  const settings = await atelierSettings();
  const block = await paymentBlock(p);
  const approvalOfCurrent = q ? approvalOf(p, q.versionId) : null;
  const options = !block && money ? (money.depositPaid ? [{ kind: "balance" as const, amount: money.remaining }] : [{ kind: "deposit" as const, amount: money.deposit }, { kind: "full" as const, amount: money.remaining }]) : [];
  const decisions = p.events
    .filter((e) => admin || !["version-draft", "quote-draft", "update-draft"].includes(e.kind))
    .map((e) => ({ type: "event" as const, id: e.id, kind: e.kind, at: iso(e.createdAt)!, data: e.data, ...(admin ? { actor: e.actor } : {}) }));
  const messages = p.messages.map((m) => ({
    type: "message" as const,
    id: m.id,
    author: m.author as "client" | "house",
    body: m.body,
    at: iso(m.createdAt)!,
    readAt: iso(m.readAt),
    files: m.files.map((f) => ({ id: f.id, name: f.name, kind: f.kind, mime: f.mime, size: f.size, url: atelierFileUrl("message", f.id, owner, admin) })),
  }));
  return {
    id: p.id,
    title: p.title,
    currency: p.currency,
    createdAt: iso(p.createdAt),
    client: { id: p.client.id, name: p.client.name, ...(admin ? { email: p.client.loginEmail ?? p.client.email, accessEnabled: p.client.accessEnabled, activated: Boolean(p.client.passwordHash) } : {}) },
    designFee: { cents: p.designFeeCents, paidAt: dayOf(p.designFeePaidAt), method: p.designFeeMethod },
    allowedMetals: (p.allowedMetals as string[]) ?? [],
    allowedStones: (p.allowedStones as string[]) ?? [],
    versions: versions.map((v) => ({
      id: v.id,
      number: v.number,
      label: versionLabel(v.number, v.publishedAt ?? (admin ? v.createdAt : null)),
      changes: v.changes,
      publishedAt: iso(v.publishedAt),
      model: v.model && v.model.status === "ready" ? publicModel(v.model, exp) : null,
      ...(admin ? { modelId: v.modelId, modelName: v.model?.name ?? null, modelStatus: v.model?.status ?? null } : {}),
      approved: p.approvals.some((a) => a.versionId === v.id),
    })),
    latestVersionId: latest?.id ?? null,
    approval: p.approvals[0]
      ? {
          versionId: p.approvals[0].versionId,
          number: p.versions.find((v) => v.id === p.approvals[0]!.versionId)?.number ?? null,
          at: iso(p.approvals[0].createdAt),
          ...(admin ? { email: p.approvals[0].email, ip: p.approvals[0].ip, userAgent: p.approvals[0].userAgent } : {}),
        }
      : null,
    approvals: admin ? p.approvals.map((a) => ({ versionId: a.versionId, at: iso(a.createdAt), email: a.email, ip: a.ip, userAgent: a.userAgent })) : undefined,
    requests: p.changeRequests.map((r) => ({ id: r.id, versionId: r.versionId, number: p.versions.find((v) => v.id === r.versionId)?.number ?? null, comment: r.comment, point: r.point, at: iso(r.createdAt) })),
    quotes: quotes.map((x) => ({
      id: x.id,
      number: x.number,
      status: x.status,
      versionId: x.versionId,
      versionNumber: p.versions.find((v) => v.id === x.versionId)?.number ?? null,
      materials: x.materials,
      priceCents: x.priceCents,
      feesCents: x.feesCents,
      feesLabel: x.feesLabel,
      totalCents: x.priceCents + x.feesCents,
      leadTime: x.leadTime,
      schedule: x.schedule,
      terms: x.terms,
      sentAt: iso(x.sentAt),
      acceptedAt: iso(x.acceptedAt),
      supersededAt: iso(x.supersededAt),
      sha256: x.pdfSha256,
      pdfUrl: x.pdfSha256 ? atelierFileUrl("quote", x.id, owner, admin) : null,
      ...(admin ? { acceptedEmail: x.acceptedEmail, acceptedIp: x.acceptedIp, acceptedUa: x.acceptedUa } : {}),
    })),
    currentQuoteId: q?.id ?? null,
    // The client may accept the quotation in force once its design is approved and the terms of Berete are written.
    canAccept: q && q.status === "sent" ? (!approvalOfCurrent ? "approve-first" : !q.terms.trim() ? "terms-missing" : "ok") : null,
    money,
    payment: { block, testMode: stripeTestMode(), options, methods: settings.methods },
    payments: p.payments
      .filter((x) => admin || x.status === "paid")
      .map((x) => ({ id: x.id, kind: x.kind, amountCents: x.amountCents, currency: x.currency, status: x.status, paidAt: iso(x.paidAt), method: x.method, receiptNumber: x.receiptNumber, receiptUrl: x.receiptSha256 ? atelierFileUrl("receipt", x.id, owner, admin) : null, createdAt: iso(x.createdAt) })),
    order: { acceptedAt: iso(p.orderAcceptedAt), productionAt: iso(p.productionAt) },
    step: p.step,
    steps: stepsOf(p),
    delivery: p.deliveryFrom || p.deliveryTo ? { from: dayOf(p.deliveryFrom), to: dayOf(p.deliveryTo) } : null,
    journal: p.updates
      .filter((u) => admin || !u.draft)
      .map((u) => ({
        id: u.id,
        date: dayOf(u.date),
        note: u.note,
        draft: u.draft,
        createdAt: iso(u.createdAt),
        files: u.files.map((f) => ({ id: f.id, kind: f.kind as "image" | "video", url: journalFileUrl(f.id, admin), width: f.width, height: f.height })),
      })),
    thread: [...messages, ...decisions].sort((a, b) => a.at.localeCompare(b.at)),
  };
}

export type ProjectView = NonNullable<Awaited<ReturnType<typeof projectView>>>;

/* ---------- A payment confirmed (only by the notification of Stripe) ---------- */

export async function confirmPayment(paymentId: string, info: { sessionId: string; intent: string | null; method: string; amountTotal: number | null; currency: string | null }): Promise<"done" | "already" | "mismatch" | "missing"> {
  const pay = await prisma.payment.findUnique({ where: { id: paymentId }, include: { project: { include: { client: true } }, quote: true } });
  if (!pay || (pay.stripeSession && pay.stripeSession !== info.sessionId)) return "missing";
  if (pay.status === "paid") return "already";
  // What Stripe received must be exactly what the server asked for.
  if (info.amountTotal !== pay.amountCents || (info.currency ?? "").toUpperCase() !== pay.currency.toUpperCase()) {
    await prisma.payment.update({ where: { id: pay.id }, data: { status: "review" } });
    await event(pay.projectId, "payment-review", "stripe", { paymentId: pay.id, amount: info.amountTotal, expected: pay.amountCents });
    await notifyTeam("Paiement à vérifier — " + pay.project.title, "Stripe annonce un montant différent de celui demandé (" + info.amountTotal + " au lieu de " + pay.amountCents + " centimes). Rien n'a été confirmé.");
    return "mismatch";
  }
  const paidAt = new Date();
  const number = "BJ-" + paidAt.toISOString().slice(0, 10).replace(/-/g, "") + "-" + pay.id.slice(-6).toUpperCase();
  const won = await prisma.payment.updateMany({ where: { id: pay.id, status: { not: "paid" } }, data: { status: "paid", paidAt, stripeIntent: info.intent, method: info.method, receiptNumber: number } });
  if (won.count === 0) return "already";
  const project = await full(pay.projectId);
  if (!project) return "done";
  const money = moneyOfProject(project);
  const r = await receiptPdf({
    number,
    projectTitle: project.title,
    clientName: project.client.name,
    kind: PAYMENT_KINDS[pay.kind as PaymentKind] ?? pay.kind,
    amountCents: pay.amountCents,
    currency: pay.currency,
    paidAt,
    method: info.method,
    quoteNumber: pay.quote.number,
    totalCents: money?.total ?? pay.quote.priceCents + pay.quote.feesCents,
    creditedCents: money?.credited ?? pay.amountCents,
    remainingCents: money?.remaining ?? 0,
  });
  atelierFiles.write(project.clientId, project.id, "receipt-" + pay.id + ".pdf", r.data);
  await prisma.payment.update({ where: { id: pay.id }, data: { receiptSha256: r.sha256 } });
  // The step « Payment Confirmed » reached; the making authorized when Berete accepted the order and the deposit is in.
  await reachStep(project.id, 1, "stripe");
  await event(project.id, "payment-confirmed", "stripe", { paymentId: pay.id, kind: pay.kind, amountCents: pay.amountCents, currency: pay.currency, receipt: number });
  await authorizeProduction(project.id);
  const to = project.client.loginEmail ?? project.client.email;
  if (to) {
    const m = MAILS.receipt(project.client.name, number, siteOrigin() + "/vip/project/" + project.id);
    await sendMail(to, m.subject, m.text, "receipt", [{ filename: "BERETE-receipt-" + number + ".pdf", content: r.data, contentType: "application/pdf" }]);
  }
  await notifyTeam("Paiement reçu — " + project.title, project.client.name + " a payé " + formatMoney(pay.amountCents, pay.currency) + " (" + (PAYMENT_KINDS[pay.kind as PaymentKind] ?? pay.kind) + "), reçu " + number + ".");
  return "done";
}

/** A step reached (never back: a lower step leaves the project where it is), with its date. */
export async function reachStep(projectId: string, step: number, actor: string, note?: string): Promise<void> {
  await prisma.projectStep.upsert({ where: { projectId_step: { projectId, step } }, create: { projectId, step, note: note ?? "" }, update: note === undefined ? { state: "reached" } : { note } });
  const p = await prisma.project.findUnique({ where: { id: projectId }, select: { step: true } });
  if (p && step > p.step) await prisma.project.update({ where: { id: projectId }, data: { step } });
  await event(projectId, "step", actor, { step, label: STEPS[step] });
}

/** The making starts only when Berete accepted the order AND the funds are confirmed (the deposit received). */
export async function authorizeProduction(projectId: string): Promise<boolean> {
  const p = await full(projectId);
  if (!p || p.productionAt || !p.orderAcceptedAt) return false;
  const m = moneyOfProject(p);
  if (!m || !m.depositPaid) return false;
  await prisma.project.update({ where: { id: projectId }, data: { productionAt: new Date() } });
  await event(projectId, "production-authorized", "system", {});
  return true;
}
