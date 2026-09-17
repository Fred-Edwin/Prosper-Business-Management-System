// @vitest-environment jsdom
//
// M2 3a — the merged Admin "Sales" screen (app/admin/sales). Folds in the old
// admin-orders.screen.test.tsx + canteen-derived-sales.screen.test.tsx and
// adds: tab switch + deep-link, the working Payment/Cashier filters (F7-8),
// and the full correction form (F7-4).

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { OrderView, DerivedSaleView } from "@/lib/domain/sales";
import { SalesClient } from "@/app/admin/sales/sales-client";

// ── next/navigation ─────────────────────────────────────────────────
const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace, back: vi.fn() }),
  usePathname: () => "/admin/sales",
}));

// ── use-orders (A3 / Restaurant Orders tab) ─────────────────────────
const mockCorrectOrder = vi.fn();
const mockOrdersRefresh = vi.fn();
let mockOrdersState: {
  orders: OrderView[];
  loading: boolean;
  error: string | null;
} = { orders: [], loading: false, error: null };
// The page now calls `useOrders` twice — once range-only for the KPI strip,
// once per-tab with the tab's own filters (cashierId / paymentMethod /
// orderType). Tests that assert on the TAB's query find it as the call
// carrying one of those tab-only keys; every other call is the KPI read.
let ordersFilterCalls: Record<string, unknown>[] = [];
function lastTabOrdersFilter(): Record<string, unknown> {
  const tabCalls = ordersFilterCalls.filter(
    (f) => "cashierId" in f || "paymentMethod" in f || "orderType" in f,
  );
  return tabCalls.at(-1) ?? {};
}

vi.mock("@/app/cashier/use-orders", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/app/cashier/use-orders")>();
  return {
    ...actual,
    useOrders: (filter: Record<string, unknown>) => {
      ordersFilterCalls.push(filter);
      return {
        orders: mockOrdersState.orders,
        loading: mockOrdersState.loading,
        error: mockOrdersState.error,
        refresh: mockOrdersRefresh,
        correctOrder: mockCorrectOrder,
      };
    },
  };
});

// ── use-stock-count (A4 / Canteen Derived tab) ─────────────────────
const mockDerivedRefresh = vi.fn();
let mockDerivedState: {
  rows: DerivedSaleView[];
  loading: boolean;
  error: string | null;
} = { rows: [], loading: false, error: null };

vi.mock("@/app/canteen/use-stock-count", () => ({
  useDerivedSales: () => ({
    rows: mockDerivedState.rows,
    loading: mockDerivedState.loading,
    error: mockDerivedState.error,
    refresh: mockDerivedRefresh,
  }),
}));

// ── restaurant products + customers (correction form) ──────────────
vi.mock("@/app/cashier/use-restaurant-products", () => ({
  useRestaurantProducts: () => ({
    products: [
      {
        id: "p-soda",
        name: "Soda 300ml",
        unitLabel: "pcs",
        category: "Drinks",
        sellingPrice: "60.00",
        stockAvailable: "40.0000",
      },
      {
        id: "p-chapati",
        name: "Chapati",
        unitLabel: "pcs",
        category: "Mains",
        sellingPrice: "20.00",
        stockAvailable: "100.0000",
      },
    ],
    restaurantLocationId: "loc-rest",
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock("@/app/admin/customers/use-customers", () => ({
  useCustomers: () => ({
    customers: [
      { id: "cust-1", name: "Grace Wanjiru", phone: "0712000000", balance: "0.00", lastActivityAt: null },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
    createCustomer: vi.fn(),
    recordRepayment: vi.fn(),
  }),
}));

// ── fixtures ──────────────────────────────────────────────────────
const NOW_ISO = new Date().toISOString();

const CASH_ORDER: OrderView = {
  id: "order-1",
  number: 1041,
  locationId: "loc-rest",
  cashierId: "cashier-uuid-mary",
  cashierName: "Mary Njeri",
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
    { id: "l2", productId: "p-samosa", productName: "Samosa", quantity: "5.0000", unitPrice: "30.00", subtotal: "150.00" },
  ],
};

const MPESA_ORDER: OrderView = {
  ...CASH_ORDER,
  id: "order-2",
  number: 1042,
  cashierId: "cashier-uuid-john",
  cashierName: "John Otieno",
  paymentMethod: "mpesa",
  total: "1240.00",
  lines: [
    { id: "l3", productId: "p-chapati", productName: "Chapati", quantity: "62.0000", unitPrice: "20.00", subtotal: "1240.00" },
  ],
};

const CREDIT_ORDER: OrderView = {
  ...CASH_ORDER,
  id: "order-credit",
  number: 1050,
  paymentMethod: "credit",
  customerId: "cust-1",
  total: "180.00",
  lines: [
    { id: "lc", productId: "p-chapati", productName: "Chapati", quantity: "9.0000", unitPrice: "20.00", subtotal: "180.00" },
  ],
};

const DERIVED_SALE: DerivedSaleView = {
  productId: "p-soda",
  productName: "Soda 300ml",
  lastCountedAt: "2026-08-28T17:00:00.000Z",
  periodStart: "2026-08-25T08:00:00.000Z",
  periodEnd: "2026-08-28T17:00:00.000Z",
  unitsSold: "96.0000",
  revenue: "5760.00",
  stockCountId: "count-1",
};

function renderSales(initialTab: "orders" | "derived" = "orders") {
  return render(
    <ToastProvider>
      <SalesClient initialTab={initialTab} />
    </ToastProvider>,
  );
}

// jsdom has no viewport, so the responsive `hidden md:block` / `md:hidden`
// split renders BOTH the desktop <table> and the mobile card <ul>. Scope
// row assertions to one layout. The desktop table carries role="table".
const desktop = () => within(screen.getByRole("table"));

beforeEach(() => {
  vi.clearAllMocks();
  mockOrdersState = { orders: [CASH_ORDER, MPESA_ORDER], loading: false, error: null };
  mockDerivedState = { rows: [DERIVED_SALE], loading: false, error: null };
  ordersFilterCalls = [];
});

// ── Shell / tabs ─────────────────────────────────────────────────

describe("A3+A4 merged Sales — shell & tabs", () => {
  it("renders the Sales heading and both tabs", () => {
    renderSales();
    expect(screen.getByRole("heading", { name: "Sales", level: 1 })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Restaurant Orders" })).toBeDefined();
    expect(screen.getByRole("tab", { name: "Canteen Derived" })).toBeDefined();
  });

  it("deep-links the Canteen Derived tab when initialTab='derived'", () => {
    renderSales("derived");
    expect(
      screen.getByRole("tab", { name: "Canteen Derived" }).getAttribute("aria-selected"),
    ).toBe("true");
    // The Canteen Derived table (not the orders table) is shown.
    expect(screen.getAllByText("Soda 300ml").length).toBeGreaterThan(0);
    expect(screen.getByText("Period covered")).toBeDefined();
    expect(screen.queryByText("Mary Njeri")).toBeNull();
  });

  it("switches tabs and syncs the URL", async () => {
    const user = userEvent.setup();
    renderSales("orders");
    // Orders tab visible first.
    expect(desktop().getByText("Mary Njeri")).toBeDefined();

    await user.click(screen.getByRole("tab", { name: "Canteen Derived" }));
    expect(replace).toHaveBeenCalledWith("/admin/sales?tab=derived");
    expect((await screen.findAllByText("Soda 300ml")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("tab", { name: "Restaurant Orders" }));
    expect(replace).toHaveBeenLastCalledWith("/admin/sales");
  });
});

// ── Restaurant Orders tab ───────────────────────────────────────

describe("Restaurant Orders tab", () => {
  it("renders the orders table (Time · Cashier · Type · Total · Payment · Status)", () => {
    renderSales();
    expect(desktop().getByText("Mary Njeri")).toBeDefined();
    expect(desktop().getByText("KES 210.00")).toBeDefined();
    expect(desktop().getAllByText("Posted").length).toBeGreaterThan(0);
  });

  it("empty state at the default range (Today) points at the page-level range control", () => {
    mockOrdersState = { orders: [], loading: false, error: null };
    renderSales();
    // Date is now a page-level range control (header), not a tab-local
    // filter — the empty state points the Admin at widening it there
    // instead of offering its own action.
    expect(screen.getByText("No orders in this range")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Show all dates" })).toBeNull();
  });

  it("filtered-empty state with a Reset action when a filter matches nothing", async () => {
    const user = userEvent.setup();
    mockOrdersState = { orders: [], loading: false, error: null };
    renderSales();
    // turn on "Corrected only" (kit kind:"toggle") → a filter is active → filtered-empty
    await user.click(screen.getByRole("switch", { name: "Corrected only" }));
    expect(screen.getByText("No orders match")).toBeDefined();
    expect(screen.getByRole("button", { name: "Reset filters" })).toBeDefined();
  });

  it("error state on fetch failure", () => {
    mockOrdersState = { orders: [], loading: false, error: "Network down" };
    renderSales();
    expect(screen.getByText("Couldn't load orders")).toBeDefined();
  });

  it("page-level range control: switching to 'This week' re-queries both tabs with the wider range", async () => {
    const user = userEvent.setup();
    renderSales();

    await waitFor(() => {
      const f = lastTabOrdersFilter();
      // Today's default range is a single day: from === to.
      expect(f.from).toBe(f.to);
    });
    const todayFrom = lastTabOrdersFilter().from as string;

    await user.click(screen.getAllByRole("radio", { name: "This week" })[0]);
    await waitFor(() => {
      const f = lastTabOrdersFilter();
      // The week range starts before (or on, if today is Monday) today and
      // is no longer a single day — a strictly wider window than before.
      expect((f.from as string) <= todayFrom).toBe(true);
      expect(f.from).not.toBe(f.to);
    });
  });

  it("loading state shows skeleton rows", () => {
    mockOrdersState = { orders: [], loading: true, error: null };
    const { container } = renderSales();
    expect(container.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0);
  });

  it("F7-8: the Payment filter re-queries with the chosen method", async () => {
    const user = userEvent.setup();
    renderSales();
    // kit FilterToolbar names the select's combobox with the control label.
    await user.click(screen.getByRole("combobox", { name: "Payment" }));
    await user.click(screen.getByRole("option", { name: "Payment: M-Pesa" }));
    await waitFor(() => expect(lastTabOrdersFilter().paymentMethod).toBe("mpesa"));
  });

  it("F7-8: the Cashier filter lists cashiers seen in the loaded orders and re-queries", async () => {
    const user = userEvent.setup();
    renderSales();
    await user.click(screen.getByRole("combobox", { name: "Cashier" }));
    // Derived from the loaded orders (Mary Njeri + John Otieno).
    expect(screen.getByRole("option", { name: "Cashier: John Otieno" })).toBeDefined();
    await user.click(screen.getByRole("option", { name: "Cashier: Mary Njeri" }));
    await waitFor(() =>
      expect(lastTabOrdersFilter().cashierId).toBe("cashier-uuid-mary"),
    );
  });

  it("opens the read-only detail drawer, then the correction form", async () => {
    const user = userEvent.setup();
    renderSales();
    await user.click(desktop().getByText("KES 210.00"));
    expect(screen.getByText("Order #1041")).toBeDefined();
    await user.click(screen.getByRole("button", { name: "Record correction" }));
    expect(screen.getByText(/Replaces order #1041/)).toBeDefined();
    expect(screen.getByLabelText(/Reason/)).toBeDefined();
  });

  it("no delete affordance (§3.3) and no cost/profit/margin (§3.6)", () => {
    renderSales();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByText(/profit/i)).toBeNull();
    expect(screen.queryByText(/margin/i)).toBeNull();
    expect(screen.queryByText(/buying price/i)).toBeNull();
  });
});

// ── F7-4: full correction form ────────────────────────────────────

describe("F7-4: correction form restates the whole order", () => {
  async function openCorrection(user: ReturnType<typeof userEvent.setup>, order = CASH_ORDER) {
    mockOrdersState = { orders: [order], loading: false, error: null };
    renderSales();
    await user.click(desktop().getByText(`KES ${Number(order.total).toFixed(2)}`));
    await user.click(screen.getByRole("button", { name: "Record correction" }));
  }

  it("exposes order-type + payment-method segmented controls and a Reason field", async () => {
    const user = userEvent.setup();
    await openCorrection(user);
    expect(screen.getByRole("radiogroup", { name: "Order type" })).toBeDefined();
    expect(screen.getByRole("radiogroup", { name: "Payment method" })).toBeDefined();
    expect(screen.getByLabelText(/Reason/)).toBeDefined();
  });

  it("changing payment CASH → CREDIT with no customer disables submit", async () => {
    const user = userEvent.setup();
    await openCorrection(user);
    await user.type(screen.getByLabelText(/Reason/), "Was actually on credit");
    await user.click(within(screen.getByRole("radiogroup", { name: "Payment method" })).getByRole("radio", { name: "Credit" }));
    expect(
      screen.getByText(/Attach a customer to record a credit correction/),
    ).toBeDefined();
    const submit = screen.getAllByRole("button", { name: "Record correction" }).at(-1)!;
    expect(submit).toHaveProperty("disabled", true);
  });

  it("correcting a CREDIT order's payment to CASH saves, and the banner labels the debt delta 'Customer debt' (never 'Credit: −KES')", async () => {
    const user = userEvent.setup();
    mockCorrectOrder.mockResolvedValueOnce({ ...CREDIT_ORDER, id: "order-corr", number: 1051 });
    await openCorrection(user, CREDIT_ORDER);

    // Drop the Chapati qty 9 → 4 so there is a money delta on the credit order.
    const stepper = screen.getByRole("spinbutton");
    const dec = screen.getByRole("button", { name: /decrement|decrease|minus|−/i });
    for (let i = 0; i < 5; i++) await user.click(dec);

    const banner = screen.getByText(/This replaces order #1050/);
    expect(banner.textContent).toMatch(/Customer debt/i);
    expect(banner.textContent).not.toMatch(/Credit: −KES/);

    // Flip Credit → Cash.
    await user.click(
      within(screen.getByRole("radiogroup", { name: "Payment method" })).getByRole("radio", {
        name: "Cash",
      }),
    );
    await user.type(screen.getByLabelText(/Reason/), "Paid cash after all");

    const submit = screen.getAllByRole("button", { name: "Record correction" }).at(-1)!;
    await user.click(submit);
    expect(mockCorrectOrder).toHaveBeenCalledWith(
      "order-credit",
      expect.objectContaining({ paymentMethod: "cash" }),
    );
  });

  it("add-a-product row adds a line to the correction", async () => {
    const user = userEvent.setup();
    await openCorrection(user);
    // The original has Chapati + Samosa; Soda 300ml is addable.
    const addGroup = within(screen.getByRole("group", { name: "Add a product" }));
    await user.click(addGroup.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: /Soda 300ml/ }));
    // Now a Soda line exists in the corrected list (its remove button appears).
    expect(screen.getByRole("button", { name: "Remove Soda 300ml" })).toBeDefined();
  });

  it("no margin/cost string anywhere in the correction drawer", async () => {
    const user = userEvent.setup();
    await openCorrection(user);
    expect(screen.queryByText(/margin/i)).toBeNull();
    expect(screen.queryByText(/buying price/i)).toBeNull();
    expect(screen.queryByText(/\bcost\b/i)).toBeNull();
  });
});

// ── Canteen Derived tab ─────────────────────────────────────────

describe("Canteen Derived tab", () => {
  it("renders Product · Last counted · Period covered · Units sold · Revenue", () => {
    renderSales("derived");
    // desktop <table> + mobile card list both render in jsdom — scope to the table.
    const table = within(screen.getByRole("table"));
    expect(table.getByText("Soda 300ml")).toBeDefined();
    expect(table.getByText("96")).toBeDefined();
    expect(table.getByText("KES 5,760.00")).toBeDefined();
  });

  it("empty state when there are no counts", () => {
    mockDerivedState = { rows: [], loading: false, error: null };
    renderSales("derived");
    expect(screen.getByText("No stock counts yet")).toBeDefined();
  });

  it("error state on fetch failure", () => {
    mockDerivedState = { rows: [], loading: false, error: "boom" };
    renderSales("derived");
    expect(screen.getByText("Couldn't load derived sales")).toBeDefined();
  });

  it("loading state shows skeleton rows", () => {
    mockDerivedState = { rows: [], loading: true, error: null };
    const { container } = renderSales("derived");
    expect(container.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0);
  });

  it("Product filter re-queries and offers a Reset", async () => {
    const user = userEvent.setup();
    renderSales("derived");
    await user.click(screen.getByRole("combobox", { name: "Product" }));
    await user.click(screen.getByRole("option", { name: "Product: Soda 300ml" }));
    expect(await screen.findByRole("button", { name: "Reset" })).toBeDefined();
  });

  // FIX-1 FIX B — the Admin Sales product list carries NO product-kind cut:
  // whatever has derived sales shows, ingredient-kind rows included. (The
  // owner's "partial set" report couldn't be reproduced in the Sales files;
  // this pins the no-filter behaviour so a regression can't sneak one in.)
  it("Product filter lists every derived-sale product with no kind restriction (goods + ingredient)", async () => {
    mockDerivedState = {
      rows: [
        DERIVED_SALE, // "Soda 300ml" — goods
        {
          ...DERIVED_SALE,
          productId: "p-cooking-oil",
          productName: "Cooking Oil 1L",
          stockCountId: "count-oil",
        },
      ],
      loading: false,
      error: null,
    };
    const user = userEvent.setup();
    renderSales("derived");
    await user.click(screen.getByRole("combobox", { name: "Product" }));
    expect(
      screen.getByRole("option", { name: "Product: Soda 300ml" }),
    ).toBeDefined();
    expect(
      screen.getByRole("option", { name: "Product: Cooking Oil 1L" }),
    ).toBeDefined();
  });
});

// ── KPI strip ────────────────────────────────────────────────────

describe("Sales KPI strip", () => {
  // desktop + mobile both render in jsdom (responsive `hidden md:flex` /
  // `md:hidden`) — the desktop strip has no table role to key off, so
  // scope by the visible caption row's sibling; simplest is to just take
  // the first match, since desktop renders first in the DOM.
  function firstTile(label: string) {
    return screen.getAllByText(label)[0];
  }

  it("defaults to the 'All' scope combining Restaurant + Canteen figures", () => {
    renderSales();
    // Restaurant: 210 + 1240 = 1450 ; Canteen: 5760 ; combined 7210.
    expect(firstTile("Total Sales Revenue")).toBeDefined();
    expect(screen.getAllByText("KES 7,210.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KES 1,450.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KES 5,760.00").length).toBeGreaterThan(0);
  });

  it("Restaurant scope shows Total Sales, Orders, and the Cash/M-Pesa/Credit split", async () => {
    const user = userEvent.setup();
    renderSales();
    await user.click(screen.getAllByRole("radio", { name: "Restaurant" })[0]);

    expect(firstTile("Total Sales")).toBeDefined();
    expect(screen.getAllByText("KES 1,450.00").length).toBeGreaterThan(0); // 210 + 1240
    expect(firstTile("Orders")).toBeDefined();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(firstTile("Cash")).toBeDefined();
    expect(screen.getAllByText("KES 210.00").length).toBeGreaterThan(0);
    expect(firstTile("M-Pesa")).toBeDefined();
    expect(screen.getAllByText("KES 1,240.00").length).toBeGreaterThan(0);
    expect(firstTile("Credit")).toBeDefined();
    expect(screen.getAllByText("KES 0.00").length).toBeGreaterThan(0);
  });

  it("Canteen scope shows Total Revenue, Units Sold, and Products Counted", async () => {
    const user = userEvent.setup();
    renderSales();
    await user.click(screen.getAllByRole("radio", { name: "Canteen" })[0]);

    expect(firstTile("Total Revenue")).toBeDefined();
    expect(screen.getAllByText("KES 5,760.00").length).toBeGreaterThan(0);
    expect(firstTile("Units Sold")).toBeDefined();
    expect(screen.getAllByText("96").length).toBeGreaterThan(0);
    expect(firstTile("Products Counted")).toBeDefined();
  });

  it("the KPI strip is independent of the active tab's own filters", async () => {
    const user = userEvent.setup();
    renderSales();
    await user.click(screen.getAllByRole("radio", { name: "Restaurant" })[0]);
    // Narrow the Orders tab to M-Pesa only — the KPI strip still sums both.
    await user.click(screen.getByRole("combobox", { name: "Payment" }));
    await user.click(screen.getByRole("option", { name: "Payment: M-Pesa" }));
    expect(screen.getAllByText("KES 1,450.00").length).toBeGreaterThan(0);
  });

  it("shows an error state when the KPI read fails, independent of table errors", () => {
    mockOrdersState = { orders: [], loading: false, error: "boom" };
    renderSales();
    expect(screen.getByText("Couldn't load the period figures")).toBeDefined();
  });
});
