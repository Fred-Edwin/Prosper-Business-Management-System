// @vitest-environment jsdom
// Regression gate for three read-path defects in the 2026-09-02 quantity
// audit, all landing on the staff hub's "Today's activity" timeline:
//
//   F7 — both hubs fetched movements with NO date filter, so the timeline
//        rendered every movement ever recorded under a "today" heading
//        (the SM hub showed week-old `opening` rows as if they were today's).
//   F8 — `purchase_payment` rows carry quantity 0 (they move money, not
//        stock) and rendered as "Rice · Purchase paid · +0 kg".
//   F9 — a movement whose product has since been archived rendered as
//        "Unknown product" with no unit, because names were resolved by
//        joining `GET /api/products`, which excludes archived rows.
//
// F7/F8 are enforced by `todaysMovements`, which the fetch deliberately does
// NOT do: `deriveIncomingTransfers` needs the unscoped history to find a
// transfer dispatched on an earlier day that is still awaiting acceptance.
import { describe, it, expect } from "vitest";
import {
  todaysMovements,
  movementsToTimeline,
} from "@/app/store-manager/staff-stock-format";
import { deriveIncomingTransfers } from "@/app/store-manager/use-staff-stock";
import type { StockMovementView } from "@/lib/domain/stock";
import type { ProductWithLocations } from "@/lib/domain/catalog";

const TODAY = "2026-09-02";
/** 10:00 Nairobi on the given business date. */
const at = (date: string) => new Date(`${date}T10:00:00+03:00`).toISOString();

function mv(partial: Partial<StockMovementView>): StockMovementView {
  return {
    id: Math.random().toString(36).slice(2),
    productId: "p-rice",
    locationId: "loc-store",
    movementType: "issue",
    quantity: "-2.0000",
    recordedById: "u1",
    occurredAt: at(TODAY),
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

const PRODUCTS: ProductWithLocations[] = [
  {
    id: "p-rice",
    name: "Rice",
    kind: "ingredient",
    unitLabel: "kg",
    buyingPrice: null,
    category: null,
    deletedAt: null,
    createdAt: "",
    updatedAt: "",
    locations: [],
  },
];

describe("F7 — the hub timeline shows today only", () => {
  it("drops movements from earlier business days", () => {
    const rows = todaysMovements(
      [
        mv({ id: "old", movementType: "opening", occurredAt: at("2026-08-26") }),
        mv({ id: "yesterday", occurredAt: at("2026-09-01") }),
        mv({ id: "now" }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.id)).toEqual(["now"]);
  });

  it("keeps a movement recorded late in the Nairobi business day", () => {
    // 23:30 Nairobi is still today, though it is already tomorrow in UTC+0
    // terms for some formatters — the business date is what counts.
    const late = mv({
      id: "late",
      occurredAt: new Date(`${TODAY}T23:30:00+03:00`).toISOString(),
    });
    expect(todaysMovements([late], TODAY).map((r) => r.id)).toEqual(["late"]);
  });

  it("does not scope away a pending transfer dispatched on an earlier day", () => {
    // The Accept banner reads the UNSCOPED feed on purpose. A transfer
    // dispatched two days ago and still unaccepted must still be found.
    const dispatch = mv({
      id: "dispatch",
      movementType: "transfer",
      quantity: "-6.0000",
      occurredAt: at("2026-08-31"),
      transferCounterpartLocationId: "loc-canteen",
    });
    const incoming = deriveIncomingTransfers([dispatch], "loc-canteen");
    expect(incoming.map((i) => i.movement.id)).toEqual(["dispatch"]);
    // ...and it is correctly absent from today's timeline.
    expect(todaysMovements([dispatch], TODAY)).toHaveLength(0);
  });
});

describe("F8 — money-only rows never render as stock", () => {
  it("drops a zero-quantity purchase_payment from the timeline", () => {
    const rows = todaysMovements(
      [
        mv({ id: "pay", movementType: "purchase_payment", quantity: "0.0000" }),
        mv({ id: "issue" }),
      ],
      TODAY,
    );
    expect(rows.map((r) => r.id)).toEqual(["issue"]);
  });

  it("so the timeline never renders a '+0' stock line", () => {
    const timeline = movementsToTimeline(
      todaysMovements(
        [mv({ movementType: "purchase_payment", quantity: "0.0000" })],
        TODAY,
      ),
      PRODUCTS,
    );
    expect(timeline).toHaveLength(0);
  });
});

describe("F9 — an archived product still renders with its name", () => {
  it("uses the name the movement carries when the product list omits it", () => {
    // `GET /api/products` excludes archived rows, so PRODUCTS has no p-beans.
    const timeline = movementsToTimeline(
      [mv({ productId: "p-beans", productName: "Beans", unitLabel: "kg" })],
      PRODUCTS,
    );
    expect(timeline[0].title).toBe("Beans");
    expect(timeline[0].value).toContain("kg");
  });

  it("still falls back to the joined product when the row carries no name", () => {
    const timeline = movementsToTimeline([mv({})], PRODUCTS);
    expect(timeline[0].title).toBe("Rice");
    expect(timeline[0].value).toContain("kg");
  });
});
