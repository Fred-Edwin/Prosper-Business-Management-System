// Screen skeleton transcribed from the Paper artboard "Admin Catalog — Mobile" (8L7-0)
// via get_jsx (Tailwind format). Structure and classes are left as Paper emitted them; only
// literal data was lifted into ./fixtures.ts. The Paper artboard frame and the mobile
// status-bar node are dropped so the screen fills the viewport.
// This is a static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import {
  catalogMobileAccount,
  catalogMobileActiveTab,
  catalogMobileCards,
  catalogMobileCategoryToneClass,
  catalogMobileCount,
  catalogMobileLocationLabel,
  catalogMobileSearchPlaceholder,
  catalogMobileStatus,
  catalogMobileTabs,
  catalogMobileTitle,
} from "./fixtures";

export default function AdminCatalogMobileScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-full flex-col bg-white antialiased text-caption/micro">
      {/* Header */}
      <div className="flex items-center h-[48px] shrink-0 px-[16px] gap-[12px] bg-(--surface-page) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="flex items-center justify-center w-[32px] h-[32px] shrink-0 rounded-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <line x1="3" y1="12" x2="21" y2="12" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="3" y1="6" x2="21" y2="6" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="3" y1="18" x2="21" y2="18" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
          {catalogMobileLocationLabel}
        </div>
        <div className="grow" />
        <div className="flex items-center h-[22px] shrink-0 px-(--sp-4) rounded-lg gap-[6px] bg-success-bg">
          <div className="w-[6px] h-[6px] shrink-0 rounded-[50%] bg-success" />
          <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-success text-sm/micro">
            {catalogMobileStatus}
          </div>
        </div>
        <div className="w-[28px] h-[28px] flex items-center justify-center shrink-0 rounded-[50%] bg-gray-700">
          <div className="font-ui font-(--weight-medium) text-(--nav-text-active) text-micro/micro">
            {catalogMobileAccount.initials}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col grow p-(--sp-6) overflow-clip gap-(--sp-6) bg-(--surface-page)">
        {/* Title row */}
        <div className="flex items-start justify-between [width:100%]">
          <div className="flex items-center gap-(--sp-3)">
            <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-display/display">
              {catalogMobileTitle}
            </div>
            <div className="flex items-center justify-center h-[22px] px-(--sp-4) rounded-lg [background-color:var(--surface-subtle)]">
              <div className="font-mono inline-block [color:var(--text-secondary)] text-sm/micro">
                {catalogMobileCount}
              </div>
            </div>
          </div>
          <div className="flex items-center h-[36px] shrink-0 px-(--sp-5) rounded-sm gap-(--sp-3) bg-accent">
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <line x1="12" y1="5" x2="12" y2="19" stroke="#FFFFFF" strokeWidth="2" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="#FFFFFF" strokeWidth="2" />
            </svg>
            <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-white text-body/sm">
              Add
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center [width:100%] gap-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          {catalogMobileTabs.map((tab) => {
            const isActive = tab === catalogMobileActiveTab;
            return (
              <div
                key={tab}
                className={`flex items-center justify-center h-[32px] border-b-2 border-b-solid ${
                  isActive ? "border-b-accent" : "border-b-[#00000000]"
                }`}
              >
                <div
                  className={`font-ui font-(--weight-medium) inline-block w-max shrink-0 text-sm/micro ${
                    isActive ? "text-accent" : "[color:var(--text-secondary)]"
                  }`}
                >
                  {tab}
                </div>
              </div>
            );
          })}
        </div>

        {/* Search + filter */}
        <div className="flex items-center [width:100%] gap-(--sp-4)">
          <div className="flex items-center h-[40px] grow min-w-[0px] px-(--sp-5) rounded-sm gap-(--sp-3) border border-solid [border-color:var(--border-strong)]">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="8" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="var(--text-tertiary)" strokeWidth="1.5" />
            </svg>
            <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-body/sm">
              {catalogMobileSearchPlaceholder}
            </div>
          </div>
          <div className="flex items-center h-[40px] shrink-0 px-(--sp-5) rounded-sm gap-(--sp-3) border border-solid [border-color:var(--border-strong)]">
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" />
            </svg>
            <div className="font-ui inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
              Filter
            </div>
          </div>
        </div>

        {/* Product cards */}
        {catalogMobileCards.map((card) => (
          <div
            key={card.name}
            className="flex flex-col [width:100%] py-(--sp-4) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
          >
            <div className="flex items-start justify-between [width:100%]">
              <div className="flex flex-col gap-[2px]">
                <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
                  {card.name}
                </div>
                <div className="flex items-center gap-[4px]">
                  <div className={`font-ui inline-block text-sm/micro ${catalogMobileCategoryToneClass[card.category]}`}>
                    {card.category}
                  </div>
                  <div className="font-ui inline-block [color:var(--text-secondary)] text-sm/micro">
                    · per {card.unit}
                  </div>
                </div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="5" r="1.5" fill="var(--text-tertiary)" />
                <circle cx="12" cy="12" r="1.5" fill="var(--text-tertiary)" />
                <circle cx="12" cy="19" r="1.5" fill="var(--text-tertiary)" />
              </svg>
            </div>
            <div className="flex items-center [width:100%] rounded-sm [background-color:var(--surface-subtle)]">
              {card.prices.map((price, i) => (
                <React.Fragment key={price.label}>
                  {i > 0 && <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />}
                  <div className="flex flex-col grow p-(--sp-4) gap-[2px]">
                    <div className="font-ui text-micro tracking-[0.03em] uppercase inline-block leading-[14px] [color:var(--text-tertiary)]">
                      {price.label}
                    </div>
                    <div
                      className={`font-mono font-(--weight-medium) inline-block w-max text-sm/micro ${
                        price.muted ? "[color:var(--text-tertiary)]" : "[color:var(--text-primary)]"
                      }`}
                    >
                      {price.value}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
