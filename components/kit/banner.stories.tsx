import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { TransferBanner, PurchaseDeliveryBanner } from "./banner";

/**
 * C22 Transfer / Purchase-Delivery banner — `component-states.md §2 C22`,
 * `kit-audit.md`. transfer (amber) / purchase-delivery (blue) pinned /
 * Accept + Flag actions / flagged (muted status line, actions removed).
 *
 * OWNER REVIEW (kit-audit "Remaining gaps" #7 — ratified this session): the
 * Accept button's filled hover uses the new `--color-success-hover`
 * (Transfer) / `--color-info-hover` (Purchase-Delivery) tokens. The
 * `HoverAccept*` stories assert exactly that.
 *
 * `role="region"` with the title as its accessible name (persistent pinned
 * banner with actions).
 */
const meta: Meta<typeof TransferBanner> = {
  title: "Kit/Banner — NEEDS OWNER REVIEW",
  component: TransferBanner,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "FLAG (systemic semantic-colour text contrast — Session 10c): the banner heading is `--color-warning` / `--color-info` on its tinted background (the drawn `6SG-0` / `9Q9-0` visual), below WCAG AA 4.5:1 for the heading text. The detail line is `--text-secondary` (passes). `color-contrast` scoped off → design-sprint decision (darker on-tint heading tokens).",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof TransferBanner>;

const transferArgs = {
  title: "Incoming transfer from Canteen",
  detail: "Rice · 12.0 kg · sent 09:30 by Joseph",
  primaryLabel: "Accept & Receive",
};

const deliveryArgs = {
  title: "Purchase delivery pending",
  detail: "Cooking Oil · 40.0 L · PO-2043",
  primaryLabel: "Accept & Receive",
};

export const Transfer: Story = {
  name: "Transfer variant (amber) — pinned — ARTBOARD 6SG-0",
  args: transferArgs,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      c.getByRole("region", { name: "Incoming transfer from Canteen" }),
    ).toBeInTheDocument();
    await expect(
      c.getByRole("button", { name: "Accept & Receive" }),
    ).toBeInTheDocument();
    await expect(
      c.getByRole("button", { name: "Flag Variance" }),
    ).toBeInTheDocument();
  },
};

export const PurchaseDelivery: Story = {
  name: "Purchase-Delivery variant (blue) — pinned — ARTBOARD 9Q9-0",
  render: (args) => <PurchaseDeliveryBanner {...args} />,
  args: deliveryArgs,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("region", {
        name: "Purchase delivery pending",
      }),
    ).toBeInTheDocument();
  },
};

export const HoverAcceptTransfer: Story = {
  name: "Hover Accept (Transfer) ⇒ --color-success-hover",
  args: transferArgs,
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    interaction: {
      hover: "button:first-of-type",
      assertColor: [
        {
          selector: "button:first-of-type",
          prop: "backgroundColor",
          token: "--color-success-hover",
        },
      ],
    },
  },
};

export const HoverAcceptDelivery: Story = {
  name: "Hover Accept (Purchase-Delivery) ⇒ --color-info-hover",
  render: (args) => <PurchaseDeliveryBanner {...args} />,
  args: deliveryArgs,
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    interaction: {
      hover: "button:first-of-type",
      assertColor: [
        {
          selector: "button:first-of-type",
          prop: "backgroundColor",
          token: "--color-info-hover",
        },
      ],
    },
  },
};

export const Flagged: Story = {
  name: "Flagged ⇒ actions removed, muted status line — ARTBOARD 9QL-0",
  args: { ...transferArgs, flagged: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("button")).toBeNull();
    await expect(c.getByText(/Flagged — awaiting admin/)).toBeInTheDocument();
  },
};
