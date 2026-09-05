// ═══════════════════════════════════════════════════════════════════════
// NOT really a test — the loader for the owner's UI walkthrough.
//
//   pnpm demo:load
//
// It runs the CLEAN scenario (the same code the automated screen tests
// assert against) against whatever DATABASE_URL is set, so the browser
// shows data produced by the REAL domain through the REAL business rules,
// day by day on a moving clock — not hand-planted rows.
//
// Excluded from `pnpm test:sim` (see vitest.sim.config.ts) so a normal
// simulation run never touches the dev database. `pnpm demo:load` points
// DATABASE_URL at the dev DB and runs this file alone.
//
// It prints the expected figures at the end, which is what
// docs/UI_WALKTHROUGH.md is generated from.
// ═══════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from "vitest";
import { api, actAs, expectOk, loadCast, resetLedger } from "./harness";
import { runCleanScenario, CLEAN_DAYS, EXPECTED } from "./clean-scenario";

const [D1, , D3] = CLEAN_DAYS;

describe("load the demo scenario", () => {
  it("writes three clean days and reports the figures the screens must show", async () => {
    vi.useFakeTimers();
    await resetLedger();
    const cast = await loadCast();
    await runCleanScenario(cast);

    vi.setSystemTime(new Date(`${D3}T20:00:00+03:00`));
    actAs(cast.admin);
    const s = expectOk(
      "summary",
      await api.financialSummary(`?from=${D1}&to=${D3}`),
    );
    vi.useRealTimers();

    // Guard: never publish a walkthrough sheet whose figures are stale.
    expect(s.consolidated.revenue).toBe(EXPECTED.revenue);
    expect(s.consolidated.totalExpenses).toBe(EXPECTED.totalExpenses);
    expect(s.consolidated.debtsOwedToBusiness).toBe(EXPECTED.debtsOwedToBusiness);

    const line = (l: string, v: string) => `  ${l.padEnd(30)} ${v.padStart(12)}`;
    console.log(
      [
        "",
        "  ══ DEMO DATA LOADED ══════════════════════════════════════",
        `  Three business days: ${D1} … ${D3}`,
        "",
        "  Set the date range to THIS MONTH (June 2026) and you must see:",
        "",
        line("Revenue", s.consolidated.revenue),
        line("Cost of goods sold", s.consolidated.cogs),
        line("Gross profit", s.consolidated.grossProfit),
        line("Total expenses", s.consolidated.totalExpenses),
        line("Net profit", s.consolidated.netProfit),
        line("Debts owed to business", s.consolidated.debtsOwedToBusiness),
        line("Cash at hand", s.consolidated.cashBalance),
        line("M-Pesa / Bank", s.consolidated.mpesaBankBalance),
        line("Non-sale consumption", s.nonSaleConsumption.total),
        "",
        "  Sign in as Admin / PIN 1234 · see docs/UI_WALKTHROUGH.md",
        "  ══════════════════════════════════════════════════════════",
        "",
      ].join("\n"),
    );
  }, 300_000);
});
