// @vitest-environment jsdom
// Per-screen gate — the mobile Stock Levels view (shared by
// /store-manager/stock and /canteen/stock) composed from the kit:
// <DenseSummaryStrip> + <PillFilter> + card list + <EmptyState> /
// <ErrorState>. useStockCard + stockApi mocked; no server / DB.
//
// 2026-09-02: the view now renders a stock CARD per product —
// opening (prior day's closing, carried forward) → the day's signed
// movement → closing — instead of a bare current balance, so a product
// that didn't move today still reads "Open 40 · — · Close 40".
//
// M2-3d: the filter pill set is a prop. SM keeps the kind-based
// `All · Ingredients · Goods · Dishes`; the Canteen passes
// `All · Beverages · Goods` (no dead "Dishes" pill) with category-based
// matchers. Location scoping is server-side — the mocked
// `useStockCard` only ever returns the rows for the resolved location.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StockCardRow } from "@/app/store-manager/use-staff-stock";

const levels = vi.hoisted(() => ({
  rows: [] as StockCardRow[],
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
// The full product catalog the view joins against for pill matchers.
// `category` powers the Canteen Beverages/Goods split.
const listProducts = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    { id: "p-beef", name: "Beef Fillet", unitLabel: "kg", kind: "ingredient", category: null },
    { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", kind: "dish", category: "Drinks" },
    { id: "p-water", name: "Water 500ml", unitLabel: "pcs", kind: "dish", category: null },
    { id: "p-mandazi", name: "Mandazi", unitLabel: "pcs", kind: "dish", category: "Bakery" },
    { id: "p-chicken", name: "Grilled Chicken", unitLabel: "pcs", kind: "dish", category: "Mains" },
  ]),
);
const listLocations = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    { id: "loc-store", name: "Store", type: "store" },
    { id: "loc-canteen", name: "Canteen", type: "canteen" },
  ]),
);

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return {
    ...actual,
    useStockCard: () => levels,
    stockApi: { ...actual.stockApi, listProducts, listLocations },
  };
});

import {
  StockLevelsView,
  CANTEEN_STOCK_PILLS,
  SM_STOCK_PILLS,
} from "@/app/store-manager/stock/stock-levels-view";

function renderSM() {
  return render(<StockLevelsView locationLabel="Store" locationType="store" />);
}
function renderCanteen() {
  return render(
    <StockLevelsView
      locationLabel="Canteen"
      locationType="canteen"
      pillSet={CANTEEN_STOCK_PILLS}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  levels.loading = false;
  levels.error = null;
  levels.rows = [
    { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", opening: "46.5", movements: "0", closing: "46.5", resting: true },
    { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", opening: "144", movements: "0", closing: "144", resting: true },
  ];
});

describe("Stock Levels — kit composition", () => {
  it("renders a <DenseSummaryStrip> line count and a card per product", () => {
    renderSM();
    expect(screen.getByText("Beef Fillet")).toBeInTheDocument();
    expect(screen.getByText("Soda 300ml")).toBeInTheDocument();
    expect(screen.getByText("46.5 kg")).toBeInTheDocument();
  });

  it("the sub-line names the day framing, not a bare 'as of now'", () => {
    renderSM();
    expect(
      screen.getByText(/Store · opening → today → closing/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/as of now/)).not.toBeInTheDocument();
  });

  it("shows a plain <EmptyState> when there is no stock at all", () => {
    levels.rows = [];
    renderSM();
    expect(screen.getByText("No stock on hand")).toBeInTheDocument();
  });

  it("shows <ErrorState> with the artboard copy + Retry on a fetch failure", () => {
    levels.error = "boom";
    renderSM();
    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByText("Couldn't load stock levels"),
    ).toBeInTheDocument();
    expect(
      within(alert).getByText("Check your connection and try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders a negative balance in the danger tone", () => {
    levels.rows = [
      { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", opening: "-3", movements: "0", closing: "-3", resting: true },
    ];
    renderSM();
    const qty = screen.getByText("-3 kg");
    expect(qty.className).toMatch(/text-danger/);
  });
});

describe("Stock Levels — the stock card (opening → movements → closing)", () => {
  it("a resting product reads Open N · — · Close N", () => {
    levels.rows = [
      { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", opening: "40", movements: "0", closing: "40", resting: true },
    ];
    renderSM();
    expect(screen.getByText("Open 40")).toBeInTheDocument();
    expect(screen.getByText("Close 40")).toBeInTheDocument();
    // The middle slot is a dash, not a fabricated movement figure.
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("a product that moved shows the signed delta in the semantic tone", () => {
    levels.rows = [
      { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", opening: "40", movements: "10", closing: "50", resting: false },
      { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", opening: "20", movements: "-5", closing: "15", resting: false },
    ];
    renderSM();

    const up = screen.getByText("+10");
    expect(up.className).toMatch(/text-success/);
    const down = screen.getByText("-5");
    expect(down.className).toMatch(/text-danger/);

    expect(screen.getByText("Open 40")).toBeInTheDocument();
    expect(screen.getByText("Close 50")).toBeInTheDocument();
  });

  it("the headline figure is the day's CLOSING, not the opening", () => {
    levels.rows = [
      { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", opening: "40", movements: "10", closing: "50", resting: false },
    ];
    renderSM();
    expect(screen.getByText("50 kg")).toBeInTheDocument();
  });

  it("totals sum closing balances and count how many products moved", () => {
    levels.rows = [
      { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", opening: "40", movements: "10", closing: "50", resting: false },
      { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", opening: "20", movements: "0", closing: "20", resting: true },
    ];
    renderSM();
    // 50 + 20 = 70 total units; 1 of the 2 lines moved today.
    expect(screen.getByText("70")).toBeInTheDocument();
    const movedItem = screen.getByText("Moved").parentElement!;
    expect(within(movedItem).getByText("1")).toBeInTheDocument();
    const linesItem = screen.getByText("Lines").parentElement!;
    expect(within(linesItem).getByText("2")).toBeInTheDocument();
  });

  it("a negative closing still reads in the danger tone", () => {
    levels.rows = [
      { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", opening: "2", movements: "-5", closing: "-3", resting: false },
    ];
    renderSM();
    expect(screen.getByText("-3 kg").className).toMatch(/text-danger/);
  });
});

describe("Stock Levels — the pill set is a prop (M2-3d)", () => {
  it("SM keeps the kind-based All · Ingredients · Goods · Dishes set", () => {
    renderSM();
    const group = screen.getByRole("radiogroup", {
      name: "Filter by product kind",
    });
    for (const label of ["All", "Ingredients", "Goods", "Dishes"]) {
      expect(within(group).getByRole("radio", { name: label })).toBeInTheDocument();
    }
    // config export is unchanged.
    expect(SM_STOCK_PILLS.map((p) => p.label)).toEqual([
      "All",
      "Ingredients",
      "Goods",
      "Dishes",
    ]);
  });

  it("SM 'Dishes' pill still narrows by kind (unchanged behaviour)", async () => {
    renderSM();
    const user = userEvent.setup();
    await screen.findByText("Beef Fillet");
    const group = screen.getByRole("radiogroup", {
      name: "Filter by product kind",
    });
    await user.click(within(group).getByRole("radio", { name: "Dishes" }));
    // Soda is kind:dish, Beef is kind:ingredient.
    expect(screen.queryByText("Beef Fillet")).not.toBeInTheDocument();
    expect(screen.getByText("Soda 300ml")).toBeInTheDocument();
  });

  it("Canteen gets All · Beverages · Goods — and NO 'Dishes' pill", () => {
    renderCanteen();
    const group = screen.getByRole("radiogroup", {
      name: "Filter by product kind",
    });
    for (const label of ["All", "Beverages", "Goods"]) {
      expect(within(group).getByRole("radio", { name: label })).toBeInTheDocument();
    }
    expect(
      within(group).queryByRole("radio", { name: "Dishes" }),
    ).not.toBeInTheDocument();
    expect(CANTEEN_STOCK_PILLS.map((p) => p.label)).toEqual([
      "All",
      "Beverages",
      "Goods",
    ]);
  });

  it("Canteen 'Beverages' filters by category (soda/drink), 'Goods' is the rest", async () => {
    levels.rows = [
      { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", opening: "144", movements: "0", closing: "144", resting: true },
      { productId: "p-mandazi", name: "Mandazi", unitLabel: "pcs", opening: "60", movements: "0", closing: "60", resting: true },
    ];
    renderCanteen();
    const user = userEvent.setup();
    await screen.findByText("Soda 300ml");
    const group = screen.getByRole("radiogroup", {
      name: "Filter by product kind",
    });

    await user.click(within(group).getByRole("radio", { name: "Beverages" }));
    expect(screen.getByText("Soda 300ml")).toBeInTheDocument();
    expect(screen.queryByText("Mandazi")).not.toBeInTheDocument();

    await user.click(within(group).getByRole("radio", { name: "Goods" }));
    expect(screen.getByText("Mandazi")).toBeInTheDocument();
    expect(screen.queryByText("Soda 300ml")).not.toBeInTheDocument();
  });

  it("Canteen empty state uses the L4Y-0 copy", () => {
    levels.rows = [];
    renderCanteen();
    expect(screen.getByText("No stock at the Canteen yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Canteen stock will show here once the Store Manager/),
    ).toBeInTheDocument();
  });

  it("Canteen shows only the rows useStockCard returns (server-scoped) — no Store rows", () => {
    // The Canteen-scoped hook only ever returns canteen products; assert
    // the view renders exactly those and never a Store-only product.
    levels.rows = [
      { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", opening: "144", movements: "0", closing: "144", resting: true },
      { productId: "p-water", name: "Water 500ml", unitLabel: "pcs", opening: "96", movements: "0", closing: "96", resting: true },
    ];
    renderCanteen();
    expect(screen.getByText("Soda 300ml")).toBeInTheDocument();
    expect(screen.getByText("Water 500ml")).toBeInTheDocument();
    expect(screen.queryByText("Beef Fillet")).not.toBeInTheDocument();
  });
});
