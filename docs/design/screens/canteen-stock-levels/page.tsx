// Screen skeleton transcribed from the Paper artboard "Canteen — Stock Levels" (9GW-0)
// via get_jsx (Tailwind format). This is the screen *content* that renders inside the
// staff shell — the mobile status-bar, staff-shell header and bottom nav are dropped.
// Classes left as Paper emitted them; only literal data lifted into ./fixtures.ts.
//
// NO kit swap — byte-identical structure to store-manager-stock-levels (986-0): a title
// block + a bespoke search row + a bespoke read-only list (`bg-info-bg` / `text-info`
// `text-[10px]` header with a `border-b-gray-600` rule; `h-[52px]` rows with a
// `--border-subtle` hairline, last row omits it). No kit component was drawn for this —
// kept verbatim (4b admin-stock-mobile precedent).
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
import * as React from "react";
import {
  stockLevelRows,
  stockLevelsHeader,
  stockLevelsTableHeader,
} from "./fixtures";

export default function CanteenStockLevelsScreen() {
  return (
    <div className="[font-synthesis:none] flex flex-col grow min-h-[0px] overflow-clip antialiased text-caption/micro">
      {/* Title block */}
      <div className="flex flex-col p-(--sp-6) gap-[2px]">
        <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-display/display">
          {stockLevelsHeader.title}
        </div>
        <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
          {stockLevelsHeader.subtitle}
        </div>
      </div>

      {/* Search row */}
      <div className="flex items-center h-[40px] ml-(--sp-6) mr-(--sp-6) px-(--sp-5) rounded-sm gap-(--sp-3) shrink-0 border border-solid [border-color:var(--border-strong)]">
        <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="var(--text-tertiary)" strokeWidth="1.5" />
        </svg>
        <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-body/sm">
          {stockLevelsHeader.searchPlaceholder}
        </div>
      </div>

      {/* Table header */}
      <div className="flex items-center h-[32px] mt-(--sp-5) px-(--sp-6) gap-(--sp-4) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600">
        <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] grow inline-block text-info">
          {stockLevelsTableHeader.product}
        </div>
        <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[90px] shrink-0 text-right inline-block text-info">
          {stockLevelsTableHeader.currentQty}
        </div>
      </div>

      {/* Rows */}
      {stockLevelRows.map((row, i) => (
        <div
          key={row.name}
          className={`flex items-center h-[52px] px-(--sp-6) gap-(--sp-4) shrink-0 ${
            i < stockLevelRows.length - 1
              ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              : ""
          }`}
        >
          <div className="flex flex-col grow gap-[2px]">
            <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-body/sm">
              {row.name}
            </div>
            <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
              {row.meta}
            </div>
          </div>
          <div className="font-mono font-(--weight-semibold) w-[90px] shrink-0 text-right inline-block [color:var(--text-primary)] text-body/sm">
            {row.qty}
          </div>
        </div>
      ))}
    </div>
  );
}
