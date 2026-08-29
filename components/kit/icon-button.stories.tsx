import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { IconButton } from "./icon-button";

/** C2 IconButton — `component-states.md §2 C2`. 32×32, --surface-hover fill. */
const meta = {
  title: "Kit/IconButton",
  component: IconButton,
  parameters: { layout: "centered" },
  args: { "aria-label": "Add product" },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button", { name: "Add product" });
    await expect(btn).toBeInTheDocument();
  },
};

export const Hover: Story = {
  name: "Hover ⇒ --surface-hover (§9.5 icon-button)",
  parameters: {
    interaction: {
      hover: "button",
      assertColor: [
        { selector: "button", prop: "backgroundColor", token: "--surface-hover" },
      ],
    },
  },
};

export const FocusVisible: Story = {
  name: "FocusVisible ⇒ §9.1 accent ring",
  parameters: { interaction: { focus: "button", assertFocusRing: "button" } },
};

export const Disabled: Story = {
  name: "Disabled ⇒ §9.7 (ARTBOARD — --text-disabled glyph)",
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button");
    await expect(btn).toBeDisabled();
    await expect(getComputedStyle(btn).pointerEvents).toBe("none");
  },
};
