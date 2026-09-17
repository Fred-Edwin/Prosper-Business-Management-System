"use client";

// M2 3a — Admin merged "Sales" screen.
//
// COMPOSED from the proven kit — no kit change:
//   • <PageShell> + <AdminPageHeader> (+ <AdminDateRangeControl> in actions)
//   • <SalesKpiStrip> — page-level KPI strip, scope All/Restaurant/Canteen
//   • <Tabs> (underline) — "Restaurant Orders" / "Canteen Derived"
//   • Tab 1 = <OrdersTab> (A3 — was app/admin/orders)
//   • Tab 2 = <DerivedTab> (A4 — was app/admin/canteen/derived-sales)
//
// Paper: I00-0 (Restaurant Orders tab) / I5S-0 (Canteen Derived tab),
// IJ1-0 / ILC-0 (mobile). Tab row = kit <Tabs>; 16px (--sp-6) gap between
// the tab row and the filter toolbar below it (I5M-0 → IEA-0).
//
// Deep-link: the initial tab comes from `?tab=` (resolved server-side in
// page.tsx); switching tabs replaces the URL so a refresh stays put.
//
// Date range — client feedback 2026-09-17: replaces the old per-tab
// "Date" filter (Today/pick-a-day) with the shared
// `<AdminDateRangeControl>` (Today / This week / This month / Custom
// from..to) already used by Stock/Financials/Dashboard, in the header
// next to the title. ONE range now drives BOTH tabs' data (`from`/`to`),
// lifted here rather than owned per-tab.
//
// KPI strip — same feedback: "some stats or a KPI strip". Sits above the
// tabs (not tied to either one) because the owner wants a combined total
// across the whole business as well as each side's own figures — see
// `./kpi-strip.tsx` for the reasoning on why scope is a separate control
// from the tab row rather than reusing Financials' tile-switches-tab
// pattern.

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Tabs } from "@/components/kit/tabs";
import { OrdersTab } from "./orders-tab";
import { DerivedTab } from "./derived-tab";
import { SalesKpiStrip, type SalesKpiScope } from "./kpi-strip";
import { AdminDateRangeControl } from "@/app/admin/date-range-control";
import { useAdminDateRange } from "@/app/admin/use-date-range";
import { useOrders } from "@/app/cashier/use-orders";
import { useDerivedSales } from "@/app/canteen/use-stock-count";

export type SalesTabKey = "orders" | "derived";

const TABS = [
  { key: "orders" as const, label: "Restaurant Orders", panelId: "sales-panel-orders" },
  { key: "derived" as const, label: "Canteen Derived", panelId: "sales-panel-derived" },
];

export function SalesClient({ initialTab }: { initialTab: SalesTabKey }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<SalesTabKey>(initialTab);

  // Picks up the sidebar's own `?tab=derived` link (same route, no remount
  // — see page.tsx) without resetting the date range / KPI scope state
  // below, which a `key`-based remount used to wipe on every tab switch.
  React.useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const changeTab = React.useCallback(
    (key: string) => {
      const next = key === "derived" ? "derived" : "orders";
      setTab(next);
      // Keep the URL in sync so a refresh / shared link lands on this tab.
      // `replace` (not push) — a tab switch isn't a new history entry.
      router.replace(next === "derived" ? "/admin/sales?tab=derived" : "/admin/sales");
    },
    [router],
  );

  const { range, setPreset, setCustomDay, setCustomRange, today } = useAdminDateRange();

  // The KPI strip is independent of each tab's own local filters (cashier /
  // payment / product / corrected-only) — it reflects the page-level date
  // range only, same as the Financials KPI strip vs. its transaction tabs'
  // own filters. Two dedicated, range-only reads feed it; the tabs below
  // keep their own separately-filtered `useOrders` / `useDerivedSales`
  // calls for their tables.
  const { orders: kpiOrders, error: kpiOrdersError, refresh: refreshKpiOrders } = useOrders({
    from: range.from,
    to: range.to,
  });
  const {
    rows: kpiDerivedRows,
    error: kpiDerivedError,
    refresh: refreshKpiDerived,
  } = useDerivedSales({ from: range.from, to: range.to });

  const [kpiScope, setKpiScope] = React.useState<SalesKpiScope>("all");

  const rangeCaption =
    range.preset === "today"
      ? "Today"
      : range.preset === "week"
        ? "This week"
        : range.preset === "month"
          ? "This month"
          : "Custom range";

  const rangeControl = (
    <AdminDateRangeControl
      range={range}
      today={today}
      onPreset={setPreset}
      onCustomDay={setCustomDay}
      onCustomRange={setCustomRange}
    />
  );

  return (
    <PageShell>
      <AdminPageHeader
        title="Sales"
        actions={<div className="hidden md:block">{rangeControl}</div>}
      />

      {/* Mobile: range control gets its own row so the header stays
          uncrowded (matches the Financials / Stock pattern). */}
      <div className="md:hidden flex items-center justify-between gap-(--sp-4) py-(--sp-4) px-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <span className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Showing
        </span>
        {rangeControl}
      </div>

      <div className="px-(--sp-6) pt-(--sp-6)">
        <SalesKpiStrip
          scope={kpiScope}
          onScopeChange={setKpiScope}
          orders={kpiOrders}
          derivedRows={kpiDerivedRows}
          caption={`${rangeCaption} at a glance`}
          error={kpiOrdersError ?? kpiDerivedError}
          onRetry={() => {
            void refreshKpiOrders();
            void refreshKpiDerived();
          }}
        />
      </div>

      {/* Tab row — kit <Tabs> (underline). 16px gap to the toolbar below
          comes from each tab panel's own pt-(--sp-6). */}
      <div className="px-(--sp-6) pt-(--sp-6)">
        <Tabs
          tabs={TABS}
          activeKey={tab}
          onChange={changeTab}
          idBase="sales-tabs"
        />
      </div>

      <div
        id="sales-panel-orders"
        role="tabpanel"
        aria-labelledby="sales-tabs-tab-orders"
        hidden={tab !== "orders"}
      >
        {tab === "orders" && <OrdersTab range={range} />}
      </div>
      <div
        id="sales-panel-derived"
        role="tabpanel"
        aria-labelledby="sales-tabs-tab-derived"
        hidden={tab !== "derived"}
      >
        {tab === "derived" && <DerivedTab range={range} />}
      </div>
    </PageShell>
  );
}
