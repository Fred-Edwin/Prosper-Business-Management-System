import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { ToastProvider, useToast, type ToastPlacement } from "./toast";

/**
 * NEW primitive (Session 10 Deliverable 3d) — `kit-audit.md §3`, ADR-43 (DRAFT).
 *
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║ OWNER SIGN-OFF NEEDED (kit-audit "Remaining gaps" #2)                 ║
 * ║  · placement: top-right (admin/desktop) vs bottom-center (staff)     ║
 * ║  · stack cap = 4 visible, older ones drop                            ║
 * ║  · auto-dismiss 4000ms, PAUSED on hover / focus (WCAG 2.2.1)         ║
 * ║  · tone: info (neutral) / success / danger — hairline left border    ║
 * ║  · slide + fade, no bounce, NO reduced-motion special-casing (D4)   ║
 * ║ Approve as-is, or adjust any of the above.                           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 */
const meta = {
  title: "Kit/Primitives/Toast — NEEDS OWNER REVIEW",
  parameters: {
    layout: "fullscreen",
    // The portal renders to document.body, outside #storybook-root — the
    // visual snapshot of #storybook-root would miss it. Assert via play instead.
    visual: { disable: true },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function Demo({
  placement,
  fire,
}: {
  placement: ToastPlacement;
  fire: { message: string; tone?: "info" | "success" | "danger"; duration?: number }[];
}) {
  return (
    <ToastProvider placement={placement}>
      <FireOnMount fire={fire} />
      <div style={{ padding: 24, fontFamily: "var(--font-ui)" }}>
        Toast demo — placement: <strong>{placement}</strong>
      </div>
    </ToastProvider>
  );
}

function FireOnMount({
  fire,
}: {
  fire: { message: string; tone?: "info" | "success" | "danger"; duration?: number }[];
}) {
  const { toast } = useToast();
  React.useEffect(() => {
    for (const f of fire) toast(f.message, { tone: f.tone, duration: f.duration });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

export const TopRight_Admin: Story = {
  name: "Placement: top-right (admin) — info / success / danger",
  render: () => (
    <Demo
      placement="top-right"
      fire={[
        { message: "Draft saved.", tone: "info", duration: 0 },
        { message: "Correction saved.", tone: "success", duration: 0 },
        { message: "Could not reach the server.", tone: "danger", duration: 0 },
      ]}
    />
  ),
  play: async () => {
    const body = within(document.body);
    const region = body.getByRole("status");
    await expect(region).toHaveClass(/top-/);
    await expect(region).toHaveClass(/right-/);
    await expect(body.getByText("Correction saved.")).toBeInTheDocument();
    await expect(body.getByText("Could not reach the server.")).toBeInTheDocument();
  },
};

export const BottomCenter_Staff: Story = {
  name: "Placement: bottom-center (staff)",
  render: () => (
    <Demo
      placement="bottom-center"
      fire={[{ message: "Stock issued.", tone: "success", duration: 0 }]}
    />
  ),
  play: async () => {
    const region = within(document.body).getByRole("status");
    await expect(region).toHaveClass(/bottom-/);
    await expect(region).toHaveClass(/items-center/);
  },
};

export const StackCap: Story = {
  name: "Stack cap = 4 visible (6 fired → 4 shown)",
  render: () => (
    <Demo
      placement="top-right"
      fire={[1, 2, 3, 4, 5, 6].map((n) => ({
        message: `Message ${n}`,
        tone: "info" as const,
        duration: 0,
      }))}
    />
  ),
  play: async () => {
    const region = within(document.body).getByRole("status");
    // 4 toast items (each is a div with role button "Dismiss" inside)
    const dismissers = within(region).getAllByRole("button", { name: "Dismiss" });
    await expect(dismissers).toHaveLength(4);
    // newest kept, oldest dropped
    await expect(within(region).queryByText("Message 1")).toBeNull();
    await expect(within(region).getByText("Message 6")).toBeInTheDocument();
  },
};

export const AutoDismiss: Story = {
  name: "Auto-dismiss after `duration`",
  render: () => (
    <Demo
      placement="top-right"
      fire={[{ message: "Auto-goes away", tone: "info", duration: 400 }]}
    />
  ),
  play: async () => {
    const region = within(document.body).getByRole("status");
    await expect(within(region).getByText("Auto-goes away")).toBeInTheDocument();
    await waitFor(
      () => expect(within(region).queryByText("Auto-goes away")).toBeNull(),
      { timeout: 3000 },
    );
  },
};

export const PauseOnHover: Story = {
  name: "Paused while hovered (WCAG 2.2.1) — user can extend",
  render: () => (
    <Demo
      placement="top-right"
      fire={[{ message: "Sticky while hovered", tone: "info", duration: 400 }]}
    />
  ),
  play: async () => {
    const region = within(document.body).getByRole("status");
    // the stack container is pointer-events:none; hover an actual toast item
    // (pointer-events:auto) — onMouseEnter bubbles to the region and pauses.
    const item = within(region).getByText("Sticky while hovered").closest("div")!;
    await userEvent.hover(item);
    await new Promise((r) => setTimeout(r, 1200));
    await expect(
      within(region).getByText("Sticky while hovered"),
    ).toBeInTheDocument();
  },
};
