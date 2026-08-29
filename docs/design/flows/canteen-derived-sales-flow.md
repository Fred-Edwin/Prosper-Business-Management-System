# Flow — Canteen Derived Sales

**Status:** Design Sprint M2-01 (2026-08-29). Design intent for the
**Canteen Attendant's stock count → derived sale** (K1) and how that sale
appears in the existing Canteen hub timeline (K2), plus the Admin's
per-product derived-sales view (A4).

> **Artboard status:** **K1, K2 and A4 are deferred to Session 1b**
> (M2-01 was re-scoped to the Cashier screens — see
> `milestone-2-plan.md` §7/§10). This flow narrative stands and is the
> input to Session 5 (backend); Session 1b produces the K1/K2/A4
> artboards against it.
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
5. **Corrections (ADR-15).** A wrong count is fixed by recording **a new
   count** (or an Admin correction) — never by editing the `StockCount`
   row. K1 has no "edit last count" affordance; the correction is just
   the next count, whose derivation self-adjusts because the figures are
   derived (a period-boundary case — see §The period-boundary case).
6. **Audit (ADR-25).** `recordStockCount` writes an `AuditLog` row.
7. **Role scoping.** K1/K2 are the Attendant's — they show canteen
   selling price and revenue (the Attendant needs to see the money the
   count implies), but **no buying price, unit cost, or margin**. A4 is
   Admin-only.

---

## The period-boundary case

A derived figure always covers **[previous count of this product →
this count]**. Two consequences the design must be honest about:

- **A gap with no count is not lost.** If Soda 300ml was last counted
  Monday and is counted again Thursday, Thursday's "sold" covers
  Monday→Thursday in one figure. The Attendant sees the date range in
  the preview ("since last count on Mon 25 Aug") so a 3-day figure never
  looks like a 1-day figure.
- **A correcting re-count re-bounds the next period.** If Thursday's
  count was wrong and the Attendant counts again Friday, Friday's
  derivation covers Thursday→Friday and *starts from Thursday's counted
  value*. If Thursday's count was too low (overstating "sold"), Friday's
  opening is correspondingly low and Friday's derivation shows a smaller
  (or negative) "sold" that nets it out over the two periods. The design
  does **not** try to retro-edit Thursday — it shows Friday's figure
  plainly, including a **negative "sold"** if that's what the math says,
  with preview copy that names it: *"Counted more than expected — this
  period shows −4 pcs sold, correcting the previous count."* The revenue
  `MoneyMovement` for a negative "sold" is correspondingly negative
  (a reversal), keeping Cash reconciled.
- This is the Canteen analogue of the Restaurant's §3.8, and it is why
  the Canteen does **not** block on "negative": at the Canteen a
  negative is a *count reconciliation*, not an oversell. (Restaurant
  blocks because there a negative means selling stock that was never
  produced/received — see `restaurant-sales-flow.md` §the §3.8
  decision.)

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

### C — a correcting re-count showing a negative (K1)

1. Yesterday Soda 300ml was counted at 96, but the Attendant realises
   ~20 were miscounted and are actually still on the shelf. Today they
   count properly: **112** (yesterday's real remaining was higher, so
   yesterday over-reported "sold").
2. Preview card:
   *"Since last count on Thu 28 Aug (1 day): opening 96 + received 0 −
   non-sale 0 − counted 112 = **sold −16 pcs**. This period corrects the
   previous count — revenue **−KES 960**. Closing stock will be set to
   112 pcs."*
   The `−16` and `−KES 960` render in `--color-danger`; a caption under
   the card: *"A negative here means the last count was low. Recording
   this reconciles it."*
3. Confirm → `StockCount` (112) + `Sale` `StockMovement` (**+16 pcs**,
   i.e. stock back) + `MoneyMovement` (**−KES 960**, Cash) + closing =
   112. The two periods now net to the true total.

### D — K1 validation error

- Counted remaining left blank, or non-numeric, or negative:
  the field shows the §9.8 error pattern — border `--color-danger`,
  helper "Enter the counted quantity (0 or more)". The **Confirm count**
  button is disabled until it's valid. No preview card renders while the
  input is invalid.

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
   - trailing value: **"+KES 5,760"** in `--color-success`, `--font-mono`
     (revenue in), matching how other signed values render in the
     timeline. A correcting negative shows **"−KES 960"** in
     `--color-danger`.
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
   - "Units sold" and "Revenue" — `--font-mono`, right-aligned; a
     correcting-period negative shows in `--color-danger`.
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
  baseline). `sold = opening + received − nonSale − countedRemaining` —
  **may be negative** (period correction). Then write the `StockCount`,
  a `Sale` `StockMovement` of `−sold` (so +ve sold reduces stock, −ve
  sold returns it), a `MoneyMovement` of `sold × canteenSellingPrice`
  (`account = "cash"`, `sourceType = "canteen_sale"`), and set closing
  to `countedRemaining`.
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
  card — exact fit, no new component), `ActivityTimeline` (K2, existing),
  `PageShell` + `SimpleTable` + `PillFilter` + `EmptyState` (A4),
  `Toast`. **No kit change.**

---

## New components

**None.** The derived-sales **preview card** is
`CalculatedImpactBanner` — the kit component built for exactly this
("preview the numeric consequence of an action before it's saved",
`design-principles.md` §7 / `component-states.md` C23). The hub entry is
an `ActivityTimeline` row. A4 is `SimpleTable` + a mapper. Session 2 not
needed for this flow.

---

## Artboards (Paper — "Prosper Hotel", page "Shell+Component kit")

- `K1 Stock Count — product picker [M2-01]`
- `K1 Stock Count — count entered + preview [M2-01]`
- `K1 Stock Count — first-ever count (preview copy differs) [M2-01]`
- `K1 Stock Count — correcting re-count, negative sold [M2-01]`
- `K1 Stock Count — validation error [M2-01]`
- `K1 Stock Count — confirm success [M2-01]`
- `K2 Canteen Hub — derived-sale entry in timeline [M2-01]`
- `K2 Canteen Hub — derived-sale interleaved with other movements [M2-01]`
- `A4 Canteen Derived Sales — desktop populated [M2-01]`
- `A4 Canteen Derived Sales — product never counted [M2-01]`
- `A4 Canteen Derived Sales — filtered-empty [M2-01]`
- `A4 Canteen Derived Sales — loading [M2-01]`
- `A4 Canteen Derived Sales — mobile [M2-01]`
