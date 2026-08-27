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

export function AdminShellClient({
  accountInitials,
  children,
}: {
  accountInitials: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = React.useState(false);

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
      onToggleCollapsed={() => setCollapsed((c) => !c)}
    >
      {children}
    </AdminShell>
  );
}
