// @vitest-environment jsdom
// FIX-2 per-screen gate — /canteen/transfer/receive. The Canteen
// Attendant sees one row per pending inbound dispatch line with a stepper
// PRE-FILLED to the dispatched qty, adjusts what actually arrived, and
// taps Receive → one accept call per line ({ receivedQuantity } only for
// the lines they changed). Composed from the SM movement-picker kit
// (<FlowScaffold> + <SelectableProductRow>); no flag path.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { StockMovementView } from "@/lib/domain/stock";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const hook = vi.hoisted(() => ({
  data: {
    movements: [] as StockMovementView[],
    products: [] as unknown[],
    locations: [{ id: "loc-canteen", name: "Canteen", type: "canteen" }],
  },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const acceptFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));
// Session 16: the review shows the resulting Canteen balance per line, so
// the screen now reads derived balances too.
const levels = vi.hoisted(() => ({
  rows: [] as Array<{ productId: string; quantity: string }>,
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return {
    ...actual,
    useStaffStock: () => hook,
    useStockLevels: () => levels,
    stockApi: {
      ...actual.stockApi,
      acceptTransfer: acceptFn,
      // Real loop over the mocked acceptTransfer, so the screen's
      // per-line body-shaping is what we assert.
      acceptTransferBatch: async (
        lines: Array<{ movementId: string; receivedQuantity?: string }>,
      ) => {
        const out = [];
        for (const l of lines) out.push(await acceptFn(l.movementId, l.receivedQuantity));
        return out;
      },
    },
  };
});

import { ReceiveTransferFlow } from "@/app/canteen/transfer/receive/receive-transfer-flow";

function mv(over: Partial<StockMovementView>): StockMovementView {
  return {
    id: "disp-1",
    productId: "prod-chapati",
    locationId: "loc-restaurant", // the SENDER's location
    movementType: "transfer",
    quantity: "-30.0000",
    recordedById: "u1",
    occurredAt: "2026-09-01T09:00:00Z",
    reason: null,
    reasonNote: null,
    orderId: null,
    stockCountId: null,
    transferCounterpartLocationId: "loc-canteen",
    purchasePaymentId: null,
    purchaseSupplier: null,
    purchaseOrderedQty: null,
    purchaseTotalCost: null,
    purchasePaidFrom: null,
    correctsMovementId: null,
    note: "Transfer dispatched — awaiting receipt",
    derivedRevenue: null,
    productName: null,
    unitLabel: null,
    createdAt: "2026-09-01T09:00:00Z",
    updatedAt: "2026-09-01T09:00:00Z",
    ...over,
  };
}

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <ReceiveTransferFlow />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.loading = false;
  hook.error = null;
  hook.data.movements = [];
  hook.data.products = [
    { id: "prod-chapati", name: "Chapati", unitLabel: "pcs" },
    { id: "prod-soda", name: "Soda 500ml", unitLabel: "btl" },
  ];
  levels.rows = [
    { productId: "prod-chapati", quantity: "60.0000" },
    { productId: "prod-soda", quantity: "40.0000" },
  ];
  levels.loading = false;
  levels.error = null;
});

describe("/canteen/transfer/receive — kit composition", () => {
  it("renders one row per pending inbound line, stepper pre-filled to the dispatched qty", () => {
    hook.data.movements = [
      mv({}),
      mv({ id: "disp-2", productId: "prod-soda", quantity: "-6.0000" }),
    ];
    renderScreen();

    expect(
      screen.getByRole("spinbutton", { name: /Chapati quantity/ }),
    ).toHaveAttribute("aria-valuenow", "30");
    expect(
      screen.getByRole("spinbutton", { name: /Soda 500ml quantity/ }),
    ).toHaveAttribute("aria-valuenow", "6");
  });

  it("a plain Receive (no edits) accepts every line with NO receivedQuantity", async () => {
    hook.data.movements = [
      mv({}),
      mv({ id: "disp-2", productId: "prod-soda", quantity: "-6.0000" }),
    ];
    renderScreen();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /^Receive/ }));

    await waitFor(() => expect(acceptFn).toHaveBeenCalledTimes(2));
    expect(acceptFn).toHaveBeenCalledWith("disp-1", undefined);
    expect(acceptFn).toHaveBeenCalledWith("disp-2", undefined);
    expect(push).toHaveBeenCalledWith("/canteen");
  });

  it("editing a stepper and tapping Receive sends receivedQuantity for the changed line only", async () => {
    hook.data.movements = [
      mv({}), // chapati, dispatched 30
      mv({ id: "disp-2", productId: "prod-soda", quantity: "-6.0000" }),
    ];
    renderScreen();
    const user = userEvent.setup();

    const chapatiQty = screen.getByRole("spinbutton", { name: /Chapati quantity/ });
    await user.clear(chapatiQty);
    await user.type(chapatiQty, "27");
    await user.tab();

    await user.click(screen.getByRole("button", { name: /^Receive/ }));

    await waitFor(() => expect(acceptFn).toHaveBeenCalledTimes(2));
    expect(acceptFn).toHaveBeenCalledWith("disp-1", "27");
    expect(acceptFn).toHaveBeenCalledWith("disp-2", undefined);
  });

  it("shows the empty state when nothing is incoming", () => {
    hook.data.movements = [];
    renderScreen();
    expect(screen.getByText("Nothing to receive")).toBeInTheDocument();
  });

  it("blocks Receive while a line has been zeroed out", async () => {
    hook.data.movements = [mv({})];
    renderScreen();
    const user = userEvent.setup();

    const qty = screen.getByRole("spinbutton", { name: /Chapati quantity/ });
    await user.clear(qty);
    await user.type(qty, "0");
    await user.tab();

    expect(screen.getByRole("button", { name: /^Receive/ })).toBeDisabled();
  });
  // ── Session 16 (owner): "during the review, show what's available and
  //    what's being added". Each line carries the resulting Canteen
  //    balance, live as the stepper moves.

  it("each line shows the resulting Canteen balance (on-hand → after)", () => {
    hook.data.movements = [
      mv({}), // Chapati -30 dispatched; on hand 60 → 90
      mv({ id: "disp-2", productId: "prod-soda", quantity: "-6.0000" }),
    ];
    renderScreen();
    expect(
      screen.getByLabelText("60 pcs on hand, 90 pcs after this"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("40 btl on hand, 46 btl after this"),
    ).toBeInTheDocument();
  });

  it("the resulting balance follows the stepper", async () => {
    hook.data.movements = [mv({})];
    renderScreen();
    const user = userEvent.setup();

    const field = screen.getByRole("spinbutton", { name: /Chapati quantity/ });
    await user.clear(field);
    await user.type(field, "10");
    await user.tab();

    expect(
      screen.getByLabelText("60 pcs on hand, 70 pcs after this"),
    ).toBeInTheDocument();
  });

  // Non-fatal: the receive must still work if the balances read fails.
  it("omits the resulting-balance line when balances are unavailable", () => {
    levels.error = "boom";
    levels.rows = [];
    hook.data.movements = [mv({})];
    renderScreen();
    expect(
      screen.queryByLabelText(/on hand, .* after this/),
    ).not.toBeInTheDocument();
    // The line itself still renders and is receivable.
    expect(screen.getByText("Chapati")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Receive \(\+30 pcs\)/ }),
    ).toBeEnabled();
  });

  // The attendant may receive MORE than was dispatched (the sender may
  // have under-counted). That must not paint the kit's §9.8 over-stock
  // block — which is why this screen owns its row.
  it("receiving more than dispatched is not blocked", async () => {
    hook.data.movements = [mv({})];
    renderScreen();
    const user = userEvent.setup();

    const field = screen.getByRole("spinbutton", { name: /Chapati quantity/ });
    await user.clear(field);
    await user.type(field, "20");
    await user.tab();

    expect(
      screen.queryByText(/reduce or remove this line/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Receive \(\+20 pcs\)/ }),
    ).toBeEnabled();
    expect(
      screen.getByLabelText("60 pcs on hand, 80 pcs after this"),
    ).toBeInTheDocument();
  });
});
