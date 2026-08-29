import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Spinner } from "./spinner";

/**
 * NEW primitive (Session 10 Deliverable 3d) — `kit-audit.md §3`.
 * Mechanical wrapper over the existing `.kit-spinner` §9.10 CSS + `role="status"`
 * + a visually-hidden label. No Paper artboard. ADR-43 treats it as accepted;
 * this story is the visible proof.
 */
const meta = {
  title: "Kit/Primitives/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
  args: { size: "sm", label: "Loading" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md"] } },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rest: Story = {
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole("status");
    await expect(status).toBeInTheDocument();
    await expect(status).toHaveClass("kit-spinner");
    // visually-hidden label present for SR users
    await expect(within(status).getByText("Loading")).toBeInTheDocument();
  },
};

export const SizeMd: Story = { name: "Size md (--icon-md)", args: { size: "md" } };

export const OnDark: Story = {
  name: "On a dark surface (currentColor)",
  parameters: { backgrounds: { default: "nav-bg" } },
  render: (args) => (
    <span style={{ color: "#FFFFFF" }}>
      <Spinner {...args} />
    </span>
  ),
};
