// Public surface of the customers domain module (Customers & Credit).
// Route handlers import from here:
//   import { createCustomer, listCustomers } from "@/lib/domain/customers";
//
// `recordDebt` is exported for S4's `createOrder` to call inside its
// transaction for a credit order — it has no route.

export { DomainError } from "./errors";
export * from "./types";

export { createCustomer } from "./create-customer";
export { listCustomers } from "./list-customers";
export { getCustomerLedger } from "./get-customer-ledger";
export { recordRepayment } from "./record-repayment";
export { recordDebt } from "./record-debt";
