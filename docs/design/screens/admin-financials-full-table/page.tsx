// Screen skeleton transcribed from the Paper artboard "Admin Financials — Full Table" (7ZJ-0)
// via get_jsx (Tailwind format). Structure and classes are left as Paper emitted them; only
// literal data was lifted into ./fixtures.ts and the brand image replaced with a local mark.
// The Paper artboard frame (w-[1440px] h-[900px]) is dropped so the screen fills the viewport.
//
// NOTE (design deviation, owner-approved 2026-08-27, "Option A"): the 4-tile KPI stat strip is
// exported here exactly as drawn, contradicting the M1 cut (D-FIN / ADR-36). A later design
// sprint removes it. See ./fixtures.ts header + docs/PROGRESS.md.
//
// The KPI strip, transactions table and reconciliation match table are drawn inline in the
// artboard (no kit component was ever drawn for them; kit "stat-tile-row" was deleted as M3) —
// transcribed verbatim, matching the reference-screen (admin-catalog-product-catalog) precedent.
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import {
  financialsAccount,
  financialsActiveTab,
  financialsDateLabel,
  financialsKpiTiles,
  financialsKpiToneClass,
  financialsReconciledFooter,
  financialsReconciliation,
  financialsRecordPaymentLabel,
  financialsTabs,
  financialsTitle,
  financialsTxRows,
} from "./fixtures";
import { AdminShellSideNav } from "./side-nav";

const STATUS_DOT: Record<"success" | "warning", string> = {
  success: "bg-success",
  warning: "bg-warning",
};
const STATUS_TEXT: Record<"success" | "warning", string> = {
  success: "text-success",
  warning: "text-warning",
};

export default function AdminFinancialsFullTableScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-full min-h-screen font-ui bg-(--surface-page) antialiased text-caption/micro">
      <AdminShellSideNav />

      {/* Body */}
      <div className="flex grow min-h-[0px] self-stretch">
        <div className="flex items-start flex-1 flex-col self-stretch">
          <div className="flex flex-col grow min-w-[0px] self-stretch">
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
            <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) w-[1200px] max-w-[1200px] overflow-clip">
              {/* KPI stat strip (Option A: exported as drawn; D-FIN says M3) */}
              <div className="flex h-[87.3281px] [width:100%] items-center shrink-0 border border-solid [border-color:var(--border-subtle)]">
                {financialsKpiTiles.map((tile, i) => (
                  <React.Fragment key={tile.label}>
                    {i > 0 && <div className="w-px self-stretch shrink-0 bg-gray-500" />}
                    <div
                      className={`flex flex-col gap-(--sp-3) self-stretch ${
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

              {/* Reconciliation section */}
              <div className="flex flex-col [width:100%] gap-(--sp-5)">
                <div className="flex flex-col gap-[2px]">
                  <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
                    {financialsReconciliation.heading}
                  </div>
                  <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
                    {financialsReconciliation.subheading}
                  </div>
                </div>
                <div className="flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]">
                  <div className="flex items-center h-[32px] shrink-0 px-(--sp-6) gap-(--sp-6) bg-info-bg border-b border-b-solid border-b-gray-600">
                    <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] grow min-w-[200px] inline-block text-info">Vendor / Description</div>
                    <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[130px] shrink-0 text-right inline-block text-info">Amount (KES)</div>
                    <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[180px] shrink-0 inline-block text-info">Status</div>
                    <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[50px] shrink-0 inline-block text-info">Action</div>
                  </div>
                  {financialsReconciliation.rows.map((row) => (
                    <div key={row.vendor} className="flex items-center h-[44px] shrink-0 px-(--sp-6) gap-(--sp-6)">
                      <div className="flex flex-col grow min-w-[200px] gap-[2px]">
                        <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/micro">{row.vendor}</div>
                        <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">{row.description}</div>
                      </div>
                      <div className="font-mono font-(--weight-medium) w-[130px] shrink-0 text-right inline-block [color:var(--text-primary)] text-sm/micro">{row.amount}</div>
                      <div className="flex items-center h-[22px] w-[180px] shrink-0 rounded-lg gap-[6px]">
                        <div className={`w-[6px] h-[6px] shrink-0 rounded-[50%] ${STATUS_DOT[row.status.tone]}`} />
                        <div className={`font-ui inline-block w-max shrink-0 text-sm/micro ${STATUS_TEXT[row.status.tone]}`}>
                          {row.status.label}
                        </div>
                      </div>
                      <div className="font-ui w-[50px] shrink-0 inline-block text-accent text-sm/micro">{row.action}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
