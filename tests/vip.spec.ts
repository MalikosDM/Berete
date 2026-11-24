// The client space (/vip) becomes the follow-up of the commission, like a parcel tracking (Yoni, call of 24/11/2026),
// checked on the computer and on the iPhone, silent:
//   - the admin (Clients VIP) creates a client with his code, sets the step of his piece (« Design Approval »), an
//     estimated date then changes it (the history keeps both), publishes a news with a photo and one with a video;
//   - the client enters with his code: the six steps with his step in rose gold (done ones marked, next ones dimmed),
//     the estimated date and that it changed, the two news newest first, the photo full screen with the zoom, the video
//     played in place; his files are his only (nothing without his session);
//   - the client deleted at the end, with his files.
// Only with the server (the version online on Vercel has none). Screenshots go to verification/vip/.
import { mkdirSync } from "node:fs";
import sharp from "sharp";
import { expect, test, type Page } from "./fixtures";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/vip";
mkdirSync(DIR, { recursive: true });
const SCRATCH = "test-results/vip-files";
mkdirSync(SCRATCH, { recursive: true });
/** A video of 2 seconds in rose gold (H.264, 7 KB). */
const VIDEO = "tests/fixtures-media/atelier.mp4";
const ONLINE = /vercel\.app/.test(process.env.BASE_URL ?? "");
const shot = (page: Page, name: string, full = false) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 70, fullPage: full });

test.skip(ONLINE, "The client space needs the server (the version on Vercel has none).");

test("the follow-up of a commission: the admin sets the step, the date and the news, the client follows them", async ({ page, request }, info) => {
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  const health = await request.get("/api/health").catch(() => null);
  test.skip(!health?.ok(), "No server behind the site (npm start).");
  test.setTimeout(180_000);
  const problems = watch(page);
  await skipIntro(page);

  const login = await request.post("/api/admin/login", { data: { password } });
  expect(login.ok()).toBeTruthy();
  const { token } = (await login.json()) as { token: string };
  const auth = { Authorization: "Bearer " + token };
  const name = "Test VIP " + info.project.name + " " + Date.now();
  const photo = SCRATCH + "/" + info.project.name + "-photo.jpg";
  await sharp({ create: { width: 1200, height: 900, channels: 3, background: { r: 156, g: 91, b: 79 } } })
    .jpeg({ quality: 80 })
    .toFile(photo);

  try {
    // ---------- The admin ----------
    await page.goto("/admin", { waitUntil: "load" });
    await page.evaluate((t) => {
      sessionStorage.setItem("bj-admin-token", t);
      sessionStorage.setItem("bj-admin-tab", "clients");
    }, token);
    await page.reload({ waitUntil: "load" });
    await page.locator("[data-add-client]").click();
    const form = page.locator("[data-client-form]");
    await form.getByLabel("Nom").fill(name);
    await form.getByRole("button", { name: "Enregistrer" }).click();
    const row = page.locator("[data-client='" + name + "']");
    await expect(row).toBeVisible();
    const code = ((await row.locator("[data-client-code]").textContent()) ?? "").match(/[0-9A-Z]{4}-[0-9A-Z]{4}/)?.[0];
    expect(code).toBeTruthy();

    await row.locator("[data-open-tracking]").click();
    const panel = row.locator("[data-client-tracking]");
    await expect(panel.locator("[data-stage-select]")).toBeVisible();
    // The step: « Design Approval » (the third of the six).
    await panel.locator("[data-stage-select]").selectOption("2");
    await expect(row.locator("[data-client-stage]")).toContainText("3. Validation du design");
    // The estimated date, then a new one: both kept in the history.
    await panel.locator("[data-estimate-input]").fill("2027-03-01");
    await panel.locator("[data-estimate-save]").click();
    await expect(panel.locator("[data-estimate-history] li")).toHaveCount(1);
    await panel.locator("[data-estimate-input]").fill("2027-03-12");
    await panel.locator("[data-estimate-save]").click();
    await expect(panel.locator("[data-estimate-history] li")).toHaveCount(2);
    await expect(panel.locator("[data-estimate-history] li").first()).toContainText("1er mars 2027 → 12 mars 2027");
    await expect(row.locator("[data-client-stage]")).toContainText("fin estimée le 12 mars 2027");

    // A news with a photo (made lighter in the browser), then a news with a video (sent as it is).
    await panel.locator("[data-news-files]").setInputFiles(photo);
    await expect(panel.locator("[data-news-pick=image] img")).toBeVisible({ timeout: 20_000 });
    await panel.locator("[data-news-note]").fill("Le croquis de votre pièce est prêt.");
    await panel.locator("[data-news-publish]").click();
    await expect(panel.locator("[data-admin-news-item]")).toHaveCount(1, { timeout: 30_000 });
    await panel.locator("[data-news-files]").setInputFiles(VIDEO);
    await expect(panel.locator("[data-news-pick=video] video")).toBeVisible({ timeout: 20_000 });
    await panel.locator("[data-news-note]").fill("La fonte de l’or rose.");
    await panel.locator("[data-news-publish]").click();
    await expect(panel.locator("[data-admin-news-item]")).toHaveCount(2, { timeout: 30_000 });
    await expect(panel.locator("[data-admin-news-item]").first()).toContainText("La fonte");
    await panel.scrollIntoViewIfNeeded();
    await shot(page, info.project.name + "-admin-suivi");

    // ---------- The client ----------
    await page.goto("/vip", { waitUntil: "load" });
    await page.getByLabel("Access code").fill(code!);
    await page.getByRole("button", { name: "Enter" }).click();
    const space = page.locator("[data-vip-space]");
    await expect(space).toBeVisible({ timeout: 20_000 });

    // The six steps: two done, his step in rose gold, three to come.
    const journey = space.locator("[data-vip-journey]");
    await expect(journey.locator("[data-step]")).toHaveCount(6);
    await expect(journey.locator("[data-step=done]")).toHaveCount(2);
    await expect(journey.locator("[data-step=next]")).toHaveCount(3);
    const current = journey.locator("[aria-current=step]");
    await expect(current).toContainText("Design Approval");
    await expect(current).toContainText("In progress");
    await expect(journey.locator("[data-vip-progress]")).toHaveText("Step 3 of 6");
    const currentColor = await current.locator("p").first().evaluate((el) => getComputedStyle(el).color);
    const nextColor = await journey.locator("[data-step=next] p").first().evaluate((el) => getComputedStyle(el).color);
    expect(currentColor).toBe("rgb(232, 180, 160)");
    expect(nextColor).not.toBe(currentColor);

    // The estimated date, and that it changed.
    await expect(space.locator("[data-vip-estimate]")).toContainText("12 March 2027");
    await expect(space.locator("[data-vip-estimate-changed]")).toContainText("Updated on");
    await expect(space.locator("[data-vip-estimate-changed]")).toContainText("previously 1 March 2027");

    // The news, newest first: the video, then the photo.
    const news = space.locator("[data-vip-news-item]");
    await expect(news).toHaveCount(2);
    await expect(news.nth(0)).toContainText("La fonte de l’or rose.");
    await expect(news.nth(0).locator("[data-vip-video]")).toHaveCount(1);
    await expect(news.nth(1)).toContainText("Le croquis de votre pièce est prêt.");
    await expect(news.nth(1).locator("[data-vip-photo] img")).toBeVisible();
    // Loaded when it comes near the screen (loading="lazy").
    await news.nth(1).locator("[data-vip-photo] img").scrollIntoViewIfNeeded();
    await expect.poll(() => news.nth(1).locator("[data-vip-photo] img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    // Text of 16 px at least on the phone.
    for (const el of [news.nth(0).locator("p").last(), current.locator("h3")]) {
      expect(parseFloat(await el.evaluate((e) => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(info.project.name === "iphone" ? 16 : 14);
    }
    await shot(page, info.project.name + "-espace-client", true);

    // His files are his only: nothing without his session.
    const fileUrl = await news.nth(1).locator("[data-vip-photo] img").getAttribute("src");
    expect((await request.get(fileUrl!)).status()).toBe(404);
    expect((await page.request.get(fileUrl!)).status()).toBe(200);

    // The photo full screen, with the zoom.
    await news.nth(1).locator("[data-vip-photo]").click();
    const box = page.locator("[data-lightbox]");
    await expect(box).toBeVisible();
    await box.locator("[data-zoom-in]").click();
    await expect.poll(async () => Number(await box.locator("[data-lightbox-stage]").getAttribute("data-zoom"))).toBeGreaterThan(1);
    await shot(page, info.project.name + "-photo-plein-ecran");
    await page.keyboard.press("Escape");
    await expect(box).toHaveCount(0);

    // The video plays in place (by ranges, as Safari on an iPhone asks for it).
    const video = news.nth(0).locator("[data-vip-video]");
    await video.scrollIntoViewIfNeeded();
    expect(await video.evaluate((v: HTMLVideoElement) => [v.controls, v.playsInline, v.preload].join())).toBe("true,true,metadata");
    const ranged = await page.request.get((await video.getAttribute("src"))!.replace(/#.*$/, ""), { headers: { Range: "bytes=0-99" } });
    expect(ranged.status()).toBe(206);
    expect(ranged.headers()["content-type"]).toBe("video/mp4");
    await video.evaluate((v: HTMLVideoElement) => {
      v.muted = true;
      return v.play();
    });
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.3);
    await shot(page, info.project.name + "-video");

    // In French: the step, and « 1er mars ».
    await page.goto("/fr/vip", { waitUntil: "load" });
    await expect(page.locator("[data-vip-journey] [aria-current=step]")).toContainText("Validation du design");
    await expect(page.locator("[data-vip-estimate-changed]")).toContainText("prévue auparavant le 1er mars 2027");
    await expect(page.locator("[data-vip-journey] [data-vip-progress]")).toHaveText("Étape 3 sur 6");

    // WebKit (the iPhone) logs the icons of its own video controls it draws in a test browser: not the page.
    expect(problems.errors.filter((e) => !/HTTP 401|Button failed to load, iconName/.test(e))).toEqual([]);
  } finally {
    // The test client deleted, with his photos and videos.
    const list = (await (await request.get("/api/admin/clients", { headers: auth })).json()) as { items: { id: string; name: string }[] };
    for (const c of list.items.filter((x) => x.name === name)) await request.delete("/api/admin/clients/" + c.id, { headers: auth });
    const after = (await (await request.get("/api/admin/clients", { headers: auth })).json()) as { items: { name: string }[] };
    expect(after.items.some((c) => c.name === name)).toBe(false);
  }
});
