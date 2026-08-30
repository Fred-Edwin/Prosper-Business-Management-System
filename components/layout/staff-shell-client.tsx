"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutGrid, Boxes, History, ShoppingBag, Home, MessageSquare } from "lucide-react";
import { StaffShell } from "@/components/shells/staff-shell";
import { ToastProvider } from "@/components/kit/toast";
import type { BottomNavItem } from "@/components/kit/bottom-nav";

// Per-role bottom nav item sets, keyed by the role's base route. The nav-item
// definitions — including the icon JSX — live in this Client Component (not
// passed down from a Server Component) so nothing non-serialisable crosses the
// boundary. Each item carries the NEW BottomNavItem shape:
// { key, label, activeIcon, inactiveIcon } — no href, no icon component ref.
// The key doubles as the route segment under <basePath>/<key> ("hub" = the
// bare base route). Only routes that exist under app/<base>/ so far are wired.
interface StaffNavDef {
  key: string;
  label: string;
  icon: typeof LayoutGrid;
}

const NAV_DEFS_BY_BASE: Record<string, StaffNavDef[]> = {
  // restaurant-sales-flow.md "The screens" + artboard D8E-0: BottomNav =
  // Today · New order · Customers (home / bag / speech-bubble glyphs per the
  // artboard). First key ("today") is the bare /cashier route (C1, lands 6c);
  // "customers" is C6 (built 6a, app/cashier/customers); "new-order" is C2 (6c).
  "/cashier": [
    { key: "today", label: "Today", icon: Home },
    { key: "new-order", label: "New Order", icon: ShoppingBag },
    { key: "customers", label: "Customers", icon: MessageSquare },
  ],
  "/store-manager": [
    { key: "hub", label: "Hub", icon: LayoutGrid },
    { key: "stock", label: "Stock", icon: Boxes },
    { key: "history", label: "History", icon: History },
  ],
  "/canteen": [
    { key: "hub", label: "Hub", icon: LayoutGrid },
    { key: "stock", label: "Stock", icon: Boxes },
    { key: "history", label: "History", icon: History },
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
function activeNavKeyFromPathname(basePath: string, pathname: string, defs: StaffNavDef[]): string {
  const segment = pathname.replace(new RegExp(`^${basePath}/?`), "").split("/")[0];
  if (!segment) return defs[0]?.key ?? "";
  const match = defs.find((d) => d.key === segment);
  return match?.key ?? defs[0]?.key ?? "";
}

// "hub" / the first item maps to the bare base route; every other key is
// <basePath>/<key>.
function hrefForKey(basePath: string, defs: StaffNavDef[], key: string): string {
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
