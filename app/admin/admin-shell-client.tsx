"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AdminShell } from "@/components/shells/admin-shell";

// Mirrors the route segment used under /admin/<segment> for each nav key
// in components/shells/admin-shell.tsx's NAV_GROUPS. "dashboard" is the
// bare /admin root and has no segment of its own.
function activeNavKeyFromPathname(pathname: string): string {
  const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0];
  return segment || "dashboard";
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
  );
}
