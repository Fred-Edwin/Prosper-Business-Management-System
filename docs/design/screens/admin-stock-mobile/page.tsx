"use client";

import * as React from "react";
import { Plus } from "lucide-react";
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
import { PillFilter } from "@/components/kit/pill-filter";
import { StatusChip } from "@/components/kit/status-chip";
import { stockMobileSummary, stockMobileLocationPills, stockMobileCards } from "./mock-data";

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

export default function AdminStockMobileScreen() {
  const [activeLocation, setActiveLocation] = React.useState<string>("all");

  return (
    <MobileShellAdmin
      toolbarTitle="Stock & Movements"
      accountInitials="EK"
      navGroups={NAV_GROUPS}
      activeNavKey="stock"
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

        <div className="flex h-16 items-stretch rounded-md border border-solid border-border-subtle">
          <div className="flex grow flex-col justify-center gap-1 px-4">
            <span className="font-ui text-caption/caption text-text-secondary">Stock on Hand (Total)</span>
            <span className="font-ui text-h1/h1 font-semibold text-text-primary">{stockMobileSummary.stockOnHand}</span>
          </div>
          <div className="w-px shrink-0 bg-border-subtle" />
          <div className="flex grow flex-col justify-center gap-1 px-4">
            <span className="font-ui text-caption/caption text-text-secondary">Today's Sold Value</span>
            <span className="font-ui text-h1/h1 font-semibold text-text-primary">{stockMobileSummary.soldValueToday}</span>
          </div>
        </div>

        <PillFilter
          items={stockMobileLocationPills as unknown as { key: string; label: string }[]}
          activeKey={activeLocation}
          onChange={setActiveLocation}
        />

        <div className="flex flex-col gap-3">
          {stockMobileCards.map((card) => (
            <div key={card.id} className="flex flex-col gap-2 rounded-md border border-solid border-border-subtle p-3">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-ui text-h2/h2 font-semibold text-text-primary">{card.name}</span>
                  <span className="w-fit rounded-sm bg-surface-hover px-1.5 py-0.5 font-ui text-[11px] leading-[14px] text-text-secondary">
                    {card.location}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-ui text-h2/h2 font-semibold text-text-primary">{card.closing}</span>
                  <span className="font-ui text-caption/caption text-text-secondary">{card.closingValue}</span>
                </div>
              </div>
              <p className="font-mono text-caption/caption text-text-tertiary">{card.movementSummary}</p>
              <div className="flex items-center justify-between">
                <span className="font-ui text-caption/caption text-text-secondary">{card.openingLine}</span>
                <button type="button" className="rounded-sm border border-solid border-border-strong px-3 py-1.5 font-ui text-caption/caption font-medium text-text-primary outline-none">
                  Adjust
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-[69px] w-full shrink-0 items-center gap-3 border-t border-solid border-border-subtle bg-surface-page px-4">
        <button type="button" className="flex h-11 grow items-center justify-center rounded-sm border border-solid border-border-strong font-ui text-sm/sm font-medium text-text-primary outline-none">
          Opening Stock
        </button>
        <button type="button" className="flex h-11 grow items-center justify-center gap-1.5 rounded-sm bg-accent font-ui text-sm/sm font-medium text-white outline-none">
          <Plus className="size-3.5" strokeWidth={1.5} aria-hidden />
          Record Payment
        </button>
      </div>
    </MobileShellAdmin>
  );
}
