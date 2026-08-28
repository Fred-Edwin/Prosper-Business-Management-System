import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Button } from "./button";

/**
 * C1 Button — `component-states.md §2 C1`, `kit-audit.md §1`.
 *
 * OWNER REVIEW (kit-audit "Remaining gaps" #6): the `size` prop is NEW.
 * `md` (36px) is byte-identical to the sole Paper artboard (`6BR-0`);
 * `sm` (32) / `lg` (44) have no artboard. See the `Sizes` story.
 *
 * Interaction-state colour assertions run in `.storybook/test-runner.ts`
 * `postVisit` via `parameters.interaction` — a real Playwright hover/focus
 * plus a computed-style-vs-token check (the permanent form of Session 9's
 * Gate-2 probe). `play` here only covers non-CSS behaviour.
 */
const meta = {
  title: "Kit/Button",
  component: Button,
  parameters: { layout: "centered" },
  args: { children: "Save changes", variant: "primary", size: "md" },
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["primary", "secondary", "tertiary", "destructive"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── REST — the four artboard variants ──────────────────────────────────

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = {
  args: { variant: "secondary", children: "Cancel" },
};
export const Tertiary: Story = {
  args: { variant: "tertiary", children: "View details" },
};
export const Destructive: Story = {
  args: { variant: "destructive", children: "Permanently delete" },
};

// ── variant × size (handoff 4b: "every variant × size") ────────────────

export const Sizes: Story = {
  name: "Sizes (sm / md / lg) — NEW, needs owner review",
  parameters: {
    docs: {
      description: {
        story:
          "OWNER SIGN-OFF: `md` is the only drawn artboard and is byte-identical to it. `sm` (--control-sm, 32px) and `lg` (--control-lg, 44px) are proposed for Session 11 toolbar/sticky-bar density. Approve, adjust the two heights, or reject `sm`/`lg` entirely.",
      },
    },
  },
  render: (args) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

export const AllVariants: Story = {
  name: "All variants (REST row — matches 6BR-0)",
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Button variant="primary">Save changes</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="tertiary">View details</Button>
      <Button variant="destructive">Permanently delete</Button>
    </div>
  ),
};

// ── Interaction states — assertions in postVisit (parameters.interaction) ─

export const HoverPrimary: Story = {
  name: "Hover (primary) ⇒ --color-accent-hover",
  args: { variant: "primary" },
  parameters: {
    interaction: {
      hover: "button",
      assertColor: [
        {
          selector: "button",
          prop: "backgroundColor",
          token: "--color-accent-hover",
        },
      ],
    },
  },
};

export const HoverDestructive: Story = {
  name: "Hover (destructive) ⇒ --color-danger-hover",
  args: { variant: "destructive", children: "Permanently delete" },
  parameters: {
    interaction: {
      hover: "button",
      assertColor: [
        {
          selector: "button",
          prop: "backgroundColor",
          token: "--color-danger-hover",
        },
      ],
    },
  },
};

export const HoverSecondary: Story = {
  name: "Hover (secondary) ⇒ --surface-hover",
  args: { variant: "secondary", children: "Cancel" },
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
  parameters: {
    interaction: { focus: "button", assertFocusRing: "button" },
  },
};

export const Disabled: Story = {
  name: "Disabled ⇒ §9.7 opacity, no pointer",
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button");
    await expect(btn).toBeDisabled();
    const cs = getComputedStyle(btn);
    await expect(cs.pointerEvents).toBe("none");
    await expect(Number(cs.opacity)).toBeLessThan(1);
  },
};

export const LoadingPrimary: Story = {
  name: "Loading (primary) ⇒ §9.10 dim + spinner, width held",
  args: { loading: true },
  play: async ({ canvasElement }) => {
    const btn = within(canvasElement).getByRole("button");
    await expect(btn).toHaveAttribute("aria-busy", "true");
    await expect(btn).toHaveAttribute("data-loading");
    await expect(within(btn).getByRole("status")).toBeInTheDocument();
    await expect(getComputedStyle(btn).pointerEvents).toBe("none");
    const label = btn.querySelector("span:last-child")!;
    await expect(getComputedStyle(label).display).not.toBe("none");
  },
};

export const LoadingDestructive: Story = {
  name: "Loading (destructive)",
  args: { loading: true, variant: "destructive", children: "Deleting…" },
};
