import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { FrictionDeleteDialog } from "./friction-delete-dialog";
import { Button } from "./button";

/**
 * C17 FrictionDeleteDialog — `component-states.md §2 C17`, `kit-audit.md §1`.
 * pending / confirmed / retype-mismatch / submitting. Full overlay contract;
 * field neutral→danger on mismatch; footer composes <Button>. ADR-36c props.
 * Portals to <body> → `visual: { disable: true }`, proven via play.
 */
const meta: Meta<typeof FrictionDeleteDialog> = {
  title: "Kit/FrictionDeleteDialog",
  component: FrictionDeleteDialog,
  parameters: { layout: "fullscreen", visual: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof FrictionDeleteDialog>;

const NAME = "Commercial Deep Fryer Double";

function Harness({ submitting }: { submitting?: boolean }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div style={{ padding: 24 }}>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Delete record
      </Button>
      <FrictionDeleteDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        recordName={NAME}
        submitting={submitting}
      />
    </div>
  );
}

async function openDialog() {
  await userEvent.click(
    within(document.body).getByRole("button", { name: "Delete record" }),
  );
  return waitFor(() => within(document.body).getByRole("alertdialog"));
}

export const Pending: Story = {
  name: "Pending (retype empty → confirm disabled, field neutral)",
  render: () => <Harness />,
  play: async () => {
    const d = await openDialog();
    const confirm = within(d).getByRole("button", { name: "Permanently Delete" });
    await expect(confirm).toBeDisabled();
    const field = within(d).getByRole("textbox");
    // neutral border (no data-invalid) until a non-matching value is typed
    await expect(field.closest("[data-invalid]")).toBeNull();
  },
};

export const RetypeMismatch: Story = {
  name: "Retype mismatch ⇒ §9.8 danger field + helper, confirm stays disabled",
  render: () => <Harness />,
  play: async () => {
    const d = await openDialog();
    const field = within(d).getByRole("textbox");
    await userEvent.type(field, "wrong name");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const help = within(d).getByText(/name doesn.t match/i);
    await expect(field).toHaveAttribute("aria-describedby", help.id);
    await expect(
      within(d).getByRole("button", { name: "Permanently Delete" }),
    ).toBeDisabled();
  },
};

export const Confirmed: Story = {
  name: "Confirmed (typed string matches → confirm enabled)",
  render: () => <Harness />,
  play: async () => {
    const d = await openDialog();
    const field = within(d).getByRole("textbox");
    await userEvent.type(field, NAME);
    await expect(field).not.toHaveAttribute("aria-invalid");
    await expect(
      within(d).getByRole("button", { name: "Permanently Delete" }),
    ).toBeEnabled();
  },
};

export const Submitting: Story = {
  name: "Submitting (destructive-loading, everything locks)",
  render: () => <Harness submitting />,
  play: async () => {
    const d = await openDialog();
    const confirm = within(d).getByRole("button", { name: /Permanently Delete/ });
    await expect(confirm).toHaveAttribute("aria-busy", "true");
    await expect(
      within(d).getByRole("button", { name: "Cancel" }),
    ).toBeDisabled();
  },
};

export const OverlayContract: Story = {
  name: "Open ⇒ scrim+blur, focus on the field, Esc restores focus",
  render: () => <Harness />,
  play: async () => {
    const opener = within(document.body).getByRole("button", {
      name: "Delete record",
    });
    await userEvent.click(opener);
    const d = await waitFor(() =>
      within(document.body).getByRole("alertdialog"),
    );
    const scrim = document.body.querySelector(".kit-scrim")!;
    const cs = getComputedStyle(scrim);
    await expect(cs.backdropFilter || cs.getPropertyValue("-webkit-backdrop-filter")).toContain("blur");
    await waitFor(() => expect(d.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(within(document.body).queryByRole("alertdialog")).toBeNull(),
    );
    await waitFor(() => expect(opener).toHaveFocus());
  },
};
