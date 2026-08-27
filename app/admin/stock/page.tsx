// M1-F2 Stock & Reconciliation — the real Admin route. Mounts inside
// app/admin/layout.tsx's <AdminShell> (which supplies the sidebar + toolbar
// + the Maximize/collapse toggle, ADR-36b); this page renders the approved
// ledger content region only. The interactive container lives in
// ./stock-client.tsx.
//
// The standalone design-export skeletons (with their own sidebars) stay at
// /design-preview/admin-stock-ledger-full-width (+ -sidebar-collapsed,
// -drawer-open, admin-stock-mobile) as the permanent visual-regression
// fixtures — see docs/design/screens/*.

import { StockClient } from "./stock-client";

export default function AdminStockPage() {
  return <StockClient />;
}
