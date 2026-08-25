// TODO(mock): replace with real stock-movement issue/production wiring (lib/domain/stock) once wired.
// Extracted verbatim from Paper artboard "Store Manager Flows — Issues & Production" (8XH-0).
// This artboard shows two staff "flow" screens side by side.

export const issueIngredientsFlow = {
  title: "Issue Ingredients",
  direction: "Store → Kitchen",
  sectionLabel: "Select Ingredients to Issue",
  items: [
    { id: "beef-fillet", name: "Beef Fillet", available: "Avail: 46.5 kg", issueQty: "18.5", unit: "kg", active: true },
    { id: "rice-basmati", name: "Rice Basmati", available: "Avail: 120.0 kg", issueQty: "35.0", unit: "kg", active: false },
  ],
  receivingChefLabel: "Receiving Chef *",
  receivingChef: "Chef Mike (Head Cook)",
  confirmLabel: "Confirm Kitchen Issue (-53.5 kg)",
};

export const recordBatchProductionFlow = {
  title: "Record Batch Production",
  direction: "Kitchen → Restaurant",
  cookedDishLabel: "Cooked Dish *",
  cookedDish: "Grilled Chicken Portions",
  quantityLabel: "Quantity Cooked / Produced *",
  quantity: "+40.0",
  quantityUnit: "portions / pcs",
  stockRoutingNote: "Stock Routing: All batch production increments Restaurant stock immediately upon logging.",
  productionTimeLabel: "Production Time & Shift",
  productionTime: "Today 11:30 AM · Lunch Prep Batch #2",
  confirmLabel: "Log Batch Production (+40 pcs)",
};
