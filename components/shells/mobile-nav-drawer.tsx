// Verbatim transcription of Paper artboard
// "Mobile Shell — Sidebar Drawer Open (Admin & Staff)" (1ZP-0) — the shared
// drawer-open panel (1ZQ-0) + its backdrop dismiss area (22I-0).
//
// The outer 390×844 artboard frame is dropped: the drawer is a fixed overlay
// filling the viewport (fixed inset-0), a w-[310px] panel + a flex-1 backdrop.
//
// Panel structure from the artboard:
//   Brand header (1ZR-0): h-[72px], logo + name/subtitle stack + close (×)
//   Nav body    (202-0): grouped nav, h-[38px] rows, px-[12px], gap-[10px],
//                        active row = --nav-bg-active + a 3px left marker
//   Footer      (229-0): avatar + name/role + Sign out chip
//
// §9 interaction states come from globals.css.
//
// M6 (owner request, Approach A — see admin-shell.tsx): the destinations +
// grouping come from ./admin-nav-model.ts (shared with the desktop shell).
// Tabbed sections (Financials, Sales, Staff, Catalog, Assets) render a
// disclosure chevron + an inline indented sub-list; the label navigates, the
// chevron toggles, one section open at a time. Handovers + Reports are gone as
// top-level links.
"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  useActiveOverlay,
  useBackgroundInert,
  useEscToClose,
  useFocusTrap,
  useOverlayTransition,
  useScrollLock,
} from "@/components/kit/internal/overlay";
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

// key → icon. Keys and grouping come from admin-nav-model.ts (shared with the
// desktop shell); this drawer keeps its own SVG set at drawer sizes.
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

const ICON_CHEVRON = (
  <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
    <polyline points="9 18 15 12 9 6" fill="none" stroke="var(--nav-text-label)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NAV_GROUPS = ADMIN_NAV_GROUPS;

const ICON_CLOSE = (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
    <line x1="18" y1="6" x2="6" y2="18" stroke="var(--nav-text-active)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="6" y1="6" x2="18" y2="18" stroke="var(--nav-text-active)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  activeNavKey: string;
  /** Current `?tab=` value, used to light the right sub-item. */
  activeTabParam?: string | null;
  onNavigate: (href: string) => void;
  brandLabel: string;
  brandSubLabel: string;
  accountName: string;
  accountRole: string;
  accountInitials: string;
  onAccountClick: () => void;
}

/**
 * One drawer row. Plain link, or — when `item.children` is present — a label
 * button + disclosure chevron with an inline indented sub-list. The label
 * navigates; the chevron only toggles.
 */
function DrawerNavRow({
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
    "font-ui inline-block text-body/sm",
    active ? "font-(--weight-medium) text-(--nav-text-active)" : "text-(--nav-text)",
  );

  if (!item.children) {
    return (
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        onClick={() => onNavigate(item.href)}
        className={cn(
          "flex items-center h-[38px] px-[12px] rounded-(--nav-item-radius) gap-[10px] relative shrink-0 kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]",
          active && "bg-(--nav-bg-active)",
        )}
      >
        {icon}
        <span className={labelCls}>{item.label}</span>
        {active && (
          <span className="absolute left-[0px] top-[6px] bottom-[6px] w-[3px] rounded-tr-[2px] rounded-br-[2px] bg-(--nav-text-active)" />
        )}
      </button>
    );
  }

  return (
    <div className="flex flex-col shrink-0">
      <div
        className={cn(
          "flex items-center h-[38px] rounded-(--nav-item-radius) kit-interactive [--kit-hover-bg:var(--nav-bg-hover)]",
          active && "bg-(--nav-bg-active)",
        )}
      >
        <button
          type="button"
          aria-current={active ? "page" : undefined}
          onClick={() => onNavigate(item.href)}
          className="flex items-center grow h-full pl-[12px] gap-[10px] rounded-l-(--nav-item-radius) kit-focus-ring kit-focus-on-dark"
        >
          {icon}
          <span className={labelCls}>{item.label}</span>
        </button>
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${item.label}` : `Expand ${item.label}`}
          onClick={onToggle}
          className="flex items-center justify-center w-[40px] h-full shrink-0 rounded-r-(--nav-item-radius) kit-focus-ring kit-focus-on-dark"
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
        <div className="flex pt-[2px] pb-[6px]">
          <div className="w-[30px] shrink-0 flex justify-center">
            <span className="w-px bg-(--nav-border)" />
          </div>
          <div className="flex flex-col grow gap-[1px] pr-[8px]">
            {item.children.map((child) => {
              const childActive = child.key === activeChild;
              return (
                <button
                  key={child.key}
                  type="button"
                  aria-current={childActive ? "page" : undefined}
                  onClick={() => onNavigate(child.href)}
                  className={cn(
                    "flex items-center h-[34px] px-[12px] rounded-sm shrink-0 kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]",
                    childActive && "bg-(--nav-bg-active)",
                  )}
                >
                  <span
                    className={cn(
                      "font-ui inline-block text-sm/micro",
                      childActive
                        ? "font-(--weight-medium) text-(--nav-text-active)"
                        : "text-(--nav-text)",
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

export function MobileNavDrawer({
  open,
  onClose,
  activeNavKey,
  activeTabParam = null,
  onNavigate,
  brandLabel,
  brandSubLabel,
  accountName,
  accountRole,
  accountInitials,
  onAccountClick,
}: MobileNavDrawerProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const brandId = React.useId();

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

  const { mounted, phase, endExit } = useOverlayTransition(open);
  const active = mounted && phase !== "closing";

  useActiveOverlay(active);
  useScrollLock(mounted);
  useBackgroundInert(rootRef, active);
  useFocusTrap(panelRef, active);
  useEscToClose(active, onClose);

  const [host, setHost] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => setHost(document.body), []);

  if (!mounted || !host) return null;

  return createPortal(
    // Non-positioned wrapper (mirrors the kit `Drawer`) — a `position: fixed`
    // wrapper with `z-index: auto` creates a level-0 stacking context that
    // TRAPS the scrim / panel below a `PageShell` sticky toolbar (`--z-sticky`
    // = 1100). Instead the scrim (`.kit-scrim`, `fixed`, `--z-overlay`) and the
    // panel (`fixed`, `--z-drawer`) escape straight to the root context.
    <div
      ref={rootRef}
      className="[font-synthesis:none] antialiased text-caption/micro"
    >
      {/* Scrim — the shared blurred/dimmed backdrop (was `bg-black/30`). */}
      <div className="kit-scrim" data-state={phase} onClick={onClose} aria-hidden />
      {/* Drawer Menu Container — 1ZQ-0 */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={brandId}
        tabIndex={-1}
        data-state={phase}
        data-side="left"
        onTransitionEnd={(e) => {
          if (e.target === panelRef.current && phase === "closing") endExit();
        }}
        className="kit-drawer-panel fixed inset-y-0 left-0 flex flex-col w-[310px] h-full shrink-0 [box-shadow:var(--shadow-drawer)] bg-(--nav-bg) [z-index:var(--z-drawer)]"
      >
        {/* Drawer Brand Header — 1ZR-0 */}
        <div className="flex items-center justify-between pt-[24px] pb-[16px] h-[72px] shrink-0 px-[16px] border-b border-b-solid border-b-(--nav-border)">
          <div className="flex items-center gap-[10px]">
            <div
              className="w-[32px] h-[32px] flex items-center justify-center rounded-full shrink-0 bg-cover bg-position-[50%]"
              style={{ backgroundImage: "url(https://app.paper.design/file-assets/01M0EZ7TAHZM26KBMWNYT0928X/01M0SM71RCR7TRKDYY2ZD9PNTX.jpg)" }}
            />
            <div className="flex flex-col">
              <div
                id={brandId}
                className="font-ui font-(--weight-semibold) inline-block text-(--nav-text-active) text-body/sm"
              >
                {brandLabel}
              </div>
              <div className="font-ui text-micro inline-block leading-[14px] text-(--nav-text-subtle)">
                {brandSubLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex items-center justify-center w-[28px] h-[28px] rounded-sm shrink-0 bg-(--nav-bg-chip) kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]"
          >
            {ICON_CLOSE}
          </button>
        </div>

        {/* Drawer Nav Body — 202-0 */}
        <nav aria-label="All destinations" className="flex flex-col grow basis-0 py-[8px] overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi} className="flex flex-col py-[4px] px-[8px]">
              {group.label && (
                <div className="font-ui font-(--weight-semibold) inline-block pt-[6px] pb-[4px] px-[12px]">
                  <div className="inline-block font-ui text-[10px] font-(--weight-semibold) [letter-spacing:0.08em] uppercase leading-[12px] text-(--nav-text-label)">
                    {group.label}
                  </div>
                </div>
              )}
              {group.items.map((item) => (
                <DrawerNavRow
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
        </nav>

        {/* Drawer Footer — 229-0. Raw #00000026 / #FFFFFF2E → --nav-bg-avatar /
            --nav-bg-divider-strong (the codified names). */}
        <div className="flex items-center justify-between py-[14px] px-[16px] bg-(--nav-bg-avatar) border-t border-t-solid border-t-(--nav-border)">
          <div className="flex items-center gap-[10px]">
            <div className="w-[32px] h-[32px] flex items-center justify-center rounded-full shrink-0 bg-(--nav-bg-divider-strong)">
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
            className="flex items-center py-[6px] px-[10px] rounded-sm gap-[4px] bg-(--nav-bg-chip) kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]"
          >
            <span className="font-ui text-micro font-(--weight-medium) inline-block leading-[14px] text-(--nav-text-strong)">
              Sign out
            </span>
          </button>
        </div>
      </div>
    </div>,
    host,
  );
}
