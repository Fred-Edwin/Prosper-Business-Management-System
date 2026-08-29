// M1-F3 Assets — the real Admin route. Mounts inside app/admin/layout.tsx's
// <AdminShell> (which supplies the sidebar + the Assets nav entry); this
// page renders the register content region only. The interactive container
// lives in ./assets-client.tsx.
//
// The standalone design-export skeletons (with their own sidebars) stay at
// /design-preview/admin-assets-register (+ asset-drawer, asset-delete-dialog)
// as the permanent visual-regression fixtures — see docs/design/screens/*.
// Per ADR-44 / ADR-45 those artboards are superseded by the proven kit as
// the visual acceptance target for this feature.

import { AssetsClient } from "./assets-client";

export default function AdminAssetsPage() {
  return <AssetsClient />;
}
