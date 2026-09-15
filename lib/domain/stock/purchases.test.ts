import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordPurchasePayment, recordPurchaseReceipt } from "./purchases";
import { listOutstandingPurchases } from "./list-movements";
import { DomainError } from "./errors";
import {
  cleanupStockTestData,
  setupStockTestData,
  type StockTestCtx,
} from "./test-helpers";
import { parseLegacyPaymentNote } from "../../../scripts/backfill-purchase-payment-detail";

const SCOPE = "purchases";

describe("recordPurchasePayment — real detail columns (ADR-46 §3)", () => {
  let ctx: StockTestCtx;

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE);
    await prisma.$disconnect();
  });

  it("persists supplier / ordered qty / total cost / paid-from to the real columns and keeps a human note", async () => {
    const { productId, locationIds, recorderId } = ctx;

    const view = await recordPurchasePayment({
      productId,
      locationId: locationIds.store,
      supplier: "  Nairobi Grains Millers  ",
      quantity: "20",
      cost: "18000",
      paidFromAccount: "mpesa_bank",
      recordedById: recorderId,
    });

    // Wire shape carries the four fields.
    expect(view.movementType).toBe("purchase_payment");
    expect(view.quantity).toBe("0.0000"); // no stock effect (ADR-39)
    expect(view.purchaseSupplier).toBe("Nairobi Grains Millers"); // trimmed
    expect(view.purchaseOrderedQty).toBe("20.0000");
    expect(view.purchaseTotalCost).toBe("18000.00");
    expect(view.purchasePaidFrom).toBe("mpesa_bank");

    // Row in the DB matches.
    const row = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: view.id },
    });
    expect(row.purchaseSupplier).toBe("Nairobi Grains Millers");
    expect(row.purchaseOrderedQty?.toString()).toBe("20");
    expect(row.purchaseTotalCost?.toString()).toBe("18000");
    expect(row.purchasePaidFrom).toBe("mpesa_bank");

    // Human note is still composed (display / audit) with the product's unit label.
    expect(row.note).toBe(
      "Ordered 20 kg from Nairobi Grains Millers; KES 18,000.00 from M-Pesa / Bank Till",
    );
  });

  it("writes a paired negative MoneyMovement debiting the paid-from account (M2 S4 — resolves the M1 TODO(mock))", async () => {
    const { productId, locationIds, recorderId } = ctx;

    const view = await recordPurchasePayment({
      productId,
      locationId: locationIds.store,
      supplier: "Cash Vendor",
      quantity: "10",
      cost: "2500",
      paidFromAccount: "cash",
      recordedById: recorderId,
    });

    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "purchase_payment", sourceId: view.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].account).toBe("cash");
    expect(mm[0].amount.toFixed(2)).toBe("-2500.00"); // money out
    expect(mm[0].recordedById).toBe(recorderId);

    // recordMoneyMovement writes its own AuditLog row.
    const audit = await prisma.auditLog.findMany({
      where: { entityType: "money_movement", entityId: mm[0].id },
    });
    expect(audit).toHaveLength(1);
  });

  it("accepts a blank/omitted supplier, storing it as null", async () => {
    const { productId, locationIds, recorderId } = ctx;

    const view = await recordPurchasePayment({
      productId,
      locationId: locationIds.store,
      supplier: "   ",
      quantity: "5",
      cost: "100",
      paidFromAccount: "cash",
      recordedById: recorderId,
    });

    expect(view.purchaseSupplier).toBeNull();
    expect(view.note).toBe("Ordered 5 kg; KES 100.00 from Cash");

    const view2 = await recordPurchasePayment({
      productId,
      locationId: locationIds.store,
      quantity: "5",
      cost: "100",
      paidFromAccount: "cash",
      recordedById: recorderId,
    });
    expect(view2.purchaseSupplier).toBeNull();
  });
});

describe("recordPurchasePayment — matching a delivery already received", () => {
  let ctx: StockTestCtx;
  const SCOPE2 = "purchases-match";

  beforeAll(async () => {
    ctx = await setupStockTestData(SCOPE2);
  });

  afterAll(async () => {
    await cleanupStockTestData(SCOPE2);
    await prisma.$disconnect();
  });

  it("links the payment to an existing unmatched receipt instead of leaving both unmatched (the client-reported bug)", async () => {
    const { productId, locationIds, recorderId } = ctx;

    // Store Manager receives first — no payment exists yet.
    const receipt = await recordPurchaseReceipt({
      productId,
      locationId: locationIds.store,
      quantity: "20",
      recordedById: recorderId,
    });
    expect(receipt.purchasePaymentId).toBeNull();

    // Admin pays later, explicitly settling that receipt.
    const payment = await recordPurchasePayment({
      productId,
      locationId: locationIds.store,
      supplier: "Nairobi Grains Millers",
      quantity: "20",
      cost: "2400",
      paidFromAccount: "cash",
      purchaseReceiptId: receipt.id,
      recordedById: recorderId,
    });

    // The payment itself still moves no stock.
    expect(payment.quantity).toBe("0.0000");

    // The receipt now points at the payment that settled it.
    const updatedReceipt = await prisma.stockMovement.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    expect(updatedReceipt.purchasePaymentId).toBe(payment.id);

    // Exactly one MoneyMovement — the payment — no stock-doubling side
    // effect from the link itself.
    const mm = await prisma.moneyMovement.findMany({
      where: { sourceType: "purchase_payment", sourceId: payment.id },
    });
    expect(mm).toHaveLength(1);
    expect(mm[0].amount.toFixed(2)).toBe("-2400.00");

    // Neither side is left dangling in the reconciliation view — this is
    // what stops the false "receive again" prompt on the Store Manager's
    // screen and the false "awaiting delivery" row on the Admin's screen.
    const outstanding = await listOutstandingPurchases();
    expect(outstanding.awaitingReceipt.some((p) => p.id === payment.id)).toBe(
      false,
    );
    expect(
      outstanding.unmatchedReceipts.some((r) => r.id === receipt.id),
    ).toBe(false);
  });

  it("rejects a purchaseReceiptId that does not point at a real purchase_receipt row", async () => {
    const { productId, locationIds, recorderId } = ctx;

    await expect(
      recordPurchasePayment({
        productId,
        locationId: locationIds.store,
        quantity: "5",
        cost: "500",
        paidFromAccount: "cash",
        purchaseReceiptId: "00000000-0000-0000-0000-000000000000",
        recordedById: recorderId,
      }),
    ).rejects.toThrow(DomainError);
  });

  it("rejects a purchaseReceiptId that is already matched to another payment", async () => {
    const { productId, locationIds, recorderId } = ctx;

    const receipt = await recordPurchaseReceipt({
      productId,
      locationId: locationIds.store,
      quantity: "3",
      recordedById: recorderId,
    });
    await recordPurchasePayment({
      productId,
      locationId: locationIds.store,
      quantity: "3",
      cost: "360",
      paidFromAccount: "cash",
      purchaseReceiptId: receipt.id,
      recordedById: recorderId,
    });

    // A second payment cannot claim the same already-matched receipt.
    await expect(
      recordPurchasePayment({
        productId,
        locationId: locationIds.store,
        quantity: "3",
        cost: "360",
        paidFromAccount: "cash",
        purchaseReceiptId: receipt.id,
        recordedById: recorderId,
      }),
    ).rejects.toThrow(DomainError);
  });

  it("still creates a standalone unlinked payment when purchaseReceiptId is omitted (pay-first flow, unchanged)", async () => {
    const { productId, locationIds, recorderId } = ctx;

    const payment = await recordPurchasePayment({
      productId,
      locationId: locationIds.store,
      quantity: "8",
      cost: "960",
      paidFromAccount: "cash",
      recordedById: recorderId,
    });

    const outstanding = await listOutstandingPurchases();
    expect(outstanding.awaitingReceipt.some((p) => p.id === payment.id)).toBe(
      true,
    );
  });
});

describe("backfill parser — parseLegacyPaymentNote", () => {
  it("recovers all four fields from the note format the old code wrote", () => {
    const parsed = parseLegacyPaymentNote(
      "Ordered 50.0000 from Acme Supplies; cost 6000.00 from mpesa_bank",
    );
    expect(parsed).toEqual({
      supplier: "Acme Supplies",
      orderedQty: "50.0000",
      totalCost: "6000.00",
      paidFrom: "mpesa_bank",
    });
  });

  it("handles a single-word supplier and cash", () => {
    const parsed = parseLegacyPaymentNote(
      "Ordered 10.0000 from Supplier; cost 500.00 from cash",
    );
    expect(parsed).toEqual({
      supplier: "Supplier",
      orderedQty: "10.0000",
      totalCost: "500.00",
      paidFrom: "cash",
    });
  });

  it("returns all-null for an unparseable / empty note", () => {
    for (const note of [null, "", "some unrelated text"]) {
      expect(parseLegacyPaymentNote(note)).toEqual({
        supplier: null,
        orderedQty: null,
        totalCost: null,
        paidFrom: null,
      });
    }
  });

  it("backfilling a seeded legacy-note row populates the columns", async () => {
    const ctx = await setupStockTestData("purchases_bf");
    try {
      const legacy = await prisma.stockMovement.create({
        data: {
          productId: ctx.productId,
          locationId: ctx.locationIds.store,
          movementType: "purchase_payment",
          quantity: 0,
          recordedById: ctx.recorderId,
          occurredAt: new Date(),
          note: "Ordered 50.0000 from ProbeVendor; cost 29000.00 from cash",
        },
      });

      const parsed = parseLegacyPaymentNote(legacy.note);
      await prisma.stockMovement.update({
        where: { id: legacy.id },
        data: {
          purchaseSupplier: parsed.supplier,
          purchaseOrderedQty: parsed.orderedQty,
          purchaseTotalCost: parsed.totalCost,
          purchasePaidFrom: parsed.paidFrom,
        },
      });

      const after = await prisma.stockMovement.findUniqueOrThrow({
        where: { id: legacy.id },
      });
      expect(after.purchaseSupplier).toBe("ProbeVendor");
      expect(after.purchaseOrderedQty?.toString()).toBe("50");
      expect(after.purchaseTotalCost?.toString()).toBe("29000");
      expect(after.purchasePaidFrom).toBe("cash");
      expect(after.note).toBe(legacy.note); // note retained
    } finally {
      await cleanupStockTestData("purchases_bf");
    }
  });
});
