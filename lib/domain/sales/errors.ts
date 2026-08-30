// The sales domain shares the single `DomainError` class (an API `code` +
// optional `field`) that every other domain module uses. Re-exported here
// so `lib/domain/sales` files import it locally, mirroring
// `lib/domain/stock/errors.ts`.
export { DomainError } from "@/lib/domain/catalog/errors";
