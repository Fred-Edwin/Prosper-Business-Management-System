# Session 17 — QA Engineer: Adversarial M1 Findings Report

**Date:** 2026-08-29
**Role:** QA Engineer (QA Sprint, adversarial). **Report before fixing** —
this is the findings list; fixes happen after owner review, except B2 / B5
which the handoff assigns to this session directly.
**Branch:** `session-16-financials-archive` (NOT `main`).
**Baseline at start:** `pnpm test` 200/201 (the 1 red = B2, see below),
`tsc` 0, `build` clean.
**State now (after F-1 fix applied — owner-approved):** `pnpm test`
**226 passed / 0 fail**, `tsc` 0, `build` clean.

Findings are ordered **ledger-integrity first**, then A5 picker-exclusion,
then the rest, then the carried B2 / B5 items, then what could not be
tested.

---

## SEVERITY KEY

| | |
|---|---|
| **High** | Silent data corruption, an integrity invariant breakable, or a security/role boundary crossable. |
| **Medium** | Wrong behaviour a user hits on a normal path; no silent corruption. |
| **Low** | Edge-case / defence-in-depth / cosmetic-but-specified. |
| **Design call** | Not fixable by a dev sprint alone — needs a design decision. |

---

# F-1 — LEDGER INTEGRITY (High): `correctMovement` stacks duplicate delta rows; corrections can chain — **FIXED**

**File:** `lib/domain/stock/correct-movement.ts` · **Route:**
`POST /api/stock-movements/:id/correct` · **ADR:** ADR-15 / ADR-39 §3.

**Status: FIXED this session (owner-approved).** `correctMovement` now
(a) rejects a target whose `correctsMovementId` is set (`VALIDATION_ERROR`,
field `movementId` — corrections don't chain), and (b) computes
`delta = correctedQuantity − (original.quantity + Σ existing deltas for it)`
so a repeated identical correction is `delta 0` and is rejected by the
existing zero-delta guard instead of stacking a second row.
**Regression cover:**
`lib/domain/stock/correct-movement.test.ts` (+2 — "F-1: repeated
correction is a no-op", "F-1: a delta row cannot be corrected") and
`tests/integration/m1-flows/finding-correction-stacking.test.ts` (2, now
plain `it`, asserting the fix). `flow-5`'s zero-delta test updated to
target the current derived value (the old assumption — correcting back to
the *original* number — is no longer a no-op, by design).

## What's wrong

`correctMovement` computes

```
delta = correctedQuantity − original.quantity
```

**always against the original row**, and has **no guard** against
correcting a row that already carries a correction
(`correctsMovementId != null`). Two concrete breakages:

### 1. A repeated / double-submitted correction moves the balance twice

Repro (verified live against the dev DB):

1. `purchase_receipt` of `+30` for a product/location. Derived balance +30.
2. `POST …/correct { correctedQuantity: "18" }` → `201`, writes a `−12`
   delta row. Derived balance now +18. **Correct.**
3. **`POST …/correct { correctedQuantity: "18" }` again** (a retry, a
   double-click during the first save, a transport re-send) → **`201`
   again**, writes a **second** `−12` delta row. **Derived balance is now
   +6.**

The zero-delta guard (`delta.isZero()` → `VALIDATION_ERROR`) never fires
on the second call because it compares `18 − 30 = −12`, not
`18 − (current derived 18) = 0`. The baseline is the wrong number.

### 2. A correction (delta) row can itself be corrected

`POST …/correct` on a row whose `correctsMovementId` is set is accepted
(`201`) and writes yet another delta pointing at the delta. Nothing caps
the chain. `getDerivedStockBalance` sums them all, so the arithmetic
"works", but the audit story ("one original, N additive corrections of
it") is broken — you get corrections of corrections.

## Why it matters

The ledger's whole integrity model (ADR-14, ADR-39 §1) is "the balance is
a plain signed `SUM(quantity)` over append-only rows; a correction is
*one* additive delta whose magnitude is `correctedFinal − original`". Both
breakages violate that:

- #1 makes a **retry** — the most ordinary transport failure mode —
  silently corrupt a balance. No error, `201` both times.
- #2 means "correct" is not idempotent-shaped and the delta magnitude
  stops being meaningful relative to the original.

## What bounds it today (not a mitigation, just scope)

- The **ledger UI is protected**: after one correction the cell is backed
  by 2 movements, becomes an "aggregate cell", and
  `stock-client.tsx onCellClick` refuses to re-open the drawer (shows the
  "separate entries behind this cell — not designed yet" note). So the
  normal click path can't trigger #1.
- #1 is reachable via: the API directly; a network retry of the first
  correction; a fast double-click **before** the first save's response
  lands (the drawer's submit button disable is client-side only).
- #2 is reachable via the API directly (no UI offers it).

## Fix applied

In `correctMovement`, inside the transaction:

1. If `original.correctsMovementId !== null` → `VALIDATION_ERROR`
   (field `movementId`, "This row is itself a correction. Correct the
   original movement instead.").
2. `priorDeltas = Σ(quantity) WHERE correctsMovementId = original.id`;
   `currentValue = original.quantity + priorDeltas`;
   `delta = correctedQuantity − currentValue`. The existing
   `delta.isZero()` guard now correctly rejects a repeat.
   - The *input contract* ("the corrected final quantity") is unchanged;
     only the baseline the delta is measured from moved from the bare
     original to the current derived value.

**Test gap closed:** `correct-movement.test.ts` previously only ever
corrected a movement once — the retry / chain paths were never exercised.
Now covered there and in the integration flow.

---

# F-2 — 2-phase transfer: the receiver never sees the pending inbound dispatch (Design call)

**Files:** `lib/domain/stock/transfer.ts`,
`lib/domain/stock/list-movements.ts`,
`app/store-manager/*` hub (`deriveIncomingTransfers`).
**Carried from:** Session 14 PROGRESS + `final-qa-handoff.md` "KNOWN GAP".
**Status:** **reproduced and confirmed.** Not a Session 16 regression.

## What's wrong

Phase 1 (`recordTransfer`) writes the `−q` dispatch row with
`locationId = fromLocationId` and `transferCounterpartLocationId =
toLocationId`.

`listMovements`, for a location-bound role, hard-filters
`where.locationId = actor.locationId` and **never** matches on
`transferCounterpartLocationId`. So the receiver's stock list at
`toLocationId` contains **no** row for the pending inbound transfer, and
`deriveIncomingTransfers` on their hub has nothing to render — the Accept
banner never appears for a real cross-location transfer.

`POST /api/stock-movements/:id/accept` works correctly when handed a valid
dispatch id directly; the gap is purely *discovery* — which rows the
receiver's list returns.

## Why it's a Design call

The fix is a change to the domain **read contract** for a location-bound
role: either

- `listMovements` also returns `transfer` rows where
  `transferCounterpartLocationId = actor.locationId AND
  correctsMovementId IS NULL AND` (no sibling `+q` row), or
- a dedicated `GET /api/stock-movements/inbound-transfers` endpoint.

Both have UX and scoping implications (does the receiver see the *whole*
dispatch row, including the source's other data? how does it render in the
ledger vs. only in the banner?). Route to a Design Sprint.

---

# F-3 — Correction is not location-scoped for a reassigned staff member (Low)

**File:** `app/api/stock-movements/[id]/correct/route.ts:45` — passes
`{ locationId: null }` in the actor context unconditionally;
`correctMovement` never checks location ownership.

The correction gate is `isAdmin || actor.userId === original.recordedById`.
So a `store_manager` can only correct rows **they recorded** — which is
the intended scope in the common case. **But**: a store_manager who
recorded a movement at location A, then was reassigned to location B, can
still correct that location-A row (they're still `recordedById`). There is
no "can only correct at your current location" check.

**Impact:** very low — needs a staff reassignment between recording and
correcting, and the corrected value still lands on the original row's
location/day. Noting for defence-in-depth; the day-close gate (admin-only
once closed) still applies.

**Not a Session 16 change.** Decide whether to add an
`actor.locationId === original.locationId` check for the non-admin path.

---

# A5 ARCHIVE — picker-exclusion & endpoints (ADR-47): **PASSED**

Attacked per the handoff §6 "attack this hardest". All green.

| Attack | Result |
|---|---|
| `POST /api/products/:id?mode=unarchive` as non-admin | **403** ✓ |
| `POST /api/assets/:id/restore` as non-admin | **403** ✓ |
| `?mode=bogus` / missing `?mode` on the product POST | **400** ✓ |
| Unarchive / restore idempotency | 2nd call **200** ✓ |
| Unarchive reactivating `ProductLocation` rows | It does **not** — rows stay `active=false` (ADR-38) ✓ |
| Deep-linked archived `productId` in `purchase_receipt` POST | **404 NOT_FOUND** (`assertProductExists` guards a soft-deleted row) ✓ |
| …in `issue` POST | **404 NOT_FOUND** ✓ |
| …in `opening` POST | **404 NOT_FOUND** ✓ |
| …in `purchase_payment` POST | **404 NOT_FOUND** ✓ |
| `GET /api/products` default (no param) leaking archived | Does **not** — 10 active only ✓ |
| `GET /api/products?includeArchived=true` | Returns active + archived (the Archived tab is the only caller; it client-filters to `deletedAt != null`) ✓ |
| Archived tab showing only archived with both present | `catalog-client.tsx:122` filters `deletedAt != null`; count chip "N archived" ✓ |

Covered by new `tests/integration/m1-flows/flow-8-*.test.ts` (5 assertions)
+ the pre-existing `tests/integration/archived-picker-exclusion.test.ts`.

**Archived-record Edit guard (ADR-47 §3.2):** verified by code read +
`catalog.screen.test.tsx` — the Edit drawer on an archived row renders
`<fieldset disabled>` + info line + Close-only footer, no delete section.

**Artboard divergence (not a bug, already flagged by Session 16):** `BBS-0`
draws the archived marker as inline `· Archived` text; §6.4 +
`component-states.md §2 C15` specify a `<StatusChip>`. Session 16 followed
the two written specs. If the owner prefers the inline text it's a
one-line change.

---

# SESSION 16 NEW SURFACE — otherwise PASSED

## §1 Purchase-payment real columns + backfill — PASSED

- A `purchase_payment` POST: `quantity` stays `0.0000` ✓; the 4
  `purchase_*` columns persist ✓; a human `note` is composed ✓;
  **no `MoneyMovement` row is written** ✓ (still the sanctioned M3
  `TODO(mock)`); `GET /api/stock-movements` returns the 4 fields in the
  row shape ✓. Balance over the product/location does not move ✓.
- Backfill (`scripts/backfill-purchase-payment-detail.ts`): the 5 existing
  dev rows all have sane `purchaseSupplier` / `purchaseOrderedQty` /
  `purchaseTotalCost` / `purchasePaidFrom` (spot-checked via `psql`) ✓.
  A hand-crafted malformed `note` → the script leaves all 4 columns `null`
  and keeps the row ✓. Idempotent (re-parse + overwrite) ✓.
- Covered by new `flow-4-*.test.ts` (2 assertions) + Session 16's
  `purchases.test.ts`.

## §2 Reconciliation table — PASSED

- Four-term vocabulary end to end: a payment with no receipt →
  `awaitingReceipt` ("Awaiting delivery"); a receipt with a null
  `purchasePaymentId` → `unmatchedReceipts` ("Received, no payment"); a
  payment is **not** double-listed in both ✓ (new `flow-4` assertions).
- `null` supplier/cost → "Supplier not recorded" / "Cost not recorded"
  (muted), never a bare `—` — verified in `financials-client.tsx` mappers
  + `financials.screen.test.tsx`.
- KPI strip / tabs / transactions table / footer unchanged — no regression
  (`financials.screen.test.tsx` still 10 green).
- "same Africa/Nairobi business day" delivered window — implemented
  against the `Africa/Nairobi` constant, not server-local (code read;
  `lib/time`).
- `outstanding` endpoint is Admin-only — a store_manager gets **403** ✓
  (`flow-4`, `flow-6`).

## §3 Payment drawer scope — PASSED

- Product picker filters `kind !== "dish"` (code read; ADR-33). The API
  does not reject a `dish` productId on `purchase_payment` — **that
  server-side `400` was optional and not built.** Noting per the handoff:
  low value, since the archived/dish product would still have to exist and
  be non-archived; not recommending it as blocking.

## §4 Delete-in-drawer + Edit-only rows — PASSED

- Retype gate end to end: disabled → wrong-case stays disabled → exact
  name enables → confirm → `hardDelete("p1", "Chicken Breast")` →
  **drawer closes**. Added the wrong-case + drawer-closes assertions to
  `catalog.screen.test.tsx` (was only testing the happy enable).
- The `text-danger` delete affordance is a plain `kit-interactive` button
  (kit has no `destructive-text` Button variant) — has a focus ring, is
  keyboard-operable, matches `B9E-0`. **Recorded as a follow-up kit item,
  not a finding.**

## §5 A4 kind hint — PASSED

3 texts (`ingredient` / `dish` / `goods`) update live on
`SegmentedControl` change; the old `DISH_NOTE` banner is gone
(`catalog.screen.test.tsx`).

## §7 B3 typography — PASSED, no finding

Every numeric column in Catalog / Assets `SimpleTable` uses `cell: "mono"`
(font-mono = inherently tabular). The bespoke `ReconTable` amount + date
cells are `font-mono`. **No proportional-font numeric column exists**, so
nothing needs `font-variant-numeric: tabular-nums`. Matches
`design-principles.md §4.6`.

---

# LEDGER INTEGRITY (F2 core) — otherwise PASSED

Attacked per `final-qa-handoff.md` "Highest-stakes target". Beyond F-1:

- **Derived balance = plain signed `SUM(quantity)`** over all rows for the
  product/location, no type filter, no stored total — verified a mixed
  sequence (opening + receipt + issue + production + non-sale) reconciles
  to the hand-summed value via `GET …/balances` ✓.
- **`purchase_payment` rows never shift a balance** (`quantity = 0`) ✓.
- **Opening(day N) == Closing(day N−1)** across an `Africa/Nairobi` day
  boundary — a movement at 23:30 EAT lands on day N, one at 00:30 EAT on
  day N+1; `?asOf=<prev business date>` for Opening matches ✓ (code read
  of `lib/time` + `balances/route.ts`; `businessDateStartUtc` /
  `businessDateEndUtc`).
- **Corrections are additive, original byte-identical** — for the *single*
  correction case (the F-1 finding is specifically the *repeat* case): the
  original row is unchanged after a correction, delta row has
  `correctsMovementId` set, `occurredAt` = original's, sign-flip
  arithmetic correct (`−10` corrected to `+3` → delta `+13`) ✓
  (`flow-5-*.test.ts`, `correct-movement.test.ts`).
- **Day-close gate** — `DayClose` exists for the business date ⇒
  `correctMovement` is admin-only, `FORBIDDEN` for the original recorder;
  day open ⇒ admin or original recorder, `FORBIDDEN` for anyone else —
  verified end to end through the route ✓ (`flow-5`).

---

# STAFF ROLE-SCOPING (F1/F2) — PASSED

- A store_manager's `GET /api/stock-movements` only ever returns their own
  location's rows ✓.
- A foreign `locationId` on `GET …/balances` → `[]` (short-circuit) ✓.
- A write (`issue`) to a foreign location → **403** ✓.
- `GET /api/stock-movements/outstanding` is Admin-only → staff **403** ✓.
- `GET /api/products` as store_manager → **200** but every
  `buyingPrice` is `null` ✓.
- `GET /api/products` as cashier → **403** ✓.
- All covered by new `flow-6-*.test.ts` (6 assertions) + the pre-existing
  `route.test.ts` files.

---

# F1 CATALOG / F3 ASSETS — hard-delete guards — PASSED

- **Product:** wrong `confirmName` → `400 VALIDATION_ERROR`; a linked
  `StockMovement` → `409 CONFLICT`; a clean product → `200`, row gone ✓
  (`flow-7-*.test.ts`).
- **Asset:** wrong `confirmName` → `400`; an `AuditLog` row referencing
  the asset → `409 CONFLICT`; a clean asset → `200`, row gone ✓
  (`flow-7`).
- These are initiated from **inside the Edit drawer** in the UI (ADR-46
  §5) — the widget path is covered by `catalog.screen.test.tsx`; the
  route contract by `flow-7`.

---

# CARRIED ITEMS — assigned to this session, FIXED / RESOLVED

## B2 — Bulk Opening Stock "does the entry disappear after first save?" — EXPLAINED + FIXED

**Verdict: the post-save behaviour is correct by design. The failing test
was wrong, not the screen.**

### How Bulk Opening Stock actually behaves (plain language)

- The grid shows **one editable cell per product at its home location**
  for the selected business date.
- You type a count and hit **Save**. The row does **not** vanish — it
  switches to a "saved" state (the count is shown, the cell is no longer
  primary-editable, a per-row status appears).
- If you enter a count for the **same product / location / date again**
  and save, the server treats it as a **correction** (an additive
  `opening` delta row with `correctsMovementId` set — `opening-stock.ts`),
  and the row reflects **"corrected"** rather than "saved". Still no
  disappearance.
- What the owner likely saw: after the first save the cell stops being an
  open text input, which reads as "the entry went away". It didn't — the
  value is displayed in the saved/again-editable-via-correction state.

### The failing test

`tests/screens/opening.screen.test.tsx > "enables Save once a count is
entered, and toasts on a successful batch"` — a
`findByText(/Saved 1 opening count for 2026-08-28/)` timeout, red since
the Session 14 branch tip.

**Root cause:** the test hard-codes the date string `2026-08-28` in the
expected toast text but **never fakes the clock**, so the screen computes
"today" as the real current date (`2026-08-29` when the DB / CI clock
rolled over) and the toast reads `Saved 1 opening count for 2026-08-29` —
`findByText(/2026-08-28/)` never matches. It's a frozen-literal bug in the
spec, not a screen regression.

**Fix applied:** the spec now installs `vi.useFakeTimers()` +
`vi.setSystemTime(new Date("2026-08-28T09:00:00+03:00"))` in `beforeEach`
(and restores in `afterEach`), so "today" is deterministic and the toast
literal matches. The assertion itself is unchanged — not weakened, not
deleted. `pnpm test` now **222/224** (was 200/201); this spec is green.

## B5 — Stock correction "Edit button not clickable" — REPRODUCED + EXPLAINED (no code change)

**Verdict: the correction mechanism works end to end. There is no wiring
bug. The owner's report is explained by the affordance, not a defect.**

### What I did

Drove the live screen (`pnpm dev`) with real movements present (opening
stock + a purchase receipt so a single-movement correctable cell exists):

- Clicked the **Cooking oil / Purchases (`+20.0`)** cell → the
  `<CorrectionDrawer>` **opened** ✓.
- Corrected `+20 → +18` → `POST /api/stock-movements/:id/correct` returned
  `201` with a `−2.0000` delta row, `correctsMovementId` set, the original
  `+20` row untouched ✓.
- Drawer closed, "Correction saved" toast shown ✓.
- The cell then showed the **derived** value `+18.0` ✓ (ADR-15 §4).
- Clicking that same cell again (now 2 movements behind it) showed the
  "separate entries behind this cell — isn't designed yet" note instead of
  re-opening the drawer ✓ (the known Session 7 aggregate-cell flag).

### Why the owner couldn't correct

One or more of:

1. **The literal "Edit" text in the last ledger column is a plain
   `<div>`, not a button** (`components/kit/dense-ledger.tsx:280`). It has
   no click handler — the real correction targets are the **numeric
   cells**. Clicking the word "Edit" does nothing, which reads exactly as
   "the Edit button isn't clickable".
2. On a freshly-seeded DB with no `StockMovement` rows, **no cell is
   correctable** — every cell is empty ("—") or a derived Opening/Closing
   column (not correctable by design).
3. An aggregate cell (>1 movement behind it) shows the inline note, not
   the drawer.

### Recommendation (not applied — it's a design question)

The "Edit" column header + inert `<div>` in `dense-ledger.tsx` is
misleading — there is no per-row Edit action in the ledger; correction is
cell-click. Either drop the "Edit" column, or make it a real hint/handle.
Flagging for a Design Sprint; not fixing blind.

**Regression cover:** the single-movement correction round-trip is now
asserted at the API level in `flow-5-*.test.ts` (day-open + day-closed
paths) and remains covered by `correct-movement.test.ts`.

---

# WHAT COULD NOT BE TESTED

## `prisma migrate deploy` on a clean migration-tracked DB

The dev DB has **no `_prisma_migrations` table** (every prior session used
`prisma db push`), so a real `migrate deploy` dry-run would need a
throwaway tracked database that isn't available in this environment.

**Assessment by inspection:** the migration
`20260829120000_add_purchase_payment_detail_fields/migration.sql` is a
single `ALTER TABLE "stock_movement" ADD COLUMN … (×4)`, all nullable, no
default, no constraint, no index. The two prior migrations
(`20260819181925_init`, `20260819213000_pin_login`) do not add any of
these columns. `migrate deploy` applies files in name order in a
transaction. There is no failure mode on a clean tracked DB.
**Low risk; recommend a one-off `migrate deploy` against a scratch DB
before the M1 → `main` PR merges, as belt-and-braces.**

## The Playwright browser e2e harness — REPLACED, not built

`final-qa-handoff.md` / this handoff's "Likely first task" asked for a
Playwright harness. It was **stood up and then removed** on the owner's
call: Playwright against `pnpm dev` under WSL2 proved too slow /
flaky (the dev server kept dying; a first run hung with zero output for
4+ min). Per the owner, the M1 flows are server-contract flows that don't
need a rendered browser, so flows 4–8 were **rewritten as Vitest
integration tests** in `tests/integration/m1-flows/` (they hit the real
route handlers against the real dev Postgres, same `vi.mock("next-auth")`
seam every `route.test.ts` already uses). They run in ~2s as part of
`pnpm test`.

- `flow-4-purchase-reconciliation.test.ts` — purchase-payment real
  columns, no MoneyMovement, the four-term vocabulary.
- `flow-5-day-close-correction.test.ts` — day-close gating + additive
  delta + sign-flip + zero-delta reject.
- `flow-6-role-access.test.ts` — role-scoped API access incl. the two
  Session-16 restore endpoints → 403 for non-admin.
- `flow-7-hard-delete-guard.test.ts` — Product + Asset 409/400/200.
- `flow-8-archive-picker-exclusion.test.ts` — archive → smuggle attempts
  → unarchive; ADR-38 ProductLocation rule.
- `finding-correction-stacking.test.ts` — F-1 regression cover (asserts the fix).

The two genuinely UI-only assertions (delete retype **widget**,
reconciliation **table render**) are covered by the jsdom
`tests/screens/*.screen.test.tsx` gate — no coverage lost.
`test:e2e` in `package.json` now points at
`vitest run tests/integration/m1-flows`.

Flows 1–3 (Order→stock, Canteen count→sale, Handover→variance) are **not
carried in a skipped file** — they're M2/M3, the routes don't exist, and
there's no browser harness to skip them in any more. They stay documented
in `TEST_PLAN.md §2`.

---

# FOLLOW-UPS TO RECORD (not do)

Per the handoff wrap-up, plus what this pass surfaced:

1. **F-1 fix** — **DONE this session** (owner-approved). See F-1 above.
2. **F-2** — 2-phase transfer receiver-visibility → **Design Sprint**.
3. **F-3** — correction location-scope for a reassigned staff member —
   owner's call whether to add the check.
4. **B5 design** — the inert "Edit" column in `dense-ledger.tsx` is
   misleading; drop it or make it a real handle → Design Sprint.
5. `payment-drawer.tsx` → `<Select searchable>` swap (ADR-48) — scoped
   dev sprint, kit variant already shipped in `79f7f74`.
6. A kit `destructive-text` Button variant — future kit pass.
7. Whether the bespoke `ReconTable` should be kit-`<SimpleTable>`-backed
   (needs a per-row className/background hook + `min-h` rows).
8. `prisma migrate deploy` dry-run on a scratch tracked DB before the
   M1 → `main` merge.

---

# GATE STATE AT REPORT TIME

| Gate | Result |
|---|---|
| `pnpm test` | **226 passed, 0 fail** |
| `pnpm tsc --noEmit` | **0** |
| `pnpm build` | **clean** |
| kit `test:visual` / `test:a11y` | not re-run — `components/kit/*` zero-diff this session |
| New tests added | `tests/integration/m1-flows/**` (6 files, 24 assertions), `catalog.screen.test.tsx` (+2), `opening.screen.test.tsx` (B2 fix) |
| Existing tests deleted / loosened | **none** |
