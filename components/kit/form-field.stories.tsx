import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { FormField } from "./form-field";
import { expectComputedColor } from "./__stories__/story-utils";

/**
 * NEW primitive (Session 10 Deliverable 3d) — `kit-audit.md §3`, ADR-43.
 * Authors the §9.8 helper/error row ONCE: label + control slot + helper/error
 * `<p>`, with `aria-describedby` / `aria-invalid` wired. Mechanical — accepted.
 * `TextInput` / `Textarea` / `Select` / `QuantityStepper` compose it.
 *
 * These stories prove the wiring; the field components' own stories prove the
 * composed visual per §9.8.
 */
const meta = {
  title: "Kit/Primitives/FormField",
  component: FormField,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FormField>;

export default meta;
type Story = StoryObj<typeof meta>;

const Control = (a: {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
}) => (
  <input
    {...a}
    className="kit-field h-(--control-md) px-(--sp-4) rounded-sm border border-solid [border-color:var(--border-strong)]"
    defaultValue="Beef Fillet"
  />
);

export const Rest: Story = {
  name: "Rest (label + control, no message)",
  args: { label: "Product name", children: Control },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox");
    await expect(input).not.toHaveAttribute("aria-describedby");
    await expect(input).not.toHaveAttribute("aria-invalid");
    // label points at the control
    const label = canvasElement.querySelector("label")!;
    await expect(label).toHaveAttribute("for", input.id);
  },
};

export const Hint: Story = {
  name: "Hint (neutral helper text, --text-secondary)",
  args: {
    label: "Product name",
    hint: "Shown on receipts and reports.",
    children: Control,
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox");
    const msg = within(canvasElement).getByText("Shown on receipts and reports.");
    await expect(input).toHaveAttribute("aria-describedby", msg.id);
    await expect(input).not.toHaveAttribute("aria-invalid");
    expectComputedColor(msg, "color", "--text-secondary");
  },
};

export const Error: Story = {
  name: "Error ⇒ §9.8 danger message + aria-invalid + describedby",
  args: {
    label: "Product name",
    error: "Product name is required.",
    children: Control,
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox");
    const msg = within(canvasElement).getByText("Product name is required.");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("aria-describedby", msg.id);
    expectComputedColor(msg, "color", "--color-danger");
  },
};

export const Required: Story = {
  name: "Required (asterisk, aria-hidden)",
  args: { label: "Product name", required: true, children: Control },
  play: async ({ canvasElement }) => {
    const star = canvasElement.querySelector("label span[aria-hidden]")!;
    await expect(star).toHaveTextContent("*");
  },
};
