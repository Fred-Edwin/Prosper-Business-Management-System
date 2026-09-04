// @vitest-environment jsdom
//
// Per-screen gate — `/admin/audit-trail` (M5 S15). Composed from
// components/kit/* + the Financials table language + the one bespoke
// FIELD/WAS/NOW mini-table (docs/design/flows/audit-screen.md).
//
// Interactive bits only (no specs for read-only display):
//   • filter changes re-query (Action select, Entity select)
//   • the "Show everything" toggle flips the significant-subset flag +
//     the result line, and reveals login rows
//   • row expansion — the human-summary case (FIELD/WAS/NOW table) and
//     the raw before/after fallback
//   • batch-row expansion — one summary row → the member rows
//   • pagination controls (Previous disabled on page 1; Next advances)
//
// useAuditTrail is mocked; no server / DB. jsdom applies no CSS, so BOTH
// the desktop table AND the mobile card list render. Row queries scope to
// the desktop `role="table"` (the mobile cards are a plain <div> list) so
// a match is unambiguous; the toggle / filter / pagination controls are
// shared and queried directly.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AuditLogEntryView, AuditLogItem } from "@/lib/domain/audit";
import type { AuditFilter, AuditPage } from "@/app/admin/audit-trail/use-audit-trail";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── useAuditTrail mock — captures the filter it was called with ───────
let lastFilter: AuditFilter | null = null;
let pageState: AuditPage;
const refreshAudit = vi.fn();
vi.mock("@/app/admin/audit-trail/use-audit-trail", async (orig) => {
  const actual = await orig<typeof import("@/app/admin/audit-trail/use-audit-trail")>();
  return {
    ...actual,
    useAuditTrail: (filter: AuditFilter) => {
      lastFilter = filter;
      return { data: pageState, loading: false, error: null, refresh: refreshAudit };
    },
  };
});

import { AuditTrailClient } from "@/app/admin/audit-trail/audit-trail-client";

// ── fixtures ─────────────────────────────────────────────────────────

function entry(over: Partial<AuditLogEntryView> = {}): AuditLogEntryView {
  return {
    id: "e1",
    action: "correct",
    actorId: "u1",
    actorName: "Edwin K.",
    entityType: "stock_movement",
    entityId: "mv1",
    entityLabel: "receipt · Beef @ Store · 5.0000",
    oldValue: { quantity: "5.00" },
    newValue: { quantity: "3.00" },
    occurredAt: "2026-09-03T11:22:00.000Z",
    recordedAt: "2026-09-03T11:22:05.000Z",
    ...over,
  };
}

function single(e: AuditLogEntryView): AuditLogItem {
  return { kind: "single", entry: e };
}

function page(items: AuditLogItem[], over: Partial<AuditPage["page"]> = {}): AuditPage {
  return {
    items,
    actors: [
      { id: "u1", name: "Edwin K." },
      { id: "u2", name: "Grace Wanjiru" },
    ],
    page: { total: items.length, offset: 0, limit: 50, hasMore: false, ...over },
  };
}

beforeEach(() => {
  lastFilter = null;
  refreshAudit.mockClear();
  pageState = page([single(entry())]);
});

describe("/admin/audit-trail", () => {
  it("defaults to the significant subset; the result line says so", async () => {
    render(<AuditTrailClient />);
    await waitFor(() => expect(lastFilter?.significant).toBe(true));
    expect(
      screen.getByText(/Showing significant changes/i),
    ).toBeInTheDocument();
  });

  it("the Action filter re-queries with the chosen action", async () => {
    const user = userEvent.setup();
    render(<AuditTrailClient />);

    // The FilterToolbar renders each select as a combobox named by its label
    // and remaps every option label to "<Label>: <value>".
    const actionSelect = screen.getByRole("combobox", { name: "Action" });
    await user.click(actionSelect);
    await user.click(screen.getByRole("option", { name: "Action: Corrected" }));

    await waitFor(() => expect(lastFilter?.action).toBe("correct"));
  });

  it("the Entity filter re-queries with the chosen entity type", async () => {
    const user = userEvent.setup();
    render(<AuditTrailClient />);

    const entitySelect = screen.getByRole("combobox", { name: "Entity" });
    await user.click(entitySelect);
    await user.click(screen.getByRole("option", { name: "Entity: Handover" }));

    await waitFor(() => expect(lastFilter?.entityType).toBe("handover"));
  });

  it("the Show everything toggle drops the significant filter and shows login rows", async () => {
    const user = userEvent.setup();
    // With the toggle ON the page includes a login row.
    pageState = page([
      single(entry()),
      single(
        entry({
          id: "e-login",
          action: "login",
          entityType: "user",
          entityId: "u1",
          entityLabel: null,
          oldValue: null,
          newValue: null,
        }),
      ),
    ]);
    render(<AuditTrailClient />);

    const toggle = screen.getByRole("switch", { name: /Show everything/i });
    await user.click(toggle);

    await waitFor(() => expect(lastFilter?.significant).toBe(false));
    expect(screen.getByText(/Showing all activity/i)).toBeInTheDocument();
    expect(screen.getAllByText("Signed in").length).toBeGreaterThan(0);
  });

  it("expands a scalar correction to a FIELD / WAS / NOW mini-table", async () => {
    const user = userEvent.setup();
    render(<AuditTrailClient />);

    // The one-line summary is in the row (desktop + mobile → getAllByText).
    expect(screen.getAllByText("Quantity 5.00 → 3.00").length).toBeGreaterThan(0);

    // Scope to the desktop table so the row is unambiguous.
    const table = screen.getByRole("table");
    const row = within(table).getByRole("row", {
      name: /Corrected — Stock movement/i,
    });
    await user.click(row);

    // The expansion's header + values.
    expect(within(table).getAllByText("Field").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Was").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Now").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("3.00").length).toBeGreaterThan(0);
  });

  it("falls back to raw Before / After blocks when the JSON doesn't reduce to field pairs", async () => {
    const user = userEvent.setup();
    pageState = page([
      single(
        entry({
          id: "e-raw",
          action: "soft_delete",
          entityType: "asset",
          entityId: "a3f9c21beef",
          entityLabel: null,
          oldValue: { nested: { a: 1 }, list: [1, 2] },
          newValue: null,
        }),
      ),
    ]);
    render(<AuditTrailClient />);

    const table = screen.getByRole("table");
    const row = within(table).getByRole("row", { name: /Deleted — Asset/i });
    await user.click(row);

    expect(within(table).getByText("Before")).toBeInTheDocument();
    expect(within(table).getByText("After")).toBeInTheDocument();
    // the entity type + id header inside the fallback
    expect(within(table).getByText(/asset #a3f9c21beef/i)).toBeInTheDocument();
  });

  it("renders a batch as one summary row that expands to the member rows", async () => {
    const user = userEvent.setup();
    const batch: AuditLogItem = {
      kind: "batch",
      correlationId: "batch_abc",
      action: "create",
      actorId: "u1",
      actorName: "Edwin K.",
      count: 3,
      entityType: "stock_movement",
      subAction: "purchase_receipt",
      occurredAt: "2026-09-03T09:14:00.000Z",
      entries: [
        entry({ id: "b1", action: "create", entityLabel: "receipt · Beef @ Store", oldValue: null, newValue: { action: "purchase_receipt", quantity: "5.00" } }),
        entry({ id: "b2", action: "create", entityLabel: "receipt · Rice @ Store", oldValue: null, newValue: { action: "purchase_receipt", quantity: "10.00" } }),
        entry({ id: "b3", action: "create", entityLabel: "receipt · Oil @ Store", oldValue: null, newValue: { action: "purchase_receipt", quantity: "2.00" } }),
      ],
    };
    pageState = page([batch]);
    render(<AuditTrailClient />);

    const table = screen.getByRole("table");

    // Summary row — "3 items received · …".
    expect(within(table).getByText(/3 items received/i)).toBeInTheDocument();
    // Member labels are hidden until expanded (entityDisplay prefixes the type).
    expect(
      within(table).queryByText(/Stock movement · receipt · Rice @ Store/),
    ).not.toBeInTheDocument();

    const batchRow = within(table).getByRole("row", {
      name: /3 items received .* — 3 rows/i,
    });
    await user.click(batchRow);

    expect(
      within(table).getByText(/Stock movement · receipt · Rice @ Store/),
    ).toBeInTheDocument();
    expect(
      within(table).getByText(/Stock movement · receipt · Oil @ Store/),
    ).toBeInTheDocument();
  });

  it("renders a mobile card list alongside the desktop table (same items, card layout)", async () => {
    render(<AuditTrailClient />);
    // The desktop table and the mobile card list both render under jsdom.
    // The summary text therefore appears at least twice — once per layout.
    const hits = screen.getAllByText("Quantity 5.00 → 3.00");
    expect(hits.length).toBeGreaterThanOrEqual(2);
    // The mobile card carries the actor on its own line, same as desktop.
    expect(screen.getAllByText("Edwin K.").length).toBeGreaterThanOrEqual(2);
  });

  it("pagination: Previous is disabled on page 1, Next advances the offset", async () => {
    const user = userEvent.setup();
    pageState = page([single(entry())], { total: 120, hasMore: true });
    render(<AuditTrailClient />);

    const prev = screen.getByRole("button", { name: /Previous/i });
    expect(prev).toBeDisabled();

    const next = screen.getByRole("button", { name: "Next" });
    await user.click(next);

    await waitFor(() => expect(lastFilter?.offset).toBe(50));
  });
});
