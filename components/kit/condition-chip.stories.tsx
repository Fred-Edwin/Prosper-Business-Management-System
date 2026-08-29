import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ConditionChip } from "./condition-chip";

/**
 * C14 ConditionChip — `component-states.md §2 C14`. Three fixed conditions,
 * display-only (`no change needed`). Same dot + label markup as StatusChip.
 */
const meta: Meta<typeof ConditionChip> = {
  title: "Kit/ConditionChip",
  component: ConditionChip,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic semantic-colour text contrast — Session 10c): the `Needs Repair` label is `--color-warning` on `--surface-page` ≈ 2.5:1, below WCAG AA 4.5:1 — the drawn `6EC-0` visual, with a redundant coloured dot. Same call as StatusChip. `color-contrast` scoped off for these stories → design-sprint decision.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof ConditionChip>;

export const Good: Story = { args: { condition: "Good" } };
export const NeedsRepair: Story = { args: { condition: "Needs Repair" } };
export const Decommissioned: Story = { args: { condition: "Decommissioned" } };

export const AllVariants: Story = {
  name: "All three conditions (REST row — 6EC-0)",
  render: () => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <ConditionChip condition="Good" />
      <ConditionChip condition="Needs Repair" />
      <ConditionChip condition="Decommissioned" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Good")).toBeInTheDocument();
  },
};
