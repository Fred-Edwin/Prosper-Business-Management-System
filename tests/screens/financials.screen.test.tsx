// @vitest-environment jsdom
// Per-screen gate — /admin/financials. Session 16 (ADR-46): the reconciliation
// section is a table with the four-term status vocabulary + a "Record payment"
// action; the transactions table reads the real purchase_* fields. The KPI
// strip, tabs and transactions table are unchanged. stockApi mocked.
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

/** A full StockMovementView with overridable fields. */
function movement(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "m1",
    productId: "prod-1",
    locationId: "loc-1",
    movementType: "purchase_payment",
    quantity: "0.0000",
    recordedById: "u1",
    occurredAt: new Date().toISOString(),
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
    note: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...over,
  };
}

const PROD_1 = {
  id: "prod-1",
  name: "Rice Basmati",
  kind: "ingredient",
  unitLabel: "kg",
  buyingPrice: "180.00",
  deletedAt: null,
  createdAt: "2026-08-01T00:00:00Z",
  updatedAt: "2026-08-01T00:00:00Z",
  locations: [],
};
const DISH_1 = { ...PROD_1, id: "dish-1", name: "Pilau", kind: "dish", unitLabel: "plate" };
const LOC_1 = {
  id: "loc-1",
  name: "Store",
  type: "store",
  active: true,
  createdAt: new Date("2026-08-01"),
  updatedAt: new Date("2026-08-01"),
};

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

  it("transactions table reads the real purchase_* fields (supplier + amount)", async () => {
    api.listMovements.mockImplementation(({ movementType }: { movementType: string }) =>
      Promise.resolve(
        movementType === "purchase_payment"
          ? [
              movement({
                id: "pp1",
                purchaseSupplier: "Nairobi Grains Millers",
                purchaseOrderedQty: "100.0000",
                purchaseTotalCost: "18000.00",
                purchasePaidFrom: "mpesa_bank",
              }),
            ]
          : [],
      ),
    );
    api.listProducts.mockResolvedValue([PROD_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Nairobi Grains Millers")).toBeInTheDocument();
    expect(within(table).getByText("18,000.00")).toBeInTheDocument();
    expect(within(table).getByText("M-Pesa / Bank Till")).toBeInTheDocument();
  });

  it("a null-supplier payment renders 'Supplier not recorded' / 'Cost not recorded', never a bare dash", async () => {
    api.listMovements.mockImplementation(({ movementType }: { movementType: string }) =>
      Promise.resolve(
        movementType === "purchase_payment" ? [movement({ id: "pp-null" })] : [],
      ),
    );
    api.listProducts.mockResolvedValue([PROD_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Supplier not recorded")).toBeInTheDocument();
    expect(within(table).getByText("Cost not recorded")).toBeInTheDocument();
  });

  it("reconciliation renders a TABLE with the four-term vocabulary, not MatchCards", async () => {
    const now = new Date().toISOString();
    api.listMovements.mockImplementation(({ movementType }: { movementType: string }) =>
      Promise.resolve(
        movementType === "purchase_payment"
          ? [
              movement({
                id: "pay-awaiting",
                occurredAt: now,
                purchaseSupplier: "Nairobi Grains Millers",
                purchaseOrderedQty: "100.0000",
                purchaseTotalCost: "18000.00",
              }),
              movement({
                id: "pay-delivered",
                occurredAt: now,
                purchaseSupplier: "Farmer's Choice Butchery",
                purchaseOrderedQty: "50.0000",
                purchaseTotalCost: "29000.00",
              }),
            ]
          : [
              movement({
                id: "rcpt-unmatched",
                movementType: "purchase_receipt",
                occurredAt: now,
                quantity: "46.0000",
                purchasePaymentId: null,
              }),
            ],
      ),
    );
    api.outstanding.mockResolvedValue({
      awaitingReceipt: [
        movement({
          id: "pay-awaiting",
          occurredAt: now,
          purchaseSupplier: "Nairobi Grains Millers",
          purchaseOrderedQty: "100.0000",
          purchaseTotalCost: "18000.00",
        }),
      ],
      unmatchedReceipts: [
        movement({
          id: "rcpt-unmatched",
          movementType: "purchase_receipt",
          occurredAt: now,
          quantity: "46.0000",
          purchasePaymentId: null,
        }),
      ],
    });
    api.listProducts.mockResolvedValue([PROD_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();

    await screen.findByRole("table");
    // No MatchCard list any more.
    expect(
      screen.queryByRole("list", { name: "Reconciliation items" }),
    ).not.toBeInTheDocument();
    // The three status terms are present.
    expect(await screen.findByText("Awaiting delivery")).toBeInTheDocument();
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText("Received, no payment")).toBeInTheDocument();
  });

  it("shows the all-clear line when nothing is outstanding", async () => {
    renderScreen();
    await screen.findByRole("table");
    expect(
      await screen.findByText(/Nothing to reconcile\./),
    ).toBeInTheDocument();
  });

  it("'Record payment' on a delivery with no payment opens the drawer pre-selected", async () => {
    const now = new Date().toISOString();
    api.outstanding.mockResolvedValue({
      awaitingReceipt: [],
      unmatchedReceipts: [
        movement({
          id: "rcpt-unmatched",
          movementType: "purchase_receipt",
          occurredAt: now,
          productId: "prod-1",
          quantity: "46.0000",
          purchasePaymentId: null,
        }),
      ],
    });
    api.listProducts.mockResolvedValue([PROD_1, DISH_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog");
    // Pre-selected to the delivered product.
    expect(
      within(dialog).getByRole("combobox", { name: /Product/ }),
    ).toHaveTextContent(/Rice Basmati/);
  });

  it("the payment-drawer product picker excludes Dishes", async () => {
    api.listProducts.mockResolvedValue([PROD_1, DISH_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
    renderScreen();
    const user = userEvent.setup();
    await screen.findByRole("table");

    await user.click(screen.getAllByRole("button", { name: "Record Payment" })[0]);
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: /Product/ }));
    expect(await screen.findByRole("option", { name: /Rice Basmati/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Pilau/ })).not.toBeInTheDocument();
    expect(
      within(dialog).getByText(/Ingredients & Goods only/),
    ).toBeInTheDocument();
  });

  it("opens the rail Drawer and fires a toast after recording a payment", async () => {
    api.listProducts.mockResolvedValue([PROD_1]);
    api.listLocations.mockResolvedValue([LOC_1]);
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
    await user.click(within(dialog).getByRole("button", { name: /Disburse/ }));

    expect(api.recordPurchasePayment).toHaveBeenCalledOnce();
    expect(await screen.findByText("Payment recorded")).toBeInTheDocument();
  });
});
