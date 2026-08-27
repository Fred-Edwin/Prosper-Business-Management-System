// Design-export fixture for the "Admin Stock — Desktop Ledger (Full Width)" screen
// (Paper artboard 798-0). Values transcribed verbatim from the artboard. Stays as the
// /design-preview visual-regression fixture. Shared by the sibling ledger screens
// (sidebar-collapsed, drawer-open) which reuse this fixture + ./side-nav.tsx.
//
// TODO(mock): replace with real query once lib/domain/stock (getDerivedStockBalance —
// sum-the-ledger per product/day/location) is implemented.
//
// The ledger renders via the kit <DenseLedger showLocation horizontalScroll> — the kit
// component gained an opt-in Location column + horizontal-scroll mode this session
// (ADR-37a, owner-authorised). Rows/totals are shaped to LedgerRow / LedgerTotals.

import type { LedgerRow, LedgerTotals } from "@/components/kit/dense-ledger";

export const stockLedgerToolbarTitle = "Stock & Reconciliation";
export const stockLedgerAccount = { initials: "EK", name: "Edwin K.", role: "Admin" };

export const stockLedgerToolbar = {
  dateLabel: "Date: Aug 24",
  maximizeLabel: "Maximize",
  openingStockLabel: "Opening Stock",
};

/** Location pill-filter tabs. `count` is baked into the label verbatim. */
export const stockLedgerLocationTabs = [
  { key: "all", label: "All (3)" },
  { key: "store", label: "Store" },
  { key: "restaurant", label: "Restaurant" },
  { key: "canteen", label: "Canteen" },
] as const;
export const stockLedgerActiveLocationTab = "all";

export const stockLedgerFilters = {
  categoryLabel: "Category: All",
  columnsLabel: "Columns: 11/11",
};

const dash = { dash: true } as const;

export const stockLedgerRows: LedgerRow[] = [
  {
    id: "beef-store",
    location: "Store",
    product: "Beef Fillet (kg)",
    opening: { value: "25.0" },
    purchases: { value: "+50.0", tone: "success" },
    issues: { value: "-18.5", tone: "danger" },
    production: dash,
    transferIn: dash,
    transferOut: { value: "-10.0", tone: "danger" },
    sold: dash,
    soldValue: dash,
    closing: { value: "46.5" },
    closingValue: { value: "27,900.00" },
  },
  {
    id: "rice-store",
    location: "Store",
    product: "Rice Basmati (kg)",
    opening: { value: "120.0" },
    purchases: dash,
    issues: { value: "-35.0", tone: "danger" },
    production: dash,
    transferIn: dash,
    transferOut: { value: "-15.0", tone: "danger" },
    sold: dash,
    soldValue: dash,
    closing: { value: "70.0" },
    closingValue: { value: "12,600.00" },
  },
  {
    id: "oil-store",
    location: "Store",
    product: "Cooking Oil (L)",
    opening: { value: "40.0" },
    // Paper renders "+60.0" tertiary here (muted), not success-green — kept verbatim.
    purchases: { value: "+60.0", dash: true },
    issues: { value: "-12.0", tone: "danger" },
    production: dash,
    transferIn: dash,
    // Paper renders this Transfer Out cell as a tertiary "—" but in danger color — kept verbatim.
    transferOut: { value: "—", tone: "danger" },
    sold: dash,
    soldValue: dash,
    closing: { value: "88.0" },
    closingValue: { value: "22,000.00" },
  },
  {
    id: "chicken-restaurant",
    location: "Restaurant",
    product: "Grilled Chicken (pcs)",
    opening: { value: "8.0" },
    purchases: dash,
    issues: dash,
    production: { value: "+40.0", tone: "success" },
    transferIn: { value: "+5.0", tone: "success" },
    transferOut: dash,
    sold: { value: "-38.0", tone: "danger" },
    // Paper renders sold-value tertiary here — kept verbatim.
    soldValue: { value: "18,240.00", dash: true },
    closing: { value: "15.0" },
    closingValue: { value: "7,200.00" },
  },
  {
    id: "soda-canteen",
    location: "Canteen",
    product: "Soda 300ml (pcs)",
    opening: { value: "144.0" },
    purchases: dash,
    issues: dash,
    // Paper renders this Production cell as a tertiary "—" in success color — kept verbatim.
    production: { value: "—", tone: "success" },
    transferIn: { value: "+48.0", tone: "success" },
    transferOut: dash,
    sold: { value: "-52.0", tone: "danger" },
    soldValue: { value: "4,680.00", dash: true },
    closing: { value: "140.0" },
    closingValue: { value: "7,000.00" },
  },
];

/** Dark "Totals (reconciled)" footer row — verbatim from the artboard. */
export const stockLedgerTotals: LedgerTotals = {
  label: "Totals (reconciled)",
  opening: { value: "321.0" },
  purchases: { value: "+110.0", tone: "success" },
  issues: { value: "-65.5", tone: "danger" },
  production: { value: "+70.0", tone: "success" },
  transferIn: { value: "+53.0", tone: "success" },
  transferOut: { value: "-25.0", tone: "danger" },
  sold: { value: "-118.0", tone: "danger" },
  soldValue: { value: "32,720.00" },
  closing: { value: "365.5" },
  closingValue: { value: "76,800.00" },
};
