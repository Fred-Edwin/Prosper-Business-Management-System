// @vitest-environment jsdom
//
// ADR-79 — <RecordHandoverDrawer>: the Admin back-entry drawer for a
// handover a staff member never declared. Standalone from
// admin-handovers.screen.test.tsx (which stubs the roster empty) so this
// file can exercise a real staff selection → submit flow.

import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { StaffView } from "@/lib/domain/staff";
import { RecordHandoverDrawer } from "@/app/admin/financials/record-handover-drawer";
import { HandoversRequestError } from "@/app/admin/financials/use-handovers";

function staff(over: Partial<StaffView> = {}): StaffView {
  return {
    id: "staff-1",
    name: "Anne Gitonga",
    role: "canteen_attendant",
    jobTitle: null,
    appAccess: true,
    payModel: "fixed_daily_rate",
    locationId: "loc-canteen",
    locationName: "Canteen",
    dailyRate: "0.00",
    active: true,
    userId: "user-1",
    userActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

function renderDrawer(over: Partial<Parameters<typeof RecordHandoverDrawer>[0]> = {}) {
  const recordBackdated = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <ToastProvider placement="top-right">
      <RecordHandoverDrawer
        staff={[staff(), staff({ id: "staff-2", name: "Grace Cashier", role: "cashier", locationId: "loc-rest", locationName: "Restaurant" })]}
        defaultDate="2026-09-09"
        recordBackdated={recordBackdated}
        onClose={onClose}
        {...over}
      />
    </ToastProvider>,
  );
  return { recordBackdated, onClose };
}

describe("RecordHandoverDrawer", () => {
  it("filters the staff options to cashier / canteen_attendant, active only", async () => {
    const user = userEvent.setup();
    renderDrawer({
      staff: [
        staff(),
        staff({ id: "s-inactive", name: "Inactive One", active: false }),
        staff({ id: "s-admin-like", name: "Roster Cook", role: null, jobTitle: "Cook" }),
      ],
    });
    await user.click(screen.getByRole("combobox", { name: "Staff member" }));
    expect(await screen.findByRole("option", { name: /Anne Gitonga/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Inactive One/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Roster Cook/ })).not.toBeInTheDocument();
  });

  it("submits staffId/locationId resolved from the selected staff member", async () => {
    const user = userEvent.setup();
    const { recordBackdated, onClose } = renderDrawer();

    await user.click(screen.getByRole("combobox", { name: "Staff member" }));
    await user.click(await screen.findByRole("option", { name: /Anne Gitonga/ }));

    const cash = screen.getByLabelText(/Cash declared/);
    await user.type(cash, "3428.00");
    const mpesa = screen.getByLabelText(/M-Pesa declared/);
    await user.type(mpesa, "8362.00");

    await user.click(screen.getByRole("button", { name: "Record handover" }));

    await waitFor(() => expect(recordBackdated).toHaveBeenCalledOnce());
    expect(recordBackdated).toHaveBeenCalledWith({
      staffId: "staff-1",
      locationId: "loc-canteen",
      cashDeclared: "3428.00",
      mpesaDeclared: "8362.00",
      businessDate: "2026-09-09",
    });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("surfaces a CONFLICT from the server as an inline message, drawer stays open", async () => {
    const recordBackdated = vi
      .fn()
      .mockRejectedValueOnce(
        new HandoversRequestError(409, {
          code: "CONFLICT",
          message: "A handover for this staff member on this day already exists.",
        }),
      );
    const user = userEvent.setup();
    render(
      <ToastProvider placement="top-right">
        <RecordHandoverDrawer
          staff={[staff()]}
          defaultDate="2026-09-09"
          recordBackdated={recordBackdated}
          onClose={vi.fn()}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("combobox", { name: "Staff member" }));
    await user.click(await screen.findByRole("option", { name: /Anne Gitonga/ }));
    await user.type(screen.getByLabelText(/Cash declared/), "100.00");
    await user.type(screen.getByLabelText(/M-Pesa declared/), "0.00");
    await user.click(screen.getByRole("button", { name: "Record handover" }));

    expect(
      await screen.findByText(/already exists — correct it instead/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("disables submit for a business date after today", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("combobox", { name: "Staff member" }));
    await user.click(await screen.findByRole("option", { name: /Anne Gitonga/ }));
    await user.type(screen.getByLabelText(/Cash declared/), "10.00");
    await user.type(screen.getByLabelText(/M-Pesa declared/), "0.00");

    const dateInput = screen.getByLabelText(/Business date/) as HTMLInputElement;
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    await user.clear(dateInput);
    await user.type(dateInput, future);

    expect(screen.getByRole("button", { name: "Record handover" })).toBeDisabled();
  });
});
