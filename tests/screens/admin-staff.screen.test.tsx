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
const reversePayout = vi.fn();
const payAll = vi.fn();
const recordAdjustment = vi.fn();
const correctAdjustment = vi.fn();
const voidAdjustment = vi.fn();
const changePin = vi.fn();

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
      correctAdjustment,
      voidAdjustment,
      payOne,
      reversePayout,
      payAll,
    }),
    useMonthlyShortfalls: () => ({
      shortfalls: { month: "2026-09", entries: [], total: "0.00", count: 0 },
      loading: false,
      error: null,
      refresh: vi.fn(),
    }),
    useChangeOwnPin: () => ({ changePin }),
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
    jobTitle: null,
    appAccess: true,
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
  reversePayout.mockResolvedValue(undefined);
  payAll.mockResolvedValue({ month: "2026-09", paid: [{}], skipped: [] });
  recordAdjustment.mockResolvedValue(undefined);
  correctAdjustment.mockResolvedValue(undefined);
  voidAdjustment.mockResolvedValue(undefined);
  changePin.mockResolvedValue(undefined);
});

function adj(over: Partial<import("@/lib/domain/staff").PayAdjustmentView> = {}) {
  return {
    id: "adj-1",
    staffId: "s1",
    type: "advance" as const,
    amount: "5000.00",
    originalAmount: "5000.00",
    corrected: false,
    date: "2026-09-10",
    note: "school fees",
    ...over,
  };
}

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
        appAccess: true,
        name: "Brian Kiptoo",
        role: "cashier",
        locationId: "loc-c",
        dailyRate: "750",
        pin: "4821",
      }),
    );
    expect(await screen.findByText("Staff member added")).toBeInTheDocument();
  });

  it("adds a roster-only staff member — job title, no role or PIN", async () => {
    const user = userEvent.setup();
    let openAdd: () => void = () => {};
    render(
      <ToastProvider placement="top-right">
        <RosterTab registerAddStaff={(fn) => (openAdd = fn)} />
      </ToastProvider>,
    );

    openAdd();
    const dialog = await screen.findByRole("dialog");

    await user.click(
      within(dialog).getByLabelText(/Can log into the app/i),
    );

    // Role select and PIN field are gone; a Job title field appears.
    expect(
      within(dialog).queryByRole("combobox", { name: /Role/ }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText(/login PIN/i),
    ).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/^Full name/), "Mama Njeri");
    await user.type(within(dialog).getByLabelText(/^Job title/), "Cook");
    await user.click(within(dialog).getByRole("combobox", { name: /Location/ }));
    await user.click(await screen.findByRole("option", { name: "Canteen" }));
    await user.type(within(dialog).getByLabelText(/^Daily rate/), "800");

    await user.click(within(dialog).getByRole("button", { name: "Add staff" }));

    await waitFor(() => expect(createStaff).toHaveBeenCalledOnce());
    expect(createStaff).toHaveBeenCalledWith(
      expect.objectContaining({
        appAccess: false,
        name: "Mama Njeri",
        jobTitle: "Cook",
        locationId: "loc-c",
        dailyRate: "800",
      }),
    );
    expect(createStaff).toHaveBeenCalledWith(
      expect.not.objectContaining({ pin: expect.anything() }),
    );
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

// ── Your account — self-service PIN change ───────────────────────────

describe("Roster — your account PIN change", () => {
  function renderRoster() {
    render(
      <ToastProvider placement="top-right">
        <RosterTab registerAddStaff={() => {}} />
      </ToastProvider>,
    );
  }

  it("changes the signed-in user's own PIN", async () => {
    const user = userEvent.setup();
    renderRoster();

    await user.click(screen.getByRole("button", { name: "Change your PIN" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/^Current PIN/), "1234");
    await user.type(within(dialog).getByLabelText(/^New PIN/), "5678");
    await user.type(within(dialog).getByLabelText(/^Confirm new PIN/), "5678");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(changePin).toHaveBeenCalledOnce());
    expect(changePin).toHaveBeenCalledWith("1234", "5678");
    expect(await screen.findByText("PIN changed")).toBeInTheDocument();
  });

  it("blocks submit when the confirm PIN doesn't match", async () => {
    const user = userEvent.setup();
    renderRoster();

    await user.click(screen.getByRole("button", { name: "Change your PIN" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/^Current PIN/), "1234");
    await user.type(within(dialog).getByLabelText(/^New PIN/), "5678");
    await user.type(within(dialog).getByLabelText(/^Confirm new PIN/), "5679");

    expect(
      within(dialog).getByRole("button", { name: "Save changes" }),
    ).toBeDisabled();
    expect(await within(dialog).findByText("PINs don't match.")).toBeInTheDocument();
    expect(changePin).not.toHaveBeenCalled();
  });

  it("surfaces a wrong-current-PIN error inline on the current PIN field", async () => {
    const user = userEvent.setup();
    const { StaffRequestError } = await import("@/app/admin/staff/use-staff");
    changePin.mockRejectedValueOnce(
      new StaffRequestError(400, {
        code: "VALIDATION_ERROR",
        message: "Current PIN is incorrect.",
        field: "currentPin",
      }),
    );
    renderRoster();

    await user.click(screen.getByRole("button", { name: "Change your PIN" }));
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/^Current PIN/), "0000");
    await user.type(within(dialog).getByLabelText(/^New PIN/), "5678");
    await user.type(within(dialog).getByLabelText(/^Confirm new PIN/), "5678");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(
      await within(dialog).findByText("Current PIN is incorrect."),
    ).toBeInTheDocument();
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

// ── Payout reversal drawer ──────────────────────────────────────────

describe("Pay — reverse a payout", () => {
  const paidRow = () =>
    pay({
      paid: true,
      payout: {
        id: "po-1",
        staffId: "s1",
        month: "2026-09",
        netPaid: "15300.00",
        date: "2026-09-28",
        paidFromAccount: "cash",
        expenseId: "exp-1",
        reversedAt: null,
      },
    });

  function renderPaid() {
    payrollState = {
      payroll: payroll([paidRow()]),
      loading: false,
      error: null,
    };
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

  it("opens the reversal drawer from the Paid cell and reverses behind a confirm step", async () => {
    const user = userEvent.setup();
    renderPaid();

    await user.click(
      screen.getAllByRole("button", { name: /Paid · /i })[0],
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/Amount to reverse/i),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("KES 15,300.00")).toBeInTheDocument();

    // First click reveals the confirm; nothing sent yet.
    await user.click(
      within(dialog).getByRole("button", { name: /Reverse payout…/i }),
    );
    expect(reversePayout).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole("button", { name: "Confirm reversal" }),
    );
    await waitFor(() => expect(reversePayout).toHaveBeenCalledOnce());
    expect(reversePayout).toHaveBeenCalledWith("po-1");
  });

  it("surfaces an already-reversed CONFLICT inline", async () => {
    const user = userEvent.setup();
    const { StaffRequestError } = await import("@/app/admin/staff/use-staff");
    reversePayout.mockRejectedValueOnce(
      new StaffRequestError(409, {
        code: "CONFLICT",
        message: "Already reversed.",
        field: "payoutId",
      }),
    );
    renderPaid();

    await user.click(
      screen.getAllByRole("button", { name: /Paid · /i })[0],
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(
      within(dialog).getByRole("button", { name: /Reverse payout…/i }),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "Confirm reversal" }),
    );

    expect(
      await within(dialog).findByText(/already been reversed/i),
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

// ── Correct / Void a pay advance / deduction (ADR-72) ────────────────

describe("Pay — correct / void an advance", () => {
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

  beforeEach(() => {
    payrollState = {
      payroll: payroll([pay({ adjustments: [adj()] })]),
      loading: false,
      error: null,
    };
  });

  it("opens the adjustments list from the Advances cell and submits a correction (FINAL amount, no money leg)", async () => {
    const user = userEvent.setup();
    renderPay();

    // The Advances cell is now a button (there is an advance to review).
    await user.click(
      screen.getAllByRole("button", { name: /Review advances for/i })[0],
    );
    const list = await screen.findByRole("dialog");
    await user.click(
      within(list).getAllByRole("button", { name: "Correct" })[0],
    );

    const editor = await screen.findByRole("dialog", {
      name: /Correct Advance/i,
    });
    const amount = within(editor).getByLabelText(/Corrected advance amount/i);
    await user.clear(amount);
    await user.type(amount, "3500");
    await user.click(
      within(editor).getByRole("button", { name: "Save Correction" }),
    );

    await waitFor(() => expect(correctAdjustment).toHaveBeenCalledOnce());
    expect(correctAdjustment).toHaveBeenCalledWith("adj-1", {
      amount: "3500",
      note: "school fees",
    });
    expect(await screen.findByText("Adjustment corrected")).toBeInTheDocument();
  });

  it("Void is behind a confirm step and posts no body", async () => {
    const user = userEvent.setup();
    renderPay();

    await user.click(
      screen.getAllByRole("button", { name: /Review advances for/i })[0],
    );
    const list = await screen.findByRole("dialog");
    await user.click(
      within(list).getAllByRole("button", { name: "Correct" })[0],
    );
    const editor = await screen.findByRole("dialog", {
      name: /Correct Advance/i,
    });

    // First click only reveals the confirm button.
    await user.click(
      within(editor).getByRole("button", { name: /Void advance…/i }),
    );
    expect(voidAdjustment).not.toHaveBeenCalled();
    await user.click(
      within(editor).getByRole("button", { name: "Confirm void" }),
    );

    await waitFor(() => expect(voidAdjustment).toHaveBeenCalledOnce());
    expect(voidAdjustment).toHaveBeenCalledWith("adj-1");
    expect(await screen.findByText("Adjustment voided")).toBeInTheDocument();
  });

  it("an idempotent-resubmit VALIDATION_ERROR surfaces inline in the editor", async () => {
    const user = userEvent.setup();
    const { StaffRequestError } = await import("@/app/admin/staff/use-staff");
    correctAdjustment.mockRejectedValueOnce(
      new StaffRequestError(400, {
        code: "VALIDATION_ERROR",
        message: "same as current",
        field: "amount",
      }),
    );
    renderPay();

    await user.click(
      screen.getAllByRole("button", { name: /Review advances for/i })[0],
    );
    const list = await screen.findByRole("dialog");
    await user.click(
      within(list).getAllByRole("button", { name: "Correct" })[0],
    );
    const editor = await screen.findByRole("dialog", {
      name: /Correct Advance/i,
    });
    await user.click(
      within(editor).getByRole("button", { name: "Save Correction" }),
    );

    expect(
      await within(editor).findByText(/Check the amount and try again/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Adjustment corrected")).not.toBeInTheDocument();
  });

  it("a zero-amount (voided) adjustment shows View, not Correct, and the editor is read-only", async () => {
    const user = userEvent.setup();
    payrollState = {
      payroll: payroll([
        pay({
          advances: "0.00",
          adjustments: [adj({ amount: "0.00", corrected: true })],
        }),
      ]),
      loading: false,
      error: null,
    };
    renderPay();

    // Advances is 0 → the desktop cell is an inert em-dash; reach the list
    // via the mobile "Review advances / deductions" button (jsdom renders both).
    await user.click(
      screen.getByRole("button", { name: /Review advances \/ deductions/i }),
    );
    const list = await screen.findByRole("dialog");
    expect(
      within(list).queryByRole("button", { name: "Correct" }),
    ).not.toBeInTheDocument();
    await user.click(within(list).getByRole("button", { name: "View" }));

    const editor = await screen.findByRole("dialog", {
      name: /Correct Advance/i,
    });
    expect(
      within(editor).getByText(/already been voided/i),
    ).toBeInTheDocument();
    expect(
      within(editor).queryByRole("button", { name: /Void advance…/i }),
    ).not.toBeInTheDocument();
  });
});
