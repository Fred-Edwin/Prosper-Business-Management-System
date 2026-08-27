// Screen skeleton transcribed from the Paper artboard "Bulk Opening Stock Grid" (7UD-0)
// via get_jsx (Tailwind format). Structure and classes are left as Paper emitted them; only
// literal data was lifted into ./fixtures.ts. The Paper artboard frame (w-[1440px]
// h-[900px]) is dropped so the screen fills the viewport.
//
// Kit swaps:
//   * the numbered instruction banner core → transcribed INLINE, not swapped for kit
//     <InstructionalBanner>: the artboard adds a trailing "24 Items to Initialize" text and
//     uses justify-between with no rounded-md, which the kit component does not model.
//   * the tab row → kit <Tabs> (byte-identical to it).
//   * the entry grid → kit <BulkEntryGrid> (matching header widths + h-[48px] rows + cell
//     states).
//   * the valuation footer → transcribed INLINE: the artboard's mr-auto on the 3rd segment
//     can't be expressed via BulkEntryGrid's footerSegments prop. Same call Session 4a made
//     for divergent inline footers.
//
// The admin sidebar reuses ../admin-stock-ledger-full-width/side-nav.tsx (AdminStockSideNav,
// "Stock" active). FLAG: 7UD-0's own sidebar frame tints BOTH "Dashboard" and "Stock" with
// bg-(--nav-bg-active) (a Paper artboard defect — two active items); the shared module tints
// only "Stock", which is the correct single-active state for this Stock sub-page.
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import { BulkEntryGrid } from "@/components/kit/bulk-entry-grid";
import { Tabs } from "@/components/kit/tabs";
import {
  bulkGridActiveTab,
  bulkGridBreadcrumb,
  bulkGridFooter,
  bulkGridInstruction,
  bulkGridRows,
  bulkGridTabs,
  bulkGridToolbar,
} from "./fixtures";
import { AdminStockSideNav } from "../admin-stock-ledger-full-width/side-nav";

export default function BulkOpeningStockGridScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-full min-h-screen font-ui bg-(--surface-page) antialiased text-caption/micro">
      <AdminStockSideNav />

      {/* Body */}
      <div className="flex grow min-h-[0px] antialiased text-caption/micro">
        <div className="flex items-start flex-1 h-fit flex-col">
          <div className="flex flex-col grow min-w-[0px] self-stretch w-[1200px] max-w-[1200px] overflow-clip">
            {/* Toolbar */}
            <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="flex items-center shrink-0 gap-(--sp-3)">
                <div className="font-ui inline-block [color:var(--text-tertiary)] text-sm/sm">
                  {bulkGridBreadcrumb[0].label}
                </div>
                <div className="font-ui inline-block [color:var(--text-tertiary)] text-body/sm">/</div>
                <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/sm">
                  {bulkGridBreadcrumb[1].label}
                </div>
              </div>
              <div className="grow" />
              <div className="flex items-center shrink-0 gap-(--sp-4)">
                <div className="flex items-center h-[36px] px-(--sp-6) rounded-sm bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                  <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
                    {bulkGridToolbar.discardLabel}
                  </div>
                </div>
                <div className="flex items-center h-[36px] px-(--sp-6) rounded-sm bg-accent">
                  <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-white text-body/sm">
                    {bulkGridToolbar.saveLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) w-[1200px] max-w-[1200px] overflow-clip">
              {/* Instruction banner (inline — see header comment) */}
              <div className="flex items-center py-(--sp-5) px-(--sp-6) gap-(--sp-5) [width:100%] max-w-full justify-between bg-(--surface-selected)">
                <div className="flex items-center justify-center w-[28px] h-[28px] shrink-0 rounded-[50%] bg-accent">
                  <div className="font-ui font-(--weight-semibold) text-white text-sm/micro">
                    {bulkGridInstruction.step}
                  </div>
                </div>
                <div className="flex flex-col gap-[2px]">
                  <div className="font-ui font-(--weight-semibold) text-accent text-sm/sm">
                    {bulkGridInstruction.title}
                  </div>
                  <div className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    {bulkGridInstruction.body}
                  </div>
                </div>
                <div className="font-ui font-(--weight-medium) shrink-0 inline-block w-max [color:var(--text-secondary)] text-sm/sm">
                  {bulkGridInstruction.trailing}
                </div>
              </div>

              {/* Tabs */}
              <Tabs tabs={bulkGridTabs} activeKey={bulkGridActiveTab} className="[width:100%]" />

              {/* Entry grid */}
              <BulkEntryGrid rows={bulkGridRows} />

              {/* Valuation footer (inline — see header comment) */}
              <div className="flex h-[44px] px-(--sp-6) rounded-md [width:100%] max-w-full shrink-0 bg-gray-900">
                <div className="flex items-center font-ui font-(--weight-medium) pr-(--sp-8)">
                  <div className="flex font-ui font-(--weight-medium) tracking-[0.04em] uppercase text-[#FFFFFF99] text-caption/micro">
                    {bulkGridFooter.title}
                  </div>
                </div>
                {bulkGridFooter.segments.map((seg, i) => {
                  // The artboard draws a divider before every segment EXCEPT the one that
                  // follows the mr-auto ("pushEndAfter") segment — that gap is the mr-auto.
                  const prevPushed = i > 0 && bulkGridFooter.segments[i - 1].pushEndAfter;
                  return (
                    <React.Fragment key={seg.label}>
                      {!prevPushed && <div className="w-px self-stretch shrink-0 bg-[#FFFFFF26]" />}
                      <div
                        className={`flex items-center gap-[6px] ${
                          seg.pushEndAfter ? "mr-auto pl-(--sp-6)" : "px-(--sp-6)"
                        }`}
                      >
                        <div className="font-ui text-[#FFFFFF99] text-caption/micro">{seg.label}</div>
                        <div
                          className={`font-mono font-(--weight-semibold) text-sm/micro ${
                            seg.tone === "success" ? "text-success" : "text-white"
                          }`}
                        >
                          {seg.value}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
