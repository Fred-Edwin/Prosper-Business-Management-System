import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { ToggleSwitch } from "./toggle-switch";

/**
 * C7 ToggleSwitch — `component-states.md §2 C7`. on / off / disabled / focus.
 * role="switch", Space/Enter toggle (no arrow keys per APG).
 */
const meta: Meta<typeof ToggleSwitch> = {
  title: "Kit/ToggleSwitch",
  component: ToggleSwitch,
  parameters: { layout: "centered" },
  args: { "aria-label": "Available at Restaurant" },
};

export default meta;
type Story = StoryObj<typeof ToggleSwitch>;

function Harness(p: Partial<React.ComponentProps<typeof ToggleSwitch>>) {
  const [on, setOn] = React.useState(p.defaultChecked ?? false);
  return (
    <ToggleSwitch
      {...p}
      checked={on}
      onChange={setOn}
      aria-label="Available at Restaurant"
    />
  );
}

export const On: Story = {
  render: () => <Harness defaultChecked />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("switch")).toBeChecked();
  },
};

export const Off: Story = {
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("switch")).not.toBeChecked();
  },
};

export const FocusVisible: Story = {
  name: "FocusVisible ⇒ §9.1 ring around the track",
  render: () => <Harness />,
  parameters: {
    interaction: { focus: '[role="switch"]', assertFocusRing: '[role="switch"]' },
  },
};

export const DisabledOn: Story = {
  name: "Disabled (on) — ARTBOARD",
  render: () => <ToggleSwitch checked disabled aria-label="Locked on" />,
  play: async ({ canvasElement }) => {
    const sw = within(canvasElement).getByRole("switch");
    await expect(sw).toBeDisabled();
    await expect(getComputedStyle(sw).pointerEvents).toBe("none");
  },
};

export const DisabledOff: Story = {
  name: "Disabled (off) — ARTBOARD",
  render: () => <ToggleSwitch checked={false} disabled aria-label="Locked off" />,
};

export const KeyboardToggle: Story = {
  name: "Space toggles aria-checked",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const sw = within(canvasElement).getByRole("switch");
    sw.focus();
    await userEvent.keyboard(" ");
    await expect(sw).toBeChecked();
    await userEvent.keyboard("{Enter}");
    await expect(sw).not.toBeChecked();
  },
};
