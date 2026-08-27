// M1-F2 Bulk Opening Stock Grid — the real Admin route. Mounts inside
// app/admin/layout.tsx's <AdminShell>; this page renders the approved grid
// content region only. The interactive container lives in ./opening-client.tsx.
//
// The standalone design-export skeleton (with its own sidebar) stays at
// /design-preview/bulk-opening-stock-grid as the permanent visual-regression
// fixture — see docs/design/screens/bulk-opening-stock-grid/.

import { OpeningClient } from "./opening-client";

export default function AdminStockOpeningPage() {
  return <OpeningClient />;
}
