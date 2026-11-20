/*
 * An e-mail to the house for every message and every callback request sent from the site (they also stay in the
 * admin, tab « Messages »). Sent through the mailbox of the house (SMTP): SMTP_HOST, SMTP_PORT (465 or 587),
 * SMTP_USER, SMTP_PASS, ALERT_TO (one address or several, separated by commas), ALERT_FROM (default: SMTP_USER).
 * Without them, nothing is sent: the messages wait in the admin. A failed e-mail never fails the form.
 */
import nodemailer, { type Transporter } from "nodemailer";

const LANGUAGES: Record<string, string> = { en: "anglais", fr: "français", es: "espagnol", de: "allemand", nl: "néerlandais", ar: "arabe" };

let transport: Transporter | null | undefined;

function mailer(): Transporter | null {
  if (transport !== undefined) return transport;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_TO } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !ALERT_TO) {
    console.log("Alertes e-mail : non configurées (SMTP_HOST, SMTP_USER, SMTP_PASS, ALERT_TO). Les messages restent dans l'admin.");
    transport = null;
    return null;
  }
  const port = Number(SMTP_PORT || 465);
  transport = nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } });
  return transport;
}

/** The address of the admin in the e-mail (the public address of the site when it is known). */
function adminLink(): string {
  const domain = process.env.SITE_DOMAIN;
  return domain && domain !== "localhost" ? "https://" + domain + "/admin" : "/admin";
}

export type Alert =
  | { kind: "message"; name: string; email: string; message: string; language: string }
  | { kind: "callback"; name: string; phone: string; interest: string | null; language: string };

/** Sends the alert in the background (the visitor does not wait for it). */
export function alertHouse(alert: Alert): void {
  const mail = mailer();
  if (!mail) return;
  const language = LANGUAGES[alert.language] ?? alert.language;
  const lines =
    alert.kind === "message"
      ? ["Nouveau message envoyé depuis le site.", "", "Nom : " + alert.name, "E-mail : " + alert.email, "Langue : " + language, "", alert.message]
      : ["Nouvelle demande de rappel envoyée depuis le site.", "", "Nom : " + alert.name, "Téléphone : " + alert.phone, ...(alert.interest ? ["Intérêt : " + alert.interest] : []), "Langue : " + language];
  lines.push("", "Tous les messages : " + adminLink() + " (onglet « Messages »).");
  const subject = (alert.kind === "message" ? "Nouveau message de " : "Demande de rappel de ") + alert.name.replace(/[\r\n]+/g, " ").slice(0, 80);
  mail
    .sendMail({
      from: process.env.ALERT_FROM || process.env.SMTP_USER,
      to: process.env.ALERT_TO,
      subject: "Berete Jewellers · " + subject,
      text: lines.join("\n"),
      ...(alert.kind === "message" ? { replyTo: alert.email } : {}),
    })
    .catch((error: unknown) => console.error("Alerte e-mail non envoyée :", error instanceof Error ? error.message : error));
}
