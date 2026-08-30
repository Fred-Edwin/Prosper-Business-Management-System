// @vitest-environment jsdom
// Session 12 per-screen gate — /canteen hub composed from the kit. Same
// shape as the Store Manager hub: pinned <TransferBanner> Accept/Flag,
// <ActionTileGrid> nav, <ErrorState>, empty <ActivityTimeline>.
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
const flagFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return {
    ...actual,
    useStaffStock: () => hook,
    stockApi: { ...actual.stockApi, acceptTransfer: acceptFn, flagTransfer: flagFn },
  };
});

import { CanteenHubClient } from "@/app/canteen/hub-client";

function mv(over: Partial<StockMovementView>): StockMovementView {
  return {
    id: "mv-1",
    productId: "prod-rice",
    locationId: "loc-canteen",
    movementType: "transfer",
    quantity: "-12.0000",
    recordedById: "u1",
    occurredAt: "2026-08-28T09:00:00Z",
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
    note: null,
    createdAt: "2026-08-28T09:00:00Z",
    updatedAt: "2026-08-28T09:00:00Z",
    ...over,
  };
}

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <CanteenHubClient locationLabel="Canteen" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.loading = false;
  hook.error = null;
  hook.data.movements = [];
  hook.data.products = [
    { id: "prod-rice", name: "Rice Basmati", unitLabel: "kg" },
  ];
});

describe("/canteen hub — kit composition", () => {
  it("navigates from the Transfer Dispatch tile", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Transfer Dispatch/ }));
    expect(push).toHaveBeenCalledWith("/canteen/transfer");
  });

  it("shows the empty timeline line", () => {
    renderScreen();
    expect(
      screen.getByText("No movements logged at Canteen today"),
    ).toBeInTheDocument();
  });

  it("shows <ErrorState> on failure", () => {
    hook.error = "Failed to load stock.";
    renderScreen();
    expect(
      within(screen.getByRole("alert")).getByText("Failed to load stock."),
    ).toBeInTheDocument();
  });

  it("pins an incoming <TransferBanner>; Accept → POST …/accept + toast + refresh", async () => {
    hook.data.movements = [mv({})];
    renderScreen();
    const user = userEvent.setup();
    const region = screen.getByRole("region", { name: /Incoming stock · Rice Basmati/ });
    await user.click(within(region).getByRole("button", { name: /Accept \(\+12 kg\)/ }));
    await waitFor(() => expect(acceptFn).toHaveBeenCalledWith("mv-1"));
    expect(hook.refresh).toHaveBeenCalled();
    expect(await screen.findByText(/Accepted 12 kg Rice Basmati/)).toBeInTheDocument();
  });

  it("Flag sends { flag, note }", async () => {
    hook.data.movements = [mv({})];
    const promptSpy = vi.spyOn(window, "prompt").mockReturnValue("bag torn");
    renderScreen();
    const user = userEvent.setup();
    const region = screen.getByRole("region", { name: /Incoming stock · Rice Basmati/ });
    await user.click(within(region).getByRole("button", { name: "Flag Variance" }));
    await waitFor(() => expect(flagFn).toHaveBeenCalledWith("mv-1", "bag torn"));
    promptSpy.mockRestore();
  });

  it("navigates from the Stock Count tile to /canteen/stock-count", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Stock Count/ }));
    expect(push).toHaveBeenCalledWith("/canteen/stock-count");
  });

  it("renders a canteen derived-sale movement as 'Stock count' in timeline (G7)", () => {
    hook.data.movements = [
      mv({
        id: "mv-sale-count",
        movementType: "sale",
        quantity: "-48.0000",
        stockCountId: "count-123",
        occurredAt: "2026-08-28T14:30:00Z",
      }),
    ];
    renderScreen();
    expect(screen.getByText("Rice Basmati")).toBeInTheDocument();
    expect(screen.getByText(/Stock count/)).toBeInTheDocument();
    expect(screen.getByText("-48 kg")).toBeInTheDocument();
  });
});
