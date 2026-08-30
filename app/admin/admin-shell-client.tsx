"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AdminShell, ADMIN_NAV_ITEMS } from "@/components/shells/admin-shell";
import { ToastProvider } from "@/components/kit/toast";

// Resolve the active nav key by longest matching href prefix — most items sit
// at /admin/<key>, but a few (e.g. Derived sales → /admin/canteen/derived-sales)
// don't, so a bare first-segment match isn't enough. "/admin" itself → dashboard.
function activeNavKeyFromPathname(pathname: string): string {
  let best = "dashboard";
  let bestLen = -1;
  for (const item of ADMIN_NAV_ITEMS) {
    if (item.href === "/admin") continue;
    if (
      (pathname === item.href || pathname.startsWith(item.href + "/")) &&
      item.href.length > bestLen
    ) {
      best = item.key;
      bestLen = item.href.length;
    }
  }
  return best;
}

// ADR-36b (resolved 2026-08-27, owner): the Ledger's "Maximize" toggles
// AdminShell's `collapsed` prop, and that collapsed state PERSISTS APP-WIDE
// — navigating away from the ledger keeps the icon rail collapsed until the
// user expands it again. State lives here (the shell client) and is mirrored
// to localStorage so it also survives a full reload. Reads/writes are
// wrapped so a private window / disabled storage degrades to "expanded".
const COLLAPSE_KEY = "prosper.admin.sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(next: boolean): void {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
  } catch {
    // no-op: storage unavailable (private window, blocked site data)
  }
}

export function AdminShellClient({
  accountInitials,
  children,
}: {
  accountInitials: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Start expanded for SSR/first paint parity, then hydrate from storage.
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      writeCollapsed(next);
      return next;
    });
  }, []);

  return (
    // Session 11: the admin route tree gets top-right toasts (ADR-43). Every
    // admin save / record / correction success fires one via useToast(). The
    // staff tree gets placement="bottom-center" in Session 12, not here.
    <ToastProvider placement="top-right">
      <AdminShell
        activeNavKey={activeNavKeyFromPathname(pathname)}
        onNavigate={(href: string) => router.push(href)}
        toolbarTitle="Prosper"
        accountName="Admin"
        accountRole="Admin"
        accountInitials={accountInitials}
        onAccountClick={() => signOut({ callbackUrl: "/login" })}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      >
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
