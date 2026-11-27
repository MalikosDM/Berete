// The 3D editor of the admin and the viewer of the client (26/11/2026, "au niveau d'iJewel"): the three zones of the
// editor, its tabs, the one-click choices with pictures, a stone's settings saved and read back, the saved views, the
// configurator and the client's buttons on a private link. Every setting changed is put back as it was. Needs the
// server (models, admin): ADMIN_PASSWORD (typed in the Terminal, never written). Desktop: the editor; iPhone: the viewer.
import { expect, test, type APIRequestContext, type Page } from "./fixtures";
import { GEM_ENVS } from "../src/data/scene3d";

type Row = { id: string; name: string; status: string; settings: Record<string, unknown>; layers: { name: string; guess: string }[] };

test.describe.configure({ mode: "serial" });
test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD (the password of the admin) is needed");

async function session(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  expect(res.status(), "admin login").toBe(200);
  return ((await res.json()) as { token: string }).token;
}

async function aModel(request: APIRequestContext, token: string, phone = false): Promise<Row> {
  const res = await request.get("/api/admin/models", { headers: { Authorization: "Bearer " + token } });
  const items = ((await res.json()) as { items: Row[] }).items.filter((m) => m.status === "ready");
  // A light model with metal and stones (a ring of three stones) when there, else the first ready one: the checks run
  // without a graphics card too, where a bracelet of 4 000 stones takes seconds per image. The phone takes another model
  // (the computer and the phone run at the same time: never the same model changed twice at once).
  const light = items.filter((m) => !/ZN1242/i.test(m.name));
  const pick = phone ? (light.find((m) => /zp1864/i.test(m.name)) ?? light[1]) : light.find((m) => /ZR0982/i.test(m.name));
  return pick ?? light[phone ? 1 : 0] ?? items[0]!;
}

async function full(request: APIRequestContext, token: string, id: string): Promise<Row> {
  const res = await request.get("/api/admin/models/" + id, { headers: { Authorization: "Bearer " + token } });
  return (await res.json()) as Row;
}

async function putSettings(request: APIRequestContext, token: string, row: Row, settings: Record<string, unknown>) {
  const res = await request.put("/api/admin/models/" + row.id, { headers: { Authorization: "Bearer " + token }, data: { name: row.name, settings, pieceSlug: (row as unknown as { pieceSlug: string | null }).pieceSlug ?? null } });
  expect(res.ok(), "save: " + (await res.text())).toBe(true);
}

async function openEditor(page: Page, token: string, id: string) {
  await page.addInitScript(([t]) => {
    sessionStorage.setItem("bj-admin-token", t!);
    sessionStorage.setItem("bj-admin-tab", "3d");
  }, [token]);
  await page.goto("/admin?debug3d");
  await page.locator('[data-model-card] [data-open-model]').first().waitFor({ timeout: 30_000 });
  const card = page.locator("[data-model-card]").filter({ has: page.locator("[data-open-model]") });
  const count = await card.count();
  for (let i = 0; i < count; i++) {
    const name = await card.nth(i).locator("p.text-xl").textContent();
    const row = await page.request.get("/api/admin/models/" + id, { headers: { Authorization: "Bearer " + token } });
    if (name === ((await row.json()) as Row).name) {
      await card.nth(i).locator("[data-open-model]").click();
      break;
    }
  }
  await page.locator("[data-editor-3d]").waitFor({ timeout: 30_000 });
  // The editor opens in its simple mode (27/11/2026): these checks are about the expert one.
  if ((await page.locator("[data-editor-mode=simple]").count()) > 0) await page.locator("[data-open-expert]").click();
  await page.locator("[data-editor-mode=expert]").waitFor({ timeout: 10_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __berete3d?: unknown }).__berete3d) && !document.querySelector("[data-editor-canvas] [role=status]"), null, { timeout: 120_000 });
}

test("the editor: three zones, the tabs, the pictures, a stone's settings saved", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "the editor is used on a computer");
  test.setTimeout(240_000);
  const token = await session(request);
  const row = await full(request, token, (await aModel(request, token)).id);
  const original = structuredClone(row.settings);
  try {
    await openEditor(page, token, row.id);
    // Three zones: the choices with pictures, the jewel and its toolbar, the tabs.
    await expect(page.locator("[data-editor-left] [data-left]")).toHaveCount(11);
    for (const tool of ["fullscreen", "reset", "fit", "loop", "animation", "rotate", "capture", "glb"]) await expect(page.locator(`[data-tool="${tool}"]`)).toBeVisible();
    for (const tab of ["view", "parts", "scene", "render", "effects", "cameras", "configurator", "export"]) await expect(page.locator(`[data-tab="${tab}"]`)).toBeVisible();
    await page.screenshot({ path: "verification/editor3d/editeur.png" });

    // The stones' lightings: one picture each, one click applies.
    await page.locator('[data-left="gem"]').click();
    await expect(page.locator("[data-drawer=gem] [data-tile]")).toHaveCount(GEM_ENVS.length);
    await page.locator('[data-tile="gem-vitrine"]').click();
    await expect(page.locator('[data-tile="gem-vitrine"]')).toHaveAttribute("aria-pressed", "true");
    await page.screenshot({ path: "verification/editor3d/eclairages-pierres.png" });
    await page.locator("[data-drawer] button").first().click();

    // A stone layer: its iJewel settings, the refractive index changed.
    const stone = row.layers.find((l) => l.guess === "diamond") ?? row.layers[0]!;
    await page.locator('[data-tab="parts"]').click();
    await page.locator(`[data-part="${stone.name}"] [role=option]`).click();
    if ((await page.locator("[data-section=diamond]").count()) === 0) await page.locator("[data-make-diamond]").click();
    const ior = page.locator('[data-control="ior"] input[type=range]');
    await ior.fill("2.42");
    await expect(page.locator('[data-control="bounces"]')).toBeVisible();
    // Every setting has its help: « ? » opens a sentence and the low and high values seen on a ring (pictures of our engine).
    await page.locator('[data-control="ior"] [data-help-toggle]').click();
    await expect(page.locator('[data-help="ior"] p')).toBeVisible();
    await expect(page.locator('[data-help="ior"] img')).toHaveCount(2);
    await page.screenshot({ path: "verification/editor3d/diamant.png" });

    // A saved camera view.
    await page.locator('[data-tab="cameras"]').click();
    await page.locator("[data-add-view]").click();
    await expect(page.locator("[data-views] [data-view]")).toHaveCount(((original.views as { list?: unknown[] } | undefined)?.list?.length ?? 0) + 1);

    // The library of materials opens with its pictures.
    await page.locator('[data-tab="parts"]').click();
    await page.locator("[data-open-library]").click();
    await expect(page.locator("[data-library] [data-tile]").first()).toBeVisible();
    await page.screenshot({ path: "verification/editor3d/bibliotheque.png" });
    await page.keyboard.press("Escape");
    await page.locator("[data-library] button", { hasText: "Fermer" }).click({ timeout: 2000 }).catch(() => undefined);

    await page.locator("[data-save-model]").click();
    await expect(page.locator("[role=status]", { hasText: "Enregistré" })).toBeVisible({ timeout: 15_000 });
    const saved = await full(request, token, row.id);
    const s = saved.settings as { scene?: { envGem?: { id?: string } }; layers: Record<string, { diamond?: { refractiveIndex?: number } }>; views?: { list?: unknown[] } };
    expect(s.scene?.envGem?.id, "the stones' lighting saved").toBe("gem-vitrine");
    expect(s.layers[stone.name]?.diamond?.refractiveIndex, "the refractive index saved").toBeCloseTo(2.42, 2);
    expect(s.views?.list?.length ?? 0).toBeGreaterThan(0);
  } finally {
    await putSettings(request, token, row, original);
  }
});

test("the client's viewer: saved views, configurator chips, zoom, share, drag-to-turn", async ({ page, request, browser, isMobile }) => {
  test.setTimeout(240_000);
  const token = await session(request);
  const row = await full(request, token, (await aModel(request, token, isMobile)).id);
  const original = structuredClone(row.settings);
  const metal = row.layers.find((l) => l.guess === "metal")?.name ?? row.layers[0]!.name;
  const settings = {
    ...original,
    views: { list: [{ id: "v1", name: "Face", position: [0, 0.01, 0.08], target: [0, 0, 0] }, { id: "v2", name: "Profil", position: [0.08, 0.01, 0], target: [0, 0, 0] }], duration: 1, ease: "easeInOutSine", interpolation: "spherical", pause: 0.5, loop: true, seekOnScroll: false },
    configurators: [{ id: "c1", label: "Métal", layers: [metal], options: [{ material: "metal/yellow-gold/polished", label: "Or jaune" }, { material: "metal/white-gold/polished", label: "Or blanc" }] }],
  };
  let link: { id: string; token: string } | null = null;
  try {
    await putSettings(request, token, row, settings);
    const res = await request.post("/api/admin/models/" + row.id + "/links", { headers: { Authorization: "Bearer " + token }, data: { title: "Test", expiresAt: null, password: null } });
    expect(res.ok()).toBe(true);
    const links = ((await full(request, token, row.id)) as unknown as { links: { id: string; token: string }[] }).links;
    link = links[0] ?? null;
    expect(link).toBeTruthy();
    await page.goto("/view/" + link!.token + "?debug3d");
    await page.locator("[data-viewer-views] [data-saved-view]").first().waitFor({ timeout: 120_000 });
    // "Drag to turn" at the first sight of the jewel (it fades by itself after 6 s; the first touch removes it).
    await expect(page.locator("[data-viewer-prompt]")).toHaveCount(1);
    await expect(page.locator("[data-saved-view]")).toHaveCount(2);
    await expect(page.locator("[data-views-tour]")).toBeVisible();
    await expect(page.locator('[data-config-option="metal/white-gold/polished"]')).toBeVisible();
    // + and − on a computer; a phone zooms with two fingers (fewer buttons over the jewel).
    if (isMobile) await expect(page.locator("[data-zoom-in]")).toHaveCount(0);
    else await expect(page.locator("[data-zoom-in]")).toBeVisible();
    await expect(page.locator("[data-share]")).toBeVisible();
    const box = (await page.locator("[data-config-option]").first().boundingBox())!;
    // 48 px on a phone (the rule of the site); a computer draws the whole site at 15 px (3 rem = 45 px).
    expect(box.height, "chips of 48 px at least").toBeGreaterThanOrEqual(isMobile ? 47.5 : 44.5);
    await page.locator('[data-config-option="metal/white-gold/polished"]').click();
    await expect(page.locator('[data-config-option="metal/white-gold/polished"]')).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("[data-viewer-prompt]")).toHaveCount(0);
    await page.locator('[data-saved-view="v2"]').click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "verification/editor3d/client-" + (browser.browserType().name() === "webkit" ? "iphone" : "ordinateur") + ".png" });
  } finally {
    if (link) await request.delete("/api/admin/links/" + link.id, { headers: { Authorization: "Bearer " + token } });
    await putSettings(request, token, row, original);
  }
});

test("the lab of the 3D is not in the built site", async ({ page, request }) => {
  // The development server has the lab (that is where it is used): this checks the built site only.
  test.skip((await request.get("/@vite/client")).ok(), "the development server has the lab");
  const res = await page.goto("/lab3d");
  // The built site has no such page: the "not found" page of the site (or the door of the site under construction).
  await expect(page.locator("[data-lab-ready]")).toHaveCount(0);
  expect(res?.status() ?? 404).not.toBe(500);
});
