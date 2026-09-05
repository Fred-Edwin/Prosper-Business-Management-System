import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import { sharedResolve } from "./vitest.shared";

// `pnpm demo:load` — writes the clean demo scenario into the DEV database
// so the owner can check every figure in the browser against
// docs/UI_WALKTHROUGH.md.
//
// Unlike every other lane, this one deliberately loads `.env` (the dev
// database), NOT `.env.test` or `.env.sim` — the whole point is to put
// data where `pnpm dev` will show it. It runs exactly one file.
loadEnv({ path: ".env", override: true });
process.env.PRISMA_SCHEMA_OVERRIDE = "public";

export default defineConfig({
  resolve: sharedResolve,
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/simulation/load-demo.sim.test.ts"],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    maxWorkers: 1,
    fileParallelism: false,
  },
});
