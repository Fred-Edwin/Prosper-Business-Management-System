// Screen-state skeleton transcribed from the Paper artboard "Admin Stock — Desktop Ledger
// (Drawer Open)" (7LJ-0) via get_jsx (Tailwind format). This exports the correction-drawer
// PANEL (7S9-0) as a component the real ledger screen mounts conditionally in Phase C —
// the same pattern Session 4a used for product-drawer / asset-drawer / the Financials
// payment rail.
//
// Kit swap: the whole panel → kit <Drawer variant="rail">. The kit Drawer gained a docked
// right-edge "rail" variant this session (ADR-37b, owner-authorised): w-[420px] h-full,
// border-l (no radius), --surface-subtle footer — exactly what 7LJ-0 (and the Financials
// 85W-0 payment drawer) draw. The header uses the context-subtitle variant
// ("Store · Beef Fillet (kg) · Aug 24"). Inside the body:
//   * the amber consequence block → kit <CalculatedImpactBanner> (byte-identical).
//   * the two footer buttons → kit <Button> (secondary "Close" + primary
//     "Confirm & Save Correction" with className="grow" for the full-width primary).
// The read-only context rows, the error-bordered movement field and the Reason box are
// bespoke to this panel (no kit equivalent drawn) and kept verbatim as the body children.
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { Drawer } from "@/components/kit/drawer";
import { correctionDrawer } from "./fixtures";

const CONTEXT_TONE: Record<"primary" | "success", string> = {
  primary: "[color:var(--text-primary)]",
  success: "text-success",
};

export default function AdminStockLedgerCorrectionDrawer() {
  const d = correctionDrawer;
  return (
    <Drawer
      open
      onClose={() => {}}
      title={d.title}
      subtitle={d.subtitle}
      variant="rail"
      footer={
        <>
          <Button variant="secondary">{d.closeLabel}</Button>
          <Button variant="primary" className="grow">
            {d.confirmLabel}
          </Button>
        </>
      }
    >
      {d.contextRows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
        >
          <div className="font-ui inline-block [color:var(--text-secondary)] text-body/sm">
            {row.label}
          </div>
          <div className={`font-mono inline-block text-body/sm ${CONTEXT_TONE[row.tone]}`}>
            {row.value}
          </div>
        </div>
      ))}

      {/* Editable movement field (error state as drawn) */}
      <div
        className={`flex flex-col p-(--sp-5) rounded-md gap-(--sp-3) border border-solid ${
          d.field.error ? "border-danger" : "[border-color:var(--border-subtle)]"
        }`}
      >
        <div className="flex items-center justify-between">
          <div
            className={`font-ui font-(--weight-medium) inline-block text-body/sm ${
              d.field.error ? "text-danger" : "[color:var(--text-primary)]"
            }`}
          >
            {d.field.label}
          </div>
          <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase shrink-0 inline-block w-max [color:var(--text-tertiary)] text-micro/micro">
            {d.field.originalLabel}
          </div>
        </div>
        <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
          <div className="font-mono inline-block [color:var(--text-primary)] text-body/sm">
            {d.field.value}
          </div>
          <div className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">
            {d.field.unit}
          </div>
        </div>
      </div>

      <CalculatedImpactBanner>{d.impact}</CalculatedImpactBanner>

      <div className="flex flex-col gap-(--sp-3)">
        <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-body/sm">
          {d.reason.label}
        </div>
        <div className="flex min-h-[64px] p-(--sp-5) rounded-sm bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
          <div className="font-ui inline-block [color:var(--text-primary)] text-body/body">
            {d.reason.value}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
