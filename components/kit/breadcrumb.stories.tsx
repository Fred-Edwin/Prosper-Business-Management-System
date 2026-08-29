import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { Breadcrumb } from "./breadcrumb";

/**
 * C29 Breadcrumb — `component-states.md §2 C29` (state-complete). parent link /
 * current. `aria-hidden` "/" separator; `aria-current="page"` on the last item;
 * link hover (underline + `--text-primary`) is the §9 global.
 */
const meta: Meta<typeof Breadcrumb> = {
  title: "Kit/Primitives/Breadcrumb",
  component: Breadcrumb,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

const ITEMS = [
  { label: "Stock", href: "#stock" },
  { label: "Opening Stock", href: "#opening" },
  { label: "Bulk Grid" },
];

export const Rest: Story = {
  name: "Default (parent links / current) — ARTBOARD 6XV-0",
  args: { items: ITEMS },
  parameters: {
    docs: {
      description: {
        story:
          "FLAG (systemic low-contrast dimmed text — Session 10c): the parent-link colour is `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1, below WCAG AA 4.5:1. This matches the drawn `6XV-0` (dimmed = intentionally recessive) and is the same call as the Select placeholder / DatePicker out-of-month cells. `color-contrast` is scoped off here with this note → design-sprint decision (darken parent links to `--text-secondary`, or accept as incidental navigation text).",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // last item is the current page, not a link
    const current = c.getByText("Bulk Grid");
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(current.tagName).toBe("SPAN");
    // separators are decorative
    for (const sep of canvasElement.querySelectorAll("span[aria-hidden]")) {
      await expect(sep).toHaveTextContent("/");
    }
    // parent items are real links
    await expect(c.getByRole("link", { name: "Stock" })).toHaveAttribute("href");
  },
};

export const LinkHover: Story = {
  name: "Link hover ⇒ §9 global underline + --text-primary",
  args: { items: ITEMS },
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
    interaction: {
      hover: "a",
      assertColor: [
        { selector: "a", prop: "color", token: "--text-primary" },
      ],
    },
  },
};

export const TwoLevel: Story = {
  name: "Two levels (parent / current)",
  args: { items: [{ label: "Assets", href: "#a" }, { label: "Beef Fillet" }] },
  parameters: {
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};
