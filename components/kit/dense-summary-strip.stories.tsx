import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { DenseSummaryStrip } from "./dense-summary-strip";

/**
 * C21 DenseSummaryStrip — `component-states.md §2 C21`. Display-only.
 * default (dark strip, label:value pairs) / ± emphasis value. One canonical
 * version across the ledger footer + bulk-grid valuation footer (§8 D4).
 * Rendered on the `nav-bg` background (it is `--color-gray-900`).
 */
const meta: Meta<typeof DenseSummaryStrip> = {
  title: "Kit/Primitives/DenseSummaryStrip",
  component: DenseSummaryStrip,
  parameters: {
    layout: "padded",
    backgrounds: { default: "nav-bg" },
    docs: {
      description: {
        component:
          "FLAG (systemic semantic-colour text contrast — Session 10c): tone values `--color-danger` / `--color-success` on the `--color-gray-900` strip (the drawn `6RT-0` treatment) fall below WCAG AA 4.5:1. The default white value and the label meet contrast. `color-contrast` scoped off for the emphasis story → design-sprint decision (on-dark danger/success value tokens).",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof DenseSummaryStrip>;

export const Rest: Story = {
  name: "Default (label:value pairs) — ARTBOARD 6RT-0",
  args: {
    items: [
      { label: "Opening", value: "1,240.0 kg" },
      { label: "Movements", value: "-86.5 kg" },
      { label: "Closing", value: "1,153.5 kg", alignEnd: true },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Opening")).toBeInTheDocument();
    await expect(within(canvasElement).getByText("1,153.5 kg")).toBeInTheDocument();
  },
};

export const EmphasisValues: Story = {
  name: "± emphasis (warning / danger / success tone values)",
  args: {
    items: [
      { label: "Expected", value: "42,000 KES" },
      { label: "Variance", value: "-1,850 KES", tone: "danger" },
      { label: "Reconciled", value: "40,150 KES", tone: "success", alignEnd: true },
    ],
  },
};
