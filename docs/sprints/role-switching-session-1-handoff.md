# Admin Role Switching — Session 1 (Backend) Handoff

**Not tied to a milestone plan** — ad hoc cross-cutting feature, sized like
the opening-balances work (see `docs/PROGRESS.md`, "Opening balances +
Day-1 pinning"). No `docs/sprints/milestone-XX-plan.md` exists for this;
don't create one. This doc is the only continuity for session 1.

## Read first, in order

1. This document, in full.
2. `docs/CONVENTIONS.md` — naming, error shape, route-handler thinness
   rule (§ route handlers contain no business logic).
3. `lib/auth/config.ts`, `lib/auth/session.ts`, `lib/auth/roles.ts`,
   `lib/api/require-role.ts`, `lib/api/require-role-in.ts`,
   `lib/api/actor-location.ts` — the exact seams this session extends.
   Read them before writing anything; the design below depends on their
   current shape and will drift if you skim.
4. `lib/domain/audit/day-close-guard.ts` (`assertStaffDateIsToday`,
   `assertActorMayCorrectOnDate`) — the guard whose role-branch this
   session must repoint.

## Your role for this session

Act as the **backend** half of this feature's build loop (see
`docs/sdlc.md` Phase 3: backend → frontend → check). You are Session 1 of
2 (a Session 2 will do frontend + check against what you ship). Scope
strictly to `lib/auth/*`, `lib/api/*`, one new route, and the domain
guards named below — **do not** touch anything under `app/**`,
`components/**`, or write any UI. If you find yourself editing a
`.tsx` file, stop — that's Session 2's job.

## What this feature is

The owner (Admin) wants to switch which role's screens and permissions
she's working under — Store Manager, Cashier, or Canteen Attendant —
**without logging out**. This is explicitly **not impersonation**:

- She never becomes the staff member. Every write she makes is still
  recorded as **her own Admin user id** — `recordedById` / `userId` on
  every ledger row, `AuditLog.userId`, all unchanged from today.
- The only thing that changes is **which nav/screens/location-scoping
  she's viewing** — an `actingAs` mode layered on top of her real,
  unchanged Admin session.
- The owner was explicit: don't build dual-identity attribution, don't
  add an `impersonatedBy` column, don't touch `AuditLog`'s shape. The
  ledger keeps saying "Admin" — full stop. (An earlier design round
  considered true impersonation with dual attribution; the owner
  rejected it in favor of this simpler "acting as" model — see
  conversation history if you want the reasoning, but do not re-open
  that question. It's decided.)

The design (Paper file `01M0EZ7TAHZM26KBMWNYT0928X`, page "M7 — Admin
role switching", 4 artboards) is done and approved. This session doesn't
need to look at it — it has no bearing on backend work. Session 2 will
use it.

## The mechanism

Add one optional field to the session/JWT: **`actingAs: Role | null`**.

- The *real* identity (`session.user.id`, `session.user.role`) never
  changes and is never overwritten.
- `actingAs` is **display/scoping context only** — it changes what a
  request is scoped to, never who authenticated it.
- `effectiveRole(session)` = `actingAs ?? role`. This is the **one**
  place "what role am I acting as right now" gets computed. Every guard
  and scoping helper below must call it — none may re-derive this
  inline, or you'll get the same "one rule, one place" drift ADR-52
  already had to fix once for day-close.

### The one subtlety that needs its own test

`requireRole("admin")` / `requireApiRole("admin")` (the guards on
Admin-only routes, e.g. `/admin/*` pages and `/api/admin/*`) **must keep
checking the real `session.user.role`**, never `effectiveRole`. If they
checked `effectiveRole`, an Admin who switched to Store Manager would be
locked out of her own Admin routes — including the switcher itself — and
could never get back. Only the **four staff role-prefixes**
(`store_manager`, `cashier`, `canteen_attendant`, and role-scoped domain
guards) should compare against `effectiveRole`.

Write this as an explicit test case, not just an implicit consequence:
*"an Admin acting as Store Manager can still pass `requireRole('admin')`
and reach `/admin` / the switcher; a Store Manager (real role) cannot."*

## Concrete tasks

1. **`lib/auth/types.d.ts`** — add `actingAs: Role | null` to
   `Session.user`.

2. **`lib/auth/config.ts`** — `jwt` and `session` callbacks read/write
   `actingAs` on the token. It's set via the new route below, not the
   Credentials `authorize()` flow. Preserve the existing `active`
   re-check behavior untouched.

3. **`lib/auth/roles.ts`** — add:
   ```ts
   export function effectiveRole(session: { user: { role: Role; actingAs: Role | null } }): Role {
     return session.user.actingAs ?? session.user.role;
   }
   ```
   Keep `ROLE_ROUTE_PREFIXES`, `roleHomePath`, `routePrefixForPath`,
   `isRoleAllowed` as-is; session 2 will call `effectiveRole` before
   using these where it needs the acting role instead of the real one.

4. **New route: `POST /api/auth/acting-as`**
   - Body: `{ role: Role | null; locationId?: string }` (Zod-validated
     per `lib/validation/*` convention — add `lib/validation/auth.ts` or
     extend the existing one; check what's there first).
   - `role: null` clears `actingAs` (the "Exit to Admin" action).
   - Guard: caller's **real** `session.user.role` must be `"admin"` —
     use `requireApiRole("admin")`, not `effectiveRole`. Only a real
     Admin may enter or exit acting-as mode.
   - When `role` is one of the three staff roles, `locationId` is
     required and must resolve to a real, active `Location` whose
     `type` matches that role's expected `LocationType`
     (`store_manager`→`store`, `cashier`→`restaurant`,
     `canteen_attendant`→`canteen`). **Do not hardcode a single
     location per role** — query `Location` for all active locations of
     the matching type. If there's exactly one, the frontend can
     auto-select it; if more than one exists, session 2's picker needs
     the list, so this route's success response should return the
     resolved `{ role, locationId, locationName }` for the frontend to
     display, not just echo the input.
   - Response: standard `ok(...)` / `fail(...)` shape (`lib/api/response.ts`).
   - This route updates the session via whatever `next-auth` v4 pattern
     this app already uses for session mutation post-login (check
     `lib/auth/change-own-pin.ts` and its route for a precedent — it
     already mutates something about the logged-in user mid-session;
     follow its pattern for triggering a session refresh, don't invent
     a new one).

5. **`lib/api/actor-location.ts` (`resolveActorLocationId`)** — when
   `effectiveRole(session) !== "admin"`, resolve location the way a real
   staff member of that role would: **from the acting-as session's
   `locationId`** (stored in the token alongside `actingAs`), not from
   `User.staff.locationId` (the Admin has no `Staff` row). Add
   `locationId` to the token/session shape alongside `actingAs` in step
   1–2 above — they're set together by the new route and cleared
   together on exit.

6. **`lib/api/require-role.ts` / `require-role-in.ts`** — add
   `effectiveRole`-aware variants, or a parameter, so route handlers
   serving the four staff route-prefixes can opt into comparing against
   `effectiveRole` while `/api/admin/*` handlers keep comparing against
   the real role. Naming/shape is your call — follow the existing
   `requireApiRole` / `requireApiRoleIn` doc-comment style; whichever
   shape you land on, make the "admin-only routes never use
   `effectiveRole`" rule impossible to get backwards by accident (e.g.
   don't make `effectiveRole`-checking the default with an opt-out).

7. **`lib/domain/audit/day-close-guard.ts`** —
   `assertStaffDateIsToday(value, actor)` currently special-cases
   `actor.role === "admin"` as unrestricted. When acting-as is active,
   the **acting** role's restriction should apply (she's doing the Store
   Manager's job, so she gets the Store Manager's "today only" rail) —
   pass `effectiveRole(session)` as `actor.role` from the call sites that
   are reachable while acting-as, not the literal `session.user.role`.
   Same principle for `assertActorMayCorrectOnDate` if it has a similar
   admin-branch — check it before assuming it's identical to
   `assertStaffDateIsToday`'s shape.

8. **Page-level guard** — `lib/auth/session.ts`'s `requireRole` is used
   by **layouts** (`app/admin/layout.tsx`, `app/store-manager/layout.tsx`,
   etc.), which is Session 2's territory to wire up, but this session
   should make `requireRole` support the same effectiveRole-aware
   comparison so Session 2 isn't blocked. Mirror whatever pattern you
   chose in task 6.

## Tests (write these; don't defer to session 3)

- `lib/auth/roles.test.ts` — `effectiveRole` (both branches:
  `actingAs` set, `actingAs` null).
- New route test for `POST /api/auth/acting-as` — covers: non-admin
  caller rejected; admin sets `store_manager` + valid `locationId`
  succeeds; invalid `locationId` (wrong type, inactive, nonexistent)
  rejected; `role: null` clears both `actingAs` and `locationId`;
  multiple active locations of the same type surfaces the correct list
  behavior (don't silently pick one).
- Guard test addition (the subtlety above): admin acting-as-staff can
  still pass `requireRole("admin")`; the reverse never happens.
- `day-close-guard.test.ts` addition: an admin acting as a staff role is
  bound by that role's "today only" rule; a real admin (no acting-as) is
  not.

## Gate

`pnpm typecheck` and `pnpm test` green. No `TODO(mock)` introduced — grep
for it before calling this done. No schema migration — `actingAs` /
`locationId` live only in the JWT/session, not the database; there is
nothing to persist and nothing new in `AuditLog` (writes still attribute
to the Admin, unchanged).

## End of session

Before finishing:
- Write a `docs/sprints/role-switching-session-2-handoff.md` (frontend +
  check) documenting exactly what you shipped, the final shape of
  `effectiveRole`, the `acting-as` route's request/response contract, and
  the token/session field names you settled on — Session 2 has no memory
  beyond what you write down.
- Add an entry to `docs/PROGRESS.md` following the existing entry format
  (see "Opening balances + Day-1 pinning" for the level of detail
  expected).
- If you deviated from anything specified above (naming, route shape,
  the single-vs-multiple-location handling), say so explicitly in both
  documents — don't let Session 2 discover it by reading diffs.
