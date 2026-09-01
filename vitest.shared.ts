import "dotenv/config";
import path from "node:path";
import type { ViteUserConfig } from "vitest/config";

// Shared test config. The full run (`pnpm test`, vitest.config.ts) and the
// two split lanes (`pnpm test:unit` / `pnpm test:db`) all build off this so
// aliases, setup and timeouts can't drift between them.
//
// The split (B, chosen 2026-09-01):
//   - test:unit — the DB-free files: every `*.screen.test.tsx` (jsdom +
//     RTL) plus a handful of pure-logic units. No Postgres, so they run at
//     full worker parallelism and finish in seconds. Use this as the inner
//     loop.
//   - test:db  — everything that talks to the one local Postgres (domain,
//     api route, integration suites). Still capped at 2 workers: each
//     vitest worker fork opens its own Prisma pool (~17 connections), and
//     8 forks × 17 overruns Postgres' 100-connection ceiling — suites then
//     fail *waiting for a connection* even though the code is fine. 2
//     workers (~34 connections) fits with headroom.
//   - test    — runs the whole set in one process at the 2-worker cap
//     (unchanged; what CI / pre-push use).

/** Glob set for the DB-free lane. Keep in sync with test:db's exclude. */
export const DB_FREE_INCLUDE = [
  "tests/screens/**/*.screen.test.tsx",
  "app/admin/stock/derive-ledger.test.ts",
  "app/admin/stock/opening/opening-plan.test.ts",
  "app/admin/stock/use-stock.test.ts",
  "app/design-system/tokens.test.ts",
  "lib/auth/roles.test.ts",
  "lib/time/index.test.ts",
];

export const sharedTest: ViteUserConfig["test"] = {
  // Default: Node, for the ledger/domain math (fast, no DOM). Screen-level
  // component specs opt into jsdom per-file with `// @vitest-environment jsdom`
  // (they are named `*.screen.test.tsx`).
  environment: "node",
  setupFiles: ["./vitest.setup.ts"],
  testTimeout: 15_000,
  hookTimeout: 20_000,
};

export const sharedResolve: ViteUserConfig["resolve"] = {
  alias: {
    "@": path.resolve(__dirname, "."),
  },
};
