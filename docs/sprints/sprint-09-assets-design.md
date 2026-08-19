# Sprint 09 — Assets (Design)

**Type:** Design Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Assets (PRD §4.10)
**Status:** not started

---

## Scope

Screens for the Admin's equipment/furniture register, designed in
Paper.design against the approved component library
(`docs/design/design-principles.md` + Phase 2 Paper library), then
assembled into real routed pages/components running on mock data.

- Asset list (name, location, purchase date, cost, condition/status;
  shows soft-deleted state).
- Create/edit asset form.
- Soft-delete action + hard-delete flow with confirmation friction
  (retype asset name) — same pattern as Products.
- `docs/design/flows/assets-flow.md` — written now, per sdlc.md
  Phase 3.1.

## Acceptance Criteria

- Screens designed in Paper.design using only existing library
  components, iterated with the Admin until approved in Paper.design.
- Once approved, assembled directly into their real Next.js routes
  under `(admin)`, wired with mock data behind the same interface real
  data will use, every mock source marked `TODO(mock)` per
  `CONVENTIONS.md` §4.
- Hard-delete requires exact name retype before the action enables.
- Mobile-first responsive layout verified at phone width; also usable
  at laptop width for the Admin.
- No real API calls, database queries, or business logic in this
  sprint — mock data only.
