// Verbatim transcription of Paper artboard "Mobile Shell — Staff (Drawer Closed)" (4Y-0).
// Only the shell chrome is transcribed — the status bar and the post-M1 Cashier
// "New Order" screen content (5H-0) are ignored; that content is passed in as
// `children`. The outer 390×844 artboard frame is dropped: the shell fills the
// viewport (h-screen w-full flex-col), body flex-1 is the only scroll region.
//
// Structure from the artboard:
//   Header  (25K-0): h-[48px], hamburger (20×20) + location/role stack + avatar
//   Content        : flex-1, single column, the only scroll region
//   Sticky action bar (6C-0): optional slot — w-full h-[64px], border-top
//   Bottom Nav (9JK-0): the kit component (components/kit/bottom-nav.tsx),
//     verified canonical in Session 2 §8
//
// §9 hover / focus-visible / pressed come from app/globals.css utilities.
// onMenuClick is caller-supplied — the shell does NOT bake in a drawer.
"use client";

import * as React from "react";
import { BottomNav, type BottomNavItem } from "@/components/kit/bottom-nav";
import { cn } from "@/lib/utils";

const ICON_HAMBURGER = (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <line x1="3" y1="12" x2="21" y2="12" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="6" x2="21" y2="6" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="18" x2="21" y2="18" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export interface StaffShellProps {
  roleLabel: string;
  locationLabel: string;
  accountInitials: string;
  navItems: BottomNavItem[];
  activeNavKey: string;
  onNavigate: (key: string) => void;
  onMenuClick?: () => void;
  onAccountClick: () => void;
  stickyActionBar?: React.ReactNode;
  children: React.ReactNode;
}

export function StaffShell({
  roleLabel,
  locationLabel,
  accountInitials,
  navItems,
  activeNavKey,
  onNavigate,
  onMenuClick,
  onAccountClick,
  stickyActionBar,
  children,
}: StaffShellProps) {
  return (
    <div className="[font-synthesis:none] flex flex-col h-screen w-full bg-(--surface-page) antialiased text-caption/micro">
      {/* Header — 25K-0 */}
      <div className="flex items-center justify-between h-[48px] shrink-0 px-[16px] bg-(--surface-page) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="flex items-center gap-[12px]">
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open menu"
            className="flex items-center justify-center w-[32px] h-[32px] rounded-sm shrink-0 kit-interactive kit-focus-ring"
          >
            {ICON_HAMBURGER}
          </button>
          <div className="flex flex-col gap-px">
            <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-body/sm">
              {locationLabel}
            </div>
            <div className="font-ui text-micro inline-block leading-[14px] [color:var(--text-secondary)]">
              {roleLabel}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            type="button"
            onClick={onAccountClick}
            aria-label="Account"
            className="w-[28px] h-[28px] flex items-center justify-center rounded-[50%] shrink-0 bg-gray-800 kit-interactive kit-focus-ring"
          >
            <span className="font-ui text-micro font-(--weight-semibold) inline-block leading-[14px] text-(--nav-text-active)">
              {accountInitials}
            </span>
          </button>
        </div>
      </div>

      {/* Content — the only scroll region */}
      <div className="flex flex-col grow min-h-0 overflow-y-auto">{children}</div>

      {/* Sticky action bar — 6C-0 (optional slot) */}
      {stickyActionBar && (
        <div className="flex items-center justify-between w-full h-[64px] shrink-0 px-(--sp-6) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
          {stickyActionBar}
        </div>
      )}

      {/* Bottom Nav — 9JK-0 (kit component) */}
      <BottomNav
        className={cn("w-full")}
        items={navItems}
        activeKey={activeNavKey}
        onNavigate={onNavigate}
      />
    </div>
  );
}
