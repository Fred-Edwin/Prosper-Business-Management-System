// @vitest-environment jsdom
//
// M3 S4 / S7 — the Admin Financials Expenses tab + Owner Draws tab + the
// KPI row (kit-native, redesigned in S7). Interactive bits only;
// use-financials is mocked, no server / DB. jsdom applies no CSS, so both
// the `md:` table branch and the `md:hidden` card branch render — queries
// use getAllBy / within where they'd otherwise be ambiguous.
//
// S7: the tabs take a business-date RANGE (`from`/`to`) not a single
// `date` — expenses / owner draws are FLOWS (ADR-57). The KPI strip
// became <KpiRowDesktop> in profit-panel.tsx (no box, hairline dividers,
// mono figures) and carries an "as of <date>" caption because every
// figure in it is a point-in-time BALANCE.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type {
  ExpenseView,
  FinancialSummary,
  OwnerTransactionView,
} from "@/lib/domain/financials";

// ── mock use-financials ────────────────────────────────────────────────
const createExpense = vi.fn();
const correctExpense = vi.fn();
const createOwnerTxn = vi.fn();
const refreshExpenses = vi.fn();
const refreshOwner = vi.fn();

let expensesState: {
  expenses: ExpenseView[];
  loading: boolean;
  error: string | null;
};
let ownerState: {
  transactions: OwnerTransactionView[];
  loading: boolean;
  error: string | null;
};

vi.mock("@/app/admin/financials/use-financials", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/app/admin/financials/use-financials")
    >();
  return {
    ...actual,
    useExpenses: () => ({
      expenses: expensesState.expenses,
      loading: expensesState.loading,
      error: expensesState.error,
      refresh: refreshExpenses,
      create: createExpense,
      correct: correctExpense,
    }),
    useOwnerTransactions: () => ({
      transactions: ownerState.transactions,
      loading: ownerState.loading,
      error: ownerState.error,
      refresh: refreshOwner,
      create: createOwnerTxn,
    }),
  };
});

import { ExpensesView } from "@/app/admin/financials/expenses-tab";
import { OwnerDrawsView } from "@/app/admin/financials/owner-draws-tab";
import { KpiRowDesktop } from "@/app/admin/financials/profit-panel";

// ── fixtures ───────────────────────────────────────────────────────────

function expense(over: Partial<ExpenseView> = {}): ExpenseView {
  return {
    id: "e1",
    category: "transport",
    amount: "800.00",
    date: "2026-09-02T09:00:00.000Z",
    paidFromAccount: "cash",
    note: "Market run",
    recordedById: "admin",
    corrected: false,
    occurredAt: "2026-09-02T09:00:00.000Z",
    ...over,
  };
}

function summary(over: Partial<FinancialSummary["consolidated"]> = {}): FinancialSummary {
  return {
    from: "2026-09-02",
    to: "2026-09-02",
    perLocation: [],
    consolidated: {
      revenue: "10000.00",
      cogs: "4000.00",
      grossProfit: "6000.00",
      totalExpenses: "800.00",
      netProfit: "5200.00",
      debtsOwedToBusiness: "1200.00",
      ownerOwedToBusiness: "4000.00",
      cashBalance: "25000.00",
      mpesaBankBalance: "15000.00",
      ...over,
    },
    nonSaleConsumption: {
      total: "0.00",
      byReason: {
        staffMeal: "0.00",
        complimentary: "0.00",
        spoiled: "0.00",
        damaged: "0.00",
        other: "0.00",
      },
      dishWasteCostPercent: "0.60",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  expensesState = { expenses: [expense()], loading: false, error: null };
  ownerState = { transactions: [], loading: false, error: null };
  createExpense.mockResolvedValue(expense());
  correctExpense.mockResolvedValue(expense({ amount: "950.00", corrected: true }));
  createOwnerTxn.mockResolvedValue({
    id: "o1",
    type: "draw",
    amount: "5000.00",
    date: "2026-09-02T12:00:00.000Z",
    note: null,
    occurredAt: "2026-09-02T12:00:00.000Z",
  } satisfies OwnerTransactionView);
});

// ── Expenses tab ───────────────────────────────────────────────────────

describe("Admin Financials — Expenses tab", () => {
  it("records an expense through the drawer and fires a toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider placement="top-right">
        <ExpensesView from="2026-09-02" to="2026-09-02" />
      </ToastProvider>,
    );

    await user.click(
      screen.getAllByRole("button", { name: "Record Expense" })[0],
    );
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByRole("combobox", { name: /Category/ }));
    await user.click(await screen.findByRole("option", { name: "Utilities" }));

    await user.type(within(dialog).getByLabelText(/^Amount/), "1650");
    await user.type(within(dialog).getByLabelText(/^Note/), "KPLC token");

    await user.click(
      within(dialog).getByRole("button", { name: "Record Expense" }),
    );

    await waitFor(() => expect(createExpense).toHaveBeenCalledOnce());
    expect(createExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "utilities",
        amount: "1650",
        date: "2026-09-02",
        paidFromAccount: "cash",
        note: "KPLC token",
      }),
    );
    expect(await screen.findByText("Expense recorded")).toBeInTheDocument();
  });

  it("keeps the table headers visible when the range has no expenses", async () => {
    expensesState = { expenses: [], loading: false, error: null };
    render(
      <ToastProvider placement="top-right">
        <ExpensesView from="2026-09-01" to="2026-09-07" />
      </ToastProvider>,
    );
    // The <SimpleTable> renders even with zero rows — its column headers
    // are present, and the EmptyState copy sits inside the table body.
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Category" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Amount (KES)" }),
    ).toBeInTheDocument();
    expect(within(table).getByText(/No expenses for/)).toBeInTheDocument();
  });

  it("corrects an existing expense with the absolute corrected amount", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider placement="top-right">
        <ExpensesView from="2026-09-02" to="2026-09-02" />
      </ToastProvider>,
    );

    await user.click(screen.getAllByRole("button", { name: "Correct" })[0]);
    const dialog = await screen.findByRole("dialog");

    const amount = within(dialog).getByLabelText(/^Amount/);
    await user.clear(amount);
    await user.type(amount, "950.00");
    await user.click(
      within(dialog).getByRole("button", { name: "Save Correction" }),
    );

    await waitFor(() => expect(correctExpense).toHaveBeenCalledOnce());
    // The note prefills from the original and carries through unchanged.
    expect(correctExpense).toHaveBeenCalledWith("e1", "950.00", "Market run");
    expect(await screen.findByText("Expense corrected")).toBeInTheDocument();
  });
});

// ── Owner Draws tab ────────────────────────────────────────────────────

describe("Admin Financials — Owner Draws tab", () => {
  it("keeps the table headers visible when the range has no draws / returns", async () => {
    ownerState = { transactions: [], loading: false, error: null };
    render(
      <ToastProvider placement="top-right">
        <OwnerDrawsView
          from="2026-09-01"
          to="2026-09-07"
          owedToBusiness="0.00"
          asOfLabel="7 Sep 2026"
          onMutated={vi.fn()}
        />
      </ToastProvider>,
    );
    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Type" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Amount (KES)" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(/No draws or returns for/),
    ).toBeInTheDocument();
  });

  it("shows the running owed-to-business figure and logs a draw", async () => {
    const user = userEvent.setup();
    const onMutated = vi.fn();
    render(
      <ToastProvider placement="top-right">
        <OwnerDrawsView
          from="2026-09-02"
          to="2026-09-02"
          owedToBusiness="4000.00"
          asOfLabel="2 Sep 2026"
          onMutated={onMutated}
        />
      </ToastProvider>,
    );

    expect(screen.getByText("KES 4,000.00")).toBeInTheDocument();
    // The owed-to-business figure is a BALANCE — labelled point-in-time.
    expect(screen.getByText(/as of 2 Sep 2026/)).toBeInTheDocument();

    await user.click(
      screen.getAllByRole("button", { name: "Log Draw / Return" })[0],
    );
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^Amount/), "5000");
    await user.click(within(dialog).getByRole("button", { name: "Record Draw" }));

    await waitFor(() => expect(createOwnerTxn).toHaveBeenCalledOnce());
    expect(createOwnerTxn).toHaveBeenCalledWith(
      expect.objectContaining({ type: "draw", amount: "5000", date: "2026-09-02" }),
    );
    expect(onMutated).toHaveBeenCalled();
  });
});

// ── KPI row (kit-native, S7) ──────────────────────────────────────────

describe("Admin Financials — KPI row", () => {
  it("renders the four position figures from the summary, all as balances", () => {
    render(
      <KpiRowDesktop
        summary={summary()}
        asOfLabel="7 Sep 2026"
        loading={false}
      />,
    );
    // Liquidity = cash 25,000 + M-Pesa 15,000 = 40,000.
    expect(screen.getByText("KES 40,000.00")).toBeInTheDocument();
    expect(screen.getByText("KES 25,000.00")).toBeInTheDocument();
    expect(screen.getByText("KES 15,000.00")).toBeInTheDocument();
    // Owed back by the owner = ownerOwedToBusiness.
    expect(screen.getByText("KES 4,000.00")).toBeInTheDocument();
  });

  it("captions the row 'as of <date>' so the figures read as point-in-time balances", () => {
    render(
      <KpiRowDesktop
        summary={summary()}
        asOfLabel="7 Sep 2026"
        loading={false}
      />,
    );
    expect(
      screen.getByText(/Position & balances as of 7 Sep 2026/i),
    ).toBeInTheDocument();
  });

  it("shows an em-dash when the summary failed to load", () => {
    render(
      <KpiRowDesktop summary={null} asOfLabel="7 Sep 2026" loading={false} />,
    );
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
