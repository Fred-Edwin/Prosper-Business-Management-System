// Verbatim transcription of Paper artboard "Mobile Shell — Admin (Drawer Closed)"
// (6B1-0). The status bar and the placeholder content text are dropped; content
// is passed in as `children`. The outer 390×844 artboard frame is dropped: the
// shell fills the viewport (h-screen w-full flex-col), content flex-1 is the
// only scroll region.
//
// Structure from the artboard:
//   Header (6BD-0): h-[48px], hamburger (20×20) + title + avatar
//   Content       : flex-1, the only scroll region
//
// The hamburger opens MobileNavDrawer (1ZP-0), wired here with one internal
// useState per §B1 ("the ONE internal useState each mobile shell needs for its
// own drawer"). §9 interaction states come from globals.css.
"use client";

import * as React from "react";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import { useAdminToolbarValue } from "./admin-toolbar-context";

const ICON_HAMBURGER = (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <line x1="3" y1="12" x2="21" y2="12" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="6" x2="21" y2="6" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="3" y1="18" x2="21" y2="18" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export interface MobileShellAdminProps {
  accountInitials: string;
  activeNavKey: string;
  onNavigate: (href: string) => void;
  brandLabel: string;
  brandSubLabel: string;
  accountName: string;
  accountRole: string;
  onAccountClick: () => void;
  children: React.ReactNode;
}

export function MobileShellAdmin({
  accountInitials,
  activeNavKey,
  onNavigate,
  brandLabel,
  brandSubLabel,
  accountName,
  accountRole,
  onAccountClick,
  children,
}: MobileShellAdminProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // ADR-56: page title + actions come from the screen (via <AdminPageHeader>),
  // not props. The approved mobile header is hamburger · title · avatar; a
  // screen's primary action rides between the title and the avatar so nothing
  // that was reachable on mobile before is lost.
  const { title, actions } = useAdminToolbarValue();

  return (
    <div className="[font-synthesis:none] flex flex-col h-screen w-full bg-(--surface-page) antialiased">
      {/* Header — 6BD-0 */}
      <div className="flex items-center h-[48px] shrink-0 px-[16px] gap-[12px] bg-(--surface-page) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="flex items-center justify-center w-[32px] h-[32px] shrink-0 rounded-sm kit-interactive kit-focus-ring"
        >
          {ICON_HAMBURGER}
        </button>
        {typeof title === "string" ? (
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1 truncate">
            {title}
          </div>
        ) : (
          title
        )}
        <div className="grow" />
        {actions && (
          <div className="flex items-center shrink-0 gap-(--sp-3)">{actions}</div>
        )}
        <button
          type="button"
          onClick={onAccountClick}
          aria-label="Account"
          className="w-[28px] h-[28px] flex items-center justify-center shrink-0 rounded-[50%] bg-gray-700 kit-interactive kit-focus-ring"
        >
          <span className="font-ui font-(--weight-medium) text-(--nav-text-active) text-micro/micro">
            {accountInitials}
          </span>
        </button>
      </div>

      {/* Content — the only scroll region */}
      <div className="flex flex-col grow min-h-0 overflow-y-auto">{children}</div>

      {/* Sidebar drawer — 1ZP-0 */}
      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeNavKey={activeNavKey}
        onNavigate={(href) => {
          setDrawerOpen(false);
          onNavigate(href);
        }}
        brandLabel={brandLabel}
        brandSubLabel={brandSubLabel}
        accountName={accountName}
        accountRole={accountRole}
        accountInitials={accountInitials}
        onAccountClick={onAccountClick}
      />
    </div>
  );
}
