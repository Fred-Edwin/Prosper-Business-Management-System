"use client";

import * as React from "react";
import { FlowHeader } from "@/components/kit/flow-header";
import { SearchInput } from "@/components/kit/search-input";
import { PillFilter } from "@/components/kit/pill-filter";
import { InfoBanner } from "@/components/kit/banner";
import { Textarea } from "@/components/kit/textarea";
import { Select } from "@/components/kit/select";
import { transferStockFlow, logNonSaleFlow } from "./mock-data";

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex h-[844px] w-[390px] shrink-0 flex-col overflow-hidden border border-solid border-border-subtle bg-surface-page">{children}</div>;
}

export default function StoreManagerFlowsTransfersConsumptionScreen() {
  const [activePill, setActivePill] = React.useState("all");

  return (
    <div className="flex min-h-screen w-full flex-wrap items-start justify-center gap-10 bg-surface-subtle p-10">
      <PhoneFrame>
        <FlowHeader title={transferStockFlow.title} direction={transferStockFlow.direction} onBack={() => {}} />
        <div className="flex grow flex-col gap-4 overflow-y-auto px-4 py-4">
          <SearchInput placeholder={transferStockFlow.searchPlaceholder} />
          <PillFilter items={transferStockFlow.categoryPills} activeKey={activePill} onChange={setActivePill} />

          {transferStockFlow.items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-md border border-solid border-accent bg-surface-selected p-3">
              <div className="flex items-center justify-between">
                <span className="font-ui text-sm/sm font-medium text-text-primary">{item.name}</span>
                <span className="font-ui text-caption/caption text-text-secondary">{item.available}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-ui text-sm/sm text-text-secondary">Transfer Qty:</span>
                <div className="flex h-9 items-center gap-1.5 rounded-sm border border-solid border-border-strong bg-surface-page px-3">
                  <span className="font-ui text-sm/sm text-text-primary">{item.transferQty}</span>
                  <span className="font-ui text-sm/sm text-text-tertiary">{item.unit}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-md border border-solid border-border-subtle p-3">
            <div className="flex flex-col gap-1">
              <span className="font-ui text-sm/sm font-medium text-text-primary">{transferStockFlow.unselectedItem.name}</span>
              <span className="font-ui text-caption/caption text-text-secondary">{transferStockFlow.unselectedItem.available}</span>
            </div>
            <button type="button" className="font-ui text-sm/sm font-medium text-accent outline-none">
              {transferStockFlow.unselectedItem.selectLabel}
            </button>
          </div>

          <InfoBanner>{transferStockFlow.infoNote}</InfoBanner>
        </div>
        <div className="flex h-16 w-full shrink-0 items-center border-t border-solid border-border-subtle px-4">
          <button type="button" className="flex h-11 w-full items-center justify-center rounded-sm bg-accent font-ui text-sm/sm font-medium text-white outline-none">
            {transferStockFlow.confirmLabel}
          </button>
        </div>
      </PhoneFrame>

      <PhoneFrame>
        <FlowHeader title={logNonSaleFlow.title} direction={logNonSaleFlow.direction} onBack={() => {}} />
        <div className="flex grow flex-col gap-4 overflow-y-auto px-4 py-4">
          <SearchInput placeholder={logNonSaleFlow.searchPlaceholder} />

          <div className="flex flex-col gap-2 rounded-md border border-solid border-accent bg-surface-selected p-3">
            <div className="flex items-center justify-between">
              <span className="font-ui text-sm/sm font-medium text-text-primary">{logNonSaleFlow.item.name}</span>
              <span className="font-ui text-caption/caption text-text-secondary">{logNonSaleFlow.item.available}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-ui text-sm/sm text-text-secondary">Quantity Consumed:</span>
              <div className="flex h-9 items-center gap-1.5 rounded-sm border border-solid border-border-strong bg-surface-page px-3">
                <span className="font-ui text-sm/sm text-text-primary">{logNonSaleFlow.item.quantityConsumed}</span>
                <span className="font-ui text-sm/sm text-text-tertiary">{logNonSaleFlow.item.unit}</span>
              </div>
            </div>
          </div>

          <Select label={logNonSaleFlow.consumptionReasonLabel} defaultValue={logNonSaleFlow.consumptionReason}>
            <option>{logNonSaleFlow.consumptionReason}</option>
          </Select>

          <Textarea label={logNonSaleFlow.optionalNotesLabel} defaultValue={logNonSaleFlow.optionalNotes} rows={2} />
        </div>
        <div className="flex h-16 w-full shrink-0 items-center border-t border-solid border-border-subtle px-4">
          <button type="button" className="flex h-11 w-full items-center justify-center rounded-sm bg-accent font-ui text-sm/sm font-medium text-white outline-none">
            {logNonSaleFlow.confirmLabel}
          </button>
        </div>
      </PhoneFrame>
    </div>
  );
}
