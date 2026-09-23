// Single source of truth for the Admin sidebar's destinations — shared by the
// desktop shell (components/shells/admin-shell.tsx), the mobile drawer
// (components/shells/mobile-nav-drawer.tsx) and the shell client
// (app/admin/admin-shell-client.tsx).
//
// M6: sections that are one route with an inner tab row (Financials, Sales,
// Staff, Catalog, Assets) expose that tab row here as `children`. The sidebar
// renders each parent with a disclosure chevron; the label still navigates to
// the section's default screen, the chevron toggles an inline sub-list, and a
// child href deep-links its tab via `?tab=`. The two removed top-level links
// — Handovers (now a Financials tab) and Reports (never built) — are gone.
//
// This module is icon-free on purpose: icons are JSX and each shell keeps its
// own SVG set at its own sizes. The shells map `key` → their icon.

export interface AdminNavChildDef {
  /** Stable id; also the `?tab=` value when `tab` is set. */
  key: string;
  label: string;
  /** Absolute href, e.g. `/admin/financials?tab=expenses`. */
  href: string;
  /**
   * The `?tab=` value this child represents, or `null` for the section's
   * default screen (no `tab` param). Used to light the active child.
   */
  tab: string | null;
}

export interface AdminNavItemDef {
  key: string;
  label: string;
  href: string;
  /** Present only for sections with an inner tab row. */
  children?: AdminNavChildDef[];
}

export interface AdminNavGroupDef {
  label?: string;
  items: AdminNavItemDef[];
}

/** Build a section's children from its tab list, prepending a default entry. */
function tabChildren(
  base: string,
  defaultLabel: string,
  tabs: { key: string; label: string }[],
): AdminNavChildDef[] {
  return [
    { key: `${base}:default`, label: defaultLabel, href: `/admin/${base}`, tab: null },
    ...tabs.map((t) => ({
      key: `${base}:${t.key}`,
      label: t.label,
      href: `/admin/${base}?tab=${t.key}`,
      tab: t.key,
    })),
  ];
}

export const ADMIN_NAV_GROUPS: AdminNavGroupDef[] = [
  { items: [{ key: "dashboard", label: "Dashboard", href: "/admin" }] },
  {
    label: "Operations",
    items: [
      {
        key: "catalog",
        label: "Catalog",
        href: "/admin/catalog",
        children: tabChildren("catalog", "Products", [
          { key: "locations", label: "Locations" },
        ]),
      },
      { key: "stock", label: "Ledger", href: "/admin/stock" },
      {
        key: "sales",
        label: "Sales",
        href: "/admin/sales",
        // Sales' default tab is "orders"; the only deep-linkable tab is "derived".
        children: [
          { key: "sales:default", label: "Restaurant Orders", href: "/admin/sales", tab: null },
          { key: "sales:derived", label: "Canteen Derived", href: "/admin/sales?tab=derived", tab: "derived" },
        ],
      },
    ],
  },
  {
    label: "People & Money",
    items: [
      { key: "customers", label: "Customers", href: "/admin/customers" },
      {
        key: "financials",
        label: "Financials",
        href: "/admin/financials",
        // "purchases" is the default screen — it's the null-tab child, not a
        // separate `?tab=purchases` entry.
        children: [
          ...tabChildren("financials", "Stock Purchases", [
            { key: "deliveries", label: "Deliveries" },
            { key: "handovers", label: "Handovers" },
            { key: "expenses", label: "Expenses" },
            { key: "owner-draws", label: "Owner Draws" },
            { key: "non-sale", label: "Non-Sale Consumption" },
          ]),
          // A standalone page (client feedback item #7), not a `?tab=`
          // child — its own route, own KPI strip. Opening Balances is
          // deliberately NOT in the nav (reached only via the quiet
          // in-page link on Financials); Cash Flow is a report the owner
          // will check often, so it earns a real nav entry.
          {
            key: "financials:cash-flow",
            label: "Cash Flow",
            href: "/admin/financials/cash-flow",
            tab: null,
          },
        ],
      },
    ],
  },
  {
    label: "Team",
    items: [
      {
        key: "staff",
        label: "Staff",
        href: "/admin/staff",
        children: tabChildren("staff", "Roster", [
          { key: "attendance", label: "Attendance" },
          { key: "pay", label: "Pay" },
        ]),
      },
      {
        key: "assets",
        label: "Assets",
        href: "/admin/assets",
        children: tabChildren("assets", "All", [
          { key: "archived", label: "Archived" },
        ]),
      },
    ],
  },
  {
    label: "Reporting",
    items: [{ key: "audit-trail", label: "Audit trail", href: "/admin/audit-trail" }],
  },
];

export const ADMIN_NAV_ITEMS_FLAT: AdminNavItemDef[] = ADMIN_NAV_GROUPS.flatMap(
  (g) => g.items,
);

// Flat {key, href} list — the shell client resolves the active nav key against
// this (longest matching href prefix) so a nested route still lights its
// top-level item. `href` here is the section root, sans query.
export const ADMIN_NAV_ITEMS: { key: string; href: string }[] =
  ADMIN_NAV_ITEMS_FLAT.map(({ key, href }) => ({ key, href }));

/**
 * Given the resolved top-level nav key and the current `?tab=` value, return
 * the key of the child that should be lit — or `null` when the parent has no
 * children or nothing matches.
 *
 * `pathname` disambiguates a section with more than one `tab: null` child —
 * a real standalone sub-page (e.g. Financials' Cash Flow, its own route,
 * not a `?tab=` deep link) alongside the section's default `?tab`-less
 * screen. Without it, both share `tab === null` and the first one in the
 * array would always win. Every existing section has at most one `tab:
 * null` child, so passing no `pathname` is unaffected.
 */
export function activeChildKey(
  navKey: string,
  tabParam: string | null,
  pathname?: string,
): string | null {
  const item = ADMIN_NAV_ITEMS_FLAT.find((i) => i.key === navKey);
  if (!item?.children) return null;
  const tabless = item.children.filter((c) => c.tab === null);
  const byTabParam = item.children.find(
    (c) => c.tab !== null && c.tab === tabParam,
  );
  if (byTabParam) return byTabParam.key;

  if (tabless.length > 1 && pathname != null) {
    // Longest matching href prefix wins — a more specific standalone
    // sub-page (e.g. `/admin/financials/cash-flow`) must beat the
    // section's own root href (`/admin/financials`), which is a prefix
    // of every one of its sub-pages.
    let best: (typeof tabless)[number] | null = null;
    let bestLen = -1;
    for (const c of tabless) {
      if (
        (pathname === c.href || pathname.startsWith(c.href + "/")) &&
        c.href.length > bestLen
      ) {
        best = c;
        bestLen = c.href.length;
      }
    }
    if (best) return best.key;
  }

  return tabless[0]?.key ?? null;
}
