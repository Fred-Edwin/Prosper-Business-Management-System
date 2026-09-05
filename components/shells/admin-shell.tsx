// Verbatim transcription of Paper artboards:
//   "Admin Shell — Desktop (Full-Height Sidebar)" (649-0) — the 240px sidebar
//   "Admin Shell — Desktop (Sidebar Collapsed, Icon Rail)" (67T-0) — the 56px rail
// One component, `collapsed` prop switches the sidebar markup between the two
// artboards using each artboard's own emitted class strings. Body / toolbar
// transcribed from 64A-0 (full) and 67Z-0 (collapsed — the expand toggle lives
// in the content toolbar, NOT in the rail).
//
// The outer Paper artboard frame (w-[1440px] h-[900px]) is dropped: the shell
// fills the viewport — h-screen w-full, fixed-width sidebar, flex-1 body which
// is the only scroll region.
//
// §9 hover / focus-visible / disabled / pressed come from app/globals.css
// utilities (.kit-interactive / .kit-focus-ring), not re-specified here.
// `collapsed` is a plain prop — no persistence (ADR-36b).
//
// Nav icons are matched by SHAPE to the Paper hand-drawn placeholders and
// mapped by `key` (NAV_ICONS). The destinations + their grouping live in
// ./admin-nav-model.ts, shared with the mobile drawer.
//
// M6 (owner request, Paper page "M6 — Expandable navigation", Approach A):
// the full sidebar renders an inline accordion — sections that are one route
// with an inner tab row (Financials, Sales, Staff, Catalog, Assets) get a
// disclosure chevron and an indented sub-list. The label navigates to the
// section default; the chevron only toggles. One section open at a time; the
// section owning the active route opens by default. The collapsed icon rail
// is unchanged (icons only, no sub-nav). Handovers + Reports are gone as
// top-level links — Handovers is a Financials tab, Reports was never built.
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useAdminToolbarValue } from "./admin-toolbar-context";
import {
  ADMIN_NAV_GROUPS,
  ADMIN_NAV_ITEMS_FLAT,
  activeChildKey,
  type AdminNavItemDef,
} from "./admin-nav-model";

const SW = { fill: "none", stroke: "#FFFFFF", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {children}
    </svg>
  );
}

const ICON_DASHBOARD = (
  <Svg>
    <rect x="3" y="3" width="7" height="7" {...SW} />
    <rect x="14" y="3" width="7" height="7" {...SW} />
    <rect x="3" y="14" width="7" height="7" {...SW} />
    <rect x="14" y="14" width="7" height="7" {...SW} />
  </Svg>
);
const ICON_CATALOG = (
  <Svg>
    <path d="M3 3h18" {...SW} />
    <path d="M3 9h18" {...SW} />
    <path d="M3 15h18" {...SW} />
    <path d="M3 21h18" {...SW} />
  </Svg>
);
const ICON_STOCK = (
  <Svg>
    <rect x="2" y="7" width="20" height="14" rx="2" {...SW} />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" {...SW} />
  </Svg>
);
const ICON_SALES = (
  <Svg>
    <circle cx="9" cy="21" r="1" {...SW} />
    <circle cx="20" cy="21" r="1" {...SW} />
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" {...SW} />
  </Svg>
);
const ICON_CUSTOMERS = (
  <Svg>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" {...SW} />
    <circle cx="9" cy="7" r="4" {...SW} />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" {...SW} />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" {...SW} />
  </Svg>
);
const ICON_FINANCIALS = (
  <Svg>
    <rect x="1" y="4" width="22" height="16" rx="2" {...SW} />
    <line x1="1" y1="10" x2="23" y2="10" {...SW} />
  </Svg>
);
const ICON_STAFF = (
  <Svg>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...SW} />
    <circle cx="12" cy="7" r="4" {...SW} />
  </Svg>
);
const ICON_ASSETS = (
  <Svg>
    <rect x="3" y="3" width="18" height="18" rx="2" {...SW} />
    <path d="M3 9h18" {...SW} />
    <path d="M9 21V9" {...SW} />
  </Svg>
);
const ICON_AUDIT = (
  <Svg>
    <circle cx="12" cy="12" r="10" {...SW} />
    <polyline points="12 6 12 12 16 14" {...SW} />
  </Svg>
);

// key → icon. Keys come from admin-nav-model.ts; this map is the shell's own
// SVG vocabulary, kept here so the model stays icon-free.
const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: ICON_DASHBOARD,
  catalog: ICON_CATALOG,
  stock: ICON_STOCK,
  sales: ICON_SALES,
  customers: ICON_CUSTOMERS,
  financials: ICON_FINANCIALS,
  staff: ICON_STAFF,
  assets: ICON_ASSETS,
  "audit-trail": ICON_AUDIT,
};

// 12px chevron for expandable rows — points right when collapsed, the caller
// rotates it 90° when the section is open.
const ICON_CHEVRON = (
  <svg width="12" height="12" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" fill="none" stroke="var(--nav-text-label)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NAV_GROUPS = ADMIN_NAV_GROUPS;
const ALL_ITEMS = ADMIN_NAV_ITEMS_FLAT;

// Re-export so existing importers (app/admin/admin-shell-client.tsx, tests)
// keep resolving `ADMIN_NAV_ITEMS` from the shell.
export { ADMIN_NAV_ITEMS } from "./admin-nav-model";

const ICON_PANEL = (
  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="9" y1="3" x2="9" y2="21" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_PANEL_DARK = (
  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="9" y1="3" x2="9" y2="21" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ICON_SIGNOUT = (
  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" fill="none" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="16 17 21 12 16 7" fill="none" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="21" y1="12" x2="9" y2="12" stroke="rgb(255 255 255 / 85%)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export interface AdminShellProps {
  activeNavKey: string;
  /** Current `?tab=` value, used to light the right sub-item. */
  activeTabParam?: string | null;
  onNavigate: (href: string) => void;
  accountName: string;
  accountRole: string;
  accountInitials: string;
  onAccountClick: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  children: React.ReactNode;
}

/**
 * One desktop side-nav row. Plain link when `item.children` is absent;
 * a label-button + disclosure-chevron + inline sub-list when present. The
 * label always navigates to `item.href`; the chevron only toggles.
 */
function DesktopNavRow({
  item,
  active,
  activeChild,
  expanded,
  onToggle,
  onNavigate,
}: {
  item: AdminNavItemDef;
  active: boolean;
  activeChild: string | null;
  expanded: boolean;
  onToggle: () => void;
  onNavigate: (href: string) => void;
}) {
  const icon = NAV_ICONS[item.key] ?? null;
  const labelCls = cn(
    "font-ui inline-block text-sm/micro",
    active ? "font-(--weight-medium) text-(--nav-text-active)" : "font-(--weight-regular) text-(--nav-text)",
  );

  if (!item.children) {
    return (
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={() => onNavigate(item.href)}
        className={cn(
          "flex items-center h-[36px] px-(--nav-item-pad-inline) rounded-(--nav-item-radius) gap-[8px] relative shrink-0 kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]",
          active && "bg-(--nav-bg-active)",
        )}
      >
        {icon}
        <span className={labelCls}>{item.label}</span>
        {active && (
          <span className="absolute left-[0px] top-[6px] bottom-[6px] w-[2px] rounded-tr-[2px] rounded-br-[2px] bg-(--nav-text-active)" />
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col shrink-0">
      <div
        className={cn(
          "flex items-center h-[36px] rounded-(--nav-item-radius) kit-interactive [--kit-hover-bg:var(--nav-bg-hover)]",
          active && "bg-(--nav-bg-active)",
        )}
      >
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => onNavigate(item.href)}
          className="flex items-center grow h-full pl-(--nav-item-pad-inline) gap-[8px] rounded-l-(--nav-item-radius) kit-focus-ring kit-focus-on-dark"
        >
          {icon}
          <span className={labelCls}>{item.label}</span>
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
          onClick={onToggle}
          className="flex items-center justify-center w-[32px] h-full shrink-0 rounded-r-(--nav-item-radius) kit-focus-ring kit-focus-on-dark"
        >
          <span
            className="flex transition-transform duration-150"
            style={{ transform: expanded ? "rotate(90deg)" : "none" }}
          >
            {ICON_CHEVRON}
          </span>
        </button>
      </div>
      {expanded && (
        <div className="flex pt-[2px] pb-[4px]">
          {/* connector rail */}
          <div className="w-[16px] shrink-0 flex justify-center">
            <span className="w-px bg-(--nav-border)" style={{ marginLeft: "9px" }} />
          </div>
          <div className="flex flex-col grow gap-[1px] pr-[6px]">
            {item.children.map((child) => {
              const childActive = child.key === activeChild;
              return (
                <button
                  key={child.key}
                  type="button"
                  aria-current={childActive ? "page" : undefined}
                  onClick={() => onNavigate(child.href)}
                  className={cn(
                    "flex items-center h-[30px] px-[10px] rounded-sm shrink-0 kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]",
                    childActive && "bg-(--nav-bg-active)",
                  )}
                >
                  <span
                    className={cn(
                      "font-ui inline-block text-caption/micro",
                      childActive
                        ? "font-(--weight-medium) text-(--nav-text-active)"
                        : "font-(--weight-regular) text-(--nav-text)",
                    )}
                  >
                    {child.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminShell({
  activeNavKey,
  activeTabParam = null,
  onNavigate,
  accountName,
  accountRole,
  accountInitials,
  onAccountClick,
  collapsed,
  onToggleCollapsed,
  children,
}: AdminShellProps) {
  // ADR-56: the one header row. Title + actions are published by the page that
  // renders inside this shell (via <AdminPageHeader>) — not props.
  const { title, actions } = useAdminToolbarValue();

  // Accordion: which expandable section is open. One at a time; the section
  // containing the active route opens by default and re-opens whenever the
  // active route moves into a different section.
  const activeChild = activeChildKey(activeNavKey, activeTabParam);
  const [expandedKey, setExpandedKey] = React.useState<string | null>(activeNavKey);
  React.useEffect(() => {
    const parent = ADMIN_NAV_ITEMS_FLAT.find((i) => i.key === activeNavKey);
    if (parent?.children) setExpandedKey(activeNavKey);
  }, [activeNavKey]);
  const toggleExpanded = React.useCallback(
    (key: string) => setExpandedKey((cur) => (cur === key ? null : key)),
    [],
  );
  return (
    <div className="[font-synthesis:none] flex h-screen w-full antialiased text-caption/micro">
      {collapsed ? (
        /* Icon Rail — 6GN-0 */
        <nav
          aria-label="Primary"
          className="flex flex-col w-[56px] h-full shrink-0 bg-(--nav-bg)"
        >
          <div className="flex flex-col items-center pt-[20px] pb-[16px] gap-[16px]">
            <div
              className="w-[28px] h-[28px] rounded-full shrink-0 bg-cover bg-position-[50%]"
              style={{ backgroundImage: "url(https://app.paper.design/file-assets/01M0EZ7TAHZM26KBMWNYT0928X/01M0VN1VB5J2R3GSKCSMFMPMSW.jpg)" }}
            />
          </div>
          <div className="w-[56px] h-px shrink-0 bg-(--nav-border)" />
          <div className="flex flex-col items-center grow pt-[12px] gap-[4px] overflow-y-auto">
            {ALL_ITEMS.map((item) => {
              const active = item.key === activeNavKey;
              return (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate(item.href)}
                  className={cn(
                    "flex items-center justify-center w-[40px] h-[40px] shrink-0 rounded-(--nav-item-radius) kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]",
                    active && "bg-(--nav-bg-active)",
                  )}
                >
                  {NAV_ICONS[item.key] ?? null}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center shrink-0 pt-[12px] pb-[16px]">
            <button
              type="button"
              onClick={onAccountClick}
              aria-label="Account"
              className="w-[30px] h-[30px] flex items-center justify-center rounded-full shrink-0 bg-(--nav-bg-divider-strong) kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]"
            >
              <span className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-caption/micro">
                {accountInitials}
              </span>
            </button>
          </div>
        </nav>
      ) : (
        /* Side nav — 64I-0 */
        <nav
          aria-label="Primary"
          className="flex flex-col w-[240px] shrink-0 self-stretch bg-(--nav-bg)"
        >
          <div className="flex items-center shrink-0 gap-(--sp-3) w-[240px] pt-[20px] pb-[16px] justify-between px-[16px]">
            <div
              className="w-[30px] h-[30px] rounded-full shrink-0 bg-cover bg-position-[50%]"
              style={{ backgroundImage: "url(https://app.paper.design/file-assets/01M0EZ7TAHZM26KBMWNYT0928X/01M0VN1VB5J2R3GSKCSMFMPMSW.jpg)" }}
            />
            <div className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-h1/body">
              Prosper
            </div>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              className="flex items-center justify-center w-[24px] h-[24px] shrink-0 rounded-sm bg-(--nav-bg-chip) kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]"
            >
              {ICON_PANEL}
            </button>
          </div>
          <div className="w-[240px] h-px shrink-0 bg-(--nav-border)" />

          {/* Nav Group — Top (Dashboard) */}
          <div className="flex flex-col pt-[8px] pb-[4px] px-[6px]">
            {NAV_GROUPS[0].items.map((item) => (
              <DesktopNavRow
                key={item.key}
                item={item}
                active={item.key === activeNavKey}
                activeChild={activeChild}
                expanded={expandedKey === item.key}
                onToggle={() => toggleExpanded(item.key)}
                onNavigate={onNavigate}
              />
            ))}
          </div>

          {/* Grouped nav */}
          {NAV_GROUPS.slice(1).map((group, gi) => (
            <div key={gi} className="flex flex-col py-[4px] px-[6px]">
              <div className="font-ui font-(--weight-semibold) inline-block pt-[6px] pb-[4px] px-[10px]">
                <div className="inline-block font-ui text-[10px] font-(--weight-semibold) tracking-[0.08em] uppercase leading-[12px] text-(--nav-text-label)">
                  {group.label}
                </div>
              </div>
              {group.items.map((item) => (
                <DesktopNavRow
                  key={item.key}
                  item={item}
                  active={item.key === activeNavKey}
                  activeChild={activeChild}
                  expanded={expandedKey === item.key}
                  onToggle={() => toggleExpanded(item.key)}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          ))}

          {/* Sidebar Footer — Account */}
          <div className="flex items-center justify-between mt-auto shrink-0 py-[12px] px-[14px] bg-(--nav-bg-avatar) border-t border-t-solid border-t-(--nav-border)">
            <div className="flex items-center gap-[10px]">
              <div className="w-[30px] h-[30px] flex items-center justify-center rounded-[50%] shrink-0 bg-(--nav-bg-divider-strong)">
                <div className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-caption/micro">
                  {accountInitials}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="font-ui font-(--weight-medium) inline-block text-(--nav-text-active) text-sm/micro">
                  {accountName}
                </div>
                <div className="font-ui text-micro inline-block leading-[14px] text-(--nav-text-subtle)">
                  {accountRole}
                </div>
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
      )}

      {/* Body — 64A-0 / 67U-0 */}
      <div className="flex grow min-w-0">
        {/* min-w-0 (fix, this session): without it, this flex-1 child refuses to
            shrink below its content's intrinsic width — a wide table (e.g. the
            Ledger with horizontalScroll) then blows out THIS wrapper instead of
            triggering the table's own overflow-x-auto, and the whole document
            (sidebar included) scrolls horizontally. Structural bug in the shell
            itself, not any one screen — every wide-table Admin screen was
            affected. `min-w-0` lets this shrink to its parent's clamped width,
            so only the table's internal scroll container ever needs to scroll. */}
        <div className="flex items-start flex-1 flex-col min-w-0">
          <div className="flex flex-col grow min-w-0 self-stretch h-screen">
            <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              {collapsed && (
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label="Expand sidebar"
                  className="flex items-center justify-center w-[24px] h-[24px] shrink-0 rounded-sm [background-color:var(--surface-hover)] kit-interactive kit-focus-ring"
                >
                  {ICON_PANEL_DARK}
                </button>
              )}
              {typeof title === "string" ? (
                <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h1/h1">
                  {title}
                </div>
              ) : (
                title
              )}
              <div className="grow" />
              {actions}
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
    </div>
  );
}
