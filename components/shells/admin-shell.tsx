"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Package,
  Boxes,
  ShoppingCart,
  Repeat,
  Users,
  Wallet,
  UserSquare2,
  Archive,
  BarChart3,
  History,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

export interface AdminNavGroup {
  label?: string;
  items: AdminNavItem[];
}

const NAV_GROUPS: AdminNavGroup[] = [
  { items: [{ key: "dashboard", label: "Dashboard", icon: LayoutGrid, href: "/admin" }] },
  {
    label: "Operations",
    items: [
      { key: "catalog", label: "Catalog", icon: Package, href: "/admin/catalog" },
      { key: "stock", label: "Stock", icon: Boxes, href: "/admin/stock" },
      { key: "sales", label: "Sales", icon: ShoppingCart, href: "/admin/sales" },
      { key: "handovers", label: "Handovers", icon: Repeat, href: "/admin/handovers" },
    ],
  },
  {
    label: "People & Money",
    items: [
      { key: "customers", label: "Customers", icon: Users, href: "/admin/customers" },
      { key: "financials", label: "Financials", icon: Wallet, href: "/admin/financials" },
    ],
  },
  {
    label: "Team",
    items: [
      { key: "staff", label: "Staff", icon: UserSquare2, href: "/admin/staff" },
      { key: "assets", label: "Assets", icon: Archive, href: "/admin/assets" },
    ],
  },
  {
    label: "Reporting",
    items: [
      { key: "reports", label: "Reports", icon: BarChart3, href: "/admin/reports" },
      { key: "audit-trail", label: "Audit trail", icon: History, href: "/admin/audit-trail" },
    ],
  },
];

export interface AdminShellProps {
  activeNavKey: string;
  onNavigate: (href: string) => void;
  toolbarTitle: string;
  toolbarSubtitle?: string;
  toolbarActions?: React.ReactNode;
  accountName: string;
  accountRole: string;
  accountInitials: string;
  onAccountClick: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  children: React.ReactNode;
}

export function AdminShell({
  activeNavKey,
  onNavigate,
  toolbarTitle,
  toolbarSubtitle,
  toolbarActions,
  accountName,
  accountRole,
  accountInitials,
  onAccountClick,
  collapsed = false,
  onToggleCollapsed,
  children,
}: AdminShellProps) {
  const allItems = NAV_GROUPS.flatMap((g) => g.items);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {collapsed ? (
        <nav className="flex h-full w-14 shrink-0 flex-col bg-nav-bg">
          <div className="flex h-16 shrink-0 items-center justify-center">
            <button type="button" onClick={onToggleCollapsed} className="flex size-8 items-center justify-center rounded-sm outline-none hover:bg-nav-bg-hover" aria-label="Expand sidebar">
              <PanelLeftOpen className="size-4 text-nav-text" strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <div className="h-px w-full shrink-0 bg-nav-border" />
          <div className="flex grow flex-col items-center gap-1 pt-3">
            {allItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeNavKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onNavigate(item.href)}
                  title={item.label}
                  className={cn("flex size-10 shrink-0 items-center justify-center rounded-sm outline-none", active ? "bg-nav-bg-active" : "hover:bg-nav-bg-hover")}
                >
                  <Icon className={cn("size-4", active ? "text-nav-text-active" : "text-nav-text")} strokeWidth={1.5} aria-hidden />
                </button>
              );
            })}
          </div>
          <div className="flex shrink-0 items-center justify-center border-t border-solid border-nav-border bg-nav-bg-avatar py-3">
            <button
              type="button"
              onClick={onAccountClick}
              className="flex size-[30px] items-center justify-center rounded-full bg-nav-bg-divider-strong font-ui text-caption/caption text-nav-text-active outline-none"
            >
              {accountInitials}
            </button>
          </div>
        </nav>
      ) : (
        <nav className="flex h-full w-60 shrink-0 flex-col bg-nav-bg">
          <div className="flex shrink-0 items-center justify-between gap-3 px-4 pb-4 pt-5">
            <div className="flex items-center gap-2">
              <div className="flex size-[30px] shrink-0 items-center justify-center rounded-md bg-accent font-ui text-sm/sm font-semibold text-white">P</div>
              <span className="font-ui text-h2/h2 font-semibold text-nav-text-active">Prosper</span>
            </div>
            {onToggleCollapsed && (
              <button type="button" onClick={onToggleCollapsed} className="flex size-6 items-center justify-center rounded-sm outline-none hover:bg-nav-bg-hover" aria-label="Collapse sidebar">
                <PanelLeftClose className="size-3.5 text-nav-text" strokeWidth={1.5} aria-hidden />
              </button>
            )}
          </div>
          <div className="h-px w-full shrink-0 bg-nav-border" />
          <div className="flex grow flex-col gap-1 overflow-y-auto px-3 py-3">
            {NAV_GROUPS.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-0.5">
                {group.label && (
                  <div className="px-2.5 pb-1.5 pt-3 font-ui text-[10px] font-semibold uppercase tracking-[0.08em] text-nav-text-label">{group.label}</div>
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
                        "relative flex h-9 shrink-0 items-center gap-2 rounded-sm px-2.5 outline-none",
                        active ? "bg-nav-bg-active" : "hover:bg-nav-bg-hover",
                      )}
                    >
                      {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-r-sm bg-nav-text-active" />}
                      <Icon className={cn("size-4 shrink-0", active ? "text-nav-text-active" : "text-nav-text")} strokeWidth={1.5} aria-hidden />
                      <span className={cn("font-ui text-sm/sm", active ? "font-medium text-nav-text-active" : "text-nav-text")}>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-auto flex shrink-0 items-center justify-between border-t border-solid border-nav-border bg-nav-bg-avatar px-3.5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-nav-bg-divider-strong font-ui text-sm/sm text-nav-text-active">
                {accountInitials}
              </div>
              <div className="flex flex-col">
                <span className="font-ui text-sm/sm text-nav-text-strong">{accountName}</span>
                <span className="font-ui text-[11px] leading-[14px] text-nav-text-subtle">{accountRole}</span>
              </div>
            </div>
            <button type="button" onClick={onAccountClick} className="flex items-center gap-1 rounded-sm bg-nav-bg-chip px-2 py-1.5 outline-none hover:bg-nav-bg-hover">
              <LogOut className="size-3.5 text-nav-text" strokeWidth={1.5} aria-hidden />
              <span className="font-ui text-[11px] leading-[14px] text-nav-text">Sign out</span>
            </button>
          </div>
        </nav>
      )}

      <div className="flex min-w-0 grow flex-col">
        <header className="flex h-11 shrink-0 items-center gap-4 border-b border-solid border-border-subtle pl-6 pr-6">
          <h1 className="font-ui text-h1/h1 font-semibold text-text-primary">{toolbarTitle}</h1>
          {toolbarSubtitle && <span className="font-ui text-sm/sm text-text-secondary">{toolbarSubtitle}</span>}
          <div className="ml-auto flex items-center gap-3">
            {toolbarActions}
            <button
              type="button"
              onClick={onAccountClick}
              className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-gray-700 font-ui text-caption/caption text-white outline-none"
            >
              {accountInitials}
            </button>
          </div>
        </header>
        <div className="flex min-h-0 grow flex-col overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
