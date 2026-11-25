/*
 * The site « under construction » (Yoni, 25/11/2026): until he opens it, a visitor without access sees one page, « Coming
 * soon » (server/door.ts), at every address of the site (pages, languages, photos, films, files of /media asked directly,
 * the sitemap). The right password of the private access opens the real site, at the page asked first, for 180 days on that
 * device (cookie bj_access: HttpOnly, Secure, SameSite=Lax, signed with the secret of the server and the current password,
 * so a new password closes every device). At most 5 tries per minute and per address.
 *
 * Always reachable, with their own protection: /admin and its API (the admin password; logging in also opens the site on
 * that device), the private links of the clients (/vip/<token>, /view/<token>, the client space once entered) and only the
 * files these pages need (the code of the pages, the brand), the checks of the server (/api/health). Nothing else.
 *
 * Settings, in the base (table ServerSetting, so in the backups, and kept through updates, reinstalls and restores):
 *   access.construction   "on" | "off"    (missing = on: the site never opens to the public by mistake)
 *   access.password       scrypt$<salt>$<hash>   only the fingerprint, never the password
 * Changed from the admin (« Accès au site ») or, in the Terminal, `npm run vps -- access` (server/access-cli.ts).
 * While under construction: "noindex, nofollow" everywhere, robots.txt forbids everything, no sitemap.
 */
import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express, { Router, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { accessState, cookie, grantAccess, hasAccess, loadAccess, matches, MIN_PASSWORD, refreshAccess, setConstruction, setCookie, setPassword, valid } from "./access-state.js";
import { prisma } from "./db.js";
import { doorLang, doorPage, type DoorMessage, type DoorMode } from "./door.js";
import { sessionClient } from "./routes/vip.js";
import { serverSecret } from "./secret.js";
import { limiter, LOCAL, visitor } from "./security.js";

/** The pass of a private page (a client link, a 3D link): the code of the page and the brand, for a day. */
const PASS = "bj_pass";
const PASS_HOURS = 24;

function passSig(exp: number): string {
  return createHmac("sha256", serverSecret()).update("private-pass:" + exp).digest("base64url");
}

function grantPass(req: Request, res: Response): void {
  const exp = Math.floor(Date.now() / 1000) + PASS_HOURS * 3600;
  setCookie(req, res, PASS, exp + "." + passSig(exp), PASS_HOURS * 3600);
}

/** A client entered in his space, or a visitor of a private link: the files of these pages only. */
function hasPass(req: Request): boolean {
  return valid(cookie(req, PASS), passSig) || sessionClient(req) !== null;
}

/* ---------- The gate ---------- */

/** The API open to everyone: the checks, the private access, the admin, the client space, the 3D links (signed files). */
const OPEN_API = /^\/api\/(?:health$|access$|admin\/|vip\/|view\/|models\/[A-Za-z0-9_-]+\/files\/)/;
/** The private pages, in every language: a 3D link, the client space (with his link, or once entered). */
const PRIVATE_PAGE = /^\/(?:(?:fr|es|de|nl|ar)\/)?(view|vip)(?:\/([A-Za-z0-9_-]+))?\/?$/;
/** What the private pages load: the code of the pages (and its fonts), the brand. */
const PRIVATE_FILES = /^\/(?:assets\/|media\/brand\/)/;

/** The address a visitor goes back to once in: a page of this site only. */
function safeNext(value: unknown): string {
  const next = typeof value === "string" ? value : "";
  return /^\/(?![/\\])/.test(next) && !/[\\\r\n]/.test(next) && !next.startsWith("/api/") && next.length < 2000 ? next : "/";
}

function originOf(req: Request): string {
  const host = (req.get("host") ?? "").replace(/[^A-Za-z0-9.:[\]-]/g, "");
  return (req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http") + "://" + host;
}

function sendDoor(req: Request, res: Response, mode: DoorMode, status: number, message?: DoorMessage, next?: string): void {
  res.status(status);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Accept-Language, Cookie");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  res.end(doorPage({ lang: doorLang(req.headers["accept-language"]), mode, message, next: next ?? safeNext(req.originalUrl), origin: originOf(req) }));
}

async function validPrivateToken(kind: string, token: string): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return false;
  if (kind === "vip") return (await prisma.client.findUnique({ where: { token }, select: { id: true } })) !== null;
  const link = await prisma.viewLink.findUnique({ where: { token }, include: { model: { select: { status: true } } } });
  return link !== null && link.model.status === "ready" && (!link.expiresAt || link.expiresAt.getTime() > Date.now());
}

/**
 * Before everything else: while under construction, only the visitors with access go further. The machine itself (the
 * checks and tests on the Mac) is not stopped, unless ACCESS_LOCAL=closed (to test the gate itself).
 */
export function gate(dist: string): RequestHandler {
  const shell = path.join(dist, "app.html");
  return (req: Request, res: Response, next: NextFunction) => {
    refreshAccess();
    if (!accessState().construction) return next();
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    const p = req.path;
    if (p === "/robots.txt") {
      res.type("text/plain").setHeader("Cache-Control", "no-store");
      res.send("User-agent: *\nDisallow: /\n");
      return;
    }
    if (LOCAL.test(visitor(req)) && process.env.ACCESS_LOCAL !== "closed") return next();
    // The files of the door itself (its fonts, monogram, preview image).
    if (p.startsWith("/soon/")) return next();
    if (p.startsWith("/api/")) {
      if (OPEN_API.test(p) || hasAccess(req)) return next();
      res.status(403).setHeader("Cache-Control", "no-store");
      res.json({ error: "closed" });
      return;
    }
    if (hasAccess(req)) return next();
    if (req.method !== "GET" && req.method !== "HEAD") return sendDoor(req, res, "soon", 403);
    if (/^\/admin\/?$/.test(p)) return sendDoor(req, res, "admin", 200);
    const page = PRIVATE_PAGE.exec(p);
    if (page) {
      const [, kind = "", token = ""] = page;
      const open = token ? validPrivateToken(kind, token) : Promise.resolve(kind === "vip" && sessionClient(req) !== null);
      void open.then(
        (ok) => {
          if (!ok) return sendDoor(req, res, kind === "vip" && !token ? "vip" : "soon", 200);
          // The page of the client, alone (src/App.tsx: without the menu and the pages of the site).
          fs.readFile(shell, "utf8", (error, html) => {
            if (error) return sendDoor(req, res, "soon", 200);
            grantPass(req, res);
            res.setHeader("Cache-Control", "no-store");
            res.type("html").send(html.replace("<head>", '<head>\n    <meta name="bj-private" content="1" />'));
          });
        },
        () => sendDoor(req, res, "soon", 200),
      );
      return;
    }
    if (PRIVATE_FILES.test(p) && hasPass(req)) return next();
    sendDoor(req, res, "soon", 200);
  };
}

/* ---------- The private access (the door's form) ---------- */

export const access = Router();

/** 5 tries per minute and per address. */
const tries = limiter(5, 1);

access.post("/access", express.urlencoded({ extended: false, limit: "8kb" }), async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const next = safeNext(body.next);
  const current = await loadAccess();
  if (!current.construction || hasAccess(req)) {
    res.redirect(303, next);
    return;
  }
  if (!tries.hit(req)) {
    sendDoor(req, res, "soon", 429, "tooMany", next);
    return;
  }
  const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";
  if (!password || !(await matches(password, current.hash))) {
    await new Promise((r) => setTimeout(r, 500));
    sendDoor(req, res, "soon", 401, "wrong", next);
    return;
  }
  tries.clear(req);
  grantAccess(req, res);
  res.setHeader("Cache-Control", "no-store");
  res.redirect(303, next);
});

/* ---------- The admin (« Accès au site ») ---------- */

export function accessAdmin(requireAdmin: RequestHandler): Router {
  const admin = Router();
  admin.get("/admin/access", requireAdmin, async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    await loadAccess();
    res.json(accessState());
  });
  admin.put("/admin/access", requireAdmin, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const body = z.object({ construction: z.boolean().optional(), password: z.string().max(200).optional() }).safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Réglage invalide." });
      return;
    }
    const { construction, password } = body.data;
    if (password !== undefined) {
      if (password.trim().length < MIN_PASSWORD) {
        res.status(400).json({ error: "Le mot de passe doit avoir au moins " + MIN_PASSWORD + " caractères." });
        return;
      }
      await setPassword(password);
    }
    if (construction !== undefined) await setConstruction(construction);
    // The device of the admin stays open (a new password closes all the others).
    grantAccess(req, res);
    res.json(accessState());
  });
  /** Forgets the password (the site stays under construction, nobody enters until a new one is chosen). */
  admin.delete("/admin/access/password", requireAdmin, async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    await setPassword(null);
    await setConstruction(true);
    grantAccess(req, res);
    res.json(accessState());
  });
  return admin;
}
