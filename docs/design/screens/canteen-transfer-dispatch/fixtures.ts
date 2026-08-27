// Design-export fixture for the "Canteen — Transfer Dispatch" screen (Paper artboard
// 9FE-0). Mirrors the Store Manager "Transfer Stock" flow, Canteen → Store direction.
// Values transcribed verbatim from the artboard. Stays as the /design-preview fixture.
//
// TODO(mock): replace with real data once lib/domain/stock recordTransfer (2-phase
// dispatch, available Canteen balances, category tabs) is implemented.

export const canteenTransferFlow = {
  title: "Transfer Stock",
  direction: "Canteen → Store",
  directionTone: "info" as const,
  searchPlaceholder: "Search sodas, goods, stock...",
  infoNote:
    "Returns excess Canteen stock to Store. Store Manager will receive an alert to accept upon arrival.",
  confirmLabel: "Dispatch Transfer to Store (24 pcs)",
};

export const canteenTransferCategoryTabs = ["All", "Beverages & Soda", "Shop Goods"] as const;
export const canteenTransferActiveCategoryTab = "All";

export const canteenTransferSelectedItem = {
  name: "Mineral Water 500ml",
  availLabel: "Available in Canteen: 96 pcs",
  qtyLabel: "Transfer Qty:",
  qty: "24.0",
};

export const canteenTransferUnselectedItem = {
  name: "Soda 300ml (Coke/Fanta)",
  availLabel: "Available in Canteen: 92 pcs",
  selectLabel: "+ Select",
};
