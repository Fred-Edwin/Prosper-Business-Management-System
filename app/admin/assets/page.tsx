// M1-F3 Assets — the real Admin route. Mounts inside app/admin/layout.tsx's
// <AdminShell> (which supplies the sidebar + the Assets nav entry); this
// page renders the register content region only. The interactive container
// lives in ./assets-client.tsx.
//
// Per ADR-44 / ADR-45 the pre-kit asset artboards are superseded — the
// proven kit is the visual acceptance target for this feature.
//
// M6: `?tab=` deep-links a tab (active | archived) so the sidebar's Assets
// sub-links land on the right tab.

import { AssetsClient, type AssetsTabKey } from "./assets-client";

const TABS = ["active", "archived"] as const;

export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const initialTab: AssetsTabKey = (TABS as readonly string[]).includes(tab ?? "")
    ? (tab as AssetsTabKey)
    : "active";
  // `key` remounts the client when the sidebar deep-links a different tab.
  return <AssetsClient key={initialTab} initialTab={initialTab} />;
}
