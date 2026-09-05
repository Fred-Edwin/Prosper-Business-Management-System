// M1-F1 Catalog & Locations — the real Admin route. Mounts inside
// app/admin/layout.tsx's <AdminShell> (which supplies the sidebar + toolbar);
// this page renders the approved catalog content region only. The interactive
// container lives in ./catalog-client.tsx.
// Visual acceptance target: the approved Paper artboards for this screen.
//
// M6: `?tab=` deep-links a tab (products | locations) so the sidebar's
// Catalog sub-links land on the right tab.

import { CatalogClient, type CatalogTabKey } from "./catalog-client";

const TABS = ["products", "locations"] as const;

export default async function AdminCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: CatalogTabKey = (TABS as readonly string[]).includes(
    tab ?? "",
  )
    ? (tab as CatalogTabKey)
    : "products";
  // `key` remounts the client when the sidebar deep-links a different tab.
  return <CatalogClient key={initialTab} initialTab={initialTab} />;
}
