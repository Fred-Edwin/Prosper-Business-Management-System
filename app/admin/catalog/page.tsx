// M1-F1 Catalog & Locations — the real Admin route. Mounts inside
// app/admin/layout.tsx's <AdminShell> (which supplies the sidebar + toolbar);
// this page renders the approved catalog content region only. The interactive
// container lives in ./catalog-client.tsx.
//
// The standalone design-export skeletons (with their own sidebars) stay at
// /design-preview/admin-catalog-product-catalog (+ mobile, drawer, dialog) as
// the permanent visual-regression fixtures — see docs/design/screens/*.

import { CatalogClient } from "./catalog-client";

export default function AdminCatalogPage() {
  return <CatalogClient />;
}
