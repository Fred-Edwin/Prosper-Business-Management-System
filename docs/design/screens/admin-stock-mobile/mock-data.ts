// TODO(mock): replace with real stock-movement ledger query (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Admin Stock — Mobile" (8Q4-0).

export const stockMobileSummary = {
  stockOnHand: "KES 76,800.00",
  soldValueToday: "KES 32,720.00",
};

export const stockMobileLocationPills = [
  { key: "all", label: "All (3)" },
  { key: "store", label: "Store" },
  { key: "restaurant", label: "Restaurant" },
  { key: "canteen", label: "Canteen" },
] as const;

export interface StockMobileCard {
  id: string;
  name: string;
  location: string;
  closing: string;
  closingValue: string;
  movementSummary: string; // e.g. "+50.0 Purch  -18.5 Issue  -10.0 Tr Out"
  openingLine: string;
}

export const stockMobileCards: StockMobileCard[] = [
  {
    id: "beef-fillet",
    name: "Beef Fillet",
    location: "Store",
    closing: "46.5 kg",
    closingValue: "KES 27,900.00",
    movementSummary: "+50.0 Purch   -18.5 Issue   -10.0 Tr Out",
    openingLine: "Open: 25.0 kg",
  },
  {
    id: "grilled-chicken",
    name: "Grilled Chicken",
    location: "Restaurant",
    closing: "15.0 pcs",
    closingValue: "KES 7,200.00",
    movementSummary: "+40.0 Prod   +5.0 Tr In   -38.0 Sold (KES 18,240)",
    openingLine: "Open: 8.0 pcs",
  },
  {
    id: "soda-300ml",
    name: "Soda 300ml",
    location: "Canteen",
    closing: "140.0 pcs",
    closingValue: "KES 7,000.00",
    movementSummary: "+48.0 Tr In   -52.0 Sold (KES 4,680)",
    openingLine: "Open: 144.0 pcs",
  },
];
