# Sprint 10 — Assets (Development)

**Type:** Development Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Assets (PRD §4.10)
**Status:** not started

---

## Scope

Find every `TODO(mock)` marker left by Sprint 09 and replace that data
source with real logic — `lib/domain/assets`, Zod schemas, API routes.
No new UI/UX decisions in this sprint; if a design question surfaces
that the approved Paper.design screens or flow doc don't answer, it
goes back to a design sprint rather than being decided here.

- `POST /api/assets`, `PATCH /api/assets/:id`,
  `POST /api/assets/:id/soft-delete`,
  `POST /api/assets/:id/hard-delete` (same pattern as Products,
  ADR-23).
- Hard-delete blocked with `409 CONFLICT` if any linked history exists.
- Audit log writes for create, edit, soft-delete, hard-delete.

## Acceptance Criteria

- All endpoints match `API.md` shapes and the standard error shape
  (`CONVENTIONS.md` §3).
- Hard-delete `confirm_name` must match exactly or the request is
  rejected.
- Every mutating action produces an `AuditLog` row.
- Every `TODO(mock)` marker from Sprint 09 resolved; approved UI
  unchanged.
- **Tests:** unit tests for the hard-delete guard and `confirm_name`
  matching.
