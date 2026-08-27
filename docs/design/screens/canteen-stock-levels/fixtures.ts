// Design-export fixture for the "Canteen — Stock Levels" screen (Paper artboard 9GW-0).
// Read-only current-level view; mirrors store-manager-stock-levels (986-0). Values
// transcribed verbatim from the artboard. Stays as the /design-preview fixture.
//
// TODO(mock): replace with real query once lib/domain/stock getDerivedStockBalance
// (sum-the-ledger) + last-movement timestamps are implemented.

export const stockLevelsHeader = {
  title: "Stock Levels",
  subtitle: "Canteen · as of today",
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
  { name: "Soda 300ml", meta: "pcs · last movement 11m ago", qty: "140.0 pcs" },
  { name: "Mineral Water 500ml", meta: "pcs · last movement 1h ago", qty: "96.0 pcs" },
  { name: "Chicken Breast", meta: "kg · last movement 3h ago", qty: "12.0 kg" },
  { name: "Grilled Chicken", meta: "pcs · last movement 45m ago", qty: "18.0 pcs" },
  { name: "Beef Stew", meta: "pcs · last movement 2h ago", qty: "9.0 pcs" },
];
