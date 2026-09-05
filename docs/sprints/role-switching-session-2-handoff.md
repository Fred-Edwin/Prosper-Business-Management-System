# Admin Role Switching — Session 2 (Frontend + Check) Handoff

**Not tied to a milestone plan** — ad hoc cross-cutting feature. Session 1
(backend) is done and on `main` (uncommitted working tree as of writing).
This doc + `docs/PROGRESS.md` ("Admin role-switching — Session 1") are the
only continuity. Session 1's handoff
(`role-switching-session-1-handoff.md`) has the *why* and the original
scope; this doc has the *as-built* contract.

## Read first, in order

1. This document, in full.
2. `role-switching-session-1-handoff.md` — the feature's intent. The
   "not impersonation" rule is non-negotiable: every write stays
   attributed to the real Admin id. Do not re-open the dual-attribution
   question.
3. `CLAUDE.md`'s standard before-you-start list — the current design
   docs, `CONVENTIONS.md` §6, and **one or two sibling screens**. The
   switcher is a header control + a drawer/picker; the closest siblings
   are the admin-shell header triggers (`app/admin/staff/roster-tab.tsx`,
   `app/admin/catalog/*` publish a trigger up to the shell) and any
   existing `<Drawer>` + `<PillFilter>` / select screen.
4. The Paper design: file `01M0EZ7TAHZM26KBMWNYT0928X`, page **"M7 —
   Admin role switching"**, 4 artboards. Copy exact values with
   `get_computed_styles` / `get_jsx` — never eyeball (CONVENTIONS §6).
5. `lib/auth/roles.ts` (`effectiveRole`), `lib/auth/acting-as.ts`,
   `lib/api/require-role.ts` + `require-role-in.ts` (the
   `requireActingRole*` variants), `lib/auth/session.ts`
   (`requireActingRole` page guard) — the seams you wire into.

## Your role for this session

Frontend + check half of the build loop (`docs/sdlc.md` Phase 3). Compose
the switcher UI from the frozen kit following a sibling screen; wire it to
the Session 1 backend through a per-feature hook (`use-acting-as` or
similar). Then **check**: run `pnpm dev`, drive it as the Admin (switch
in, do a staff task, switch back) and as each real staff role (confirm
they see nothing and cannot switch), try to break it, fix what breaks.
Add jsdom + RTL screen specs under `tests/screens/`.

Do **not** change the backend contract below without saying so in your
PROGRESS entry. If the design needs a backend change, that's a
conversation with the owner first.

## What Session 1 shipped — the as-built contract

### Token / session shape

`session.user` gained two fields (`lib/auth/types.d.ts`):

| field | type | meaning |
|---|---|---|
| `actingAs` | `Role \| null` | the staff role the Admin is working under; `null` = normal Admin (and always `null` for a real staff user) |
| `actingLocationId` | `string \| null` | the `Location.id` she's scoped to while `actingAs` is a location-bound role; `null` when `actingAs` is `null` |

Both are **display/scoping context only**. `session.user.id` and
`session.user.role` are the unchanged real identity.

`effectiveRole(session)` (`lib/auth/roles.ts`) = `actingAs ?? role`. Use
it wherever the frontend needs "which role's screens/nav is this?" — the
shell nav, `roleHomePath` redirects, the "you are acting as X" banner.
The real `session.user.role` is what tells you whether to render the
switcher at all (only `"admin"`).

### The route: `POST /api/auth/acting-as`

Guard: `requireApiRole("admin")` — the **real** role. An Admin who has
already switched still passes (she must, to switch back). A real staff
user gets `403`.

**Request body** (Zod `actingAsSchema`, `lib/validation/auth.ts`):
```ts
{ role: "admin" | "store_manager" | "cashier" | "canteen_attendant" | null,
  locationId?: string /* uuid */ }
```
- `role: null` (or `"admin"`) → "Exit to Admin". `locationId` ignored.
- `role` is a staff role → `locationId` **required**, must be a real,
  **active** `Location` whose `type` matches the role
  (`store_manager`→`store`, `cashier`→`restaurant`,
  `canteen_attendant`→`canteen`).

**Success response** (`{ data: ... }`, HTTP 200):
- clear: `{ actingAs: null }`
- set:   `{ actingAs, locationId, locationName, locations: [{ id, name }] }`
  - `locationName` is the resolved location's display name — show this in
    the banner, don't re-fetch.
  - `locations` is **every active location of the matching type**. Use it
    for the picker: 0 → the role has no location set up (block with a
    message); 1 → auto-select, no picker needed; >1 → show the picker,
    pre-selecting nothing, and POST again with the chosen `locationId`.

**Errors** (CONVENTIONS §3 shape): `403 FORBIDDEN` (not a real Admin),
`400 VALIDATION_ERROR` (missing/invalid/wrong-type/inactive/nonexistent
`locationId` — `field: "locationId"`), `401 UNAUTHENTICATED`.

### Making the switch take effect — the session refresh

The route **does not** mutate the session cookie (next-auth v4 Credentials
+ JWT can't from a plain handler). The pattern:

1. `POST /api/auth/acting-as` with the desired `{ role, locationId }`.
2. On `200`, call `useSession().update({ actingAs, locationId })` from
   the client (the object shape the `jwt` callback expects — keys
   `actingAs` and `locationId`, note **not** `actingLocationId` here).
3. The `jwt` callback (`lib/auth/config.ts`) re-runs `resolveActingAs`
   server-side on that `update` — the client payload is re-validated, not
   trusted. If it's invalid the token is left unchanged (the route
   already returned the real error in step 1, so the UI should key off
   the route response, not the `update` result).
4. `router.refresh()` (or navigate to `roleHomePath(effectiveRole)`) so
   Server Components re-read the new session.

To **exit**: same flow with `{ role: null }` then
`update({ actingAs: null })`.

Consider a small helper hook that does 1–4 and exposes
`{ actingAs, actingLocationId, locationName, switchTo, exit, pending }`.

### Guards you must wire (Session 2's job)

Session 1 added the helpers but did **not** repoint the layouts/routes
that gate staff screens — that's you:

- **Page layouts.** `app/store-manager/layout.tsx`,
  `app/cashier/layout.tsx`, `app/canteen/layout.tsx` currently call
  `requireRole("store_manager")` etc. Swap to
  `requireActingRole("store_manager")` (from `lib/auth/session.ts`) so an
  Admin acting as that role renders the screen. **Leave
  `app/admin/layout.tsx` on `requireRole("admin")`** — the real role, so
  an acting-as Admin still reaches `/admin` and the switcher.
- **API routes serving staff screens.** Where a `/api/*` handler backs a
  staff screen and currently uses `requireApiRole("cashier")` /
  `requireApiRoleIn([...staff])`, swap to `requireActingRole` /
  `requireActingRoleIn` (`lib/api/require-role*.ts`) so the acting-as
  Admin's requests are admitted. **Never** for `/api/admin/*` — those
  helpers refuse `"admin"` anyway, by design.
  - The staff **create / edit-own** routes already pass
    `effectiveRole(auth)` into the domain `ctx` (Session 1), but their
    *guard* is still `requireApiRole*` against the real role — so an
    acting-as Admin is currently **rejected at the guard** before the
    ctx matters. Swapping the guard is what makes them reachable.
  - Routes touched by Session 1 (guard still needs swapping):
    `app/api/orders/route.ts` POST, `app/api/orders/[id]/route.ts`,
    `app/api/canteen/stock-counts/route.ts` + `[id]`,
    `app/api/handovers/route.ts` POST + `[id]`,
    `app/api/customers/[id]/repayments/route.ts`,
    `app/api/stock-movements/route.ts`.
  - **Correction routes** (`orders/[id]/correct`, `handovers/[id]/correct`,
    `expenses/[id]/correct`, `stock` correct-movement) were left on the
    real role on purpose — an Admin acting as staff keeps her authority
    to correct sealed days. Don't swap these.
- **GET list-scoping.** Session 1 only repointed `stock-movements` GET to
  `resolveActorLocationId(auth)` (session form). The other staff GET
  handlers still pass `auth.user.id` — audit each one the switcher's
  screens will hit and pass the `Session` instead so the Admin sees the
  acting location's data, not "everywhere".
- **Middleware.** There is no `middleware.ts` today and `isRoleAllowed`
  has no caller — page/route gating is all in the layouts + `requireApi*`
  helpers above. If you add client-side nav gating, use `effectiveRole`.

### `resolveActorLocationId` — new signature

`lib/api/actor-location.ts` now takes `string | Session`. Pass the
**`Session`** from any staff route so an acting-as Admin resolves to
`session.user.actingLocationId`. The `string` (userId) form keeps the old
behaviour (admin → `null`) and is still used by batch-auth-by-id.

## UI notes (from the design + kit rules)

- Switcher lives in the admin shell header (sibling: the shell trigger
  pattern in `components/shells/admin-shell.tsx` + the tabs that publish
  triggers up to it). Compose from `<Drawer>` / `<PillFilter>` /
  `<FormField>` select — **do not** build a new kit component. If the
  design needs a pattern the kit has no answer for, **stop and ask the
  owner**.
- While `actingAs` is set: a persistent "You're acting as {Role} at
  {locationName} — Exit to Admin" banner (design artboard 3/4). The
  effective-role nav replaces the Admin nav; the "Exit" action is always
  reachable.
- Token hygiene, structural parity, no raw hex — run the CONVENTIONS §6
  audit passes before calling it done.

## Gate

`pnpm typecheck`, `pnpm test`, `pnpm build` green. jsdom + RTL screen
specs under `tests/screens/` for: the switcher opening, picking a role
with >1 location, the auto-select path, exiting, and the real-staff-user
case (no switcher rendered). Owner walkthrough per CONVENTIONS §6 —
drive it as the Admin and as each staff role before "done".

## End of session

Update `docs/PROGRESS.md` (new entry, "Admin role-switching — Session 2",
following the Session 1 entry's format). If you deviated from this
contract, say so explicitly there. No milestone plan to update (there
isn't one — don't create one).
