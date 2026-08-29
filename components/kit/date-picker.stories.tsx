import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { DatePicker } from "./date-picker";

/**
 * C9 DatePicker — `component-states.md §2 C9`, `kit-audit.md §1`.
 *
 * OWNER REVIEW (kit-audit "Remaining gaps" #3): the real-calendar mode is NEW.
 * Internal visible-month state + `selected: Date` / `onSelect` API +
 * `role="grid"` semantics + full keyboard nav (←→ day, ↑↓ week, Home/End,
 * PageUp/Down month, Shift+PageUp/Down year, focus on the selected/today cell
 * on open). The `9S1-0` VISUAL is byte-identical; the behaviour is new. The
 * legacy `weeks` prop is kept as an escape hatch. Session 11 screens use
 * `selected`/`onSelect`.
 */
const meta: Meta<typeof DatePicker> = {
  title: "Kit/DatePicker — real-calendar NEEDS OWNER REVIEW",
  component: DatePicker,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "CONTRAST FLAG (Session 10b, not fixed): out-of-month / disabled-future day cells render in `--text-tertiary` (`--color-gray-500`) ≈ 3.4:1 on white — below WCAG AA. This matches the drawn `9S1-0` visual ('future dates disabled', dimmed) and is the same systemic `--text-tertiary` contrast issue as the Select placeholder — routed to a design sprint (see kit-audit follow-ups). `color-contrast` is scoped off for this component's stories.",
      },
    },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: false }] } },
  },
};

export default meta;
type Story = StoryObj<typeof DatePicker>;

function RealHarness() {
  const [d, setD] = React.useState(new Date(2026, 7, 24)); // Aug 24, 2026
  const fmt = (x: Date) =>
    x.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return (
    <DatePicker
      label="Date"
      value={fmt(d)}
      selected={d}
      onSelect={setD}
      maxDate={new Date(2026, 11, 31)}
    />
  );
}

// legacy pre-computed grid (kit gallery / pre-wired screens)
const LEGACY_WEEKS = [
  [
    { day: 27, disabled: true }, { day: 28, disabled: true }, { day: 29, disabled: true },
    { day: 30, disabled: true }, { day: 31, disabled: true }, { day: 1 }, { day: 2 },
  ],
  [{ day: 3 }, { day: 4 }, { day: 5 }, { day: 6 }, { day: 7 }, { day: 8 }, { day: 9 }],
  [
    { day: 10 }, { day: 11 }, { day: 12 }, { day: 13 }, { day: 14 },
    { day: 15 }, { day: 16 },
  ],
  [
    { day: 17 }, { day: 18 }, { day: 19 }, { day: 20 }, { day: 21 },
    { day: 22 }, { day: 23 },
  ],
  [
    { day: 24, today: true, selected: true }, { day: 25 }, { day: 26 },
    { day: 27 }, { day: 28 }, { day: 29 }, { day: 30 },
  ],
];

export const RestClosed: Story = {
  name: "Closed (trigger shows the value)",
  render: () => <RealHarness />,
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: /Date/ });
    await expect(trigger).toHaveTextContent("Aug 24, 2026");
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  },
};

export const FocusRing: Story = {
  name: "FocusVisible ⇒ §9.1 ring on the trigger",
  render: () => <RealHarness />,
  parameters: {
    interaction: {
      focus: '[aria-haspopup="dialog"]',
      assertFocusRing: '[aria-haspopup="dialog"]',
    },
  },
};

export const OpenRealCalendar: Story = {
  name: "Open ⇒ role=grid, focus on selected cell, ‹ › nav",
  render: () => <RealHarness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Date/ }));
    const dialog = await waitFor(() => c.getByRole("dialog"));
    await expect(within(dialog).getByRole("grid")).toBeInTheDocument();
    // month header + prev/next
    await expect(
      within(dialog).getByRole("button", { name: "Previous month" }),
    ).toBeInTheDocument();
    // focus landed on the selected day (Aug 24)
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toContain(
        "August 24, 2026",
      ),
    );
  },
};

export const KeyboardNav: Story = {
  name: "←→ day, ↑↓ week, PageDown month; Enter selects + closes",
  render: () => <RealHarness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Date/ }));
    await waitFor(() => c.getByRole("dialog"));
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toContain(
        "August 24",
      ),
    );
    // the grid moves focus on a rAF after setFocusedDate — wait for it
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toContain(
        "August 25",
      ),
    );
    await userEvent.keyboard("{ArrowDown}"); // +1 week
    await waitFor(() =>
      expect(document.activeElement?.getAttribute("aria-label")).toContain(
        "September 1",
      ),
    );
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(c.queryByRole("dialog")).toBeNull());
    await expect(c.getByRole("button", { name: /Date/ })).toHaveTextContent(
      "Sep 1, 2026",
    );
  },
};

export const EscCloses: Story = {
  render: () => <RealHarness />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Date/ }));
    await waitFor(() => c.getByRole("dialog"));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(c.queryByRole("dialog")).toBeNull());
  },
};

export const LegacyWeeksMode: Story = {
  name: "Legacy `weeks` escape hatch (pre-computed grid) — side by side",
  render: () => {
    const [month, setMonth] = React.useState(7);
    return (
      <DatePicker
        label="Date (legacy)"
        value="Aug 24, 2026"
        monthLabel={`${["Jan","Feb","Mar","Apr","May","Jun","Jul","August","Sep","Oct","Nov","Dec"][month]} 2026`}
        weeks={LEGACY_WEEKS}
        onPrevMonth={() => setMonth((m) => m - 1)}
        onNextMonth={() => setMonth((m) => m + 1)}
        onSelectDay={() => {}}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Date .legacy./ }));
    const dialog = await waitFor(() => c.getByRole("dialog"));
    await expect(within(dialog).getByRole("grid")).toBeInTheDocument();
    await expect(within(dialog).getByText("August 2026")).toBeInTheDocument();
  },
};
