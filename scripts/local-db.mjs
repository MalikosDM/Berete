#!/usr/bin/env node
/**
 * A local PostgreSQL for development, kept in .local/postgres (ignored by git).
 *   npm run db:local         creates it the first time, then starts it (port 5433)
 *   npm run db:local -- stop
 * Then: npm run db:migrate, npm run dev:server.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DATA = join(ROOT, ".local", "postgres");
const PORT = process.env.LOCAL_PG_PORT ?? "5433";
const DB = "berete";
const USER = "berete";

function bin(name) {
  for (const candidate of [name, name + "-17", "/opt/homebrew/opt/postgresql@17/bin/" + name, "/usr/local/opt/postgresql@17/bin/" + name]) {
    if (spawnSync(candidate, ["--version"], { stdio: "ignore" }).status === 0) return candidate;
  }
  console.error("PostgreSQL not found (" + name + "). Install it: brew install postgresql@17");
  process.exit(1);
}

function run(cmd, args, quiet = false) {
  const r = spawnSync(cmd, args, { stdio: quiet ? "ignore" : "inherit" });
  return r.status === 0;
}

const pgCtl = bin("pg_ctl");
if (process.argv[2] === "stop") {
  run(pgCtl, ["-D", DATA, "stop"]);
  process.exit(0);
}

if (!existsSync(join(DATA, "PG_VERSION"))) {
  console.log("Creating the local database in .local/postgres");
  if (!run(bin("initdb"), ["-D", DATA, "-U", USER, "--auth=trust", "--encoding=UTF8"])) process.exit(1);
}

if (!run(pgCtl, ["-D", DATA, "status"], true)) {
  if (!run(pgCtl, ["-D", DATA, "-l", join(DATA, "server.log"), "-o", "-p " + PORT + " -k /tmp", "-w", "start"])) process.exit(1);
}

run(bin("createdb"), ["-h", "localhost", "-p", PORT, "-U", USER, DB], true);
console.log("PostgreSQL ready: DATABASE_URL=\"postgresql://" + USER + "@localhost:" + PORT + "/" + DB + "\"");
