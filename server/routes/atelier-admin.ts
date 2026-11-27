/*
 * The Private Atelier, the side of Berete (27/11/2026), mounted on /api, every route behind the password of the admin:
 *   GET  /admin/atelier/dashboard                       what waits: designs to approve, quotations sent, payments, the making
 *   GET  /admin/atelier/settings, PUT                   Yoni's commercial terms, the switches, the means of payment, the limits
 *   GET  /admin/atelier/outbox                          the e-mails sent (caught here without a mailbox)
 *   GET  /admin/atelier/audit                           who did what, when
 *   POST /admin/atelier/clients/:id/invite { days? }    a personal invitation (used once, expiring), by e-mail; its link back
 *   PUT  /admin/atelier/clients/:id/access { enabled }  cut or give back the access (cut: every session closed)
 *   GET  /admin/atelier/clients/:id/security            his sessions and his sign-ins
 *   DELETE /admin/atelier/clients/:id/sessions/:sid
 *   GET  /admin/atelier/projects?clientId=              the projects; POST { clientId, title, … }
 *   GET  /admin/atelier/projects/:id                    everything (drafts, traces); ?preview=1 as the client sees it
 *   PUT  /admin/atelier/projects/:id                    title, design fee, metals and stones allowed, delivery window, archive
 *   POST /admin/atelier/projects/:id/versions { modelId, changes }   a draft version; PUT …/:vid, POST …/:vid/publish, DELETE …/:vid
 *   POST /admin/atelier/projects/:id/quotes { … }       a draft quotation; PUT …/:qid; POST …/:qid/send (frozen as a PDF)
 *   POST /admin/atelier/projects/:id/order              the order accepted (the making starts once the funds are in)
 *   PUT  /admin/atelier/projects/:id/step { step, note, notify }     a step of the making reached
 *   POST /admin/atelier/projects/:id/updates/:uid/publish            a page of the journal published (written by /admin/clients/:id/updates)
 *   POST /admin/atelier/projects/:id/messages { body, files }        a message of Berete
 *   POST /admin/atelier/projects/:id/notify { what }    an e-mail to the client: something waits in his space
 */
import { Router, type Request } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { requireAdmin } from "./site.js";
import { keyOf, newToken } from "../atelier/crypto.js";
import { MAILS, sendMail, siteOrigin } from "../atelier/mail.js";
import { atelierFiles, quotePdf } from "../atelier/pdf.js";
import { atelierSettings, saveAtelierSettings, WHATSAPP_NEEDS } from "../atelier/settings.js";
import { stripeKeys, stripeTestMode } from "../atelier/stripe.js";
import { approvalOf, audit, authorizeProduction, currentQuote, event, moneyOfProject, notifyClient, projectView, reachStep, STEPS, versionLabel } from "../atelier/project.js";
import { MESSAGE_BODY, saveMessage } from "./atelier-client.js";
import { logLogin } from "../atelier/auth.js";

export const atelierAdmin = Router();
atelierAdmin.use("/admin/atelier", requireAdmin);

const ADMIN = "admin";
const day = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T00:00:00Z") : null);
const idOk = (v: unknown) => typeof v === "string" && /^[a-z0-9]{10,40}$/i.test(v);

/* ---------- Dashboard, settings, outbox, journal ---------- */

atelierAdmin.get("/admin/atelier/dashboard", async (_req, res) => {
  const projects = await prisma.project.findMany({
    where: { archivedAt: null },
    include: { client: { select: { id: true, name: true, accessEnabled: true, passwordHash: true } }, versions: { orderBy: { number: "desc" } }, approvals: true, quotes: { orderBy: { number: "desc" } }, payments: true, messages: { where: { author: "client", readAt: null }, select: { id: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const rows = projects.map((p) => {
    const latest = p.versions.find((v) => v.publishedAt);
    const q = currentQuote(p);
    const money = moneyOfProject({ ...p, quotes: p.quotes, payments: p.payments });
    const lastPaid = p.payments.filter((x) => x.status === "paid").sort((a, b) => (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0))[0];
    return {
      id: p.id,
      title: p.title,
      client: { id: p.client.id, name: p.client.name, accessEnabled: p.client.accessEnabled, activated: Boolean(p.client.passwordHash) },
      awaitingApproval: Boolean(latest && !p.approvals.some((a) => a.versionId === latest.id)),
      latestVersion: latest?.number ?? null,
      quoteSent: q?.status === "sent" ? q.number : null,
      quoteAccepted: q?.status === "accepted" ? q.number : null,
      remainingCents: money?.remaining ?? null,
      depositPaid: money?.depositPaid ?? false,
      lastPaymentAt: lastPaid?.paidAt ?? null,
      pendingPayments: p.payments.filter((x) => x.status === "pending").length,
      orderAccepted: Boolean(p.orderAcceptedAt),
      production: Boolean(p.productionAt),
      step: p.step,
      stepLabel: p.step >= 0 ? STEPS[p.step] : null,
      unread: p.messages.length,
      currency: p.currency,
      updatedAt: p.updatedAt,
    };
  });
  // A balance waits once the making is done (Ready for Delivery) and something remains to pay.
  const overdue = rows.filter((r) => r.step >= 8 && (r.remainingCents ?? 0) > 0);
  res.json({
    projects: rows,
    awaitingApproval: rows.filter((r) => r.awaitingApproval),
    quotesSent: rows.filter((r) => r.quoteSent !== null),
    paymentsReceived: rows.filter((r) => r.lastPaymentAt).sort((a, b) => (b.lastPaymentAt?.getTime() ?? 0) - (a.lastPaymentAt?.getTime() ?? 0)),
    balanceDue: overdue,
    inProduction: rows.filter((r) => r.production && r.step < 9),
  });
});

atelierAdmin.get("/admin/atelier/settings", async (_req, res) => {
  const s = await atelierSettings();
  res.json({
    settings: s,
    status: {
      stripeKeys: stripeKeys(),
      stripeTestMode: stripeTestMode(),
      webhookUrl: siteOrigin() + "/api/stripe/webhook",
      smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
      openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
      whatsapp: { ready: false, needs: WHATSAPP_NEEDS },
    },
  });
});

atelierAdmin.put("/admin/atelier/settings", async (req, res) => {
  const before = await atelierSettings();
  const s = await saveAtelierSettings({ ...before, ...(req.body ?? {}), features: { ...before.features, ...((req.body ?? {}).features ?? {}), whatsappNotify: false } });
  await audit(req, ADMIN, "settings", "", { terms: s.terms !== before.terms, features: s.features });
  res.json({ settings: s });
});

atelierAdmin.get("/admin/atelier/outbox", async (_req, res) => {
  const mails = await prisma.outboxEmail.findMany({ orderBy: { createdAt: "desc" }, take: 60 });
  const mailbox = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  res.json({
    mailbox,
    // Once really sent, the links and codes of an e-mail are hidden here (only the mailbox of the client has them).
    items: mails.map((m) => ({ id: m.id, to: m.to, subject: m.subject, kind: m.kind, sentAt: m.sentAt, error: m.error, createdAt: m.createdAt, text: mailbox && m.sentAt && ["invite", "code", "magic"].includes(m.kind) ? m.text.replace(/https?:\/\/\S+/g, "[lien envoyé]").replace(/\b\d{6}\b/g, "••••••") : m.text })),
  });
});

atelierAdmin.get("/admin/atelier/audit", async (req, res) => {
  const target = typeof req.query.target === "string" ? req.query.target : undefined;
  const rows = await prisma.auditLog.findMany({ where: target ? { target } : {}, orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ items: rows });
});

/* ---------- Clients: invitation, access, security ---------- */

atelierAdmin.post("/admin/atelier/clients/:id/invite", async (req, res) => {
  const id = String(req.params.id);
  const settings = await atelierSettings();
  const body = z.object({ days: z.number().int().min(1).max(30).optional(), email: z.string().email().max(200).optional() }).safeParse(req.body ?? {});
  const client = idOk(id) ? await prisma.client.findUnique({ where: { id } }) : null;
  if (!client) return void res.status(404).json({ error: "Client introuvable." });
  const email = (body.success && body.data.email ? body.data.email : (client.loginEmail ?? client.email ?? "")).trim().toLowerCase();
  if (!email) return void res.status(400).json({ error: "Indiquez d'abord l'e-mail du client." });
  const taken = await prisma.client.findFirst({ where: { loginEmail: email, NOT: { id } }, select: { id: true } });
  if (taken) return void res.status(409).json({ error: "Cet e-mail est déjà celui d'un autre client." });
  const days = (body.success && body.data.days) || settings.inviteDays;
  const token = newToken();
  // A new invitation replaces the previous ones that were not used.
  await prisma.clientInvite.updateMany({ where: { clientId: id, usedAt: null }, data: { expiresAt: new Date() } });
  await prisma.clientInvite.create({ data: { clientId: id, tokenKey: keyOf("invite", token), expiresAt: new Date(Date.now() + days * 86_400_000) } });
  await prisma.client.update({ where: { id }, data: { email: client.email ?? email, ...(client.passwordHash ? {} : { loginEmail: email }) } });
  const link = siteOrigin() + "/vip/invite/" + token;
  const m = MAILS.invite(client.name, link, days);
  await sendMail(email, m.subject, m.text, "invite");
  await audit(req, ADMIN, "invite", id, { days });
  res.json({ ok: true, link, days, mailbox: Boolean(process.env.SMTP_HOST) });
});

atelierAdmin.put("/admin/atelier/clients/:id/access", async (req, res) => {
  const id = String(req.params.id);
  const body = z.object({ enabled: z.boolean() }).safeParse(req.body);
  if (!body.success || !idOk(id)) return void res.status(400).json({ error: "Demande invalide." });
  const done = await prisma.client.update({ where: { id }, data: { accessEnabled: body.data.enabled } }).catch(() => null);
  if (!done) return void res.status(404).json({ error: "Client introuvable." });
  if (!body.data.enabled) {
    await prisma.clientSession.updateMany({ where: { clientId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await prisma.clientInvite.updateMany({ where: { clientId: id, usedAt: null }, data: { expiresAt: new Date() } });
  }
  await logLogin(req, body.data.enabled ? "access-restored" : "access-cut", id);
  await audit(req, ADMIN, body.data.enabled ? "access-restored" : "access-cut", id);
  res.json({ ok: true });
});

atelierAdmin.get("/admin/atelier/clients/:id/security", async (req, res) => {
  const id = String(req.params.id);
  const [client, sessions, logins, invites] = await Promise.all([
    prisma.client.findUnique({ where: { id }, select: { id: true, name: true, loginEmail: true, email: true, accessEnabled: true, passwordHash: true, twoFactor: true, activatedAt: true } }),
    prisma.clientSession.findMany({ where: { clientId: id }, orderBy: { lastSeenAt: "desc" }, take: 30 }),
    prisma.clientLogin.findMany({ where: { clientId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.clientInvite.findMany({ where: { clientId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  if (!client) return void res.status(404).json({ error: "Client introuvable." });
  res.json({
    client: { id: client.id, name: client.name, email: client.loginEmail ?? client.email, accessEnabled: client.accessEnabled, activated: Boolean(client.passwordHash), activatedAt: client.activatedAt, twoFactor: client.twoFactor || "off" },
    sessions: sessions.map((s) => ({ id: s.id, ip: s.ip, userAgent: s.userAgent, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, expiresAt: s.expiresAt, revokedAt: s.revokedAt, alive: !s.revokedAt && s.expiresAt.getTime() > Date.now() })),
    logins: logins.map((l) => ({ event: l.event, email: l.email, ip: l.ip, userAgent: l.userAgent, at: l.createdAt })),
    invites: invites.map((i) => ({ id: i.id, createdAt: i.createdAt, expiresAt: i.expiresAt, usedAt: i.usedAt })),
  });
});

atelierAdmin.delete("/admin/atelier/clients/:id/sessions/:sid", async (req, res) => {
  const done = await prisma.clientSession.updateMany({ where: { id: String(req.params.sid), clientId: String(req.params.id), revokedAt: null }, data: { revokedAt: new Date() } });
  if (done.count) {
    await logLogin(req, "session-revoked-admin", String(req.params.id));
    await audit(req, ADMIN, "session-revoked", String(req.params.id));
  }
  res.json({ ok: true });
});

/* ---------- Projects ---------- */

const ProjectIn = z.object({
  title: z.string().trim().min(1).max(160),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  designFeeCents: z.number().int().min(0).max(100_000_000).optional(),
  designFeePaidAt: z.string().max(10).nullable().optional(),
  designFeeMethod: z.string().max(80).optional(),
  allowedMetals: z.array(z.string().max(40)).max(20).optional(),
  allowedStones: z.array(z.string().max(40)).max(20).optional(),
  deliveryFrom: z.string().max(10).nullable().optional(),
  deliveryTo: z.string().max(10).nullable().optional(),
  archived: z.boolean().optional(),
});

function projectData(d: z.infer<typeof ProjectIn>) {
  return {
    title: d.title,
    ...(d.currency ? { currency: d.currency } : {}),
    ...(d.designFeeCents !== undefined ? { designFeeCents: d.designFeeCents } : {}),
    ...(d.designFeePaidAt !== undefined ? { designFeePaidAt: day(d.designFeePaidAt) } : {}),
    ...(d.designFeeMethod !== undefined ? { designFeeMethod: d.designFeeMethod } : {}),
    ...(d.allowedMetals ? { allowedMetals: d.allowedMetals } : {}),
    ...(d.allowedStones ? { allowedStones: d.allowedStones } : {}),
    ...(d.deliveryFrom !== undefined ? { deliveryFrom: day(d.deliveryFrom) } : {}),
    ...(d.deliveryTo !== undefined ? { deliveryTo: day(d.deliveryTo) } : {}),
    ...(d.archived !== undefined ? { archivedAt: d.archived ? new Date() : null } : {}),
  };
}

atelierAdmin.get("/admin/atelier/projects", async (req, res) => {
  const clientId = typeof req.query.clientId === "string" ? req.query.clientId : undefined;
  const rows = await prisma.project.findMany({ where: clientId ? { clientId } : {}, include: { client: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } });
  res.json({ items: rows.map((p) => ({ id: p.id, title: p.title, client: p.client, step: p.step, archived: Boolean(p.archivedAt), createdAt: p.createdAt })) });
});

atelierAdmin.post("/admin/atelier/projects", async (req, res) => {
  const body = ProjectIn.extend({ clientId: z.string() }).safeParse(req.body);
  if (!body.success || !(await prisma.client.findUnique({ where: { id: body.data.clientId }, select: { id: true } }))) return void res.status(400).json({ error: "Indiquez le client et le titre du projet." });
  const p = await prisma.project.create({ data: { clientId: body.data.clientId, ...projectData(body.data) } });
  await event(p.id, "project-created", ADMIN);
  await audit(req, ADMIN, "project-created", p.id, { title: p.title });
  res.status(201).json({ id: p.id });
});

async function projectOr404(req: Request, res: import("express").Response) {
  const id = String(req.params.id);
  const p = idOk(id) ? await prisma.project.findUnique({ where: { id }, include: { client: true } }) : null;
  if (!p) res.status(404).json({ error: "Projet introuvable." });
  return p;
}

atelierAdmin.get("/admin/atelier/projects/:id", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const view = await projectView(p.id, { admin: true, preview: req.query.preview === "1" });
  const auditRows = req.query.preview === "1" ? [] : await prisma.auditLog.findMany({ where: { target: p.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const settings = await atelierSettings();
  res.json({ project: view, audit: auditRows, termsWritten: Boolean(settings.terms.trim()) });
});

atelierAdmin.put("/admin/atelier/projects/:id", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const body = ProjectIn.partial({ title: true }).safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: "Valeurs invalides." });
  const data = projectData({ title: body.data.title ?? p.title, ...body.data });
  await prisma.project.update({ where: { id: p.id }, data });
  const deliveryChanged = body.data.deliveryFrom !== undefined || body.data.deliveryTo !== undefined;
  if (deliveryChanged) await event(p.id, "delivery", ADMIN, { from: body.data.deliveryFrom ?? null, to: body.data.deliveryTo ?? null });
  await audit(req, ADMIN, "project-updated", p.id, Object.keys(body.data).reduce((o, k) => ({ ...o, [k]: true }), {}));
  res.json({ ok: true });
});

/* ---------- Design versions ---------- */

const VersionIn = z.object({ modelId: z.string().max(40).nullable().optional(), changes: z.string().max(4000).optional() });

atelierAdmin.post("/admin/atelier/projects/:id/versions", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const body = VersionIn.safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: "Valeurs invalides." });
  const model = body.data.modelId ? await prisma.model3D.findUnique({ where: { id: body.data.modelId }, select: { id: true } }) : null;
  const last = await prisma.designVersion.findFirst({ where: { projectId: p.id }, orderBy: { number: "desc" } });
  const v = await prisma.designVersion.create({ data: { projectId: p.id, number: (last?.number ?? 0) + 1, modelId: model?.id ?? null, changes: body.data.changes ?? "" } });
  await event(p.id, "version-draft", ADMIN, { version: v.number });
  await audit(req, ADMIN, "version-created", p.id, { version: v.number });
  res.status(201).json({ id: v.id, number: v.number });
});

atelierAdmin.put("/admin/atelier/projects/:id/versions/:vid", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const body = VersionIn.safeParse(req.body);
  const v = await prisma.designVersion.findFirst({ where: { id: String(req.params.vid), projectId: p.id } });
  if (!body.success || !v) return void res.status(400).json({ error: "Version introuvable." });
  // A published version never changes (what the client saw and maybe approved): a new version instead.
  if (v.publishedAt) return void res.status(409).json({ error: "Version déjà publiée : créez une nouvelle version." });
  const model = body.data.modelId ? await prisma.model3D.findUnique({ where: { id: body.data.modelId }, select: { id: true } }) : null;
  await prisma.designVersion.update({ where: { id: v.id }, data: { ...(body.data.modelId !== undefined ? { modelId: model?.id ?? null } : {}), ...(body.data.changes !== undefined ? { changes: body.data.changes } : {}) } });
  await audit(req, ADMIN, "version-updated", p.id, { version: v.number });
  res.json({ ok: true });
});

atelierAdmin.post("/admin/atelier/projects/:id/versions/:vid/publish", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const v = await prisma.designVersion.findFirst({ where: { id: String(req.params.vid), projectId: p.id }, include: { model: true } });
  if (!v) return void res.status(404).json({ error: "Version introuvable." });
  if (!v.model || v.model.status !== "ready") return void res.status(400).json({ error: "Choisissez d'abord un modèle 3D prêt pour cette version." });
  if (!v.publishedAt) {
    const at = new Date();
    await prisma.designVersion.update({ where: { id: v.id }, data: { publishedAt: at } });
    await event(p.id, "version-published", ADMIN, { version: v.number, label: versionLabel(v.number, at) });
    await audit(req, ADMIN, "version-published", p.id, { version: v.number });
    await notifyClient(p.id, "A new design version is ready (" + versionLabel(v.number, at) + ")");
  }
  res.json({ ok: true });
});

atelierAdmin.delete("/admin/atelier/projects/:id/versions/:vid", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const v = await prisma.designVersion.findFirst({ where: { id: String(req.params.vid), projectId: p.id } });
  if (!v || v.publishedAt) return void res.status(409).json({ error: "Seul un brouillon peut être supprimé." });
  await prisma.designVersion.delete({ where: { id: v.id } });
  await audit(req, ADMIN, "version-deleted", p.id, { version: v.number });
  res.json({ ok: true });
});

/* ---------- Quotations ---------- */

const QuoteIn = z.object({
  versionId: z.string().max(40).nullable().optional(),
  materials: z.string().max(6000).optional(),
  priceCents: z.number().int().min(0).max(10_000_000_000).optional(),
  feesCents: z.number().int().min(0).max(10_000_000_000).optional(),
  feesLabel: z.string().max(160).optional(),
  leadTime: z.string().max(2000).optional(),
  schedule: z.string().max(4000).optional(),
});

atelierAdmin.post("/admin/atelier/projects/:id/quotes", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const body = QuoteIn.safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: "Valeurs invalides." });
  const version = body.data.versionId ? await prisma.designVersion.findFirst({ where: { id: body.data.versionId, projectId: p.id } }) : null;
  const last = await prisma.quote.findFirst({ where: { projectId: p.id }, orderBy: { number: "desc" } });
  const q = await prisma.quote.create({ data: { projectId: p.id, number: (last?.number ?? 0) + 1, versionId: version?.id ?? null, materials: body.data.materials ?? "", priceCents: body.data.priceCents ?? 0, feesCents: body.data.feesCents ?? 0, feesLabel: body.data.feesLabel ?? "", leadTime: body.data.leadTime ?? "", schedule: body.data.schedule ?? "" } });
  await event(p.id, "quote-draft", ADMIN, { quote: q.number });
  await audit(req, ADMIN, "quote-created", p.id, { quote: q.number });
  res.status(201).json({ id: q.id, number: q.number });
});

atelierAdmin.put("/admin/atelier/projects/:id/quotes/:qid", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const body = QuoteIn.safeParse(req.body);
  const q = await prisma.quote.findFirst({ where: { id: String(req.params.qid), projectId: p.id } });
  if (!body.success || !q) return void res.status(400).json({ error: "Devis introuvable." });
  // Sent, a quotation never changes: a new one replaces it (and asks for a new acceptance).
  if (q.status !== "draft") return void res.status(409).json({ error: "Devis déjà envoyé : créez un nouveau devis (l'ancien sera marqué « remplacé »)." });
  const version = body.data.versionId ? await prisma.designVersion.findFirst({ where: { id: body.data.versionId, projectId: p.id } }) : undefined;
  await prisma.quote.update({ where: { id: q.id }, data: { ...body.data, ...(body.data.versionId !== undefined ? { versionId: version?.id ?? null } : {}) } });
  await audit(req, ADMIN, "quote-updated", p.id, { quote: q.number });
  res.json({ ok: true });
});

atelierAdmin.post("/admin/atelier/projects/:id/quotes/:qid/send", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const q = await prisma.quote.findFirst({ where: { id: String(req.params.qid), projectId: p.id } });
  if (!q || q.status !== "draft") return void res.status(409).json({ error: "Seul un brouillon peut être envoyé." });
  const settings = await atelierSettings();
  // Yoni's commercial terms first: never a clause written by us.
  if (!settings.terms.trim()) return void res.status(400).json({ error: "Écrivez d'abord vos conditions commerciales (onglet Private Atelier → Réglages) : sans elles, le client ne peut pas accepter de devis." });
  if (q.priceCents <= 0) return void res.status(400).json({ error: "Indiquez le prix final." });
  const version = q.versionId ? await prisma.designVersion.findFirst({ where: { id: q.versionId, projectId: p.id } }) : null;
  if (!version?.publishedAt) return void res.status(400).json({ error: "Choisissez la version publiée que ce devis chiffre." });
  const sentAt = new Date();
  const pdf = await quotePdf({
    number: q.number,
    projectTitle: p.title,
    clientName: p.client.name,
    version: versionLabel(version.number, version.publishedAt),
    materials: q.materials,
    priceCents: q.priceCents,
    feesCents: q.feesCents,
    feesLabel: q.feesLabel,
    designFeeCents: p.designFeeCents,
    currency: p.currency,
    leadTime: q.leadTime,
    schedule: q.schedule,
    terms: settings.terms,
    sentAt,
  });
  atelierFiles.write(p.clientId, p.id, "quote-" + q.id + ".pdf", pdf.data);
  // The quotations sent or accepted before: replaced (kept in the history, marked « superseded »).
  const older = await prisma.quote.findMany({ where: { projectId: p.id, status: { in: ["sent", "accepted"] }, NOT: { id: q.id } } });
  await prisma.$transaction([
    prisma.quote.updateMany({ where: { id: { in: older.map((o) => o.id) } }, data: { status: "superseded", supersededAt: sentAt } }),
    prisma.quote.update({ where: { id: q.id }, data: { status: "sent", sentAt, terms: settings.terms, pdfSha256: pdf.sha256 } }),
  ]);
  for (const o of older) await event(p.id, "quote-superseded", ADMIN, { quote: o.number, by: q.number });
  await event(p.id, "quote-sent", ADMIN, { quote: q.number, sha256: pdf.sha256 });
  await audit(req, ADMIN, "quote-sent", p.id, { quote: q.number, sha256: pdf.sha256 });
  await notifyClient(p.id, "Your quotation Q" + q.number + " is ready");
  res.json({ ok: true, sha256: pdf.sha256 });
});

/* ---------- The order, the making, the journal ---------- */

atelierAdmin.post("/admin/atelier/projects/:id/order", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const full = await prisma.project.findUnique({ where: { id: p.id }, include: { quotes: { orderBy: { number: "desc" } }, approvals: { orderBy: { createdAt: "desc" } } } });
  const q = full ? currentQuote(full) : null;
  if (!full || !q || q.status !== "accepted" || !approvalOf(full, q.versionId)) return void res.status(400).json({ error: "La commande peut être acceptée quand le design est validé et le devis accepté par le client." });
  if (!full.orderAcceptedAt) {
    await prisma.project.update({ where: { id: p.id }, data: { orderAcceptedAt: new Date() } });
    await event(p.id, "order-accepted", ADMIN, { quote: q.number });
    await audit(req, ADMIN, "order-accepted", p.id, { quote: q.number });
  }
  const started = await authorizeProduction(p.id);
  res.json({ ok: true, production: started || Boolean(full.productionAt) });
});

atelierAdmin.put("/admin/atelier/projects/:id/step", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const body = z.object({ step: z.number().int().min(0).max(9), note: z.string().max(600).optional(), notify: z.boolean().optional() }).safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: "Étape invalide." });
  // From « Production Started »: only once the order is accepted and the funds confirmed.
  if (body.data.step >= 2 && !p.productionAt) return void res.status(400).json({ error: "La fabrication n'est pas encore autorisée : il faut la commande acceptée et l'acompte reçu." });
  await reachStep(p.id, body.data.step, ADMIN, body.data.note ?? "");
  await audit(req, ADMIN, "step", p.id, { step: body.data.step });
  if (body.data.notify !== false) await notifyClient(p.id, "Your piece has reached a new step: " + STEPS[body.data.step]);
  res.json({ ok: true });
});

atelierAdmin.post("/admin/atelier/projects/:id/updates/:uid/publish", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const u = await prisma.clientUpdate.findFirst({ where: { id: String(req.params.uid), projectId: p.id } });
  if (!u) return void res.status(404).json({ error: "Page du journal introuvable." });
  if (u.draft) {
    await prisma.clientUpdate.update({ where: { id: u.id }, data: { draft: false } });
    await event(p.id, "journal", ADMIN, { updateId: u.id });
    await audit(req, ADMIN, "journal-published", p.id);
    await notifyClient(p.id, "A new update from the workshop is waiting for you");
  }
  res.json({ ok: true });
});

atelierAdmin.post("/admin/atelier/projects/:id/messages", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const body = MESSAGE_BODY.safeParse(req.body);
  const saved = body.success ? await saveMessage(p.id, p.clientId, "house", body.data) : null;
  if (!saved) return void res.status(400).json({ error: "Écrivez un message ou joignez une photo / un PDF (10 Mo au plus)." });
  await audit(req, ADMIN, "message", p.id);
  await notifyClient(p.id, "You have a new message from BERETE");
  // His messages read by Berete.
  await prisma.projectMessage.updateMany({ where: { projectId: p.id, author: "client", readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

atelierAdmin.post("/admin/atelier/projects/:id/read", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  await prisma.projectMessage.updateMany({ where: { projectId: p.id, author: "client", readAt: null }, data: { readAt: new Date() } });
  res.json({ ok: true });
});

atelierAdmin.post("/admin/atelier/projects/:id/notify", async (req, res) => {
  const p = await projectOr404(req, res);
  if (!p) return;
  const body = z.object({ what: z.string().trim().min(3).max(160) }).safeParse(req.body);
  if (!body.success) return void res.status(400).json({ error: "Écrivez ce qui attend le client (en anglais, sans détail sensible)." });
  await notifyClient(p.id, body.data.what);
  await audit(req, ADMIN, "notify", p.id, { what: body.data.what });
  res.json({ ok: true });
});
