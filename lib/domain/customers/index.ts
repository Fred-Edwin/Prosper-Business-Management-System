// Public surface of the customers domain module (Customers & Credit).
// Route handlers import from here:
//   import { createCustomer, listCustomers } from "@/lib/domain/customers";
//
// `recordDebt` is exported for S4's `createOrder` to call inside its
// transaction for a credit order — it has no route. `correctCanteenDebt` /
// `voidCanteenDebt` are exported for `lib/domain/sales`'s
// `correctCanteenCreditSale` / `voidCanteenCreditSale` to call the same way
// (ADR-91) — they have no route either.

export { DomainError } from "./errors";
export * from "./types";

export { createCustomer } from "./create-customer";
export { listCustomers } from "./list-customers";
export { archiveCustomer, unarchiveCustomer } from "./archive-customer";
export { getCustomerLedger } from "./get-customer-ledger";
export { recordRepayment } from "./record-repayment";
export { correctRepayment, voidRepayment } from "./correct-repayment";
export { recordDebt } from "./record-debt";
export { correctDebt } from "./correct-debt";
export { correctCanteenDebt, voidCanteenDebt } from "./correct-canteen-debt";
