// Design-export fixture for the "Product Drawer — Create / Edit" screen-state (Paper artboard 796-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview visual-regression fixture.
// TODO(mock): replace with real form state + lib/domain/catalog/createProduct once F1 is implemented.

export const productDrawerTitle = "New Product";

export const productDrawerNamePlaceholder = "e.g. Chicken Breast";
export const productDrawerKindOptions = ["Ingredient", "Dish", "Goods"] as const;
export const productDrawerKindActive = "Ingredient";
export const productDrawerUnitPlaceholder = "e.g. kg, pcs, crate, packet";

export const productDrawerBuyingPriceValue = "0.00";
export const productDrawerDishNote =
  "Dishes carry zero buying price; true food cost is derived from ingredients.";

/** Per-location availability rows exactly as drawn. */
export type ProductDrawerLocationRow = {
  label: string;
  enabled: boolean;
  /** Present when the toggle is on: the selling-price input value. */
  sellingPrice?: string;
  /** Present when the toggle is off: the explanatory line shown in place of the input. */
  disabledNote?: string;
};

export const productDrawerLocationRows: ProductDrawerLocationRow[] = [
  { label: "Restaurant", enabled: true, sellingPrice: "850.00" },
  { label: "Canteen", enabled: true, sellingPrice: "780.00" },
  { label: "Store", enabled: false, disabledNote: "Storage only — no selling price" },
];

export const productDrawerCancelLabel = "Cancel";
export const productDrawerConfirmLabel = "Save Product";
