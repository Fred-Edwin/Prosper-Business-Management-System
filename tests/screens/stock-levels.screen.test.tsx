// @vitest-environment jsdom
// Session 12 per-screen gate — the mobile Stock Levels view (shared by
// /store-manager/stock and /canteen/stock) composed from the kit:
// <DenseSummaryStrip> + <PillFilter> + card list + <EmptyState> /
// <ErrorState>. useStockLevels + stockApi mocked; no server / DB.
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
const listProducts = vi.hoisted(() =>
  vi.fn().mockResolvedValue([
    { id: "p-beef", name: "Beef Fillet", unitLabel: "kg", kind: "ingredient" },
    { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", kind: "goods" },
  ]),
);
const listLocations = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ id: "loc-store", name: "Store", type: "store" }]),
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

import { StockLevelsView } from "@/app/store-manager/stock/stock-levels-view";

function renderScreen() {
  return render(<StockLevelsView locationLabel="Store" locationType="store" />);
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
    renderScreen();
    expect(screen.getByText("Beef Fillet")).toBeInTheDocument();
    expect(screen.getByText("Soda 300ml")).toBeInTheDocument();
    expect(screen.getByText("46.5 kg")).toBeInTheDocument();
  });

  it("the <PillFilter> narrows the list by product kind", async () => {
    renderScreen();
    const user = userEvent.setup();
    // wait for the product-kind map to resolve
    await screen.findByText("Beef Fillet");
    const group = screen.getByRole("radiogroup", { name: "Filter by product kind" });
    await user.click(within(group).getByRole("radio", { name: "Goods" }));
    expect(screen.queryByText("Beef Fillet")).not.toBeInTheDocument();
    expect(screen.getByText("Soda 300ml")).toBeInTheDocument();
  });

  it("shows a filtered <EmptyState> with Clear-filter when the pill matches nothing", async () => {
    renderScreen();
    const user = userEvent.setup();
    await screen.findByText("Beef Fillet");
    const group = screen.getByRole("radiogroup", { name: "Filter by product kind" });
    await user.click(within(group).getByRole("radio", { name: "Dishes" }));
    const status = screen.getByRole("status");
    expect(within(status).getByText("Nothing in this category")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filter" }));
    expect(screen.getByText("Beef Fillet")).toBeInTheDocument();
  });

  it("shows a plain <EmptyState> when there is no stock at all", () => {
    levels.rows = [];
    renderScreen();
    expect(screen.getByText("No stock on hand")).toBeInTheDocument();
  });

  it("shows <ErrorState> with Retry on a fetch failure", () => {
    levels.error = "Failed to load stock levels.";
    renderScreen();
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Failed to load stock levels.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders a negative balance in the danger tone", () => {
    levels.rows = [
      { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", quantity: "-3.0000" },
    ];
    renderScreen();
    const qty = screen.getByText("-3 kg");
    expect(qty.className).toMatch(/text-danger/);
  });
});
