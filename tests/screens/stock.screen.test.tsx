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

// ── next/navigation ─────────────────────────────────────────────────
// URL state restoration (2026-09-17 client request) — StockClient now
// calls useRouter/useSearchParams to round-trip range/location/drill-in
// through the query string. No test here asserts on the written URL
// itself (that's covered by the derive-product-days / stock-client unit
// logic); these are just enough to let the component mount.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

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

// Ledger v2 — the period-summary / drill-in hooks always mount alongside
// useLedger (React hooks can't be conditional on the active view), so this
// single-day-focused spec stubs them idle/empty to keep the suite
// deterministic and network-free; the period-summary / drill-in behaviour
// itself is covered by stock-ledger-v2.screen.test.tsx.
const periodHook = vi.hoisted(() => ({
  data: {
    movements: [] as unknown[],
    periodClosing: new Map(),
    products: [] as unknown[],
    locations: [] as unknown[],
  },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const productDayHook = vi.hoisted(() => ({
  data: { movements: [] as unknown[], closingByDay: new Map() },
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
const recordNonSaleFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const setOpeningStockFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const recordCompletedTransferFn = vi.hoisted(() =>
  vi.fn().mockResolvedValue({}),
);
const correctBalanceFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const balancesFn = vi.hoisted(() =>
  vi.fn().mockResolvedValue([{ productId: "prod-1", locationId: "loc-store", quantity: "75.0000" }]),
);

vi.mock("@/app/admin/stock/use-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/use-stock")
  >("@/app/admin/stock/use-stock");
  return {
    ...actual,
    useLedger: () => hook,
    usePeriodLedger: () => periodHook,
    useProductDayLedger: () => productDayHook,
    stockApi: {
      ...actual.stockApi,
      correct: correctFn,
      recordNonSaleConsumption: recordNonSaleFn,
      setOpeningStock: setOpeningStockFn,
      recordCompletedTransfer: recordCompletedTransferFn,
      correctBalance: correctBalanceFn,
      balances: balancesFn,
    },
  };
});

// The KPI band now reads useFinancialSummary(from, to) — stub it idle so
// the single-day-focused assertions below don't depend on the money
// figures (covered by stock-ledger-v2.screen.test.tsx instead).
vi.mock("@/app/admin/financials/use-financials", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/app/admin/financials/use-financials")
  >();
  return {
    ...actual,
    useFinancialSummary: () => ({
      summary: null,
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
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

  it("clicking the Closing cell opens the balance-correction Drawer and toasts on save", async () => {
    renderScreen();
    const user = userEvent.setup();

    // The closing cell is a button labelled "Correct Closing for Beef Fillet (kg)".
    const cell = screen.getByRole("button", { name: /Correct Closing for Beef Fillet/ });
    await user.click(cell);

    await waitFor(() => expect(balancesFn).toHaveBeenCalledWith(["prod-1"], "loc-store"));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Correct Stock Balance")).toBeInTheDocument();
    expect(within(dialog).getByText("Current balance")).toBeInTheDocument();
    expect(within(dialog).getAllByText(/75\.0/).length).toBeGreaterThan(0);

    const field = within(dialog).getByLabelText(/Corrected balance/);
    await user.type(field, "0");
    const reason = within(dialog).getByLabelText(/Reason for correction/);
    await user.type(reason, "Client requested reset to zero");
    await user.click(
      within(dialog).getByRole("button", { name: /Confirm & Save Correction/ }),
    );

    await waitFor(() =>
      expect(correctBalanceFn).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: "prod-1",
          locationId: "loc-store",
          correctedBalance: "0",
          note: "Client requested reset to zero",
        }),
      ),
    );
    expect(await screen.findByText("Balance corrected")).toBeInTheDocument();
  });

  it("clicking a BLANK movement cell opens the record-entry drawer, not the correction drawer", async () => {
    renderScreen();
    const user = userEvent.setup();

    // nonSale is a dash cell in makeRow's fixture — no movement behind it.
    const cell = screen.getByRole("button", {
      name: /Correct Non-Sale .* for Beef Fillet/,
    });
    await user.click(cell);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Record New Entry")).toBeInTheDocument();
    // The correction drawer's title must NOT be the one that opened.
    expect(within(dialog).queryByText("Adjust Row Movements")).not.toBeInTheDocument();
  });

  it("records a new entry from a blank Non-Sale cell and toasts on save", async () => {
    recordNonSaleFn.mockResolvedValueOnce({});
    renderScreen();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /Correct Non-Sale .* for Beef Fillet/ }),
    );
    const dialog = await screen.findByRole("dialog");

    const field = within(dialog).getByLabelText(/Non-Sale \(-\)/);
    await user.type(field, "2");
    await user.click(within(dialog).getByRole("button", { name: "Save Entry" }));

    await waitFor(() => expect(recordNonSaleFn).toHaveBeenCalledOnce());
    expect(recordNonSaleFn).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod-1",
        locationId: "loc-store",
        quantity: "2",
        reason: "staff_meal",
        businessDate: expect.any(String),
      }),
    );
    expect(await screen.findByText("Entry recorded")).toBeInTheDocument();
  });

  it("clicking the Opening cell opens the record-entry drawer and calls setOpeningStock", async () => {
    setOpeningStockFn.mockResolvedValueOnce({});
    renderScreen();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Correct Opening for Beef Fillet (kg)" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Record New Entry")).toBeInTheDocument();

    const field = await within(dialog).findByLabelText(/^Opening/);
    await user.type(field, "30");
    await user.click(within(dialog).getByRole("button", { name: "Save Entry" }));

    await waitFor(() => expect(setOpeningStockFn).toHaveBeenCalledOnce());
    expect(setOpeningStockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod-1",
        locationId: "loc-store",
        quantity: "30",
      }),
    );
  });

  it("clicking a blank Sold cell shows an explanatory note, no drawer", async () => {
    renderScreen();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Correct Sold (-) for Beef Fillet (kg)" }),
    );

    expect(
      (await screen.findAllByText(/Sales are recorded through Orders or Canteen stock counts/))[0],
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("records a blank Transfer In cell via recordCompletedTransfer, picking the other location", async () => {
    recordCompletedTransferFn.mockResolvedValueOnce({});
    renderScreen();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Correct Transfer In (+) for Beef Fillet (kg)" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Record New Entry")).toBeInTheDocument();

    // Pick the "from" location — the fixture's other location, Restaurant.
    await user.click(within(dialog).getByRole("combobox", { name: "From location" }));
    await user.click(screen.getByRole("option", { name: "Restaurant" }));

    const field = await within(dialog).findByLabelText(/^Transfer In/);
    await user.type(field, "8");
    await user.click(within(dialog).getByRole("button", { name: "Save Entry" }));

    await waitFor(() => expect(recordCompletedTransferFn).toHaveBeenCalledOnce());
    expect(recordCompletedTransferFn).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod-1",
        fromLocationId: "loc-rest",
        toLocationId: "loc-store",
        quantity: "8",
      }),
    );
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
  it("shows the dark KPI strip with the stock-value figures", () => {
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    const m = within(mobile());
    expect(m.getByText("Opening Stock Value")).toBeInTheDocument();
    expect(m.getByText("Closing Stock Value")).toBeInTheDocument();
    expect(m.getByText("Non-Sale Stock Value")).toBeInTheDocument();
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

  it("renders the equation row (opening → movements → closing) and an 'Adjust' button", () => {
    render(
      <ToastProvider placement="top-right">
        <StockClient />
      </ToastProvider>,
    );
    const m = within(mobile());
    expect(m.getByText("Beef Fillet (kg)")).toBeInTheDocument();
    // The movement is a value stacked over its type (RM6-0 equation line),
    // not one run-together string — and it stays a button, since tapping it
    // is the mobile correction target.
    // Value and label are separate stacked spans (RM6-0), so the button's
    // accessible name concatenates them without a space.
    expect(m.getByRole("button", { name: "+50.0Purch" })).toBeInTheDocument();
    // Both ends of the equation are labelled and present.
    expect(m.getAllByText("Opening").length).toBeGreaterThan(0);
    expect(m.getAllByText("Closing").length).toBeGreaterThan(0);
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
