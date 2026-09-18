import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import { recordPurchaseReceipt } from "./purchases";
import { getDerivedStockBalance } from "./derived-balance";
import { correctStockBalance } from "./correct-stock-balance";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "correct-balance";

describe("correctStockBalance", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("non-admin actor: FORBIDDEN", async () => {
    const { productId, locationIds, recorderId } = ctx;
    const locationId = locationIds.store;

    await expect(
      correctStockBalance(
        {
          productId,
          locationId,
          correctedBalance: "0",
          recordedById: recorderId,
        },
        { userId: recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });
  });

  it("admin corrects a non-zero balance to zero: writes one variance row, leaves history intact, balance lands exactly on zero", async () => {
    const { productId, locationIds, recorderId, adminId } = ctx;
    const locationId = locationIds.store;

    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "7.5",
      recordedById: recorderId,
    });

    const before = await getDerivedStockBalance({ productId, locationId });
    expect(before.quantity).toBe("7.5000");

    const correction = await correctStockBalance(
      {
        productId,
        locationId,
        correctedBalance: "0",
        note: "Client requested reset to zero",
        recordedById: adminId,
      },
      { userId: adminId, role: "admin", locationId: null },
    );

    expect(correction.quantity).toBe("-7.5000");
    expect(correction.movementType).toBe("variance");
    expect(correction.correctsMovementId).toBeNull();

    // The original receipt is untouched.
    const originalRow = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    expect(originalRow.quantity.toFixed(4)).toBe("7.5000");

    const after = await getDerivedStockBalance({ productId, locationId });
    expect(after.quantity).toBe("0.0000");

    // AuditLog carries a was→now balance pair.
    const auditRow = await prisma.auditLog.findFirst({
      where: { entityId: correction.id, action: "correct" },
    });
    expect(auditRow?.oldValue).toMatchObject({ balance: "7.5000" });
    expect(auditRow?.newValue).toMatchObject({ balance: "0.0000" });
  });

  it("rejects a no-op correction (delta zero)", async () => {
    const { goodsProductId: productId, locationIds, recorderId, adminId } = ctx;
    const locationId = locationIds.restaurant;

    await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "10",
      recordedById: recorderId,
    });

    await expect(
      correctStockBalance(
        {
          productId,
          locationId,
          correctedBalance: "10",
          recordedById: adminId,
        },
        { userId: adminId, role: "admin", locationId: null },
      ),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "correctedBalance",
    });
  });

  it("a repeated correction to the same target is a no-op the second time", async () => {
    const { goodsProductId: productId, locationIds, recorderId, adminId } = ctx;
    const locationId = locationIds.canteen;

    await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "12",
      recordedById: recorderId,
    });

    const first = await correctStockBalance(
      { productId, locationId, correctedBalance: "0", recordedById: adminId },
      { userId: adminId, role: "admin", locationId: null },
    );
    expect(first.quantity).toBe("-12.0000");

    await expect(
      correctStockBalance(
        { productId, locationId, correctedBalance: "0", recordedById: adminId },
        { userId: adminId, role: "admin", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "VALIDATION_ERROR" });

    const variances = await prisma.stockMovement.count({
      where: { productId, locationId, movementType: "variance" },
    });
    expect(variances).toBe(1);
  });

  it("works even when the day is closed — genuinely ungated, unlike correctMovement", async () => {
    const { dishProductId: productId, locationIds, recorderId, adminId, prefix } = ctx;
    const locationId = locationIds.restaurant;

    await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "5",
      recordedById: recorderId,
    });

    const businessDate = "2026-07-15";
    await prisma.dayClose.create({
      data: {
        date: businessDateOnly(businessDate),
        closedBy: `${prefix} closer`,
      },
    });

    const correction = await correctStockBalance(
      { productId, locationId, correctedBalance: "0", recordedById: adminId },
      { userId: adminId, role: "admin", locationId: null },
    );
    expect(correction.quantity).toBe("-5.0000");
  });
});
