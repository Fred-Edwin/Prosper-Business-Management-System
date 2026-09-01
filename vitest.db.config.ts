import { defineConfig } from "vitest/config";
import { DB_FREE_INCLUDE, sharedResolve, sharedTest } from "./vitest.shared";

// `pnpm test:db` — every suite that talks to the one local Postgres
// (domain, api route, integration). Capped at 2 workers: each vitest
// worker fork opens its own Prisma pool (~17 connections); 8 forks would
// overrun Postgres' 100-connection ceiling and suites fail *waiting for a
// connection*. 2 workers (~34) fits with headroom. See vitest.shared.ts.
//
// Include = everything, minus the DB-free lane (kept in sync via the
// shared DB_FREE_INCLUDE list).
export default defineConfig({
  test: {
    ...sharedTest,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**", ...DB_FREE_INCLUDE],
    maxWorkers: 2,
  },
  resolve: sharedResolve,
});
