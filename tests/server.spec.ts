// The server once on the internet (server/security.ts, the admin of server/routes/site.ts): its check answers with the
// base, every answer carries the security headers and "noindex" until the launch, an admin session ends on its own and
// cannot be forged. Through the API only (one run is enough: the computer).
import { expect, test } from "./fixtures";

test.skip(({ browserName }) => browserName !== "chromium", "the API is checked once, from the computer");

test("the check of the server answers with its base", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(res.headers()["cache-control"]).toBe("no-store");
});

test("every answer carries the security headers, and noindex until the launch", async ({ request }) => {
  for (const url of ["/", "/fr/creations", "/api/catalogue", "/admin"]) {
    const headers = (await request.get(url)).headers();
    expect(headers["x-content-type-options"], url).toBe("nosniff");
    expect(headers["x-frame-options"], url).toBe("SAMEORIGIN");
    expect(headers["referrer-policy"], url).toBe("strict-origin-when-cross-origin");
    expect(headers["x-robots-tag"], url).toBe("noindex, nofollow");
    expect(headers["x-powered-by"], url).toBeUndefined();
  }
});

test("an admin session ends on its own and cannot be forged", async ({ request }) => {
  const password = process.env.ADMIN_PASSWORD;
  test.skip(!password, "ADMIN_PASSWORD (.env) is needed to open the admin");
  const login = await request.post("/api/admin/login", { data: { password } });
  expect(login.status()).toBe(200);
  const { token } = (await login.json()) as { token: string };
  // "<expiry>.<signature>": a working day.
  const [exp = "", sig = ""] = token.split(".");
  const hours = (Number(exp) - Date.now() / 1000) / 3600;
  expect(hours).toBeGreaterThan(11.9);
  expect(hours).toBeLessThanOrEqual(12);
  const as = (t: string) => request.get("/api/admin/messages", { headers: { Authorization: "Bearer " + t } });
  expect((await as(token)).status()).toBe(200);
  // A later expiry with the same signature, an expiry already passed, nothing: refused.
  expect((await as(Number(exp) + 86400 + "." + sig)).status()).toBe(401);
  expect((await as(Math.floor(Date.now() / 1000) - 60 + "." + sig)).status()).toBe(401);
  expect((await as("")).status()).toBe(401);
  // A wrong password says so (the machine itself is never made to wait: the checks run from it).
  const wrong = await request.post("/api/admin/login", { data: { password: "not-the-password" } });
  expect(wrong.status()).toBe(401);
  expect((await wrong.json()).error).toBe("Mot de passe incorrect.");
});
