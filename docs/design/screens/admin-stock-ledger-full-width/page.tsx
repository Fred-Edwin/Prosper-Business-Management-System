// Screen skeleton transcribed from the Paper artboard "Admin Stock — Desktop Ledger
// (Full Width)" (798-0) via get_jsx (Tailwind format). Structure and classes are left as
// Paper emitted them; only literal data was lifted into ./fixtures.ts and the brand image
// replaced with a local mark. The Paper artboard frame (w-[1440px] h-[900px]) and the body
// wrappers' fixed h-[900px] are dropped so the screen fills the viewport.
//
// Kit swaps:
//   * the location pill row → kit <PillFilter> (byte-identical to it).
//   * the ledger table → kit <DenseLedger showLocation horizontalScroll>. The kit component
//     gained an opt-in Location column + w-max horizontal-scroll mode this session
//     (ADR-37a, owner-authorised) precisely so the Admin Stock ledger screens use the
//     shared component instead of an inline transcription.
// The bespoke toolbar buttons (Date / Maximize / Opening Stock) are kept verbatim — Paper
// draws them bespoke, not as kit DatePicker/Button instances.
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import { DenseLedger } from "@/components/kit/dense-ledger";
import { PillFilter } from "@/components/kit/pill-filter";
import {
  stockLedgerAccount,
  stockLedgerActiveLocationTab,
  stockLedgerFilters,
  stockLedgerLocationTabs,
  stockLedgerRows,
  stockLedgerToolbar,
  stockLedgerToolbarTitle,
  stockLedgerTotals,
} from "./fixtures";
import { AdminStockSideNav } from "./side-nav";

export default function AdminStockLedgerFullWidthScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-full min-h-screen font-ui bg-(--surface-page) antialiased text-caption/micro">
      <AdminStockSideNav />

      {/* Body */}
      <div className="flex grow min-h-[0px] antialiased text-caption/micro">
        <div className="flex items-start flex-1 h-fit flex-col">
          <div className="flex flex-col grow min-w-[0px] self-stretch w-[1200px] max-w-[1200px] overflow-clip">
            {/* Toolbar */}
            <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h1/h1">
                {stockLedgerToolbarTitle}
              </div>
              <div className="grow" />
              <div className="flex items-center shrink-0 gap-(--sp-4)">
                <div className="flex items-center justify-between h-[36px] px-(--sp-5) rounded-sm gap-(--sp-5) shrink-0 bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                  <div className="font-ui inline-block shrink-0 w-max [color:var(--text-primary)] text-body/body">
                    {stockLedgerToolbar.dateLabel}
                  </div>
                  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
                    <line x1="16" y1="2" x2="16" y2="6" stroke="var(--text-secondary)" strokeWidth="1.5" />
                    <line x1="8" y1="2" x2="8" y2="6" stroke="var(--text-secondary)" strokeWidth="1.5" />
                    <line x1="3" y1="10" x2="21" y2="10" stroke="var(--text-secondary)" strokeWidth="1.5" />
                  </svg>
                </div>
                <div className="flex items-center h-[36px] px-(--sp-5) rounded-sm gap-(--sp-3) bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <path d="M8 3H5a2 2 0 0 0-2 2v3" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
                    <path d="M21 8V5a2 2 0 0 0-2-2h-3" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
                    <path d="M3 16v3a2 2 0 0 0 2 2h3" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
                    <path d="M16 21h3a2 2 0 0 0 2-2v-3" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
                  </svg>
                  <div className="font-ui inline-block w-max shrink-0 [color:var(--text-primary)] text-body/body">
                    {stockLedgerToolbar.maximizeLabel}
                  </div>
                </div>
                <div className="flex items-center h-[36px] px-(--sp-6) rounded-sm bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                  <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-body/body">
                    {stockLedgerToolbar.openingStockLabel}
                  </div>
                </div>
              </div>
              <div className="w-[26px] h-[26px] flex items-center justify-center shrink-0 rounded-[50%] bg-gray-700">
                <div className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-micro/micro">
                  {stockLedgerAccount.initials}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) min-w-[0px] max-w-[1200px] w-[1200px] overflow-clip">
              {/* Filter row */}
              <div className="flex items-center justify-between [width:100%] shrink-0 max-w-full">
                <PillFilter
                  options={stockLedgerLocationTabs.map((t) => ({ key: t.key, label: t.label }))}
                  activeKey={stockLedgerActiveLocationTab}
                  className="gap-(--sp-3)"
                />
                <div className="flex items-center gap-(--sp-4)">
                  <div className="flex items-center h-[32px] px-(--sp-5) rounded-sm gap-(--sp-3) bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                    <div className="font-ui inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
                      {stockLedgerFilters.categoryLabel}
                    </div>
                  </div>
                  <div className="flex items-center h-[32px] px-(--sp-5) rounded-sm gap-(--sp-3) bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                    <div className="font-ui inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
                      {stockLedgerFilters.columnsLabel}
                    </div>
                  </div>
                </div>
              </div>

              {/* Ledger table (kit DenseLedger, Location column + horizontal scroll) */}
              <div className="[width:100%] max-w-full overflow-x-auto">
                <DenseLedger
                  rows={stockLedgerRows}
                  totals={stockLedgerTotals}
                  showLocation
                  horizontalScroll
                  onCellClick={() => {}}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
