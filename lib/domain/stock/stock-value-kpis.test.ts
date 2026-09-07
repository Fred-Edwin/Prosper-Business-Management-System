import { describe, expect, it } from "vitest";
import {
  deriveStockValueKpis,
  type StockValueLocation,
  type StockValueProduct,
} from "./stock-value-kpis";
import type { StockMovementView } from "./types";

const locations: StockValueLocation[] = [
  { id: "loc-store", type: "store" },
  { id: "loc-rest", type: "restaurant" },
  { id: "loc-canteen", type: "canteen" },
];

const products: StockValueProduct[] = [
  { id: "rice", kind: "ingredient", buyingPrice: "120.00", locations: [] },
  { id: "soda", kind: "goods", buyingPrice: "40.00", locations: [] },
  {
    id: "pilau",
    kind: "dish",
    buyingPrice: "0",
    locations: [{ locationId: "loc-rest", sellingPrice: "300.00" }],
  },
];

function mv(partial: Partial<StockMovementView>): StockMovementView {
  return {
    id: Math.random().toString(36).slice(2),
    productId: "rice",
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
  } as StockMovementView;
}

const base = { products, locations, dishWasteCostPercent: 0.6 };

describe("deriveStockValueKpis", () => {
  it("walks opening back from closing over columned movements, values at cost", () => {
    // Store rice: +50 purchase, -20 issue → closing 30, opening 0.
    const movements = [
      mv({ productId: "rice", locationId: "loc-store", movementType: "purchase_receipt", quantity: "50.0000" }),
      mv({ productId: "rice", locationId: "loc-store", movementType: "issue", quantity: "-20.0000" }),
    ];
    const k = deriveStockValueKpis({
      ...base,
      movements,
      closingByPair: new Map([["rice@loc-store", "30.0000"]]),
    });
    expect(k.store.openingValue).toBe(0);
    expect(k.store.closingValue).toBe(30 * 120);
    expect(k.all.closingValue).toBe(30 * 120);
    expect(k.restaurant.closingValue).toBe(0);
  });

  it("counts a pair with a closing balance but no in-range movement (opening = closing)", () => {
    const k = deriveStockValueKpis({
      ...base,
      movements: [],
      closingByPair: new Map([["soda@loc-canteen", "12.0000"]]),
    });
    expect(k.canteen.openingValue).toBe(12 * 40);
    expect(k.canteen.closingValue).toBe(12 * 40);
  });

  it("values dish opening/closing at 0 but non-sale at percent x Restaurant selling price", () => {
    const movements = [
      mv({ productId: "pilau", locationId: "loc-rest", movementType: "production", quantity: "10.0000" }),
      mv({ productId: "pilau", locationId: "loc-rest", movementType: "non_sale_consumption", quantity: "-3.0000", reason: "spoiled" }),
    ];
    const k = deriveStockValueKpis({
      ...base,
      movements,
      closingByPair: new Map([["pilau@loc-rest", "7.0000"]]),
    });
    expect(k.restaurant.closingValue).toBe(0);
    expect(k.restaurant.openingValue).toBe(0);
    expect(k.restaurant.nonSaleValue).toBe(3 * 300 * 0.6); // 540
    expect(k.all.nonSaleValue).toBe(540);
  });

  it("aggregates per-scope and into all, and ignores unknown location types", () => {
    const movements = [
      mv({ productId: "rice", locationId: "loc-store", movementType: "purchase_receipt", quantity: "10.0000" }),
      mv({ productId: "soda", locationId: "loc-canteen", movementType: "non_sale_consumption", quantity: "-2.0000", reason: "damaged" }),
      mv({ productId: "rice", locationId: "loc-unknown", movementType: "purchase_receipt", quantity: "99.0000" }),
    ];
    const k = deriveStockValueKpis({
      ...base,
      movements,
      closingByPair: new Map([
        ["rice@loc-store", "10.0000"],
        ["soda@loc-canteen", "5.0000"],
        ["rice@loc-unknown", "99.0000"],
      ]),
    });
    expect(k.store.closingValue).toBe(10 * 120);
    expect(k.canteen.closingValue).toBe(5 * 40);
    expect(k.canteen.nonSaleValue).toBe(2 * 40);
    expect(k.all.closingValue).toBe(10 * 120 + 5 * 40); // loc-unknown excluded
    expect(k.all.nonSaleValue).toBe(2 * 40);
  });
});
