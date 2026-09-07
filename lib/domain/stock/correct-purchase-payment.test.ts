import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordPurchasePayment, recordPurchaseReceipt } from "./purchases";
import { correctPurchasePayment, voidPurchasePayment } from "./correct-purchase-payment";
import { listMovements } from "./list-movements";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "correct-purchase-payment";

const admin = (ctx: StockTestCtx) =>
  ({ userId: ctx.adminId, role: "admin", locationId: null }) as const;

/**
 * Net `purchase_payment` money effect for THIS test's product only — the
 * worker schema is shared across the whole suite, so an unscoped
 * `groupBy` on `sourceType: "purchase_payment"` picks up other tests'
 * rows. Scope by the movement ids belonging to `productId`.
 */
async function accountBalances(productId: string) {
  const movementIds = (
    await prisma.stockMovement.findMany({
      where: { productId, movementType: "purchase_payment" },
      select: { id: true },
    })
  ).map((m) => m.id);
  if (movementIds.length === 0) return { cash: 0, mpesa: 0 };
  const rows = await prisma.moneyMovement.groupBy({
    by: ["account"],
    _sum: { amount: true },
    where: { sourceType: "purchase_payment", sourceId: { in: movementIds } },
  });
  const by = new Map(rows.map((r) => [r.account, Number(r._sum.amount ?? 0)]));
  return { cash: by.get("cash") ?? 0, mpesa: by.get("mpesa_bank") ?? 0 };
}

describe("correctPurchasePayment / voidPurchasePayment (ADR-15)", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });
  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    // Each test starts from a clean ledger for this product.
    await prisma.stockMovement.updateMany({
      where: { productId: ctx.productId },
      data: { correctsMovementId: null },
    });
    const ms = await prisma.stockMovement.findMany({
      where: { productId: ctx.productId },
      select: { id: true },
    });
    await prisma.moneyMovement.deleteMany({
      where: {
        sourceType: "purchase_payment",
        sourceId: { in: ms.map((m) => m.id) },
      },
    });
    await prisma.stockMovement.deleteMany({ where: { productId: ctx.productId } });
    await prisma.product.update({
      where: { id: ctx.productId },
      data: { buyingPrice: 120 },
    });
  });

  async function seedPayment(over: Partial<Parameters<typeof recordPurchasePayment>[0]> = {}) {
    return recordPurchasePayment({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      supplier: "Chieni Wholesale",
      quantity: "10",
      cost: "1000",
      paidFromAccount: "mpesa_bank",
      recordedById: ctx.adminId,
      ...over,
    });
  }

  it("writes a signed delta correction row and moves the money ledger by the delta", async () => {
    const original = await seedPayment(); // 1000 out of mpesa
    expect((await accountBalances(ctx.productId)).mpesa).toBe(-1000);

    await correctPurchasePayment(
      {
        movementId: original.id,
        supplier: "Chieni Wholesale",
        orderedQty: "10",
        cost: "600", // corrected down by 400
        paidFromAccount: "mpesa_bank",
        recordedById: ctx.adminId,
      },
      admin(ctx),
    );

    // A correction row exists, quantity 0, carrying the -400 cost delta.
    const rows = await prisma.stockMovement.findMany({
      where: { productId: ctx.productId, movementType: "purchase_payment" },
      orderBy: { createdAt: "asc" },
    });
    expect(rows).toHaveLength(2);
    expect(rows[1].correctsMovementId).toBe(original.id);
    expect(Number(rows[1].quantity)).toBe(0);
    expect(Number(rows[1].purchaseTotalCost)).toBe(-400);

    // Money ledger nets to -600 on mpesa.
    expect((await accountBalances(ctx.productId)).mpesa).toBe(-600);

    // Catalog buying price follows the corrected payment: 600 / 10.
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: ctx.productId },
    });
    expect(Number(product.buyingPrice)).toBe(60);
  });

  it("folds the correction into the Stock Purchases list — one row, current values", async () => {
    const original = await seedPayment();
    await correctPurchasePayment(
      {
        movementId: original.id,
        supplier: "Chieni Wholesale Ltd",
        orderedQty: "12",
        cost: "600",
        paidFromAccount: "cash",
        recordedById: ctx.adminId,
      },
      admin(ctx),
    );

    const list = await listMovements(
      { movementType: "purchase_payment", productId: ctx.productId },
      admin(ctx),
    );
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(original.id);
    expect(list[0].purchaseSupplier).toBe("Chieni Wholesale Ltd");
    expect(list[0].purchaseOrderedQty).toBe("12.0000");
    expect(list[0].purchaseTotalCost).toBe("600.00");
    expect(list[0].purchasePaidFrom).toBe("cash");
  });

  it("changing the paid-from account writes both legs and both balances end correct", async () => {
    const original = await seedPayment({ cost: "800", paidFromAccount: "mpesa_bank" });
    await correctPurchasePayment(
      {
        movementId: original.id,
        supplier: "Chieni Wholesale",
        orderedQty: "10",
        cost: "800", // same cost, only the account changed
        paidFromAccount: "cash",
        recordedById: ctx.adminId,
      },
      admin(ctx),
    );
    const bal = await accountBalances(ctx.productId);
    expect(bal.mpesa).toBe(0); // refunded
    expect(bal.cash).toBe(-800); // re-debited
  });

  it("re-submitting the same values is rejected (delta 0, nothing changed)", async () => {
    const original = await seedPayment();
    await expect(
      correctPurchasePayment(
        {
          movementId: original.id,
          supplier: "Chieni Wholesale",
          orderedQty: "10",
          cost: "1000",
          paidFromAccount: "mpesa_bank",
          recordedById: ctx.adminId,
        },
        admin(ctx),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("a correction row cannot itself be corrected", async () => {
    const original = await seedPayment();
    await correctPurchasePayment(
      {
        movementId: original.id,
        supplier: "Chieni Wholesale",
        orderedQty: "10",
        cost: "500",
        paidFromAccount: "mpesa_bank",
        recordedById: ctx.adminId,
      },
      admin(ctx),
    );
    const correction = await prisma.stockMovement.findFirstOrThrow({
      where: { correctsMovementId: original.id },
    });
    await expect(
      correctPurchasePayment(
        {
          movementId: correction.id,
          supplier: "x",
          orderedQty: "1",
          cost: "1",
          paidFromAccount: "cash",
          recordedById: ctx.adminId,
        },
        admin(ctx),
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("rejects correcting a payment that a delivery is matched to (CONFLICT)", async () => {
    const original = await seedPayment();
    await recordPurchaseReceipt({
      productId: ctx.productId,
      locationId: ctx.locationIds.store,
      quantity: "10",
      purchasePaymentId: original.id,
      recordedById: ctx.adminId,
    });
    await expect(
      correctPurchasePayment(
        {
          movementId: original.id,
          supplier: "Chieni Wholesale",
          orderedQty: "10",
          cost: "900",
          paidFromAccount: "mpesa_bank",
          recordedById: ctx.adminId,
        },
        admin(ctx),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("non-admin is FORBIDDEN", async () => {
    const original = await seedPayment();
    await expect(
      correctPurchasePayment(
        {
          movementId: original.id,
          supplier: "x",
          orderedQty: "10",
          cost: "900",
          paidFromAccount: "mpesa_bank",
          recordedById: ctx.recorderId,
        },
        { userId: ctx.recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  describe("voidPurchasePayment", () => {
    it("reverses the payment, refunds the account, and restores the prior buying price", async () => {
      const original = await seedPayment(); // -1000 mpesa; price → 100
      expect(
        Number(
          (
            await prisma.product.findUniqueOrThrow({ where: { id: ctx.productId } })
          ).buyingPrice,
        ),
      ).toBe(100);

      await voidPurchasePayment(original.id, admin(ctx));

      expect((await accountBalances(ctx.productId)).mpesa).toBe(0);
      const product = await prisma.product.findUniqueOrThrow({
        where: { id: ctx.productId },
      });
      expect(Number(product.buyingPrice)).toBe(120); // rolled back to the seed value

      // A reversal row is present.
      const reversal = await prisma.stockMovement.findFirstOrThrow({
        where: { correctsMovementId: original.id },
      });
      expect(Number(reversal.purchaseTotalCost)).toBe(-1000);
    });

    it("voiding an already-voided payment is rejected", async () => {
      const original = await seedPayment();
      await voidPurchasePayment(original.id, admin(ctx));
      await expect(
        voidPurchasePayment(original.id, admin(ctx)),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    });
  });

  it("writes an audit-log row with matching was/now keys", async () => {
    const original = await seedPayment();
    await correctPurchasePayment(
      {
        movementId: original.id,
        supplier: "Chieni Wholesale",
        orderedQty: "10",
        cost: "700",
        paidFromAccount: "mpesa_bank",
        recordedById: ctx.adminId,
      },
      admin(ctx),
    );
    const log = await prisma.auditLog.findFirstOrThrow({
      where: { entityType: "stock_movement", entityId: original.id, action: "correct" },
    });
    const oldV = log.oldValue as Record<string, unknown>;
    const newV = log.newValue as Record<string, unknown>;
    expect(oldV.purchaseTotalCost).toBe("1000.00");
    expect(newV.purchaseTotalCost).toBe("700.00");
  });
});
