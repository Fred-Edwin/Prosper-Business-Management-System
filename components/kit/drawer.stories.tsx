import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { Drawer } from "./drawer";
import { Button } from "./button";
import { TextInput } from "./text-input";

/**
 * C18 Drawer — `component-states.md §2 C18`, `kit-audit.md §1`.
 * shell / open (veil behind) / footer primary-disabled / submitting / scrolled.
 * Session 10 gave it the full overlay contract (scrim + blur + opaque panel +
 * focus-trap + scroll-lock + inert bg + focus-restore + single-overlay guard +
 * slide). `panel` and `rail` variants.
 *
 * The overlay portals to <body>, outside #storybook-root — visual snapshot of
 * the root would miss it, so these stories `visual: { disable: true }` and
 * prove the contract via `play` against document.body.
 */
const meta: Meta<typeof Drawer> = {
  title: "Kit/Drawer",
  component: Drawer,
  parameters: { layout: "fullscreen", visual: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

function Harness({
  variant,
  footerDisabled,
  submitting,
}: {
  variant?: "panel" | "rail";
  footerDisabled?: boolean;
  submitting?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => setOpen(true)}>Open drawer</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Edit product"
        subtitle={variant === "rail" ? "Store · Beef Fillet · Aug 24" : undefined}
        variant={variant}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={submitting} disabled={footerDisabled}>
              Save changes
            </Button>
          </>
        }
      >
        <TextInput label="Product name" defaultValue="Beef Fillet" />
      </Drawer>
    </div>
  );
}

async function openDrawer() {
  await userEvent.click(
    within(document.body).getByRole("button", { name: "Open drawer" }),
  );
  return waitFor(() => within(document.body).getByRole("dialog"));
}

export const Shell: Story = {
  name: "Shell (panel — header / body / footer)",
  render: () => <Harness />,
  play: async () => {
    const dialog = await openDrawer();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-labelledby");
  },
};

export const Rail: Story = {
  name: "Rail variant (ADR-37b — docked, subtitle header)",
  render: () => <Harness variant="rail" />,
  play: async () => {
    const dialog = await openDrawer();
    await expect(dialog).toHaveAttribute("aria-describedby"); // subtitle wired
  },
};

export const OverlayContract: Story = {
  name: "Open ⇒ scrim+blur, focus trapped, <html> locked, Esc restores focus",
  render: () => <Harness />,
  play: async () => {
    const opener = within(document.body).getByRole("button", {
      name: "Open drawer",
    });
    await userEvent.click(opener);
    const dialog = await waitFor(() =>
      within(document.body).getByRole("dialog"),
    );

    // scrim present with a backdrop blur
    const scrim = document.body.querySelector(".kit-scrim")!;
    await expect(scrim).toBeInTheDocument();
    const scrimCS = getComputedStyle(scrim);
    await expect(
      scrimCS.backdropFilter || scrimCS.getPropertyValue("-webkit-backdrop-filter"),
    ).toContain("blur");

    // scroll-lock on <html> (assert the inline style the hook sets — the
    // `overflow` shorthand can compute to "visible" in Chromium even when set)
    await waitFor(() =>
      expect(document.documentElement.style.overflow).toBe("hidden"),
    );

    // focus is inside the panel
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    // Esc starts the close (exit transition → unmount). Wait for full unmount,
    // then for focus-restore + scroll-lock release (both happen post-cleanup).
    await userEvent.keyboard("{Escape}");
    await waitFor(
      () => expect(within(document.body).queryByRole("dialog")).toBeNull(),
      { timeout: 4000 },
    );
    await waitFor(() => expect(opener).toHaveFocus());
    await waitFor(() =>
      expect(document.documentElement.style.overflow).not.toBe("hidden"),
    );
  },
};

export const FocusTrapWraps: Story = {
  name: "Tab past the last focusable wraps back into the panel (trap)",
  render: () => <Harness />,
  play: async () => {
    await openDrawer();
    const dialog = within(document.body).getByRole("dialog");
    const focusables = [
      ...dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]',
      ),
    ];
    const last = focusables[focusables.length - 1];
    // Tab off the last focusable → focus stays inside the panel (wraps)
    last.focus();
    await userEvent.tab();
    await expect(dialog.contains(document.activeElement)).toBe(true);
    // Shift+Tab off the first → also stays inside
    focusables[0].focus();
    await userEvent.tab({ shift: true });
    await expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

export const FooterPrimaryDisabled: Story = {
  name: "Footer: primary disabled (form invalid / no changes) — ARTBOARD",
  render: () => <Harness footerDisabled />,
  play: async () => {
    await openDrawer();
    const save = within(document.body).getByRole("button", {
      name: "Save changes",
    });
    await expect(save).toBeDisabled();
  },
};

export const FooterSubmitting: Story = {
  name: "Footer: submitting (primary-loading) — GLOBAL",
  render: () => <Harness submitting />,
  play: async () => {
    await openDrawer();
    const save = within(document.body).getByRole("button", {
      name: /Save changes/,
    });
    await expect(save).toHaveAttribute("aria-busy", "true");
  },
};
