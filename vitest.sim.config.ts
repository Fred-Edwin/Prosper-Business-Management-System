import { defineConfig } from "vitest/config";
import { config as loadEnv } from "dotenv";
import { sharedResolve } from "./vitest.shared";

// The long-horizon simulation lane. Deliberately NOT part of `pnpm test`:
// it drives 60+ simulated business days of real API calls against its own
// database on a single timeline, which takes minutes, not seconds.
//
// Why its own database (.env.sim → prosper_hotel_sim):
//   - the test pool's 8 schemas are wiped + reseeded by `pretest`, and
//     parallel suites write into them mid-run; a 60-day accumulating
//     timeline cannot share a schema with anything else.
//   - the dev DB (`prosper_hotel`) holds the owner's real walkthrough data.
//
// Why single-threaded: the simulator advances one global fake clock and
// accumulates one continuous ledger. Two workers would fight over both.
loadEnv({ path: ".env.sim", override: true });

// The sim DB has only `public` — no `test_worker_*` schemas. Opt this lane
// out of lib/db's per-worker schema routing (which keys off VITEST_POOL_ID
// and would otherwise send us to a schema that doesn't exist here).
process.env.PRISMA_SCHEMA_OVERRIDE = "public";

export default defineConfig({
  resolve: sharedResolve,
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["tests/simulation/**/*.sim.test.ts", "tests/simulation/**/*.sim.test.tsx"],
    // load-demo is the owner's walkthrough loader, not a check: it is run
    // on its own by `pnpm demo:load` against the DEV database. Excluding it
    // here means a normal `pnpm test:sim` can never touch dev data.
    exclude: ["tests/simulation/load-demo.sim.test.ts"],
    // A 60-day run makes thousands of API calls; the invariant battery
    // then re-reads every horizon. Generous, and measured per-suite.
    testTimeout: 900_000,
    hookTimeout: 900_000,
    pool: "forks",
    maxWorkers: 1,
    // Every horizon suite calls resetLedger() and then builds its own
    // continuous timeline in the ONE sim database. They must not overlap:
    // sequential files, one worker, and (below) a fresh fork per file so
    // no fake-timer or Prisma state leaks between horizons.
    fileParallelism: false,
    isolate: true,
  },
});
