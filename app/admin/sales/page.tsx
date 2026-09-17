import type { Metadata } from "next";
import { SalesClient, type SalesTabKey } from "./sales-client";

export const metadata: Metadata = {
  title: "Sales — Prosper Admin",
  description:
    "Restaurant orders and Canteen derived sales — view, filter, and record corrections.",
};

// M2 3a: the merged Sales screen. Two tabs — Restaurant Orders (A3) and
// Canteen Derived (A4) — under one route. `?tab=derived` deep-links the
// second tab so the nav link and a refresh land in the right place.
export default async function AdminSalesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: SalesTabKey = tab === "derived" ? "derived" : "orders";
  // No `key` here (was `key={initialTab}`) — the KPI strip's date range now
  // lives on `SalesClient`, shared by both tabs (2026-09-17). Remounting on
  // every tab switch (including the sidebar's own `?tab=derived` link,
  // which hits this same route) silently reset that range back to "Today"
  // each time. `SalesClient` syncs its active tab from `initialTab` via an
  // effect instead, so the component — and the range — survives a tab
  // switch from either entry point.
  return <SalesClient initialTab={initialTab} />;
}
