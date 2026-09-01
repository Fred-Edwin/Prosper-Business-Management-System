import { defineConfig } from "vitest/config";
import { sharedResolve, sharedTest } from "./vitest.shared";

// The full run: every `*.test.ts(x)` in one process. See vitest.shared.ts
// for the DB-connection maths behind the 2-worker cap. For a faster inner
// loop, `pnpm test:unit` (DB-free, full parallelism) / `pnpm test:db`.
export default defineConfig({
  test: {
    ...sharedTest,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**"],
    maxWorkers: 2,
  },
  resolve: sharedResolve,
});
