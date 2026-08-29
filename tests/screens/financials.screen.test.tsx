// @vitest-environment jsdom
// Session 11 per-screen gate — /admin/financials rebuilt as a kit composition.
// Drives the tabs, the SimpleTable EmptyState, the reconciliation MatchCard
// list, and the rail Drawer + toast-on-record, with stockApi mocked.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

const api = vi.hoisted(() => ({
  listMovements: vi.fn(),
  outstanding: vi.fn(),
  listProducts: vi.fn(),
  listLocations: vi.fn(),
  recordPurchasePayment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/app/admin/stock/use-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/stock/use-stock")
  >("@/app/admin/stock/use-stock");
  return { ...actual, stockApi: api };
});

import { FinancialsClient } from "@/app/admin/financials/financials-client";

function renderScreen() {
  return render(
    <ToastProvider placement="top-right">
      <FinancialsClient />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.listMovements.mockResolvedValue([]);
  api.outstanding.mockResolvedValue({ awaitingReceipt: [], unmatchedReceipts: [] });
  api.listProducts.mockResolvedValue([]);
  api.listLocations.mockResolvedValue([]);
});

describe("/admin/financials — kit composition", () => {
  it("keeps the KPI strip rendered but unwired (— / M3)", async () => {
    renderScreen();
    await waitFor(() => expect(api.outstanding).toHaveBeenCalled());
    expect(screen.getByText("Total Business Liquidity")).toBeInTheDocument();
    expect(screen.getAllByText("M3").length).toBe(4);
  });

  it("renders the purchases table with an <EmptyState> and a Record-Payment action", async () => {
    renderScreen();
    const table = await screen.findByRole("table");
    expect(
      within(table).getByText("No purchase payments recorded"),
    ).toBeInTheDocument();
    expect(
      within(table).getByRole("button", { name: "Record Payment" }),
    ).toBeInTheDocument();
  });

  it("switches to the Deliveries tab", async () => {
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("tab", { name: /Deliveries/ }));
    const table = screen.getByRole("table");
    expect(within(table).getByText("No deliveries recorded")).toBeInTheDocument();
  });

  it("renders reconciliation items as a MatchCard list", async () => {
    api.outstanding.mockResolvedValue({
      awaitingReceipt: [
        {
          id: "pp1",
          productId: "prod-1",
          locationId: "loc-1",
          movementType: "purchase_payment",
          quantity: "0",
          recordedById: "u1",
          occurredAt: "2026-08-24T09:00:00Z",
          reason: null,
          reasonNote: null,
          orderId: null,
          stockCountId: null,
          transferCounterpartLocationId: null,
          purchasePaymentId: null,
          purchaseSupplier: null,
          purchaseOrderedQty: null,
          purchaseTotalCost: null,
          purchasePaidFrom: null,
          correctsMovementId: null,
          note: "supplier: Nairobi Grains Millers; cost: 18,000.00; mpesa_bank",
          createdAt: "2026-08-24T09:00:00Z",
          updatedAt: "2026-08-24T09:00:00Z",
        },
      ],
      unmatchedReceipts: [],
    });
    renderScreen();
    const list = await screen.findByRole("list", { name: "Reconciliation items" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(within(items[0]).getByText("Nairobi Grains Millers")).toBeInTheDocument();
  });

  it("opens the rail Drawer and fires a toast after recording a payment", async () => {
    api.listProducts.mockResolvedValue([
      {
        id: "prod-1",
        name: "Rice Basmati",
        kind: "ingredient",
        unitLabel: "kg",
        buyingPrice: "180.00",
        deletedAt: null,
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
        locations: [],
      },
    ]);
    api.listLocations.mockResolvedValue([
      {
        id: "loc-1",
        name: "Store",
        type: "store",
        active: true,
        createdAt: new Date("2026-08-01"),
        updatedAt: new Date("2026-08-01"),
      },
    ]);
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");

    await user.click(screen.getAllByRole("button", { name: "Record Payment" })[0]);
    const dialog = await screen.findByRole("dialog");

    await user.type(within(dialog).getByLabelText(/Supplier/), "Nairobi Grains Millers");
    await user.click(within(dialog).getByRole("combobox", { name: /Product/ }));
    await user.click(await screen.findByRole("option", { name: /Rice Basmati/ }));
    await user.click(within(dialog).getByRole("combobox", { name: /Destination/ }));
    await user.click(await screen.findByRole("option", { name: "Store" }));
    await user.type(within(dialog).getByLabelText(/Quantity/), "100");
    await user.type(within(dialog).getByLabelText(/Total Cost/), "18000.00");
    await user.click(
      within(dialog).getByRole("button", { name: /Disburse/ }),
    );

    expect(api.recordPurchasePayment).toHaveBeenCalledOnce();
    expect(await screen.findByText("Payment recorded")).toBeInTheDocument();
  });
});
