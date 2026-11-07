import "dotenv/config";
import path from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
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
// The pre-rendered pages are served at their address: /about is about.html.
app.use(express.static(dist, { extensions: ["html"] }));
app.get(/^(?!\/api\/).*/, (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
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
