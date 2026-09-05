import { defineConfig } from "vitest/config";
import { sharedResolve, sharedTest } from "./vitest.shared";

// The full run: every `*.test.ts(x)` in one process. Each worker gets its
// own Postgres schema (see lib/db/index.ts, docs/TESTING.md), so
// cross-worker read races are gone regardless of worker count — same
// mechanism vitest.db.config.ts uses. maxWorkers is capped at 4, not 8,
// purely for this machine's own CPU/RAM budget (see vitest.db.config.ts's
// comment) — raise it on a less contended machine or in CI. For a faster
// inner loop while iterating, use `pnpm test:unit` (DB-free, full
// parallelism) / `pnpm test:db` instead of this full run.
export default defineConfig({
  test: {
    ...sharedTest,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**"],
    maxWorkers: 4,
  },
  resolve: sharedResolve,
});
