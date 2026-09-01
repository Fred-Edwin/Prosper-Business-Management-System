import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, fn, userEvent, within } from "storybook/test";
import { EmptyState } from "./empty-state";
import { SearchInput } from "./search-input";
import { FilterToolbar, type FilterControl } from "./filter-toolbar";

/**
 * FilterToolbar — NEW kit component (M2-3KIT-FILTER, ADR-42).
 * Spec: `docs/design/filter-toolbar.md`. Visual target: Paper artboard L9O-0
 * ("Component Kit — Filter Toolbar [M2-3DF]"), 6 states. Model artboards:
 * IEA-0 (desktop, inside the shipped merged-Sales screen) / IKW-0 (mobile).
 *
 * Composed from proven primitives (Select / DatePicker / ToggleSwitch /
 * Button) — no new primitive. Controlled: owns no filter state.
 *
 * Stories (8): the 6 L9O-0 state rows + 2 dedicated §9.2 focus-ring proofs
 * (first Select trigger, Reset link).
 *
 * DEVIATIONS from L9O-0, carried up to the orchestrator (also in the
 * component header):
 *  - select control label tone: the kit `Select` trigger always paints its
 *    value `--text-primary`; L9O-0 draws an at-default select label
 *    `--text-secondary`. Honouring that tone means forking `Select`
 *    (forbidden) or reimplementing an APG listbox here (a new primitive in
 *    spirit). Date + toggle controls, rendered by the toolbar itself, DO
 *    honour the tone rule.
 *  - date chip: `DatePicker` has a trailing calendar glyph + mono value;
 *    L9O-0 shows a leading glyph + ui-font value. Same trade-off.
 */
const meta: Meta<typeof FilterToolbar> = {
  title: "Kit/FilterToolbar",
  component: FilterToolbar,
  parameters: {
    layout: "padded",
    // Same systemic incidental-text FLAG scoped off across the kit
    // (Select placeholder / QuantityStepper unit / SearchInput placeholder):
    // the recessive at-default control label + the search placeholder are
    // `--text-secondary`/`--text-tertiary` on `--surface-page`, ratified by
    // the design sprint as the recessive-label call. Not a speculative
    // opt-out — it is the exact precedent in `select.stories.tsx`.
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof FilterToolbar>;

// --- fixtures ---------------------------------------------------------------

const CASHIERS = [
  { value: "all", label: "All cashiers" },
  { value: "mary", label: "Mary Njeri" },
  { value: "john", label: "John Doe" },
];
const PAYMENTS = [
  { value: "all", label: "All" },
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "credit", label: "Credit" },
];

/** Build the Restaurant-Orders control set with the given current values. */
function ordersControls(
  over: Partial<{ cashier: string; payment: string; date: string | null; corrected: boolean }> = {},
): FilterControl[] {
  return [
    {
      id: "cashier",
      label: "Cashier",
      kind: "select",
      options: CASHIERS,
      value: over.cashier ?? "all",
      default: "all",
    },
    {
      id: "payment",
      label: "Payment",
      kind: "select",
      options: PAYMENTS,
      value: over.payment ?? "all",
      default: "all",
    },
    {
      id: "date",
      label: "Date",
      kind: "date",
      value: over.date === undefined ? "Today" : over.date,
      default: "Today",
    },
    {
      id: "corrected",
      label: "Corrected only",
      kind: "toggle",
      value: over.corrected ?? false,
      default: false,
    },
  ];
}

/**
 * Controlled harness — copies the quantity-stepper.stories.tsx pattern. Holds
 * the `controls` array; applies each `onChange(id, value)` to it; Reset (no
 * `onReset` prop) walks `onChange` over the non-default controls, so the
 * harness returns every control to its default. `onSpy` gets every change.
 */
function Harness({
  initial,
  onSpy,
  ...rest
}: {
  initial: FilterControl[];
  onSpy?: (id: string, value: string | boolean | null) => void;
} & Partial<React.ComponentProps<typeof FilterToolbar>>) {
  const [controls, setControls] = React.useState<FilterControl[]>(initial);
  const resultCount = rest.resultCount ?? controls.filter((c) => c.value !== c.default).length + 5;

  const handleChange = React.useCallback(
    (id: string, value: string | boolean | null) => {
      onSpy?.(id, value);
      setControls((prev) =>
        prev.map((c) => (c.id === id ? ({ ...c, value } as FilterControl) : c)),
      );
    },
    [onSpy],
  );

  return (
    <FilterToolbar
      resultNoun="orders"
      {...rest}
      controls={controls}
      resultCount={resultCount}
      onChange={handleChange}
    />
  );
}

// =========================================================================
// 1 — default: every control at its default → NO Reset, recessive labels
// =========================================================================
export const Default: Story = {
  name: "default — all controls at default (no Reset) — ARTBOARD L9O-0",
  render: () => <Harness initial={ordersControls()} resultCount={6} />,
  parameters: {
    interaction: {
      assertColor: [
        // an at-default select label is recessive (see DEVIATION note — the
        // kit Select trigger renders it --text-primary; asserted as-built).
        { selector: '[role="combobox"] span', prop: "color", token: "--text-primary" },
        // the control box border is --border-strong
        { selector: ".kit-field", prop: "borderColor", token: "--border-strong" },
        // result-count text is --text-tertiary
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // no Reset anywhere in the DOM
    await expect(c.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
    // the count is present
    await expect(c.getByText("6 orders")).toBeInTheDocument();
    // role="search" region named "Filters"
    await expect(c.getByRole("search", { name: "Filters" })).toBeInTheDocument();
  },
};

// =========================================================================
// 2 — one filter active: Payment off default → Reset shown
// =========================================================================
export const OneFilterActive: Story = {
  name: "one filter active — Payment set, Reset shown — ARTBOARD L9O-0",
  render: () => (
    <Harness initial={ordersControls({ payment: "mpesa" })} resultCount={2} />
  ),
  parameters: {
    interaction: {
      assertColor: [
        // Reset link colour = --color-accent
        { selector: '[data-ft-reset] span', prop: "color", token: "--color-accent" },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const reset = c.getByRole("button", { name: "Reset" });
    await expect(reset).toBeInTheDocument();
    // the · separator is only present alongside Reset
    await expect(c.getByText("·")).toBeInTheDocument();
    await expect(c.getByText("2 orders")).toBeInTheDocument();
    // the off-default Payment select shows its concrete value
    await expect(c.getByRole("combobox", { name: "Payment" })).toHaveTextContent(
      "Payment: M-Pesa",
    );
  },
};

// =========================================================================
// 3 — multiple active: Cashier + Payment + Date all off default;
//     Reset returns every control to its default (harness round-trip)
// =========================================================================
const multiSpy = fn();

export const MultipleActive: Story = {
  name: "multiple active — Reset resets all — ARTBOARD L9O-0",
  render: () => {
    multiSpy.mockClear();
    return (
      <Harness
        initial={ordersControls({ cashier: "mary", payment: "cash", date: "Aug 23" })}
        resultCount={3}
        onSpy={multiSpy}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // three off-default controls → Reset present
    const reset = c.getByRole("button", { name: "Reset" });
    await expect(reset).toBeInTheDocument();
    await expect(c.getByRole("combobox", { name: "Cashier" })).toHaveTextContent(
      "Cashier: Mary Njeri",
    );

    await userEvent.click(reset);

    // no `onReset` prop ⇒ Reset loops `onChange(id, default)` over each
    // non-default control (cashier, payment, date).
    await expect(multiSpy).toHaveBeenCalledWith("cashier", "all");
    await expect(multiSpy).toHaveBeenCalledWith("payment", "all");
    await expect(multiSpy).toHaveBeenCalledWith("date", "Today");

    // harness round-trip: every control is back at its default, so Reset
    // disappears and the labels return to "All cashiers" / "All".
    await expect(
      c.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();
    await expect(c.getByRole("combobox", { name: "Cashier" })).toHaveTextContent(
      "Cashier: All cashiers",
    );
    await expect(c.getByRole("combobox", { name: "Payment" })).toHaveTextContent(
      "Payment: All",
    );
  },
};

// =========================================================================
// 4 — toggle-style control: a SearchInput sibling + a labelled ToggleSwitch
//     (A1 Customers). Toggle ON → Reset shown.
// =========================================================================
function CustomersHarness() {
  const spy = fn();
  const [controls, setControls] = React.useState<FilterControl[]>([
    { id: "hasBalance", label: "Has balance", kind: "toggle", value: true, default: false },
  ]);
  const [search, setSearch] = React.useState("");
  return (
    <FilterToolbar
      resultNoun="customers"
      resultCount={4}
      aria-label="Filters"
      controls={controls}
      search={
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or phone"
          aria-label="Search customers"
        />
      }
      onChange={(id, value) => {
        spy(id, value);
        setControls((p) =>
          p.map((c) => (c.id === id ? ({ ...c, value } as FilterControl) : c)),
        );
      }}
      onReset={() => {
        setControls((p) => p.map((c) => ({ ...c, value: c.default } as FilterControl)));
        setSearch("");
      }}
    />
  );
}

export const ToggleStyleControl: Story = {
  name: "toggle control — Search sibling + ToggleSwitch (A1) — ARTBOARD L9O-0",
  render: () => <CustomersHarness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // the switch reflects value=true
    const sw = c.getByRole("switch", { name: "Has balance" });
    await expect(sw).toHaveAttribute("aria-checked", "true");
    // toggle ON ⇒ Reset shown
    await expect(c.getByRole("button", { name: "Reset" })).toBeInTheDocument();
    await expect(c.getByText("4 customers")).toBeInTheDocument();
    // the search sibling is in the same row, keeps its own state
    const searchbox = c.getByRole("searchbox", { name: "Search customers" });
    await expect(searchbox).toBeInTheDocument();

    // flipping the switch calls onChange(id, boolean) — it goes to false, and
    // (via onReset path not hit here) the toggle is now at default ⇒ Reset gone
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(
      c.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();
  },
};

// =========================================================================
// 5 — mobile (< --bp-md): scrollable chip row + More chip; count + Reset
//     on their own row below. `layout="mobile"` forces the layout so the
//     visual snapshot is deterministic (the runner viewport isn't resized).
// =========================================================================
export const Mobile: Story = {
  name: "mobile — chip row (overflow-x) + More + count/Reset row — ARTBOARD L9O-0 / IKW-0",
  render: () => (
    <Harness
      initial={ordersControls({ cashier: "mary", date: "Today" })}
      resultCount={2}
      layout="mobile"
    />
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // the chip row scrolls horizontally
    const scroller = canvasElement.querySelector<HTMLElement>("[data-ft-scroll]");
    await expect(scroller).not.toBeNull();
    await expect(getComputedStyle(scroller as HTMLElement).overflowX).toBe("auto");
    // the More chip is present (4 controls, INLINE cap = 3)
    await expect(c.getByRole("button", { name: "More" })).toBeInTheDocument();
    // count + Reset sit in a row below the chips
    await expect(c.getByText("2 orders")).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  },
};

// =========================================================================
// 6 — filtered-empty consequence: the toolbar stays visible above an
//     <EmptyState variant="filtered">, gap = --sp-8 (24px).
// =========================================================================
export const FilteredEmptyConsequence: Story = {
  name: "filtered-empty — toolbar above EmptyState, --sp-8 gap — ARTBOARD L9O-0",
  render: () => {
    const [controls, setControls] = React.useState<FilterControl[]>(
      ordersControls({ cashier: "john", date: "Aug 20" }),
    );
    return (
      <div className="flex flex-col">
        <FilterToolbar
          controls={controls}
          resultCount={0}
          resultNoun="orders"
          onChange={(id, value) =>
            setControls((p) =>
              p.map((c) => (c.id === id ? ({ ...c, value } as FilterControl) : c)),
            )
          }
        />
        <div data-ft-empty-gap className="mt-(--sp-8)">
          <EmptyState
            variant="filtered"
            title="No orders match"
            description="No orders for this cashier on the selected day. Try different filters or Reset."
            actionLabel="Reset filters"
          />
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("0 orders")).toBeInTheDocument();
    await expect(c.getByText("No orders match")).toBeInTheDocument();
    // the gap between toolbar and EmptyState is --sp-8 (24px)
    const gap = canvasElement.querySelector<HTMLElement>("[data-ft-empty-gap]");
    await expect(gap).not.toBeNull();
    await expect(getComputedStyle(gap as HTMLElement).marginTop).toBe("24px");
  },
};

// =========================================================================
// 7 — §9.2 focus ring on the first Select trigger
// =========================================================================
export const SelectTriggerFocusRing: Story = {
  name: "§9.2 — first Select trigger paints a focus-visible ring",
  render: () => <Harness initial={ordersControls()} resultCount={6} />,
  parameters: {
    interaction: {
      focus: '[role="combobox"]',
      assertFocusRing: '[role="combobox"]',
    },
  },
};

// =========================================================================
// 8 — §9.2 focus ring on the Reset link
// =========================================================================
export const ResetFocusRing: Story = {
  name: "§9.2 — Reset link paints a focus-visible ring",
  render: () => (
    <Harness initial={ordersControls({ payment: "cash" })} resultCount={3} />
  ),
  parameters: {
    interaction: {
      focus: "[data-ft-reset]",
      assertFocusRing: "[data-ft-reset]",
    },
  },
};
