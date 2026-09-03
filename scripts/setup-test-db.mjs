#!/usr/bin/env node
// Prepare the test-suite database. Run automatically by `pretest`, so
// `pnpm test` needs no manual steps — but safe to run by hand too.
//
// What it does, idempotently:
//   1. Reads DATABASE_URL from .env.test (the test DB, never the dev DB).
//   2. Creates that database if it does not exist (connecting to the
//      server's default `postgres` database to issue CREATE DATABASE).
//   3. Applies all Prisma migrations with `prisma migrate deploy` — the
//      test DB has real `_prisma_migrations` history (unlike the dev DB,
//      which was built with `db push`; see ADR-61).
//   4. Seeds it (prisma/seed.ts is WIPE + REBUILD, so re-runs are clean).
//
// A fresh clone runs the suite with nothing more than a running Postgres
// on the host/port in .env.test. See docs/TESTING.md.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { Client } from "pg";

function readTestDatabaseUrl() {
  const raw = readFileSync(new URL("../.env.test", import.meta.url), "utf8");
  const line = raw
    .split("\n")
    .find((l) => l.trim().startsWith("DATABASE_URL="));
  if (!line) throw new Error(".env.test has no DATABASE_URL");
  return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
}

async function ensureDatabaseExists(databaseUrl) {
  const url = new URL(databaseUrl);
  const dbName = url.pathname.replace(/^\//, "");
  if (!dbName) throw new Error(`No database name in ${databaseUrl}`);

  const adminUrl = new URL(databaseUrl);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const client = new Client({ connectionString: adminUrl.toString() });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName],
    );
    if (rowCount === 0) {
      // dbName comes from our own .env.test, not user input.
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`[setup-test-db] created database "${dbName}"`);
    } else {
      console.log(`[setup-test-db] database "${dbName}" already exists`);
    }
  } finally {
    await client.end();
  }
}

async function main() {
  const databaseUrl = readTestDatabaseUrl();
  await ensureDatabaseExists(databaseUrl);

  const env = { ...process.env, DATABASE_URL: databaseUrl };
  console.log("[setup-test-db] applying migrations…");
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    stdio: "inherit",
    env,
  });
  console.log("[setup-test-db] seeding…");
  execFileSync("pnpm", ["exec", "tsx", "prisma/seed.ts"], {
    stdio: "inherit",
    env,
  });
  console.log("[setup-test-db] test database ready.");
}

main().catch((err) => {
  console.error("[setup-test-db] failed:", err.message ?? err);
  process.exit(1);
});
