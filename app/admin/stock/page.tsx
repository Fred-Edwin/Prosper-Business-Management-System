// M1-F2 Stock & Reconciliation — the real Admin route. Mounts inside
// app/admin/layout.tsx's <AdminShell> (which supplies the sidebar + toolbar
// + the Maximize/collapse toggle, ADR-36b); this page renders the approved
// ledger content region only. The interactive container lives in
// ./stock-client.tsx.
// Visual acceptance target: the approved Paper artboards for this screen.

import { StockClient } from "./stock-client";

export default function AdminStockPage() {
  return <StockClient />;
}
