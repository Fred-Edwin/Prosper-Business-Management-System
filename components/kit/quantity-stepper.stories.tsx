import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { QuantityStepper } from "./quantity-stepper";

/**
 * C10 QuantityStepper — `component-states.md §2 C10`, `kit-audit.md §1`.
 * default / at-bound (− or + disabled) / focus (value field) / error
 * (out-of-range typed value) / ↑↓ steps.
 *
 * OWNER REVIEW (kit-audit "Remaining gaps" #6 — ratified this session):
 * the value is a real `<input role="spinbutton">` (was a `<span>`), so the
 * spec'd focus + typed-error states are reachable and `↑`/`↓` step it. REST
 * visual byte-identical to `6XC-0` (input is unstyled/centered/mono).
 */
const meta: Meta<typeof QuantityStepper> = {
  title: "Kit/QuantityStepper — NEEDS OWNER REVIEW",
  component: QuantityStepper,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic low-contrast dimmed text — Session 10c): the trailing unit label (`kg`) is `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1, below WCAG AA 4.5:1 — as drawn on `6XC-0` (the unit is recessive; the editable value carries the meaning). Same call as the Select placeholder / DatePicker cells. `color-contrast` scoped off → design-sprint decision.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof QuantityStepper>;

function Harness(p: Partial<React.ComponentProps<typeof QuantityStepper>>) {
  const [value, setValue] = React.useState(p.value ?? 70);
  return (
    <QuantityStepper
      label="Quantity"
      unit="kg"
      step={0.5}
      {...p}
      value={value}
      onChange={setValue}
    />
  );
}

export const Rest: Story = {
  name: "Default (− 70.0 + kg) — ARTBOARD 6XC-0",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("spinbutton");
    await expect(input).toHaveAttribute("aria-valuenow", "70");
    await expect(input).toHaveAttribute("aria-valuetext", "70 kg");
  },
};

export const AtMinBound: Story = {
  name: "At min bound ⇒ − disabled (ARTBOARD)",
  render: () => <Harness value={0} min={0} max={100} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "Decrease" })).toBeDisabled();
    await expect(c.getByRole("button", { name: "Increase" })).toBeEnabled();
    await expect(c.getByRole("spinbutton")).toHaveAttribute("aria-valuemin", "0");
  },
};

export const AtMaxBound: Story = {
  name: "At max bound ⇒ + disabled",
  render: () => <Harness value={100} min={0} max={100} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "Increase" })).toBeDisabled();
    await expect(c.getByRole("spinbutton")).toHaveAttribute("aria-valuemax", "100");
  },
};

export const FocusValueField: Story = {
  name: "Focus (value field) ⇒ §9.2 accent border",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: '[role="spinbutton"]',
      assertColor: [
        { selector: ".kit-field", prop: "borderColor", token: "--color-accent" },
      ],
    },
  },
};

export const ErrorTypedValue: Story = {
  name: "Error (out-of-range typed value) ⇒ §9.8 danger border + helper",
  render: () => (
    <Harness value={70} error helperText="Enter a value between 0 and 50." />
  ),
  parameters: {
    interaction: {
      assertColor: [
        { selector: ".kit-field", prop: "borderColor", token: "--color-danger" },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("spinbutton");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const msg = within(canvasElement).getByText("Enter a value between 0 and 50.");
    await expect(input.getAttribute("aria-describedby")).toContain(msg.id);
  },
};

export const ArrowKeysStep: Story = {
  name: "↑ / ↓ step the value by `step`",
  render: () => <Harness value={70} step={0.5} />,
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("spinbutton");
    input.focus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(input).toHaveAttribute("aria-valuenow", "70.5");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await expect(input).toHaveAttribute("aria-valuenow", "69.5");
  },
};
