/*
 * The protections of the server once it is on the internet (the VPS, behind Caddy: deploy/Caddyfile).
 *   - The address of the visitor: the server trusts the "X-Forwarded-For" of a proxy on the same machine or the same
 *     private network (Caddy), never one sent from outside.
 *   - Headers on every answer: no guessing of file types, no framing by another site, the referrer kept short; and
 *     "noindex" everywhere until the launch (SITE_INDEXING=on opens the site to the search engines).
 *   - A limit of tries per visitor (address), kept in memory: the password of the admin, the forms, the codes of the
 *     client space and of the private 3D links. The machine itself (the checks, the tests) is never limited.
 */
import type { Express, Request } from "express";

export function protect(app: Express): void {
  app.set("trust proxy", "loopback, uniquelocal");
  const indexing = process.env.SITE_INDEXING === "on";
  app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
    if (!indexing) res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });
}

/** The address of the visitor (behind Caddy: the real one). */
export function visitor(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "";
}

const LOCAL = /^(::1|127\.\d+\.\d+\.\d+|::ffff:127\.\d+\.\d+\.\d+)$/;

/**
 * At most `max` tries in `minutes` per visitor. `hit` counts one and says whether it is allowed, `wait` the minutes
 * left when it is not, `clear` forgets the visitor (a right password).
 */
export function limiter(max: number, minutes: number) {
  const tries = new Map<string, number[]>();
  const span = minutes * 60_000;
  const recent = (key: string, now: number) => (tries.get(key) ?? []).filter((t) => now - t < span);
  // Forget the old tries now and then (the map never grows without end).
  setInterval(() => {
    const now = Date.now();
    for (const key of tries.keys()) {
      const kept = recent(key, now);
      if (kept.length) tries.set(key, kept);
      else tries.delete(key);
    }
  }, span).unref();
  return {
    /** Is the visitor still allowed to try (without counting a try)? */
    allowed(req: Request): boolean {
      const key = visitor(req);
      return LOCAL.test(key) || recent(key, Date.now()).length < max;
    },
    /** Counts one try; false when the visitor has used all of them. */
    hit(req: Request): boolean {
      const key = visitor(req);
      if (LOCAL.test(key)) return true;
      const now = Date.now();
      const kept = recent(key, now);
      if (kept.length >= max) return false;
      kept.push(now);
      tries.set(key, kept);
      return true;
    },
    /** Minutes before the next try is allowed. */
    wait(req: Request): number {
      const first = recent(visitor(req), Date.now())[0];
      return first === undefined ? 0 : Math.max(1, Math.ceil((first + span - Date.now()) / 60_000));
    },
    clear(req: Request): void {
      tries.delete(visitor(req));
    },
  };
}
