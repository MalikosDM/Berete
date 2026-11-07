import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type NextFunction, type Request, type Response } from "express";
import { contact } from "./modules/contact.js";
import { workflows } from "./workflows/index.js";
import { site } from "./routes/site.js";

const app = express();
app.disable("x-powered-by");
// The raw body is kept for the signed shop events of the workflows.
app.use(express.json({ limit: "100kb", verify: (req, _res, buf) => { Object.assign(req, { rawBody: buf }); } }));

app.use("/api/contact", contact);
app.use("/api", workflows);
app.use("/api", site);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// In production the same server serves the built front (vite build -> dist/).
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
// The pre-rendered pages are served at their address: /about is about.html.
app.use(express.static(dist, { extensions: ["html"] }));
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: "Something went wrong." });
});

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
