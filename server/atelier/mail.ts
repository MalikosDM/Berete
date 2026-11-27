/*
 * The e-mails of The Private Atelier: the invitation, the codes and sign-in links, the notifications (a new message, a design
 * to approve, a quotation, a step of the making, a payment confirmed) and the receipts. Through the mailbox of the house
 * (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS; sender ALERT_FROM or SMTP_USER), the same as the alerts (server/alerts.ts).
 * Every e-mail is also written in the outbox of the base (OutboxEmail): without a mailbox (development, tests) it is caught
 * there and nothing leaves; with one, the outbox keeps its trace (sent or its error). A notification never carries anything
 * sensitive: it says that something is waiting and gives the way to the secure space.
 */
import nodemailer, { type Transporter } from "nodemailer";
import { prisma } from "../db.js";

let transport: Transporter | null | undefined;

function mailer(): Transporter | null {
  if (transport !== undefined) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    transport = null;
    return null;
  }
  const port = Number(SMTP_PORT || 465);
  transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return transport;
}

/** The public address of the site (the links of the e-mails). */
export function siteOrigin(): string {
  const domain = process.env.SITE_DOMAIN;
  if (domain && domain !== "localhost") return "https://" + domain;
  return process.env.SITE_URL?.replace(/\/$/, "") || "http://localhost:3001";
}

export type Attachment = { filename: string; content: Buffer; contentType: string };

/** Sends an e-mail (in the background for the caller: a failed e-mail never fails what asked for it). */
export async function sendMail(to: string, subject: string, text: string, kind: string, attachments: Attachment[] = []): Promise<void> {
  const clean = subject.replace(/[\r\n]+/g, " ").slice(0, 160);
  const row = await prisma.outboxEmail.create({ data: { to, subject: clean, text, kind } });
  const mail = mailer();
  if (!mail) return;
  try {
    await mail.sendMail({ from: process.env.ALERT_FROM || process.env.SMTP_USER, to, subject: clean, text, attachments });
    await prisma.outboxEmail.update({ where: { id: row.id }, data: { sentAt: new Date() } });
  } catch (e) {
    await prisma.outboxEmail.update({ where: { id: row.id }, data: { error: String(e instanceof Error ? e.message : e).slice(0, 300) } });
  }
}

/** The team of the house (ALERT_TO), told of a payment, a message, a validation. */
export function teamAddress(): string | null {
  return process.env.ALERT_TO?.trim() || null;
}

const SIGN = "\n\nBERETE\nMade by us. Inspired by you.";

/** The texts of the e-mails to the clients (English: the language of Berete's commissions). */
export const MAILS = {
  invite: (name: string, link: string, days: number) => ({
    subject: "Your invitation to the BERETE Private Atelier",
    text:
      "Dear " + name + ",\n\nBERETE invites you to your Private Atelier, the private space of your commission.\n\nCreate your access here (this personal link works once and expires in " +
      days +
      (days > 1 ? " days" : " day") +
      "):\n" +
      link +
      "\n\nIf you were not expecting this invitation, you can ignore this e-mail." +
      SIGN,
  }),
  code: (code: string) => ({
    subject: "Your BERETE sign-in code",
    text: "Your sign-in code for the BERETE Private Atelier: " + code + "\n\nIt expires in 10 minutes. If you did not try to sign in, you can ignore this e-mail." + SIGN,
  }),
  magic: (link: string) => ({
    subject: "Your BERETE sign-in link",
    text: "Sign in to your BERETE Private Atelier with this link (it works once and expires in 15 minutes):\n" + link + "\n\nIf you did not ask for it, you can ignore this e-mail." + SIGN,
  }),
  /** A notification: only that something waits, and the way to the secure space. */
  notice: (name: string, what: string, link: string) => ({
    subject: "BERETE Private Atelier — " + what,
    text: "Dear " + name + ",\n\n" + what + " in your Private Atelier.\n\nSign in to see it:\n" + link + SIGN,
  }),
  receipt: (name: string, number: string, link: string) => ({
    subject: "Your BERETE payment receipt " + number,
    text: "Dear " + name + ",\n\nThank you. Your payment is confirmed. Your receipt " + number + " is attached, and kept in your Private Atelier:\n" + link + SIGN,
  }),
};
