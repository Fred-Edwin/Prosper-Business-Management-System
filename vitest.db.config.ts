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
// maxWorkers raised to 8 (2026-09-14, measured): this machine has 8 cores
// and SCHEMA_POOL_SIZE (scripts/setup-test-db.mjs) is pinned at 8 to
// match — going higher starves the extra workers of a pre-created schema
// and fails outright (confirmed at 12: 58 files failed). 8 cut this lane
// from ~206s to ~127-156s. Running `pnpm dev` + editor + tsserver +
// browser-automation tooling alongside a test run will compete harder for
// CPU than the old cap of 4 did — drop back to 4 locally if that
// contention gets in the way; CI has no such competition.
//
// Include = everything, minus the DB-free lane (kept in sync via the
// shared DB_FREE_INCLUDE list).
export default defineConfig({
  test: {
    ...sharedTest,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ...DB_FREE_INCLUDE],
    maxWorkers: 8,
  },
  resolve: sharedResolve,
});
