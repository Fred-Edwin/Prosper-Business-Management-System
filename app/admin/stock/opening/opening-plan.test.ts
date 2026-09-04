import { describe, expect, it } from "vitest";
import { cellKey, openingCellsFor, planOpeningPosts } from "./opening-plan";
import type { ProductWithLocations } from "@/lib/domain/catalog";

// The bulk opening grid's core contract (Session 16 rewrite): each dirty
// CELL — one per (product × active location) — → exactly one
// setOpeningStock POST body for that product/location, with the re-submit
// flag set when that product/location/date was already saved this session.

function product(
  id: string,
  kind: ProductWithLocations["kind"],
  locations: ProductWithLocations["locations"],
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
    locations,
  };
}

const pl = (
  locationId: string,
  locationType: "store" | "restaurant" | "canteen",
  active = true,
) => ({
  locationId,
  locationName: locationId,
  locationType,
  sellingPrice: null,
  active,
});

const beef = product("beef", "ingredient", [pl("loc-store", "store")]);
const chicken = product("chicken", "dish", [pl("loc-rest", "restaurant")]);
// Soda is stocked at BOTH the Restaurant and the Canteen — two cells.
const soda = product("soda", "goods", [
  pl("loc-rest", "restaurant"),
  pl("loc-canteen", "canteen"),
]);
const products = [beef, chicken, soda];
const DATE = "2026-08-27";

describe("openingCellsFor", () => {
  it("gives one cell per active ProductLocation", () => {
    expect(openingCellsFor(beef).map((c) => c.locationId)).toEqual(["loc-store"]);
    expect(openingCellsFor(soda).map((c) => c.locationId)).toEqual([
      "loc-rest",
      "loc-canteen",
    ]);
  });

  it("omits inactive assignments", () => {
    const p = product("x", "goods", [
      pl("loc-rest", "restaurant"),
      pl("loc-canteen", "canteen", false),
    ]);
    expect(openingCellsFor(p).map((c) => c.locationId)).toEqual(["loc-rest"]);
  });
});

describe("planOpeningPosts", () => {
  it("emits one body per dirty cell, at that cell's own location", () => {
    const posts = planOpeningPosts(
      {
        [cellKey("beef", "loc-store")]: { input: "25.0", saved: "" },
        [cellKey("chicken", "loc-rest")]: { input: "8", saved: "" },
        [cellKey("soda", "loc-rest")]: { input: "48.0", saved: "" },
        [cellKey("soda", "loc-canteen")]: { input: "144.0", saved: "" },
      },
      products,
      DATE,
    );
    expect(posts).toHaveLength(4);
    expect(
      posts.find((p) => p.productId === "beef"),
    ).toMatchObject({
      locationId: "loc-store",
      quantity: "25.0",
      businessDate: DATE,
      isResubmit: false,
    });
    // Soda writes to BOTH its locations, independently.
    const sodaPosts = posts.filter((p) => p.productId === "soda");
    expect(sodaPosts.map((p) => p.locationId).sort()).toEqual([
      "loc-canteen",
      "loc-rest",
    ]);
    expect(sodaPosts.find((p) => p.locationId === "loc-canteen")?.quantity).toBe(
      "144.0",
    );
  });

  it("skips blank, unchanged, and invalid inputs (no request for them)", () => {
    const posts = planOpeningPosts(
      {
        [cellKey("beef", "loc-store")]: { input: "", saved: "" }, // blank
        [cellKey("chicken", "loc-rest")]: { input: "8.0", saved: "8.0" }, // unchanged
        [cellKey("soda", "loc-rest")]: { input: "12x", saved: "" }, // not a number
      },
      products,
      DATE,
    );
    expect(posts).toEqual([]);
  });

  it("marks a changed-but-already-saved cell as a re-submit (server-side correction)", () => {
    const posts = planOpeningPosts(
      { [cellKey("beef", "loc-store")]: { input: "30.0", saved: "25.0" } },
      products,
      DATE,
    );
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({ quantity: "30.0", isResubmit: true });
  });

  it("drops a dirty cell whose (product, location) is not a real active assignment", () => {
    const posts = planOpeningPosts(
      // Soda has no Store assignment — a stale/forged cell key must not post.
      { [cellKey("soda", "loc-store")]: { input: "5.0", saved: "" } },
      products,
      DATE,
    );
    expect(posts).toEqual([]);
  });

  it("rejects a magnitude with more than 4 decimal places", () => {
    const posts = planOpeningPosts(
      { [cellKey("beef", "loc-store")]: { input: "25.00001", saved: "" } },
      products,
      DATE,
    );
    expect(posts).toEqual([]);
  });
});
