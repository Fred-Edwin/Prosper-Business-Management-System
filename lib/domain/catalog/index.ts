// Public surface of the catalog domain module. Route handlers import from
// here: `import { createProduct, ... } from "@/lib/domain/catalog"`.

export { DomainError } from "./errors";
export * from "./types";

export { listProducts } from "./list-products";
export { getProduct } from "./get-product";
export { createProduct } from "./create-product";
export { updateProduct } from "./update-product";
export { archiveProduct, unarchiveProduct, hardDeleteProduct } from "./delete-product";
export { listLocations } from "./locations";
