import { defineConfig } from "vitest/config";
import { DB_FREE_INCLUDE, sharedResolve, sharedTest } from "./vitest.shared";

// `pnpm test:db` — every suite that talks to the one local Postgres
// (domain, api route, integration). `.env.test`'s DATABASE_URL pins each
// Prisma pool to `connection_limit=5` (was unset, so Prisma defaulted to
// `num_cpus * 2 + 1` — ~17 per worker fork); Postgres' 100-connection
// ceiling would allow up to ~8 workers on that basis alone. Each worker
// also gets its own Postgres schema (see lib/db/index.ts, docs/TESTING.md)
// so cross-worker read races are gone regardless of worker count.
//
// maxWorkers is capped at 4, not 8, purely for THIS machine's own CPU/RAM
// budget — 8 vitest forks alongside `pnpm dev`, the editor, tsserver, and
// browser-automation tooling pushed load average to ~2x core count and
// nearly exhausted swap. 4 leaves headroom for those to keep running.
// Raise it back toward 8 (still safe re: Postgres and the schema pool —
// see SCHEMA_POOL_SIZE in scripts/setup-test-db.mjs) on a less contended
// machine or in CI.
//
// Include = everything, minus the DB-free lane (kept in sync via the
// shared DB_FREE_INCLUDE list).
export default defineConfig({
  test: {
    ...sharedTest,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ...DB_FREE_INCLUDE],
    maxWorkers: 4,
  },
  resolve: sharedResolve,
});
