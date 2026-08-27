// The stock domain reuses the same `DomainError` shape as catalog
// (CONVENTIONS.md §3 — `code` + `message` + optional `field`). Rather than
// duplicate the class, we re-export catalog's. If a third domain module
// appears it is worth lifting to `lib/domain/errors.ts`; two is not.
export { DomainError } from "@/lib/domain/catalog/errors";
