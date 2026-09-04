// Public surface of the financials domain module (the money ledger).
// Route handlers and other domain modules import from here:
//   import { getAccountBalances } from "@/lib/domain/financials";
//
// `recordMoneyMovement` is exported for other *domain* modules to call
// (repayments here; orders + canteen sales in S4/S5) — it has no route.

export { DomainError } from "./errors";
export * from "./types";

export { recordMoneyMovement } from "./record-money-movement";
export {
  getAccountBalances,
  serialiseAccountBalances,
} from "./get-account-balances";

export {
  recordExpense,
  correctExpense,
  listExpenses,
  businessDateNoonUtc,
} from "./expenses";
export {
  recordOwnerTransaction,
  listOwnerTransactions,
  getOwnerOwedToBusiness,
  getOwnerDrawsForPeriod,
} from "./owner-transactions";
export { getFinancialSummary } from "./get-financial-summary";
export {
  getDishWasteCostPercent,
  DEFAULT_DISH_WASTE_COST_PERCENT,
} from "./config";
