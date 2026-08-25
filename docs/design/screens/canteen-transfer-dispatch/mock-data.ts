// TODO(mock): replace with real stock-transfer wiring (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Canteen — Transfer Dispatch" (9FE-0).

export const canteenTransferDispatch = {
  title: "Transfer Stock",
  direction: "Canteen → Store",
  searchPlaceholder: "Search sodas, goods, stock...",
  categoryPills: [
    { key: "all", label: "All" },
    { key: "beverages-soda", label: "Beverages & Soda" },
    { key: "shop-goods", label: "Shop Goods" },
  ],
  selectedItem: {
    id: "mineral-water-500ml",
    name: "Mineral Water 500ml",
    available: "Available in Canteen: 96 pcs",
    transferQty: "24.0",
  },
  unselectedItem: {
    id: "soda-300ml",
    name: "Soda 300ml (Coke/Fanta)",
    available: "Available in Canteen: 92 pcs",
    selectLabel: "+ Select",
  },
  infoNote: "Returns excess Canteen stock to Store. Store Manager will receive an alert to accept upon arrival.",
  confirmLabel: "Dispatch Transfer to Store (24 pcs)",
};
