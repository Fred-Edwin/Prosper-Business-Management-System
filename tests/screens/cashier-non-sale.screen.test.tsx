// @vitest-environment jsdom
// Session 16 per-screen gate — the Cashier (Restaurant) Log-Non-Sale flow.
// PRD §3 records non-sale consumption as "recorded by: any staff" and
// ADR-67 lists `non_sale_consumption` as a legal outbound at the
// Restaurant. This is the Cashier-side flow: it composes the shared
// <MovementPickerFlow> (mode="restaurant-non-sale") — the same multi-row
// <SelectableProductRow> picker + reason <Select> + note <Textarea> + one
// batch submit the other non-sale flows use, but Restaurant-sourced and
// scoped to dish-or-goods off the shared catalogue (no canteen-products
// fetch). useStaffStock / useStockLevels / useOutstandingDeliveries +
// stockApi mocked; no server.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

const push = vi.hoisted(() => vi.fn());
const back = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, back }) }));

const PRODUCTS = [
  { id: "p-chapati", name: "Chapati", unitLabel: "pcs", kind: "dish", category: null },
  { id: "p-stew", name: "Chicken Stew", unitLabel: "plate", kind: "dish", category: null },
  { id: "p-soda", name: "Soda 300ml", unitLabel: "pcs", kind: "goods", category: "Beverages & Soda" },
  // Ingredient — stocked at the Store only, never appears in a
  // dish-or-goods picker.
  { id: "p-rice", name: "Rice", unitLabel: "kg", kind: "ingredient", category: null },
];
const LOCATIONS = [
  { id: "loc-restaurant", name: "Restaurant", type: "restaurant" },
  { id: "loc-canteen", name: "Canteen", type: "canteen" },
  { id: "loc-store", name: "Store", type: "store" },
];
// Derived balances AT THE RESTAURANT that the rows read for `available`.
const LEVELS = [
  { productId: "p-chapati", name: "Chapati", unitLabel: "pcs", quantity: "66.0000" },
  { productId: "p-stew", name: "Chicken Stew", unitLabel: "plate", quantity: "23.0000" },
  { productId: "p-soda", name: "Soda 300ml", unitLabel: "pcs", quantity: "44.0000" },
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

// The picker only fetches /api/canteen/products for the canteen-scoped
// modes; restaurant-non-sale lists off staff.data.products. Stub fetch so
// nothing in jsdom throws.
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }),
);

import { MovementPickerFlow } from "@/app/store-manager/flows/movement-picker-flow";

function renderScreen() {
  return render(
    <ToastProvider placement="bottom-center">
      <MovementPickerFlow mode="restaurant-non-sale" />
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

describe("Cashier — Log Non-Sale (Restaurant) flow", () => {
  it("no money / cost / margin string anywhere on the screen", () => {
    const { container } = renderScreen();
    expect(container.textContent).not.toMatch(/KES|margin|cost|buying price/i);
  });

  it("title 'Log Non-Sale', warning tone, rows come from the Restaurant balance", async () => {
    renderScreen();
    expect(
      screen.getByRole("heading", { name: "Log Non-Sale" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Staff meals & spoilage/)).toBeInTheDocument();
    expect(
      await screen.findByRole("group", { name: /^Chicken Stew, Avail: 23 plate/ }),
    ).toBeInTheDocument();
  });

  it("picker lists dish + goods only; a Store-only ingredient never appears", async () => {
    renderScreen();
    expect(
      await screen.findByRole("group", { name: /^Chapati,/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /^Soda 300ml,/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /^Rice,/ }),
    ).not.toBeInTheDocument();
  });

  it("submit blocked until a reason is picked; note required for 'Other'", async () => {
    renderScreen();
    const user = userEvent.setup();
    await pickRow(user, "Chapati", "3");

    expect(screen.getByRole("button", { name: /Log Non-Sale/ })).toBeDisabled();

    await user.click(screen.getByRole("combobox", { name: /Consumption reason/ }));
    await user.click(await screen.findByRole("option", { name: "Other (note required)" }));
    expect(screen.getByText(/A note is required for 'Other'\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Log Non-Sale/ })).toBeDisabled();

    await user.type(screen.getByLabelText(/Note \(required\)/), "dropped on the floor");
    expect(
      screen.getByRole("button", { name: /Log Non-Sale \(−3 pcs\)/ }),
    ).toBeEnabled();
  });

  it("populated: Chapati ×3 Spoiled → ONE nonSaleBatch POST { locationId: restaurant } → redirect to /cashier", async () => {
    renderScreen();
    const user = userEvent.setup();

    await pickRow(user, "Chapati", "3");
    await user.click(screen.getByRole("combobox", { name: /Consumption reason/ }));
    await user.click(await screen.findByRole("option", { name: "Spoiled" }));

    expect(
      screen.getByText(
        /Removes 3 pcs from Restaurant as staff meals \/ spoilage\. This is not a sale\./,
      ),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Log Non-Sale \(−3 pcs\)/ }),
    );

    await waitFor(() =>
      expect(nonSaleBatch).toHaveBeenCalledWith({
        locationId: "loc-restaurant",
        reason: "spoiled",
        note: "",
        lines: [{ productId: "p-chapati", quantity: "3" }],
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/cashier"));
  });
});
