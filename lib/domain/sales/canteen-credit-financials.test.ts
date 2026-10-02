import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFinancialSummary } from "@/lib/domain/financials";
import { dailyNetSeries } from "@/lib/domain/dashboard/trend-series";
import { recordRepayment } from "@/lib/domain/customers";
import { nairobiToday } from "@/lib/time";
import { recordCanteenCreditSale } from "./record-canteen-credit-sale";
import { voidCanteenCreditSale } from "./void-canteen-credit-sale";
import {
  cleanupSalesTestData,
  makeCustomer,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

const SCOPE = "creditfin";

// Client report 2026-10-02: canteen credit sales (and the repayments that
// settled them) didn't show in Financials or the Dashboard. A credit sale
// is revenue when made — it must reach the summary and the dashboard net
// series; the later repayment is cash in, never more revenue.
describe("canteen credit sale → Financials + Dashboard", () => {
  let ctx: CanteenTestCtx;
  let attendant: { userId: string; role: "canteen_attendant"; locationId: string };
  let customerId: string;

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
    attendant = {
      userId: ctx.attendantId,
      role: "canteen_attendant",
      locationId: ctx.canteenId,
    };
    customerId = await makeCustomer(ctx);
    await seedMovement(ctx, {
      productId: ctx.products[0].id,
      movementType: "opening",
      quantity: "50",
      occurredAt: new Date("2026-08-01T06:00:00Z"),
    });
  });
  afterEach(async () => {
    // Money rows FK the user; the shared cleanup doesn't know about them.
    await prisma.moneyMovement.deleteMany({ where: { recordedById: ctx.attendantId } });
    await prisma.repayment.deleteMany({ where: { recordedById: ctx.attendantId } });
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  // Other suites write to today concurrently, so assert on deltas.
  async function snapshot() {
    const today = nairobiToday();
    const [summary, series] = await Promise.all([
      getFinancialSummary(today, today),
      dailyNetSeries(today, today),
    ]);
    return {
      revenue: new Prisma.Decimal(summary.consolidated.revenue),
      net: new Prisma.Decimal(summary.consolidated.netProfit),
      debts: new Prisma.Decimal(summary.consolidated.debtsOwedToBusiness),
      cash: new Prisma.Decimal(summary.consolidated.cashBalance),
      seriesRevenue: series[0].revenue,
      seriesNet: series[0].net,
    };
  }

  it("counts the sale as revenue, leaves it alone on repayment, and reverses on void", async () => {
    const base = await snapshot();

    const sale = await recordCanteenCreditSale(
      { productId: ctx.products[0].id, customerId, quantity: "3" },
      attendant,
    ); // 3 × 60.00 = 180.00
    const afterSale = await snapshot();
    expect(afterSale.revenue.sub(base.revenue).toFixed(2)).toBe("180.00");
    expect(afterSale.debts.sub(base.debts).toFixed(2)).toBe("180.00");
    expect(afterSale.cash.toFixed(2)).toBe(base.cash.toFixed(2));
    // Dashboard series agrees with the summary to the cent.
    expect(afterSale.seriesRevenue.sub(base.seriesRevenue).toFixed(2)).toBe("180.00");
    expect(afterSale.seriesNet.sub(base.seriesNet).toFixed(2)).toBe(
      afterSale.net.sub(base.net).toFixed(2),
    );

    await recordRepayment(
      { customerId, amount: "100", account: "cash" },
      { actorId: ctx.attendantId, role: "canteen_attendant" },
    );
    const afterPay = await snapshot();
    expect(afterPay.cash.sub(afterSale.cash).toFixed(2)).toBe("100.00");
    expect(afterPay.debts.sub(afterSale.debts).toFixed(2)).toBe("-100.00");
    expect(afterPay.revenue.toFixed(2)).toBe(afterSale.revenue.toFixed(2));

    await voidCanteenCreditSale(sale.stockMovement.id, attendant);
    const afterVoid = await snapshot();
    expect(afterVoid.revenue.toFixed(2)).toBe(base.revenue.toFixed(2));
    expect(afterVoid.seriesRevenue.toFixed(2)).toBe(base.seriesRevenue.toFixed(2));
  });
});
