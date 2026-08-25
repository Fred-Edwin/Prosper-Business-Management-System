"use client";

import * as React from "react";
import { X, LogOut } from "lucide-react";
import type { AdminNavGroup } from "./admin-shell";
import { cn } from "@/lib/utils";

export interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  navGroups: AdminNavGroup[];
  activeNavKey: string;
  onNavigate: (href: string) => void;
  brandLabel: string;
  brandSubLabel: string;
  accountName: string;
  accountRole: string;
  accountInitials: string;
  onAccountClick: () => void;
}

export function MobileNavDrawer({
  open,
  onClose,
  navGroups,
  activeNavKey,
  onNavigate,
  brandLabel,
  brandSubLabel,
  accountName,
  accountRole,
  accountInitials,
  onAccountClick,
}: MobileNavDrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex h-full w-[310px] shrink-0 flex-col bg-nav-bg shadow-[4px_0_20px_#0000004D]">
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-solid border-nav-border px-4 pb-4 pt-6">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent font-ui text-sm/sm font-semibold text-white">P</div>
            <div className="flex flex-col">
              <span className="font-ui text-sm/[18px] font-semibold text-nav-text-active">{brandLabel}</span>
              <span className="font-ui text-[11px] leading-[14px] text-nav-text-subtle">{brandSubLabel}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="flex size-7 items-center justify-center outline-none" aria-label="Close menu">
            <X className="size-3.5 text-nav-text" strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        <div className="flex grow flex-col gap-1 overflow-y-auto px-2 py-1">
          {navGroups.map((group, gi) => (
            <div key={gi} className="flex flex-col gap-0.5">
              {group.label && (
                <div className="px-3 pb-1.5 pt-3 font-ui text-[10px] font-semibold uppercase tracking-[0.08em] text-nav-text-label">{group.label}</div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeNavKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onNavigate(item.href)}
                    className={cn(
                      "relative flex h-[38px] shrink-0 items-center gap-2.5 rounded-sm px-3 outline-none",
                      active ? "bg-nav-bg-active" : "hover:bg-nav-bg-hover",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-nav-text-active" : "text-nav-text")} strokeWidth={1.5} aria-hidden />
                    <span className={cn("font-ui text-sm/[18px]", active ? "font-medium text-nav-text-active" : "text-nav-text")}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-solid border-nav-border bg-black/15 px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-nav-bg-divider-strong font-ui text-sm/sm text-nav-text-active">
              {accountInitials}
            </div>
            <div className="flex flex-col">
              <span className="font-ui text-sm/sm text-nav-text-strong">{accountName}</span>
              <span className="font-ui text-[11px] leading-[14px] text-nav-text-subtle">{accountRole}</span>
            </div>
          </div>
          <button type="button" onClick={onAccountClick} className="flex items-center gap-1 rounded-sm bg-nav-bg-chip px-2 py-1.5 outline-none">
            <LogOut className="size-3.5 text-nav-text" strokeWidth={1.5} aria-hidden />
            <span className="font-ui text-[11px] leading-[14px] text-nav-text">Sign out</span>
          </button>
        </div>
      </div>
      <button type="button" onClick={onClose} className="grow bg-black/30" aria-label="Close menu" />
    </div>
  );
}
