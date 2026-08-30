import { describe, expect, it } from "vitest";
import { planOpeningPosts } from "./opening-plan";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";

// The bulk opening grid's core contract: each dirty row → exactly one
// setOpeningStock POST body, routed to the product's home location, with the
// re-submit flag set when that product/location/date was already saved.

function product(
  id: string,
  kind: ProductWithLocations["kind"],
): ProductWithLocations {
  return {
    id,
    name: id,
    kind,
    unitLabel: "kg",
    buyingPrice: "10.00",
    category: null,
    deletedAt: null,
    createdAt: "",
    updatedAt: "",
    locations: [],
  };
}

const products = [
  product("beef", "ingredient"),
  product("chicken", "dish"),
  product("soda", "goods"),
];
const locations: Location[] = [
  { id: "loc-store", name: "Store", type: "store" } as unknown as Location,
  { id: "loc-rest", name: "Restaurant", type: "restaurant" } as unknown as Location,
  { id: "loc-canteen", name: "Canteen", type: "canteen" } as unknown as Location,
];
const DATE = "2026-08-27";

describe("planOpeningPosts", () => {
  it("emits one body per dirty row, routed to the home location", () => {
    const posts = planOpeningPosts(
      {
        beef: { input: "25.0", saved: "" },
        chicken: { input: "8", saved: "" },
        soda: { input: "144.0", saved: "" },
      },
      products,
      locations,
      DATE,
    );
    expect(posts).toHaveLength(3);
    expect(posts.find((p) => p.productId === "beef")).toMatchObject({
      locationId: "loc-store",
      quantity: "25.0",
      businessDate: DATE,
      isResubmit: false,
    });
    // dish → restaurant
    expect(posts.find((p) => p.productId === "chicken")?.locationId).toBe(
      "loc-rest",
    );
    // goods → store
    expect(posts.find((p) => p.productId === "soda")?.locationId).toBe(
      "loc-store",
    );
  });

  it("skips blank, unchanged, and invalid inputs (no request for them)", () => {
    const posts = planOpeningPosts(
      {
        beef: { input: "", saved: "" }, // blank
        chicken: { input: "8.0", saved: "8.0" }, // unchanged
        soda: { input: "12x", saved: "" }, // not a number
      },
      products,
      locations,
      DATE,
    );
    expect(posts).toEqual([]);
  });

  it("marks a changed-but-already-saved row as a re-submit (server-side correction)", () => {
    const posts = planOpeningPosts(
      { beef: { input: "30.0", saved: "25.0" } },
      products,
      locations,
      DATE,
    );
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ quantity: "30.0", isResubmit: true });
  });

  it("drops a dirty row whose home location type is not configured", () => {
    const posts = planOpeningPosts(
      { chicken: { input: "8.0", saved: "" } }, // dish → restaurant
      products,
      [locations[0]], // only the Store exists
      DATE,
    );
    expect(posts).toEqual([]);
  });

  it("rejects a magnitude with more than 4 decimal places", () => {
    const posts = planOpeningPosts(
      { beef: { input: "25.00001", saved: "" } },
      products,
      locations,
      DATE,
    );
    expect(posts).toEqual([]);
  });
});
