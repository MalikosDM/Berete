import "dotenv/config";
import { expect, test, type APIRequestContext } from "./fixtures";

// The Private Atelier on the live site, without the keys of Stripe (27/11/2026): the door of the client space (the site under
// construction) signs a client in with his e-mail, his password and his code; his project shows its design and its quotation;
// the payment stays hidden, « Contact BERETE to confirm your commission » instead; the section of The Bespoke Journey and
// « Client Access ». A test client is made and deleted, the settings put back as they were.
//   ADMIN_PASSWORD=… ACCESS_PASSWORD=… BASE_URL=https://beretejewellers.com npx playwright test tests/private-atelier-online.spec.ts
test.skip(!process.env.ADMIN_PASSWORD, "needs the admin password");

async function admin(req: APIRequestContext) {
  const r = await req.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  const token = ((await r.json()) as { token: string }).token;
  return async <T = Record<string, unknown>>(method: string, path: string, data?: unknown): Promise<T> => {
    const res = await req.fetch(path, { method, headers: { Authorization: "Bearer " + token }, data });
    const body = (await res.json().catch(() => ({}))) as T;
    if (!res.ok()) throw new Error(method + " " + path + " " + res.status() + " " + JSON.stringify(body));
    return body;
  };
}

test("a client signs in, sees his design and his quotation; no payment without the keys of Stripe", async ({ browser, request, baseURL }, info) => {
  test.setTimeout(4 * 60_000);
  const call = await admin(request);
  const stamp = Date.now().toString(36) + info.project.name.slice(0, 2);
  const email = "atelier-" + stamp + "@example.com";
  const password = "Velvet-" + stamp + "-Ring42";
  const before = (await call<{ settings: { terms: string } }>("GET", "/api/admin/atelier/settings")).settings;
  const ids: string[] = [];
  try {
    const client = await call<{ id: string }>("POST", "/api/admin/clients", { name: "Online Test " + stamp, email, phone: "", modelIds: [] });
    ids.push(client.id);
    const invite = await call<{ link: string }>("POST", "/api/admin/atelier/clients/" + client.id + "/invite", {});
    const project = await call<{ id: string }>("POST", "/api/admin/atelier/projects", { clientId: client.id, title: "Online Test Pendant", designFeeCents: 100000 });
    const models = await call<{ items?: { id: string; status: string }[] }>("GET", "/api/admin/models");
    const model = (models.items ?? (models as unknown as { id: string; status: string }[])).find((m) => m.status === "ready")!.id;
    const v1 = await call<{ id: string }>("POST", "/api/admin/atelier/projects/" + project.id + "/versions", { modelId: model, changes: "First design (test)." });
    await call("POST", "/api/admin/atelier/projects/" + project.id + "/versions/" + v1.id + "/publish");
    await call("PUT", "/api/admin/atelier/settings", { terms: "TEST TERMS (removed after the test)." });
    const q = await call<{ id: string }>("POST", "/api/admin/atelier/projects/" + project.id + "/quotes", { versionId: v1.id, materials: "Test", priceCents: 1_000_000 });
    await call("POST", "/api/admin/atelier/projects/" + project.id + "/quotes/" + q.id + "/send");

    // A fresh device, without the private access of the site: the invitation opens its page alone.
    const ctx = await browser.newContext({ baseURL, ...(info.project.name.startsWith("iphone") ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {}) });
    const page = await ctx.newPage();
    await page.goto(invite.link.replace(/^https?:\/\/[^/]+/, ""));
    await page.locator("[data-atelier-invite] input[name=password]").fill(password);
    await page.locator("[data-atelier-invite] input[name=confirm]").fill(password);
    await page.locator("[data-atelier-invite] button[type=submit]").click();
    await page.locator("[data-invite-2fa] [data-2fa-choice='email']").click();
    await page.waitForURL(/\/vip(\?|$)/);
    await page.locator("[data-signout]").first().click();
    // The door of the client space (the site under construction): e-mail, password, then the code sent by e-mail.
    await page.goto("/vip");
    await page.locator("#signin input[name=email], [data-atelier-signin] input[name=email]").first().fill(email);
    await page.locator("#signin input[name=password], [data-atelier-signin] input[name=password]").first().fill(password);
    await page.locator("#signin button[type=submit], [data-atelier-signin] button[type=submit]").first().click();
    const out = await call<{ items: { to: string; kind: string; text: string }[] }>("GET", "/api/admin/atelier/outbox");
    const code = /\b(\d{6})\b/.exec(out.items.find((m) => m.to === email && m.kind === "code")!.text)![1]!;
    await page.locator("#code input[name=code], [data-atelier-code] input[name=code]").first().fill(code);
    await page.locator("#code button[type=submit], [data-atelier-code] button[type=submit]").first().click();
    await expect(page.locator("[data-project-link='" + project.id + "']")).toBeVisible({ timeout: 20_000 });
    await page.goto("/vip/project/" + project.id);
    await expect(page.locator("[data-version='1']")).toBeVisible();
    await page.locator("[data-approve-design]").click();
    await page.locator("[role=dialog][data-confirm] [data-confirm-yes]").click();
    await page.locator("[data-accept-quote]").click();
    await page.locator("[role=dialog][data-confirm] [data-confirm-yes]").click();
    await expect(page.locator("[data-quote='1'][data-status='accepted']")).toBeVisible();
    // No keys of Stripe online yet: the payment hidden, the way to Berete instead.
    await expect(page.locator("[data-pay-option]")).toHaveCount(0);
    await expect(page.locator("[data-payment-contact]")).toContainText(/Contact BERETE to confirm your commission/i);
    await page.screenshot({ path: (process.env.HOME ?? "") + "/Downloads/_verif-private-atelier/en-ligne/projet-" + info.project.name + ".jpg", type: "jpeg", quality: 70 });
    await ctx.close();
  } finally {
    await call("PUT", "/api/admin/atelier/settings", { terms: before.terms }).catch(() => undefined);
    for (const id of ids) await call("DELETE", "/api/admin/clients/" + id).catch(() => undefined);
  }
});

test("the site: The Private Atelier in The Bespoke Journey, « Beyond the Creation », « Client Access »", async ({ page }, info) => {
  await page.goto("/process");
  await expect(page.locator("[data-private-atelier] h2")).toHaveText(/The Private Atelier/i);
  await expect(page.locator("[data-private-atelier-lead]")).toHaveText("Your vision. Your creation. Every step of the journey.");
  // The steps that wait for a switch (the AI studio, the payment) are not shown while they do not really work.
  await expect(page.locator("[data-private-step='payment']")).toHaveCount(0);
  await page.goto("/");
  await expect(page.locator("[data-home-beyond] h2")).toHaveText(/Beyond the Creation/i);
  if (!info.project.name.startsWith("iphone")) await expect(page.locator("[data-client-access]")).toBeVisible();
  else await expect(page.locator("footer [data-vip-link]")).toBeVisible();
});
