// @vitest-environment jsdom
// Session 12 per-screen gate — /canteen hub composed from the kit.
// FIX-2: the incoming-transfer banner is now a single "N items incoming —
// Review & Receive" prompt that NAVIGATES to /canteen/transfer/receive
// (no inline one-tap Accept, no Flag Variance). Plus <ActionTileGrid>
// nav, <ErrorState>, empty <ActivityTimeline>.
import { describe, it, expect, vi, beforeEach, afterAll, beforeAll } from "vitest";
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
// Session 16 / ADR-69 — the hub reads Canteen-destined deliveries
// awaiting receipt. Receiving is by DESTINATION, so the attendant now sees
// (and can receive) a purchase the Admin paid for against the Canteen;
// before, `/outstanding` 403'd the role outright and the row was a dead
// end. Mirrors the SM hub's banner.
const outstanding = vi.hoisted(() => ({
  rows: [] as StockMovementView[],
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
    useOutstandingDeliveries: () => outstanding,
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
    productName: null,
    unitLabel: null,
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


// The timeline renders TODAY's movements only (F7, 2026-09-02 audit), so the
// clock is pinned to the business date these fixtures are dated to. Without
// this the rows would be filtered out and every timeline assertion would fail
// for the wrong reason.
beforeAll(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(new Date("2026-08-28T12:00:00+03:00"));
});
afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  hook.loading = false;
  hook.error = null;
  hook.data.movements = [];
  hook.data.products = [
    { id: "prod-rice", name: "Rice Basmati", unitLabel: "kg" },
  ];
  outstanding.rows = [];
  outstanding.loading = false;
  outstanding.error = null;
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

  it("the incoming banner's primary action NAVIGATES to the receive screen (no inline accept)", async () => {
    hook.data.movements = [mv({}), mv({ id: "mv-2", productId: "prod-rice", quantity: "-4.0000" })];
    renderScreen();
    const user = userEvent.setup();
    const region = screen.getByRole("region", { name: /Incoming transfers/ });
    // Summary banner, not one-per-line.
    expect(within(region).getByText(/2 items incoming/)).toBeInTheDocument();
    await user.click(
      within(region).getByRole("button", { name: /Review .* Receive/ }),
    );
    expect(push).toHaveBeenCalledWith("/canteen/transfer/receive");
    // The old one-tap accept / flag calls must NOT fire from the hub.
    expect(acceptFn).not.toHaveBeenCalled();
    expect(flagFn).not.toHaveBeenCalled();
  });

  it("no incoming banner when nothing is in transit", () => {
    hook.data.movements = [];
    renderScreen();
    expect(
      screen.queryByRole("region", { name: /Incoming transfers/ }),
    ).not.toBeInTheDocument();
  });

  it("navigates from the Stock Count tile to /canteen/stock-count", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Stock Count/ }));
    expect(push).toHaveBeenCalledWith("/canteen/stock-count");
  });

  it("navigates from the Non-sale tile to /canteen/flows/non-sale (Session 16)", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Non-sale/ }));
    expect(push).toHaveBeenCalledWith("/canteen/flows/non-sale");
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

  // ── F7-7: the derived-sale row is revenue-in, not stock-out ──────────
  it("F7-7: a derived-sale row shows +KES revenue in the success tone + 'sold' subtitle", () => {
    hook.data.movements = [
      mv({
        id: "mv-sale-count",
        movementType: "sale",
        quantity: "-96.0000",
        stockCountId: "count-123",
        derivedRevenue: "5760.00",
        occurredAt: "2026-08-28T14:30:00Z",
      }),
    ];
    renderScreen();
    expect(screen.getByText("Rice Basmati")).toBeInTheDocument();
    // subtitle: units sold + time (no red stock-out figure).
    expect(screen.getByText(/96 kg sold ·/)).toBeInTheDocument();
    const value = screen.getByText("+KES 5,760.00");
    expect(value).toBeInTheDocument();
    expect(value.className).toMatch(/text-success/);
    // the old "-96 kg" stock-out treatment must NOT appear.
    expect(screen.queryByText(/-96 kg/)).not.toBeInTheDocument();
  });

  it("F7-7: a zero-sold count shows a muted em-dash, not a red figure", () => {
    hook.data.movements = [
      mv({
        id: "mv-sale-zero",
        movementType: "sale",
        quantity: "0.0000",
        stockCountId: "count-999",
        derivedRevenue: null,
        occurredAt: "2026-08-28T15:00:00Z",
      }),
    ];
    renderScreen();
    const value = screen.getByText("—");
    expect(value).toBeInTheDocument();
    // never the danger tone for a derived sale.
    expect(value.className).not.toMatch(/text-danger/);
  });

  // ── Session 16 / ADR-69: Canteen-destined delivery banner + tile ─────

  it("no delivery banner when nothing is awaiting receipt", () => {
    renderScreen();
    expect(
      screen.queryByText(/Purchase delivery pending/),
    ).not.toBeInTheDocument();
    // …and the Receive tile carries its default sub-label, unbadged.
    expect(screen.getByText("Log a supplier delivery")).toBeInTheDocument();
  });

  it("an awaiting Canteen delivery pins a banner and badges the Receive tile", () => {
    outstanding.rows = [
      mv({
        id: "pay-1",
        movementType: "purchase_payment",
        quantity: "0.0000",
        purchaseSupplier: "Coast Bottlers",
        purchaseOrderedQty: "12.0000",
      }),
    ];
    renderScreen();
    expect(
      screen.getByText(/Purchase delivery pending · Rice Basmati/),
    ).toBeInTheDocument();
    expect(screen.getByText(/12 kg · Coast Bottlers/)).toBeInTheDocument();
    expect(screen.getByText("1 delivery pending")).toBeInTheDocument();
    // Session 16: the delivery banner passes no `onFlag` — "Flag Variance"
    // is the two-phase TRANSFER path (ADR-39) and rejects a
    // purchase_payment row. The kit Banner now renders that button only
    // when a handler is wired, so it must be absent here.
    expect(
      screen.queryByRole("button", { name: /Flag Variance/ }),
    ).not.toBeInTheDocument();
  });

  it("two awaiting deliveries pluralise the tile sub-label", () => {
    outstanding.rows = [
      mv({ id: "pay-1", purchaseSupplier: "A", purchaseOrderedQty: "5.0000" }),
      mv({ id: "pay-2", purchaseSupplier: "B", purchaseOrderedQty: "8.0000" }),
    ];
    renderScreen();
    expect(screen.getByText("2 deliveries pending")).toBeInTheDocument();
  });

  // A delivery can arrive short, so the banner does NOT one-tap write a
  // receipt for the ordered qty — it routes to the Receive flow.
  it("'Review & receive' routes to the Canteen Receive flow", async () => {
    outstanding.rows = [
      mv({ id: "pay-1", purchaseSupplier: "A", purchaseOrderedQty: "12.0000" }),
    ];
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Review & receive/ }));
    expect(push).toHaveBeenCalledWith("/canteen/flows/receive");
  });

  it("navigates from the Receive Goods tile", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Receive Goods/ }));
    expect(push).toHaveBeenCalledWith("/canteen/flows/receive");
  });

  it("a failed deliveries read is non-fatal — hub still renders, no banner", () => {
    outstanding.error = "boom";
    outstanding.rows = [];
    renderScreen();
    expect(
      screen.queryByText(/Purchase delivery pending/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Canteen workflows")).toBeInTheDocument();
  });

  it("F7-7: a non-canteen-sale movement still renders unchanged (signed qty, its own tone)", () => {
    hook.data.movements = [
      mv({
        id: "mv-accept",
        movementType: "transfer",
        quantity: "48.0000",
        stockCountId: null,
        occurredAt: "2026-08-28T11:32:00Z",
      }),
    ];
    renderScreen();
    expect(screen.getByText("+48 kg")).toBeInTheDocument();
    expect(screen.getByText(/Transfer ·/)).toBeInTheDocument();
  });
});
