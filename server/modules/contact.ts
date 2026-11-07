import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";

/**
 * POST /api/contact - stores a message. GET /api/contact - lists them (ADMIN_TOKEN).
 *
 * Each message is kept in this site's database AND deposited in the owner's
 * inbox on the hosting platform (the dashboard "Messages", with the owner's
 * email notification). The deposit runs after the answer to the visitor and
 * never fails their request; it is retried when the platform does not answer.
 * Written by the site generator; do not edit.
 */
export const contact = Router();

const Message = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.email().max(320),
  message: z.string().trim().min(1).max(5000),
  /** Honeypot: humans leave it empty. */
  company: z.string().max(0).optional(),
});

/** The platform inbox of this site, next to its mail door. Empty when the site is not hosted on the platform. */
function platformInbox(): string {
  const mail = (process.env.ODORO_MAIL_URL ?? "").trim();
  const door = /^(https?:\/\/\S+?)\/api\/sites\/mail\/([0-9a-f-]{36})$/i.exec(mail);
  return door === null ? "" : door[1] + "/api/sites/contact/" + door[2];
}

/** The waits before each new attempt: 1 minute, 10 minutes, 1 hour, 6 hours. */
const RETRY_DELAYS_MS = [60_000, 600_000, 3_600_000, 21_600_000];

export interface SavedMessage {
  id: string | number;
  name: string;
  email: string;
  message: string;
}

/** Deposits a saved message in the owner's inbox on the platform. Never throws. */
export async function depositInPlatformInbox(saved: SavedMessage, attempt = 0): Promise<void> {
  const inbox = platformInbox();
  const token = process.env.ADMIN_TOKEN ?? "";
  if (inbox === "" || token === "") return;
  let retry = true;
  try {
    const response = await fetch(inbox, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + token },
      body: JSON.stringify({ ref: String(saved.id), name: saved.name, email: saved.email, message: saved.message }),
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) return;
    // Too many for now, or the platform is down: worth another try. Any other refusal will not change.
    retry = response.status === 429 || response.status >= 500;
    if (!retry) {
      console.error("[contact] the platform inbox refused message " + String(saved.id) + " (" + response.status + "); it is kept in this database.");
    }
  } catch {
    retry = true;
  }
  if (!retry) return;
  const delay = RETRY_DELAYS_MS[attempt];
  if (delay === undefined) {
    console.error("[contact] message " + String(saved.id) + " could not be deposited in the platform inbox; it is kept in this database.");
    return;
  }
  setTimeout(() => {
    void depositInPlatformInbox(saved, attempt + 1);
  }, delay).unref();
}

contact.post("/", async (req, res) => {
  const parsed = Message.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please check the form and try again." });
    return;
  }
  const { name, email, message } = parsed.data;
  const saved = await prisma.contactMessage.create({ data: { name, email, message } });
  res.status(201).json({ ok: true });
  // After the answer: the visitor never waits for the platform, nor sees it fail.
  void depositInPlatformInbox(saved);
});

contact.get("/", async (req, res) => {
  const token = process.env.ADMIN_TOKEN;
  if (token === undefined || token === "" || req.get("authorization") !== `Bearer ${token}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ messages });
});
