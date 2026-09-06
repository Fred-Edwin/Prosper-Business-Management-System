"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutGrid, Boxes, ShoppingBag, Home, MessageSquare, Wallet } from "lucide-react";
import { StaffShell } from "@/components/shells/staff-shell";
import {
  StaffDesktopShell,
  type StaffDesktopNavItem,
} from "@/components/shells/staff-desktop-shell";
import { ToastProvider } from "@/components/kit/toast";
import type { BottomNavItem } from "@/components/kit/bottom-nav";
import { AppSessionProvider } from "@/components/layout/app-session-provider";
import { ActingAsBanner } from "@/components/layout/acting-as-banner";
import { useActingAs } from "@/app/admin/use-acting-as";
import { WorkspaceSwitcher } from "@/app/admin/workspace-switcher";

// Per-role bottom nav item sets, keyed by the role's base route. The nav-item
// definitions — including the icon JSX — live in this Client Component (not
// passed down from a Server Component) so nothing non-serialisable crosses the
// boundary. Each item carries the NEW BottomNavItem shape:
// { key, label, activeIcon, inactiveIcon } — no href, no icon component ref.
// The key doubles as the route segment under <basePath>/<key> ("hub" = the
// bare base route).
//
// EVERY key here must name a route that exists under app/<base>/, or carry an
// explicit `href` when the real route doesn't match the key. Three tabs
// silently 404'd on this rule (F2, owner report 2026-09-02): the Cashier's
// "new-order" (the route is /cashier/orders/new) and a "history" tab on both
// the Store Manager and the Canteen for a screen that was never built. The
// Cashier now carries an href; the two History tabs are gone until the screen
// exists — the hub timeline already covers recent activity.
interface StaffNavDef {
  key: string;
  label: string;
  icon: typeof LayoutGrid;
  /**
   * Route to navigate to, when it isn't `<basePath>/<key>`. Also matched as a
   * path prefix when deciding which tab is active.
   */
  href?: string;
}

export const NAV_DEFS_BY_BASE: Record<string, StaffNavDef[]> = {
  // restaurant-sales-flow.md "The screens" + artboard D8E-0: BottomNav =
  // Today · New order · Customers (home / bag / speech-bubble glyphs per the
  // artboard). First key ("today") is the bare /cashier route (C1, lands 6c);
  // "customers" is C6 (built 6a, app/cashier/customers); "new-order" is C2 (6c).
  "/cashier": [
    { key: "today", label: "Today", icon: Home },
    // The real route is /cashier/orders/new, not /cashier/new-order.
    { key: "new-order", label: "New Order", icon: ShoppingBag, href: "/cashier/orders/new" },
    { key: "customers", label: "Customers", icon: MessageSquare },
    // M3 S3: end-of-day cash/M-Pesa declaration. Route = /cashier/handover
    // (matches the key, so no explicit href — F2 guard: verified it resolves).
    { key: "handover", label: "Handover", icon: Wallet },
  ],
  "/store-manager": [
    { key: "hub", label: "Hub", icon: LayoutGrid },
    { key: "stock", label: "Stock", icon: Boxes },
  ],
  "/canteen": [
    { key: "hub", label: "Hub", icon: LayoutGrid },
    { key: "stock", label: "Stock", icon: Boxes },
    // M3 S3: end-of-day cash/M-Pesa declaration. Route = /canteen/handover.
    { key: "handover", label: "Handover", icon: Wallet },
  ],
};

function toNavItems(defs: StaffNavDef[]): BottomNavItem[] {
  return defs.map(({ key, label, icon: Icon }) => ({
    key,
    label,
    activeIcon: <Icon width={20} height={20} strokeWidth={1.5} stroke="var(--color-accent)" aria-hidden />,
    inactiveIcon: <Icon width={20} height={20} strokeWidth={1.5} stroke="var(--text-tertiary)" aria-hidden />,
  }));
}

// The desktop staff sidebar rows reuse the same per-role nav defs. Icons are
// white on the dark --nav-bg (matching admin-shell.tsx's 16px stroked glyphs);
// the shell recolours the label but leaves the icon a constant white.
function toDesktopNavItems(
  basePath: string,
  defs: StaffNavDef[],
): StaffDesktopNavItem[] {
  return defs.map(({ key, label, icon: Icon }) => ({
    key,
    label,
    href: hrefForKey(basePath, defs, key),
    icon: (
      <Icon width={16} height={16} strokeWidth={1.5} stroke="var(--nav-text-active)" aria-hidden />
    ),
  }));
}

// The nav "key" is the route segment: hub/first item = the bare base route.
// A def with an explicit `href` is matched on that path instead, so
// /cashier/orders/new lights up the "New Order" tab rather than falling
// through to the first item.
export function activeNavKeyFromPathname(basePath: string, pathname: string, defs: StaffNavDef[]): string {
  const withHref = defs.find(
    (d) => d.href && (pathname === d.href || pathname.startsWith(`${d.href}/`)),
  );
  if (withHref) return withHref.key;

  const segment = pathname.replace(new RegExp(`^${basePath}/?`), "").split("/")[0];
  if (!segment) return defs[0]?.key ?? "";
  const match = defs.find((d) => d.key === segment);
  return match?.key ?? defs[0]?.key ?? "";
}

// An explicit `href` wins; otherwise "hub" / the first item maps to the bare
// base route and every other key is <basePath>/<key>.
export function hrefForKey(basePath: string, defs: StaffNavDef[], key: string): string {
  const def = defs.find((d) => d.key === key);
  if (def?.href) return def.href;
  if (key === defs[0]?.key) return basePath;
  return `${basePath}/${key}`;
}

export function StaffShellClient({
  basePath,
  roleLabel,
  locationLabel,
  accountInitials,
  actingLocationName,
  children,
}: {
  basePath: string;
  roleLabel: string;
  locationLabel: string;
  accountInitials: string;
  /**
   * When an Admin is acting as this role, the server-resolved name of the
   * location she picked — for the acting-as banner's first paint.
   */
  actingLocationName?: string | null;
  children: React.ReactNode;
}) {
  return (
    // <AppSessionProvider> is needed for the acting-as banner + switcher's
    // useSession(); it's the only client session consumer in the staff tree.
    <AppSessionProvider>
      {/* Session 12 (ADR-43): the staff route tree gets bottom-center toasts —
          the mirror of the admin tree's top-right. Every staff issue /
          production / transfer / non-sale / receipt / accept success fires
          one via useToast(). */}
      <ToastProvider placement="bottom-center">
        <StaffChrome
          basePath={basePath}
          roleLabel={roleLabel}
          locationLabel={locationLabel}
          accountInitials={accountInitials}
          actingLocationName={actingLocationName}
        >
          {children}
        </StaffChrome>
      </ToastProvider>
    </AppSessionProvider>
  );
}

/**
 * Inside <AppSessionProvider> so it can read `useActingAs()`. Lays the
 * full-width acting-as banner above the shell (Paper M7 — the banner spans
 * the whole viewport, above all chrome), and — while an Admin is acting as
 * this role — wires the header hamburger to the workspace switcher.
 */
function StaffChrome({
  basePath,
  roleLabel,
  locationLabel,
  accountInitials,
  actingLocationName,
  children,
}: {
  basePath: string;
  roleLabel: string;
  locationLabel: string;
  accountInitials: string;
  actingLocationName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const defs = NAV_DEFS_BY_BASE[basePath] ?? [];
  const navItems = React.useMemo(() => toNavItems(defs), [defs]);
  const desktopNavItems = React.useMemo(
    () => toDesktopNavItems(basePath, defs),
    [basePath, defs],
  );

  const { actingAs } = useActingAs();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const activeNavKey = activeNavKeyFromPathname(basePath, pathname, defs);
  const navigate = React.useCallback(
    (key: string) => router.push(hrefForKey(basePath, defs, key)),
    [router, basePath, defs],
  );
  const signOutFn = React.useCallback(
    () => signOut({ callbackUrl: "/login" }),
    [],
  );

  // The mobile-first bottom-nav shell — always for a real staff user (actingAs
  // null), and the < md half of the responsive pair while an Admin is acting-as.
  const mobileShell = (
    <StaffShell
      roleLabel={roleLabel}
      locationLabel={locationLabel}
      accountInitials={accountInitials}
      navItems={navItems}
      activeNavKey={activeNavKey}
      onNavigate={navigate}
      onAccountClick={signOutFn}
      onMenuClick={actingAs ? () => setMenuOpen(true) : undefined}
    >
      {children}
    </StaffShell>
  );

  // A real staff user always gets the mobile-first shell (bottom nav), at every
  // width — staff are a phone-first audience. The desktop sidebar exists only
  // for the Admin's benefit while she drives staff screens on her laptop
  // (role-switching Session 3, owner 2026-09-06); it keys off `actingAs`, not
  // the viewport.
  if (!actingAs) {
    return (
      <div className="flex flex-col h-screen w-full">
        <div className="flex-1 min-h-0">{mobileShell}</div>
      </div>
    );
  }

  // Acting-as: the responsive two-shell pair, mirroring
  // app/admin/admin-shell-client.tsx — each rendered and toggled with
  // `hidden md:*`. The full-width <ActingAsBanner> spans above both (the shells
  // are `h-full`, not `h-screen`, so they fill the space under it). `children`
  // mounts in both subtrees; the staff screens are client subtrees with no
  // server-only mount effects, so this double-mount is an accepted cost (same
  // as the admin shell). Banner density is "mobile" ("Exit") below md and
  // "desktop" ("Exit to Admin") at md+ — one banner, density picked from a
  // matchMedia state, like admin-shell-client.tsx's isDesktop.
  return (
    <ActingAsShellPair
      banner={<ActingAsBanner locationName={actingLocationName} density="mobile" />}
      desktopBanner={
        <ActingAsBanner locationName={actingLocationName} density="desktop" />
      }
      desktopShell={
        <StaffDesktopShell
          roleLabel={roleLabel}
          accountInitials={accountInitials}
          navItems={desktopNavItems}
          activeNavKey={activeNavKey}
          onNavigate={navigate}
          onAccountClick={signOutFn}
        >
          {children}
        </StaffDesktopShell>
      }
      mobileShell={mobileShell}
      menu={
        <WorkspaceSwitcher open={menuOpen} onClose={() => setMenuOpen(false)} />
      }
    />
  );
}

/**
 * The acting-as responsive pair: full-width banner above, then the desktop
 * sidebar shell (md+) and the mobile bottom-nav shell (< md), each toggled
 * with `hidden md:*`. The banner's density follows the same `md` breakpoint,
 * so its label reads "Exit to Admin" on the desktop mount and "Exit" on the
 * mobile one — rendered once per side rather than measured, matching how
 * AdminShellClient renders one banner and flips a single density.
 */
function ActingAsShellPair({
  banner,
  desktopBanner,
  desktopShell,
  mobileShell,
  menu,
}: {
  banner: React.ReactNode;
  desktopBanner: React.ReactNode;
  desktopShell: React.ReactNode;
  mobileShell: React.ReactNode;
  menu: React.ReactNode;
}) {
  return (
    <>
      <div className="hidden md:flex md:flex-col h-screen w-full">
        {desktopBanner}
        <div className="flex-1 min-h-0">{desktopShell}</div>
      </div>
      <div className="flex flex-col md:hidden h-screen w-full">
        {banner}
        <div className="flex-1 min-h-0">{mobileShell}</div>
      </div>
      {menu}
    </>
  );
}
