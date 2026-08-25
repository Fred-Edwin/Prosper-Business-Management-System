"use client";

import * as React from "react";
import { FrictionDeleteDialog } from "@/components/kit/friction-delete-dialog";
import { productDeleteDialogMock } from "./mock-data";

export default function ProductDeleteDialogScreen() {
  return (
    <div className="min-h-screen w-full bg-surface-subtle">
      <FrictionDeleteDialog
        open
        entityName={productDeleteDialogMock.entityName}
        entityLabel={productDeleteDialogMock.entityLabel}
        onCancel={() => {}}
        onConfirm={() => {}}
        onArchiveInstead={() => {}}
      />
    </div>
  );
}
