import { describe, expect, it } from "vitest";
import { deriveProductDayRows } from "./derive-product-days";
import type { StockMovementView } from "@/lib/domain/stock";
import type { ProductWithLocations } from "@/lib/domain/catalog";

const beef: ProductWithLocations = {
  id: "beef",
  name: "Beef Fillet",
  kind: "ingredient",
  unitLabel: "kg",
  buyingPrice: "580.00",
  category: null,
  deletedAt: null,
  createdAt: "",
  updatedAt: "",
  locations: [],
};

function mv(partial: Partial<StockMovementView>): StockMovementView {
  return {
    id: Math.random().toString(36).slice(2),
    productId: "beef",
    locationId: "loc-store",
    movementType: "issue",
    quantity: "0",
    recordedById: "u1",
    occurredAt: "2026-09-01T08:00:00.000Z",
    reason: null,
    reasonNote: null,
    orderId: null,
    stockCountId: null,
    transferCounterpartLocationId: null,
    purchasePaymentId: null,
    purchaseSupplier: null,
    purchaseOrderedQty: null,
    purchaseTotalCost: null,
    purchasePaidFrom: null,
    correctsMovementId: null,
    note: null,
    derivedRevenue: null,
    productName: null,
    unitLabel: null,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("deriveProductDayRows", () => {
  it("returns one row per day in the inclusive range, oldest first", () => {
    const rows = deriveProductDayRows({
      movements: [],
      from: "2026-09-01",
      to: "2026-09-03",
      closingByDay: new Map([
        ["2026-09-01", "10.0"],
        ["2026-09-02", "10.0"],
        ["2026-09-03", "10.0"],
      ]),
      product: beef,
    });
    expect(rows.map((r) => r.businessDate)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
  });

  it("each day's closing = that day's own balance; opening walked back from it", () => {
    const rows = deriveProductDayRows({
      movements: [
        mv({ movementType: "purchase_receipt", quantity: "50.0000", occurredAt: "2026-09-02T08:00:00.000Z" }),
      ],
      from: "2026-09-01",
      to: "2026-09-02",
      closingByDay: new Map([
        ["2026-09-01", "12.0"],
        ["2026-09-02", "62.0"], // 12 + 50
      ]),
      product: beef,
    });
    expect(rows[0].closing.value).toBe("12.0");
    expect(rows[0].opening.value).toBe("12.0");
    expect(rows[1].purchases.value).toBe("+50.0");
    expect(rows[1].closing.value).toBe("62.0");
    expect(rows[1].opening.value).toBe("12.0");
  });

  it("values soldValue/closingValue at the product's buyingPrice", () => {
    const rows = deriveProductDayRows({
      movements: [mv({ movementType: "sale", quantity: "-2.0000", occurredAt: "2026-09-01T08:00:00.000Z" })],
      from: "2026-09-01",
      to: "2026-09-01",
      closingByDay: new Map([["2026-09-01", "8.0"]]),
      product: beef,
    });
    expect(rows[0].soldValue.value).toBe("KES 1,160");
    expect(rows[0].closingValue.value).toBe("KES 4,640");
  });

  it("dashes value columns for a dish (ADR-55)", () => {
    const dish: ProductWithLocations = { ...beef, kind: "dish", buyingPrice: null };
    const rows = deriveProductDayRows({
      movements: [mv({ movementType: "sale", quantity: "-2.0000" })],
      from: "2026-09-01",
      to: "2026-09-01",
      closingByDay: new Map([["2026-09-01", "8.0"]]),
      product: dish,
    });
    expect(rows[0].soldValue.dash).toBe(true);
    expect(rows[0].closingValue.dash).toBe(true);
  });
});
