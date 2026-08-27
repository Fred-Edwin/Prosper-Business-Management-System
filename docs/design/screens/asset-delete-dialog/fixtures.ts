// Design-export fixture for the "Asset Delete Dialog" screen-state (Paper artboard 8IV-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview visual-regression fixture.
// TODO(mock): replace with real delete flow (referential guard) once F3 is implemented.

export const assetDeleteDialog = {
  recordName: "Commercial Deep Fryer Double",
  title: "Delete Asset Record",
  bodyCopy:
    "You are about to permanently delete Commercial Deep Fryer Double. This will erase its cost basis from physical asset register and audit logs.",
  cancelLabel: "Keep Asset",
  confirmLabel: "Permanently Delete Asset",
  showArchiveLink: false,
} as const;
