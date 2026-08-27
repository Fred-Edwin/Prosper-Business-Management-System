// Design-export fixture for "Store Manager Flows — Issues & Production" (Paper artboard
// 8XH-0). This artboard draws TWO separate full phone screens side by side — the
// "Issue Ingredients" flow and the "Record Batch Production" flow — transcribed as drawn.
// Values lifted verbatim from the artboard. Stays as the /design-preview fixture.
//
// TODO(mock): replace with real data once lib/domain/stock is implemented —
// recordKitchenIssue (available balances, receiving-chef list) and recordProduction
// (dish list, batch/shift metadata).

// ─── Panel 1: Issue Ingredients ──────────────────────────────────────────────
export const issueFlow = {
  title: "Issue Ingredients",
  direction: "Store → Kitchen",
  directionTone: "danger" as const,
  sectionLabel: "Select Ingredients to Issue",
  confirmLabel: "Confirm Kitchen Issue (-53.5 kg)",
};

export type IssueIngredientRow = {
  name: string;
  availLabel: string;
  qtyLabel: string;
  qty: string;
  unit: string;
  /** true = the active/selected card (danger-bordered, danger qty box). */
  active: boolean;
};

export const issueIngredients: IssueIngredientRow[] = [
  {
    name: "Beef Fillet",
    availLabel: "Avail: 46.5 kg",
    qtyLabel: "Issue Qty:",
    qty: "18.5",
    unit: "kg",
    active: true,
  },
  {
    name: "Rice Basmati",
    availLabel: "Avail: 120.0 kg",
    qtyLabel: "Issue Qty:",
    qty: "35.0",
    unit: "kg",
    active: false,
  },
];

export const issueReceivingChef = {
  label: "Receiving Chef *",
  value: "Chef Mike (Head Cook)",
};

// ─── Panel 2: Record Batch Production ────────────────────────────────────────
export const productionFlow = {
  title: "Record Batch Production",
  direction: "Kitchen → Restaurant",
  directionTone: "success" as const,
  confirmLabel: "Log Batch Production (+40 pcs)",
};

export const productionFields = {
  cookedDishLabel: "Cooked Dish *",
  cookedDishValue: "Grilled Chicken Portions",
  quantityLabel: "Quantity Cooked / Produced *",
  quantityValue: "+40.0",
  quantityUnit: "portions / pcs",
  stockRoutingNote:
    "Stock Routing: All batch production increments Restaurant stock immediately upon logging.",
  timeLabel: "Production Time & Shift",
  timeValue: "Today 11:30 AM · Lunch Prep Batch #2",
};
