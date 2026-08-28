import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { EmptyState } from "./empty-state";

/**
 * EmptyState (kit area 17, `9U3-0`, ADR-36d) — `component-states.md §8`.
 * default / filtered-no-results. `role="status"` so a filter change is
 * announced; icon `aria-hidden`; the action composes the kit `<Button>`
 * (primary for default, secondary for filtered).
 */
const meta: Meta<typeof EmptyState> = {
  title: "Kit/Primitives/EmptyState",
  component: EmptyState,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  name: "Default (no records yet) — ARTBOARD 9U9-0",
  args: {
    variant: "default",
    title: "No products yet",
    description: "Add your first product to start tracking stock movements.",
    actionLabel: "Add product",
  },
  play: async ({ canvasElement }) => {
    const root = within(canvasElement).getByRole("status");
    await expect(root).toBeInTheDocument();
    const btn = within(root).getByRole("button", { name: "Add product" });
    await expect(btn).toBeInTheDocument();
  },
};

export const Filtered: Story = {
  name: "Filtered / no results — ARTBOARD 9UJ-0",
  args: {
    variant: "filtered",
    title: "No matches",
    description: "No products match “beeef”. Try a different search.",
    actionLabel: "Clear filters",
  },
  play: async ({ canvasElement }) => {
    // filtered-no-results must be announced (role="status")
    await expect(within(canvasElement).getByRole("status")).toBeInTheDocument();
    await expect(
      within(canvasElement).getByRole("button", { name: "Clear filters" }),
    ).toBeInTheDocument();
  },
};

export const NoAction: Story = {
  name: "No action (message only)",
  args: {
    title: "Nothing logged today",
    description: "Movements will appear here as staff record them.",
  },
};
