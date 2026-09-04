// @vitest-environment jsdom
// M2-3d per-screen gate — the Canteen Transfer Dispatch flow after the
// Option-A rebuild: it now composes the shared <MovementPickerFlow>
// (mode="dispatch") — the same multi-row <SelectableProductRow> picker +
// category <Tabs> + Destination <Select> + <CalculatedImpactBanner> + one
// batch submit that the SM flows use, but Canteen-sourced. useStaffStock /
// useStockLevels / useOutstandingDeliveries + stockApi mocked; no server.
//
// States: populated / empty / loading / error / over-stock blocked, plus
// the batch-submit interaction, the two-phase-transfer toast copy, and
// the "no money / cost / margin" assertion.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

const push = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, back }) }));

const PRODUCTS = [
  { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", kind: "dish", category: "Beverages & Soda" },
  { id: "p-water", name: "Mineral Water 500ml", unitLabel: "pcs", kind: "dish", category: "Beverages & Soda" },
  { id: "p-bread", name: "Bread 400g", unitLabel: "pcs", kind: "goods", category: "Shop Goods" },
  // Stocked at the Store only — NOT canteen-sellable, must never appear.
  { id: "p-flour", name: "Flour 2kg", unitLabel: "pcs", kind: "ingredient", category: "Shop Goods" },
];

// FIX-1 FIX C — the dispatch picker scopes to the canteen-sellable set via
// GET /api/canteen/products (useCanteenProducts). Return the 3 canteen
// items; Flour (Store-only) is absent from this payload.
const CANTEEN_PRODUCTS = [
  { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", category: "Beverages & Soda", kind: "dish", sellingPrice: "60.00" },
  { id: "p-water", name: "Mineral Water 500ml", unitLabel: "pcs", category: "Beverages & Soda", kind: "dish", sellingPrice: "50.00" },
  { id: "p-bread", name: "Bread 400g", unitLabel: "pcs", category: "Shop Goods", kind: "goods", sellingPrice: "40.00" },
];
// ADR-67: a transfer is Restaurant↔Canteen only; the Store is never a
// transfer endpoint. The Canteen dispatch's destination auto-resolves to
// the Restaurant (the only non-store, non-self location), so there is no
// Destination <Select> — the direction badge shows where it's going.
const LOCATIONS = [
  { id: "loc-canteen", name: "Canteen", type: "canteen" },
  { id: "loc-restaurant", name: "Restaurant", type: "restaurant" },
  { id: "loc-store", name: "Store", type: "store" },
];
// Derived balances AT THE CANTEEN that the rows read for `available`.
const LEVELS = [
  { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", quantity: "92.0000" },
  { productId: "p-water", name: "Mineral Water 500ml", unitLabel: "pcs", quantity: "96.0000" },
  { productId: "p-bread", name: "Bread 400g", unitLabel: "pcs", quantity: "8.0000" },
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
const transferBatch = vi.hoisted(() => vi.fn().mockResolvedValue([{}, {}]));

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return {
    ...actual,
    useStaffStock: () => staff,
    useStockLevels: () => levels,
    useOutstandingDeliveries: () => outstanding,
    stockApi: { ...actual.stockApi, transferBatch },
  };
});

import { TransferDispatchFlow } from "@/app/canteen/transfer/transfer-dispatch-flow";

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <TransferDispatchFlow />
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
  outstanding.rows = [];
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

/** Select a product row by name and set its stepper value. */
async function pickRow(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  qty: string,
) {
  // The picker sources from GET /api/canteen/products (FIX-1 FIX C) — rows
  // land after that fetch resolves, so wait for the first one.
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

describe("Canteen — Transfer Dispatch flow (Option-A picker)", () => {
  it("no money / cost / margin string anywhere on the screen", () => {
    const { container } = renderScreen();
    expect(container.textContent).not.toMatch(/KES|margin|cost|buying price/i);
  });

  it("FlowHeader badge is 'Canteen → …' in the info tone; row Avail comes from the Canteen balance", async () => {
    renderScreen();
    // badge tracks the (unset) destination
    expect(screen.getByText(/Canteen →/)).toBeInTheDocument();
    expect(
      await screen.findByRole("group", { name: /^Soda 300ml, Avail: 92 pcs/ }),
    ).toBeInTheDocument();
  });

  // FIX-1 FIX C — the dispatch picker lists exactly the canteen-sellable set
  // from GET /api/canteen/products; a Store-only product never appears.
  it("product list = the canteen-sellable set (GET /api/canteen/products), not the raw catalogue", async () => {
    renderScreen();
    expect(
      await screen.findByRole("group", { name: /^Soda 300ml,/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /^Mineral Water 500ml,/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /^Bread 400g,/ }),
    ).toBeInTheDocument();
    // Flour is in staff.data.products but NOT in the canteen payload.
    expect(
      screen.queryByRole("group", { name: /^Flour 2kg,/ }),
    ).not.toBeInTheDocument();
  });

  it("populated: 2 rows → impact banner sums → ONE transferBatch POST { fromLocationId: canteen, toLocationId: restaurant } (auto-destination, ADR-67)", async () => {
    renderScreen();
    const user = userEvent.setup();

    // Destination auto-resolves to the Restaurant — no <Select>.
    expect(
      screen.queryByRole("combobox", { name: /Destination/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/Canteen → Restaurant/)).toBeInTheDocument();

    // category tab narrows to the two beverages
    await user.click(screen.getByRole("tab", { name: "Beverages & Soda" }));
    expect(
      screen.queryByRole("group", { name: /^Bread 400g,/ }),
    ).not.toBeInTheDocument();

    await pickRow(user, "Mineral Water 500ml", "24");
    await pickRow(user, "Soda 300ml", "12");

    expect(
      screen.getByText(
        /Removes 36 pcs from Canteen now; lands at Restaurant once they accept\./,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /Dispatch Transfer to Restaurant \(−36 pcs\)/,
      }),
    );
    await waitFor(() =>
      expect(transferBatch).toHaveBeenCalledWith({
        fromLocationId: "loc-canteen",
        toLocationId: "loc-restaurant",
        lines: [
          { productId: "p-water", quantity: "24" },
          { productId: "p-soda", quantity: "12" },
        ],
      }),
    );
    // two-phase toast + return to the Canteen hub
    expect(
      await screen.findByText(
        /Dispatched · 2 products · awaiting Restaurant accept/,
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/canteen"));
  });

  it("blocked: a row over the Canteen balance disables submit + shows the danger banner, nothing POSTs", async () => {
    renderScreen();
    const user = userEvent.setup();
    await pickRow(user, "Bread 400g", "9999"); // only 8 on hand

    expect(
      screen.getByText(/1 line is over available stock\. Fix it to continue\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Only 8 pcs on hand — reduce or remove this line\./),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Dispatch Transfer/ }),
    ).toBeDisabled();
    expect(transferBatch).not.toHaveBeenCalled();
  });

  it("empty: the Canteen has no sellable products → EmptyState, submit disabled", async () => {
    // FIX-1 FIX C: the picker now sources from GET /api/canteen/products,
    // so "empty" is an empty canteen payload (not empty staff.data.products).
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    });
    renderScreen();
    expect(await screen.findByText("Nothing to transfer")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Dispatch Transfer/ }),
    ).toBeDisabled();
  });

  it("loading: 3 skeleton rows, submit disabled", () => {
    staff.loading = true;
    const { container } = renderScreen();
    expect(container.querySelectorAll(".kit-skeleton")).toHaveLength(3);
    expect(
      screen.getByRole("button", { name: /^Dispatch Transfer/ }),
    ).toBeDisabled();
  });

  it("error: <ErrorState> 'Couldn't load Canteen stock' + Retry; body hidden", () => {
    staff.error = "Failed to load stock.";
    renderScreen();
    const alert = screen.getByRole("alert");
    expect(
      within(alert).getByText("Couldn't load Canteen stock"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    // body hidden — no product rows
    expect(
      screen.queryByRole("group", { name: /^Soda 300ml,/ }),
    ).not.toBeInTheDocument();
  });
});
