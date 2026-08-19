# Sprint 04 — Catalog & Locations (QA)

**Type:** QA Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Catalog & Locations (PRD §4.1)
**Status:** not started

---

## Scope

Adversarial testing of the completed feature (Sprints 02–03).

- Attempt hard-delete on products with each type of linked history
  (stock movement, order line) — confirm blocked.
- Attempt to set a non-zero buying price on a Dish via direct API call
  (bypassing UI) — confirm server forces it to 0.
- Attempt product mutations as non-Admin roles — confirm
  `403 FORBIDDEN`.
- Confirm soft-deleted products stay linked/visible in historical
  records (e.g. old orders) despite disappearing from active lists.
- Boundary/invalid input: missing required fields, wrong kind enum,
  negative prices, duplicate `(product_id, location_id)` in
  `ProductLocation`.

## Acceptance Criteria

- All adversarial cases produce the correct error code/behavior, not a
  crash or silent success.
- No regressions in Sprint 03's test suite.
- Findings logged and fixed before sprint closes; re-verified.
