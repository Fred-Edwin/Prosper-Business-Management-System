# Sprint 02 — Catalog & Locations (Design)

**Type:** Design Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Catalog & Locations (PRD §4.1)
**Status:** not started

---

## Scope

Screens and flow for the Admin to manage locations and products,
designed in Paper.design against the approved component library
(`docs/design/design-principles.md` + Phase 2 Paper library), then
assembled into real routed pages/components running on mock data.

- Product list (filter by kind: Ingredient/Dish/Goods; shows
  soft-deleted state).
- Create/edit product form (kind-conditional fields: buying price for
  Ingredient, nothing for Dish, buying + selling price for Goods; unit
  label).
- Product-location assignment screen (which locations sell this
  product, per-location selling price).
- Soft-delete action + hard-delete flow with confirmation friction
  (retype product name).
- Location list (read-mostly — locations are seeded, not created via UI
  per v1 scope, but viewable).
- `docs/design/flows/catalog-locations-flow.md` — written now, per
  sdlc.md Phase 3.1.

## Acceptance Criteria

- Screens designed in Paper.design using only existing library
  components (no one-off inventions without flagging them), iterated
  with the Admin until approved in Paper.design.
- Once approved, assembled directly into their real Next.js routes
  under `(admin)`, wired with mock data behind the same interface real
  data will use, every mock source marked `TODO(mock)` per
  `CONVENTIONS.md` §4.
- Kind-conditional form fields behave correctly in the UI (switching
  kind changes visible fields).
- Hard-delete requires exact name retype before the action enables.
- Mobile-first responsive layout verified at phone width; also usable
  at laptop width for the Admin.
- No real API calls, database queries, or business logic in this
  sprint — mock data only.
