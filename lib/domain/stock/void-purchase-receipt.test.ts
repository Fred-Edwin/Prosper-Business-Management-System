import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { businessDateOnly } from "@/lib/time";
import {
  recordPurchasePayment,
  recordPurchaseReceipt,
  voidPurchaseReceipt,
} from "./purchases";
import { correctPurchasePayment, voidPurchasePayment } from "./correct-purchase-payment";
import { listOutstandingPurchases } from "./list-movements";
import { getDerivedStockBalance } from "./derived-balance";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";

const SCOPE = "void-purchase-receipt";

describe("voidPurchaseReceipt", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("reverses the receipt's quantity to zero and leaves the original row intact", async () => {
    const { productId, locationIds, recorderId } = ctx;
    const locationId = locationIds.store;

    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "10",
      recordedById: recorderId,
    });
    const before = await getDerivedStockBalance({ productId, locationId });

    const reversal = await voidPurchaseReceipt(
      { movementId: receipt.id, recordedById: recorderId },
      { userId: recorderId, role: "store_manager", locationId: null },
    );

    expect(reversal.quantity).toBe("-10.0000");
    expect(reversal.correctsMovementId).toBe(receipt.id);
    expect(reversal.movementType).toBe("purchase_receipt");

    const originalRow = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    expect(originalRow.quantity.toFixed(4)).toBe("10.0000");

    const after = await getDerivedStockBalance({ productId, locationId });
    expect(Number(after.quantity) - Number(before.quantity)).toBeCloseTo(-10, 4);
  });

  it("rejects voiding an already-voided receipt", async () => {
    const { productId, locationIds, recorderId } = ctx;
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId: locationIds.store,
      quantity: "5",
      recordedById: recorderId,
    });
    await voidPurchaseReceipt(
      { movementId: receipt.id, recordedById: recorderId },
      { userId: recorderId, role: "store_manager", locationId: null },
    );

    await expect(
      voidPurchaseReceipt(
        { movementId: receipt.id, recordedById: recorderId },
        { userId: recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "VALIDATION_ERROR" });
  });

  it("rejects voiding a correction row directly (corrections don't chain)", async () => {
    const { productId, locationIds, recorderId } = ctx;
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId: locationIds.store,
      quantity: "8",
      recordedById: recorderId,
    });
    const reversal = await voidPurchaseReceipt(
      { movementId: receipt.id, recordedById: recorderId },
      { userId: recorderId, role: "store_manager", locationId: null },
    );

    await expect(
      voidPurchaseReceipt(
        { movementId: reversal.id, recordedById: recorderId },
        { userId: recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "VALIDATION_ERROR" });
  });

  it("open day, a different non-admin staff member: FORBIDDEN", async () => {
    const { productId, locationIds, recorderId, otherStaffId } = ctx;
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId: locationIds.store,
      quantity: "6",
      recordedById: recorderId,
    });

    await expect(
      voidPurchaseReceipt(
        { movementId: receipt.id, recordedById: otherStaffId },
        { userId: otherStaffId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });
  });

  it("closed day, non-admin: FORBIDDEN; admin: succeeds", async () => {
    const { productId, locationIds, recorderId, adminId, prefix } = ctx;
    const locationId = locationIds.store;

    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "7",
      recordedById: recorderId,
    });
    const businessDate = "2026-07-16";
    await prisma.stockMovement.update({
      where: { id: receipt.id },
      data: { occurredAt: new Date("2026-07-16T09:00:00+03:00") },
    });
    await prisma.dayClose.create({
      data: { date: businessDateOnly(businessDate), closedBy: `${prefix} closer` },
    });

    await expect(
      voidPurchaseReceipt(
        { movementId: receipt.id, recordedById: recorderId },
        { userId: recorderId, role: "store_manager", locationId: null },
      ),
    ).rejects.toMatchObject({ constructor: DomainError, code: "FORBIDDEN" });

    const reversal = await voidPurchaseReceipt(
      { movementId: receipt.id, recordedById: adminId },
      { userId: adminId, role: "admin", locationId: null },
    );
    expect(reversal.quantity).toBe("-7.0000");
  });

  // ── The deadlock fix ────────────────────────────────────────────────

  it("unlinks a matched payment on void, freeing it back to awaitingReceipt and correctable/voidable again", async () => {
    const { productId, locationIds, recorderId, adminId } = ctx;
    const locationId = locationIds.store;

    const payment = await recordPurchasePayment({
      productId,
      locationId,
      supplier: "Chieni Wholesale",
      quantity: "10",
      cost: "1000",
      paidFromAccount: "mpesa_bank",
      recordedById: adminId,
    });
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "10",
      purchasePaymentId: payment.id,
      recordedById: recorderId,
    });

    // Before the fix, this was the trap: correcting/voiding the payment
    // while a receipt is linked to it always threw CONFLICT, and nothing
    // ever released the link.
    await expect(
      voidPurchasePayment(payment.id, { userId: adminId, role: "admin", locationId: null }),
    ).rejects.toMatchObject({ constructor: DomainError, code: "CONFLICT" });

    // Void the receipt — this should both zero the stock effect AND
    // release the match.
    await voidPurchaseReceipt(
      { movementId: receipt.id, recordedById: adminId },
      { userId: adminId, role: "admin", locationId: null },
    );

    const releasedReceipt = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    expect(releasedReceipt.purchasePaymentId).toBeNull();

    // The payment now shows up as awaiting receipt again.
    const outstanding = await listOutstandingPurchases();
    expect(outstanding.awaitingReceipt.some((p) => p.id === payment.id)).toBe(true);

    // ...and can now be voided. The money that was stuck is freed.
    const reversal = await voidPurchasePayment(payment.id, {
      userId: adminId,
      role: "admin",
      locationId: null,
    });
    expect(reversal.correctsMovementId).toBe(payment.id);
  });

  it("unlinks a matched payment on void, freeing it to be corrected (not just voided)", async () => {
    const { productId, locationIds, recorderId, adminId } = ctx;
    const locationId = locationIds.store;

    const payment = await recordPurchasePayment({
      productId,
      locationId,
      supplier: "Chieni Wholesale",
      quantity: "10",
      cost: "1000",
      paidFromAccount: "cash",
      recordedById: adminId,
    });
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId,
      quantity: "10",
      purchasePaymentId: payment.id,
      recordedById: recorderId,
    });

    await voidPurchaseReceipt(
      { movementId: receipt.id, recordedById: adminId },
      { userId: adminId, role: "admin", locationId: null },
    );

    const corrected = await correctPurchasePayment(
      {
        movementId: payment.id,
        supplier: "Chieni Wholesale",
        orderedQty: "10",
        cost: "900",
        paidFromAccount: "cash",
        recordedById: adminId,
      },
      { userId: adminId, role: "admin", locationId: null },
    );
    expect(corrected.correctsMovementId).toBe(payment.id);
  });
});
