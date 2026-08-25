"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { MobileNavDrawer } from "./mobile-nav-drawer";
import type { AdminNavGroup } from "./admin-shell";

export interface MobileShellAdminProps {
  toolbarTitle: string;
  accountInitials: string;
  navGroups: AdminNavGroup[];
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
  toolbarTitle,
  accountInitials,
  navGroups,
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

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-page">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-solid border-border-subtle bg-surface-page px-4">
        <button type="button" onClick={() => setDrawerOpen(true)} className="flex size-8 shrink-0 items-center justify-center outline-none" aria-label="Open menu">
          <Menu className="size-5 text-text-primary" strokeWidth={1.5} aria-hidden />
        </button>
        <h1 className="grow font-ui text-h1/h1 font-semibold text-text-primary">{toolbarTitle}</h1>
        <button type="button" onClick={onAccountClick} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-800 font-ui text-caption/caption text-white outline-none">
          {accountInitials}
        </button>
      </header>

      <div className="flex min-h-0 grow flex-col overflow-y-auto">{children}</div>

      <MobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navGroups={navGroups}
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
