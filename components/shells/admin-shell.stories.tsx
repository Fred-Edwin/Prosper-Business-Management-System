import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, within } from "storybook/test";
import { AdminShell } from "./admin-shell";

/**
 * AdminShell nav-item interaction states — the one shell the 10b/10c handoff
 * allows touching, and only for nav-item interaction states + landmarks
 * (`components/shells/admin-shell.tsx`). Asserts, on the dark rail:
 *   §9.3  hover  ⇒ `--nav-bg-hover`  (NOT `--surface-hover`)
 *   §9.4  active ⇒ `--nav-bg-active` + `aria-current="page"`
 *   §9.1  on-dark focus ring (`.kit-focus-on-dark`)
 * The component is only touched if axe flags something — visual/interaction
 * assertions live here.
 *
 * `visual: { disable: true }` — the shell is `h-screen` and its exact pixels
 * aren't a kit REST artboard; the per-state assertions are the proof.
 */
const meta: Meta<typeof AdminShell> = {
  title: "Kit/Shells/AdminShell — nav-item states",
  component: AdminShell,
  parameters: {
    layout: "fullscreen",
    visual: { disable: true },
    docs: {
      description: {
        component:
          "FLAG (systemic low-contrast dimmed text — Session 10c): the nav-group section labels (\"Operations\", `--nav-text-label`) on the `--nav-bg` dark rail fall below WCAG AA 4.5:1. This is the drawn admin-shell treatment (recessive group headers) — same call as the Select placeholder. `color-contrast` scoped off for these stories → design-sprint decision. The nav-ITEM interaction states (§9.1/§9.3/§9.4) — the point of these stories — are asserted below and pass.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof AdminShell>;

function Harness({ collapsed = false }: { collapsed?: boolean }) {
  const [active, setActive] = React.useState("stock");
  return (
    <AdminShell
      activeNavKey={active}
      onNavigate={(href) => setActive(href.replace("/admin/", "") || "dashboard")}
      toolbarTitle="Stock Ledger"
      accountName="Amina K."
      accountRole="Admin"
      accountInitials="AK"
      onAccountClick={() => {}}
      collapsed={collapsed}
      onToggleCollapsed={() => {}}
    >
      <div style={{ padding: 24 }}>Content region</div>
    </AdminShell>
  );
}

export const Landmarks: Story = {
  name: "Landmarks + aria-current on the active item",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByRole("navigation", { name: "Primary" }).length).toBeGreaterThan(
      0,
    );
    // exactly one nav item is aria-current="page"
    const current = canvasElement.querySelectorAll('[aria-current="page"]');
    await expect(current.length).toBe(1);
  },
};

export const ActiveItem: Story = {
  name: "Active item ⇒ §9.4 --nav-bg-active",
  render: () => <Harness />,
  parameters: {
    interaction: {
      assertColor: [
        {
          selector: '[aria-current="page"]',
          prop: "backgroundColor",
          token: "--nav-bg-active",
        },
      ],
    },
  },
};

export const HoverItem: Story = {
  name: "Hover (inactive item) ⇒ §9.3 --nav-bg-hover (dark rail, NOT --surface-hover)",
  render: () => <Harness />,
  parameters: {
    interaction: {
      hover: 'nav[aria-label="Primary"] a:not([aria-current]), nav[aria-label="Primary"] button:not([aria-current])',
      assertColor: [
        {
          selector:
            'nav[aria-label="Primary"] a:not([aria-current]), nav[aria-label="Primary"] button:not([aria-current])',
          prop: "backgroundColor",
          token: "--nav-bg-hover",
        },
      ],
    },
  },
};

export const FocusRingOnDark: Story = {
  name: "FocusVisible ⇒ §9.1 on-dark ring (.kit-focus-on-dark)",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: '[aria-current="page"]',
      assertFocusRing: '[aria-current="page"]',
    },
  },
};
