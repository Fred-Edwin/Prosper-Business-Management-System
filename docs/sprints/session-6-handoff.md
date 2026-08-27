# Session 6 Handoff — Developer (Development Sprint): implement M1-F2 Stock backend (domain + APIs)

**Role:** Developer, **Development Sprint** mode, for the Prosper project.
**Phase:** C (Implementation) of `docs/design/export-workflow.md`, feature
M1-F2. **Backend-only session** — no screens move this session (that's
Sessions 7–8). You build `lib/domain/stock` + `app/api/stock-movements*`
and its tests, against the same mock-data interface the F2 skeletons
already import.

**Your job:** the append-only StockMovement ledger and every operation
that writes to it — purchases, kitchen issues, production, 2-phase
transfers, non-sale consumption, opening stock, corrections — plus the
single derived-balance read that everything else in M1 will call. Then
this session's tests.

**You make NO new UI/UX decisions** and you touch no `app/**` screen,
`components/kit/*`, or `components/shells/*`. If a domain rule is genuinely
undefined by the docs below (not just unimplemented), **STOP and flag it**
rather than inventing it.

---

## Required reading (before any code)

Read in this order:

1. **`CLAUDE.md`** (root) — the role model, the non-negotiables. For this
   session the load-bearing ones are: **ledgers not stored totals** (stock
   balance is *always* a signed sum of `StockMovement` rows, never a
   column); **corrections are new rows, never overwrites** (ADR-15);
   **`app/api/*` handlers contain NO business logic**; money is `Decimal`;
   **day boundaries use `Africa/Nairobi`** via `lib/time`, never
   server-local; `TODO(mock)` must be resolved before "done"; **pnpm
   only**; read `node_modules/next/dist/docs/` before route code; post a
   visible checklist and tick it.
2. **`docs/sprints/milestone-1-plan.md`** — §2 (F2 definition) and §5
   "Session 6" (your one-paragraph scope) + the "Sessions 5..N" preamble
   (Phase C rules — backend/frontend either order, `fixtures.ts`
   decouples them, each session ends with its own tests). Note Sessions 7
   and 8 consume what you build here — keep the domain surface clean and
   fully exported.
3. **`docs/CONVENTIONS.md`** — §1 (the `app/api/*` = parse → validate →
   check auth/role/ownership → call one `lib/domain` function → standard
   shape rule), §3 (**error shape** — `{ error: { code, message, field? } }`,
   `CONFLICT` = 409, `FORBIDDEN` = 403), §4 (**the correction-entry
   pattern** — this is the heart of `correctMovement`: the input is the
   *corrected final quantity*, the domain computes `delta = corrected −
   original` and writes a **new row** with `correctsMovementId` set; read
   paths always show the derived current value), §5 (money = `Decimal`).
4. **`docs/SCHEMA.md`** §3 (Stock) + **`prisma/schema.prisma`** — the
   `StockMovement` model (already migrated — do NOT add a migration
   unless a real gap is found). Key facts from the live schema:
   - `StockMovement`: `id`, `productId`, `locationId`, `movementType`
     (`MovementType` enum: `opening | purchase_payment | purchase_receipt
     | issue | production | transfer | sale | non_sale_consumption |
     stock_count | closing`), **`quantity Decimal @db.Decimal(14,4)` —
     signed** (a positive row adds stock at `locationId`, a negative row
     removes it), `recordedById`, `occurredAt DateTime` (the
     business-day-relevant instant — **not** `createdAt`), `reason`
     (`NonSaleReason`: `staff_meal | complimentary | spoiled | damaged |
     other`) + `reasonNote` (required when `reason = other`), `orderId?`,
     `stockCountId?`, `transferCounterpartLocationId?`,
     `purchasePaymentId?` (a plain `String?`, **not** a real FK —
     see SCHEMA note), `correctsMovementId?` (self-relation `@relation(
     "StockMovementCorrection")`), `note?`, `createdAt`, `updatedAt`,
     `moneyMovements MoneyMovement[]`.
   - **Sign convention is yours to define and document** (an ADR) — the
     schema only says "signed". Recommend: every row's `quantity` is
     signed from the perspective of *its* `locationId`; a transfer is
     **two rows** (a `−q` at `from`, a `+q` at `to`), each carrying the
     other's location in `transferCounterpartLocationId`.
   - **Opening/closing are computed on read (ADR-11), not pre-written by
     a job.** `setOpeningStock` writes an `opening`-type row for a
     product/location/business-date; a later correction to it is another
     `opening` row with `correctsMovementId` set (SCHEMA §3
     "Opening/closing stock").
5. **`docs/API.md`** — the "Stock Movements" section. It already
   specifies `GET /api/stock-movements` (role-scoped: Admin all, Store
   Manager/Attendant their location only), `POST /api/stock-movements`
   (body + allowed role **varies by `movement_type`** — the list is in
   API.md), `POST /api/stock-movements/:id/correct`, and `GET
   /api/stock-movements/outstanding`. **Match this contract.** API.md
   uses `snake_case` field names in its examples; Session 5 shipped the
   Catalog routes with **`camelCase`** JSON matching the domain types and
   updated API.md's Catalog section to say so — **do the same here**:
   `camelCase` on the wire, update the Stock section of API.md to match,
   note it in `PROGRESS.md`.
6. **`docs/DECISIONS.md`** — **ADR-15** (corrections are new entries —
   the pattern `correctMovement` must follow), **ADR-11** (opening/closing
   computed on read), **ADR-29** (`Africa/Nairobi` day boundaries).
   `purchase_payment` writes a `MoneyMovement` too (SCHEMA §5) — but
   **F3 Financials owns `MoneyMovement` write logic**; for this session,
   check whether `recordPurchasePayment` should write the `MoneyMovement`
   row now or leave a `TODO(mock)` for F3. If the docs don't settle it,
   flag it — don't guess.
7. **`docs/TEST_PLAN.md`** + **ADR-31** (each dev session ends with its
   own tests). Runner is **`pnpm test`** (`vitest run`). **35 tests
   currently green — keep them so.**
8. **Session 5's shipped code — copy these patterns exactly:**
   - `lib/api/response.ts` — `ok(data, init?)` / `fail(code, message,
     field?, status?)`. **Reuse as-is.**
   - `lib/api/require-role.ts` — `requireApiRole(role)`. **Reuse as-is.**
     Note: it takes a *single* role. F2 endpoints allow *different* roles
     per `movementType`, and Store Manager/Attendant are **location-
     scoped**. You will likely need a small extension — either
     `requireApiRole` accepting a role array, or a
     `requireApiRoleIn([...])` sibling, plus an ownership check helper for
     "this Store Manager's location". Keep it in `lib/api/`, minimal,
     documented. If you extend `requireApiRole`'s signature, keep it
     backward-compatible (Catalog routes still pass a single role).
   - `lib/domain/catalog/errors.ts` — the `DomainError` class (`code` +
     `message` + optional `field`). **Make `lib/domain/stock/errors.ts`
     the same shape** (or lift `DomainError` to a shared
     `lib/domain/errors.ts` and re-export — your call, note it).
   - `lib/domain/catalog/internal.ts` — the `money()` /
     `Prisma.Decimal` handling, the "decimal string on the wire, Decimal
     internally" convention, the shared-`include` pattern.
   - `lib/domain/catalog/{create,update,delete}-product.ts` — the
     `prisma.$transaction` usage, `DomainError` throwing.
   - `lib/validation/catalog.ts` — the shared-Zod-schema pattern
     (`lib/validation/stock.ts` is yours). Zod is **v4** — `z.string()
     .uuid()` still works but is deprecated; ids in this repo are
     `String @default(uuid())` columns that accept **any non-empty
     string** (the seed uses readable ids like `seed-location-store`) —
     validate `z.string().min(1)`, **not** `.uuid()`. (This bit Session 5.)
   - `lib/domain/catalog/test-helpers.ts` + the three
     `*-product.test.ts` files — the **per-file `SCOPE` prefix** pattern
     for parallel-safe DB tests (vitest runs test files in parallel
     workers against the one local Postgres; each file must namespace its
     rows and only clean up its own). `lib/auth/config.test.ts` is the
     other reference.
   - `lib/db/index.ts` — the shared `prisma` client. Use it; never
     `new PrismaClient()`.
   - `lib/time/index.ts` — `BUSINESS_TIMEZONE`, `toBusinessDate(date)`,
     `businessDateStartUtc(ymd)`, `businessDateEndUtc(ymd)`. Use these
     for every "is this date closed?" / "movements in business day X"
     computation.

**Note — `docs/sprints/sprint-05-stock-and-assets-design.md` exists** and
covers F2's design intent (the persistent transfer/delivery banners, the
2-phase transfer accept flow, the stock-levels screens). Treat it as
**design-intent reference** for how the frontend (Sessions 7–8) will
consume your domain surface — it is not authoritative for backend file
locations or scope; `milestone-1-plan.md` §5 + this handoff are.

---

## Scope — what "done" means

### Backend — `lib/domain/stock/`

Pure functions, HTTP-agnostic (no `Request`/`Response`/`NextResponse`),
each throwing `DomainError`. Every write is a `prisma.$transaction`.

- **`getDerivedStockBalance({ productId, locationId, asOf? })`** — the
  one read everything calls. Signed sum of `StockMovement.quantity` for
  that product+location, up to `asOf` (default now). **Never** reads a
  stored total. Corrections are already `quantity`-signed rows in the
  ledger, so a plain sum is correct — verify that against the
  correction-delta design and document it. Consider a batched variant
  (`getDerivedStockBalances(productId[], locationId)`) so Sessions 7–8
  don't N+1 the stock-levels screens.
- **`setOpeningStock({ productId, locationId, businessDate, quantity,
  recordedById })`** — writes one `opening`-type row at
  `businessDateStartUtc(businessDate)`. If an `opening` row already exists
  for that product/location/date, this is a **correction** of it
  (`correctsMovementId` set, `quantity` = the delta) — not a second
  independent opening. `CONFLICT` or a correction row — decide per ADR-15
  and document.
- **`recordPurchasePayment(...)`** — Admin only. `purchase_payment` row
  (**no stock effect** — quantity semantics per API.md; SCHEMA says it's
  a ledger row with no stock impact). The `MoneyMovement` question from
  Required-reading §6 lands here.
- **`recordPurchaseReceipt(...)`** — Store Manager/Attendant. `+quantity`
  `purchase_receipt` row at `locationId`. Optional `purchasePaymentId`
  link (validate it points at a real `purchase_payment` row if given).
- **`recordKitchenIssue(...)`** — Store Manager. `−quantity` `issue` row
  at the Store location (Store → cooking; the counterpart is "cooking",
  not another stock location, so one row).
- **`recordProduction(...)`** — Store Manager. `+quantity` `production`
  row adding **Dish** stock at the Restaurant location. (Guard: product
  must be `kind = "dish"` — reuse `lib/domain/catalog` `getProduct` or a
  thin check.)
- **`recordTransfer(...)`** — Store Manager/Attendant. **2-phase.**
  Decide the state model with the docs: API.md's `POST` body is
  `{ productId, fromLocationId, toLocationId, quantity }`. The F2 design
  (Sessions 7–8 handoffs, `sprint-05-stock-and-assets-design.md`) shows a
  **persistent "incoming transfer" banner the receiver accepts/flags** —
  i.e. a transfer is *initiated* (stock leaves `from`) and later
  *accepted* (stock lands at `to`), or flagged. Model both rows +ing the
  pending state. If the two-phase acceptance API isn't specified beyond
  the banner, **flag the gap** (what endpoint accepts? what's the pending
  representation — a single `−q` row with no counterpart yet, or a status
  field?) — this is the most likely STOP-and-flag point in the session.
- **`recordNonSaleConsumption(...)`** — any staff, location-scoped.
  `−quantity` `non_sale_consumption` row. `reason` required;
  `reasonNote` required iff `reason = "other"` → else `VALIDATION_ERROR`
  on the right field.
- **`correctMovement({ movementId, correctedQuantity, note?,
  recordedById })`** — **ADR-15 / CONVENTIONS §4.** Input is the
  *corrected final quantity* of the target row. Domain: load the
  original, compute `delta = correctedQuantity − originalQuantity`, write
  a **new `StockMovement`** of the **same `movementType`, same
  product/location**, `quantity = delta`, `correctsMovementId =
  original.id`, `note` carried. **Day-close gating:** if a `DayClose`
  row exists for `toBusinessDate(original.occurredAt)` → **only Admin**
  may correct (`FORBIDDEN` otherwise); if the day is still open, the
  **original recorder** may also correct. The original row is **never
  mutated**.
- **`listMovements(filter, actor)`** — role-scoped: Admin sees all;
  Store Manager/Attendant see **only their location's** rows. Filters:
  `productId`, `locationId`, `movementType`, `date` (a business date →
  `[businessDateStartUtc, businessDateEndUtc)` on `occurredAt`).
- **`listOutstandingPurchases()`** — Admin. `purchase_payment` rows with
  no linked `purchase_receipt`, and `purchase_receipt` rows with a null
  `purchasePaymentId` (PRD §4.2 / SCHEMA §3 "awaiting receipt / unmatched
  receipt").
- **`lib/domain/stock/index.ts`** — re-export the public surface.
- **`lib/domain/stock/types.ts`** — `StockMovementView`, the per-operation
  input types, `DerivedBalance`. Exported for the domain, the Zod file,
  and (Sessions 7–8) the frontend.

### Validation — `lib/validation/stock.ts`

One Zod schema per operation (`recordPurchasePaymentSchema`,
`recordPurchaseReceiptSchema`, … `correctMovementSchema`,
`listMovementsQuerySchema`), mirroring the domain input types. Money +
quantity as decimal **strings** (`/^-?\d+(\.\d{1,4})?$/` — note quantity
is `Decimal(14,4)` and *may* be negative in a raw context, though most
operation inputs take an unsigned magnitude and the domain applies the
sign — decide per operation and be consistent). `export type` the
inferred types. Client forms (Sessions 7–8) import these.

### API routes — `app/api/stock-movements/`

- `app/api/stock-movements/route.ts` — `GET` → `listMovements(query,
  actor)` ; `POST` → dispatch on `body.movementType` to the matching
  domain fn, **after** the per-type role/location check.
- `app/api/stock-movements/[id]/correct/route.ts` — `POST` →
  `correctMovement(...)`.
- `app/api/stock-movements/outstanding/route.ts` — `GET` →
  `listOutstandingPurchases()` (Admin only).
- Every handler: role/ownership check (early-return `fail(...)` /
  `NextResponse`) → `schema.safeParse` → `try { domain } catch (e) { if
  (e instanceof DomainError) return fail(e.code, e.message, e.field);
  throw e }` → `ok(result)`. **No business logic, no `if` about a domain
  rule, in a handler.**

### Tests (`pnpm test`) — minimum

Real local Postgres, per-file `SCOPE` prefix (Session 5 pattern),
seed/cleanup per file, only clean your own rows.

- **`lib/domain/stock/derived-balance.test.ts`** — opening + receipts −
  issues − consumption sums to the right signed figure; a `correction`
  row is included in the sum (no double-count, no omission); `asOf`
  excludes later rows.
- **`lib/domain/stock/correct-movement.test.ts`** — correcting an
  **open-day** movement as its original recorder writes a delta row,
  leaves the original intact, and moves the derived balance by exactly
  the delta; correcting a **closed-day** movement as a non-Admin →
  `FORBIDDEN`; as Admin → succeeds; a `DayClose` fixture is created for
  the target date.
- **`lib/domain/stock/transfer.test.ts`** — a transfer writes the two
  counterpart rows (signs + `transferCounterpartLocationId` correct);
  the 2-phase pending/accept state behaves as designed; derived balances
  at both locations move correctly only once the transfer is complete.
- **`lib/domain/stock/movement-guards.test.ts`** — `non_sale_consumption`
  with `reason = "other"` and no `reasonNote` → `VALIDATION_ERROR`;
  `recordProduction` on a non-dish product → `DomainError`;
  `recordPurchaseReceipt` with a bogus `purchasePaymentId` → `NOT_FOUND`
  / `VALIDATION_ERROR`.

Keep the existing 35 tests green.

### Cleanup / verification (all required before "done")

1. `pnpm tsc --noEmit` exits 0 (`rm -rf .next` first if `.next/dev/types`
   complains).
2. `pnpm test` — all suites green, including the new ones. State the
   count in `PROGRESS.md`.
3. `grep -rn "TODO(mock)" lib/domain/stock app/api/stock-movements` →
   empty (or every remaining marker is explicitly re-scoped with a
   reason, e.g. the `MoneyMovement` write deferred to F3 — call it out in
   `PROGRESS.md`).
4. `pnpm dev` smoke as the relevant roles (local Postgres + `pnpm prisma
   db seed`): `POST` one of each `movementType` you built; `GET
   /api/stock-movements` as Admin vs as a Store Manager (location
   scoping); `POST .../:id/correct` on an open-day row and confirm the
   derived balance shifts by the delta; `GET .../outstanding`. Any
   throwaway script lives in the repo root and is deleted when done
   (import from `@playwright/test`, not `playwright`).
5. **No screen / kit / shell file touched.** `git status` should show
   only `lib/domain/stock/**`, `lib/validation/stock.ts`,
   `lib/api/**` (new helper), `app/api/stock-movements/**`, and docs.

---

## Wrap-up

- `docs/sprints/milestone-1-plan.md` §5 — mark **Session 6 DONE**; note
  "F2 stock backend (domain + APIs) implemented + tested; ready for
  Session 7 (Admin stock frontend)".
- `docs/PROGRESS.md` — a "Session 6" entry in the Session-5 format:
  domain fns + routes shipped, the sign convention chosen, the 2-phase
  transfer model, the `MoneyMovement`/F3 boundary decision, any API.md
  contract change (camelCase, endpoint shapes), test counts, anything
  flagged.
- `docs/API.md` — update the "Stock Movements" section to the implemented
  contract (camelCase fields, exact bodies, the correct/outstanding
  shapes), same as Session 5 did for Catalog.
- `docs/DECISIONS.md` — a short ADR (next number is **ADR-39**) for the
  real choices: the signed-quantity convention, the 2-phase transfer
  representation, and the `MoneyMovement` boundary if you resolved it.

---

## Constraints (unchanged)

- **Development Sprint role.** Real logic only. **No new UI/UX
  decisions** — missing/contradictory design → STOP and flag.
- **No business logic in `app/api/*`** — parse → validate → check
  auth/role/ownership → call `lib/domain/stock` → standard response
  shape.
- **Ledger, not stored totals.** Balance is *always* a signed sum of
  `StockMovement` rows. There is no balance column and you do not add
  one.
- **Corrections are new rows (ADR-15).** `correctMovement` never mutates
  the original. Closed-day → Admin only; open-day → original recorder
  too.
- **Money & quantity are `Decimal`**, never float. Day boundaries via
  `lib/time` (`Africa/Nairobi`), never server-local.
- **Reuse Session 5's `lib/api/*` helpers and the per-file `SCOPE` test
  pattern.** Match its camelCase-on-the-wire convention and update API.md
  to match.
- pnpm only. Read `node_modules/next/dist/docs/` before any Route
  Handler / route API code.
- Do NOT touch any `app/**` screen, `components/kit/*`,
  `components/shells/*`, `docs/design/screens/*`, or `/design-preview/*`.
- Post a checklist up front; tick it per task.
