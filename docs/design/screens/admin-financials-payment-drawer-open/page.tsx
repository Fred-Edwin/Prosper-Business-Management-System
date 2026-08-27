// Screen-state skeleton transcribed from the Paper artboard "Admin Financials — Payment Drawer
// Open" (85W-0) via get_jsx (Tailwind format). Structure and classes are left as Paper emitted
// them; only literal data was lifted (shared body data from ../admin-financials-full-table/
// fixtures, drawer-rail data from ./fixtures). The Paper artboard frame is dropped so the screen
// fills the viewport.
//
// In the artboard the payment "drawer" is a docked 420px right rail (border-l), NOT a floating
// modal — the content column narrows to 780px beside it. Transcribed as drawn. The real screen
// mounts this rail conditionally in Phase C.
//
// NOTE (design deviation, owner-approved 2026-08-27, "Option A"): the 4-tile KPI stat strip is
// exported as drawn, contradicting the M1 cut (D-FIN / ADR-36). Footer buttons swapped to the
// kit <Button>; everything else verbatim.
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import { Button } from "@/components/kit/button";
import {
  financialsAccount,
  financialsActiveTab,
  financialsDateLabel,
  financialsKpiTiles,
  financialsKpiToneClass,
  financialsReconciledFooter,
  financialsRecordPaymentLabel,
  financialsTabs,
  financialsTitle,
  financialsTxRows,
} from "../admin-financials-full-table/fixtures";
import { paymentDrawer } from "./fixtures";
import { AdminShellSideNav } from "../admin-financials-full-table/side-nav";

const STATUS_DOT: Record<"success" | "warning", string> = {
  success: "bg-success",
  warning: "bg-warning",
};
const STATUS_TEXT: Record<"success" | "warning", string> = {
  success: "text-success",
  warning: "text-warning",
};

export default function AdminFinancialsPaymentDrawerOpenScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-full min-h-screen font-ui bg-(--surface-page) antialiased text-caption/micro">
      <AdminShellSideNav />

      {/* Body — content column (780px) + docked drawer rail (420px) */}
      <div className="flex grow min-h-[0px] self-stretch">
        <div className="flex items-start flex-1 flex-col self-stretch">
          <div className="flex flex-col min-w-[0px] self-stretch w-[780px] max-w-[780px] shrink-0 overflow-clip">
            {/* Toolbar */}
            <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h1/h1">
                {financialsTitle}
              </div>
              <div className="font-ui shrink-0 self-center inline-block w-max [color:var(--text-tertiary)] text-caption/micro">
                {financialsDateLabel}
              </div>
              <div className="grow" />
              <div className="w-[26px] h-[26px] flex items-center justify-center shrink-0 rounded-[50%] bg-gray-700">
                <div className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-micro/micro">
                  {financialsAccount.initials}
                </div>
              </div>
              <div className="flex items-center h-[36px] shrink-0 px-(--sp-6) rounded-sm gap-(--sp-3) bg-accent">
                <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <line x1="12" y1="5" x2="12" y2="19" stroke="#FFFFFF" strokeWidth="2" />
                  <line x1="5" y1="12" x2="19" y2="12" stroke="#FFFFFF" strokeWidth="2" />
                </svg>
                <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-white text-body/sm">
                  {financialsRecordPaymentLabel}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) w-[780px] max-w-[780px] overflow-clip">
              {/* KPI stat strip (Option A: exported as drawn; D-FIN says M3) */}
              <div className="flex h-[87.3281px] [width:100%] shrink-0 border border-solid [border-color:var(--border-subtle)]">
                {financialsKpiTiles.map((tile, i) => (
                  <React.Fragment key={tile.label}>
                    {i > 0 && <div className="w-px self-stretch shrink-0 bg-gray-500" />}
                    <div
                      className={`flex flex-col gap-(--sp-3) ${
                        i === 0
                          ? "pr-(--sp-8)"
                          : i === financialsKpiTiles.length - 1
                            ? "pl-(--sp-8)"
                            : "px-(--sp-8)"
                      }`}
                    >
                      <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-tertiary)] text-caption/micro">
                        {tile.label}
                      </div>
                      <div className={`font-mono font-(--weight-semibold) text-display/display ${financialsKpiToneClass[tile.tone]}`}>
                        {tile.value}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {/* Transaction tabs */}
              <div className="flex items-center [width:100%] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
                {financialsTabs.map((tab) => {
                  const isActive = tab === financialsActiveTab;
                  return (
                    <div
                      key={tab}
                      className={`flex items-center justify-center h-[36px] px-(--sp-5) border-b-2 border-b-solid ${
                        isActive ? "border-b-accent" : "border-b-[#00000000]"
                      }`}
                    >
                      <div
                        className={`font-ui font-(--weight-medium) inline-block w-max shrink-0 text-sm/sm ${
                          isActive ? "text-accent" : "[color:var(--text-secondary)]"
                        }`}
                      >
                        {tab}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Transactions table */}
              <div className="flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]">
                <div className="flex items-center h-[32px] shrink-0 px-(--sp-6) gap-(--sp-6) bg-info-bg border-b border-b-solid border-b-gray-600">
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[100px] shrink-0 inline-block text-info">Date</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] grow min-w-[200px] inline-block text-info">Vendor / Description</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[110px] shrink-0 inline-block text-info">Destination</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[130px] shrink-0 inline-block text-info">Paid From</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[100px] shrink-0 text-right inline-block text-info">Quantity</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[130px] shrink-0 text-right inline-block text-info">Amount (KES)</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[150px] shrink-0 inline-block text-info">Delivery Status</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[50px] shrink-0 inline-block text-info">Action</div>
                </div>
                {financialsTxRows.map((row, i) => (
                  <div
                    key={row.vendor}
                    className={`flex items-center h-[52px] shrink-0 px-(--sp-6) gap-(--sp-6) ${
                      i < financialsTxRows.length - 1 ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]" : ""
                    }`}
                  >
                    <div className="font-mono w-[100px] shrink-0 inline-block [color:var(--text-secondary)] text-sm/micro">{row.date}</div>
                    <div className="flex flex-col grow min-w-[200px] gap-[2px]">
                      <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/micro">{row.vendor}</div>
                      <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">{row.description}</div>
                    </div>
                    <div className="font-ui w-[110px] shrink-0 inline-block [color:var(--text-primary)] text-sm/micro">{row.destination}</div>
                    <div className="font-ui w-[130px] shrink-0 inline-block [color:var(--text-primary)] text-sm/micro">{row.paidFrom}</div>
                    <div className={`font-mono w-[100px] shrink-0 text-right inline-block text-sm/micro ${row.quantityMuted ? "[color:var(--text-tertiary)]" : "[color:var(--text-primary)]"}`}>
                      {row.quantity}
                    </div>
                    <div className="font-mono font-(--weight-medium) w-[130px] shrink-0 text-right inline-block [color:var(--text-primary)] text-sm/micro">{row.amount}</div>
                    <div className="flex items-center h-[22px] w-[150px] shrink-0 rounded-lg gap-[6px]">
                      <div className={`w-[6px] h-[6px] shrink-0 rounded-[50%] ${STATUS_DOT[row.status.tone]}`} />
                      <div className={`font-ui inline-block w-max shrink-0 text-sm/micro ${STATUS_TEXT[row.status.tone]}`}>
                        {row.status.label}
                      </div>
                    </div>
                    <div className="font-ui w-[50px] shrink-0 inline-block text-accent text-sm/micro">Edit</div>
                  </div>
                ))}
              </div>

              {/* Reconciled outflows footer */}
              <div className="flex items-center h-[44px] [width:100%] px-(--sp-6) rounded-md gap-(--sp-8) shrink-0 bg-gray-900">
                <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                  {financialsReconciledFooter.label}
                </div>
                <div className="flex items-center ml-auto gap-(--sp-3)">
                  <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                    {financialsReconciledFooter.cashPaymentsLabel}
                  </div>
                  <div className="font-mono font-(--weight-semibold) inline-block w-max shrink-0 text-white text-body/sm">
                    {financialsReconciledFooter.cashPaymentsValue}
                  </div>
                </div>
                <div className="flex items-center gap-(--sp-3)">
                  <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                    {financialsReconciledFooter.bankLabel}
                  </div>
                  <div className="font-mono font-(--weight-semibold) inline-block w-max shrink-0 text-white text-body/sm">
                    {financialsReconciledFooter.bankValue}
                  </div>
                </div>
                <div className="flex items-center gap-(--sp-3)">
                  <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                    {financialsReconciledFooter.totalLabel}
                  </div>
                  <div className="font-mono font-(--weight-semibold) inline-block w-max shrink-0 text-danger text-body/sm">
                    {financialsReconciledFooter.totalValue}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Docked payment-drawer rail */}
      <div className="flex flex-col w-[420px] shrink-0 self-stretch bg-(--surface-panel-tint) border-l border-l-solid [border-left-color:var(--border-subtle)]">
        <div className="flex items-center justify-between shrink-0 py-(--sp-6) px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h1/h1">
              {paymentDrawer.title}
            </div>
            <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
              {paymentDrawer.eyebrow}
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <line x1="18" y1="6" x2="6" y2="18" stroke="var(--text-secondary)" strokeWidth="1.5" />
            <line x1="6" y1="6" x2="18" y2="18" stroke="var(--text-secondary)" strokeWidth="1.5" />
          </svg>
        </div>

        <div className="flex flex-col grow py-(--sp-6) px-(--sp-8) overflow-clip gap-(--sp-6)">
          {/* Supplier */}
          <div className="flex flex-col gap-(--sp-3)">
            <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
              {paymentDrawer.supplierLabel}
            </div>
            <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
              <div className="font-ui inline-block [color:var(--text-primary)] text-body/sm">{paymentDrawer.supplierValue}</div>
              <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" fill="none" stroke="var(--text-secondary)" strokeWidth="2" />
              </svg>
            </div>
          </div>

          {/* Product / Destination */}
          <div className="flex items-start gap-(--sp-5)">
            <div className="flex flex-col grow min-w-[0px] gap-(--sp-3)">
              <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
                {paymentDrawer.productLabel}
              </div>
              <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                <div className="font-ui inline-block [color:var(--text-primary)] text-body/sm">{paymentDrawer.productValue}</div>
              </div>
            </div>
            <div className="flex flex-col grow min-w-[0px] gap-(--sp-3)">
              <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
                {paymentDrawer.destinationLabel}
              </div>
              <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                <div className="font-ui inline-block [color:var(--text-primary)] text-body/sm">{paymentDrawer.destinationValue}</div>
              </div>
            </div>
          </div>

          {/* Quantity / Total Cost */}
          <div className="flex items-start gap-(--sp-5)">
            <div className="flex flex-col grow min-w-[0px] gap-(--sp-3)">
              <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
                {paymentDrawer.quantityLabel}
              </div>
              <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                <div className="font-mono inline-block [color:var(--text-primary)] text-body/sm">{paymentDrawer.quantityValue}</div>
                <div className="font-ui shrink-0 inline-block w-max [color:var(--text-tertiary)] text-sm/micro">{paymentDrawer.quantityUnit}</div>
              </div>
            </div>
            <div className="flex flex-col grow min-w-[0px] gap-(--sp-3)">
              <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
                {paymentDrawer.totalCostLabel}
              </div>
              <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 bg-(--surface-page) border border-solid border-accent">
                <div className="font-mono inline-block [color:var(--text-primary)] text-body/sm">{paymentDrawer.totalCostValue}</div>
              </div>
            </div>
          </div>

          {/* Paid From (segmented) */}
          <div className="flex flex-col gap-(--sp-3)">
            <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block [color:var(--text-tertiary)] text-caption/micro">
              {paymentDrawer.paidFromLabel}
            </div>
            <div className="flex items-center h-[40px] p-[2px] rounded-sm gap-[2px] shrink-0 [background-color:var(--surface-subtle)]">
              {paymentDrawer.paidFromOptions.map((opt) => {
                const isActive = opt === paymentDrawer.paidFromActive;
                return (
                  <div
                    key={opt}
                    className={`flex items-center justify-center grow h-[36px] rounded-sm ${
                      isActive ? "[box-shadow:#00000014_0px_1px_2px] bg-(--surface-page)" : ""
                    }`}
                  >
                    <div
                      className={`font-ui font-(--weight-medium) inline-block w-max shrink-0 text-sm/micro ${
                        isActive ? "text-accent" : "[color:var(--text-secondary)]"
                      }`}
                    >
                      {opt}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start p-(--sp-5) rounded-sm gap-(--sp-4) bg-info-bg">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 2 }}>
              <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-info)" strokeWidth="1.5" />
              <line x1="12" y1="16" x2="12" y2="12" stroke="var(--color-info)" strokeWidth="1.5" />
              <line x1="12" y1="8" x2="12.01" y2="8" stroke="var(--color-info)" strokeWidth="1.5" />
            </svg>
            <div className="font-ui inline-block text-info text-sm/sm">{paymentDrawer.infoNote}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center shrink-0 py-(--sp-6) px-(--sp-8) gap-(--sp-4) [background-color:var(--surface-subtle)] border-t border-t-solid [border-top-color:var(--border-subtle)]">
          <Button variant="secondary">{paymentDrawer.cancelLabel}</Button>
          <Button variant="primary" className="grow">
            {paymentDrawer.confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
