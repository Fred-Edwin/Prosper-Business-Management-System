import { defineConfig } from "vitest/config";
import { DB_FREE_INCLUDE, sharedResolve, sharedTest } from "./vitest.shared";

// `pnpm test:db` — every suite that talks to the one local Postgres
// (domain, api route, integration). `.env.test`'s DATABASE_URL pins each
// Prisma pool to `connection_limit=5` (was unset, so Prisma defaulted to
// `num_cpus * 2 + 1` — ~17 per worker fork). At 5/worker, 8 forks is ~40
// connections, comfortably under Postgres' 100-connection ceiling. See
// vitest.shared.ts and .env.test.
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
