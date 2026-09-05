// ═══════════════════════════════════════════════════════════════════════
// Horizon 3 — SIXTY DAYS of continuous trading, through the real API.
//
// The long horizon is where slow-accumulating errors show up: a COGS
// valuation that drifts a cent a day, a balance that is right daily but
// wrong when summed, a boundary that only misbehaves across a month end.
// This run crosses TWO month boundaries (Jul→Aug→Sep).
//
// Invariants (each must hold for ANY input, which is why they are stated
// as relationships rather than as hand-computed figures):
//
//   I1  additivity     Σ(daily summaries) == the week's summary
//   I2  telescoping    COGS(a..c) == COGS(a..b) + COGS(b+1..c)
//   I3  chain          gross = revenue − cogs; net = gross − expenses
//   I4  revenue truth  the API's revenue == the shadow's revenue
//   I5  stock          every product/location balance == shadow, daily
//   I6  money          cash + M-Pesa == shadow, daily
//   I7  debts          debtors' balance == shadow, as of each day
// ═══════════════════════════════════════════════════════════════════════
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { addBusinessDays } from "@/lib/time";
import {
  api,
  actAs,
  expectOk,
  loadCast,
  resetLedger,
  LOC,
  type Cast,
} from "./harness";
import { runSimulation, type SimResult } from "./scenario";
import { money, qty, fmtMoney, fmtQty, stockKey } from "./shadow";

const START = "2026-07-01";
const DAYS = Array.from({ length: 60 }, (_, i) => addBusinessDays(START, i));
const LAST = DAYS[DAYS.length - 1];
const SEED = 60600060;

let cast: Cast;
let sim: SimResult;

describe("sixty days of continuous trading", () => {
  beforeAll(async () => {
    vi.useFakeTimers();
    await resetLedger();
    cast = await loadCast();
    sim = await runSimulation(cast, { seed: SEED, days: DAYS });
    // Read-back happens "after" the last day so nothing is filtered out.
    vi.setSystemTime(new Date(`${LAST}T23:30:00+03:00`));
    actAs(cast.admin);
  }, 900_000);

  afterAll(() => vi.useRealTimers());

  const summary = async (from: string, to: string) =>
    expectOk(
      `summary ${from}..${to}`,
      await api.financialSummary(`?from=${from}&to=${to}`),
    );

  it("I4 — the whole period's revenue matches the shadow ledger exactly", async () => {
    const s = await summary(START, LAST);
    expect(money(s.consolidated.revenue)).toBe(sim.shadow.revenue(START, LAST));
  });

  it("I3 — gross = revenue − COGS, and net = gross − expenses", async () => {
    const s = await summary(START, LAST);
    const rev = money(s.consolidated.revenue);
    const cogs = money(s.consolidated.cogs);
    const gross = money(s.consolidated.grossProfit);
    const exp = money(s.consolidated.totalExpenses);
    const net = money(s.consolidated.netProfit);
    expect(gross).toBe(rev - cogs);
    expect(net).toBe(gross - exp);
  });

  it("I4b — total expenses match the shadow ledger", async () => {
    const s = await summary(START, LAST);
    expect(money(s.consolidated.totalExpenses)).toBe(
      sim.shadow.expenses(START, LAST),
    );
  });

  it("I1 — the sum of the 60 daily summaries equals the whole-period summary", async () => {
    let revenue = 0n;
    let cogs = 0n;
    let expenses = 0n;
    for (const day of DAYS) {
      const d = await summary(day, day);
      revenue += money(d.consolidated.revenue);
      cogs += money(d.consolidated.cogs);
      expenses += money(d.consolidated.totalExpenses);
    }
    const whole = await summary(START, LAST);
    expect(fmtMoney(revenue)).toBe(whole.consolidated.revenue);
    expect(fmtMoney(expenses)).toBe(whole.consolidated.totalExpenses);
    expect(fmtMoney(cogs)).toBe(whole.consolidated.cogs);
  });

  it("I2 — COGS telescopes across every split point of the 60 days", async () => {
    const whole = money((await summary(START, LAST)).consolidated.cogs);
    for (let i = 0; i < DAYS.length - 1; i++) {
      const mid = DAYS[i];
      const left = money((await summary(START, mid)).consolidated.cogs);
      const right = money(
        (await summary(DAYS[i + 1], LAST)).consolidated.cogs,
      );
      expect(
        fmtMoney(left + right),
        `COGS split at ${mid}: ${fmtMoney(left)} + ${fmtMoney(right)} != ${fmtMoney(whole)}`,
      ).toBe(fmtMoney(whole));
    }
  });

  it("I2b — revenue telescopes across every split point of the 60 days", async () => {
    const whole = money((await summary(START, LAST)).consolidated.revenue);
    for (let i = 0; i < DAYS.length - 1; i++) {
      const mid = DAYS[i];
      const left = money((await summary(START, mid)).consolidated.revenue);
      const right = money(
        (await summary(DAYS[i + 1], LAST)).consolidated.revenue,
      );
      expect(fmtMoney(left + right), `revenue split at ${mid}`).toBe(
        fmtMoney(whole),
      );
    }
  });

  it("I5 — every product/location stock balance matches the shadow, on every day", async () => {
    const keys = sim.shadow.allStockKeys();
    const byLocation = new Map<string, string[]>();
    for (const k of keys) {
      const [productId, locationId] = k.split("@");
      byLocation.set(locationId, [...(byLocation.get(locationId) ?? []), productId]);
    }
    const problems: string[] = [];
    for (const day of DAYS) {
      for (const [locationId, productIds] of byLocation) {
        const rows = expectOk(
          `balances ${locationId} ${day}`,
          await api.balances(
            `?productIds=${productIds.join(",")}&locationId=${locationId}&asOf=${day}`,
          ),
        );
        for (const row of rows) {
          const expected = sim.shadow.stockAsOf(
            stockKey(row.productId, locationId),
            day,
          );
          const actual = qty(row.quantity ?? row.balance ?? "0");
          if (actual !== expected) {
            problems.push(
              `${day} ${row.productId}@${locationId}: api=${fmtQty(actual)} shadow=${fmtQty(expected)}`,
            );
          }
        }
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("I6 — cash and M-Pesa balances match the shadow, on every day", async () => {
    // NOTE: `GET /api/money/balances` takes no `asOf` — it is always "now"
    // (it has no query schema at all). The per-day balance is read from the
    // financial summary instead, whose cashBalance / mpesaBankBalance ARE
    // point-in-time "as of the end of `to`" figures (ADR-57).
    const problems: string[] = [];
    for (const day of DAYS) {
      const s = await summary(START, day);
      const cash = money(s.consolidated.cashBalance);
      const mpesa = money(s.consolidated.mpesaBankBalance);
      if (cash !== sim.shadow.cashAsOf(day)) {
        problems.push(
          `${day} cash: api=${fmtMoney(cash)} shadow=${fmtMoney(sim.shadow.cashAsOf(day))}`,
        );
      }
      if (mpesa !== sim.shadow.mpesaAsOf(day)) {
        problems.push(
          `${day} mpesa: api=${fmtMoney(mpesa)} shadow=${fmtMoney(sim.shadow.mpesaAsOf(day))}`,
        );
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });

  it("I7 — debts owed to the business match the shadow at period end", async () => {
    const s = await summary(START, LAST);
    expect(money(s.consolidated.debtsOwedToBusiness)).toBe(
      sim.shadow.debtsAsOf(LAST),
    );
  });

  it("I8 — per-location revenue sums to the consolidated figure", async () => {
    const s = await summary(START, LAST);
    const sum = s.perLocation.reduce(
      (acc: bigint, l: any) => acc + money(l.revenue),
      0n,
    );
    expect(fmtMoney(sum)).toBe(s.consolidated.revenue);
  });
});
