import { describe, expect, it } from "vitest";
import { deriveLedgerRows } from "./derive-ledger";
import type { StockMovementView } from "@/lib/domain/stock";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";

// The 11-column derivation is the one piece of non-trivial view logic in the
// wired ledger. Given a movement list for a product/day/location plus the
// prior day's closing (= opening, ADR-11), the column values must be right —
// especially Opening/Closing and that a correction row lands in the derived
// value once (ADR-39).

const products: ProductWithLocations[] = [
  {
    id: "beef",
    name: "Beef Fillet",
    kind: "ingredient",
    unitLabel: "kg",
    buyingPrice: "580.00",
    deletedAt: null,
    createdAt: "",
    updatedAt: "",
    locations: [],
  },
];
const locations: Location[] = [
  // Only the fields deriveLedgerRows reads (id, name) matter here.
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
    occurredAt: "2026-08-24T08:00:00.000Z",
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
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

const priorClosing = new Map<string, string>([["beef@loc-store", "25.0000"]]);

describe("deriveLedgerRows", () => {
  it("opening = prior day's closing; closing = opening + Σ(day movements)", () => {
    const movements = [
      mv({ movementType: "purchase_receipt", quantity: "50.0000" }),
      mv({ movementType: "issue", quantity: "-18.5000" }),
      mv({ movementType: "transfer", quantity: "-10.0000" }),
    ];
    const { rows, totals } = deriveLedgerRows({
      movements,
      priorClosing,
      products,
      locations,
      locationId: "loc-store",
    });

    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.opening.value).toBe("25.0");
    expect(r.purchases.value).toBe("+50.0");
    expect(r.issues.value).toBe("-18.5");
    expect(r.transferOut.value).toBe("-10.0");
    expect(r.transferIn.dash).toBe(true);
    // 25 + 50 - 18.5 - 10 = 46.5
    expect(r.closing.value).toBe("46.5");
    expect(totals.closing.value).toBe("46.5");
  });

  it("routes a positive transfer to Transfer In, negative to Transfer Out", () => {
    const { rows } = deriveLedgerRows({
      movements: [
        mv({ movementType: "transfer", quantity: "+5.0000" }),
        mv({ movementType: "transfer", quantity: "-2.0000" }),
      ],
      priorClosing,
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows[0].transferIn.value).toBe("+5.0");
    expect(rows[0].transferOut.value).toBe("-2.0");
    expect(rows[0].closing.value).toBe("28.0"); // 25 + 5 - 2
  });

  it("counts a correction delta row exactly once, in its column, and marks the cell corrected", () => {
    const original = mv({ id: "orig", movementType: "issue", quantity: "-15.0000" });
    const correction = mv({
      id: "corr",
      movementType: "issue",
      quantity: "-3.5000", // delta to reach a corrected final of -18.5
      correctsMovementId: "orig",
    });
    const { rows } = deriveLedgerRows({
      movements: [original, correction],
      priorClosing,
      products,
      locations,
      locationId: "loc-store",
    });
    // -15 + -3.5 = -18.5, summed once
    expect(rows[0].issues.value).toBe("-18.5");
    expect(rows[0].issues.corrected).toBe(true);
    // 25 - 18.5 = 6.5
    expect(rows[0].closing.value).toBe("6.5");
  });

  it("cellMovements maps a column to the movement ids behind it (correction target)", () => {
    const { rows, cellMovements } = deriveLedgerRows({
      movements: [
        mv({ id: "iss-1", movementType: "issue", quantity: "-4.0000" }),
      ],
      priorClosing,
      products,
      locations,
      locationId: "loc-store",
    });
    expect(cellMovements.get(rows[0].id)?.issues).toEqual(["iss-1"]);
  });

  it("shows an opening-only row when there are no movements but a prior balance exists", () => {
    const { rows } = deriveLedgerRows({
      movements: [],
      priorClosing,
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].opening.value).toBe("25.0");
    expect(rows[0].closing.value).toBe("25.0");
  });

  it("purchase_payment rows (no stock effect) never appear on the grid", () => {
    const { rows } = deriveLedgerRows({
      movements: [
        mv({ movementType: "purchase_payment", quantity: "0.0000" }),
      ],
      priorClosing,
      products,
      locations,
      locationId: "loc-store",
    });
    // Only the opening-only row from priorClosing; the payment adds nothing.
    expect(rows[0].purchases.dash).toBe(true);
    expect(rows[0].closing.value).toBe("25.0");
  });
});
