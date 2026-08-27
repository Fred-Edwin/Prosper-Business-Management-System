// Public surface of the stock domain module. Route handlers and (Sessions
// 7-8) the frontend import from here:
//   import { recordTransfer, getDerivedStockBalance } from "@/lib/domain/stock"

export { DomainError } from "./errors";
export * from "./types";

export {
  getDerivedStockBalance,
  getDerivedStockBalances,
} from "./derived-balance";
export { setOpeningStock } from "./opening-stock";
export { recordPurchasePayment, recordPurchaseReceipt } from "./purchases";
export { recordKitchenIssue, recordProduction } from "./issue-production";
export { recordNonSaleConsumption } from "./consumption";
export { recordTransfer, acceptTransfer, flagTransfer } from "./transfer";
export { correctMovement } from "./correct-movement";
export { listMovements, listOutstandingPurchases } from "./list-movements";
