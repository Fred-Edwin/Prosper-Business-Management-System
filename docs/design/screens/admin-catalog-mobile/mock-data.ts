// TODO(mock): replace with real product-catalog query (lib/domain/catalog) once wired.
// Extracted verbatim from Paper artboard "Admin Catalog — Mobile" (8L7-0).

export interface MobileCatalogPriceCell {
  label: string;
  value: string | null;
}

export interface MobileCatalogCard {
  id: string;
  name: string;
  categoryLine: string; // e.g. "Ingredient · per kg"
  prices: MobileCatalogPriceCell[];
}

export const mobileCatalogCategoryTabs = [
  { key: "all", label: "All" },
  { key: "ingredients", label: "Ingredients" },
  { key: "dishes", label: "Dishes" },
  { key: "goods", label: "Goods" },
] as const;

export const mobileCatalogProductCount = "47";

export const mobileCatalogCards: MobileCatalogCard[] = [
  {
    id: "chicken-breast",
    name: "Chicken Breast",
    categoryLine: "Ingredient · per kg",
    prices: [
      { label: "Buying", value: "580.00 KES" },
      { label: "Restaurant", value: "850.00 KES" },
      { label: "Canteen", value: "780.00 KES" },
    ],
  },
  {
    id: "grilled-chicken",
    name: "Grilled Chicken",
    categoryLine: "Dish · per pcs",
    prices: [
      { label: "Buying", value: null },
      { label: "Restaurant", value: "480.00 KES" },
      { label: "Canteen", value: "440.00 KES" },
    ],
  },
  {
    id: "soda-300ml",
    name: "Soda 300ml",
    categoryLine: "Goods · per pcs",
    prices: [
      { label: "Buying", value: "35.00 KES" },
      { label: "Store", value: "50.00 KES" },
      { label: "Canteen", value: "90.00 KES" },
    ],
  },
  {
    id: "tomatoes",
    name: "Tomatoes",
    categoryLine: "Ingredient · per crate",
    prices: [
      { label: "Buying", value: "45.00 KES" },
      { label: "Restaurant", value: "480.00 KES" },
      { label: "Canteen", value: "440.00 KES" },
    ],
  },
  {
    id: "beef-stew",
    name: "Beef Stew",
    categoryLine: "Dish · per pcs",
    prices: [
      { label: "Buying", value: null },
      { label: "Restaurant", value: "350.00 KES" },
      { label: "Canteen", value: "320.00 KES" },
    ],
  },
];
