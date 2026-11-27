#!/usr/bin/env node
/* global process, URLSearchParams, fetch, URL, console */
/**
 * A local stand-in of Stripe for the tests of The Private Atelier, on the Mac only (never on the VPS): it answers the few calls
 * the server makes (checkout sessions, customers) and plays the page of payment, then sends the signed notification
 * (checkout.session.completed) to the webhook of the site, exactly as Stripe signs it (t=…,v1=HMAC-SHA256 of "t.body" with
 * the webhook secret). No card, no money, no network.
 *   STRIPE_WEBHOOK_SECRET=whsec_… SITE=http://localhost:3001 PORT=12111 node tests/support/fake-stripe.mjs
 * The server of the site runs with STRIPE_API_HOST=localhost STRIPE_API_PORT=12111 and test keys (sk_test_…).
 *   GET  /pay/<id>               the page of payment (a button « Pay »)
 *   POST /pay/<id>               pays: sends the notification, then goes back to the success address
 *   POST /resend/<id>            sends the same notification again (the same event id: processed once)
 *   GET  /sessions               every session made (for the tests)
 */
import { createHmac, randomBytes } from "node:crypto";
import http from "node:http";

const PORT = Number(process.env.PORT || 12111);
const SITE = process.env.SITE || "http://localhost:3001";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const sessions = new Map();
const events = new Map();

function parseForm(body) {
  // Stripe's form encoding: a[b][0][c]=v
  const out = {};
  for (const [k, v] of new URLSearchParams(body)) {
    const path = k.replace(/\]/g, "").split("[");
    let o = out;
    path.forEach((p, i) => {
      if (i === path.length - 1) o[p] = v;
      else o = o[p] ??= {};
    });
  }
  return out;
}

function json(res, status, value) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}

async function notify(session, type = "checkout.session.completed") {
  const id = events.get(session.id + type) ?? "evt_fake_" + randomBytes(8).toString("hex");
  events.set(session.id + type, id);
  const payload = JSON.stringify({
    id,
    object: "event",
    api_version: "2025-01-01",
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: { id: session.id, object: "checkout.session", payment_status: "paid", status: "complete", amount_total: session.amount, currency: session.currency, metadata: session.metadata, payment_intent: "pi_fake_" + session.id.slice(-8), payment_method_types: ["card"] } },
  });
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", SECRET).update(t + "." + payload).digest("hex");
  const r = await fetch(SITE + "/api/stripe/webhook", { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": "t=" + t + ",v1=" + sig }, body: payload });
  return { status: r.status, body: await r.text(), event: id };
}

http
  .createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const url = new URL(req.url, "http://localhost");
    if (req.method === "POST" && url.pathname === "/v1/customers") return json(res, 200, { id: "cus_fake_" + randomBytes(5).toString("hex"), object: "customer" });
    if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
      const f = parseForm(body);
      const id = "cs_test_fake_" + randomBytes(10).toString("hex");
      const item = f.line_items?.["0"]?.price_data ?? {};
      const session = { id, amount: Number(item.unit_amount), currency: item.currency, metadata: f.metadata ?? {}, success: f.success_url, cancel: f.cancel_url, name: item.product_data?.name ?? "", email: f.customer_email ?? "", methods: f.allowed_payment_method_types ?? {} };
      sessions.set(id, session);
      return json(res, 200, { id, object: "checkout.session", url: "http://localhost:" + PORT + "/pay/" + id, amount_total: session.amount, currency: session.currency, metadata: session.metadata });
    }
    if (url.pathname === "/sessions") return json(res, 200, [...sessions.values()]);
    const pay = /^\/(pay|resend)\/(cs_test_fake_[a-f0-9]+)$/.exec(url.pathname);
    const session = pay ? sessions.get(pay[2]) : null;
    if (pay && session && req.method === "GET" && pay[1] === "pay") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(
        `<!doctype html><meta name=viewport content="width=device-width"><title>Test payment</title><body style="font:16px system-ui;background:#f6f6f6;padding:40px"><h1 data-fake-stripe>Test payment (local stand-in of Stripe)</h1><p>${session.name}</p><p data-amount>${(session.amount / 100).toFixed(2)} ${String(session.currency).toUpperCase()}</p><form method=post><button data-fake-pay style="padding:14px 28px;font-size:16px">Pay</button></form><p><a href="${session.cancel}">Cancel</a></p>`,
      );
    }
    if (pay && session && req.method === "POST") {
      const r = await notify(session);
      if (pay[1] === "resend") return json(res, 200, r);
      res.writeHead(303, { Location: session.success });
      return res.end();
    }
    json(res, 404, { error: { message: "not found" } });
  })
  .listen(PORT, () => console.log("fake stripe on " + PORT));
