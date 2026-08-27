// Design-export fixture for the "Admin Financials — Payment Drawer Open" screen-state
// (Paper artboard 85W-0). Values transcribed verbatim from the artboard. Stays as the
// /design-preview visual-regression fixture.
// TODO(mock): replace with real query + record-payment form wiring once lib/domain/stock
// (purchase payment) is implemented.
//
// The base body (KPI strip + tabs + transactions table + reconciled-outflows footer) is the
// same content as admin-financials-full-table — re-uses that screen's fixtures. This file only
// adds the docked payment-drawer rail's literals. Same D-FIN / Option A note applies (KPI strip
// exported as drawn; contradicts the M1 cut).

export const paymentDrawer = {
  title: "Record Purchase Payment",
  eyebrow: "2-Way Delivery Matching",

  supplierLabel: "Supplier / Vendor *",
  supplierValue: "Farmer's Choice Butchery",

  productLabel: "Product *",
  productValue: "Beef Fillet (kg)",
  destinationLabel: "Destination",
  destinationValue: "Store",

  quantityLabel: "Quantity *",
  quantityValue: "50.0",
  quantityUnit: "kg",
  totalCostLabel: "Total Cost *",
  totalCostValue: "KES 29,000.00",

  paidFromLabel: "Paid From *",
  paidFromOptions: ["Cash at Hand (KES 14.2k)", "M-Pesa / Bank Till"] as const,
  paidFromActive: "Cash at Hand (KES 14.2k)",

  infoNote:
    "Deducts immediately from cash balance. Store Manager will receive delivery on mobile with 1-tap matching.",

  cancelLabel: "Cancel",
  confirmLabel: "Disburse & Register Delivery",
} as const;
