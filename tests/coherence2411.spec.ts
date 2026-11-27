// The pass "zéro incohérence" (24/11/2026, after the call of Yoni of 23-24/11): one artistic direction everywhere, one word for
// each thing in every language, one piece = one page, nothing repeated. The whole site is also checked page by page by
// `npm run audit:coherence` (scripts/audit-coherence.ts); these tests keep the main points on the pages that carry them.
// Silent (tests/fixtures.ts). Captures in verification/<device>/coherence-*.jpg.
import { expect, test } from "./fixtures";
import { skipIntro } from "./helpers";

const shot = (page: import("@playwright/test").Page, project: string, name: string) =>
  page.screenshot({ path: "verification/" + project + "/coherence-" + name + ".jpg", type: "jpeg", quality: 60 });

test("a piece: one small label, its name in the font of the house, the two buttons of the house, the sections in their order", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/pieces/campione-d-italia-2023-2024");
  const intro = page.locator("[data-piece-text]");
  await expect(intro.locator(".eyebrow")).toHaveCount(1);
  const title = page.locator("#piece-title");
  await expect(title).toHaveCSS("font-family", /Cormorant Garamond/);
  expect(parseFloat(await title.evaluate((el) => getComputedStyle(el).fontSize))).toBeLessThanOrEqual(56);
  await expect(page.locator("[data-want-piece]")).toHaveText(/Begin Your Creation/i);
  await expect(page.locator("[data-piece-whatsapp]")).toHaveText(/WhatsApp/);
  // No block of white: the main button is a fine outline.
  expect(await page.locator("[data-want-piece]").evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
  const order = await page.locator("[data-piece-section]").evaluateAll((els) => els.map((el) => el.getAttribute("data-piece-section")));
  expect(order[0]).toBe("opening");
  expect(order.at(-1)).toBe("end");
  // Its vision beside its film, before the champions with their rings (Yoni's order, 26/11/2026).
  expect(Math.max(order.indexOf("story"), order.indexOf("film"))).toBeGreaterThan(0);
  expect(Math.max(order.indexOf("story"), order.indexOf("film"))).toBeLessThan(order.indexOf("champions"));
  // One single end block, no stories on a piece page.
  await expect(page.locator("[data-piece-section='end']")).toHaveCount(1);
  await expect(page.locator("[data-seen-in-stories]")).toHaveCount(0);
  await expect(page.getByText("Seen in our stories")).toHaveCount(0);
  await shot(page, info.project.name, "piece-inter");
});

test("one piece = one page: the top of the Inter ring, the chains of the octagon and of Loïs Openda live on their piece", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/pieces/campione-d-italia-pendant");
  await expect(page).toHaveURL(/\/pieces\/campione-d-italia-2023-2024/);
  // Its crown worn as a pendant is told once, in its details (« 06 — Beyond the Ring », Yoni 26/11/2026): no section apart.
  await expect(page.locator("#worn-as-pendant")).toHaveCount(0);
  await expect(page.locator("[data-magazine-block][data-big] h3")).toHaveText(/Beyond the Ring/i);
  await page.goto("/pieces/two-row-tennis-chain");
  await expect(page).toHaveURL(/\/pieces\/noah-okafor-octagon-pendant/);
  await expect(page.locator("#its-chain").getByRole("heading", { name: "The Accompanying Chains" })).toBeVisible();
  await page.goto("/pieces/cross-infinity-chain");
  await expect(page).toHaveURL(/\/pieces\/lois-openda-script-pendant/);
  await expect(page.locator("#its-chain")).toBeVisible();
  // Sirius is a nameplate worn on BRT Flowers; each page leads to the other.
  await page.goto("/pieces/sirius");
  await expect(page.locator("#piece-title")).toHaveText(/Sirius Nameplate/i);
  await expect(page.locator("[data-piece-eyebrow]")).toHaveText(/Pendants/i);
  await expect(page.locator("[data-worn-with='brt-flower-chain']")).toBeVisible();
  await page.goto("/pieces/brt-flower-chain");
  await expect(page.locator("[data-worn-with='sirius']")).toBeVisible();
  await expect(page.locator("[data-made-for] h2")).toHaveText(/A Berete Signature/i);
  // The Infinity Link Yoni was looking for (folder 09).
  await page.goto("/pieces/pear-link-chain");
  await expect(page.locator("#piece-title")).toHaveText(/^Infinity Link$/i);
});

test("one word for each thing: the menu, the pages named by it, the contact in the words of the creations", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/players");
  const nav = page.locator("[data-desktop-nav]");
  if (await nav.isVisible()) {
    await expect(nav.getByRole("link", { name: "Private Enquiries" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Press" })).toBeVisible();
  }
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/The Berete Circle/i);
  await expect(page.getByText("Worn by Icons.")).toBeVisible();
  await page.goto("/press");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^Press$/i);
  await page.goto("/contact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Begin Your Creation/i);
  const choices = page.locator("#configurator fieldset button");
  await expect(choices).toHaveText([/Pendants/, /Chains/, /Rings/, /Watches/]);
  await page.goto("/fr/contact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Commencer votre création/i);
  await shot(page, info.project.name, "contact-fr");
});

test("the names: Losene Keita, the pieces without « — Pendant », in French the words agree with the piece", async ({ page }) => {
  await skipIntro(page);
  await page.goto("/pieces/panther-champion-pendant");
  await expect(page.locator("#piece-title")).toHaveText(/Losene Keita/i);
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/Lasana|Keita Losene/);
  await page.goto("/pieces/the-hand");
  await expect(page.locator("#piece-title")).toHaveText(/^The Hand$/i);
  await page.goto("/fr/pieces/kevin-schade-dragon-ball-pendant");
  await expect(page.locator("[data-made-for] h2")).toHaveText(/Créé exclusivement pour Kevin Schade/);
  const fr = await page.locator("main").innerText();
  // Yoni's text (26/11/2026) says « Genki Dama »; « Spirit Bomb » is « Genkidama » in French.
  expect(fr).toContain("Genki Dama");
  expect(fr).not.toContain("Spirit Bomb");
  expect(fr).not.toMatch(/tons? or /i);
  await page.goto("/fr/pieces/campione-d-italia-2023-2024");
  // « In the Hands of the Champions » (Yoni, 26/11/2026) in place of « Created exclusively for Inter Milan ».
  await expect(page.locator("[data-champions] h2")).toHaveText(/Entre les mains des champions/);
  await page.goto("/fr/pieces/vfb-stuttgart-dfb-pokal-2025");
  await expect(page.locator("[data-made-for] h2")).toHaveText(/Créée exclusivement pour le VfB Stuttgart|Créée exclusivement pour VfB Stuttgart/);
});

test("The Bespoke Journey: six steps everywhere, each image leads where more is seen, one version of the payment", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/process");
  await expect(page.getByText(/six steps/)).toBeVisible();
  await expect(page.getByText(/four steps/)).toHaveCount(0);
  await expect(page.locator("[data-timeline-step]")).toHaveCount(6);
  await expect(page.locator("[data-timeline-link]")).toHaveCount(5);
  const links = await page.locator("[data-timeline-link]").evaluateAll((els) => els.map((el) => el.getAttribute("data-timeline-link")));
  expect(links).toEqual(["/atelier", "/atelier", "/atelier", "/creations", "/boxes"]);
  await expect(page.getByText("The balance, before the handover.")).toBeVisible();
  await expect(page.getByText(/around ten weeks on average/)).toBeVisible();
  await page.goto("/fr/process");
  await expect(page.getByText(/six étapes/)).toBeVisible();
  await shot(page, info.project.name, "journey-fr");
});

test("the home page: one subject per section, its name, one sentence, one way in", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/");
  const stories = page.locator("[data-home-story]");
  expect(await stories.count()).toBeGreaterThanOrEqual(4);
  for (const story of await stories.all()) {
    await expect(story.locator("h1, h2")).toHaveCount(1);
    expect(await story.locator("[data-cta]").count()).toBeLessThanOrEqual(1);
  }
  await page.locator("[data-home-story='mechanism']").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-home-story='mechanism'] h2")).toHaveText(/The Mechanism/i);
  await shot(page, info.project.name, "home-mechanism");
});

test("the creations: whole names in the cards, no photo twice on a collection page", async ({ page }, info) => {
  await skipIntro(page);
  await page.goto("/creations/chains");
  const names = page.locator("[data-card-title]");
  expect(await names.count()).toBeGreaterThan(3);
  for (const n of await names.all()) {
    const clamp = await n.evaluate((el) => getComputedStyle(el).webkitLineClamp);
    expect(clamp === "none" || clamp === "").toBe(true);
  }
  const srcs = await page.locator("main img").evaluateAll((imgs) => imgs.filter((i) => i.getBoundingClientRect().width > 2).map((i) => (i.getAttribute("src") ?? "").replace(/(-\d{3,4})?(\.[0-9a-f]{10})?(\.w\d+)?\.(webp|avif|jpg)$/, "")));
  expect(new Set(srcs).size).toBe(srcs.length);
  await shot(page, info.project.name, "chains");
});
