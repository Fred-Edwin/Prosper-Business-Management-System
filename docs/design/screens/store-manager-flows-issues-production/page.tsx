"use client";

import * as React from "react";
import { FlowHeader } from "@/components/kit/flow-header";
import { InfoBanner } from "@/components/kit/banner";
import { Select } from "@/components/kit/select";
import { cn } from "@/lib/utils";
import { issueIngredientsFlow, recordBatchProductionFlow } from "./mock-data";

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex h-[844px] w-[390px] shrink-0 flex-col overflow-hidden border border-solid border-border-subtle bg-surface-page">{children}</div>;
}

export default function StoreManagerFlowsIssuesProductionScreen() {
  return (
    <div className="flex min-h-screen w-full flex-wrap items-start justify-center gap-10 bg-surface-subtle p-10">
      <PhoneFrame>
        <FlowHeader title={issueIngredientsFlow.title} direction={issueIngredientsFlow.direction} onBack={() => {}} />
        <div className="flex grow flex-col gap-4 overflow-y-auto px-4 py-4">
          <span className="font-ui text-sm/sm font-semibold text-text-primary">{issueIngredientsFlow.sectionLabel}</span>
          {issueIngredientsFlow.items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex flex-col gap-2 rounded-md border border-solid p-3",
                item.active ? "border-danger bg-danger-bg" : "border-border-subtle",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-ui text-sm/sm font-medium text-text-primary">{item.name}</span>
                <span className="font-ui text-caption/caption text-text-secondary">{item.available}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-ui text-sm/sm text-text-secondary">Issue Qty:</span>
                <div className="flex h-9 items-center gap-1.5 rounded-sm border border-solid border-border-strong bg-surface-page px-3">
                  <span className="font-ui text-sm/sm text-text-primary">{item.issueQty}</span>
                  <span className="font-ui text-sm/sm text-text-tertiary">{item.unit}</span>
                </div>
              </div>
            </div>
          ))}
          <Select label={issueIngredientsFlow.receivingChefLabel} defaultValue={issueIngredientsFlow.receivingChef}>
            <option>{issueIngredientsFlow.receivingChef}</option>
          </Select>
        </div>
        <div className="flex h-16 w-full shrink-0 items-center border-t border-solid border-border-subtle px-4">
          <button type="button" className="flex h-11 w-full items-center justify-center rounded-sm bg-accent font-ui text-sm/sm font-medium text-white outline-none">
            {issueIngredientsFlow.confirmLabel}
          </button>
        </div>
      </PhoneFrame>

      <PhoneFrame>
        <FlowHeader title={recordBatchProductionFlow.title} direction={recordBatchProductionFlow.direction} onBack={() => {}} />
        <div className="flex grow flex-col gap-4 overflow-y-auto px-4 py-4">
          <Select label={recordBatchProductionFlow.cookedDishLabel} defaultValue={recordBatchProductionFlow.cookedDish}>
            <option>{recordBatchProductionFlow.cookedDish}</option>
          </Select>
          <div className="flex flex-col gap-2">
            <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">
              {recordBatchProductionFlow.quantityLabel}
            </span>
            <div className="flex h-9 items-center gap-1.5 rounded-sm border border-solid border-border-strong bg-surface-page px-3">
              <span className="font-ui text-sm/sm font-semibold text-success">{recordBatchProductionFlow.quantity}</span>
              <span className="font-ui text-sm/sm text-text-tertiary">{recordBatchProductionFlow.quantityUnit}</span>
            </div>
          </div>
          <InfoBanner>{recordBatchProductionFlow.stockRoutingNote}</InfoBanner>
          <div className="flex flex-col gap-2">
            <span className="font-ui text-caption/caption font-medium uppercase tracking-[0.04em] text-text-secondary">
              {recordBatchProductionFlow.productionTimeLabel}
            </span>
            <div className="flex h-9 items-center rounded-sm border border-solid border-border-strong bg-surface-page px-3">
              <span className="font-ui text-sm/sm text-text-primary">{recordBatchProductionFlow.productionTime}</span>
            </div>
          </div>
        </div>
        <div className="flex h-16 w-full shrink-0 items-center border-t border-solid border-border-subtle px-4">
          <button type="button" className="flex h-11 w-full items-center justify-center rounded-sm bg-accent font-ui text-sm/sm font-medium text-white outline-none">
            {recordBatchProductionFlow.confirmLabel}
          </button>
        </div>
      </PhoneFrame>
    </div>
  );
}
