"use client";

// M2 3a — Admin merged "Sales" screen.
//
// COMPOSED from the proven kit — no kit change:
//   • <PageShell> + <AdminPageHeader>
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

import * as React from "react";
import { useRouter } from "next/navigation";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Tabs } from "@/components/kit/tabs";
import { OrdersTab } from "./orders-tab";
import { DerivedTab } from "./derived-tab";

export type SalesTabKey = "orders" | "derived";

const TABS = [
  { key: "orders" as const, label: "Restaurant Orders", panelId: "sales-panel-orders" },
  { key: "derived" as const, label: "Canteen Derived", panelId: "sales-panel-derived" },
];

export function SalesClient({ initialTab }: { initialTab: SalesTabKey }) {
  const router = useRouter();
  const [tab, setTab] = React.useState<SalesTabKey>(initialTab);

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

  return (
    <PageShell>
      <AdminPageHeader title="Sales" />
      {/* Tab row — kit <Tabs> (underline). 16px gap to the toolbar below
          comes from each tab panel's own pt-(--sp-6). */}
      <div className="px-(--sp-6)">
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
        {tab === "orders" && <OrdersTab />}
      </div>
      <div
        id="sales-panel-derived"
        role="tabpanel"
        aria-labelledby="sales-tabs-tab-derived"
        hidden={tab !== "derived"}
      >
        {tab === "derived" && <DerivedTab />}
      </div>
    </PageShell>
  );
}
