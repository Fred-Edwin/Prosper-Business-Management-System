// @vitest-environment jsdom
// M2 Session 6 per-screen gate — A1 (Customers & Credit register) and A2
// (Customer detail) composed from the proven kit. Drives the interactive
// surface (search -> filtered EmptyState, Has-balance toggle, repayment
// rail Drawer open + Esc-restore + toast, add-customer Drawer, A2 ledger
// + zero-history) with the feature hook mocked. No server / DB.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type {
  CustomerLedger,
  CustomerListRow,
} from "@/lib/domain/customers";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

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

const LEDGER: CustomerLedger = {
  customer: {
    id: "c1",
    name: "Grace Wanjiru",
    phone: "0722000111",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-28T09:00:00.000Z",
  },
  entries: [
    {
      kind: "debt",
      amount: "230.00",
      occurredAt: "2026-08-20T10:00:00.000Z",
      orderId: "order-aaaaaaaa-1111",
      orderNumber: 1043,
      runningBalance: "230.00",
    },
    {
      kind: "repayment",
      amount: "500.00",
      occurredAt: "2026-08-25T10:00:00.000Z",
      account: "cash",
      runningBalance: "-270.00",
    },
  ],
  balance: "1200.00",
};

const listState = {
  customers: [...ROWS] as CustomerListRow[],
  loading: false,
  error: null as string | null,
  createCustomer: vi.fn().mockResolvedValue(undefined),
  recordRepayment: vi.fn().mockResolvedValue(undefined),
};
const ledgerState = {
  ledger: LEDGER as CustomerLedger | null,
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
      customers: listState.customers,
      loading: listState.loading,
      error: listState.error,
      refresh: vi.fn(),
      createCustomer: listState.createCustomer,
      recordRepayment: listState.recordRepayment,
    }),
    useCustomerLedger: () => ({
      ledger: ledgerState.ledger,
      loading: ledgerState.loading,
      error: ledgerState.error,
      refresh: vi.fn(),
      recordRepayment: ledgerState.recordRepayment,
    }),
  };
});

import { CustomersClient } from "@/app/admin/customers/customers-client";
import { CustomerDetailClient } from "@/app/admin/customers/[id]/customer-detail-client";

function renderA1() {
  return render(
    <ToastProvider placement="top-right">
      <CustomersClient />
    </ToastProvider>,
  );
}
function renderA2() {
  return render(
    <ToastProvider placement="top-right">
      <CustomerDetailClient customerId="c1" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  listState.customers = [...ROWS];
  listState.loading = false;
  listState.error = null;
  ledgerState.ledger = LEDGER;
  ledgerState.loading = false;
  ledgerState.error = null;
  vi.clearAllMocks();
});

describe("A1 — Customers & Credit register", () => {
  it("renders the register via <SimpleTable> with a derived balance read-out", () => {
    renderA1();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Grace Wanjiru")).toBeInTheDocument();
    // Balance is plain colored mono text, no "Owes" prefix (artboard DU2-0).
    expect(within(table).getByText("KES 1,200.00")).toBeInTheDocument();
    expect(within(table).getByText("Settled")).toBeInTheDocument();
  });

  it("shows a filtered <EmptyState> with Clear filters when the search matches nothing", async () => {
    listState.customers = [];
    renderA1();
    const user = userEvent.setup();
    await user.type(
      screen.getByRole("searchbox", { name: "Search customers" }),
      "zzz",
    );
    const table = screen.getByRole("table");
    expect(within(table).getByText(/No customers match/i)).toBeInTheDocument();
    expect(
      within(table).getByRole("button", { name: "Clear filters" }),
    ).toBeInTheDocument();
  });

  it("opens the repayment rail Drawer, and Esc restores focus to the opener", async () => {
    renderA1();
    const user = userEvent.setup();
    const opener = within(screen.getByRole("table")).getAllByRole("button", {
      name: /Record repayment for Grace Wanjiru/,
    })[0];
    opener.focus();
    await user.click(opener);

    const dialog = await screen.findByRole("dialog");
    // A1 rail Drawer: name + phone are the Drawer subtitle; body leads
    // with the Current-balance read-out row.
    expect(
      within(dialog).getByText("Grace Wanjiru · 0722000111"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Current balance")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("records a repayment and fires a success toast", async () => {
    renderA1();
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("table")).getAllByRole("button", {
        name: /Record repayment for Grace Wanjiru/,
      })[0],
    );
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Amount/), "500");
    await user.click(
      within(dialog).getByRole("button", { name: "Record repayment" }),
    );

    expect(listState.recordRepayment).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "c1",
        amount: "500",
        account: "cash",
      }),
    );
    expect(await screen.findByText("Repayment recorded")).toBeInTheDocument();
  });

  it("adds a customer through the add-customer Drawer", async () => {
    renderA1();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add customer" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/^Name/), "New Person");
    await user.type(within(dialog).getByLabelText(/^Phone/), "0700123123");
    await user.click(
      within(dialog).getByRole("button", { name: "Add customer" }),
    );
    expect(listState.createCustomer).toHaveBeenCalledWith({
      name: "New Person",
      phone: "0700123123",
    });
    expect(await screen.findByText("Customer added")).toBeInTheDocument();
  });

  it("surfaces a fetch error as an alert with Retry", () => {
    listState.error = "Failed to load customers.";
    renderA1();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load customers.",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("filter row: the shared <FilterToolbar> carries the search slot + a 'Has balance' toggle at its default; Reset appears only once it is on, and clears it", async () => {
    renderA1();
    const user = userEvent.setup();
    const toolbar = within(screen.getByRole("search", { name: "Filter customers" }));

    // search slot lives inside the toolbar row
    expect(
      toolbar.getByRole("searchbox", { name: "Search customers" }),
    ).toBeInTheDocument();

    // toggle at default (off) → no Reset
    const toggle = toolbar.getByRole("switch", { name: "Has balance" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(
      toolbar.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();

    // turn it on → filters to owing, Reset shows
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    const reset = await toolbar.findByRole("button", { name: "Reset" });

    // Reset clears the toggle back to its default
    await user.click(reset);
    expect(
      toolbar.getByRole("switch", { name: "Has balance" }),
    ).toHaveAttribute("aria-checked", "false");
  });
});

describe("A2 — Customer detail", () => {
  it("renders the interleaved debt/repayment ledger with a running balance", () => {
    renderA2();
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Credit order").length).toBeGreaterThan(0);
    expect(within(table).getByText(/\+KES 230\.00/)).toBeInTheDocument();
    expect(within(table).getByText(/−KES 500\.00/)).toBeInTheDocument();
    // running-balance column carries the reconciled figure per row
    expect(
      within(table).getAllByText((_, el) => el?.textContent === "KES 230.00").length,
    ).toBeGreaterThan(0);
  });

  it("Reference cell shows the order number for a debt and the account for a repayment", () => {
    renderA2();
    const table = screen.getByRole("table");
    expect(within(table).getByText("Order #1043")).toBeInTheDocument();
    expect(within(table).getByText("Cash")).toBeInTheDocument();
  });

  it("shows a zero-history EmptyState when the customer has no entries", () => {
    ledgerState.ledger = {
      ...LEDGER,
      entries: [],
      balance: "0.00",
    };
    renderA2();
    // jsdom applies no CSS, so both the md:block table and the md:hidden
    // card list render — assert at least one zero-history EmptyState.
    expect(
      screen.getAllByText(/No credit history for this customer/i).length,
    ).toBeGreaterThan(0);
  });

  it("shows a loading placeholder while the ledger loads", () => {
    ledgerState.ledger = null;
    ledgerState.loading = true;
    renderA2();
    // header + breadcrumb both render the '…' placeholder; no ledger rows yet
    expect(screen.getAllByText("…").length).toBeGreaterThan(0);
    expect(screen.queryByText("Credit order")).not.toBeInTheDocument();
  });

  it("surfaces a fetch error as an alert with Retry", () => {
    ledgerState.error = "Failed to load the customer ledger.";
    ledgerState.ledger = null;
    renderA2();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Failed to load the customer ledger.",
    );
  });

  it("opens the repayment Drawer from the header action", async () => {
    renderA2();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Record repayment" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Amount/)).toBeInTheDocument();
  });
});
