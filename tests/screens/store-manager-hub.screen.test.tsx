// @vitest-environment jsdom
// Session 12 per-screen gate — /store-manager hub composed from the kit.
// Drives the pinned <TransferBanner> Accept/Flag → toast + refresh, the
// <ActionTileGrid> navigation, the <ErrorState> branch, and the empty
// <ActivityTimeline>. useStaffStock + stockApi mocked; no server / DB.
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
    locations: [{ id: "loc-store", name: "Store", type: "store" }],
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

beforeEach(() => {
  vi.clearAllMocks();
  hook.loading = false;
  hook.error = null;
  hook.data.movements = [];
  hook.data.products = [
    { id: "prod-soda", name: "Soda 300ml", unitLabel: "pcs" },
  ];
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
});
