// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import { CreditSaleClient } from "@/app/canteen/flows/credit-sale/credit-sale-client";

// ADR-91 — the attendant picks a product, a quantity, and an existing
// customer; the sale posts immediately (stock leaves now, a Debt is
// created). Mirrors the K1 stock-count screen test's mocking shape.

const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  usePathname: () => "/canteen/flows/credit-sale",
}));

const mockRecordCreditSale = vi.fn();
const mockVoidCreditSale = vi.fn();

vi.mock("@/app/canteen/use-credit-sale", () => ({
  useCreditSaleActions: () => ({
    recordCreditSale: mockRecordCreditSale,
    voidCreditSale: mockVoidCreditSale,
  }),
  CreditSaleRequestError: class CreditSaleRequestError extends Error {},
}));

vi.mock("@/app/canteen/use-canteen-products", () => ({
  useCanteenProducts: () => ({
    products: [
      { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", category: "Drinks", sellingPrice: "60.00" },
      { id: "p-mandazi", name: "Mandazi", unitLabel: "pcs", category: "Bakery", sellingPrice: "20.00" },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock("@/app/store-manager/use-staff-stock", () => ({
  useStaffStock: () => ({
    data: {
      locations: [{ id: "loc-canteen", type: "canteen" }],
      movements: [],
      products: [],
    },
  }),
  useStockLevels: () => ({
    rows: [
      { productId: "p-soda", quantity: "48.0000" },
      { productId: "p-mandazi", quantity: "12.0000" },
    ],
    loading: false,
  }),
}));

const mockCreateCustomer = vi.fn();
vi.mock("@/app/admin/customers/use-customers", () => ({
  useCustomers: () => ({
    customers: [
      { id: "c-jane", name: "Jane Doe", phone: "0700111222", balance: "0.00", archivedAt: null, lastActivityAt: null, oldestDebtAt: null },
    ],
    loading: false,
    createCustomer: mockCreateCustomer,
  }),
}));

describe("Canteen Credit Sale Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the product picker and disables confirm until product + customer are chosen", async () => {
    render(
      <ToastProvider>
        <CreditSaleClient />
      </ToastProvider>,
    );

    expect(screen.getByRole("heading", { name: "Credit Sale" })).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText("Soda 300ml")).toBeDefined();
      expect(screen.getByText("Mandazi")).toBeDefined();
    });

    const confirmBtn = screen.getByRole("button", { name: /Record credit sale/i });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it("selecting a product and attaching a customer enables confirm, and submits productId/customerId/quantity", async () => {
    const user = userEvent.setup();
    mockRecordCreditSale.mockResolvedValueOnce({
      stockMovement: { id: "sm-1", productId: "p-soda", locationId: "loc-canteen", quantity: "2.0000", occurredAt: new Date().toISOString() },
      debt: { id: "d-1", customerId: "c-jane", amount: "120.00", occurredAt: new Date().toISOString() },
      productName: "Soda 300ml",
      unitPrice: "60.00",
      total: "120.00",
    });

    render(
      <ToastProvider>
        <CreditSaleClient />
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);

    // Bump quantity from 1 to 2.
    await user.click(screen.getByRole("button", { name: "Increase" }));

    await user.click(screen.getByRole("button", { name: "Attach a customer" }));
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dialog).getByText("Jane Doe")).toBeDefined());
    await user.click(within(dialog).getByText("Jane Doe"));

    const confirmBtn = await screen.findByRole("button", { name: /Record credit sale/i });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(false);

    await user.click(confirmBtn);

    expect(mockRecordCreditSale).toHaveBeenCalledWith({
      productId: "p-soda",
      customerId: "c-jane",
      quantity: "2",
    });
  });

  it("a quantity above available stock blocks confirm", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <CreditSaleClient />
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByText("Mandazi")).toBeDefined());
    await user.click(screen.getAllByRole("button", { name: "Select" })[1]); // Mandazi, 12 available

    const input = screen.getByRole("spinbutton", { name: /Mandazi quantity/i });
    await user.clear(input);
    await user.type(input, "999");
    await user.tab();

    expect(screen.getByText(/Only 12 pcs in stock/i)).toBeDefined();
  });
});
