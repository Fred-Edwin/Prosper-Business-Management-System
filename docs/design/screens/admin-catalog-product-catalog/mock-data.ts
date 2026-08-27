// TODO(mock): replace with real catalog query once lib/domain/catalog/listProducts is implemented.
// Values transcribed verbatim from the Paper artboard "Admin Catalog — Product Catalog" (6ZO-0).

export type CatalogCategory = "Ingredient" | "Dish" | "Goods";

export type CatalogRow = {
  name: string;
  category: CatalogCategory;
  unit: string;
  /** Display strings exactly as drawn in Paper. An em dash means "not sold at this location". */
  buyingPrice: string;
  restaurant: string;
  canteen: string;
  store: string;
};

export const catalogProductCount = "47 products";

export const catalogTabs = ["All", "Ingredients", "Dishes", "Goods", "Archived"] as const;
export const catalogActiveTab = "All";
/** "Archived" renders in the disabled text color in Paper. */
export const catalogDisabledTabs = ["Archived"] as const;

export const catalogLocationFilter = "All Locations";
export const catalogSearchPlaceholder = "Search products…";

export const catalogRows: CatalogRow[] = [
  {
    name: "Chicken Breast",
    category: "Ingredient",
    unit: "kg",
    buyingPrice: "580.00",
    restaurant: "850.00",
    canteen: "780.00",
    store: "—",
  },
  {
    name: "Tomatoes",
    category: "Ingredient",
    unit: "crate",
    buyingPrice: "45.00",
    restaurant: "480.00",
    canteen: "440.00",
    store: "—",
  },
  {
    name: "Grilled Chicken",
    category: "Dish",
    unit: "pcs",
    buyingPrice: "—",
    restaurant: "480.00",
    canteen: "440.00",
    store: "—",
  },
  {
    name: "Beef Stew",
    category: "Dish",
    unit: "pcs",
    buyingPrice: "—",
    restaurant: "350.00",
    canteen: "320.00",
    store: "—",
  },
  {
    name: "Soda 300ml",
    category: "Goods",
    unit: "pcs",
    buyingPrice: "35.00",
    restaurant: "—",
    canteen: "90.00",
    store: "50.00",
  },
  {
    name: "Mineral Water 500ml",
    category: "Goods",
    unit: "pcs",
    buyingPrice: "20.00",
    restaurant: "60.00",
    canteen: "55.00",
    store: "—",
  },
];

/** Category label color, per Paper: Ingredient=info, Dish=warning, Goods=success. */
export const catalogCategoryToneClass: Record<CatalogCategory, string> = {
  Ingredient: "text-info",
  Dish: "text-warning",
  Goods: "text-success",
};

export const catalogAccount = { initials: "EK", name: "Edwin K.", role: "Admin" };
