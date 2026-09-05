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
  // `key` remounts the client when the sidebar deep-links a different tab.
  return <SalesClient key={initialTab} initialTab={initialTab} />;
}
