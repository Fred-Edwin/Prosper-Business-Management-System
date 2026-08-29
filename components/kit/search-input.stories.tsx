import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { SearchInput } from "./search-input";

/**
 * C8 SearchInput — `component-states.md §2 C8`. default / focus / filled+clear.
 * Never disabled in M1. Session 10: aria-label ("Search"), role="search"
 * landmark, Esc-to-clear.
 */
const meta: Meta<typeof SearchInput> = {
  title: "Kit/SearchInput",
  component: SearchInput,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

function Harness({ start = "" }: { start?: string }) {
  const [v, setV] = React.useState(start);
  return <SearchInput value={v} onChange={setV} />;
}

export const Rest: Story = {
  name: "Default (placeholder)",
  render: () => <Harness />,
  play: async ({ canvasElement }) => {
    // has an accessible name even with no visible label
    await expect(
      within(canvasElement).getByRole("searchbox", { name: "Search" }),
    ).toBeInTheDocument();
  },
};

export const FocusBorder: Story = {
  name: "Focus ⇒ §9.2 accent border",
  render: () => <Harness start="beef" />,
  parameters: {
    interaction: {
      focus: "input",
      assertColor: [
        {
          selector: '[role="search"]',
          prop: "borderColor",
          token: "--color-accent",
        },
      ],
    },
  },
};

export const FilledWithClear: Story = {
  name: "Filled ⇒ value + ✕ clear affordance",
  render: () => <Harness start="Beef Fillet" />,
  play: async ({ canvasElement }) => {
    const clear = within(canvasElement).getByRole("button", {
      name: "Clear search",
    });
    await expect(clear).toBeInTheDocument();
    await userEvent.click(clear);
    await expect(
      within(canvasElement).getByRole("searchbox"),
    ).toHaveValue("");
  },
};

export const EscClears: Story = {
  name: "Esc clears when filled (APG search)",
  render: () => <Harness start="rice" />,
  play: async ({ canvasElement }) => {
    const box = within(canvasElement).getByRole("searchbox");
    box.focus();
    await userEvent.keyboard("{Escape}");
    await expect(box).toHaveValue("");
  },
};
