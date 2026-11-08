import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import { RENAMED_PIECES } from "../src/data/pieces.js";
import { syncCatalogue } from "./catalogue.js";
import { site } from "./routes/site.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.use("/api", site);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// In production the same server serves the built front (npm run build -> dist/).
const dist = path.resolve(process.env.STATIC_DIR ?? "dist");
const LANGUAGES = ["fr", "es", "de", "nl", "ar"];

// The pre-rendered pages are served at their address: /about is about.html,
// /fr is fr.html, /fr/creations is fr/creations.html. This comes before the
// static files, so an address that is also a folder (/creations, /fr) gets its
// page and not a redirect.
app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  let address: string;
  try {
    address = decodeURIComponent(req.path).replace(/\/+$/, "");
  } catch {
    return next();
  }
  if (address === "" || path.extname(address) !== "") return next();
  const file = path.join(dist, address + ".html");
  if (!file.startsWith(dist + path.sep)) return next();
  fs.stat(file, (error, stats) => (error || !stats.isFile() ? next() : res.sendFile(file)));
});
app.use(express.static(dist, { redirect: false }));

// The old addresses of the site lead to the new ones (permanent redirects, in every language):
// /pieces and /capsules/... to /creations, a piece under /creations/<slug> to /pieces/<slug>,
// a renamed piece to its new address.
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  const parts = req.path.replace(/\/+$/, "").split("/").slice(1);
  const prefix = LANGUAGES.includes(parts[0] ?? "") ? "/" + parts.shift() : "";
  const [section = "", slug = "", ...rest] = parts;
  let target: string | null = null;
  if ((section === "pieces" && slug === "") || section === "capsules") target = "/creations";
  else if (section === "creations" && slug !== "" && rest.length === 0) target = "/pieces/" + (RENAMED_PIECES[slug] ?? slug);
  else if (section === "pieces" && rest.length === 0 && RENAMED_PIECES[slug]) target = "/pieces/" + RENAMED_PIECES[slug];
  if (!target) return next();
  const page = path.join(dist, prefix + target + ".html");
  if (!page.startsWith(dist + path.sep)) return next();
  fs.stat(page, (error) => (error ? next() : res.redirect(301, prefix + target)));
});

// Any other address: the "page not found" of its language, with the 404 status.
app.get(/^(?!\/api\/).*/, (req, res) => {
  const language = req.path.split("/")[1] ?? "";
  const page = path.join(dist, ...(LANGUAGES.includes(language) ? [language, "404.html"] : ["404.html"]));
  fs.stat(page, (error) => {
    if (error) res.sendFile(path.join(dist, "index.html"));
    else res.status(404).sendFile(page);
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong." });
});

await syncCatalogue();

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
