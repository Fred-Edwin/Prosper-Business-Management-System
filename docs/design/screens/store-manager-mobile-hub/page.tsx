"use client";

import * as React from "react";
import { LayoutGrid, Boxes, History, PackagePlus, UtensilsCrossed, ChefHat, Repeat } from "lucide-react";
import { StaffShell } from "@/components/shells/staff-shell";
import type { BottomNavItem } from "@/components/kit/bottom-nav";
import { TransferBanner, PurchaseDeliveryBanner } from "@/components/kit/banner";
import { StatusChip } from "@/components/kit/status-chip";
import { ActionTileGrid, type ActionTile } from "@/components/kit/action-tile-grid";
import {
  storeHubTransferBanner,
  storeHubPurchaseBanner,
  storeHubQuickOpsTitle,
  storeHubQuickOps,
  storeHubMovementLogTitle,
  storeHubMovementLog,
} from "./mock-data";

const NAV_ITEMS: BottomNavItem[] = [
  { key: "hub", label: "Hub", icon: LayoutGrid, href: "/store-manager" },
  { key: "stock", label: "Stock", icon: Boxes, href: "/store-manager/stock" },
  { key: "history", label: "History", icon: History, href: "/store-manager/history" },
];

const QUICK_OPS_ICONS = [PackagePlus, UtensilsCrossed, ChefHat, Repeat];

const actionTiles: ActionTile[] = storeHubQuickOps.map((op, i) => ({
  key: op.key,
  icon: QUICK_OPS_ICONS[i],
  label: op.label,
  meta: op.meta,
}));

export default function StoreManagerMobileHubScreen() {
  return (
    <StaffShell
      roleLabel="Store Manager"
      locationLabel="Store Hub"
      accountInitials="JM"
      navItems={NAV_ITEMS}
      activeNavKey="hub"
      onNavigate={() => {}}
      onMenuClick={() => {}}
      onAccountClick={() => {}}
    >
      <div className="flex w-full flex-col gap-5 px-4 py-4">
        <div className="flex items-center justify-end">
          <span className="inline-flex h-[22px] items-center gap-1.5 rounded-lg bg-success-bg px-2">
            <StatusChip tone="success" label="Open" />
          </span>
        </div>

        <TransferBanner
          title={storeHubTransferBanner.title}
          detail={storeHubTransferBanner.detail}
          acceptLabel={storeHubTransferBanner.acceptLabel}
          onAccept={() => {}}
          onFlagVariance={() => {}}
        />

        <PurchaseDeliveryBanner
          title={storeHubPurchaseBanner.title}
          detail={storeHubPurchaseBanner.detail}
          acceptLabel={storeHubPurchaseBanner.acceptLabel}
          onAccept={() => {}}
          onFlagVariance={() => {}}
        />

        <div className="flex flex-col gap-3">
          <span className="font-ui text-sm/sm font-semibold text-text-primary">{storeHubQuickOpsTitle}</span>
          <ActionTileGrid tiles={actionTiles} />
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-ui text-sm/sm font-semibold text-text-primary">{storeHubMovementLogTitle}</span>
          {storeHubMovementLog.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border-b border-solid border-border-subtle py-3 last:border-b-0">
              <div className="flex flex-col gap-0.5">
                <span className="font-ui text-sm/sm font-medium text-text-primary">{entry.title}</span>
                <span className="font-ui text-caption/caption text-text-secondary">{entry.detail}</span>
              </div>
              <span className={`font-mono text-sm/sm font-semibold ${entry.positive ? "text-success" : "text-danger"}`}>{entry.delta}</span>
            </div>
          ))}
        </div>
      </div>
    </StaffShell>
  );
}
