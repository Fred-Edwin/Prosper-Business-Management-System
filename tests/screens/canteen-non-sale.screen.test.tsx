// @vitest-environment jsdom
// Session 16 per-screen gate — the Canteen Log-Non-Sale (waste) flow.
// PRD §3 records non-sale consumption as "recorded by: any staff" and
// ADR-67 lists `non_sale_consumption` as a legal outbound at the Canteen,
// but the only screen was the Store Manager's. This is the Canteen-side
// flow: it composes the shared <MovementPickerFlow> (mode="canteen-non-sale")
// — the same multi-row <SelectableProductRow> picker + reason <Select> +
// note <Textarea> + one batch submit the SM non-sale flow uses, but
// Canteen-sourced and scoped to the canteen-sellable set. useStaffStock /
// useStockLevels / useOutstandingDeliveries + stockApi mocked; no server.
//
// States: populated / empty / loading / error, plus the reason-required
// gate, the note-required-for-"Other" gate, the batch-submit interaction
// (ONE nonSaleBatch POST { locationId: canteen }), the success toast +
// redirect to /canteen, and the "no money / cost / margin" assertion.
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
  { id: "p-water", name: "Water 500ml", unitLabel: "pcs", kind: "goods", category: "Beverages & Soda" },
  // Stocked at the Store only — NOT canteen-sellable, must never appear.
  { id: "p-rice", name: "Rice", unitLabel: "kg", kind: "ingredient", category: null },
];

// The picker scopes to the canteen-sellable set via GET /api/canteen/products
// (useCanteenProducts) — same as the dispatch flow. Rice (Store-only) is
// absent from this payload.
const CANTEEN_PRODUCTS = [
  { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", category: "Beverages & Soda", kind: "goods", sellingPrice: "60.00" },
  { id: "p-mandazi", name: "Mandazi", unitLabel: "pcs", category: "Shop Goods", kind: "goods", sellingPrice: "20.00" },
  { id: "p-water", name: "Water 500ml", unitLabel: "pcs", category: "Beverages & Soda", kind: "goods", sellingPrice: "50.00" },
];
const LOCATIONS = [
  { id: "loc-canteen", name: "Canteen", type: "canteen" },
  { id: "loc-restaurant", name: "Restaurant", type: "restaurant" },
  { id: "loc-store", name: "Store", type: "store" },
];
// Derived balances AT THE CANTEEN that the rows read for `available`.
const LEVELS = [
  { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", quantity: "60.0000" },
  { productId: "p-mandazi", name: "Mandazi", unitLabel: "pcs", quantity: "50.0000" },
  { productId: "p-water", name: "Water 500ml", unitLabel: "pcs", quantity: "40.0000" },
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
const nonSaleBatch = vi.hoisted(() => vi.fn().mockResolvedValue([{}]));

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return {
    ...actual,
    useStaffStock: () => staff,
    useStockLevels: () => levels,
    useOutstandingDeliveries: () => outstanding,
    stockApi: { ...actual.stockApi, nonSaleBatch },
  };
});

import { MovementPickerFlow } from "@/app/store-manager/flows/movement-picker-flow";

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <MovementPickerFlow mode="canteen-non-sale" />
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

describe("Canteen — Log Non-Sale (waste) flow", () => {
  it("no money / cost / margin string anywhere on the screen", () => {
    const { container } = renderScreen();
    expect(container.textContent).not.toMatch(/KES|margin|cost|buying price/i);
  });

  it("title 'Log Non-Sale', warning tone, rows come from the Canteen balance", async () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { name: "Log Non-Sale" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Staff meals & spoilage/)).toBeInTheDocument();
    expect(
      await screen.findByRole("group", { name: /^Mandazi, Avail: 50 pcs/ }),
    ).toBeInTheDocument();
  });

  it("product list = the canteen-sellable set; a Store-only ingredient never appears", async () => {
    renderScreen();
    expect(
      await screen.findByRole("group", { name: /^Soda 300ml,/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /^Mandazi,/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /^Rice,/ }),
    ).not.toBeInTheDocument();
  });

  it("empty: no canteen-sellable products → EmptyState", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
    );
    renderScreen();
    expect(await screen.findByText("Nothing to log")).toBeInTheDocument();
  });

  it("error: a stock-levels failure → ErrorState", async () => {
    levels.error = "boom";
    renderScreen();
    expect(await screen.findByText("Couldn't load Canteen stock")).toBeInTheDocument();
  });

  it("submit is blocked until a reason is picked", async () => {
    renderScreen();
    const user = userEvent.setup();
    await pickRow(user, "Mandazi", "5");

    // A row is selected but no reason yet → submit disabled.
    expect(
      screen.getByRole("button", { name: /Log Non-Sale/ }),
    ).toBeDisabled();

    await user.click(screen.getByRole("combobox", { name: /Consumption reason/ }));
    await user.click(await screen.findByRole("option", { name: "Spoiled" }));

    expect(
      screen.getByRole("button", { name: /Log Non-Sale \(−5 pcs\)/ }),
    ).toBeEnabled();
  });

  it("reason 'Other' requires a note", async () => {
    renderScreen();
    const user = userEvent.setup();
    await pickRow(user, "Mandazi", "5");

    await user.click(screen.getByRole("combobox", { name: /Consumption reason/ }));
    await user.click(await screen.findByRole("option", { name: "Other (note required)" }));

    expect(screen.getByText(/A note is required for 'Other'\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log Non-Sale/ })).toBeDisabled();

    await user.type(screen.getByLabelText(/Note \(required\)/), "left out overnight");
    expect(
      screen.getByRole("button", { name: /Log Non-Sale \(−5 pcs\)/ }),
    ).toBeEnabled();
  });

  it("populated: Mandazi ×5 Spoiled → ONE nonSaleBatch POST { locationId: canteen } → toast + redirect to /canteen", async () => {
    renderScreen();
    const user = userEvent.setup();

    await pickRow(user, "Mandazi", "5");
    await user.click(screen.getByRole("combobox", { name: /Consumption reason/ }));
    await user.click(await screen.findByRole("option", { name: "Spoiled" }));

    expect(
      screen.getByText(
        /Removes 5 pcs from Canteen as staff meals \/ spoilage\. This is not a sale\./,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Log Non-Sale \(−5 pcs\)/ }),
    );

    await waitFor(() =>
      expect(nonSaleBatch).toHaveBeenCalledWith({
        locationId: "loc-canteen",
        reason: "spoiled",
        note: "",
        lines: [{ productId: "p-mandazi", quantity: "5" }],
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/canteen"));
  });
});
