// @vitest-environment jsdom
// M2 Session 6 per-screen gate — C6 (Cashier mobile customers list +
// balances). Composed from the kit: <SearchInput> + a mobile row list +
// the kit <BottomSheet> repayment form. Feature hook mocked; no server.
//
// Contract checks (plan §3.6): C6 shows a derived balance read-out and a
// repayment action, and NO order-level / cost / margin detail.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { CustomerListRow } from "@/lib/domain/customers";

const ROWS: CustomerListRow[] = [
  {
    id: "c1",
    name: "Grace Wanjiru",
    phone: "0722000111",
    balance: "1200.00",
    lastActivityAt: "2026-08-28T09:00:00.000Z",
    oldestDebtAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "c2",
    name: "John Otieno",
    phone: "0733222444",
    balance: "0.00",
    lastActivityAt: null,
    oldestDebtAt: null,
  },
];

const state = {
  customers: [...ROWS] as CustomerListRow[],
  loading: false,
  error: null as string | null,
  recordRepayment: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/app/admin/customers/use-customers", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/customers/use-customers")
  >("@/app/admin/customers/use-customers");
  return {
    ...actual,
    useCustomers: () => ({
      customers: state.customers,
      loading: state.loading,
      error: state.error,
      refresh: vi.fn(),
      createCustomer: vi.fn(),
      recordRepayment: state.recordRepayment,
    }),
  };
});

import { CashierCustomersClient } from "@/app/cashier/customers/customers-client";

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <CashierCustomersClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  state.customers = [...ROWS];
  state.loading = false;
  state.error = null;
  vi.clearAllMocks();
});

describe("C6 — Cashier customers list", () => {
  it("lists customers with a derived balance read-out (owes / Settled)", () => {
    renderScreen();
    expect(screen.getByText("Grace Wanjiru")).toBeInTheDocument();
    // C6 list balance is whole-KES, no decimals (artboard DDD-0).
    expect(screen.getByText("KES 1,200")).toBeInTheDocument();
    expect(screen.getByText("Settled")).toBeInTheDocument();
  });

  it("shows NO order detail / cost / margin (plan §3.6 role scoping)", () => {
    renderScreen();
    expect(screen.queryByText(/margin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/buying price/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cost/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no customers", () => {
    state.customers = [];
    renderScreen();
    expect(screen.getByText(/No customers yet/i)).toBeInTheDocument();
  });

  it("filters to an empty state on a search that matches nothing", async () => {
    state.customers = [];
    renderScreen();
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("searchbox", { name: "Search customers" }),
      "zzz",
    );
    expect(screen.getByText(/No customers match/i)).toBeInTheDocument();
  });

  it("surfaces a fetch error with Retry", () => {
    state.error = "Failed to load customers.";
    renderScreen();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load customers.",
    );
  });

  it("opens the repayment BottomSheet and records a repayment", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Grace Wanjiru/ }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Amount/), "500");
    await user.click(
      within(dialog).getByRole("button", { name: "Record repayment" }),
    );

    expect(state.recordRepayment).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "c1", amount: "500", account: "cash" }),
    );
    expect(
      await screen.findByText(/Repayment recorded · Grace Wanjiru/),
    ).toBeInTheDocument();
  });
});
