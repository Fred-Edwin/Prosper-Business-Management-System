// @vitest-environment jsdom
// Session 9C per-screen gate — the /admin/catalog Locations tab.
// Drives the interactive bits only (add, deactivate, the 409 guard
// message) with useLocations mocked. No server / DB. Read-only display is
// not specced.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { Location } from "@/lib/domain/catalog";
import { CatalogRequestError } from "@/app/admin/catalog/use-catalog";

const NOW = new Date("2026-09-03T00:00:00Z");

const LOCATIONS: Location[] = [
  { id: "loc-store", name: "Store", type: "store", active: true, createdAt: NOW, updatedAt: NOW },
  { id: "loc-canteen", name: "Canteen", type: "canteen", active: true, createdAt: NOW, updatedAt: NOW },
  { id: "loc-old", name: "Old Kiosk", type: "store", active: false, createdAt: NOW, updatedAt: NOW },
];

const state = {
  locations: LOCATIONS as Location[],
  loading: false,
  error: null as string | null,
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  deactivate: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/app/admin/catalog/use-locations", () => ({
  useLocations: () => ({
    locations: state.locations,
    loading: state.loading,
    error: state.error,
    refresh: vi.fn(),
    create: state.create,
    update: state.update,
    deactivate: state.deactivate,
  }),
}));

// Keep the Products tab (also mounted) from reaching for `fetch`.
vi.mock("@/app/admin/catalog/use-catalog", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/catalog/use-catalog")
  >("@/app/admin/catalog/use-catalog");
  return {
    ...actual,
    useCatalog: () => ({
      products: [],
      locations: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
      hardDelete: vi.fn(),
      unarchive: vi.fn(),
    }),
  };
});

import { CatalogClient } from "@/app/admin/catalog/catalog-client";

function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <CatalogClient initialTab="locations" />
    </ToastProvider>,
  );
}

async function gotoLocationsTab(user: ReturnType<typeof userEvent.setup>) {
  // initialTab already "locations"; this is a no-op click that also proves
  // the tab exists.
  await user.click(screen.getByRole("tab", { name: "Locations" }));
}

// jsdom renders both the desktop <table> and the mobile card list. Find a
// row in the table whose first cell (the strong Name column) starts with
// `name` — the inactive row's Name cell also carries an "Inactive" chip.
function tableRowByName(name: string): HTMLElement {
  const table = screen.getByRole("table");
  const row = within(table)
    .getAllByRole("row")
    .find((r) => {
      const first = within(r).queryAllByRole("cell")[0];
      return first?.textContent?.trim().startsWith(name) ?? false;
    });
  if (!row) throw new Error(`no table row named ${name}`);
  return row;
}

beforeEach(() => {
  state.locations = LOCATIONS;
  state.loading = false;
  state.error = null;
  vi.clearAllMocks();
});

describe("/admin/catalog — Locations tab", () => {
  it("has a Locations tab and lists the locations with their status", async () => {
    renderScreen();
    const user = userEvent.setup();
    await gotoLocationsTab(user);

    expect(tableRowByName("Store")).toBeInTheDocument();
    expect(tableRowByName("Canteen")).toBeInTheDocument();
    // The inactive one shows an "Inactive" chip + a Reactivate action.
    const oldRow = tableRowByName("Old Kiosk");
    expect(within(oldRow).getAllByText("Inactive").length).toBeGreaterThan(0);
    expect(
      within(oldRow).getByRole("button", { name: "Reactivate" }),
    ).toBeInTheDocument();
  });

  it("adds a location through the drawer", async () => {
    renderScreen();
    const user = userEvent.setup();
    await gotoLocationsTab(user);

    await user.click(screen.getByRole("button", { name: "Add Location" }));

    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByRole("textbox", { name: /Location Name/i }),
      "Warehouse",
    );
    // default type is Restaurant; switch to Store
    await user.click(within(dialog).getByRole("radio", { name: "Store" }));
    await user.click(
      within(dialog).getByRole("button", { name: "Create Location" }),
    );

    await waitFor(() =>
      expect(state.create).toHaveBeenCalledWith({
        name: "Warehouse",
        type: "store",
      }),
    );
  });

  it("deactivates a location after confirming", async () => {
    renderScreen();
    const user = userEvent.setup();
    await gotoLocationsTab(user);

    const storeRow = tableRowByName("Store");
    await user.click(
      within(storeRow).getByRole("button", { name: "Deactivate" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: /Deactivate location/i,
    });
    await user.click(
      within(dialog).getByRole("button", { name: "Deactivate" }),
    );

    await waitFor(() =>
      expect(state.deactivate).toHaveBeenCalledWith("loc-store"),
    );
  });

  it("surfaces the domain's 409 reason when deactivation is blocked", async () => {
    const guardMessage =
      "Cannot deactivate this location — it still has 2 active staff member(s), stock on hand for 1 product(s). Reassign staff, move stock out, and resolve transfers first.";
    state.deactivate.mockRejectedValueOnce(
      new CatalogRequestError(409, {
        code: "CONFLICT",
        message: guardMessage,
      }),
    );

    renderScreen();
    const user = userEvent.setup();
    await gotoLocationsTab(user);

    const canteenRow = tableRowByName("Canteen");
    await user.click(
      within(canteenRow).getByRole("button", { name: "Deactivate" }),
    );

    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Deactivate" }),
    );

    // The specific guard reason is shown verbatim — not a generic string.
    expect(await within(dialog).findByText(guardMessage)).toBeInTheDocument();
    // And the dialog stays open (deactivation did not go through).
    expect(within(dialog).getByText(guardMessage)).toBeInTheDocument();
  });
});
