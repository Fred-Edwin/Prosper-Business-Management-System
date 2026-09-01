// @vitest-environment jsdom
// M2-3c per-screen gate — the Store Manager stock-movement flows after the
// ADR-44 body reversal (Option A): FlowScaffold chrome + <SearchInput> +
// category <Tabs> + <SelectableProductRow> list + <CalculatedImpactBanner>
// (danger-tinted when blocked) + one batch submit. useStaffStock /
// useStockLevels / useOutstandingDeliveries + stockApi mocked; no server.
//
// Per flow: populated / empty / loading / error + the blocked state + the
// primary interaction (select 2 rows, set quantities, the impact banner
// sums the batch, submit fires ONE batch POST). Asserted throughout: a
// blocked row disables submit; no money / cost / margin string anywhere;
// SelectableProductRow renders with the right `available`.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

const push = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back, push }),
}));

// ── Mock data ────────────────────────────────────────────────────────
const PRODUCTS = [
  { id: "p-beef", name: "Beef Fillet", unitLabel: "kg", kind: "ingredient", category: null },
  { id: "p-rice", name: "Rice Basmati", unitLabel: "kg", kind: "ingredient", category: null },
  { id: "p-oil", name: "Cooking Oil", unitLabel: "L", kind: "ingredient", category: null },
  { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", kind: "goods", category: "Beverages & Soda" },
  { id: "p-water", name: "Mineral Water 500ml", unitLabel: "pcs", kind: "goods", category: "Beverages & Soda" },
  { id: "p-chicken", name: "Grilled Chicken", unitLabel: "pcs", kind: "dish", category: null },
  { id: "p-stew", name: "Beef Stew", unitLabel: "pcs", kind: "dish", category: null },
];
const LOCATIONS = [
  { id: "loc-store", name: "Store", type: "store" },
  { id: "loc-rest", name: "Restaurant", type: "restaurant" },
  { id: "loc-canteen", name: "Canteen", type: "canteen" },
];
// Derived balances the rows read for `available`.
const LEVELS = [
  { productId: "p-beef", name: "Beef Fillet", unitLabel: "kg", quantity: "46.5000" },
  { productId: "p-rice", name: "Rice Basmati", unitLabel: "kg", quantity: "120.0000" },
  { productId: "p-oil", name: "Cooking Oil", unitLabel: "L", quantity: "22.0000" },
  { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", quantity: "144.0000" },
  { productId: "p-water", name: "Mineral Water 500ml", unitLabel: "pcs", quantity: "96.0000" },
  { productId: "p-chicken", name: "Grilled Chicken", unitLabel: "pcs", quantity: "6.0000" },
  { productId: "p-stew", name: "Beef Stew", unitLabel: "pcs", quantity: "3.0000" },
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
const api = vi.hoisted(() => ({
  receiptBatch: vi.fn().mockResolvedValue([{}, {}]),
  issueBatch: vi.fn().mockResolvedValue([{}, {}]),
  productionBatch: vi.fn().mockResolvedValue([{}, {}]),
  transferBatch: vi.fn().mockResolvedValue([{}, {}]),
  nonSaleBatch: vi.fn().mockResolvedValue([{}, {}]),
}));

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return {
    ...actual,
    useStaffStock: () => staff,
    useStockLevels: () => levels,
    useOutstandingDeliveries: () => outstanding,
    stockApi: { ...actual.stockApi, ...api },
  };
});

// The shared picker calls useCanteenProducts() (GET /api/canteen/products)
// for its dispatch mode only; SM modes ignore the result. Stub fetch so the
// hook resolves cleanly in jsdom.
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
);

import { MovementPickerFlow } from "@/app/store-manager/flows/movement-picker-flow";

function renderFlow(node: React.ReactNode) {
  return render(<ToastProvider placement="bottom-center">{node}</ToastProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  staff.data = { movements: [], products: PRODUCTS, locations: LOCATIONS };
  staff.loading = false;
  staff.error = null;
  levels.rows = LEVELS;
  levels.loading = false;
  levels.error = null;
  outstanding.rows = [];
  outstanding.loading = false;
  outstanding.error = null;
});

/** Select a product row by name and set its stepper value. */
async function pickRow(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  qty: string,
) {
  const row = screen.getByRole("group", { name: new RegExp(`^${name},`) });
  await user.click(within(row).getByRole("button", { name: "+ Select" }));
  const field = within(
    screen.getByRole("group", { name: new RegExp(`^${name},`) }),
  ).getByRole("spinbutton");
  await user.clear(field);
  await user.type(field, qty);
  await user.tab();
}

// ── Cross-cutting: no money on any flow ──────────────────────────────
describe("SM movement flows — no money / cost / margin anywhere", () => {
  it.each(["receive", "issue", "production", "transfer", "non-sale"] as const)(
    "%s screen renders no currency string",
    (mode) => {
      const { container } = renderFlow(<MovementPickerFlow mode={mode} />);
      expect(container.textContent).not.toMatch(/KES|margin|cost|buying price/i);
    },
  );
});

// ── Receive ─────────────────────────────────────────────────────────
describe("SM — Receive Goods", () => {
  it("populated: 2 rows → impact banner sums → one receiptBatch POST", async () => {
    renderFlow(<MovementPickerFlow mode="receive" />);
    const user = userEvent.setup();

    await pickRow(user, "Beef Fillet", "40");
    await pickRow(user, "Rice Basmati", "50");

    expect(
      screen.getByText(/Adds 90 kg across 2 products to Store stock now\./),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Confirm Receipt \(\+90 kg\)/ }),
    );
    await waitFor(() =>
      expect(api.receiptBatch).toHaveBeenCalledWith({
        locationId: "loc-store",
        lines: [
          { productId: "p-beef", quantity: "40", purchasePaymentId: null },
          { productId: "p-rice", quantity: "50", purchasePaymentId: null },
        ],
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/store-manager"));
  });

  it("row readout shows On hand: N from the derived balance", () => {
    renderFlow(<MovementPickerFlow mode="receive" />);
    expect(
      screen.getByRole("group", { name: /^Beef Fillet, On hand: 46\.5 kg/ }),
    ).toBeInTheDocument();
  });

  it("deliveries awaiting receipt: Match this delivery pre-fills a linked row", async () => {
    outstanding.rows = [
      {
        id: "pay-1",
        productId: "p-beef",
        purchaseSupplier: "Mwangi Supplies",
        purchaseOrderedQty: "40.0000",
        purchaseTotalCost: "18400.00",
      },
    ];
    renderFlow(<MovementPickerFlow mode="receive" />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Match this delivery" }));
    // Beef Fillet is now a selected row at 40.
    const row = screen.getByRole("group", { name: /^Beef Fillet,.*quantity 40 kg/ });
    expect(row).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Confirm Receipt \(\+40 kg\)/ }),
    );
    await waitFor(() =>
      expect(api.receiptBatch).toHaveBeenCalledWith({
        locationId: "loc-store",
        lines: [{ productId: "p-beef", quantity: "40", purchasePaymentId: "pay-1" }],
      }),
    );
  });

  it("empty: no products → EmptyState, submit disabled", () => {
    staff.data = { movements: [], products: [], locations: LOCATIONS };
    renderFlow(<MovementPickerFlow mode="receive" />);
    expect(screen.getByText("No products set up")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm Receipt" })).toBeDisabled();
  });

  it("loading: 3 skeleton rows, submit disabled", () => {
    staff.loading = true;
    const { container } = renderFlow(<MovementPickerFlow mode="receive" />);
    expect(container.querySelectorAll(".kit-skeleton")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Confirm Receipt" })).toBeDisabled();
  });

  it("error: ErrorState + Retry", () => {
    staff.error = "Network unreachable";
    renderFlow(<MovementPickerFlow mode="receive" />);
    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("Couldn't load Store stock")).toBeInTheDocument();
    expect(within(alert).getByText("Network unreachable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

// ── Issue ───────────────────────────────────────────────────────────
describe("SM — Issue Ingredients", () => {
  it("populated: 2 rows → sums → one issueBatch POST, back to hub", async () => {
    renderFlow(<MovementPickerFlow mode="issue" />);
    const user = userEvent.setup();

    await pickRow(user, "Beef Fillet", "18.5");
    await pickRow(user, "Rice Basmati", "35");

    expect(
      screen.getByText(
        /Removes 53\.5 kg across 2 ingredients from Store stock now, and adds it to Kitchen\./,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Confirm Kitchen Issue \(−53\.5 kg\)/ }),
    );
    await waitFor(() =>
      expect(api.issueBatch).toHaveBeenCalledWith({
        locationId: "loc-store",
        lines: [
          { productId: "p-beef", quantity: "18.5" },
          { productId: "p-rice", quantity: "35" },
        ],
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/store-manager"));
  });

  it("blocked: a row over available disables submit + danger banner", async () => {
    renderFlow(<MovementPickerFlow mode="issue" />);
    const user = userEvent.setup();

    await pickRow(user, "Beef Fillet", "18.5");
    await pickRow(user, "Rice Basmati", "200"); // avail 120

    expect(
      screen.getByText(/1 line is over available stock\. Fix it to continue\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirm Kitchen Issue" }),
    ).toBeDisabled();
    expect(api.issueBatch).not.toHaveBeenCalled();

    // Lower it → re-enabled, banner re-sums.
    const field = within(
      screen.getByRole("group", { name: /^Rice Basmati,/ }),
    ).getByRole("spinbutton");
    await user.clear(field);
    await user.type(field, "35");
    await user.tab();
    expect(
      screen.getByRole("button", { name: /Confirm Kitchen Issue \(−53\.5 kg\)/ }),
    ).toBeEnabled();
  });

  it("search filters the row list", async () => {
    renderFlow(<MovementPickerFlow mode="issue" />);
    const user = userEvent.setup();
    await user.type(screen.getByRole("searchbox"), "beef");
    expect(screen.getByRole("group", { name: /^Beef Fillet,/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /^Rice Basmati,/ })).not.toBeInTheDocument();
  });

  it("empty / loading / error states render", () => {
    staff.data = { movements: [], products: [], locations: LOCATIONS };
    const r1 = renderFlow(<MovementPickerFlow mode="issue" />);
    expect(screen.getByText("No ingredients at Store")).toBeInTheDocument();
    r1.unmount();

    staff.data = { movements: [], products: PRODUCTS, locations: LOCATIONS };
    staff.loading = true;
    const r2 = renderFlow(<MovementPickerFlow mode="issue" />);
    expect(r2.container.querySelectorAll(".kit-skeleton")).toHaveLength(3);
    r2.unmount();

    staff.loading = false;
    staff.error = "Couldn't load Store stock";
    renderFlow(<MovementPickerFlow mode="issue" />);
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

// ── Production ──────────────────────────────────────────────────────
describe("SM — Record Batch Production", () => {
  it("title is 'Record Batch Production' and rows are dishes only", () => {
    renderFlow(<MovementPickerFlow mode="production" />);
    expect(
      screen.getByRole("heading", { name: "Record Batch Production" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /^Grilled Chicken,/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /^Beef Fillet,/ })).not.toBeInTheDocument();
  });

  it("populated: 2 dishes → +total → one productionBatch POST to the Restaurant", async () => {
    renderFlow(<MovementPickerFlow mode="production" />);
    const user = userEvent.setup();

    await pickRow(user, "Grilled Chicken", "40");
    await pickRow(user, "Beef Stew", "24");

    expect(
      screen.getByText(/Adds 64 pcs across 2 dishes to Restaurant stock now\./),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Log Batch Production \(\+64 pcs\)/ }),
    );
    await waitFor(() =>
      expect(api.productionBatch).toHaveBeenCalledWith({
        locationId: "loc-rest",
        lines: [
          { productId: "p-chicken", quantity: "40" },
          { productId: "p-stew", quantity: "24" },
        ],
      }),
    );
  });

  it("empty: no dishes → EmptyState", () => {
    staff.data = {
      movements: [],
      products: PRODUCTS.filter((p) => p.kind !== "dish"),
      locations: LOCATIONS,
    };
    renderFlow(<MovementPickerFlow mode="production" />);
    expect(screen.getByText("No dishes set up")).toBeInTheDocument();
  });
});

// ── Transfer ────────────────────────────────────────────────────────
describe("SM — Transfer Stock", () => {
  // FIX-1 FIX A — the SM transfers sellable output to the Canteen: cooked
  // dishes + shop goods, never raw ingredients.
  it("product list includes goods + dishes and excludes raw ingredients", () => {
    renderFlow(<MovementPickerFlow mode="transfer" />);
    expect(
      screen.getByRole("group", { name: /^Soda 300ml,/ }),
    ).toBeInTheDocument(); // goods
    expect(
      screen.getByRole("group", { name: /^Grilled Chicken,/ }),
    ).toBeInTheDocument(); // dish
    expect(
      screen.queryByRole("group", { name: /^Beef Fillet,/ }),
    ).not.toBeInTheDocument(); // ingredient
    expect(
      screen.queryByRole("group", { name: /^Cooking Oil,/ }),
    ).not.toBeInTheDocument(); // ingredient
  });

  it("category tabs filter; destination Select feeds the batch + badge", async () => {
    renderFlow(<MovementPickerFlow mode="transfer" />);
    const user = userEvent.setup();

    // Category tab: Beverages & Soda leaves only the two soda/water rows.
    await user.click(screen.getByRole("tab", { name: "Beverages & Soda" }));
    expect(screen.getByRole("group", { name: /^Soda 300ml,/ })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: /^Cooking Oil,/ })).not.toBeInTheDocument();

    await pickRow(user, "Soda 300ml", "48");
    await pickRow(user, "Mineral Water 500ml", "24");
    await user.click(screen.getByRole("combobox", { name: /Destination/ }));
    await user.click(await screen.findByRole("option", { name: "Canteen" }));

    expect(
      screen.getByText(
        /Removes 72 pcs from Store now; lands at Canteen once they accept\./,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Dispatch Transfer to Canteen \(−72 pcs\)/,
      }),
    );
    await waitFor(() =>
      expect(api.transferBatch).toHaveBeenCalledWith({
        fromLocationId: "loc-store",
        toLocationId: "loc-canteen",
        lines: [
          { productId: "p-soda", quantity: "48" },
          { productId: "p-water", quantity: "24" },
        ],
      }),
    );
  });

  it("blocked over-stock disables submit", async () => {
    renderFlow(<MovementPickerFlow mode="transfer" />);
    const user = userEvent.setup();
    await pickRow(user, "Soda 300ml", "9999");
    expect(
      screen.getByText(/1 line is over available stock\. Fix it to continue\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Dispatch Transfer/ }),
    ).toBeDisabled();
  });

  it("submit blocked until a destination is chosen", async () => {
    renderFlow(<MovementPickerFlow mode="transfer" />);
    const user = userEvent.setup();
    await pickRow(user, "Soda 300ml", "10");
    expect(
      screen.getByRole("button", { name: /^Dispatch Transfer/ }),
    ).toBeDisabled();
  });
});

// ── Non-sale ────────────────────────────────────────────────────────
describe("SM — Log Non-Sale", () => {
  it("reason + note; 'Other' makes the note required and blocks submit", async () => {
    renderFlow(<MovementPickerFlow mode="non-sale" />);
    const user = userEvent.setup();

    await pickRow(user, "Beef Fillet", "2");
    await user.click(screen.getByRole("combobox", { name: /Consumption reason/ }));
    await user.click(await screen.findByRole("option", { name: "Other (note required)" }));

    // Note requirement surfaces immediately; submit stays disabled.
    expect(
      await screen.findByText("A note is required for 'Other'."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log Non-Sale" })).toBeDisabled();
    expect(api.nonSaleBatch).not.toHaveBeenCalled();

    await user.type(
      screen.getByRole("textbox", { name: /Note \(required\)/ }),
      "morning tea",
    );
    await user.click(screen.getByRole("button", { name: /^Log Non-Sale/ }));
    await waitFor(() =>
      expect(api.nonSaleBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          locationId: "loc-store",
          reason: "other",
          note: "morning tea",
          lines: [{ productId: "p-beef", quantity: "2" }],
        }),
      ),
    );
  });

  it("populated with a plain reason: one nonSaleBatch POST, no note", async () => {
    renderFlow(<MovementPickerFlow mode="non-sale" />);
    const user = userEvent.setup();

    await pickRow(user, "Beef Fillet", "2");
    await pickRow(user, "Rice Basmati", "3");
    await user.click(screen.getByRole("combobox", { name: /Consumption reason/ }));
    await user.click(
      await screen.findByRole("option", { name: "Staff meal / tea preparation" }),
    );

    expect(
      screen.getByText(
        /Removes 5 kg from Store as staff meals \/ spoilage\. This is not a sale\./,
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Log Non-Sale \(−5 kg\)/ }));
    await waitFor(() =>
      expect(api.nonSaleBatch).toHaveBeenCalledWith(
        expect.objectContaining({
          reason: "staff_meal",
          lines: [
            { productId: "p-beef", quantity: "2" },
            { productId: "p-rice", quantity: "3" },
          ],
        }),
      ),
    );
  });

  it("has no category tab row (search only)", () => {
    renderFlow(<MovementPickerFlow mode="non-sale" />);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });
});
