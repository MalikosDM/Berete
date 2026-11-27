/*
 * The AI Creation Studio (Phase 2, 27/11/2026), « Create Your Own Piece » (/create): closed (« The studio opens soon »), then
 * open: Yoni's message near the generator, an idea with a photo of inspiration, a first concept labelled « AI concept · for
 * inspiration », variations (another metal: an edit of the concept; another interpretation), a refusal of the safety system,
 * favourites, the larger view, the private link (copied, sent by e-mail), the request to Berete, the studio found again by its
 * link and from /create, the daily limit per visitor; then the admin « AI Studio »: the request with its concepts and photo,
 * the cost, « Créer le client et son projet ». Never the real OpenAI: the server runs with the local stand-in.
 *   PORT=12112 node tests/support/fake-openai.mjs
 *   PORT=3013 OPENAI_API_KEY=sk-test-fake OPENAI_API_BASE=http://localhost:12112 npx tsx server/index.ts   (studio router mounted)
 *   API_PORT=3013 npx vite --port 5396 --strictPort
 *   BASE_URL=http://localhost:5396 npx playwright test tests/studio.spec.ts --workers=1 [STUDIO_SHOTS=1: captures in
 *   ~/Downloads/_verif-private-atelier/studio/]
 * --workers=1: the switch of the studio is shared by the whole server (each project puts it back as it found it). Needs
 * ADMIN_PASSWORD (.env). Everything made here is deleted at the end (studios, client and project).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { expect, test, type APIRequestContext, type Page } from "./fixtures";

const FAKE = process.env.FAKE_OPENAI ?? "http://localhost:12112";
const SHOTS = process.env.STUDIO_SHOTS ? path.join(os.homedir(), "Downloads", "_verif-private-atelier", "studio") : "";
const RUN = "run" + Date.now().toString(36);

type Settings = { features: { aiStudio: boolean }; ai: { perVisitorDaily: number; dailyTotal: number } };
type Call = { endpoint: string; prompt: string; images: number; model: string };

let admin = "";
let before: Settings | null = null;
let skip = "";
let requestName = "";
const tokens: string[] = [];

async function adminToken(request: APIRequestContext): Promise<string> {
  const res = await request.post("/api/admin/login", { data: { password: process.env.ADMIN_PASSWORD ?? "" } });
  return ((await res.json()) as { token?: string }).token ?? "";
}

const auth = () => ({ Authorization: "Bearer " + admin });

async function settings(request: APIRequestContext, patch: Record<string, unknown>): Promise<void> {
  const res = await request.put("/api/admin/atelier/settings", { headers: auth(), data: patch });
  expect(res.ok()).toBeTruthy();
}

async function calls(request: APIRequestContext): Promise<Call[]> {
  return ((await (await request.get(FAKE + "/calls")).json()) as { calls: Call[] }).calls;
}

async function shot(page: Page, name: string, project: string, full = true): Promise<void> {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  // The intro of a first visit (the monogram that draws itself) gone first.
  await expect(page.locator("[data-preloader]")).toHaveCount(0, { timeout: 6000 });
  // A whole page from its top (a sticky header would otherwise sit in its middle).
  if (full) await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(SHOTS, project + "-" + name + ".jpg"), fullPage: full, type: "jpeg", quality: 72, scale: "css" });
}

/** On a phone: the texts of the studio at 16 px at least, its buttons 48 px high at least, nothing wider than the screen. */
async function phoneRules(page: Page): Promise<void> {
  const found = await page.evaluate(() => {
    const root = document.querySelector("[data-studio]");
    const small: string[] = [];
    const short: string[] = [];
    if (!root) return { small: ["no studio"], short, wide: false };
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest(".sr-only,[aria-hidden='true']");
    };
    for (const el of root.querySelectorAll("*")) {
      if (!visible(el)) continue;
      const own = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim().length > 1);
      if (own && parseFloat(getComputedStyle(el).fontSize) < 15.9) small.push(el.tagName + ": " + el.textContent!.trim().slice(0, 40));
      if ((el.tagName === "BUTTON" || (el.tagName === "A" && el.className.includes("btn"))) && el.getBoundingClientRect().height < 47.5) short.push(el.tagName + ": " + (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40));
    }
    return { small, short, wide: document.scrollingElement!.scrollWidth > window.innerWidth + 1 };
  });
  expect(found.small, "texts under 16 px").toEqual([]);
  expect(found.short, "buttons under 48 px").toEqual([]);
  expect(found.wide, "wider than the screen").toBe(false);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ request }) => {
  admin = await adminToken(request);
  if (!admin) {
    skip = "ADMIN_PASSWORD missing or wrong";
    return;
  }
  const res = await request.get("/api/admin/atelier/settings", { headers: auth() });
  const body = (await res.json()) as { settings: Settings; status: { openai: boolean } };
  const fake = await request.get(FAKE + "/calls").catch(() => null);
  if (!body.status.openai || !fake?.ok()) {
    skip = "the server must run with OPENAI_API_KEY and the fake OpenAI (see the header)";
    return;
  }
  before = body.settings;
  // Room for every run of the day (the machine is one visitor for all the tests); the limit itself is tested below.
  await settings(request, { features: { aiStudio: false }, ai: { perVisitorDaily: 100, dailyTotal: 5000 } });
  await request.delete(FAKE + "/calls");
});

test.afterAll(async ({ request }) => {
  if (!admin || !before) return;
  // The studios made here (by the words of this run), the client and the project made from the request.
  const overview = (await (await request.get("/api/studio/admin/overview", { headers: auth() })).json()) as {
    requests: { name: string; studio: { id: string }; client: { id: string } | null }[];
    generations: { prompt: string; studioId: string }[];
  };
  const studios = new Set<string>();
  for (const r of overview.requests.filter((x) => x.name === requestName)) {
    studios.add(r.studio.id);
    if (r.client) await request.delete("/api/admin/clients/" + r.client.id, { headers: auth() });
  }
  for (const g of overview.generations.filter((x) => x.prompt.includes(RUN))) studios.add(g.studioId);
  for (const id of studios) await request.delete("/api/studio/admin/studios/" + id, { headers: auth() });
  await settings(request, { features: { aiStudio: before.features.aiStudio }, ai: before.ai });
});

test("closed: the studio opens soon, and the way to the professional design service", async ({ page, request }, info) => {
  test.skip(Boolean(skip), skip);
  await settings(request, { features: { aiStudio: false } });
  await page.goto("/create");
  await expect(page.locator("[data-studio='closed']")).toBeVisible();
  await expect(page.getByRole("heading", { name: "The studio opens soon" })).toBeVisible();
  await expect(page.locator("[data-studio-closed-link]")).toHaveAttribute("href", "/contact");
  await expect(page.locator("[data-studio-generator]")).toHaveCount(0);
  await shot(page, "closed", info.project.name);
  // The contact page keeps its own step (no invitation to a closed studio).
  await page.goto("/contact");
  await expect(page.locator("[data-studio-teaser]")).toHaveCount(0);
  if (info.project.name === "iphone") {
    await page.goto("/create");
    await expect(page.locator("[data-studio='closed']")).toBeVisible();
    await phoneRules(page);
  }
});

test("open: a visitor imagines, explores, keeps and sends his concepts to Berete", async ({ page, request }, info) => {
  test.skip(Boolean(skip), skip);
  await settings(request, { features: { aiStudio: true } });
  // The contact page now invites to the studio.
  await page.goto("/contact");
  await expect(page.locator("[data-studio-teaser] a[href='/create']")).toBeVisible();

  await page.goto("/create");
  await expect(page.locator("[data-studio='open']")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Create Your Own Piece" })).toBeVisible();
  await expect(page.locator("[data-studio-notice]")).toHaveText(
    "This AI is for inspiration and for developing your ideas. It does not replace Berete's professional design, and it does not guarantee that a concept can be made.",
  );
  await expect(page.locator("[data-studio-pro-link]")).toHaveAttribute("href", "/contact");
  await expect(page.locator("[data-studio-empty]")).toBeVisible();
  await shot(page, "start", info.project.name);
  if (info.project.name === "iphone") await phoneRules(page);

  // A photo of inspiration (a small JPEG made by the stand-in): the studio is made, the address becomes its private link.
  const sample = (await (await request.post(FAKE + "/v1/images/generations", { headers: { Authorization: "Bearer sk-test" }, data: { prompt: "sample" } })).json()) as { data: { b64_json: string }[] };
  await page.locator("[data-studio-file]").setInputFiles({ name: "my-sketch.jpg", mimeType: "image/jpeg", buffer: Buffer.from(sample.data[0]!.b64_json, "base64") });
  await expect(page.locator("[data-studio-refs] img")).toHaveCount(1);
  await expect(page).toHaveURL(/\/create\/[A-Za-z0-9_-]{40,}$/);
  const token = page.url().split("/create/")[1]!;
  tokens.push(token);

  // The idea, a ring in rose gold, with the photo: an edit with one image, the house's rules in the words.
  await request.delete(FAKE + "/calls");
  await page.getByLabel("Describe your idea").fill("A signet ring with a lion's head " + RUN);
  await page.locator("[data-chip='ring']").click();
  await page.locator("[data-chip='rose']").click();
  await expect(page.locator("[data-chip='rose']")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-studio-use-photos]")).toBeChecked();
  await page.locator("[data-studio-generate]").click();
  await expect(page.locator("[data-studio-pending]")).toBeVisible();
  await shot(page, "generating", info.project.name, false);
  await expect(page.locator("[data-concept]")).toHaveCount(1, { timeout: 30_000 });
  let made = await calls(request);
  expect(made.at(-1)?.endpoint).toBe("edits");
  expect(made.at(-1)?.images).toBe(1);
  expect(made.at(-1)?.model).toBe("gpt-image-1");
  expect(made.at(-1)?.prompt).toContain("rose gold");
  expect(made.at(-1)?.prompt).toContain("no logo or monogram of any brand or house");
  const first = page.locator("[data-concept]").first();
  await expect(first.locator("[data-ai-label]")).toHaveText("AI concept · for inspiration");
  await expect(first.locator("img")).toHaveAttribute("alt", /not a Berete piece/);
  await expect(first).toContainText("Ring · Rose gold · From your photos");
  await expect(page.locator("[data-studio-remaining]")).toContainText("concepts left today");

  // A favourite.
  await first.locator("[data-keep]").click();
  await expect(first.locator("[data-keep]")).toHaveAttribute("aria-pressed", "true");
  await shot(page, "concept", info.project.name);

  // Another metal: an edit of the concept itself; another interpretation: new words. (The newest concept comes first.)
  const original = page.locator("[data-concept]", { hasText: "Rose gold" });
  await original.locator("[data-explore]").click();
  await original.locator("[data-variant='yellow']").click();
  await expect(page.locator("[data-concept]")).toHaveCount(2, { timeout: 30_000 });
  made = await calls(request);
  expect(made.at(-1)?.endpoint).toBe("edits");
  expect(made.at(-1)?.prompt).toContain("yellow gold");
  const yellow = page.locator("[data-concept]").first();
  await expect(yellow).toContainText("Ring · Yellow gold · From your photos");
  await yellow.locator("[data-explore]").click();
  await yellow.locator("[data-variant='another']").click();
  await expect(page.locator("[data-concept]")).toHaveCount(3, { timeout: 30_000 });
  made = await calls(request);
  expect(made.at(-1)?.endpoint).toBe("generations");
  expect(made.at(-1)?.prompt).toContain("clearly different interpretation");
  await expect(page.locator("[data-concept]").first()).toContainText("Ring · Yellow gold · Another interpretation");
  await page.locator("[data-concept]").nth(1).scrollIntoViewIfNeeded();
  await shot(page, "variations", info.project.name);

  // Favourites only.
  await page.locator("[data-filter='kept']").click();
  await expect(page.locator("[data-concept]")).toHaveCount(1);
  await page.locator("[data-filter='all']").click();
  await expect(page.locator("[data-concept]")).toHaveCount(3);

  // A refusal of the safety system, said politely; nothing counted.
  await page.getByLabel("Describe your idea").fill("REFUSE-ME " + RUN);
  await page.locator("[data-studio-generate]").click();
  await expect(page.locator("[data-studio-error='refused']")).toHaveText("This idea cannot be imagined here. Rephrase it, or describe it to the house.");
  await expect(page.locator("[data-concept]")).toHaveCount(3);
  await page.getByLabel("Describe your idea").fill("");
  await page.locator("[data-studio-generate]").click();
  await expect(page.locator("[data-studio-error='empty']")).toBeVisible();

  // The larger view, labelled too.
  await page.locator("[data-concept]").first().locator("img").click();
  const viewer = page.locator("[data-studio-viewer]");
  await expect(viewer).toBeVisible();
  await expect(viewer.locator("[data-ai-label]")).toBeVisible();
  await shot(page, "viewer", info.project.name, false);
  await page.keyboard.press("Escape");
  await expect(viewer).toHaveCount(0);

  // The private link, and by e-mail.
  await expect(page.locator("[data-studio-link]")).toHaveValue(new RegExp("/create/" + token + "$"));
  await page.locator("[data-studio-email] input").fill("studio.visitor@example.com");
  await page.locator("[data-studio-email] button[type='submit']").click();
  await expect(page.locator("[data-studio-email-sent]")).toBeVisible();

  // The request to Berete: the favourite and the photo already chosen.
  requestName = "Studio Test " + RUN + " " + info.project.name;
  const send = page.locator("[data-studio-send]");
  await send.scrollIntoViewIfNeeded();
  await expect(send.locator("[data-pick-concept] input:checked")).toHaveCount(1);
  await expect(send.locator("[data-pick-reference] input:checked")).toHaveCount(1);
  await send.locator("[data-pick-concept]").nth(1).click();
  await expect(send.locator("[data-pick-concept] input:checked")).toHaveCount(2);
  await send.locator("[data-studio-send-button]").click();
  await expect(send.locator("[data-studio-error='name']")).toBeVisible();
  await send.locator("[data-studio-name]").fill(requestName);
  await expect(send.locator("[data-studio-request-email]")).toHaveValue("studio.visitor@example.com");
  await send.locator("[data-studio-message]").fill("For my father's sixtieth birthday, in March.");
  await shot(page, "send-form", info.project.name);
  await send.locator("[data-studio-send-button]").click();
  await expect(send.locator("[data-studio-sent]")).toContainText("Your request has reached Berete");
  await expect(send.locator("[data-studio-requests] li")).toHaveCount(1);
  await expect(page.locator("[data-concept] >> text=Sent to Berete")).toHaveCount(2);
  await shot(page, "sent", info.project.name);
  if (info.project.name === "iphone") await phoneRules(page);

  // The studio found again by its private link, and from /create in the same browser.
  await page.reload();
  await expect(page.locator("[data-concept]")).toHaveCount(3);
  await expect(page.locator("[data-studio-refs] img")).toHaveCount(1);
  await page.goto("/create");
  await expect(page).toHaveURL(new RegExp("/create/" + token + "$"));
  await expect(page.locator("[data-concept]")).toHaveCount(3);

  // In French: the same studio, Yoni's message in French.
  await page.goto("/fr/create/" + token);
  await expect(page.getByRole("heading", { level: 1, name: "Créez votre propre pièce" })).toBeVisible();
  await expect(page.locator("[data-studio-notice]")).toContainText("Elle ne remplace pas le design professionnel de Berete");
  await expect(page.locator("[data-concept]").first().locator("[data-ai-label]")).toHaveText("Concept IA · pour l'inspiration");
  await shot(page, "fr", info.project.name, false);

  // A link that leads nowhere.
  await page.goto("/create/" + "x".repeat(43));
  await expect(page.locator("[data-studio='missing']")).toBeVisible();
  await shot(page, "missing", info.project.name, false);
});

test("the daily limit per visitor", async ({ page, request }) => {
  test.skip(Boolean(skip), skip);
  await settings(request, { features: { aiStudio: true } });
  const st = (await (await request.get("/api/studio/status")).json()) as { max: number; remaining: number };
  const used = st.max - st.remaining;
  await settings(request, { ai: { perVisitorDaily: used + 1, dailyTotal: 5000 } });
  try {
    await page.goto("/create");
    await expect(page.locator("[data-studio-remaining]")).toHaveText("1 of " + (used + 1) + " concepts left today");
    await page.getByLabel("Describe your idea").fill("A thin bracelet of stars " + RUN);
    await page.locator("[data-studio-generate]").click();
    await expect(page.locator("[data-concept]").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("[data-studio-remaining]")).toHaveText("0 of " + (used + 1) + " concepts left today");
    await expect(page.locator("[data-studio-generate]")).toBeDisabled();
    // The server refuses too (a page that did not count).
    const token = page.url().split("/create/")[1]!;
    tokens.push(token);
    const res = await request.post("/api/studio/" + token + "/generate", { data: { idea: "one more " + RUN } });
    expect(res.status()).toBe(429);
    expect(((await res.json()) as { error: string }).error).toBe("limit");
  } finally {
    await settings(request, { ai: { perVisitorDaily: 100, dailyTotal: 5000 } });
  }
});

test("admin « AI Studio »: the request, its concepts, the cost, and one click for the client and his project", async ({ page, request }, info) => {
  test.skip(Boolean(skip), skip);
  expect(requestName).not.toBe("");
  await page.addInitScript((tk) => {
    sessionStorage.setItem("bj-admin-token", tk);
    sessionStorage.setItem("bj-admin-tab", "studio");
  }, admin);
  await page.goto("/admin");
  const root = page.locator("[data-admin-studio]");
  await expect(root).toBeVisible();
  await expect(root.locator("[data-studio-state='open']")).toBeVisible();
  await expect(root.locator("[data-studio-usage]")).toContainText("Aujourd'hui");
  const card = root.locator("[data-studio-request]", { hasText: requestName });
  await expect(card).toHaveCount(1);
  await expect(card.locator("img")).toHaveCount(3); // 2 concepts, 1 photo
  await expect(card).toContainText("For my father's sixtieth birthday");
  // Every image of the card is really served (signed address).
  for (const src of await card.locator("img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).src))) expect((await request.get(src)).status()).toBe(200);
  await expect(card.locator("[data-studio-title]")).toHaveValue(/^A signet ring with a lion's head/);
  await shot(page, "admin", info.project.name);
  await card.locator("[data-studio-make-client]").click();
  await expect(card.locator("[data-studio-linked]")).toContainText(requestName);
  await expect(card.locator("[data-status='project']")).toBeVisible();
  await shot(page, "admin-linked", info.project.name);
  // The client exists, with his project.
  const clients = (await (await request.get("/api/admin/clients", { headers: auth() })).json()) as { items: { id: string; name: string; email: string }[] };
  const client = clients.items.find((c) => c.name === requestName);
  expect(client?.email).toBe("studio.visitor@example.com");
  const projects = (await (await request.get("/api/admin/atelier/projects?clientId=" + client!.id, { headers: auth() })).json()) as { items: { title: string }[] };
  expect(projects.items[0]?.title).toMatch(/^A signet ring with a lion's head/);
});
