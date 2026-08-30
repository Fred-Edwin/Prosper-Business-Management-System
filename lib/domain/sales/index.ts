// Public surface of the sales domain module. Route handlers import from here:
//   import { createOrder, editOwnOrder, correctOrder, listOrders } from "@/lib/domain/sales";
//   import { recordStockCount, voidStockCount, listDerivedSales } from "@/lib/domain/sales";
//
// Two slices, one folder (ADR-16 — canteen sales share the Restaurant
// reporting model):
//   - Restaurant orders (M2-F1, S4): create / edit-own / correct / list.
//   - Canteen derived sales (M2-F3, S5): recordStockCount + derivation.

export { DomainError } from "./errors";
export * from "./types";

export { createOrder } from "./create-order";
export { editOwnOrder } from "./edit-own-order";
export { correctOrder } from "./correct-order";
export { listOrders } from "./list-orders";

export { recordStockCount, voidStockCount } from "./record-stock-count";
export {
  getDerivedSalesForProduct,
  listDerivedSales,
} from "./derived-sales";
