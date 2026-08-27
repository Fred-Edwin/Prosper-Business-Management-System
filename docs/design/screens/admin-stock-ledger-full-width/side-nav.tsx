// The admin-shell side nav, transcribed verbatim from the Paper artboard "Admin Stock —
// Desktop Ledger (Full Width)" (798-0) side-nav frame via get_jsx. "Stock" is the active
// item. Shared by all three Admin Stock ledger screens (full-width, sidebar-collapsed,
// drawer-open) so the ~180 lines aren't duplicated — the same pattern Session 4a used for
// admin-financials-full-table/side-nav.tsx. The brand image is replaced with a local mark
// (a --nav-bg-divider-strong circle), matching the Financials side-nav. Static: no interactivity.
"use client";

import * as React from "react";

export function AdminStockSideNav() {
  return (
    <div className="[font-synthesis:none] flex flex-col w-[240px] shrink-0 self-stretch bg-(--nav-bg) antialiased text-caption/micro">
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
          <div className="absolute left-[0px] top-[6px] bottom-[6px] w-[2px] rounded-tr-[2px] rounded-br-[2px] hidden" />
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
        <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] relative shrink-0 bg-(--nav-bg-active)">
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect x="2" y="7" width="20" height="14" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-sm/micro">Stock</div>
          <div className="absolute left-[0px] top-[6px] bottom-[6px] w-[2px] rounded-tr-[2px] rounded-br-[2px] bg-(--nav-text-active)" />
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
        <div className="flex items-center h-[36px] px-[10px] rounded-sm gap-[8px] shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 9h18" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M9 21V9" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="font-ui font-(--weight-regular) inline-block text-(--nav-text) text-sm/micro">Assets</div>
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
            <div className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-caption/micro">EK</div>
          </div>
          <div className="flex flex-col">
            <div className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-sm/micro">Edwin K.</div>
            <div className="font-ui text-micro inline-block leading-[14px] text-(--nav-text-subtle)">Admin</div>
          </div>
        </div>
        <div className="flex items-center [border-image-source:none] [border-image-slice:100%] [border-image-width:1] [border-image-outset:0] [border-image-repeat:stretch] py-[5px] px-[8px] rounded-sm gap-[4px] bg-(--nav-bg-chip)">
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
  );
}
