// Design-export fixture for the "Bulk Opening Stock Grid" screen (Paper artboard 7UD-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview
// visual-regression fixture.
//
// TODO(mock): replace with real query once lib/domain/stock/setOpeningStock (bulk
// opening-count entry across locations, per-item valuation) is implemented.

import type { BulkGridRow, BulkGridFooterSegment } from "@/components/kit/bulk-entry-grid";

export const bulkGridBreadcrumb = [
  { label: "Stock & Reconciliation" },
  { label: "Day 1 Initial Baseline Calibration (Stock & Physical Assets)" },
];

export const bulkGridToolbar = {
  discardLabel: "Discard & Back",
  saveLabel: "Save Baseline & Initialize Day 1",
};

export const bulkGridInstruction = {
  step: "1",
  title: "Comprehensive Day 1 Inventory & Asset Calibration",
  body:
    "Enter physical count quantities on site across all locations for raw ingredients, dishes, goods, and physical equipment.",
  trailing: "24 Items to Initialize",
};

export const bulkGridTabs = [
  { key: "all", label: "All Items (24)" },
  { key: "kitchen", label: "Kitchen Ingredients" },
  { key: "dishes", label: "Dishes" },
  { key: "goods", label: "Shop Goods" },
  { key: "assets", label: "Physical Assets & Equipment" },
];
export const bulkGridActiveTab = "all";

/** One editable cell per (row, location). The location whose column is "this row's" is
 *  editable (accent border); the other two are non-editable (greyed). Values verbatim. */
export const bulkGridRows: BulkGridRow[] = [
  {
    id: "beef-fillet",
    item: "Beef Fillet",
    category: "Ingredient",
    categoryTone: "info",
    unit: "kg",
    store: { value: "25.0", editable: true },
    restaurant: { value: "0.0" },
    canteen: { value: "0.0" },
    costBuying: "580.00",
    totalValue: "14,500.00",
  },
  {
    id: "grilled-chicken",
    item: "Grilled Chicken",
    category: "Dish (Finished)",
    categoryTone: "warning",
    unit: "pcs",
    store: { value: "0.0" },
    restaurant: { value: "8.0", editable: true },
    canteen: { value: "0.0" },
    costBuying: "0.00 (Dish)",
    totalValue: "0.00",
  },
  {
    id: "soda-300ml",
    item: "Soda 300ml",
    // Paper renders this category in text-warning ("Shop Goods") — kept verbatim.
    category: "Shop Goods",
    categoryTone: "warning",
    unit: "pcs",
    store: { value: "0.0" },
    restaurant: { value: "0.0" },
    canteen: { value: "144.0", editable: true },
    costBuying: "35.00",
    totalValue: "5,040.00",
  },
  {
    id: "chiller",
    item: "400L Upright Commercial Chiller",
    category: "Physical Asset (Good)",
    categoryTone: "warning",
    unit: "unit",
    store: { value: "1.0", editable: true },
    restaurant: { value: "0.0" },
    canteen: { value: "0.0" },
    costBuying: "92,000.00",
    totalValue: "92,000.00",
  },
];

/** Valuation footer — transcribed inline in page.tsx (the artboard footer's mr-auto on the
 *  3rd segment can't be expressed via the kit BulkEntryGrid footer props). */
export const bulkGridFooter = {
  title: "Consolidated Day 1 Valuation",
  segments: [
    { label: "Raw Stock:", value: "KES 46,100", tone: "default" as const },
    { label: "Dishes:", value: "8 pcs", tone: "default" as const },
    { label: "Assets Basis:", value: "KES 137,000", tone: "default" as const, pushEndAfter: true },
    { label: "Consolidated:", value: "KES 188,140.00", tone: "success" as const },
  ] satisfies (BulkGridFooterSegment & { pushEndAfter?: boolean })[],
};
