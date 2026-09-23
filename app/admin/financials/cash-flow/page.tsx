// Cash Flow — client feedback item #7. A standalone report (own page, own
// date-range control, own KPI strip) so it doesn't compete for space on
// the already six-tab-wide /admin/financials page. Mounts inside
// app/admin/layout.tsx's <AdminShell>; the interactive container lives in
// ./cash-flow-client.tsx. Same page-per-report pattern as
// app/admin/financials/opening.

import type { Metadata } from "next";
import { CashFlowClient } from "./cash-flow-client";

export const metadata: Metadata = {
  title: "Cash Flow — Prosper Admin",
  description:
    "Every recorded money movement, unified and chronological across Cash and M-Pesa/Bank, with a running balance.",
};

export default function AdminCashFlowPage() {
  return <CashFlowClient />;
}
