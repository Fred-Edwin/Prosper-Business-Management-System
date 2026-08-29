// M1 Financials (F2 slice) — the real Admin route. Mounts inside
// app/admin/layout.tsx's <AdminShell>; renders the approved content region
// only. The interactive container lives in ./financials-client.tsx.
//
// M1 cut (milestone-1-plan §2 / ADR-36): stock-purchase table +
// reconciliation Match cards + record-payment drawer. The KPI stat strip is
// kept as markup but unwired (no F2 data source — F3 MoneyMovement ledger).
// Visual acceptance target: the approved Paper artboards for this screen.

import { FinancialsClient } from "./financials-client";

export default function AdminFinancialsPage() {
  return <FinancialsClient />;
}
