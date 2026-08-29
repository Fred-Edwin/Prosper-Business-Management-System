// The financials domain reuses the same `DomainError` shape as catalog
// (CONVENTIONS.md §3 — `code` + `message` + optional `field`), mirroring
// `lib/domain/stock/errors.ts`. Route handlers catch it and translate 1:1
// into `fail(e.code, e.message, e.field)`.
export { DomainError } from "@/lib/domain/catalog/errors";
