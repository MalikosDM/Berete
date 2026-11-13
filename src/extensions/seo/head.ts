// SEO head.
// It turns the SEO settings of the site (seo.json) and the address of a page
// into the tags of its head: title, description, canonical, robots, Open Graph,
// Twitter card, hreflang and JSON-LD structured data. The same code runs in the
// browser (SeoHead), at build time (the prerender) and when the site is
// published, so the three always write the same head.

export interface SeoFaq {
  question: string;
  answer: string;
}

export interface SeoPage {
  title?: string;
  description?: string;
  /** An absolute address, or a path of this site. Empty: the page itself. */
  canonical?: string;
  /** "index,follow" by default. */
  robots?: string;
  image?: string;
  type?: "website" | "article";
  faq?: SeoFaq[];
  /** false: left out of sitemap.xml, even when the page is indexable. */
  sitemap?: boolean;
}

export interface SeoOrganization {
  /** "Organization", "LocalBusiness", "Store", "Restaurant"... */
  type?: string;
  name?: string;
  logo?: string;
  email?: string;
  telephone?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  priceRange?: string;
  sameAs?: string[];
}

export interface SeoAlternate {
  lang: string;
  /** The path prefix of this language: "" for the default one, "/en"... */
  prefix: string;
  /** The title and description of each page in this language, by its path without the prefix. */
  pages?: Record<string, { title?: string; description?: string }>;
}

export interface SeoSettings {
  siteName: string;
  /** The public address of the site, without a trailing slash. */
  siteUrl?: string;
  language: string;
  /** "%s - Site name": %s is the page title. */
  titleTemplate?: string;
  description?: string;
  image?: string;
  /** Size of `image` in pixels, written for the link previews (og:image:width / height). */
  imageWidth?: number;
  imageHeight?: number;
  /** Open Graph locale of each language ("en" -> "en_GB"); without it, "fr" becomes "fr_FR". */
  ogLocales?: Record<string, string>;
  twitter?: string;
  organization?: SeoOrganization;
  alternates?: SeoAlternate[];
  /** AI crawlers by user agent ("GPTBot"...): "deny" closes the whole site to it in robots.txt. */
  aiCrawlers?: Record<string, "allow" | "deny">;
  /** false: no llms.txt is published. */
  llms?: boolean;
  pages: Record<string, SeoPage>;
}

export interface SeoProduct {
  id: string;
  name: string;
  description?: string;
  image?: string;
  priceCents: number;
  currency: string;
  available: boolean;
  rating?: { value: number; count: number };
}

export interface SeoArticle {
  title: string;
  description?: string;
  image?: string;
  published: string;
  modified?: string;
  author?: string;
  /** The category of the article (articleSection). */
  section?: string;
  /** Its tags (keywords): what an answer engine reads as the topics. */
  keywords?: string[];
}

export interface SeoReviews {
  value: number;
  count: number;
  items: { author: string; rating: number; body: string; date: string }[];
}

export interface SeoExtras {
  product?: SeoProduct;
  article?: SeoArticle;
  reviews?: SeoReviews;
  /** The name of the page when the settings have none (a product, an article). */
  title?: string;
  description?: string;
  /** The image of the link previews of this page (its own photo), and its size in pixels. */
  image?: string;
  imageWidth?: number;
  imageHeight?: number;
}

export interface HeadTag {
  tag: "title" | "meta" | "link" | "script";
  attrs: Record<string, string>;
  text?: string;
}

/** "/about/" and "/about?x=1" are "/about"; "" is "/". */
export function normalizePath(path: string): string {
  const bare = path.split("#")[0]!.split("?")[0]!;
  const withSlash = bare.startsWith("/") ? bare : "/" + bare;
  const trimmed = withSlash.length > 1 ? withSlash.replace(/\/+$/, "") : withSlash;
  return trimmed === "" ? "/" : trimmed;
}

function matches(pattern: string, path: string): boolean {
  const a = normalizePath(pattern).split("/");
  const b = path.split("/");
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.startsWith(":")) {
      if (b[i] === "") return false;
      continue;
    }
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function ownPageFor(settings: SeoSettings, p: string): { key: string; page: SeoPage } | null {
  const pages = settings.pages || {};
  if (pages[p] !== undefined) return { key: p, page: pages[p]! };
  for (const key of Object.keys(pages)) {
    if (key.includes(":") && matches(key, p)) return { key: key, page: pages[key]! };
  }
  return null;
}

/**
 * The settings of a page: the exact path first, then a pattern ("/product/:id").
 * A page in another language ("/en/about") is the page without its prefix,
 * with the title and description of that language when they are written.
 */
export function pageFor(settings: SeoSettings, path: string): { key: string; page: SeoPage } | null {
  const p = normalizePath(path);
  const own = ownPageFor(settings, p);
  if (own !== null) return own;
  const { neutral, prefix } = splitLanguage(settings, p);
  if (prefix === "") return null;
  const found = ownPageFor(settings, neutral);
  if (found === null) return null;
  const alternate = alternateOf(settings, prefix);
  const local = alternate && alternate.pages ? alternate.pages[found.key] : undefined;
  if (!local) return found;
  const page: SeoPage = Object.assign({}, found.page);
  if (local.title) page.title = local.title;
  if (local.description) page.description = local.description;
  return { key: found.key, page: page };
}

function alternateOf(settings: SeoSettings, prefix: string): SeoAlternate | null {
  for (const a of settings.alternates || []) {
    if (normalizePath(a.prefix || "/") === prefix) return a;
  }
  return null;
}

/** The language of a page: that of its prefix, else the language of the site. */
export function languageFor(settings: SeoSettings, path: string): string {
  const { prefix } = splitLanguage(settings, normalizePath(path));
  const alternate = prefix === "" ? null : alternateOf(settings, prefix);
  return alternate ? alternate.lang : settings.language;
}

function originOf(settings: SeoSettings, origin?: string): string {
  const base = (settings.siteUrl || origin || "").trim().replace(/\/+$/, "");
  return /^https?:\/\//.test(base) ? base : "";
}

/** An address of the site, absolute when the origin is known. */
export function absoluteUrl(base: string, pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (base === "") return "";
  return base + (pathOrUrl.startsWith("/") ? pathOrUrl : "/" + pathOrUrl);
}

/** The title written in the tab and in search results. */
export function titleFor(settings: SeoSettings, path: string, extras?: SeoExtras): string {
  const found = pageFor(settings, path);
  const own = (found && found.page.title ? found.page.title : "") || (extras && extras.title ? extras.title : "");
  if (own === "") return settings.siteName;
  const template = settings.titleTemplate || "";
  if (template.includes("%s") && !own.toLowerCase().includes(settings.siteName.toLowerCase())) {
    return template.replace("%s", () => own);
  }
  return own;
}

export function descriptionFor(settings: SeoSettings, path: string, extras?: SeoExtras): string {
  const found = pageFor(settings, path);
  return (found && found.page.description ? found.page.description : "")
    || (extras && extras.description ? extras.description : "")
    || settings.description || "";
}

export function robotsFor(settings: SeoSettings, path: string): string {
  // Private links to a 3D model and the client space: never indexed.
  if (/^(\/[a-z]{2})?\/(view|vip)(\/|$)/.test(path)) return "noindex,nofollow";
  const found = pageFor(settings, path);
  return (found && found.page.robots ? found.page.robots : "") || "index,follow";
}

export function isIndexable(settings: SeoSettings, path: string): boolean {
  return !/noindex/i.test(robotsFor(settings, path));
}

function locale(language: string, settings?: SeoSettings): string {
  const own = settings?.ogLocales?.[language];
  if (own) return own;
  const parts = language.split("-");
  const lang = parts[0]!.toLowerCase();
  const region = (parts[1] || lang).toUpperCase();
  return lang + "_" + region;
}

/** The path of a page without its language prefix, and that prefix. */
function splitLanguage(settings: SeoSettings, path: string): { neutral: string; prefix: string } {
  const alternates = settings.alternates || [];
  let best = "";
  for (const a of alternates) {
    const prefix = normalizePath(a.prefix || "/");
    if (prefix === "/") continue;
    if ((path === prefix || path.startsWith(prefix + "/")) && prefix.length > best.length) best = prefix;
  }
  if (best === "") return { neutral: path, prefix: "" };
  const rest = path.slice(best.length);
  return { neutral: rest === "" ? "/" : rest, prefix: best };
}

function titleOfPath(settings: SeoSettings, path: string): string {
  const found = pageFor(settings, path);
  if (found && found.page.title) return found.page.title;
  const last = path.split("/").pop() || "";
  const words = decodeURIComponent(last).replace(/[-_]+/g, " ").trim();
  return words === "" ? settings.siteName : words.charAt(0).toUpperCase() + words.slice(1);
}

function organizationNode(settings: SeoSettings, base: string): Record<string, unknown> {
  const o = settings.organization || {};
  const node: Record<string, unknown> = {
    "@type": o.type || "Organization",
    "@id": base === "" ? "#organization" : base + "/#organization",
    name: o.name || settings.siteName,
  };
  if (base !== "") node.url = base + "/";
  if (o.logo) node.logo = absoluteUrl(base, o.logo) || o.logo;
  if (o.email) node.email = o.email;
  if (o.telephone) node.telephone = o.telephone;
  if (o.street || o.city || o.postalCode || o.country) {
    const address: Record<string, string> = { "@type": "PostalAddress" };
    if (o.street) address.streetAddress = o.street;
    if (o.city) address.addressLocality = o.city;
    if (o.postalCode) address.postalCode = o.postalCode;
    if (o.country) address.addressCountry = o.country;
    node.address = address;
  }
  if (o.priceRange) node.priceRange = o.priceRange;
  if (o.sameAs && o.sameAs.length > 0) node.sameAs = o.sameAs;
  return node;
}

/** The JSON-LD graph of a page. */
export function structuredData(settings: SeoSettings, path: string, extras?: SeoExtras, origin?: string): Record<string, unknown>[] {
  const p = normalizePath(path);
  const base = originOf(settings, origin);
  const url = absoluteUrl(base, p);
  const graph: Record<string, unknown>[] = [];
  const found = pageFor(settings, p);
  const page = found ? found.page : {};
  const { neutral, prefix } = splitLanguage(settings, p);

  if (neutral === "/") {
    graph.push(organizationNode(settings, base));
    const site: Record<string, unknown> = { "@type": "WebSite", name: settings.siteName, inLanguage: languageFor(settings, p) };
    if (base !== "") site.url = base + (prefix === "" ? "/" : prefix);
    graph.push(site);
  } else {
    const segments = neutral.split("/").filter((s) => s !== "");
    const items: Record<string, unknown>[] = [];
    const home = prefix === "" ? "/" : prefix;
    // The first crumb is the site itself: its name, not the full title of the home page.
    items.push({ "@type": "ListItem", position: 1, name: settings.siteName, item: absoluteUrl(base, home) || undefined });
    let walked = prefix;
    segments.forEach((segment, i) => {
      walked = walked + "/" + segment;
      const last = i === segments.length - 1;
      const name = last
        ? (extras && extras.product ? extras.product.name : extras && extras.article ? extras.article.title : titleOfPath(settings, walked))
        : titleOfPath(settings, walked);
      const item: Record<string, unknown> = { "@type": "ListItem", position: i + 2, name: name };
      const link = absoluteUrl(base, walked);
      if (link !== "") item.item = link;
      items.push(item);
    });
    graph.push({ "@type": "BreadcrumbList", itemListElement: items });
  }

  if (page.faq && page.faq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: page.faq.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
    });
  }

  if (extras && extras.article) {
    const a = extras.article;
    const article: Record<string, unknown> = {
      "@type": "BlogPosting",
      headline: a.title,
      datePublished: a.published,
      dateModified: a.modified || a.published,
      inLanguage: settings.language,
      publisher: { "@id": base === "" ? "#organization" : base + "/#organization" },
    };
    if (a.description) article.description = a.description;
    if (a.image) article.image = absoluteUrl(base, a.image) || a.image;
    if (a.author) article.author = { "@type": "Person", name: a.author };
    if (a.section) article.articleSection = a.section;
    if (a.keywords && a.keywords.length > 0) article.keywords = a.keywords.join(", ");
    if (url !== "") article.mainEntityOfPage = url;
    graph.push(article);
  } else if (page.type === "article") {
    const article: Record<string, unknown> = { "@type": "Article", headline: page.title || settings.siteName, inLanguage: languageFor(settings, p) };
    if (page.description) article.description = page.description;
    if (url !== "") article.mainEntityOfPage = url;
    graph.push(article);
  }

  if (extras && extras.product) {
    const pr = extras.product;
    const offer: Record<string, unknown> = {
      "@type": "Offer",
      price: (pr.priceCents / 100).toFixed(2),
      priceCurrency: pr.currency,
      availability: pr.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    };
    if (url !== "") offer.url = url;
    const product: Record<string, unknown> = { "@type": "Product", name: pr.name, sku: pr.id, offers: offer };
    if (pr.description) product.description = pr.description;
    if (pr.image) product.image = absoluteUrl(base, pr.image) || pr.image;
    if (pr.rating && pr.rating.count > 0) {
      product.aggregateRating = { "@type": "AggregateRating", ratingValue: pr.rating.value, reviewCount: pr.rating.count };
    }
    graph.push(product);
  }

  if (extras && extras.reviews && extras.reviews.count > 0) {
    const r = extras.reviews;
    graph.push({
      "@type": (settings.organization && settings.organization.type) || "Organization",
      "@id": base === "" ? "#organization" : base + "/#organization",
      name: (settings.organization && settings.organization.name) || settings.siteName,
      aggregateRating: { "@type": "AggregateRating", ratingValue: r.value, reviewCount: r.count, bestRating: 5, worstRating: 1 },
      review: r.items.slice(0, 10).map((item) => ({
        "@type": "Review",
        author: { "@type": "Person", name: item.author },
        datePublished: item.date,
        reviewBody: item.body,
        reviewRating: { "@type": "Rating", ratingValue: item.rating, bestRating: 5, worstRating: 1 },
      })),
    });
  }
  return graph;
}

/** Every tag of the head of a page. Each carries data-seo, so it can be replaced. */
export function headFor(settings: SeoSettings, path: string, extras?: SeoExtras, origin?: string): HeadTag[] {
  const p = normalizePath(path);
  const base = originOf(settings, origin);
  const found = pageFor(settings, p);
  const page = found ? found.page : {};
  const title = titleFor(settings, p, extras);
  const description = descriptionFor(settings, p, extras);
  const robots = robotsFor(settings, p);
  // An article or a product exists in its own language only: its address in
  // another language declares the original one as canonical, with no hreflang.
  const single = !!(extras && (extras.article || extras.product));
  const own = single ? splitLanguage(settings, p).neutral : p;
  const canonical = page.canonical ? absoluteUrl(base, page.canonical) || page.canonical : absoluteUrl(base, own);
  const ownImage = (extras && extras.product && extras.product.image) || (extras && extras.article && extras.article.image) || (extras && extras.image) || page.image || "";
  const imagePath = ownImage || settings.image || "";
  const image = imagePath === "" ? "" : absoluteUrl(base, imagePath) || "";
  // The size is known for the image of the page (extras) and for the image of the site.
  const imageSize = extras && extras.image && ownImage === extras.image ? [extras.imageWidth, extras.imageHeight] : ownImage === "" ? [settings.imageWidth, settings.imageHeight] : [undefined, undefined];
  const type = extras && extras.product ? "product" : extras && extras.article ? "article" : page.type || "website";
  const tags: HeadTag[] = [];
  const meta = (attrs: Record<string, string>) => tags.push({ tag: "meta", attrs: Object.assign({ "data-seo": "" }, attrs) });
  const link = (attrs: Record<string, string>) => tags.push({ tag: "link", attrs: Object.assign({ "data-seo": "" }, attrs) });

  tags.push({ tag: "title", attrs: { "data-seo": "" }, text: title });
  if (description !== "") meta({ name: "description", content: description });
  meta({ name: "robots", content: robots });
  if (canonical !== "") link({ rel: "canonical", href: canonical });

  meta({ property: "og:type", content: type });
  meta({ property: "og:title", content: title });
  if (description !== "") meta({ property: "og:description", content: description });
  if (canonical !== "") meta({ property: "og:url", content: canonical });
  meta({ property: "og:site_name", content: settings.siteName });
  const language = languageFor(settings, p);
  meta({ property: "og:locale", content: locale(language, settings) });
  if (!single) {
    for (const a of settings.alternates || []) if (a.lang !== language) meta({ property: "og:locale:alternate", content: locale(a.lang, settings) });
  }
  if (image !== "") {
    meta({ property: "og:image", content: image });
    if (/\.jpe?g$/i.test(imagePath)) meta({ property: "og:image:type", content: "image/jpeg" });
    if (imageSize[0] && imageSize[1]) {
      meta({ property: "og:image:width", content: String(imageSize[0]) });
      meta({ property: "og:image:height", content: String(imageSize[1]) });
    }
    meta({ property: "og:image:alt", content: title });
  }
  meta({ name: "twitter:card", content: image !== "" ? "summary_large_image" : "summary" });
  meta({ name: "twitter:title", content: title });
  if (description !== "") meta({ name: "twitter:description", content: description });
  if (image !== "") {
    meta({ name: "twitter:image", content: image });
    meta({ name: "twitter:image:alt", content: title });
  }
  if (settings.twitter) meta({ name: "twitter:site", content: settings.twitter.startsWith("@") ? settings.twitter : "@" + settings.twitter });

  const alternates = settings.alternates || [];
  if (alternates.length > 1 && base !== "" && !single) {
    const { neutral } = splitLanguage(settings, p);
    for (const a of alternates) {
      const prefix = normalizePath(a.prefix || "/");
      const href = absoluteUrl(base, (prefix === "/" ? "" : prefix) + (neutral === "/" && prefix !== "/" ? "" : neutral));
      link({ rel: "alternate", hreflang: a.lang, href: href });
    }
    const fallback = alternates.find((a) => normalizePath(a.prefix || "/") === "/");
    if (fallback) link({ rel: "alternate", hreflang: "x-default", href: absoluteUrl(base, neutral) });
  }

  const graph = structuredData(settings, p, extras, origin);
  if (graph.length > 0) {
    tags.push({
      tag: "script",
      attrs: { "data-seo": "", type: "application/ld+json" },
      text: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
    });
  }
  return tags;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The tags as HTML, one per line. JSON-LD cannot close its script. */
export function renderHead(tags: HeadTag[]): string {
  return tags.map((t) => {
    const attrs = Object.keys(t.attrs).map((k) => (t.attrs[k] === "" ? " " + k : " " + k + "=\"" + escapeAttribute(t.attrs[k]!) + "\"")).join("");
    if (t.tag === "title") return "<title" + attrs + ">" + escapeText(t.text || "") + "</title>";
    if (t.tag === "script") return "<script" + attrs + ">" + (t.text || "").replace(/</g, "\\u003c") + "</script>";
    return "<" + t.tag + attrs + " />";
  }).join("\n    ");
}

const MANAGED = [
  /<title\b[^>]*>[\s\S]*?<\/title>\s*/gi,
  /<meta\b[^>]*\bname=["'](description|robots|twitter:[a-z:]+)["'][^>]*>\s*/gi,
  /<meta\b[^>]*\bproperty=["']og:[a-z:_]+["'][^>]*>\s*/gi,
  /<link\b[^>]*\brel=["'](canonical|alternate)["'][^>]*\bhreflang=["'][^"']*["'][^>]*>\s*/gi,
  /<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi,
  /<script\b[^>]*\bdata-seo\b[^>]*>[\s\S]*?<\/script>\s*/gi,
];

/** An HTML document whose head carries these tags in place of its own. */
export function injectHead(html: string, tags: HeadTag[]): string {
  let out = html;
  for (const pattern of MANAGED) out = out.replace(pattern, "");
  const rendered = renderHead(tags);
  // A replacer function: a "$&" or "$'" in a title or description stays as written.
  return out.includes("</head>") ? out.replace("</head>", () => "  " + rendered + "\n  </head>") : rendered + "\n" + out;
}

/** In the browser: the head of the page shown, after each navigation. */
export function applyHead(tags: HeadTag[], doc: Document): void {
  const head = doc.head;
  const stale = head.querySelectorAll(
    "[data-seo], meta[name='description'], meta[name='robots'], link[rel='canonical'], meta[property^='og:'], meta[name^='twitter:']",
  );
  stale.forEach((node) => node.parentNode && node.parentNode.removeChild(node));
  for (const t of tags) {
    if (t.tag === "title") {
      doc.title = t.text || "";
      continue;
    }
    const node = doc.createElement(t.tag);
    for (const k of Object.keys(t.attrs)) node.setAttribute(k, t.attrs[k]!);
    if (t.text !== undefined) node.textContent = t.text;
    head.appendChild(node);
  }
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** sitemap.xml: every indexable page, with its language versions. */
export function sitemapXml(settings: SeoSettings, paths: string[], origin?: string): string {
  const base = originOf(settings, origin);
  const unique: string[] = [];
  for (const path of paths) {
    const p = normalizePath(path);
    if (p.includes(":") || p.includes("*") || unique.includes(p) || !isIndexable(settings, p)) continue;
    const found = pageFor(settings, p);
    if (found && found.page.sitemap === false) continue;
    unique.push(p);
  }
  const lines = ["<?xml version=\"1.0\" encoding=\"UTF-8\"?>", "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"];
  for (const p of unique) {
    lines.push("  <url><loc>" + escapeXml(absoluteUrl(base, p) || p) + "</loc></url>");
  }
  lines.push("</urlset>");
  return lines.join("\n") + "\n";
}

/**
 * robots.txt: everything open except the private pages, and the sitemap.
 * An AI crawler set to "deny" gets its own group that closes the whole site;
 * an allowed one follows the "*" group (a group of its own would make it
 * ignore the private pages closed there).
 */
export function robotsTxt(settings: SeoSettings, disallow: string[], origin?: string): string {
  const base = originOf(settings, origin);
  const lines = ["User-agent: *", "Allow: /"];
  for (const d of disallow) lines.push("Disallow: " + normalizePath(d));
  const crawlers = settings.aiCrawlers || {};
  for (const agent of Object.keys(crawlers).sort()) {
    if (crawlers[agent] === "deny" && /^[A-Za-z][A-Za-z0-9-]{1,40}$/.test(agent)) lines.push("", "User-agent: " + agent, "Disallow: /");
  }
  if (base !== "") lines.push("", "Sitemap: " + base + "/sitemap.xml");
  return lines.join("\n") + "\n";
}
