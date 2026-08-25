// TODO(mock): replace with real product-catalog query (lib/domain/catalog) once wired.
// Extracted verbatim from Paper artboard "Admin Catalog — Product Catalog" (6ZO-0).

export type ProductCategory = "Ingredient" | "Dish" | "Goods";

export interface CatalogProductRow {
  id: string;
  name: string;
  category: ProductCategory;
  unit: string;
  buyingPrice: string | null;
  restaurantPrice: string | null;
  canteenPrice: string | null;
  storePrice: string | null;
}

export const catalogFilterTabs = [
  { key: "all", label: "All" },
  { key: "ingredients", label: "Ingredients" },
  { key: "dishes", label: "Dishes" },
  { key: "goods", label: "Goods" },
  { key: "archived", label: "Archived" },
] as const;

export const catalogProductCount = "47 products";

export const catalogProducts: CatalogProductRow[] = [
  {
    id: "chicken-breast",
    name: "Chicken Breast",
    category: "Ingredient",
    unit: "kg",
    buyingPrice: "580.00",
    restaurantPrice: "850.00",
    canteenPrice: "780.00",
    storePrice: null,
  },
  {
    id: "tomatoes",
    name: "Tomatoes",
    category: "Ingredient",
    unit: "crate",
    buyingPrice: "45.00",
    restaurantPrice: "480.00",
    canteenPrice: "440.00",
    storePrice: null,
  },
  {
    id: "grilled-chicken",
    name: "Grilled Chicken",
    category: "Dish",
    unit: "pcs",
    buyingPrice: null,
    restaurantPrice: "480.00",
    canteenPrice: "440.00",
    storePrice: null,
  },
  {
    id: "beef-stew",
    name: "Beef Stew",
    category: "Dish",
    unit: "pcs",
    buyingPrice: null,
    restaurantPrice: "350.00",
    canteenPrice: "320.00",
    storePrice: null,
  },
  {
    id: "soda-300ml",
    name: "Soda 300ml",
    category: "Goods",
    unit: "pcs",
    buyingPrice: "35.00",
    restaurantPrice: null,
    canteenPrice: "90.00",
    storePrice: "50.00",
  },
  {
    id: "mineral-water-500ml",
    name: "Mineral Water 500ml",
    category: "Goods",
    unit: "pcs",
    buyingPrice: "20.00",
    restaurantPrice: "60.00",
    canteenPrice: "55.00",
    storePrice: null,
  },
];
