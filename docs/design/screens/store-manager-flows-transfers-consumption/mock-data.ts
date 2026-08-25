// TODO(mock): replace with real stock-movement transfer/consumption wiring (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Store Manager Flows — Transfers & Consumption" (92M-0).

export const transferStockFlow = {
  title: "Transfer Stock",
  direction: "Store → Canteen",
  searchPlaceholder: "Search sodas, goods, stock...",
  categoryPills: [
    { key: "all", label: "All" },
    { key: "beverages-soda", label: "Beverages & Soda" },
    { key: "shop-goods", label: "Shop Goods" },
  ],
  items: [
    { id: "soda-300ml", name: "Soda 300ml (Coke/Fanta)", available: "Available in Store: 144 pcs", transferQty: "48.0", unit: "pcs", active: true },
  ],
  unselectedItem: { id: "mineral-water-500ml", name: "Mineral Water 500ml", available: "Available in Store: 96 pcs", selectLabel: "+ Select" },
  infoNote: "Dispatches to Canteen. Canteen staff will receive an alert to accept upon arrival.",
  confirmLabel: "Dispatch Transfer to Canteen (48 pcs)",
};

export const logNonSaleFlow = {
  title: "Log Non-Sale",
  direction: "Staff Meals & Spoilage",
  searchPlaceholder: "Search items to log...",
  item: { id: "milk-fresh-500ml", name: "Milk Fresh 500ml (Poured)", available: "Avail: 12 pcs", quantityConsumed: "2.0", unit: "pcs" },
  consumptionReasonLabel: "Consumption Reason *",
  consumptionReason: "Staff Meal / Tea Prep",
  optionalNotesLabel: "Optional Notes",
  optionalNotes: "Morning staff breakfast preparation.",
  confirmLabel: "Log Non-Sale",
};
