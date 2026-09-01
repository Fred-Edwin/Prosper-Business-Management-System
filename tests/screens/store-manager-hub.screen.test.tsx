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
    hook.data.movements = [mv({ note: "short by 8" })];
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
});
