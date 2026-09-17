// Public surface of the suppliers domain module (Suppliers & Vendors).
// Route handlers import from here:
//   import { createSupplier, listSuppliers } from "@/lib/domain/suppliers";

export { DomainError } from "./errors";
export * from "./types";

export { createSupplier } from "./create-supplier";
export { listSuppliers } from "./list-suppliers";
export { archiveSupplier, unarchiveSupplier } from "./archive-supplier";
