// TODO(mock): replace with real product create/edit form wiring (lib/domain/catalog) once wired.
// Extracted verbatim from Paper artboard "Product Drawer — Create / Edit" (796-0).

export type ProductKind = "Ingredient" | "Dish" | "Goods";

export interface LocationPricingRow {
  key: string;
  label: string;
  available: boolean;
  sellingPrice: string | null; // null = "Storage only — no selling price"
}

export const productDrawerMock = {
  title: "New Product",
  productName: "",
  productNamePlaceholder: "e.g. Chicken Breast",
  productKind: "Ingredient" as ProductKind,
  unitLabel: "",
  unitLabelPlaceholder: "e.g. kg, pcs, crate, packet",
  buyingPrice: "0.00",
  buyingPriceNote: "Dishes carry zero buying price; true food cost is derived from ingredient consumption.",
  locations: [
    { key: "restaurant", label: "Restaurant", available: true, sellingPrice: "850.00" },
    { key: "canteen", label: "Canteen", available: true, sellingPrice: "780.00" },
    { key: "store", label: "Store", available: false, sellingPrice: null },
  ] as LocationPricingRow[],
};
