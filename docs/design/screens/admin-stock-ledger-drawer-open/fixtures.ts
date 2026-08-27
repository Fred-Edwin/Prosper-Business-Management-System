// Design-export fixture for the "Admin Stock — Desktop Ledger (Drawer Open)" screen-state
// (Paper artboard 7LJ-0) — specifically the correction drawer panel (7S9-0). Values
// transcribed verbatim from the artboard. Stays as the /design-preview visual-regression
// fixture.
//
// TODO(mock): replace with real query + the correction-entry pattern once
// lib/domain/stock/correctMovement (day-close check + delta = correctValue - originalValue,
// writing a new row per CONVENTIONS.md §4 / ADR-15) is implemented.

export const correctionDrawer = {
  title: "Adjust Row Movements",
  subtitle: "Store · Beef Fillet (kg) · Aug 24",
  /** Read-only context rows above the editable field. */
  contextRows: [
    { label: "Opening Stock", value: "25.0 kg", tone: "primary" as const },
    { label: "Purchases (+)", value: "+50.0 kg", tone: "success" as const },
  ],
  /** The one editable (and here error-bordered) movement field. */
  field: {
    label: "Kitchen Issue (-) *",
    originalLabel: "Original: 15.0",
    value: "18.5",
    unit: "kg",
    /** Paper draws this field's wrapper with a danger border (error state). */
    error: true,
  },
  impact:
    "Calculated Impact: Modifying issue from 15.0kg → 18.5kg applies a -3.50 kg delta, reducing Store Closing Stock to 46.50 kg (KES 27,900.00).",
  reason: {
    label: "Reason for Adjustment *",
    value:
      "Kitchen chef requested additional 3.5kg after initial morning issue logged.",
  },
  closeLabel: "Close",
  confirmLabel: "Confirm & Save Correction",
};
