// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { OrderView } from "@/lib/domain/sales";
import { AdminOrdersClient } from "@/app/admin/orders/admin-orders-client";

const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  usePathname: () => "/admin/orders",
}));

const mockCorrectOrder = vi.fn();
const mockRefresh = vi.fn();

let mockOrdersState: {
  orders: OrderView[];
  loading: boolean;
  error: string | null;
} = {
  orders: [],
  loading: false,
  error: null,
};

vi.mock("@/app/cashier/use-orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/cashier/use-orders")>();
  return {
    ...actual,
    useOrders: () => ({
      orders: mockOrdersState.orders,
      loading: mockOrdersState.loading,
      error: mockOrdersState.error,
      refresh: mockRefresh,
      correctOrder: mockCorrectOrder,
    }),
  };
});

const NOW_ISO = new Date().toISOString();

const SAMPLE_ORDER: OrderView = {
  id: "order-1",
  number: 1041,
  locationId: "loc-rest",
  cashierId: "cashier-uuid-123456",
  cashierName: "Grace Cashier",
  orderType: "dine_in",
  deliveryFee: null,
  paymentMethod: "cash",
  customerId: null,
  total: "210.00",
  correctsOrderId: null,
  correctedAt: null,
  correctedByName: null,
  occurredAt: NOW_ISO,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
  lines: [
    { id: "l1", productId: "p-chapati", productName: "Chapati", quantity: "3.0000", unitPrice: "20.00", subtotal: "60.00" },
    { id: "l2", productId: "p-samosa", productName: "Samosa", quantity: "4.0000", unitPrice: "30.00", subtotal: "120.00" },
  ],
};

const CORRECTION_ORDER: OrderView = {
  id: "order-2",
  number: 1042,
  locationId: "loc-rest",
  cashierId: "admin-uuid-123456",
  cashierName: "Edwin Admin",
  orderType: "dine_in",
  deliveryFee: null,
  paymentMethod: "cash",
  customerId: null,
  total: "190.00",
  correctsOrderId: "order-1",
  correctedAt: "2026-08-31T10:00:00.000Z",
  correctedByName: "Edwin Admin",
  occurredAt: NOW_ISO,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
  lines: [
    { id: "l3", productId: "p-chapati", productName: "Chapati", quantity: "2.0000", unitPrice: "20.00", subtotal: "40.00" },
    { id: "l4", productId: "p-samosa", productName: "Samosa", quantity: "4.0000", unitPrice: "30.00", subtotal: "120.00" },
  ],
};

describe("A3 Admin Orders Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrdersState = {
      orders: [SAMPLE_ORDER],
      loading: false,
      error: null,
    };
  });

  it("renders populated orders table with time, cashier, type, total, payment, status", () => {
    render(
      <ToastProvider>
        <AdminOrdersClient />
      </ToastProvider>,
    );

    expect(screen.getByRole("heading", { name: "Orders", level: 1 })).toBeDefined();
    expect(screen.getByText("Grace Cashier")).toBeDefined();
    expect(screen.getByText("Dine-in")).toBeDefined();
    expect(screen.getByText("KES 210.00")).toBeDefined();
    expect(screen.getByText("Posted")).toBeDefined();
  });

  it("renders empty state when there are no orders", () => {
    mockOrdersState = { orders: [], loading: false, error: null };
    render(
      <ToastProvider>
        <AdminOrdersClient />
      </ToastProvider>,
    );

    expect(screen.getByText(/No orders/)).toBeDefined();
  });

  it("renders error state on error", () => {
    mockOrdersState = { orders: [], loading: false, error: "Network error" };
    render(
      <ToastProvider>
        <AdminOrdersClient />
      </ToastProvider>,
    );

    expect(screen.getByText("Couldn't load orders")).toBeDefined();
  });

  it("opens order detail drawer on row click, then switches to correction form", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AdminOrdersClient />
      </ToastProvider>,
    );

    const row = screen.getByText("KES 210.00");
    await user.click(row);

    expect(screen.getByText("Order #1041")).toBeDefined();
    expect(screen.getByRole("button", { name: "Record correction" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Record correction" }));

    expect(screen.getAllByText("Record correction").length).toBeGreaterThan(0);
    expect(screen.getByText(/Replaces order #1041/)).toBeDefined();
    expect(screen.getByLabelText(/Reason/)).toBeDefined();
  });

  it("records a correction when reason is provided", async () => {
    const user = userEvent.setup();
    mockCorrectOrder.mockResolvedValueOnce({
      ...CORRECTION_ORDER,
      number: 1042,
    });

    render(
      <ToastProvider>
        <AdminOrdersClient />
      </ToastProvider>,
    );

    await user.click(screen.getByText("KES 210.00"));
    await user.click(screen.getByRole("button", { name: "Record correction" }));

    const reasonInput = screen.getByLabelText(/Reason/);
    await user.type(reasonInput, "Customer returned 1 chapati unopened");

    const submitBtns = screen.getAllByRole("button", { name: "Record correction" });
    await user.click(submitBtns[submitBtns.length - 1]);

    expect(mockCorrectOrder).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({
        orderType: "dine_in",
        paymentMethod: "cash",
      }),
    );
  });

  it("F7-5: correcting a CREDIT order labels the money delta as a debt change, not the payment channel", async () => {
    const user = userEvent.setup();
    const CREDIT_ORDER: OrderView = {
      ...SAMPLE_ORDER,
      id: "order-credit",
      number: 1050,
      paymentMethod: "credit",
      customerId: "cust-9",
      total: "180.00",
      lines: [
        { id: "lc", productId: "p-chapati", productName: "Chapati", quantity: "9.0000", unitPrice: "20.00", subtotal: "180.00" },
      ],
    };
    mockOrdersState = { orders: [CREDIT_ORDER], loading: false, error: null };
    render(
      <ToastProvider>
        <AdminOrdersClient />
      </ToastProvider>,
    );
    await user.click(screen.getByText("KES 180.00"));
    await user.click(screen.getByRole("button", { name: "Record correction" }));

    // Drop the qty 9 → 4 (−100).
    const dec = screen.getAllByRole("button", { name: /decrement|decrease|−|-/i })[0];
    for (let i = 0; i < 5; i++) await user.click(dec);

    const banner = screen.getByText(/This replaces order #1050/);
    expect(banner.textContent).toMatch(/debt/i);
    expect(banner.textContent).not.toMatch(/Credit: −KES/);
    expect(banner.textContent).toContain("−KES 100.00");
  });

  it("F7-6: the correction drawer subtitle shows the cashier's name, not a UUID fragment", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AdminOrdersClient />
      </ToastProvider>,
    );
    await user.click(screen.getByText("KES 210.00"));
    await user.click(screen.getByRole("button", { name: "Record correction" }));
    expect(screen.getByText(/Replaces order #1041 · Grace Cashier/)).toBeDefined();
    expect(screen.queryByText(/123456/)).toBeNull();
  });

  it("contains no delete affordances (§3.3) and no cost/profit/margin columns (§3.6)", () => {
    render(
      <ToastProvider>
        <AdminOrdersClient />
      </ToastProvider>,
    );

    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByText(/profit/i)).toBeNull();
    expect(screen.queryByText(/margin/i)).toBeNull();
    expect(screen.queryByText(/buying price/i)).toBeNull();
  });
});
