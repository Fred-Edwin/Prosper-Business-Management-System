// The CLEAN scenario, checked against figures worked out by hand.
// If this fails, either the system is wrong or the sheet in
// clean-scenario.ts is — and both are human-readable, so it is decidable.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { api, actAs, expectOk, loadCast, resetLedger, type Cast } from "./harness";
import { runCleanScenario, CLEAN_DAYS, EXPECTED } from "./clean-scenario";
import { ShadowLedger, money } from "./shadow";

let cast: Cast;
let shadow: ShadowLedger;
const [D1, , D3] = CLEAN_DAYS;

describe("clean numbers — verifiable by hand", () => {
  beforeAll(async () => {
    vi.useFakeTimers();
    await resetLedger();
    cast = await loadCast();
    shadow = await runCleanScenario(cast);
    vi.setSystemTime(new Date(`${D3}T23:30:00+03:00`));
    actAs(cast.admin);
  }, 300_000);

  afterAll(() => vi.useRealTimers());

  const summary = async (from: string, to: string) =>
    expectOk(`summary`, await api.financialSummary(`?from=${from}&to=${to}`));

  it("the three-day totals are exactly the hand-computed figures", async () => {
    const s = await summary(D1, D3);
    expect(s.consolidated.revenue).toBe(EXPECTED.revenue);
    expect(s.consolidated.totalExpenses).toBe(EXPECTED.totalExpenses);
    expect(s.consolidated.debtsOwedToBusiness).toBe(EXPECTED.debtsOwedToBusiness);
    expect(s.nonSaleConsumption.total).toBe(EXPECTED.nonSaleTotal);
  });

  it("each day's revenue and expenses are the hand-computed figures", async () => {
    for (const day of CLEAN_DAYS) {
      const d = await summary(day, day);
      const want = EXPECTED.perDay[day];
      expect(d.consolidated.revenue, `${day} revenue`).toBe(want.revenue);
      expect(d.consolidated.expenses ?? d.consolidated.totalExpenses, `${day} expenses`).toBe(
        want.expenses,
      );
    }
  });

  it("per-location revenue is the hand-computed split", async () => {
    const s = await summary(D1, D3);
    const byId = new Map<string, any>(s.perLocation.map((l: any) => [l.locationId, l]));
    expect(byId.get("seed-location-restaurant")?.revenue).toBe(
      EXPECTED.perLocation.restaurant,
    );
    expect(byId.get("seed-location-canteen")?.revenue).toBe(
      EXPECTED.perLocation.canteen,
    );
  });

  it("the shadow agrees with the API on all of it", async () => {
    const s = await summary(D1, D3);
    expect(money(s.consolidated.revenue)).toBe(shadow.revenue(D1, D3));
    expect(money(s.consolidated.totalExpenses)).toBe(shadow.expenses(D1, D3));
    expect(money(s.consolidated.debtsOwedToBusiness)).toBe(shadow.debtsAsOf(D3));
    expect(money(s.consolidated.cashBalance)).toBe(shadow.cashAsOf(D3));
    expect(money(s.consolidated.mpesaBankBalance)).toBe(shadow.mpesaAsOf(D3));
  });
});
