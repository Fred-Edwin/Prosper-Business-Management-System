// @vitest-environment jsdom
// Session 11 per-screen gate — /admin/stock/opening rebuilt as a kit composition.
// Drives the Breadcrumb, the Tabs, the BulkEntryGrid editable cell, and the
// save -> toast path, with stockApi mocked.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

const api = vi.hoisted(() => ({
  listProducts: vi.fn(),
  listLocations: vi.fn(),
  setOpeningStock: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/app/admin/stock/use-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/use-stock")
  >("@/app/admin/stock/use-stock");
  return { ...actual, stockApi: api };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { OpeningClient } from "@/app/admin/stock/opening/opening-client";

const NOW = "2026-08-28T00:00:00Z";
const pl = (
  locationId: string,
  locationName: string,
  locationType: "store" | "restaurant" | "canteen",
) => ({ locationId, locationName, locationType, sellingPrice: null, active: true });

const PRODUCTS = [
  {
    id: "prod-beef",
    name: "Beef Fillet",
    kind: "ingredient",
    unitLabel: "kg",
    buyingPrice: "580.00",
    category: null,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    locations: [pl("loc-store", "Store", "store")],
  },
  {
    id: "prod-chicken",
    name: "Grilled Chicken",
    kind: "dish",
    unitLabel: "pcs",
    buyingPrice: null,
    category: null,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    locations: [pl("loc-rest", "Restaurant", "restaurant")],
  },
  {
    // Goods sold at BOTH the Restaurant and the Canteen — two editable cells.
    id: "prod-soda",
    name: "Soda 300ml",
    kind: "goods",
    unitLabel: "pcs",
    buyingPrice: "45.00",
    category: null,
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    locations: [
      pl("loc-rest", "Restaurant", "restaurant"),
      pl("loc-canteen", "Canteen", "canteen"),
    ],
  },
];
const LOCATIONS = [
  {
    id: "loc-store",
    name: "Store",
    type: "store",
    active: true,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
  },
  {
    id: "loc-rest",
    name: "Restaurant",
    type: "restaurant",
    active: true,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
  },
  {
    id: "loc-canteen",
    name: "Canteen",
    type: "canteen",
    active: true,
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
  },
];

function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <OpeningClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date(NOW));
  vi.clearAllMocks();
  api.listProducts.mockResolvedValue(PRODUCTS);
  api.listLocations.mockResolvedValue(LOCATIONS);
  api.setOpeningStock.mockResolvedValue({});
});

afterEach(() => {
  vi.useRealTimers();
});

describe("/admin/stock/opening — kit composition", () => {
  it("renders a Breadcrumb back to Stock & Reconciliation", async () => {
    renderScreen();
    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(nav).getByRole("link", { name: "Stock & Reconciliation" }),
    ).toBeInTheDocument();
  });

  it("renders the numbered InstructionalBanner and the BulkEntryGrid", async () => {
    renderScreen();
    // The banner title renders in both responsive branches (jsdom keeps both).
    expect(
      (await screen.findAllByText("Day 1 Opening Stock Count")).length,
    ).toBeGreaterThan(0);
    expect(await screen.findByRole("grid")).toBeInTheDocument();
  });

  it("enables Save once a count is entered, and toasts on a successful batch", async () => {
    renderScreen();
    const user = userEvent.setup();
    const grid = await screen.findByRole("grid");

    const cell = within(grid).getByLabelText("Beef Fillet — Store");
    await user.type(cell, "25");

    // The desktop toolbar Save button (the mobile branch has its own).
    const save = (
      await screen.findAllByRole("button", { name: /Save 1 Opening Count/ })
    )[0];
    await user.click(save);

    await waitFor(() => expect(api.setOpeningStock).toHaveBeenCalledOnce());
    expect(
      await screen.findByText(/Saved 1 opening count for 2026-08-28/),
    ).toBeInTheDocument();
  });

  it("filters the grid by tab", async () => {
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("grid");
    await user.click(screen.getAllByRole("tab", { name: /^Kitchen Ingredients/ })[0]);
    // Grilled Chicken is a dish — gone from the Ingredients tab.
    expect(screen.queryByText("Grilled Chicken")).not.toBeInTheDocument();
  });

  it("gives a goods item stocked at two locations a row NAMED per location", async () => {
    renderScreen();
    const grid = await screen.findByRole("grid");
    // The row header carries the location — "Soda 300ml — Restaurant" /
    // "Soda 300ml — Canteen" — so the two rows are unambiguous. The
    // category column shows just the kind ("Goods"), not the location.
    const headers = within(grid)
      .getAllByRole("rowheader")
      .map((h) => h.textContent);
    expect(headers).toEqual(
      expect.arrayContaining([
        "Soda 300ml — Restaurant",
        "Soda 300ml — Canteen",
      ]),
    );
  });

  it("saves the two Soda cells independently — one POST per (product × location)", async () => {
    renderScreen();
    const user = userEvent.setup();
    const grid = await screen.findByRole("grid");

    // Each multi-location row's editable input is labelled by its row
    // header + column; match on the location substring.
    await user.type(
      within(grid).getByLabelText(/Soda 300ml — Restaurant — Restaurant/),
      "48",
    );
    await user.type(
      within(grid).getByLabelText(/Soda 300ml — Canteen — Canteen/),
      "144",
    );
    await user.click(
      (await screen.findAllByRole("button", { name: /Save 2 Opening Counts/ }))[0],
    );

    await waitFor(() =>
      expect(api.setOpeningStock).toHaveBeenCalledTimes(2),
    );
    const calls = api.setOpeningStock.mock.calls.map((c) => c[0]);
    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          productId: "prod-soda",
          locationId: "loc-rest",
          quantity: "48",
        }),
        expect.objectContaining({
          productId: "prod-soda",
          locationId: "loc-canteen",
          quantity: "144",
        }),
      ]),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phase C2 — the `< --bp-md` stacked-card branch (artboards LIS-0 / LN4-0,
// component-states.md §C26 "Mobile composition"). jsdom renders both responsive
// branches into the DOM (CSS `display` is not computed), so mobile assertions
// scope to the `data-testid="opening-mobile"` container.
describe("/admin/stock/opening — mobile stacked-card branch", () => {
  const mobile = () => screen.getByTestId("opening-mobile");

  it("typing in a card input updates the row state and the live KES readout", async () => {
    renderScreen();
    const user = userEvent.setup();
    const input = await within(mobile()).findByLabelText("Beef Fillet — Store");
    await user.type(input, "25");
    expect(input).toHaveValue("25");
    // 25 × 580.00 = 14,500.00 — shown both in the 76px right-lane readout and,
    // summed, in the consolidated valuation strip.
    expect(
      within(mobile()).getAllByText(/KES\s*14,500\.00/).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("a rejected save shows the §9.8 helper row and marks the input invalid (aria-describedby)", async () => {
    const { StockRequestError } = await vi.importActual<
      typeof import("@/app/admin/stock/use-stock")
    >("@/app/admin/stock/use-stock");
    api.setOpeningStock.mockRejectedValueOnce(
      new StockRequestError(400, {
        code: "VALIDATION_ERROR",
        message: "Enter a quantity of zero or more.",
      }),
    );

    renderScreen();
    const user = userEvent.setup();
    const input = await within(mobile()).findByLabelText("Beef Fillet — Store");
    await user.type(input, "25");
    await user.click(
      await within(mobile()).findByRole("button", {
        name: "Save 1 Opening Count",
      }),
    );

    await waitFor(() =>
      expect(input).toHaveAttribute("aria-invalid", "true"),
    );
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      /zero or more/i,
    );
  });

  it("the sticky Save is disabled with 0 dirty and enabled + relabelled with N dirty", async () => {
    renderScreen();
    const user = userEvent.setup();
    await within(mobile()).findByLabelText("Beef Fillet — Store");

    const save = within(mobile()).getByRole("button", {
      name: "Save Baseline & Initialize Day 1",
    });
    expect(save).toBeDisabled();

    await user.type(
      within(mobile()).getByLabelText("Beef Fillet — Store"),
      "25",
    );
    const relabelled = await within(mobile()).findByRole("button", {
      name: "Save 1 Opening Count",
    });
    expect(relabelled).toBeEnabled();
  });

  it("renders the kit EmptyState when the active category has no products", async () => {
    // Only the ingredient + dish fixtures for this one — no goods.
    api.listProducts.mockResolvedValueOnce(PRODUCTS.slice(0, 2));
    renderScreen();
    const user = userEvent.setup();
    await within(mobile()).findByLabelText("Beef Fillet — Store");
    // "Goods" tab — neither remaining fixture product is a goods item.
    await user.click(
      within(mobile()).getByRole("tab", { name: "Goods" }),
    );
    expect(
      within(mobile()).getByText("No items in this category"),
    ).toBeInTheDocument();
  });

  it("renders 3 skeleton cards while the catalog is loading", async () => {
    let resolveProducts: (v: unknown) => void = () => {};
    api.listProducts.mockReturnValue(
      new Promise((r) => {
        resolveProducts = r;
      }),
    );
    renderScreen();
    // Before the fetch resolves: skeleton blocks, no card inputs.
    await waitFor(() =>
      expect(
        mobile().querySelectorAll(".kit-skeleton").length,
      ).toBeGreaterThanOrEqual(3),
    );
    expect(
      within(mobile()).queryByLabelText("Beef Fillet — Store"),
    ).not.toBeInTheDocument();
    resolveProducts(PRODUCTS);
    await within(mobile()).findByLabelText("Beef Fillet — Store");
  });

  it("shows Dish in the readout lane for a dish row and — before any count", async () => {
    renderScreen();
    await within(mobile()).findByLabelText("Beef Fillet — Store");
    expect(within(mobile()).getByText("Dish")).toBeInTheDocument();
    expect(within(mobile()).getAllByText("—").length).toBeGreaterThan(0);
  });
});
