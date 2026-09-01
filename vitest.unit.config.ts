import { defineConfig } from "vitest/config";
import { DB_FREE_INCLUDE, sharedResolve, sharedTest } from "./vitest.shared";

// `pnpm test:unit` — the DB-free lane: jsdom screen specs + pure-logic
// units. No Postgres, so no worker cap; runs at full parallelism and
// finishes in seconds. This is the inner loop while iterating.
//
// If you add a test that does NOT touch the DB, add its path to
// DB_FREE_INCLUDE (vitest.shared.ts) and to vitest.db.config.ts's exclude.
export default defineConfig({
  test: {
    ...sharedTest,
    include: DB_FREE_INCLUDE,
    exclude: ["node_modules/**"],
  },
  resolve: sharedResolve,
});
