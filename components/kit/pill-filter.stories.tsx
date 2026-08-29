import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { PillFilter } from "./pill-filter";

/**
 * C12 PillFilter — `component-states.md §2 C12`.
 *
 * OWNER REVIEW (kit-audit "Remaining gaps" #7): moved from N× `aria-pressed`
 * toggle buttons to the APG **radiogroup** pattern (owner picked this in the
 * Session 10 kickoff). `role="radiogroup"` / `role="radio"` / `aria-checked`,
 * roving tabIndex, ArrowLeft/Right + Home/End select. Reverts to a toggle
 * group only if pills ever become multi-select. Confirm to ratify.
 */
const meta: Meta<typeof PillFilter> = {
  title: "Kit/PillFilter — radiogroup NEEDS OWNER REVIEW",
  component: PillFilter,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof PillFilter>;

const OPTS = [
  { key: "all", label: "All" },
  { key: "store", label: "Store" },
  { key: "restaurant", label: "Restaurant" },
  { key: "canteen", label: "Canteen", disabled: true },
];

function Harness() {
  const [active, setActive] = React.useState("all");
  return (
    <PillFilter
      options={OPTS}
      activeKey={active}
      onChange={setActive}
      aria-label="Filter by location"
    />
  );
}

export const Rest: Story = { render: () => <Harness /> };

export const HoverInactive: Story = {
  name: "Hover (inactive pill) ⇒ --surface-hover",
  render: () => <Harness />,
  parameters: {
    interaction: {
      hover: '[role="radio"]:nth-child(2)',
      assertColor: [
        {
          selector: '[role="radio"]:nth-child(2)',
          prop: "backgroundColor",
          token: "--surface-hover",
        },
      ],
    },
  },
};

export const Selected: Story = {
  name: "Selected (active) ⇒ --surface-selected (§9.4 wins over hover)",
  render: () => <Harness />,
  parameters: {
    interaction: {
      hover: '[role="radio"][aria-checked="true"]',
      assertColor: [
        {
          selector: '[role="radio"][aria-checked="true"]',
          prop: "backgroundColor",
          token: "--surface-selected",
        },
      ],
    },
  },
};

export const FocusVisible: Story = {
  name: "FocusVisible ⇒ §9.1 ring",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: '[role="radio"][aria-checked="true"]',
      assertFocusRing: '[role="radio"][aria-checked="true"]',
    },
  },
};

export const Disabled: Story = {
  name: "Disabled pill (ARTBOARD — location with no data)",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const canteen = within(canvasElement).getByRole("radio", { name: "Canteen" });
    await expect(canteen).toBeDisabled();
  },
};

export const ArrowKeySelect: Story = {
  name: "ArrowRight moves aria-checked + focus (radiogroup)",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const all = c.getByRole("radio", { name: "All" });
    const store = c.getByRole("radio", { name: "Store" });
    await expect(all).toHaveAttribute("tabindex", "0");
    await expect(store).toHaveAttribute("tabindex", "-1");
    all.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(store).toHaveAttribute("aria-checked", "true");
    await expect(store).toHaveFocus();
  },
};
