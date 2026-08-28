import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { TextInput } from "./text-input";

/**
 * C3 TextInput — `component-states.md §2 C3`. default / focus / filled / error /
 * disabled. §9.2 focus border + §9.8 error pattern (helper row + aria wiring via
 * <FormField>).
 */
const meta = {
  title: "Kit/TextInput",
  component: TextInput,
  parameters: { layout: "padded" },
  args: { label: "Product name", defaultValue: "Beef Fillet" },
} satisfies Meta<typeof TextInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {};

export const Filled: Story = {
  name: "Filled (value text — GLOBAL, same box)",
  args: { defaultValue: "Beef Fillet" },
};

export const FocusBorder: Story = {
  name: "Focus ⇒ §9.2 accent border (any focus)",
  parameters: {
    interaction: {
      focus: "input",
      assertColor: [
        { selector: ".kit-field", prop: "borderColor", token: "--color-accent" },
      ],
    },
  },
};

export const FocusVisible_BorderOnly: Story = {
  name: "FocusVisible ⇒ §9.2 accent border (NO §9.1 ring — FLAG)",
  parameters: {
    docs: {
      description: {
        story:
          "FLAG (Session 10b, not fixed here): `design-principles.md §9.1` lists `input` / `textarea` among elements that get the keyboard-only accent ring, but `TextInput` and `Textarea` carry `.kit-field` (the §9.2 accent *border* on any focus) and NOT `.kit-focus-ring`. `Select` does have both. Adding a ring to the two field boxes is a visual change beyond this proof-harness session — routed to a design sprint. This story asserts what ships today: the §9.2 border only.",
      },
    },
    interaction: {
      focus: "input",
      assertColor: [
        { selector: ".kit-field", prop: "borderColor", token: "--color-accent" },
      ],
    },
  },
};

export const Error: Story = {
  name: "Error ⇒ §9.8 danger border + helper wired to aria-describedby",
  args: { error: true, helperText: "Product name is required.", defaultValue: "Beef Fille" },
  parameters: {
    interaction: {
      assertColor: [
        { selector: ".kit-field", prop: "borderColor", token: "--color-danger" },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const msg = within(canvasElement).getByText("Product name is required.");
    await expect(input).toHaveAttribute("aria-describedby", msg.id);
  },
};

export const Disabled: Story = {
  name: "Disabled (ARTBOARD — --surface-subtle, --text-disabled)",
  args: { disabled: true, defaultValue: "" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("textbox")).toBeDisabled();
  },
};

export const Standalone: Story = {
  name: "Standalone (no label — caller must pass aria-label)",
  args: { label: undefined, "aria-label": "Product name" },
};
