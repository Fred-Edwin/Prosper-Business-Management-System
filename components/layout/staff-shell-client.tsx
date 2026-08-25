"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutGrid, Boxes, History, ShoppingCart } from "lucide-react";
import { StaffShell } from "@/components/shells/staff-shell";
import type { BottomNavItem } from "@/components/kit/bottom-nav";

// Per-role bottom nav item sets, keyed by the role's base route. Only
// routes that actually exist under app/<base>/ so far are wired here —
// Stock/History routes for store-manager and canteen match the
// Store Manager Mobile Hub / Canteen Mobile Operations Hub screens
// exported in docs/design/screens/*, per their shared Hub/Stock/History
// Bottom Nav pattern (design-principles.md §7, "Bottom Nav" kit entry).
const NAV_ITEMS_BY_BASE: Record<string, BottomNavItem[]> = {
  "/cashier": [
    { key: "new-order", label: "New Order", icon: ShoppingCart, href: "/cashier" },
    { key: "history", label: "History", icon: History, href: "/cashier/history" },
  ],
  "/store-manager": [
    { key: "hub", label: "Hub", icon: LayoutGrid, href: "/store-manager" },
    { key: "stock", label: "Stock", icon: Boxes, href: "/store-manager/stock" },
    { key: "history", label: "History", icon: History, href: "/store-manager/history" },
  ],
  "/canteen": [
    { key: "hub", label: "Hub", icon: LayoutGrid, href: "/canteen" },
    { key: "stock", label: "Stock", icon: Boxes, href: "/canteen/stock" },
    { key: "history", label: "History", icon: History, href: "/canteen/history" },
  ],
};

function activeNavKeyFromPathname(basePath: string, pathname: string, items: BottomNavItem[]): string {
  const segment = pathname.replace(new RegExp(`^${basePath}/?`), "").split("/")[0];
  if (!segment) return items[0]?.key ?? "";
  const match = items.find((item) => item.href === `${basePath}/${segment}`);
  return match?.key ?? items[0]?.key ?? "";
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
  const navItems = NAV_ITEMS_BY_BASE[basePath] ?? [];

  return (
    <StaffShell
      roleLabel={roleLabel}
      locationLabel={locationLabel}
      accountInitials={accountInitials}
      navItems={navItems}
      activeNavKey={activeNavKeyFromPathname(basePath, pathname, navItems)}
      onNavigate={(href) => router.push(href)}
      onAccountClick={() => signOut({ callbackUrl: "/login" })}
    >
      {children}
    </StaffShell>
  );
}
