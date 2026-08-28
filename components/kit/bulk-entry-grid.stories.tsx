import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { BulkEntryGrid, type BulkGridRow } from "./bulk-entry-grid";

/**
 * C26 BulkEntryGrid — `component-states.md §2 C26`. header / editable cell
 * default+focused / non-editable / error (danger border + value; documented
 * no-helper-row exception) / valuation footer / Dish row. `role="grid"` with
 * `row` / `columnheader` / `rowheader` / `gridcell`.
 */
const meta: Meta<typeof BulkEntryGrid> = {
  title: "Kit/BulkEntryGrid",
  component: BulkEntryGrid,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "FLAG (systemic semantic-colour + dimmed text contrast — Session 10c): the category cell (`text-info` / `text-warning`), the non-editable cell value (`--text-disabled`), and the `--color-gray-900` footer's subtle labels fall below WCAG AA 4.5:1 — all as drawn on `6TT-0`. NOTE also (documented §9.8 exception): error cells show a danger border + danger value with NO per-cell helper row — the grid is too dense for one; the error is conveyed by border + colour + `aria-invalid`. `color-contrast` scoped off → design-sprint decision.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof BulkEntryGrid>;

const ed = (value: string) => ({ value, editable: true });
const ne = (value: string) => ({ value, editable: false });
const err = (value: string) => ({ value, editable: true, error: true });

const ROWS: BulkGridRow[] = [
  {
    id: "g1",
    item: "Beef Fillet",
    category: "Ingredient",
    categoryTone: "info",
    unit: "kg",
    store: ed("120.0"),
    restaurant: ne("0.0"),
    canteen: ne("0.0"),
    costBuying: "580.00",
    totalValue: "69,600.00",
  },
  {
    id: "g2",
    item: "Beef Stew",
    category: "Dish (Finished)",
    categoryTone: "warning",
    unit: "portion",
    store: ne("0.0"),
    restaurant: ed("14.0"),
    canteen: ne("0.0"),
    costBuying: "0.00 (Dish)",
    totalValue: "—",
  },
];

export const HeaderAndRows: Story = {
  name: "Header + editable / non-editable / Dish row + footer — ARTBOARD 6TY-0",
  args: {
    rows: ROWS,
    footerTitle: "Consolidated Day 1 Valuation",
    footerSegments: [
      { label: "Ingredients", value: "69,600.00" },
      { label: "Dishes", value: "0.00" },
      { label: "Consolidated", value: "69,600.00", tone: "success" },
    ],
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("grid")).toBeInTheDocument();
    await expect(c.getAllByRole("columnheader")).toHaveLength(8);
    // editable cell for Store on the Beef Fillet row
    await expect(
      c.getByRole("textbox", { name: "Beef Fillet — Store" }),
    ).toHaveValue("120.0");
    await expect(c.getByText("Consolidated")).toBeInTheDocument();
  },
};

export const CellError: Story = {
  name: "Cell error ⇒ danger border + danger value + aria-invalid — ARTBOARD 9TQ-0",
  args: {
    rows: [{ ...ROWS[0], store: err("-4.0") }],
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", {
      name: "Beef Fillet — Store",
    });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const box = input.closest("[data-invalid]")!;
    await expect(box).toBeInTheDocument();
  },
};

export const EditableCellFocus: Story = {
  name: "Editable cell focus ⇒ §9.2 accent border",
  args: { rows: [ROWS[0]] },
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    interaction: {
      focus: 'input[aria-label="Beef Fillet — Store"]',
      // the editable (non-error) cell box carries border-accent at rest and
      // on focus — assert the box's border resolves to the accent token
      assertColor: [
        {
          selector: '[role="row"]:last-child .kit-field',
          prop: "borderColor",
          token: "--color-accent",
        },
      ],
    },
  },
};
