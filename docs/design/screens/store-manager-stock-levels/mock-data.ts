// TODO(mock): replace with real stock-level query (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Store Manager — Stock Levels" (986-0).

export const storeStockLevelsHeader = {
  title: "Stock Levels",
  subtitle: "Store · as of today",
  searchPlaceholder: "Search stock...",
};

export interface StoreStockLevelRow {
  id: string;
  name: string;
  detail: string; // e.g. "kg · last movement 2h ago"
  quantity: string; // e.g. "46.5 kg"
}

export const storeStockLevelRows: StoreStockLevelRow[] = [
  { id: "beef-fillet", name: "Beef Fillet", detail: "kg · last movement 2h ago", quantity: "46.5 kg" },
  { id: "rice-basmati", name: "Rice Basmati", detail: "kg · last movement 3h ago", quantity: "70.0 kg" },
  { id: "cooking-oil", name: "Cooking Oil", detail: "L · last movement 5h ago", quantity: "88.0 L" },
  { id: "soda-300ml", name: "Soda 300ml", detail: "pcs · last movement 10m ago", quantity: "144.0 pcs" },
  { id: "mineral-water-500ml", name: "Mineral Water 500ml", detail: "pcs · last movement 1d ago", quantity: "96.0 pcs" },
];
