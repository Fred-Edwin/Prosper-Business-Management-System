// Screen skeleton transcribed from the Paper artboard "Store Manager Flows — Issues &
// Production" (8XH-0) via get_jsx (Tailwind format). The artboard draws TWO separate full
// phone screens side by side; both are transcribed here as sibling phone frames, exactly
// as drawn. Classes are left as Paper emitted them; only literal data was lifted into
// ./fixtures.ts. The mobile status-bar node is dropped; each phone root `w-[390px]
// h-[844px]` is kept so the two panels read as the artboard shows them.
//
// Kit swap: the flow header → kit <FlowHeader> with the Session-4c `directionTone` prop
// (`danger` for Issue, `success` for Production). The `w-[390px]` on the kit header is
// overridden to `w-full` via className so it fits the 390px phone frame exactly.
// NO kit swap for the rest:
//   • The quantity inputs are plain bordered value boxes with NO −/+ steppers — not the
//     kit <QuantityStepper>. The "Receiving Chef" / "Cooked Dish" rows are bespoke
//     chevron rows, not the kit <Select> markup. All kept verbatim (the 4b
//     admin-stock-mobile precedent — no kit component was drawn for these).
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
import * as React from "react";
import { FlowHeader } from "@/components/kit/flow-header";
import {
  issueFlow,
  issueIngredients,
  issueReceivingChef,
  productionFields,
  productionFlow,
} from "./fixtures";

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      <polyline points="6 9 12 15 18 9" fill="none" stroke="var(--text-secondary)" strokeWidth="2" />
    </svg>
  );
}

function IssueIngredientsPanel() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-[390px] h-[844px] flex-col font-ui shrink-0 bg-(--surface-page) antialiased text-caption/micro">
      <FlowHeader
        title={issueFlow.title}
        direction={issueFlow.direction}
        directionTone={issueFlow.directionTone}
        className="w-full"
      />

      {/* Content */}
      <div className="flex flex-col grow min-h-[0px] p-(--sp-6) overflow-clip gap-(--sp-5)">
        <div className="font-ui font-(--weight-semibold) tracking-[0.03em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
          {issueFlow.sectionLabel}
        </div>

        {issueIngredients.map((row) => (
          <div
            key={row.name}
            className={`flex flex-col p-(--sp-5) rounded-md gap-(--sp-4) border border-solid ${
              row.active
                ? "bg-danger-bg border-danger"
                : "[border-color:var(--border-subtle)]"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
                {row.name}
              </div>
              <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
                {row.availLabel}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div
                className={`font-ui font-(--weight-medium) inline-block text-sm/micro ${
                  row.active ? "text-danger" : "[color:var(--text-secondary)]"
                }`}
              >
                {row.qtyLabel}
              </div>
              <div
                className={`flex items-center h-[36px] px-(--sp-5) rounded-sm gap-(--sp-3) bg-(--surface-page) border border-solid ${
                  row.active ? "shrink-0 border-danger" : "[border-color:var(--border-strong)]"
                }`}
              >
                <div
                  className={`font-mono inline-block text-body/sm ${
                    row.active
                      ? "font-(--weight-semibold) w-max shrink-0 text-danger"
                      : "[color:var(--text-primary)]"
                  }`}
                >
                  {row.qty}
                </div>
                <div className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
                  {row.unit}
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="flex flex-col gap-(--sp-3)">
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
            {issueReceivingChef.label}
          </div>
          <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui inline-block [color:var(--text-primary)] text-body/sm">
              {issueReceivingChef.value}
            </div>
            <ChevronDown />
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="flex items-center [width:100%] h-[64px] shrink-0 px-(--sp-6) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="flex items-center justify-center h-[44px] [width:100%] rounded-sm bg-accent">
          <div className="font-ui font-(--weight-semibold) inline-block w-max shrink-0 text-white text-body/sm">
            {issueFlow.confirmLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecordBatchProductionPanel() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-[390px] h-[844px] flex-col font-ui shrink-0 bg-(--surface-page) antialiased text-caption/micro">
      <FlowHeader
        title={productionFlow.title}
        direction={productionFlow.direction}
        directionTone={productionFlow.directionTone}
        className="w-full"
      />

      {/* Content */}
      <div className="flex flex-col grow min-h-[0px] p-(--sp-6) overflow-clip gap-(--sp-5)">
        <div className="flex flex-col gap-(--sp-3)">
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
            {productionFields.cookedDishLabel}
          </div>
          <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid border-success">
            <div className="font-ui inline-block [color:var(--text-primary)] text-body/sm">
              {productionFields.cookedDishValue}
            </div>
            <ChevronDown />
          </div>
        </div>

        <div className="flex flex-col gap-(--sp-3)">
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
            {productionFields.quantityLabel}
          </div>
          <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
            <div className="font-mono font-(--weight-semibold) inline-block text-success text-body/sm">
              {productionFields.quantityValue}
            </div>
            <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
              {productionFields.quantityUnit}
            </div>
          </div>
        </div>

        <div className="flex items-start p-(--sp-5) rounded-sm [background-color:var(--surface-subtle)]">
          <div className="font-ui inline-block [color:var(--text-secondary)] text-sm/sm">
            {productionFields.stockRoutingNote}
          </div>
        </div>

        <div className="flex flex-col gap-(--sp-3)">
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
            {productionFields.timeLabel}
          </div>
          <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid [border-color:var(--border-strong)]">
            <div className="font-ui inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
              {productionFields.timeValue}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className="flex items-center [width:100%] h-[64px] shrink-0 px-(--sp-6) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="flex items-center justify-center h-[44px] [width:100%] rounded-sm bg-accent">
          <div className="font-ui font-(--weight-semibold) inline-block w-max shrink-0 text-white text-body/sm">
            {productionFlow.confirmLabel}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoreManagerFlowsIssuesProductionScreen() {
  return (
    <div className="flex flex-row items-start gap-(--sp-9)">
      <IssueIngredientsPanel />
      <RecordBatchProductionPanel />
    </div>
  );
}
