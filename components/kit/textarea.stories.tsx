import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Textarea } from "./textarea";

/**
 * C4 Textarea — `component-states.md §2 C4`. default / focus / error / disabled.
 * §9.2 accent border on focus + §9.8 error pattern via <FormField>.
 * NOTE: like TextInput, no §9.1 keyboard ring (only .kit-field) — flagged in
 * the TextInput story; same design-sprint follow-up.
 */
const meta: Meta<typeof Textarea> = {
  title: "Kit/Textarea",
  component: Textarea,
  parameters: { layout: "padded" },
  args: {
    label: "Reason for adjustment",
    defaultValue: "Counted 2 fewer than the system after the spot check.",
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Rest: Story = {};

export const FocusBorder: Story = {
  name: "Focus ⇒ §9.2 accent border",
  parameters: {
    interaction: {
      focus: "textarea",
      assertColor: [
        { selector: ".kit-field", prop: "borderColor", token: "--color-accent" },
      ],
    },
  },
};

export const Error: Story = {
  name: "Error ⇒ §9.8 danger border + helper wired",
  args: { error: true, helperText: "A reason is required." },
  parameters: {
    interaction: {
      assertColor: [
        { selector: ".kit-field", prop: "borderColor", token: "--color-danger" },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const ta = within(canvasElement).getByRole("textbox");
    await expect(ta).toHaveAttribute("aria-invalid", "true");
    const msg = within(canvasElement).getByText("A reason is required.");
    await expect(ta).toHaveAttribute("aria-describedby", msg.id);
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox")).toBeDisabled();
  },
};
