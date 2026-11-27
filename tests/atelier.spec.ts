// "Enter the Atelier" (src/components/AtelierRoom.tsx). Since 24/11/2026 (Yoni) the making-of lives in The Atelier only: the
// page of a piece leads to /atelier?piece=<slug>, where its room opens at once (silent at first, with the sound, pause and
// the ways out: Escape, the back gesture), the photos of its steps waiting under it (src/components/MakingSteps.tsx); the
// page The Atelier gathers the making-of of every published piece. Screenshots go to verification/atelier/.
import { mkdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "./fixtures";
import { defaultCatalogue } from "../src/data/catalogue";
import { completeMakingOf, makingSteps } from "../src/data/making";
import media from "../src/data/media.generated.json" with { type: "json" };
import { publicCatalogue } from "../src/data/relations";
import { skipIntro, watch } from "./helpers";

type Film = { src: string; mobile: string; duration: number; audio: boolean };
const FILMS = (media as unknown as { films: Record<string, { making?: Film; reveal?: Film }> }).films;
const CAT = publicCatalogue(defaultCatalogue);
const PIECES = ["campione-d-italia-2023-2024", "vfb-stuttgart-dfb-pokal-2025", "kevin-schade-dragon-ball-pendant"];
/** The removed pieces (unpublished): never on the site. */
const DRAFTS: string[] = [];
const DIR = "verification/atelier";
mkdirSync(DIR, { recursive: true });

const shot = (page: Page, name: string, project: string) => page.screenshot({ path: DIR + "/" + project + "-" + name + ".jpg", type: "jpeg", quality: 70, timeout: 45_000 });
const time = (video: Locator) => video.evaluate((v) => (v as HTMLVideoElement).currentTime);
const state = (video: Locator) => video.evaluate((v) => ({ paused: (v as HTMLVideoElement).paused, muted: (v as HTMLVideoElement).muted }));
/** Leaves the room (Escape), again until it is gone (the page may still be settling when it opens). */
async function closeRoom(page: Page) {
  const room = page.locator("[data-atelier-room]");
  await expect(async () => {
    if (await room.count()) await page.keyboard.press("Escape");
    await expect(room).toHaveCount(0, { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
}
const stepsOf = (slug: string) => {
  const piece = CAT.pieces.find((p) => p.slug === slug)!;
  return makingSteps(piece, piece.boxSlug ? CAT.boxes.find((b) => b.slug === piece.boxSlug)?.images[0] : undefined);
};

test.beforeEach(async ({ page }) => {
  await skipIntro(page);
});

for (const slug of PIECES) {
  test("from the page of " + slug + " into its atelier: plays, sound, pause, leaves; its steps wait under it", async ({ page }, info) => {
    const problems = watch(page);
    const phone = info.project.name !== "desktop";
    await page.goto("/fr/pieces/" + slug);
    // The page ready (its entrance over: the page may come back to its top before).
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    // No making-of on the page of the piece any more (24/11/2026): a way to The Atelier, where it starts at once.
    await expect(page.locator("[data-atelier-passage], [data-atelier-preview], [data-making], [data-atelier-video]")).toHaveCount(0);
    const way = page.locator("[data-enter-atelier]");
    await way.scrollIntoViewIfNeeded();
    await expect(way.locator("[data-enter-atelier-link]")).toHaveText(/Voir la fabrication/);
    const link = way.locator("[data-enter-atelier-link]");
    await expect(link).toHaveAttribute("href", "/fr/atelier?piece=" + slug);
    await page.waitForTimeout(600);
    await shot(page, slug + "-passage", info.project.name);

    await link.click();
    await expect(page).toHaveURL(new RegExp("/fr/atelier\\?piece=" + slug + "$"));
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

    // Out: Escape on a computer, the back gesture on a phone (the room is one step of the history); The Atelier stays, the
    // steps of the piece at the top of its section of making-of.
    if (phone) {
      await expect.poll(() => page.evaluate(() => (history.state as { atelier?: string } | null)?.atelier)).toBe(slug);
      await page.goBack();
      await expect(room).toHaveCount(0);
    } else await closeRoom(page);
    expect(new URL(page.url()).pathname).toBe("/fr/atelier");
    const steps = page.locator("#atelier-making-of [data-atelier-piece='" + slug + "']");
    await expect(steps).toBeVisible();
    await expect(steps.locator("[data-making-step]")).toHaveCount(stepsOf(slug).length);
    await page.waitForTimeout(600);
    await shot(page, slug + "-steps", info.project.name);
    // The leave button too, from a second visit (the history stays clean: one step back leaves the page).
    await page.locator("[data-atelier-film='" + slug + "'] button").click();
    await expect(room).toBeVisible();
    await room.locator("[data-atelier-close]:visible").click();
    await expect(room).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/fr/atelier");
    expect(problems.errors).toEqual([]);
  });
}

test("after the making-of comes The Finished Piece, then the end", async ({ page }, info) => {
  // (24/11/2026: the reveal films of the Inter ring and of Dragon Ball were 3D renders, set to none: the VfB ring here.)
  const slug = "vfb-stuttgart-dfb-pokal-2025";
  await page.goto("/atelier?piece=" + slug);
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

test("the Inter ring: no Final Reveal (its film was a 3D render), the end right after its making-of", async ({ page }) => {
  const slug = "campione-d-italia-2023-2024";
  await page.goto("/atelier?piece=" + slug);
  const room = page.locator("[data-atelier-room]");
  const video = room.locator("[data-atelier-video]");
  await expect(room.locator("[data-chapter='reveal']")).toHaveCount(0);
  await expect.poll(() => time(video), { timeout: 30_000 }).toBeGreaterThan(0.5);
  await video.evaluate((v) => {
    const el = v as HTMLVideoElement;
    el.currentTime = el.duration - 0.4;
  });
  await expect(room.locator("[data-atelier-end]")).toBeVisible({ timeout: 15_000 });
  await expect(room.locator("[data-interlude]")).toHaveCount(0);
  await expect(room).toHaveAttribute("data-film", "making");
});

test("a piece without a film of its fabrication nor steps has no way to the atelier", async ({ page }) => {
  expect(FILMS["butterfly-chain"]?.making).toBeUndefined();
  expect(stepsOf("butterfly-chain")).toEqual([]);
  await page.goto("/pieces/butterfly-chain");
  await expect(page.locator("[data-piece='butterfly-chain']")).toBeVisible();
  await expect(page.locator("[data-enter-atelier]")).toHaveCount(0);
});

test("The Atelier: the making-of of every published piece, each opening its atelier", async ({ page }, info) => {
  const problems = watch(page);
  await page.goto("/atelier");
  const section = page.locator("[data-atelier-films]");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading", { name: "Every Piece, Its Making-of" })).toBeVisible();
  // No piece asked for: no room open, no steps.
  await expect(page.locator("[data-atelier-room]")).toHaveCount(0);
  await expect(section.locator("[data-atelier-piece]")).toHaveCount(0);
  const items = section.locator("[data-atelier-film]");
  const slugs = await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-atelier-film")));
  // Its making-of film, or (24/11/2026) only a complete making-of made of its stories.
  const expected = CAT.pieces
    .filter((p) => !DRAFTS.includes(p.slug) && (FILMS[p.slug]?.making || completeMakingOf(p.slug, p.atelier)))
    .map((p) => p.slug);
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

test("admin: the films of a piece and their image, chosen per piece", async ({ page, request }, info) => {
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
  // The films of the piece in The Atelier: its list item (its image), its room opened from it (the making-of, with the
  // finished piece or not). (The room that opens at once with ?piece=: the next test.)
  const atelier = async (reveal: boolean, poster?: string) => {
    await page.goto("/atelier");
    const item = page.locator("[data-atelier-film='" + slug + "']");
    await item.scrollIntoViewIfNeeded();
    if (poster) await expect(item.locator("img").first()).toHaveAttribute("src", poster);
    await item.locator("button").click();
    const room = page.locator("[data-atelier-room]");
    await expect(room).toBeVisible();
    await expect(room.locator("[data-chapter='making']").first()).toBeAttached();
    if (reveal) await expect(room.locator("[data-chapter='reveal']").first()).toBeAttached();
    else await expect(room.locator("[data-chapter='reveal']")).toHaveCount(0);
    await closeRoom(page);
  };
  try {
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

    // (Since 24/11/2026 the film of the finished piece is the film section of its page; its making-of is in The Atelier.)
    await page.goto("/pieces/" + slug);
    await expect(page.locator("article[data-piece]")).not.toHaveAttribute("data-entering", "", { timeout: 20_000 });
    await expect(page.locator("[data-feature-film]")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator("[data-watch-film]")).toHaveCount(0);
    await atelier(false, making[2]!);

    // Back to the automatic choice: its two films again.
    await login();
    field = await edit();
    await field.getByRole("button", { name: "Revenir au choix automatique" }).click();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("[data-atelier-field]")).toHaveCount(0);
    await page.goto("/pieces/" + slug);
    await expect(page.locator("[data-feature-film='" + slug + "']")).toHaveCount(1, { timeout: 15_000 });
    await atelier(true);
  } finally {
    // Never left with the choice of the test (a failure above): the automatic choice again.
    const { token } = (await (await request.post("/api/admin/login", { data: { password } })).json()) as { token: string };
    const auth = { Authorization: "Bearer " + token };
    const rows = ((await (await request.get("/api/admin/pieces", { headers: auth })).json()) as { items: Record<string, unknown>[] }).items;
    const row = rows.find((r) => r.slug === slug)!;
    if (row.atelier) await request.put("/api/admin/pieces/" + String(row.id), { headers: auth, data: { ...row, atelier: null } });
  }
});

test("The Atelier opened for a piece (?piece=) follows the films chosen in the admin", async ({ page, request }, info) => {
  test.skip(info.project.name !== "desktop", "the admin is checked on a computer");
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to change a piece");
  // A piece whose films no other check looks at (they run at the same time).
  const slug = "angelo-stiller-as-pendant";
  const { token } = (await (await request.post("/api/admin/login", { data: { password } })).json()) as { token: string };
  const auth = { Authorization: "Bearer " + token };
  const rows = ((await (await request.get("/api/admin/pieces", { headers: auth })).json()) as { items: Record<string, unknown>[] }).items;
  const row = rows.find((r) => r.slug === slug)!;
  try {
    // No finished piece (as Yoni may choose in the admin): its room, opened at once, has its making-of only.
    expect((await request.put("/api/admin/pieces/" + String(row.id), { headers: auth, data: { ...row, atelier: { reveal: null } } })).ok()).toBe(true);
    await page.goto("/atelier?piece=" + slug);
    const room = page.locator("[data-atelier-room]");
    await expect(room).toBeVisible();
    // (The catalogue of the server comes after the page: the room follows it.)
    await expect(room.locator("[data-chapter='reveal']")).toHaveCount(0, { timeout: 15_000 });
  } finally {
    await request.put("/api/admin/pieces/" + String(row.id), { headers: auth, data: { ...row, atelier: row.atelier ?? null } });
  }
});
