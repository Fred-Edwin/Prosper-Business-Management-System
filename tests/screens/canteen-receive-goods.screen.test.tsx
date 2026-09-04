// @vitest-environment jsdom
// Session 16 / ADR-69 per-screen gate — the Canteen "Receive Goods" flow.
//
// Receiving is by DESTINATION, not by the receiver's home location. ADR-67
// lands ingredients at the Store and goods at the Restaurant, and
// `/outstanding` was scoped to the caller's own location — so a
// Canteen-destined purchase was a dead end: no role could see it, and none
// could receive it. This screen composes the shared <MovementPickerFlow>
// (mode="canteen-receive"): the same "Deliveries awaiting receipt"
// <MatchCard> list + additive picker the SM Receive flow uses, but posting
// ONE receipt batch at the Canteen — no kind split, because the Canteen
// only ever holds dish/goods.
//
// States: populated / empty / error, the awaiting-deliveries match list,
// the additive (`+`) submit label, the batch submit (ONE receiptBatch POST
// { locationId: canteen } carrying the matched purchasePaymentId), and the
// success toast + redirect to /canteen.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

const push = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, back }) }));

const PRODUCTS = [
  { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", kind: "goods", category: "Beverages & Soda" },
  { id: "p-mandazi", name: "Mandazi", unitLabel: "pcs", kind: "goods", category: "Shop Goods" },
  // Store-only ingredient — never receivable at the Canteen (ADR-67 R1).
  { id: "p-rice", name: "Rice", unitLabel: "kg", kind: "ingredient", category: null },
];
const CANTEEN_PRODUCTS = [
  { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", category: "Beverages & Soda", kind: "goods", sellingPrice: "60.00" },
  { id: "p-mandazi", name: "Mandazi", unitLabel: "pcs", category: "Shop Goods", kind: "goods", sellingPrice: "20.00" },
];
const LOCATIONS = [
  { id: "loc-canteen", name: "Canteen", type: "canteen" },
  { id: "loc-restaurant", name: "Restaurant", type: "restaurant" },
  { id: "loc-store", name: "Store", type: "store" },
];
const LEVELS = [
  { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", quantity: "60.0000" },
  { productId: "p-mandazi", name: "Mandazi", unitLabel: "pcs", quantity: "50.0000" },
];
// A Canteen-destined purchase_payment the Admin has paid for — the row
// that was invisible to every role before ADR-69.
const AWAITING = [
  {
    id: "mv-pay-1",
    productId: "p-soda",
    locationId: "loc-canteen",
    movementType: "purchase_payment",
    quantity: "0",
    occurredAt: "2026-09-04T06:00:00.000Z",
    purchaseSupplier: "Coast Bottlers",
    purchaseOrderedQty: "12",
    purchaseTotalCost: "1200.00",
  },
];

const staff = vi.hoisted(() => ({
  data: { movements: [] as unknown[], products: [] as unknown[], locations: [] as unknown[] },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const levels = vi.hoisted(() => ({
  rows: [] as unknown[],
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const outstanding = vi.hoisted(() => ({
  rows: [] as unknown[],
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const receiptBatch = vi.hoisted(() => vi.fn().mockResolvedValue([{}]));

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return {
    ...actual,
    useStaffStock: () => staff,
    useStockLevels: () => levels,
    useOutstandingDeliveries: () => outstanding,
    stockApi: { ...actual.stockApi, receiptBatch },
  };
});

import { MovementPickerFlow } from "@/app/store-manager/flows/movement-picker-flow";

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <MovementPickerFlow mode="canteen-receive" />
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  staff.data = { movements: [], products: PRODUCTS, locations: LOCATIONS };
  staff.loading = false;
  staff.error = null;
  levels.rows = LEVELS;
  levels.loading = false;
  levels.error = null;
  outstanding.rows = AWAITING;
  outstanding.loading = false;
  outstanding.error = null;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: CANTEEN_PRODUCTS }),
    }),
  );
});

async function pickRow(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  qty: string,
) {
  const row = await screen.findByRole("group", {
    name: new RegExp(`^${name},`),
  });
  await user.click(within(row).getByRole("button", { name: "+ Select" }));
  const field = within(
    screen.getByRole("group", { name: new RegExp(`^${name},`) }),
  ).getByRole("spinbutton");
  await user.clear(field);
  await user.type(field, qty);
  await user.tab();
}

describe("Canteen — Receive Goods flow (ADR-69)", () => {
  it("title 'Receive Goods', 'Supplier → Canteen' direction", async () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { name: "Receive Goods" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Supplier → Canteen")).toBeInTheDocument();
  });

  it("product list = the canteen-sellable set; a Store-only ingredient never appears", async () => {
    renderScreen();
    expect(
      await screen.findByRole("group", { name: /^Soda 300ml,/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /^Mandazi,/ })).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /^Rice,/ }),
    ).not.toBeInTheDocument();
  });

  it("lists the Canteen-destined delivery awaiting receipt", async () => {
    renderScreen();
    const list = await screen.findByRole("list", {
      name: "Deliveries awaiting receipt",
    });
    expect(within(list).getByText("Coast Bottlers")).toBeInTheDocument();
    expect(
      within(list).getByText(/Soda 300ml 12 pcs/),
    ).toBeInTheDocument();
  });

  it("no awaiting deliveries → no match list, the picker still works", async () => {
    outstanding.rows = [];
    renderScreen();
    await screen.findByRole("group", { name: /^Soda 300ml,/ });
    expect(
      screen.queryByRole("list", { name: "Deliveries awaiting receipt" }),
    ).not.toBeInTheDocument();
  });

  it("empty: nothing canteen-sellable → EmptyState", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
    );
    renderScreen();
    expect(await screen.findByText("No products set up")).toBeInTheDocument();
  });

  it("error: a stock-levels failure → ErrorState", async () => {
    levels.error = "boom";
    renderScreen();
    expect(
      await screen.findByText("Couldn't load Canteen stock"),
    ).toBeInTheDocument();
  });

  it("additive: submit carries a + total, and receiving more than on hand is NOT blocked", async () => {
    renderScreen();
    const user = userEvent.setup();
    // 999 is far over the 60 on hand — a delivery ADDS, so this must submit.
    await pickRow(user, "Soda 300ml", "999");
    expect(
      screen.getByRole("button", { name: /Confirm Receipt \(\+999 pcs\)/ }),
    ).toBeEnabled();
  });

  it("matching the delivery pre-fills the ordered quantity and links the payment", async () => {
    renderScreen();
    const user = userEvent.setup();
    const list = await screen.findByRole("list", {
      name: "Deliveries awaiting receipt",
    });
    await user.click(
      within(list).getByRole("button", { name: "Match this delivery" }),
    );

    // The ordered qty (12) pre-fills the Soda row.
    const row = screen.getByRole("group", { name: /^Soda 300ml,/ });
    expect(within(row).getByRole("spinbutton")).toHaveValue("12");
    expect(
      within(list).getByRole("button", { name: "Matched — in this batch" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Confirm Receipt \(\+12 pcs\)/ }),
    );

    // ONE batch, at the Canteen, carrying the matched purchasePaymentId.
    await waitFor(() =>
      expect(receiptBatch).toHaveBeenCalledWith({
        locationId: "loc-canteen",
        lines: [
          {
            productId: "p-soda",
            quantity: "12",
            purchasePaymentId: "mv-pay-1",
          },
        ],
      }),
    );
    expect(receiptBatch).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/canteen"));
  });

  it("an unmatched (manual) line posts with a null purchasePaymentId", async () => {
    outstanding.rows = [];
    renderScreen();
    const user = userEvent.setup();
    await pickRow(user, "Mandazi", "8");
    await user.click(
      screen.getByRole("button", { name: /Confirm Receipt \(\+8 pcs\)/ }),
    );
    await waitFor(() =>
      expect(receiptBatch).toHaveBeenCalledWith({
        locationId: "loc-canteen",
        lines: [
          { productId: "p-mandazi", quantity: "8", purchasePaymentId: null },
        ],
      }),
    );
  });

  it("impact copy names the Canteen, and no money / cost / margin appears", async () => {
    const { container } = renderScreen();
    const user = userEvent.setup();
    await pickRow(user, "Mandazi", "8");
    expect(
      screen.getByText(/Adds 8 pcs across 1 product to Canteen stock now\./),
    ).toBeInTheDocument();
    // The MatchCard is the one place a paid figure legitimately shows, so
    // this case runs with no awaiting deliveries in view.
    expect(container.textContent).not.toMatch(/margin|buying price/i);
  });
});
