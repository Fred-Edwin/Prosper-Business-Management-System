// @vitest-environment jsdom
// ADR-91 follow-up — Canteen Attendant customers list + repayment,
// reached from the "Customers" hub tile. A straight reuse of the
// Cashier's C6 screen (same RepaymentForm, same useCustomers hook) —
// mirrors tests/screens/cashier-customers.screen.test.tsx.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { CustomerListRow } from "@/lib/domain/customers";

const ROWS: CustomerListRow[] = [
  {
    id: "c1",
    name: "Jane Doe",
    phone: "0700111222",
    balance: "180.00",
    archivedAt: null,
    lastActivityAt: "2026-09-23T09:00:00.000Z",
    oldestDebtAt: "2026-09-23T09:00:00.000Z",
  },
  {
    id: "c2",
    name: "Peter Kamau",
    phone: "0722334455",
    balance: "0.00",
    archivedAt: null,
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

import { CanteenCustomersClient } from "@/app/canteen/customers/customers-client";

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <CanteenCustomersClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  state.customers = [...ROWS];
  state.loading = false;
  state.error = null;
  vi.clearAllMocks();
});

describe("Canteen — Customers list + repayment", () => {
  it("lists customers with a derived balance read-out (owes / Settled)", () => {
    renderScreen();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("KES 180")).toBeInTheDocument();
    expect(screen.getByText("Settled")).toBeInTheDocument();
  });

  it("shows an empty state when there are no customers", () => {
    state.customers = [];
    renderScreen();
    expect(screen.getByText(/No customers yet/i)).toBeInTheDocument();
  });

  it("opens the repayment BottomSheet and records a repayment (collecting on a canteen credit sale)", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Jane Doe/ }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Amount/), "180");
    await user.click(
      within(dialog).getByRole("button", { name: "Record repayment" }),
    );

    expect(state.recordRepayment).toHaveBeenCalledWith(
      expect.objectContaining({ customerId: "c1", amount: "180", account: "cash" }),
    );
    expect(
      await screen.findByText(/Repayment recorded · Jane Doe/),
    ).toBeInTheDocument();
  });
});
