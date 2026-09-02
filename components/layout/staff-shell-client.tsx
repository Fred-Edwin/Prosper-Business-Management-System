"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutGrid, Boxes, ShoppingBag, Home, MessageSquare, Wallet } from "lucide-react";
import { StaffShell } from "@/components/shells/staff-shell";
import { ToastProvider } from "@/components/kit/toast";
import type { BottomNavItem } from "@/components/kit/bottom-nav";

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
  children,
}: {
  basePath: string;
  roleLabel: string;
  locationLabel: string;
  accountInitials: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const defs = NAV_DEFS_BY_BASE[basePath] ?? [];
  const navItems = React.useMemo(() => toNavItems(defs), [defs]);

  return (
    // Session 12 (ADR-43): the staff route tree gets bottom-center toasts —
    // the mirror of the admin tree's top-right (app/admin/admin-shell-client.tsx).
    // Every staff issue / production / transfer / non-sale / receipt / accept
    // success fires one via useToast().
    <ToastProvider placement="bottom-center">
      <StaffShell
        roleLabel={roleLabel}
        locationLabel={locationLabel}
        accountInitials={accountInitials}
        navItems={navItems}
        activeNavKey={activeNavKeyFromPathname(basePath, pathname, defs)}
        onNavigate={(key: string) => router.push(hrefForKey(basePath, defs, key))}
        onAccountClick={() => signOut({ callbackUrl: "/login" })}
      >
        {children}
      </StaffShell>
    </ToastProvider>
  );
}
