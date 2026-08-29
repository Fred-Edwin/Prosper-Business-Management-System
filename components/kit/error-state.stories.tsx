import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { ErrorState } from "./error-state";

/**
 * ErrorState (kit area 17, `9U3-0`/`9UT-0`) — `component-states.md §8`.
 * `role="alert"` so the error is announced; icon `aria-hidden` stroked
 * `--color-danger`; Retry composes `<Button variant="secondary">`.
 */
const meta: Meta<typeof ErrorState> = {
  title: "Kit/Primitives/ErrorState",
  component: ErrorState,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof ErrorState>;

export const Rest: Story = {
  name: "Default (load failed + Retry) — ARTBOARD 9UT-0",
  play: async ({ canvasElement }) => {
    const alert = within(canvasElement).getByRole("alert");
    await expect(alert).toBeInTheDocument();
    const retry = within(alert).getByRole("button", { name: "Retry" });
    await expect(retry).toBeInTheDocument();
  },
};

export const CustomCopy: Story = {
  name: "Custom title / description",
  args: {
    title: "Couldn't reconcile payments",
    description: "The financials service is unreachable. Retry in a moment.",
    retryLabel: "Try again",
  },
};

export const NoRetry: Story = {
  name: "No retry action",
  args: { retryLabel: "" },
};
