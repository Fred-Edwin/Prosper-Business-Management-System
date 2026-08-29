# Final Session Handoff — QA Engineer: **adversarial M1 pass**

**Status:** NOT STARTED. **UNBLOCKED** — Session 13 closed the last
development sprint (M1-F3 Assets, backend + frontend). All 9 development
sessions (5–13) are complete:

| Feature | Backend | Frontend | Shipped in |
|---|---|---|---|
| F1 Catalog & Locations | `lib/domain/catalog` + `app/api/products*` / `locations*` | `app/admin/catalog/*` | Sessions 5, 11 |
| F2 Store & Stock Movements | `lib/domain/stock` + `app/api/stock-movements*` | `app/admin/{stock,financials}/**`, `app/store-manager/**`, `app/canteen/**` | Sessions 6, 7, 11, 12 |
| F3 Assets | `lib/domain/assets` + `app/api/assets*` | `app/admin/assets/*` | Session 13 |

Latest commits on `session-10b-kit-proof-harness`: Session 13 backend →
Session 13 frontend → this doc.

**Role:** QA Engineer, Prosper project. **QA Sprint.** This session is
**adversarial** (`CLAUDE.md`, `sdlc.md` Phase D, `export-workflow.md`
Phase D): check every M1 feature against its acceptance criteria, the
approved design, and its flow doc; **try to break it**; **report all
findings before fixing anything**, unless the owner says otherwise.

---

## Required reading (before any testing)

1. **`CLAUDE.md`** — the non-negotiable rules (ledgers not stored totals;
   corrections are new rows; no business logic in `app/api/*`; money is
   `Decimal`; `Africa/Nairobi` day boundary). These are the invariants
   the adversarial pass is *for*.
2. **`docs/TEST_PLAN.md`** — §1 (unit: ledger/reconciliation math), §2
   (the 7 named end-to-end flows — **not yet built**, see below), §2b
   (per-screen interaction gate). §3 is explicitly *not* a priority
   (UI polish, visual regression beyond the screen gate).
3. **`docs/PRD.md`** §4.1 (Catalog), §4.2 (Stock Movements), §4.10
   (Assets) — the acceptance criteria each feature is measured against.
4. **`docs/DECISIONS.md`** — the ADRs the implementation leaned on, in
   particular:
   - **ADR-14 / ADR-15 / ADR-39** — the stock ledger: signed-quantity
     convention, corrections as additive delta rows, the 2-phase
     transfer representation (two `transfer` rows linked via
     `correctsMovementId`), `correctMovement`'s open-day gate.
   - **ADR-40** — the batched `GET /api/stock-movements/balances` route
     the ledger's Opening column derives from.
   - **ADR-23** — the hard-delete friction guard (409 with linked
     history) for both Product and Asset.
   - **ADR-24** — `DayClose` is the single source of truth for whether a
     date is locked.
   - **ADR-26** — staff "own entries only" is scoped by acting user
     (`recordedBy`), not location alone.
   - **ADR-38** — catalog: per-location pricing travels with the
     product; dropped locations are deactivated, not deleted.
   - **ADR-44 / ADR-45** — the staff + asset artboards are superseded by
     the proven kit; the screen visual gate is a structural diff against
     kit Storybook, not the stale artboards.
5. **`docs/design/flows/*.md`** — the per-feature user flows. **Note:**
   the directory is sparse. Flows exist for F1/F2 Admin; there is **no
   flow doc for the 7 staff screens** (`docs/design/flows/` was empty at
   Session 12 — ADR-44 context) and **none for Assets**. Where a flow
   doc is missing, the acceptance target is the PRD section + the ADR +
   the screen spec. Flag the gap; do not invent a flow.
6. **`docs/PROGRESS.md`** — Sessions 5–13 entries: what shipped, the
   per-feature "carried / flagged" lists, and every `TODO(mock)` status
   line.
7. **The existing test suites** — `pnpm test` is **154 tests** as of
   Session 13. Know what is already covered so new findings are
   genuinely new:
   - `lib/domain/catalog/*.test.ts`, `lib/domain/stock/*.test.ts`,
     `lib/domain/assets/*.test.ts` — DB-backed domain math + guards.
   - `app/admin/stock/*.test.ts` — `derive-ledger`, `opening-plan`,
     `use-stock` unit tests.
   - `tests/screens/*.screen.test.tsx` — 10 files, jsdom+RTL per-screen
     interaction gates (catalog, stock, financials, opening, harness,
     both staff hubs, both flow screens, stock-levels, assets).

---

## Highest-stakes target: ledger integrity (F2)

This is where a bug is most expensive and least visible. Attack it first.

### 1. Derived balances must reconcile

- `getDerivedStockBalance(productId, locationId)` is a plain signed
  `SUM(quantity)` over **all** `StockMovement` rows for the pair — no
  movement-type filter, no stored total (ADR-14 / ADR-39 §1). Verify:
  after a sequence of opening + purchase receipt + issue + production +
  transfer-out + transfer-in + non-sale + correction, the balance the
  API returns equals the hand-summed signed quantities.
- `purchase_payment` rows are stored with `quantity = 0` (ADR-39 §1).
  Confirm they never shift a balance.
- The ledger's **Opening** column = the prior business day's **Closing**
  = `GET /api/stock-movements/balances?asOf=<previousBusinessDate>`
  (ADR-40). Confirm Opening for day N exactly equals Closing for day
  N−1, across a day boundary, using the **`Africa/Nairobi`** constant —
  not server-local midnight. Try a movement timestamped 23:30 EAT and
  one at 00:30 EAT and confirm they land on the correct business days.

### 2. Corrections must be exact and additive

- `correctMovement` **always** writes an additive delta row
  (`correctsMovementId` set, original never mutated) — even for an
  open-day correction by the original recorder (ADR-39 §3 overrides
  CONVENTIONS §4.6 *for stock*). Verify the original row is byte-identical
  after a correction.
- The delta row's `quantity` = `correctedFinalValue − originalValue`
  (signed; either sign). A `delta` of zero → `VALIDATION_ERROR`. Verify
  the arithmetic with a correction that flips sign (e.g. +10 corrected
  to −3 → delta −13).
- The delta row's `occurredAt` = the original's, so the correction lands
  in the same business day it corrects. Verify.
- Read paths (ledger, balances) show the **current derived value**
  (original + all deltas), never the original in isolation (ADR-15 §4).

### 3. Day-close must actually gate

- `DayClose` for `toBusinessDate(occurredAt)` exists → `correctMovement`
  is **admin-only** (`FORBIDDEN` for anyone else, including the original
  recorder). Day still open → admin **or** the original recorder; any
  other actor → `FORBIDDEN` (ADR-39 §3).
- Attempt a staff same-day edit before close (allowed) and after close
  (must route through admin correction) — end to end through the API,
  not just the domain.

### 4. The 2-phase transfer must not double-count or lose stock

- **Phase 1** (`recordTransfer`): the `−q` dispatch row is written at
  `fromLocationId` immediately; `toLocationId` in
  `transferCounterpartLocationId`; `correctsMovementId = null`. Stock
  leaves `from` now, does **not** arrive at `to` yet.
- **Phase 2** (`acceptTransfer` via `POST
  /api/stock-movements/:id/accept`): the `+q` counterpart row is written
  at the destination with `correctsMovementId = <dispatch row id>`.
  Stock lands at `to` now. **Double-accept → `409`.**
- **Flag** (`flagTransfer`, same endpoint, `{ flag: true, note }`):
  records the note on the pending dispatch row, releases **no** stock,
  transfer stays pending.
- Verify: mid-transit, `from` balance is down by `q` and `to` balance is
  unchanged; after accept, `to` is up by `q` and the pair nets to zero
  across the two locations; nothing is double-counted; a flagged transfer
  moves no stock.
- A **pending transfer** is exactly: a `transfer` row with `quantity < 0`
  and `correctsMovementId = null` and no sibling `transfer` row pointing
  back at it. Confirm the incoming-transfer banner's query matches that
  definition and collapses only on accept/flag.
- **KNOWN GAP (flagged by Session 14 — reproduce and decide):** a
  `transfer` dispatch row is stored with `locationId = source`, but
  `listMovements` scopes a location-bound role to
  `where.locationId = actor.locationId`. So the **receiver's**
  `useStaffStock` list never contains the pending inbound dispatch, and
  `deriveIncomingTransfers` on their hub renders no Accept banner for a
  real cross-location transfer. `POST …/accept` works when handed a valid
  dispatch id directly. Decide: should the receiver's list/derivation
  also match on `transferCounterpartLocationId = actor.locationId` for
  `transfer` rows, or is a dedicated inbound-transfers endpoint the
  answer? This is a Design call as much as a bug — route it accordingly.

---

## Other M1 acceptance targets

### F3 Assets — the delete guard + condition + role scope

- `hardDeleteAsset`: exact `confirmName` (case-sensitive) or
  `400 VALIDATION_ERROR` (`field: "confirmName"`). `409 CONFLICT` when
  any `AuditLog` row has `entityType = "asset"` and `entityId = :id`
  (ADR-23 / ADR-45). Clean ⇒ row deleted. **Adversarial:** create an
  asset, write an `AuditLog` row against it, confirm hard-delete is
  blocked and the delete dialog shows the **blocked state** (copy +
  soft-delete affordance), **not** a raw error toast. Then a clean
  asset → deletes.
- `softDeleteAsset`: `deletedAt` stamp, idempotent, hidden from
  `GET /api/assets` unless `?includeDeleted=true`.
- `updateAsset` is a **true in-place edit** (ADR-22) — no correction row,
  no second `Asset` row. `transitionCondition` moves
  `Good` ↔ `Needs Repair` ↔ `Decommissioned` and the read path shows the
  current one. `purchaseDate` in the future → `VALIDATION_ERROR`.
- **Role:** every `/api/assets*` route is `requireApiRole("admin")`.
  Confirm a Store Manager / Canteen token → `403 FORBIDDEN` on all 5
  endpoints, end to end.
- **Known flag (not a bug):** the `<FrictionDeleteDialog>` archive-link
  label is a hardcoded non-prop string. Recorded in PROGRESS / ADR-45.

### F1 Catalog — price rules + the hard-delete guard

- Dish invariant (ADR-33): `kind === "dish"` ⇒ `buyingPrice` persists as
  `"0.00"` whatever was submitted; switching an existing product's
  `kind` to `dish` zeroes it.
- `ingredient` / `goods` require `buyingPrice >= 0` or
  `VALIDATION_ERROR`.
- `updateProduct` reconciles `locations[]` to the submitted set: present
  → upsert; a previously-active location no longer in the array →
  **deactivated** (`active = false`, price kept), **not** deleted
  (ADR-38). `listProducts` / the table surface only `active` rows.
- `hardDeleteProduct`: `409 CONFLICT` if any `StockMovement` /
  `OrderLine` / `StockCount` / `RecipeIngredient` references it — the
  client offers "Archive instead". Exact `confirmName` or
  `VALIDATION_ERROR`.
- **Non-admin:** `buyingPrice` is stripped to `null` for non-admin roles
  once they consume `GET /api/products` (API.md). Confirm.

### Staff role-scoping (F2)

- A Store Manager can see / act on **only their own location's** stock;
  a foreign `locationId` short-circuits to `[]` (ADR-40) or
  `FORBIDDEN`, per route. Two Cashiers share the Restaurant location and
  must not see each other's data — scoped by `recordedBy`, not location
  (ADR-26). Verify end to end through the API for `GET
  /api/stock-movements`, `.../balances`, and every write route.
- `GET /api/stock-movements/outstanding` is **Admin-only** — the staff
  purchase-delivery banner has no endpoint (carried from Session 12).
  Confirm a staff token → `403`.

### Screen gates (already green — spot-check, don't re-run exhaustively)

- `pnpm test` → 154 green. `pnpm tsc --noEmit` → 0. `pnpm build` → clean.
- Kit `pnpm test:visual` + `pnpm test:a11y` → still pass (no
  `components/kit/*` changed since Session 10d).
- Per-screen specs assert the kit interaction contract (drawer
  focus-trap + Esc-restore = WCAG 2.4.3; toast on save;
  `<EmptyState variant="filtered">`; `<ErrorState>` + Retry). Confirm
  each `tests/screens/*.screen.test.tsx` still reflects its screen.

---

## Likely first task: build the Playwright e2e harness

`@playwright/test` is in `devDependencies` and `package.json` has a
`test:e2e` script, but there is **no `playwright.config.*` and no
`tests/e2e/`** — the harness has been carried unbuilt since Session 11.
The 7 flows in `TEST_PLAN.md §2` are the target:

1. Order → stock deduction *(M2 — order routes don't exist yet; skip or
   stub, note it)*
2. Canteen stock count → derived sale → stock update *(F-sales, M2 —
   skip, note it)*
3. Handover → receipt → variance → money ledger *(M3 — skip, note it)*
4. **Purchase payment + receipt reconciliation** *(F2 — in scope)*
5. **Day close → lock → correction path** *(F2 — in scope)*
6. **Role-scoped access, end to end through the API** *(F1/F2/F3 — in
   scope)*
7. **Hard-delete guard, end to end** *(F1 Product + F3 Asset — in
   scope)*

Flows 4–7 are the M1-relevant subset. Stand up the config (a dev-server
`webServer` block, a seeded test DB, an auth helper that mints a session
per role), then write flows 4–7. Flows 1–3 get a `test.skip` with a
`// M2` / `// M3` reason so the file documents the full intended
coverage.

**DB note:** local Postgres must be running for both `pnpm test` and the
e2e run. The domain test suites namespace their rows by a per-file
prefix and clean up only their own (see each module's `test-helpers.ts`)
— the e2e harness needs the same discipline or a dedicated test schema.

---

## Constraints

- **Report before fixing.** Produce the findings list first — severity,
  repro, expected vs actual, the ADR / acceptance criterion it violates.
  Only fix after the owner has seen the list, unless told otherwise.
- **A finding is a finding even if a test would have caught it.** If the
  suite is green but a hand-run repro breaks, that is a finding *and* a
  test gap.
- **Don't weaken the suite.** New regression tests are added; existing
  ones are not deleted or loosened to make a fix pass.
- **Scope is M1** — F1 Catalog, F2 Stock (incl. the `/admin/financials`
  stock+reconciliation slice), F3 Assets. Orders / Customers / Handovers
  / Financials-proper / Staff / Reports are **not** M1 — a missing
  feature there is not a bug.
- **pnpm only.** `components/kit/*` + `components/shells/*` are proven +
  gated — a real kit bug surfaced by testing is a finding to report, not
  a thing to quietly patch.
- **Git:** on `session-10b-kit-proof-harness` (NOT `main`). If the owner
  wants M1 on `main` after the QA pass, that is a PR opened with `gh`.

---

## Wrap-up (definition of done)

- A written adversarial findings report: every issue found against the
  M1 acceptance criteria / ADRs / flow docs, ranked by severity, with
  repros. Ledger-integrity findings called out first.
- The Playwright e2e harness stood up; flows 4–7 (`TEST_PLAN.md §2`)
  written and passing (or failing with a linked finding); flows 1–3
  `test.skip`'d with an M2/M3 reason.
- After owner review: fixes applied, each with a regression test; `pnpm
  test` + the e2e run + `pnpm tsc --noEmit` + `pnpm build` all green;
  kit `test:visual` + `test:a11y` still green.
- `docs/PROGRESS.md` — a Final-session entry (findings summary, fixes,
  the e2e harness, anything deferred with a reason).
- `docs/sprints/milestone-1-plan.md §5` + `docs/ROADMAP.md` M1 table —
  marked **DONE** once the pass is clean.

Then Milestone 1 is done.
