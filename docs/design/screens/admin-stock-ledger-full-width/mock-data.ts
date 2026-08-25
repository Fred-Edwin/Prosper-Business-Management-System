// TODO(mock): replace with real stock-movement ledger query (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Admin Stock — Desktop Ledger (Full Width)" (798-0).
// Note: no row on this artboard shows a "Corrected" chip — see sprint-06 handover discrepancy note.

import type { LedgerRow } from "@/components/kit/dense-ledger";

export const ledgerLocationPills = [
  { key: "all", label: "All (3)" },
  { key: "store", label: "Store" },
  { key: "restaurant", label: "Restaurant" },
  { key: "canteen", label: "Canteen" },
] as const;

export const ledgerToolbar = {
  title: "Stock & Reconciliation",
  dateLabel: "Date: Aug 24",
  categoryFilterLabel: "Category: All",
  columnsControlLabel: "Columns: 11/11",
};

export const ledgerRows: LedgerRow[] = [
  {
    id: "beef-fillet-store",
    location: "Store",
    product: "Beef Fillet (kg)",
    opening: 25.0,
    purchases: 50.0,
    issues: -18.5,
    production: null,
    transferIn: null,
    transferOut: -10.0,
    sold: null,
    soldValue: null,
    closing: 46.5,
    closingValue: 27900.0,
  },
  {
    id: "rice-basmati-store",
    location: "Store",
    product: "Rice Basmati (kg)",
    opening: 120.0,
    purchases: null,
    issues: -35.0,
    production: null,
    transferIn: null,
    transferOut: -15.0,
    sold: null,
    soldValue: null,
    closing: 70.0,
    closingValue: 12600.0,
  },
  {
    id: "cooking-oil-store",
    location: "Store",
    product: "Cooking Oil (L)",
    opening: 40.0,
    purchases: 60.0,
    issues: -12.0,
    production: null,
    transferIn: null,
    transferOut: null,
    sold: null,
    soldValue: null,
    closing: 88.0,
    closingValue: 22000.0,
  },
  {
    id: "grilled-chicken-restaurant",
    location: "Restaurant",
    product: "Grilled Chicken (pcs)",
    opening: 8.0,
    purchases: null,
    issues: null,
    production: 40.0,
    transferIn: 5.0,
    transferOut: null,
    sold: -38.0,
    soldValue: 18240.0,
    closing: 15.0,
    closingValue: 7200.0,
  },
  {
    id: "soda-300ml-canteen",
    location: "Canteen",
    product: "Soda 300ml (pcs)",
    opening: 144.0,
    purchases: null,
    issues: null,
    production: null,
    transferIn: 48.0,
    transferOut: null,
    sold: -52.0,
    soldValue: 4680.0,
    closing: 140.0,
    closingValue: 7000.0,
  },
];

// Ledger Footer totals as shown live in Paper (reconciled totals row).
export const ledgerFooterTotals = {
  opening: 321.0,
  purchases: 110.0,
  issues: -65.5,
  production: 70.0,
  transferIn: 53.0,
  transferOut: -25.0,
  sold: -118.0,
  soldValue: 32720.0,
  closing: 365.5,
  closingValue: 76800.0,
};
