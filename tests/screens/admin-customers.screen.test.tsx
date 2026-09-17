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
    archivedAt: null,
    lastActivityAt: "2026-08-28T09:00:00.000Z",
    oldestDebtAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "c2",
    name: "John Otieno",
    phone: "0733222444",
    balance: "0.00",
    archivedAt: null,
    lastActivityAt: null,
    oldestDebtAt: null,
  },
];

const LEDGER: CustomerLedger = {
  customer: {
    id: "c1",
    name: "Grace Wanjiru",
    phone: "0722000111",
    archivedAt: null,
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
      repaymentId: "r1",
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
  archiveCustomer: vi.fn().mockResolvedValue(undefined),
  unarchiveCustomer: vi.fn().mockResolvedValue(undefined),
};
const ledgerState = {
  ledger: LEDGER as CustomerLedger | null,
  loading: false,
  error: null as string | null,
  recordRepayment: vi.fn().mockResolvedValue(undefined),
  correctRepayment: vi.fn().mockResolvedValue(undefined),
  voidRepayment: vi.fn().mockResolvedValue(undefined),
  archiveCustomer: vi.fn().mockResolvedValue(undefined),
  unarchiveCustomer: vi.fn().mockResolvedValue(undefined),
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
      archiveCustomer: listState.archiveCustomer,
      unarchiveCustomer: listState.unarchiveCustomer,
    }),
    useCustomerLedger: () => ({
      ledger: ledgerState.ledger,
      loading: ledgerState.loading,
      error: ledgerState.error,
      refresh: vi.fn(),
      recordRepayment: ledgerState.recordRepayment,
      correctRepayment: ledgerState.correctRepayment,
      voidRepayment: ledgerState.voidRepayment,
      archiveCustomer: ledgerState.archiveCustomer,
      unarchiveCustomer: ledgerState.unarchiveCustomer,
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
  ledgerState.correctRepayment = vi.fn().mockResolvedValue(undefined);
  ledgerState.voidRepayment = vi.fn().mockResolvedValue(undefined);
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

describe("A1 — KPI strip", () => {
  it("shows Total Outstanding, Customers Owing, Credit in Hand, and Oldest Unpaid Debt derived from the loaded rows", () => {
    renderA1();
    // jsdom applies no CSS, so both the strip's desktop and mobile
    // variants render — assert at least one of each (the A2 empty-history
    // test above uses the same pattern).
    expect(screen.getAllByText("Total Outstanding").length).toBeGreaterThan(0);
    // Only Grace Wanjiru owes (1200.00); John Otieno is settled (0.00). The
    // figure also appears in the table's balance column, so just assert
    // it's present at least twice (strip + table), not an exact count.
    expect(screen.getAllByText("KES 1,200.00").length).toBeGreaterThan(1);
    expect(screen.getAllByText("Customers Owing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("of 2 total").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Credit in Hand").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Oldest Unpaid Debt").length).toBeGreaterThan(0);
  });

  it("does not render the KPI strip when the customer list failed to load, avoiding a duplicate alert", () => {
    listState.error = "Failed to load customers.";
    renderA1();
    expect(screen.queryByText("Total Outstanding")).not.toBeInTheDocument();
    // Exactly one alert — the page-level ErrorState, not a second one from the strip.
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });
});

describe("A1 — archive / unarchive", () => {
  it("Include archived toggle exists alongside Has balance, defaulting off", () => {
    renderA1();
    const toolbar = within(screen.getByRole("search", { name: "Filter customers" }));
    expect(
      toolbar.getByRole("switch", { name: "Include archived" }),
    ).toHaveAttribute("aria-checked", "false");
  });

  // Archive lives inside the Record repayment rail Drawer, as a danger
  // section below the form (Assets' Edit-drawer pattern) — not a standalone
  // row button, per owner feedback that a loose row-level button read as
  // out of place.
  async function openArchiveSectionFromRow(
    user: ReturnType<typeof userEvent.setup>,
  ) {
    await user.click(
      within(screen.getByRole("table")).getByRole("button", {
        name: "Record repayment for Grace Wanjiru",
      }),
    );
    const drawer = await screen.findByRole("dialog");
    await user.click(
      within(drawer).getByRole("button", { name: /Archive this customer/ }),
    );
    return screen.findByRole("alertdialog");
  }

  it("Archive lives inside the repayment drawer and opens an on-brand ConfirmDialog (not a native confirm)", async () => {
    renderA1();
    const user = userEvent.setup();
    const dialog = await openArchiveSectionFromRow(user);

    expect(
      within(dialog).getByText(/Archive Grace Wanjiru\?/),
    ).toBeInTheDocument();
    expect(listState.archiveCustomer).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Archive" }));

    expect(listState.archiveCustomer).toHaveBeenCalledWith("c1");
    expect(await screen.findByText("Customer archived")).toBeInTheDocument();
  });

  it("Cancel on the archive ConfirmDialog does not call archiveCustomer", async () => {
    renderA1();
    const user = userEvent.setup();
    const dialog = await openArchiveSectionFromRow(user);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(listState.archiveCustomer).not.toHaveBeenCalled();
    // The dialog plays an exit transition (data-state="closing") before
    // unmounting on `transitionend`, which jsdom never fires — a fallback
    // timer clears it, so wait for that rather than asserting synchronously.
    await waitFor(
      () => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      { timeout: 1000 },
    );
  });

  it("an archived row shows an Archived tag and an Unarchive action, and calls unarchiveCustomer", async () => {
    listState.customers = [
      { ...ROWS[0], archivedAt: "2026-09-01T00:00:00.000Z" },
    ];
    renderA1();
    const user = userEvent.setup();
    const table = screen.getByRole("table");

    expect(within(table).getByText("Archived")).toBeInTheDocument();
    expect(
      within(table).queryByRole("button", { name: /Record repayment/ }),
    ).not.toBeInTheDocument();

    await user.click(
      within(table).getByRole("button", { name: "Unarchive Grace Wanjiru" }),
    );
    expect(listState.unarchiveCustomer).toHaveBeenCalledWith("c1");
    expect(await screen.findByText("Customer restored")).toBeInTheDocument();
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

  it("Archive lives inside the repayment drawer and opens an on-brand ConfirmDialog", async () => {
    renderA2();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: "Record repayment" }),
    );
    const drawer = await screen.findByRole("dialog");
    await user.click(
      within(drawer).getByRole("button", { name: /Archive this customer/ }),
    );

    const dialog = await screen.findByRole("alertdialog", {
      name: "Archive customer",
    });
    expect(
      within(dialog).getByText(/Archive Grace Wanjiru\?/),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    expect(ledgerState.archiveCustomer).toHaveBeenCalled();
    expect(await screen.findByText("Customer archived")).toBeInTheDocument();
  });

  it("shows an Archived tag and an Unarchive action when the customer is archived", async () => {
    ledgerState.ledger = {
      ...LEDGER,
      customer: { ...LEDGER.customer, archivedAt: "2026-09-01T00:00:00.000Z" },
    };
    renderA2();
    const user = userEvent.setup();

    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Record repayment" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Unarchive" }));
    expect(ledgerState.unarchiveCustomer).toHaveBeenCalled();
    expect(await screen.findByText("Customer restored")).toBeInTheDocument();
  });
});

describe("A2 — repayment corrections (ADR-72)", () => {
  it("a repayment row has a Correct action; a debt row does not", () => {
    renderA2();
    const table = screen.getByRole("table");
    // one repayment entry → exactly one Correct button in the table
    expect(
      within(table).getAllByRole("button", { name: "Correct" }),
    ).toHaveLength(1);
  });

  it("Correct opens a drawer prefilled with the current values and submits the corrected values", async () => {
    renderA2();
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("table")).getByRole("button", { name: "Correct" }),
    );

    const dialog = await screen.findByRole("dialog", {
      name: /Correct Repayment/,
    });
    // Prefilled from the current derived repayment.
    expect(within(dialog).getByDisplayValue("500")).toBeInTheDocument();

    const amount = within(dialog).getByLabelText(/Corrected amount/);
    await user.clear(amount);
    await user.type(amount, "350");

    await user.click(
      within(dialog).getByRole("button", { name: "Save Correction" }),
    );

    await waitFor(() =>
      expect(ledgerState.correctRepayment).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: "c1",
          repaymentId: "r1",
          amount: "350",
          account: "cash",
        }),
      ),
    );
    expect(await screen.findByText("Repayment corrected")).toBeInTheDocument();
  });

  it("the Void action needs a confirm step before it calls the API", async () => {
    renderA2();
    const user = userEvent.setup();
    await user.click(
      within(screen.getByRole("table")).getByRole("button", { name: "Correct" }),
    );
    const dialog = await screen.findByRole("dialog");

    await user.click(
      within(dialog).getByRole("button", { name: /Void repayment/ }),
    );
    expect(ledgerState.voidRepayment).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: "Confirm void" }),
    );
    await waitFor(() =>
      expect(ledgerState.voidRepayment).toHaveBeenCalledWith("c1", "r1"),
    );
    expect(await screen.findByText("Repayment voided")).toBeInTheDocument();
  });
});
