"use client";

import * as React from "react";
import { CalendarDays, Maximize2 } from "lucide-react";
import { AdminShell } from "@/components/shells/admin-shell";
import { PillFilter } from "@/components/kit/pill-filter";
import { DenseLedger } from "@/components/kit/dense-ledger";
import { Button } from "@/components/kit/button";
import { ledgerLocationPills, ledgerToolbar, ledgerRows } from "./mock-data";

export default function AdminStockLedgerFullWidthScreen() {
  const [activeLocation, setActiveLocation] = React.useState<string>("all");

  return (
    <AdminShell
      activeNavKey="stock"
      onNavigate={() => {}}
      toolbarTitle={ledgerToolbar.title}
      accountName="Edwinfred Kamau"
      accountRole="Admin"
      accountInitials="EK"
      onAccountClick={() => {}}
    >
      <div className="flex items-center justify-end gap-3 border-b border-solid border-border-subtle px-6 py-2">
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-sm border border-solid border-border-strong px-3 font-ui text-sm/sm text-text-primary outline-none"
        >
          <CalendarDays className="size-3.5" strokeWidth={1.5} aria-hidden />
          {ledgerToolbar.dateLabel}
        </button>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-sm border border-solid border-border-strong px-3 font-ui text-sm/sm text-text-primary outline-none"
        >
          <Maximize2 className="size-3.5" strokeWidth={1.5} aria-hidden />
          Maximize
        </button>
        <Button variant="primary">Opening Stock</Button>
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
