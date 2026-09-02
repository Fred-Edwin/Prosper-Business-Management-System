// M1 Financials (F2 slice) + M3 Handovers reconciliation. Mounts inside
// app/admin/layout.tsx's <AdminShell>; renders the approved content region
// only. The interactive container lives in ./financials-client.tsx.
//
// M3 S3: one screen, one toolbar business-date picker, and one inner tab
// row over transaction types — Stock Purchases / Deliveries / Handovers.
// `?tab=` (`purchases` | `deliveries` | `handovers`) deep-links a tab so
// the Handovers nav item and a refresh land in the right place.

import type { Metadata } from "next";
import { FinancialsClient, type FinancialsTabKey } from "./financials-client";

export const metadata: Metadata = {
  title: "Financials — Prosper Admin",
  description:
    "Stock purchases, deliveries and end-of-day cash / M-Pesa handover reconciliation, by business day.",
};

const TABS = ["purchases", "deliveries", "handovers"] as const;

export default async function AdminFinancialsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: FinancialsTabKey = (TABS as readonly string[]).includes(
    tab ?? "",
  )
    ? (tab as FinancialsTabKey)
    : "purchases";
  return <FinancialsClient initialTab={initialTab} />;
}
