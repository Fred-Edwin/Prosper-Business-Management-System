import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getDerivedStockBalance } from "@/lib/domain/stock/derived-balance";
import { DomainError } from "./errors";
import { recordCanteenCreditSale } from "./record-canteen-credit-sale";
import { correctCanteenCreditSale } from "./correct-canteen-credit-sale";
import {
  cleanupSalesTestData,
  makeCustomer,
  seedMovement,
  setupCanteenTestData,
  type CanteenTestCtx,
} from "./test-helpers";

const SCOPE = "correctcreditsale";

describe("correctCanteenCreditSale", () => {
  let ctx: CanteenTestCtx;
  let attendantCtx: { userId: string; role: "canteen_attendant"; locationId: string };
  let adminCtx: { userId: string; role: "admin"; locationId: string };
  let customerId: string;

  beforeEach(async () => {
    ctx = await setupCanteenTestData(SCOPE);
    attendantCtx = {
      userId: ctx.attendantId,
      role: "canteen_attendant",
      locationId: ctx.canteenId,
    };
    adminCtx = { userId: ctx.adminId, role: "admin", locationId: ctx.canteenId };
    customerId = await makeCustomer(ctx);
    const [soda] = ctx.products;
    await seedMovement(ctx, {
      productId: soda.id,
      movementType: "opening",
      quantity: "50",
      occurredAt: new Date("2026-08-01T06:00:00Z"),
    });
  });
  afterEach(async () => {
    await cleanupSalesTestData(SCOPE);
  });
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("corrects the quantity, holding the original per-unit price stable", async () => {
    const [soda] = ctx.products; // sellingPrice 60.00
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "3" },
      attendantCtx,
    );

    const result = await correctCanteenCreditSale(
      { stockMovementId: sale.stockMovement.id, quantity: "5" },
      adminCtx,
    );

    expect(result.quantity).toBe("5.0000");
    expect(result.total).toBe("300.00"); // 5 × original 60.00, not a re-priced rate

    const balance = await getDerivedStockBalance({
      productId: soda.id,
      locationId: ctx.canteenId,
    });
    expect(balance.quantity.toString()).toBe("45.0000"); // 50 - 5

    const debtSum = await prisma.debt.aggregate({
      _sum: { amount: true },
      where: { sourceType: "canteen_credit_sale", sourceId: sale.stockMovement.id },
    });
    expect(debtSum._sum.amount?.toString()).toBe("300");
  });

  it("re-pricing is ignored even if the canteen's selling price later changes", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "2" },
      attendantCtx,
    );
    await prisma.productLocation.updateMany({
      where: { productId: soda.id, locationId: ctx.canteenId },
      data: { sellingPrice: "100.00" },
    });

    const result = await correctCanteenCreditSale(
      { stockMovementId: sale.stockMovement.id, quantity: "3" },
      adminCtx,
    );
    // delta = 1 unit × ORIGINAL 60.00 = 60.00, not 100.00
    expect(result.total).toBe("180.00");
  });

  it("rejects a non-admin actor", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "2" },
      attendantCtx,
    );
    await expect(
      correctCanteenCreditSale(
        { stockMovementId: sale.stockMovement.id, quantity: "3" },
        attendantCtx,
      ),
    ).rejects.toThrow(DomainError);
  });

  it("rejects correcting a correction", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "2" },
      attendantCtx,
    );
    const correction = await correctCanteenCreditSale(
      { stockMovementId: sale.stockMovement.id, quantity: "3" },
      adminCtx,
    );
    await expect(
      correctCanteenCreditSale(
        { stockMovementId: correction.stockMovementId, quantity: "4" },
        adminCtx,
      ),
    ).rejects.toThrow(/itself a correction/);
  });

  it("rejects a zero-delta (no-op) correction", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "3" },
      attendantCtx,
    );
    await expect(
      correctCanteenCreditSale(
        { stockMovementId: sale.stockMovement.id, quantity: "3" },
        adminCtx,
      ),
    ).rejects.toThrow(/same as the current/);
  });

  it("re-checks stock availability when the correction increases the sale", async () => {
    const [soda] = ctx.products; // 50 on hand
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "3" },
      attendantCtx,
    );
    await expect(
      correctCanteenCreditSale(
        { stockMovementId: sale.stockMovement.id, quantity: "1000" },
        adminCtx,
      ),
    ).rejects.toThrow(/Not enough Canteen stock/);
  });

  it("writes an AuditLog correct row with matching oldValue/newValue keys", async () => {
    const [soda] = ctx.products;
    const sale = await recordCanteenCreditSale(
      { productId: soda.id, customerId, quantity: "2" },
      attendantCtx,
    );
    await correctCanteenCreditSale(
      { stockMovementId: sale.stockMovement.id, quantity: "4" },
      adminCtx,
    );
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityType: "canteen_credit_sale",
        entityId: sale.stockMovement.id,
        action: "correct",
      },
    });
    expect(audit).not.toBeNull();
    const oldValue = audit?.oldValue as Record<string, unknown>;
    const newValue = audit?.newValue as Record<string, unknown>;
    expect(Object.keys(oldValue).sort()).toEqual(
      expect.arrayContaining(["quantity", "total"]),
    );
    expect(newValue.quantity).toBe("4.0000");
  });
});
