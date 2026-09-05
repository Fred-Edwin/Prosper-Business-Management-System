// M4 S9B — /admin/staff. Mounts inside app/admin/layout.tsx's <AdminShell>;
// renders the content region only (ADR-56 header via <AdminPageHeader> in
// the client). `?tab=` deep-links a tab (roster | attendance | pay).

import type { Metadata } from "next";
import { StaffClient, type StaffTabKey } from "./staff-client";

export const metadata: Metadata = {
  title: "Staff & Pay — Prosper Admin",
  description:
    "Team roster with logins, daily attendance, and monthly pay — advances, deductions and payouts posted to the ledger.",
};

const TABS = ["roster", "attendance", "pay"] as const;

export default async function AdminStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: StaffTabKey = (TABS as readonly string[]).includes(tab ?? "")
    ? (tab as StaffTabKey)
    : "roster";
  // `key` remounts the client when the sidebar deep-links a different tab.
  return <StaffClient key={initialTab} initialTab={initialTab} />;
}
