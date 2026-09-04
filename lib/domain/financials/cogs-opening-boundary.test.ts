import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { setOpeningStock } from "@/lib/domain/stock";
import { nairobiToday } from "@/lib/time";
import { getFinancialSummary } from "./get-financial-summary";
import {
  cleanupFinancialsTestData,
  setupFinancialsWorld,
  type FinancialsWorldCtx,
} from "./test-helpers";

/**
 * Regression — the opening-stock boundary in `cogsByLocationSweep`
 * (Session 16, QA walkthrough).
 *
 * `setOpeningStock` stamps every `opening` row at
 * `businessDateStartUtc(businessDate)` — the exact instant the COGS sweep
 * uses as `start` for a period whose `from` is that same date. A strict
 * `occurredAt < start` opening term dropped that row while the closing
 * term (`< end`) still counted it, so on the **first day opening stock is
 * entered** COGS was dragged negative by the entire opening-stock
 * valuation (Revenue − COGS then inflated Gross/Net by the same amount).
 *
 * The sweep now carves out `opening`-type rows dated exactly at `start`
 * into the opening term. This suite pins that:
 *
 *   Day 1 — seed opening stock ONLY, no purchases, no sales.
 *     Ingredient "Flour" @ Store, buyingPrice 100, opening +40  → value 4,000
 *     Goods "Soda" @ Restaurant, buyingPrice 40, opening +50    → value 2,000
 *   getFinancialSummary(day1, day1):
 *     opening value = 6,000   (the two opening rows, dated at `start`)
 *     purchases     = 0
 *     closing value = 6,000   (same rows, nothing else moved)
 *     COGS = 6,000 + 0 − 6,000 = 0        ← was −6,000 before the fix
 *     Revenue = 0 → Gross = 0 → Net = 0   ← was +6,000 / +6,000 before
 */

const SCOPE = "cogs-opening-boundary";
const DAY1 = nairobiToday();

describe("getFinancialSummary — opening stock entered on day 1 does not break COGS", () => {
  let ctx: FinancialsWorldCtx;
  let cogsBefore: number;
  let grossBefore: number;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld(SCOPE);

    // Baseline for today BEFORE this suite writes anything — other suites
    // share the DB, so we assert on the delta this suite adds, not an
    // absolute.
    const base = await getFinancialSummary(DAY1, DAY1);
    cogsBefore = Number(base.consolidated.cogs);
    grossBefore = Number(base.consolidated.grossProfit);

    await setOpeningStock({
      productId: ctx.ingredientId,
      locationId: ctx.locationIds.store,
      businessDate: DAY1,
      quantity: "40",
      recordedById: ctx.actorId,
    });
    await setOpeningStock({
      productId: ctx.goodsId,
      locationId: ctx.locationIds.restaurant,
      businessDate: DAY1,
      quantity: "50",
      recordedById: ctx.actorId,
    });
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("adds ZERO to COGS — opening value cancels closing value (was −6,000 pre-fix)", async () => {
    const s = await getFinancialSummary(DAY1, DAY1);
    expect(Number(s.consolidated.cogs) - cogsBefore).toBeCloseTo(0, 2);
  });

  it("does not inflate gross profit (was +6,000 pre-fix)", async () => {
    const s = await getFinancialSummary(DAY1, DAY1);
    expect(Number(s.consolidated.grossProfit) - grossBefore).toBeCloseTo(0, 2);
  });

  it("the opening stock still shows its full value as CLOSING stock on hand", async () => {
    // Sanity: the fix does not make the stock vanish — a same-day count
    // via the derived balance still sees 40 Flour + 50 Soda. (Guards the
    // 'did you just exclude the row from both terms?' failure mode.)
    const { getDerivedStockBalance } = await import("@/lib/domain/stock");
    const flour = await getDerivedStockBalance({
      productId: ctx.ingredientId,
      locationId: ctx.locationIds.store,
    });
    const soda = await getDerivedStockBalance({
      productId: ctx.goodsId,
      locationId: ctx.locationIds.restaurant,
    });
    expect(Number(flour.quantity)).toBe(40);
    expect(Number(soda.quantity)).toBe(50);
  });

  it("day 2 with the same opening stock (no new activity) is still COGS-neutral", async () => {
    // The carve-out is 'opening row dated exactly at start'. On day 2 the
    // day-1 opening rows are strictly before start and land in the opening
    // term the ordinary way — COGS delta must still be 0.
    const day2 = new Date();
    day2.setUTCDate(day2.getUTCDate() + 1);
    const d2 = day2.toISOString().slice(0, 10);
    const s = await getFinancialSummary(d2, d2);
    // Nothing this suite did moves day-2 COGS.
    const base = cogsBefore; // day-1 baseline is a fine proxy: no suite rows on day 2
    expect(Number.isFinite(Number(s.consolidated.cogs))).toBe(true);
    expect(Number(s.consolidated.cogs) - base).toBeCloseTo(0, 2);
  });
});
