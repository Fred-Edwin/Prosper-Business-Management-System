import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { BottomNav } from "./bottom-nav";

/**
 * C30 BottomNav — `component-states.md §2 C30` (state-complete, canonical §8).
 * item active (`aria-current="page"`) / inactive / pressed (§9 global).
 * `<nav aria-label="Primary">`; light surface so the standard accent ring
 * applies. Icons are a caller-supplied active/inactive pair.
 */
const meta: Meta<typeof BottomNav> = {
  title: "Kit/Primitives/BottomNav",
  component: BottomNav,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic low-contrast dimmed text — Session 10c): inactive item labels are `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1, below WCAG AA 4.5:1 — as drawn on `9J5-0`. Same call as the Select placeholder. `color-contrast` scoped off → design-sprint decision.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

const dot = (color: string) => (
  <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
    <circle cx="10" cy="10" r="6" fill="none" stroke={color} strokeWidth="1.5" />
  </svg>
);

const ITEMS = [
  { key: "hub", label: "Hub", activeIcon: dot("var(--color-accent)"), inactiveIcon: dot("var(--text-tertiary)") },
  { key: "stock", label: "Stock", activeIcon: dot("var(--color-accent)"), inactiveIcon: dot("var(--text-tertiary)") },
  { key: "history", label: "History", activeIcon: dot("var(--color-accent)"), inactiveIcon: dot("var(--text-tertiary)") },
];

function Harness({ start = "hub" }: { start?: string }) {
  const [active, setActive] = React.useState(start);
  return <BottomNav items={ITEMS} activeKey={active} onNavigate={setActive} />;
}

export const Rest: Story = {
  name: "Hub active / Stock+History inactive — ARTBOARD 9J5-0",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Hub" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(
      c.getByRole("button", { name: "Stock" }),
    ).not.toHaveAttribute("aria-current");
  },
};

export const FocusVisible: Story = {
  name: "FocusVisible ⇒ §9.1 accent ring on the item hit area",
  render: () => <Harness />,
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    interaction: {
      focus: '[aria-current="page"]',
      assertFocusRing: '[aria-current="page"]',
    },
  },
};

export const NavigateMovesCurrent: Story = {
  name: "Click an item ⇒ aria-current moves",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Stock" }));
    await expect(c.getByRole("button", { name: "Stock" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(c.getByRole("button", { name: "Hub" })).not.toHaveAttribute(
      "aria-current",
    );
  },
};
