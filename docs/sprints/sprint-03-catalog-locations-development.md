# Sprint 03 — Catalog & Locations (Development)

**Type:** Development Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Catalog & Locations (PRD §4.1)
**Status:** not started

---

## Scope

Find every `TODO(mock)` marker left by Sprint 02 and replace that data
source with real logic — `lib/domain/catalog`, Zod schemas, API routes.
No new UI/UX decisions in this sprint; if a design question surfaces
that the approved Paper.design screens or flow doc don't answer, it
goes back to a design sprint rather than being decided here.

- `GET /api/locations`, `GET /api/products`, `POST /api/products`,
  `PATCH /api/products/:id`, `POST /api/products/:id/soft-delete`,
  `POST /api/products/:id/hard-delete`,
  `POST /api/products/:id/locations`.
- Domain rules: Dish `buying_price` forced to `0` (ADR-33); hard-delete
  blocked with `409 CONFLICT` if any linked `StockMovement`/`OrderLine`
  exists (ADR-23); buying price stripped from API responses for
  non-Admin roles.
- Role/auth checks: all mutating routes Admin-only; `GET /api/products`
  open to all roles with field-stripping.
- Audit log writes for create, soft-delete, hard-delete, and non-ledger
  metadata edits (name/unit_label changes) per ADR-25.

## Acceptance Criteria

- All endpoints match `API.md` request/response shapes and the standard
  error shape (`CONVENTIONS.md` §3).
- Dish creation always persists `buying_price = 0` regardless of
  request body.
- Hard-delete on a product with linked history returns `409`; on a
  clean product, succeeds.
- Non-Admin `GET /api/products` response never includes `buying_price`.
- Every mutating action produces an `AuditLog` row.
- Every `TODO(mock)` marker from Sprint 02 resolved; approved UI from
  Sprint 02 unchanged.
- **Tests:** unit tests for the hard-delete guard (blocked vs. allowed),
  the Dish buying-price-forced-to-zero rule, and role-based
  field-stripping; a basic end-to-end test for create → soft-delete →
  verify hidden from list but present in DB.
