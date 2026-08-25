"use client";

import * as React from "react";
import { Plus, Search, SlidersHorizontal, MoreVertical } from "lucide-react";
import {
  LayoutGrid,
  Package,
  Boxes,
  ShoppingCart,
  Repeat,
  Users,
  Wallet,
  UserSquare2,
  Archive,
  BarChart3,
  History,
} from "lucide-react";
import { MobileShellAdmin } from "@/components/shells/mobile-shell-admin";
import type { AdminNavGroup } from "@/components/shells/admin-shell";
import { Tabs } from "@/components/kit/tabs";
import { SearchInput } from "@/components/kit/search-input";
import { StatusChip } from "@/components/kit/status-chip";
import { mobileCatalogCategoryTabs, mobileCatalogCards, mobileCatalogProductCount } from "./mock-data";

const NAV_GROUPS: AdminNavGroup[] = [
  { items: [{ key: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/admin" }] },
  {
    label: "Operations",
    items: [
      { key: "catalog", label: "Catalog", icon: Package, href: "/admin/catalog" },
      { key: "stock", label: "Stock", icon: Boxes, href: "/admin/stock" },
      { key: "sales", label: "Sales", icon: ShoppingCart, href: "/admin/sales" },
      { key: "handovers", label: "Handovers", icon: Repeat, href: "/admin/handovers" },
    ],
  },
  {
    label: "People & Money",
    items: [
      { key: "customers", label: "Customers", icon: Users, href: "/admin/customers" },
      { key: "financials", label: "Financials", icon: Wallet, href: "/admin/financials" },
    ],
  },
  {
    label: "Team",
    items: [
      { key: "staff", label: "Staff", icon: UserSquare2, href: "/admin/staff" },
      { key: "assets", label: "Assets", icon: Archive, href: "/admin/assets" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { key: "reports", label: "Reports", icon: BarChart3, href: "/admin/reports" },
      { key: "audit-trail", label: "Audit trail", icon: History, href: "/admin/audit-trail" },
    ],
  },
];

export default function AdminCatalogMobileScreen() {
  const [activeTab, setActiveTab] = React.useState<string>("all");

  return (
    <MobileShellAdmin
      toolbarTitle="All locations"
      accountInitials="EK"
      navGroups={NAV_GROUPS}
      activeNavKey="catalog"
      onNavigate={() => {}}
      brandLabel="Prosper"
      brandSubLabel="Hotel"
      accountName="Edwinfred Kamau"
      accountRole="Admin"
      onAccountClick={() => {}}
    >
      <div className="flex w-full flex-col gap-4 px-4 py-4">
        <div className="flex items-center justify-end">
          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-lg bg-success-bg px-2">
            <StatusChip tone="success" label="Open" />
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-ui text-display/display font-semibold text-text-primary">Product Catalog</h2>
            <span className="rounded-lg bg-surface-hover px-2 py-1 font-ui text-sm/sm text-text-secondary">{mobileCatalogProductCount}</span>
          </div>
          <button
            type="button"
            className="flex h-9 items-center gap-1.5 rounded-sm bg-accent px-3 font-ui text-sm/sm font-medium text-white outline-none"
          >
            <Plus className="size-3.5" strokeWidth={1.5} aria-hidden />
            Add
          </button>
        </div>

        <Tabs items={mobileCatalogCategoryTabs as unknown as { key: string; label: string }[]} activeKey={activeTab} onChange={setActiveTab} />

        <div className="flex items-center gap-2">
          <SearchInput placeholder="Search products..." className="grow" />
          <button
            type="button"
            className="flex h-10 items-center gap-1.5 rounded-sm border border-solid border-border-strong px-3 font-ui text-sm/sm text-text-primary outline-none"
          >
            <SlidersHorizontal className="size-3.5" strokeWidth={1.5} aria-hidden />
            Filter
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {mobileCatalogCards.map((card) => (
            <div key={card.id} className="flex flex-col rounded-md border border-solid border-border-subtle">
              <div className="flex items-center justify-between border-b border-solid border-border-subtle px-4 py-3">
                <div className="flex flex-col gap-1">
                  <span className="font-ui text-h2/h2 font-semibold text-text-primary">{card.name}</span>
                  <span className="font-ui text-caption/caption text-text-secondary">{card.categoryLine}</span>
                </div>
                <MoreVertical className="size-4 shrink-0 text-text-tertiary" strokeWidth={1.5} aria-hidden />
              </div>
              <div className="flex items-stretch">
                {card.prices.map((cell, i) => (
                  <React.Fragment key={cell.label}>
                    {i > 0 && <div className="w-px shrink-0 bg-border-subtle" />}
                    <div className="flex grow flex-col gap-1 px-4 py-3">
                      <span className="font-ui text-caption/caption text-text-tertiary">{cell.label}</span>
                      <span className="font-ui text-sm/sm font-medium text-text-primary">{cell.value ?? "—"}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </MobileShellAdmin>
  );
}
