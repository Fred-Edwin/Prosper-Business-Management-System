// Design-export fixture for the "Admin Catalog — Mobile" screen (Paper artboard 8L7-0).
// Values transcribed verbatim from the artboard. Stays as the /design-preview visual-regression fixture.
// TODO(mock): replace with real catalog query once lib/domain/catalog/listProducts is implemented.

export type CatalogCategory = "Ingredient" | "Dish" | "Goods";

/** One price cell inside a product card. Value strings are exactly as drawn ("580.00 KES", "—"). */
export type CatalogMobilePrice = {
  label: string;
  value: string;
  /** Em dash renders in the tertiary text color in Paper. */
  muted?: boolean;
};

export type CatalogMobileCard = {
  name: string;
  category: CatalogCategory;
  unit: string;
  prices: CatalogMobilePrice[];
};

export const catalogMobileLocationLabel = "All locations";
export const catalogMobileStatus = "Open";
export const catalogMobileTitle = "Product Catalog";
export const catalogMobileCount = "47";
export const catalogMobileTabs = ["All", "Ingredients", "Dishes", "Goods"] as const;
export const catalogMobileActiveTab = "All";
export const catalogMobileSearchPlaceholder = "Search products...";
export const catalogMobileAccount = { initials: "EK" };

/** Category label color, per Paper: Ingredient=info, Dish=warning, Goods=success. */
export const catalogMobileCategoryToneClass: Record<CatalogCategory, string> = {
  Ingredient: "text-info",
  Dish: "text-warning",
  Goods: "text-success",
};

export const catalogMobileCards: CatalogMobileCard[] = [
  {
    name: "Chicken Breast",
    category: "Ingredient",
    unit: "kg",
    prices: [
      { label: "Buying", value: "580.00 KES" },
      { label: "Restaurant", value: "850.00 KES" },
      { label: "Canteen", value: "780.00 KES" },
    ],
  },
  {
    name: "Grilled Chicken",
    category: "Dish",
    unit: "pcs",
    prices: [
      { label: "Buying", value: "—", muted: true },
      { label: "Restaurant", value: "480.00 KES" },
      { label: "Canteen", value: "440.00 KES" },
    ],
  },
  {
    name: "Soda 300ml",
    category: "Goods",
    unit: "pcs",
    prices: [
      { label: "Buying", value: "35.00 KES" },
      { label: "Store", value: "50.00 KES" },
      { label: "Canteen", value: "90.00 KES" },
    ],
  },
  {
    name: "Tomatoes",
    category: "Ingredient",
    unit: "crate",
    prices: [
      { label: "Buying", value: "45.00 KES" },
      { label: "Restaurant", value: "480.00 KES" },
      { label: "Canteen", value: "440.00 KES" },
    ],
  },
  {
    name: "Beef Stew",
    category: "Dish",
    unit: "pcs",
    prices: [
      { label: "Buying", value: "—", muted: true },
      { label: "Restaurant", value: "350.00 KES" },
      { label: "Canteen", value: "320.00 KES" },
    ],
  },
];
