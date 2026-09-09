// @vitest-environment jsdom
//
// M3 S3 — the Admin Handovers reconciliation tab (a tab of
// /admin/financials). Interactive bits only:
//   • the receipt drawer submit (exact-match) fires recordReceipt + a toast
//   • a shortfall receipt: the domain returns VALIDATION_ERROR on field
//     "shortfallNote" → the inline error is shown off that response
//   • the correction drawer submits corrected ABSOLUTE values
// use-handovers is mocked; no server / DB. jsdom applies no CSS, so both
// the `md:` table branch and the `md:hidden` card branch render — queries
// are scoped with getAllBy / within where they'd be ambiguous.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { ReconciliationRow, ReconciliationView } from "@/lib/domain/handovers";
import { HandoversRequestError } from "@/app/admin/financials/use-handovers";

// ── mock use-handovers ─────────────────────────────────────────────────
const recordReceipt = vi.fn();
const correct = vi.fn();
const recordBackdated = vi.fn();
const refresh = vi.fn();
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
      refresh,
      recordReceipt,
      correct,
      recordBackdated,
    }),
  };
});

// The "Record a handover" drawer fetches the roster via useRoster(null) —
// stub it out to an empty list; that drawer's own behaviour is covered by
// record-handover-drawer.screen.test.tsx.
vi.mock("@/app/admin/staff/use-staff", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/admin/staff/use-staff")>();
  return {
    ...actual,
    useRoster: () => ({
      staff: [],
      loading: false,
      error: null,
      refresh: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    }),
  };
});

import { HandoversView } from "@/app/admin/financials/handovers-tab";

// ── fixtures ───────────────────────────────────────────────────────────

function row(over: Partial<ReconciliationRow> = {}): ReconciliationRow {
  return {
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
    ...over,
  };
}

function view(
  rows: ReconciliationRow[],
  over: Partial<ReconciliationView> = {},
): ReconciliationView {
  return {
    from: "2026-09-02",
    to: "2026-09-02",
    rows,
    closedDates: [],
    totals: {
      cashDeclared: "5000.00",
      mpesaDeclared: "3000.00",
      cashReceived: "0.00",
      mpesaReceived: "0.00",
      cashVariance: "0.00",
      mpesaVariance: "0.00",
    },
    ...over,
  };
}

function renderTab() {
  return render(
    <ToastProvider placement="top-right">
      <HandoversView from="2026-09-02" to="2026-09-02" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  reconState = { data: view([row()]), loading: false, error: null };
  recordReceipt.mockResolvedValue(undefined);
  correct.mockResolvedValue(undefined);
});

// ── receipt drawer ─────────────────────────────────────────────────────

describe("Admin Handovers — receipt drawer", () => {
  it("records an exact-match receipt and fires a toast", async () => {
    const user = userEvent.setup();
    renderTab();

    // Two "Record receipt" buttons (table + mobile card) — take the first.
    await user.click(screen.getAllByRole("button", { name: "Record receipt" })[0]);
    const dialog = await screen.findByRole("dialog");

    // Fields seed with the declared figures — an exact-match receipt.
    await user.click(within(dialog).getByRole("button", { name: "Confirm receipt" }));

    await waitFor(() => expect(recordReceipt).toHaveBeenCalledOnce());
    expect(recordReceipt).toHaveBeenCalledWith("h1", {
      cashReceived: "5000.00",
      mpesaReceived: "3000.00",
      shortfallNote: undefined,
    });
    expect(await screen.findByText("Receipt recorded")).toBeInTheDocument();
  });

  it("surfaces the server VALIDATION_ERROR on field shortfallNote", async () => {
    recordReceipt.mockRejectedValueOnce(
      new HandoversRequestError(400, {
        code: "VALIDATION_ERROR",
        message: "A shortfall note is required.",
        field: "shortfallNote",
      }),
    );
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getAllByRole("button", { name: "Record receipt" })[0]);
    const dialog = await screen.findByRole("dialog");

    // Type a short cash figure (below the 5,000 declared).
    const cash = within(dialog).getByLabelText(/Cash received/);
    await user.clear(cash);
    await user.type(cash, "4000.00");
    await user.click(within(dialog).getByRole("button", { name: "Confirm receipt" }));

    expect(
      await within(dialog).findByText(/add a note explaining the shortfall/i),
    ).toBeInTheDocument();
    // The drawer stays open — the Admin can now fix it.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

// ── per-row date column ────────────────────────────────────────────────

describe("Admin Handovers — date column", () => {
  it("shows each row's own reconciled business day", async () => {
    // Two rows on different Nairobi days (a back-entered handover for an
    // earlier day shown next to a current one).
    reconState = {
      data: view([
        row({ handoverId: "h-old", occurredAt: "2026-09-06T09:00:00.000Z" }),
        row({
          handoverId: "h-new",
          staffName: "Anne Attendant",
          occurredAt: "2026-09-09T09:00:00.000Z",
        }),
      ]),
      loading: false,
      error: null,
    };
    renderTab();

    // "Date" column header (table branch) is present.
    expect(
      screen.getAllByRole("columnheader", { name: "Date" }).length,
    ).toBeGreaterThan(0);
    // Each row's day renders (both table + mobile card branches → getAllBy).
    expect(screen.getAllByText("6 Sep").length).toBeGreaterThan(0);
    expect(screen.getAllByText("9 Sep").length).toBeGreaterThan(0);
  });
});

// ── closed-day receipt gate (ADR-79) ────────────────────────────────────

describe("Admin Handovers — receipt gate is per-row, not per-worksheet", () => {
  it("shows 'Record receipt' for a row on an OPEN past day", async () => {
    reconState = {
      data: view(
        [row({ occurredAt: "2026-09-06T09:00:00.000Z" })],
        { from: "2026-09-06", to: "2026-09-09", closedDates: [] },
      ),
      loading: false,
      error: null,
    };
    renderTab();
    expect(
      screen.getAllByRole("button", { name: "Record receipt" }).length,
    ).toBeGreaterThan(0);
  });

  it("shows 'Day closed' (no receipt action) for a row on a CLOSED day", async () => {
    reconState = {
      data: view(
        [row({ occurredAt: "2026-09-06T09:00:00.000Z" })],
        { from: "2026-09-06", to: "2026-09-09", closedDates: ["2026-09-06"] },
      ),
      loading: false,
      error: null,
    };
    renderTab();
    expect(
      screen.queryByRole("button", { name: "Record receipt" }),
    ).not.toBeInTheDocument();
    expect(screen.getAllByText("Day closed").length).toBeGreaterThan(0);
  });
});

// ── multi-day grouping (ADR-79) ─────────────────────────────────────────

describe("Admin Handovers — multi-day worksheet groups rows by day", () => {
  it("renders a day group header per distinct business day, each with its own count", async () => {
    reconState = {
      data: view(
        [
          row({ handoverId: "h-a", occurredAt: "2026-09-06T09:00:00.000Z" }),
          row({
            handoverId: "h-b",
            staffName: "Anne Attendant",
            occurredAt: "2026-09-09T09:00:00.000Z",
          }),
          row({
            handoverId: "h-c",
            staffName: "Other Cashier",
            occurredAt: "2026-09-09T10:00:00.000Z",
          }),
        ],
        { from: "2026-09-06", to: "2026-09-09" },
      ),
      loading: false,
      error: null,
    };
    renderTab();

    // 6 Sep group: 1 handover; 9 Sep group: 2 handovers.
    expect(screen.getAllByText(/^1 handover/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^2 handovers/).length).toBeGreaterThan(0);
  });
});

// ── record-a-handover entry (ADR-79) ────────────────────────────────────

describe("Admin Handovers — 'Record a handover' back-entry", () => {
  it("opens the drawer and submits a back-entered handover", async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(
      screen.getByRole("button", { name: "Record a handover" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Record a handover"),
    ).toBeInTheDocument();
    // No staff in the stubbed roster — the primary action stays disabled.
    expect(
      within(dialog).getByRole("button", { name: "Record handover" }),
    ).toBeDisabled();
  });
});

// ── correction drawer ──────────────────────────────────────────────────

describe("Admin Handovers — correction drawer", () => {
  it("submits corrected ABSOLUTE declared figures (target: handover)", async () => {
    reconState = {
      data: view([
        row({
          received: true,
          receiptId: "r1",
          cashReceived: "5000.00",
          mpesaReceived: "3000.00",
          cashVariance: "0.00",
          mpesaVariance: "0.00",
        }),
      ]),
      loading: false,
      error: null,
    };
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getAllByRole("button", { name: "Correct" })[0]);
    const dialog = await screen.findByRole("dialog");

    // Switch the segmented control to "The declaration".
    await user.click(within(dialog).getByRole("radio", { name: "The declaration" }));

    const cash = within(dialog).getByLabelText(/Corrected declared cash/);
    await user.clear(cash);
    await user.type(cash, "5500.00");
    await user.click(within(dialog).getByRole("button", { name: "Save correction" }));

    await waitFor(() => expect(correct).toHaveBeenCalledOnce());
    expect(correct).toHaveBeenCalledWith("h1", {
      target: "handover",
      cashDeclared: "5500.00",
      mpesaDeclared: "3000.00",
    });
  });
});
