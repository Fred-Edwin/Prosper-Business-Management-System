// Screen skeleton transcribed from the Paper artboard "Canteen — Transfer Dispatch"
// (9FE-0) via get_jsx (Tailwind format). Single full phone screen (mirrors the Store
// Manager "Transfer Stock" flow, Canteen → Store). Classes left as Paper emitted them;
// only literal data lifted into ./fixtures.ts. The mobile status-bar node is dropped; the
// phone root `w-[390px] h-[844px]` is kept.
//
// Kit swap: the flow header → kit <FlowHeader> with `directionTone="info"`
// (`className="w-full"` overrides the kit header's `w-[390px]` for the phone frame).
// NO kit swap for the rest — same as store-manager-flows-transfers-consumption:
//   • Category tabs are `bg-accent`/`text-white` active pills — NOT the kit <PillFilter>
//     (`--surface-selected`/`text-accent`, `text-sm/sm`). Transcribed inline.
//   • The transfer-qty stepper is bespoke `w-[32px] h-[32px]` −/+ buttons — not the kit
//     <QuantityStepper>. Kept verbatim.
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
import * as React from "react";
import { FlowHeader } from "@/components/kit/flow-header";
import {
  canteenTransferActiveCategoryTab,
  canteenTransferCategoryTabs,
  canteenTransferFlow,
  canteenTransferSelectedItem,
  canteenTransferUnselectedItem,
} from "./fixtures";

export default function CanteenTransferDispatchScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-[390px] h-[844px] flex-col font-ui bg-(--surface-page) antialiased text-caption/micro">
      <FlowHeader
        title={canteenTransferFlow.title}
        direction={canteenTransferFlow.direction}
        directionTone={canteenTransferFlow.directionTone}
        className="w-full"
      />

      {/* Content */}
      <div className="flex flex-col grow min-h-[0px] p-(--sp-6) overflow-clip gap-(--sp-5)">
        {/* Search row */}
        <div className="flex items-center h-[40px] px-(--sp-5) rounded-sm gap-(--sp-3) shrink-0 border border-solid [border-color:var(--border-strong)]">
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="var(--text-tertiary)" strokeWidth="1.5" />
          </svg>
          <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-body/sm">
            {canteenTransferFlow.searchPlaceholder}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex items-center gap-(--sp-3)">
          {canteenTransferCategoryTabs.map((tab) => {
            const isActive = tab === canteenTransferActiveCategoryTab;
            return (
              <div
                key={tab}
                className={`flex items-center justify-center h-[32px] shrink-0 px-(--sp-6) rounded-lg ${
                  isActive ? "bg-accent" : "[background-color:var(--surface-subtle)]"
                }`}
              >
                <div
                  className={`font-ui font-(--weight-medium) inline-block w-max shrink-0 text-body/sm ${
                    isActive ? "text-white" : "[color:var(--text-secondary)]"
                  }`}
                >
                  {tab}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected item card */}
        <div className="flex flex-col p-(--sp-5) rounded-md gap-(--sp-4) bg-(--surface-selected) border border-solid border-accent">
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
              {canteenTransferSelectedItem.name}
            </div>
            <div className="font-ui inline-block text-accent text-caption/micro">
              {canteenTransferSelectedItem.availLabel}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-secondary)] text-sm/micro">
              {canteenTransferSelectedItem.qtyLabel}
            </div>
            <div className="flex items-center gap-(--sp-4)">
              <div className="flex items-center justify-center w-[32px] h-[32px] rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                <div className="font-ui inline-block [color:var(--text-secondary)] text-h2/body">−</div>
              </div>
              <div className="font-mono font-(--weight-semibold) w-[32px] text-center inline-block shrink-0 text-accent text-body/sm">
                {canteenTransferSelectedItem.qty}
              </div>
              <div className="flex items-center justify-center w-[32px] h-[32px] rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                <div className="font-ui inline-block [color:var(--text-secondary)] text-h2/body">+</div>
              </div>
            </div>
          </div>
        </div>

        {/* Unselected item row */}
        <div className="flex items-center justify-between p-(--sp-5) rounded-md border border-solid [border-color:var(--border-subtle)]">
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
              {canteenTransferUnselectedItem.name}
            </div>
            <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
              {canteenTransferUnselectedItem.availLabel}
            </div>
          </div>
          <div className="flex items-center justify-center h-[32px] shrink-0 px-(--sp-5) rounded-sm [background-color:var(--surface-subtle)]">
            <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-sm/micro">
              {canteenTransferUnselectedItem.selectLabel}
            </div>
          </div>
        </div>

        {/* Info note */}
        <div className="flex items-start p-(--sp-5) rounded-sm [background-color:var(--surface-subtle)]">
          <div className="font-ui inline-block [color:var(--text-secondary)] text-sm/sm">
            {canteenTransferFlow.infoNote}
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="flex items-center [width:100%] h-[64px] shrink-0 px-(--sp-6) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="flex items-center justify-center h-[44px] [width:100%] rounded-sm bg-accent">
          <div className="font-ui font-(--weight-semibold) inline-block w-max shrink-0 text-white text-body/sm">
            {canteenTransferFlow.confirmLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
