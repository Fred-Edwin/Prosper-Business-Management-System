// Screen-state skeleton for the Paper artboard "Product Delete Dialog" (797-0). The artboard is
// byte-identical to the kit "Friction Delete Dialog" (6OE-0) except for the per-entity title /
// body copy / retype value — so this is a pure component swap: the kit <FrictionDeleteDialog>
// with ADR-36c label props, fed from ./fixtures.ts. The real Catalog screen mounts it
// conditionally in Phase C.
// FLAG (minor, kept as-is per "do not touch components/kit/*"): the kit's field-prompt line
// reads "type the exact record name below"; the artboard says "product name". One word, in a
// non-prop string. Noted in PROGRESS.
// Static design-export skeleton: no interactivity, no data fetching, no auth.
"use client";

import * as React from "react";
import { FrictionDeleteDialog } from "@/components/kit/friction-delete-dialog";
import { productDeleteDialog } from "./fixtures";

export default function ProductDeleteDialogScreen() {
  return (
    <FrictionDeleteDialog
      open
      onClose={() => {}}
      onConfirm={() => {}}
      recordName={productDeleteDialog.recordName}
      title={productDeleteDialog.title}
      bodyCopy={productDeleteDialog.bodyCopy}
      cancelLabel={productDeleteDialog.cancelLabel}
      confirmLabel={productDeleteDialog.confirmLabel}
      showArchiveLink={productDeleteDialog.showArchiveLink}
    />
  );
}
