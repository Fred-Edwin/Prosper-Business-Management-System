import { describe, expect, it } from "vitest";
import {
  ALL_CATEGORIES_KEY,
  UNCATEGORISED_KEY,
  UNCATEGORISED_LABEL,
  buildCategoryTabs,
  categoryKey,
  matchesCategory,
  usedCategoryNames,
} from "./catalog-categories";

const p = (category: string | null) => ({ category });

describe("categoryKey", () => {
  it("keeps a trimmed non-empty category", () => {
    expect(categoryKey(p("Drinks"))).toBe("Drinks");
    expect(categoryKey({ category: "  Drinks  " })).toBe("Drinks");
  });

  it("collapses null / blank / whitespace to the uncategorised key", () => {
    expect(categoryKey(p(null))).toBe(UNCATEGORISED_KEY);
    expect(categoryKey(p(""))).toBe(UNCATEGORISED_KEY);
    expect(categoryKey(p("   "))).toBe(UNCATEGORISED_KEY);
    expect(categoryKey({})).toBe(UNCATEGORISED_KEY);
  });
});

describe("buildCategoryTabs", () => {
  it("is just [All] when nothing is categorised", () => {
    expect(buildCategoryTabs([p(null), p(""), {}])).toEqual([
      { key: ALL_CATEGORIES_KEY, label: "All" },
    ]);
    expect(buildCategoryTabs([])).toEqual([
      { key: ALL_CATEGORIES_KEY, label: "All" },
    ]);
  });

  it("lists distinct categories in first-seen order, Uncategorised last", () => {
    const tabs = buildCategoryTabs([
      p("Drinks"),
      p("Snacks"),
      p("Drinks"),
      p(null),
      p("Snacks"),
    ]);
    expect(tabs).toEqual([
      { key: "all", label: "All" },
      { key: "Drinks", label: "Drinks" },
      { key: "Snacks", label: "Snacks" },
      { key: UNCATEGORISED_KEY, label: UNCATEGORISED_LABEL },
    ]);
  });

  it("omits the Uncategorised tab when every product has a category", () => {
    const tabs = buildCategoryTabs([p("Drinks"), p("Snacks")]);
    expect(tabs.map((t) => t.key)).toEqual(["all", "Drinks", "Snacks"]);
  });
});

describe("matchesCategory", () => {
  it("All matches everything", () => {
    expect(matchesCategory(p("Drinks"), ALL_CATEGORIES_KEY)).toBe(true);
    expect(matchesCategory(p(null), ALL_CATEGORIES_KEY)).toBe(true);
  });

  it("an exact key matches only that category", () => {
    expect(matchesCategory(p("Drinks"), "Drinks")).toBe(true);
    expect(matchesCategory(p("Snacks"), "Drinks")).toBe(false);
  });

  it("the Uncategorised key matches only uncategorised products", () => {
    expect(matchesCategory(p(null), UNCATEGORISED_KEY)).toBe(true);
    expect(matchesCategory(p("Drinks"), UNCATEGORISED_KEY)).toBe(false);
  });
});

describe("usedCategoryNames", () => {
  it("returns distinct trimmed names, first-seen order, no blanks", () => {
    expect(
      usedCategoryNames([
        p("Drinks"),
        p(null),
        p("  Snacks  "),
        p("Drinks"),
        p(""),
      ]),
    ).toEqual(["Drinks", "Snacks"]);
  });
});
