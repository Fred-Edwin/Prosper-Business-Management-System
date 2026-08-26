"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/shells/admin-shell";
import { StatTileRow } from "@/components/kit/stat-tile-row";
import { Tabs } from "@/components/kit/tabs";
import { StatusChip, type StatusChipTone } from "@/components/kit/status-chip";
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
      toolbarSubtitle={financialsDateSubtitle}
      toolbarActions={
        <Button variant="primary">
          <Plus className="size-3.5" strokeWidth={1.5} aria-hidden />
          Record Payment
        </Button>
      }
      accountName="Edwinfred Kamau"
      accountRole="Admin"
      accountInitials="EK"
      onAccountClick={() => {}}
    >
      <div className="flex flex-col gap-6 px-6 py-4">
        <StatTileRow tiles={financialsStatTiles} />

        <Tabs items={financialsTabs as unknown as { key: string; label: string }[]} activeKey={activeTab} onChange={setActiveTab} />

        <div className="flex w-full flex-col border border-solid border-border-subtle">
          <div className="flex h-8 shrink-0 items-center gap-6 border-b border-solid border-gray-600 bg-info-bg px-6">
            <span className="w-[100px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Date</span>
            <span className="min-w-[253px] grow font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Vendor / Description</span>
            <span className="w-[110px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Destination</span>
            <span className="w-[130px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Paid From</span>
            <span className="w-[100px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Quantity</span>
            <span className="w-[130px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">
              Amount (KES)
            </span>
            <span className="w-[150px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">
              Delivery Status
            </span>
            <span className="w-[50px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Action</span>
          </div>
          {financialsTransactions.map((row) => (
            <div
              key={row.id}
              className="flex h-[52px] shrink-0 items-center gap-6 border-b border-solid border-border-subtle px-6 last:border-b-0"
            >
              <span className="w-[100px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.date}</span>
              <div className="flex min-w-[253px] grow flex-col gap-0.5">
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

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-ui text-h2/h2 font-semibold text-text-primary">{financialsReconciliation.title}</h2>
            <p className="font-ui text-sm/sm text-text-secondary">{financialsReconciliation.description}</p>
          </div>

          <div className="flex w-full flex-col border border-solid border-border-subtle">
            <div className="flex h-8 shrink-0 items-center gap-6 border-b border-solid border-gray-600 bg-info-bg px-6">
              <span className="min-w-[253px] grow font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">
                Vendor / Description
              </span>
              <span className="w-[130px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">
                Amount (KES)
              </span>
              <span className="w-[180px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Status</span>
              <span className="w-[50px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Action</span>
            </div>
            {financialsReconciliation.items.map((item) => (
              <div
                key={item.id}
                className="flex h-11 shrink-0 items-center gap-6 border-b border-solid border-border-subtle px-6 last:border-b-0"
              >
                <div className="flex min-w-[253px] grow flex-col gap-0.5">
                  <span className="font-ui text-sm/sm font-medium text-text-primary">{item.title}</span>
                  <span className="font-ui text-sm/sm text-text-secondary">{item.fields[0]?.value}</span>
                </div>
                <span className="w-[130px] shrink-0 text-right font-mono text-sm/sm text-text-primary">
                  {item.fields[1]?.value.replace("KES ", "")}
                </span>
                <span className="w-[180px] shrink-0">
                  <StatusChip tone="warning" label={item.badgeLabel} />
                </span>
                <button
                  type="button"
                  className="w-[50px] shrink-0 text-left font-ui text-sm/sm font-medium text-accent outline-none hover:underline"
                >
                  {item.actionLabel}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
