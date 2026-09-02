import { describe, expect, it } from "vitest";
import { deriveLedgerRows } from "./derive-ledger";
import type { StockMovementView } from "@/lib/domain/stock";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";

// The 11-column derivation is the one piece of non-trivial view logic in the
// wired ledger. Given a movement list for a product/day/location plus THAT
// day's closing balance (ADR-11), the column values must be right —
// especially Opening (walked back from closing) and that a correction row
// lands in the derived value once (ADR-39).

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
    derivedRevenue: null,
    productName: null,
    unitLabel: null,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

/** The day's closing balance for the pair, as `GET /stock-movements/balances?asOf=<day>` reports it. */
const closingOf = (qty: string) =>
  new Map<string, string>([["beef@loc-store", qty]]);

/** Opening 25 with no movement on the day. */
const restingAt25 = closingOf("25.0000");

describe("deriveLedgerRows", () => {
  it("closing = the day's balance; opening = closing − Σ(day movements)", () => {
    const movements = [
      mv({ movementType: "purchase_receipt", quantity: "50.0000" }),
      mv({ movementType: "issue", quantity: "-18.5000" }),
      mv({ movementType: "transfer", quantity: "-10.0000" }),
    ];
    const { rows, totals } = deriveLedgerRows({
      movements,
      dayClosing: closingOf("46.5000"), // 25 opening + 50 - 18.5 - 10
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
    // 46.5 closing − (+50 − 18.5 − 10) = 25.0 opening
    expect(r.closing.value).toBe("46.5");
    expect(totals.closing.value).toBe("46.5");
  });

  it("routes a positive transfer to Transfer In, negative to Transfer Out", () => {
    const { rows } = deriveLedgerRows({
      movements: [
        mv({ movementType: "transfer", quantity: "+5.0000" }),
        mv({ movementType: "transfer", quantity: "-2.0000" }),
      ],
      dayClosing: closingOf("28.0000"), // 25 opening + 5 - 2
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows[0].transferIn.value).toBe("+5.0");
    expect(rows[0].transferOut.value).toBe("-2.0");
    expect(rows[0].closing.value).toBe("28.0");
    expect(rows[0].opening.value).toBe("25.0");
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
      dayClosing: closingOf("6.5000"), // 25 opening − 18.5 corrected issue
      products,
      locations,
      locationId: "loc-store",
    });
    // -15 + -3.5 = -18.5, summed once
    expect(rows[0].issues.value).toBe("-18.5");
    expect(rows[0].issues.corrected).toBe(true);
    // 6.5 closing − (−18.5) = 25.0 opening
    expect(rows[0].closing.value).toBe("6.5");
    expect(rows[0].opening.value).toBe("25.0");
  });

  it("cellMovements maps a column to the movement ids behind it (correction target)", () => {
    const { rows, cellMovements } = deriveLedgerRows({
      movements: [
        mv({ id: "iss-1", movementType: "issue", quantity: "-4.0000" }),
      ],
      dayClosing: closingOf("21.0000"), // 25 opening − 4
      products,
      locations,
      locationId: "loc-store",
    });
    expect(cellMovements.get(rows[0].id)?.issues).toEqual(["iss-1"]);
  });

  it("shows a resting row when there are no movements but a balance exists", () => {
    const { rows } = deriveLedgerRows({
      movements: [],
      dayClosing: restingAt25,
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].opening.value).toBe("25.0");
    expect(rows[0].closing.value).toBe("25.0");
  });

  // F4 (owner report 2026-09-02): on the day a product's opening stock is
  // established, the `opening` row feeds no column and the prior day's
  // closing is 0 — so reading Opening forward rendered
  // "Opening 0.0 · all columns — · Closing 0.0" for a Store that really
  // held 40kg. Walking Opening back from the day's balance keeps the row
  // truthful and keeps Closing agreeing with the balances API.
  it("shows real stock on the day an `opening` row establishes it", () => {
    const { rows, totals } = deriveLedgerRows({
      movements: [mv({ movementType: "opening", quantity: "40.0000" })],
      dayClosing: closingOf("40.0000"),
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].closing.value).toBe("40.0");
    // No column claims it — the whole 40 sits in Opening.
    expect(rows[0].opening.value).toBe("40.0");
    expect(rows[0].purchases.dash).toBe(true);
    expect(totals.closing.value).toBe("40.0");
  });

  // `stock_count` is the other null-column type, and self-heals the same way.
  it("keeps an adjusting stock_count inside Opening rather than losing it", () => {
    const { rows } = deriveLedgerRows({
      movements: [
        mv({ movementType: "stock_count", quantity: "-3.0000" }),
        mv({ movementType: "sale", quantity: "-2.0000" }),
      ],
      dayClosing: closingOf("20.0000"), // 25 − 3 count adjustment − 2 sold
      products,
      locations,
      locationId: "loc-store",
    });
    expect(rows[0].sold.value).toBe("-2.0");
    // 20 − (−2) = 22: the count's −3 is absorbed into Opening, and Closing
    // still matches the balances API for the date.
    expect(rows[0].opening.value).toBe("22.0");
    expect(rows[0].closing.value).toBe("20.0");
  });

  it("purchase_payment rows (no stock effect) never appear on the grid", () => {
    const { rows } = deriveLedgerRows({
      movements: [
        mv({ movementType: "purchase_payment", quantity: "0.0000" }),
      ],
      dayClosing: restingAt25,
      products,
      locations,
      locationId: "loc-store",
    });
    // Only the resting row from the day's balance; the payment adds nothing.
    expect(rows[0].purchases.dash).toBe(true);
    expect(rows[0].closing.value).toBe("25.0");
  });
});
