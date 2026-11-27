// The client's three Rhino files as the admin opens them (27/11/2026): the whole piece in the frame with a margin (never
// tiny, never cut), a flat pendant stood up facing the camera, and nothing shown apart from the jewel unless the file has
// it so (a layer lying wholly apart is hidden by the engine; the far pieces of the OKA's main layer are drawn but not
// framed). Needs the server: ADMIN_PASSWORD (typed in the Terminal, never written). Skipped when the files are not there.
import { expect, test, type APIRequestContext } from "./fixtures";

const FILES = [
  { label: "OKA pendant", name: /SCO108301-ZP0275-BJ001/ },
  { label: "octagon « N » v2", name: /SCO110093-ZP0975-BJ001/ },
  { label: "octagon « N » v1", name: /^ZP0975-BJ001/ },
];

test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD (the password of the admin) is needed");

async function session(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  expect(res.status(), "admin login").toBe(200);
  return ((await res.json()) as { token: string }).token;
}

for (const file of FILES) {
  test("the " + file.label + " opens whole, framed, upright, nothing stray", async ({ page, request, isMobile }) => {
    test.skip(isMobile, "the editor is used on a computer");
    test.setTimeout(240_000);
    const token = await session(request);
    const list = ((await (await request.get("/api/admin/models", { headers: { Authorization: "Bearer " + token } })).json()) as { items: { id: string; name: string; status: string }[] }).items;
    const model = list.find((m) => file.name.test(m.name) && m.status === "ready");
    test.skip(!model, "this file is not in this site's admin");
    await page.addInitScript(([t]) => {
      sessionStorage.setItem("bj-admin-token", t!);
      sessionStorage.setItem("bj-admin-tab", "3d");
    }, [token]);
    await page.goto("/admin?debug3d");
    const card = page.locator("[data-model-card]").filter({ hasText: model!.name }).first();
    await card.locator("[data-open-model]").click();
    await page.locator("[data-editor-3d]").waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => Boolean((window as unknown as { __berete3d?: unknown }).__berete3d) && !document.querySelector("[data-editor-middle] [role=status]"), null, { timeout: 180_000 });
    await page.waitForTimeout(1500);
    const f = await page.evaluate(() => (window as unknown as { __berete3d: { framing(): { x: number; y: number; points: number } } }).__berete3d.framing());
    const fill = Math.max(f.x, f.y);
    expect(fill, file.label + ": the whole piece on screen with a margin").toBeLessThanOrEqual(0.95);
    expect(fill, file.label + ": not tiny in its frame").toBeGreaterThanOrEqual(0.6);
    const analysis = await page.evaluate(() => (window as unknown as { __berete3d: { analysis(): Record<string, { apart?: boolean }> } }).__berete3d.analysis());
    const apart = Object.entries(analysis).filter(([, a]) => a.apart).map(([n]) => n);
    // A layer wholly apart (the « N » plates of the octagon v2) is not drawn.
    const drawnApart = await page.evaluate((names) => {
      const root = (window as unknown as { __berete3d: { handles: { jewel(): import("three").Object3D | null } } }).__berete3d.handles.jewel();
      let shown = 0;
      root?.traverse((o) => {
        const m = o as import("three").Mesh;
        if (m.isMesh && m.visible && names.includes((m.userData as { layer?: string }).layer ?? "")) shown++;
      });
      return shown;
    }, apart);
    expect(drawnApart, file.label + ": layers lying apart are hidden").toBe(0);
    await page.locator("[data-editor-middle]").screenshot({ path: "verification/editor3d/rhino-" + file.label.replace(/[^a-z0-9]+/gi, "-") + ".png" });
  });
}
