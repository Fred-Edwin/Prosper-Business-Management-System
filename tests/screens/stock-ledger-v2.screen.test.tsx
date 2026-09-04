// @vitest-environment jsdom
// Ledger v2 — the /admin/stock range control (Today / This week / This
// month / Custom, reusing the Financials <FinancialsRangeControl> /
// useFinancialsRange as-is), the money KPI band (useFinancialSummary), and
// the Week/Month period-summary + "View days →" drill-in. The existing
// single-day behaviour (FilterToolbar, correction drawer, mobile stacked
// rows) is covered by stock.screen.test.tsx and is untouched here.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { LedgerRow } from "@/components/kit/dense-ledger";
import type { PeriodSummaryRow } from "@/app/admin/stock/derive-period-summary";
import type { ProductDayRow } from "@/app/admin/stock/derive-product-days";
import type { FinancialSummary } from "@/lib/domain/financials";

const singleDayHook = vi.hoisted(() => ({
  data: {
    movements: [] as unknown[],
    dayClosing: new Map(),
    products: [] as unknown[],
    locations: [{ id: "loc-store", name: "Store", type: "store" }],
  },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));

const periodHook = vi.hoisted(() => ({
  data: {
    movements: [] as unknown[],
    periodClosing: new Map(),
    products: [
      { id: "prod-1", name: "Beef Fillet", unitLabel: "kg", kind: "ingredient" },
    ] as unknown[],
    locations: [{ id: "loc-store", name: "Store", type: "store" }],
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

const periodRowsBox = vi.hoisted(() => ({
  rows: [] as PeriodSummaryRow[],
  totals: undefined as unknown,
}));

const dayRowsBox = vi.hoisted(() => ({
  rows: [] as ProductDayRow[],
}));

const singleDayRowsBox = vi.hoisted(() => ({
  rows: [] as LedgerRow[],
  totals: undefined as unknown,
  cellMovements: new Map<string, Record<string, string[]>>(),
}));

vi.mock("@/app/admin/stock/use-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/use-stock")
  >("@/app/admin/stock/use-stock");
  return {
    ...actual,
    useLedger: () => singleDayHook,
    usePeriodLedger: () => periodHook,
    useProductDayLedger: () => productDayHook,
  };
});

vi.mock("@/app/admin/stock/derive-ledger", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/derive-ledger")
  >("@/app/admin/stock/derive-ledger");
  return { ...actual, deriveLedgerRows: () => singleDayRowsBox };
});

vi.mock("@/app/admin/stock/derive-period-summary", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/derive-period-summary")
  >("@/app/admin/stock/derive-period-summary");
  return { ...actual, derivePeriodSummaryRows: () => periodRowsBox };
});

vi.mock("@/app/admin/stock/derive-product-days", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/derive-product-days")
  >("@/app/admin/stock/derive-product-days");
  return { ...actual, deriveProductDayRows: () => dayRowsBox.rows };
});

const financialSummary = vi.hoisted(() => ({
  summary: null as FinancialSummary | null,
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));

vi.mock("@/app/admin/financials/use-financials", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/app/admin/financials/use-financials")
  >();
  return {
    ...actual,
    useFinancialSummary: () => financialSummary,
  };
});

import { StockClient } from "@/app/admin/stock/stock-client";

function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <StockClient />
    </ToastProvider>,
  );
}

function desktop(): HTMLElement {
  const node = document.querySelector<HTMLElement>(".hidden.md\\:flex.flex-col.grow");
  if (!node) throw new Error("desktop branch not found");
  return node;
}

const CELL = { dash: true } as const;
function periodRow(over: Partial<PeriodSummaryRow> = {}): PeriodSummaryRow {
  return {
    id: "prod-1@loc-store",
    location: "Store",
    product: "Beef Fillet (kg)",
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
    flagged: false,
    ...over,
  };
}

function dayRow(businessDate: string, over: Partial<ProductDayRow> = {}): ProductDayRow {
  return {
    id: businessDate,
    businessDate,
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
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  singleDayHook.loading = false;
  singleDayHook.error = null;
  singleDayHook.data.movements = [];
  singleDayHook.data.products = [];
  singleDayRowsBox.rows = [];
  singleDayRowsBox.totals = undefined;
  singleDayRowsBox.cellMovements = new Map();

  periodHook.loading = false;
  periodHook.error = null;
  periodHook.data.movements = [];
  periodHook.data.products = [
    { id: "prod-1", name: "Beef Fillet", unitLabel: "kg", kind: "ingredient" },
  ];
  periodRowsBox.rows = [periodRow()];
  periodRowsBox.totals = undefined;

  productDayHook.loading = false;
  productDayHook.error = null;
  dayRowsBox.rows = [dayRow("2026-09-01"), dayRow("2026-09-02")];

  financialSummary.summary = {
    from: "2026-09-01",
    to: "2026-09-07",
    perLocation: [],
    consolidated: {
      revenue: "84200.00",
      cogs: "31000.00",
      grossProfit: "53200.00",
      totalExpenses: "5000.00",
      netProfit: "48200.00",
      debtsOwedToBusiness: "0.00",
      ownerOwedToBusiness: "0.00",
      ownerDrawsForPeriod: "0.00",
      cashBalance: "0.00",
      mpesaBankBalance: "0.00",
    },
    nonSaleConsumption: {
      total: "1200.00",
      byReason: {
        staffMeal: "800.00",
        complimentary: "200.00",
        spoiled: "100.00",
        damaged: "100.00",
        other: "0.00",
      },
      dishWasteCostPercent: "0.60",
    },
  };
  financialSummary.loading = false;
  financialSummary.error = null;
});

describe("/admin/stock — Ledger v2 KPI band", () => {
  it("renders 4 money figures sourced from useFinancialSummary", () => {
    renderScreen();
    const d = within(desktop());
    expect(d.getByText("Sales Revenue")).toBeInTheDocument();
    expect(d.getByText("Cost of Goods Sold")).toBeInTheDocument();
    expect(d.getByText("Non-Sale Stock Value")).toBeInTheDocument();
    expect(d.getByText("Gross Profit")).toBeInTheDocument();
    expect(d.getByText("KES 84,200")).toBeInTheDocument();
    expect(d.getByText("KES 31,000")).toBeInTheDocument();
    expect(d.getByText("KES 1,200")).toBeInTheDocument();
    expect(d.getByText("KES 53,200")).toBeInTheDocument();
  });
});

describe("/admin/stock — range control switches the grid", () => {
  it("defaults to Today — single-day view — and has a Date filter control", () => {
    renderScreen();
    const toolbar = within(
      screen.getAllByRole("search", { name: "Filter the stock ledger" })[0],
    );
    expect(toolbar.getByRole("button", { name: /Date:/ })).toBeInTheDocument();
  });

  it("switching to 'This week' swaps the grid to the period-summary view", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.click(screen.getAllByRole("radio", { name: "This week" })[0]);

    await waitFor(() => {
      expect(screen.getAllByText("Beef Fillet (kg)").length).toBeGreaterThan(0);
    });
    // The single-day Date filter control drops off in Week/Month.
    const toolbar = within(
      screen.getAllByRole("search", { name: "Filter the stock ledger" })[0],
    );
    expect(toolbar.queryByRole("button", { name: /Date:/ })).not.toBeInTheDocument();
  });
});

describe("/admin/stock — period-summary drill-in", () => {
  async function toWeekView(user: ReturnType<typeof userEvent.setup>) {
    renderScreen();
    await user.click(screen.getAllByRole("radio", { name: "This week" })[0]);
    await waitFor(() => {
      expect(screen.getAllByText("Beef Fillet (kg)").length).toBeGreaterThan(0);
    });
  }

  it("clicking into a period-summary row shows the day-by-day drill-in table", async () => {
    const user = userEvent.setup();
    await toWeekView(user);

    const cell = screen.getAllByRole("button", {
      name: /Correct Purchases .* for Beef Fillet/,
    })[0];
    await user.click(cell);

    expect(
      (await screen.findAllByText("← Back to period summary")).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Beef Fillet (kg)").length).toBeGreaterThan(0);
  });

  it("'Back to period summary' returns to the period-summary grid", async () => {
    const user = userEvent.setup();
    await toWeekView(user);

    const cell = screen.getAllByRole("button", {
      name: /Correct Purchases .* for Beef Fillet/,
    })[0];
    await user.click(cell);
    await waitFor(() =>
      expect(screen.getAllByText("← Back to period summary").length).toBeGreaterThan(0),
    );

    await user.click(screen.getAllByText("← Back to period summary")[0]);

    await waitFor(() => {
      expect(
        screen.queryByText("← Back to period summary"),
      ).not.toBeInTheDocument();
    });
    expect(screen.getAllByText("Beef Fillet (kg)").length).toBeGreaterThan(0);
  });

  it("a flagged row renders with the amber warning marker", async () => {
    periodRowsBox.rows = [periodRow({ flagged: true })];
    const user = userEvent.setup();
    await toWeekView(user);
    expect(screen.getAllByText(/⚠ Beef Fillet \(kg\)/).length).toBeGreaterThan(0);
  });
});
