// @vitest-environment jsdom
//
// M4 S9B — /admin/staff interactive bits ONLY (per the session brief): the
// add-staff drawer incl. PIN entry, attendance bulk-set + save, the payout
// drawer submit, and the already-paid / net≤0 error surfacing. No specs
// for read-only display. use-staff is mocked — no server / DB. jsdom
// applies no CSS, so both the `md:` table branch and the `md:hidden` card
// branch render; queries use getAllBy / within where they'd be ambiguous.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type {
  PayrollSummary,
  StaffPay,
  StaffView,
} from "@/lib/domain/staff";

// ── mock use-staff ────────────────────────────────────────────────────
const createStaff = vi.fn();
const updateStaff = vi.fn();
const deactivateStaff = vi.fn();
const saveBulk = vi.fn();
const payOne = vi.fn();
const payAll = vi.fn();
const recordAdjustment = vi.fn();

let rosterState: { staff: StaffView[]; loading: boolean; error: string | null };
let attState: {
  rows: { staffId: string; date: string; present: boolean }[];
  loading: boolean;
  error: string | null;
};
let payrollState: {
  payroll: PayrollSummary | null;
  loading: boolean;
  error: string | null;
};

vi.mock("@/app/admin/staff/use-staff", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/admin/staff/use-staff")>();
  return {
    ...actual,
    useLocations: () => ({
      locations: [
        { id: "loc-r", name: "Restaurant", type: "restaurant" },
        { id: "loc-c", name: "Canteen", type: "canteen" },
      ],
      loading: false,
    }),
    useRoster: () => ({
      staff: rosterState.staff,
      loading: rosterState.loading,
      error: rosterState.error,
      refresh: vi.fn(),
      create: createStaff,
      update: updateStaff,
      deactivate: deactivateStaff,
    }),
    useAttendance: () => ({
      rows: attState.rows,
      loading: attState.loading,
      error: attState.error,
      refresh: vi.fn(),
      saveBulk,
    }),
    usePayroll: () => ({
      payroll: payrollState.payroll,
      loading: payrollState.loading,
      error: payrollState.error,
      refresh: vi.fn(),
      recordAdjustment,
      payOne,
      payAll,
    }),
    useMonthlyShortfalls: () => ({
      shortfalls: { month: "2026-09", entries: [], total: "0.00", count: 0 },
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
  };
});

import { RosterTab } from "@/app/admin/staff/roster-tab";
import { AttendanceTab } from "@/app/admin/staff/attendance-tab";
import { PayTab } from "@/app/admin/staff/pay-tab";

// ── fixtures ─────────────────────────────────────────────────────────

function staff(over: Partial<StaffView> = {}): StaffView {
  return {
    id: "s1",
    name: "Grace Wanjiru",
    role: "cashier",
    locationId: "loc-r",
    locationName: "Restaurant",
    dailyRate: "800.00",
    active: true,
    userId: "u1",
    userActive: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

function pay(over: Partial<StaffPay> = {}): StaffPay {
  return {
    staffId: "s1",
    staffName: "Grace Wanjiru",
    month: "2026-09",
    dailyRate: "800.00",
    payableDays: 26,
    daysPresent: 26,
    daysAbsent: 0,
    grossPay: "20800.00",
    advances: "5000.00",
    deductions: "500.00",
    netPay: "15300.00",
    adjustments: [],
    paid: false,
    payout: null,
    ...over,
  };
}

function payroll(rows: StaffPay[]): PayrollSummary {
  const num = (f: (r: StaffPay) => string) =>
    rows.reduce((s, r) => s + Number(f(r)), 0).toFixed(2);
  const paidCount = rows.filter((r) => r.paid).length;
  return {
    month: "2026-09",
    rows,
    totals: {
      grossPay: num((r) => r.grossPay),
      advances: num((r) => r.advances),
      deductions: num((r) => r.deductions),
      netPay: num((r) => r.netPay),
      netPaid: "0.00",
      netUnpaid: rows
        .filter((r) => !r.paid && Number(r.netPay) > 0)
        .reduce((s, r) => s + Number(r.netPay), 0)
        .toFixed(2),
      paidCount,
      unpaidCount: rows.length - paidCount,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  rosterState = { staff: [staff()], loading: false, error: null };
  attState = { rows: [], loading: false, error: null };
  payrollState = { payroll: payroll([pay()]), loading: false, error: null };
  createStaff.mockResolvedValue(staff());
  saveBulk.mockResolvedValue([]);
  payOne.mockResolvedValue(pay({ paid: true }));
  payAll.mockResolvedValue({ month: "2026-09", paid: [{}], skipped: [] });
  recordAdjustment.mockResolvedValue(undefined);
});

// ── Add-staff drawer + PIN entry ─────────────────────────────────────

describe("Roster — add staff drawer", () => {
  it("creates a staff member with a 4-digit PIN through the drawer", async () => {
    const user = userEvent.setup();
    let openAdd: () => void = () => {};
    render(
      <ToastProvider placement="top-right">
        <RosterTab registerAddStaff={(fn) => (openAdd = fn)} />
      </ToastProvider>,
    );

    openAdd();
    const dialog = await screen.findByRole("dialog");

    await user.type(
      within(dialog).getByLabelText(/^Full name/),
      "Brian Kiptoo",
    );
    await user.click(within(dialog).getByRole("combobox", { name: /Role/ }));
    await user.click(await screen.findByRole("option", { name: "Cashier" }));
    await user.click(within(dialog).getByRole("combobox", { name: /Location/ }));
    await user.click(await screen.findByRole("option", { name: "Canteen" }));
    await user.type(within(dialog).getByLabelText(/^Daily rate/), "750");
    await user.type(within(dialog).getByLabelText(/login PIN/i), "4821");

    await user.click(within(dialog).getByRole("button", { name: "Add staff" }));

    await waitFor(() => expect(createStaff).toHaveBeenCalledOnce());
    expect(createStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Brian Kiptoo",
        role: "cashier",
        locationId: "loc-c",
        dailyRate: "750",
        pin: "4821",
      }),
    );
    expect(await screen.findByText("Staff member added")).toBeInTheDocument();
  });

  it("keeps Add staff disabled until the PIN is exactly 4 digits", async () => {
    const user = userEvent.setup();
    let openAdd: () => void = () => {};
    render(
      <ToastProvider placement="top-right">
        <RosterTab registerAddStaff={(fn) => (openAdd = fn)} />
      </ToastProvider>,
    );
    openAdd();
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/^Full name/), "X");
    await user.click(within(dialog).getByRole("combobox", { name: /Role/ }));
    await user.click(await screen.findByRole("option", { name: "Cashier" }));
    await user.click(within(dialog).getByRole("combobox", { name: /Location/ }));
    await user.click(await screen.findByRole("option", { name: "Restaurant" }));
    await user.type(within(dialog).getByLabelText(/^Daily rate/), "500");

    const addBtn = within(dialog).getByRole("button", { name: "Add staff" });
    await user.type(within(dialog).getByLabelText(/login PIN/i), "12");
    expect(addBtn).toBeDisabled();
    await user.type(within(dialog).getByLabelText(/login PIN/i), "34");
    expect(addBtn).toBeEnabled();
  });

  it("PIN input rejects non-digits and caps at 4", async () => {
    const user = userEvent.setup();
    let openAdd: () => void = () => {};
    render(
      <ToastProvider placement="top-right">
        <RosterTab registerAddStaff={(fn) => (openAdd = fn)} />
      </ToastProvider>,
    );
    openAdd();
    const dialog = await screen.findByRole("dialog");
    const pinInput = within(dialog).getByLabelText(/login PIN/i);
    await user.type(pinInput, "12ab34567");
    expect((pinInput as HTMLInputElement).value).toBe("1234");
  });
});

// ── Attendance bulk-set + save ───────────────────────────────────────

describe("Attendance — bulk set + save", () => {
  it("flags one absence and saves the whole day in one bulk call", async () => {
    const user = userEvent.setup();
    rosterState = {
      staff: [
        staff({ id: "s1", name: "Grace Wanjiru" }),
        staff({ id: "s2", name: "David Otieno" }),
      ],
      loading: false,
      error: null,
    };
    let controls: {
      save: () => void;
      dirty: boolean;
      saving: boolean;
    } | null = null;
    render(
      <ToastProvider placement="top-right">
        <AttendanceTab
          date="2026-09-02"
          datePicker={<div>date</div>}
          registerControls={(c) => (controls = c)}
        />
      </ToastProvider>,
    );

    // Default present — nothing dirty yet.
    await waitFor(() => expect(controls).not.toBeNull());
    expect(controls!.dirty).toBe(false);

    // Flag David absent (desktop table branch).
    const davidControls = screen.getAllByRole("radiogroup", {
      name: /Attendance for David Otieno/,
    })[0];
    await user.click(within(davidControls).getByRole("radio", { name: "Absent" }));

    await waitFor(() => expect(controls!.dirty).toBe(true));
    controls!.save();

    await waitFor(() => expect(saveBulk).toHaveBeenCalledOnce());
    const entries = saveBulk.mock.calls[0][0] as {
      staffId: string;
      present: boolean;
    }[];
    expect(entries).toEqual(
      expect.arrayContaining([
        { staffId: "s1", present: true },
        { staffId: "s2", present: false },
      ]),
    );
    expect(await screen.findByText("Attendance saved")).toBeInTheDocument();
  });

  it("Mark all present clears a flagged absence", async () => {
    const user = userEvent.setup();
    attState = {
      rows: [{ staffId: "s1", date: "2026-09-02", present: false }],
      loading: false,
      error: null,
    };
    let controls: { markAllPresent: () => void; dirty: boolean } | null = null;
    render(
      <ToastProvider placement="top-right">
        <AttendanceTab
          date="2026-09-02"
          datePicker={<div>date</div>}
          registerControls={(c) => (controls = c)}
        />
      </ToastProvider>,
    );
    await waitFor(() => expect(controls).not.toBeNull());
    // s1 starts absent (explicit row) → not dirty.
    expect(controls!.dirty).toBe(false);
    controls!.markAllPresent();
    await waitFor(() => expect(controls!.dirty).toBe(true));
    void user;
  });
});

// ── Payout drawer submit + error surfacing ───────────────────────────

describe("Pay — payout drawer", () => {
  function renderPay() {
    render(
      <ToastProvider placement="top-right">
        <PayTab
          month="2026-09"
          today="2026-09-30"
          registerRecordAdjustment={() => {}}
        />
      </ToastProvider>,
    );
  }

  it("submits a payout with no client amount (server recomputes)", async () => {
    const user = userEvent.setup();
    renderPay();

    await user.click(screen.getAllByRole("button", { name: "Pay out" })[0]);
    const dialog = await screen.findByRole("dialog");
    // Reconciliation is visible.
    expect(within(dialog).getByText(/Net to pay now/)).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Confirm payout" }),
    );

    await waitFor(() => expect(payOne).toHaveBeenCalledOnce());
    const body = payOne.mock.calls[0][0];
    expect(body).toEqual({
      staffId: "s1",
      month: "2026-09",
      paidFromAccount: "cash",
      date: "2026-09-30",
    });
    expect(body).not.toHaveProperty("amount");
  });

  it("surfaces an already-paid CONFLICT inline, not as a generic toast", async () => {
    const user = userEvent.setup();
    const { StaffRequestError } = await import("@/app/admin/staff/use-staff");
    payOne.mockRejectedValueOnce(
      new StaffRequestError(409, {
        code: "CONFLICT",
        message: "Already paid.",
        field: "month",
      }),
    );
    renderPay();

    await user.click(screen.getAllByRole("button", { name: "Pay out" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Confirm payout" }),
    );

    expect(
      await within(dialog).findByText(/already been paid for September 2026/i),
    ).toBeInTheDocument();
  });

  it("disables Pay out and blocks the drawer submit when net ≤ 0", async () => {
    const user = userEvent.setup();
    payrollState = {
      payroll: payroll([
        pay({ advances: "22000.00", deductions: "0.00", netPay: "-1200.00" }),
      ]),
      loading: false,
      error: null,
    };
    renderPay();

    // The row button is disabled (net negative) — can't even open the drawer.
    const payBtns = screen.getAllByRole("button", { name: "Pay out" });
    payBtns.forEach((b) => expect(b).toBeDisabled());
    void user;
  });

  it("net ≤ 0 error from the server surfaces inline with the 'net' field copy", async () => {
    const user = userEvent.setup();
    const { StaffRequestError } = await import("@/app/admin/staff/use-staff");
    // Row shows positive net so the drawer opens, but the server rejects
    // (an advance landed between load and submit).
    payOne.mockRejectedValueOnce(
      new StaffRequestError(400, {
        code: "VALIDATION_ERROR",
        message: "Net pay is zero or less.",
        field: "net",
      }),
    );
    renderPay();

    await user.click(screen.getAllByRole("button", { name: "Pay out" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Confirm payout" }),
    );

    expect(
      await within(dialog).findByText(/Net pay is zero or less/i),
    ).toBeInTheDocument();
  });
});

// ── Advance / deduction drawer ───────────────────────────────────────

describe("Pay — record advance / deduction", () => {
  it("records an advance through the drawer", async () => {
    const user = userEvent.setup();
    let openAdj: () => void = () => {};
    render(
      <ToastProvider placement="top-right">
        <PayTab
          month="2026-09"
          today="2026-09-26"
          registerRecordAdjustment={(fn) => (openAdj = fn)}
        />
      </ToastProvider>,
    );

    openAdj();
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("combobox", { name: /Staff member/ }),
    );
    await user.click(await screen.findByRole("option", { name: /Grace Wanjiru/ }));
    await user.type(within(dialog).getByLabelText(/^Amount/), "5000");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(recordAdjustment).toHaveBeenCalledOnce());
    expect(recordAdjustment).toHaveBeenCalledWith(
      expect.objectContaining({
        staffId: "s1",
        type: "advance",
        amount: "5000",
        date: "2026-09-26",
      }),
    );
    expect(await screen.findByText("Advance recorded")).toBeInTheDocument();
  });
});
