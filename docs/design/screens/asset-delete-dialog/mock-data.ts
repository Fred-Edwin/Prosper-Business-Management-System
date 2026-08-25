// TODO(mock): replace with real asset delete wiring (lib/domain/assets) once wired.
// Extracted verbatim from Paper artboard "Asset Delete Dialog" (8IV-0) — the
// "Confirmed (retyped match)" state (retyped name matches, delete button enabled/red).
// Note: kit's FrictionDeleteDialog hardcodes "Cancel"/"Permanently Delete" button copy;
// Paper shows "Keep Asset"/"Permanently Delete Asset" for this entity — flagged in sprint report,
// not changed here since the kit component isn't parameterized for button labels.
export const assetDeleteDialogMock = {
  entityName: "Commercial Deep Fryer Double",
  entityLabel: "Asset Record",
};
