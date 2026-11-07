// Written by the platform from the workflows that passed their checks. Do not edit.
// Each workflow of server/workflows/ is mounted here once its last valid version
// is published in server/workflows/live/.
import { createHmac, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { prisma } from "../db.js";
import { appTriggerWatches, mountWorkflows, runAppTrigger, startSchedules, type Workflow, type WorkflowEffects, type WorkflowRequest } from "./runtime.js";
import { runProgram } from "./interpreter.js";
import w0_callback_request from "./live/callback-request.workflow.js";

const live: Workflow[] = [w0_callback_request];

type Delegate = Record<string, (args: unknown) => Promise<unknown>>;

const startedAt = Date.now();

const effects: WorkflowEffects = {
  async db(model, action, args) {
    const delegate = (prisma as unknown as Record<string, Delegate | undefined>)[model.charAt(0).toLowerCase() + model.slice(1)];
    const run = delegate?.[action];
    if (delegate === undefined || run === undefined) throw new Error("Unknown model " + model + ".");
    return run.call(delegate, args);
  },
  // Mail to the site owner, through the contact inbox of the hosting platform (as the contact form).
  async notifyOwner(message) {
    const inbox = process.env.CONTACT_INBOX_URL ?? "";
    const site = process.env.APP_URL ?? "";
    if (inbox === "" || site === "") {
      console.log("[workflow email] not configured (CONTACT_INBOX_URL, APP_URL): " + message.subject);
      return;
    }
    const response = await fetch(inbox, {
      method: "POST",
      headers: { "content-type": "application/json", origin: new URL(site).origin },
      body: JSON.stringify({
        geste: "contact",
        nom: message.subject.slice(0, 120),
        courriel: message.replyTo ?? "no-reply@" + new URL(site).hostname,
        message: message.text,
        societe: "",
        depuis: Date.now() - startedAt,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("The inbox answered " + response.status + ".");
  },
  async httpRequest(request) {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.body === undefined ? {} : { "content-type": "application/json" },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      // Not JSON: the text itself.
    }
    return { status: response.status, body };
  },
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => new Date(),
  // The code nodes run in the interpreter of the platform: no network, no files, no process.
  runCode: (program, inputs) => runProgram(program, inputs),
};

/** A shop event is signed by the platform: HMAC-SHA256 of "<timestamp>.<raw body>" with SHOP_EVENTS_SECRET. */
function header(req: WorkflowRequest, suffix: string): string {
  for (const [name, value] of Object.entries(req.headers)) {
    if (name.endsWith(suffix) && typeof value === "string") return value;
  }
  return "";
}

function verifyShopEvent(req: WorkflowRequest): boolean {
  const secret = process.env.SHOP_EVENTS_SECRET ?? "";
  const raw = (req as WorkflowRequest & { rawBody?: Buffer }).rawBody;
  const timestamp = header(req, "-horodatage");
  const signature = header(req, "-signature");
  if (secret === "" || raw === undefined || timestamp === "" || signature === "") return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 600) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(timestamp + "." + raw.toString("utf8")).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const workflows = Router();
mountWorkflows(workflows, live, effects, { verifyShopEvent });
if (process.env.NODE_ENV === "production") startSchedules(live, effects);
// No application is connected or installed: the application triggers have nothing to listen to.
void runAppTrigger;
void appTriggerWatches;
