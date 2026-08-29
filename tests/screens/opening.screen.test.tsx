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
const PRODUCTS = [
  {
    id: "prod-beef",
    name: "Beef Fillet",
    kind: "ingredient",
    unitLabel: "kg",
    buyingPrice: "580.00",
    deletedAt: null,
    createdAt: NOW,
    updatedAt: NOW,
    locations: [],
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
    expect(
      await screen.findByText("Day 1 Opening Stock Count"),
    ).toBeInTheDocument();
    expect(await screen.findByRole("grid")).toBeInTheDocument();
  });

  it("enables Save once a count is entered, and toasts on a successful batch", async () => {
    renderScreen();
    const user = userEvent.setup();
    const grid = await screen.findByRole("grid");

    const cell = within(grid).getByLabelText("Beef Fillet — Store");
    await user.type(cell, "25");

    const save = await screen.findByRole("button", {
      name: /Save 1 Opening Count/,
    });
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
    await user.click(screen.getByRole("tab", { name: "Dishes" }));
    // Beef Fillet is an ingredient — gone from the Dishes tab.
    expect(screen.queryByText("Beef Fillet")).not.toBeInTheDocument();
  });
});
