import { describe, it, expect } from "vitest";
import { activeChildKey } from "./admin-nav-model";

/**
 * `activeChildKey` picks the sidebar sub-item to light. Financials now has
 * TWO `tab: null` children — "Stock Purchases" (the section default,
 * `/admin/financials`) and "Cash Flow" (a real standalone page,
 * `/admin/financials/cash-flow`, client feedback item #7). Without a
 * pathname to disambiguate them, the array-order default previously always
 * picked the first `tab: null` child, which would have kept "Stock
 * Purchases" lit while viewing Cash Flow.
 */
describe("activeChildKey", () => {
  it("matches a real ?tab= value against its child", () => {
    expect(activeChildKey("financials", "expenses")).toBe("financials:expenses");
  });

  it("falls back to the single tab:null child when there's only one and no tab param", () => {
    expect(activeChildKey("staff", null)).toBe("staff:default");
  });

  it("disambiguates multiple tab:null children by pathname (Cash Flow vs. the section default)", () => {
    expect(
      activeChildKey("financials", null, "/admin/financials/cash-flow"),
    ).toBe("financials:cash-flow");
    expect(activeChildKey("financials", null, "/admin/financials")).toBe(
      "financials:default",
    );
  });

  it("without a pathname, falls back to the first tab:null child (array order)", () => {
    expect(activeChildKey("financials", null)).toBe("financials:default");
  });

  it("returns null for a section with no children", () => {
    expect(activeChildKey("dashboard", null)).toBeNull();
  });

  it("returns null for an unknown nav key", () => {
    expect(activeChildKey("nope", null)).toBeNull();
  });
});
