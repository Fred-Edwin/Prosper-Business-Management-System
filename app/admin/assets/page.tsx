// M1-F3 Assets — the real Admin route. Mounts inside app/admin/layout.tsx's
// <AdminShell> (which supplies the sidebar + the Assets nav entry); this
// page renders the register content region only. The interactive container
// lives in ./assets-client.tsx.
//
// Per ADR-44 / ADR-45 the pre-kit asset artboards are superseded — the
// proven kit is the visual acceptance target for this feature.

import { AssetsClient } from "./assets-client";

export default function AdminAssetsPage() {
  return <AssetsClient />;
}
