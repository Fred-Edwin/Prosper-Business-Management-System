import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, within } from "storybook/test";
import { MatchCard } from "./match-card";

/**
 * C24 MatchCard — `component-states.md §2 C24`. awaiting ("1-Tap Match") /
 * matched / flagged / submitting (`<Button loading>`). Container is
 * `role="listitem"` (it lives in the reconciliation list) — the stories wrap
 * it in a `role="list"` so the ARIA parent requirement is satisfied.
 */
const meta: Meta<typeof MatchCard> = {
  title: "Kit/MatchCard",
  component: MatchCard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic semantic-colour text contrast — Session 10c): the `flagged` result bar is `--color-warning` on `--color-warning-bg` (drawn `9RA-0`), below WCAG AA 4.5:1. Matched (`--color-success` on `--color-success-bg`) is borderline. `color-contrast` scoped off → design-sprint decision.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
  decorators: [
    (Story) => (
      <div role="list">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MatchCard>;

const base = {
  supplier: "Mombasa Fresh Produce",
  details: ["Invoice INV-5521", "Expected  ·  50.0 kg"],
};

export const Awaiting: Story = {
  name: "Awaiting (1-Tap Match & Receive) — ARTBOARD 6ST-0",
  args: {
    ...base,
    status: "awaiting",
    actionLabel: "1-Tap Match & Receive (+50.0 kg)",
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("listitem", { name: base.supplier })).toBeInTheDocument();
    await expect(
      c.getByRole("button", { name: /1-Tap Match & Receive/ }),
    ).toBeEnabled();
    await expect(c.getByText("Paid by Admin")).toBeInTheDocument();
  },
};

export const Submitting: Story = {
  name: "Submitting ⇒ <Button loading> (aria-busy)",
  args: {
    ...base,
    status: "awaiting",
    actionLabel: "Matching…",
    submitting: true,
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("button", { name: /Matching/ }),
    ).toHaveAttribute("aria-busy", "true");
  },
};

export const Matched: Story = {
  name: "Matched (success pill, action removed) — ARTBOARD 9QX-0",
  args: {
    ...base,
    status: "matched",
    resultLabel: "Matched & received  ·  +50.0 kg",
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("button")).toBeNull();
    await expect(c.getByText("Received")).toBeInTheDocument();
  },
};

export const Flagged: Story = {
  name: "Flagged / variance — ARTBOARD 9RA-0",
  // multiline pre-wrap detail line → height varies between baseline write and
  // diff; behaviour (pill + result bar) is the proof, not the pixels.
  parameters: { visual: { disable: true } },
  args: {
    ...base,
    status: "flagged",
    details: ["Invoice INV-5521", "Expected · 50.0 kg\nReceived · 46.5 kg"],
    resultLabel: "Variance flagged  ·  -3.5 kg",
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Variance")).toBeInTheDocument();
  },
};
