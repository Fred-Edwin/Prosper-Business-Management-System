// @vitest-environment jsdom
// Session 12 per-screen gate — the Store Manager full-screen movement
// flows composed from the kit (<FlowHeader> + <Select> + <QuantityStepper>
// + <CalculatedImpactBanner> + sticky submit). useStaffStock + stockApi
// mocked; no server / DB.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/kit/toast";

const back = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push: vi.fn() }) }));

const hook = vi.hoisted(() => ({
  data: {
    movements: [] as unknown[],
    products: [
      { id: "prod-beef", name: "Beef Fillet", unitLabel: "kg", kind: "ingredient" },
      { id: "prod-dish", name: "Grilled Chicken", unitLabel: "pcs", kind: "dish" },
    ],
    locations: [
      { id: "loc-store", name: "Store", type: "store" },
      { id: "loc-rest", name: "Restaurant", type: "restaurant" },
      { id: "loc-canteen", name: "Canteen", type: "canteen" },
    ],
  },
  loading: false,
  error: null as string | null,
  refresh: vi.fn(),
}));
const api = vi.hoisted(() => ({
  recordIssue: vi.fn().mockResolvedValue({}),
  recordProduction: vi.fn().mockResolvedValue({}),
  dispatchTransfer: vi.fn().mockResolvedValue({}),
  recordNonSale: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/app/store-manager/use-staff-stock", async () => {
  const actual = await vi.importActual<
    typeof import("@/app/store-manager/use-staff-stock")
  >("@/app/store-manager/use-staff-stock");
  return { ...actual, useStaffStock: () => hook, stockApi: { ...actual.stockApi, ...api } };
});

import { IssueProductionFlow } from "@/app/store-manager/flows/issue-production-flow";
import { TransferNonSaleFlow } from "@/app/store-manager/flows/transfer-nonsale-flow";

function renderFlow(node: React.ReactNode) {
  return render(<ToastProvider placement="bottom-center">{node}</ToastProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  hook.loading = false;
  hook.error = null;
});

async function pickOption(user: ReturnType<typeof userEvent.setup>, comboName: RegExp, optionName: string) {
  await user.click(screen.getByRole("combobox", { name: comboName }));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

describe("Store Manager — Issue / Production flow", () => {
  it("issue: submitting POSTs an unsigned magnitude, toasts, and resets", async () => {
    renderFlow(<IssueProductionFlow mode="issue" />);
    const user = userEvent.setup();

    await pickOption(user, /Ingredient to issue/, "Beef Fillet");
    const qty = screen.getByRole("spinbutton", { name: /Quantity/ });
    await user.clear(qty);
    await user.type(qty, "18.5");
    await user.tab();

    await user.click(screen.getByRole("button", { name: /Issue Ingredients \(−18\.5 kg\)/ }));

    await waitFor(() =>
      expect(api.recordIssue).toHaveBeenCalledWith({
        productId: "prod-beef",
        locationId: "loc-store",
        quantity: "18.5",
      }),
    );
    expect(await screen.findByText(/Issued 18\.5 kg Beef Fillet to the kitchen/)).toBeInTheDocument();
    // reset: the product select returns to its placeholder
    expect(screen.getByRole("combobox", { name: /Ingredient to issue/ })).toHaveTextContent(
      /Select a product/,
    );
  });

  it("production: the product <Select> only offers kind=\"dish\" products", async () => {
    renderFlow(<IssueProductionFlow mode="production" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("combobox", { name: /Cooked dish/ }));
    expect(screen.getByRole("option", { name: "Grilled Chicken" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Beef Fillet" })).not.toBeInTheDocument();
  });

  it("shows a <CalculatedImpactBanner> once a product + qty are set", async () => {
    renderFlow(<IssueProductionFlow mode="issue" />);
    const user = userEvent.setup();
    expect(screen.queryByText(/Removes .* from Store stock/)).not.toBeInTheDocument();
    await pickOption(user, /Ingredient to issue/, "Beef Fillet");
    expect(screen.getByText(/Removes 1 kg of Beef Fillet from Store stock now\./)).toBeInTheDocument();
  });

  it("<QuantityStepper> Decrease is disabled at min (0)", async () => {
    renderFlow(<IssueProductionFlow mode="issue" />);
    const user = userEvent.setup();
    const qty = screen.getByRole("spinbutton", { name: /Quantity/ });
    await user.clear(qty);
    await user.type(qty, "0");
    await user.tab();
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
  });

  it("<ErrorState> with Retry when the hook errored", () => {
    hook.error = "Failed to load stock.";
    renderFlow(<IssueProductionFlow mode="issue" />);
    expect(within(screen.getByRole("alert")).getByText("Failed to load stock.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});

describe("Store Manager — Transfer / Non-Sale flow", () => {
  it("transfer: dispatch POSTs { fromLocationId, toLocationId, unsigned quantity } and toasts", async () => {
    renderFlow(<TransferNonSaleFlow mode="transfer" />);
    const user = userEvent.setup();

    await pickOption(user, /^Product/, "Beef Fillet");
    const qty = screen.getByRole("spinbutton", { name: /Transfer quantity/ });
    await user.clear(qty);
    await user.type(qty, "5");
    await user.tab();
    await pickOption(user, /Destination/, "Canteen");

    await user.click(screen.getByRole("button", { name: /Dispatch \(−5 kg\)/ }));

    await waitFor(() =>
      expect(api.dispatchTransfer).toHaveBeenCalledWith({
        productId: "prod-beef",
        fromLocationId: "loc-store",
        toLocationId: "loc-canteen",
        quantity: "5",
      }),
    );
    expect(await screen.findByText(/Dispatched 5 kg Beef Fillet to Canteen/)).toBeInTheDocument();
  });

  it("non-sale: reason \"Other\" makes the note required and blocks submit until filled", async () => {
    renderFlow(<TransferNonSaleFlow mode="non-sale" />);
    const user = userEvent.setup();

    await pickOption(user, /^Product/, "Beef Fillet");
    await pickOption(user, /Consumption reason/, "Other (note required)");
    await user.click(screen.getByRole("button", { name: /Log \(−1 kg\)/ }));
    expect(api.recordNonSale).not.toHaveBeenCalled();
    expect(
      await screen.findByText("A note is required for 'Other'."),
    ).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /Note \(required\)/ }), "morning tea");
    await user.click(screen.getByRole("button", { name: /Log \(−1 kg\)/ }));
    await waitFor(() =>
      expect(api.recordNonSale).toHaveBeenCalledWith(
        expect.objectContaining({ reason: "other", reasonNote: "morning tea", quantity: "1" }),
      ),
    );
  });
});
