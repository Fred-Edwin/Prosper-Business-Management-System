# Prosper — Progress Log

Running status log. The initial build (Milestones 1–5) is complete and the
app is with the client. **The project is now in maintenance mode** — see
`CLAUDE.md` and `docs/maintenance.md`.

**How this log is kept (so it doesn't inflate):**

- Each piece of maintenance work (a client fix, a small change, a new
  feature) gets one entry at the end of the session: date, what changed,
  which files/ADR, gate state (`pnpm test` / `typecheck` / `build`).
- Keep roughly the **last 15–20 entries** in full. When it grows past
  that, collapse the oldest into one-line rows under "Shipped — earlier
  milestones (ledger)" at the bottom. `docs/DECISIONS.md` (ADRs) is the
  durable "why" record; git history is the durable "what".

---

## Fix — long product name broke Stock ledger column alignment (2026-09-07) — DONE

The Admin Stock ledger (and every other `DenseLedger` consumer) renders as
flexbox rows, not an HTML `<table>` — row-to-row column alignment depends on
every cell being a fixed identical width. The Product cell was
`grow min-w-[140px]` with no `shrink` / `truncate` / `max-width`, so a long
name ("Potaoes za Mukimo (Kasuku)") widened that one flex cell past its slot
and pushed every numeric cell in that row out of column alignment with the
rows above and below (and with the header). The mobile `LedgerRowSummary`
already handled this with `min-w-0 truncate`; the desktop grid was
transcribed verbatim from a Paper artboard whose sample data was never long
enough to expose it.

- **Kit fix.** `components/kit/dense-ledger.tsx` — Product column class is now
  `grow shrink min-w-[140px] max-w-[280px] truncate`, applied identically at
  all three render sites (header / data row / footer) so the sticky-left
  divider stays one continuous line. Data row also gets `title={row.product}`
  so the full name is available on hover when clipped. Frozen-kit change, same
  footing as the ADR-37a Location column / this-session Non-Sale column — a
  bug fix restoring intended §4.3 behaviour ("the name is the only element
  allowed to give way"), not a new pattern.
- **Files:** `components/kit/dense-ledger.tsx`. No API, schema, or domain
  change. No new ADR (no contract changed).
- **Gates:** `pnpm typecheck` ✅ · `pnpm build` ✅ · `pnpm test` ✅

---

## Data fix — client-entered receipts reclassified as opening stock (2026-09-07) — DONE

During setup the client entered ~49 starting on-hand quantities via the
stock **Receive** flow instead of the **Opening Stock** button, writing
`purchase_receipt` `StockMovement` rows. No money was affected — a plain
receipt writes no `MoneyMovement` and creates no `purchase_payment` row
(`lib/domain/stock/purchases.ts`) — so there were no phantom payments to
unwind; only the COGS period classification was wrong (purchases term
inflated, opening-stock term empty → today's profit understated).

- **Production data only, no code change.** One-off `UPDATE` in the Neon
  SQL editor: the 49 rows (all dated 2026-09-07, none linked to a payment,
  none corrections) relabelled `movement_type = 'opening'` with
  `occurred_at` pinned to Day-1 00:00 Africa/Nairobi, matching
  `setOpeningStock` / `resolveOpeningDay` (ADR-70). Safe: no `DayClose`
  row, no prior `opening` / `opening_balance` row, and `opening` vs
  `purchase_receipt` sum identically into the derived balance so no
  on-hand quantity moved.
- **Verified after:** 0 `purchase_receipt` rows remain, 49 `opening` rows,
  no product/location with more than one opening, downstream issue /
  production / transfer rows untouched.
- Gate: not run — no repository change (docs only).

---

## In-app screen help — Staff roles (Developer — 2026-09-06) — DONE

Extends the Admin help panel (entry below) to the cashier, store-manager
and canteen screens — same **?** button, same `Drawer` panel, same
content model.

- `lib/help/topics.ts` — added ~25 staff `HelpTopic` entries: cashier
  (Today, New Order, Order detail, Customers, Handover, Log Non-Sale),
  store-manager (Hub, Stock Levels, the 5 movement flows), canteen (Hub,
  Stock Levels, Stock Count, Handover, Transfer Dispatch, Receive
  Transfer, Receive Goods, Log Non-Sale). Written from reading each
  screen + `FLOW_CONFIG`.
- `helpTopicForPath()` reworked — `[seg]` in a topic route is now a
  single-segment wildcard (`/cashier/orders/[id]`), an exact literal
  match always beats a wildcard, and each role base (`/cashier`,
  `/store-manager`, `/canteen`) matches only its home path.
- `HelpPanel` takes a `tab` prop instead of calling `useSearchParams()`
  itself — staff screens have no tabbed help and the staff layouts have
  no `<Suspense>` boundary; the Admin shell (already inside one) passes
  its `?tab=` value.
- `StaffShell` / `StaffDesktopShell` gain the same optional
  `headerAccessory` slot; `staff-shell-client.tsx` mounts the provider +
  panel and shows the **?** only when the route has a topic (real staff
  and acting-as Admin both get it).
- Tests: `tests/screens/help-panel.screen.test.tsx` extended to 10
  (staff base routes, wildcard `[id]`, flow-topic ranking).
- Gates: `pnpm test` green · `typecheck` clean · `build` clean.
- No `TODO(mock)`.

---

## In-app screen help — Admin (Developer — 2026-09-06) — DONE

Owner request: the manager should be able to tap a **?** in the header of
any screen and get a plain-language explanation of what that screen is
for and how to use it, so hand-over confusion is self-served.

- **New kit component** `components/kit/help-button.tsx` (owner-approved) —
  the header **?** affordance: 32×32 box, ships its own glyph + a fixed
  `aria-label`, `active` prop for the open-state tint. Same §9
  interaction states as `IconButton`.
- **Content** in `lib/help/` — one `HelpTopic` per Admin section (with
  per-`?tab=` overrides for the tabbed screens: Catalog, Sales,
  Financials, Staff, Assets). Written from reading each screen, NOT from
  the design/flow docs. `helpTopicForPath()` resolves by longest route
  prefix so nested routes (`/admin/customers/[id]`) still match.
- **Panel** `components/help/` — `HelpPanel` composes the frozen kit: rail
  `Drawer` + one `InstructionalBanner` per step + plain text blocks for
  "what it is" / "good to know" / related-screen links. `HelpProvider` +
  `useHelp()` is the channel between the shell's button and the panel.
- **Wiring** — `AdminShell` / `MobileShellAdmin` gain an optional
  `headerAccessory` slot (before the avatar); `admin-shell-client.tsx`
  mounts the provider + panel and passes the **?** button only when the
  current route has a topic.
- Staff-role screens (cashier / store-manager / canteen) are a later
  pass — same panel, same content model.
- Tests: `tests/screens/help-panel.screen.test.tsx` (new, 7 — route
  resolution, per-tab sections, open/content/close, no-topic → nothing).
- Gates: `pnpm test` 1200 pass · `typecheck` clean · `build` clean.
- No `TODO(mock)`.

---

## Admin role-switching — Session 1 (backend) (Developer — 2026-09-05) — DONE

Owner request, ad hoc (not tied to a milestone plan; sized like opening
balances). The Admin wants to work under a staff role's
screens/permissions — Store Manager, Cashier, or Canteen Attendant —
**without logging out**. Explicitly **not impersonation**: every write
stays attributed to her real Admin user id (`recordedById` / `userId` /
`AuditLog.userId` unchanged); `AuditLog` shape untouched; no
`impersonatedBy` column; no migration. The only thing that changes is
which nav/screens/location-scoping she sees.

Backend half of a 2-session build loop. Session 2 does frontend + check.

**Mechanism:** two optional JWT/session fields —
`session.user.actingAs: Role | null` and
`session.user.actingLocationId: string | null` — set and cleared
together. The real identity (`session.user.id` / `.role`) is never
overwritten. `effectiveRole(session) = actingAs ?? role` is the **one**
place "which role am I acting as?" is computed (`lib/auth/roles.ts`).

**What shipped:**
- `lib/auth/types.d.ts` — `actingAs` / `actingLocationId` on
  `Session["user"]` and the `next-auth/jwt` `JWT` interface.
- `lib/auth/roles.ts` — `effectiveRole(session)`. `ROLE_ROUTE_PREFIXES`,
  `roleHomePath`, `routePrefixForPath`, `isRoleAllowed` unchanged.
- `lib/auth/acting-as.ts` (new) — `resolveActingAs(realRole, role,
  locationId)` (the authoritative validator: real-Admin-only, `null` /
  `"admin"` clears, staff role needs a real **active** `Location` whose
  `type` matches — `store_manager`→`store`, `cashier`→`restaurant`,
  `canteen_attendant`→`canteen`) and `listActingAsLocations(role)` (the
  candidate list for Session 2's picker — no single location is
  hardcoded per role).
- `lib/auth/config.ts` — `jwt` callback initialises both fields to `null`
  on sign-in and, on `trigger === "update"` with an `actingAs` payload,
  **re-runs `resolveActingAs`** before writing the token (client payload
  is never trusted on its own); `session` callback copies both onto
  `session.user`. Existing `active` re-check untouched.
- `POST /api/auth/acting-as` (new) — guarded by `requireApiRole("admin")`
  (the **real** role — an Admin already acting-as must still reach this
  route to switch back). Validates via `resolveActingAs`; success
  payload is `{ actingAs: null }` on clear, else `{ actingAs, locationId,
  locationName, locations: [{id,name}] }`. Does **not** itself mutate the
  cookie (next-auth v4 can't from a handler) — Session 2's client calls
  `useSession().update({ actingAs, locationId })` after a 200.
- `lib/api/require-role.ts` / `require-role-in.ts` — added
  `requireActingRole(role)` / `requireActingRoleIn(roles)` that compare
  `effectiveRole(session)`. They **refuse `"admin"`** as an argument, so
  `/api/admin/*` handlers can't accidentally opt into effectiveRole
  checking. `requireApiRole` / `requireApiRoleIn` unchanged — always the
  real role.
- `lib/auth/session.ts` — added `requireActingRole(role)` page guard
  (same shape, effectiveRole-aware, refuses `"admin"`) for Session 2 to
  wire into the staff layouts. `requireRole` unchanged.
- `lib/api/actor-location.ts` — `resolveActorLocationId` now accepts a
  `Session` (as well as the old `userId` string). Given a session, an
  Admin whose `effectiveRole !== "admin"` resolves to
  `session.user.actingLocationId` (she has no `Staff` row). String
  callers keep the pre-role-switching behaviour.
- Staff **create / edit-own** routes now build their domain `ctx.role`
  from `effectiveRole(auth)` instead of `auth.user.role`
  (`app/api/orders/route.ts` POST, `orders/[id]` PATCH,
  `canteen/stock-counts` POST + `[id]` DELETE, `handovers` POST +
  `[id]` PATCH, `customers/[id]/repayments` POST, `stock-movements`
  POST per-type gate + GET). `recordedById` / `userId` stay the real
  Admin id. Correction routes (`assertActorMayCorrectOnDate`) were
  **deliberately left on `auth.user.role`** — authority to correct a
  sealed day is a real-identity power (an Admin acting as Cashier is
  still the Admin).

**Deviations from the handoff (flagged for Session 2):**
- Field name is **`actingLocationId`**, not `locationId`, on the
  token/session (avoids colliding with the many domain `locationId`s).
- Task 6/8 landed as **separate named functions** (`requireActingRole`
  *) rather than a parameter on the existing guards — the handoff left
  the shape to my judgement and asked for "impossible to get backwards";
  refusing `"admin"` at the type + runtime level does that.
- `assertStaffDateIsToday`'s dead `actorRole` branch in
  `lib/domain/stock/movement-core.ts` is still dead (no caller passes
  `actorRole`), so the stock route's `effectiveRole` change only affects
  the per-type role gate today, not a today-only rail. Noted for
  whoever wires `actorRole`.
- GET list-scoping was only repointed in `stock-movements`; the other
  staff GET handlers still pass `auth.user.id` — Session 2 should audit
  those when wiring the switcher's list views.

**Gate:** `pnpm typecheck` clean. `pnpm test` green. New tests — 2
`effectiveRole` cases (`lib/auth/roles.test.ts`), 11
`resolveActingAs` / `listActingAsLocations` (`lib/auth/acting-as.test.ts`,
DB), 10 route (`app/api/auth/acting-as/route.test.ts`), 10 guard-subtlety
(`lib/api/require-role.test.ts` — "admin acting as staff still passes
`requireApiRole('admin')`; a real staff role never does"), 1
day-close-guard case (`staff-today-guard.test.ts` — "an admin acting as a
staff role is bound by that role's today-only rule"). No `TODO(mock)`
introduced. No schema migration.

**Handoff:** `docs/sprints/role-switching-session-2-handoff.md`.

---

## Admin role-switching — Session 2 (frontend + check) (Developer — 2026-09-06) — DONE

Frontend + check half of the build loop against Session 1's backend
(commit `a6ee88c`). The Admin can now switch which staff role's
screens/scoping she works under — Store Manager, Cashier, Canteen
Attendant — without logging out, and switch back. Still **not
impersonation**: verified against the live DB that an order placed while
acting as Cashier has `cashierId`, its `AuditLog.userId`, and its `sale`
`StockMovement.recordedBy` all set to the **real Admin id**.

**What shipped (UI):**
- `app/admin/use-acting-as.ts` — the per-feature hook.
  `{ actingAs, locationName, pending, error, switchTo(role), exit() }`.
  `switchTo` resolves the role's single active location itself
  (`GET /api/locations`, filtered by the role's `LocationType`), POSTs
  `/api/auth/acting-as`, then `useSession().update({ actingAs, locationId })`
  and `router.push(roleHomePath(effectiveRole))` + `refresh()`. `exit()`
  is the same flow with `role: null`.
- `app/admin/workspace-switcher.tsx` — the switcher **popover**, a
  verbatim build of Paper `01M0EZ7TAHZM26KBMWNYT0928X` page "M7", artboard
  1, node "Workspace popover" (`TQF-0`): a `w-[240px]` panel in `--nav-*`
  tokens that grows up out of the sidebar footer — Admin row + check,
  divider, three staff rows with "<what> · <location>" hints, divider,
  "Recorded as Admin, acting as the selected role." note. Ships its own
  scrim + Esc-close + focus move (the kit has no popover; `<Drawer>` is
  Dialog-shaped and doesn't fit an anchored one). `placement="anchored"`
  positions against the trigger's `DOMRect`; with no rect (mobile) it
  falls back to a bottom sheet.
- `components/layout/acting-as-banner.tsx` — the persistent "Acting as
  {Role} at {location} — recorded as Admin / Exit" strip (Paper `TL7-0`
  desktop, `TE0-0` mobile). New `--color-acting-as` / `-bg` / `-border`
  tokens (`tokens.css` + `tokens.ts` + `globals.css`) — a muted
  authoritative gold at the artboard's values (`#6D5005` text, `#B89240`
  ground/hairline at 14 % / 30 %). Deliberately its own role, **not**
  `--color-warning` (this is "you're in someone else's seat", not a
  warning).
- `components/layout/app-session-provider.tsx` — `next-auth`
  `<SessionProvider>`, mounted only in the `/admin` + three staff route
  trees (the only client `useSession()` consumers; `signIn`/`signOut`
  never needed it).
- Shell wiring:
  - `components/shells/admin-shell.tsx` — footer + icon-rail get a
    chevron trigger (Paper `TQF-0`'s "Switch chevron", rotates when open),
    reports its `DOMRect` via `onSwitchWorkspace(rect)`; `switcherOpen`
    prop rotates it. Shell roots `h-screen` → `h-full` so the full-width
    banner can sit above them.
  - `components/shells/staff-shell.tsx` — optional leading `onMenuClick`
    hamburger in the header (Paper `TCA-0`), shown **only while
    acting-as** — a real staff user's header is unchanged (the dead
    hamburger stayed removed).
  - `components/shells/mobile-nav-drawer.tsx` / `mobile-shell-admin.tsx`
    — a "Switch workspace" row above the drawer footer.
  - `app/admin/admin-shell-client.tsx` / `components/layout/staff-shell-client.tsx`
    — wrap each shell in `flex-col h-screen` with `<ActingAsBanner>` as a
    full-width strip above it (Paper artboards 2–4: the banner spans the
    whole viewport, above the sidebar). `StaffChrome` (new inner client,
    inside `<AppSessionProvider>`) reads `useActingAs()` to decide the
    hamburger and hosts the inline switcher.

**What shipped (guards — Session 2's job):**
- Staff **page layouts** (`app/store-manager|cashier|canteen/layout.tsx`)
  → `requireActingRole(...)` (was `requireRole`). `app/admin/layout.tsx`
  stays `requireRole("admin")`. Each staff layout also resolves the
  acting location's name server-side (`lib/auth/acting-location-name.ts`)
  for the banner's first paint.
- Staff **write routes** → `requireActingRole` /
  `requireActingRoleIn`: `orders` POST, `orders/[id]` PATCH,
  `canteen/stock-counts` POST + `[id]` DELETE. Correction routes and
  `/api/admin/*` left on the real role, as the handoff requires.
- Staff **GET list-scoping** audited and repointed to `effectiveRole` +
  the `Session`-form `resolveActorLocationId` so an acting-as Admin sees
  the acting location's data, not "everywhere": `orders` GET,
  `canteen/stock-counts` GET, `canteen/stock-counts/preview`,
  `canteen/products` GET, `stock-movements/balances`,
  `stock-movements/outstanding`, `stock-movements/[id]/accept`,
  `products` GET (so buyingPrice is stripped on the staff-styled screen).
  GET routes that also serve `/admin` keep `requireApiRoleIn` (it admits
  the real Admin) and only change the *scoping* role.

**Deviations from the Session 2 handoff — flagged:**
- **Handovers left on the real-role guard.** The handoff listed
  `handovers` POST + `[id]` PATCH among the guards to swap, but
  `declareHandover` / `editOwnHandover` / `listHandovers` resolve the
  actor via `resolveActingStaff(userId)` and `Handover.staffId` is a
  **required FK** — an acting-as Admin has no `Staff` row, so a
  declaration is not representable without a schema change. No Paper
  artboard shows a Handover tab in the acting-as nav (it is Hub + Stock
  only). Owner decision (2026-09-06): leave handovers on `requireApiRole*`
  and note the gap. **Not done:** acting-as handover declaration — needs
  a nullable `Handover.staffId` + `recordedById` migration and domain
  rework; its own backend session.
- **Desktop staff shell not built.** Paper artboards `TE6-0` / `TLE-0`
  show the acting-as staff screens on desktop with a **dark sidebar**
  (Hub/Stock nav + footer) — a desktop staff shell that does not exist
  (staff screens are mobile-only today). Owner decision (2026-09-06):
  acting-as on desktop uses the existing mobile-first staff shell + the
  full-width banner for now; the desktop staff sidebar shell (acting-as
  only, real staff unchanged) is **Session 3**, with its own handoff.
- **Picker: no multi-location step.** The artboard subtitles assume one
  location per role ("· Store", "· Restaurant", "· Canteen"). Owner
  confirmed one active location per role — the hook auto-selects it and
  there is no location-picker UI. `switchTo` takes the first name-sorted
  match if a business ever runs more than one.
- **`actingAsSchema.locationId` relaxed `.uuid()` → `.min(1)`**
  (`lib/validation/auth.ts`). The seed (and any imported data) uses
  readable ids like `seed-location-store`, which `.uuid()` 400'd on every
  switch; `resolveActingAs` already validates the id resolves to a real
  active `Location` of the right type, so the format regex added nothing.
  This is a small change to Session 1's contract, flagged here.

**Check (owner walkthrough, `pnpm dev`, Playwright):** signed in as Admin
(desktop 1440 + mobile 390) — opened the switcher from the sidebar
chevron / icon rail / mobile nav-drawer row; switched Admin → Store
Manager → Cashier → Canteen Attendant (direct role-to-role, no exit
needed); placed a Cashier order while acting-as (`201`, attribution
verified to the Admin id in Postgres); used the header hamburger →
switcher on mobile; exited via the banner. Signed in as the **real
Cashier** — no banner, no hamburger, no switcher anywhere;
`/store-manager` redirects to `/cashier`.

**Gate:** `pnpm typecheck` clean; `pnpm build` clean (caught + fixed a
client-bundle leak — `use-acting-as` had imported `lib/auth/acting-as.ts`
which pulls in Prisma/`pg`; the role→`LocationType` map is now a
client-safe local copy); `pnpm test:unit` 478/478; screen specs
(`tests/screens/admin-workspace-switcher.screen.test.tsx`, new — switcher
list/current-row/switch/exit/error, banner visibility + exit + density,
shell triggers) + token-parity green. `pnpm test:db` 710/710 (one earlier
run hit a Postgres transaction-timeout flake in seed setup under
concurrent load; clean on retry). No `TODO(mock)` introduced. No schema
migration.

**Next:** `docs/sprints/role-switching-session-3-handoff.md` — the
desktop staff sidebar shell (`TE6-0` / `TLE-0`), acting-as only.

---

## Admin role-switching — Session 3 (desktop staff shell) (Developer — 2026-09-06) — DONE

The one piece Session 2 deferred: the desktop staff sidebar shell the
Paper M7 designs (`TE6-0` "Staff list screen on desktop", `TLE-0` "Staff
flow screen on desktop") show for the acting-as screens. Frontend only —
no `lib/**`, no route, no schema change. Should be the last session for
the feature.

**Scoping (owner, 2026-09-06):** the desktop staff sidebar renders **only
while an Admin is acting-as**. A real staff user on a desktop browser
keeps today's mobile-first bottom-nav shell at every width — staff are a
phone-first audience; the sidebar exists for the Admin's benefit while she
drives staff screens on her laptop. The shell choice keys off `actingAs`
(via `useActingAs()`), **not** the viewport.

**What shipped:**
- `components/shells/staff-desktop-shell.tsx` (new) — a build of `TE6-0`'s
  chrome, structure copied from `admin-shell.tsx`: root `flex h-full
  w-full` (not `h-screen` — the full-width `<ActingAsBanner>` sits above
  it in the client wrapper, as for `AdminShell`); `w-[240px]`
  `bg-(--nav-bg)` sidebar with the Prosper brand row, hairline, the
  role's nav rows (active row = `bg-(--nav-bg-active)` + 2px left accent
  bar, matching the admin shell), and a footer (avatar · role label ·
  Sign out). Body is `min-w-0` (same wide-table fix + comment as the
  admin shell), a thin header row (account avatar only — staff screens
  render their own in-page headers, so there is no shell title/toolbar
  the way admin screens have `<AdminPageHeader>`; `TE6-0`/`TLE-0` confirm
  the row is just a border + avatar), then `{children}` as the only
  scroll region. Props mirror the `StaffShell` overlap (`roleLabel`,
  `accountInitials`, `navItems`, `activeNavKey`, `onNavigate`,
  `onAccountClick`, `children`) so `StaffChrome` feeds both shells from
  one set of values. Nav-item type is `StaffDesktopNavItem`
  (`{ key, label, href, icon }`), the icon a lucide element sized/stroked
  by the caller (white on `--nav-bg`).
- `components/layout/staff-shell-client.tsx` — `StaffChrome` extended to
  the two-shell responsive pair, mirroring `admin-shell-client.tsx`.
  When `actingAs` is `null` (real staff): renders `<StaffShell>` only,
  exactly as before — no wrapper change, no desktop shell. When
  `actingAs` is set: a new `ActingAsShellPair` renders
  `<StaffDesktopShell>` in `hidden md:flex` and `<StaffShell>` in
  `md:hidden`, each toggled with `hidden md:*` exactly as the admin
  shells are. `toDesktopNavItems(basePath, defs)` reuses
  `NAV_DEFS_BY_BASE` (Store Manager / Canteen: Hub, Stock; Cashier:
  Today, New Order, Customers, Handover) and `hrefForKey` for routing.

**Deviations from the handoff — flagged:**
- **Banner rendered once per side, not one banner + a `matchMedia`
  density flip.** The handoff offered either; I took the simpler branch —
  `ActingAsShellPair` puts a `density="desktop"` `<ActingAsBanner>` above
  the `hidden md:flex` desktop column and a `density="mobile"` one above
  the `md:hidden` mobile column. No `isDesktop` state needed here (unlike
  `admin-shell-client.tsx`, which needs it for the `<AdminShellVisibility>`
  header-publishing guard — the staff shell has no toolbar context, so
  there is nothing to gate). The banners are pure display; rendering both
  and letting CSS pick is cheaper than a resize listener.
- **No `AdminShellVisibility`-equivalent added.** `children` mounts in
  both the desktop and mobile subtrees (both `hidden md:*` mounts run
  their hooks) — the same accepted cost as the admin shell. The staff
  screens are client subtrees with no server-only mount effects and no
  toolbar-context publishing race, so no visibility gate was needed. If a
  future staff screen adds a mount effect that must not double-fire, it
  needs a staff `AdminShellVisibility` analogue.
- **Header row shape:** the desktop shell's content header is a thin
  border + account avatar only (no title, no page-actions slot). `TE6-0`
  shows a "Stock & Reconciliation" title + Date/Maximize actions in that
  row, but those are the *screen's* in-page header — staff screens render
  their own (unlike admin screens, which publish up via
  `<AdminPageHeader>`). Matching the admin toolbar-context pattern into
  the staff tree was out of scope for an acting-as-only shell; the row
  carries just the avatar, as `TLE-0` also shows.
- **No switcher trigger in the staff sidebar footer** — as the handoff
  directed and `TE6-0`/`TLE-0` confirm. The Admin exits via the banner's
  "Exit to Admin", then re-opens the switcher from the Admin shell.

**Check (owner walkthrough, `pnpm dev`, Playwright):** signed in as
Admin at 1440×900 → switched into Store Manager → landed on
`/store-manager` in the **desktop sidebar shell** (full-width acting-as
banner on top, dark `w-[240px]` sidebar with Hub active + Stock, footer
avatar · "Store Manager" · Sign out, content column with thin
avatar-only header) — matches `TE6-0`. Navigated Hub → Stock via the
sidebar (active row + accent bar moves, screen swaps in the content
column). Opened Receive Goods, recorded a `+1 kg` Rice receipt (`303`
redirect to hub, toast) — verified in Postgres the resulting
`StockMovement.recordedById` is the **real Admin id** (`884af3c9…`,
role `admin`), not the seeded Store Manager. Resized to 400×800 → the
shell flipped to the mobile bottom-nav shell (hamburger, short "Exit"
banner label, bottom nav), no reload artifacts, the `+1 kg` receipt
shows in the movement log. "Exit to Admin" from the banner → back to
`/admin`. Signed out, signed in as the **real seeded Store Manager**
(PIN 1234) at 1440×900 → still gets the mobile-first shell (bottom nav
Hub/Stock, no dark sidebar, no banner) — the acting-as-only scoping
holds.

**Gate:** `pnpm typecheck` clean; `pnpm build` clean; `pnpm test:unit`
483/483. Full `pnpm test` — 1189/1193, the 4 failures a pre-existing
cross-suite DB teardown FK-ordering flake in
`lib/domain/sales/test-helpers.ts` (`product_location` RESTRICT during
concurrent runs; Session 2 noted the same class of flake) — each failing
file passes clean run in isolation, and this change touches no
domain/schema code. New screen spec
`tests/screens/staff-desktop-shell.screen.test.tsx`
(5 cases): the desktop shell renders the role's nav + `onNavigate` fires
the right key, active row gets `aria-current`, no switcher trigger in the
footer, and — the scoping guard — `StaffShellClient` renders no desktop
sidebar for a real staff user (`actingAs: null`) but does for an
acting-as Admin. No `TODO(mock)` introduced. No schema migration.

---

## Opening balances + Day-1 pinning (Developer — 2026-09-05) — DONE

Owner request, ad hoc (not tied to a milestone plan): the Admin could
state the business's opening **stock** but had no way to state its
opening **money** — cash at hand and M-Pesa/bank. Balances are derived
(ADR-17), so there was no column to set and every liquidity figure was
wrong by the business's whole starting float.

Designing the fix surfaced a **live defect on the stock side**, which the
owner asked to fix in the same session. `setOpeningStock` took its
business date from the caller and `/admin/stock/opening` sent **today**
on every visit, titling itself "Day 1 Opening Stock — {today}" each time.
So entering counts on a later day wrote a *second* set of `opening` rows
dated to that day: the correction lookup (scoped by `occurredAt`) missed
the real Day 1, and a mid-history `opening` row drags COGS negative — the
phantom-profit failure `get-financial-summary.ts` documents. Day-close
gating masked how often this could happen without preventing it.

**What shipped:**
- `lib/domain/audit/opening-day.ts` (new) — `resolveOpeningDay()`, the
  single source of the business's Day 1, shared by **both** ledgers:
  earliest existing opening row (`opening` StockMovement or
  `opening_balance` MoneyMovement), else today. Takes an optional `tx`
  so concurrent first-saves can't split the date.
- `lib/domain/financials/opening-balance.ts` (new) —
  `setOpeningBalance` / `getOpeningBalances`. Writes an
  `opening_balance` `MoneyMovement` carrying the delta needed to reach
  the stated figure; a restatement is a correction row (ADR-15) with
  `correctsMovementId` set. Signed amounts (M-Pesa may open overdrawn),
  zero allowed, `set: false` distinct from `"0.00"`.
- `setOpeningStock` now pins its date and looks priors up **by pair, not
  by date** — the two halves of the defect above.
- Routes: `GET`/`PUT /api/financials/opening-balance`,
  `GET /api/stock-movements/opening-day`. The `opening` movement body's
  `businessDate` is now optional and ignored.
- `recordMoneyMovement` gained pass-through `correctsMovementId`;
  `sourceId` became optional.
- **`/admin/financials/opening` (new)** — two states: an entry form while
  unset; once set, a **locked receipt** showing Day-1 figures beside
  today's live balance, with a quiet "Correct a mistake" behind a
  warning-first drawer. Never called "Edit".
- **`/admin/stock/opening`** stops claiming to be today — reads the
  pinned day and, once pinned, says a re-entry restates Day 1 and
  changes every report since.
- Migration `20260905120000_add_opening_balance_money_source_type`
  (additive enum value).

**Why the UI carries so much of this:** pinning the date makes a
mid-history opening *unwritable*, but the backend still cannot tell a
legitimate correction ("Day 1 was wrong") from a misunderstanding ("I
have 62,300 today"). Both arrive as the same request. Showing Day 1 and
today's balance side by side is what separates them.

**Gate:** `pnpm typecheck` clean. New tests — 16 domain
(`opening-balance.test.ts`, incl. *"a later restatement corrects Day 1
rather than opening a second day"* and *"does not disturb movements
recorded since Day 1"*), 7 route, 12 screen
(`opening-balance.screen.test.tsx`), 3 pinned-day cases added to
`opening.screen.test.tsx`.

**Tests updated, not inverted:** three stock suites passed an explicit
historical `businessDate` to `setOpeningStock` — the capability ADR-70
removes. Two `derived-balance` cases now write their backdated opening
row directly (a fixture concern, not the write path under test); the
`movement-guards` day-close case seals **today**, which *is* the pinned
day on a ledger with no openings. Each still asserts the same rule.

**Dev-DB note:** the dev database has no `_prisma_migrations` history
(built with `db push`, ADR-61), so `prisma migrate dev` there offers a
destructive reset. The enum value was applied to it as the same one-line
`ALTER TYPE … ADD VALUE IF NOT EXISTS`; data intact. Its real Day 1
resolves to **2026-06-01** from existing opening stock, so opening
balances will correctly pin there rather than to today.

**ADR:** ADR-70.

---

## Admin nav — expandable sections (Developer — 2026-09-05) — DONE

Owner request, ad hoc (not tied to a milestone plan): the Admin sidebar
listed every top-level section but gave no hint of the screens inside
each one, and two links were dead weight — **Handovers** (already a tab
of Financials since M3 S3) and **Reports** (a `/admin/reports` route
that was never built). Owner approved "Approach A — inline accordion"
from a Paper comparison (`M6 — Expandable navigation` page).

**What shipped:**
- `components/shells/admin-nav-model.ts` — new single source of truth
  for the sidebar's destinations, shared by the desktop shell, the
  mobile drawer and the shell client. Sections that are one route with
  an inner tab row (Financials, Sales, Staff, Catalog, Assets) declare
  their tabs as `children`; each child's `href` deep-links its tab via
  `?tab=`. `activeChildKey(navKey, tabParam)` resolves the lit sub-item.
  Icon-free — each shell keeps its own SVG set and maps by `key`.
- **Handovers** and **Reports** removed as top-level links from both
  `admin-shell.tsx` and `mobile-nav-drawer.tsx`. The old
  `financials + ?tab=handovers → "handovers"` nav-key special-case in
  `admin-shell-client.tsx` is gone.
- Both shells render an accordion: expandable rows get a disclosure
  chevron (label click navigates to the section default; chevron click
  toggles), an indented sub-list with a hairline connector, and
  one-section-open-at-a-time state that auto-opens the section owning
  the active route. Icon rail (collapsed desktop) is unchanged — icons
  only, no children.
- `admin-shell-client.tsx` now reads `?tab=` via `useSearchParams()`
  (layout wraps it in `<Suspense>`) and passes `activeTabParam` to both
  shells so the lit sub-item tracks the URL.
- Catalog + Assets `page.tsx` gained `searchParams → initialTab`
  (`?tab=products|locations`, `?tab=active|archived`); `AssetsClient`
  gained an `initialTab` prop, `CatalogTabKey` / `AssetsTabKey` are now
  exported. All five tabbed screens' `page.tsx` pass `key={initialTab}`
  so a sidebar deep-link to a different tab remounts the client with the
  fresh tab (the `useState(initialTab)` initializer alone wouldn't pick
  up a query-only change).

**Gate:** `pnpm test:unit` 448/448, `pnpm build` clean, new
`tests/screens/admin-nav-accordion.screen.test.tsx` (16 cases) covers
the model + both shells' expand/collapse/deep-link/active-highlight.
Driven in `pnpm dev` as Admin, desktop + 390px, across Financials /
Staff sub-links. `pnpm typecheck` reports pre-existing errors only in
`lib/domain/financials/opening-balance.ts` (a concurrent agent's
untracked WIP, not touched here).

**Not done / deferred:** in-page tab switches still don't rewrite the
URL (matches pre-existing Financials/Sales/Staff behaviour) — the
accordion highlight follows the URL, so it updates on navigation, not
on an in-page tab click. Collapsed icon-rail has no sub-nav affordance
(a flyout was sketched as "Approach B" but not chosen).

## Self-service PIN change (Developer — 2026-09-05) — DONE

Owner request, ad hoc (not tied to a milestone plan): before handing the
app to the client, close two gaps flagged during a handover-readiness
discussion — no production admin bootstrap (being handled by a separate
agent) and no way for the Admin to change their own login PIN.

**The gap.** `PATCH /api/staff/:id` lets the Admin reset a *staff*
member's PIN, but the Admin has no `Staff` row (ADR-26 — admin is
explicitly excluded from the staff pipeline via `assertStaffRole`), so
that path never covers the Admin's own account. There was no
self-service PIN-change endpoint or UI for anyone.

**What shipped:**
- `lib/auth/change-own-pin.ts` — `changeOwnPin(userId, currentPin,
  newPin)`, any role. Verifies the current PIN by bcrypt compare, rejects
  a new PIN that isn't 4 digits or that matches the current PIN, re-hashes
  at the same work factor as the login flow / staff PIN reset
  (`PIN_BCRYPT_ROUNDS`, now re-exported from `lib/domain/staff`'s public
  surface since it's shared across modules).
- `PATCH /api/auth/pin` (`app/api/auth/pin/route.ts`) — thin route via
  `requireApiRoleIn` over all four roles; documented in `docs/API.md`
  alongside the existing `/api/staff/:id` PIN-reset path so the two don't
  get confused.
- Frontend: **explicitly not a new page.** The owner rejected both "a
  separate My Account page" (too much for one field) and "add Admin as a
  row in the Staff table" (the Staff table's fields — daily rate,
  location, deactivate — don't apply to the Admin and the domain layer
  already blocks Admin from that table by design). Landed as a "Your
  account" row/card at the top of `/admin/staff`'s Roster tab, opening a
  new `change-pin-drawer.tsx` styled like the existing staff drawer's PIN
  field but requiring the current PIN and a confirm field.
- `use-staff.ts` gained `useChangeOwnPin()`.
- Tests: 3 new RTL cases in `tests/screens/admin-staff.screen.test.tsx`
  (success, confirm-mismatch client validation, wrong-current-PIN server
  error surfaced inline) + 5 new DB-backed cases in
  `lib/auth/change-own-pin.test.ts` (success, wrong current PIN writes
  nothing, invalid new PIN, new PIN same as current, unknown user id).

**Known follow-up, not done this session:** the API allows any role to
call `/api/auth/pin`, but there is no staff-side UI entry point yet —
only the Admin's Roster-tab row was built. Flagged in a comment in
`staff-drawer.tsx`. A forced first-login PIN change
(`mustChangePin`-style flag) was also explicitly deferred, pending the
separate agent's production-admin-bootstrap contract — building it now
risked guessing a shape that wouldn't match.

**Gate:** `pnpm typecheck` clean, `pnpm build` clean, no stray
`TODO(mock)`. `pnpm test:db`'s parallel 8-worker seed setup hit a
pre-existing, unrelated flake (`prisma/seed.ts`'s `wipe()` transaction
timing out under contention — nothing this session touched); the two new
test files were verified directly against Postgres instead and both
passed (13/13 screen suite, 5/5 domain suite).

---

## Long-horizon financial simulation — 7 / 31 / 60 days through the real API (QA — 2026-09-05) — DONE

Owner request, ad hoc (not tied to a milestone plan): prove the money and
stock figures stay correct not just for a day or two, but continuously
over a week, a month and 60 days.

**The gap this closes.** The suite was already strong on ledger math
(1,077 tests green), but nearly every financial assertion ran against a
hand-built fixture over a 2–3 day window — `get-financial-summary.test.ts`
covers `2026-05-04 → 2026-05-06`. Nothing proved the invariants hold over
accumulated, interleaved activity, which is exactly where slow drift, a
double-count across a correction, or a month-boundary error would live.

**Approach — two independent sets of books.** `tests/simulation/shadow.ts`
is a second ledger that imports NOTHING from `lib/domain`: plain
arithmetic on bigint minor units (cents / 1e4 quantity), so no JS float
touches a figure and a domain bug cannot cancel itself out. The scenario
drives the REAL route handlers (auth, Zod, day-close gates, role guards
all live) and records what it intended in the shadow; the invariants
compare the two.

**Assertions are relationships, not hand-computed figures** — additivity
(Σ daily == the period), telescoping COGS/revenue at every split point,
the profit chain, per-day stock and money reconciliation, debts, and
per-location sums. 37 checks across 4 suites, all passing:

| Horizon | Days | Checks |
|---|---|---|
| Week | 7 | 10 |
| Month | 31 | 10 |
| 60 days (crosses Jul→Aug→Sep) | 60 | 10 |
| Corrections / day-close / role scoping | 14 | 7 |

The 60-day run puts 227 orders, 1,037 stock movements, 596 money
movements, 180 canteen counts and 94 expenses through the API.

**Two mechanical obstacles, both solved without weakening a guard:**

1. *Dates.* Staff writes are pinned to "today" (`assertStaffDateIsToday`)
   and stock movements carry no API date parameter. Rather than bypass
   the API, the harness moves vitest's fake clock to each business day —
   so every guard evaluates honestly and passes for real.
2. *Schema routing.* `lib/db/index.ts` routes each vitest fork to
   `test_worker_<VITEST_POOL_ID>`; the sim DB has only `public`. Added
   `PRISMA_SCHEMA_OVERRIDE`, set by `vitest.sim.config.ts` alone — every
   other lane's per-worker isolation is untouched.

**Findings: no defect in the financial logic.** Every failure during
development was a bug in the test scenario, and in each case the API was
right to reject it (missing customer phone; Admin attempting a
`purchase_receipt`, which is staff-only by separation of duties; a
correction that would have oversold stock). Two observations logged for
the owner, neither affecting a live figure:

- `GET /api/money/balances` has no query schema, so an unknown param
  (`?asOf=`) is silently ignored and "now" is returned. No caller does
  this today; worth either supporting `asOf` or rejecting unknown params
  before a screen relies on it.
- Separation of duties (Admin pays, staff receive) is genuinely enforced
  at the API, not just in the UI — confirmed, not a problem.

**Not covered, in priority order** (stated plainly in the doc rather than
implied): handover declare/receive with variances is only lightly
exercised — the highest-value next addition; staff pay + attendance
across a month boundary; concurrency; one business shape only.

**Deliverables.** `pnpm test:sim` (own DB `prosper_hotel_sim`, `.env.sim`,
`vitest.sim.config.ts`, deliberately outside `pnpm test` at ~2.5 min).
`docs/SIMULATION_TESTING.md` is written for the OWNER in plain language —
what was tested, how to re-run it, real figures reconciled by hand, and an
explicit "what this does NOT prove" section. `docs/TESTING.md` gains the
operational notes.

Gate: `pnpm test:unit` 433 ✓ · `pnpm test:db` 644 ✓ · `pnpm test:sim` 37 ✓
· typecheck ✓ · build ✓.

---

## Catalog — row numbers, Stock column, Store-only ingredients, buying price follows last purchase (Developer — 2026-09-05) — DONE

Owner request, ad hoc (not tied to a milestone plan). Four changes to
`/admin/catalog`:

1. **Row numbers.** `#` column (desktop table) / `N.` prefix on the name
   (mobile card) — position in the current filtered list, not a stable id.
2. **Stock column.** New `GET /api/products?includeStock=true` param
   (admin-only, ignored server-side for any other role) adds `stockQty` to
   each row: total on-hand summed **across every location** via a new
   `getTotalStockByProduct` aggregate in `lib/domain/stock/derived-balance.ts`
   (one grouped query, no N+1). Desktop table + mobile card tile both show
   it. Every other `GET /api/products` caller (Cashier grid, staff
   pickers) is unaffected — the field is `undefined` unless asked for.
3. **Ingredients are Store-only in the drawer.** ADR-67 R1 already enforces
   ingredient ⇒ Store / dish+goods ⇒ Restaurant+Canteen at the movement
   layer, but `createProduct`/`updateProduct` never checked it — the old
   drawer could save an ingredient "sellable" at the Restaurant, an
   inconsistent state. Now: picking Ingredient collapses "Location
   Availability" to a single stated fact ("Store — no selling price", no
   toggle); picking Dish/Goods shows the Restaurant/Canteen toggle rows
   only (Store no longer offered there either). Switching kind resets the
   location rows. (Category field stays — removing it would have silently
   orphaned the Cashier's New-Order category grouping for every future
   product; flagged to the owner and kept per their answer.)
4. **Buying price follows last purchase.** `recordPurchasePayment`
   (`lib/domain/stock/purchases.ts`) now writes `Product.buyingPrice =
   cost / orderedQty` in the same transaction as the payment movement +
   `MoneyMovement`. A true edit (catalog field, not a ledger — no
   correction-row machinery needed), so the catalog always shows the most
   recently paid unit cost without the Admin re-entering it by hand.

**Desktop table overflow, caught by the owner from a screenshot.** Adding
`#` + `Stock` on top of the existing 9 columns pushed the row past the
container at typical widths (`SimpleTable`'s header/row gap is a fixed
`--sp-6` × N columns, no shrink) — Store/Edit were rendering past the
visible area. Fixed by tightening every column's fixed width (e.g.
Locations 220px → 130px, Restaurant/Canteen/Store 110px → 76px each) and
wrapping the table in `overflow-x-auto` with `min-w-[994px]` as a safety
net for any narrower content area, rather than touching the shared
`SimpleTable` kit component itself (CONVENTIONS.md — compose, don't
extend the kit). Verified at 1440px and 1280px via Playwright.

**Mobile price tile, same round of feedback.** The card's price row grew
from 4 to 5 labels (added Stock) inside a single `flex` row with no wrap —
read as visually crowded/cramped on the left. Replaced with a `grid
grid-cols-3` (3 over 2, border-drawn dividers instead of divider `<div>`
siblings, which don't survive a grid track) — verified at 390px for both
the 3-row (Store-only ingredient) and 5-row (multi-location goods) cases.

**Mobile card, follow-up.** The location chips had their own line under
the category/unit meta line, costing vertical space per card. Folded into
the same line instead — `"Ingredient · per kg · Store"` /
`"Goods · per pcs · Canteen, Restaurant"` — dropping the separate
`<LocationChips>` row (that component stays for the desktop table's
Locations column, unchanged there).

Gates: `pnpm typecheck` clean; `pnpm vitest run tests/screens/catalog.screen.test.tsx`
(12/12); `pnpm exec vitest run --config vitest.db.config.ts` on the
touched catalog/stock/products-route files (56/56 + 9/9). Full
`pnpm test:unit` run once as the final gate: 432/433 — the one failure
(`app/design-system/tokens.test.ts`, missing `--color-*-on-dark` entries
in `tokens.ts`) is **pre-existing**, from the already-committed
`965792d` mobile-parity session, not touched by this session.
`pnpm build` not run this session (`pnpm dev` + Playwright walkthrough
used instead — see verification above).

---

## Mobile parity — Stock / Ledger (`/admin/stock`) (Developer — 2026-09-05) — DONE

Against `docs/sprints/mobile-parity/stock-ledger-mobile-HANDOFF.md`. Goal:
make `/admin/stock` at 390px match Paper `Admin Stock — Mobile` (`RM6-0`).
Desktop signed off, untouched, not re-verified beyond `pnpm build`/gates
below (no desktop branch was edited).

**Method.** Every value measured with `get_computed_styles` on the
artboard and `getComputedStyle` on the live DOM (never eyeballed,
CONVENTIONS §6); `from → to` diff written before any code change. Tokens
confirmed identical between Paper and `app/design-system/tokens.css`.

**What changed.**
1. **Mobile KPI band**: 1-row/2-cell (Gross Profit, Sales Revenue) →
   2×2 grid of the same four money figures as desktop (Sales Revenue /
   Cost of Goods Sold / Non-Sale Stock Value / Gross Profit), each cell
   `flex-1 basis-0 min-w-0` so both columns stay equal-width regardless
   of figure length. `--text-h1` → `--text-h2` (Geist Mono is wider than
   Paper's JetBrains Mono; h1 collided at 390px).
2. **Row redesign — "equation line"**: the old 3-line stacked row
   scattered opening/movements/closing with no stated relationship
   (closing top-right, opening buried as `"Open: 25.0"` on line 3,
   movements as one run-together string). Rebuilt as a single row reading
   **Opening → movements → Closing**, with the middle movements now a
   value stacked over its type rather than one string, and the row's
   action (`Adjust` / `View days →`) moved to the header line — same
   total height, more legible. Applied identically across all three
   mobile ledger views (single-day, period-summary, drill-in) via two new
   shared sub-components, `MobileRowHeader` and `MobileEquationLine`.
3. Per-movement tap targets (`onCellClick`, the correction entry point)
   were kept even though the artboard doesn't draw them as buttons —
   flagged and confirmed with the owner (§4 of the handoff): functionality
   the artboard is silent about is not licence to drop it.

**Bugs found and fixed during the `pnpm dev` walkthrough** (not visible
on the artboard's 3-row sample data):
- A long product name (`"Chicken Stew (plate)"`) pushed the row's
  trailing button off the right edge by up to 22px, clipped rather than
  scrolling (page must never scroll horizontally). Cause: the product
  name was `shrink-0`, copying the artboard, which only ever drew short
  names. Fixed — name is now the element that truncates (`min-w-0
  truncate`), not the trailing button.
- A negative Gross Profit (a real state once "This week" is selected)
  rendered in the success-green KPI color, reading as good news. Fixed to
  flip to danger red below zero, matching the existing convention on
  `dashboard-client.tsx:779`.

**Tokens.** Added `--color-success-on-dark`, `--color-warning-on-dark`,
`--color-danger-on-dark` to `tokens.css` (+ Tailwind theme bridge in
`globals.css`) — the base semantic tokens are tuned for white surfaces
and read muddy on the purple `--nav-bg` band; these three exact values
were used in the Paper redesign and are dark-surface-only (no existing
token's value changed). Owner pre-authorized kit/token edits that match
Paper, reported here per that instruction.

**Walkthrough result, per view (390px, then sanity-checked 360px):**
Today (single-day, both empty and populated via "This week"),
period-summary (Week), drill-in (View days → per-day breakdown) — all
render the equation line correctly, no page horizontal scroll, no
clipped controls after the truncation fix. `<FilterToolbar>` mobile
still one all-visible scroll row (ADR-66), unchanged by this session.

**Gates:** `pnpm vitest run tests/screens/stock-ledger-v2.screen.test.tsx
tests/screens/stock.screen.test.tsx tests/screens/stock-levels.screen.test.tsx`
34/34 (one assertion in `stock.screen.test.tsx` updated — it asserted the
old run-together chip string `"+50.0 Purch"`; now asserts the button by
its new accessible name and checks the Opening/Closing labels are
present). `pnpm typecheck` 0 errors. `pnpm build` clean. `grep -rn
"TODO(mock)"` — no new hits (two hits in `stock-client.tsx` are comments
explicitly disclaiming the marker; `purchases.test.ts:61` is the known
pre-existing non-marker test description).

**Not done / still open:** no flow doc added under `docs/design/flows/`
— no new decision beyond what's recorded here and in the handoff's own
Q&A. States not exercised live: empty-with-filter, error+retry (code
paths unchanged from the prior session, not touched by this layout pass).

---

## Mobile parity — Dashboard (`/admin`) (Developer — 2026-09-05) — DONE

Against `docs/sprints/mobile-parity/dashboard-mobile-HANDOFF.md`. Goal:
make `/admin` at 390px match Paper `Dashboard — mobile [v2]` (`PQR-0`).
Desktop signed off and verified unregressed.

**Method.** Every value measured with `get_computed_styles` (never
eyeballed, CONVENTIONS §6); full `from → to` diff written and shown to
the owner before any code change. Paper tokens confirmed identical to
`app/design-system/tokens.css` (contentHash `710ac1c5`) — the only
deltas are the two documented ones (Paper still shows Inter vs shipped
Geist; retired `--surface-panel-tint`), neither affecting metrics.

**Shipped**

- **Zone order swapped on mobile** — the position card now leads, then
  the period control, then the profit stack, per the artboard. Done with
  CSS `order` (`order-N md:order-none`) so desktop renders in its
  signed-off order from the same markup. *This contradicted the flow
  doc's "v2 does not reorder zones between viewports"; owner ruled the
  artboard wins.*
- **Body rhythm**: mobile inline padding 24px→16px (358px content), zone
  gap 24px→16px, tail padding 40px→32px. Desktop keeps 24px/24px/40px.
- **Profit stack**: 8px radius, 12/16px rows, 15px/18px mono figures,
  Revenue sub-caption restored, Net row flat `--surface-subtle` (was a
  success/danger tint) with an 18px/22px figure.
- **Right now**: padding moved from the card onto each block so the
  hairlines run edge-to-edge; 10px/12px tile labels, 22px liquidity /
  16px sub-figures.
- **30-day trend card**: dropped the 24px "KES …" anchor figure on
  mobile (the artboard has none, and it overlapped the caption at 390px
  — Geist Mono is much wider than Paper's JetBrains Mono at equal px);
  70px bar box via a `--bar-scale` var that leaves desktop's 84px scale
  byte-identical.
- **Location tables**: titles pulled inside each card, 8px radius,
  measured row/total padding and type; stock rows put their meta on one
  line right.
- **Today's activity**: kept (owner call — the artboard was stale) and
  restyled to the neighbouring card language; "Sales so far" restored as
  an emphasised lead row (it is the day's headline figure and appears
  nowhere else on mobile). **Added to the Paper artboard** so design and
  code agree again.

**Kit changes (owner-approved).** `<PageShell>` and `<SegmentedControl>`
are shared kit; both were made responsive rather than forked:
- `page-shell.tsx` — body/toolbar inline padding `px-(--sp-6)
  md:px-(--sp-8)` (16px mobile, 24px desktop). Benefits every mobile screen.
- `segmented-control.tsx` — full-width with evenly-sharing segments and
  11px labels below `md`; at 390px the old fixed-width segments pushed
  "This month" onto a second line.
- `date-range-control.tsx` — `w-full md:w-auto` so the control can fill
  the mobile row.

**Corrected mid-session.** The mobile period-trend strip was reported in
the first diff as wrongly rendering; it was already correctly gated
`hidden md:flex`. Two measurement traps caused it and are worth knowing:
the admin shell mounts `children` twice (M2 S6b), so an unscoped query
reads the *invisible desktop mount* and returns zeroes; and `textContent`
of a `hidden` element still matches text probes. Every measurement must
be scoped to the visible mount.

**Gates** — all green. `pnpm vitest run
tests/screens/admin-dashboard.screen.test.tsx` 19/19 · `pnpm typecheck`
0 errors · `rm -rf .next && pnpm build` clean · no new `TODO(mock)`.
No new tests: layout/spacing only, no interactive behaviour changed.

**Walkthrough.** Driven as Admin at 390px and 360px — no horizontal page
scroll at either. Desktop re-checked at 1440px: original zone order,
5-column stack, 4-column position, both trend cards, table headers all
intact.

**Open / flagged**

- `/admin/financials` at 390px inherits the 16px padding correctly, but
  its range control keeps a "SHOWING" label that squeezes the segments so
  "This month" wraps. Cosmetic, out of scope for this screen — belongs to
  the Financials mobile-parity session.
- The 30-day strip renders near-flat against the current seed (one large
  outlier dwarfs ~29 near-zero days). Data shape, not layout.
- `perLocation`/Store remains open and deliberately unresolved (Store row
  with `revenue: 0`); untouched, never filtered client-side.

---

## Milestone 5 "Dashboard & Financials v2" Session C — Financials frontend (Developer — 2026-09-05) — DONE

Against `docs/sprints/m5-dashboard-financials-v2-session-C-financials-frontend-HANDOFF.md`.
**This closes the three-session feature: A (backend) → B (Dashboard
frontend) → C (this one). Nothing is outstanding; there was never a
Session D — do not go looking for one.**

**Shipped**

- `app/admin/financials/financials-client.tsx` rebuilt to v2 per
  `docs/design/flows/financials-screen.md` "Structure (v2 — current)":
  header row → KPI strip → Debts card → Transactions zone. The profit
  statement is **gone from this screen entirely** (it lives on `/admin`);
  `profit-panel.tsx` + `profit-panel-mobile.tsx` deleted as dead code.
- `kpi-strip.tsx` — six hairline-split tiles, one per tab, in tab order.
  Doubles as a tab indicator: active tile gets the 2px `--color-accent`
  left-rule + `--surface-subtle` tint, and every tile is a real button
  that switches tabs. Desktop 6-across; mobile 2×3 grid.
- `debts-card.tsx` — "Debts owed to the business" promoted from a single
  balance line to a real table (Customer · Amount owed · Oldest unpaid),
  each row linking to `/admin/customers/[id]`, plus a "View all customer
  credit →" row. A BALANCE, as of now (ADR-57) — not period-scoped, with
  the mandatory "as of today" caption.
- `non-sale-tab.tsx` + `non-sale-drawer.tsx` — the 6th tab. Reason pills
  on semantic tokens, client-side resolution of product / location /
  recorded-by, per-row ADR-55 est. cost. Drawer wires the existing M1
  `POST /api/stock-movements/non-sale/batch`.
- Hooks: `useOwingCustomers`, `useNonSaleConsumption` (in
  `use-financials.ts`), and `useFinancialsKpis` (new file).
- `page.tsx` — deep-link tab list corrected: dropped the stale `"profit"`
  (removed back in M5), added `"non-sale"`.

**No backend work.** Every field already existed from Session A.

**Decisions that went beyond the spec** — all recorded in
`financials-screen.md`'s new "v2 build notes" section: where the six KPI
figures actually come from (the spec's "compute from what each tab
fetches" is impossible — inactive tabs are unmounted); per-row Est. cost
(`computeNonSaleCost` is private + server-only, so the ADR-55 rule is
applied client-side with the percentage taken off the wire); "Recorded
by" resolution via `StaffView.userId` and its accepted gap (a User with
no Staff row renders `—`, never guessed); and the mobile tab row being
**scrolled rather than re-ordered** — a second re-ordered `<Tabs>` would
put a duplicate tablist with duplicate ids into the a11y tree at every
viewport, so ADR-66's intent is met by scrolling instead. That last one
is a deliberate, flagged divergence from artboard `PN6-0`.

**Store / `perLocation` (Session B's open question): did not arise.**
Verified explicitly — zero `perLocation` references anywhere in
`app/admin/financials/`. Left open and untouched, as instructed.

**Manual walkthrough (§3).** Ran `pnpm dev` as Admin at 1440px. Signed
in, loaded `/admin/financials`, confirmed the v2 structure renders
against real seeded data. The owner then drove the screen themselves and
signed it off ("everything checks out"). Per-step detail: the shared
dual-shell period control (Session B's `e275cba` fix) works correctly on
Financials — presets re-fetch and the visible figures change; the Debts
card correctly does **not** move with the period; KPI tiles switch tabs;
the Non-Sale tab renders seeded rows with correct pills and sane costs;
Debts rows land on the right customer. **Not separately re-verified by
me at <768px** — the owner's sign-off covered the screen as a whole; a
dedicated mobile-parity pass is queued (see below).

**Fixed during the session:** the KPI strip had no error state —
`useFinancialsKpis` captured an error but the shell only destructured
`{ kpis, refresh }`, so a failed read showed six "—" tiles with nothing
to say anything was wrong. Now renders `<ErrorState>` with retry, and has
a regression test.

**Gates.** `pnpm vitest run tests/screens/financials.screen.test.tsx`
27/27 (was 16 — extended with KPI-tile clicks, Debts links + the "as of
today" caption, Non-Sale pills / recorded-by / ADR-55 costs, the drawer
submit, and the KPI error state). `pnpm test:unit` 432/432.
`pnpm typecheck` 0 errors. `rm -rf .next && pnpm build` clean.
`grep -rn "TODO(mock)"` — nothing new.

**Also this session:** drafted six per-screen mobile design-parity
handoffs under `docs/sprints/mobile-parity/` (Dashboard, Stock/Ledger,
Catalog, Assets, Audit trail, Financials-verify) plus `_METHOD.md`
documenting the measured-diff method — `get_computed_styles` for every
value, never eyeballing a screenshot, flex ratios pulled explicitly.
Owner's direction: the admin desktop screens are in good shape but the
mobile ones drifted from Paper; each will get its own session against a
deep-linked, approved artboard.

---

## Milestone 5 — COGS bug: "This week"/"This month" inflated Net Profit (Developer — 2026-09-05) — DONE

Owner-reported: `/admin` and `/admin/financials` showed correct figures
for "Today", but picking "This week" or "This month" reported a **positive
~27,000 net profit for a period the business actually lost money in**.
Hand-calculation against the raw ledger put the true figure at −5,760.

Against `docs/sprints/cogs-pre-ledger-period-bug-HANDOFF.md` (a prior
session's handoff, now deleted per this log's policy).

### Root cause — a modelling error, not a boundary bug

`cogsByLocationSweep` computes `Opening + Purchases − Closing`, which
assumes **every non-purchase movement is consumption**. An `opening` row
violates that: it is not goods entering the business, it is a
*restatement of a position* ("we had N on hand"). `setOpeningStock`
(ADR-11) stamps it at `businessDateStartUtc(businessDate)`.

Dated like an ordinary movement, that row falls **inside** any period
starting earlier than the day tracking began. The closing term (`< end`)
counted it; the opening term, which only looked at `start`, could not —
so the entire opening-stock valuation looked like stock materialising
from nowhere, dragging COGS negative and inflating profit by the same
amount. With the dev ledger's 32,700 baseline that is the reported swing.

Crucially this is **not reachable by any boundary operator**: for a
week-long range the row sits *days* inside the period, nowhere near
`start`. `lt`, `lte`, and clamping `start` forward all fail.

### The fix — one `where` clause, no new queries

The opening term now separates `opening` rows by **type**, not timestamp:

```
Σ (non-opening movements  occurredAt <  start)     ordinary history
Σ (opening    rows        occurredAt <  end)       position restatements
```

An `opening` row inside the period lands in **both** the opening and the
closing term, so it nets to zero across the subtraction — correct, since
restating a position consumes nothing. A pair whose tracking starts
mid-period is then charged only what it actually bought and used. A
period entirely before any history has the rows on neither side, so it
stays 0.

Kept the original 3-query design — no per-pair clamp, no extra round
trips.

### Correcting the handoff's record

The handoff's §4 account of "Attempt 2" (that `lte` fixed week/month, and
fabricated a −32,700 loss on a prior-month range) was **reproduced and
found false on both counts**: `lte` leaves week/month at −25,600, and the
prior-month range returns 0.00. Attempts 3 and 4 (a global first-movement
clamp, then a per-(product, location) clamp) were therefore built against
a phantom, which is why they kept trading one regression for another. No
clamp is needed.

### Verified

- 7 ranges hand-checked against the dev DB — the 4 from the handoff's
  ground-truth table plus an all-time range and an empty far-future range
  (the two that previously caught nothing). All match, net −5,760.
- **Range-additivity restored**: the per-day `dailyNetSeries` now sums to
  the range summary (−5,760 = −5,760). Pre-fix the week summary said
  +26,940 while its own days summed to −5,760 — the ADR-64 telescoping
  identity held per-day but the range summary disagreed with itself.
- `lib/domain/dashboard/trend-series.ts` needed no code change: its
  same-day exclusion of `opening` rows already agrees, because
  `setOpeningStock` is the only writer of `opening` rows and always
  stamps the day-start instant (corrections included — they reuse the
  original date). Its doc comment said an "`opening` correction dated
  mid-day is ordinary flow", describing a row the system cannot produce;
  comment corrected to state the type-based rule the two paths now share.
- `cogs-pre-ledger-period.test.ts` kept and rewritten: its prose
  described the abandoned clamp, and one assertion claimed a pre-fix
  `+6,000` that never occurred. Added a third case — a pair whose
  tracking **begins mid-period** while it trades — which is the shape no
  boundary fix reaches. Both regression tests were confirmed to fail
  against the pre-fix code (−6,000 and −3,500) and pass after.

### Gates

`pnpm test` **1026/1026 across 127 files**, `pnpm typecheck` clean,
`pnpm build` clean.

### Not done / open

- The working tree also carries unrelated uncommitted test-infra changes
  (`.env.test` pinning `connection_limit=5`, `vitest.db.config.ts` raising
  `maxWorkers` 2 → 8). Not part of this fix; left for the owner to judge
  separately.
- Nothing committed — no commit was requested.

---

## Milestone 5 "Dashboard & Financials v2" Session B — Dashboard frontend (Developer — 2026-09-04/05) — DONE

Against `docs/sprints/m5-dashboard-financials-v2-session-B-dashboard-frontend-HANDOFF.md`
(+ a `-HANDOFF-2.md` addendum written mid-session recording the bug below).
Three sessions total for this feature: **A (backend, DONE) → B (this one)
→ C (Financials frontend, not started)**.

**Shipped**

- `app/admin/dashboard-client.tsx` rebuilt into the v2 zone order per
  `docs/design/flows/dashboard-screen.md` "Structure (v2 — current)":
  profit stack → Right now → trend row → Financial-performance +
  Stock-activity-by-location tables → Needs attention → Today's activity
  → Day Close.
- New route `GET /api/admin/dashboard/trend?from=&to=`
  (`app/api/admin/dashboard/trend/route.ts`) — a thin wrapper over the
  already-exported `dailyNetSeries` (ADR-64). `GET /api/admin/dashboard`
  itself stays `?date=`-only, per Session A's decision (not relitigated).
- `bucketTrendByPeriod` (in `dashboard-client.tsx`): daily bars for
  Today/This week, ISO-week (Monday-first) bars for This month, a
  documented 14-day threshold for Custom (dormant today — Custom is
  always single-day in this app; exists for if it grows a real range).
- Promoted the Financials date-range hook/control to shared `app/admin`
  level: `use-financials-range.ts` / `financials-range.tsx` →
  `use-date-range.ts` / `date-range-control.tsx`
  (`useFinancialsRange`→`useAdminDateRange`,
  `FinancialsRangeControl`→`AdminDateRangeControl`), behaviour
  byte-identical. Dashboard and Financials both import from here now.

**Bug found and fixed — pre-existing, not scoped to Dashboard.** Manual
`pnpm dev` walkthrough (required by CLAUDE.md's Check phase) found that
clicking a period preset fetched correct data but the visible header/body
sometimes didn't update. Root cause: `app/admin/admin-shell-client.tsx`
mounts `children` twice (once per desktop/mobile shell, M2 S6b) under one
shared `AdminToolbarProvider`. Any screen with a header-hosted period
control has two independent copies of that control's state, both racing
to publish into the one shared header slot — whichever mount's effect
fires last "wins" the header regardless of which shell is actually
visible, so the visible header could end up bound to the invisible
mount's state. Reproduced identically on `/admin/financials` (untouched
by this session beyond an import-path rename), confirming it predates
Session B. Fixed in `components/shells/admin-toolbar-context.tsx` (new
`AdminVisibleContext`/`useAdminShellVisible`/`<AdminShellVisibility>`) +
`admin-shell-client.tsx` (tracks the real visible shell via
`matchMedia('(min-width: 768px)')`, not just CSS) — only the visible
mount now publishes toolbar content. Verified end-to-end on Dashboard and
Financials, desktop and mobile, via a real browser walkthrough (commit
`e275cba`).

**Visual-parity fixes from an owner review against the Paper artboard**
(`P5Y-0`/`PQR-0`, file "Prosper Hotel" · page "M5 — Dashboard & Audit"),
commit `1b6db77`:
- Zone spacing corrected to the artboard's 24px (was 32px on desktop);
  trend-row gap corrected to 20px (was 16px).
- "Net profit per day" now renders the full 7-day week strip on the
  Today preset too, not just This week, matching the spec's "unchanged
  M5 week-strip look, just re-titled" intent — the trend fetch requests
  the current business week whenever the preset is Today or This week,
  not just the single selected day.
- The two trend cards (period + 30-day) now stretch to equal height
  (`items-start` → `items-stretch`) with their bar-baseline borders
  landing on the same row — both cards' caption rows and bar-chart boxes
  now share fixed heights instead of sizing to their own content.
- Added a Total row to "Stock & activity by location" so its row count
  matches "Financial performance by location" (owner's fix for the two
  tables' differing row counts — sidesteps the separate, still-open
  Store/`perLocation` question below rather than resolving it).
- The Net Profit tile (desktop + mobile) dropped its "KES " prefix and
  moved to the same type size as its sibling columns, matching the
  artboard and fixing the value wrapping to a second line for larger
  negative figures. Removed the now-unused `kes()` formatter.

**Also merged this session: Ledger v2** (`ledger-v2-kpi-and-range`
branch, built in a separate worktree by another agent session, reviewed
and verified there before merge) — KPI band, period-summary/drill-in
views for `/admin/stock`, reusing the same shared `AdminDateRangeControl`
/ `useAdminDateRange` this session promoted. Rebased onto this session's
`main` (commit `02b7b28`); the rebase's own conflict-resolution commit
missed one file's remaining old-name references
(`app/admin/stock/stock-client.tsx`, left uncommitted in the source
worktree) — caught by re-running `pnpm typecheck` on `main` immediately
after merging, fixed in a same-session follow-up (commit `82b2e18`).
Lesson: **always re-run gates on `main` itself right after a merge**,
not just on the source branch before merging — a worktree's uncommitted
state can pass gates there while the actual merged commit does not.

**Not resolved — flagged, needs the owner's decision:** `perLocation`
(hence "Financial performance by location") includes a **Store** row
with `revenue: 0` and a negative `grossProfit` whenever Store has
purchase/COGS activity with no matching sale, even though the table's
own caption says "Store excluded, it doesn't sell." Pre-existing
(confirmed identical on `/admin/financials`), not a Session B
regression, not fixed this session. Options: (a) accept Store can
legitimately show a row and fix the caption/doc claim, or (b) exclude
Store from `perLocation` server-side (`getFinancialSummary` change
affecting both Dashboard and Financials). The Total-row fix above
resolves the *visual* row-count symptom the owner raised without
resolving this underlying data question.

**Gates:** `pnpm test` 1004/1004 → 1023/1023 after the Ledger v2 merge
(two intermittent cross-file DB-race failures during the session,
`lib/domain/sales/qa-m2-session-7.test.ts` and
`lib/domain/sales/list-orders.test.ts`, both confirmed pre-existing/non-
code by rerunning each in isolation — 1004/1004 and 1023/1023 clean).
`pnpm typecheck` 0 errors (after the follow-up fix above).
`pnpm build` clean. `grep -rn "TODO(mock)"` — only the one pre-existing
non-marker hit in `lib/domain/stock/purchases.test.ts:61`.

**Changed from plan:** none for the Dashboard scope itself; the
shell-visibility bugfix and the Ledger v2 merge were both opportunistic
(discovered/requested mid-session) rather than planned Session B work,
but both are now on `main`.

**Not done this session (still open):**
- Visual/spacing diff of the *rest* of the screen (only the trend-charts
  row and location tables were checked precisely against the artboard;
  other bands were eyeballed, not measured with `get_computed_styles`).
- Full `pnpm dev` walkthrough of This month / Custom on both viewports.
- `origin/ledger-v2-kpi-and-range` (remote branch) and
  `origin/session-10b-kit-proof-harness` — local branches/worktree for
  the former were cleaned up after merging; the remote branches
  themselves were left for the owner to delete (destructive/shared
  action, not taken without explicit confirmation).

**For Session C (Financials frontend):**
- `use-date-range.ts` / `date-range-control.tsx` (formerly
  `use-financials-range.ts` / `financials-range.tsx`) are now the shared
  `app/admin`-level location — import from there, not the old
  `app/admin/financials/*` path.
- The dual-shell header-publishing bug (above) is fixed in shared infra
  — Financials' own period control should now work correctly without
  any change on Session C's part, but re-verify it manually rather than
  assuming, since Financials was the screen this bug was originally
  reproduced on.
- The Store/`perLocation` caption question (above) affects Financials
  too — worth resolving before/during Session C rather than carrying it
  forward again.

---

## Milestones 2–5 — COMPLETE (2026-08-29 → 2026-09-05)

Full per-session narrative for these was compacted on 2026-09-06 when the
project moved to maintenance mode (see the structure changelog at the
bottom). The durable record for everything below is `docs/DECISIONS.md`
(ADR-13–69), `docs/ROADMAP.md` (per-milestone "Unlocks"), and git history.

| Date | Milestone / work | Shipped |
|---|---|---|
| 2026-08-29 → 09-01 | **M2 — Staff can sell, every day** | Restaurant Sales (Orders) — create / edit-own / append-only correct / role-scoped list / §3.8 BLOCK / C1–C5 + Admin `/admin/sales`. Customers & Credit — derived balances, repayment → MoneyMovement, ledger. Canteen Derived Sales — stock-count derivation exact across period boundaries, counted-more rejected, `voidStockCount` undo, revenue MoneyMovement. Money ledger live, all balances derived. Landed on `main` as one `--no-ff` merge (M1+M2). Gate: `pnpm test` 556/556, `tsc` 0, `build` clean. ADRs 49–51. |
| 2026-09-01 → 09-02 | Post-M2 fixes | SM↔Canteen transfer scoping + Canteen "Review & Receive" flow; quantity-accuracy audit (3 roles + ledger) — 7/10 findings closed; dev seed wiped & rebuilt; Store opening stock seeded + additive readouts made honest; workflow streamlined + Restaurant re-activated. |
| 2026-09-02 → 09-03 | **M3 — Admin gets the trust & money picture** | Day Close foundation (seal/reopen + shared guard). Handover & Reconciliation — declare/receive/correct + staff today-only gate + Admin reconciliation tab + staff declare screens. Financials — expenses (+ paired MoneyMovement, append-only correction), owner draws/returns + derived owed-to-business, profit summary (Revenue − COGS − Expenses), KPI strip. COGS model = all-stock valuation sweep, dishes valued 0, non-sale consumption a separate report (ADR-55). Financials redesign + owner-approved date ranges (Today / week / month / custom); flow figures take the range, balance figures as-of range end (ADR-57). Day Close is a hard gate from here on. ADRs 52–57. |
| 2026-09-03 | M3 follow-up | Admin header unified into a single toolbar row; Handovers table redesign + typography foundation. |
| 2026-09-03 | **M4 — Full operational picture** | Locations CRUD + Staff CRUD + attendance + pay backend; staff payout (record a payment, post it to the ledger); `/admin/staff` screen — Roster / Attendance / Pay & advances. Locations tab + assets crash fix + real test DB stood up. |
| 2026-09-03 → 09-05 | **M5 — History, at a glance** | Audit-trail read + day detail (backend), then the audit-trail screen + batch grouping. Enforce the location ↔ product-kind stock model. ADR-69 — delivery receiving by destination. QA walkthrough: one awkward business day end-to-end. Dashboard backend — the aggregator + fast per-day net series via telescoping-COGS (ADR-64), exact agreement with `getFinancialSummary`, ~21ms. `/admin` dashboard built + financials KPI-strip removal. Dashboard/Financials v2: Dashboard = triage home, Financials = analysis-only; week strip + 30-day trend are div-bar one-offs. COGS bug ("This week"/"This month" inflated Net Profit) fixed. ADRs 58–69. |
| 2026-09-05 | Maintenance-era, pre-handover | Long-horizon financial simulation (7/31/60 days through the real API); catalog polish (row numbers, Stock column, Store-only ingredients, buying price follows last purchase); mobile parity for `/admin/stock` and `/admin`; opening balances + Day-1 pinning; admin nav expandable sections; self-service PIN change (any role). |

*Full detail for the entries above line this section is retained — that is
the current maintenance-era work.*

---

## Shipped — earlier milestones (ledger)

### Milestone 1 — The business exists in the system — COMPLETE 2026-08-29

Catalog & Locations, the full append-only StockMovement ledger across
Restaurant / Canteen / Store, the `/admin/financials` stock-purchase +
reconciliation slice, and the Assets register. No revenue.
Plan: `docs/sprints/milestone-1-plan.md`. ADRs: 13–48.

| Date | Session | Shipped |
|---|---|---|
| 2026-08-19 | Planning & repo setup | PRD / ARCHITECTURE / API / SCHEMA / DECISIONS / CONVENTIONS / TEST_PLAN / ROADMAP; git init; first commit. |
| 2026-08-19 | Sprint 01 — Foundation | Next.js App Router + TS on pnpm; full Prisma schema migrated; Auth.js name + 4-digit-PIN login, server-side role checks on 4 shells; PWA manifest + SW; seed; `lib/time` (Africa/Nairobi); Zod validation example. |
| 2026-08-20 | Phase 2B — Design system | Paper.design component library (16-artboard kit) + `design-principles.md`. |
| 2026-08-20 | Component export (Paper → code) | First kit export pass (later superseded by the Session 3/9–10 rebuild). |
| 2026-08-20 | Login screen + role shells | `app/login/*` + 4 role shell routes wired to `usePathname` / `router` / `signOut`. |
| 2026-08-24 | Sprint 02 — Catalog design & Next.js assembly | Catalog screens assembled on mock data (later superseded). |
| 2026-08-25 | Sprint 06 — Design export | 21 screens exported by `get_computed_styles` reconstruction — **all wrong, all scrapped**. Triggered the `milestone-1-plan.md` re-plan and `export-workflow.md`. |
| 2026-08-27 | Tech Lead — M1 re-plan | `export-workflow.md` written; stale docs cleaned; M1 scope pinned in `milestone-1-plan.md`. |
| 2026-08-27 | Design Sprint 2 — component states | `component-states.md`; consistency audit (5 token/structure divergences fixed in Paper); `design-principles.md §9` interaction contract. ADR-36. |
| 2026-08-27 | Design Sprint 3 (pt 1 + 2) | Kit + 4 shells re-exported by verbatim `get_jsx`; route clients rewired; `tsc` green. |
| 2026-08-27 | Design Sprint 4a / 4b / 4c | All 21 M1 screens re-exported from Paper + screenshot-verified (F1/F3/Financials, then 5 Admin Stock, then 7 Store Manager/Canteen). `globals.css` type-scale fix; ADR-37c FlowHeader. |
| 2026-08-27 | Dev Sprint 5 — M1-F1 Catalog & Locations | `lib/domain/catalog` (Dish `buyingPrice=0` invariant, soft/hard delete + referential guard → 409), `app/api/products*`, `/api/locations`. F1 screens wired. 35 tests. ADR-38. |
| 2026-08-27 | Dev Sprint 6 — M1-F2 Stock backend | `lib/domain/stock` — all 8 movement fns + 2-phase transfer + `correctMovement` (day-close gate) + sum-the-ledger balances + `listMovements` (role/location scoped). Routes. ADR-39. 56 tests. |
| 2026-08-27 | Dev Sprint 7 — M1-F2 Admin stock frontend | Ledger + correction drawer + mobile + bulk opening grid + financials stock-purchase/reconciliation slice. `GET /api/stock-movements/balances` (ADR-40). Collapse persists (ADR-36b). 76 tests. |
| 2026-08-27 | Dev Sprint 9 — Kit remediation pt 1 | `app/design-system/tokens.{css,ts}` (foundations + interaction contract + drift-guard test); §9 as shared CSS. ADR-41 (opaque `--surface-raised`, `--surface-panel-tint` retired), ADR-42 (Storybook adopted). |
| 2026-08-27 | Dev Sprint 10 — Kit remediation pt 2 | All 32 `components/kit/*` audited + fixed to implement every §9 state + keyboard + ARIA; 4 primitives added (`Spinner` / `Toast` / `PageShell` / `FormField`). `lib/tokens.css` deleted. ADR-43. 80 tests. |
| 2026-08-28 | Dev Sprint 10b–10d — Kit proof harness | Storybook stood up: one story per state, visual-regression baselines, `axe` a11y, §9 `postVisit` assertions. `test:visual` / `test:a11y` gates. |
| 2026-08-28 | Dev Sprint 11 — Admin screens recomposed | `/admin/catalog`, `/admin/stock` + `/opening` + `/financials` rebuilt as compositions of the proven kit (`PageShell` / `FormField` / `Toast` / `EmptyState` / `ErrorState`). `export-workflow.md` rewritten (compose, don't transcribe). Per-screen `*.screen.test.tsx` gate (18 specs). |
| 2026-08-28 | Dev Sprint 12 — Store Manager + Canteen frontend | 7 staff screens composed from the proven kit + wired to F2 API; incoming-transfer banner + 2-phase accept. ADR-44. 28 screen specs. |
| 2026-08-28 | Dev Sprint 13 — M1-F3 Assets | `lib/domain/assets` (CRUD + `transitionCondition` + friction-guarded `hardDeleteAsset` → 409 on linked AuditLog), routes, Register + Drawer + Delete Dialog from the kit. ADR-45. Suite 127 → 154. |
| 2026-08-29 | Dev Sprint 14 — M1 manual-walkthrough fixes | D1 staff-FORBIDDEN fixed (`GET /api/products` + `/api/locations` widened to staff stock roles; POST stays admin; `buyingPrice` still stripped). Copy sweep: B1 "Stock"→"Ledger", B4 "Shop Goods"→"Goods", C2 "Cash at Hand"→"Cash". A3 Catalog drawer → `variant="rail"`. |
| 2026-08-29 | Design Sprint 15 — M1 design-change pass | ADR-46 (Financials Reconciliation section → table; purchase-payment detail → real fields; delete-in-drawer; A4 kind hint; B3 typography) + ADR-47 (Archive model: table tab + friction-free Unarchive + stock-flow picker exclusion). Paper + ADRs only. |
| 2026-08-29 | Kit Sprint — `<Select>` searchable mode | Opt-in `searchable` + `noMatchesLabel` props on `components/kit/select.tsx` (APG editable-combobox filter, 288px cap + scroll); 5 stories + 5 visual baselines. `<Select>` without the prop byte-unchanged. ADR-48. |
| 2026-08-29 | Dev Sprint 16 — build S15 designs + A5 Archive | Migration: 4 nullable `purchase_*` columns + backfill. `recordPurchasePayment` writes them; `parsePaymentNote` deleted. Reconciliation table (Awaiting delivery / Delivered / Received-no-payment / Flagged). Delete-in-drawer + Edit-only rows (Catalog + Assets). A4 kind hint. A5 Archive: `?mode=unarchive` + `/assets/:id/restore` endpoints, Archived tabs, archived-record guard, stock-flow picker-exclusion audit + one test per flow. Suite 154 → 200/201. |
| 2026-08-29 | QA Sprint 17 — adversarial M1 pass — **M1 COMPLETE** | **F-1 (High, ledger integrity) fixed:** `correctMovement` stacked a second delta on a double-submitted correction and allowed correcting a correction — now rejects a target with `correctsMovementId` set and computes `delta = corrected − (original + Σ existing deltas)` so a repeat is delta-0. B2 (bulk opening post-save) + B5 (correction cell) reproduced + resolved. M1-flow Vitest integration tests added. Suite **226/226**, `tsc` 0, `build` clean. Merged to `main` (PR #1). |

**M1 known follow-ups (not blocking M2):**

- **2-phase transfer receiver visibility** — a `transfer` dispatch row is
  stored with `locationId = source`; `listMovements` scopes a
  location-bound role to their own location, so the receiver never sees
  the pending inbound dispatch and the Accept banner never appears for a
  real cross-location transfer. `POST …/accept` works given a valid id.
  Needs a Design call (match on
  `transferCounterpartLocationId = actor.locationId`, or a dedicated
  inbound-transfers endpoint).
- `prisma/seed.ts` upserts the staff `User` with `update: {}` — a staff
  row created before `staffId` existed would never be backfilled. One-line
  hardening, deferred.
- Dev DB has no `_prisma_migrations` history (built by `db push` every
  session); the committed migration files are for a real deploy — confirm
  `migrate deploy` applies them cleanly on a tracked DB.

---

## Changelog of this log's structure

- 2026-08-29 — Compacted. M1's 30 detailed session entries (was ~3,340
  lines) collapsed to the ledger table above on M1 close. Going forward:
  full detail for the current milestone only.
- 2026-09-06 — Maintenance-mode compaction. M2–M5's per-session entries
  (was ~3,750 lines) collapsed to the "Milestones 2–5 — COMPLETE" ledger
  table. Full detail retained only for the maintenance-era entries above
  it. Log policy rewritten for one-entry-per-fix maintenance work.

