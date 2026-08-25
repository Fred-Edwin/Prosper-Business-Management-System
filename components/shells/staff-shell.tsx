"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { BottomNav, type BottomNavItem } from "@/components/kit/bottom-nav";

export interface StaffShellProps {
  roleLabel: string;
  locationLabel: string;
  accountInitials: string;
  navItems: BottomNavItem[];
  activeNavKey: string;
  onNavigate: (href: string) => void;
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
    <div className="flex h-screen w-full flex-col overflow-hidden bg-surface-page">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-solid border-border-subtle bg-surface-page px-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onMenuClick} className="flex size-8 items-center justify-center outline-none" aria-label="Open menu">
            <Menu className="size-5 text-text-primary" strokeWidth={1.5} aria-hidden />
          </button>
          <div className="flex flex-col">
            <span className="font-ui text-body/[18px] font-semibold text-text-primary">{locationLabel}</span>
            <span className="font-ui text-[11px] leading-[14px] text-text-secondary">{roleLabel}</span>
          </div>
        </div>
        <button type="button" onClick={onAccountClick} className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-800 font-ui text-caption/caption text-white outline-none">
          {accountInitials}
        </button>
      </header>

      <div className="flex min-h-0 grow flex-col overflow-y-auto">{children}</div>

      {stickyActionBar && (
        <div className="flex h-16 w-full shrink-0 items-center justify-between border-t border-solid border-border-subtle bg-surface-page px-6">
          {stickyActionBar}
        </div>
      )}

      <BottomNav items={navItems} activeKey={activeNavKey} onNavigate={onNavigate} />
    </div>
  );
}
