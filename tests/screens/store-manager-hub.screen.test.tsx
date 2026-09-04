// @vitest-environment jsdom
// Session 12 per-screen gate — /store-manager hub composed from the kit.
// Drives the pinned <TransferBanner> Accept/Flag → toast + refresh, the
// <ActionTileGrid> navigation, the <ErrorState> branch, and the empty
// <ActivityTimeline>. useStaffStock + stockApi mocked; no server / DB.
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
    locations: [{ id: "loc-store", name: "Store", type: "store" }],
  },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const acceptFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const flagFn = vi.hoisted(() => vi.fn().mockResolvedValue({}));
// Session 16: the hub reads real outstanding deliveries (it used to read
// an empty `MOCK_PENDING_DELIVERIES` fixture, so the banner never showed).
const outstanding = vi.hoisted(() => ({
  rows: [] as StockMovementView[],
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
    useOutstandingDeliveries: () => outstanding,
    stockApi: {
      ...actual.stockApi,
      acceptTransfer: acceptFn,
      flagTransfer: flagFn,
    },
  };
});

import { StoreManagerHubClient } from "@/app/store-manager/hub-client";

function mv(over: Partial<StockMovementView>): StockMovementView {
  return {
    id: "mv-1",
    productId: "prod-soda",
    locationId: "loc-store",
    movementType: "transfer",
    quantity: "-48.0000",
    recordedById: "u1",
    occurredAt: "2026-08-28T08:30:00Z",
    reason: null,
    reasonNote: null,
    orderId: null,
    stockCountId: null,
    transferCounterpartLocationId: "loc-store",
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
    createdAt: "2026-08-28T08:30:00Z",
    updatedAt: "2026-08-28T08:30:00Z",
    ...over,
  };
}

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <StoreManagerHubClient locationLabel="Store" />
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
    { id: "prod-soda", name: "Soda 300ml", unitLabel: "pcs" },
  ];
  outstanding.rows = [];
  outstanding.loading = false;
  outstanding.error = null;
});

describe("/store-manager hub — kit composition", () => {
  it("renders the <ActionTileGrid> quick operations and navigates on tap", async () => {
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Issue to Kitchen/ }));
    expect(push).toHaveBeenCalledWith("/store-manager/flows/issue");
  });

  it("shows an empty <ActivityTimeline> line when there are no movements", () => {
    renderScreen();
    expect(
      screen.getByText("No movements logged at Store today"),
    ).toBeInTheDocument();
  });

  it("shows <ErrorState> with Retry on a fetch failure", async () => {
    hook.error = "Failed to load stock.";
    renderScreen();
    const user = userEvent.setup();
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Failed to load stock.")).toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(hook.refresh).toHaveBeenCalled();
  });

  it("pins an incoming <TransferBanner>; Accept calls POST …/accept, toasts, and refreshes", async () => {
    hook.data.movements = [mv({})];
    renderScreen();
    const user = userEvent.setup();

    const region = screen.getByRole("region", {
      name: /Incoming transfer · Soda 300ml/,
    });
    await user.click(
      within(region).getByRole("button", { name: /Accept \(\+48 pcs\)/ }),
    );

    await waitFor(() => expect(acceptFn).toHaveBeenCalledWith("mv-1"));
    expect(hook.refresh).toHaveBeenCalled();
    expect(await screen.findByText(/Accepted 48 pcs Soda 300ml/)).toBeInTheDocument();
  });

  it("Flag sends { flag: true, note } via the accept endpoint", async () => {
    hook.data.movements = [mv({})];
    const promptSpy = vi
      .spyOn(window, "prompt")
      .mockReturnValue("Only 40 arrived");
    renderScreen();
    const user = userEvent.setup();

    const region = screen.getByRole("region", {
      name: /Incoming transfer · Soda 300ml/,
    });
    await user.click(
      within(region).getByRole("button", { name: "Flag Variance" }),
    );

    await waitFor(() =>
      expect(flagFn).toHaveBeenCalledWith("mv-1", "Only 40 arrived"),
    );
    promptSpy.mockRestore();
  });

  it("a flagged incoming transfer shows the muted awaiting-admin line, no actions", () => {
    // FIX-2: `flagged` now keys off the real flag-note prefix that
    // `flagTransfer` writes, not merely "note is non-empty" (every pending
    // dispatch carries a plain status note). Use a genuine flag note here.
    hook.data.movements = [mv({ note: "Discrepancy flagged: short by 8" })];
    renderScreen();
    const region = screen.getByRole("region", {
      name: /Incoming transfer · Soda 300ml/,
    });
    expect(
      within(region).getByText(/Flagged — awaiting admin review/),
    ).toBeInTheDocument();
    expect(
      within(region).queryByRole("button", { name: /Accept/ }),
    ).not.toBeInTheDocument();
  });

  // ── F7-7 guard: the SM hub timeline is byte-unchanged by the Canteen
  //    derived-sale branch added to movementsToTimeline (staff-stock-format).
  //    An SM location never carries a canteen sale, so every row here keeps
  //    the signed-quantity value + its movement-kind subtitle.
  it("F7-7 guard: SM timeline rows render the signed quantity + kind, not +KES", () => {
    hook.data.movements = [
      mv({
        id: "sm-issue",
        movementType: "issue",
        quantity: "-18.5000",
        occurredAt: "2026-08-28T10:00:00Z",
      }),
      mv({
        id: "sm-prod",
        productId: "prod-soda",
        movementType: "production",
        quantity: "+40.0000",
        occurredAt: "2026-08-28T09:00:00Z",
      }),
    ];
    const { container } = renderScreen();
    expect(screen.getByText("-18.5 pcs")).toBeInTheDocument();
    expect(screen.getByText("+40 pcs")).toBeInTheDocument();
    expect(screen.getByText(/Issued to Kitchen ·/)).toBeInTheDocument();
    expect(screen.getByText(/Batch production ·/)).toBeInTheDocument();
    // no revenue string leaks into the SM hub.
    expect(container.textContent).not.toMatch(/KES/);
  });
  // ── Session 16: real outstanding-delivery banner ────────────────────
  // The hub used to read an EMPTY `MOCK_PENDING_DELIVERIES` fixture
  // (a live TODO(mock)), so an Admin purchase gave the SM no staff-facing
  // way to receive it. Now it reads `useOutstandingDeliveries()`.

  it("no delivery banner when nothing is awaiting receipt", () => {
    renderScreen();
    expect(
      screen.queryByText(/Purchase delivery pending/),
    ).not.toBeInTheDocument();
    // …and the Receive tile carries its default sub-label, unbadged.
    expect(screen.getByText("Log a supplier delivery")).toBeInTheDocument();
  });

  it("an awaiting delivery pins a banner and badges the Receive tile", () => {
    outstanding.rows = [
      mv({
        id: "pay-1",
        movementType: "purchase_payment",
        quantity: "0.0000",
        purchaseSupplier: "Kimani Wholesale",
        purchaseOrderedQty: "20.0000",
      }),
    ];
    renderScreen();
    expect(
      screen.getByText(/Purchase delivery pending · Soda 300ml/),
    ).toBeInTheDocument();
    expect(screen.getByText(/20 pcs · Kimani Wholesale/)).toBeInTheDocument();
    expect(screen.getByText("1 delivery pending")).toBeInTheDocument();
    // Session 16: the delivery banner passes no `onFlag` (Flag Variance is
    // the two-phase TRANSFER path, ADR-39, which rejects a
    // purchase_payment). The kit Banner renders that button only when a
    // handler is wired — so it's absent here, while the incoming-transfer
    // <TransferBanner> above still shows it (that test passes `onFlag`).
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
  // receipt for the ordered qty — it routes to the Receive flow where the
  // SM confirms what actually turned up.
  it("'Review & receive' routes to the Receive flow (no one-tap receipt)", async () => {
    outstanding.rows = [
      mv({ id: "pay-1", purchaseSupplier: "A", purchaseOrderedQty: "20.0000" }),
    ];
    renderScreen();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /Review & receive/ }));
    expect(push).toHaveBeenCalledWith("/store-manager/flows/receive");
  });

  it("a failed deliveries read is non-fatal — hub still renders, no banner", () => {
    outstanding.error = "boom";
    outstanding.rows = [];
    renderScreen();
    expect(
      screen.queryByText(/Purchase delivery pending/),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Quick store operations")).toBeInTheDocument();
  });
});
