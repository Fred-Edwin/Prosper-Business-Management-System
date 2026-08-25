"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/shells/admin-shell";
import { StatTileRow } from "@/components/kit/stat-tile-row";
import { Tabs } from "@/components/kit/tabs";
import { StatusChip, type StatusChipTone } from "@/components/kit/status-chip";
import { MatchCard } from "@/components/kit/match-card";
import { Button } from "@/components/kit/button";
import {
  financialsDateSubtitle,
  financialsStatTiles,
  financialsTabs,
  financialsTransactions,
  financialsReconciledFooter,
  financialsReconciliation,
} from "./mock-data";

export default function AdminFinancialsFullTableScreen() {
  const [activeTab, setActiveTab] = React.useState<string>("all");

  return (
    <AdminShell
      activeNavKey="financials"
      onNavigate={() => {}}
      toolbarTitle="Financials & Expenses"
      accountName="Edwinfred Kamau"
      accountRole="Admin"
      accountInitials="EK"
      onAccountClick={() => {}}
    >
      <div className="flex items-center justify-between border-b border-solid border-border-subtle px-6 py-2">
        <span className="font-ui text-sm/sm text-text-secondary">{financialsDateSubtitle}</span>
        <Button variant="primary">
          <Plus className="size-3.5" strokeWidth={1.5} aria-hidden />
          Record Payment
        </Button>
      </div>

      <div className="flex flex-col gap-6 px-6 py-4">
        <StatTileRow tiles={financialsStatTiles} />

        <Tabs items={financialsTabs as unknown as { key: string; label: string }[]} activeKey={activeTab} onChange={setActiveTab} />

        <div className="flex w-full flex-col rounded-none border border-solid border-border-subtle">
          <div className="flex h-8 shrink-0 items-center gap-4 border-b border-solid border-gray-600 bg-info-bg px-6">
            <span className="w-[100px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Date</span>
            <span className="min-w-[253px] grow font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Vendor / Description</span>
            <span className="w-[110px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Destination</span>
            <span className="w-[130px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Paid From</span>
            <span className="w-[100px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Quantity</span>
            <span className="w-[130px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Amount (KES)</span>
            <span className="w-[150px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Delivery Status</span>
            <span className="w-[50px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Action</span>
          </div>
          {financialsTransactions.map((row) => (
            <div key={row.id} className="flex items-center gap-4 border-b border-solid border-border-subtle px-6 py-2 last:border-b-0">
              <span className="w-[100px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.date}</span>
              <div className="flex min-w-[253px] grow flex-col">
                <span className="font-ui text-sm/sm font-medium text-text-primary">{row.vendor}</span>
                <span className="font-ui text-sm/sm text-text-secondary">{row.description}</span>
              </div>
              <span className="w-[110px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.destination}</span>
              <span className="w-[130px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.paidFrom}</span>
              <span className="w-[100px] shrink-0 font-mono text-sm/sm text-text-primary">{row.quantity}</span>
              <span className="w-[130px] shrink-0 text-right font-mono text-sm/sm text-text-primary">{row.amount}</span>
              <span className="w-[150px] shrink-0">
                <StatusChip tone={row.statusTone as StatusChipTone} label={row.statusLabel} />
              </span>
              <button type="button" className="w-[50px] shrink-0 text-left font-ui text-sm/sm font-medium text-accent outline-none hover:underline">
                Edit
              </button>
            </div>
          ))}
        </div>

        <div className="flex h-11 shrink-0 items-center gap-8 rounded-md bg-gray-900 px-6">
          <span className="font-ui text-sm/sm font-semibold text-white">{financialsReconciledFooter.title}</span>
          <div className="flex items-center gap-1.5 font-ui text-sm/sm">
            <span className="text-white/60">Cash Payments:</span>
            <span className="font-medium text-white">{financialsReconciledFooter.cashPayments}</span>
          </div>
          <div className="flex items-center gap-1.5 font-ui text-sm/sm">
            <span className="text-white/60">Bank / M-Pesa:</span>
            <span className="font-medium text-white">{financialsReconciledFooter.bankMpesa}</span>
          </div>
          <div className="ml-auto flex items-center gap-1.5 font-ui text-sm/sm">
            <span className="text-white/60">Total Outflow:</span>
            <span className="font-semibold text-white">{financialsReconciledFooter.totalOutflow}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="font-ui text-h1/h1 font-semibold text-text-primary">{financialsReconciliation.title}</h3>
          <p className="font-ui text-sm/sm text-text-secondary">{financialsReconciliation.description}</p>
          <div className="grid grid-cols-3 gap-4">
            {financialsReconciliation.items.map((item) => (
              <MatchCard
                key={item.id}
                title={item.title}
                badgeLabel={item.badgeLabel}
                fields={item.fields}
                actionLabel={item.actionLabel}
                onMatch={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
