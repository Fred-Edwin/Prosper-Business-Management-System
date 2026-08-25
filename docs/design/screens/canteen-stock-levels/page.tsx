"use client";

import * as React from "react";
import { LayoutGrid, Boxes, History } from "lucide-react";
import { StaffShell } from "@/components/shells/staff-shell";
import type { BottomNavItem } from "@/components/kit/bottom-nav";
import { SearchInput } from "@/components/kit/search-input";
import { canteenStockLevelsHeader, canteenStockLevelRows } from "./mock-data";

const NAV_ITEMS: BottomNavItem[] = [
  { key: "hub", label: "Hub", icon: LayoutGrid, href: "/canteen" },
  { key: "stock", label: "Stock", icon: Boxes, href: "/canteen/stock" },
  { key: "history", label: "History", icon: History, href: "/canteen/history" },
];

export default function CanteenStockLevelsScreen() {
  return (
    <StaffShell
      roleLabel="Canteen Attendant"
      locationLabel="Canteen"
      accountInitials="SA"
      navItems={NAV_ITEMS}
      activeNavKey="stock"
      onNavigate={() => {}}
      onMenuClick={() => {}}
      onAccountClick={() => {}}
    >
      <div className="flex w-full flex-col gap-4 px-4 py-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-ui text-display/display font-semibold text-text-primary">{canteenStockLevelsHeader.title}</h2>
          <span className="font-ui text-sm/sm text-text-secondary">{canteenStockLevelsHeader.subtitle}</span>
        </div>

        <SearchInput placeholder={canteenStockLevelsHeader.searchPlaceholder} />

        <div className="flex flex-col">
          <div className="flex h-8 items-center border-b border-solid border-border-subtle">
            <span className="min-w-0 grow font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">Product</span>
            <span className="w-[90px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-text-tertiary">Current Qty</span>
          </div>
          {canteenStockLevelRows.map((row) => (
            <div key={row.id} className="flex items-center border-b border-solid border-border-subtle py-3 last:border-b-0">
              <div className="flex min-w-0 grow flex-col gap-0.5">
                <span className="font-ui text-sm/sm font-medium text-text-primary">{row.name}</span>
                <span className="font-ui text-caption/caption text-text-secondary">{row.detail}</span>
              </div>
              <span className="w-[90px] shrink-0 text-right font-mono text-sm/sm font-medium text-text-primary">{row.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    </StaffShell>
  );
}
