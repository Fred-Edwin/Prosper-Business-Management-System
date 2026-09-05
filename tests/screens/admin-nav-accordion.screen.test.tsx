// @vitest-environment jsdom
// M6 — the Admin sidebar's expandable navigation.
//
// Sections that are one route with an inner tab row (Financials, Sales, Staff,
// Catalog, Assets) render a disclosure chevron; the label navigates to the
// section's default screen, the chevron toggles an inline sub-list, and a
// sub-link deep-links its tab via `?tab=`. The two removed top-level links —
// Handovers (now a Financials tab) and Reports (never built) — are gone from
// both shells.
//
// This spec asserts the interaction contract (expand / collapse, which link
// navigates where, which sub-item lights up), not the pixels.
import { describe, it, expect, vi } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { AdminShell } from "@/components/shells/admin-shell";
import { MobileNavDrawer } from "@/components/shells/mobile-nav-drawer";
import { AdminToolbarProvider } from "@/components/shells/admin-toolbar-context";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_NAV_ITEMS_FLAT,
  activeChildKey,
} from "@/components/shells/admin-nav-model";

function renderDesktop(props: Partial<React.ComponentProps<typeof AdminShell>> = {}) {
  const onNavigate = vi.fn();
  render(
    <AdminToolbarProvider>
      <AdminShell
        activeNavKey="dashboard"
        onNavigate={onNavigate}
        accountName="Admin"
        accountRole="Admin"
        accountInitials="AK"
        onAccountClick={() => {}}
        collapsed={false}
        onToggleCollapsed={() => {}}
        {...props}
      >
        <p>page body</p>
      </AdminShell>
    </AdminToolbarProvider>,
  );
  return { onNavigate };
}

function renderDrawer(props: Partial<React.ComponentProps<typeof MobileNavDrawer>> = {}) {
  const onNavigate = vi.fn();
  render(
    <MobileNavDrawer
      open
      onClose={() => {}}
      activeNavKey="dashboard"
      onNavigate={onNavigate}
      brandLabel="Prosper"
      brandSubLabel="Admin"
      accountName="Admin"
      accountRole="Admin"
      accountInitials="AK"
      onAccountClick={() => {}}
      {...props}
    />,
  );
  return { onNavigate };
}

describe("admin nav model — M6", () => {
  it("has no Handovers or Reports top-level link", () => {
    const keys = ADMIN_NAV_ITEMS.map((i) => i.key);
    expect(keys).not.toContain("handovers");
    expect(keys).not.toContain("reports");
    expect(keys).toContain("financials");
    expect(keys).toContain("audit-trail");
  });

  it("gives the tabbed sections children and leaves single-screen sections plain", () => {
    const withChildren = ADMIN_NAV_ITEMS_FLAT.filter((i) => i.children).map((i) => i.key);
    expect(withChildren.sort()).toEqual(
      ["assets", "catalog", "financials", "sales", "staff"].sort(),
    );
    expect(ADMIN_NAV_ITEMS_FLAT.find((i) => i.key === "stock")?.children).toBeUndefined();
    expect(ADMIN_NAV_ITEMS_FLAT.find((i) => i.key === "dashboard")?.children).toBeUndefined();
  });

  it("routes the Financials Handovers sub-link to ?tab=handovers", () => {
    const fin = ADMIN_NAV_ITEMS_FLAT.find((i) => i.key === "financials")!;
    const handovers = fin.children!.find((c) => c.label === "Handovers")!;
    expect(handovers.href).toBe("/admin/financials?tab=handovers");
    expect(handovers.tab).toBe("handovers");
    // The default child is the section root, no query.
    const dflt = fin.children!.find((c) => c.tab === null)!;
    expect(dflt.href).toBe("/admin/financials");
  });

  it("activeChildKey resolves the lit sub-item from the tab param", () => {
    const fin = ADMIN_NAV_ITEMS_FLAT.find((i) => i.key === "financials")!;
    expect(activeChildKey("financials", "expenses")).toBe(
      fin.children!.find((c) => c.tab === "expenses")!.key,
    );
    // No tab → the default child.
    expect(activeChildKey("financials", null)).toBe(
      fin.children!.find((c) => c.tab === null)!.key,
    );
    // Unknown tab → falls back to the default child, never null.
    expect(activeChildKey("financials", "bogus")).toBe(
      fin.children!.find((c) => c.tab === null)!.key,
    );
    // Sections without children → null.
    expect(activeChildKey("stock", null)).toBeNull();
  });
});

describe("admin desktop sidebar — accordion", () => {
  it("does not show Handovers or Reports as nav links", () => {
    renderDesktop();
    const nav = screen.getByRole("navigation", { name: "Primary" });
    expect(within(nav).queryByRole("button", { name: "Reports" })).toBeNull();
    // "Handovers" only exists as a collapsed sub-item, not rendered until expand.
    expect(within(nav).queryByText("Handovers")).toBeNull();
  });

  it("clicking the Financials label navigates to the section root, not a tab", () => {
    const { onNavigate } = renderDesktop();
    fireEvent.click(screen.getByRole("button", { name: "Financials" }));
    expect(onNavigate).toHaveBeenCalledWith("/admin/financials");
  });

  it("the chevron expands the sub-list without navigating; a sub-link deep-links its tab", () => {
    const { onNavigate } = renderDesktop();
    const expand = screen.getByRole("button", { name: "Expand Financials" });
    fireEvent.click(expand);
    expect(onNavigate).not.toHaveBeenCalled();

    // Sub-list is now visible.
    const handovers = screen.getByRole("button", { name: "Handovers" });
    fireEvent.click(handovers);
    expect(onNavigate).toHaveBeenCalledWith("/admin/financials?tab=handovers");

    // Chevron now collapses.
    fireEvent.click(screen.getByRole("button", { name: "Collapse Financials" }));
    expect(screen.queryByRole("button", { name: "Handovers" })).toBeNull();
  });

  it("auto-expands the section that owns the active route and lights the active sub-item", () => {
    renderDesktop({ activeNavKey: "financials", activeTabParam: "expenses" });
    const expensesRow = screen.getByRole("button", { name: "Expenses" });
    expect(expensesRow).toHaveAttribute("aria-current", "page");
    // The parent label is also current.
    expect(screen.getByRole("button", { name: "Financials" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("only one section is open at a time", () => {
    renderDesktop();
    fireEvent.click(screen.getByRole("button", { name: "Expand Financials" }));
    expect(screen.getByRole("button", { name: "Handovers" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Expand Staff" }));
    // Financials sub-list collapsed when Staff opened.
    expect(screen.queryByRole("button", { name: "Handovers" })).toBeNull();
    expect(screen.getByRole("button", { name: "Attendance" })).toBeInTheDocument();
  });
});

describe("admin mobile drawer — accordion", () => {
  it("drops Handovers and Reports as links", () => {
    renderDrawer();
    expect(screen.queryByRole("button", { name: "Reports" })).toBeNull();
    expect(screen.queryByText("Handovers")).toBeNull();
  });

  it("expands a section and deep-links a sub-tab", () => {
    const { onNavigate } = renderDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Expand Staff" }));
    fireEvent.click(screen.getByRole("button", { name: "Pay" }));
    expect(onNavigate).toHaveBeenCalledWith("/admin/staff?tab=pay");
  });

  it("auto-expands the active section", () => {
    renderDrawer({ activeNavKey: "catalog", activeTabParam: "locations" });
    expect(screen.getByRole("button", { name: "Locations" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
