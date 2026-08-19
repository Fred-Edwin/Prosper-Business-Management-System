# Sprint 07 — Store & Stock Movements (Development Part 2: Issue, Production, Transfer, Non-Sale Consumption)

**Type:** Development Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Store & Stock Movements (PRD §4.2)
**Status:** not started

---

## Scope

Find the remaining `TODO(mock)` markers from Sprint 05 (four movement
types, plus opening/closing stock computation) and replace them with
real logic. No new UI/UX decisions in this sprint; a design question not
answered by the approved Paper.design screens or flow doc goes back to a
design sprint rather than being decided here.

- `POST /api/stock-movements` for `issue`, `production`, `transfer`,
  `non_sale_consumption`.
- Opening/closing stock computed on read (ADR-11) — prior day's closing
  sum, with Admin manual adjustment applied as an `opening`-type
  correction row.
- Role checks per movement type (Store Manager for issue/production;
  Store Manager or Attendant for transfer; any staff for non-sale
  consumption).
- `reason`/`reason_note` validation (required for non-sale consumption;
  note required if reason = other).
- `GET /api/stock-movements` with role-scoped filtering (Admin sees
  all, Store Manager/Attendant see their location only).

## Acceptance Criteria

- Transfer correctly debits the source location and credits the
  destination location (two-sided effect from one entry, per
  `transfer_counterpart_location_id`).
- Non-sale consumption rejects submission without a reason, and without
  a note when reason = other.
- Opening stock for a new day correctly equals the prior day's closing
  sum plus any Admin override.
- Store Manager/Attendant `GET` requests never see other locations'
  movements.
- All remaining `TODO(mock)` markers from Sprint 05 resolved; approved
  UI unchanged.
- **Tests:** unit tests for transfer's two-sided effect, non-sale
  consumption validation, opening-stock carry-forward including an
  Admin override case, and location-scoped list filtering.
