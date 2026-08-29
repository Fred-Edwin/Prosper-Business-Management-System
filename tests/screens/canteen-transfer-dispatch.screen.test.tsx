// @vitest-environment jsdom
// Session 12 per-screen gate — Canteen transfer-dispatch flow composed
// from the kit. useStaffStock + stockApi mocked; no server / DB.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));

const hook = vi.hoisted(() => ({
  data: {
    movements: [] as unknown[],
    products: [{ id: "prod-soda", name: "Soda 300ml", unitLabel: "pcs", kind: "goods" }],
    locations: [
      { id: "loc-canteen", name: "Canteen", type: "canteen" },
      { id: "loc-store", name: "Store", type: "store" },
    ],
  },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const dispatchFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return {
    ...actual,
    useStaffStock: () => hook,
    stockApi: { ...actual.stockApi, dispatchTransfer: dispatchFn },
  };
});

import { TransferDispatchFlow } from "@/app/canteen/transfer/transfer-dispatch-flow";

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <TransferDispatchFlow />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.loading = false;
  hook.error = null;
});

async function pick(user: ReturnType<typeof userEvent.setup>, name: RegExp, option: string) {
  await user.click(screen.getByRole("combobox", { name }));
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("Canteen — Transfer Dispatch flow", () => {
  it("dispatch POSTs { fromLocationId: canteen, toLocationId, unsigned quantity } and toasts", async () => {
    renderScreen();
    const user = userEvent.setup();

    await pick(user, /^Product/, "Soda 300ml");
    const qty = screen.getByRole("spinbutton", { name: /Transfer quantity/ });
    await user.clear(qty);
    await user.type(qty, "24");
    await user.tab();
    await pick(user, /Destination/, "Store");

    await user.click(screen.getByRole("button", { name: /Dispatch \(−24 pcs\)/ }));

    await waitFor(() =>
      expect(dispatchFn).toHaveBeenCalledWith({
        productId: "prod-soda",
        fromLocationId: "loc-canteen",
        toLocationId: "loc-store",
        quantity: "24",
      }),
    );
    expect(await screen.findByText(/Dispatched 24 pcs Soda 300ml to Store/)).toBeInTheDocument();
  });

  it("clicking submit while incomplete surfaces the §9.8 field errors", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Transfer Stock" }));
    expect(await screen.findByText("Pick a product.")).toBeInTheDocument();
    expect(screen.getByText("Pick a destination.")).toBeInTheDocument();
    expect(dispatchFn).not.toHaveBeenCalled();
  });

  it("<QuantityStepper> Decrease disabled at min (0)", async () => {
    renderScreen();
    const user = userEvent.setup();
    const qty = screen.getByRole("spinbutton", { name: /Transfer quantity/ });
    await user.clear(qty);
    await user.type(qty, "0");
    await user.tab();
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
  });

  it("<ErrorState> with Retry on a fetch failure", () => {
    hook.error = "Failed to load stock.";
    renderScreen();
    expect(within(screen.getByRole("alert")).getByText("Failed to load stock.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
