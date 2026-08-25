"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { FlowHeader } from "@/components/kit/flow-header";
import { SearchInput } from "@/components/kit/search-input";
import { PillFilter } from "@/components/kit/pill-filter";
import { InfoBanner } from "@/components/kit/banner";
import { canteenTransferDispatch } from "./mock-data";

export default function CanteenTransferDispatchScreen() {
  const [activePill, setActivePill] = React.useState("all");

  return (
    <div className="flex min-h-screen w-full items-start justify-center bg-surface-subtle p-10">
      <div className="flex h-[844px] w-[390px] shrink-0 flex-col overflow-hidden border border-solid border-border-subtle bg-surface-page">
        <FlowHeader title={canteenTransferDispatch.title} direction={canteenTransferDispatch.direction} onBack={() => {}} />
        <div className="flex grow flex-col gap-4 overflow-y-auto px-4 py-4">
          <SearchInput placeholder={canteenTransferDispatch.searchPlaceholder} />
          <PillFilter items={canteenTransferDispatch.categoryPills} activeKey={activePill} onChange={setActivePill} />

          <div className="flex flex-col gap-3 rounded-md border border-solid border-accent bg-surface-selected p-3">
            <div className="flex items-center justify-between">
              <span className="font-ui text-h2/h2 font-semibold text-text-primary">{canteenTransferDispatch.selectedItem.name}</span>
              <span className="font-ui text-caption/caption text-text-secondary">{canteenTransferDispatch.selectedItem.available}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-ui text-sm/sm text-text-secondary">Transfer Qty:</span>
              <div className="flex h-8 items-center gap-2">
                <button type="button" className="flex size-8 items-center justify-center rounded-sm border border-solid border-border-strong outline-none">
                  <Minus className="size-3.5 text-text-primary" strokeWidth={1.5} aria-hidden />
                </button>
                <span className="w-8 text-center font-mono text-sm/sm font-medium text-text-primary">{canteenTransferDispatch.selectedItem.transferQty}</span>
                <button type="button" className="flex size-8 items-center justify-center rounded-sm border border-solid border-border-strong outline-none">
                  <Plus className="size-3.5 text-text-primary" strokeWidth={1.5} aria-hidden />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-solid border-border-subtle p-3">
            <div className="flex flex-col gap-1">
              <span className="font-ui text-h2/h2 font-semibold text-text-primary">{canteenTransferDispatch.unselectedItem.name}</span>
              <span className="font-ui text-caption/caption text-text-secondary">{canteenTransferDispatch.unselectedItem.available}</span>
            </div>
            <button type="button" className="font-ui text-sm/sm font-medium text-accent outline-none">
              {canteenTransferDispatch.unselectedItem.selectLabel}
            </button>
          </div>

          <InfoBanner>{canteenTransferDispatch.infoNote}</InfoBanner>
        </div>
        <div className="flex h-16 w-full shrink-0 items-center border-t border-solid border-border-subtle px-4">
          <button type="button" className="flex h-11 w-full items-center justify-center rounded-sm bg-accent font-ui text-sm/sm font-medium text-white outline-none">
            {canteenTransferDispatch.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
