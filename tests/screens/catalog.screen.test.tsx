// @vitest-environment jsdom
// Session 11 per-screen gate — /admin/catalog rebuilt as a kit composition.
// Drives the interactive surface (tabs, search -> EmptyState, drawer open +
// focus-trap + Esc-restore, toast on save) with useCatalog mocked. No server / DB.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { ProductWithLocations, Location } from "@/lib/domain/catalog";

const NOW = new Date("2026-08-28T00:00:00Z");

const LOCATIONS: Location[] = [
  { id: "loc-store", name: "Store", type: "store", active: true, createdAt: NOW, updatedAt: NOW },
  { id: "loc-rest", name: "Restaurant", type: "restaurant", active: true, createdAt: NOW, updatedAt: NOW },
];

const PRODUCT: ProductWithLocations = {
  id: "p1",
  name: "Chicken Breast",
  kind: "ingredient",
  unitLabel: "kg",
  buyingPrice: "580.00",
  deletedAt: null,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  locations: [],
};

const state = {
  products: [PRODUCT] as ProductWithLocations[],
  loading: false,
  error: null as string | null,
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  archive: vi.fn().mockResolvedValue(undefined),
  hardDelete: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/app/admin/catalog/use-catalog", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/catalog/use-catalog")
  >("@/app/admin/catalog/use-catalog");
  return {
    ...actual,
    useCatalog: () => ({
      products: state.products,
      locations: LOCATIONS,
      loading: state.loading,
      error: state.error,
      refresh: vi.fn(),
      create: state.create,
      update: state.update,
      archive: state.archive,
      hardDelete: state.hardDelete,
    }),
  };
});

import { CatalogClient } from "@/app/admin/catalog/catalog-client";

// jsdom applies no CSS, so both the `md:block` desktop table and the
// `md:hidden` mobile card list render. Scope table assertions to role="table".
function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <CatalogClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  state.products = [PRODUCT];
  state.loading = false;
  state.error = null;
  vi.clearAllMocks();
});

describe("/admin/catalog — kit composition", () => {
  it("renders the desktop table via <SimpleTable>", () => {
    renderScreen();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Chicken Breast")).toBeInTheDocument();
  });

  it("shows a filtered <EmptyState> with a Clear-search action when the search matches nothing", async () => {
    state.products = [];
    renderScreen();
    const user = userEvent.setup();
    await user.type(screen.getByRole("searchbox", { name: "Search products" }), "zzz");
    // EmptyState (role="status") lives inside the table.
    const table = screen.getByRole("table");
    expect(within(table).getByText(/No products match/i)).toBeInTheDocument();
    expect(
      within(table).getByRole("button", { name: "Clear search" }),
    ).toBeInTheDocument();
  });

  it("opens the create Drawer, traps focus, and restores focus to the opener on Esc", async () => {
    renderScreen();
    const user = userEvent.setup();
    const addBtn = screen.getAllByRole("button", { name: "Add Product" })[0];
    addBtn.focus();
    await user.click(addBtn);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("New Product")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    // The overlay plays an exit transition; jsdom fires no transitionend, so
    // assert on focus-restore (the observable §2.4.3 behaviour) rather than
    // unmount timing.
    await waitFor(() => expect(addBtn).toHaveFocus());
  });

  it("fires a success toast after a save", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("Product Name"), "New Ingredient");
    await user.type(within(dialog).getByLabelText("Unit Label"), "kg");
    await user.click(within(dialog).getByRole("button", { name: "Save Product" }));

    expect(state.create).toHaveBeenCalledOnce();
    expect(await screen.findByText("Product created")).toBeInTheDocument();
  });

  it("surfaces a fetch error as an alert", () => {
    state.error = "Failed to load the catalog.";
    renderScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load the catalog.",
    );
  });
});
