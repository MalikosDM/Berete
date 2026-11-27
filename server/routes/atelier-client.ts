/*
 * The Private Atelier, the side of the client (27/11/2026), mounted on /api (under /vip/atelier: open through the door of the
 * site under construction, like the rest of the client space):
 *   POST /vip/atelier/invite/check   { token }                      the invitation: valid, used or expired
 *   POST /vip/atelier/invite/accept  { token, password }            creates his access (a strong password), signs him in
 *   POST /vip/atelier/signin         { email, password }            → ok | code (second factor: e-mail or app) | wrong | wait | paused
 *   POST /vip/atelier/signin/code    { challenge, code }            the second factor
 *   POST /vip/atelier/magic          { email }                      a sign-in link by e-mail (always "sent": nothing says who exists)
 *   POST /vip/atelier/magic/use      { token }                      → ok | code (an authenticator app still asked)
 *   POST /vip/atelier/signout
 *   GET  /vip/atelier/me                                            his name, his projects ({ state: "out" } when not signed in)
 *   GET  /vip/atelier/security                                      his sessions, his last sign-ins, his second factor
 *   POST /vip/atelier/security/2fa   { mode: "email" | "off" }
 *   POST /vip/atelier/security/totp/start, /totp/confirm { code }   an authenticator app
 *   POST /vip/atelier/security/password { current, next }
 *   DELETE /vip/atelier/security/sessions/:id
 *   GET  /vip/atelier/projects/:id                                  his project (only what Berete published)
 *   POST /vip/atelier/projects/:id/requests { versionId, comment, point? }   a change asked on a version
 *   POST /vip/atelier/projects/:id/approve  { versionId }           APPROVE FINAL DESIGN (date, account, address, device kept)
 *   POST /vip/atelier/projects/:id/quotes/:quoteId/accept           ACCEPT QUOTATION
 *   POST /vip/atelier/projects/:id/pay      { option: deposit | full | balance }   → { url } of the page of Stripe
 *   POST /vip/atelier/projects/:id/messages { body, files: [{ name, mime, data (base64) }] }
 *   POST /vip/atelier/projects/:id/read                             his messages from Berete read
 *   GET  /vip/atelier/files/:kind/:id?exp&sig                       a quotation, a receipt, an attachment: signed, expiring, his only
 * Someone else's project or file: the same answer as one that does not exist.
 */
import { Router, type Request, type Response } from "express";
import fs from "node:fs";
import { z } from "zod";
import { prisma } from "../db.js";
import { limiter } from "../security.js";
import { clientFiles } from "../models/storage.js";
import { agentOf, challengeClient, challengeFor, closeCookie, cookieSession, logLogin, openClientSession, requireClient } from "../atelier/auth.js";
import { fileSig, hashPassword, keyOf, newCode, newToken, newTotpSecret, passwordMatches, sameText, seal, sha256, totpMatches, totpUri, unseal, weakPassword } from "../atelier/crypto.js";
import { MAILS, sendMail, siteOrigin } from "../atelier/mail.js";
import { atelierFiles } from "../atelier/pdf.js";
import { approvalOf, audit, confirmPayment, currentQuote, event, moneyOfProject, notifyTeam, PAYMENT_KINDS, paymentBlock, projectView, reachStep, type PaymentKind } from "../atelier/project.js";
import { createCheckout, webhookEvent } from "../atelier/stripe.js";
import { visitor } from "../security.js";

export const atelierClient = Router();

const signinTries = limiter(8, 15);
const codeTries = limiter(10, 15);
const magicTries = limiter(5, 15);
const inviteTries = limiter(20, 15);

const lower = (s: string) => s.trim().toLowerCase();
const slow = () => new Promise((r) => setTimeout(r, 400 + Math.random() * 300));

/* ---------- The invitation ---------- */

async function inviteOf(token: string) {
  if (!/^[A-Za-z0-9_-]{30,80}$/.test(token)) return null;
  return prisma.clientInvite.findUnique({ where: { tokenKey: keyOf("invite", token) }, include: { client: true } });
}

atelierClient.post("/vip/atelier/invite/check", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = z.object({ token: z.string().max(100) }).safeParse(req.body);
  if (!inviteTries.hit(req)) return void res.json({ state: "wait" });
  const inv = body.success ? await inviteOf(body.data.token) : null;
  if (!inv) return void res.json({ state: "missing" });
  if (inv.usedAt) return void res.json({ state: "used" });
  if (inv.expiresAt.getTime() < Date.now()) return void res.json({ state: "expired" });
  if (!inv.client.accessEnabled) return void res.json({ state: "missing" });
  res.json({ state: "ok", name: inv.client.name, email: inv.client.loginEmail ?? inv.client.email ?? "" });
});

atelierClient.post("/vip/atelier/invite/accept", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = z.object({ token: z.string().max(100), password: z.string().max(200) }).safeParse(req.body);
  if (!inviteTries.hit(req)) return void res.json({ state: "wait" });
  const inv = body.success ? await inviteOf(body.data.token) : null;
  if (!inv || !inv.client.accessEnabled) return void res.json({ state: "missing" });
  if (inv.usedAt) return void res.json({ state: "used" });
  if (inv.expiresAt.getTime() < Date.now()) return void res.json({ state: "expired" });
  const email = lower(inv.client.loginEmail ?? inv.client.email ?? "");
  if (!email) return void res.json({ state: "missing" });
  const weak = weakPassword(body.data!.password, email);
  if (weak) return void res.json({ state: "weak", reason: weak });
  // Used once: the first to use it wins.
  const won = await prisma.clientInvite.updateMany({ where: { id: inv.id, usedAt: null }, data: { usedAt: new Date() } });
  if (won.count === 0) return void res.json({ state: "used" });
  const taken = await prisma.client.findFirst({ where: { loginEmail: email, NOT: { id: inv.clientId } }, select: { id: true } });
  if (taken) return void res.json({ state: "missing" });
  await prisma.client.update({ where: { id: inv.clientId }, data: { passwordHash: await hashPassword(body.data!.password), loginEmail: email, activatedAt: new Date() } });
  await logLogin(req, "invite-used", inv.clientId, email);
  await audit(req, "client:" + inv.clientId, "access-created", inv.clientId);
  await openClientSession(req, res, inv.clientId);
  res.json({ state: "ok" });
});

/* ---------- Signing in ---------- */

/** After the password or a sign-in link: the second factor when he chose one, else his session. */
async function afterFirstFactor(req: Request, res: Response, client: { id: string; twoFactor: string; loginEmail: string | null; name: string }, viaMagic: boolean) {
  const mode = client.twoFactor;
  // A sign-in link already proves the mailbox: only an authenticator app is still asked.
  if (mode === "totp" || (mode === "email" && !viaMagic)) {
    if (mode === "email" && client.loginEmail) {
      const code = newCode();
      await prisma.clientCode.create({ data: { clientId: client.id, purpose: "2fa", codeKey: keyOf("2fa", client.id + ":" + code), expiresAt: new Date(Date.now() + 10 * 60_000) } });
      const m = MAILS.code(code);
      await sendMail(client.loginEmail, m.subject, m.text, "code");
    }
    return void res.json({ state: "code", via: mode, challenge: challengeFor(client.id) });
  }
  await logLogin(req, viaMagic ? "magic" : "signin", client.id, client.loginEmail ?? "");
  await openClientSession(req, res, client.id);
  res.json({ state: "ok" });
}

atelierClient.post("/vip/atelier/signin", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = z.object({ email: z.string().max(200), password: z.string().max(200) }).safeParse(req.body);
  if (!signinTries.allowed(req)) return void res.json({ state: "wait", minutes: signinTries.wait(req) });
  const email = body.success ? lower(body.data.email) : "";
  const client = email ? await prisma.client.findUnique({ where: { loginEmail: email } }) : null;
  const ok = await passwordMatches(body.success ? body.data.password : "", client?.passwordHash);
  if (!client || !ok) {
    signinTries.hit(req);
    await logLogin(req, "signin-failed", client?.id ?? null, email);
    await slow();
    return void res.json({ state: "wrong" });
  }
  if (!client.accessEnabled) {
    await logLogin(req, "signin-paused", client.id, email);
    return void res.json({ state: "paused" });
  }
  signinTries.clear(req);
  await afterFirstFactor(req, res, client, false);
});

atelierClient.post("/vip/atelier/signin/code", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = z.object({ challenge: z.string().max(200), code: z.string().max(12) }).safeParse(req.body);
  if (!codeTries.allowed(req)) return void res.json({ state: "wait", minutes: codeTries.wait(req) });
  const id = body.success ? challengeClient(body.data.challenge) : null;
  const client = id ? await prisma.client.findUnique({ where: { id } }) : null;
  if (!client || !client.accessEnabled) return void res.json({ state: "expired" });
  const code = body.data!.code.replace(/\D/g, "");
  let ok = false;
  if (client.twoFactor === "totp") {
    const secret = unseal(client.totpSecret);
    const step = secret ? totpMatches(secret, code) : null;
    // A code of the app is used once (the same step never twice).
    if (step !== null && step > (client.totpLastStep ?? -1)) {
      await prisma.client.update({ where: { id: client.id }, data: { totpLastStep: step } });
      ok = true;
    }
  } else {
    const row = await prisma.clientCode.findUnique({ where: { codeKey: keyOf("2fa", client.id + ":" + code) } });
    if (row && row.clientId === client.id && row.purpose === "2fa" && !row.usedAt && row.expiresAt.getTime() > Date.now() && row.attempts < 5) {
      const won = await prisma.clientCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
      ok = won.count === 1;
    }
  }
  if (!ok) {
    codeTries.hit(req);
    await logLogin(req, "code-failed", client.id, client.loginEmail ?? "");
    await slow();
    return void res.json({ state: "wrong" });
  }
  codeTries.clear(req);
  await logLogin(req, "signin", client.id, client.loginEmail ?? "");
  await openClientSession(req, res, client.id);
  res.json({ state: "ok" });
});

atelierClient.post("/vip/atelier/magic", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = z.object({ email: z.string().max(200) }).safeParse(req.body);
  if (!magicTries.hit(req)) return void res.json({ state: "wait", minutes: magicTries.wait(req) });
  const email = body.success ? lower(body.data.email) : "";
  const client = email ? await prisma.client.findUnique({ where: { loginEmail: email } }) : null;
  if (client && client.accessEnabled && client.passwordHash) {
    const token = newToken();
    await prisma.clientCode.create({ data: { clientId: client.id, purpose: "magic", codeKey: keyOf("magic", token), expiresAt: new Date(Date.now() + 15 * 60_000) } });
    const m = MAILS.magic(siteOrigin() + "/vip/signin/" + token);
    await sendMail(email, m.subject, m.text, "magic");
  }
  await slow();
  res.json({ state: "sent" });
});

atelierClient.post("/vip/atelier/magic/use", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const body = z.object({ token: z.string().max(100) }).safeParse(req.body);
  if (!magicTries.allowed(req)) return void res.json({ state: "wait" });
  const row = body.success && /^[A-Za-z0-9_-]{30,80}$/.test(body.data.token) ? await prisma.clientCode.findUnique({ where: { codeKey: keyOf("magic", body.data.token) }, include: { client: true } }) : null;
  if (!row || row.purpose !== "magic" || row.usedAt || row.expiresAt.getTime() < Date.now() || !row.client.accessEnabled) {
    magicTries.hit(req);
    return void res.json({ state: "expired" });
  }
  const won = await prisma.clientCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date() } });
  if (won.count === 0) return void res.json({ state: "expired" });
  await afterFirstFactor(req, res, row.client, true);
});

atelierClient.post("/vip/atelier/signout", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const id = cookieSession(req);
  if (id) {
    const s = await prisma.clientSession.findUnique({ where: { id } });
    if (s && !s.revokedAt) {
      await prisma.clientSession.update({ where: { id }, data: { revokedAt: new Date() } });
      await logLogin(req, "signout", s.clientId);
    }
  }
  closeCookie(req, res);
  res.json({ state: "out" });
});

/* ---------- His space ---------- */

atelierClient.get("/vip/atelier/me", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const { currentClient } = await import("../atelier/auth.js");
  const c = await currentClient(req);
  if (!c) return void res.json({ state: "out" });
  const client = await prisma.client.findUnique({ where: { id: c.clientId }, include: { projects: { where: { archivedAt: null }, orderBy: { createdAt: "desc" }, include: { versions: { where: { publishedAt: { not: null } }, select: { id: true } }, messages: { where: { author: "house", readAt: null }, select: { id: true } } } } } });
  if (!client) return void res.json({ state: "out" });
  res.json({
    state: "ok",
    name: client.name,
    email: client.loginEmail,
    twoFactor: client.twoFactor || "off",
    projects: client.projects.map((p) => ({ id: p.id, title: p.title, step: p.step, versions: p.versions.length, unread: p.messages.length, createdAt: p.createdAt })),
  });
});

atelierClient.get("/vip/atelier/security", requireClient, async (req, res) => {
  const c = req.atelierClient!;
  const [client, sessions, logins] = await Promise.all([
    prisma.client.findUnique({ where: { id: c.clientId }, select: { twoFactor: true } }),
    prisma.clientSession.findMany({ where: { clientId: c.clientId, revokedAt: null, expiresAt: { gt: new Date() } }, orderBy: { lastSeenAt: "desc" } }),
    prisma.clientLogin.findMany({ where: { clientId: c.clientId }, orderBy: { createdAt: "desc" }, take: 15 }),
  ]);
  res.json({
    state: "ok",
    twoFactor: client?.twoFactor || "off",
    sessions: sessions.map((s) => ({ id: s.id, current: s.id === c.sessionId, userAgent: s.userAgent, ip: s.ip, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt })),
    logins: logins.map((l) => ({ event: l.event, ip: l.ip, userAgent: l.userAgent, at: l.createdAt })),
  });
});

atelierClient.post("/vip/atelier/security/2fa", requireClient, async (req, res) => {
  const body = z.object({ mode: z.enum(["email", "off"]) }).safeParse(req.body);
  if (!body.success) return void res.status(400).json({ state: "bad" });
  await prisma.client.update({ where: { id: req.atelierClient!.clientId }, data: { twoFactor: body.data.mode === "off" ? "" : "email", ...(body.data.mode === "off" ? { totpSecret: null } : {}) } });
  await logLogin(req, "2fa-" + body.data.mode, req.atelierClient!.clientId);
  res.json({ state: "ok" });
});

atelierClient.post("/vip/atelier/security/totp/start", requireClient, async (req, res) => {
  const secret = newTotpSecret();
  await prisma.client.update({ where: { id: req.atelierClient!.clientId }, data: { totpPending: seal(secret) } });
  res.json({ state: "ok", secret, uri: totpUri(secret, req.atelierClient!.email || req.atelierClient!.name) });
});

atelierClient.post("/vip/atelier/security/totp/confirm", requireClient, async (req, res) => {
  const body = z.object({ code: z.string().max(12) }).safeParse(req.body);
  const client = await prisma.client.findUnique({ where: { id: req.atelierClient!.clientId } });
  const secret = unseal(client?.totpPending);
  const step = secret && body.success ? totpMatches(secret, body.data.code) : null;
  if (!client || !secret || step === null) return void res.json({ state: "wrong" });
  await prisma.client.update({ where: { id: client.id }, data: { twoFactor: "totp", totpSecret: seal(secret), totpPending: null, totpLastStep: step } });
  await logLogin(req, "2fa-totp", client.id);
  res.json({ state: "ok" });
});

atelierClient.post("/vip/atelier/security/password", requireClient, async (req, res) => {
  const body = z.object({ current: z.string().max(200), next: z.string().max(200) }).safeParse(req.body);
  const client = await prisma.client.findUnique({ where: { id: req.atelierClient!.clientId } });
  if (!body.success || !client || !(await passwordMatches(body.data.current, client.passwordHash))) return void res.json({ state: "wrong" });
  const weak = weakPassword(body.data.next, client.loginEmail ?? "");
  if (weak) return void res.json({ state: "weak", reason: weak });
  await prisma.client.update({ where: { id: client.id }, data: { passwordHash: await hashPassword(body.data.next) } });
  // The other devices are signed out.
  await prisma.clientSession.updateMany({ where: { clientId: client.id, revokedAt: null, NOT: { id: req.atelierClient!.sessionId } }, data: { revokedAt: new Date() } });
  await logLogin(req, "password-changed", client.id);
  res.json({ state: "ok" });
});

atelierClient.delete("/vip/atelier/security/sessions/:id", requireClient, async (req, res) => {
  const done = await prisma.clientSession.updateMany({ where: { id: String(req.params.id), clientId: req.atelierClient!.clientId, revokedAt: null }, data: { revokedAt: new Date() } });
  if (done.count) await logLogin(req, "session-revoked", req.atelierClient!.clientId);
  res.json({ state: "ok" });
});

/* ---------- His project ---------- */

/** His own project only (someone else's: as if it did not exist). */
async function ownProject(req: Request, res: Response): Promise<string | null> {
  const id = String(req.params.id ?? "");
  const p = /^[a-z0-9]{10,40}$/i.test(id) ? await prisma.project.findUnique({ where: { id }, select: { id: true, clientId: true, archivedAt: true } }) : null;
  if (!p || p.clientId !== req.atelierClient!.clientId || p.archivedAt) {
    res.status(404).json({ state: "missing" });
    return null;
  }
  return p.id;
}

atelierClient.get("/vip/atelier/projects/:id", requireClient, async (req, res) => {
  const id = await ownProject(req, res);
  if (!id) return;
  res.json({ state: "ok", project: await projectView(id, { admin: false }) });
});

atelierClient.post("/vip/atelier/projects/:id/requests", requireClient, async (req, res) => {
  const id = await ownProject(req, res);
  if (!id) return;
  const body = z
    .object({ versionId: z.string().max(40), comment: z.string().trim().min(1).max(4000), point: z.object({ x: z.number(), y: z.number(), z: z.number() }).nullable().optional() })
    .safeParse(req.body);
  const version = body.success ? await prisma.designVersion.findFirst({ where: { id: body.data.versionId, projectId: id, publishedAt: { not: null } } }) : null;
  if (!body.success || !version) return void res.status(400).json({ state: "bad" });
  const r = await prisma.changeRequest.create({ data: { projectId: id, versionId: version.id, comment: body.data.comment, point: body.data.point ?? undefined } });
  await event(id, "change-requested", "client", { requestId: r.id, version: version.number });
  await audit(req, "client:" + req.atelierClient!.clientId, "change-requested", id, { version: version.number });
  await notifyTeam("Modification demandée — design v" + version.number, req.atelierClient!.name + " demande une modification sur la version " + version.number + " : « " + body.data.comment.slice(0, 500) + " »");
  res.json({ state: "ok" });
});

atelierClient.post("/vip/atelier/projects/:id/approve", requireClient, async (req, res) => {
  const id = await ownProject(req, res);
  if (!id) return;
  const body = z.object({ versionId: z.string().max(40) }).safeParse(req.body);
  const latest = await prisma.designVersion.findFirst({ where: { projectId: id, publishedAt: { not: null } }, orderBy: { number: "desc" } });
  // Only the latest published version can become the final design.
  if (!body.success || !latest || latest.id !== body.data.versionId) return void res.status(400).json({ state: "bad" });
  const already = await prisma.designApproval.findFirst({ where: { projectId: id, versionId: latest.id } });
  if (!already) {
    await prisma.designApproval.create({ data: { projectId: id, versionId: latest.id, clientId: req.atelierClient!.clientId, email: req.atelierClient!.email, ip: visitor(req), userAgent: agentOf(req) } });
    await event(id, "design-approved", "client", { version: latest.number });
    await audit(req, "client:" + req.atelierClient!.clientId, "design-approved", id, { version: latest.number });
    await reachStep(id, 0, "client");
    await notifyTeam("Design validé — v" + latest.number, req.atelierClient!.name + " a validé le design final (version " + latest.number + ").");
  }
  res.json({ state: "ok" });
});

atelierClient.post("/vip/atelier/projects/:id/quotes/:quoteId/accept", requireClient, async (req, res) => {
  const id = await ownProject(req, res);
  if (!id) return;
  const p = await prisma.project.findUnique({ where: { id }, include: { quotes: { orderBy: { number: "desc" } }, approvals: { orderBy: { createdAt: "desc" } } } });
  const q = p ? currentQuote(p) : null;
  if (!p || !q || q.id !== String(req.params.quoteId) || q.status !== "sent") return void res.status(400).json({ state: "bad" });
  if (!approvalOf(p, q.versionId)) return void res.json({ state: "approve-first" });
  if (!q.terms.trim()) return void res.json({ state: "terms-missing" });
  // The frozen quotation is still the one sent (its fingerprint).
  const file = atelierFiles.path(p.clientId, p.id, "quote-" + q.id + ".pdf");
  if (!file || sha256(fs.readFileSync(file)) !== q.pdfSha256) return void res.json({ state: "changed" });
  const won = await prisma.quote.updateMany({ where: { id: q.id, status: "sent" }, data: { status: "accepted", acceptedAt: new Date(), acceptedEmail: req.atelierClient!.email, acceptedIp: visitor(req), acceptedUa: agentOf(req) } });
  if (won.count === 1) {
    await event(id, "quote-accepted", "client", { quote: q.number, sha256: q.pdfSha256 });
    await audit(req, "client:" + req.atelierClient!.clientId, "quote-accepted", id, { quote: q.number });
    await notifyTeam("Devis accepté — Q" + q.number, req.atelierClient!.name + " a accepté le devis Q" + q.number + ".");
  }
  res.json({ state: "ok" });
});

atelierClient.post("/vip/atelier/projects/:id/pay", requireClient, async (req, res) => {
  const id = await ownProject(req, res);
  if (!id) return;
  const body = z.object({ option: z.enum(["deposit", "full", "balance"]) }).safeParse(req.body);
  const p = await prisma.project.findUnique({
    where: { id },
    include: { client: true, quotes: { orderBy: { number: "desc" } }, payments: true, approvals: { orderBy: { createdAt: "desc" } } },
  });
  if (!body.success || !p) return void res.status(400).json({ state: "bad" });
  const block = await paymentBlock(p);
  if (block) return void res.json({ state: block });
  const q = currentQuote(p)!;
  const m = moneyOfProject(p)!;
  const kind: PaymentKind = body.data.option;
  // The amount, computed here: 50 % less what is already in, everything remaining, or the balance.
  const amount = kind === "deposit" ? (m.depositPaid ? 0 : m.deposit) : kind === "full" ? (m.depositPaid ? 0 : m.remaining) : m.depositPaid ? m.remaining : 0;
  if (amount <= 0) return void res.json({ state: "bad" });
  const settings = await (await import("../atelier/settings.js")).atelierSettings();
  const pay = await prisma.payment.create({ data: { projectId: id, quoteId: q.id, kind, amountCents: amount, currency: p.currency } });
  try {
    const origin = siteOrigin();
    const session = await createCheckout({
      paymentId: pay.id,
      projectId: id,
      amountCents: amount,
      currency: p.currency,
      label: "BERETE — " + p.title + " — " + PAYMENT_KINDS[kind] + " (Q" + q.number + ")",
      email: p.client.loginEmail ?? p.client.email,
      successUrl: origin + "/vip/project/" + id + "?payment=done",
      cancelUrl: origin + "/vip/project/" + id + "?payment=cancelled",
      methods: settings.methods,
    });
    await prisma.payment.update({ where: { id: pay.id }, data: { stripeSession: session.id } });
    await audit(req, "client:" + req.atelierClient!.clientId, "payment-started", id, { kind, amount });
    res.json({ state: "ok", url: session.url });
  } catch (e) {
    await prisma.payment.update({ where: { id: pay.id }, data: { status: "failed" } });
    console.error("Stripe :", e instanceof Error ? e.message : e);
    res.json({ state: "unavailable" });
  }
});

/* ---------- Messages ---------- */

const ATTACH = z.object({ name: z.string().max(160), mime: z.string().max(80), data: z.string().max(14_000_000) });
const ALLOWED: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" };

/** Checks an attachment by its first bytes (what it really is), 10 MB at most. */
export function attachmentOf(f: z.infer<typeof ATTACH>): { buf: Buffer; ext: string; mime: string; kind: string; name: string } | null {
  const ext = ALLOWED[f.mime];
  if (!ext) return null;
  const buf = Buffer.from(f.data, "base64");
  if (buf.length === 0 || buf.length > 10 * 1024 * 1024) return null;
  const head = buf.subarray(0, 12);
  const ok =
    (ext === "jpg" && head[0] === 0xff && head[1] === 0xd8) ||
    (ext === "png" && head.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) ||
    (ext === "webp" && head.subarray(0, 4).toString() === "RIFF" && head.subarray(8, 12).toString() === "WEBP") ||
    ((ext === "heic" || ext === "heif") && head.subarray(4, 8).toString() === "ftyp") ||
    (ext === "pdf" && head.subarray(0, 5).toString() === "%PDF-");
  if (!ok) return null;
  const name = f.name.replace(/[^\p{L}\p{N} ._()-]/gu, "").slice(0, 120) || "file." + ext;
  return { buf, ext, mime: f.mime, kind: ext === "pdf" ? "pdf" : "image", name };
}

export const MESSAGE_BODY = z.object({ body: z.string().max(6000).default(""), files: z.array(ATTACH).max(4).default([]) });

export async function saveMessage(projectId: string, clientId: string, author: "client" | "house", input: z.infer<typeof MESSAGE_BODY>): Promise<string | null> {
  const files = input.files.map(attachmentOf);
  if (files.some((f) => !f) || (!input.body.trim() && files.length === 0)) return null;
  const msg = await prisma.projectMessage.create({ data: { projectId, author, body: input.body.trim() } });
  for (const f of files) {
    const row = await prisma.projectMessageFile.create({ data: { messageId: msg.id, kind: f!.kind, mime: f!.mime, ext: f!.ext, name: f!.name, size: f!.buf.length } });
    atelierFiles.write(clientId, projectId, "msg-" + row.id + "." + f!.ext, f!.buf);
  }
  return msg.id;
}

atelierClient.post("/vip/atelier/projects/:id/messages", requireClient, async (req, res) => {
  const id = await ownProject(req, res);
  if (!id) return;
  const body = MESSAGE_BODY.safeParse(req.body);
  const saved = body.success ? await saveMessage(id, req.atelierClient!.clientId, "client", body.data) : null;
  if (!saved) return void res.status(400).json({ state: "bad" });
  await audit(req, "client:" + req.atelierClient!.clientId, "message", id);
  await notifyTeam("Nouveau message — " + req.atelierClient!.name, req.atelierClient!.name + " vous a écrit dans son Private Atelier.");
  res.json({ state: "ok" });
});

atelierClient.post("/vip/atelier/projects/:id/read", requireClient, async (req, res) => {
  const id = await ownProject(req, res);
  if (!id) return;
  await prisma.projectMessage.updateMany({ where: { projectId: id, author: "house", readAt: null }, data: { readAt: new Date() } });
  res.json({ state: "ok" });
});

/* ---------- The files: signed, expiring, his only ---------- */

atelierClient.get("/vip/atelier/files/:kind/:id", async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  const kind = String(req.params.kind);
  const id = String(req.params.id);
  const exp = Number(req.query.exp ?? 0);
  const sig = String(req.query.sig ?? "");
  const asAdmin = req.query.as === "admin";
  const missing = () => void res.status(404).json({ state: "missing" });
  if (!/^[a-z0-9]{10,40}$/i.test(id) || !Number.isInteger(exp) || exp < Date.now() / 1000) return missing();
  let owner: string;
  let file: string | null;
  let mime = "application/pdf";
  let name = "";
  if (kind === "quote") {
    const q = await prisma.quote.findUnique({ where: { id }, include: { project: true } });
    if (!q || q.status === "draft") return missing();
    owner = q.project.clientId;
    file = atelierFiles.path(owner, q.projectId, "quote-" + q.id + ".pdf");
    name = "BERETE-quotation-Q" + q.number + ".pdf";
  } else if (kind === "receipt") {
    const p = await prisma.payment.findUnique({ where: { id }, include: { project: true } });
    if (!p || p.status !== "paid") return missing();
    owner = p.project.clientId;
    file = atelierFiles.path(owner, p.projectId, "receipt-" + p.id + ".pdf");
    name = "BERETE-receipt-" + (p.receiptNumber ?? p.id) + ".pdf";
  } else if (kind === "message") {
    const f = await prisma.projectMessageFile.findUnique({ where: { id }, include: { message: { include: { project: true } } } });
    if (!f) return missing();
    owner = f.message.project.clientId;
    file = atelierFiles.path(owner, f.message.projectId, "msg-" + f.id + "." + f.ext);
    mime = f.mime;
    name = f.name;
  } else if (kind === "journal" && asAdmin) {
    const f = await prisma.clientUpdateFile.findUnique({ where: { id }, include: { update: true } });
    if (!f) return missing();
    owner = f.update.clientId;
    file = clientFiles.file(owner, f.id, f.ext);
    mime = f.mime === "video/quicktime" ? "video/mp4" : f.mime;
  } else return missing();
  if (!file) return missing();
  // The signature is bound to the one who may read it, and he must be the one asking (his session), or the admin.
  if (asAdmin) {
    if (!sameText(sig, fileSig(kind, id, "admin", exp))) return missing();
  } else {
    const { currentClient } = await import("../atelier/auth.js");
    const c = await currentClient(req);
    if (!c || c.clientId !== owner || !sameText(sig, fileSig(kind, id, owner, exp))) return missing();
  }
  res.setHeader("Content-Type", mime);
  if (name) res.setHeader("Content-Disposition", (mime === "application/pdf" || mime.startsWith("image/") ? "inline" : "attachment") + "; filename*=UTF-8''" + encodeURIComponent(name));
  res.sendFile(file);
});

/* ---------- The notification of Stripe (the only confirmation of a payment) ---------- */

export const stripeWebhook = Router();

stripeWebhook.post("/api/stripe/webhook", async (req, res) => {
  const body = req.body;
  const event_ = Buffer.isBuffer(body) ? webhookEvent(body, String(req.headers["stripe-signature"] ?? "")) : null;
  if (!event_) return void res.status(400).send("bad signature");
  // Each notification once, whatever the number of times it comes.
  const seen = await prisma.stripeEvent.findUnique({ where: { id: event_.id } });
  if (seen) return void res.json({ received: true, duplicate: true });
  try {
    if (event_.type === "checkout.session.completed" || event_.type === "checkout.session.async_payment_succeeded") {
      const s = event_.data.object as { id: string; payment_status?: string; metadata?: Record<string, string> | null; amount_total?: number | null; currency?: string | null; payment_intent?: string | { id: string } | null; payment_method_types?: string[] };
      const paymentId = s.metadata?.paymentId ?? "";
      // A bank transfer is confirmed when the money arrives (async_payment_succeeded), never at the end of the page.
      if (paymentId && s.payment_status === "paid") {
        await confirmPayment(paymentId, {
          sessionId: s.id,
          intent: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null),
          method: (s.payment_method_types ?? []).includes("customer_balance") && event_.type.includes("async") ? "Bank transfer" : "Card",
          amountTotal: s.amount_total ?? null,
          currency: s.currency ?? null,
        });
      }
    } else if (event_.type === "checkout.session.expired" || event_.type === "checkout.session.async_payment_failed") {
      const s = event_.data.object as { id: string; metadata?: Record<string, string> | null };
      const paymentId = s.metadata?.paymentId ?? "";
      if (paymentId) await prisma.payment.updateMany({ where: { id: paymentId, status: "pending" }, data: { status: event_.type.endsWith("expired") ? "canceled" : "failed" } });
    }
    await prisma.stripeEvent.create({ data: { id: event_.id, type: event_.type } }).catch(() => undefined);
    res.json({ received: true });
  } catch (e) {
    console.error("Stripe webhook :", e instanceof Error ? e.message : e);
    // Not marked as seen: Stripe tries again.
    res.status(500).json({ received: false });
  }
});

/* ---------- What the pages of the site may show (the switches of the admin) ---------- */

/**
 * GET /atelier/public: the section « The Private Atelier » and « Beyond the Creation », « Client Access » in the menu, each step
 * of the journey only when it really works (the AI studio with its key, the online payment with the keys of Stripe).
 */
atelierClient.get("/atelier/public", async (_req, res) => {
  const { atelierSettings } = await import("../atelier/settings.js");
  const { stripeKeys } = await import("../atelier/stripe.js");
  const s = await atelierSettings();
  res.setHeader("Cache-Control", "no-cache");
  res.json({
    siteTexts: s.features.siteTexts,
    clientAccess: s.features.clientAccess,
    aiStudio: s.features.aiStudio && Boolean(process.env.OPENAI_API_KEY?.trim()),
    payment: s.features.payment && stripeKeys(),
  });
});
