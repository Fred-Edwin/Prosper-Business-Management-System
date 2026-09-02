// @vitest-environment jsdom
//
// M3 S4 — the Admin Financials Expenses tab + Owner Draws tab + the wired
// KPI strip. Interactive bits only; use-financials is mocked, no server /
// DB. jsdom applies no CSS, so both the `md:` table branch and the
// `md:hidden` card branch render — queries use getAllBy / within where
// they'd otherwise be ambiguous.

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
import { KpiStripDesktop } from "@/app/admin/financials/kpi-strip";

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
        <ExpensesView date="2026-09-02" />
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

  it("corrects an existing expense with the absolute corrected amount", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider placement="top-right">
        <ExpensesView date="2026-09-02" />
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
  it("shows the running owed-to-business figure and logs a draw", async () => {
    const user = userEvent.setup();
    const onMutated = vi.fn();
    render(
      <ToastProvider placement="top-right">
        <OwnerDrawsView
          date="2026-09-02"
          owedToBusiness="4000.00"
          onMutated={onMutated}
        />
      </ToastProvider>,
    );

    expect(screen.getByText("KES 4,000.00")).toBeInTheDocument();

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

// ── KPI strip ──────────────────────────────────────────────────────────

describe("Admin Financials — KPI strip", () => {
  it("renders the four wired figures from the summary", () => {
    render(<KpiStripDesktop summary={summary()} loading={false} />);
    // Liquidity = 25,000 + 15,000.
    expect(screen.getByText("40,000.00")).toBeInTheDocument();
    expect(screen.getByText("25,000.00")).toBeInTheDocument();
    expect(screen.getByText("15,000.00")).toBeInTheDocument();
    // Today's outflows = total expenses.
    expect(screen.getByText("800.00")).toBeInTheDocument();
  });

  it("shows an em-dash when the summary failed to load", () => {
    render(<KpiStripDesktop summary={null} loading={false} />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
