// TODO(mock): replace with real opening-stock baseline wiring (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Bulk Opening Stock Grid" (7UD-0).
import type { BulkEntryLocation, BulkEntryRow, BulkEntryValuationItem } from "@/components/kit/bulk-entry-grid";

export const bulkGridBreadcrumb = [
  { label: "Stock & Reconciliation", href: "/admin/stock" },
  { label: "Day 1 Initial Baseline Calibration (Stock & Physical Assets)" },
];

export const bulkGridInstructions = {
  step: 1,
  title: "Comprehensive Day 1 Inventory & Asset Calibration",
  description: "Enter physical count quantities on site across all locations",
  itemsCount: "24 Items to Initialize",
};

export const bulkGridTabs = [
  { key: "all", label: "All Items (24)" },
  { key: "kitchen-ingredients", label: "Kitchen Ingredients" },
  { key: "dishes", label: "Dishes" },
  { key: "shop-goods", label: "Shop Goods" },
  { key: "physical-assets", label: "Physical Assets & Equipment" },
] as const;

export const bulkGridLocations: BulkEntryLocation[] = [
  { key: "store", label: "Store" },
  { key: "restaurant", label: "Restaurant" },
  { key: "canteen", label: "Canteen" },
];

export const bulkGridRows: BulkEntryRow[] = [
  {
    id: "beef-fillet",
    name: "Beef Fillet",
    category: "Ingredient",
    unit: "kg",
    quantities: { store: 25.0, restaurant: 0.0, canteen: 0.0 },
    costLabel: "580.00",
    totalValueLabel: "14,500.00",
  },
  {
    id: "grilled-chicken",
    name: "Grilled Chicken",
    category: "Dish (Finished)",
    unit: "pcs",
    quantities: { store: 0.0, restaurant: 8.0, canteen: 0.0 },
    costLabel: "0.00 (Dish)",
    totalValueLabel: "0.00",
  },
  {
    id: "soda-300ml",
    name: "Soda 300ml",
    category: "Shop Goods",
    unit: "pcs",
    quantities: { store: 0.0, restaurant: 0.0, canteen: 144.0 },
    costLabel: "35.00",
    totalValueLabel: "5,040.00",
  },
  {
    id: "chiller-400l",
    name: "400L Upright Commercial Chiller",
    category: "Physical Asset (Good)",
    unit: "unit",
    quantities: { store: 1.0, restaurant: 0.0, canteen: 0.0 },
    costLabel: "92,000.00",
    totalValueLabel: "92,000.00",
  },
];

export const bulkGridValuationFooterTitle = "Consolidated Day 1 Valuation";

export const bulkGridValuationFooter: BulkEntryValuationItem[] = [
  { key: "raw-stock", label: "Raw Stock", value: "KES 46,100" },
  { key: "dishes", label: "Dishes", value: "8 pcs" },
  { key: "assets-basis", label: "Assets Basis", value: "KES 137,000" },
  { key: "consolidated", label: "Consolidated", value: "KES 188,140.00", emphasize: true },
];
