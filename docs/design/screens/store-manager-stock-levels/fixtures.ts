// Design-export fixture for the "Store Manager — Stock Levels" screen (Paper artboard
// 986-0). Read-only current-level view. Values transcribed verbatim from the artboard.
// Stays as the /design-preview visual-regression fixture.
//
// TODO(mock): replace with real query once lib/domain/stock getDerivedStockBalance
// (sum-the-ledger) + last-movement timestamps are implemented.

export const stockLevelsHeader = {
  title: "Stock Levels",
  subtitle: "Store · as of today",
  searchPlaceholder: "Search stock...",
};

export const stockLevelsTableHeader = {
  product: "Product",
  currentQty: "Current Qty",
};

export type StockLevelRow = {
  name: string;
  meta: string;
  qty: string;
};

export const stockLevelRows: StockLevelRow[] = [
  { name: "Beef Fillet", meta: "kg · last movement 2h ago", qty: "46.5 kg" },
  { name: "Rice Basmati", meta: "kg · last movement 3h ago", qty: "70.0 kg" },
  { name: "Cooking Oil", meta: "L · last movement 5h ago", qty: "88.0 L" },
  { name: "Soda 300ml", meta: "pcs · last movement 10m ago", qty: "144.0 pcs" },
  { name: "Mineral Water 500ml", meta: "pcs · last movement 1d ago", qty: "96.0 pcs" },
];
