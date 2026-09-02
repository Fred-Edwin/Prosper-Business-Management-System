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

function view(rows: ReconciliationRow[]): ReconciliationView {
  return {
    date: "2026-09-02",
    rows,
    totals: {
      cashDeclared: "5000.00",
      mpesaDeclared: "3000.00",
      cashReceived: "0.00",
      mpesaReceived: "0.00",
      cashVariance: "0.00",
      mpesaVariance: "0.00",
    },
  };
}

function renderTab({ isToday = true }: { isToday?: boolean } = {}) {
  return render(
    <ToastProvider placement="top-right">
      <HandoversView date="2026-09-02" isToday={isToday} />
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
