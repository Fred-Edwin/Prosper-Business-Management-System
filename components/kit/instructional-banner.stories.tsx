import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { InstructionalBanner } from "./instructional-banner";

/**
 * C25 InstructionalBanner — `component-states.md §2 C25`. Display-only,
 * single visual. Neutral `--surface-selected` tint (deliberately distinct
 * from the amber CalculatedImpactBanner — §6 D6), accent numbered circle.
 */
const meta: Meta<typeof InstructionalBanner> = {
  title: "Kit/Primitives/InstructionalBanner",
  component: InstructionalBanner,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof InstructionalBanner>;

export const Rest: Story = {
  name: "Default (numbered circle + title + body) — ARTBOARD 6Y2-0",
  args: {
    step: 1,
    title: "Enter opening counts",
    body: "Type the physical quantity for each item at this location. Other locations stay read-only.",
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("1")).toBeInTheDocument();
    await expect(
      within(canvasElement).getByText("Enter opening counts"),
    ).toBeInTheDocument();
  },
};

export const StepTwo: Story = {
  name: "Step 2 variant",
  args: {
    step: 2,
    title: "Review the valuation",
    body: "The footer totals update as you type. Save when every editable cell is filled.",
  },
};
