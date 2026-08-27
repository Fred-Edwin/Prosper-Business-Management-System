// Design-export fixture for "Store Manager Flows — Transfers & Consumption" (Paper
// artboard 92M-0). Draws TWO separate full phone screens side by side — the "Transfer
// Stock" flow and the "Log Non-Sale" flow — transcribed as drawn. Values lifted verbatim
// from the artboard. Stays as the /design-preview fixture.
//
// TODO(mock): replace with real data once lib/domain/stock is implemented —
// recordTransfer (2-phase dispatch, available balances, category tabs) and
// recordNonSaleConsumption (item search, reason list).

// ─── Panel 1: Transfer Stock ─────────────────────────────────────────────────
export const transferFlow = {
  title: "Transfer Stock",
  direction: "Store → Canteen",
  directionTone: "info" as const,
  searchPlaceholder: "Search sodas, goods, stock...",
  dispatchNote:
    "Dispatches to Canteen. Canteen staff will receive an alert to accept upon arrival.",
  confirmLabel: "Dispatch Transfer to Canteen (48 pcs)",
};

export const transferCategoryTabs = ["All", "Beverages & Soda", "Shop Goods"] as const;
export const transferActiveCategoryTab = "All";

export const transferSelectedItem = {
  name: "Soda 300ml (Coke/Fanta)",
  availLabel: "Available in Store: 144 pcs",
  qtyLabel: "Transfer Qty:",
  qty: "48.0",
};

export const transferUnselectedItem = {
  name: "Mineral Water 500ml",
  availLabel: "Available in Store: 96 pcs",
  selectLabel: "+ Select",
};

// ─── Panel 2: Log Non-Sale ──────────────────────────────────────────────────
export const nonSaleFlow = {
  title: "Log Non-Sale",
  direction: "Staff Meals & Spoilage",
  directionTone: "warning" as const,
  searchPlaceholder: "Search items to log...",
  confirmLabel: "Log Non-Sale",
};

export const nonSaleItem = {
  name: "Milk Fresh 500ml (Pouch)",
  availLabel: "Avail: 12 pcs",
  qtyLabel: "Quantity Consumed:",
  qty: "2.0",
  unit: "pcs",
};

export const nonSaleFields = {
  reasonLabel: "Consumption Reason *",
  reasonValue: "Staff Meal / Tea Preparation",
  notesLabel: "Optional Notes",
  notesValue: "Morning staff breakfast preparation.",
};
