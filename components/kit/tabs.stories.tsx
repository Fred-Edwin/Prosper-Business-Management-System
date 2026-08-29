import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { Tabs } from "./tabs";

/**
 * C11 Tabs — `component-states.md §2 C11` (state-complete visually).
 * Session 10 added the APG tabs pattern: roving tabIndex, ArrowLeft/Right +
 * Home/End move + select (selection follows focus).
 */
const meta: Meta<typeof Tabs> = {
  title: "Kit/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

const TABS = [
  { key: "all", label: "All" },
  { key: "ingredients", label: "Ingredients" },
  { key: "dishes", label: "Dishes" },
  { key: "goods", label: "Goods", disabled: true },
];

function Harness({ start = "all" }: { start?: string }) {
  const [active, setActive] = React.useState(start);
  return <Tabs tabs={TABS} activeKey={active} onChange={setActive} />;
}

export const Rest: Story = { render: () => <Harness /> };

export const HoverInactive: Story = {
  name: "Hover (inactive tab)",
  render: () => <Harness />,
  parameters: { interaction: { hover: '[role="tab"]:nth-child(2)' } },
};

export const FocusVisible: Story = {
  name: "FocusVisible ⇒ §9.1 ring on the tab hit area",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: '[role="tab"][aria-selected="true"]',
      assertFocusRing: '[role="tab"][aria-selected="true"]',
    },
  },
};

export const Disabled: Story = {
  name: "Disabled tab (ARTBOARD — --text-disabled, out of tab sequence)",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const goods = within(canvasElement).getByRole("tab", { name: "Goods" });
    await expect(goods).toBeDisabled();
  },
};

export const ArrowKeyNav: Story = {
  name: "ArrowRight moves aria-selected + DOM focus; roving tabIndex",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const all = c.getByRole("tab", { name: "All" });
    const ingredients = c.getByRole("tab", { name: "Ingredients" });

    // only the selected tab is tabbable
    await expect(all).toHaveAttribute("tabindex", "0");
    await expect(ingredients).toHaveAttribute("tabindex", "-1");

    all.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(ingredients).toHaveAttribute("aria-selected", "true");
    await expect(ingredients).toHaveFocus();
    await expect(ingredients).toHaveAttribute("tabindex", "0");
    await expect(all).toHaveAttribute("tabindex", "-1");

    // Home jumps back to the first
    await userEvent.keyboard("{Home}");
    await expect(all).toHaveAttribute("aria-selected", "true");
  },
};
