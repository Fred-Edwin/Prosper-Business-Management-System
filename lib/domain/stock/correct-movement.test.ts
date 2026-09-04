import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import { recordPurchaseReceipt } from "./purchases";
import { recordKitchenIssue } from "./issue-production";
import { getDerivedStockBalance } from "./derived-balance";
import { correctMovement } from "./correct-movement";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "correct";

describe("correctMovement", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("open day, original recorder: writes a delta row, leaves the original intact, moves the balance by the delta", async () => {
    const { productId, locationIds, recorderId } = ctx;
    const locationId = locationIds.store;

    const original = await recordKitchenIssue({
      productId,
      locationId,
      quantity: "12", // stored as −12
      recordedById: recorderId,
    });
    const before = await getDerivedStockBalance({ productId, locationId });

    // It should have been an issue of 20 → corrected quantity −20, delta −8.
    const correction = await correctMovement(
      { movementId: original.id, correctedQuantity: "-20", recordedById: recorderId },
      { userId: recorderId, role: "store_manager", locationId: null },
    );

    expect(correction.quantity).toBe("-8.0000");
    expect(correction.correctsMovementId).toBe(original.id);
    expect(correction.movementType).toBe("issue");

    // Original row unchanged.
    const originalRow = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: original.id },
    });
    expect(originalRow.quantity.toFixed(4)).toBe("-12.0000");

    const after = await getDerivedStockBalance({ productId, locationId });
    expect(Number(after.quantity) - Number(before.quantity)).toBeCloseTo(-8, 4);
  });

  it("closed day, non-admin: FORBIDDEN; admin: succeeds", async () => {
    const { goodsProductId: productId, locationIds, recorderId, adminId, prefix } = ctx;
    const locationId = locationIds.canteen;

    // A movement dated to a day we then close.
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "50",
      recordedById: recorderId,
    });
    // Force it onto a fixed historical business date, then close that date.
    const businessDate = "2026-07-15";
    await prisma.stockMovement.update({
      where: { id: receipt.id },
      data: { occurredAt: new Date("2026-07-15T09:00:00+03:00") },
    });
    await prisma.dayClose.create({
      data: {
        date: businessDateOnly(businessDate),
        closedBy: `${prefix} closer`,
      },
    });

    // Non-admin (even the original recorder) → FORBIDDEN.
    await expect(
      correctMovement(
        { movementId: receipt.id, correctedQuantity: "45", recordedById: recorderId },
        { userId: recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });

    // Admin → succeeds, delta −5.
    const correction = await correctMovement(
      { movementId: receipt.id, correctedQuantity: "45", recordedById: adminId },
      { userId: adminId, role: "admin", locationId: null },
    );
    expect(correction.quantity).toBe("-5.0000");
    expect(correction.correctsMovementId).toBe(receipt.id);
  });

  it("open day, a different non-admin staff member: FORBIDDEN", async () => {
    const { goodsProductId: productId, locationIds, recorderId, otherStaffId } = ctx;
    const locationId = locationIds.restaurant;

    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "10",
      recordedById: recorderId,
    });

    await expect(
      correctMovement(
        {
          movementId: receipt.id,
          correctedQuantity: "8",
          recordedById: otherStaffId,
        },
        { userId: otherStaffId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });
  });

  it("rejects a no-op correction (delta zero)", async () => {
    const { productId, locationIds, recorderId } = ctx;
    const locationId = locationIds.store;
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "7",
      recordedById: recorderId,
    });
    await expect(
      correctMovement(
        { movementId: receipt.id, correctedQuantity: "7", recordedById: recorderId },
        { userId: recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "correctedQuantity",
    });
  });

  it("F-1: a repeated identical correction is a no-op against the current derived value, not the original", async () => {
    const { goodsProductId: productId, locationIds, recorderId } = ctx;
    const locationId = locationIds.canteen;
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "30",
      recordedById: recorderId,
    });

    // First correction: +30 → +18, delta −12.
    const first = await correctMovement(
      { movementId: receipt.id, correctedQuantity: "18", recordedById: recorderId },
      { userId: recorderId, role: "store_manager", locationId: null },
    );
    expect(first.quantity).toBe("-12.0000");

    // Same request again — the current value is already 18, so delta 0.
    await expect(
      correctMovement(
        { movementId: receipt.id, correctedQuantity: "18", recordedById: recorderId },
        { userId: recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "VALIDATION_ERROR" });

    // Exactly one delta row exists — no stacking.
    const deltas = await prisma.stockMovement.count({
      where: { correctsMovementId: receipt.id },
    });
    expect(deltas).toBe(1);
  });

  it("F-1: a correction delta row cannot itself be corrected", async () => {
    const { goodsProductId: productId, locationIds, recorderId } = ctx;
    const locationId = locationIds.restaurant;
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "20",
      recordedById: recorderId,
    });
    const delta = await correctMovement(
      { movementId: receipt.id, correctedQuantity: "14", recordedById: recorderId },
      { userId: recorderId, role: "store_manager", locationId: null },
    );

    await expect(
      correctMovement(
        { movementId: delta.id, correctedQuantity: "0", recordedById: recorderId },
        { userId: recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({
      constructor: DomainError,
      code: "VALIDATION_ERROR",
      field: "movementId",
    });
  });
});
