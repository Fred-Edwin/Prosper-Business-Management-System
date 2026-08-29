// Verbatim transcription of Paper artboard
// "Mobile Shell — Sidebar Drawer Open (Admin & Staff)" (1ZP-0) — the shared
// drawer-open panel (1ZQ-0) + its backdrop dismiss area (22I-0).
//
// The outer 390×844 artboard frame is dropped: the drawer is a fixed overlay
// filling the viewport (fixed inset-0), a w-[310px] panel + a flex-1 backdrop.
//
// Panel structure from the artboard:
//   Brand header (1ZR-0): h-[72px], logo + name/subtitle stack + close (×)
//   Nav body    (202-0): grouped 11-item nav, h-[38px] rows, px-[12px],
//                        gap-[10px], active row = --nav-bg-active + a 3px
//                        left marker
//   Footer      (229-0): avatar + name/role + Sign out chip
//
// The 11-item nav list + its grouping is transcribed exactly as 1ZP-0 emits it
// (note: the artboard places "Customers" just above the "People & Money" group
// header — kept verbatim). §9 interaction states come from globals.css.
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

interface DrawerNavItemDef {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface DrawerNavGroupDef {
  label?: string;
  items: DrawerNavItemDef[];
}

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
const ICON_HANDOVERS = (
  <Svg>
    <polyline points="17 1 21 5 17 9" {...SW} />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" {...SW} />
    <polyline points="7 23 3 19 7 15" {...SW} />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" {...SW} />
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
const ICON_REPORTS = (
  <Svg>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" {...SW} />
  </Svg>
);
const ICON_AUDIT = (
  <Svg>
    <circle cx="12" cy="12" r="10" {...SW} />
    <polyline points="12 6 12 12 16 14" {...SW} />
  </Svg>
);

// Group layout transcribed verbatim from 1ZP-0 (Customers sits in the same
// block as the Team/People headers exactly as the artboard draws it).
const NAV_GROUPS: DrawerNavGroupDef[] = [
  { items: [{ key: "dashboard", label: "Dashboard", href: "/admin", icon: ICON_DASHBOARD }] },
  {
    label: "Operations",
    items: [
      { key: "catalog", label: "Catalog", href: "/admin/catalog", icon: ICON_CATALOG },
      { key: "stock", label: "Ledger", href: "/admin/stock", icon: ICON_STOCK },
      { key: "sales", label: "Sales", href: "/admin/sales", icon: ICON_SALES },
      { key: "handovers", label: "Handovers", href: "/admin/handovers", icon: ICON_HANDOVERS },
    ],
  },
  {
    label: "People & Money",
    items: [
      { key: "customers", label: "Customers", href: "/admin/customers", icon: ICON_CUSTOMERS },
      { key: "financials", label: "Financials", href: "/admin/financials", icon: ICON_FINANCIALS },
    ],
  },
  {
    label: "Team",
    items: [
      { key: "staff", label: "Staff", href: "/admin/staff", icon: ICON_STAFF },
      { key: "assets", label: "Assets", href: "/admin/assets", icon: ICON_ASSETS },
    ],
  },
  {
    label: "Reporting",
    items: [
      { key: "reports", label: "Reports", href: "/admin/reports", icon: ICON_REPORTS },
      { key: "audit-trail", label: "Audit trail", href: "/admin/audit-trail", icon: ICON_AUDIT },
    ],
  },
];

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
  activeNavKey,
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
    <div
      ref={rootRef}
      className="[font-synthesis:none] fixed inset-0 flex antialiased text-caption/micro"
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
        className="kit-drawer-panel relative flex flex-col w-[310px] h-full shrink-0 [box-shadow:var(--shadow-drawer)] bg-(--nav-bg) [z-index:var(--z-drawer)]"
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
              {group.items.map((item) => {
                const active = item.key === activeNavKey;
                return (
                  <button
                    key={item.key}
                    type="button"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigate(item.href)}
                    className={cn(
                      "flex items-center h-[38px] px-[12px] rounded-(--nav-item-radius) gap-[10px] relative shrink-0 kit-interactive kit-focus-ring kit-focus-on-dark [--kit-hover-bg:var(--nav-bg-hover)]",
                      active && "bg-(--nav-bg-active)",
                    )}
                  >
                    {item.icon}
                    <span
                      className={cn(
                        "font-ui inline-block text-body/sm",
                        active ? "font-(--weight-medium) text-(--nav-text-active)" : "text-(--nav-text)",
                      )}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <span className="absolute left-[0px] top-[6px] bottom-[6px] w-[3px] rounded-tr-[2px] rounded-br-[2px] bg-(--nav-text-active)" />
                    )}
                  </button>
                );
              })}
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
