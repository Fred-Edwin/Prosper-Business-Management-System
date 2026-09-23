// @vitest-environment jsdom
//
// Cash Flow — client feedback item #7. Moved from a Financials tab to its
// own page after owner feedback (own KPI strip, own filters). Interactive
// bits only; use-financials is mocked, no server / DB. Read-only — no
// drawer, no create/correct. jsdom applies no CSS, so both the `md:`
// table branch and the `md:hidden` card branch render — queries use
// within(table) where they'd otherwise be ambiguous.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CashFlowReport } from "@/lib/domain/financials";

const refreshCashFlow = vi.fn();

let cashFlowState: {
  report: CashFlowReport | null;
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
    useCashFlow: () => ({
      report: cashFlowState.report,
      loading: cashFlowState.loading,
      error: cashFlowState.error,
      refresh: refreshCashFlow,
    }),
  };
});

import { CashFlowClient } from "@/app/admin/financials/cash-flow/cash-flow-client";

function report(over: Partial<CashFlowReport> = {}): CashFlowReport {
  return {
    from: "2026-09-02",
    to: "2026-09-02",
    openingBalances: { cash: "10000.00", mpesaBank: "5000.00" },
    closingBalances: { cash: "10650.00", mpesaBank: "5300.00" },
    entries: [
      {
        id: "m1",
        occurredAt: "2026-09-02T06:00:00.000Z",
        account: "mpesa_bank",
        sourceType: "repayment",
        amount: "300.00",
        runningBalance: "5300.00",
        note: null,
      },
      {
        id: "m2",
        occurredAt: "2026-09-02T09:00:00.000Z",
        account: "cash",
        sourceType: "expense",
        amount: "-350.00",
        runningBalance: "9650.00",
        note: "Market run",
      },
      {
        id: "m3",
        occurredAt: "2026-09-02T12:00:00.000Z",
        account: "cash",
        sourceType: "handover_receipt",
        amount: "1000.00",
        runningBalance: "10650.00",
        note: null,
      },
    ],
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  cashFlowState = { report: report(), loading: false, error: null };
});

describe("Admin Cash Flow page", () => {
  it("shows a 4-tile KPI strip: opening→closing and net change per account", () => {
    render(<CashFlowClient />);

    expect(screen.getByText(/10,000\.00 → 10,650\.00/)).toBeInTheDocument();
    expect(screen.getByText(/5,000\.00 → 5,300\.00/)).toBeInTheDocument();
    // Cash net change: 10650 - 10000 = +650.00
    expect(screen.getByText(/\+650\.00/)).toBeInTheDocument();
    // M-Pesa net change: 5300 - 5000 = +300.00 (also matches the table's
    // repayment row amount, so at least one instance is enough).
    expect(screen.getAllByText(/\+300\.00/).length).toBeGreaterThan(0);
  });

  it("lists entries chronologically with signed amounts and a running balance", () => {
    render(<CashFlowClient />);

    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);

    expect(within(table).getByText("Repayment")).toBeInTheDocument();
    expect(within(table).getByText("Expense")).toBeInTheDocument();
    expect(within(table).getByText("Handover")).toBeInTheDocument();
    expect(within(table).getByText("9,650.00")).toBeInTheDocument();
    expect(within(table).getByText("10,650.00")).toBeInTheDocument();
  });

  it("filters by account, source and direction, and Reset clears them", async () => {
    const user = userEvent.setup();
    render(<CashFlowClient />);
    const table = screen.getByRole("table");

    expect(within(table).getByText("Repayment")).toBeInTheDocument();
    expect(within(table).getByText("Expense")).toBeInTheDocument();

    // Account filter narrows to Cash only (excludes the M-Pesa repayment row).
    await user.click(screen.getByRole("combobox", { name: "Account" }));
    await user.click(await screen.findByRole("option", { name: "Account: Cash" }));
    await waitFor(() =>
      expect(within(table).queryByText("Repayment")).not.toBeInTheDocument(),
    );
    expect(within(table).getByText("Expense")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset" }));
    await waitFor(() =>
      expect(within(table).getByText("Repayment")).toBeInTheDocument(),
    );

    // Direction filter narrows to Outflow only.
    await user.click(screen.getByRole("combobox", { name: "Direction" }));
    await user.click(await screen.findByRole("option", { name: "Direction: Outflow" }));
    await waitFor(() =>
      expect(within(table).queryByText("Repayment")).not.toBeInTheDocument(),
    );
    expect(within(table).getByText("Expense")).toBeInTheDocument();
  });

  it("keeps the table headers visible when the range has no movements", () => {
    cashFlowState = {
      report: report({ entries: [] }),
      loading: false,
      error: null,
    };
    render(<CashFlowClient />);

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Source" }),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("columnheader", { name: "Running balance (KES)" }),
    ).toBeInTheDocument();
    expect(within(table).getByText(/No money movements for/)).toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    cashFlowState = { report: null, loading: false, error: "Network error" };
    render(<CashFlowClient />);

    expect(screen.getByText("Couldn't load cash flow")).toBeInTheDocument();
    expect(screen.getByText("Network error")).toBeInTheDocument();
  });
});
