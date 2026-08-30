import "dotenv/config";
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    // Default: Node, for the ledger/domain math (fast, no DOM). Screen-level
    // component specs opt into jsdom per-file with `// @vitest-environment jsdom`
    // (they are named `*.screen.test.tsx`).
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules/**"],
    setupFiles: ["./vitest.setup.ts"],
    // Every domain/integration suite talks to one local Postgres. Vitest
    // spawns one worker fork per CPU core by default (8 here), and each
    // fork opens its own Prisma connection pool (~17 connections). 8 × 17
    // overruns Postgres' 100-connection ceiling once enough DB-heavy suites
    // run at once, and tests fail *waiting for a connection* even though
    // the code is fine (every suite passes in isolation, and the full run
    // passes with `--no-file-parallelism`). 2 workers keeps the total
    // (~34) well under the ceiling with headroom; the full run is a few
    // minutes, isolated suites still sub-second. Raise cautiously if a
    // future machine has a bigger Postgres `max_connections`.
    maxWorkers: 2,
    testTimeout: 15_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
