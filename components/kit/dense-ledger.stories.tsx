import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { DenseLedger, type LedgerRow, type LedgerTotals } from "./dense-ledger";

/**
 * C16 DenseLedger — `component-states.md §2 C16`. header / data row / row
 * hover (gated on `onCellClick` — §9.3 load-bearing affordance) / corrected
 * cell (underlined semantic colour, ADR-36a — NO chip) / empty / loading
 * (skeleton) / keyboard-operable cells.
 */
const meta: Meta<typeof DenseLedger> = {
  title: "Kit/DenseLedger",
  component: DenseLedger,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "FLAG (systemic semantic-colour + dimmed text contrast — Session 10c): `text-success` / `text-danger` movement values, the `--text-tertiary` dash / empty-row line, and the `--color-gray-900` footer's tone values fall below WCAG AA 4.5:1 — all as drawn on `6ET-0`. The mono value + sign is the primary cue. `color-contrast` scoped off → design-sprint decision.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof DenseLedger>;

const dash = { dash: true };
const cell = (value: string, tone?: "success" | "danger", corrected?: boolean) => ({
  value,
  tone,
  corrected,
});

const ROWS: LedgerRow[] = [
  {
    id: "r1",
    product: "Beef Fillet",
    opening: cell("120.0"),
    purchases: cell("40.0", "success"),
    issues: cell("-18.5", "danger"),
    production: dash,
    transferIn: dash,
    transferOut: cell("-12.0", "danger"),
    sold: dash,
    soldValue: dash,
    closing: cell("129.5"),
    closingValue: cell("64,750"),
  },
  {
    id: "r2",
    product: "Cooking Oil",
    opening: cell("80.0"),
    purchases: cell("40.0", "success"),
    issues: cell("-22.0", "danger", true), // corrected cell (ADR-36a)
    production: dash,
    transferIn: dash,
    transferOut: dash,
    sold: dash,
    soldValue: dash,
    closing: cell("98.0"),
    closingValue: cell("29,400"),
  },
];

const TOTALS: LedgerTotals = {
  label: "Totals reconciled",
  opening: cell("200.0"),
  purchases: cell("80.0", "success"),
  issues: cell("-40.5", "danger"),
  production: dash,
  transferIn: dash,
  transferOut: cell("-12.0", "danger"),
  sold: dash,
  soldValue: dash,
  closing: cell("227.5"),
  closingValue: cell("94,150"),
};

export const HeaderRowsFooter: Story = {
  name: "Header + data rows + sticky footer — ARTBOARD 6FR-0",
  args: { rows: ROWS, totals: TOTALS },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Product")).toBeInTheDocument();
    await expect(c.getByText("Beef Fillet")).toBeInTheDocument();
    await expect(c.getByText("Totals reconciled")).toBeInTheDocument();
    // not clickable → no buttons
    await expect(c.queryByRole("button")).toBeNull();
  },
};

export const CorrectedCell: Story = {
  name: "Corrected cell ⇒ semantic colour + 1px underline (ADR-36a, no chip)",
  args: { rows: ROWS, totals: TOTALS },
  play: async ({ canvasElement }) => {
    // the corrected Issues value for Cooking Oil
    const corrected = within(canvasElement).getByText("-22.0");
    const cs = getComputedStyle(corrected);
    await expect(cs.textDecorationLine).toContain("underline");
  },
};

export const RowHoverClickable: Story = {
  name: "Row hover ⇒ §9.3 --surface-hover (only when onCellClick)",
  args: { rows: ROWS, onCellClick: () => {} },
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    interaction: {
      hover: ".kit-row",
      assertColor: [
        { selector: ".kit-row", prop: "backgroundColor", token: "--surface-hover" },
      ],
    },
  },
};

export const KeyboardOperableCells: Story = {
  name: "Clickable cells are <button>, Enter fires onCellClick(rowId, colKey)",
  args: { rows: ROWS },
  render: (args) => {
    const [hit, setHit] = React.useState<string>("none");
    return (
      <div>
        <DenseLedger {...args} onCellClick={(r, k) => setHit(`${r}:${k}`)} />
        <p data-testid="hit">{hit}</p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const btn = c.getByRole("button", { name: "Correct Issues (-) for Beef Fillet" });
    btn.focus();
    await userEvent.keyboard("{Enter}");
    await expect(c.getByTestId("hit")).toHaveTextContent("r1:issues");
  },
};

export const Empty: Story = {
  name: "Empty ⇒ single centred tertiary line",
  args: { rows: [], emptyMessage: "No movements recorded for this filter." },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByText("No movements recorded for this filter."),
    ).toBeInTheDocument();
  },
};

export const Loading: Story = {
  name: "Loading ⇒ §9.10 skeleton rows",
  args: { rows: [], loading: true },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelectorAll(".kit-skeleton").length,
    ).toBeGreaterThan(0);
  },
};
