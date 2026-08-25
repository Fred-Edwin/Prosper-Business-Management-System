// TODO(mock): replace with real stock-movement correction wiring (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Admin Stock — Desktop Ledger (Drawer Open)" (7LJ-0).
export { ledgerLocationPills, ledgerToolbar, ledgerRows, ledgerFooterTotals } from "../admin-stock-ledger-full-width/mock-data";

export const correctionDrawerMock = {
  title: "Adjust Row Movements",
  subtitle: "Store · Beef Fillet (kg) · Aug 24",
  openingStock: "25.0 kg",
  purchases: "+50.0 kg",
  kitchenIssueLabel: "Kitchen Issue (-) *",
  kitchenIssueOriginal: "Original: 15.0",
  kitchenIssueValue: "18.5",
  kitchenIssueUnit: "kg",
  calculatedImpact:
    "Calculated Impact: Modifying issue from 15.0kg → 18.5kg applies a -3.50 kg delta, reducing Store Closing Stock to 46.50 kg (KES 27,900.00).",
  reasonLabel: "Reason for Adjustment *",
  reasonValue: "Kitchen chef requested additional 3.5kg after initial morning issue logged.",
};
