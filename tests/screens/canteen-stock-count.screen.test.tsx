// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import { StockCountClient } from "@/app/canteen/stock-count/stock-count-client";

// K1 rebuild (client UX request, 2026-09-14): one screen, a list of rows
// each showing "Expected: N unit" up front, tap-to-expand in place (no
// navigation), one batch "Confirm N counts" submit. See
// `stock-count-client.tsx` top-of-file note for the full rationale.

const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  usePathname: () => "/canteen/stock-count",
}));

const mockRecordStockCountBatch = vi.fn();
const mockVoidStockCount = vi.fn();

vi.mock("@/app/canteen/use-stock-count", () => ({
  useStockCountActions: () => ({
    recordStockCount: vi.fn(),
    recordStockCountBatch: mockRecordStockCountBatch,
    voidStockCount: mockVoidStockCount,
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

function mockFetchImpl(url: string) {
  if (url.includes("/api/canteen/products")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        data: [
          { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", category: "Drinks" },
          { id: "p-mandazi", name: "Mandazi", unitLabel: "pcs", category: "Bakery" },
        ],
      }),
    });
  }
  if (url.includes("/api/stock-movements?")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        data: [],
      }),
    });
  }
  if (url.includes("/api/products")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({ data: MOCK_PRODUCTS }),
    });
  }
  if (url.includes("/api/locations")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        data: [{ id: "loc-canteen", name: "Canteen", type: "canteen", active: true }],
      }),
    });
  }
  if (url.includes("/api/stock-movements/balances")) {
    return Promise.resolve({
      ok: true,
      json: async () => ({
        data: [
          { productId: "p-soda", quantity: "48.0000" },
          { productId: "p-mandazi", quantity: "12.0000" },
        ],
      }),
    });
  }
  return Promise.reject(new Error(`Unknown route: ${url}`));
}

async function waitForExpectedStockLoaded() {
  await waitFor(() => {
    expect(
      screen.getByText((_, el) => el?.textContent === "Expected: 48 pcs"),
    ).toBeDefined();
  });
}

describe("K1 Canteen Stock Count Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(mockFetchImpl);
  });

  it("renders the picker with search, category tabs, and expected stock per row", async () => {
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

    await waitFor(() => {
      expect(
        screen.getByText((_, el) => el?.textContent === "Expected: 48 pcs"),
      ).toBeDefined();
      expect(
        screen.getByText((_, el) => el?.textContent === "Expected: 12 pcs"),
      ).toBeDefined();
    });
  });

  it("selecting a row expands it in place (no navigation) defaulted to the expected quantity", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );

    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await waitForExpectedStockLoaded();

    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);

    // Still on the same screen — search input stays mounted.
    expect(screen.getByPlaceholderText("Search canteen products")).toBeDefined();
    // Stepper defaults to the expected value.
    expect(screen.getByRole("spinbutton", { name: /Soda 300ml counted quantity/i })).toHaveProperty(
      "value",
      "48",
    );
  });

  it("multiple rows can be counted before one batch submit", async () => {
    const user = userEvent.setup();
    mockRecordStockCountBatch.mockResolvedValueOnce([
      { count: { id: "c1" }, derivedSale: {} },
      { count: { id: "c2" }, derivedSale: {} },
    ]);

    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await waitForExpectedStockLoaded();

    const selectButtons = screen.getAllByRole("button", { name: "Select" });
    await user.click(selectButtons[0]);
    await user.click(screen.getByRole("button", { name: "Select" })); // Mandazi remains

    expect(screen.getByRole("button", { name: "Confirm 2 counts" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Confirm 2 counts" }));

    expect(mockRecordStockCountBatch).toHaveBeenCalledWith([
      { productId: "p-soda", countedQuantity: "48" },
      { productId: "p-mandazi", countedQuantity: "12" },
    ]);
  });

  it("Remove closes a row without submitting it", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await waitForExpectedStockLoaded();

    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);
    expect(screen.getByRole("button", { name: "Remove" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Confirm counts" })).toBeDefined();
    expect((screen.getByRole("button", { name: "Confirm counts" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it("counting a row above its expected stock blocks the batch submit", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <StockCountClient />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByText("Soda 300ml")).toBeDefined());
    await waitForExpectedStockLoaded();

    await user.click(screen.getAllByRole("button", { name: "Select" })[0]);
    const input = screen.getByRole("spinbutton", { name: /Soda 300ml counted quantity/i });
    await user.clear(input);
    await user.type(input, "999");
    await user.tab();

    expect(screen.getByText(/exceeds expected stock|Only 48 pcs expected/i)).toBeDefined();
    const confirmBtn = screen.getByRole("button", { name: /Confirm \d+ count/ });
    expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
  });
});
