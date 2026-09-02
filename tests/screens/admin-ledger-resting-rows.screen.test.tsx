// @vitest-environment jsdom
// Regression gate — the Admin stock ledger must show a product that is
// STOCKED but did not MOVE on the selected day (owner report 2026-09-02:
// /admin/stock showed 3 rows on a day when 15 product/location pairs held
// stock; the Store's seeded ingredients were invisible entirely).
//
// Cause: `useLedger` seeded its candidate (product, location) pairs from
// `movements` alone, so a resting product never got a balance entry — and
// `deriveLedgerRows`' movement-free branch, written exactly for this case,
// could never fire. Pairs now come from the catalogue's ProductLocation
// set as well.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLedger } from "@/app/admin/stock/use-stock";
import { deriveLedgerRows } from "@/app/admin/stock/derive-ledger";

const STORE = "loc-store";

// Cooking oil is stocked at the Store and did NOT move today.
// Rice is stocked at the Store and DID move today (a +10 receipt).
const PRODUCTS = [
  {
    id: "p-oil",
    name: "Cooking oil",
    kind: "ingredient",
    unitLabel: "litre",
    buyingPrice: null,
    category: null,
    deletedAt: null,
    createdAt: "",
    updatedAt: "",
    locations: [
      {
        locationId: STORE,
        locationName: "Store",
        locationType: "store",
        sellingPrice: null,
        active: true,
      },
    ],
  },
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
    locations: [
      {
        locationId: STORE,
        locationName: "Store",
        locationType: "store",
        sellingPrice: null,
        active: true,
      },
    ],
  },
  // Never stocked anywhere and never moved — must NOT appear.
  {
    id: "p-ghost",
    name: "Ghost Item",
    kind: "ingredient",
    unitLabel: "kg",
    buyingPrice: null,
    category: null,
    deletedAt: null,
    createdAt: "",
    updatedAt: "",
    locations: [],
  },
  // Soft-deleted but still carrying a ProductLocation — must NOT appear.
  {
    id: "p-archived",
    name: "Archived Item",
    kind: "ingredient",
    unitLabel: "kg",
    buyingPrice: null,
    category: null,
    deletedAt: "2026-08-27T00:00:00.000Z",
    createdAt: "",
    updatedAt: "",
    locations: [
      {
        locationId: STORE,
        locationName: "Store",
        locationType: "store",
        sellingPrice: null,
        active: true,
      },
    ],
  },
];

const LOCATIONS = [{ id: STORE, name: "Store", type: "store" }];

const TODAY_MOVEMENTS = [
  {
    id: "m-rice",
    productId: "p-rice",
    locationId: STORE,
    movementType: "purchase_receipt",
    quantity: "10.0000",
    correctsMovementId: null,
  },
];

// The selected day's closing balances, keyed by the ids the hook asks for.
// Oil rests at 40 (no movement); rice closes at 10 after its +10 receipt.
const DAY_CLOSING: Record<string, string> = {
  "p-oil": "40.0000",
  "p-rice": "10.0000",
};

function jsonOk(data: unknown) {
  return { ok: true, status: 200, json: async () => ({ data }) };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (url.startsWith("/api/products")) return jsonOk(PRODUCTS);
      if (url.startsWith("/api/locations")) return jsonOk(LOCATIONS);
      if (url.startsWith("/api/stock-movements/balances")) {
        const ids =
          new URL(url, "http://x").searchParams.get("productIds")?.split(",") ??
          [];
        return jsonOk(
          ids.map((productId) => ({
            productId,
            locationId: STORE,
            quantity: DAY_CLOSING[productId] ?? "0.0000",
          })),
        );
      }
      if (url.startsWith("/api/stock-movements")) return jsonOk(TODAY_MOVEMENTS);
      throw new Error(`unexpected fetch: ${url}`);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin ledger — a stocked product that didn't move today", () => {
  it("asks for balances beyond just the products that moved", async () => {
    const { result } = renderHook(() => useLedger("2026-09-02"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The bug: only `p-rice` (the one that moved) was ever requested.
    expect(result.current.data.dayClosing.get(`p-oil@${STORE}`)).toBe(
      "40.0000",
    );
    expect(result.current.data.dayClosing.get(`p-rice@${STORE}`)).toBe(
      "10.0000",
    );
  });

  it("renders a carried-forward row where opening === closing", async () => {
    const { result } = renderHook(() => useLedger("2026-09-02"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { rows } = deriveLedgerRows({
      movements: result.current.data.movements,
      dayClosing: result.current.data.dayClosing,
      products: result.current.data.products,
      locations: result.current.data.locations,
    });

    const oil = rows.find((r) => r.id === `p-oil@${STORE}`);
    expect(oil).toBeDefined();
    expect(oil!.opening).toEqual({ value: "40.0" });
    expect(oil!.closing).toEqual({ value: "40.0" });
    // A resting row has no movement in any column.
    expect(oil!.purchases).toEqual({ dash: true });
    expect(oil!.issues).toEqual({ dash: true });

    // The product that did move still reads correctly.
    const rice = rows.find((r) => r.id === `p-rice@${STORE}`);
    expect(rice!.opening).toEqual({ value: "0.0" });
    expect(rice!.closing).toEqual({ value: "10.0" });
  });

  it("does not surface never-stocked or archived products", async () => {
    const { result } = renderHook(() => useLedger("2026-09-02"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { rows } = deriveLedgerRows({
      movements: result.current.data.movements,
      dayClosing: result.current.data.dayClosing,
      products: result.current.data.products,
      locations: result.current.data.locations,
    });

    expect(rows.some((r) => r.id.startsWith("p-ghost@"))).toBe(false);
    expect(rows.some((r) => r.id.startsWith("p-archived@"))).toBe(false);
  });
});
