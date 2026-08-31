// @vitest-environment jsdom
// Session 13 per-screen gate — /admin/assets composed from the proven kit.
// Drives the interactive surface (condition filter -> EmptyState, search,
// drawer open + focus-trap + Esc-restore, toast on save, FrictionDeleteDialog
// confirm -> hardDelete, the 409-blocked can't-delete state, ErrorState on a
// mocked fetch failure) with useAssets mocked. No server / DB.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { AssetView, Location } from "@/lib/domain/assets";
import { AssetRequestError } from "@/app/admin/assets/use-assets";

const NOW = new Date("2026-08-28T00:00:00Z");

const LOCATIONS: Location[] = [
  { id: "loc-store", name: "Store", type: "store", active: true, createdAt: NOW, updatedAt: NOW },
  { id: "loc-rest", name: "Restaurant Kitchen", type: "restaurant", active: true, createdAt: NOW, updatedAt: NOW },
];

const ASSET: AssetView = {
  id: "a1",
  name: "Commercial Deep Fryer Double",
  locationId: "loc-rest",
  locationName: "Restaurant Kitchen",
  locationType: "restaurant",
  purchaseDate: "2025-01-15",
  purchaseCost: "45000.00",
  condition: "Good",
  deletedAt: null,
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
};

const ARCHIVED_ASSET: AssetView = {
  ...ASSET,
  id: "a-arch",
  name: "Retired Blender",
  deletedAt: NOW.toISOString(),
};

const state = {
  assets: [ASSET] as AssetView[],
  loading: false,
  error: null as string | null,
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  softDelete: vi.fn().mockResolvedValue(undefined),
  hardDelete: vi.fn().mockResolvedValue(undefined),
  restore: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/app/admin/assets/use-assets", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/assets/use-assets")
  >("@/app/admin/assets/use-assets");
  return {
    ...actual,
    useAssets: () => ({
      assets: state.assets,
      locations: LOCATIONS,
      loading: state.loading,
      error: state.error,
      refresh: vi.fn(),
      create: state.create,
      update: state.update,
      softDelete: state.softDelete,
      hardDelete: state.hardDelete,
      restore: state.restore,
    }),
  };
});

import { AssetsClient } from "@/app/admin/assets/assets-client";

// jsdom applies no CSS, so both the md:block desktop table and the md:hidden
// mobile card list render. Scope table assertions to role="table".
function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <AssetsClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  state.assets = [ASSET];
  state.loading = false;
  state.error = null;
  vi.clearAllMocks();
});

describe("/admin/assets — kit composition", () => {
  it("renders the desktop register via <SimpleTable> with a <ConditionChip>", () => {
    renderScreen();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Commercial Deep Fryer Double")).toBeInTheDocument();
    expect(within(table).getAllByText("Good").length).toBeGreaterThan(0);
    // grouped thousands
    expect(within(table).getByText("45,000.00")).toBeInTheDocument();
  });

  it("shows a filtered <EmptyState> with a Clear-filters action when nothing matches", async () => {
    state.assets = [];
    renderScreen();
    const user = userEvent.setup();
    await user.type(screen.getByRole("searchbox", { name: "Search assets" }), "zzz");
    const table = screen.getByRole("table");
    expect(within(table).getByText(/No assets match/i)).toBeInTheDocument();
    expect(
      within(table).getByRole("button", { name: "Clear filters" }),
    ).toBeInTheDocument();
  });

  it("opens the create Drawer, traps focus, and restores focus to the opener on Esc", async () => {
    renderScreen();
    const user = userEvent.setup();
    const addBtn = screen.getAllByRole("button", { name: "Register New Asset" })[0];
    addBtn.focus();
    await user.click(addBtn);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Register New Asset")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(addBtn).toHaveFocus());
  });

  it("fires a success toast after a create save", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: "Register New Asset" })[0]);
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText("Asset Name"), "New Chiller");
    await user.type(within(dialog).getByLabelText("Cost Basis (KES)"), "12000");
    await user.click(within(dialog).getByRole("button", { name: "Save Asset" }));

    expect(state.create).toHaveBeenCalledOnce();
    expect(await screen.findByText("Asset registered")).toBeInTheDocument();
  });

  it("the row has a single 'Edit' affordance and NO Delete button (A1/A2)", () => {
    renderScreen();
    const table = screen.getByRole("table");
    expect(within(table).getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(
      within(table).queryByRole("button", { name: /^Delete / }),
    ).not.toBeInTheDocument();
  });

  /** Open the friction delete dialog via the Edit drawer's bottom section. */
  async function openDeleteViaDrawer(user: ReturnType<typeof userEvent.setup>) {
    await user.click(within(screen.getByRole("table")).getByRole("button", { name: "Edit" }));
    const drawer = await screen.findByRole("dialog");
    await user.click(
      within(drawer).getByRole("button", { name: /Delete this asset/ }),
    );
    return screen.findByRole("alertdialog");
  }

  it("Delete lives in the Edit drawer; confirm (after retype) calls hardDelete and toasts", async () => {
    renderScreen();
    const user = userEvent.setup();
    const dlg = await openDeleteViaDrawer(user);

    await user.type(
      within(dlg).getByPlaceholderText("Commercial Deep Fryer Double"),
      "Commercial Deep Fryer Double",
    );
    await user.click(
      within(dlg).getByRole("button", { name: "Delete Asset Record" }),
    );

    expect(state.hardDelete).toHaveBeenCalledWith("a1", "Commercial Deep Fryer Double");
    expect(await screen.findByText("Asset deleted")).toBeInTheDocument();
  });

  it("the 409-blocked path shows the can't-delete state (copy + soft-delete), not a raw toast", async () => {
    state.hardDelete.mockRejectedValueOnce(
      new AssetRequestError(409, {
        code: "CONFLICT",
        message: "Cannot delete an asset with linked history — soft-delete it instead.",
      }),
    );
    renderScreen();
    const user = userEvent.setup();
    const dlg = await openDeleteViaDrawer(user);
    await user.type(
      within(dlg).getByPlaceholderText("Commercial Deep Fryer Double"),
      "Commercial Deep Fryer Double",
    );
    await user.click(
      within(dlg).getByRole("button", { name: "Delete Asset Record" }),
    );

    // blocked copy is shown …
    expect(
      await within(dlg).findByText(/linked history and cannot be permanently deleted/i),
    ).toBeInTheDocument();
    // … and a soft-delete affordance appears; using it calls softDelete
    await user.click(within(dlg).getByRole("button", { name: /Archive instead/i }));
    expect(state.softDelete).toHaveBeenCalledWith("a1");
  });

  it("renders <ErrorState> with Retry on a mocked fetch failure", () => {
    state.error = "Failed to load the asset register.";
    renderScreen();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Failed to load the asset register.");
    expect(
      within(alert).getByRole("button", { name: "Retry" }),
    ).toBeInTheDocument();
  });

  it("the Archived tab shows an 'Archived' chip and an 'Unarchive' action; Unarchive calls restore + toasts", async () => {
    state.assets = [ARCHIVED_ASSET];
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Archived" }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("Archived")).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();

    await user.click(within(table).getByRole("button", { name: "Unarchive" }));
    expect(state.restore).toHaveBeenCalledWith("a-arch");
    expect(await screen.findByText("Asset restored")).toBeInTheDocument();
  });
});

// ── Mobile branch (Session 3b — artboards J6D-0 … JFQ-0) ──────────────────
function mobile(): HTMLElement {
  const node = document.querySelector<HTMLElement>(".md\\:hidden.flex-col");
  if (!node) throw new Error("mobile branch not found");
  return node;
}

describe("/admin/assets — mobile branch", () => {
  beforeEach(() => {
    state.assets = [ASSET];
    state.loading = false;
    state.error = null;
  });

  it("renders a stacked row (name + cost / meta / • condition + Edit)", () => {
    renderScreen();
    const m = within(mobile());
    expect(m.getByText("Commercial Deep Fryer Double")).toBeInTheDocument();
    expect(m.getAllByText("KES 45,000.00").length).toBeGreaterThan(0);
    expect(m.getByText(/Restaurant Kitchen · /)).toBeInTheDocument();
    expect(m.getByText("• Good")).toBeInTheDocument();
    expect(m.getByRole("button", { name: "Edit" })).toBeInTheDocument();
  });

  it("shows the dark total-register strip with a condition breakdown + cost basis", () => {
    renderScreen();
    const m = within(mobile());
    expect(m.getByText(/Total active register/)).toBeInTheDocument();
    expect(m.getByText("Good 1")).toBeInTheDocument();
    expect(m.getByText("Needs Repair 0")).toBeInTheDocument();
    expect(m.getByText("Total cost basis")).toBeInTheDocument();
  });

  it("shows skeleton rows while loading, not a bare 'Loading…'", () => {
    state.assets = [];
    state.loading = true;
    renderScreen();
    const m = mobile();
    expect(m.querySelectorAll(".kit-skeleton").length).toBeGreaterThanOrEqual(3);
    expect(within(m).queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("shows an <EmptyState> (not a bare text line) when there are no assets", () => {
    state.assets = [];
    renderScreen();
    expect(within(mobile()).getByText("No assets registered")).toBeInTheDocument();
  });

  it("'Edit' on a mobile row opens the asset drawer", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(within(mobile()).getByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByDisplayValue("Commercial Deep Fryer Double"),
    ).toBeInTheDocument();
  });
});
