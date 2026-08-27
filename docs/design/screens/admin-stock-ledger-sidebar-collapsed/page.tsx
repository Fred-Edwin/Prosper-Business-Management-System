// Screen-state skeleton transcribed from the Paper artboard "Admin Stock — Desktop Ledger
// (Sidebar Collapsed)" (7G9-0) via get_jsx (Tailwind format). This is the whole screen with
// the admin shell in its collapsed icon-rail state (the "Maximize" affordance from the
// full-width ledger), so it is its own skeleton — per the handoff.
//
// Reuses ../admin-stock-ledger-full-width/fixtures.ts: the pill tabs, filter chips, ledger
// rows and totals are byte-identical to the full-width artboard. Differences vs 798-0:
//   * 56px icon-rail sidebar instead of the 240px full sidebar (transcribed here, verbatim
//     from 7G9-0's own Icon Rail frame — NOT the full sidebar with display:none).
//   * toolbar carries a panel-expand toggle before the title and drops the
//     Date / Maximize / Opening Stock buttons.
//   * content column is w-[1384px] (wider, since the rail reclaims 184px).
//
// Kit swaps: location pill row → kit <PillFilter>; ledger table → kit
// <DenseLedger showLocation horizontalScroll> (same as the full-width screen). Bespoke
// toolbar toggle kept verbatim. The Paper artboard frame (w-[1440px] h-[900px]) and the
// rail's fixed h-[900px] are dropped so the screen fills the viewport.
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
  stockLedgerToolbarTitle,
  stockLedgerTotals,
} from "../admin-stock-ledger-full-width/fixtures";

const RAIL_ICONS: React.ReactNode[] = [
  // Dashboard
  <>
    <rect x="3" y="3" width="7" height="7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="3" width="7" height="7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3" y="14" width="7" height="7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="14" y="14" width="7" height="7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Catalog
  <>
    <path d="M3 3h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 9h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 15h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 21h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Stock (active)
  <>
    <rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Sales
  <>
    <circle cx="9" cy="21" r="1" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="20" cy="21" r="1" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Handovers
  <>
    <polyline points="17 1 21 5 17 9" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="7 23 3 19 7 15" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Customers
  <>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="9" cy="7" r="4" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Financials
  <>
    <rect x="1" y="4" width="22" height="16" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="1" y1="10" x2="23" y2="10" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Staff
  <>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="7" r="4" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Assets
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 9h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 21V9" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Reports
  <>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // Audit trail
  <>
    <circle cx="12" cy="12" r="10" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="12 6 12 12 16 14" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </>,
];
const RAIL_ACTIVE_INDEX = 2; // Stock

export default function AdminStockLedgerSidebarCollapsedScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-full min-h-screen font-ui bg-(--surface-page) antialiased text-caption/micro">
      {/* Icon Rail (collapsed sidebar) */}
      <div className="flex flex-col w-[56px] shrink-0 self-stretch bg-(--nav-bg)">
        <div className="flex flex-col items-center pt-[20px] pb-[16px] gap-[16px]">
          <div className="w-[28px] h-[28px] rounded-full shrink-0 bg-(--nav-bg-divider-strong)" />
        </div>
        <div className="w-[56px] h-px shrink-0 bg-(--nav-border)" />
        <div className="flex flex-col items-center grow pt-[12px] gap-[4px]">
          {RAIL_ICONS.map((paths, i) => (
            <div
              key={i}
              className={`flex items-center justify-center w-[40px] h-[40px] shrink-0 rounded-sm ${
                i === RAIL_ACTIVE_INDEX ? "bg-(--nav-bg-active)" : ""
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                {paths}
              </svg>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center shrink-0 pt-[12px] pb-[16px]">
          <div className="w-[30px] h-[30px] flex items-center justify-center rounded-[50%] shrink-0 bg-(--nav-bg-divider-strong)">
            <div className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-caption/micro">
              {stockLedgerAccount.initials}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex grow min-h-[0px] antialiased text-caption/micro">
        <div className="flex items-start flex-1 h-fit flex-col">
          <div className="flex flex-col grow min-w-[0px] self-stretch max-w-[1384px] overflow-clip">
            {/* Toolbar */}
            <div className="flex items-center h-[44px] shrink-0 gap-[12px] pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="flex items-center justify-center w-[24px] h-[24px] shrink-0 rounded-sm [background-color:var(--surface-hover)]">
                <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="9" y1="3" x2="9" y2="21" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h1/h1">
                {stockLedgerToolbarTitle}
              </div>
              <div className="grow" />
              <div className="w-[26px] h-[26px] flex items-center justify-center shrink-0 rounded-[50%] bg-gray-700">
                <div className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-micro/micro">
                  {stockLedgerAccount.initials}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) max-w-[1384px] overflow-clip">
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
