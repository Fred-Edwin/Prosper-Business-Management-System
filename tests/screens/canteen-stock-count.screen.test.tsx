// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import { StockCountClient } from "@/app/canteen/stock-count/stock-count-client";

const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  usePathname: () => "/canteen/stock-count",
}));

const mockRecordStockCount = vi.fn();
const mockVoidStockCount = vi.fn();

vi.mock("@/app/canteen/use-stock-count", () => ({
  useStockCountActions: () => ({
    recordStockCount: mockRecordStockCount,
    voidStockCount: mockVoidStockCount,
  }),
  useDerivedSales: () => ({
    rows: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
  StockCountRequestError: class StockCountRequestError extends Error {},
}));

const MOCK_PRODUCTS = [
  {
    id: "p-soda",
    name: "Soda 300ml",
    unitLabel: "pcs",
    category: "Drinks",
    locations: [
      {
        locationId: "loc-canteen",
        locationType: "canteen",
        sellingPrice: "60.00",
        active: true,
      },
    ],
  },
  {
    id: "p-mandazi",
    name: "Mandazi",
    unitLabel: "pcs",
    category: "Bakery",
    locations: [
      {
        locationId: "loc-canteen",
        locationType: "canteen",
        sellingPrice: "20.00",
        active: true,
      },
    ],
  },
];

describe("K1 Canteen Stock Count Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/products")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: MOCK_PRODUCTS }),
        });
      }
      return Promise.reject(new Error("Unknown route"));
    });
  });

  it("renders product picker with search and category tabs, products listed", async () => {
    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );

    expect(screen.getByRole("heading", { name: "Stock Count", level: 1 })).toBeDefined();
    expect(screen.getByPlaceholderText("Search canteen products")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Soda 300ml")).toBeDefined();
      expect(screen.getByText("Mandazi")).toBeDefined();
    });
  });

  it("transitions to counting screen on product select, allows quantity stepper adjustment, and submits count", async () => {
    const user = userEvent.setup();
    mockRecordStockCount.mockResolvedValueOnce({
      countId: "count-123",
      sold: "48",
      revenue: "2880.00",
    });

    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Soda 300ml")).toBeDefined();
    });

    const selectButtons = screen.getAllByRole("button", { name: "Select" });
    await user.click(selectButtons[0]);

    expect(screen.getByText("Counted remaining")).toBeDefined();
    expect(screen.getByText("Change")).toBeDefined();

    const confirmBtn = screen.getByRole("button", { name: "Confirm count" });
    await user.click(confirmBtn);

    expect(mockRecordStockCount).toHaveBeenCalledWith({
      productId: "p-soda",
      countedQuantity: "0",
    });
  });

  it("returns to picker screen when tapping Change", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Soda 300ml")).toBeDefined();
    });

    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);
    expect(screen.getByText("Counted remaining")).toBeDefined();

    await user.click(screen.getByText("Change"));
    expect(screen.getByPlaceholderText("Search canteen products")).toBeDefined();
  });
});
