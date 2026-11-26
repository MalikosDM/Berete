// What Yoni changes in the admin shows on the site (25/11/2026, the promise of Malik): the order of the pieces in The
// Creations, the order and the choice of the photos of a piece, a caption, a text. Each setting is changed through the admin
// (its API, as the admin page does), the site is checked, then the setting is put back as it was — whatever happens.
// ADMIN_PASSWORD (typed in the Terminal, never written anywhere) gives the session; without it the test is skipped. Online,
// ACCESS_PASSWORD enters the site under construction (tests/fixtures.ts). Desktop only (one change at a time on the base).
import { expect, test, type APIRequestContext, type Page } from "./fixtures";
import { skipIntro } from "./helpers";

type Media = { type: string; src: string; [k: string]: unknown };
type Row = { id: string; slug: string; title: string; line: string; gallery: Media[]; angles: Record<string, { title: string; text: string }>; [k: string]: unknown };

const SLUG = "noah-okafor-octagon-pendant";

test.describe.configure({ mode: "serial" });
test.skip(!process.env.ADMIN_PASSWORD, "ADMIN_PASSWORD (the password of the admin) is needed");
test.skip(({ browserName, isMobile }) => browserName !== "chromium" || Boolean(isMobile), "one browser: the changes are made on the base");

async function session(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD } });
  expect(res.status(), "admin login").toBe(200);
  return ((await res.json()) as { token: string }).token;
}

async function pieces(request: APIRequestContext, token: string): Promise<Row[]> {
  const res = await request.get("/api/admin/pieces", { headers: { Authorization: "Bearer " + token } });
  expect(res.ok()).toBe(true);
  return ((await res.json()) as { items: Row[] }).items;
}

async function put(request: APIRequestContext, token: string, row: Row): Promise<void> {
  const { id, ...rest } = row;
  const res = await request.put("/api/admin/pieces/" + id, { headers: { Authorization: "Bearer " + token }, data: rest });
  expect(res.ok(), "admin save: " + (await res.text())).toBe(true);
}

/** The page once the catalogue of the base is read (the site shows the base after its first paint). */
async function open(page: Page, path: string) {
  await skipIntro(page);
  const catalogue = page.waitForResponse((r) => r.url().includes("/api/catalogue"), { timeout: 20_000 }).catch(() => null);
  await page.goto(path, { waitUntil: "load" });
  await catalogue;
  await page.waitForTimeout(800);
}

const base = (src: string) => (src.split("/").pop() ?? "").split(".")[0];

test("the order of the pieces in The Creations follows the admin", async ({ page, request }) => {
  const token = await session(request);
  const before = await pieces(request, token);
  const published = before.filter((p) => p.published !== false);
  const ids = before.map((p) => p.id);
  // The last published piece first.
  const moved = published[published.length - 1]!;
  const order = [moved.id, ...ids.filter((id) => id !== moved.id)];
  try {
    expect((await request.post("/api/admin/pieces/reorder", { headers: { Authorization: "Bearer " + token }, data: { ids: order } })).ok()).toBe(true);
    await open(page, "/creations");
    await expect(page.locator("[data-piece-card], [data-creations] li a[href^='/pieces/']").first()).toHaveAttribute("href", new RegExp("/pieces/" + moved.slug + "$"));
  } finally {
    await request.post("/api/admin/pieces/reorder", { headers: { Authorization: "Bearer " + token }, data: { ids } });
  }
});

test("the order and the choice of the photos of a piece follow the admin", async ({ page, request }) => {
  const token = await session(request);
  const row = (await pieces(request, token)).find((p) => p.slug === SLUG)!;
  const original = structuredClone(row);
  const photos = row.gallery.filter((m) => m.type === "image");
  // A photo of the end put first (its order), another one removed (its choice).
  const first = photos[photos.length - 1]!;
  const removed = photos[photos.length - 2]!;
  const gallery = [first, ...row.gallery.filter((m) => m.src !== first.src && m.src !== removed.src)];
  try {
    await put(request, token, { ...row, gallery });
    await open(page, "/pieces/" + SLUG);
    // The photos of the page, every one of them (See more opened).
    const more = page.locator("[data-angle-more]");
    if (await more.count()) await more.click();
    const shown = await page.locator("[data-angle] img, [data-magazine-photo] img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).currentSrc || (e as HTMLImageElement).src));
    expect(shown.map(base), "the photo removed in the admin").not.toContain(base(removed.src));
    // Its first photo of the whole is the one put first (unless the opening already shows it).
    const firstShown = await page.locator("[data-every-angle] [data-angle='1'] img").first().getAttribute("src");
    expect(base(firstShown ?? ""), "the order of the admin").toBe(base(first.src));
  } finally {
    await put(request, token, original);
  }
});

test("a caption written in the admin shows under its photo and full screen", async ({ page, request }) => {
  const token = await session(request);
  const row = (await pieces(request, token)).find((p) => p.slug === SLUG)!;
  const original = structuredClone(row);
  const words = "Test de légende " + Date.now();
  try {
    // The caption of the first photo of the whole.
    await open(page, "/pieces/" + SLUG);
    const src = await page.locator("[data-every-angle] [data-angle='1'] img").first().getAttribute("src");
    const photo = row.gallery.find((m) => base(m.src) === base(src ?? ""));
    expect(photo, "the photo in the admin").toBeTruthy();
    await put(request, token, { ...row, angles: { ...row.angles, [photo!.src]: { title: words, text: "" } } });
    await open(page, "/pieces/" + SLUG);
    await expect(page.locator("[data-angle-caption]", { hasText: words })).toBeVisible();
    await page.locator("[data-every-angle] [data-angle='1'] button").click();
    await expect(page.locator("[data-lightbox]")).toContainText(words);
  } finally {
    await put(request, token, original);
  }
});

test("a text written in the admin shows on the page", async ({ page, request }) => {
  const token = await session(request);
  const row = (await pieces(request, token)).find((p) => p.slug === SLUG)!;
  const original = structuredClone(row);
  const words = "Une phrase de test " + Date.now() + ".";
  try {
    await put(request, token, { ...row, line: words });
    await open(page, "/pieces/" + SLUG);
    await expect(page.locator("[data-piece-line]")).toHaveText(words);
  } finally {
    await put(request, token, original);
  }
});
