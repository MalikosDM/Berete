// Feedback of Yoni (22/11/2026), checked on a computer, a tablet and an iPhone, silent:
// 1. Créations: three pieces on a row on a computer, larger than before; two on a tablet; one on a phone (24/11/2026: four on
//    a row on a computer, three on a tablet, two on a phone).
// 2. Jesus Pieces: a sub-category of the pendants (a tab inside Pendants, its own address /creations/pendants/jesus-pieces,
//    under Pendants in the menu); its old address leads there. (24/11/2026: the pendants have categories, shown first on
//    their page as tiles; inside a category, the tabs of the others.)
// 3. The world of the T-Serpent pendant in rose gold: its new backdrop, its glow, embers, halo and serpent of light.
// 4. The Butterfly: the pendant (its old address leads to it) and the chain, two pieces linked to each other; the world
//    darker, the piece first.
// 5. The private correspondence: name, email, Instagram, the idea and up to 6 photos (previewed, removable, made lighter in
//    the browser), received in the admin (photos behind the password), then the test message deleted.
// Screenshots go to verification/yoni2211/.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import sharp from "sharp";
import { expect, test, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { piecesOfCollection, SUBCATEGORIES } from "../src/data/collections";
import { publicCatalogue } from "../src/data/relations";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/yoni2211";
mkdirSync(DIR, { recursive: true });
const SCRATCH = "test-results/yoni2211-files";
mkdirSync(SCRATCH, { recursive: true });
const shot = (page: Page, name: string, full = false) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 70, fullPage: full });
const CAT = publicCatalogue(defaultCatalogue);
const PENDANT = "michy-batshuayi-butterfly-pendant";
const CHAIN = "butterfly-chain";
const ONLINE = /vercel\.app/.test(process.env.BASE_URL ?? "");

/** The number of cards on the first row of a grid. */
async function firstRow(page: Page, grid: string): Promise<number> {
  return page.locator(grid + " > li").evaluateAll((els) => {
    const tops = els.slice(0, 6).map((e) => Math.round(e.getBoundingClientRect().top));
    return tops.filter((t) => Math.abs(t - tops[0]!) < 4).length;
  });
}

test("Créations: four on a row on a computer, three on a tablet, two on a phone", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  await page.goto("/creations", { waitUntil: "load" });
  const grid = page.locator("[data-creations-grid]");
  await expect(grid.locator("> li").first()).toBeVisible();
  const phone = info.project.name !== "desktop";
  expect(await firstRow(page, "[data-creations-grid]")).toBe(phone ? 2 : 4);
  const width = await grid.locator("> li").first().evaluate((e) => e.getBoundingClientRect().width);
  // Before: six on a row (about 200 px on 1440); then three (about 420 px); since 24/11/2026 four, about 300 px.
  expect(width).toBeGreaterThan(phone ? 150 : 250);
  await shot(page, info.project.name + "-creations");
  if (!phone) {
    // A tablet: three on a row.
    await page.setViewportSize({ width: 820, height: 1180 });
    await page.waitForTimeout(500);
    expect(await firstRow(page, "[data-creations-grid]")).toBe(3);
    await shot(page, "tablette-creations");
  }
  expect(problems.errors).toEqual([]);
});

test("Jesus Pieces: inside Pendants (tab, filter, menu), its own address, the old one leads there", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  const jesus = SUBCATEGORIES.find((s) => s.slug === "jesus-pieces")!;
  const count = piecesOfCollection(CAT, jesus).length;
  expect(count).toBeGreaterThanOrEqual(4);
  for (const slug of jesus.pieces) expect(CAT.pieces.find((p) => p.slug === slug)?.type, slug).toBe("pendant");
  // The page of the pendants: its categories first (24/11/2026), Jesus Pieces among them.
  await page.goto("/fr/creations/pendants", { waitUntil: "load" });
  const tiles = page.locator("[data-categories] [data-category]");
  await expect(tiles).toHaveCount(SUBCATEGORIES.filter((s) => s.parent === "pendant" && piecesOfCollection(CAT, s).length > 0).length);
  await page.locator("[data-categories] [data-category='jesus-pieces']").click();
  await expect(page).toHaveURL(/\/fr\/creations\/pendants\/jesus-pieces$/);
  await expect(page.locator("h1")).toContainText("Jesus Pieces");
  // Inside it, the tabs of the pendants: all of them, then each category.
  const tabs = page.locator("[data-subcategories]");
  await expect(tabs.locator("[data-subcategory='pendants']")).toContainText("Tous les pendentifs");
  await expect(tabs.locator("[data-subcategory='jesus-pieces']")).toHaveAttribute("aria-current", "page");
  await expect(page.locator("[data-creations-grid] [data-piece-card]")).toHaveCount(count);
  await shot(page, info.project.name + "-pendentifs-jesus-pieces");
  // Its old address.
  await page.goto("/creations/jesus-pieces", { waitUntil: "load" });
  await expect(page).toHaveURL(/\/creations\/pendants\/jesus-pieces$/);
  // The menu: under Pendants.
  if (info.project.name === "desktop") {
    await page.locator("[data-desktop-nav] a[aria-haspopup]").hover();
    // (Among the categories of the pendants and of the chains, 24/11/2026.)
    const sub = page.locator("[data-desktop-nav] a[data-nav-sub][href='/creations/pendants/jesus-pieces']");
    await expect(sub).toHaveText("Jesus Pieces");
    await expect(sub).toHaveAttribute("href", "/creations/pendants/jesus-pieces");
    await page.waitForTimeout(400);
    await shot(page, "desktop-menu-jesus-pieces");
  } else {
    await page.getByRole("button", { name: /menu/i }).first().click();
    const sub = page.locator("#mobile-menu a[data-nav-sub][href='/creations/pendants/jesus-pieces']");
    await expect(sub).toHaveText("Jesus Pieces");
    await expect(sub).toHaveAttribute("href", "/creations/pendants/jesus-pieces");
    await page.waitForTimeout(600);
    await shot(page, info.project.name + "-menu-jesus-pieces");
    await page.keyboard.press("Escape");
  }
  // The page Créations: Pendants, then Jesus Pieces.
  await page.goto("/creations", { waitUntil: "load" });
  await page.locator("[data-filter='pendant']").click();
  await page.locator("[data-subfilter='jesus-pieces']").click();
  await expect(page).toHaveURL(/category=pendants&sub=jesus-pieces/);
  await expect(page.locator("[data-creations-grid] [data-piece-card]")).toHaveCount(count);
  await shot(page, info.project.name + "-creations-jesus-pieces");
  expect(problems.errors).toEqual([]);
});

test("the world of the T-Serpent in rose gold: its new backdrop, its glow", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  await page.goto("/pieces/marcus-thuram-t-serpent-pendant", { waitUntil: "load" });
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  await expect(page.locator("[data-universe]")).toHaveAttribute("data-universe", "serpent");
  const glow = await page.locator(".universe").first().evaluate((e) => getComputedStyle(e).getPropertyValue("--u-glow").trim().toLowerCase());
  expect(glow).toBe("#e8b4a0");
  const img = page.locator(".u-backdrop img").first();
  await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).currentSrc), { timeout: 15_000 }).toMatch(/\/media\/universes\/serpent-(m-)?\d+\.(avif|webp)$/);
  await expect.poll(() => img.evaluate((e) => (e as HTMLImageElement).naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0);
  await page.waitForTimeout(1500);
  await shot(page, info.project.name + "-serpent-or-rose");
  expect(problems.errors).toEqual([]);
});

test("the Butterfly: the pendant and the chain, two pieces linked to each other, the old address to the pendant", async ({ page }, info) => {
  const problems = watch(page);
  await skipIntro(page);
  const pendant = CAT.pieces.find((p) => p.slug === PENDANT)!;
  const chain = CAT.pieces.find((p) => p.slug === CHAIN)!;
  expect(pendant.type).toBe("pendant");
  expect(chain.type).toBe("chain");
  const files = (slug: string) => [CAT.pieces.find((p) => p.slug === slug)!.cover, ...CAT.pieces.find((p) => p.slug === slug)!.gallery].map((m) => m.src.split("/").pop()!.replace(/\.\w+$/, ""));
  expect(files(CHAIN)).toEqual(["p60", "p56", "p59", "p55", "p66"]);
  for (const f of ["p55", "p56", "p59", "p60", "p66"]) expect(files(PENDANT), f).not.toContain(f);
  for (const f of ["p62", "p63", "p68", "p69", "p70", "p71", "p72", "p73", "p74", "p75", "p52", "p54", "v15", "v09", "v03"]) expect(files(PENDANT), f).toContain(f);

  // The old address of the chain: the pendant.
  await page.goto("/pieces/michy-batshuayi-butterfly-chain", { waitUntil: "load" });
  await expect(page).toHaveURL(new RegExp("/pieces/" + PENDANT + "$"));
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  await expect(page.locator("h1")).toContainText("Butterfly Pendant");
  await expect(page.locator("[data-universe]")).toHaveAttribute("data-universe", "metamorphose");
  await page.waitForTimeout(1500);
  await shot(page, info.project.name + "-butterfly-pendentif");
  const toChain = page.locator("[data-worn-with='" + CHAIN + "']");
  await toChain.scrollIntoViewIfNeeded();
  await expect(toChain).toContainText("Butterfly Chain");
  await page.waitForTimeout(600);
  await shot(page, info.project.name + "-butterfly-pendentif-lien");
  await toChain.click();
  await expect(page).toHaveURL(new RegExp("/pieces/" + CHAIN + "$"));
  await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
  await expect(page.locator("h1")).toContainText("Butterfly Chain");
  await expect(page.locator("[data-universe]")).toHaveAttribute("data-universe", "metamorphose");
  await page.waitForTimeout(1500);
  await shot(page, info.project.name + "-butterfly-chaine");
  const toPendant = page.locator("[data-worn-with='" + PENDANT + "']");
  await expect(toPendant).toContainText("Butterfly Pendant");
  // In French.
  await page.goto("/fr/pieces/" + CHAIN, { waitUntil: "load" });
  await expect(page.locator("h1")).toContainText("Chaîne Butterfly");
  await expect(page.locator("[data-worn-with='" + PENDANT + "']")).toContainText("Pendentif Butterfly");
  // Créations: the pendant among the pendants, the chain among the chains; the page of the player: both.
  await page.goto("/creations?category=chains&view=grid", { waitUntil: "load" });
  await expect(page.locator("[data-creations-grid] [data-piece-card='" + CHAIN + "']")).toHaveCount(1);
  await expect(page.locator("[data-creations-grid] [data-piece-card='" + PENDANT + "']")).toHaveCount(0);
  await page.goto("/creations?category=pendants&view=grid", { waitUntil: "load" });
  await expect(page.locator("[data-creations-grid] [data-piece-card='" + PENDANT + "']")).toHaveCount(1);
  await page.goto("/players/michy-batshuayi", { waitUntil: "load" });
  await expect(page.locator("[data-player-piece]")).toHaveCount(2);
  await shot(page, info.project.name + "-michy-batshuayi");
  expect(problems.errors).toEqual([]);
});

/** Opens the private correspondence (again until the page is ready to answer the click). */
async function openForm(page: Page): Promise<void> {
  const toggle = page.getByRole("button", { name: /Correspondance privée/i });
  await expect(async () => {
    if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true", { timeout: 1500 });
  }).toPass({ timeout: 20_000 });
}

/** Two photos for the form: a heavy JPEG (made lighter by the browser) and, on a Mac, an iPhone photo (HEIC). */
async function testPhotos(): Promise<string[]> {
  const jpeg = SCRATCH + "/atelier-4000.jpg";
  if (!existsSync(jpeg)) await sharp("public/media/hd/michy-batshuayi-butterfly-chain/p60.webp").resize(4000, 3200, { fit: "cover" }).jpeg({ quality: 95 }).toFile(jpeg);
  const second = SCRATCH + "/croquis.heic";
  if (!existsSync(second)) {
    const tmp = SCRATCH + "/croquis.jpg";
    await sharp("public/media/hd/michy-batshuayi-butterfly-chain/p68.webp").resize(3024, 4032, { fit: "cover" }).jpeg({ quality: 92 }).toFile(tmp);
    try {
      execFileSync("sips", ["-s", "format", "heic", tmp, "--out", second], { stdio: "ignore" });
    } catch {
      return [jpeg, tmp];
    }
  }
  return [jpeg, second];
}

test("the private correspondence: photos previewed, removable, received in the admin, then deleted", async ({ page, request }, info) => {
  test.skip(ONLINE, "The form sends to the server: on Vercel it opens WhatsApp (no admin there).");
  test.setTimeout(120_000);
  const problems = watch(page);
  await skipIntro(page);
  const [heavy, heic] = await testPhotos();
  expect(statSync(heavy).size).toBeGreaterThan(1_500_000);
  const tag = "Test " + info.project.name + " " + Date.now();
  await page.goto("/fr/contact", { waitUntil: "load" });
  await openForm(page);
  const form = page.locator("[data-email-form]");
  await form.getByLabel("Nom").fill(tag);
  await form.getByLabel("E-mail").fill("test@example.com");
  await form.getByLabel(/Instagram/).fill("@beretejewellers");
  await form.getByLabel("Votre idée").fill("Un pendentif avec mes initiales, comme sur ces deux photos.");
  // Three photos chosen, one removed: two left.
  await form.locator("[data-photo-input]").setInputFiles([heavy, heic, heavy]);
  await expect(form.locator("[data-photo]")).toHaveCount(3);
  await expect(form.locator("[data-photo] [role=status]")).toHaveCount(0, { timeout: 30_000 });
  await form.locator("[data-photo-remove]").last().click();
  await expect(form.locator("[data-photo]")).toHaveCount(2);
  await form.locator("[data-photos]").scrollIntoViewIfNeeded();
  await shot(page, info.project.name + "-formulaire-photos");
  // The photo of the computer is sent lighter (a JPEG of 2048 px at most).
  const sent = page.waitForRequest((r) => r.url().endsWith("/api/contact") && r.method() === "POST");
  await page.waitForTimeout(3200); // a person takes more than 3 seconds (a robot does not: kept out)
  await form.getByRole("button", { name: "Envoyer le message" }).click();
  const body = (await sent).postDataJSON() as { photos: { name: string; type: string; data: string }[]; instagram: string };
  expect(body.photos).toHaveLength(2);
  expect(body.photos[0]!.type).toBe("image/jpeg");
  expect(body.photos[0]!.data.length * 0.75).toBeLessThan(1_700_000);
  const meta = await sharp(Buffer.from(body.photos[0]!.data, "base64")).metadata();
  expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2048);
  await expect(page.locator("[data-email-sent]")).toContainText("vos 2 photos sont bien arrivés");
  // Nothing personal in the address of the page.
  expect(page.url()).not.toMatch(/test@|Test|idee|message=/);
  await shot(page, info.project.name + "-formulaire-envoye");

  // The admin: the message, its Instagram and its two photos; the photos only with the password.
  const login = await request.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { token } = (await login.json()) as { token: string };
  const list = (await (await request.get("/api/admin/messages", { headers: { Authorization: "Bearer " + token } })).json()) as { messages: { id: string; name: string; instagram: string; photos: { id: string; mime: string }[] }[] };
  const mine = list.messages.find((m) => m.name === tag)!;
  expect(mine).toBeTruthy();
  expect(mine.instagram).toBe("beretejewellers");
  expect(mine.photos).toHaveLength(2);
  const photoUrl = "/api/admin/messages/" + mine.id + "/photos/" + mine.photos[0]!.id;
  expect((await request.get(photoUrl)).status()).toBe(401);
  const photo = await request.get(photoUrl, { headers: { Authorization: "Bearer " + token } });
  expect(photo.status()).toBe(200);
  expect(photo.headers()["cache-control"]).toContain("no-store");
  await page.goto("/admin", { waitUntil: "load" });
  await page.evaluate((t) => {
    sessionStorage.setItem("bj-admin-token", t);
    sessionStorage.setItem("bj-admin-tab", "messages");
  }, token);
  await page.reload({ waitUntil: "load" });
  const row = page.locator("[data-admin-message='" + mine.id + "']");
  await expect(row).toBeVisible({ timeout: 20_000 });
  await expect(row.locator("[data-admin-photo] img").first()).toBeVisible({ timeout: 20_000 });
  await row.scrollIntoViewIfNeeded();
  await shot(page, info.project.name + "-admin-message-photos");
  // The test message deleted.
  page.once("dialog", (d) => void d.accept());
  await row.locator("[data-admin-message-delete]").click();
  await expect(row).toHaveCount(0);
  const after = (await (await request.get("/api/admin/messages", { headers: { Authorization: "Bearer " + token } })).json()) as { messages: { name: string }[] };
  expect(after.messages.some((m) => m.name === tag)).toBe(false);
  expect(problems.errors.filter((e) => !/HTTP 401/.test(e))).toEqual([]);
});

test("online without the server (Vercel): the photos previewed, the message handed to WhatsApp, the photos to add there", async ({ page, context }, info) => {
  test.skip(!ONLINE, "Only the version online without its server hands the form to WhatsApp.");
  const problems = watch(page);
  await skipIntro(page);
  const [heavy, heic] = await testPhotos();
  await page.goto("/fr/contact", { waitUntil: "load" });
  await openForm(page);
  const form = page.locator("[data-email-form]");
  await form.getByLabel("Nom").fill("Test en ligne");
  await form.getByLabel("E-mail").fill("test@example.com");
  await form.getByLabel(/Instagram/).fill("@beretejewellers");
  await form.getByLabel("Votre idée").fill("Un pendentif avec mes initiales, comme sur ces deux photos.");
  await form.locator("[data-photo-input]").setInputFiles([heavy, heic]);
  await expect(form.locator("[data-photo]")).toHaveCount(2);
  await expect(form.locator("[data-photo] [role=status]")).toHaveCount(0, { timeout: 30_000 });
  await form.locator("[data-photos]").scrollIntoViewIfNeeded();
  await shot(page, info.project.name + "-en-ligne-formulaire-photos");
  const popup = context.waitForEvent("page");
  await form.getByRole("button", { name: "Envoyer le message" }).click();
  const wa = await popup;
  expect(wa.url()).toMatch(/wa\.me|whatsapp/);
  await wa.close();
  await expect(page.locator("[data-whatsapp-handoff]")).toBeVisible();
  await expect(page.getByText("ajoutez-les dans la conversation WhatsApp")).toBeVisible();
  await page.locator("#email-form").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await page.waitForTimeout(500);
  await shot(page, info.project.name + "-en-ligne-formulaire-whatsapp");
  expect(problems.errors).toEqual([]);
});
