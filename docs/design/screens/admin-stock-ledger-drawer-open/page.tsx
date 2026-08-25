"use client";

import * as React from "react";
import { Maximize2, X } from "lucide-react";
import { AdminShell } from "@/components/shells/admin-shell";
import { PillFilter } from "@/components/kit/pill-filter";
import { DenseLedger } from "@/components/kit/dense-ledger";
import { CalculatedImpactBanner } from "@/components/kit/banner";
import { Textarea } from "@/components/kit/textarea";
import { Button } from "@/components/kit/button";
import { ledgerLocationPills, ledgerToolbar, ledgerRows, correctionDrawerMock } from "./mock-data";

export default function AdminStockLedgerDrawerOpenScreen() {
  const [activeLocation, setActiveLocation] = React.useState<string>("all");

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="min-w-0 grow">
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
              <Maximize2 className="size-3.5" strokeWidth={1.5} aria-hidden />
              Maximize
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
      </div>

      <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-solid border-border-subtle bg-surface-page">
        <div className="flex shrink-0 items-start justify-between border-b border-solid border-border-subtle px-6 py-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-ui text-h1/h1 font-semibold text-text-primary">{correctionDrawerMock.title}</h2>
            <p className="font-ui text-sm/sm text-text-secondary">{correctionDrawerMock.subtitle}</p>
          </div>
          <button type="button" className="outline-none" aria-label="Close">
            <X className="size-4 text-text-tertiary" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="flex grow flex-col gap-5 overflow-y-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <span className="font-ui text-sm/sm text-text-secondary">Opening Stock</span>
            <span className="font-ui text-sm/sm font-medium text-text-primary">{correctionDrawerMock.openingStock}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-ui text-sm/sm text-text-secondary">Purchases (+)</span>
            <span className="font-ui text-sm/sm font-medium text-success">{correctionDrawerMock.purchases}</span>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-ui text-sm/sm font-medium text-text-primary">{correctionDrawerMock.kitchenIssueLabel}</span>
              <span className="font-ui text-caption/caption text-text-tertiary">{correctionDrawerMock.kitchenIssueOriginal}</span>
            </div>
            <div className="flex h-9 items-center justify-between rounded-sm border border-[1.5px] border-solid border-accent bg-surface-page px-3">
              <span className="font-ui text-sm/sm text-text-primary">{correctionDrawerMock.kitchenIssueValue}</span>
              <span className="font-ui text-sm/sm text-text-tertiary">{correctionDrawerMock.kitchenIssueUnit}</span>
            </div>
          </div>

          <CalculatedImpactBanner>{correctionDrawerMock.calculatedImpact}</CalculatedImpactBanner>

          <Textarea label={correctionDrawerMock.reasonLabel} defaultValue={correctionDrawerMock.reasonValue} rows={3} />
        </div>

        <div className="flex shrink-0 items-center gap-3 border-t border-solid border-border-subtle px-6 py-5">
          <Button variant="secondary">Close</Button>
          <Button variant="primary" className="grow">
            Confirm & Save Correction
          </Button>
        </div>
      </div>
    </div>
  );
}
