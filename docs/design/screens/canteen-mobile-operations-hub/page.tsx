"use client";

import * as React from "react";
import { LayoutGrid, Boxes, History, ClipboardList, Repeat, ChevronRight } from "lucide-react";
import { StaffShell } from "@/components/shells/staff-shell";
import type { BottomNavItem } from "@/components/kit/bottom-nav";
import { TransferBanner } from "@/components/kit/banner";
import { canteenHubTransferBanner, canteenWorkflowsTitle, canteenWorkflows, canteenLogTitle, canteenLog } from "./mock-data";

const NAV_ITEMS: BottomNavItem[] = [
  { key: "hub", label: "Hub", icon: LayoutGrid, href: "/canteen" },
  { key: "stock", label: "Stock", icon: Boxes, href: "/canteen/stock" },
  { key: "history", label: "History", icon: History, href: "/canteen/history" },
];

const WORKFLOW_ICONS = [ClipboardList, Repeat];

export default function CanteenMobileOperationsHubScreen() {
  return (
    <StaffShell
      roleLabel="Canteen"
      locationLabel="Canteen Operations"
      accountInitials="SA"
      navItems={NAV_ITEMS}
      activeNavKey="hub"
      onNavigate={() => {}}
      onMenuClick={() => {}}
      onAccountClick={() => {}}
    >
      <div className="flex w-full flex-col gap-5 px-4 py-4">
        <TransferBanner
          title={canteenHubTransferBanner.title}
          detail={canteenHubTransferBanner.detail}
          acceptLabel={canteenHubTransferBanner.acceptLabel}
          onAccept={() => {}}
          onFlagVariance={() => {}}
        />

        <div className="flex flex-col gap-3">
          <span className="font-ui text-sm/sm font-semibold text-text-primary">{canteenWorkflowsTitle}</span>
          {canteenWorkflows.map((wf, i) => {
            const Icon = WORKFLOW_ICONS[i];
            return (
              <button
                key={wf.key}
                type="button"
                className="flex items-center gap-3 rounded-md border border-solid border-border-subtle p-3 text-left outline-none hover:bg-surface-hover"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-selected">
                  <Icon className="size-5 text-accent" strokeWidth={1.5} aria-hidden />
                </div>
                <div className="flex min-w-0 grow flex-col gap-0.5">
                  <span className="font-ui text-h2/h2 font-semibold text-text-primary">{wf.title}</span>
                  {wf.description && <span className="font-ui text-caption/caption text-text-secondary">{wf.description}</span>}
                </div>
                <ChevronRight className="size-4 shrink-0 text-text-tertiary" strokeWidth={1.5} aria-hidden />
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-ui text-sm/sm font-semibold text-text-primary">{canteenLogTitle}</span>
          {canteenLog.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border-b border-solid border-border-subtle py-3 last:border-b-0">
              <span className="font-ui text-sm/sm text-text-primary">{entry.text}</span>
              <span className="font-mono text-caption/caption text-text-tertiary">{entry.time}</span>
            </div>
          ))}
        </div>
      </div>
    </StaffShell>
  );
}
