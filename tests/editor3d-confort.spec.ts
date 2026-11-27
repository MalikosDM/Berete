// The comforts of the 3D editor of the admin (27/11/2026, "au niveau d'iJewel"): « Annuler » / « Rétablir » every change (a
// slider dragged is one step), the keyboard shortcuts (never while typing), « Comparer » before / after with its line, the
// scene presets (saved, applied to another model), the versions kept at each save (« Rétablir »), « Voir sur la page de la
// pièce » with the settings not saved yet. Every model changed is put back as it was, every preset and version made here is
// deleted. Needs the server (models, admin): ADMIN_PASSWORD (typed in the Terminal, never written). Computer only.
// Models: 0542 (opened) and ZN1059-BJ001(2) (a preset applied to it): the other checks use ZR0982 and the Rhino files.
import os from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "./fixtures";

type Row = { id: string; name: string; status: string; pieceSlug: string | null; settings: Record<string, unknown> };
type Version = { id: string; at: string; settings: Record<string, unknown> };
type Preset = { id: string; name: string; part: Record<string, unknown> };

test.describe.configure({ mode: "serial" });
test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD (the password of the admin) is needed");

const SHOTS = path.join(os.homedir(), "Downloads", "_verif-3d-v3");
/** A piece of the site the opened model is put on for a moment (« Voir sur la page de la pièce »), then taken off. */
const PIECE = "kevin-schade-dragon-ball-pendant";

async function session(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  expect(res.status(), "admin login").toBe(200);
  return ((await res.json()) as { token: string }).token;
}

function api(request: APIRequestContext, token: string) {
  const headers = { Authorization: "Bearer " + token };
  return {
    models: async () => ((await (await request.get("/api/admin/models", { headers })).json()) as { items: Row[] }).items,
    model: async (id: string) => (await (await request.get("/api/admin/models/" + id, { headers })).json()) as Row,
    put: async (row: Row, settings: Record<string, unknown>, pieceSlug: string | null) => {
      const res = await request.put("/api/admin/models/" + row.id, { headers, data: { name: row.name, settings, pieceSlug } });
      expect(res.ok(), "save: " + (await res.text())).toBe(true);
    },
    versions: async (id: string) => ((await (await request.get("/api/admin/3d-versions/" + id, { headers })).json()) as { items: Version[] }).items,
    deleteVersion: (id: string, version: string) => request.delete("/api/admin/3d-versions/" + id + "/" + version, { headers }),
    presets: async () => ((await (await request.get("/api/admin/3d-presets", { headers })).json()) as { items: Preset[] }).items,
    deletePreset: (id: string) => request.delete("/api/admin/3d-presets/" + id, { headers }),
  };
}

async function ready(page: Page) {
  await page.locator("[data-editor-3d]").waitFor({ timeout: 30_000 });
  await page.waitForFunction(() => Boolean((window as unknown as { __berete3d?: unknown }).__berete3d) && !document.querySelector("[data-editor-canvas] [role=status]"), null, { timeout: 120_000 });
}

async function openEditor(page: Page, token: string, sourceName: string) {
  await page.addInitScript(([t]) => {
    sessionStorage.setItem("bj-admin-token", t!);
    sessionStorage.setItem("bj-admin-tab", "3d");
  }, [token]);
  await page.goto("/admin?debug3d");
  await page.locator(`[data-model-card][data-model-row="${sourceName}"] [data-open-model]`).click({ timeout: 30_000 });
  await ready(page);
}

const pressed = (page: Page, tile: string) => page.locator(`[data-drawer] [data-tile="${tile}"]`);
/** confort-<name>.png (Chromium) or confort-<name>-safari.png (WebKit), a band of the page (small files). */
const file = (page: Page, name: string) => path.join(SHOTS, "confort-" + name + (page.context().browser()?.browserType().name() === "webkit" ? "-safari" : "") + ".png");
const shot = (page: Page, name: string, clip = { x: 0, y: 300, width: 1440, height: 600 }) => page.screenshot({ path: file(page, name), clip, scale: "css" });

test("the editor's comforts: undo and redo, shortcuts, compare, presets, versions, the page of the piece", async ({ page, request, context, isMobile }) => {
  test.skip(isMobile, "the editor is used on a computer");
  test.setTimeout(480_000);
  const token = await session(request);
  const a = api(request, token);
  const all = await a.models();
  const mainId = all.find((m) => m.name === "0542" && m.status === "ready")?.id;
  const otherId = all.find((m) => /^ZN1059/i.test(m.name) && m.status === "ready")?.id;
  test.skip(!mainId || !otherId, "the models 0542 and ZN1059-BJ001(2) are needed");
  const main = await a.model(mainId!);
  const other = await a.model(otherId!);
  const versionsBefore = new Map([main.id, other.id].map((id) => [id, new Set<string>()]));
  for (const id of [main.id, other.id]) for (const v of await a.versions(id)) versionsBefore.get(id)!.add(v.id);
  const presetsBefore = new Set((await a.presets()).map((p) => p.id));
  page.on("dialog", (d) => void d.accept());

  try {
    // On a page of the site for a moment (same settings: no version kept).
    await a.put(main, main.settings, PIECE);
    await openEditor(page, token, "0542.stl");
    const undo = page.locator("[data-undo]");
    const redo = page.locator("[data-redo]");
    await expect(page.locator("[data-confort-bar]")).toBeVisible();
    await expect(undo).toBeDisabled();
    await expect(redo).toBeDisabled();
    await expect(page.locator("[data-compare-open]")).toBeDisabled();

    await test.step("E switches to the expert mode; Annuler / Rétablir, buttons and keys", async () => {
      await expect(page.locator("[data-editor-mode]")).toHaveAttribute("data-editor-mode", "simple");
      await page.keyboard.press("e");
      await expect(page.locator("[data-editor-mode]")).toHaveAttribute("data-editor-mode", "expert");
      await ready(page);
      await page.locator('[data-left="gem"]').click();
      const tiles = page.locator("[data-drawer=gem] [data-tile]");
      const free: string[] = [];
      for (let i = 0; i < (await tiles.count()); i++) if ((await tiles.nth(i).getAttribute("aria-pressed")) !== "true") free.push((await tiles.nth(i).getAttribute("data-tile"))!);
      const [first, second] = free;
      await pressed(page, first!).click();
      await expect(pressed(page, first!)).toHaveAttribute("aria-pressed", "true");
      await expect(undo).toBeEnabled();
      await page.waitForTimeout(600);
      await pressed(page, second!).click();
      await expect(pressed(page, second!)).toHaveAttribute("aria-pressed", "true");
      await undo.click();
      await expect(pressed(page, first!)).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("[data-confort-note]")).toHaveText("Changement annulé.");
      await shot(page, "annuler-retablir");
      await page.keyboard.press("ControlOrMeta+z");
      await expect(pressed(page, first!)).toHaveAttribute("aria-pressed", "false");
      await expect(pressed(page, second!)).toHaveAttribute("aria-pressed", "false");
      await expect(undo).toBeDisabled();
      await page.keyboard.press("ControlOrMeta+Shift+z");
      await expect(pressed(page, first!)).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("Control+y");
      await expect(pressed(page, second!)).toHaveAttribute("aria-pressed", "true");
      await expect(redo).toBeDisabled();
      await page.locator("[data-drawer] button").first().click();
    });

    let initial = "";
    let dragged = "";
    await test.step("a slider dragged is one step", async () => {
      await page.locator('[data-left="advanced"]').click();
      const slider = page.locator("[data-drawer=advanced] input[type=range]").first();
      await slider.evaluate((el) => el.scrollIntoView({ block: "center" }));
      initial = await slider.inputValue();
      const box = (await slider.boundingBox())!;
      const y = box.y + box.height / 2;
      await page.mouse.move(box.x + box.width * 0.3, y);
      await page.mouse.down();
      for (let i = 1; i <= 8; i++) await page.mouse.move(box.x + box.width * (0.3 + i * 0.05), y, { steps: 2 });
      await page.mouse.up();
      dragged = await slider.inputValue();
      expect(dragged).not.toBe(initial);
      await undo.click();
      await expect(slider).toHaveValue(initial);
      await redo.click();
      await expect(slider).toHaveValue(dragged);
    });

    await test.step("the shortcuts: the help, the views, framing, the turning", async () => {
      await page.locator("[data-keys-open]").click();
      const help = page.locator("[data-confort-panel=keys]");
      await expect(help).toBeVisible();
      await expect(help).toContainText("Rétablir");
      await expect(help).toContainText("Vue de face, de profil, de trois quarts, de dessus");
      await shot(page, "raccourcis", { x: 720, y: 300, width: 720, height: 600 });
      await page.keyboard.press("Escape");
      await expect(help).toBeHidden();
      await page.keyboard.press("?");
      await expect(help).toBeVisible();
      await page.keyboard.press("?");
      await expect(help).toBeHidden();
      const position = () => page.evaluate(() => (window as unknown as { __berete3d: { getView(): { position: number[] } | null } }).__berete3d.getView()?.position ?? [0, 0, 0]);
      await page.keyboard.press("1");
      await expect(page.locator("[data-confort-note]")).toHaveText("Vue de face");
      await page.waitForTimeout(1500);
      const front = await position();
      await page.keyboard.press("2");
      await page.waitForTimeout(1500);
      const side = await position();
      expect(Math.hypot(front[0]! - side[0]!, front[1]! - side[1]!, front[2]! - side[2]!), "the side view is elsewhere").toBeGreaterThan(0.001);
      await page.keyboard.press("4");
      await expect(page.locator("[data-confort-note]")).toHaveText("Vue de dessus");
      await page.keyboard.press("f");
      await expect(page.locator("[data-confort-note]")).toHaveText("Bijou cadré.");
      await page.keyboard.press("r");
      await expect(page.locator('[data-tool="rotate"]')).toHaveAttribute("aria-pressed", "true");
      await page.keyboard.press("r");
      await expect(page.locator('[data-tool="rotate"]')).toHaveAttribute("aria-pressed", "false");
      await page.keyboard.press("3");
      await page.waitForTimeout(1200);
    });

    await test.step("Comparer: the saved settings and the draft, a line to slide", async () => {
      const open = page.locator("[data-compare-open]");
      await expect(open).toBeEnabled();
      await open.click();
      const view = page.locator("[data-compare]");
      await expect(view).toBeVisible({ timeout: 20_000 });
      await expect(view).toHaveAttribute("data-compare-at", "50");
      expect(await page.locator("[data-compare-before]").getAttribute("src")).toMatch(/^data:image\/png/);
      expect(await page.locator("[data-compare-after]").getAttribute("src")).toMatch(/^data:image\/png/);
      expect(await page.locator("[data-compare-before]").getAttribute("src"), "two different pictures").not.toBe(await page.locator("[data-compare-after]").getAttribute("src"));
      // The draft is drawn again behind (the slider kept its value).
      await expect(page.locator("[data-drawer=advanced] input[type=range]").first()).toHaveValue(dragged);
      await shot(page, "comparer");
      await page.locator("[data-compare-handle]").focus();
      for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowLeft");
      await expect(view).toHaveAttribute("data-compare-at", "44");
      // Dragged anywhere on the picture (clear of the fixed foot of the page).
      await view.evaluate((el) => el.scrollIntoView({ block: "start" }));
      const box = (await view.boundingBox())!;
      const y = box.y + Math.min(160, box.height / 3);
      await page.mouse.move(box.x + box.width * 0.6, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.25, y, { steps: 4 });
      await page.mouse.up();
      expect(Math.abs(Number(await view.getAttribute("data-compare-at")) - 25)).toBeLessThanOrEqual(2);
      await page.locator("[data-compare-close]").click();
      await expect(view).toBeHidden();
    });

    const name = "Essai confort " + Date.now();
    await test.step("Préréglages: saved, then applied to another model (its parts stay)", async () => {
      await page.locator("[data-presets-open]").click();
      await page.locator("[data-preset-name]").fill(name);
      await expect(page.locator("[data-preset-name]")).toHaveValue(name);
      await page.locator("[data-preset-save]").click();
      const row = page.locator(`[data-preset="${name}"]`);
      await expect(row).toBeVisible();
      await expect(page.locator("[data-confort-note]")).toContainText("enregistré");
      await shot(page, "prereglages");
      const preset = (await a.presets()).find((p) => p.name === name)!;
      expect(preset, "the preset is on the server").toBeTruthy();
      expect(preset.part.background).toBeTruthy();
      expect(preset.part.scene, "the scene of the draft").toBeTruthy();

      await row.locator("[data-preset-apply-many]").click();
      const dialog = page.locator("[data-apply-many]");
      await expect(dialog).toBeVisible();
      await dialog.locator(`[data-apply-many-model="${other.name}"]`).check();
      await dialog.locator("[data-apply-many-go]").click();
      await expect(dialog.locator("[data-apply-many-done]")).toContainText("1 modèle enregistré");
      await shot(page, "appliquer", { x: 220, y: 0, width: 1000, height: 640 });
      await dialog.locator("[data-apply-many-close]").click();
      await expect(dialog).toBeHidden();

      const after = await a.model(other.id);
      expect(after.settings.scene).toEqual(preset.part.scene);
      expect(after.settings.background).toBe(preset.part.background);
      expect(after.settings.layers, "its parts stay its own").toEqual(other.settings.layers);
      expect(after.settings.metals).toEqual(other.settings.metals);
      expect(after.settings.view).toEqual(other.settings.view);
      // Its settings from before are kept as a version.
      expect((await a.versions(other.id)).some((v) => !versionsBefore.get(other.id)!.has(v.id))).toBe(true);
    });

    await test.step("S saves; the settings from before are a version; « Rétablir » puts them back in the draft", async () => {
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      const saved = page.waitForResponse((r) => r.request().method() === "PUT" && r.url().endsWith("/api/admin/models/" + main.id));
      await page.keyboard.press("s");
      expect((await saved).status()).toBe(200);
      await expect(page.locator("[data-compare-open]")).toBeDisabled();
      const versions = await a.versions(main.id);
      const added = versions.filter((v) => !versionsBefore.get(main.id)!.has(v.id));
      expect(added.length).toBe(1);
      expect(added[0]!.settings).toEqual(main.settings);

      await page.locator("[data-versions-open]").click();
      const first = page.locator("[data-version]").first();
      await expect(first).toContainText("avant le dernier enregistrement");
      await shot(page, "versions");
      await first.locator("[data-version-restore]").click();
      await expect(page.locator("[data-confort-note]")).toContainText("Version rétablie");
      await expect(page.locator("[data-drawer=advanced] input[type=range]").first()).toHaveValue(initial);
      await expect(page.locator("[data-compare-open]")).toBeEnabled();
      // « Rétablir » is one step of « Annuler ».
      await page.keyboard.press("ControlOrMeta+z");
      await expect(page.locator("[data-drawer=advanced] input[type=range]").first()).toHaveValue(dragged);
    });

    await test.step("Voir sur la page de la pièce: the draft for the page, 30 minutes", async () => {
      const link = page.locator("[data-preview-page]");
      await expect(link).toHaveAttribute("href", "/pieces/" + PIECE + "?preview3d=1");
      const [tab] = await Promise.all([context.waitForEvent("page"), link.click()]);
      expect(tab.url()).toContain("/pieces/" + PIECE + "?preview3d=1");
      await tab.close();
      const kept = await page.evaluate((id) => JSON.parse(localStorage.getItem("bj-3d-preview:" + id) ?? "null") as { settings: Record<string, unknown>; expires: number } | null, main.id);
      expect(kept).not.toBeNull();
      expect(kept!.expires - Date.now()).toBeGreaterThan(29 * 60_000);
      expect(kept!.expires - Date.now()).toBeLessThan(31 * 60_000);
      expect(kept!.settings.layers).toEqual(main.settings.layers);
      expect(JSON.stringify(kept!.settings.scene)).not.toBe(JSON.stringify(main.settings.scene));
    });

    await test.step("never a shortcut while typing in a field", async () => {
      const field = page.getByLabel("Nom du modèle");
      const value = await field.inputValue();
      const puts: string[] = [];
      page.on("request", (r) => r.method() === "PUT" && puts.push(r.url()));
      await field.click();
      await field.press("End");
      await page.keyboard.type("zs1");
      await expect(field).toHaveValue(value + "zs1");
      await page.waitForTimeout(600);
      expect(puts, "S in a field does not save").toEqual([]);
      await expect(page.locator("[data-drawer=advanced] input[type=range]").first()).toHaveValue(dragged);
      await field.fill(value);
    });
  } finally {
    await a.put(main, main.settings, main.pieceSlug);
    await a.put(other, other.settings, other.pieceSlug);
    for (const id of [main.id, other.id]) for (const v of await a.versions(id)) if (!versionsBefore.get(id)!.has(v.id)) await a.deleteVersion(id, v.id);
    for (const p of await a.presets()) if (!presetsBefore.has(p.id)) await a.deletePreset(p.id);
  }
  expect((await a.model(main.id)).settings).toEqual(main.settings);
  expect((await a.model(main.id)).pieceSlug).toBe(main.pieceSlug);
  expect((await a.model(other.id)).settings).toEqual(other.settings);
  expect((await a.versions(main.id)).length).toBe(versionsBefore.get(main.id)!.size);
  expect((await a.presets()).length).toBe(presetsBefore.size);
});
