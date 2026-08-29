// M1-F1 Catalog & Locations — the real Admin route. Mounts inside
// app/admin/layout.tsx's <AdminShell> (which supplies the sidebar + toolbar);
// this page renders the approved catalog content region only. The interactive
// container lives in ./catalog-client.tsx.
// Visual acceptance target: the approved Paper artboards for this screen.

import { CatalogClient } from "./catalog-client";

export default function AdminCatalogPage() {
  return <CatalogClient />;
}
