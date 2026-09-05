// @vitest-environment jsdom
// /admin/financials/opening (ADR-70) — the Admin states the business's
// Day-1 cash / M-Pesa position.
//
// The behaviour worth pinning is the TWO-STATE shape: an entry form while
// nothing is set, and a locked receipt with a warning-first correction
// drawer once it is. That distinction is the only thing stopping the Admin
// from typing today's cash over the Day-1 figure — the backend cannot tell
// those apart (ADR-70), so it has to hold here.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

const hook = vi.hoisted(() => ({
  save: vi.fn(),
  state: {
    current: null as unknown,
  },
  balances: {
    current: null as unknown,
  },
  loading: { current: false },
  error: { current: null as string | null },
}));

vi.mock("@/app/admin/financials/opening/use-opening-balance", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/financials/opening/use-opening-balance")
  >("@/app/admin/financials/opening/use-opening-balance");
  return {
    ...actual,
    useOpeningBalance: () => ({
      state: hook.state.current,
      balances: hook.balances.current,
      loading: hook.loading.current,
      error: hook.error.current,
      refresh: vi.fn(),
      save: hook.save,
    }),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { OpeningBalanceClient } from "@/app/admin/financials/opening/opening-balance-client";

const DAY_ONE = "2026-08-01";

function unsetState() {
  return {
    businessDate: DAY_ONE,
    accounts: [
      { account: "cash", businessDate: DAY_ONE, amount: "0.00", set: false, corrected: false },
      { account: "mpesa_bank", businessDate: DAY_ONE, amount: "0.00", set: false, corrected: false },
    ],
  };
}

function setState() {
  return {
    businessDate: DAY_ONE,
    accounts: [
      { account: "cash", businessDate: DAY_ONE, amount: "40000.00", set: true, corrected: false },
      { account: "mpesa_bank", businessDate: DAY_ONE, amount: "12500.00", set: true, corrected: false },
    ],
  };
}

function renderScreen() {
  return render(
    <ToastProvider>
      <OpeningBalanceClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.loading.current = false;
  hook.error.current = null;
  hook.state.current = unsetState();
  hook.balances.current = { cash: "62300.00", mpesaBank: "18900.00" };
  hook.save.mockResolvedValue({});
});

describe("/admin/financials/opening — first-time setup", () => {
  it("shows an entry form naming the date it will claim", async () => {
    renderScreen();
    expect(
      await screen.findByText("Set your opening balances"),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 Aug 2026/)).toBeInTheDocument();
    expect(screen.getByLabelText("Cash at hand")).toBeInTheDocument();
    expect(screen.getByLabelText("M-Pesa / Bank")).toBeInTheDocument();
  });

  it("keeps Save disabled until a valid amount is entered", async () => {
    renderScreen();
    const user = userEvent.setup();
    const save = (
      await screen.findAllByRole("button", { name: "Save Opening Balances" })
    )[0];
    expect(save).toBeDisabled();

    await user.type(screen.getByLabelText("Cash at hand"), "40000");
    await waitFor(() => expect(save).toBeEnabled());
  });

  it("saves each entered account and reports the field error on a bad amount", async () => {
    renderScreen();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Cash at hand"), "40000");
    await user.type(screen.getByLabelText("M-Pesa / Bank"), "12500");
    await user.click(
      (await screen.findAllByRole("button", { name: "Save Opening Balances" }))[0],
    );

    await waitFor(() => expect(hook.save).toHaveBeenCalledTimes(2));
    expect(hook.save).toHaveBeenCalledWith("cash", "40000");
    expect(hook.save).toHaveBeenCalledWith("mpesa_bank", "12500");
  });

  it("flags a non-numeric amount without calling save", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Cash at hand"), "abc");

    expect(
      await screen.findByText("Enter an amount, e.g. 40000 or 40000.00"),
    ).toBeInTheDocument();
    const save = (
      await screen.findAllByRole("button", { name: "Save Opening Balances" })
    )[0];
    expect(save).toBeDisabled();
    expect(hook.save).not.toHaveBeenCalled();
  });
});

describe("/admin/financials/opening — already set (the locked receipt)", () => {
  beforeEach(() => {
    hook.state.current = setState();
  });

  it("shows Day 1 figures beside today's live balance", async () => {
    renderScreen();
    const summary = await screen.findByTestId("opening-balance-summary");

    // Day 1, and today, are BOTH on screen — that contrast is the point.
    expect(within(summary).getByText("KES 40,000.00")).toBeInTheDocument();
    expect(within(summary).getByText("KES 62,300.00")).toBeInTheDocument();
    expect(within(summary).getByText("KES 12,500.00")).toBeInTheDocument();
    expect(within(summary).getByText("KES 18,900.00")).toBeInTheDocument();
  });

  it("says plainly that this is not today's balance", async () => {
    renderScreen();
    expect(
      await screen.findByText(/Opening balances — set on 1 Aug 2026/),
    ).toBeInTheDocument();
    expect(screen.getByText(/not/)).toBeInTheDocument();
  });

  it("offers no entry form and no bare Save", async () => {
    renderScreen();
    await screen.findByTestId("opening-balance-summary");
    expect(screen.queryByLabelText("Cash at hand")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save Opening Balances" }),
    ).not.toBeInTheDocument();
  });

  it("names the action 'Correct', never 'Edit'", async () => {
    renderScreen();
    expect(
      await screen.findByRole("button", { name: "Correct Cash at hand" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
  });
});

describe("/admin/financials/opening — the correction drawer", () => {
  beforeEach(() => {
    hook.state.current = setState();
  });

  async function openDrawer() {
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: "Correct Cash at hand" }),
    );
    return user;
  }

  it("leads with the warning before the field", async () => {
    renderScreen();
    await openDrawer();

    expect(
      await screen.findByText("Only use this if the Day 1 figure was wrong."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/will change every profit report since/),
    ).toBeInTheDocument();
  });

  it("prefills the current figure and disables Save until it changes", async () => {
    renderScreen();
    const user = await openDrawer();

    const field = await screen.findByLabelText(
      /Correct Day 1 Cash at hand to/,
    );
    expect(field).toHaveValue("40000.00");

    const save = screen.getByRole("button", { name: "Save Correction" });
    expect(save).toBeDisabled();

    await user.clear(field);
    await user.type(field, "45000");
    await waitFor(() => expect(save).toBeEnabled());
  });

  it("submits the corrected FINAL figure, not a delta", async () => {
    renderScreen();
    const user = await openDrawer();

    const field = await screen.findByLabelText(
      /Correct Day 1 Cash at hand to/,
    );
    await user.clear(field);
    await user.type(field, "45000");
    await user.click(screen.getByRole("button", { name: "Save Correction" }));

    // CONVENTIONS §4.2 — the form asks for the correct final value.
    await waitFor(() => expect(hook.save).toHaveBeenCalledWith("cash", "45000"));
  });

  it("surfaces a closed-day rejection in the drawer", async () => {
    const { OpeningBalanceRequestError } = await import(
      "@/app/admin/financials/opening/use-opening-balance"
    );
    hook.save.mockRejectedValueOnce(
      new OpeningBalanceRequestError(403, {
        code: "FORBIDDEN",
        message: "This day is closed.",
      }),
    );

    renderScreen();
    const user = await openDrawer();
    const field = await screen.findByLabelText(
      /Correct Day 1 Cash at hand to/,
    );
    await user.clear(field);
    await user.type(field, "45000");
    await user.click(screen.getByRole("button", { name: "Save Correction" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Reopen it from Day Close/,
    );
  });
});
