import "dotenv/config";
import { expect, test, type APIRequestContext, type Browser, type BrowserContext, type Page } from "./fixtures";
import { silence } from "./fixtures";

// The Private Atelier, end to end (Yoni, 27/11/2026, B12): Berete creates a client and his project and invites him; he
// creates his access and signs in with his second factor; designs v1 then v2, a change asked, the two compared, v2 approved;
// the quotation sent then accepted, the payment offered only after both; the deposit of 50 % paid (the design fee of 1 000 €
// deducted), its receipt, the notification of Stripe processed once even sent twice; the order accepted, three steps with a
// photo and a film in the journal, the client told; messages both ways with an attachment; the balance paid; a new price
// asks for a new quotation and a new acceptance; a second client never sees anything of the first; the access cut and
// nothing visible any more. Computer and iPhone, silent.
// Local only, against the built site started with a local stand-in of Stripe (tests/support/fake-stripe.mjs):
//   STRIPE_SECRET_KEY=sk_test_local STRIPE_PUBLISHABLE_KEY=pk_test_local STRIPE_WEBHOOK_SECRET=whsec_local \
//   STRIPE_API_HOST=localhost STRIPE_API_PORT=12111 npm start            (and the stand-in: node tests/support/fake-stripe.mjs)
//   ATELIER_E2E=1 BASE_URL=http://localhost:3001 npx playwright test tests/private-atelier.spec.ts --workers=1
test.skip(!process.env.ATELIER_E2E, "needs the local server with the stand-in of Stripe (ATELIER_E2E=1)");
test.describe.configure({ mode: "serial" });

const FAKE = "http://localhost:12111";
const SHOTS = (process.env.HOME ?? "") + "/Downloads/_verif-private-atelier/parcours/";
const stamp = Date.now().toString(36);

type Admin = { req: APIRequestContext; token: string };

async function admin(req: APIRequestContext): Promise<Admin> {
  const r = await req.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  expect(r.ok()).toBeTruthy();
  return { req, token: ((await r.json()) as { token: string }).token };
}
const auth = (a: Admin) => ({ Authorization: "Bearer " + a.token });
async function call<T = Record<string, unknown>>(a: Admin, method: "GET" | "POST" | "PUT" | "DELETE", path: string, data?: unknown): Promise<T> {
  const r = await a.req.fetch(path, { method, headers: auth(a), data });
  const body = (await r.json().catch(() => ({}))) as T;
  if (!r.ok()) throw new Error(method + " " + path + " → " + r.status() + " " + JSON.stringify(body));
  return body;
}

/** The last e-mail caught for an address (the outbox of the admin: no mailbox on the Mac). */
async function lastMail(a: Admin, to: string, kind?: string): Promise<{ subject: string; text: string }> {
  for (let i = 0; i < 30; i++) {
    const out = await call<{ items: { to: string; kind: string; subject: string; text: string }[] }>(a, "GET", "/api/admin/atelier/outbox");
    const m = out.items.find((x) => x.to === to && (!kind || x.kind === kind));
    if (m) return m;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("no e-mail for " + to);
}
const linkIn = (text: string) => /https?:\/\/\S+/.exec(text)![0].replace(/^https?:\/\/[^/]+/, "");
const codeIn = (text: string) => /\b(\d{6})\b/.exec(text)![1]!;

async function readyModel(a: Admin): Promise<string> {
  const m = await call<{ items?: { id: string; status: string }[] } | { id: string; status: string }[]>(a, "GET", "/api/admin/models");
  const items = Array.isArray(m) ? m : (m.items ?? []);
  const ready = items.filter((x) => x.status === "ready");
  expect(ready.length).toBeGreaterThanOrEqual(1);
  return ready[0]!.id;
}

async function shot(page: Page, name: string) {
  await page.screenshot({ path: SHOTS + name + "-" + test.info().project.name + ".jpg", type: "jpeg", quality: 70, fullPage: false });
}

async function clientContext(browser: Browser, device: Record<string, unknown>): Promise<BrowserContext> {
  const c = await browser.newContext({ ...device, baseURL: test.info().project.use.baseURL });
  await silence(c);
  return c;
}

/** One small JPEG and one tiny MP4-like box (the server checks the first bytes of a film: ftyp). */
const JPEG = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");

async function upload(a: Admin, clientId: string, name: string, data: Buffer): Promise<{ uploadId: string; name: string; size: number }> {
  const start = await call<{ uploadId: string }>(a, "POST", "/api/admin/clients/" + clientId + "/uploads", { name, size: data.length });
  const r = await a.req.fetch("/api/admin/clients/" + clientId + "/uploads/" + start.uploadId + "?offset=0", { method: "PUT", headers: { ...auth(a), "Content-Type": "application/octet-stream" }, data });
  expect(r.ok(), await r.text()).toBeTruthy();
  return { uploadId: start.uploadId, name, size: data.length };
}

test("the whole journey of a commission, from the invitation to the balance", async ({ browser, request }, info) => {
  test.setTimeout(8 * 60_000);
  const phone = info.project.name.startsWith("iphone");
  const device = phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : { viewport: { width: 1440, height: 900 } };
  const a = await admin(request);
  const email = "client-" + stamp + "-" + info.project.name + "@example.com";
  const password = "Atelier-" + stamp + "-Secure9";
  const created: string[] = [];
  const terms0 = (await call<{ settings: { terms: string } }>(a, "GET", "/api/admin/atelier/settings")).settings.terms;
  try {
    // 1. Berete creates the client and his project, and sends the invitation (the e-mail caught in the outbox).
    const client = await call<{ id: string }>(a, "POST", "/api/admin/clients", { name: "Test Client " + stamp, email, phone: "", modelIds: [] });
    created.push(client.id);
    const invited = await call<{ link: string }>(a, "POST", "/api/admin/atelier/clients/" + client.id + "/invite", {});
    const project = await call<{ id: string }>(a, "POST", "/api/admin/atelier/projects", { clientId: client.id, title: "Signature Pendant " + stamp, designFeeCents: 100000, designFeePaidAt: "2026-11-20", designFeeMethod: "Bank transfer" });
    const mail = await lastMail(a, email, "invite");
    expect(linkIn(mail.text)).toBe(linkIn(invited.link));

    // 2. He creates his access, turns on the code by e-mail, signs in again with it.
    const ctx = await clientContext(browser, device);
    const c = await ctx.newPage();
    await c.goto(linkIn(invited.link));
    const form = c.locator("[data-atelier-invite]");
    await form.locator("input[name=password]").fill(password);
    await form.locator("input[name=confirm]").fill(password);
    await shot(c, "01-invitation");
    await form.locator("button[type=submit]").click();
    await c.locator("[data-invite-2fa] [data-2fa-choice='email']").click();
    await c.waitForURL(/\/vip(\?|$)/);
    await c.locator("[data-signout]").first().click();
    const signin = c.locator("[data-atelier-signin]");
    await signin.locator("input[name=email]").fill(email);
    await signin.locator("input[name=password]").fill(password);
    await signin.locator("button[type=submit]").click();
    const code = codeIn((await lastMail(a, email, "code")).text);
    await c.locator("[data-atelier-code] input[name=code]").fill(code);
    await shot(c, "02-second-factor");
    await c.locator("[data-atelier-code] button[type=submit]").click();
    await expect(c.locator("[data-project-link='" + project.id + "']")).toBeVisible({ timeout: 15_000 });
    await shot(c, "03-tableau");

    // 3. v1, a change asked; v2; the two compared; v2 approved.
    const model = await readyModel(a);
    const v1 = await call<{ id: string }>(a, "POST", "/api/admin/atelier/projects/" + project.id + "/versions", { modelId: model, changes: "First design." });
    await call(a, "POST", "/api/admin/atelier/projects/" + project.id + "/versions/" + v1.id + "/publish");
    await c.goto("/vip/project/" + project.id);
    await expect(c.locator("[data-version='1']")).toBeVisible();
    const change = c.locator("[data-change-request]");
    await change.locator("textarea[name=comment]").fill("Could the bail be a little thinner?");
    await change.locator("button[type=submit]").click();
    await expect.poll(async () => (await call<{ project: { requests: unknown[] } }>(a, "GET", "/api/admin/atelier/projects/" + project.id)).project.requests.length).toBe(1);
    const v2 = await call<{ id: string }>(a, "POST", "/api/admin/atelier/projects/" + project.id + "/versions", { modelId: model, changes: "A thinner bail." });
    await call(a, "POST", "/api/admin/atelier/projects/" + project.id + "/versions/" + v2.id + "/publish");
    await c.reload();
    await c.locator("[data-compare]").first().click();
    await expect(c.locator("[data-compare-pane]")).toHaveCount(2);
    await shot(c, "04-comparaison");
    await c.locator("[data-version='2']").first().click();
    await c.locator("[data-approve-design]").click();
    await c.locator("[role=dialog][data-confirm] [data-confirm-yes]").click();
    await expect(c.locator("[data-design-approved]")).toBeVisible();
    const approved = (await call<{ project: { approval: { number: number; ip: string; userAgent: string; email: string } } }>(a, "GET", "/api/admin/atelier/projects/" + project.id)).project.approval;
    expect(approved.number).toBe(2);
    expect(approved.email).toBe(email);
    expect(approved.userAgent.length).toBeGreaterThan(10);

    // 4. The quotation (Yoni's terms written first); no payment before both validations.
    await call(a, "PUT", "/api/admin/atelier/settings", { terms: "TEST TERMS — written by Yoni in the admin (test)." });
    const q1 = await call<{ id: string }>(a, "POST", "/api/admin/atelier/projects/" + project.id + "/quotes", { versionId: v2.id, materials: "18k white gold, round diamonds.", priceCents: 1_200_000, feesCents: 0, leadTime: "About ten weeks.", schedule: "50% deposit, balance before delivery." });
    await call(a, "POST", "/api/admin/atelier/projects/" + project.id + "/quotes/" + q1.id + "/send");
    await c.reload();
    await expect(c.locator("[data-quote='1'][data-status='sent']")).toBeVisible();
    await expect(c.locator("[data-pay-option]")).toHaveCount(0);
    await shot(c, "05-devis");
    await c.locator("[data-accept-quote]").click();
    await c.locator("[role=dialog][data-confirm] [data-confirm-yes]").click();
    await expect(c.locator("[data-quote='1'][data-status='accepted']")).toBeVisible();

    // 5. The deposit: 50 % of 12 000 € less the design fee of 1 000 € = 5 000 €; everything = 11 000 €.
    const deposit = c.locator("[data-pay-option='deposit']");
    await expect(deposit).toBeVisible();
    const amountOf = async (sel: string) => Number(((await c.locator(sel + " [data-pay-amount]").textContent()) ?? "").replace(/[^\d]/g, ""));
    expect(await amountOf("[data-pay-option='deposit']")).toBe(500000);
    expect(await amountOf("[data-pay-option='full']")).toBe(1100000);
    await shot(c, "06-paiement");
    await deposit.click();
    await c.waitForURL(/localhost:12111\/pay\//);
    await expect(c.locator("[data-amount]")).toHaveText("5000.00 EUR");
    await c.locator("[data-fake-pay]").click();
    await c.waitForURL(/payment=done/);
    await expect(c.locator("[data-paid]")).toHaveCount(1, { timeout: 30_000 });
    // Its receipt: a PDF of his, by its signed address.
    const receipt = await c.locator("[data-receipt]").first().getAttribute("href");
    const pdf = await ctx.request.get(receipt!);
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
    expect((await lastMail(a, email, "receipt")).subject).toMatch(/receipt/i);
    // The same notification again: processed once.
    const session = ((await (await request.get(FAKE + "/sessions")).json()) as { id: string; metadata: { projectId: string } }[]).filter((s) => s.metadata.projectId === project.id).at(-1)!;
    const again = (await (await request.post(FAKE + "/resend/" + session.id)).json()) as { body: string };
    expect(again.body).toContain("duplicate");
    const view = (await call<{ project: { payments: { status: string }[]; money: { credited: number; remaining: number } } }>(a, "GET", "/api/admin/atelier/projects/" + project.id)).project;
    expect(view.payments.filter((p) => p.status === "paid")).toHaveLength(1);
    expect(view.money.credited).toBe(600000);
    expect(view.money.remaining).toBe(600000);
    await shot(c, "07-paye");

    // 6. The order accepted, the making authorized; three steps, a photo and a film in the journal; the client told.
    const order = await call<{ production: boolean }>(a, "POST", "/api/admin/atelier/projects/" + project.id + "/order");
    expect(order.production).toBe(true);
    for (const step of [2, 3, 4]) await call(a, "PUT", "/api/admin/atelier/projects/" + project.id + "/step", { step, note: "Step " + step + " — test", notify: true });
    const photo = await upload(a, client.id, "setting.jpg", JPEG);
    const film = await upload(a, client.id, "polish.mp4", Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from("ftypisom"), Buffer.alloc(64)]));
    await call(a, "POST", "/api/admin/clients/" + client.id + "/updates", { note: "The stones are being set.", files: [photo, film], projectId: project.id, draft: false });
    await c.reload();
    await expect(c.locator("[data-step='4'][data-state='current']")).toBeVisible();
    await expect(c.locator("[data-step='2'][data-state='done']")).toBeVisible();
    await expect(c.locator("[data-journal-entry]")).toHaveCount(1);
    expect((await lastMail(a, email, "notice")).text).not.toMatch(/€|price|stone/i);
    await c.locator("[data-project-section='making']").scrollIntoViewIfNeeded();
    await shot(c, "08-fabrication");

    // 7. Messages both ways, with an attachment.
    const composer = c.locator("[data-composer]");
    await composer.locator("textarea[name=body]").fill("Thank you, the photos are beautiful.");
    await composer.locator("input[type=file][data-attach]").setInputFiles({ name: "idea.pdf", mimeType: "application/pdf", buffer: PDF });
    await composer.locator("[data-send]").click();
    await expect(c.locator("[data-message][data-author='client']")).toHaveCount(1);
    await call(a, "POST", "/api/admin/atelier/projects/" + project.id + "/messages", { body: "Here is the polishing, in a few days.", files: [{ name: "polish.jpg", mime: "image/jpeg", data: JPEG.toString("base64") }] });
    await c.reload();
    await expect(c.locator("[data-message][data-author='house']")).toHaveCount(1);
    await shot(c, "09-messages");

    // 8. The balance.
    await expect(c.locator("[data-pay-option='balance']")).toBeVisible();
    expect(await amountOf("[data-pay-option='balance']")).toBe(600000);
    await c.locator("[data-pay-option='balance']").click();
    await c.waitForURL(/localhost:12111\/pay\//);
    await c.locator("[data-fake-pay]").click();
    await c.waitForURL(/payment=done/);
    await expect(c.locator("[data-paid]")).toHaveCount(2, { timeout: 30_000 });
    expect((await call<{ project: { money: { remaining: number } } }>(a, "GET", "/api/admin/atelier/projects/" + project.id)).project.money.remaining).toBe(0);

    // 9. A new price after validation: a new quotation, the old one superseded, a new acceptance asked.
    const q2 = await call<{ id: string }>(a, "POST", "/api/admin/atelier/projects/" + project.id + "/quotes", { versionId: v2.id, materials: "18k white gold, round diamonds, a larger centre stone.", priceCents: 1_350_000 });
    await call(a, "POST", "/api/admin/atelier/projects/" + project.id + "/quotes/" + q2.id + "/send");
    await c.reload();
    await expect(c.locator("[data-quote='1'][data-status='superseded']")).toBeVisible();
    await expect(c.locator("[data-quote='2'][data-status='sent']")).toBeVisible();
    await expect(c.locator("[data-accept-quote]")).toBeVisible();
    await expect(c.locator("[data-pay-option]")).toHaveCount(0);
    await shot(c, "10-nouveau-devis");

    // 10. A second client never sees anything of the first (address, id, file).
    const other = await call<{ id: string }>(a, "POST", "/api/admin/clients", { name: "Other Client " + stamp, email: "other-" + email, phone: "", modelIds: [] });
    created.push(other.id);
    const otherInvite = await call<{ link: string }>(a, "POST", "/api/admin/atelier/clients/" + other.id + "/invite", {});
    const ctx2 = await clientContext(browser, device);
    const accept = await ctx2.request.post("/api/vip/atelier/invite/accept", { data: { token: linkIn(otherInvite.link).split("/").pop(), password: "Other-" + stamp + "-Secure9" } });
    expect(((await accept.json()) as { state: string }).state).toBe("ok");
    expect((await ctx2.request.get("/api/vip/atelier/projects/" + project.id)).status()).toBe(404);
    expect((await ctx2.request.get(receipt!)).status()).toBe(404);
    const files = (await call<{ project: { thread: { type: string; files?: { url: string }[] }[]; quotes: { pdfUrl: string | null }[] } }>(a, "GET", "/api/admin/atelier/projects/" + project.id)).project;
    const clientView = (await (await ctx.request.get("/api/vip/atelier/projects/" + project.id)).json()) as { project: { quotes: { pdfUrl: string }[]; thread: { type: string; files?: { url: string }[] }[] } };
    for (const url of [clientView.project.quotes[0]!.pdfUrl, ...clientView.project.thread.flatMap((x) => (x.files ?? []).map((f) => f.url))]) expect((await ctx2.request.get(url)).status(), url).toBe(404);
    expect(files.quotes.length).toBeGreaterThan(0);
    const p2 = await ctx2.newPage();
    await p2.goto("/vip/project/" + project.id);
    await expect(p2.locator("[data-client-project]")).toHaveCount(0);
    await ctx2.close();

    // 11. The access cut: nothing visible any more.
    await call(a, "PUT", "/api/admin/atelier/clients/" + client.id + "/access", { enabled: false });
    expect(((await (await ctx.request.get("/api/vip/atelier/me")).json()) as { state: string }).state).toBe("out");
    expect((await ctx.request.get("/api/vip/atelier/projects/" + project.id)).status()).toBe(401);
    expect((await ctx.request.get(receipt!)).status()).toBe(404);
    await c.goto("/vip/project/" + project.id);
    await expect(c.locator("[data-client-project]")).toHaveCount(0);
    await ctx.close();
  } finally {
    await call(a, "PUT", "/api/admin/atelier/settings", { terms: terms0 }).catch(() => undefined);
    for (const id of created) await call(a, "DELETE", "/api/admin/clients/" + id).catch(() => undefined);
  }
});

test("online without the keys of Stripe: the payment hidden, « Contact BERETE to confirm your commission »", async ({ request }) => {
  test.skip(true, "covered online (tests/private-atelier-online.spec.ts)");
  void request;
});
