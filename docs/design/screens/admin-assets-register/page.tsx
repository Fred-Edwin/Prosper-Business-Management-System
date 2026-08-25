"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { AdminShell } from "@/components/shells/admin-shell";
import { Tabs } from "@/components/kit/tabs";
import { Select } from "@/components/kit/select";
import { ConditionChip } from "@/components/kit/condition-chip";
import { Button } from "@/components/kit/button";
import { assetsCountBadge, assetsCategoryTabs, assetRows, assetsRegisterFooter } from "./mock-data";

export default function AdminAssetsRegisterScreen() {
  const [activeTab, setActiveTab] = React.useState<string>("all");

  return (
    <AdminShell
      activeNavKey="assets"
      onNavigate={() => {}}
      toolbarTitle="Physical Assets Register"
      accountName="Edwinfred Kamau"
      accountRole="Admin"
      accountInitials="EK"
      onAccountClick={() => {}}
    >
      <div className="flex items-center justify-between border-b border-solid border-border-subtle px-6 py-2">
        <span className="rounded-lg bg-surface-hover px-2 py-1 font-ui text-sm/sm text-text-secondary">{assetsCountBadge}</span>
        <Button variant="primary">
          <Plus className="size-3.5" strokeWidth={1.5} aria-hidden />
          Register New Asset
        </Button>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between">
          <Tabs items={assetsCategoryTabs as unknown as { key: string; label: string }[]} activeKey={activeTab} onChange={setActiveTab} />
          <div className="flex items-center gap-3">
            <Select defaultValue="all" className="w-[110px]">
              <option value="all">Location: All</option>
            </Select>
            <Select defaultValue="all" className="w-[120px]">
              <option value="all">Condition: All</option>
            </Select>
          </div>
        </div>

        <div className="flex w-full flex-col rounded-none border border-solid border-border-subtle">
          <div className="flex h-8 shrink-0 items-center gap-6 border-b border-solid border-gray-600 bg-info-bg px-6">
            <span className="min-w-[200px] grow font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Asset Name</span>
            <span className="w-[160px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Category</span>
            <span className="w-[150px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Location</span>
            <span className="w-[130px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Purchase Date</span>
            <span className="w-[120px] shrink-0 text-right font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Cost Basis (KES)</span>
            <span className="w-[110px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Condition</span>
            <span className="w-[50px] shrink-0 font-ui text-[10px] font-semibold uppercase tracking-[0.04em] text-info">Edit</span>
          </div>
          {assetRows.map((row) => (
            <div key={row.id} className="flex h-11 shrink-0 items-center gap-6 border-b border-solid border-border-subtle px-6 last:border-b-0">
              <span className="min-w-[200px] grow font-ui text-sm/sm font-medium text-text-primary">{row.name}</span>
              <span className="w-[160px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.category}</span>
              <span className="w-[150px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.location}</span>
              <span className="w-[130px] shrink-0 font-ui text-sm/sm text-text-secondary">{row.purchaseDate}</span>
              <span className="w-[120px] shrink-0 text-right font-mono text-sm/sm text-text-primary">{row.costBasis}</span>
              <span className="w-[110px] shrink-0">
                <ConditionChip condition={row.condition} />
              </span>
              <button type="button" className="w-[50px] shrink-0 text-left font-ui text-sm/sm font-medium text-accent outline-none hover:underline">
                Edit
              </button>
            </div>
          ))}
        </div>

        <div className="flex h-11 shrink-0 items-center gap-8 rounded-md bg-gray-900 px-6">
          <span className="font-ui text-sm/sm font-semibold text-white">{assetsRegisterFooter.title}</span>
          <span className="font-ui text-sm/sm text-white/80">{assetsRegisterFooter.good}</span>
          <span className="font-ui text-sm/sm text-white/80">{assetsRegisterFooter.needsRepair}</span>
          <span className="font-ui text-sm/sm text-white/80">{assetsRegisterFooter.decommissioned}</span>
          <div className="ml-auto flex items-center gap-1.5 font-ui text-sm/sm">
            <span className="text-white/60">{assetsRegisterFooter.totalCostBasisLabel}</span>
            <span className="font-semibold text-white">{assetsRegisterFooter.totalCostBasis}</span>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
