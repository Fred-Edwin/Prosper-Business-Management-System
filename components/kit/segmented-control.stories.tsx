import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { SegmentedControl } from "./segmented-control";

/**
 * C6 SegmentedControl — `component-states.md §2 C6`.
 * active = --shadow-sm lift + accent label (§4.5); resting = --text-secondary;
 * whole control disabled = opacity + --text-disabled. APG radiogroup +
 * roving tabIndex + arrow keys added in Session 10.
 */
const meta = {
  title: "Kit/SegmentedControl",
  component: SegmentedControl,
  parameters: { layout: "padded" },
  args: {
    label: "Product Kind",
    options: ["Ingredient", "Dish", "Goods"],
    defaultValue: "Ingredient",
  },
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = { name: "Resting (segment 1 active, 2–3 inactive)" };

export const ActiveSegmentLift: Story = {
  name: "Active segment ⇒ --shadow-sm lift + accent label",
  play: async ({ canvasElement }) => {
    const active = within(canvasElement).getByRole("radio", { checked: true });
    const cs = getComputedStyle(active);
    // shadow present (the one allowed small-control shadow)
    await expect(cs.boxShadow).not.toBe("none");
  },
};

export const FocusVisible: Story = {
  name: "FocusVisible ⇒ §9.1 ring",
  parameters: {
    interaction: {
      focus: '[role="radio"][aria-checked="true"]',
      assertFocusRing: '[role="radio"][aria-checked="true"]',
    },
  },
};

export const Disabled: Story = {
  name: "Disabled whole control (ARTBOARD)",
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const radios = within(canvasElement).getAllByRole("radio");
    for (const r of radios) await expect(r).toBeDisabled();
  },
};

export const ArrowKeySelect: Story = {
  name: "Arrow keys move selection; roving tabIndex",
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const ingredient = c.getByRole("radio", { name: "Ingredient" });
    const dish = c.getByRole("radio", { name: "Dish" });
    await expect(ingredient).toHaveAttribute("tabindex", "0");
    await expect(dish).toHaveAttribute("tabindex", "-1");
    ingredient.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(dish).toHaveAttribute("aria-checked", "true");
    await expect(dish).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}"); // orientation "both"
    await expect(c.getByRole("radio", { name: "Goods" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  },
};
