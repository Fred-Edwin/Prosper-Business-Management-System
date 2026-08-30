// C1 — Cashier Today. The staff shell (header, bottom nav) comes from
// `app/cashier/layout.tsx`; this page is the scrolling content + a
// page-level sticky "New order" bar (the `flow-scaffold.tsx` pattern —
// the shell's optional `stickyActionBar` slot isn't wired for the hub
// routes). Composed from the kit: <EmptyState>, <StatusChip>, a per-row
// list. Visual target: `BVG-0` / `BYQ-0` / `C0Z-0` / `C38-0` (Paper).
import { CashierTodayClient } from "./cashier-today-client";

export default function CashierHomePage() {
  return <CashierTodayClient />;
}
