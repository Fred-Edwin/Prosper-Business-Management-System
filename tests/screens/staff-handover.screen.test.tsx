// @vitest-environment jsdom
//
// M3 S3 — the staff Handover screen (/cashier/handover, mirrored at
// /canteen/handover). Interactive bits only:
//   • declaring today's handover posts { cashDeclared, mpesaDeclared }
//   • editing after the Admin has received it → the domain returns
//     CONFLICT → the screen shows "Already received — ask an
//     administrator to correct it." and does not leave a generic error
// use-my-handover is mocked; no server / DB.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { HandoverView } from "@/lib/domain/handovers";
import { HandoverRequestError } from "@/app/cashier/handover/use-my-handover";

const declare = vi.fn();
const editOwn = vi.fn();
const refresh = vi.fn();
let state: {
  todaysHandover: HandoverView | null;
  history: HandoverView[];
  loading: boolean;
  error: string | null;
} = { todaysHandover: null, history: [], loading: false, error: null };

vi.mock("@/app/cashier/handover/use-my-handover", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/app/cashier/handover/use-my-handover")
    >();
  return {
    ...actual,
    useMyHandover: () => ({
      todaysHandover: state.todaysHandover,
      history: state.history,
      loading: state.loading,
      error: state.error,
      refresh,
      declare,
      editOwn,
    }),
  };
});

import { HandoverClient } from "@/app/cashier/handover/handover-client";

function handover(over: Partial<HandoverView> = {}): HandoverView {
  return {
    id: "h1",
    staffId: "s1",
    staffName: "Grace Cashier",
    locationId: "loc-rest",
    locationName: "Restaurant",
    cashDeclared: "5000.00",
    mpesaDeclared: "3000.00",
    occurredAt: new Date().toISOString(),
    correctsHandoverId: null,
    createdAt: new Date().toISOString(),
    receipts: [],
    ...over,
  };
}

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <HandoverClient locationLabel="the Restaurant" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state = { todaysHandover: null, history: [], loading: false, error: null };
  declare.mockResolvedValue(handover());
  editOwn.mockResolvedValue(handover());
});

describe("staff Handover — declare", () => {
  it("posts the declared cash + M-Pesa", async () => {
    const user = userEvent.setup();
    renderScreen();

    await user.type(screen.getByLabelText(/^Cash/), "5000");
    await user.type(screen.getByLabelText(/^M-Pesa/), "3000");
    await user.click(
      screen.getByRole("button", { name: "Declare handover" }),
    );

    await waitFor(() => expect(declare).toHaveBeenCalledOnce());
    expect(declare).toHaveBeenCalledWith({
      cashDeclared: "5000",
      mpesaDeclared: "3000",
    });
    expect(await screen.findByText("Handover declared")).toBeInTheDocument();
  });
});

describe("staff Handover — edit after receipt", () => {
  it("shows the CONFLICT message and locks the form when a receipt already exists", async () => {
    // A receipt exists → the form renders locked up-front (no Update button).
    state.todaysHandover = handover({
      receipts: [
        {
          id: "r1",
          handoverId: "h1",
          cashReceived: "5000.00",
          mpesaReceived: "3000.00",
          cashVariance: "0.00",
          mpesaVariance: "0.00",
          recordedById: "admin",
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          shortfalls: [],
        },
      ],
    });
    renderScreen();

    expect(
      await screen.findByText(
        "Already received — ask an administrator to correct it.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Update handover/ }),
    ).not.toBeInTheDocument();
  });

  it("catches a CONFLICT thrown on submit and shows the same message", async () => {
    // No receipt in the loaded view yet, but the Admin receives between
    // load and submit → editOwn throws CONFLICT.
    state.todaysHandover = handover();
    editOwn.mockRejectedValueOnce(
      new HandoverRequestError(409, {
        code: "CONFLICT",
        message: "already received, ask Admin",
      }),
    );
    const user = userEvent.setup();
    renderScreen();

    const cash = screen.getByLabelText(/^Cash/);
    await user.clear(cash);
    await user.type(cash, "5200");
    await user.click(screen.getByRole("button", { name: "Update handover" }));

    expect(
      await screen.findByText(
        "Already received — ask an administrator to correct it.",
      ),
    ).toBeInTheDocument();
  });
});
