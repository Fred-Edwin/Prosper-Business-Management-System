// @vitest-environment jsdom
// Gate for the frozen ledger header (client feedback 2026-09-09): with
// `stickyHeader`, <DenseLedger>'s header row must be `position: sticky;
// top: 0` at --z-sticky with an OPAQUE fill, so the column labels stay
// visible while a long ledger scrolls its rows past them. Without the prop
// the header is a normal (non-sticky) row — the base catalog / reconciliation
// usages are unaffected.
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DenseLedger, type LedgerRow } from "@/components/kit/dense-ledger";

function cell(value: string) {
  return { value };
}

const ROW: LedgerRow = {
  id: "r1",
  product: "Beef Fillet",
  location: "Store",
  opening: cell("10"),
  purchases: cell("5"),
  issues: cell("2"),
  nonSale: cell("0"),
  production: cell("0"),
  transferIn: cell("0"),
  transferOut: cell("0"),
  sold: cell("0"),
  soldValue: cell("0"),
  closing: cell("13"),
  closingValue: cell("0"),
};

/** The header row is the element carrying the "Product" column label. */
function headerRow(container: HTMLElement): HTMLElement {
  const label = [...container.querySelectorAll("div")].find(
    (d) => d.textContent === "Product",
  );
  if (!label) throw new Error("header not found");
  return label.parentElement as HTMLElement;
}

describe("<DenseLedger> stickyHeader", () => {
  it("pins the header to the top of the scroll container with an opaque fill", () => {
    const { container } = render(
      <DenseLedger rows={[ROW]} showLocation horizontalScroll stickyHeader />,
    );
    const header = headerRow(container);

    expect(header.className).toContain("sticky");
    expect(header.className).toContain("top-0");
    // One step above the body's sticky layer (--z-sticky), so the whole
    // row of column titles stays above every scrolling row on both axes.
    expect(header.className).toContain("[z-index:calc(var(--z-sticky)_+_1)]");
    // Opaque fill (STICKY_HEADER_BG) — not the translucent `bg-info-bg` class,
    // which would let scrolled rows bleed through a pinned header.
    expect(header.className).not.toContain("bg-info-bg");
    expect(header.style.backgroundColor).toBe("var(--surface-page)");
  });

  it("leaves the header non-sticky (translucent) without the prop", () => {
    const { container } = render(
      <DenseLedger rows={[ROW]} showLocation horizontalScroll />,
    );
    const header = headerRow(container);

    expect(header.className).not.toContain("sticky top-0");
    expect(header.className).toContain("bg-info-bg");
  });
});
