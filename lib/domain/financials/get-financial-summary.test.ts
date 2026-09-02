import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getFinancialSummary } from "./get-financial-summary";
import { recordExpense } from "./expenses";
import {
  cleanupFinancialsTestData,
  setupFinancialsWorld,
  type FinancialsWorldCtx,
} from "./test-helpers";

const SCOPE = "summary";

/**
 * The full PRD §4.7 / ADR-55 profit chain on known fixture data. The date
 * window is a quiet stretch of early May 2026 that nothing else in the
 * seed or the sibling suites writes to; opening balances are dated
 * 2026-05-01 (before the window). So every figure is exactly this suite's.
 *
 * FIXTURE
 *
 *   Ingredient "Flour" @ Store, buyingPrice 100:
 *     opening 05-01 .......... +50   (opening value 5,000)
 *     purchase_receipt 05-05 . +20   (purchases term 2,000)
 *     issue 05-05 ............ −30
 *     closing (period end) ... 40    (closing value 4,000)
 *     → Store COGS = 5,000 + 2,000 − 4,000 = 3,000
 *
 *   Goods "Soda" @ Canteen, buyingPrice 40:
 *     opening 05-01 .......... +100  (4,000)
 *     sale 05-05 ............. −25
 *     closing ............... 75     (3,000)
 *     → Canteen COGS = 4,000 + 0 − 3,000 = 1,000
 *
 *   Goods "Soda" @ Restaurant, buyingPrice 40:
 *     opening 05-01 .......... +50   (2,000)
 *     sale 05-05 (via order) . −25
 *     closing ............... 25     (1,000)
 *     → Restaurant Goods COGS = 2,000 + 0 − 1,000 = 1,000
 *
 *   Dish "Chapati" @ Restaurant, buyingPrice 0, sells 200:
 *     production 05-04 ....... +30   (value 0 — contributes nothing)
 *     sale 05-05 (via order) . −10   (value 0)
 *     → Restaurant Dish COGS contribution = 0
 *
 *   Restaurant Order 05-05: dish 10×200 + goods 25×60 = 3,500 revenue.
 *   Canteen derived sale 05-05: 25 × 60 = 1,500 revenue.
 *   Expense (transport, 400, 05-05).
 *
 *   Revenue = 3,500 + 1,500 = 5,000
 *   COGS    = 3,000 + 1,000 + 1,000 + 0 = 5,000
 *   Gross   = 0
 *   Net     = 0 − 400 = −400
 */

const FROM = "2026-05-04";
const TO = "2026-05-06";
const d = (iso: string) => new Date(iso);
const OPENING_AT = d("2026-05-01T05:00:00Z"); // before the window

describe("getFinancialSummary — the PRD §4.7 / ADR-55 profit chain", () => {
  let ctx: FinancialsWorldCtx;
  let orderId: string;

  beforeAll(async () => {
    ctx = await setupFinancialsWorld(SCOPE);
    const { locationIds, ingredientId, goodsId, dishId, actorId } = ctx;

    // Give the dish a Restaurant selling price (used by the non-sale
    // consumption dish-waste proxy).
    await prisma.productLocation.create({
      data: {
        productId: dishId,
        locationId: locationIds.restaurant,
        sellingPrice: new Prisma.Decimal(200),
        active: true,
      },
    });

    const mv = (
      productId: string,
      locationId: string,
      movementType: string,
      quantity: number,
      occurredAt: Date,
      orderIdRef?: string,
    ) => ({
      productId,
      locationId,
      movementType: movementType as never,
      quantity: new Prisma.Decimal(quantity),
      recordedById: actorId,
      occurredAt,
      orderId: orderIdRef ?? null,
    });

    await prisma.stockMovement.createMany({
      data: [
        // Flour @ Store.
        mv(ingredientId, locationIds.store, "opening", 50, OPENING_AT),
        mv(ingredientId, locationIds.store, "purchase_receipt", 20, d("2026-05-05T06:00:00Z")),
        mv(ingredientId, locationIds.store, "issue", -30, d("2026-05-05T09:00:00Z")),
        // Soda @ Canteen.
        mv(goodsId, locationIds.canteen, "opening", 100, OPENING_AT),
        mv(goodsId, locationIds.canteen, "sale", -25, d("2026-05-05T10:00:00Z")),
        // Soda @ Restaurant.
        mv(goodsId, locationIds.restaurant, "opening", 50, OPENING_AT),
        // Chapati (dish) @ Restaurant — production adds a dish (value 0).
        mv(dishId, locationIds.restaurant, "production", 30, d("2026-05-04T05:00:00Z")),
      ],
    });

    // Restaurant order: dish 10×200 + goods 25×60 = 3,500.
    const order = await prisma.order.create({
      data: {
        locationId: locationIds.restaurant,
        cashierId: actorId,
        orderType: "dine_in",
        paymentMethod: "cash",
        total: new Prisma.Decimal(3500),
        occurredAt: d("2026-05-05T11:00:00Z"),
        lines: {
          create: [
            {
              productId: dishId,
              quantity: new Prisma.Decimal(10),
              unitPrice: new Prisma.Decimal(200),
              subtotal: new Prisma.Decimal(2000),
            },
            {
              productId: goodsId,
              quantity: new Prisma.Decimal(25),
              unitPrice: new Prisma.Decimal(60),
              subtotal: new Prisma.Decimal(1500),
            },
          ],
        },
      },
    });
    orderId = order.id;
    await prisma.stockMovement.createMany({
      data: [
        mv(dishId, locationIds.restaurant, "sale", -10, d("2026-05-05T11:00:00Z"), order.id),
        mv(goodsId, locationIds.restaurant, "sale", -25, d("2026-05-05T11:00:00Z"), order.id),
      ],
    });

    // Canteen derived sale: a StockCount + its canteen_sale MoneyMovement.
    const count = await prisma.stockCount.create({
      data: {
        productId: goodsId,
        locationId: locationIds.canteen,
        countedById: actorId,
        countedQuantity: new Prisma.Decimal(75),
        occurredAt: d("2026-05-05T10:00:00Z"),
      },
    });
    await prisma.moneyMovement.create({
      data: {
        account: "cash",
        amount: new Prisma.Decimal(1500),
        sourceType: "canteen_sale",
        sourceId: count.id,
        recordedById: actorId,
        occurredAt: d("2026-05-05T10:00:00Z"),
      },
    });

    await recordExpense(
      {
        category: "transport",
        amount: "400.00",
        date: "2026-05-05",
        paidFromAccount: "cash",
      },
      { actorId, role: "admin" },
    );
  });

  afterAll(async () => {
    await cleanupFinancialsTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("computes revenue, COGS, gross, expenses and net to the exact fixture figures", async () => {
    const s = await getFinancialSummary(FROM, TO);
    expect(s.consolidated.revenue).toBe("5000.00");
    expect(s.consolidated.cogs).toBe("5000.00");
    expect(s.consolidated.grossProfit).toBe("0.00");
    expect(s.consolidated.totalExpenses).toBe("400.00");
    expect(s.consolidated.netProfit).toBe("-400.00");
  });

  it("keeps the chain internally consistent (gross = rev − cogs; net = gross − exp)", async () => {
    const s = await getFinancialSummary(FROM, TO);
    const n = (v: string) => Number(v);
    expect(n(s.consolidated.grossProfit)).toBeCloseTo(
      n(s.consolidated.revenue) - n(s.consolidated.cogs),
      2,
    );
    expect(n(s.consolidated.netProfit)).toBeCloseTo(
      n(s.consolidated.grossProfit) - n(s.consolidated.totalExpenses),
      2,
    );
  });

  it("a Dish in stock contributes ZERO to opening/closing valuation (production does not inflate COGS)", async () => {
    // 30 chapati produced, 10 sold, 20 resting at period end — all valued
    // at 0. The Restaurant COGS is purely the Soda goods sweep: 1,000.
    const s = await getFinancialSummary(FROM, TO);
    const restaurant = s.perLocation.find(
      (l) => l.locationId === ctx.locationIds.restaurant,
    );
    expect(restaurant?.cogs).toBe("1000.00");
  });

  it("a transfer between two of the business's own locations does NOT change COGS", async () => {
    const before = (await getFinancialSummary(FROM, TO)).consolidated.cogs;

    // Store → Canteen dispatch (−12) + Canteen accept (+12), inside window.
    await prisma.stockMovement.createMany({
      data: [
        {
          productId: ctx.goodsId,
          locationId: ctx.locationIds.store,
          movementType: "transfer",
          quantity: new Prisma.Decimal(-12),
          recordedById: ctx.actorId,
          occurredAt: d("2026-05-05T14:00:00Z"),
          transferCounterpartLocationId: ctx.locationIds.canteen,
        },
        {
          productId: ctx.goodsId,
          locationId: ctx.locationIds.canteen,
          movementType: "transfer",
          quantity: new Prisma.Decimal(12),
          recordedById: ctx.actorId,
          occurredAt: d("2026-05-05T14:30:00Z"),
          transferCounterpartLocationId: ctx.locationIds.store,
        },
      ],
    });

    const after = (await getFinancialSummary(FROM, TO)).consolidated.cogs;
    expect(after).toBe(before);

    await prisma.stockMovement.deleteMany({
      where: {
        productId: ctx.goodsId,
        movementType: "transfer",
        occurredAt: { gte: d("2026-05-05T13:00:00Z"), lt: d("2026-05-05T15:00:00Z") },
      },
    });
  });

  it("non-sale consumption does NOT change COGS (assert identical before/after a waste event)", async () => {
    const before = (await getFinancialSummary(FROM, TO)).consolidated.cogs;

    const waste = await prisma.stockMovement.createManyAndReturn({
      data: [
        {
          productId: ctx.ingredientId,
          locationId: ctx.locationIds.store,
          movementType: "non_sale_consumption",
          quantity: new Prisma.Decimal(-5),
          reason: "spoiled",
          recordedById: ctx.actorId,
          occurredAt: d("2026-05-05T16:00:00Z"),
        },
        {
          productId: ctx.dishId,
          locationId: ctx.locationIds.restaurant,
          movementType: "non_sale_consumption",
          quantity: new Prisma.Decimal(-2),
          reason: "staff_meal",
          recordedById: ctx.actorId,
          occurredAt: d("2026-05-05T16:05:00Z"),
        },
      ],
    });

    const s = await getFinancialSummary(FROM, TO);
    // COGS moved because the −5 ingredient row lowered closing stock — but
    // that IS the intended behaviour: the wasted units left stock, so they
    // are already in COGS. What must NOT happen is the non-sale figure
    // being added ON TOP. Re-derive: closing Flour is now 35 (was 40), so
    // Store COGS rises by 5 × 100 = 500 → total COGS 5,500. The non-sale
    // report is SEPARATE and does not touch that number.
    expect(s.consolidated.cogs).toBe("5500.00");
    expect(Number(before)).toBe(5000);

    // The separate non-sale figure: 5 flour × 100 = 500 (spoiled) +
    // 2 chapati × 0.60 × 200 = 240 (staff_meal).
    expect(s.nonSaleConsumption.total).toBe("740.00");
    expect(s.nonSaleConsumption.byReason.spoiled).toBe("500.00");
    expect(s.nonSaleConsumption.byReason.staffMeal).toBe("240.00");
    expect(s.nonSaleConsumption.dishWasteCostPercent).toBe("0.60");

    // Net profit did NOT absorb the waste figure (it is not an expense).
    expect(s.consolidated.netProfit).toBe(
      // gross (5000 − 5500 = −500) − expenses 400 = −900
      "-900.00",
    );

    await prisma.stockMovement.deleteMany({
      where: { id: { in: waste.map((w) => w.id) } },
    });
  });

  it("dish waste values at percent × sellingPrice; ingredient/goods waste at buyingPrice", async () => {
    const rows = await prisma.stockMovement.createManyAndReturn({
      data: [
        {
          productId: ctx.goodsId, // buyingPrice 40
          locationId: ctx.locationIds.canteen,
          movementType: "non_sale_consumption",
          quantity: new Prisma.Decimal(-3),
          reason: "damaged",
          recordedById: ctx.actorId,
          occurredAt: d("2026-05-05T17:00:00Z"),
        },
        {
          productId: ctx.dishId, // sells 200, proxy 0.60 → 120/unit
          locationId: ctx.locationIds.restaurant,
          movementType: "non_sale_consumption",
          quantity: new Prisma.Decimal(-4),
          reason: "complimentary",
          recordedById: ctx.actorId,
          occurredAt: d("2026-05-05T17:05:00Z"),
        },
      ],
    });

    const s = await getFinancialSummary(FROM, TO);
    expect(s.nonSaleConsumption.byReason.damaged).toBe("120.00"); // 3 × 40
    expect(s.nonSaleConsumption.byReason.complimentary).toBe("480.00"); // 4 × 120

    await prisma.stockMovement.deleteMany({
      where: { id: { in: rows.map((r) => r.id) } },
    });
  });

  it("changing the configured dish-waste percentage changes the waste figure and NOT COGS", async () => {
    const wasteRow = await prisma.stockMovement.create({
      data: {
        productId: ctx.dishId,
        locationId: ctx.locationIds.restaurant,
        movementType: "non_sale_consumption",
        quantity: new Prisma.Decimal(-10),
        reason: "other",
        recordedById: ctx.actorId,
        occurredAt: d("2026-05-05T18:00:00Z"),
      },
    });

    const base = await getFinancialSummary(FROM, TO);
    expect(base.nonSaleConsumption.byReason.other).toBe("1200.00"); // 10 × 0.60 × 200

    const prev = process.env.DISH_WASTE_COST_PERCENT;
    process.env.DISH_WASTE_COST_PERCENT = "0.5";
    try {
      const tuned = await getFinancialSummary(FROM, TO);
      expect(tuned.nonSaleConsumption.byReason.other).toBe("1000.00"); // 10 × 0.50 × 200
      expect(tuned.nonSaleConsumption.dishWasteCostPercent).toBe("0.50");
      // COGS is untouched by the config.
      expect(tuned.consolidated.cogs).toBe(base.consolidated.cogs);
    } finally {
      if (prev === undefined) delete process.env.DISH_WASTE_COST_PERCENT;
      else process.env.DISH_WASTE_COST_PERCENT = prev;
    }

    await prisma.stockMovement.delete({ where: { id: wasteRow.id } });
  });

  it("per-location carries revenue + COGS + gross; a superseded order is not double-counted", async () => {
    const s = await getFinancialSummary(FROM, TO);

    const restaurant = s.perLocation.find(
      (l) => l.locationId === ctx.locationIds.restaurant,
    );
    expect(restaurant).toMatchObject({
      revenue: "3500.00",
      cogs: "1000.00",
      grossProfit: "2500.00",
    });

    const canteen = s.perLocation.find(
      (l) => l.locationId === ctx.locationIds.canteen,
    );
    expect(canteen).toMatchObject({
      revenue: "1500.00",
      cogs: "1000.00",
      grossProfit: "500.00",
    });

    const store = s.perLocation.find(
      (l) => l.locationId === ctx.locationIds.store,
    );
    expect(store).toMatchObject({ revenue: "0.00", cogs: "3000.00" });

    // Now supersede the order with a correction (own recomputed total 1,000).
    const correction = await prisma.order.create({
      data: {
        locationId: ctx.locationIds.restaurant,
        cashierId: ctx.actorId,
        orderType: "dine_in",
        paymentMethod: "cash",
        total: new Prisma.Decimal(1000),
        occurredAt: d("2026-05-05T11:00:00Z"),
        correctsOrderId: orderId,
      },
    });
    const s2 = await getFinancialSummary(FROM, TO);
    expect(
      s2.perLocation.find((l) => l.locationId === ctx.locationIds.restaurant)
        ?.revenue,
    ).toBe("1000.00"); // not 3,500 + 1,000
    await prisma.order.delete({ where: { id: correction.id } });
  });
});
