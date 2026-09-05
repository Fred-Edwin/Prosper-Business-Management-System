// ADR-70 — the Admin states the business's Day-1 cash / M-Pesa position.
// Mounts inside app/admin/layout.tsx's <AdminShell>; renders the content
// region only. The interactive container lives in
// ./opening-balance-client.tsx.
//
// The money twin of /admin/stock/opening: opening stock says what the
// business HAS, this says what it is WORTH in cash. Both are pinned to the
// same Day 1 (`resolveOpeningDay`).

import type { Metadata } from "next";
import { OpeningBalanceClient } from "./opening-balance-client";

export const metadata: Metadata = {
  title: "Opening Balances — Prosper Admin",
  description:
    "The cash at hand and M-Pesa / bank balance the business started with on its first day.",
};

export default function AdminOpeningBalancePage() {
  return <OpeningBalanceClient />;
}
