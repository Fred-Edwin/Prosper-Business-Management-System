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

// F7-3 — the hub's "Today's stock counts" undo section.
const derivedHook = vi.hoisted(() => ({
  rows: [] as unknown[],
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const voidCountFn = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/app/canteen/use-stock-count", () => ({
  useDerivedSales: () => derivedHook,
  useStockCountActions: () => ({
    recordStockCount: vi.fn(),
    voidStockCount: voidCountFn,
  }),
}));

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
    derivedRevenue: null,
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
  derivedHook.rows = [];
  derivedHook.error = null;
  voidCountFn.mockResolvedValue(undefined);
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

  it("F7-3: no 'Today's stock counts' section when nothing was counted today", () => {
    renderScreen();
    expect(screen.queryByText(/Today.s stock counts/)).not.toBeInTheDocument();
  });

  it("F7-3: today's count lists with 'Delete today's count' → confirm → voidStockCount + toast + refresh", async () => {
    derivedHook.rows = [
      {
        productId: "prod-rice",
        productName: "Rice Basmati",
        lastCountedAt: "2026-08-31T09:00:00Z",
        periodStart: null,
        periodEnd: "2026-08-31T09:00:00Z",
        unitsSold: "48.0000",
        revenue: "2880.00",
        stockCountId: "count-abc",
      },
    ];
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderScreen();
    const user = userEvent.setup();

    expect(screen.getByText(/Today.s stock counts/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Delete today.s count/ }),
    );
    await waitFor(() => expect(voidCountFn).toHaveBeenCalledWith("count-abc"));
    expect(derivedHook.refresh).toHaveBeenCalled();
    expect(hook.refresh).toHaveBeenCalled();
    expect(
      await screen.findByText(/Count deleted · Rice Basmati/),
    ).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("F7-3: cancelling the confirm does not call voidStockCount", async () => {
    derivedHook.rows = [
      {
        productId: "prod-rice",
        productName: "Rice Basmati",
        lastCountedAt: "2026-08-31T09:00:00Z",
        periodStart: null,
        periodEnd: "2026-08-31T09:00:00Z",
        unitsSold: "48.0000",
        revenue: "2880.00",
        stockCountId: "count-abc",
      },
    ];
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderScreen();
    const user = userEvent.setup();
    await user.click(
      screen.getByRole("button", { name: /Delete today.s count/ }),
    );
    expect(voidCountFn).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
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
