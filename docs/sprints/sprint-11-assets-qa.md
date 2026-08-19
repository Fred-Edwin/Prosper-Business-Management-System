# Sprint 11 — Assets (QA)

**Type:** QA Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Assets (PRD §4.10)
**Status:** not started

---

## Scope

Adversarial testing of the completed feature (Sprints 09–10) against
its acceptance criteria, the approved Paper.design screens, and
`docs/design/flows/assets-flow.md`.

- Attempt hard-delete with a mismatched `confirm_name` — confirm
  rejected.
- Attempt asset mutations as non-Admin roles — confirm `403`.
- Boundary input: missing required fields, invalid `purchase_date`,
  negative `purchase_cost`.
- Check built feature against the approved design/flow doc — flag any
  mismatch.

## Acceptance Criteria

- A findings report (severity + reproduction steps) is produced first;
  no fixes applied without explicit approval.
- All adversarial cases produce correct error codes once fixed.
- No regressions in Sprint 10's test suite.
