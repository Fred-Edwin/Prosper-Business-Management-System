// The audit domain reuses the same `DomainError` shape as every other
// module (CONVENTIONS.md §3 — `code` + `message` + optional `field`).
export { DomainError } from "@/lib/domain/catalog/errors";
