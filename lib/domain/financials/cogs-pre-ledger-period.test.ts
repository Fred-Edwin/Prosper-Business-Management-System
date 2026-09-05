import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { setOpeningStock } from "@/lib/domain/stock";
import { addBusinessDays } from "@/lib/time";
import { getFinancialSummary } from "./get-financial-summary";
import {
  cleanupFinancialsTestData,
  setupFinancialsWorld,
  type FinancialsWorldCtx,
} from "./test-helpers";

/**
 * Regression — a period `from` that reaches back before the date opening
 * stock was recorded (owner-reported 2026-09-05: "This week"/"This month"
 * showed a wildly inflated net profit when the ledger only had data from
 * yesterday, while "Today" was correct).
 *
 * `cogsByLocationSweep` computes `Opening + Purchases − Closing`, which
 * assumes every non-purchase movement is consumption. An `opening` row is
 * not consumption and not an inflow of goods — it RESTATES a position.
 * When it was dated like an ordinary movement, any period beginning
 * before that date counted it in the closing term (`< end`) but could not
 * count it in the opening term (it is not at or before `start`), so the
 * baseline stock looked like it had materialised from nowhere and COGS
 * was dragged negative by the whole opening valuation.
 *
 * Note this is NOT a boundary-operator problem: for a week-long range the
 * opening row sits days INSIDE the period, so no `lt`/`lte` tweak and no
 * clamping of `start` reaches it. The fix instead separates `opening`
 * rows by TYPE — they join the opening term whenever the period can see
 * them at all — so they contribute equally to both sides of the
 * subtraction and net to zero.
 *
 *   DAY1 = a fixed date, this suite's ONLY stock activity anywhere.
 *     Ingredient "Flour" @ Store, buyingPrice 100, opening +40 → 4,000
 *     Goods "Soda" @ Restaurant, buyingPrice 40, opening +50   → 2,000
 *
 *   getFinancialSummary(DAY1 − 10, DAY1) [a "this week/month"-shaped range
 *   whose `from` predates the opening date]:
 *     opening → 6,000 (the restatement counts, wherever it sits)
 *     closing (as of DAY1) → 6,000 (same rows, nothing else moved)
 *     COGS = 0                            ← was −6,000 before the fix
 *
 *   getFinancialSummary(DAY1 − 10, DAY1 − 1) [entirely BEFORE the opening
 *   date — nothing existed yet]: COGS = 0. This case was already correct
 *   before the fix and is asserted to keep it that way: the `opening`
 *   rows are dated after this window's `end`, so they are outside BOTH
 *   terms and cannot fabricate a loss.
 *
 * The fixture is pinned to a fixed far-future `DAY1` rather than
 * `nairobiToday()`: vitest runs test files in parallel workers against one
 * shared Postgres, and several sibling suites date their own opening-stock
 * fixtures to "today". Keeping this suite's window exclusively its own
 * (no other suite dates movements this far out) lets the assertions be
 * direct absolute values instead of before/after deltas.
 */

const SCOPE = "cogs-pre-ledger-period";
const DAY1 = "2031-06-15";
const RANGE_FROM = addBusinessDays(DAY1, -10);
const PRE_LEDGER_TO = addBusinessDays(DAY1, -1);

describe("getFinancialSummary — a period starting before the ledger's opening stock", () => {
  let ctx: FinancialsWorldCtx;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld(SCOPE);

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

  it("a range spanning back before the opening date is COGS-neutral, same as the day-only figure (was −6,000 pre-fix)", async () => {
    const wideRange = await getFinancialSummary(RANGE_FROM, DAY1);
    expect(wideRange.consolidated.cogs).toBe("0.00");
    expect(wideRange.consolidated.grossProfit).toBe("0.00");
    expect(wideRange.consolidated.netProfit).toBe("0.00");

    const dayOnly = await getFinancialSummary(DAY1, DAY1);
    expect(dayOnly.consolidated.cogs).toBe(wideRange.consolidated.cogs);
  });

  it("a range entirely before the opening date has zero COGS impact", async () => {
    // Nothing exists inside [RANGE_FROM, PRE_LEDGER_TO] — opening stock
    // was dated DAY1, strictly after this window's `to`, so those rows are
    // outside BOTH the opening and the closing term. Guards the boundary
    // the fix must not overreach: `opening` rows join the opening term
    // only when dated `< end`, so a period that predates the ledger
    // entirely stays at 0 instead of booking a baseline it never held.
    const before = await getFinancialSummary(RANGE_FROM, PRE_LEDGER_TO);
    expect(before.consolidated.cogs).toBe("0.00");
    expect(before.consolidated.netProfit).toBe("0.00");
  });

  it("a pair whose tracking BEGINS mid-period charges only what it actually consumed", async () => {
    // The load-bearing case. Flour's opening (+40 @ 100 = 4,000) is dated
    // DAY1, which sits INSIDE this range rather than at either edge — the
    // shape no boundary operator on `start` can reach. On DAY1 it also
    // receives 10 (+1,000) and issues 25 out to the kitchen.
    //
    //   opening  4,000  (the restatement, wherever it sits in the range)
    // + purchases 1,000  (the receipt only)
    // − closing   2,500  ((40 + 10 − 25) × 100)
    // = COGS      2,500  — exactly the 25 units issued, and nothing else.
    //
    // Pre-fix the opening term missed the 4,000 entirely, giving −1,500:
    // a negative cost of goods that inflated profit by the whole baseline.
    await prisma.stockMovement.createMany({
      data: [
        {
          productId: ctx.ingredientId,
          locationId: ctx.locationIds.store,
          movementType: "purchase_receipt" as never,
          quantity: new Prisma.Decimal(10),
          recordedById: ctx.actorId,
          occurredAt: new Date(`${DAY1}T06:00:00+03:00`),
        },
        {
          productId: ctx.ingredientId,
          locationId: ctx.locationIds.store,
          movementType: "issue" as never,
          quantity: new Prisma.Decimal(-25),
          recordedById: ctx.actorId,
          occurredAt: new Date(`${DAY1}T09:00:00+03:00`),
        },
      ],
    });

    const summary = await getFinancialSummary(RANGE_FROM, DAY1);
    expect(summary.consolidated.cogs).toBe("2500.00");
  });
});
