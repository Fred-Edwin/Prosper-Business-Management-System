import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  applyLegacySoldRepair,
  planLegacySoldRepair,
} from "../../../scripts/repair-legacy-sold-corrections";
import { cleanupSalesTestData, setupCanteenTestData, type CanteenTestCtx } from "./test-helpers";

const SCOPE = "repairsold";

// ADR-92 one-off repair: a pre-ADR-92 Sold edit left a stock-only `sale`
// delta (correctsMovementId set, no order/count/customer). The repair
// writes its missing revenue at the corrected sale's price.
describe("repair-legacy-sold-corrections", () => {
  let ctx: CanteenTestCtx;

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function saleRow(data: Partial<Prisma.StockMovementUncheckedCreateInput>) {
    const [soda] = ctx.products;
    return prisma.stockMovement.create({
      data: {
        productId: soda.id,
        locationId: ctx.canteenId,
        movementType: "sale",
        quantity: new Prisma.Decimal("-10"),
        recordedById: ctx.attendantId,
        occurredAt: new Date("2025-10-05T12:00:00Z"),
        ...data,
      },
    });
  }

  it("prices an orphan off its stock count, skips legit corrections, and is idempotent", async () => {
    const [soda] = ctx.products; // current price 60.00
    // A count that sold 10 for 500 (i.e. 50/unit — an older price).
    const count = await prisma.stockCount.create({
      data: {
        productId: soda.id,
        locationId: ctx.canteenId,
        countedById: ctx.attendantId,
        countedQuantity: new Prisma.Decimal("0"),
        occurredAt: new Date("2025-10-05T12:00:00Z"),
      },
    });
    const countSale = await saleRow({ stockCountId: count.id });
    await prisma.moneyMovement.create({
      data: {
        account: "cash",
        amount: new Prisma.Decimal("500"),
        sourceType: "canteen_sale",
        sourceId: count.id,
        recordedById: ctx.attendantId,
        occurredAt: count.occurredAt,
      },
    });

    // Owner took 4 off Sold via the old path: orphan +4.
    const orphan = await saleRow({ quantity: new Prisma.Decimal("4"), correctsMovementId: countSale.id });
    // A legit credit-sale correction (customerId set) — must be left alone.
    const customer = await prisma.customer.create({ data: { name: `${ctx.prefix} C`, phone: "0" } });
    await saleRow({ quantity: new Prisma.Decimal("1"), correctsMovementId: countSale.id, customerId: customer.id });

    const plan = (await planLegacySoldRepair(prisma)).filter((p) => p.stockMovementId === orphan.id);
    const allMine = (await planLegacySoldRepair(prisma)).filter((p) => p.productName === soda.name);
    expect(allMine).toHaveLength(1);
    expect(plan[0]).toMatchObject({ unitPrice: "50.00", priceSource: "stock_count", revenue: "-200.00" });

    expect(await applyLegacySoldRepair(prisma, plan)).toBe(1);
    const money = await prisma.moneyMovement.findFirstOrThrow({ where: { stockMovementId: orphan.id } });
    expect(money.sourceType).toBe("sale_adjustment");
    expect(money.amount.toFixed(2)).toBe("-200.00");
    expect(money.occurredAt.getTime()).toBe(orphan.occurredAt.getTime());

    // Idempotent: nothing left to plan, and re-applying the old plan writes nothing.
    expect((await planLegacySoldRepair(prisma)).filter((p) => p.productName === soda.name)).toHaveLength(0);
    expect(await applyLegacySoldRepair(prisma, plan)).toBe(0);
  });

  it("falls back to the current selling price when the corrected sale has no price source", async () => {
    const [soda] = ctx.products;
    const bare = await saleRow({});
    const orphan = await saleRow({ quantity: new Prisma.Decimal("-3"), correctsMovementId: bare.id });
    const [p] = (await planLegacySoldRepair(prisma)).filter((r) => r.stockMovementId === orphan.id);
    expect(p).toMatchObject({ unitPrice: "60.00", priceSource: "current_price", revenue: "180.00" });
    expect(p.productName).toBe(soda.name);
  });
});
