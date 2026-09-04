// The Admin Dashboard (`/admin`). M5 S14 gave it its full morning-triage
// composition — five bands built from the frozen kit against
// `GET /api/admin/dashboard` (see docs/design/flows/dashboard-screen.md).
// The Day Close card (M3 S1 / ADR-52) still lives here, now as Band 5.
// The shell (nav, top bar, maximize toggle) comes from app/admin/layout.tsx.
import { DashboardClient } from "./dashboard-client";

export default function AdminHomePage() {
  return <DashboardClient />;
}
