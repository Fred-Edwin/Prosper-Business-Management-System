// @vitest-environment jsdom
// Session 11 per-screen gate — /admin/stock rebuilt as a kit composition.
// 3e retrofit: the location <PillFilter> is now the shared kit <FilterToolbar>
// (Location · Category · Date). Drives that toolbar, the ErrorState /
// filtered-EmptyState branches, the DenseLedger cell-click -> rail correction
// Drawer -> toast, with useLedger and stockApi mocked.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { LedgerRow } from "@/components/kit/dense-ledger";

const hook = vi.hoisted(() => ({
  data: {
    movements: [] as unknown[],
    dayClosing: new Map(),
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
    nonSale: CELL,
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
  it("renders the ledger with the shared <FilterToolbar> — Location · Category · Date at their defaults, no Reset", () => {
    renderScreen();
    const toolbar = within(
      screen.getAllByRole("search", { name: "Filter the stock ledger" })[0],
    );
    // Location select (kit names its combobox with the control label).
    expect(
      toolbar.getByRole("combobox", { name: "Location" }),
    ).toBeInTheDocument();
    expect(
      toolbar.getByRole("combobox", { name: "Category" }),
    ).toBeInTheDocument();
    // Date control at its default business day; nothing off default → no Reset.
    expect(
      toolbar.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();
  });

  it("changing the Location select re-queries (state moves off default) and shows Reset", async () => {
    renderScreen();
    const user = userEvent.setup();
    const toolbar = within(
      screen.getAllByRole("search", { name: "Filter the stock ledger" })[0],
    );
    await user.click(toolbar.getByRole("combobox", { name: "Location" }));
    await user.click(
      screen.getByRole("option", { name: "Location: Restaurant" }),
    );
    expect(
      await screen.findAllByRole("button", { name: "Reset" }),
    ).not.toHaveLength(0);
  });

  it("shows <ErrorState> with a Retry when the fetch failed", () => {
    hook.error = "Failed to load the stock ledger.";
    renderScreen();
    const alert = screen.getAllByRole("alert")[0];
    expect(within(alert).getByText(/Couldn't load the stock ledger/)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Retry" })[0]).toBeInTheDocument();
  });

  it("shows a filtered <EmptyState> with Reset when a location filter matches nothing", async () => {
    renderScreen();
    const user = userEvent.setup();
    rowsBox.rows = [];
    const toolbar = within(
      screen.getAllByRole("search", { name: "Filter the stock ledger" })[0],
    );
    await user.click(toolbar.getByRole("combobox", { name: "Location" }));
    await user.click(
      screen.getByRole("option", { name: "Location: Restaurant" }),
    );
    expect(
      screen.getAllByText(/No stock movements for this filter/)[0],
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Reset filters" })[0],
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

// ── Mobile branch (Session 3b — artboard 8Q4-0) ───────────────────────────
// jsdom applies no media queries, so both `hidden md:flex` (desktop) and
// `flex md:hidden` (mobile) render. `mobile()` scopes to the mobile branch.
function mobile(): HTMLElement {
  const node = document.querySelector<HTMLElement>(".md\\:hidden.flex-col.grow");
  if (!node) throw new Error("mobile branch not found");
  return node;
}

describe("/admin/stock — mobile branch", () => {
  it("shows the dark KPI strip, unwired (— / M3)", () => {
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    const m = within(mobile());
    expect(m.getByText("Stock on Hand (Total)")).toBeInTheDocument();
    expect(m.getByText("Today's Sold Value")).toBeInTheDocument();
    expect(m.getAllByText("M3").length).toBe(2);
  });

  it("shows a 'KES —' sub-line under each row's closing quantity (M3-unwired)", () => {
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    expect(within(mobile()).getAllByText("KES —").length).toBeGreaterThan(0);
  });

  it("shows skeleton rows while loading (not a bare 'Loading…' line)", () => {
    hook.loading = true;
    rowsBox.rows = [];
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    const m = mobile();
    expect(m.querySelectorAll(".kit-skeleton").length).toBeGreaterThanOrEqual(3);
    expect(within(m).queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("shows a plain <EmptyState> (not a bare text line) when the day has no movements", () => {
    hook.loading = false;
    rowsBox.rows = [];
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    expect(within(mobile()).getByText("No movements this day")).toBeInTheDocument();
  });

  it("renders a stacked row with short chip labels and an 'Adjust' button", () => {
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    const m = within(mobile());
    expect(m.getByText("Beef Fillet (kg)")).toBeInTheDocument();
    expect(m.getByText("+50.0 Purch")).toBeInTheDocument();
    expect(m.getByRole("button", { name: "Adjust" })).toBeInTheDocument();
  });

  it("'Adjust' on a single-movement row opens the correction Drawer", async () => {
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    const user = userEvent.setup();
    await user.click(within(mobile()).getByRole("button", { name: "Adjust" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Adjust Row Movements")).toBeInTheDocument();
  });

  it("has a sticky bottom bar with an 'Opening Stock' link", () => {
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    const link = within(mobile()).getByRole("link", { name: "Opening Stock" });
    expect(link).toHaveAttribute("href", "/admin/stock/opening");
  });
});
