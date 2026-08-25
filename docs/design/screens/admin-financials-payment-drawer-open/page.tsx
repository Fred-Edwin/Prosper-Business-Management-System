"use client";

import * as React from "react";
import { X } from "lucide-react";
import { AdminShell } from "@/components/shells/admin-shell";
import { StatTileRow } from "@/components/kit/stat-tile-row";
import { Tabs } from "@/components/kit/tabs";
import { StatusChip, type StatusChipTone } from "@/components/kit/status-chip";
import { Select } from "@/components/kit/select";
import { InfoBanner } from "@/components/kit/banner";
import { Button } from "@/components/kit/button";
import { cn } from "@/lib/utils";
import {
  financialsDateSubtitle,
  financialsStatTiles,
  financialsTabs,
  financialsTransactions,
  paymentDrawerMock,
} from "./mock-data";

export default function AdminFinancialsPaymentDrawerOpenScreen() {
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [paidFrom, setPaidFrom] = React.useState(paymentDrawerMock.paidFromOptions.find((o) => o.active)?.key ?? "cash");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="min-w-0 grow">
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
          </div>

          <div className="flex flex-col gap-6 px-6 py-4">
            <StatTileRow tiles={financialsStatTiles} />
            <Tabs items={financialsTabs as unknown as { key: string; label: string }[]} activeKey={activeTab} onChange={setActiveTab} />

            <div className="flex w-full flex-col rounded-none border border-solid border-border-subtle">
              <div className="flex h-8 shrink-0 items-center gap-4 border-b border-solid border-gray-600 bg-info-bg px-6">
                <span className="w-[100px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Date</span>
                <span className="min-w-[253px] grow font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Vendor / Description</span>
                <span className="w-[100px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Amount</span>
                <span className="w-[150px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Status</span>
              </div>
              {financialsTransactions.map((row) => (
                <div key={row.id} className="flex items-center gap-4 border-b border-solid border-border-subtle px-6 py-2 last:border-b-0">
                  <span className="w-[100px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.date}</span>
                  <div className="flex min-w-[253px] grow flex-col">
                    <span className="font-ui text-sm/sm font-medium text-text-primary">{row.vendor}</span>
                    <span className="font-ui text-sm/sm text-text-secondary">{row.description}</span>
                  </div>
                  <span className="w-[100px] shrink-0 text-right font-mono text-sm/sm text-text-primary">{row.amount}</span>
                  <span className="w-[150px] shrink-0">
                    <StatusChip tone={row.statusTone as StatusChipTone} label={row.statusLabel} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AdminShell>
      </div>

      <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-solid border-border-subtle bg-surface-page">
        <div className="flex shrink-0 items-start justify-between border-b border-solid border-border-subtle px-6 py-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-ui text-h1/h1 font-semibold text-text-primary">{paymentDrawerMock.title}</h2>
            <p className="font-ui text-sm/sm text-text-secondary">{paymentDrawerMock.subtitle}</p>
          </div>
          <button type="button" className="outline-none" aria-label="Close">
            <X className="size-4 text-text-tertiary" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="flex grow flex-col gap-5 overflow-y-auto px-6 py-5">
          <Select label="Supplier / Vendor *" defaultValue={paymentDrawerMock.supplier}>
            <option>{paymentDrawerMock.supplier}</option>
          </Select>

          <div className="flex gap-3">
            <div className="grow">
              <Select label="Product *" defaultValue={paymentDrawerMock.product}>
                <option>{paymentDrawerMock.product}</option>
              </Select>
            </div>
            <div className="w-[140px] shrink-0">
              <Select label="Destination" defaultValue={paymentDrawerMock.destination}>
                <option>{paymentDrawerMock.destination}</option>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-col gap-2">
              <label className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">Quantity *</label>
              <div className="flex h-9 items-center gap-1.5 rounded-sm border border-solid border-border-strong bg-surface-page px-3">
                <span className="font-ui text-sm/sm text-text-primary">{paymentDrawerMock.quantity}</span>
                <span className="font-ui text-sm/sm text-text-tertiary">{paymentDrawerMock.quantityUnit}</span>
              </div>
            </div>
            <div className="flex grow flex-col gap-2">
              <label className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">Total Cost *</label>
              <div className="flex h-9 items-center rounded-sm border border-solid border-border-strong bg-surface-page px-3">
                <span className="font-ui text-sm/sm text-text-primary">{paymentDrawerMock.totalCost}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">Paid From *</span>
            <div className="flex h-10 items-center gap-0.5 rounded-sm bg-surface-subtle p-0.5">
              {paymentDrawerMock.paidFromOptions.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPaidFrom(opt.key)}
                  className={cn(
                    "flex h-9 grow items-center justify-center rounded-[4px] px-3 font-ui text-sm/sm outline-none",
                    paidFrom === opt.key ? "bg-surface-page font-medium text-text-primary shadow-[0_1px_2px_#00000014]" : "text-text-secondary",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <InfoBanner>{paymentDrawerMock.infoNote}</InfoBanner>
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-solid border-border-subtle px-6 py-5">
          <Button variant="secondary">Cancel</Button>
          <Button variant="primary" className="grow">
            Disburse & Register Delivery
          </Button>
        </div>
      </div>
    </div>
  );
}
