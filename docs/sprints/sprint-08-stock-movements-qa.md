# Sprint 08 — Store & Stock Movements (QA)

**Type:** QA Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Store & Stock Movements (PRD §4.2)
**Status:** not started

---

## Scope

Adversarial testing across all movement types and the correction/close
interaction (Sprints 05–07).

- Attempt each movement type as a role that shouldn't be able to record
  it — confirm `403`.
- Record a purchase receipt with no matching payment, and a payment
  with no receipt — confirm both surface correctly and neither silently
  disappears.
- Attempt a correction on a closed-day movement as non-Admin — confirm
  blocked; as Admin — confirm allowed and the delta is correct.
- Transfer with an invalid location pair (e.g. same source and
  destination) — confirm rejected.
- Non-sale consumption with reason = Other and an empty note — confirm
  rejected at both form and API level (bypass UI, hit API directly).
- Concurrent-looking sequences: multiple movements for the same
  product/location on the same day — confirm the stock sum stays
  correct after a correction is layered on top.
- Business-day boundary check: a movement timestamped near midnight UTC
  lands on the correct Africa/Nairobi business day.

## Acceptance Criteria

- All adversarial cases produce correct error codes, not crashes or
  silent incorrect state.
- No regressions in Sprint 06/07 test suites.
- Findings logged and fixed before sprint closes; re-verified.
