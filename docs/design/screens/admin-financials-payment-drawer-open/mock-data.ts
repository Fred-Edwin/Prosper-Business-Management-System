// TODO(mock): replace with real purchase-payment recording wiring (lib/domain/financials) once wired.
// Extracted verbatim from Paper artboard "Admin Financials — Payment Drawer Open" (85W-0).
export {
  financialsDateSubtitle,
  financialsStatTiles,
  financialsTabs,
  financialsTransactions,
  financialsReconciledFooter,
} from "../admin-financials-full-table/mock-data";

export const paymentDrawerMock = {
  title: "Record Purchase Payment",
  subtitle: "2-Way Delivery Matching",
  supplier: "Farmer's Choice Butchery",
  product: "Beef Fillet (kg)",
  destination: "Store",
  quantity: "50.0",
  quantityUnit: "kg",
  totalCost: "KES 29,000.00",
  paidFromOptions: [
    { key: "cash", label: "Cash at Hand (KES 14.2k)", active: true },
    { key: "bank", label: "M-Pesa / Bank Till", active: false },
  ],
  infoNote: "Deducts immediately from cash balance. Store Manager will receive delivery on mobile with 1-tap matching.",
};
