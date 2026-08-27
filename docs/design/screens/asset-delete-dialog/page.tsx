// Screen-state skeleton for the Paper artboard "Asset Delete Dialog" (8IV-0). The artboard is the
// kit "Friction Delete Dialog" (6OE-0) with the ADR-36c per-entity props: "Keep Asset" /
// "Permanently Delete Asset" labels, asset-specific title + body copy, and no "Archive instead"
// link (showArchiveLink=false). Pure component swap, fed from ./fixtures.ts.
// FLAG (kept as-is per "do not touch components/kit/*"): the kit's field-prompt line reads
// "type the exact record name below"; the artboard names the asset inline. Non-prop string.
// Noted in PROGRESS.
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import { FrictionDeleteDialog } from "@/components/kit/friction-delete-dialog";
import { assetDeleteDialog } from "./fixtures";

export default function AssetDeleteDialogScreen() {
  return (
    <FrictionDeleteDialog
      open
      onClose={() => {}}
      onConfirm={() => {}}
      recordName={assetDeleteDialog.recordName}
      title={assetDeleteDialog.title}
      bodyCopy={assetDeleteDialog.bodyCopy}
      cancelLabel={assetDeleteDialog.cancelLabel}
      confirmLabel={assetDeleteDialog.confirmLabel}
      showArchiveLink={assetDeleteDialog.showArchiveLink}
    />
  );
}
