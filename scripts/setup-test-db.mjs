#!/usr/bin/env node
// Prepare the test-suite database. Run automatically by `pretest`, so
// `pnpm test` needs no manual steps — but safe to run by hand too.
//
// What it does, idempotently:
//   1. Reads DATABASE_URL from .env.test (the test DB, never the dev DB).
//   2. Creates that database if it does not exist (connecting to the
//      server's default `postgres` database to issue CREATE DATABASE).
//   3. Creates a FIXED POOL of Postgres schemas inside it, one per
//      possible vitest worker fork (`test_worker_1` .. `test_worker_N`),
//      and runs `prisma migrate deploy` + the seed against EACH schema.
//      Every vitest worker fork gets its own schema (lib/db/index.ts
//      picks it from VITEST_POOL_ID), so concurrent suites can no longer
//      race on an unscoped read seeing another suite's writes — they are
//      now in entirely separate schemas, not just different rows of the
//      same one.
//
// Why a fixed pool instead of lazy per-worker provisioning: migrate +
// seed for one schema takes real wall-clock time (Prisma migration
// history replay + the seed's wipe/rebuild). Doing that lazily on each
// worker's first test would move that cost from setup time into test
// run time, on the critical path of every `pnpm test:db` run. A fixed
// pool pays the cost once, up front, in `pretest`/`pretest:db` — same
// place the single-schema setup already paid it.
//
// Migration is sequential across schemas (Postgres advisory locks used
// by `prisma migrate deploy` are database-scoped, not schema-scoped, so
// parallel migrate runs just contend on the same lock and time out —
// confirmed empirically), but seeding IS parallel across schemas (no
// shared lock there), which is most of the pool's setup cost anyway.
//
// Two different tools, two different ways of being told the schema:
// `prisma migrate deploy` parses `?schema=` off its own DATABASE_URL, but
// the seed (and the app, via lib/db/index.ts) go through
// `@prisma/adapter-pg`, which ignores that query param entirely (`pg`
// has no such connection option, and it doesn't set `search_path`
// either — confirmed empirically: a client connected with `?schema=foo`
// silently reads/writes `public`). The only thing that actually routes
// the adapter's generated queries to another schema is its constructor's
// second argument, `{ schema }`. See migrateSchema()/seedSchema() below.
//
// SCHEMA_POOL_SIZE must be >= the largest `maxWorkers` of any vitest
// config that touches the DB (currently 8, in vitest.db.config.ts). If a
// config's maxWorkers is ever raised past this, raise it here too — a
// worker whose VITEST_POOL_ID exceeds the pool falls back to a schema
// that was never migrated/seeded and every DB call in that worker fails
// loudly (not silently back onto `public`), which is the intended
// failure mode: it tells you the pool is undersized instead of quietly
// reintroducing the cross-worker race.
//
// A fresh clone runs the suite with nothing more than a running Postgres
// on the host/port in .env.test. See docs/TESTING.md.
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { promisify } from "node:util";
import { Client } from "pg";

const execFileAsync = promisify(execFile);

const SCHEMA_POOL_SIZE = 8;
const schemaName = (n) => `test_worker_${n}`;

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

/**
 * Create each pool schema up front with an explicit `CREATE SCHEMA IF
 * NOT EXISTS`, rather than relying on `prisma migrate deploy` to create
 * it implicitly on first connect. Explicit here because whether migrate
 * auto-creates a missing schema is a Prisma engine behavior, not a
 * documented contract — being explicit means this script doesn't depend
 * on that behavior either way.
 */
async function ensureSchemasExist(databaseUrl, schemas) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    for (const schema of schemas) {
      // schema names come from schemaName() above, not user input.
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
    }
    console.log(`[setup-test-db] ensured ${schemas.length} worker schemas exist`);
  } finally {
    await client.end();
  }
}

/** Same URL, with `?schema=<name>` swapped in (replacing whatever's there). */
function withSchema(databaseUrl, schema) {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", schema);
  return url.toString();
}

/**
 * Migrate ONE schema. `prisma migrate deploy` takes a Postgres advisory
 * lock (`pg_advisory_lock`) to serialize concurrent migration runs —
 * that lock is scoped to the DATABASE, not the schema (Postgres advisory
 * locks aren't schema-scoped), so running `migrate deploy` for 8 schemas
 * at once in the same database means 7 of them just wait on the 8th's
 * lock and start timing out (confirmed empirically: P1002 "timed out
 * trying to acquire a postgres advisory lock"). So migrations run
 * SEQUENTIALLY here — there's nothing to parallelize, the lock would
 * serialize them anyway.
 *
 * `prisma migrate deploy`'s own engine DOES read `?schema=` off the URL
 * (unlike the `@prisma/adapter-pg` driver the app/seed use at runtime —
 * see lib/db/index.ts) — confirmed empirically by inspecting its
 * "Datasource ... schema ..." log line and the resulting
 * `<schema>._prisma_migrations` table. So this is the one place
 * `withSchema()` (URL-based) is the correct mechanism.
 */
async function migrateSchema(databaseUrl, schema) {
  const env = { ...process.env, DATABASE_URL: withSchema(databaseUrl, schema) };
  await execFileAsync("pnpm", ["exec", "prisma", "migrate", "deploy"], { env });
  console.log(`[setup-test-db] schema "${schema}" migrated`);
}

/**
 * Seed ONE schema. Unlike migrate, the seed has no shared lock — each
 * schema has its own tables, so N schemas can wipe+rebuild concurrently
 * without contention. Run in parallel (see main()) once every schema is
 * migrated.
 *
 * The seed script goes through `@prisma/adapter-pg` (like the app), so
 * — unlike migrateSchema above — the URL's `?schema=` param would be
 * silently ignored here. Schema selection for the seed is instead via
 * TEST_WORKER_SCHEMA, which prisma/seed.ts reads and passes as the
 * adapter's `{ schema }` option (the only mechanism that actually works
 * for generated-query schema routing). DATABASE_URL for the seed step is
 * deliberately left schema-unqualified.
 */
async function seedSchema(databaseUrl, schema) {
  const env = { ...process.env, DATABASE_URL: databaseUrl, TEST_WORKER_SCHEMA: schema };
  try {
    await execFileAsync("pnpm", ["exec", "tsx", "prisma/seed.ts"], { env });
    console.log(`[setup-test-db] schema "${schema}" seeded`);
  } catch (err) {
    console.error(`[setup-test-db] schema "${schema}" seed failed:`);
    console.error(err.stdout ?? "");
    console.error(err.stderr ?? err.message ?? err);
    throw err;
  }
}

async function main() {
  const databaseUrl = readTestDatabaseUrl();
  await ensureDatabaseExists(databaseUrl);

  const schemas = Array.from({ length: SCHEMA_POOL_SIZE }, (_, i) => schemaName(i + 1));
  await ensureSchemasExist(databaseUrl, schemas);

  console.log(`[setup-test-db] applying migrations to ${schemas.length} worker schemas…`);
  for (const schema of schemas) {
    await migrateSchema(databaseUrl, schema);
  }

  console.log(`[setup-test-db] seeding ${schemas.length} worker schemas in parallel…`);
  await Promise.all(schemas.map((schema) => seedSchema(databaseUrl, schema)));
  console.log("[setup-test-db] test database ready.");
}

main().catch((err) => {
  console.error("[setup-test-db] failed:", err.message ?? err);
  process.exit(1);
});
