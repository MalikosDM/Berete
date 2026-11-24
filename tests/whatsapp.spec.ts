// The WhatsApp buttons (feedback of Yoni, 21/11/2026): every button opens WhatsApp with its message already written, the
// visitor only presses Send. From a piece, the piece by its name as shown on its page; from the other pages, a message of
// that page; in the language of the site (src/lib/whatsapp.ts, src/i18n/ui/*.ts "whatsapp"). The link is the universal
// one of WhatsApp (https://wa.me/<number>?text=...), the same on an iPhone, an Android phone and a computer (WhatsApp Web),
// its text encoded in UTF-8 (accents, apostrophes, dashes, Arabic). Three pieces and three other pages, English and French,
// on a computer and an iPhone. Screenshots go to verification/whatsapp/.
import { mkdirSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "./fixtures";
import { en } from "../src/i18n/ui/en";
import { fr } from "../src/i18n/ui/fr";
import { ar } from "../src/i18n/ui/ar";
import { skipIntro, watch } from "./helpers";

/** The number of src/lib/site.ts (read as text: the module needs the build of the site). */
const WHATSAPP_NUMBER = /WHATSAPP_NUMBER = "([^"]+)"/.exec(readFileSync("src/lib/site.ts", "utf8"))![1]!;
const DIR = "verification/whatsapp";
mkdirSync(DIR, { recursive: true });

type Words = typeof en;
const LANGS: [string, string, Words][] = [
  ["en", "", en],
  ["fr", "/fr", fr],
];

const PIECES = ["michy-batshuayi-butterfly-pendant", "lois-openda-script-pendant", "campione-d-italia-2023-2024"];

/** Every WhatsApp link of the page that a visitor can see (the menu, the bar of a phone, the page, the footer). */
async function links(page: Page): Promise<string[]> {
  return page.locator("a[href^='https://wa.me/']").evaluateAll((els) =>
    els.filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden").map((e) => (e as HTMLAnchorElement).href),
  );
}

/** The link of WhatsApp: its number, its text decoded; the text written as UTF-8 percent codes, nothing left raw. */
function read(href: string): string {
  const url = new URL(href);
  expect(url.origin + url.pathname).toBe("https://wa.me/" + WHATSAPP_NUMBER);
  const raw = href.split("?text=")[1] ?? "";
  expect(raw, "encoded text").toMatch(/^[A-Za-z0-9\-_.!~*'()%]+$/);
  const text = decodeURIComponent(raw);
  expect(url.searchParams.get("text")).toBe(text);
  return text;
}

async function every(page: Page, message: string, where: string) {
  const found = await links(page);
  expect(found.length, where + ": WhatsApp buttons seen").toBeGreaterThan(0);
  for (const href of found) expect(read(href), where).toBe(message);
}

for (const [lang, prefix, t] of LANGS) {
  for (const slug of PIECES) {
    test(lang + " " + slug + ": its WhatsApp buttons name the piece as shown", async ({ page }, info) => {
      const problems = watch(page);
      await skipIntro(page);
      await page.goto(prefix + "/pieces/" + slug, { waitUntil: "load" });
      const title = page.locator("h1#piece-title");
      await expect(title).toBeVisible();
      const shown = ((await title.textContent()) ?? "").trim();
      const message = t.whatsapp.piece(shown);
      expect(message).toContain(shown);
      await every(page, message, slug);
      // The button of the piece, in view of its opening.
      const want = page.locator("[data-piece-intro] a[href^='https://wa.me/']").first();
      if (await want.count()) expect(read((await want.getAttribute("href"))!)).toBe(message);
      await page.screenshot({ path: DIR + "/" + info.project.name + "-" + lang + "-" + slug + ".jpg", type: "jpeg", quality: 62 });
      expect(problems.errors).toEqual([]);
    });
  }

  const PAGES: [string, string, (w: Words["whatsapp"]) => string][] = [
    ["/", "home", (w) => w.pages.home],
    ["/atelier", "atelier", (w) => w.pages.atelier],
    ["/players/lois-openda", "player", (w) => w.person("Loïs Openda")],
  ];
  for (const [path, name, message] of PAGES) {
    test(lang + " " + name + ": its WhatsApp buttons carry the message of the page", async ({ page }, info) => {
      const problems = watch(page);
      await skipIntro(page);
      await page.goto(prefix + (path === "/" && prefix ? "" : path), { waitUntil: "load" });
      await page.waitForTimeout(800);
      // The buttons further down (the footer, the contact block) are counted too.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(600);
      await every(page, message(t.whatsapp), name);
      await page.screenshot({ path: DIR + "/" + info.project.name + "-" + lang + "-" + name + ".jpg", type: "jpeg", quality: 62 });
      expect(problems.errors).toEqual([]);
    });
  }
}

test("the messages: every page and piece in six languages, the special letters kept whole through the link", () => {
  for (const t of [en, fr, ar]) {
    for (const message of [t.whatsapp.piece("Loïs Openda — Script Pendant"), t.whatsapp.pages.house, t.whatsapp.person("VfB Stuttgart"), t.whatsapp.hello]) {
      const href = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
      expect(read(href)).toBe(message);
    }
  }
  // The example of Yoni, word for word.
  expect(en.whatsapp.piece("Butterfly Chain")).toBe("Hello Berete, I discovered the Butterfly Chain on your website and would like to discuss a bespoke creation of my own.");
  expect(en.whatsapp.piece("The Hand")).toBe("Hello Berete, I discovered The Hand on your website and would like to discuss a bespoke creation of my own.");
});
