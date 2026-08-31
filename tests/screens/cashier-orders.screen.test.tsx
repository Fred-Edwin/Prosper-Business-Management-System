// @vitest-environment jsdom
// M2 Session 6c per-screen gate — the Cashier order flow (C1–C5) composed
// from the proven kit. Drives each screen's structural states (populated /
// empty / error / loading) + the primary interaction + the §3 contracts:
//   • credit → Confirm disabled until a customer is attached (C3)
//   • §3.8 over-stock line → block + Confirm disabled (C2)
//   • C4 same-day → editable form; past-day → read-only + no edit
//   • no margin / cost / profit value anywhere in C1–C4
// Feature hooks are mocked. No server / DB. jsdom applies NO CSS, so a
// responsive `md:` split renders BOTH layouts — scope with `within(...)`
// or assert on `getAllByText(...).length` (see admin-customers worked
// example). These screens are single-column mobile, so most bare queries
// are safe; the exceptions are noted inline.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";
import type { OrderView } from "@/lib/domain/sales";
import type { CustomerListRow } from "@/lib/domain/customers";
import type { RestaurantProduct } from "@/app/cashier/use-restaurant-products";

const push = vi.fn();
const back = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  usePathname: () => "/cashier",
}));

// ---- fixtures -------------------------------------------------------------

const NOW_ISO = new Date().toISOString();
const YESTERDAY_ISO = new Date(Date.now() - 24 * 3600 * 1000).toISOString();

const ORDER_TODAY: OrderView = {
  id: "o-today",
  number: 1044,
  locationId: "loc-rest",
  cashierId: "me",
  cashierName: "Cashier Me",
  orderType: "dine_in",
  deliveryFee: null,
  paymentMethod: "cash",
  customerId: null,
  total: "230.00",
  correctsOrderId: null,
  correctedAt: null,
  correctedByName: null,
  occurredAt: NOW_ISO,
  createdAt: NOW_ISO,
  updatedAt: NOW_ISO,
  lines: [
    { id: "l1", productId: "p-chapati", productName: "Chapati", quantity: "2.0000", unitPrice: "40.00", subtotal: "80.00" },
    { id: "l2", productId: "p-samosa", productName: "Samosa", quantity: "3.0000", unitPrice: "50.00", subtotal: "150.00" },
  ],
};

const ORDER_YESTERDAY: OrderView = {
  ...ORDER_TODAY,
  id: "o-yest",
  number: 1030,
  total: "60.00",
  occurredAt: YESTERDAY_ISO,
  createdAt: YESTERDAY_ISO,
  updatedAt: YESTERDAY_ISO,
  lines: [
    { id: "l3", productId: "p-chapati", productName: "Chapati", quantity: "1.0000", unitPrice: "60.00", subtotal: "60.00" },
  ],
};

const PRODUCTS: RestaurantProduct[] = [
  { id: "p-chapati", name: "Chapati", unitLabel: "pc", category: "Mains", sellingPrice: "40.00", stockAvailable: "20.0000" },
  { id: "p-samosa", name: "Samosa", unitLabel: "pc", category: "Snacks", sellingPrice: "50.00", stockAvailable: "3.0000" },
  { id: "p-soda", name: "Soda 300ml", unitLabel: "bottle", category: null, sellingPrice: "60.00", stockAvailable: "12.0000" },
];

const CUSTOMERS: CustomerListRow[] = [
  { id: "cust-1", name: "Grace Wanjiru", phone: "0722000111", balance: "1200.00", lastActivityAt: NOW_ISO },
];

// ---- hook mocks --------------------------------------------------------

const ordersState = {
  orders: [ORDER_TODAY] as OrderView[],
  loading: false,
  error: null as string | null,
  createOrder: vi.fn().mockResolvedValue(ORDER_TODAY),
  editOwnOrder: vi.fn().mockResolvedValue(ORDER_TODAY),
  correctOrder: vi.fn().mockResolvedValue(ORDER_TODAY),
};

const orderState = {
  order: ORDER_TODAY as OrderView | null,
  correction: null as OrderView | null,
  loading: false,
  error: null as string | null,
  editOwnOrder: vi.fn().mockResolvedValue(ORDER_TODAY),
};

const productsState = {
  products: [...PRODUCTS] as RestaurantProduct[],
  restaurantLocationId: "loc-rest" as string | null,
  loading: false,
  error: null as string | null,
};

vi.mock("@/app/cashier/use-orders", async () => {
  const actual = await vi.importActual<typeof import("@/app/cashier/use-orders")>(
    "@/app/cashier/use-orders",
  );
  return {
    ...actual,
    useOrders: () => ({
      orders: ordersState.orders,
      loading: ordersState.loading,
      error: ordersState.error,
      refresh: vi.fn(),
      createOrder: ordersState.createOrder,
      editOwnOrder: ordersState.editOwnOrder,
      correctOrder: ordersState.correctOrder,
    }),
    useOrder: () => ({
      order: orderState.order,
      correction: orderState.correction,
      loading: orderState.loading,
      error: orderState.error,
      refresh: vi.fn(),
      editOwnOrder: orderState.editOwnOrder,
    }),
  };
});

vi.mock("@/app/cashier/use-restaurant-products", () => ({
  useRestaurantProducts: () => ({
    products: productsState.products,
    restaurantLocationId: productsState.restaurantLocationId,
    loading: productsState.loading,
    error: productsState.error,
    refresh: vi.fn(),
  }),
}));

const customersState = {
  customers: [...CUSTOMERS] as CustomerListRow[],
  loading: false,
  error: null as string | null,
  createCustomer: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/app/admin/customers/use-customers", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/admin/customers/use-customers")
  >("@/app/admin/customers/use-customers");
  return {
    ...actual,
    useCustomers: () => ({
      customers: customersState.customers,
      loading: customersState.loading,
      error: customersState.error,
      refresh: vi.fn(),
      createCustomer: customersState.createCustomer,
      recordRepayment: vi.fn(),
    }),
  };
});

import { CashierTodayClient } from "@/app/cashier/cashier-today-client";
import { NewOrderClient } from "@/app/cashier/orders/new/new-order-client";

function renderC1() {
  return render(
    <ToastProvider placement="bottom-center">
      <CashierTodayClient />
    </ToastProvider>,
  );
}

function renderC2() {
  return render(
    <ToastProvider placement="bottom-center">
      <NewOrderClient />
    </ToastProvider>,
  );
}

async function addToOrder(user: ReturnType<typeof userEvent.setup>, name: string) {
  // The tile is a button labelled by its product name text.
  const tile = screen.getByRole("button", { name: new RegExp(name) });
  await user.click(tile);
}

beforeEach(() => {
  ordersState.orders = [ORDER_TODAY];
  ordersState.loading = false;
  ordersState.error = null;
  orderState.order = ORDER_TODAY;
  orderState.correction = null;
  orderState.loading = false;
  orderState.error = null;
  productsState.products = [...PRODUCTS];
  productsState.restaurantLocationId = "loc-rest";
  productsState.loading = false;
  productsState.error = null;
  customersState.customers = [...CUSTOMERS];
  vi.clearAllMocks();
});

// ======================================================================
// C1 — Cashier Today
// ======================================================================

describe("C1 — Cashier Today", () => {
  it("renders today's own orders with type, payment and total; no cost/margin", () => {
    renderC1();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Day open")).toBeInTheDocument();
    expect(screen.getByText("Dine-in · 2 items")).toBeInTheDocument();
    // "KES 230" appears twice here — the row total AND the day running
    // total (one order today, so they're equal).
    expect(screen.getAllByText("KES 230").length).toBe(2);
    expect(screen.getByText(/1 order ·/)).toBeInTheDocument();
    // No margin / cost / profit language anywhere.
    expect(screen.queryByText(/margin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cost/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/profit/i)).not.toBeInTheDocument();
  });

  it("shows the CORRECTED chip on an order that a later row corrects", () => {
    ordersState.orders = [
      ORDER_TODAY,
      {
        ...ORDER_TODAY,
        id: "o-corr",
        number: 1045,
        correctsOrderId: "o-today",
        total: "200.00",
      },
    ];
    renderC1();
    expect(screen.getByText("Corrected")).toBeInTheDocument();
    expect(screen.getByText("Correction")).toBeInTheDocument();
  });

  it("empty state — no orders today", () => {
    ordersState.orders = [];
    renderC1();
    expect(screen.getByText("No orders yet today")).toBeInTheDocument();
    expect(screen.getByText(/0 orders/)).toBeInTheDocument();
  });

  it("loading — skeleton rows, no EmptyState", () => {
    ordersState.orders = [];
    ordersState.loading = true;
    const { container } = renderC1();
    expect(screen.queryByText("No orders yet today")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0);
  });

  it("error — ErrorState with retry", () => {
    ordersState.orders = [];
    ordersState.error = "Network down";
    renderC1();
    expect(screen.getByText("Couldn't load today's orders")).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
  });

  it("primary interaction — New order routes to the build screen", async () => {
    const user = userEvent.setup();
    renderC1();
    await user.click(screen.getByRole("button", { name: "New order" }));
    expect(push).toHaveBeenCalledWith("/cashier/orders/new");
  });

  it("tapping an order row routes to its detail", async () => {
    const user = userEvent.setup();
    renderC1();
    await user.click(screen.getByText("Dine-in · 2 items"));
    expect(push).toHaveBeenCalledWith("/cashier/orders/o-today");
  });
});

// ======================================================================
// C2 — New Order build (+ C3 checkout, C5 attach)
// ======================================================================

describe("C2 — New Order build", () => {
  it("renders the product grid with category tabs; no cost/margin", () => {
    renderC2();
    expect(screen.getByRole("heading", { name: "New order" })).toBeInTheDocument();
    // Category tabs from distinct Product.category (null → Uncategorised).
    expect(screen.getByRole("tab", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Mains" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Snacks" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Uncategorised" })).toBeInTheDocument();
    expect(screen.getByText("Chapati")).toBeInTheDocument();
    expect(screen.queryByText(/margin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/buying price/i)).not.toBeInTheDocument();
  });

  it("empty pinned panel + disabled Review until a product is tapped", async () => {
    const user = userEvent.setup();
    renderC2();
    expect(
      screen.getByText("Tap a product above to start the order."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review order" })).toBeDisabled();
    await addToOrder(user, "Chapati");
    expect(screen.getByRole("button", { name: "Review order" })).toBeEnabled();
    // A pinned line row appeared with its qty spinbutton.
    expect(
      screen.queryByText("Tap a product above to start the order."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue("1");
  });

  it("no sellable products — EmptyState, Review disabled", () => {
    productsState.products = [];
    renderC2();
    expect(screen.getByText("No products to sell")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review order" })).toBeDisabled();
  });

  it("loading — skeletons, no grid, no EmptyState", () => {
    productsState.products = [];
    productsState.loading = true;
    const { container } = renderC2();
    expect(screen.queryByText("No products to sell")).not.toBeInTheDocument();
    expect(container.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0);
  });

  it("error — ErrorState with retry", () => {
    productsState.products = [];
    productsState.error = "boom";
    renderC2();
    expect(screen.getByText("Couldn't load products")).toBeInTheDocument();
  });

  it("§3.8 — a line over Restaurant stock blocks Review with an inline error", async () => {
    const user = userEvent.setup();
    renderC2();
    // Samosa: stockAvailable 3. Tap 4 times → qty 4 > 3.
    await addToOrder(user, "Samosa");
    await addToOrder(user, "Samosa");
    await addToOrder(user, "Samosa");
    await addToOrder(user, "Samosa");
    expect(
      screen.getByText(/Only 3 pc in stock at the Restaurant/),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 line is over available stock/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review order" })).toBeDisabled();
  });
});

describe("C3 — Checkout sheet", () => {
  async function openCheckout(user: ReturnType<typeof userEvent.setup>) {
    renderC2();
    await addToOrder(user, "Chapati");
    await user.click(screen.getByRole("button", { name: "Review order" }));
    return screen.getByRole("dialog");
  }

  it("cash order — Confirm enabled, createOrder called with derived account omitted", async () => {
    const user = userEvent.setup();
    const sheet = await openCheckout(user);
    const confirm = within(sheet).getByRole("button", { name: "Confirm order" });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    await waitFor(() => expect(ordersState.createOrder).toHaveBeenCalled());
    const arg = ordersState.createOrder.mock.calls[0][0];
    expect(arg.paymentMethod).toBe("cash");
    expect(arg.orderType).toBe("dine_in");
    expect(arg).not.toHaveProperty("account");
    expect(arg.lines).toEqual([{ productId: "p-chapati", quantity: "1" }]);
  });

  it("credit — Confirm disabled until a customer is attached (plan §3.2)", async () => {
    const user = userEvent.setup();
    const sheet = await openCheckout(user);
    await user.click(within(sheet).getByRole("radio", { name: "Credit" }));
    expect(
      within(sheet).getByText("Credit order — attach a customer"),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole("button", { name: "Confirm order" }),
    ).toBeDisabled();
    expect(
      within(sheet).getByText("Attach a customer to confirm a credit order."),
    ).toBeInTheDocument();
  });

  it("delivery — fee field appears; folded into the total; leaves dine-in on switch-back", async () => {
    const user = userEvent.setup();
    const sheet = await openCheckout(user);
    await user.click(within(sheet).getByRole("radio", { name: "Delivery" }));
    const fee = within(sheet).getByLabelText("Delivery fee");
    await user.type(fee, "150");
    // Items 40 + fee 150 → 190.
    expect(within(sheet).getByText("KES 190")).toBeInTheDocument();
    await user.click(within(sheet).getByRole("radio", { name: "Dine-in" }));
    expect(
      within(sheet).queryByLabelText("Delivery fee"),
    ).not.toBeInTheDocument();
  });
});

describe("C5 — Customer attach (sheet over C3)", () => {
  it("credit → Choose customer → pick a row → Confirm enabled with customerId", async () => {
    const user = userEvent.setup();
    renderC2();
    await addToOrder(user, "Chapati");
    await user.click(screen.getByRole("button", { name: "Review order" }));
    const checkout = screen.getByRole("dialog");
    await user.click(within(checkout).getByRole("radio", { name: "Credit" }));
    await user.click(
      within(checkout).getByRole("button", { name: "Choose customer" }),
    );
    // The attach sheet is the second dialog.
    const dialogs = screen.getAllByRole("dialog");
    const attach = dialogs[dialogs.length - 1];
    await user.click(within(attach).getByText("Grace Wanjiru"));
    // Back on checkout: customer shown, Confirm enabled.
    await waitFor(() =>
      expect(screen.getByText(/owes KES 1,200/)).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Confirm order" }));
    await waitFor(() => expect(ordersState.createOrder).toHaveBeenCalled());
    expect(ordersState.createOrder.mock.calls[0][0].customerId).toBe("cust-1");
  });

  it("no match → quick-create form → Add customer & attach", async () => {
    const user = userEvent.setup();
    customersState.customers = [];
    customersState.createCustomer = vi.fn().mockResolvedValue({
      id: "cust-new",
      name: "Kevin Oketch",
      phone: "0733210984",
      createdAt: NOW_ISO,
      updatedAt: NOW_ISO,
    });
    renderC2();
    await addToOrder(user, "Chapati");
    await user.click(screen.getByRole("button", { name: "Review order" }));
    const checkout = screen.getByRole("dialog");
    await user.click(within(checkout).getByRole("radio", { name: "Credit" }));
    await user.click(
      within(checkout).getByRole("button", { name: "Choose customer" }),
    );
    const dialogs = screen.getAllByRole("dialog");
    const attach = dialogs[dialogs.length - 1];
    await user.type(
      within(attach).getByLabelText("Search customers"),
      "Kevin Oketch",
    );
    expect(
      within(attach).getByText(/No customer matches/),
    ).toBeInTheDocument();
    const phone = within(attach).getByLabelText("Phone");
    await user.type(phone, "0733210984");
    await user.click(
      within(attach).getByRole("button", { name: /Add customer & attach/ }),
    );
    await waitFor(() =>
      expect(customersState.createCustomer).toHaveBeenCalledWith({
        name: "Kevin Oketch",
        phone: "0733210984",
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/Kevin Oketch/)).toBeInTheDocument(),
    );
  });

  it("quick-create — invalid phone keeps the button disabled", async () => {
    const user = userEvent.setup();
    customersState.customers = [];
    renderC2();
    await addToOrder(user, "Chapati");
    await user.click(screen.getByRole("button", { name: "Review order" }));
    const checkout = screen.getByRole("dialog");
    await user.click(within(checkout).getByRole("radio", { name: "Credit" }));
    await user.click(
      within(checkout).getByRole("button", { name: "Choose customer" }),
    );
    const dialogs = screen.getAllByRole("dialog");
    const attach = dialogs[dialogs.length - 1];
    await user.type(within(attach).getByLabelText("Search customers"), "Kev");
    await user.type(within(attach).getByLabelText("Phone"), "123");
    expect(
      within(attach).getByText("Enter a valid phone number"),
    ).toBeInTheDocument();
    expect(
      within(attach).getByRole("button", { name: /Add customer & attach/ }),
    ).toBeDisabled();
  });
});

// ======================================================================
// C4 — Order detail / edit-vs-correct
// ======================================================================

import { OrderDetailClient } from "@/app/cashier/orders/[id]/order-detail-client";

const TODAY_BDATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Nairobi",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function renderC4(opts?: { userId?: string }) {
  return render(
    <ToastProvider placement="bottom-center">
      <OrderDetailClient
        orderId={orderState.order?.id ?? "o-today"}
        currentUserId={opts?.userId ?? "me"}
        todayBusinessDate={TODAY_BDATE}
      />
    </ToastProvider>,
  );
}

describe("C4 — Order detail", () => {
  it("same-day own order → editable form (steppers + Save changes)", () => {
    orderState.order = { ...ORDER_TODAY, cashierId: "me" };
    renderC4({ userId: "me" });
    expect(
      screen.getByText(/Day open — you can edit this order/),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton").length).toBe(ORDER_TODAY.lines.length);
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Correct this (Admin)" }),
    ).not.toBeInTheDocument();
  });

  it("editing a quantity and saving calls editOwnOrder with string quantities", async () => {
    const user = userEvent.setup();
    orderState.order = { ...ORDER_TODAY, cashierId: "me" };
    renderC4({ userId: "me" });
    const steppers = screen.getAllByRole("spinbutton");
    await user.click(screen.getAllByRole("button", { name: "Increase" })[0]);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(orderState.editOwnOrder).toHaveBeenCalled());
    const arg = orderState.editOwnOrder.mock.calls[0][0];
    expect(typeof arg.lines[0].quantity).toBe("string");
    expect(arg).not.toHaveProperty("account");
  });

  it("past-day order → read-only, no steppers, routes to the Admin correction path", async () => {
    const user = userEvent.setup();
    orderState.order = { ...ORDER_YESTERDAY, cashierId: "me" };
    renderC4({ userId: "me" });
    expect(
      screen.getByText(/This order is from a closed day/),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(
      screen.queryByRole("button", { name: "Save changes" }),
    ).not.toBeInTheDocument();
    const correctBtn = screen.getByRole("button", {
      name: "Correct this (Admin)",
    });
    await user.click(correctBtn);
    // It surfaces the number — no navigation to an edit form.
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByText(/order #1030/)).toBeInTheDocument();
  });

  it("another cashier's same-day order → still read-only", () => {
    orderState.order = { ...ORDER_TODAY, cashierId: "someone-else" };
    renderC4({ userId: "me" });
    expect(screen.queryAllByRole("spinbutton")).toHaveLength(0);
    expect(
      screen.getByRole("button", { name: "Correct this (Admin)" }),
    ).toBeInTheDocument();
  });

  it("corrected order → CORRECTED banner + link to the correction, no Correct button", async () => {
    const user = userEvent.setup();
    orderState.order = { ...ORDER_TODAY, cashierId: "me" };
    orderState.correction = {
      ...ORDER_TODAY,
      id: "o-corr",
      number: 1099,
      correctsOrderId: "o-today",
      correctedAt: "2026-08-31T12:00:00.000Z",
      correctedByName: "Edwin K.",
    };
    renderC4({ userId: "me" });
    expect(screen.getByText("Corrected")).toBeInTheDocument();
    // C4 banner now names the Admin + the correction date (QA S7 data-gap fix).
    expect(screen.getByText(/by Edwin K\./)).toBeInTheDocument();
    expect(
      screen.getByText(/View correction entry — order #1099/),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Correct this (Admin)" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByText(/View correction entry/));
    expect(push).toHaveBeenCalledWith("/cashier/orders/o-corr");
  });

  it("no margin / cost / profit anywhere in the detail view", () => {
    orderState.order = { ...ORDER_TODAY, cashierId: "me" };
    renderC4({ userId: "me" });
    expect(screen.queryByText(/margin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/profit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/buying price/i)).not.toBeInTheDocument();
  });

  it("F7-1: editing a credit order to Cash sends NO customerId (server rejects a cash order with one)", async () => {
    const user = userEvent.setup();
    orderState.order = {
      ...ORDER_TODAY,
      cashierId: "me",
      paymentMethod: "credit",
      customerId: "cust-7",
    };
    renderC4({ userId: "me" });
    await user.click(screen.getByRole("radio", { name: "Cash" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(orderState.editOwnOrder).toHaveBeenCalled());
    const arg = orderState.editOwnOrder.mock.calls[0][0];
    expect(arg.paymentMethod).toBe("cash");
    expect(arg).not.toHaveProperty("customerId");
  });

  it("F7-1: editing a credit order and keeping Credit still sends its customerId", async () => {
    const user = userEvent.setup();
    orderState.order = {
      ...ORDER_TODAY,
      cashierId: "me",
      paymentMethod: "credit",
      customerId: "cust-7",
    };
    renderC4({ userId: "me" });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(orderState.editOwnOrder).toHaveBeenCalled());
    const arg = orderState.editOwnOrder.mock.calls[0][0];
    expect(arg.paymentMethod).toBe("credit");
    expect(arg.customerId).toBe("cust-7");
  });

  it("F7-1: switching a cash order TO Credit disables Save with a caption (no attach UI in C4 edit)", async () => {
    const user = userEvent.setup();
    orderState.order = { ...ORDER_TODAY, cashierId: "me", paymentMethod: "cash", customerId: null };
    renderC4({ userId: "me" });
    await user.click(screen.getByRole("radio", { name: "Credit" }));
    expect(
      screen.getByText(/This order has no customer/),
    ).toBeInTheDocument();
    expect(
      (screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(orderState.editOwnOrder).not.toHaveBeenCalled();
  });

  it("loading — skeletons", () => {
    orderState.order = null;
    orderState.loading = true;
    const { container } = renderC4();
    expect(container.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0);
  });

  it("error — ErrorState", () => {
    orderState.order = null;
    orderState.error = "nope";
    renderC4();
    expect(screen.getByText("Couldn't load the order")).toBeInTheDocument();
  });

  it("not found — EmptyState", () => {
    orderState.order = null;
    renderC4();
    expect(screen.getByText("Order not found")).toBeInTheDocument();
  });
});
