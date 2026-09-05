import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { recordPurchasePayment } from "./purchases";
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
