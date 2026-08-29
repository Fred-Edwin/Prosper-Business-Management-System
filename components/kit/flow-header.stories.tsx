import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { FlowHeader } from "./flow-header";

/**
 * C31 FlowHeader — `component-states.md §2 C31`. default (back chevron +
 * title + direction badge) / no-badge variant (title-only, e.g. Log Non-Sale) /
 * back pressed (§9 global). `<header>` + `role="heading"`.
 */
const meta: Meta<typeof FlowHeader> = {
  title: "Kit/Primitives/FlowHeader",
  component: FlowHeader,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof FlowHeader>;

export const Rest: Story = {
  name: "Default (with direction badge) — ARTBOARD 9KI-0",
  args: { title: "Issue Stock", direction: "Store → Kitchen", directionTone: "danger" },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Issue Stock",
    );
    await expect(c.getByRole("button", { name: "Back" })).toBeInTheDocument();
    await expect(c.getByText("Store → Kitchen")).toBeVisible();
  },
};

export const NoDirectionBadge: Story = {
  name: "No direction badge (title-only) — ARTBOARD 9TI-0",
  args: { title: "Log Non-Sale Consumption" },
  play: async ({ canvasElement }) => {
    // the badge slot is present but `hidden` when no direction is passed
    const badge = canvasElement.querySelector("header > div:last-child");
    await expect(badge).not.toBeVisible();
  },
};

export const BackFocusVisible: Story = {
  name: "Back button FocusVisible ⇒ §9.1 ring",
  args: { title: "Record Production" },
  parameters: {
    interaction: {
      focus: 'button[aria-label="Back"]',
      assertFocusRing: 'button[aria-label="Back"]',
    },
  },
};
