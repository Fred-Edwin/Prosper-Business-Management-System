// M1-F2 Bulk Opening Stock Grid — the real Admin route. Mounts inside
// app/admin/layout.tsx's <AdminShell>; this page renders the approved grid
// content region only. The interactive container lives in ./opening-client.tsx.
// Visual acceptance target: the approved Paper artboard for this screen.

import { OpeningClient } from "./opening-client";

export default function AdminStockOpeningPage() {
  return <OpeningClient />;
}
