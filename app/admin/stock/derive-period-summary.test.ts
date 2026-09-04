import { describe, expect, it } from "vitest";
import { derivePeriodSummaryRows } from "./derive-period-summary";
import type { StockMovementView } from "@/lib/domain/stock";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";

// Mirrors derive-ledger.test.ts's fixtures — the period summary uses the
// exact same column routing and costValue convention, just summed over a
// range of movements instead of one day's.

const products: ProductWithLocations[] = [
  {
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
  },
];
const locations: Location[] = [
  { id: "loc-store", name: "Store", type: "store" } as unknown as Location,
];

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

const closingOf = (qty: string) => new Map<string, string>([["beef@loc-store", qty]]);

describe("derivePeriodSummaryRows", () => {
  it("sums columns across every movement in the range, closing = asOf(to), opening walked back", () => {
    const movements = [
      mv({ movementType: "purchase_receipt", quantity: "50.0000", occurredAt: "2026-09-01T08:00:00.000Z" }),
      mv({ movementType: "issue", quantity: "-18.5000", occurredAt: "2026-09-02T08:00:00.000Z" }),
      mv({ movementType: "sale", quantity: "-10.0000", occurredAt: "2026-09-03T08:00:00.000Z" }),
    ];
    const { rows, totals } = derivePeriodSummaryRows({
      movements,
      periodClosing: closingOf("46.5000"), // 25 opening + 50 - 18.5 - 10
      products,
      locations,
      locationId: "loc-store",
    });

    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.purchases.value).toBe("+50.0");
    expect(r.issues.value).toBe("-18.5");
    expect(r.sold.value).toBe("-10.0");
    expect(r.opening.value).toBe("25.0");
    expect(r.closing.value).toBe("46.5");
    expect(totals.closing.value).toBe("46.5");
  });

  it("values sold and closing quantity at buyingPrice, dish at 0 (ADR-55, same as the daily view)", () => {
    const { rows } = derivePeriodSummaryRows({
      movements: [mv({ movementType: "sale", quantity: "-2.0000" })],
      periodClosing: closingOf("23.0000"),
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows[0].soldValue.value).toBe("KES 1,160");
    expect(rows[0].closingValue.value).toBe("KES 13,340");
  });

  it("flags a row whose non-sale outflow is large relative to sold volume", () => {
    const { rows } = derivePeriodSummaryRows({
      movements: [
        mv({ movementType: "sale", quantity: "-10.0000" }),
        mv({ movementType: "non_sale_consumption", quantity: "-8.0000" }), // 80% of sold — well over the 30% bar
      ],
      periodClosing: closingOf("7.0000"),
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows[0].flagged).toBe(true);
  });

  it("does not flag ordinary, low non-sale outflow", () => {
    const { rows } = derivePeriodSummaryRows({
      movements: [
        mv({ movementType: "sale", quantity: "-10.0000" }),
        mv({ movementType: "non_sale_consumption", quantity: "-0.5000" }),
      ],
      periodClosing: closingOf("14.5000"),
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows[0].flagged).toBe(false);
  });

  it("a resting product (no movement in the range but a balance) still gets a row", () => {
    const { rows } = derivePeriodSummaryRows({
      movements: [],
      periodClosing: closingOf("25.0000"),
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].opening.value).toBe("25.0");
    expect(rows[0].closing.value).toBe("25.0");
  });

  it("counts a correction delta exactly once, marks the cell corrected", () => {
    const original = mv({ id: "orig", movementType: "issue", quantity: "-15.0000" });
    const correction = mv({
      id: "corr",
      movementType: "issue",
      quantity: "-3.5000",
      correctsMovementId: "orig",
    });
    const { rows } = derivePeriodSummaryRows({
      movements: [original, correction],
      periodClosing: closingOf("6.5000"),
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows[0].issues.value).toBe("-18.5");
    expect(rows[0].issues.corrected).toBe(true);
  });
});
