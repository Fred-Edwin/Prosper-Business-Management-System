# Handover — Seed rebuild + 10 quantity/accuracy fixes

**For:** the next session (likely two sessions — see §0).
**Role:** Developer, streamlined loop (`docs/sdlc.md` Phase 3: backend →
frontend → in-session check). No Design Sprint; compose from the frozen kit.

**Read first:** `CLAUDE.md`, `docs/CONVENTIONS.md`, `docs/sdlc.md` Phase 3,
this file. For the ledger work also `docs/ARCHITECTURE.md` (ADR-11, ADR-40)
and `app/admin/stock/derive-ledger.ts`.

---

> **STATUS 2026-09-02 — §2 (the seed rebuild) is DONE.** `prisma/seed.ts`
> is rewritten (wipe + rebuild); F3, F5 and F10 are closed by the data.
> Gate green: 597/597 · tsc 0 · build clean. See `docs/PROGRESS.md`
> "dev seed wiped and rebuilt". **This session should start at §3** —
> the 10 code findings. Two deltas found while doing §2:
>
> - §2.2 said "do NOT delete AuditLog". `AuditLog.userId` is a RESTRICT
>   FK onto `user`, so that also forbids deleting Users. The seed now
>   upserts User / Staff / Location by name instead of wiping them.
> - ~~§3.7's fix names `nairobiBusinessDate()`, which does not exist.~~
>   **This delta is itself wrong — retracted 2026-09-02.**
>   `nairobiBusinessDate()` DOES exist: exported from
>   `app/cashier/use-orders.ts:71`, and `app/canteen/hub-client.tsx`
>   already imports it. Either helper works; `toBusinessDate(new Date())`
>   from `lib/time` is the tidier choice for a non-cashier screen, since
>   it avoids a canteen/SM screen importing from the cashier feature.
>
> F4 (§3.3) now reproduces on demand: the ledger reconciles exactly on all
> 7 seeded days *except* the opening day.

## 0. Why this is split, and what to do first

Two jobs, different shapes. **Do them in this order, ideally in two sessions:**

1. **Seed rebuild** (§2) — one large self-contained file rewrite. Do this
   FIRST: several findings are only *visible* with good data, and F3/F5/F10
   are fixed by the seed itself.
2. **The 10 findings** (§3) — code fixes. **F1 and F6 need an owner decision
   before coding** (§3.1, §3.6). Don't guess.

Do not attempt both plus verification in one session — the seed rewrite is
big enough to risk a mid-rewrite compaction.

---

## 1. Where this came from

Owner walked every Store Manager / Canteen Attendant / Restaurant Cashier
screen on 2026-09-02 and asked for a full quantity-accuracy audit, including
the Admin ledger ("this is what the admin refers to and checks daily").

Method: for each screen, call its API as that role, independently recompute
every figure from raw `StockMovement` / `Order` rows, and compare. Then
exercise the real write endpoints with scratch data and verify the deltas.
All scratch writes were reversed — the DB is back to 18 movements / 10 orders
/ 14 order lines. **The audit changed no source files.**

Full findings: `docs/sprints/m2-quantity-audit.md` (§3 summarises).

### Verified CORRECT — do not "fix" these
- Issue: Store Cooking oil 40 → 37 on issue 3 (sign + magnitude)
- Non-sale: Carrots 25 → 23 on spoiled 2
- Receive: Carrots 23 → 30 on receipt 7
- Transfer phase 1: Restaurant 60 → 54, Canteen still 0 (2-phase honoured)
- Transfer phase 2: Canteen 0 → 4 on accept 4
- Sale: Restaurant Chapati 115 → 114 on a 1-unit order (production path is fine)
- Balances carry forward correctly across days (asOf 29 Aug → 2 Sep stable)
- Ledger columns + totals recompute exactly against raw rows for 30 Aug / 2 Sep
- Stock-count preview: 192 − 150 = 42 sold, KES 2,520; count of 200 correctly
  blocks with `exceedsExpectedBy: 8`. Best-behaved calculation in the app.

---

## 2. SEED REBUILD — `prisma/seed.ts`

### 2.1 Owner decisions already made
- **Wipe + rebuild**, not upsert-onto-existing.
- **Dates relative to today**, recomputed each run (never goes stale).
- Goods are sold at the Restaurant too, not just the Canteen (see F10).

### 2.2 Wipe scope — READ THIS BEFORE DELETING
Owner accepted losing hand-made data. What a wipe destroys today:
| Table | Hand-made rows |
|---|---|
| Product | Matoke, Chicken Breast, **Rice**, Glucose |
| Customer | Test Customer, Test Customer 2 |
| Asset | Deep Frier, Fridge |
| Order | 1 |

**The seed MUST therefore include Rice, Matoke, Chicken Breast and Glucose
itself** — the owner uses Rice regularly. Delete in FK-safe order
(children first: OrderLine → StockMovement/MoneyMovement/Debt/Repayment →
Order/StockCount → ProductLocation → Product …), or use a transaction.
Do NOT delete `AuditLog` (79 rows of real history).

### 2.3 Principles
1. **Only seed what a built screen can display.** 10 tables are empty but 9
   have NO UI: Recipe, RecipeIngredient, Handover, ReceiptOfHandover,
   HandoverShortfall, OwnerTransaction, Attendance, StaffPayAdjustment,
   DayClose. `Expense` has a screen but **no API route** — verify before
   seeding it. Seeding the rest creates invisible data. EXCLUDED.
2. **Idempotent** — fixed `seed-*` ids, upsert after the wipe.
3. **Regenerate derived rows.** The current seed early-returns when an order
   already exists (`prisma/seed.ts` ~line 405-423), which is why 10 orders
   have **zero** `sale` movements (F3). New seed must always re-assert child
   rows.
4. **Respect `deletedAt`** — never resurrect a soft-deleted product, and skip
   its dependent rows (guard already in the ingredient block).
5. Nairobi wall-clock via the module-scope `at(daysAgo, hh, mm)` helper.

### 2.4 Catalogue — CORRECTED CLASSIFICATION (F10)
Current data types sodas/water/mandazi/groundnuts as `kind: "dish"`, so
**Record Batch Production offers "Soda 300ml" and "Water 500ml" as things to
cook.** Fix in the seed:

| Kind | Products | Stocked / sold at |
|---|---|---|
| `ingredient` | Cooking oil, Carrots, Beans, **Rice**, **Chicken Breast**, Wheat flour | **Store only** (`sellingPrice: null`) |
| `dish` | Chapati, Chicken Stew, Chips Full, Samosa, **Matoke**, Rice & Beans | Restaurant (priced) |
| `goods` | Soda 300ml, Water 500ml, Mandazi, Groundnuts 50g, Bar Soap, **Glucose** | **Restaurant AND Canteen** where sold, each with its own price |

Rules the seed must honour:
- Ingredients live at the **Store**, never the Canteen (today Beans sits at
  all three locations — wrong).
- Goods reach the Restaurant/Canteen via `purchase_receipt` or `transfer`,
  **never `production`**. Only dishes are produced.
- Soda/Water priced at both Restaurant and Canteen (currently @60/@60, @50/@50
  — keep).

**Deliberate edge cases to seed** (so the owner can see each state):
one archived product · one stocked-at-zero product · one never-stocked product.

### 2.5 Stock ledger — 7 days
Every `COLUMN_FOR_TYPE` column non-empty on at least one day; ≥1 resting
product per day (exercises the fix shipped this session); ≥1 negative balance.

| Day | Movements |
|---|---|
| −7 | `opening` at all three locations |
| −6 | purchase_payment → purchase_receipt (Store); production (Restaurant) |
| −5 | issue Store→Kitchen; production; canteen stock_count + derived sale |
| −4 | transfer Store→Canteen **accepted**; sales |
| −3 | non_sale_consumption (spoiled + staff meal); production |
| −2 | transfer **left pending** (incoming banner visible); sales |
| −1 | a **corrected** movement (correction-entry pattern visible) |
| today | 2–3 fresh movements + 1 pending inbound transfer |

### 2.6 Sales
~18 orders over both cashiers across 7 days; all 3 payment methods × all 3
order types; **one corrected order**; one delivery with a fee; credit orders
create `Debt`, some `Repayment` (one fully-paid, one partially-paid customer).
**Every order writes its `sale` StockMovement** ← fixes F3.

### 2.7 Canteen counts
5–6 `stockCount` rows across the week, each with its derived `sale` +
`MoneyMovement` ← fixes F5. Include one **zero-sold** count and one
**first-ever** count (no prior period).

### 2.8 Customers & assets
6 customers: 2 owing, 1 in credit, 1 settled, 1 no history, 1 archived.
4 assets across categories, 1 soft-deleted.

### 2.9 Acceptance
After `pnpm prisma:seed`, as each role:
- Store Manager: Issue/Receive/Non-Sale list real quantities; Production lists
  **dishes only** (no sodas); Stock Levels shows Open · move · Close per row.
- Canteen: hub timeline non-empty; stock-count preview derives sold+revenue;
  a pending inbound transfer shows the banner.
- Cashier: today's orders non-empty with a correct running total.
- Admin `/admin/stock`: every column populated on some day in the week;
  totals reconcile; resting products present.

---

## 3. THE 10 FINDINGS

Severity: **HIGH** = actively misstates money/stock to a user.

### 3.1 F1 · Cashier "Today" total double-counts corrections — HIGH ⚠️ NEEDS DECISION
`app/cashier/cashier-today-client.tsx:126-133`
Live on business date 2026-09-01, user "Cashier": screen renders
**KES 380 · 2 orders**; truly collected **KES 120 · 1 order**. Order #155 (260)
was corrected by #156 (200). `listOrders` returns the superseded original AND
the correction as separate rows, and a correction's `total` is the **full
recomputed total**, not a delta (`lib/domain/sales/correct-order.ts:167-180`).
The reducer sums every row.
**Second defect:** the cashier-scoped query never returns the correction row,
so `correctedByNumber` is always empty for a cashier ⇒ the "Corrected" chip
can never render on C1.
Admin unscoped has the same double-count: 4 rows, naive 1380 vs true 1120.
**Decision needed:** should a corrected order be (a) excluded once superseded
and only the correction counted, (b) both shown but only the correction summed,
or (c) the original shown struck-through? Affects C1, the Admin sales list, and
any revenue total. **Fix in the domain read, not per-screen** — otherwise every
future consumer repeats the bug.

### 3.2 F2 · Three of nine staff bottom-nav tabs 404 — HIGH
`components/layout/staff-shell-client.tsx:24-44` + `hrefForKey():65-68`.
Nav keys double as route segments (`<basePath>/<key>`); three name routes that
don't exist:
| Role | Tab | Bad href | Reality |
|---|---|---|---|
| Cashier | New Order | `/cashier/new-order` | real route is `/cashier/orders/new` |
| Store Manager | History | `/store-manager/history` | no such route |
| Canteen | History | `/canteen/history` | no such route |
Verified by HTTP: working pages 19–22KB, these three 13.8KB (Next default 404).
The Cashier's sticky "New order" **button** works — only the nav link is dead.
Cashier fix = give the def an explicit `href`. The two History tabs need an
owner call: **build the screen or drop the tab.**

### 3.3 F4 · Ledger hides opening stock on the day it is set — HIGH
`app/admin/stock/derive-ledger.ts:28-39` (`COLUMN_FOR_TYPE`).
`opening` maps to `null` ("derived from prior closing, not this day's rows").
But on the day an `opening` row is written the prior day's closing is 0 and the
row feeds no column:
```
Ledger 2026-08-29 Store:  Opening 0.0 · (all columns —) · Closing 0.0
Truth  (balances asOf 2026-08-29): Cooking oil 40 · Carrots 25 · Beans 30
```
The ledger's own Closing contradicts `GET /api/stock-movements/balances` for
the same date. Every product stocked via `/admin/stock/opening` is invisible on
exactly the day its stock was established. `stock_count` (also null) has the
same shape.
**Preferred fix:** compute opening as `balances asOf date` MINUS the day's
column sum — self-heals for every null-column type. Alternative: route
`opening` into its own column.

### 3.4 F3 · Seeded orders have no sale movements — MEDIUM (seed fixes it)
10 orders / 14 lines exist, 0 `sale` StockMovements. `prisma/seed.ts` ~405-423
early-returns when the order id exists, so a re-seed never regenerates them.
**Not a production bug** — verified by creating a real order through the API:
a `-1` Chapati sale row was written and the balance moved 115 → 114 correctly.
Impact: the ledger SOLD column is empty and Restaurant stock reads high.

### 3.5 F5 · Canteen derived sales report 0 units against real revenue — MEDIUM
`GET /api/canteen/stock-counts` returns `unitsSold "0.0000"` with
`revenue "2880.00"` (Soda), `"2000.00"` (Water), `"680.00"` (Mandazi).
Consequence of F3, not separate: `unitsSold` is DERIVED from `sale` movements
(StockCount has no `soldQuantity` column — units sold is never stored, per the
ledger rule). Fixing the seed resolves it. Consider a guard so revenue > 0 with
unitsSold == 0 can never render.

### 3.6 F6 · Transfer variance loses stock with no quantity trail — MEDIUM ⚠️ NEEDS DECISION
Live: dispatched 6 Samosa Restaurant→Canteen, accepted 4. Restaurant −6,
Canteen +4, **system-wide stock 60 → 58**. The 2 lost units exist ONLY as free
text on the accept row (`"Received 4, dispatched 6"`). No shrinkage column, no
movement row, nothing a total can sum — the ledger's TOTAL closing silently
drops with no column explaining it.
Arithmetic is internally consistent; this is a **missing accounting concept**.
**Decision needed:** add a `variance`/`shrinkage` movement type, or a variance
column on the ledger?

### 3.7 F7 · Both hubs show ALL history under a "today" heading — MEDIUM
`app/store-manager/hub-client.tsx:51` and `app/canteen/hub-client.tsx:44` call
`useStaffStock()` with **no date**; `use-staff-stock.ts:433` then calls
`listMovements({})` — unfiltered. The SM hub currently shows the 29 Aug opening
rows as if they happened today, while the code comment says "today's movement
log". Fix: `useStaffStock(nairobiBusinessDate())` on both.

### 3.8 F8 · Zero-quantity money rows render as stock — LOW
`purchase_payment` carries quantity 0 (money-only) but `movementsToTimeline`
renders it like any movement: "Rice · Purchase paid · **+0 kg**". The Admin
ledger deliberately routes this type to no column; the hub timeline has no
such exclusion.

### 3.9 F9 · Soft-deleted products render as "?" — LOW
`app/store-manager/staff-stock-format.ts:100` falls back to "Unknown product"
when a movement's product is missing from the joined list. `GET /api/products`
excludes soft-deleted rows, so any movement for an archived product shows an
unnamed row with no unit. Live-reproduced on the SM hub (Beans while archived).
Fix: carry `productName`/`unitLabel` on the movement read, or fetch archived
products for name resolution.

### 3.10 F10 · Goods mis-typed as dishes — HIGH (data model; seed fixes most)
See §2.4. `Record Batch Production` currently lists **Soda 300ml and Water
500ml as things to cook**. Beyond the seed, decide whether a **data migration**
is needed for any real rows already created through the UI.

---

## 4. State at handover

- `main` @ 403cc79 + uncommitted work from the ledger session (below). Not pushed.
- `pnpm test` **597/597** (73 files) · `pnpm typecheck` 0 · `pnpm build` clean.
- Dev DB restored to pre-audit state: 18 stockMovements, 10 orders, 14 lines.
- **Uncommitted** (previous session, all green — commit or keep):
  `app/admin/stock/use-stock.ts` (ledger resting-rows fix),
  `app/store-manager/flows/movement-picker-flow.tsx` (additive readout),
  `app/store-manager/stock/stock-levels-view.tsx` + `use-staff-stock.ts`
  (stock card), `prisma/seed.ts` (Store opening block — **will be superseded by
  the rebuild**), 2 modified specs + `tests/screens/admin-ledger-resting-rows.screen.test.tsx` (new).
- Script name is **`pnpm prisma:seed`**, not `pnpm db:seed`.
- Known flake: `cashier-new-order.screen.test.tsx` fails if a seed runs
  concurrently (m2-followups #17 — suite shares the dev DB). Passed 5
  consecutive clean runs.
