// The client's 3D viewer, third pass (27/11/2026): the configurator in the language of the page (English chips on an
// English page, French on a French one, Arabic right to left), one control per metal part (the configurator's chips, or
// the swatches when no configurator offers it), the still image and the thin bar while it loads, then the 3D; the embed
// code (/embed/<token>) inside a frame of another page, without the menu, framable (and /view/<token> still not); the
// « Intégrer » button of the admin. Needs the server (models, admin): ADMIN_PASSWORD. Uses the model ZN1059-BJ001(2)
// (never the ones tests/editor3d.spec.ts changes); every setting changed is put back as it was. Pictures in
// ~/Downloads/_verif-3d-v3/. Run it alone (--workers=1): the three devices change the same model.
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, silence, test, type APIRequestContext, type Page } from "./fixtures";

type Row = { id: string; name: string; status: string; pieceSlug: string | null; settings: Record<string, unknown>; layers: { name: string; guess: string }[]; links: { id: string; token: string }[] };

test.describe.configure({ mode: "serial" });
test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD (the password of the admin) is needed");

const OUT = path.join(os.homedir(), "Downloads", "_verif-3d-v3");
mkdirSync(OUT, { recursive: true });
/** The server itself (headers of its pages), when the pages come from the dev server. */
const API = process.env.API_URL ?? "http://localhost:3001";

const shot = (page: Page, device: string, name: string) => page.screenshot({ path: path.join(OUT, name + (device === "desktop" ? "" : "-" + device) + ".png") });

async function session(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  expect(res.status(), "admin login").toBe(200);
  return ((await res.json()) as { token: string }).token;
}

async function theModel(request: APIRequestContext, token: string): Promise<Row> {
  const res = await request.get("/api/admin/models", { headers: { Authorization: "Bearer " + token } });
  const items = ((await res.json()) as { items: Row[] }).items.filter((m) => m.status === "ready");
  const pick = items.find((m) => /ZN1059/i.test(m.name)) ?? items.find((m) => /^0542$/.test(m.name));
  expect(pick, "the test model").toBeTruthy();
  return (await (await request.get("/api/admin/models/" + pick!.id, { headers: { Authorization: "Bearer " + token } })).json()) as Row;
}

async function putSettings(request: APIRequestContext, token: string, row: Row, settings: Record<string, unknown>) {
  const res = await request.put("/api/admin/models/" + row.id, { headers: { Authorization: "Bearer " + token }, data: { name: row.name, settings, pieceSlug: row.pieceSlug ?? null } });
  expect(res.ok(), "save: " + (await res.text())).toBe(true);
}

async function newLink(request: APIRequestContext, token: string, row: Row): Promise<{ id: string; token: string }> {
  const before = new Set(row.links.map((l) => l.id));
  const res = await request.post("/api/admin/models/" + row.id + "/links", { headers: { Authorization: "Bearer " + token }, data: { title: "Test client 3D", expiresAt: null, password: null } });
  expect(res.ok()).toBe(true);
  const after = ((await (await request.get("/api/admin/models/" + row.id, { headers: { Authorization: "Bearer " + token } })).json()) as Row).links;
  const made = after.find((l) => !before.has(l.id));
  expect(made).toBeTruthy();
  return made!;
}

const dropLink = (request: APIRequestContext, token: string, id: string) => request.delete("/api/admin/links/" + id, { headers: { Authorization: "Bearer " + token } });

/** A page of « another site », served by a small server of this computer (its own port: another origin). */
async function otherSite(html: string): Promise<string> {
  const http = await import("node:http");
  const server = http.createServer((_, res) => {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  server.unref();
  setTimeout(() => server.close(), 240_000).unref();
  const address = server.address() as { port: number };
  return "http://127.0.0.1:" + address.port + "/another-site";
}

/**
 * Opens a page with the viewer. The API of the dev machine restarts when its files change (other work at the same time):
 * a page that met it restarting says its link does not exist; it is opened again once the API answers.
 */
async function openViewer(page: Page, url: string, frame = false) {
  for (let attempt = 0; attempt < 4; attempt++) {
    if (frame) {
      // The page of « another site » has a real web address (a frame of a blank page breaks « frame-ancestors * »: a star
      // only matches http and https pages, as on any real site), on this computer (Chrome forbids a public page to frame
      // localhost), and another origin than the site's.
      await page.goto(await otherSite(url));
    } else await page.goto(url);
    const scope = frame ? page.frameLocator("iframe") : page;
    const seen = await Promise.race([
      scope.locator("[data-viewer]").first().waitFor({ timeout: 90_000 }).then(() => "viewer" as const),
      scope.locator("[data-link-state], [data-embed-state]").first().waitFor({ timeout: 90_000 }).then(() => "state" as const),
    ]);
    if (seen === "viewer") return;
    for (let i = 0; i < 30; i++) {
      const res = await page.request.get(API + "/api/health").catch(() => null);
      if (res?.ok()) break;
      await page.waitForTimeout(1000);
    }
  }
  throw new Error("the viewer never opened: " + url.slice(0, 200));
}

/** The jewel drawn: the views over it (the viewer is ready) and the still image gone. */
async function ready(scope: Page | ReturnType<Page["frameLocator"]>) {
  await scope.locator("[data-viewer-views]").first().waitFor({ timeout: 180_000 });
  await expect(scope.locator("[data-viewer-loading]")).toHaveCount(0, { timeout: 10_000 });
}

test("the configurator speaks the language of the page, one control per metal part", async ({ page, request }, info) => {
  test.setTimeout(420_000);
  const token = await session(request);
  const row = await theModel(request, token);
  const original = structuredClone(row.settings);
  const metal = row.layers.filter((l) => l.guess === "metal").map((l) => l.name);
  expect(metal.length).toBeGreaterThan(0);
  const configured = {
    ...original,
    views: { list: [{ id: "v1", name: "Face", position: [0, 0.01, 0.08], target: [0, 0, 0] }, { id: "v2", name: "Vue 2", position: [0.08, 0.01, 0], target: [0, 0, 0] }], duration: 1, ease: "easeInOutSine", interpolation: "spherical", pause: 0.5, loop: true, seekOnScroll: false },
    configurators: [{ id: "c1", label: "Métal", layers: metal, options: [{ material: "metal/yellow-gold/polished", label: "Or jaune" }, { material: "metal/white-gold/polished", label: "Or blanc" }] }],
  };
  let link: { id: string; token: string } | null = null;
  try {
    await putSettings(request, token, row, configured);
    link = await newLink(request, token, row);

    // English page: English chips, English views; the metal parts have no swatches (the chips are their one control).
    await openViewer(page, "/view/" + link.token);
    await ready(page);
    const group = page.locator("[data-configurator-group]").first();
    await expect(group.locator("span").first()).toHaveText("Metal");
    await expect(page.locator('[data-config-option="metal/yellow-gold/polished"]')).toHaveText("18k yellow gold");
    await expect(page.locator('[data-config-option="metal/white-gold/polished"]')).toHaveText("18k white gold");
    await expect(page.locator('[data-saved-view="v1"]')).toHaveText("Front");
    await expect(page.locator('[data-saved-view="v2"]')).toHaveText("View 2");
    await expect(page.locator("[data-viewer-panel] [data-metal]")).toHaveCount(0);
    await expect(page.locator("[data-viewer]")).toHaveAttribute("dir", "ltr");
    await page.locator('[data-config-option="metal/white-gold/polished"]').click();
    await expect(page.locator('[data-config-option="metal/white-gold/polished"]')).toHaveAttribute("aria-checked", "true");
    await expect(page.locator('[data-config-option="metal/yellow-gold/polished"]')).toHaveAttribute("aria-checked", "false");
    await page.waitForTimeout(1500);
    await page.locator("[data-viewer]").scrollIntoViewIfNeeded();
    await shot(page, info.project.name, "client-configurateur-en");

    // French page: the admin's own names.
    await openViewer(page, "/fr/view/" + link.token);
    await ready(page);
    await expect(page.locator("[data-configurator-group]").first().locator("span").first()).toHaveText("Métal");
    await expect(page.locator('[data-config-option="metal/yellow-gold/polished"]')).toHaveText("Or jaune");
    await expect(page.locator('[data-config-option="metal/white-gold/polished"]')).toHaveText("Or blanc");
    await expect(page.locator('[data-saved-view="v1"]')).toHaveText("Face");
    await page.waitForTimeout(1500);
    await page.locator("[data-viewer]").scrollIntoViewIfNeeded();
    await shot(page, info.project.name, "client-configurateur-fr");

    // Arabic page: Arabic chips, the viewer right to left.
    await openViewer(page, "/ar/view/" + link.token);
    await ready(page);
    await expect(page.locator("[data-viewer]")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("[data-configurator-group]").first().locator("span").first()).toHaveText("المعدن");
    await expect(page.locator('[data-config-option="metal/yellow-gold/polished"]')).toHaveText("ذهب أصفر عيار 18");
    await page.locator("[data-viewer]").scrollIntoViewIfNeeded();
    await shot(page, info.project.name, "client-configurateur-ar");

    // Without a configurator: the swatches of the panel are the one control, and they change the metal.
    await putSettings(request, token, row, { ...configured, configurators: [] });
    await openViewer(page, "/view/" + link.token);
    await ready(page);
    await expect(page.locator("[data-configurator]")).toHaveCount(0);
    const swatches = page.locator("[data-viewer-panel] [data-metal]");
    expect(await swatches.count()).toBeGreaterThan(1);
    await page.locator('[data-viewer-panel] [data-metal="white-gold"]').first().click();
    await expect(page.locator('[data-viewer-panel] [data-metal="white-gold"]').first()).toHaveAttribute("aria-checked", "true");
  } finally {
    if (link) await dropLink(request, token, link.id);
    await putSettings(request, token, row, original);
  }
});

test("loading: the still image and a thin bar, then the 3D in a fade", async ({ page, request }, info) => {
  test.setTimeout(300_000);
  const token = await session(request);
  const row = await theModel(request, token);
  let link: { id: string; token: string } | null = null;
  try {
    link = await newLink(request, token, row);
    // The model's file held back a few seconds: the waiting image stays long enough to be seen.
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    await page.route(/\/api\/models\/[^/]+\/files\/(full|light)\.glb/, async (route) => {
      await held;
      await route.continue();
    });
    await openViewer(page, "/view/" + link.token);
    const loading = page.locator('[data-viewer-loading="loading"]');
    await expect(loading).toBeVisible({ timeout: 60_000 });
    // The model's still image (ZN1059 has one), else the mark of the house.
    if ((row as unknown as { preview?: { poster?: string | null } }).preview?.poster) await expect(loading.locator("[data-viewer-poster]")).toBeVisible();
    await expect(loading.locator("[data-viewer-progress]")).toBeVisible();
    await page.locator("[data-viewer]").scrollIntoViewIfNeeded();
    await shot(page, info.project.name, "client-chargement");
    release();
    await ready(page);
  } finally {
    if (link) await dropLink(request, token, link.id);
  }
});

test("the embed code: the viewer alone in a frame of another page, framable", async ({ page, request, baseURL }, info) => {
  test.setTimeout(300_000);
  const token = await session(request);
  const row = await theModel(request, token);
  let link: { id: string; token: string } | null = null;
  try {
    link = await newLink(request, token, row);
    // Only the embed page may be framed by another site.
    const embedRes = await request.get(API + "/embed/" + link.token);
    expect(embedRes.status()).toBe(200);
    expect(embedRes.headers()["content-security-policy"] ?? "").toContain("frame-ancestors *");
    expect(embedRes.headers()["x-frame-options"]).toBeUndefined();
    expect(await embedRes.text()).toContain('name="bj-private"');
    const viewRes = await request.get(API + "/view/" + link.token);
    expect(viewRes.headers()["x-frame-options"]).toBe("SAMEORIGIN");

    const src = new URL("/embed/" + link.token + "?bg=transparent", baseURL).href;
    await openViewer(
      page,
      `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:16px;background:#f4f2ef;font:16px system-ui;color:#0a0a0a">` +
        `<p style="margin:0 0 12px">A page of another site</p><div style="max-width:640px"><iframe src="${src}" title="Test — Berete Jewellers" width="100%" style="aspect-ratio: 1; border: 0;" loading="lazy" allow="fullscreen; xr-spatial-tracking; camera" allowfullscreen></iframe></div></body></html>`,
      true,
    );
    const frame = page.frameLocator("iframe");
    await expect(frame.locator("[data-embed-3d]")).toBeVisible({ timeout: 60_000 });
    await ready(frame);
    await expect(frame.locator("[data-viewer-bare]")).toHaveCount(1);
    await expect(frame.locator("[data-viewer-panel]")).toHaveCount(0);
    await expect(frame.locator("header, footer, nav")).toHaveCount(0);
    await expect(frame.locator("[data-viewer-logo]")).toBeVisible();
    await expect(frame.locator("[data-share]")).toHaveCount(0);
    // The viewer fills the frame.
    const outer = (await page.locator("iframe").boundingBox())!;
    const inner = (await frame.locator("[data-viewer]").boundingBox())!;
    expect(Math.abs(inner.width - outer.width)).toBeLessThan(2);
    expect(Math.abs(inner.height - outer.height)).toBeLessThan(2);
    await page.waitForTimeout(1500);
    await shot(page, info.project.name, "client-embed");

    // In Arabic, right to left; without the logo when asked.
    await openViewer(page, `<!doctype html><html><body style="margin:0"><iframe src="${new URL("/ar/embed/" + link.token + "?logo=0", baseURL).href}" style="width:100%;aspect-ratio:1;border:0" allow="fullscreen"></iframe></body></html>`, true);
    const ar = page.frameLocator("iframe");
    await ready(ar);
    await expect(ar.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(ar.locator("[data-viewer-logo]")).toHaveCount(0);
  } finally {
    if (link) await dropLink(request, token, link.id);
  }
});

test("the admin: « Intégrer » gives the code of the frame", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "the admin of the 3D is used on a computer");
  test.setTimeout(300_000);
  const token = await session(request);
  const row = await theModel(request, token);
  let link: { id: string; token: string } | null = null;
  try {
    link = await newLink(request, token, row);
    await page.addInitScript(([t]) => {
      sessionStorage.setItem("bj-admin-token", t!);
      sessionStorage.setItem("bj-admin-tab", "3d");
    }, [token]);
    await page.goto("/admin");
    const card = page.locator("[data-model-card]").filter({ has: page.locator("p.text-xl", { hasText: row.name }) }).first();
    await card.locator("[data-open-model]").click({ timeout: 60_000 });
    const item = page.locator(`[data-link="${link.token}"]`);
    await item.scrollIntoViewIfNeeded({ timeout: 60_000 });
    await item.locator("[data-embed-open]").click();
    const code = item.locator("[data-embed-code]");
    await expect(code).toHaveValue(new RegExp('<iframe src="[^"]+/embed/' + link.token + '"'));
    await expect(code).toHaveValue(/width="100%"/);
    await expect(code).toHaveValue(/aspect-ratio: 1/);
    await expect(code).toHaveValue(/loading="lazy"/);
    await expect(code).toHaveValue(/allow="fullscreen; xr-spatial-tracking; camera"/);
    await item.locator("[data-embed-transparent]").check();
    await item.locator("[data-embed-lang]").selectOption("fr");
    await expect(code).toHaveValue(new RegExp("/fr/embed/" + link.token + "\\?bg=transparent"));
    await item.locator("[data-embed-panel]").scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(OUT, "admin-integrer.png") });
  } finally {
    if (link) await dropLink(request, token, link.id);
  }
});

test("« Voir chez moi » on Android: WebXR first, Scene Viewer when it cannot start", async ({ browser, request, baseURL }, info) => {
  test.skip(info.project.name !== "desktop", "Chromium only: an Android phone with a WebXR made for the test");
  test.setTimeout(300_000);
  const token = await session(request);
  const row = await theModel(request, token);
  let link: { id: string; token: string } | null = null;
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 412, height: 915 },
    userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
  });
  await silence(context);
  // A WebXR that says it can (an ARCore phone) and then refuses to start: the viewer asks for the session, then goes to Scene Viewer.
  await context.addInitScript(() => {
    const calls: { mode: string; required: string[]; optional: string[]; overlay: boolean }[] = [];
    (window as unknown as { __xr: typeof calls }).__xr = calls;
    Object.defineProperty(navigator, "xr", {
      configurable: true,
      value: {
        isSessionSupported: async (mode: string) => mode === "immersive-ar",
        requestSession: async (mode: string, init: { requiredFeatures?: string[]; optionalFeatures?: string[]; domOverlay?: { root?: Element } }) => {
          calls.push({ mode, required: init.requiredFeatures ?? [], optional: init.optionalFeatures ?? [], overlay: Boolean(init.domOverlay?.root?.isConnected) });
          throw new DOMException("No ARCore here", "NotSupportedError");
        },
      },
    });
  });
  const page = await context.newPage();
  try {
    link = await newLink(request, token, row);
    await openViewer(page, "/view/" + link.token);
    await ready(page);
    const button = page.locator('[data-view-ar="webxr"]');
    await expect(button).toBeVisible();
    // Scene Viewer is opened by changing the address of the page: held here (a test browser has no Google app).
    let intent = "";
    await page.route(/^intent:/, (route) => {
      intent = route.request().url();
      return route.abort();
    });
    page.on("framenavigated", (f) => (f.url().startsWith("intent:") ? (intent = f.url()) : undefined));
    page.on("console", (m) => (m.text().includes("intent://") ? (intent = m.text()) : undefined));
    await button.click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __xr: unknown[] }).__xr.length)).toBe(1);
    const call = await page.evaluate(() => (window as unknown as { __xr: { mode: string; required: string[]; optional: string[]; overlay: boolean }[] }).__xr[0]!);
    expect(call.mode).toBe("immersive-ar");
    expect(call.required).toContain("hit-test");
    expect(call.optional).toContain("dom-overlay");
    expect(call.overlay, "the overlay is in the page when the session is asked").toBe(true);
    // The session refused: no overlay left, no failure shown (Scene Viewer took over).
    await expect(page.locator("[data-webxr-overlay]")).toHaveCount(0);
    await expect(page.locator('[data-viewer] [role="alert"]')).toHaveCount(0);
    await page.waitForTimeout(1000);
    if (intent) expect(intent).toContain("arvr.google.com/scene-viewer");
  } finally {
    if (link) await dropLink(request, token, link.id);
    await context.close();
  }
});
