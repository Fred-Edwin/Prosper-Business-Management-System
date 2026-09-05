// @vitest-environment jsdom
// Per-screen gate — /admin/financials (M3 S3 → S7, restructured M5 S14,
// rebuilt to v2 in M5 "Dashboard & Financials v2" Session C).
//
// The S7 redesign replaced the single toolbar date picker with a RANGE
// control (SegmentedControl: Today / This week / This month / Custom).
// M5 S14 removed the Position & balances KPI strip (it moved to /admin).
// **v2** then removed the profit statement from this screen entirely (it
// lives on /admin now) and made the screen transaction-first:
//   • a six-tile KPI strip, ONE PER TAB, that doubles as a tab indicator
//     — clicking a tile switches tabs;
//   • "Debts owed to the business" as a real table of WHO owes, each row
//     linking to /admin/customers/[id] — a BALANCE, as of now, NOT
//     period-scoped (ADR-57);
//   • a SIXTH tab, Non-Sale Consumption (reason pills, resolved
//     recorded-by names, per-row ADR-55 est. cost, its own drawer).
//
// Flows take the whole range; balances are as-of now (ADR-57). stockApi +
// use-handovers + use-financials + use-financials-kpis mocked.
//
// NOTE (Session B's lesson, carried forward): these mocked-hook specs
// cannot catch shell/context-level bugs — they never mount the real
// dual-shell. They complement the manual `pnpm dev` walkthrough, they do
// not replace it.
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
    useOwingCustomers: () => ({ ...owingState, refresh: vi.fn() }),
    useNonSaleConsumption: () => ({
      ...nonSaleState,
      refresh: vi.fn(),
    }),
  };
});

// v2 — the Debts card's rows (a BALANCE read, no range).
let owingState: {
  customers: import("@/lib/domain/customers").CustomerListRow[];
  loading: boolean;
  error: string | null;
} = { customers: [], loading: false, error: null };

// v2 — the Non-Sale Consumption tab's joined read.
let nonSaleState: {
  movements: ReturnType<typeof movement>[];
  products: unknown[];
  locations: unknown[];
  staff: unknown[];
  loading: boolean;
  error: string | null;
} = {
  movements: [],
  products: [],
  locations: [],
  staff: [],
  loading: false,
  error: null,
};

// v2 — the KPI strip's own read (the three tiles the summary can't give).
let kpiState: import("@/app/admin/financials/use-financials-kpis").FinancialsKpis | null =
  null;
let kpiErrorState: string | null = null;
vi.mock("@/app/admin/financials/use-financials-kpis", () => ({
  useFinancialsKpis: () => ({
    kpis: kpiState,
    loading: false,
    error: kpiErrorState,
    refresh: vi.fn(),
  }),
}));

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
const GOODS_1 = { ...PROD_1, id: "goods-1", name: "Soda 300ml", kind: "goods", unitLabel: "pcs" };
const LOC_1 = {
  id: "loc-1",
  name: "Store",
  type: "store",
  active: true,
  createdAt: new Date("2026-08-01"),
  updatedAt: new Date("2026-08-01"),
};
const LOC_REST = { ...LOC_1, id: "loc-2", name: "Restaurant", type: "restaurant" };
const LOC_CANTEEN = { ...LOC_1, id: "loc-3", name: "Canteen", type: "canteen" };
const ALL_LOCATIONS = [LOC_1, LOC_REST, LOC_CANTEEN];

beforeEach(() => {
  vi.clearAllMocks();
  summaryRangeCalls.length = 0;
  api.listMovements.mockResolvedValue([]);
  api.outstanding.mockResolvedValue({ awaitingReceipt: [], unmatchedReceipts: [] });
  api.listProducts.mockResolvedValue([]);
  api.listLocations.mockResolvedValue([]);
  reconState = { data: null, loading: false, error: null };
  owingState = { customers: [], loading: false, error: null };
  nonSaleState = {
    movements: [],
    products: [],
    locations: [],
    staff: [],
    loading: false,
    error: null,
  };
  kpiState = null;
  kpiErrorState = null;
});

const nairobiToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(
    new Date(),
  );

describe("/admin/financials — shell", () => {
  it("has a date-range control and the six inner tabs", async () => {
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
      "Non-Sale Consumption",
    ]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
    // v2 — the profit statement left this screen entirely (it is on
    // /admin now); it is neither a tab nor an always-on panel here.
    expect(screen.queryByRole("tab", { name: "Profit" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Cost of goods sold/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Net profit$/i)).not.toBeInTheDocument();
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

  it("no longer renders a Position & balances KPI strip (moved to the /admin dashboard in M5 S14)", async () => {
    summaryState = { summary: null, loading: false, error: null };
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    expect(
      screen.queryByText(/Position & balances as of/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Total Business Liquidity"),
    ).not.toBeInTheDocument();
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

  // ADR-69 §2b — the Destination only offers locations legal for the
  // selected product's kind under ADR-67's location↔kind model. Without
  // this the Admin could pay for a delivery whose receipt R1 would later
  // reject (goods → Store): an unreceivable dead-end row no staff screen
  // can clear.
  async function openDrawerAndPick(
    user: ReturnType<typeof userEvent.setup>,
    productLabel: RegExp,
  ) {
    await screen.findByRole("table");
    await user.click(screen.getAllByRole("button", { name: "Record Payment" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: /Product/ }));
    await user.click(await screen.findByRole("option", { name: productLabel }));
    return dialog;
  }

  it("an ingredient offers the Store as the only destination", async () => {
    api.listProducts.mockResolvedValue([PROD_1, GOODS_1]);
    api.listLocations.mockResolvedValue(ALL_LOCATIONS);
    renderScreen();
    const user = userEvent.setup();
    const dialog = await openDrawerAndPick(user, /Rice Basmati/);

    await user.click(within(dialog).getByRole("combobox", { name: /Destination/ }));
    expect(await screen.findByRole("option", { name: "Store" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Restaurant" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Canteen" })).not.toBeInTheDocument();
  });

  it("goods offer the Restaurant and Canteen, never the Store", async () => {
    api.listProducts.mockResolvedValue([PROD_1, GOODS_1]);
    api.listLocations.mockResolvedValue(ALL_LOCATIONS);
    renderScreen();
    const user = userEvent.setup();
    const dialog = await openDrawerAndPick(user, /Soda 300ml/);

    await user.click(within(dialog).getByRole("combobox", { name: /Destination/ }));
    expect(await screen.findByRole("option", { name: "Restaurant" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Canteen" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Store" })).not.toBeInTheDocument();
  });

  it("switching product to an incompatible kind clears a now-illegal destination", async () => {
    api.listProducts.mockResolvedValue([PROD_1, GOODS_1]);
    api.listLocations.mockResolvedValue(ALL_LOCATIONS);
    renderScreen();
    const user = userEvent.setup();
    const dialog = await openDrawerAndPick(user, /Rice Basmati/);

    await user.click(within(dialog).getByRole("combobox", { name: /Destination/ }));
    await user.click(await screen.findByRole("option", { name: "Store" }));
    expect(
      within(dialog).getByRole("combobox", { name: /Destination/ }),
    ).toHaveTextContent("Store");

    // Rice → Soda: the Store is no longer legal, so the stale value goes.
    await user.click(within(dialog).getByRole("combobox", { name: /Product/ }));
    await user.click(await screen.findByRole("option", { name: /Soda 300ml/ }));
    await waitFor(() =>
      expect(
        within(dialog).getByRole("combobox", { name: /Destination/ }),
      ).not.toHaveTextContent("Store"),
    );
    // …and with no destination the form can't submit.
    expect(within(dialog).getByRole("button", { name: /Disburse/ })).toBeDisabled();
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
    // Total Cost auto-fills from quantity × the product's prefilled unit
    // cost (180.00) — no need to type it.
    await user.click(within(dialog).getByRole("button", { name: /Disburse/ }));

    expect(api.recordPurchasePayment).toHaveBeenCalledOnce();
    expect(api.recordPurchasePayment).toHaveBeenCalledWith(
      expect.objectContaining({ quantity: "100", cost: "18000.00" }),
    );
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

// ── v2 — KPI strip ──────────────────────────────────────────────────────

const KPIS = {
  purchases: { total: 14600, count: 6 },
  deliveries: { received: 4, pending: 2 },
  handovers: { declared: 28, shortfalls: 1 },
  expenses: { count: 28 },
  ownerDraws: { count: 4 },
  nonSale: { count: 14 },
};

const SUMMARY = {
  from: "2026-09-01",
  to: "2026-09-30",
  perLocation: [],
  consolidated: {
    revenue: "0.00",
    cogs: "0.00",
    grossProfit: "0.00",
    totalExpenses: "88300.00",
    netProfit: "0.00",
    debtsOwedToBusiness: "520.00",
    ownerOwedToBusiness: "0.00",
    ownerDrawsForPeriod: "18000.00",
    cashBalance: "0.00",
    mpesaBankBalance: "0.00",
  },
  nonSaleConsumption: {
    total: "11500.00",
    byReason: {
      staffMeal: "0.00",
      complimentary: "0.00",
      spoiled: "0.00",
      damaged: "0.00",
      other: "0.00",
    },
    dishWasteCostPercent: "0.60",
  },
} as unknown as import("@/lib/domain/financials").FinancialSummary;

describe("/admin/financials — v2 KPI strip", () => {
  it("renders one tile per tab, with amount-led and count-led figures", async () => {
    kpiState = KPIS;
    summaryState = { summary: SUMMARY, loading: false, error: null };
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());

    // Amount-led tiles take their figure from the summary / the KPI read.
    expect(screen.getAllByText("14,600.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("88,300.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("18,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("11,500.00").length).toBeGreaterThan(0);
    // Count-led tiles — an open item shows the count, not an amount.
    expect(screen.getAllByText("2 pending").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1 shortfall").length).toBeGreaterThan(0);
    // Captions.
    expect(screen.getAllByText("6 payments").length).toBeGreaterThan(0);
    expect(screen.getAllByText("14 write-offs").length).toBeGreaterThan(0);
  });

  it("clicking a tile switches to that tab", async () => {
    kpiState = KPIS;
    summaryState = { summary: SUMMARY, loading: false, error: null };
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());

    expect(screen.getByRole("tab", { name: "Stock Purchases" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // The tile is a button whose accessible name starts with its label.
    await user.click(
      screen.getAllByRole("button", { name: /Owner Draws/ })[0],
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Owner Draws" })).toHaveAttribute(
        "aria-selected",
        "true",
      ),
    );

    await user.click(
      screen.getAllByRole("button", { name: /Non-Sale Consumption/ })[0],
    );
    await waitFor(() =>
      expect(
        screen.getByRole("tab", { name: "Non-Sale Consumption" }),
      ).toHaveAttribute("aria-selected", "true"),
    );
  });

  it("shows an error state instead of six '—' tiles when the strip read fails", async () => {
    // Regression guard: the tiles render "—" with no data, which would
    // read as real zeroes if a failed read said nothing at all.
    kpiState = null;
    kpiErrorState = "Network request failed.";
    summaryState = { summary: SUMMARY, loading: false, error: null };
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());

    expect(
      screen.getAllByText(/Couldn't load the period figures/).length,
    ).toBeGreaterThan(0);
    // The tab row still works, so nothing becomes unreachable.
    expect(
      screen.getByRole("tab", { name: "Stock Purchases" }),
    ).toBeInTheDocument();
  });

  it("marks the active tab's tile as pressed — the strip doubles as a tab indicator", async () => {
    kpiState = KPIS;
    summaryState = { summary: SUMMARY, loading: false, error: null };
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());

    const purchasesTiles = screen.getAllByRole("button", {
      name: /Stock Purchases/,
    });
    expect(purchasesTiles.some((b) => b.getAttribute("aria-pressed") === "true")).toBe(
      true,
    );
    const expensesTiles = screen.getAllByRole("button", { name: /Expenses/ });
    expect(
      expensesTiles.every((b) => b.getAttribute("aria-pressed") === "false"),
    ).toBe(true);
  });
});

// ── v2 — Debts card ─────────────────────────────────────────────────────

const OWING = [
  {
    id: "cust-1",
    name: "James Otieno",
    phone: "0700000001",
    balance: "320.00",
    lastActivityAt: "2026-09-02T08:00:00Z",
    oldestDebtAt: "2026-08-29T08:00:00Z",
  },
  {
    id: "cust-2",
    name: "Grace Wambui",
    phone: "0700000002",
    balance: "200.00",
    lastActivityAt: "2026-09-02T08:00:00Z",
    oldestDebtAt: "2026-09-02T08:00:00Z",
  },
];

describe("/admin/financials — v2 Debts card", () => {
  it("lists who owes and links each row to that customer's detail page", async () => {
    owingState = { customers: OWING, loading: false, error: null };
    summaryState = { summary: SUMMARY, loading: false, error: null };
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());

    const james = screen.getAllByRole("link", { name: /James Otieno/ })[0];
    expect(james).toHaveAttribute("href", "/admin/customers/cust-1");
    const grace = screen.getAllByRole("link", { name: /Grace Wambui/ })[0];
    expect(grace).toHaveAttribute("href", "/admin/customers/cust-2");

    // The total is the summary's authoritative balance, not a re-sum.
    expect(screen.getAllByText("KES 520.00").length).toBeGreaterThan(0);
    // "Oldest unpaid" renders as a real date, per customer.
    expect(screen.getAllByText("Aug 29, 2026").length).toBeGreaterThan(0);
    // And the trailing "view all" row goes to the full register.
    expect(
      screen.getAllByRole("link", { name: /View all customer credit/ })[0],
    ).toHaveAttribute("href", "/admin/customers");
  });

  it("carries the mandatory 'as of today' caption — it is a balance, not a period figure", async () => {
    owingState = { customers: OWING, loading: false, error: null };
    summaryState = { summary: SUMMARY, loading: false, error: null };
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    expect(screen.getAllByText(/as of today/i).length).toBeGreaterThan(0);
  });

  it("says so plainly when nobody owes", async () => {
    owingState = { customers: [], loading: false, error: null };
    summaryState = { summary: SUMMARY, loading: false, error: null };
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    expect(
      screen.getAllByText(/No customer owes the business right now/).length,
    ).toBeGreaterThan(0);
  });
});

// ── v2 — Non-Sale Consumption tab ───────────────────────────────────────

const STAFF = [
  {
    id: "s1",
    name: "Mary Njeri",
    role: "cashier",
    locationId: "loc-2",
    locationName: "Restaurant",
    dailyRate: "0.00",
    active: true,
    userId: "u-mary",
    userActive: true,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  },
];

/** A dish priced at the Restaurant — exercises the ADR-55 dish valuation. */
const DISH_PRICED = {
  ...DISH_1,
  locations: [
    {
      locationId: "loc-2",
      locationName: "Restaurant",
      locationType: "restaurant",
      sellingPrice: "100.00",
      active: true,
    },
  ],
};

async function openNonSale(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: "Non-Sale Consumption" }));
}

describe("/admin/financials — v2 Non-Sale Consumption tab", () => {
  it("renders reason pills, resolves recorded-by names, and values each row per ADR-55", async () => {
    summaryState = { summary: SUMMARY, loading: false, error: null };
    nonSaleState = {
      movements: [
        movement({
          id: "ns-1",
          movementType: "non_sale_consumption",
          productId: "dish-1",
          locationId: "loc-2",
          quantity: "-2.0000",
          reason: "spoiled",
          recordedById: "u-mary",
        }),
        movement({
          id: "ns-2",
          movementType: "non_sale_consumption",
          productId: "goods-1",
          locationId: "loc-3",
          quantity: "-3.0000",
          reason: "complimentary",
          // No Staff row links this User — resolved as "—", never guessed.
          recordedById: "u-unknown",
        }),
      ],
      products: [DISH_PRICED, GOODS_1],
      locations: ALL_LOCATIONS,
      staff: STAFF,
      loading: false,
      error: null,
    };
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    await openNonSale(user);

    // Reason pills.
    expect(screen.getAllByText("Spoiled").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Complimentary").length).toBeGreaterThan(0);
    // Products + locations resolved from the lookups.
    expect(screen.getAllByText("Pilau").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Canteen").length).toBeGreaterThan(0);
    // Recorded-by resolved via StaffView.userId → name.
    expect(screen.getAllByText("Mary Njeri").length).toBeGreaterThan(0);
    // ADR-55 dish valuation: 2 units × 100.00 × 0.60 = 120.00.
    expect(screen.getAllByText("120.00").length).toBeGreaterThan(0);
    // ingredient/goods valuation: 3 units × 180.00 = 540.00.
    expect(screen.getAllByText("540.00").length).toBeGreaterThan(0);
  });

  it("shows the server-computed total in the toolbar, not a sum of the rows", async () => {
    summaryState = { summary: SUMMARY, loading: false, error: null };
    nonSaleState = {
      movements: [
        movement({
          id: "ns-1",
          movementType: "non_sale_consumption",
          productId: "goods-1",
          locationId: "loc-3",
          quantity: "-1.0000",
          reason: "damaged",
          recordedById: "u-mary",
        }),
      ],
      products: [GOODS_1],
      locations: ALL_LOCATIONS,
      staff: STAFF,
      loading: false,
      error: null,
    };
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    await openNonSale(user);

    // One row on screen, but the authoritative period total is the
    // summary's 11,500.00 — never re-derived from the visible rows.
    expect(
      screen.getAllByText(/1 write-off .*KES 11,500\.00/).length,
    ).toBeGreaterThan(0);
  });

  it("keeps the column headers when the period has no write-offs", async () => {
    summaryState = { summary: SUMMARY, loading: false, error: null };
    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    await openNonSale(user);

    for (const head of ["Date", "Product", "Location", "Qty", "Reason", "Recorded by", "Est. cost"]) {
      expect(screen.getAllByText(head).length).toBeGreaterThan(0);
    }
    expect(
      screen.getAllByText(/No non-sale use recorded/).length,
    ).toBeGreaterThan(0);
  });

  it("'Record Non-Sale Use' opens the drawer and submits one line", async () => {
    summaryState = { summary: SUMMARY, loading: false, error: null };
    nonSaleState = {
      movements: [],
      products: [
        {
          ...GOODS_1,
          locations: [
            {
              locationId: "loc-3",
              locationName: "Canteen",
              locationType: "canteen",
              sellingPrice: "50.00",
              active: true,
            },
          ],
        },
      ],
      locations: ALL_LOCATIONS,
      staff: STAFF,
      loading: false,
      error: null,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(api.listMovements).toHaveBeenCalled());
    await openNonSale(user);

    await user.click(
      screen.getAllByRole("button", { name: "Record Non-Sale Use" })[0],
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: /Location/ }));
    await user.click(await screen.findByRole("option", { name: "Canteen" }));
    await user.click(within(dialog).getByRole("combobox", { name: /Product/ }));
    await user.click(await screen.findByRole("option", { name: "Soda 300ml" }));
    await user.type(within(dialog).getByLabelText(/Quantity/), "3");
    await user.click(within(dialog).getByRole("combobox", { name: /Reason/ }));
    await user.click(await screen.findByRole("option", { name: "Spoiled" }));

    await user.click(
      within(dialog).getByRole("button", { name: "Record Non-Sale Use" }),
    );

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        ([url]) => url === "/api/stock-movements/non-sale/batch",
      );
      expect(call).toBeDefined();
      expect(JSON.parse(call![1].body)).toMatchObject({
        locationId: "loc-3",
        reason: "spoiled",
        lines: [{ productId: "goods-1", quantity: "3" }],
      });
    });

    vi.unstubAllGlobals();
  });
});
