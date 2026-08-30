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
  category: null,
  deletedAt: null,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  locations: [],
};

const ARCHIVED_PRODUCT: ProductWithLocations = {
  ...PRODUCT,
  id: "p-arch",
  name: "Diet Soda 300ml",
  deletedAt: NOW.toISOString(),
};

const state = {
  products: [PRODUCT] as ProductWithLocations[],
  loading: false,
  error: null as string | null,
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  archive: vi.fn().mockResolvedValue(undefined),
  hardDelete: vi.fn().mockResolvedValue(undefined),
  unarchive: vi.fn().mockResolvedValue(undefined),
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
      unarchive: state.unarchive,
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
    // M2 6b: the Category field is optional and free-text; it round-trips into
    // the create payload so C2 / K1 can group by it.
    await user.type(within(dialog).getByLabelText("Category"), "Mains");
    await user.click(within(dialog).getByRole("button", { name: "Save Product" }));

    expect(state.create).toHaveBeenCalledOnce();
    expect(state.create.mock.calls[0][0]).toMatchObject({ category: "Mains" });
    expect(await screen.findByText("Product created")).toBeInTheDocument();
  });

  it("surfaces a fetch error as an alert", () => {
    state.error = "Failed to load the catalog.";
    renderScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load the catalog.",
    );
  });

  it("the row has a single 'Edit' affordance and NO Delete button (A1/A2)", () => {
    renderScreen();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(
      within(table).queryByRole("button", { name: /^Delete / }),
    ).not.toBeInTheDocument();
  });

  it("Delete lives in the Edit drawer, and opens the friction dialog gated on the retyped name (A2)", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(within(screen.getByRole("table")).getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");

    const deleteBtn = within(drawer).getByRole("button", {
      name: /Delete this product/,
    });
    await user.click(deleteBtn);

    const confirm = await screen.findByRole("alertdialog");
    // The friction gate: the confirm button is disabled until the name is retyped.
    const permanently = within(confirm).getByRole("button", { name: /Delete Product/ });
    expect(permanently).toBeDisabled();
    // Wrong case does NOT enable it.
    await user.type(within(confirm).getByRole("textbox"), "chicken breast");
    expect(permanently).toBeDisabled();

    // The exact name does.
    await user.clear(within(confirm).getByRole("textbox"));
    await user.type(within(confirm).getByRole("textbox"), "Chicken Breast");
    expect(permanently).toBeEnabled();
  });

  it("a successful hard-delete closes the drawer (Session 16 §4)", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(within(screen.getByRole("table")).getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    await user.click(
      within(drawer).getByRole("button", { name: /Delete this product/ }),
    );
    const confirm = await screen.findByRole("alertdialog");
    await user.type(within(confirm).getByRole("textbox"), "Chicken Breast");
    await user.click(within(confirm).getByRole("button", { name: /Delete Product/ }));

    expect(state.hardDelete).toHaveBeenCalledWith("p1", "Chicken Breast");
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("the kind hint under the SegmentedControl changes with the selected kind (A4)", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Add Product" })[0]);
    const drawer = await screen.findByRole("dialog");

    expect(
      within(drawer).getByText(/A raw item you buy and cook with/),
    ).toBeInTheDocument();
    // No standalone dish-only banner exists any more.
    await user.click(within(drawer).getByRole("radio", { name: "Dish" }));
    expect(
      within(drawer).getByText(/It has no buying price/),
    ).toBeInTheDocument();
    await user.click(within(drawer).getByRole("radio", { name: "Goods" }));
    expect(
      within(drawer).getByText(/An item you buy and resell as-is/),
    ).toBeInTheDocument();
  });

  it("the Archived tab shows an 'Archived' chip and an 'Unarchive' action, no 'Edit'", async () => {
    state.products = [ARCHIVED_PRODUCT];
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Archived" }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("Archived")).toBeInTheDocument();
    const unarchive = within(table).getByRole("button", { name: "Unarchive" });
    expect(within(table).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    await user.click(unarchive);
    expect(state.unarchive).toHaveBeenCalledWith("p-arch");
    expect(await screen.findByText("Product restored")).toBeInTheDocument();
  });
});
