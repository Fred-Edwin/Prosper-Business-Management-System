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

// `useStockCountPreview` is driven per-test via this ref so a test can
// assert what the K1 preview card renders for a given derived result.
const previewState = {
  current: {
    preview: null as unknown,
    loading: false,
    error: null as string | null,
  },
};

vi.mock("@/app/canteen/use-stock-count", () => ({
  useStockCountActions: () => ({
    recordStockCount: mockRecordStockCount,
    voidStockCount: mockVoidStockCount,
  }),
  useStockCountPreview: () => previewState.current,
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
    previewState.current = { preview: null, loading: false, error: null };
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/canteen/products") || url.includes("/api/products")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: "p-soda",
                name: "Soda 300ml",
                unitLabel: "pcs",
                category: "Drinks",
                locationId: "loc-canteen",
                sellingPrice: "60.00",
              },
              {
                id: "p-mandazi",
                name: "Mandazi",
                unitLabel: "pcs",
                category: "Bakery",
                locationId: "loc-canteen",
                sellingPrice: "20.00",
              },
            ],
          }),
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

  it("F7-2: the preview card shows the real derived units sold and revenue for the counted value", async () => {
    const user = userEvent.setup();
    previewState.current = {
      preview: {
        blocked: false,
        exceedsExpectedBy: null,
        isFirstCount: false,
        periodStart: "2026-08-22T05:00:00.000Z",
        lastCountedAt: "2026-08-22T05:00:00.000Z",
        daysSincePrevious: 3,
        countedRemaining: "96.0000",
        unitsSold: "112.0000",
        revenue: "6720.00",
        closingStockWillBe: "96.0000",
      },
      loading: false,
      error: null,
    };

    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);

    const card = screen.getByTestId("k1-preview");
    expect(card.textContent).toContain("sold 112 pcs");
    expect(card.textContent).toContain("KES 6,720.00");
    expect(card.textContent).toContain("Closing stock will be set to 96 pcs");
    expect(card.textContent).toContain("3 days");
    // Confirm is enabled for a valid (non-blocked) preview.
    expect(
      (screen.getByRole("button", { name: "Confirm count" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("F7-2: first-count copy variant", async () => {
    const user = userEvent.setup();
    previewState.current = {
      preview: {
        blocked: false,
        exceedsExpectedBy: null,
        isFirstCount: true,
        periodStart: null,
        lastCountedAt: null,
        daysSincePrevious: null,
        countedRemaining: "12.0000",
        unitsSold: "26.0000",
        revenue: "520.00",
        closingStockWillBe: "12.0000",
      },
      loading: false,
      error: null,
    };
    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);

    const card = screen.getByTestId("k1-preview");
    expect(card.textContent).toContain("First count for this product");
    expect(card.textContent).toContain("sold 26 pcs");
    expect(card.textContent).toContain("KES 520.00");
  });

  it("F7-2: a blocked preview (counted more than expected) disables Confirm and explains why", async () => {
    const user = userEvent.setup();
    previewState.current = {
      preview: {
        blocked: true,
        exceedsExpectedBy: "16.0000",
        isFirstCount: false,
        periodStart: "2026-08-22T05:00:00.000Z",
        lastCountedAt: "2026-08-22T05:00:00.000Z",
        daysSincePrevious: 3,
        countedRemaining: "112.0000",
        unitsSold: null,
        revenue: null,
        closingStockWillBe: "112.0000",
      },
      loading: false,
      error: null,
    };
    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);

    const card = screen.getByTestId("k1-preview");
    expect(card.textContent).toContain("Counted more than expected");
    expect(card.textContent).toContain("16 pcs more");
    expect(
      (screen.getByRole("button", { name: "Confirm count" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("F7-2: preview updates when the counted value changes (stepper +)", async () => {
    const user = userEvent.setup();

    function setPreviewFor(qty: number) {
      previewState.current = {
        preview: {
          blocked: false,
          exceedsExpectedBy: null,
          isFirstCount: true,
          periodStart: null,
          lastCountedAt: null,
          daysSincePrevious: null,
          countedRemaining: `${qty}.0000`,
          unitsSold: `${100 - qty}.0000`,
          revenue: `${(100 - qty) * 60}.00`,
          closingStockWillBe: `${qty}.0000`,
        },
        loading: false,
        error: null,
      };
    }

    setPreviewFor(0);
    const { rerender } = render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);
    expect(screen.getByTestId("k1-preview").textContent).toContain("sold 100 pcs");

    // Step the counted value up; the (mocked) preview hook now returns the
    // figure for the new count.
    setPreviewFor(3);
    await user.click(screen.getByRole("button", { name: /increment|increase|\+/i }));
    rerender(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );
    expect(screen.getByTestId("k1-preview").textContent).toContain("sold 97 pcs");
  });
});
