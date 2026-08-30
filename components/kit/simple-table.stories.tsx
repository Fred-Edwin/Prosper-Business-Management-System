import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";
import { SimpleTable, type SimpleTableColumn } from "./simple-table";

/**
 * C15 SimpleTable — `component-states.md §2 C15`. header / body row / row hover
 * (`--surface-hover`, ONLY when `onRowClick` — the load-bearing "this row is
 * clickable" affordance) / empty (`<EmptyState>` slot) / loading (skeleton) /
 * keyboard-operable clickable rows. Minimal table ARIA.
 */
interface Asset {
  id: string;
  name: string;
  location: string;
  condition: string;
}

const COLUMNS: SimpleTableColumn<Asset>[] = [
  { key: "name", header: "Asset", width: "w-[180px]", cell: "strong", render: (r) => r.name },
  { key: "location", header: "Location", width: "w-[120px]", render: (r) => r.location },
  { key: "condition", header: "Condition", width: "w-[120px]", render: (r) => r.condition },
];

const ROWS: Asset[] = [
  { id: "a1", name: "Chest Freezer", location: "Store", condition: "Good" },
  { id: "a2", name: "Deep Fryer", location: "Kitchen", condition: "Needs Repair" },
  { id: "a3", name: "Prep Table", location: "Kitchen", condition: "Good" },
];

const meta: Meta<typeof SimpleTable<Asset>> = {
  title: "Kit/SimpleTable",
  component: SimpleTable,
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof SimpleTable<Asset>>;

export const HeaderAndRows: Story = {
  name: "Header + body rows (non-clickable) — ARTBOARD 6EY-0",
  args: { columns: COLUMNS, rows: ROWS, rowKey: (r) => r.id },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table")).toBeInTheDocument();
    await expect(c.getAllByRole("columnheader")).toHaveLength(3);
    // non-clickable rows are not buttons / not tab stops
    await expect(c.queryByRole("button")).toBeNull();
  },
};

export const RowHover: Story = {
  name: "Row hover ⇒ §9.3 --surface-hover (clickable rows only)",
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: (r) => r.id,
    onRowClick: () => {},
    rowLabel: (r) => `Edit ${r.name}`,
  },
  parameters: {
    interaction: {
      hover: ".kit-row",
      assertColor: [
        { selector: ".kit-row", prop: "backgroundColor", token: "--surface-hover" },
      ],
    },
  },
};

export const ClickableRowsKeyboard: Story = {
  name: "Clickable rows are role=row, Enter/Space activate",
  parameters: { visual: { disable: true } }, // play focuses a row → not a pixel baseline
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: (r) => r.id,
    rowLabel: (r) => `Edit ${r.name}`,
  },
  render: (args) => {
    const [opened, setOpened] = React.useState<string | null>(null);
    return (
      <div>
        <SimpleTable {...args} onRowClick={(r) => setOpened(r.name)} />
        <p data-testid="opened">{opened ?? "none"}</p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const row = c.getByRole("row", { name: "Edit Deep Fryer" });
    // clickable row: focusable role="row" with Enter/Space activation
    // (ARIA-valid — role="row" is not allowed on a native <button>)
    await expect(row).toHaveAttribute("tabindex", "0");
    row.focus();
    await expect(row).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(c.getByTestId("opened")).toHaveTextContent("Deep Fryer");
    // Space also activates
    row.focus();
    await userEvent.keyboard(" ");
    await expect(c.getByTestId("opened")).toHaveTextContent("Deep Fryer");
  },
};

export const RowChevron: Story = {
  name: "rowChevron ⇒ trailing › on clickable rows + header spacer (M2 6b)",
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: (r) => r.id,
    onRowClick: () => {},
    rowLabel: (r) => `Open ${r.name}`,
    rowChevron: true,
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // one chevron slot per clickable body row (header spacer carries no svg)
    const rows = c.getAllByRole("row", { name: /^Open / });
    await expect(rows).toHaveLength(3);
    for (const row of rows) {
      await expect(row.querySelector("svg polyline")).toBeInTheDocument();
    }
    // header row gained a matching fixed-width spacer so lanes stay aligned
    const header = c.getAllByRole("row")[0];
    await expect(header.lastElementChild).toHaveClass("w-[24px]");
  },
};

export const Empty: Story = {
  name: "Empty ⇒ <EmptyState> slot",
  args: {
    columns: COLUMNS,
    rows: [],
    rowKey: (r) => r.id,
    emptyState: {
      title: "No assets yet",
      description: "Register your first asset to start tracking condition.",
      actionLabel: "Add asset",
    },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent(
      "No assets yet",
    );
  },
};

export const Loading: Story = {
  name: "Loading ⇒ §9.10 skeleton rows",
  args: { columns: COLUMNS, rows: [], rowKey: (r) => r.id, loading: true },
  play: async ({ canvasElement }) => {
    await expect(
      canvasElement.querySelectorAll(".kit-skeleton").length,
    ).toBeGreaterThan(0);
  },
};

export const Sortable: Story = {
  name: "Sortable header ⇒ aria-sort toggles",
  parameters: { visual: { disable: true } }, // play clicks/focuses the header
  args: {
    columns: COLUMNS.map((c) => (c.key === "name" ? { ...c, sortable: true } : c)),
    rows: ROWS,
    rowKey: (r) => r.id,
  },
  render: (args) => {
    const [sort, setSort] = React.useState<{ key: string; direction: "asc" | "desc" }>({
      key: "name",
      direction: "asc",
    });
    return (
      <SimpleTable
        {...args}
        sort={sort}
        onSort={(key) =>
          setSort((s) => ({
            key,
            direction: s.key === key && s.direction === "asc" ? "desc" : "asc",
          }))
        }
      />
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const header = c.getByRole("columnheader", { name: /Asset/ });
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(within(header).getByRole("button"));
    await expect(header).toHaveAttribute("aria-sort", "descending");
  },
};
