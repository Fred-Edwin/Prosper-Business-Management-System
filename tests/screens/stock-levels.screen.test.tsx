// @vitest-environment jsdom
// Per-screen gate — the mobile Stock Levels view (shared by
// /store-manager/stock and /canteen/stock) composed from the kit:
// <DenseSummaryStrip> + <PillFilter> + card list + <EmptyState> /
// <ErrorState>. useStockLevels + stockApi mocked; no server / DB.
//
// M2-3d: the filter pill set is a prop. SM keeps the kind-based
// `All · Ingredients · Goods · Dishes`; the Canteen passes
// `All · Beverages · Goods` (no dead "Dishes" pill) with category-based
// matchers. Location scoping is server-side — the mocked
// `useStockLevels` only ever returns the rows for the resolved location.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { StockLevelRow } from "@/app/store-manager/use-staff-stock";

const levels = vi.hoisted(() => ({
  rows: [] as StockLevelRow[],
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
    useStockLevels: () => levels,
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
    { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", quantity: "46.5000" },
    { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", quantity: "144.0000" },
  ];
});

describe("Stock Levels — kit composition", () => {
  it("renders a <DenseSummaryStrip> line count and a card per product", () => {
    renderSM();
    expect(screen.getByText("Beef Fillet")).toBeInTheDocument();
    expect(screen.getByText("Soda 300ml")).toBeInTheDocument();
    expect(screen.getByText("46.5 kg")).toBeInTheDocument();
  });

  it("the sub-line reads 'as of today', not 'as of now'", () => {
    renderSM();
    expect(screen.getByText(/Store · as of today/)).toBeInTheDocument();
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
      { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", quantity: "-3.0000" },
    ];
    renderSM();
    const qty = screen.getByText("-3 kg");
    expect(qty.className).toMatch(/text-danger/);
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
      { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", quantity: "144.0000" },
      { productId: "p-mandazi", name: "Mandazi", unitLabel: "pcs", quantity: "60.0000" },
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

  it("Canteen shows only the rows useStockLevels returns (server-scoped) — no Store rows", () => {
    // The Canteen-scoped hook only ever returns canteen products; assert
    // the view renders exactly those and never a Store-only product.
    levels.rows = [
      { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", quantity: "144.0000" },
      { productId: "p-water", name: "Water 500ml", unitLabel: "pcs", quantity: "96.0000" },
    ];
    renderCanteen();
    expect(screen.getByText("Soda 300ml")).toBeInTheDocument();
    expect(screen.getByText("Water 500ml")).toBeInTheDocument();
    expect(screen.queryByText("Beef Fillet")).not.toBeInTheDocument();
  });
});
