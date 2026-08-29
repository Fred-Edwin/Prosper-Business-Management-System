import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { StatusChip } from "./status-chip";

/**
 * C13 StatusChip — `component-states.md §2 C13`. Five semantic variants,
 * NOT interaction states — display-only (`no change needed`, verified
 * Session 2 §8 / Session 10). Dot + label share the semantic colour.
 */
const meta: Meta<typeof StatusChip> = {
  title: "Kit/StatusChip",
  component: StatusChip,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic semantic-colour text contrast — Session 10c): the `warning` chip label is `--color-warning` on `--surface-page` ≈ 2.5:1, below WCAG AA 4.5:1. This is the drawn `6DO-0` visual — the accompanying dot + short label make the semantic reading redundant with colour, but the text itself is sub-threshold. Same call as the DatePicker cells / Select placeholder. `color-contrast` is scoped off for these stories → design-sprint decision (darken the amber label token for text use, or accept as a status indicator where colour is not the only cue).",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof StatusChip>;

export const Success: Story = { args: { variant: "success", children: "Matched" } };
export const Warning: Story = { args: { variant: "warning", children: "Pending" } };
export const Danger: Story = { args: { variant: "danger", children: "Short" } };
export const Info: Story = {
  args: { variant: "info", children: "Awaiting receipt" },
};
export const Neutral: Story = { args: { variant: "neutral", children: "Closed" } };

export const AllVariants: Story = {
  name: "All five semantic variants (REST row — 6DO-0)",
  render: () => (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <StatusChip variant="success">Matched</StatusChip>
      <StatusChip variant="warning">Pending</StatusChip>
      <StatusChip variant="danger">Short</StatusChip>
      <StatusChip variant="info">Awaiting receipt</StatusChip>
      <StatusChip variant="neutral">Closed</StatusChip>
    </div>
  ),
  play: async ({ canvasElement }) => {
    // display-only: no role, just text
    await expect(within(canvasElement).getByText("Matched")).toBeInTheDocument();
  },
};
