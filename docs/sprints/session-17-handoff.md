# Session 17 Handoff — QA Engineer: the adversarial M1 pass + Playwright e2e + B2 + B5

**Status: DONE (2026-08-29).** Adversarial pass complete. Findings:
`docs/sprints/session-17-findings.md`. 1 High finding (F-1,
correction-stacking) fixed in-session; F-2 (transfer receiver visibility)
routed to a Design call; F-3 (Low) noted. B2 explained + spec fixed; B5
reproduced (no code bug — misleading affordance, → Design Sprint).
Playwright dropped for Vitest integration tests
(`tests/integration/m1-flows/`) per the owner — WSL2 made the browser
harness unworkable. `pnpm test` 226/226, `tsc` 0, `build` clean.
**Milestone 1 is done** — plan / ROADMAP / PROGRESS updated. Merging to
`main`.

**Role:** QA Engineer, Prosper project. **QA Sprint.** This session is
**adversarial** (`CLAUDE.md`, `sdlc.md` Phase D, `export-workflow.md`
Phase D): check every M1 feature against its acceptance criteria, the
approved design, and its flow doc; **try to break it**; **report all
findings before fixing anything**, unless the owner says otherwise.

This handoff **supersedes `docs/sprints/final-qa-handoff.md`** (that doc
predates Sessions 14–16 — "154 tests", "sessions 5–13", branch
`session-10b-kit-proof-harness`). Everything in `final-qa-handoff.md`
still applies as written *plus* the deltas below; read it as the base
adversarial checklist, this file for what Sessions 14–16 added and the
carried B2 / B5 items.

---

## What changed since `final-qa-handoff.md` was written

| Session | Branch commits | What shipped |
|---|---|---|
| 14 | `73eca70`..`f0f4a08` | D1 (staff-FORBIDDEN fix — `GET /api/products` + `/api/locations` widened to staff stock roles), M1 copy sweep (B1 "Stock"→"Ledger" nav, B4 "Shop Goods"→"Goods", C2 "Cash at Hand"→"Cash"), A3 (Catalog product drawer → `variant="rail"`). |
| 15 | `d0fd2e4` | Design Sprint (Product Designer) — ADR-46 / ADR-47, the reconciliation flow doc, `design-principles.md §4.6` (B3). No code. |
| kit | `79f7f74` | Kit Developer Sprint — `components/kit/select.tsx` gains an opt-in `searchable` mode (+ `noMatchesLabel`), 5 stories, 5 visual baselines, ADR-48. `<Select>` with no `searchable` prop is byte-unchanged. |
| 16 | `fcc2843`, `e7f195a`, `95e5e3e` | This session's target — see below. |

**Branch:** `session-16-financials-archive` (off `session-10b-kit-proof-harness`
HEAD). NOT `main`. If the owner wants M1 on `main` after the QA pass,
that's a PR opened with `gh`.

**Test count:** `pnpm test` is **200 / 201** on the branch tip. The one
red is `tests/screens/opening.screen.test.tsx > "enables Save once a
count is entered, and toasts on a successful batch"` — **pre-existing**,
under **B2**, your task (below). Every other suite is green;
`pnpm tsc --noEmit` → 0; `pnpm build` → clean.

---

## Session 16's build — the new adversarial surface

Read `docs/PROGRESS.md` (Session 16 entry) and `docs/DECISIONS.md`
ADR-46 / ADR-47 in full first.

### 1. Purchase-payment real columns + the backfill (ADR-46 §3)

- **Migration** `20260829120000_add_purchase_payment_detail_fields` — 4
  nullable `StockMovement` columns, applied to the dev DB via
  `prisma db push` (no `_prisma_migrations` history on the dev DB —
  every prior session used `db push`). **Adversarial:** on a machine
  with a clean migrations-tracked DB, does `prisma migrate deploy` apply
  this file cleanly? (The DDL is plain `ADD COLUMN`; low risk, but
  confirm.)
- **Backfill** `scripts/backfill-purchase-payment-detail.ts` — a
  one-time script, **already run** against the dev DB (5/5 rows). It is
  idempotent (re-parses + overwrites; keeps `note`). **Deviation to
  verify:** the handoff's `/supplier[:=].../` regex never matched any
  note the code wrote; the parser matches the real format
  `Ordered <qty> from <supplier>; cost <cost> from <account>`. Confirm
  the 5 backfilled rows have sane `purchaseSupplier` /
  `purchaseOrderedQty` / `purchaseTotalCost` / `purchasePaidFrom`
  (`docker exec … psql`). Try a hand-crafted malformed `note` → the
  script must leave all 4 columns `null` and keep the row.
- **`recordPurchasePayment`** now writes the 4 columns + a human `note`.
  **Adversarial:** POST a `purchase_payment` and confirm (a) the row's
  `quantity` is still `0` (no stock effect, ADR-39 §1 — a balance sum
  over the product/location must not move); (b) the 4 columns persist;
  (c) `GET /api/stock-movements` returns them in the row shape; (d) **no
  `MoneyMovement` row is written** (still F3 / M3 — the `TODO(mock)`
  in `purchases.ts` is intentional).

### 2. Financials Reconciliation section → table (ADR-46 §1–2)

- `parsePaymentNote` is **deleted**. The transactions table and the new
  reconciliation table read the real fields; `null` renders as
  **"Supplier not recorded"** / **"Cost not recorded"** (muted), never a
  bare `—`. **Adversarial:** a legacy `purchase_payment` whose `note`
  didn't backfill → both tables must show the muted "not recorded"
  strings, not `—`, not `undefined`, not a crash.
- The reconciliation section is now a **table** (Date · Supplier/Item ·
  Product · Destination · Amount · Status · Action) with the four-term
  vocabulary: **Awaiting delivery** / **Delivered** / **Received, no
  payment** / **Flagged**. It is **bespoke screen markup**, not the kit
  `<SimpleTable>` (per-row `--surface-subtle` tint + `min-h` rows aren't
  `<SimpleTable>` capabilities — a documented Session 16 deviation).
  **Verify against the artboards** `BHJ-0` (whole screen — KPI strip /
  tabs / transactions table / footer **unchanged**) + `BR7-0`
  (reconciliation section states: all-clear line + loading = header + 3
  skeleton rows).
- **The "recently delivered" window is "same Africa/Nairobi business
  day"** (a Session-16 Development-Sprint pick, ADR-46 §1). **Adversarial:**
  a payment matched to a receipt yesterday must NOT appear as a
  "Delivered" row today; one matched today must. Check the day boundary
  with the `Africa/Nairobi` constant, not server-local.
- **"Record payment"** on a "Received, no payment" row opens the payment
  drawer **pre-selected** to that product. Verify the preselect and that
  submitting refreshes the reconciliation table (the row should leave it
  once a payment is matched).
- The **KPI strip / tabs / transactions table / reconciled-outflows
  footer are unchanged** — confirm no regression there. (The 4-tab row +
  the footer in `BHJ-0` are M3-deferred gaps — pre-existing, per
  Session 11's PROGRESS entry — not a Session 16 regression.)

### 3. Payment drawer scope (ADR-46 §6, partial)

- The product picker is filtered to `kind !== "dish"` (a Dish is never
  purchased — ADR-33), with an "Ingredients & Goods only" caption.
  **Adversarial:** confirm a `dish` product is never offered in the
  picker; the API does **not** reject a `dish` productId (that server-side
  `400` was optional and not built — note if you think it should be).
- **The searchable `<Select>` control is NOT wired into this drawer.**
  The kit variant shipped in `79f7f74` (ADR-48). Session 16 kept the
  plain `<Select>` + the kind-filter interim. **Swapping
  `payment-drawer.tsx` to `<Select searchable noMatchesLabel=…>` is a
  scoped follow-up Development Sprint** — flag it in your report as
  ready-to-do, don't do it in the QA pass unless the owner asks.

### 4. Delete-in-drawer + Edit-only rows (ADR-46 §5) — Catalog + Assets

- Rows have **one "Edit"** affordance, **no Delete column** (desktop
  table + mobile card). Delete lives in a bottom section of the Edit
  drawer (edit mode only, hidden on archived rows) and opens the
  **unchanged** `FrictionDeleteDialog`. **Adversarial:** the retype-gate
  must still work end to end — open Edit → drawer delete section →
  retype the exact name → the destructive button enables → confirm →
  `hardDelete` (or the 409 → archive fallback). Try a wrong-case name
  (must stay disabled). Confirm a successful delete/archive also closes
  the drawer.
- **Deviation to eyeball:** the delete affordance is a plain
  `text-danger` icon+text button (the kit has no text-only-danger
  `Button` variant — `tertiary`'s label is `text-accent`). It matches
  artboard `B9E-0`. Confirm it has a focus ring and is keyboard
  operable.

### 5. A4 kind hint (ADR-46 §8)

- A selection-driven hint line sits under the `<SegmentedControl>` in
  `product-drawer.tsx` and changes with the kind (`ingredient` / `dish`
  / `goods`). The old `dish`-only `DISH_NOTE` info banner is **gone**.
  Verify the three texts and that switching kind updates the line live.

### 6. A5 Archive (ADR-47) — the integrity-critical feature

- **`POST /api/products/:id?mode=unarchive`** and **`POST
  /api/assets/:id/restore`** — Admin only, clear `deletedAt`,
  idempotent. `unarchiveProduct` does **NOT** reactivate
  `ProductLocation` rows (ADR-38 — the Admin re-enables them via Edit).
  **Adversarial:** archive a product with 2 active locations, unarchive
  it, confirm both `ProductLocation` rows are still `active = false` and
  the product's selling prices are all "—" in the table until the Admin
  re-enables a location. Confirm non-admin → `403` on both endpoints.
  Confirm a wrong/missing `?mode` → `400`.
- **Both Archived tabs** (Catalog already had one; Assets got a new
  All/Archived `<Tabs>`): archived rows show a neutral **"Archived"
  `<StatusChip>`** in the name cell (desktop) + **"Unarchive"** in the
  last column instead of "Edit". Unarchive → toast → the row leaves the
  tab. **Bug fixed in Session 16:** `listProducts({ includeArchived:
  true })` returns active **+** archived, so the tab now client-filters
  to `deletedAt != null` and the count chip reads "N archived".
  **Adversarial:** with both active and archived products present, the
  Archived tab must show **only** archived ones.
  - **Artboard divergence (not a bug):** `BBS-0` draws the marker as
    inline `· Archived` text; the handoff §6.4 + `component-states.md §2
    C15` both say `<StatusChip>`. Session 16 followed the two written
    specs. If the owner prefers the inline text, that's a one-line
    change — flag it, don't fix it blind.
- **Archived-record guard (ADR-47 §3.2):** open the Edit drawer on an
  archived row (you'll need to force it — the tab only offers Unarchive;
  try a stale `selected` or a direct component render). It must render
  fields disabled (`<fieldset disabled>`) + an info line + a **Close**-only
  footer, with no delete section.
- **The picker-exclusion integrity work (ADR-47 §3 — attack this
  hardest):** `tests/integration/archived-picker-exclusion.test.ts`
  asserts an archived product/asset is absent from every stock-flow
  picker (issue / production / transfer / non-sale / Record Payment /
  bulk opening grid / mobile stock-levels / asset condition-transition).
  All those pickers call `listProducts` / `listAssets` with **no**
  `includeArchived` / `includeDeleted`. **Adversarial:** seed an
  archived product, then drive each real flow screen and confirm it is
  not in the `<Select>` / grid. Try to smuggle it in via a stale client
  cache, a deep-linked productId in a POST body (the domain
  `assertProductExists` guard should `NOT_FOUND` a soft-deleted product
  — confirm), and the `?includeArchived` param on a route that
  shouldn't honour it.

### 7. B3 typography (ADR-46 §9 / `design-principles.md §4.6`)

Session 16 confirmed (no code change): `DenseLedger` cells are
`--font-mono`; movement values `--weight-regular`; Closing / Closing
Value + sticky footer `--weight-semibold`. Every `SimpleTable` numeric
column uses `cell: "mono"` (font-mono = tabular) — no proportional-font
numeric column exists, so no `tabular-nums` was needed. **Spot-check**
the built ledger + the Financials/Assets tables against §4.6; if you
find a proportional numeric column that slipped in, it needs
`font-variant-numeric: tabular-nums`.

---

## Carried items now assigned to this session

### B2 — Bulk Opening Stock: does the entry disappear after first save?

`docs/sprints/m1-manual-verification-observations.md §B2`. The owner saw
the row/grid appear to go away after the first entry and asked if that's
intended.

- **Design intent** (`milestone-1-plan.md` / Session 7): one editable
  cell per product at its home location; a re-submit for the same
  product/location/date is a **correction** server-side; the row should
  reflect "corrected" vs "saved", not vanish.
- **The failing test:** `tests/screens/opening.screen.test.tsx >
  "enables Save once a count is entered, and toasts on a successful
  batch"` — a `findByText(/Saved 1 opening count for 2026-08-28/)`
  timeout. It has been red since the Session 14 branch tip (verified by
  stashing Session 16's changes and re-running). It is a real
  post-save-behaviour bug or a test that no longer matches the screen.
- **Task:** reproduce live (`pnpm dev`, seed opening stock, save once,
  save again for the same product/day). Decide: is the post-save
  disappearance correct, a display bug, or a data bug? Produce a
  plain-language explanation of how Bulk Opening Stock actually behaves,
  fix the screen/behaviour if it's wrong, and repair or rewrite the
  failing spec so it reflects the intended behaviour. Do **not** delete
  the spec to make the suite green.

### B5 — Stock correction: "Edit button not clickable"

`docs/sprints/m1-manual-verification-observations.md §B5`. The owner
could not perform a correction; the cell/edit affordance did not respond.

- Corrections **are** wired (`app/admin/stock/stock-client.tsx`
  `onCellClick` → `<CorrectionDrawer>` → `POST
  /api/stock-movements/:id/correct`). A cell opens the drawer **only if**
  the column is in `CORRECTABLE` **and** exactly **one** movement sits
  behind that cell.
- **Likely explanations to check live:** (1) no movement data yet — a
  freshly-seeded DB has zero `StockMovement` rows so nothing is
  correctable; Opening/Closing are derived and not correctable by
  design; (2) an aggregate cell (>1 movement) shows the inline "not
  designed yet — flagged for a design sprint" note instead of opening
  the drawer (known Session 7 flag); (3) a genuine wiring/regression
  bug.
- **Task:** reproduce **with real movements present** — do Phase 2 of
  the plan first (opening stock + a purchase receipt so a single-movement
  correctable cell exists), then confirm the cell opens the
  `<CorrectionDrawer>` and a correction round-trips (`POST …/correct` →
  additive delta row, original untouched, ledger shows the derived
  value — ADR-15 / ADR-39 §3). If a single-movement correctable cell
  still doesn't open the drawer → real bug, fix it with a regression
  test.

---

## Likely first task: build the Playwright e2e harness

Unchanged from `final-qa-handoff.md` "Likely first task" — `@playwright/test`
is in `devDependencies`, `package.json` has a `test:e2e` script, but
there is **no `playwright.config.*` and no `tests/e2e/`**. Stand up the
config (dev-server `webServer` block, a seeded test DB, a per-role auth
helper) and write the M1-relevant flows from `TEST_PLAN.md §2`:

4. **Purchase payment + receipt reconciliation** — now includes the new
   real `purchase_*` columns and the reconciliation **table** (not
   `MatchCard`s). Assert the four-term status vocabulary end to end.
5. **Day close → lock → correction path** (F2).
6. **Role-scoped access, end to end through the API** (F1/F2/F3) —
   include the two new endpoints (`?mode=unarchive`, `/assets/:id/restore`)
   → `403` for non-admin.
7. **Hard-delete guard, end to end** (F1 Product + F3 Asset) — now
   initiated from **inside the Edit drawer**, not a row button.

Add an 8th M1 flow: **Archive → picker exclusion → Unarchive**
(ADR-47) — archive a product, drive a stock flow and confirm it is
absent from the picker, unarchive it, confirm it returns.

Flows 1–3 (Order→stock, Canteen count→sale, Handover→variance) get a
`test.skip` with an `// M2` / `// M3` reason.

---

## The 2-phase transfer known gap (still open — from Session 14)

`final-qa-handoff.md §"KNOWN GAP"` and `PROGRESS.md` Session 14: a
`transfer` dispatch row is stored with `locationId = source`, but
`listMovements` scopes a location-bound role to
`where.locationId = actor.locationId`, so the **receiver** never sees the
pending inbound dispatch through the list and their hub's Accept banner
never appears for a real cross-location transfer. `POST …/accept` works
with a valid id. Decide: match on
`transferCounterpartLocationId = actor.locationId` for `transfer` rows,
or a dedicated inbound-transfers endpoint. **This is a Design call as
much as a bug** — route it accordingly (it may need a Design Sprint).

---

## Constraints

- **Report before fixing.** Findings list first — severity, repro,
  expected vs actual, the ADR / acceptance criterion violated.
  Ledger-integrity findings first. Fix only after owner review, unless
  told otherwise.
- **A finding is a finding even if a test would have caught it** — that's
  a finding *and* a test gap.
- **Don't weaken the suite.** New regression tests added; existing ones
  not deleted or loosened to make a fix pass. (B2's failing spec is
  repaired to match intended behaviour, not deleted.)
- **Scope is M1** — F1 Catalog, F2 Stock (incl. the `/admin/financials`
  stock+reconciliation slice + the A5 Archive feature), F3 Assets.
  Orders / Customers / Handovers / Financials-proper / Staff / Reports
  are not M1.
- **pnpm only.** `components/kit/*` + `components/shells/*` are proven +
  gated (the searchable-`Select` change is gated in its own Storybook
  slice) — a real kit bug surfaced by testing is a finding to report,
  not a thing to quietly patch.
- **Git:** on `session-16-financials-archive` (NOT `main`). M1 → `main`
  after a clean pass is a `gh` PR.
- **DB:** local Postgres (Docker) must be running for `pnpm test` and the
  e2e run. Domain suites namespace rows by a per-file prefix and clean
  up only their own (each module's `test-helpers.ts`); the e2e harness
  needs the same discipline or a dedicated test schema.

---

## Wrap-up (definition of done)

- A written adversarial findings report: every issue against the M1
  acceptance criteria / ADRs / flow docs, ranked by severity, with
  repros. Ledger-integrity + A5 picker-exclusion findings first.
- **B2** explained + fixed (or confirmed correct) + its spec repaired.
- **B5** reproduced with real movements + fixed (or confirmed a
  data-not-bug) + a regression test.
- The Playwright e2e harness stood up; M1 flows (4–8 above) written and
  passing (or failing with a linked finding); flows 1–3 `test.skip`'d
  with an M2/M3 reason.
- After owner review: fixes applied, each with a regression test;
  `pnpm test` + the e2e run + `pnpm tsc --noEmit` + `pnpm build` all
  green; kit `test:visual` + `test:a11y` still green.
- `docs/PROGRESS.md` — a Session 17 entry (findings summary, fixes, the
  e2e harness, anything deferred with a reason).
- `docs/sprints/milestone-1-plan.md §5` + `docs/ROADMAP.md` M1 table —
  marked **DONE** once the pass is clean.
- **Follow-ups to record, not do:** the `payment-drawer.tsx` →
  `<Select searchable>` swap (ADR-48); a kit `destructive-text` Button
  variant; whether the reconciliation table should be kit-`<SimpleTable>`-
  backed; the 2-phase transfer receiver-visibility Design call.

Then Milestone 1 is done.
