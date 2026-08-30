# Flow — Canteen Derived Sales

**Status:** Design Sprint M2-01 (2026-08-29); **§period-boundary +
walkthroughs C–D + K1 artboards re-spun 2026-08-30** to match Session
5's `voidStockCount` (see the box in §The period-boundary case). Design
intent for the **Canteen Attendant's stock count → derived sale** (K1)
and how that sale appears in the existing Canteen hub timeline (K2),
plus the Admin's per-product derived-sales view (A4).

> **Artboard status:** **DONE** (K1/K2/A4 drawn Session 1b 2026-08-29,
> K1 re-spun 2026-08-30 for `voidStockCount`). K1 is a full staff
> screen with **9 states** — pick / preview / first-count / **counted
> more than expected (blocked)** / **delete confirm** / **delete
> success** / **count locked (previous day)** / validation error /
> confirm success. K2 is a new entry type in the existing Canteen hub
> timeline (`9BA-0`), shown interleaved. A4 is desktop + mobile with
> every structural state, no negative-revenue treatment. See the
> "Artboards" list at the bottom of this doc.
>
> **K1's product picker gets the same category tab row as C2** — the
> existing kit `Tabs` (underline) over the new product `category` field
> (see `restaurant-sales-flow.md` §New components and the field flag in
> `milestone-2-plan.md` §6/§10). See **ADR-15** (corrections are new
rows), **ADR-16** (canteen derived sales written as `Sale`
`StockMovement`), **ADR-17** (money is a derived ledger), **ADR-29**
(Africa/Nairobi day boundary), **ADR-30** (Decimal money). Built: backend
Session 5, screens Session 6.

**Scope:** the Canteen only. The Attendant never enters a sale — sales
are **derived** from a stock count over the period since that product's
previous count. No credit and no M-Pesa at the Canteen in M2 (plan §3.5).
Non-sale consumption and transfers into the Canteen already exist (M1);
this flow *uses* them as inputs to the derivation, it does not re-design
them.

---

## Who and why

**Actors:**
- the **Canteen Attendant**, on their phone at the Canteen, counting
  what's physically on the shelf (K1); the same hub they already use
  (K2).
- the **Admin**, checking per product when it was last counted and what
  period a derived figure covers (A4) — PRD §4.4.

**Job to be done (Attendant):** *"Count what's left. Tell me what that
means was sold and how much money that is — before I commit it — then
record it."*

**Job to be done (Admin):** *"For each canteen product, when was it last
counted, what stretch of time does the latest 'sold' figure cover, how
many units, how much revenue?"*

---

## The screens

| ID | Screen | Shell |
|---|---|---|
| **K1** | Stock Count | Staff mobile shell, `FlowHeader` (back, title "Stock Count", no direction badge) |
| **K2** | Canteen Hub — derived sales in the log | The **existing** Canteen hub (`9BA-0`) — a new entry *type* in its `ActivityTimeline`, not a new screen |
| **A4** | Canteen Derived Sales view | Admin desktop shell + mobile variant; `SimpleTable`; per-product rows |

---

## Cross-cutting rules these screens encode (plan §3.5)

1. **The sale is derived, not entered.** On a stock count:
   `sold = opening + received (transfers + production) − non-sale
   consumption − counted remaining`, computed over the period **since
   that product's previous count**. The Attendant enters only the
   **counted remaining** value; everything else is summed from existing
   `StockMovement` rows.
2. **Preview before commit.** K1 shows a **preview card** — "since last
   count on {date}: sold {n} {unit}, revenue KES {y}" — **before** the
   Attendant taps Confirm. It is a read-out (`CalculatedImpactBanner`),
   never editable.
3. **On confirm, three writes.** (a) the `StockCount` row at
   `occurredAt`; (b) a **`Sale` `StockMovement`** for `sold` (so
   Restaurant and Canteen sales share one reporting model — ADR-16);
   (c) a **revenue `MoneyMovement`** = `sold × canteen selling price`,
   **account = Cash** (no M-Pesa, no credit at the Canteen in M2).
   Closing stock is set to the counted value.
4. **First-ever count for a product** has no previous count to bound the
   period. The preview copy differs — "first count for this product:
   opening {o} + received {r} − non-sale {c} − counted {rem} = sold {n}"
   — and the period runs from the product's opening-stock baseline.
5. **A count can't go negative — you delete and redo instead.**
   *(Owner decision 2026-08-30 — supersedes the earlier "allow a
   negative-sold reconciliation" design; see the box below.)* If the
   Attendant counts **more than the derivation expects to be left**
   (i.e. `sold` would be negative), `recordStockCount` **rejects** it —
   `400 VALIDATION_ERROR` on the count field, nothing written. The fix
   is one of:
   - **Same-day:** `voidStockCount` hard-deletes today's count (the
     `StockCount` + its `Sale` `StockMovement` + its `canteen_sale`
     `MoneyMovement`), keeps a `hard_delete` `AuditLog` row, and the
     Attendant re-counts. `DELETE /api/canteen/stock-counts/:id`,
     `canteen_attendant` only, own count, business day == today
     (`Africa/Nairobi`).
   - **After the day rolls:** locked — `voidStockCount` returns
     `FORBIDDEN`. Only an Admin can fix it, via a correction path that
     is **not built in M2** (a later milestone).
   K1 still has no "edit last count" field — a correct count is fixed
   by deleting it and counting again, never by editing the row.
6. **Audit (ADR-25).** `recordStockCount` writes an `AuditLog` row.
7. **Role scoping.** K1/K2 are the Attendant's — they show canteen
   selling price and revenue (the Attendant needs to see the money the
   count implies), but **no buying price, unit cost, or margin**. A4 is
   Admin-only.

---

## The period-boundary case

A derived figure always covers **[previous count of this product →
this count]**. The design has to be honest about two things:

- **A gap with no count is not lost.** If Soda 300ml was last counted
  Monday and is counted again Thursday, Thursday's "sold" covers
  Monday→Thursday in one figure. The Attendant sees the date range in
  the preview ("since last count on Mon 25 Aug") so a 3-day figure never
  looks like a 1-day figure.
- **Counting more than expected is a hard stop, not a negative.**
  *(Owner decision 2026-08-30.)* If the shelf holds more than the
  derivation expects, a receipt or transfer into the Canteen almost
  certainly wasn't recorded. The count is **rejected** — the Attendant
  can't save a figure the ledger doesn't back. K1 shows the rejection
  inline (see walkthrough C) and, if they've already recorded a count
  today they want to redo, offers **Delete today's count**. Once the
  missing movement is logged and the count re-run, its period covers
  the full span since the *previous* count as normal — nothing is lost.
- **This is the Canteen analogue of the Restaurant's §3.8** — both
  block rather than let a figure go negative. (Restaurant blocks an
  oversell; the Canteen blocks a count that outruns recorded stock.
  Different cause, same "the ledger must back the figure" principle.)

> **UPDATED 2026-08-30 — supersedes the original "allow a negative-sold
> reconciliation" design.** M2 Session 5 (backend) built `recordStockCount`
> to **reject** `sold < 0` and added `voidStockCount` (same-day
> hard-delete). The earlier text here described accepting a negative
> "sold" with an offsetting negative `canteen_sale` `MoneyMovement`;
> the owner chose reject + same-day undo instead, for ledger integrity
> (a negative revenue row is awkward to reconcile against Cash). The
> M2-01b artboards were re-spun to match (Design, 2026-08-30) — see the
> Artboards list. No negative-sold or negative-revenue state exists
> anywhere in M2.

---

## Walkthroughs

### A — a normal count with a prior period (K1)

1. Attendant opens the Canteen hub (`9BA-0`) → taps **"Perform Stock
   Count"** in Canteen Workflows → **K1 Stock Count**. `FlowHeader`:
   back chevron + "Stock Count", no direction badge.
2. **Pick product**: a `Select searchable` (or a short list) of canteen
   products — name + unit. Attendant picks **Soda 300ml**.
3. A **"counted remaining"** field appears (`QuantityStepper` or numeric
   `TextInput`, unit label shown — "pcs"). Attendant counts the shelf:
   **96**.
4. A **preview card** (`CalculatedImpactBanner`, warning-amber) renders
   immediately below, read-only:
   *"Since last count on Mon 25 Aug (3 days): opening 144 + received 48
   − non-sale 0 − counted 96 = **sold 96 pcs**. Revenue **KES 5,760**
   (96 × KES 60). Closing stock will be set to 96 pcs."*
5. Attendant taps **Confirm count** (primary, sticky bar). Server writes
   the `StockCount` (96, now) + a `Sale` `StockMovement` (−96 pcs,
   Canteen) + a `MoneyMovement` (+KES 5,760, Cash, `sourceType =
   canteen_sale`) and sets closing = 96.
6. Returns to the hub. A `Toast` (bottom-center) — "Count recorded ·
   96 pcs sold · KES 5,760". A **new timeline entry** appears (K2).

### B — the first-ever count for a product (K1)

1. Same entry. Attendant picks **Mandazi** — a product added to the
   canteen catalog but never counted.
2. Enters counted remaining **12**.
3. The preview card copy is the **first-count variant**:
   *"First count for Mandazi. Opening 40 + received 0 − non-sale 2 −
   counted 12 = **sold 26 pcs**. Revenue **KES 520** (26 × KES 20).
   Closing stock will be set to 12 pcs. This figure covers everything
   since Mandazi's opening stock was set."*
4. Confirm → same three writes. The period baseline for Mandazi's *next*
   count is now this count.

### C — the Attendant counts more than expected (K1, blocked)

1. Soda 300ml's derivation expects ~96 left; the Attendant counts
   **112** — more than the ledger accounts for.
2. **No preview card renders.** The **counted** field shows the §9.8
   error pattern (border `--color-danger`) with the server's message
   directly below: *"Counted quantity exceeds expected stock by 16
   pcs."* **Confirm count** stays disabled.
3. Below it, an **`InstructionalBanner`** (`--color-info-bg`):
   *"More on the shelf than expected — a transfer or delivery into the
   Canteen may not have been recorded. Ask the Store Manager to log it,
   then recount — the count can't be saved until the numbers line up."*
4. A quiet line under that: *"Counted this product already today?"* →
   **Delete today's count** (only shown if a same-day count for this
   product exists — the redo case).

### C2 — deleting and redoing a same-day count (K1)

1. From walkthrough C's **Delete today's count** link (or the same
   affordance surfaced after a mistaken but *valid* count), a
   **`FrictionDeleteDialog`** opens over the dimmed screen — **no
   type-to-confirm field** (same-day, recoverable by recount;
   `showTypeToConfirm={false}` per ADR-36c):
   - danger triangle + **"Delete today's count?"** + eyebrow
     *"SAME-DAY ONLY · REMOVES THE SALE"*
   - `--color-danger-bg` body: *"Deletes the stock count for Soda 300ml
     and the sale it created — 96 pcs, KES 5,760.00. Closing stock goes
     back to before the count. Do a fresh count to replace it."*
   - **Cancel** / **Delete count** (destructive primary).
2. Confirm → `voidStockCount` hard-deletes the `StockCount` + its
   `Sale` `StockMovement` + its `canteen_sale` `MoneyMovement`; writes a
   `hard_delete` `AuditLog` row. Returns to the hub with a `Toast` —
   *"Count deleted · Soda 300ml sale removed · recount when ready"*. The
   timeline entry for that count is **gone**.
3. The Store Manager logs the missing transfer; the Attendant re-counts
   from walkthrough A — the new count's period covers the full span
   since the *previous* count.

### C3 — the count is from a closed day (K1, locked)

1. The Attendant opens a count whose business day (`Africa/Nairobi`)
   **is not today** (e.g. via History).
2. The **counted** field renders read-only (dimmed, shows the recorded
   value). An amber **locked banner**: *"This count is from a closed
   day — counted Thu 28 Aug at 5:40 pm, 96 pcs. Counts can only be
   deleted on the same day. Ask the Admin to correct it."*
3. The sticky bar's primary is disabled: *"Only the Admin can change
   this."* `voidStockCount` returns `FORBIDDEN` for a past-day count.
   (The Admin correction path is a later milestone — mirrors C4's
   "Correct this (Admin)" in `restaurant-sales-flow.md`.)

### D — K1 validation error (blank / non-numeric)

- Counted remaining left blank or non-numeric: the field shows the
  §9.8 error pattern — border `--color-danger`, helper *"Enter the
  counted quantity (0 or more)"*. **Confirm count** is disabled until
  it's valid. No preview card renders while the input is invalid.
  *(A value that's numerically fine but exceeds expected stock is
  walkthrough C, not this — the server distinguishes them.)*

### E — K1 confirm success

The `Toast` from walkthrough A step 6; the screen returns to the hub;
the timeline (K2) gains the entry.

### F — the derived sale in the hub timeline (K2)

1. On the Canteen hub (`9BA-0`), **Today's Canteen Log**
   (`ActivityTimeline`) already lists movements like "Accepted 48 pcs
   Soda 300ml from Store · 11:32" and "Opening Stock Confirmed · 08:30".
2. A derived sale is **a new entry type in that same feed**, styled
   consistently with the existing rows:
   - title: **"Stock count — Soda 300ml"**
   - subtitle: **"96 pcs sold since Mon 25 Aug · closing 96 pcs"**
     (`--text-secondary`)
   - trailing value: **"+KES 5,760.00"** in `--color-success`,
     `--font-mono` (revenue in), matching how other signed values
     render in the timeline. A **zero-sold** count (nothing sold since
     the last count) writes no `canteen_sale` `MoneyMovement`, so its
     row shows a muted em-dash where the value would be. *(There is no
     negative-revenue row — see the period-boundary box.)*
3. No new screen, no new component — `ActivityTimeline` already handles
   title / subtitle / signed trailing value. K2's artboards just show
   the hub timeline **with** a derived-sale row, and **interleaved**
   with a transfer + an opening-stock row so the visual consistency is
   the acceptance point.

### G — Admin per-product derived-sales view (A4)

1. Admin → **Sales → Canteen** (or a "Derived sales" sub-nav) → **A4**.
   `PageShell` + breadcrumb + a filter row (**Product**, **Date
   range**) + a `SimpleTable`:
   **Product · Last counted · Period covered · Units sold · Revenue**.
   - "Last counted" = date + relative ("Thu 28 Aug · 1 day ago").
   - "Period covered" = the span the latest figure covers ("Mon 25 Aug
     → Thu 28 Aug"). This is the PRD §4.4 requirement made literal.
   - "Units sold" and "Revenue" — `--font-mono`, right-aligned. Always
     ≥ 0 (`recordStockCount` rejects a count that would go negative —
     see the period-boundary box); a **zero** count shows "0" / "—".
2. **A4 never-counted product**: a row for a canteen product with no
   count yet — "Last counted" = "Never", "Period covered" = "—", "Units
   sold" / "Revenue" = "—" (muted em-dash, not blank — §5 tables). It's
   shown so the Admin sees the gap.
3. **A4 filtered-empty** (Product/date filter matches nothing):
   `EmptyState variant="filtered"` + **Clear filters**, chips stay
   visible.
4. **A4 loading**: filter row renders; table body 3 `.kit-skeleton`
   rows.
5. A4 has no "empty" (no-products) artboard distinct from filtered-empty
   worth drawing — if the canteen catalog is truly empty that's an M1
   catalog problem, not this screen's; a one-line note covers it.

---

## Data notes for Session 5 / Session 6

- **`recordStockCount`** → `{ productId, countedRemaining, occurredAt }`.
  Then: derive `received` = Σ(`transfer_in` + `production`) for
  `{productId, Canteen}` since the previous `StockCount.occurredAt` for
  that product (or the product's opening baseline if none);
  `nonSale` = Σ `non_sale_consumption` over the same window;
  `opening` = the previous count's `countedRemaining` (or opening-stock
  baseline). `sold = opening + received − nonSale − countedRemaining`.
  **If `sold < 0` → reject** (`400 VALIDATION_ERROR` on the count
  field, nothing written). Otherwise write the `StockCount`, a `Sale`
  `StockMovement` of `−sold` (`quantity 0` is still written, for a
  uniform audit trail), a `MoneyMovement` of `sold × canteenSellingPrice`
  (`account = "cash"`, `sourceType = "canteen_sale"`) — **skipped when
  `sold === 0`** (no zero money row) — and set closing to
  `countedRemaining`.
- **`voidStockCount(countId, ctx)`** (`DELETE
  /api/canteen/stock-counts/:id`) → hard-deletes the `StockCount` + its
  `Sale` `StockMovement` + its `canteen_sale` `MoneyMovement`; writes a
  `hard_delete` `AuditLog` row. `canteen_attendant` only, own count,
  business day == today (`Africa/Nairobi`). Past-day → `FORBIDDEN`.
- **`recordStockCount` return shape** (feeds the K1 preview card):
  `{ count, derivedSale }` where `derivedSale = { unitsSold, revenue,
  periodStart, periodEnd }` — `unitsSold` a 4dp string (always ≥ 0),
  `revenue` 2dp string, `periodStart` the previous count's `occurredAt`
  ISO or **`null`** for a first-ever count (K1's copy branches on this),
  `periodEnd` this count's `occurredAt`.
- **Canteen selling price** is the product's `ProductLocation` selling
  price for the Canteen (each location has its own — PRD §3).
- **No `Debt` path, no M-Pesa account** on this flow (plan §3.5). If a
  real need for either surfaces, **flag it — do not add it silently**.
- **`getDerivedSalesForProduct` / `listDerivedSales`** → per product:
  `{ lastCountedAt, periodStart, periodEnd, unitsSold, revenue }` for
  A4. All derived from `StockCount` + `StockMovement` + `MoneyMovement`
  rows; nothing stored.
- **Routes:** `POST /api/stock-counts`, `GET /api/stock-counts` (or
  `GET /api/canteen/derived-sales` for A4 — Session 5 picks).
- **Composed from:** staff shell + `FlowHeader`, `Select` (searchable),
  `QuantityStepper` / `TextInput`, `CalculatedImpactBanner` (the preview
  card — exact fit, no new component), `InstructionalBanner` (count-more-
  than-expected explainer), `FrictionDeleteDialog`
  (`showTypeToConfirm={false}` — the delete-count confirm),
  `ActivityTimeline` (K2, existing), `PageShell` + `SimpleTable` +
  `PillFilter` + `EmptyState` (A4), `Toast`. **No kit change.**

---

## New components

**None.** The derived-sales **preview card** is
`CalculatedImpactBanner`; the count-more-than-expected explainer is
`InstructionalBanner`; the same-day delete confirm is
`FrictionDeleteDialog` with the type-to-confirm field off (ADR-36c's
`showTypeToConfirm={false}` — same-day and recount-recoverable, so no
name-typing gate). The hub entry is an `ActivityTimeline` row. A4 is
`SimpleTable` + a mapper. Session 2 (the `QuantityStepper` tap-to-type
kit change) is used by K1 but is not gated by this flow.

---

## Artboards (Paper — "Prosper Hotel", page "Shell+Component kit")

- `K1 Stock Count — product picker [M2-01]`
- `K1 Stock Count — count entered + preview [M2-01]`
- `K1 Stock Count — first-ever count (preview copy differs) [M2-01]`
- `K1 Stock Count — counted more than expected (blocked) [M2-01]`
- `K1 Stock Count — delete count confirm (FrictionDeleteDialog) [M2-01]`
- `K1 Stock Count — delete count success [M2-01]`
- `K1 Stock Count — count locked, previous day [M2-01]`
- `K1 Stock Count — validation error [M2-01]`
- `K1 Stock Count — confirm success [M2-01]`
- `K2 Canteen Hub — derived-sale entry in timeline [M2-01]`
- `K2 Canteen Hub — derived-sale interleaved with other movements [M2-01]`
- `A4 Canteen Derived Sales — desktop populated [M2-01]`
- `A4 Canteen Derived Sales — product never counted [M2-01]`
- `A4 Canteen Derived Sales — filtered-empty [M2-01]`
- `A4 Canteen Derived Sales — loading [M2-01]`
- `A4 Canteen Derived Sales — mobile [M2-01]`

Frames created in Session 1b (M2-01b, 2026-08-29) and **re-spun
2026-08-30** to match the shipped `voidStockCount` (see the
period-boundary box). Page "Shell+Component kit": K1 at `worldY 20400`,
K2 at `21400`, A4 at `19300`. K1 composed from the staff mobile shell +
back-nav `FlowHeader` (no direction badge), `Tabs` (the C2 category tab
row over the new `category` field), `QuantityStepper` tap-to-type,
`CalculatedImpactBanner` (the preview card — exact fit),
`InstructionalBanner` (the "count more than expected" explainer),
`FrictionDeleteDialog` (`showTypeToConfirm={false}`, ADR-36c) for the
delete-count confirm, `Toast`. K2 is an `ActivityTimeline` row added to
the existing hub (`9BA-0`) — no new screen, no new component. A4
composed from the Admin desktop + mobile shells + `SimpleTable` + chip
filter row + `EmptyState`. **No kit change.** The chip filter bar, the
derived-sale timeline row (normal + zero-sold), and the stock-count
delete-confirm are pinned on the "Component Kit — M2 Sales Patterns
[M2-01]" artboard.

**Re-spin changelog (2026-08-30):**
- `K1 … correcting re-count, negative sold` → renamed + reworked to
  `K1 … counted more than expected (blocked)` (§9.8 inline error +
  `InstructionalBanner`, Confirm disabled, no preview).
- Added `K1 … delete count confirm`, `K1 … delete count success`,
  `K1 … count locked, previous day`.
- A4 `desktop populated` + `mobile`: the correcting-negative Mandazi row
  → a normal positive count; no `--color-danger` on any Units/Revenue
  cell.
- "M2 Sales Patterns" derived-sale timeline row: correcting-negative
  variant → zero-sold variant; new "Stock-count delete confirm" section.
- K2: no change needed (both artboards already showed a positive
  derived sale).
