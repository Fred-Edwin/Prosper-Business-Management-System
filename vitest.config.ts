import { defineConfig } from "vitest/config";
import { sharedResolve, sharedTest } from "./vitest.shared";

// The full run: every `*.test.ts(x)` in one process. Each worker gets its
// own Postgres schema (see lib/db/index.ts, docs/TESTING.md), so
// cross-worker read races are gone regardless of worker count — same
// mechanism vitest.db.config.ts uses. maxWorkers stays at 4 here even
// though vitest.db.config.ts raised its own cap to 8 (2026-09-14,
// measured): running Postgres-heavy domain workers and jsdom-heavy screen
// workers in the SAME pool at 8 didn't reproduce that win (~210s vs the
// db-only lane's ~127-156s) — likely CPU contention between the two
// workloads sharing this machine's 8 cores — so it isn't worth the extra
// dev-machine contention. For a faster inner loop while iterating, use
// `pnpm test:unit` (DB-free, full parallelism) / `pnpm test:db` (DB-only,
// now maxWorkers 8) instead of this full run.
export default defineConfig({
  test: {
    ...sharedTest,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**"],
    maxWorkers: 4,
  },
  resolve: sharedResolve,
});
