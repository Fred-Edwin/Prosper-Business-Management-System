// Screen skeleton transcribed from the Paper artboard "Store Manager Flows — Transfers &
// Consumption" (92M-0) via get_jsx (Tailwind format). The artboard draws TWO separate
// full phone screens side by side; both are transcribed here as sibling phone frames,
// exactly as drawn. Classes left as Paper emitted them; only literal data lifted into
// ./fixtures.ts. The mobile status-bar node is dropped; each phone root `w-[390px]
// h-[844px]` is kept.
//
// Kit swap: the flow header → kit <FlowHeader> with the Session-4c `directionTone` prop
// (`info` for Transfer, `warning` for Non-Sale). `className="w-full"` overrides the kit
// header's `w-[390px]` so it fits the phone frame.
// NO kit swap for the rest — bespoke mobile markup (4b admin-stock-mobile precedent):
//   • Category tabs: `h-[32px] px-(--sp-6) rounded-lg`, active = `bg-accent` +
//     `text-white`, inactive = `bg-(--surface-subtle)` + `text-secondary`, `text-body/sm`
//     — NOT the kit <PillFilter> (which is `bg-(--surface-selected)` + `text-accent`
//     active, `text-sm/sm`, no inactive bg). Transcribed inline.
//   • Transfer-qty stepper: bespoke `w-[32px] h-[32px]` −/+ buttons + a `w-[32px]`
//     value — not the kit <QuantityStepper> (`h-[36px]` bordered group with unit cell).
//   • Search rows / reason chevron row / notes box are bespoke, kept verbatim.
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
import * as React from "react";
import { FlowHeader } from "@/components/kit/flow-header";
import {
  nonSaleFields,
  nonSaleFlow,
  nonSaleItem,
  transferActiveCategoryTab,
  transferCategoryTabs,
  transferFlow,
  transferSelectedItem,
  transferUnselectedItem,
} from "./fixtures";

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" fill="none" stroke="var(--text-secondary)" strokeWidth="2" />
    </svg>
  );
}

function SearchRow({ placeholder }: { placeholder: string }) {
  return (
    <div className="flex items-center h-[40px] px-(--sp-5) rounded-sm gap-(--sp-3) shrink-0 border border-solid [border-color:var(--border-strong)]">
      <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <circle cx="11" cy="11" r="8" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="var(--text-tertiary)" strokeWidth="1.5" />
      </svg>
      <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-body/sm">
        {placeholder}
      </div>
    </div>
  );
}

function StickyBar({ label }: { label: string }) {
  return (
    <div className="flex items-center [width:100%] h-[64px] shrink-0 px-(--sp-6) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
      <div className="flex items-center justify-center h-[44px] [width:100%] rounded-sm bg-accent">
        <div className="font-ui font-(--weight-semibold) inline-block w-max shrink-0 text-white text-body/sm">
          {label}
        </div>
      </div>
    </div>
  );
}

function TransferStockPanel() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-[390px] h-[844px] flex-col font-ui shrink-0 bg-(--surface-page) antialiased text-caption/micro">
      <FlowHeader
        title={transferFlow.title}
        direction={transferFlow.direction}
        directionTone={transferFlow.directionTone}
        className="w-full"
      />

      <div className="flex flex-col grow min-h-[0px] p-(--sp-6) overflow-clip gap-(--sp-5)">
        <SearchRow placeholder={transferFlow.searchPlaceholder} />

        {/* Category tabs */}
        <div className="flex items-center gap-(--sp-3)">
          {transferCategoryTabs.map((tab) => {
            const isActive = tab === transferActiveCategoryTab;
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
              {transferSelectedItem.name}
            </div>
            <div className="font-ui inline-block text-accent text-caption/micro">
              {transferSelectedItem.availLabel}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-secondary)] text-sm/micro">
              {transferSelectedItem.qtyLabel}
            </div>
            <div className="flex items-center gap-(--sp-4)">
              <div className="flex items-center justify-center w-[32px] h-[32px] rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                <div className="font-ui inline-block [color:var(--text-secondary)] text-h2/body">−</div>
              </div>
              <div className="font-mono font-(--weight-semibold) w-[32px] text-center inline-block shrink-0 text-accent text-body/sm">
                {transferSelectedItem.qty}
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
              {transferUnselectedItem.name}
            </div>
            <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
              {transferUnselectedItem.availLabel}
            </div>
          </div>
          <div className="flex items-center justify-center h-[32px] shrink-0 px-(--sp-5) rounded-sm [background-color:var(--surface-subtle)]">
            <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-sm/micro">
              {transferUnselectedItem.selectLabel}
            </div>
          </div>
        </div>

        {/* Dispatch note */}
        <div className="flex items-start p-(--sp-5) rounded-sm [background-color:var(--surface-subtle)]">
          <div className="font-ui inline-block [color:var(--text-secondary)] text-sm/sm">
            {transferFlow.dispatchNote}
          </div>
        </div>
      </div>

      <StickyBar label={transferFlow.confirmLabel} />
    </div>
  );
}

function LogNonSalePanel() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-[390px] h-[844px] flex-col font-ui shrink-0 bg-(--surface-page) antialiased text-caption/micro">
      <FlowHeader
        title={nonSaleFlow.title}
        direction={nonSaleFlow.direction}
        directionTone={nonSaleFlow.directionTone}
        className="w-full"
      />

      <div className="flex flex-col grow min-h-[0px] p-(--sp-6) overflow-clip gap-(--sp-5)">
        <SearchRow placeholder={nonSaleFlow.searchPlaceholder} />

        {/* Consumed item card */}
        <div className="flex flex-col p-(--sp-5) rounded-md gap-(--sp-4) bg-warning-bg border border-solid border-warning">
          <div className="flex items-start justify-between">
            <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
              {nonSaleItem.name}
            </div>
            <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
              {nonSaleItem.availLabel}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-secondary)] text-sm/micro">
              {nonSaleItem.qtyLabel}
            </div>
            <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm gap-(--sp-3) bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
              <div className="font-mono font-(--weight-semibold) inline-block text-warning text-body/sm">
                {nonSaleItem.qty}
              </div>
              <div className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                {nonSaleItem.unit}
              </div>
            </div>
          </div>
        </div>

        {/* Consumption reason */}
        <div className="flex flex-col gap-(--sp-3)">
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
            {nonSaleFields.reasonLabel}
          </div>
          <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui inline-block [color:var(--text-primary)] text-body/sm">
              {nonSaleFields.reasonValue}
            </div>
            <ChevronDown />
          </div>
        </div>

        {/* Optional notes */}
        <div className="flex flex-col gap-(--sp-3)">
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
            {nonSaleFields.notesLabel}
          </div>
          <div className="flex min-h-[56px] p-(--sp-5) rounded-sm border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui inline-block [color:var(--text-primary)] text-body/body">
              {nonSaleFields.notesValue}
            </div>
          </div>
        </div>
      </div>

      <StickyBar label={nonSaleFlow.confirmLabel} />
    </div>
  );
}

export default function StoreManagerFlowsTransfersConsumptionScreen() {
  return (
    <div className="flex flex-row items-start gap-(--sp-9)">
      <TransferStockPanel />
      <LogNonSalePanel />
    </div>
  );
}
