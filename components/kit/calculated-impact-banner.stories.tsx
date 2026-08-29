import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { CalculatedImpactBanner } from "./calculated-impact-banner";

/**
 * C23 CalculatedImpactBanner — `component-states.md §2 C23`. Display-only,
 * single visual. `role="status"`, `--color-warning-bg` amber consequence
 * preview (distinct from the neutral InstructionalBanner — §6 D6); icon
 * `aria-hidden`; D5 padding confirmed `--sp-5`.
 */
const meta: Meta<typeof CalculatedImpactBanner> = {
  title: "Kit/Primitives/CalculatedImpactBanner",
  component: CalculatedImpactBanner,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic semantic-colour text contrast — Session 10c): the impact sentence is `--color-warning` on `--color-warning-bg` (the drawn `9K9-0` amber-on-amber treatment) ≈ 3.4:1, below WCAG AA 4.5:1. The icon reinforces the meaning. `color-contrast` scoped off → design-sprint decision (a darker on-amber text token, or accept the banner as a non-critical consequence preview).",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof CalculatedImpactBanner>;

export const Rest: Story = {
  name: "Default (amber, icon + impact sentence) — ARTBOARD 9K9-0",
  args: {
    children:
      "This correction reduces Store beef stock by 3.5 kg. The closing balance for Aug 24 becomes 66.5 kg.",
  },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole("status");
    await expect(status).toBeInTheDocument();
    await expect(status).toHaveTextContent(/reduces Store beef stock by 3.5 kg/);
  },
};
