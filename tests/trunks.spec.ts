// The Signature Trunks that open (feedback of Yoni, 21/11/2026): each trunk closed at first; a click (a touch) plays the
// film of its opening in its place, silent, its golden light coming out; at the end it stays open (its image, no jump from
// the last frame of the film) with the button to create one's own, in its light, a WhatsApp message that names it, in the
// language of the site. A link watches the opening again, another closes it. Asked for less motion: open at once.
// Screenshots go to verification/trunks/.
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { trunkOf } from "../src/data/trunks";
import { skipIntro, watch } from "./helpers";

const DIR = "verification/trunks";
mkdirSync(DIR, { recursive: true });

/** Three trunks: the trunk of the house, the case of the Inter ring, Sirius; the message of each in English and in French. */
const TRUNKS: [string, string, string, string][] = [
  ["signature-trunk", "/fr", "Créer mon écrin", "Bonjour Berete, j’ai découvert l’écrin Signature sur votre site et j’aimerais créer mon propre écrin."],
  ["campione-d-italia-case", "", "Create my own trunk", "Hello Berete, I discovered the Campione d'Italia Case on your website and would like to create my own."],
  ["sirius", "", "Create my own trunk", "Hello Berete, I discovered the Sirius trunk on your website and would like to create my own."],
];

/** The mean difference of two screenshots of the same square (0 to 255). */
async function difference(a: Buffer, b: Buffer): Promise<number> {
  const { default: sharp } = await import("sharp");
  const [x, y] = await Promise.all([a, b].map((buf) => sharp(buf).resize(200, 200).removeAlpha().raw().toBuffer()));
  let sum = 0;
  for (let i = 0; i < x!.length; i++) sum += Math.abs(x![i]! - y![i]!);
  return sum / x!.length;
}

async function square(card: Locator): Promise<Locator> {
  const sq = card.locator(".aspect-square");
  await sq.evaluate((el) => el.scrollIntoView({ block: "center" }));
  return sq;
}

const shot = (page: Page, name: string) => page.screenshot({ path: DIR + "/" + name + ".jpg", type: "jpeg", quality: 70 });

test("every trunk of Yoni has its opening; the Dragon Ball trunk keeps its photos", () => {
  for (const slug of ["signature-trunk", "sirius", "tulips-on-tour", "butterfly-trunk", "okafor-trunk", "campione-d-italia-case", "nz-travel-case"]) expect(trunkOf(slug), slug).not.toBeNull();
  expect(trunkOf("dragon-ball-trunk")).toBeNull();
});

for (const [slug, prefix, label, message] of TRUNKS) {
  test(slug + ": closed, then its opening, open with its button and its WhatsApp message", async ({ page }, info) => {
    const problems = watch(page);
    await skipIntro(page);
    await page.goto(prefix + "/boxes", { waitUntil: "load" });
    const card = page.locator("[data-box='" + slug + "']");
    const sq = await square(card);
    await page.waitForTimeout(900);
    // Closed: its image, its film not playing (it loads only near the screen).
    await expect(card.locator("[data-trunk-image='closed']")).toHaveClass(/opacity-100/);
    await expect(card.locator("[data-trunk-create]")).toHaveCount(0);
    await shot(page, info.project.name + "-" + slug + "-1-ferme");
    // A click: the film plays, silent.
    await card.locator("[data-trunk-open]").click();
    const video = card.locator("[data-trunk-video]");
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 15_000 }).toBeGreaterThan(1.5);
    expect(await video.evaluate((v) => (v as HTMLVideoElement).muted)).toBe(true);
    await expect(card.locator("[data-trunk-image='closed']")).toHaveClass(/opacity-0/);
    await page.waitForTimeout(1600);
    await shot(page, info.project.name + "-" + slug + "-2-ouverture");
    // The end: the last frame of the film, then its open image over it, without a jump.
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).ended), { timeout: 15_000 }).toBe(true);
    // (Without the button, which comes in after: only the picture is compared.)
    const hideButton = () => page.addStyleTag({ content: "[data-trunk-create],.trunk-links{visibility:hidden!important}" });
    await hideButton();
    const lastFrame = await sq.screenshot();
    await page.waitForTimeout(1300);
    const openImage = await sq.screenshot();
    await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent?.includes("data-trunk-create") && s.remove()));
    expect(await difference(lastFrame, openImage), "from the film to the open image").toBeLessThan(9);
    await expect(card.locator("[data-trunk-image='open']")).toHaveClass(/opacity-100/);
    // Its button, in its light, inside the square, readable; its message.
    const button = card.locator("[data-trunk-create]");
    await expect(button).toBeVisible();
    await expect(button).toHaveText(label);
    const box = (await button.boundingBox())!;
    const area = (await sq.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(area.x);
    expect(box.x + box.width).toBeLessThanOrEqual(area.x + area.width);
    expect(box.y + box.height / 2).toBeGreaterThan(area.y + area.height * 0.3);
    expect(box.y + box.height / 2).toBeLessThan(area.y + area.height * 0.8);
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
    const href = (await button.getAttribute("href"))!;
    expect(href).toMatch(/^https:\/\/wa\.me\/[^?]+\?text=/);
    expect(new URL(href).searchParams.get("text")).toBe(message);
    await shot(page, info.project.name + "-" + slug + "-3-ouvert");
    // Watch it again, then close it.
    await card.locator("[data-trunk-replay]").click();
    await expect(card.locator("[data-trunk-create]")).toHaveCount(0);
    await expect.poll(() => video.evaluate((v) => (v as HTMLVideoElement).currentTime), { timeout: 10_000 }).toBeGreaterThan(0.5);
    await card.locator("[data-trunk-close]").click();
    await expect(card.locator("[data-trunk-image='closed']")).toHaveClass(/opacity-100/);
    await expect(card.locator("[data-trunk-open]")).toBeVisible();
    expect(problems.errors).toEqual([]);
  });
}

test("the films load only near the screen: none before the visitor comes near the trunks", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/boxes", { waitUntil: "load" });
  await page.waitForTimeout(1200);
  // (A film loads in several requests: counted once.)
  const loaded = await page.evaluate(() => new Set(performance.getEntriesByType("resource").filter((e) => e.name.includes("/media/trunks/") && e.name.endsWith(".mp4")).map((e) => e.name)).size);
  const near = await page.locator("[data-trunk-video][src]").count();
  expect(loaded).toBeLessThanOrEqual(near);
  expect(near).toBeLessThan(7);
});

test("asked for less motion: a click shows the trunk open at once, with its button", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await skipIntro(page);
  await page.goto("/boxes", { waitUntil: "load" });
  const card = page.locator("[data-box='sirius']");
  await square(card);
  await card.locator("[data-trunk-open]").click();
  await expect(card.locator("[data-trunk-create]")).toBeVisible({ timeout: 2_000 });
  await expect(card.locator("[data-trunk-image='open']")).toHaveClass(/opacity-100/);
  expect(await card.locator("[data-trunk-video]").evaluate((v) => (v as HTMLVideoElement).currentTime)).toBe(0);
});
