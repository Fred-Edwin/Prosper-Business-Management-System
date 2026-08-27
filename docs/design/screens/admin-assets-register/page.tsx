// Screen skeleton transcribed from the Paper artboard "Admin Assets Register" (8DL-0) via
// get_jsx (Tailwind format). Structure and classes are left as Paper emitted them; only literal
// data was lifted into ./fixtures.ts and the brand image replaced with a local mark. The Paper
// artboard frame (w-[1440px] h-[900px]) is dropped so the screen fills the viewport.
// Condition cells are drawn inline (dot + text, table density) exactly as the artboard shows —
// not swapped for the kit ConditionChip, whose chip density is a different, documented variant
// (component-states.md §8). The dark summary strip is drawn inline as the artboard shows it.
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import {
  assetsAccount,
  assetsActiveCategoryTab,
  assetsAddLabel,
  assetsCategoryTabs,
  assetsConditionDotClass,
  assetsConditionFilter,
  assetsConditionTextClass,
  assetsCountLabel,
  assetsLocationFilter,
  assetsRows,
  assetsSummary,
  assetsTitle,
} from "./fixtures";

export default function AdminAssetsRegisterScreen() {
  return (
    <div className="[font-synthesis:none] flex overflow-clip w-full min-h-screen font-ui bg-(--surface-page) antialiased text-caption/micro">
      {/* Side nav */}
      <div className="flex flex-col w-[240px] shrink-0 self-stretch bg-(--nav-bg)">
        <div className="flex items-center shrink-0 gap-(--sp-3) w-[240px] pt-[20px] pb-[16px] justify-between px-[16px]">
          <div className="w-[30px] h-[30px] rounded-full shrink-0 bg-(--nav-bg-divider-strong)" />
          <div className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-h1/body">
            Prosper
          </div>
          <div className="flex items-center justify-center w-[24px] h-[24px] shrink-0 rounded-sm bg-(--nav-bg-chip)">
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="9" y1="3" x2="9" y2="21" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
        <div className="w-[240px] h-px shrink-0 bg-(--nav-border)" />

        {/* Nav — Dashboard */}
        <div className="flex flex-col pt-[8px] pb-[4px] px-[6px]">
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] relative shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="7" height="7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="14" y="3" width="7" height="7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="3" y="14" width="7" height="7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="14" y="14" width="7" height="7" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Dashboard</div>
            <div className="absolute left-[0px] top-[6px] bottom-[6px] w-[2px] rounded-tr-[2px] rounded-br-[2px] bg-(--nav-text-active)" />
          </div>
        </div>

        {/* Nav Group — Operations */}
        <div className="flex flex-col py-[4px] px-[6px]">
          <div className="font-ui font-(--weight-semibold) inline-block pt-[6px] pb-[4px] px-[10px]">
            <div className="inline-block font-ui text-[10px] font-(--weight-semibold) tracking-[0.08em] uppercase leading-[12px] text-(--nav-text-label)">
              Operations
            </div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M3 3h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 9h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 15h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 21h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Catalog</div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Stock</div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <circle cx="9" cy="21" r="1" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="20" cy="21" r="1" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Sales</div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <polyline points="17 1 21 5 17 9" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="7 23 3 19 7 15" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Handovers</div>
          </div>
        </div>

        {/* Nav Group — People & Money */}
        <div className="flex flex-col py-[4px] px-[6px]">
          <div className="font-ui font-(--weight-semibold) inline-block pt-[6px] pb-[4px] px-[10px]">
            <div className="inline-block font-ui text-[10px] font-(--weight-semibold) tracking-[0.08em] uppercase leading-[12px] text-(--nav-text-label)">
              People &amp; Money
            </div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="9" cy="7" r="4" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Customers</div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect x="1" y="4" width="22" height="16" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="1" y1="10" x2="23" y2="10" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Financials</div>
          </div>
        </div>

        {/* Nav Group — Team */}
        <div className="flex flex-col py-[4px] px-[6px]">
          <div className="font-ui font-(--weight-semibold) inline-block pt-[6px] pb-[4px] px-[10px]">
            <div className="inline-block font-ui text-[10px] font-(--weight-semibold) tracking-[0.08em] uppercase leading-[12px] text-(--nav-text-label)">
              Team
            </div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Staff</div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0 bg-(--nav-bg-active)">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 9h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M9 21V9" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-sm/micro">Assets</div>
          </div>
        </div>

        {/* Nav Group — Reporting */}
        <div className="flex flex-col py-[4px] px-[6px]">
          <div className="font-ui font-(--weight-semibold) inline-block pt-[6px] pb-[4px] px-[10px]">
            <div className="inline-block font-ui text-[10px] font-(--weight-semibold) tracking-[0.08em] uppercase leading-[12px] text-(--nav-text-label)">
              Reporting
            </div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Reports</div>
          </div>
          <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="12 6 12 12 16 14" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Audit trail</div>
          </div>
        </div>

        {/* Sidebar Footer — Account */}
        <div className="flex items-center justify-between mt-auto shrink-0 py-[12px] px-[14px] bg-(--nav-bg-avatar) border-t border-t-solid border-t-(--nav-border)">
          <div className="flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] flex items-center justify-center rounded-[50%] shrink-0 bg-(--nav-bg-divider-strong)">
              <div className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-caption/micro">
                {assetsAccount.initials}
              </div>
            </div>
            <div className="flex flex-col">
              <div className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-sm/micro">
                {assetsAccount.name}
              </div>
              <div className="font-ui text-micro inline-block leading-[14px] text-(--nav-text-subtle)">
                {assetsAccount.role}
              </div>
            </div>
          </div>
          <div className="flex items-center py-[5px] px-[8px] rounded-sm gap-[4px] bg-(--nav-bg-chip)">
            <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="16 17 21 12 16 7" fill="none" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="21" y1="12" x2="9" y2="12" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="font-ui text-micro font-(--weight-medium) inline-block leading-[14px] text-(--nav-text-strong)">
              Sign out
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex grow min-h-[0px] self-stretch">
        <div className="flex items-start flex-1 flex-col self-stretch">
          <div className="flex flex-col grow min-w-[0px] self-stretch">
            {/* Toolbar */}
            <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h1/h1">
                {assetsTitle}
              </div>
              <div className="flex items-center h-[22px] font-ui self-center px-(--sp-4) rounded-lg [background-color:var(--surface-subtle)]">
                <div className="flex font-ui w-max shrink-0 [color:var(--text-secondary)] text-sm/micro">
                  {assetsCountLabel}
                </div>
              </div>
              <div className="grow" />
              <div className="flex items-center h-[36px] shrink-0 px-(--sp-6) rounded-sm gap-(--sp-3) bg-accent">
                <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                  <line x1="12" y1="5" x2="12" y2="19" stroke="#FFFFFF" strokeWidth="2" />
                  <line x1="5" y1="12" x2="19" y2="12" stroke="#FFFFFF" strokeWidth="2" />
                </svg>
                <div className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-white text-body/sm">
                  {assetsAddLabel}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) w-[1200px] max-w-[1200px] overflow-clip">
              {/* Tabs + filters */}
              <div className="flex items-center justify-between [width:100%] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
                <div className="flex items-center">
                  {assetsCategoryTabs.map((tab) => {
                    const isActive = tab === assetsActiveCategoryTab;
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
                <div className="flex items-center shrink-0 pb-(--sp-3) gap-(--sp-4)">
                  <div className="flex items-center h-[32px] px-(--sp-5) rounded-sm gap-(--sp-3) bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                    <div className="font-ui inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
                      {assetsLocationFilter}
                    </div>
                  </div>
                  <div className="flex items-center h-[32px] px-(--sp-5) rounded-sm gap-(--sp-3) bg-(--surface-page) border border-solid [border-color:var(--border-strong)]">
                    <div className="font-ui inline-block w-max shrink-0 [color:var(--text-primary)] text-body/sm">
                      {assetsConditionFilter}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]">
                <div className="flex items-center h-[32px] shrink-0 px-(--sp-6) gap-(--sp-6) bg-info-bg border-b border-b-solid border-b-gray-600">
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] grow min-w-[200px] inline-block text-info">Asset Name</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[160px] shrink-0 inline-block text-info">Category</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[150px] shrink-0 inline-block text-info">Location</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[130px] shrink-0 inline-block text-info">Purchase Date</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[120px] shrink-0 text-right inline-block text-info">Cost Basis (KES)</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[110px] shrink-0 inline-block text-info">Condition</div>
                  <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[50px] shrink-0 inline-block text-info">Edit</div>
                </div>
                {assetsRows.map((row, i) => (
                  <div
                    key={row.name}
                    className={`flex items-center h-[44px] shrink-0 px-(--sp-6) gap-(--sp-6) ${
                      i < assetsRows.length - 1 ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]" : ""
                    }`}
                  >
                    <div className="font-ui font-(--weight-medium) grow min-w-[200px] inline-block [color:var(--text-primary)] text-sm/micro">{row.name}</div>
                    <div className="font-ui w-[160px] shrink-0 inline-block [color:var(--text-primary)] text-sm/micro">{row.category}</div>
                    <div className="font-ui w-[150px] shrink-0 inline-block [color:var(--text-primary)] text-sm/micro">{row.location}</div>
                    <div className="font-mono w-[130px] shrink-0 inline-block [color:var(--text-secondary)] text-sm/micro">{row.purchaseDate}</div>
                    <div className="font-mono font-(--weight-medium) w-[120px] shrink-0 text-right inline-block [color:var(--text-primary)] text-sm/micro">{row.costBasis}</div>
                    <div className="flex items-center h-[22px] w-[110px] shrink-0 rounded-lg gap-[6px]">
                      <div className={`w-[6px] h-[6px] shrink-0 rounded-[50%] ${assetsConditionDotClass[row.condition]}`} />
                      <div className={`font-ui inline-block w-max shrink-0 text-sm/micro ${assetsConditionTextClass[row.condition]}`}>
                        {row.condition}
                      </div>
                    </div>
                    <div className="font-ui w-[50px] shrink-0 inline-block text-accent text-sm/micro">Edit</div>
                  </div>
                ))}
              </div>

              {/* Summary strip */}
              <div className="flex items-center h-[44px] [width:100%] px-(--sp-6) rounded-md gap-(--sp-8) shrink-0 bg-gray-900">
                <div className="font-ui font-(--weight-semibold) tracking-[0.02em] uppercase inline-block w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                  {assetsSummary.label}
                </div>
                <div className="flex items-center ml-auto gap-(--sp-3)">
                  <div className="font-ui inline-block w-max shrink-0 text-success text-sm/micro">{assetsSummary.good}</div>
                </div>
                <div className="flex items-center gap-(--sp-3)">
                  <div className="font-ui inline-block w-max shrink-0 text-warning text-sm/micro">{assetsSummary.needsRepair}</div>
                </div>
                <div className="flex items-center gap-(--sp-3)">
                  <div className="font-ui inline-block w-max shrink-0 text-danger text-sm/micro">{assetsSummary.decommissioned}</div>
                </div>
                <div className="flex items-center gap-(--sp-3)">
                  <div className="font-ui inline-block w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro">
                    {assetsSummary.totalCostBasisLabel}
                  </div>
                  <div className="font-mono font-(--weight-semibold) inline-block w-max shrink-0 text-success text-body/sm">
                    {assetsSummary.totalCostBasisValue}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
