// Design-export fixture for the "Product Delete Dialog" screen-state (Paper artboard 797-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview visual-regression fixture.
// TODO(mock): replace with real delete flow (referential guard -> 409) once F1 is implemented.

export const productDeleteDialog = {
  recordName: "Chicken Breast",
  title: "Delete Product",
  bodyCopy:
    "You are about to permanently delete this product. This will erase it and all its pricing records from the catalog and audit log. This cannot be undone.",
  cancelLabel: "Cancel",
  confirmLabel: "Permanently Delete",
  showArchiveLink: true,
} as const;
