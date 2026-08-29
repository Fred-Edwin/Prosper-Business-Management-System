import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ActivityTimeline } from "./activity-timeline";

/**
 * C28 ActivityTimeline — `component-states.md §2 C28`. Display-only.
 * default (row: title + subtitle + signed qty, pos green / neg red) /
 * empty (`role="status"`, "No movements logged today").
 */
const meta: Meta<typeof ActivityTimeline> = {
  title: "Kit/Primitives/ActivityTimeline",
  component: ActivityTimeline,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic low-contrast dimmed text — Session 10c): the subtitle line is `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1, below WCAG AA 4.5:1. Matches the drawn `6YS-0` (recessive metadata) and the Select-placeholder / DatePicker-cell call. `color-contrast` is scoped off for these stories → design-sprint decision.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof ActivityTimeline>;

const ROWS = [
  {
    title: "Issue to Restaurant",
    subtitle: "Beef Fillet · 14:20 · by Amina",
    value: "-18.5 kg",
    sign: "negative" as const,
  },
  {
    title: "Purchase received",
    subtitle: "Cooking Oil · 11:05 · by Store",
    value: "+40.0 L",
    sign: "positive" as const,
  },
  {
    title: "Transfer from Canteen",
    subtitle: "Rice · 09:30 · by Joseph",
    value: "+12.0 kg",
    sign: "positive" as const,
  },
];

export const Rest: Story = {
  name: "Default (movement log rows) — ARTBOARD 6YS-0",
  args: { rows: ROWS },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("-18.5 kg")).toBeInTheDocument();
    await expect(c.getByText("+40.0 L")).toBeInTheDocument();
  },
};

export const Empty: Story = {
  name: "Empty ⇒ role=status, 'No movements logged today'",
  args: { rows: [] },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole("status");
    await expect(status).toHaveTextContent("No movements logged today");
  },
};
