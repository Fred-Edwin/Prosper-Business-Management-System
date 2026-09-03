// @vitest-environment jsdom
// Per-screen gate — /admin/financials (M3 S3 → S7). One screen; the S7
// redesign replaced the single toolbar date picker with a RANGE control
// (SegmentedControl: Today / This week / This month / Custom), promoted
// the Profit panel OUT of the tab row into an always-on block, and left
// FIVE inner tabs: Stock Purchases / Deliveries / Handovers / Expenses /
// Owner Draws. Flows take the whole range; balances are as-of the range
// end (ADR-57). stockApi + use-handovers + use-financials mocked.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { ReconciliationView } from "@/lib/domain/handovers";

const api = vi.hoisted(() => ({
  listMovements: vi.fn(),
  outstanding: vi.fn(),
  listProducts: vi.fn(),
  listLocations: vi.fn(),
  recordPurchasePayment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/admin/stock/use-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/use-stock")
  >("@/app/admin/stock/use-stock");
  return { ...actual, stockApi: api };
});

// Handovers tab pulls its own read — keep it quiet unless a test drives it.
const reconRefresh = vi.fn();
let reconState: {
  data: ReconciliationView | null;
  loading: boolean;
  error: string | null;
} = { data: null, loading: false, error: null };
vi.mock("@/app/admin/financials/use-handovers", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/app/admin/financials/use-handovers")
    >();
  return {
    ...actual,
    useReconciliation: () => ({
      data: reconState.data,
      loading: reconState.loading,
      error: reconState.error,
      refresh: reconRefresh,
      recordReceipt: vi.fn(),
      correct: vi.fn(),
    }),
  };
});

// S4 wired the KPI strip + added the Expenses / Owner Draws / Profit tabs.
// This shell spec covers the transaction tabs only — stub the financials
// hooks so the shell's own summary fetch doesn't hit the network.
let summaryState: {
  summary: import("@/lib/domain/financials").FinancialSummary | null;
  loading: boolean;
  error: string | null;
} = { summary: null, loading: false, error: null };
/** Records the (from, to) each render of the shell asks the summary hook for. */
const summaryRangeCalls: Array<{ from: string; to: string }> = [];
vi.mock("@/app/admin/financials/use-financials", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/app/admin/financials/use-financials")
    >();
  return {
    ...actual,
    useFinancialSummary: (from: string, to: string) => {
      summaryRangeCalls.push({ from, to });
      return { ...summaryState, refresh: vi.fn() };
    },
    useExpenses: () => ({
      expenses: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      create: vi.fn(),
      correct: vi.fn(),
    }),
    useOwnerTransactions: () => ({
      transactions: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      create: vi.fn(),
    }),
  };
});

import { FinancialsClient } from "@/app/admin/financials/financials-client";

function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <FinancialsClient />
    </ToastProvider>,
  );
}

/** The desktop / mobile branches both render (jsdom applies no media queries). */
function desktop(): HTMLElement {
  const node = document.querySelector<HTMLElement>(".md\\:flex.flex-col.grow");
  if (!node) throw new Error("desktop branch not found");
  return node;
}

// S7: the KPI figures live inside the always-on <ProfitPanelDesktop>
// (`.hidden.md\:flex` container, `--surface-subtle` ground) above the tab
// row. Scope KPI assertions to that panel.
function kpiDesktop(): HTMLElement {
  const nodes = document.querySelectorAll<HTMLElement>(".hidden.md\\:flex");
  for (const n of nodes) {
    if (n.textContent?.includes("Position & balances as of")) return n;
  }
  throw new Error("desktop Profit panel (KPI row) not found");
}

function movement(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "m1",
    productId: "prod-1",
    locationId: "loc-1",
    movementType: "purchase_payment",
    quantity: "0.0000",
    recordedById: "u1",
    occurredAt: new Date().toISOString(),
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

const PROD_1 = {
  id: "prod-1",
  name: "Rice Basmati",
  kind: "ingredient",
  unitLabel: "kg",
  buyingPrice: "180.00",
  deletedAt: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  locations: [],
};
const DISH_1 = { ...PROD_1, id: "dish-1", name: "Pilau", kind: "dish", unitLabel: "plate" };
const LOC_1 = {
  id: "loc-1",
  name: "Store",
  type: "store",
  active: true,
  createdAt: new Date("2026-08-01"),
  updatedAt: new Date("2026-08-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
  summaryRangeCalls.length = 0;
  api.listMovements.mockResolvedValue([]);
  api.outstanding.mockResolvedValue({ awaitingReceipt: [], unmatchedReceipts: [] });
  api.listProducts.mockResolvedValue([]);
  api.listLocations.mockResolvedValue([]);
  reconState = { data: null, loading: false, error: null };
});

const nairobiToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(
    new Date(),
  );

describe("/admin/financials — shell", () => {
  it("has a date-range control and the five inner tabs", async () => {
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    // The range control is a radiogroup of presets (kit SegmentedControl).
    expect(
      screen.getAllByRole("radiogroup", { name: "Date range" }).length,
    ).toBeGreaterThan(0);
    for (const name of [
      "Stock Purchases",
      "Deliveries",
      "Handovers",
      "Expenses",
      "Owner Draws",
    ]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    // Profit is no longer a tab — it is the always-on panel.
    expect(screen.queryByRole("tab", { name: "Profit" })).not.toBeInTheDocument();
  });

  it("defaults to Today — scopes listMovements to from===to===today", async () => {
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    const today = nairobiToday();
    expect(api.listMovements).toHaveBeenCalledWith(
      expect.objectContaining({
        movementType: "purchase_payment",
        from: today,
        to: today,
      }),
    );
  });

  it("switching to 'This week' refetches with a Mon–today (or wider) range", async () => {
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    api.listMovements.mockClear();

    await user.click(
      screen.getAllByRole("radio", { name: "This week" })[0],
    );

    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    const call = api.listMovements.mock.calls.at(-1)![0] as {
      from: string;
      to: string;
    };
    const today = nairobiToday();
    // Monday-first week: `from` <= today <= `to`, and the span is 7 days.
    expect(call.from <= today).toBe(true);
    expect(call.to >= today).toBe(true);
    const days =
      (Date.parse(`${call.to}T00:00:00Z`) -
        Date.parse(`${call.from}T00:00:00Z`)) /
      86_400_000;
    expect(days).toBe(6);
  });

  it("switching a preset re-drives the summary hook with the new range (flows follow the whole range)", async () => {
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    const today = nairobiToday();
    // Default: Today → from === to === today.
    expect(summaryRangeCalls.at(-1)).toEqual({ from: today, to: today });

    await user.click(
      screen.getAllByRole("radio", { name: "This month" })[0],
    );
    await waitFor(() => {
      const last = summaryRangeCalls.at(-1)!;
      expect(last.from).toBe(`${today.slice(0, 7)}-01`);
      expect(last.to >= today).toBe(true);
    });
  });

  it("the Profit panel KPI row is captioned 'as of <date>' and shows — per tile until the summary loads", async () => {
    summaryState = { summary: null, loading: false, error: null };
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    const panel = kpiDesktop();
    expect(
      within(panel).getByText(/Position & balances as of/i),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Total Business Liquidity")).toBeInTheDocument();
    // Unresolved summary → an em-dash per position tile.
    expect(within(panel).getAllByText("—").length).toBe(4);
  });
});

describe("/admin/financials — Stock Purchases tab", () => {
  it("renders the purchases table with a date-scoped EmptyState + Record-Payment action", async () => {
    renderScreen();
    const table = await screen.findByRole("table");
    expect(
      within(table).getByText(/No stock purchases on/),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("button", { name: "Record Payment" }),
    ).toBeInTheDocument();
  });

  it("reads the real purchase_* fields and folds status into a chip", async () => {
    api.listMovements.mockImplementation(
      ({ movementType }: { movementType: string }) =>
        Promise.resolve(
          movementType === "purchase_payment"
            ? [
                movement({
                  id: "pp1",
                  purchaseSupplier: "Nairobi Grains Millers",
                  purchaseOrderedQty: "100.0000",
                  purchaseTotalCost: "18000.00",
                  purchasePaidFrom: "mpesa_bank",
                }),
              ]
            : [],
        ),
    );
    api.outstanding.mockResolvedValue({
      awaitingReceipt: [movement({ id: "pp1" })],
      unmatchedReceipts: [],
    });
    api.listProducts.mockResolvedValue([PROD_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Nairobi Grains Millers")).toBeInTheDocument();
    expect(within(table).getByText("18,000.00")).toBeInTheDocument();
    expect(within(table).getByText("M-Pesa / Bank Till")).toBeInTheDocument();
    // status chip — this payment has no receipt yet
    expect(within(table).getByText("Awaiting delivery")).toBeInTheDocument();
  });

  it("a delivered payment (not in awaitingReceipt) shows Delivered", async () => {
    api.listMovements.mockImplementation(
      ({ movementType }: { movementType: string }) =>
        Promise.resolve(
          movementType === "purchase_payment"
            ? [movement({ id: "pp-done", purchaseSupplier: "Farmer's Choice", purchaseTotalCost: "9000.00" })]
            : [],
        ),
    );
    api.outstanding.mockResolvedValue({ awaitingReceipt: [], unmatchedReceipts: [] });
    api.listProducts.mockResolvedValue([PROD_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Delivered")).toBeInTheDocument();
  });
});

describe("/admin/financials — Deliveries tab", () => {
  it("switches to Deliveries and shows an unmatched receipt with a Record-payment affordance", async () => {
    api.listMovements.mockImplementation(
      ({ movementType }: { movementType: string }) =>
        Promise.resolve(
          movementType === "purchase_receipt"
            ? [
                movement({
                  id: "rc1",
                  movementType: "purchase_receipt",
                  quantity: "46.0000",
                  purchasePaymentId: null,
                }),
              ]
            : [],
        ),
    );
    api.outstanding.mockResolvedValue({
      awaitingReceipt: [],
      unmatchedReceipts: [
        movement({ id: "rc1", movementType: "purchase_receipt", purchasePaymentId: null }),
      ],
    });
    api.listProducts.mockResolvedValue([PROD_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("tab", { name: "Deliveries" }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("Unmatched")).toBeInTheDocument();
    await user.click(within(table).getByRole("button", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("combobox", { name: /Product/ }),
    ).toHaveTextContent(/Rice Basmati/);
  });
});

describe("/admin/financials — payment drawer", () => {
  it("the product picker excludes Dishes", async () => {
    api.listProducts.mockResolvedValue([PROD_1, DISH_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getAllByRole("button", { name: "Record Payment" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: /Product/ }));
    expect(
      await screen.findByRole("option", { name: /Rice Basmati/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: /Pilau/ }),
    ).not.toBeInTheDocument();
  });

  it("records a payment and fires a toast", async () => {
    api.listProducts.mockResolvedValue([PROD_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getAllByRole("button", { name: "Record Payment" })[0]);
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/Supplier/), "Nairobi Grains Millers");
    await user.click(within(dialog).getByRole("combobox", { name: /Product/ }));
    await user.click(await screen.findByRole("option", { name: /Rice Basmati/ }));
    await user.click(within(dialog).getByRole("combobox", { name: /Destination/ }));
    await user.click(await screen.findByRole("option", { name: "Store" }));
    await user.type(within(dialog).getByLabelText(/Quantity/), "100");
    await user.type(within(dialog).getByLabelText(/Total Cost/), "18000.00");
    await user.click(within(dialog).getByRole("button", { name: /Disburse/ }));

    expect(api.recordPurchasePayment).toHaveBeenCalledOnce();
    expect(await screen.findByText("Payment recorded")).toBeInTheDocument();
  });
});

describe("/admin/financials — Handovers tab", () => {
  it("shows the reconciliation table for the toolbar date", async () => {
    reconState = {
      data: {
        date: "2026-09-02",
        rows: [
          {
            handoverId: "h1",
            staffId: "s1",
            staffName: "Grace Cashier",
            locationId: "loc-rest",
            locationName: "Restaurant",
            occurredAt: new Date().toISOString(),
            cashDeclared: "5000.00",
            mpesaDeclared: "3000.00",
            cashReceived: null,
            mpesaReceived: null,
            cashVariance: null,
            mpesaVariance: null,
            received: false,
            shortfallNotes: [],
            receiptId: null,
          },
        ],
        totals: {
          cashDeclared: "5000.00",
          mpesaDeclared: "3000.00",
          cashReceived: "0.00",
          mpesaReceived: "0.00",
          cashVariance: "0.00",
          mpesaVariance: "0.00",
        },
      },
      loading: false,
      error: null,
    };
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("tab", { name: "Handovers" }));

    expect((await screen.findAllByText("Grace Cashier")).length).toBeGreaterThan(0);
    // today → the primary action is present
    expect(
      screen.getAllByRole("button", { name: "Record receipt" }).length,
    ).toBeGreaterThan(0);
    // totals strip
    expect(screen.getAllByText("Totals").length).toBeGreaterThan(0);
  });

  it("keeps the table headers + an empty-state message when the day has no handovers", async () => {
    reconState = {
      data: {
        date: "2026-09-03",
        rows: [],
        totals: {
          cashDeclared: "0.00",
          mpesaDeclared: "0.00",
          cashReceived: "0.00",
          mpesaReceived: "0.00",
          cashVariance: "0.00",
          mpesaVariance: "0.00",
        },
      },
      loading: false,
      error: null,
    };
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("tab", { name: "Handovers" }));

    const table = await screen.findByRole("table");
    // Headers stay visible…
    expect(
      within(table).getByRole("columnheader", { name: "Staff" }),
    ).toBeInTheDocument();
    // …and an explicit "no handovers" message renders in the body.
    expect(
      screen.getAllByText(/No handovers for this day/).length,
    ).toBeGreaterThan(0);
  });
});
