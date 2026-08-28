import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { MobileNavDrawer } from "@/components/shells/mobile-nav-drawer";

/**
 * MobileNavDrawer (`components/shells/`) — nav interaction states are kit-level,
 * and it is an overlay. `kit-audit.md §1` "MobileNavDrawer": same overlay
 * contract as Drawer (scrim + blur + trap + scroll-lock + inert + restore +
 * single-overlay guard + slide-in), plus `--kit-hover-bg: --nav-bg-hover` on
 * the dark nav rows, `<nav>` landmark, `aria-current` on the active row.
 *
 * This story does NOT modify the component — it renders and asserts the
 * shipped contract. Portals to <body> → `visual: { disable: true }`.
 */
const meta: Meta<typeof MobileNavDrawer> = {
  title: "Kit/MobileNavDrawer",
  component: MobileNavDrawer,
  parameters: { layout: "fullscreen", visual: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof MobileNavDrawer>;

function Harness() {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ padding: 24 }}>
      <button type="button" onClick={() => setOpen(true)}>
        Open menu
      </button>
      <MobileNavDrawer
        open={open}
        onClose={() => setOpen(false)}
        activeNavKey="dashboard"
        onNavigate={() => setOpen(false)}
        brandLabel="Prosper"
        brandSubLabel="Kilimani Branch"
        accountName="Amina Wanjiru"
        accountRole="Admin"
        accountInitials="AW"
        onAccountClick={() => {}}
      />
    </div>
  );
}

export const Open: Story = {
  render: () => <Harness />,
  play: async () => {
    await userEvent.click(
      within(document.body).getByRole("button", { name: "Open menu" }),
    );
    const dialog = await waitFor(() =>
      within(document.body).getByRole("dialog"),
    );
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    // nav landmark inside
    const nav = within(dialog).getByRole("navigation", { name: /destinations/i });
    await expect(nav).toBeInTheDocument();
    // active row marked (rows are <button>s, not links)
    const current = within(nav).getByRole("button", { current: "page" });
    await expect(current).toBeInTheDocument();
  },
};

export const OverlayContract: Story = {
  name: "scrim+blur, focus trapped, Esc restores focus to opener",
  render: () => <Harness />,
  play: async () => {
    const opener = within(document.body).getByRole("button", {
      name: "Open menu",
    });
    await userEvent.click(opener);
    const dialog = await waitFor(() =>
      within(document.body).getByRole("dialog"),
    );
    const scrim = document.body.querySelector(".kit-scrim")!;
    const cs = getComputedStyle(scrim);
    await expect(
      cs.backdropFilter || cs.getPropertyValue("-webkit-backdrop-filter"),
    ).toContain("blur");
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("dialog")).toBeNull(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
  },
};

export const NavRowsTintOnDark: Story = {
  name: "Nav rows set --kit-hover-bg: --nav-bg-hover (dark-surface tint)",
  render: () => <Harness />,
  play: async () => {
    await userEvent.click(
      within(document.body).getByRole("button", { name: "Open menu" }),
    );
    const dialog = await waitFor(() =>
      within(document.body).getByRole("dialog"),
    );
    // every nav row declares the dark-surface hover custom property (not the
    // light --surface-hover default) — assert the resolved custom prop.
    const nav = within(dialog).getByRole("navigation", { name: /destinations/i });
    const rows = within(nav).getAllByRole("button");
    const inactive = rows.find(
      (l) => l.getAttribute("aria-current") !== "page",
    )!;
    const hoverBg = getComputedStyle(inactive)
      .getPropertyValue("--kit-hover-bg")
      .trim();
    // resolve --nav-bg-hover the same way
    const probe = document.createElement("div");
    probe.style.setProperty("color", "var(--nav-bg-hover)");
    dialog.appendChild(probe);
    const navHover = getComputedStyle(probe).color;
    probe.remove();
    const probe2 = document.createElement("div");
    probe2.style.setProperty("color", hoverBg || "transparent");
    dialog.appendChild(probe2);
    const got = getComputedStyle(probe2).color;
    probe2.remove();
    await expect(got).toBe(navHover);
  },
};
