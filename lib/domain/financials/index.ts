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
