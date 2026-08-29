import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { BottomSheet, type BottomSheetState } from "./bottom-sheet";
import { Button } from "./button";

/**
 * C19 BottomSheet — `component-states.md §2 C19`. peek / open / dragging /
 * backdrop. Same overlay contract as Drawer; slides up from the bottom. The
 * grab handle is a real <button> (Space/Enter steps down).
 * Portals to <body> → `visual: { disable: true }`.
 */
const meta: Meta<typeof BottomSheet> = {
  title: "Kit/BottomSheet",
  component: BottomSheet,
  parameters: { layout: "fullscreen", visual: { disable: true } },
};

export default meta;
type Story = StoryObj<typeof BottomSheet>;

function Harness({ start = "closed" }: { start?: BottomSheetState }) {
  const [state, setState] = React.useState<BottomSheetState>(start);
  return (
    <div style={{ padding: 24 }}>
      <Button onClick={() => setState("open")}>Open sheet</Button>
      <Button variant="secondary" onClick={() => setState("peek")}>
        Peek
      </Button>
      <BottomSheet
        state={state}
        onStateChange={setState}
        title="Add product"
        peekContent={<div style={{ fontFamily: "var(--font-ui)" }}>Quick lookup</div>}
      >
        <div style={{ padding: 16, fontFamily: "var(--font-ui)" }}>
          Full task content
        </div>
      </BottomSheet>
    </div>
  );
}

export const Open: Story = {
  name: "Open (full task) — ARTBOARD",
  render: () => <Harness />,
  play: async () => {
    await userEvent.click(
      within(document.body).getByRole("button", { name: "Open sheet" }),
    );
    const dialog = await waitFor(() =>
      within(document.body).getByRole("dialog"),
    );
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(within(dialog).getByText("Full task content")).toBeVisible();
  },
};

export const Peek: Story = {
  name: "Peek (in-context lookup) — ARTBOARD",
  render: () => <Harness />,
  play: async () => {
    await userEvent.click(
      within(document.body).getByRole("button", { name: "Peek" }),
    );
    const dialog = await waitFor(() =>
      within(document.body).getByRole("dialog"),
    );
    await expect(within(dialog).getByText("Quick lookup")).toBeVisible();
  },
};

export const BackdropAndContract: Story = {
  name: "Backdrop ⇒ scrim+blur; Esc closes; focus trapped",
  render: () => <Harness />,
  play: async () => {
    const opener = within(document.body).getByRole("button", {
      name: "Open sheet",
    });
    await userEvent.click(opener);
    const dialog = await waitFor(() =>
      within(document.body).getByRole("dialog"),
    );
    const scrim = document.body.querySelector(".kit-scrim")!;
    const cs = getComputedStyle(scrim);
    await expect(cs.backdropFilter || cs.getPropertyValue("-webkit-backdrop-filter")).toContain("blur");
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

export const HandleKeyboardStepsDown: Story = {
  name: "Grab handle (button): Enter steps open → peek",
  render: () => <Harness start="open" />,
  play: async () => {
    const dialog = within(document.body).getByRole("dialog");
    const handle = within(dialog).getByRole("button", { name: "Collapse" });
    handle.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() =>
      expect(within(document.body).getByText("Quick lookup")).toBeVisible(),
    );
  },
};
