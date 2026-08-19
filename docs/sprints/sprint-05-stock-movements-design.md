# Sprint 05 — Store & Stock Movements (Design)

**Type:** Design Sprint
**Milestone:** 1 — The business exists in the system
**Feature:** Store & Stock Movements (PRD §4.2)
**Status:** not started

---

## Scope

Screens and flow for every movement-recording action, designed in
Paper.design against the approved component library
(`docs/design/design-principles.md` + Phase 2 Paper library), then
assembled into real routed pages/components running on mock data.

- Admin: purchase payment form (supplier, product, quantity, cost,
  destination location, paid-from account).
- Store Manager / Canteen Attendant: purchase receipt confirmation
  screen (quantity actually arrived); "awaiting receipt" /
  "unmatched receipt" list view.
- Store Manager: issue form, production form.
- Store Manager / Canteen Attendant: transfer form (from/to location,
  product, quantity).
- Any staff: non-sale consumption form (reason dropdown incl. "Other" +
  required note).
- Stock level view per product/location (current stock, computed from
  mock movement list).
- Correction entry point ("Correct this" on any movement row) — UI
  only, mock data.
- `docs/design/flows/stock-movements-flow.md` — written now, per
  sdlc.md Phase 3.1.

## Acceptance Criteria

- Screens designed in Paper.design using only existing library
  components, iterated with the Admin until approved in Paper.design.
- Once approved, assembled directly into their real Next.js routes
  under the correct role-scoped groups, wired with mock data behind the
  same interface real data will use, every mock source marked
  `TODO(mock)` per `CONVENTIONS.md` §4.
- Non-sale consumption form blocks submit if reason = Other and note is
  empty.
- Purchase payment form has no stock-effect messaging (clarifies it's a
  money action only).
- "Awaiting receipt" / "unmatched receipt" views correctly surface
  mismatches in mock fixtures.
- No real API calls, database queries, or business logic in this
  sprint — mock data only.
