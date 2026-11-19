// "Enter the Atelier" (src/components/AtelierRoom.tsx): from three pieces, the films play only once the visitor entered,
// silent at first, with the sound, pause and the ways out (Escape, the back gesture); the page The Atelier gathers the
// making-of of every published piece. Screenshots go to verification/atelier/.
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";
import media from "../src/data/media.generated.json" with { type: "json" };
import { skipIntro, watch } from "./helpers";

type Film = { src: string; mobile: string; duration: number; audio: boolean };
const FILMS = (media as unknown as { films: Record<string, { making?: Film; reveal?: Film }> }).films;
const PIECES = ["campione-d-italia-2023-2024", "vfb-stuttgart-dfb-pokal-2025", "kevin-schade-dragon-ball-pendant"];
/** The drafts (unpublished): never on the site. */
const DRAFTS = ["chaine-cubaine-glacee-or-rose", "pendentif-croix-christ-or-rose", "pendentif-tete-animal"];
const DIR = "verification/atelier";
mkdirSync(DIR, { recursive: true });

const shot = (page: Page, name: string, project: string) => page.screenshot({ path: DIR + "/" + project + "-" + name + ".jpg", type: "jpeg", quality: 70, timeout: 45_000 });
const time = (video: Locator) => video.evaluate((v) => (v as HTMLVideoElement).currentTime);
const state = (video: Locator) => video.evaluate((v) => ({ paused: (v as HTMLVideoElement).paused, muted: (v as HTMLVideoElement).muted }));

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

for (const slug of PIECES) {
  test("enters the atelier of " + slug + ", plays, sound, pause, leaves", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    await page.goto("/fr/pieces/" + slug);
    const passage = page.locator("[data-atelier-passage]");
    await passage.scrollIntoViewIfNeeded();
    await expect(passage.getByRole("heading", { name: "Entrer dans l’atelier" })).toBeVisible();
    // Nothing plays on the page: the films exist only in the room.
    await expect(page.locator("[data-atelier-video]")).toHaveCount(0);
    await page.waitForTimeout(800);
    await shot(page, slug + "-passage", info.project.name);

    await passage.locator("[data-enter-atelier]").click();
    const room = page.locator("[data-atelier-room]");
    await expect(room).toBeVisible();
    const video = room.locator("[data-atelier-video]");
    const film = FILMS[slug]!.making!;
    await expect(video).toHaveAttribute("src", phone ? film.mobile : film.src);
    // It plays, silent.
    await expect.poll(() => time(video), { timeout: 30_000 }).toBeGreaterThan(1);
    expect(await state(video)).toEqual({ paused: false, muted: true });
    await shot(page, slug + "-room", info.project.name);

    // The sound, then the pause.
    await room.locator("[data-atelier-sound]").click();
    expect((await state(video)).muted).toBe(false);
    await room.locator("[data-atelier-play]").click();
    await expect.poll(async () => (await state(video)).paused).toBe(true);

    // Out: Escape on a computer, the back gesture on a phone; back in the world of the piece.
    if (phone) await page.goBack();
    else await page.keyboard.press("Escape");
    await expect(room).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/fr/pieces/" + slug);
    await expect(page.locator("[data-piece='" + slug + "']")).toBeVisible();
    // The leave button too, from a second visit (the history stays clean: one step back leaves the page).
    await passage.locator("[data-enter-atelier]").click();
    await expect(room).toBeVisible();
    await room.locator("[data-atelier-close]:visible").click();
    await expect(room).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/fr/pieces/" + slug);
    expect(problems.errors).toEqual([]);
  });
}

test("after the making-of comes The Final Reveal, then the end", async ({ page }, info) => {
  const slug = "campione-d-italia-2023-2024";
  await page.goto("/pieces/" + slug);
  await page.locator("[data-atelier-passage]").scrollIntoViewIfNeeded();
  await page.locator("[data-enter-atelier]").click();
  const room = page.locator("[data-atelier-room]");
  const video = room.locator("[data-atelier-video]");
  await expect.poll(() => time(video), { timeout: 30_000 }).toBeGreaterThan(0.5);
  await video.evaluate((v) => {
    const el = v as HTMLVideoElement;
    el.currentTime = el.duration - 0.6;
  });
  await expect(room.locator("[data-interlude]")).toBeVisible({ timeout: 15_000 });
  await shot(page, "interlude", info.project.name);
  await expect(room).toHaveAttribute("data-film", "reveal", { timeout: 15_000 });
  const reveal = FILMS[slug]!.reveal!;
  await expect(video).toHaveAttribute("src", info.project.name === "desktop" ? reveal.src : reveal.mobile);
  await expect.poll(() => time(video), { timeout: 30_000 }).toBeGreaterThan(0.5);
  await video.evaluate((v) => {
    const el = v as HTMLVideoElement;
    el.currentTime = el.duration - 0.4;
  });
  await expect(room.locator("[data-atelier-end]")).toBeVisible({ timeout: 15_000 });
  await shot(page, "end", info.project.name);
  // Watch again: the making-of from its start.
  await room.locator("[data-atelier-end] button").first().click();
  await expect(room).toHaveAttribute("data-film", "making");
});

test("a piece without a film of its fabrication has no passage", async ({ page }) => {
  await page.goto("/pieces/michy-batshuayi-butterfly-chain");
  await expect(page.locator("[data-piece='michy-batshuayi-butterfly-chain']")).toBeVisible();
  await expect(page.locator("[data-atelier-passage]")).toHaveCount(0);
});

test("The Atelier: the making-of of every published piece, each opening its atelier", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/atelier");
  const section = page.locator("[data-atelier-films]");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading", { name: "Every Piece, Its Making-of" })).toBeVisible();
  const items = section.locator("[data-atelier-film]");
  const slugs = await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-atelier-film")));
  const expected = Object.entries(FILMS)
    .filter(([s, f]) => f.making && !DRAFTS.includes(s))
    .map(([s]) => s);
  expect(slugs.sort()).toEqual(expected.sort());
  for (const draft of DRAFTS) expect(slugs).not.toContain(draft);
  await page.waitForTimeout(800);
  await shot(page, "atelier-section", info.project.name);

  await section.locator("[data-atelier-film='vfb-stuttgart-dfb-pokal-2025'] button").click();
  const room = page.locator("[data-atelier-room]");
  await expect(room).toBeVisible();
  await expect.poll(() => time(room.locator("[data-atelier-video]")), { timeout: 30_000 }).toBeGreaterThan(0.5);
  await shot(page, "atelier-room", info.project.name);
  const world = room.locator("[data-atelier-world]:visible");
  await expect(world).toHaveAttribute("href", "/pieces/vfb-stuttgart-dfb-pokal-2025");
  await world.click();
  await expect(page.locator("[data-piece='vfb-stuttgart-dfb-pokal-2025']")).toBeVisible();
  await expect(room).toHaveCount(0);
  // One step back: the page The Atelier again.
  await page.goBack();
  await expect(page).toHaveURL(/\/atelier$/);
  expect(problems.errors).toEqual([]);
});

test("admin: the films of a piece and their image, chosen per piece", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "the admin is checked on a computer");
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  // A piece the other checks do not open (they run at the same time).
  const slug = "marcus-thuram-ruby-t-necklace";
  const making = (FILMS[slug]!.making as Film & { posters: string[] }).posters;
  const login = async () => {
    await page.goto("/admin");
    const tab = page.getByRole("tab", { name: "Pièces" });
    // The session is kept: the second time, the admin opens directly.
    await expect(tab.or(page.getByLabel("Mot de passe"))).toBeVisible();
    if (!(await tab.isVisible())) {
      await page.getByLabel("Mot de passe").fill(password!);
      await page.getByRole("button", { name: "Se connecter" }).click();
    }
    await expect(tab).toBeVisible();
  };
  const edit = async () => {
    await page.locator("[data-admin-row='" + slug + "'] button[aria-label='Modifier']").click();
    const field = page.locator("[data-atelier-field]");
    await expect(field).toBeVisible();
    return field;
  };
  await login();
  let field = await edit();
  // Its own films by default; its six images, one chosen by default.
  await expect(field.locator("[data-atelier-poster]")).toHaveCount(making.length);
  // No finished piece, the third image.
  await field.locator("[data-atelier-choice='reveal'] select").selectOption("none");
  await field.locator("[data-atelier-poster='3']").click();
  await field.scrollIntoViewIfNeeded();
  await field.screenshot({ path: DIR + "/admin-atelier.jpg", type: "jpeg", quality: 70 });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("[data-atelier-field]")).toHaveCount(0);

  await page.goto("/pieces/" + slug);
  const passage = page.locator("[data-atelier-passage]");
  await passage.scrollIntoViewIfNeeded();
  await expect(passage.locator("ol li")).toHaveCount(1);
  await expect(passage.locator("img").first()).toHaveAttribute("src", making[2]!);

  // Back to the automatic choice: its two films again.
  await login();
  field = await edit();
  await field.getByRole("button", { name: "Revenir au choix automatique" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("[data-atelier-field]")).toHaveCount(0);
  await page.goto("/pieces/" + slug);
  await page.locator("[data-atelier-passage]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-atelier-passage] ol li")).toHaveCount(2);
});
