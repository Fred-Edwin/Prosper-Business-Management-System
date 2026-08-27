// Screen skeleton transcribed from the Paper artboard "Admin Stock — Mobile" (8Q4-0) via
// get_jsx (Tailwind format). Structure and classes are left as Paper emitted them; only
// literal data was lifted into ./fixtures.ts. The Paper artboard frame and the mobile
// status-bar node are dropped so the screen fills the viewport.
//
// No kit swap: the location pills, summary banner, movement cards and sticky action bar
// are all bespoke mobile markup with no matching kit component drawn (the pill labels use
// text-body/sm medium, not the kit PillFilter's text-sm/sm) — kept verbatim, matching the
// admin-catalog-mobile precedent from Session 4a.
//
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import {
  stockMobileActions,
  stockMobileActiveLocationTab,
  stockMobileCards,
  stockMobileHeader,
  stockMobileLocationTabs,
  stockMobileSummary,
} from "./fixtures";

export default function AdminStockMobileScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-full flex-col bg-(--surface-page) antialiased text-caption/micro">
      {/* Header */}
      <div className="flex items-center h-[48px] shrink-0 px-[16px] gap-[12px] bg-(--surface-page) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="flex items-center justify-center w-[32px] h-[32px] shrink-0 rounded-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <line x1="3" y1="12" x2="21" y2="12" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="3" y1="6" x2="21" y2="6" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="3" y1="18" x2="21" y2="18" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="font-ui font-(--weight-semibold) w-max shrink-0 [color:var(--text-primary)] text-h1/h1">
          {stockMobileHeader.title}
        </div>
        <div className="grow" />
        <div className="flex items-center h-[22px] shrink-0 px-(--sp-4) rounded-lg gap-[6px] bg-success-bg">
          <div className="w-[6px] h-[6px] shrink-0 rounded-[50%] bg-success" />
          <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-success text-sm/micro">
            {stockMobileHeader.statusLabel}
          </div>
        </div>
        <div className="w-[28px] h-[28px] flex items-center justify-center shrink-0 rounded-[50%] bg-gray-700">
          <div className="font-ui font-(--weight-medium) text-(--nav-text-active) text-micro/micro">
            {stockMobileHeader.accountInitials}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col grow overflow-clip gap-(--sp-5) bg-(--surface-page)">
        {/* Summary banner */}
        <div className="flex items-center [width:100%] py-(--sp-5) px-(--sp-6) bg-(--nav-bg)">
          <div className="flex flex-col grow gap-[2px]">
            <div className="font-ui text-micro tracking-[0.03em] uppercase inline-block w-max leading-[14px] [color:var(--text-tertiary)]">
              {stockMobileSummary.stockOnHandLabel}
            </div>
            <div className="font-mono font-(--weight-semibold) inline-block w-max text-success text-h1/h2">
              {stockMobileSummary.stockOnHandValue}
            </div>
          </div>
          <div className="w-px self-stretch mt-[2px] mb-[2px] shrink-0 bg-[#FFFFFF1F]" />
          <div className="flex flex-col grow pl-(--sp-6) gap-[2px]">
            <div className="font-ui text-micro tracking-[0.03em] uppercase inline-block w-max leading-[14px] [color:var(--text-tertiary)]">
              {stockMobileSummary.soldValueLabel}
            </div>
            <div className="font-mono font-(--weight-semibold) inline-block w-max text-info text-h1/h2">
              {stockMobileSummary.soldValue}
            </div>
          </div>
        </div>

        {/* Location pills */}
        <div className="flex items-center [width:100%] px-(--sp-6) overflow-clip gap-(--sp-3)">
          {stockMobileLocationTabs.map((tab) => {
            const isActive = tab === stockMobileActiveLocationTab;
            return (
              <div
                key={tab}
                className={`flex items-center justify-center h-[32px] shrink-0 px-(--sp-6) rounded-lg ${
                  isActive ? "bg-(--surface-selected)" : ""
                }`}
              >
                <div
                  className={`font-ui font-(--weight-medium) inline-block w-max shrink-0 text-body/sm ${
                    isActive ? "text-accent" : "[color:var(--text-secondary)]"
                  }`}
                >
                  {tab}
                </div>
              </div>
            );
          })}
        </div>

        {/* Movement cards */}
        {stockMobileCards.map((card) => (
          <div
            key={card.name}
            className="flex flex-col [width:100%] py-(--sp-4) px-(--sp-6) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
          >
            <div className="flex items-start justify-between [width:100%]">
              <div className="flex items-center gap-(--sp-3)">
                <div className="font-ui font-(--weight-semibold) inline-block w-max shrink-0 [color:var(--text-primary)] text-h2/h2">
                  {card.name}
                </div>
                <div className="font-ui inline-block px-(--sp-3) rounded-sm [background-color:var(--surface-subtle)]">
                  <div className="inline-block font-ui w-max [color:var(--text-secondary)] text-caption/micro">
                    {card.location}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-[2px]">
                <div className="font-mono font-(--weight-semibold) inline-block w-max [color:var(--text-primary)] text-h2/body">
                  {card.onHand}
                </div>
                <div className="font-mono inline-block w-max [color:var(--text-tertiary)] text-caption/micro">
                  {card.onHandValue}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-(--sp-4)">
              {card.movements.map((m) => (
                <div
                  key={m.text}
                  className={`font-mono inline-block w-max shrink-0 text-sm/micro ${
                    m.tone === "success" ? "text-success" : "text-danger"
                  } ${
                    m.underlined
                      ? "[text-underline-position:from-font] [text-decoration:underline_1px]"
                      : ""
                  }`}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between [width:100%]">
              <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-caption/micro">
                {card.openingLabel}
              </div>
              <div className="flex items-center justify-center h-[32px] px-(--sp-5) rounded-sm [background-color:var(--surface-subtle)]">
                <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-sm/micro">
                  {card.adjustLabel}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Action Bar */}
      <div className="flex items-center [width:100%] shrink-0 p-(--sp-5) gap-(--sp-4) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <div className="flex items-center justify-center h-[44px] grow px-(--sp-6) rounded-sm border border-solid [border-color:var(--border-strong)]">
          <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
            {stockMobileActions.openingStockLabel}
          </div>
        </div>
        <div className="flex items-center justify-center h-[44px] grow px-(--sp-6) rounded-sm gap-(--sp-3) bg-accent">
          <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <line x1="12" y1="5" x2="12" y2="19" stroke="#FFFFFF" strokeWidth="2" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
          <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-white text-body/sm">
            {stockMobileActions.recordPaymentLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
