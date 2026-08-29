import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ActionTileGrid } from "./action-tile-grid";

/**
 * C27 ActionTileGrid — `component-states.md §2 C27`. tile default (icon +
 * label + sub-label) / count badge (accent sub-label) / pressed (§9 global) /
 * disabled (§9.7). Tiles are `<button>`s with the §9.1 ring.
 */
const meta: Meta<typeof ActionTileGrid> = {
  title: "Kit/Primitives/ActionTileGrid",
  component: ActionTileGrid,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic low-contrast dimmed text — Session 10c): plain sub-labels are `--text-tertiary` on `--surface-page` ≈ 3.4:1, below WCAG AA — as drawn on `6YD-0`. `color-contrast` scoped off → design-sprint decision.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof ActionTileGrid>;

const box = (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
    <rect x="3" y="3" width="14" height="14" rx="2" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
  </svg>
);

export const Rest: Story = {
  name: "Default tiles (icon + label + sub-label) — ARTBOARD 6YD-0",
  args: {
    tiles: [
      { icon: box, label: "Issue Stock", subLabel: "To Restaurant / Canteen" },
      { icon: box, label: "Record Production", subLabel: "Dishes made today" },
    ],
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: /Issue Stock/ }),
    ).toBeEnabled();
  },
};

export const WithCountBadge: Story = {
  name: "Count badge (accent sub-label) — ARTBOARD",
  args: {
    tiles: [
      { icon: box, label: "Deliveries", subLabel: "1 Delivery Pending", badge: true },
      { icon: box, label: "Transfers", subLabel: "None pending" },
    ],
  },
};

export const Disabled: Story = {
  name: "Disabled tile ⇒ §9.7 opacity, no pointer",
  args: {
    tiles: [
      { icon: box, label: "Reconcile", subLabel: "Admin only", disabled: true },
    ],
  },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: /Reconcile/ });
    await expect(btn).toBeDisabled();
    await expect(getComputedStyle(btn).pointerEvents).toBe("none");
    await expect(Number(getComputedStyle(btn).opacity)).toBeLessThan(1);
  },
};

export const FocusVisible: Story = {
  name: "FocusVisible ⇒ §9.1 ring on the tile",
  args: {
    tiles: [{ icon: box, label: "Issue Stock", subLabel: "To Restaurant" }],
  },
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    interaction: { focus: "button", assertFocusRing: "button" },
  },
};
