// Verbatim transcription of Paper file 01M0EZ7TAHZM26KBMWNYT0928X, page
// "M7 — Admin role switching", artboards:
//   TE6-0 "3 — Staff list screen on desktop (Stock)"  — the shell + a list screen
//   TLE-0 "4 — Staff flow screen on desktop (centered form)" — the shell + a flow
//
// The desktop staff sidebar shell. It renders ONLY while an Admin is acting as
// a staff role (role-switching Session 3, owner 2026-09-06): a real staff user
// keeps the mobile-first bottom-nav shell at every width. The choice keys off
// `actingAs`, not the viewport — see components/layout/staff-shell-client.tsx.
//
// Structure copied from components/shells/admin-shell.tsx:
//   - root `flex h-full w-full` (NOT h-screen — the full-width <ActingAsBanner>
//     sits above it in the client wrapper, exactly as for AdminShell)
//   - dark sidebar (--nav-bg), fixed w-[240px]: brand row, hairline, the role's
//     nav rows, footer (avatar · role label · Sign out)
//   - content column: a thin header row (account avatar only — staff screens
//     render their own in-page headers, so there is no shell title/toolbar the
//     way admin screens have via <AdminPageHeader>; TE6-0/TLE-0 confirm the row
//     is just a border + the avatar), then {children} as the only scroll region
//
// No workspace switcher trigger in this footer: while acting-as on a staff
// screen the Admin exits via the banner's "Exit to Admin" and re-opens the
// switcher from the Admin shell. TE6-0/TLE-0 show no switcher here.
//
// §9 hover / focus-visible / pressed come from app/globals.css utilities
// (.kit-interactive / .kit-focus-ring), not re-specified here.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * One desktop side-nav item. `key` doubles as the active-row match; `href` is
 * where the row navigates. `icon` is the lucide element (already sized/stroked
 * by the caller) — mirrors how the bottom nav's items carry their icon JSX so
 * nothing non-serialisable is implied to cross a server boundary.
 */
export interface StaffDesktopNavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface StaffDesktopShellProps {
  /** Role name shown under the account initials in the footer (e.g. "Store Manager"). */
  roleLabel: string;
  accountInitials: string;
  navItems: StaffDesktopNavItem[];
  activeNavKey: string;
  /** Called with the item key when a nav row is chosen. */
  onNavigate: (key: string) => void;
  onAccountClick: () => void;
  children: React.ReactNode;
}

const ICON_SIGNOUT = (
  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="16 17 21 12 16 7" fill="none" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="12" x2="9" y2="12" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function StaffDesktopShell({
  roleLabel,
  accountInitials,
  navItems,
  activeNavKey,
  onNavigate,
  onAccountClick,
  children,
}: StaffDesktopShellProps) {
  return (
    <div className="[font-synthesis:none] flex h-full w-full antialiased text-caption/micro">
      {/* Side nav — TE6-0 */}
      <nav
        aria-label="Primary"
        className="flex flex-col w-[240px] shrink-0 self-stretch bg-(--nav-bg)"
      >
        <div className="flex items-center shrink-0 gap-(--sp-3) w-[240px] pt-[20px] pb-[16px] px-[16px]">
          <div
            className="w-[30px] h-[30px] rounded-full shrink-0 bg-cover bg-position-[50%]"
            style={{ backgroundImage: "url(https://app.paper.design/file-assets/01M0EZ7TAHZM26KBMWNYT0928X/01M0VN1VB5J2R3GSKCSMFMPMSW.jpg)" }}
          />
          <div className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-h1/body">
            Prosper
          </div>
        </div>
        <div className="w-[240px] h-px shrink-0 bg-(--nav-border)" />

        <div className="flex flex-col pt-[8px] pb-[4px] px-[6px]">
          {navItems.map((item) => {
            const active = item.key === activeNavKey;
            return (
              <button
                key={item.key}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onNavigate(item.key)}
                className={cn(
                  "flex items-center h-[36px] px-(--nav-item-pad-inline) rounded-(--nav-item-radius) gap-[8px] relative shrink-0 kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]",
                  active && "bg-(--nav-bg-active)",
                )}
              >
                {item.icon}
                <span
                  className={cn(
                    "font-ui inline-block text-sm/micro",
                    active
                      ? "font-(--weight-medium) text-(--nav-text-active)"
                      : "font-(--weight-regular) text-(--nav-text)",
                  )}
                >
                  {item.label}
                </span>
                {active && (
                  <span className="absolute left-[0px] top-[6px] bottom-[6px] w-[2px] rounded-tr-[2px] rounded-br-[2px] bg-(--nav-text-active)" />
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer — Account (avatar · role label · Sign out). No
            switcher chevron: the Admin exits via the acting-as banner. */}
        <div className="flex items-center justify-between mt-auto shrink-0 py-[12px] px-[14px] bg-(--nav-bg-avatar) border-t border-t-solid border-t-(--nav-border)">
          <div className="flex items-center gap-[10px]">
            <div className="w-[30px] h-[30px] flex items-center justify-center rounded-[50%] shrink-0 bg-(--nav-bg-divider-strong)">
              <div className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-caption/micro">
                {accountInitials}
              </div>
            </div>
            <div className="font-ui text-micro inline-block leading-[14px] text-(--nav-text-subtle)">
              {roleLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={onAccountClick}
            className="flex items-center py-[5px] px-[8px] rounded-sm gap-[4px] bg-(--nav-bg-chip) kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]"
          >
            {ICON_SIGNOUT}
            <span className="font-ui text-micro font-(--weight-medium) inline-block leading-[14px] text-(--nav-text-strong)">
              Sign out
            </span>
          </button>
        </div>
      </nav>

      {/* Body — TE6-0 / TLE-0 */}
      <div className="flex grow min-w-0">
        {/* min-w-0 (same fix as admin-shell.tsx): without it this flex child
            refuses to shrink below its content's intrinsic width — a wide table
            (e.g. the staff Stock ledger) then blows out this wrapper instead of
            triggering the table's own overflow-x-auto, and the whole document
            (sidebar included) scrolls horizontally. `min-w-0` lets this shrink
            to its parent's clamped width, so only the table's internal scroll
            container ever needs to scroll. */}
        <div className="flex flex-col grow min-w-0 self-stretch h-full">
          <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
            <div className="grow" />
            <button
              type="button"
              onClick={onAccountClick}
              aria-label="Account"
              className="w-[26px] h-[26px] flex items-center justify-center shrink-0 rounded-[50%] bg-gray-700 kit-interactive kit-focus-ring"
            >
              <span className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-micro/micro">
                {accountInitials}
              </span>
            </button>
          </div>
          <div className="flex flex-col grow min-h-0 overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
