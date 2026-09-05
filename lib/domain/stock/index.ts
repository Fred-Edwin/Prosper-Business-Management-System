// Public surface of the stock domain module. Route handlers and (Sessions
// 7-8) the frontend import from here:
//   import { recordTransfer, getDerivedStockBalance } from "@/lib/domain/stock"

export { DomainError } from "./errors";
export * from "./types";

export {
  getDerivedStockBalance,
  getDerivedStockBalances,
  getTotalStockByProduct,
} from "./derived-balance";
export { setOpeningStock } from "./opening-stock";
export {
  recordPurchasePayment,
  recordPurchaseReceipt,
  recordPurchaseReceiptBatch,
  type RecordPurchaseReceiptBatchInput,
} from "./purchases";
export {
  recordKitchenIssue,
  recordProduction,
  recordKitchenIssueBatch,
  recordProductionBatch,
  type RecordKitchenIssueBatchInput,
  type RecordProductionBatchInput,
} from "./issue-production";
export {
  recordNonSaleConsumption,
  recordNonSaleConsumptionBatch,
  type RecordNonSaleConsumptionBatchInput,
} from "./consumption";
export {
  recordTransfer,
  acceptTransfer,
  flagTransfer,
  recordTransferBatch,
  type RecordTransferBatchInput,
} from "./transfer";
export { correctMovement } from "./correct-movement";
export {
  listMovements,
  listOutstandingPurchases,
  listOutstandingPurchasesForLocation,
} from "./list-movements";
export { resolveReceivingDestinationIds } from "./receiving-scope";
