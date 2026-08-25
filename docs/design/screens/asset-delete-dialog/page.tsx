"use client";

import * as React from "react";
import { FrictionDeleteDialog } from "@/components/kit/friction-delete-dialog";
import { assetDeleteDialogMock } from "./mock-data";

export default function AssetDeleteDialogScreen() {
  return (
    <div className="min-h-screen w-full bg-surface-subtle">
      <FrictionDeleteDialog
        open
        entityName={assetDeleteDialogMock.entityName}
        entityLabel={assetDeleteDialogMock.entityLabel}
        onCancel={() => {}}
        onConfirm={() => {}}
      />
    </div>
  );
}
