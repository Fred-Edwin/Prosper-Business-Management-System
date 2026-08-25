// TODO(mock): replace with real stock-level query (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Canteen — Stock Levels" (9GW-0).

export const canteenStockLevelsHeader = {
  title: "Stock Levels",
  subtitle: "Canteen · as of today",
  searchPlaceholder: "Search stock...",
};

export interface CanteenStockLevelRow {
  id: string;
  name: string;
  detail: string;
  quantity: string;
}

export const canteenStockLevelRows: CanteenStockLevelRow[] = [
  { id: "soda-300ml", name: "Soda 300ml", detail: "pcs · last movement 11m ago", quantity: "140.0 pcs" },
  { id: "mineral-water-500ml", name: "Mineral Water 500ml", detail: "pcs · last movement 1h ago", quantity: "96.0 pcs" },
  { id: "chicken-breast", name: "Chicken Breast", detail: "kg · last movement 3h ago", quantity: "12.0 kg" },
  { id: "grilled-chicken", name: "Grilled Chicken", detail: "pcs · last movement 45m ago", quantity: "18.0 pcs" },
  { id: "beef-stew", name: "Beef Stew", detail: "pcs · last movement 2h ago", quantity: "9.0 pcs" },
];
