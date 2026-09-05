"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { AdminShell, ADMIN_NAV_ITEMS } from "@/components/shells/admin-shell";
import { MobileShellAdmin } from "@/components/shells/mobile-shell-admin";
import {
  AdminToolbarProvider,
  AdminShellVisibility,
} from "@/components/shells/admin-toolbar-context";
import { ToastProvider } from "@/components/kit/toast";

// Resolve the active nav key by longest matching href prefix — items sit at
// /admin/<key> and a nested route still lights its top-level item, so a bare
// first-segment match isn't enough. "/admin" itself → dashboard.
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

  // M6: several sections are one route with an inner tab row, and the sidebar
  // accordion lights the active sub-item from the `?tab=` value. The layout
  // wraps this client in <Suspense> so useSearchParams() is allowed here.
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  // Start expanded for SSR/first paint parity, then hydrate from storage.
  const [collapsed, setCollapsed] = React.useState(false);
  React.useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  // `children` mounts twice below (desktop shell + mobile shell, picked by
  // `hidden md:*` CSS) but both share one AdminToolbarProvider. Track which
  // one is actually visible via the same `md` breakpoint (768px) so each
  // mount's <AdminPageHeader> (see admin-toolbar-context.tsx) knows whether
  // it's allowed to publish its header content — otherwise the header can
  // end up bound to the hidden mount's state. Defaults to desktop for
  // SSR/first-paint parity with the `collapsed` state above.
  const [isDesktop, setIsDesktop] = React.useState(true);
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  const toggleCollapsed = React.useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      writeCollapsed(next);
      return next;
    });
  }, []);

  const activeNavKey = activeNavKeyFromPathname(pathname);
  const navigate = React.useCallback(
    (href: string) => router.push(href),
    [router],
  );
  const handleAccountClick = React.useCallback(
    () => signOut({ callbackUrl: "/login" }),
    [],
  );

  return (
    // Session 11: the admin route tree gets top-right toasts (ADR-43). Every
    // admin save / record / correction success fires one via useToast(). The
    // staff tree gets placement="bottom-center" in Session 12, not here.
    <ToastProvider placement="top-right">
      {/* ADR-56: one header row per admin screen. The page publishes its title +
          actions through <AdminToolbarProvider>; each shell renders them in its
          single header row alongside the account avatar. Wraps BOTH shells and
          `children` so the provider sits above the shell's header row and the
          page subtree alike. */}
      <AdminToolbarProvider>
        {/* M2 6b: two-shell responsive switch. The desktop sidebar shell and the
            mobile hamburger + MobileNavDrawer shell are BOTH real, verified
            layouts (Paper 649-0/67T-0 and 6B1-0/1ZP-0). Rather than merge two
            different box models into one tree, render each and toggle with the
            same `hidden md:*` pattern the screens use — `children` renders in
            both (a client subtree, no server-only effects; the hidden shell's
            hooks still run — an accepted cost). */}
        <div className="hidden md:block">
          <AdminShell
            activeNavKey={activeNavKey}
            activeTabParam={tabParam}
            onNavigate={navigate}
            accountName="Admin"
            accountRole="Admin"
            accountInitials={accountInitials}
            onAccountClick={handleAccountClick}
            collapsed={collapsed}
            onToggleCollapsed={toggleCollapsed}
          >
            <AdminShellVisibility visible={isDesktop}>
              {children}
            </AdminShellVisibility>
          </AdminShell>
        </div>
        <div className="md:hidden">
          <MobileShellAdmin
            activeNavKey={activeNavKey}
            activeTabParam={tabParam}
            onNavigate={navigate}
            brandLabel="Prosper"
            brandSubLabel="Admin"
            accountName="Admin"
            accountRole="Admin"
            accountInitials={accountInitials}
            onAccountClick={handleAccountClick}
          >
            <AdminShellVisibility visible={!isDesktop}>
              {children}
            </AdminShellVisibility>
          </MobileShellAdmin>
        </div>
      </AdminToolbarProvider>
    </ToastProvider>
  );
}
