"use client";

import * as React from "react";
import { PanelLeftOpen } from "lucide-react";
import { AdminShell } from "@/components/shells/admin-shell";
import { PillFilter } from "@/components/kit/pill-filter";
import { DenseLedger } from "@/components/kit/dense-ledger";
import { ledgerLocationPills, ledgerToolbar, ledgerRows } from "./mock-data";

export default function AdminStockLedgerSidebarCollapsedScreen() {
  const [activeLocation, setActiveLocation] = React.useState<string>("all");
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <AdminShell
      activeNavKey="stock"
      onNavigate={() => {}}
      toolbarTitle={ledgerToolbar.title}
      accountName="Edwinfred Kamau"
      accountRole="Admin"
      accountInitials="EK"
      onAccountClick={() => {}}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed((c) => !c)}
    >
      <div className="flex items-center justify-start gap-3 border-b border-solid border-border-subtle px-6 py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="flex size-6 items-center justify-center outline-none"
          aria-label="Reopen sidebar"
        >
          <PanelLeftOpen className="size-3.5 text-text-secondary" strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between">
          <PillFilter items={ledgerLocationPills as unknown as { key: string; label: string }[]} activeKey={activeLocation} onChange={setActiveLocation} />
          <div className="flex items-center gap-3">
            <button type="button" className="flex h-8 items-center rounded-sm border border-solid border-border-strong px-3 font-ui text-sm/sm text-text-primary outline-none">
              {ledgerToolbar.categoryFilterLabel}
            </button>
            <button type="button" className="flex h-8 items-center rounded-sm border border-solid border-border-strong px-3 font-ui text-sm/sm text-text-primary outline-none">
              {ledgerToolbar.columnsControlLabel}
            </button>
          </div>
        </div>

        <DenseLedger rows={ledgerRows} showLocation onEdit={() => {}} />
      </div>
    </AdminShell>
  );
}
