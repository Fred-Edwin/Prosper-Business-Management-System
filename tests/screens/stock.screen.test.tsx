// @vitest-environment jsdom
// Session 11 per-screen gate — /admin/stock rebuilt as a kit composition.
// Drives the PillFilter, the ErrorState / filtered-EmptyState branches, the
// DenseLedger cell-click -> rail correction Drawer -> toast, with useLedger and
// stockApi mocked.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { LedgerRow } from "@/components/kit/dense-ledger";

const hook = vi.hoisted(() => ({
  data: {
    movements: [] as unknown[],
    priorClosing: new Map(),
    products: [] as unknown[],
    locations: [
      { id: "loc-store", name: "Store", type: "store" },
      { id: "loc-rest", name: "Restaurant", type: "restaurant" },
    ],
  },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));

const rowsBox = vi.hoisted(() => ({
  rows: [] as LedgerRow[],
  totals: undefined as unknown,
  cellMovements: new Map<string, Record<string, string[]>>(),
}));

const correctFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("@/app/admin/stock/use-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/use-stock")
  >("@/app/admin/stock/use-stock");
  return {
    ...actual,
    useLedger: () => hook,
    stockApi: { ...actual.stockApi, correct: correctFn },
  };
});

vi.mock("@/app/admin/stock/derive-ledger", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/derive-ledger")
  >("@/app/admin/stock/derive-ledger");
  return { ...actual, deriveLedgerRows: () => rowsBox };
});

import { StockClient } from "@/app/admin/stock/stock-client";

const CELL = { value: "0.0", dash: true } as const;
function makeRow(id: string, product: string): LedgerRow {
  return {
    id,
    location: "Store",
    product,
    opening: { value: "25.0" },
    purchases: { value: "+50.0", tone: "success" },
    issues: CELL,
    production: CELL,
    transferIn: CELL,
    transferOut: CELL,
    sold: CELL,
    soldValue: CELL,
    closing: { value: "75.0" },
    closingValue: CELL,
  };
}

function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <StockClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.loading = false;
  hook.error = null;
  rowsBox.rows = [makeRow("prod-1@loc-store", "Beef Fillet (kg)")];
  rowsBox.totals = undefined;
  rowsBox.cellMovements = new Map([
    ["prod-1@loc-store", { purchases: ["mv-1"] }],
  ]);
  hook.data.movements = [
    {
      id: "mv-1",
      productId: "prod-1",
      locationId: "loc-store",
      movementType: "purchase_receipt",
      quantity: "50.0",
      recordedById: "u1",
      occurredAt: "2026-08-24T09:00:00Z",
      reason: null,
      reasonNote: null,
      orderId: null,
      stockCountId: null,
      transferCounterpartLocationId: null,
      purchasePaymentId: null,
      purchaseSupplier: null,
      purchaseOrderedQty: null,
      purchaseTotalCost: null,
      purchasePaidFrom: null,
      correctsMovementId: null,
      note: null,
      createdAt: "2026-08-24T09:00:00Z",
      updatedAt: "2026-08-24T09:00:00Z",
    },
  ];
  hook.data.products = [
    { id: "prod-1", name: "Beef Fillet", unitLabel: "kg" },
  ];
});

describe("/admin/stock — kit composition", () => {
  it("renders the ledger with a location <PillFilter>", () => {
    renderScreen();
    const group = screen.getAllByRole("radiogroup", {
      name: "Filter by location",
    })[0];
    expect(within(group).getByRole("radio", { name: "All (2)" })).toBeInTheDocument();
    expect(within(group).getByRole("radio", { name: "Store" })).toBeInTheDocument();
  });

  it("shows <ErrorState> with a Retry when the fetch failed", () => {
    hook.error = "Failed to load the stock ledger.";
    renderScreen();
    const alert = screen.getAllByRole("alert")[0];
    expect(within(alert).getByText(/Couldn't load the stock ledger/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retry" })[0]).toBeInTheDocument();
  });

  it("shows a filtered <EmptyState> with Clear-filter when a location filter matches nothing", async () => {
    renderScreen();
    const user = userEvent.setup();
    rowsBox.rows = [];
    await user.click(
      screen.getAllByRole("radio", { name: "Restaurant" })[0],
    );
    const status = screen
      .getAllByRole("status")
      .find((n) => within(n).queryByText(/No stock movements for this filter/));
    expect(status).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Clear filter" })[0],
    ).toBeInTheDocument();
  });

  it("opens the rail correction Drawer from a ledger cell and toasts on save", async () => {
    correctFn.mockResolvedValueOnce({});
    renderScreen();
    const user = userEvent.setup();

    // The purchases cell is a button labelled "Correct Purchases (+) for Beef Fillet (kg)".
    const cell = screen.getByRole("button", {
      name: /Correct Purchases .* for Beef Fillet/,
    });
    await user.click(cell);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Adjust Row Movements")).toBeInTheDocument();

    const field = within(dialog).getByLabelText(/Purchase \(\+\)/);
    await user.clear(field);
    await user.type(field, "60");
    await user.click(
      within(dialog).getByRole("button", { name: /Confirm & Save Correction/ }),
    );

    await waitFor(() => expect(correctFn).toHaveBeenCalledOnce());
    expect(await screen.findByText("Correction saved")).toBeInTheDocument();
  });
});
