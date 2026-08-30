// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { DerivedSaleView } from "@/lib/domain/sales";
import { DerivedSalesClient } from "@/app/admin/canteen/derived-sales/derived-sales-client";

const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  usePathname: () => "/admin/canteen/derived-sales",
}));

const mockRefresh = vi.fn();

let mockDerivedSalesState: {
  rows: DerivedSaleView[];
  loading: boolean;
  error: string | null;
} = {
  rows: [],
  loading: false,
  error: null,
};

vi.mock("@/app/canteen/use-stock-count", () => ({
  useDerivedSales: () => ({
    rows: mockDerivedSalesState.rows,
    loading: mockDerivedSalesState.loading,
    error: mockDerivedSalesState.error,
    refresh: mockRefresh,
  }),
}));

const SAMPLE_DERIVED_SALE: DerivedSaleView = {
  productId: "p-soda",
  productName: "Soda 300ml",
  lastCountedAt: "2026-08-28T17:00:00.000Z",
  periodStart: "2026-08-25T08:00:00.000Z",
  periodEnd: "2026-08-28T17:00:00.000Z",
  unitsSold: "96.0000",
  revenue: "5760.00",
};

describe("A4 Canteen Derived Sales Screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDerivedSalesState = {
      rows: [SAMPLE_DERIVED_SALE],
      loading: false,
      error: null,
    };
  });

  it("renders table with Product, Last counted, Period covered, Units sold, Revenue", () => {
    render(
      <ToastProvider>
        <DerivedSalesClient />
      </ToastProvider>,
    );

    expect(screen.getByRole("heading", { name: "Canteen Derived Sales", level: 1 })).toBeDefined();
    expect(screen.getByText("Soda 300ml")).toBeDefined();
    expect(screen.getByText("96")).toBeDefined();
    expect(screen.getByText("KES 5,760.00")).toBeDefined();
  });

  it("renders empty state when there are no counts", () => {
    mockDerivedSalesState = { rows: [], loading: false, error: null };
    render(
      <ToastProvider>
        <DerivedSalesClient />
      </ToastProvider>,
    );

    expect(screen.getByText("No stock counts yet")).toBeDefined();
  });

  it("renders error state when fetch fails", () => {
    mockDerivedSalesState = { rows: [], loading: false, error: "Network failed" };
    render(
      <ToastProvider>
        <DerivedSalesClient />
      </ToastProvider>,
    );

    expect(screen.getByText("Couldn't load derived sales")).toBeDefined();
  });

  it("renders filter buttons for Product and Date range (G5)", () => {
    render(
      <ToastProvider>
        <DerivedSalesClient />
      </ToastProvider>,
    );

    expect(screen.getByRole("button", { name: "Product" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Date range" })).toBeDefined();
  });
});
