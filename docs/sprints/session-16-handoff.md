# Session 16 Handoff — Developer (Development Sprint): build Session 15's design changes + the full A5 Archive feature

**Status:** NOT STARTED.
**Role:** Developer, Prosper project. **Development Sprint**
(`sdlc.md` Phase 3.1 / 3.2, `export-workflow.md` Phase C). This session
**composes** the approved screens from the proven kit and **wires real
logic**. It makes **no design decisions** — everything is settled in
**ADR-46** and **ADR-47** (Design Sprint Session 15). If a screen needs a
state the kit + artboards don't cover, **stop and flag it in
`PROGRESS.md`** — do not invent one.

**Depends on:** Session 14 (in progress at handoff) — it converts the
Catalog `product-drawer` to `variant="rail"` (A3) and does the B1/B4/C2
copy. This session builds the delete-in-drawer section **into that rail
drawer**. If Session 14 has not merged, do its A3 change first (it is a
one-line `variant="rail"` + `grow` footer button, already done for the
other three drawers) or coordinate.

---

## Required reading (before any code change)

1. **`CLAUDE.md`** — the non-negotiable rules (ledgers not stored totals;
   corrections are new rows; `app/api/*` has no business logic; money is
   `Decimal`; `Africa/Nairobi` day boundary; resolve every `TODO(mock)`).
2. **This file's source ADRs — read both in full:**
   - **`docs/DECISIONS.md` ADR-46** — **read the scope-correction box at
     the top first.** The Financials change is **only the Reconciliation
     section → a table** (KPI strip, tabs, transactions table all stay);
     the 4-term status vocabulary for that table; **the data-shape change
     (real `StockMovement` columns — §3)**; the row-action pattern
     (A1/A2 §5),
     the payment-picker (C1 §6), the A4 kind explainer (§8), the B3
     typography (§9), and §7's artboard list.
   - **`docs/DECISIONS.md` ADR-47** — the Archive model: the Archived
     tab, friction-free Unarchive, the **M1 enforcement scope (§3 — the
     stock-flow picker exclusion is the line that matters)**, and the
     API delta (§4).
3. **`docs/design/export-workflow.md`** Phase C — compose from the kit;
   thin per-screen mappers; `fixtures.ts`; the per-screen gate (visual
   diff vs the artboard, a `*.screen.test.tsx`, axe, responsive).
4. **`docs/design/design-principles.md`** — §4.6 (B3 typography, new),
   §9 (the enforced interaction contract).
5. **`docs/design/component-states.md`** — §2 C5 (the searchable-`Select`
   flag + the M1 interim), C15 (the Archived-tab row treatment + single
   "Edit" action), C18 (the bottom delete section + the archived-guard
   caption), C24 (MatchCard — state-complete, use as-is).
6. **`docs/PROGRESS.md`** — the Session 15 entry (the build list, in
   brief) and the Session 14 entry (what already shipped).
7. **`docs/API.md`** "Catalog" + "Stock Movements" + "Assets" — the
   current contracts you are extending.
8. **`docs/SCHEMA.md` §3** — `StockMovement` (you add 4 nullable
   columns).
9. **The Paper artboards** ("Prosper Hotel", `01M0EZ7TAHZM26KBMWNYT0928X`,
   page "Shell+Component kit") — the **visual acceptance targets**:
   - `Admin Financials — Reconciliation-First (M1) [S15]` + the 4 state
     siblings (`… · All reconciled`, `… · Loading`, `… · Error`,
     `… · Empty (no payments)`)
   - `Admin Financials — Payment Drawer (searchable picker) [S15]`
   - `Product Drawer — rail + kind hint + delete section [S15]`
   - `Admin Catalog — Archived tab [S15]`
   Pull each with `get_screenshot` (2×) + `get_computed_styles` for any
   value in doubt. **Never eyeball a screenshot for a value.**

---

## Scope — build list

### 1. Prisma migration + backend — real purchase-payment fields (ADR-46 §3)

1. **Migration.** Add to `StockMovement`, all **nullable**, set only for
   `movementType = "purchase_payment"`:
   ```prisma
   purchaseSupplier   String?
   purchaseOrderedQty Decimal? @db.Decimal(14, 4)
   purchaseTotalCost  Decimal? @db.Decimal(14, 2)
   purchasePaidFrom   String?   // "cash" | "mpesa_bank"
   ```
2. **Data-only backfill** (in the same migration, or a follow-up script
   run once): for every existing `purchase_payment` row, re-parse the
   `note` with the old regex (`/supplier[:=]\s*([^;|]+)/i`,
   `/cost[:=]\s*([\d,]+(?:\.\d{2})?)/i`, `/(cash|mpesa_bank)/i`, and the
   ordered magnitude); write what parses to the new columns; leave
   unparseable ones `null`. Keep the `note` string.
3. **`lib/domain/stock` `recordPurchasePayment`** — write the 4 new
   columns from the request (`supplier`, `quantity`, `cost`,
   `paidFromAccount` are already in the body). Still compose a **human**
   `note` for display ("Ordered 20 crate from Nairobi Grains Millers;
   KES 18,000.00 from M-Pesa / Bank Till"). **No `MoneyMovement`** — that
   `TODO(mock)` stays (ADR-39 §4).
4. **`StockMovementView` / the `GET /api/stock-movements` row shape** —
   add `purchaseSupplier` / `purchaseOrderedQty` / `purchaseTotalCost` /
   `purchasePaidFrom`. `GET /api/stock-movements/outstanding` returns the
   enriched rows unchanged in shape otherwise.
5. **`docs/SCHEMA.md §3`** — document the 4 fields + the
   "purchase_payment only" note. **`docs/API.md` "Stock Movements"** —
   add the 4 fields to the row shape; note that the payment-drawer
   product picker shows `ingredient` + `goods` only.
6. **Tests** — domain test that `recordPurchasePayment` persists the 4
   columns; a backfill test on a seeded legacy-`note` row.

### 2. `app/admin/financials/financials-client.tsx` — change ONLY the Reconciliation section (ADR-46 §1–2, scope-corrected)

**Read the scope box at the top of ADR-46 first.** The first draft of the
ADR proposed a full restructure; the owner turned it down. **Keep the KPI
strip, the `<Tabs>`, the transactions table, and the reconciled-outflows
footer exactly as they are.** The only change:

- **Delete** `parsePaymentNote` (the fields are real now — §1 of this
  handoff). The transactions-table mapper and the new
  reconciliation-table mapper both read the real
  `purchaseSupplier` / `purchaseOrderedQty` / `purchaseTotalCost` /
  `purchasePaidFrom` fields. `null` → "Supplier not recorded" / "Cost not
  recorded" (muted), never `—`.
- **Rebuild the Reconciliation block** from the old thin
  vendor/amount/status list into a **`<SimpleTable>`** with a per-screen
  `columns` mapper:
  **Date · Supplier / Item · Product · Destination · Amount · Status ·
  Action.** One row per open-or-recently-resolved purchase:
  - in `outstanding.awaitingReceipt` → **Awaiting delivery** (`warning`
    dot). Action `—`.
  - a `purchase_payment` with a `purchase_receipt` linking back & no
    variance note → **Delivered** (`success` dot). Action `—`. *(These
    are new — the old list hid delivered items. Pick a "recently" window,
    e.g. same business day; a Development-Sprint detail.)*
  - in `outstanding.unmatchedReceipts` → **Received, no payment**
    (`info` dot; **tint the row `--surface-subtle`**). Amount `—`. Action:
    a **"Record payment"** text affordance (accent, like "Edit"
    elsewhere) → opens `<PaymentDrawer>` with that product pre-selected.
  - variance note present → **Flagged** (`danger` dot). Action `—`. Only
    render when such a row exists.
  - Status cell = a dot + colored text at table density
    (`design-principles.md §4.4`), **not** a filled `StatusChip` pill.
  - Section subtitle → *"Has each payment been delivered? And which
    deliveries still need a payment recorded?"*
  - Nothing to reconcile → collapse the table area to one line: *"Every
    payment is matched to a delivery, and every delivery has a payment.
    Nothing to reconcile."*
  - Loading → the reconciliation table shows a header + 3 skeleton rows.
- **No `MatchCard`** on this screen. **No new endpoint** —
  `GET /api/stock-movements/outstanding` + the
  `?movementType=purchase_payment` list already give you the rows.
- The 5 parallel fetches, the `<PaymentDrawer>` orchestration, and
  `refresh` are otherwise preserved.
- Artboards: `Admin Financials — Full Table (Recon = table) [S15]` +
  `Financials Reconciliation — section states [S15]`.

### 3. `app/admin/financials/payment-drawer.tsx` — scoped + searchable picker (ADR-46 §6)

- **Filter the product list to `kind !== "dish"`** before passing it to
  the `<Select>`.
- **Control:** if the kit ships the **searchable `Select` variant**
  (flagged for a kit Design Sprint — check `components/kit/select.tsx`
  for a `searchable` prop / combobox mode), use it. Otherwise use the
  **M1 interim**: the plain `<Select>` with a `max-height` (~280px) +
  scroll on the popover — the `ingredient + goods` filter already cuts
  the list down. Do **not** hand-roll a combobox in the screen file.
- Redraw target: `Admin Financials — Payment Drawer (searchable picker)
  [S15]` — the "Ingredients & Goods only" caption under the field.
- The form state + the `recordPurchasePayment` POST are preserved.

### 4. Delete-in-drawer + Edit-only rows (ADR-46 §5) — Catalog **and** Assets

- **`app/admin/catalog/catalog-client.tsx`** — remove the Delete
  `<button>` from the row-actions column (desktop table **and** mobile
  card). The column becomes a single **"Edit"** affordance. Row click is
  **not** wired to open Edit.
- **`app/admin/catalog/product-drawer.tsx`** — after the last section, a
  full-width `--border-subtle` divider, then a **delete section**
  (edit-mode only, `product !== null`):
  - `--text-caption` / `--weight-semibold` / `--text-tertiary` uppercase
    label **"Delete this product"**;
  - `--text-sm` / `--text-secondary` copy: *"Removes it from the catalog.
    Blocked if it has transaction history — archive it instead."*;
  - a `<Button variant="tertiary">` with danger label
    ("Delete this product…") that opens the existing
    `<ProductDeleteDialog>` (unchanged — ADR-36c mechanic untouched).
  The dialog's `open` state moves from `catalog-client` (a row target)
  to the drawer.
- **`app/admin/assets/*`** — the **same** change: `asset-client`
  drops the row Delete button; `asset-drawer.tsx` gets the same bottom
  "Delete this asset" section opening the existing `<AssetDeleteDialog>`.
- Artboards: `Product Drawer — rail + kind hint + delete section [S15]`;
  the Assets equivalents follow the identical shape (ADR-46 §7).
- Update `catalog.screen.test.tsx` / the Assets screen spec: the row has
  no Delete button; opening Edit → the drawer's delete section →
  `FrictionDeleteDialog` still gates on the retyped name.

### 5. A4 — kind explainer (ADR-46 §8)

- **`product-drawer.tsx`** — a **selection-driven hint line** directly
  under the `<SegmentedControl>` (use the `<FormField>` `hint` slot, or a
  sibling `<div>` matching its style). Text changes with `kind`:
  - `ingredient` — "A raw item you buy and cook with. Has a buying price;
    used up by production."
  - `dish` — "A finished item you sell from the menu. It has no buying
    price — its cost comes from the ingredients it uses."
  - `goods` — "An item you buy and resell as-is. Has a buying price and a
    selling price."
- **Remove** the current `DISH_NOTE` info-banner (the `isDish && (…)`
  block) — the `dish` hint now carries that fact in the same place as the
  others.

### 6. A5 — the full Archive feature (ADR-47)

1. **`POST /api/products/:id?mode=unarchive`** — mirror of the existing
   `DELETE …?mode=archive`. Admin only. Clears `deletedAt`. Does **not**
   auto-reactivate `ProductLocation` rows (ADR-38 — the Admin re-enables
   them via Edit). Idempotent. `{ data: { archived: false } }`.
2. **`POST /api/assets/:id/restore`** — mirror of
   `POST /api/assets/:id/soft-delete`. Admin only. Clears `deletedAt`.
   Idempotent. `{ data: { softDeleted: false } }`.
3. **`docs/API.md`** — document both.
4. **Catalog Archived tab** — it already exists in `catalog-client.tsx`.
   On that tab: each row shows a neutral **"Archived"** `<StatusChip>` in
   the name cell (desktop table — mobile already does), and the
   last-column action is **"Unarchive"** (accent text) instead of
   "Edit". Clicking it → `use-catalog`'s new `unarchive(id)` →
   `POST …?mode=unarchive` → toast ("Product restored") → refresh (the
   row leaves the tab).
5. **Assets Archived tab** — **add** an "Archived" tab to the Assets
   Register (`asset-client`), same treatment. `use-assets` gets
   `restore(id)` → `POST /api/assets/:id/restore`.
6. **The stock-flow picker exclusion — the integrity work (ADR-47 §3):**
   audit **every** call site that populates a product or asset picker in
   a stock flow and confirm it does **not** pass `includeArchived` /
   `includeDeleted`:
   - `issue`, `production`, `transfer` (both ends), `non_sale_consumption`
     product pickers (`app/store-manager/*`, `app/canteen/*`);
   - the **Record Payment** drawer product picker;
   - the bulk opening-stock grid;
   - the mobile stock-levels views;
   - the asset condition-transition surface (`asset` pickers, if any).
   `listProducts` / `listAssets` already exclude `deletedAt != null` by
   default — the audit is confirming nothing overrides that. **Add one
   screen/integration test per flow** asserting an archived product does
   not appear in its picker.
7. **Archived-record guard (cheap fallback, ADR-47 §3.2):** if the Edit
   drawer opens on an archived row (deep link / stale state), render its
   fields **disabled** + an info line ("This record is archived.
   Unarchive it to make changes.") + a **Close**-only footer. The normal
   path (the Archived tab offers only Unarchive) means this rarely fires.
8. **Deferred, do not build:** a read-only "view archived" drawer;
   blocking archived records from historical read surfaces (they must
   still show in the ledger / reports — ADR-23); recipe editing.

### 7. B3 — typography (ADR-46 §9 / `design-principles.md §4.6`)

Likely **no code change** — confirm the built `DenseLedger` matches
§4.6: `--font-mono` cells, movement values `--weight-regular`, Closing /
Closing Value + sticky footer `--weight-semibold`. If any `SimpleTable`
numeric column (Financials amounts, Assets cost basis) lacks
`font-variant-numeric: tabular-nums`, add it. No artboard changes.

---

## What this session does NOT do

- **No new design decisions.** ADR-46 / ADR-47 are complete. A gap → flag
  in `PROGRESS.md`, don't fill it.
- **No kit component change.** The searchable `Select` variant is a
  **kit Design Sprint** item — use the M1 interim on the plain `Select`.
  The delete section and the Archived-tab treatment are **screen
  compositions** (arbitrary drawer children + existing `Button` /
  `StatusChip` variants + existing dialogs) — do not modify
  `components/kit/*`.
- **No `MoneyMovement` / KPI wiring.** Still Milestone 3 (ADR-36 D-FIN,
  ADR-39 §4). The KPI strip is *removed* from the M1 screen, not wired.
- **B2 / B5 / the Playwright e2e harness** — Session 17 (QA).

---

## Exit criteria / definition of done

- The migration applies; the backfill runs; `recordPurchasePayment`
  persists the 4 columns; `parsePaymentNote` is deleted.
- `financials-client.tsx`: the KPI strip, tabs, transactions table, and
  footer are **unchanged**; the **Reconciliation section** matches
  `Admin Financials — Full Table (Recon = table) [S15]` + the section
  states artboard on a visual diff; the reconciliation table uses the
  4-term vocabulary; no `MatchCard`; `parsePaymentNote` is gone.
- `payment-drawer.tsx` — product picker scoped to `ingredient` + `goods`;
  searchable variant or the documented interim; matches `85W-0` [S15].
- Catalog + Assets rows have **one "Edit"** affordance, no Delete column;
  the Edit drawer has the bottom delete section opening the unchanged
  friction dialog.
- The kind hint renders under the `SegmentedControl` and changes with the
  selection; the `dish`-only banner is gone.
- `POST /api/products/:id?mode=unarchive` + `POST /api/assets/:id/restore`
  work; both Archived tabs show "Unarchive" + the "Archived" chip;
  Unarchive restores the row.
- **Every stock-flow product/asset picker excludes archived items**, with
  a test per flow.
- `design-principles.md §4.6` matches the built ledger; `tabular-nums`
  present on every `SimpleTable` numeric column.
- Global gates: `pnpm test` green (add the new specs, don't weaken the
  suite); `pnpm tsc --noEmit` exit 0; `pnpm build` clean; the kit's
  `pnpm test:visual` + `pnpm test:a11y` still pass (you should not touch
  `components/kit/*`).
- `docs/API.md` + `docs/SCHEMA.md` updated; `docs/PROGRESS.md` gets a
  Session 16 entry; this file's `Status:` → `DONE`; draft
  `docs/sprints/session-17-handoff.md` (QA — the adversarial M1 pass +
  Playwright e2e + B2 + B5).

---

## Suggested order

1. Read everything above; pull the 5 S15 artboards.
2. **Migration + backend first** (§1) — the Financials screen depends on
   the real fields.
3. **`financials-client.tsx`** recompose (§2) + its screen spec.
4. **`payment-drawer.tsx`** (§3).
5. **Delete-in-drawer + Edit-only rows** (§4) for Catalog, then Assets.
6. **A4 kind hint** (§5).
7. **A5 Archive** (§6) — endpoints, both Archived tabs, then the
   **call-site audit + one test per flow** (the integrity work — do not
   skip).
8. **B3** confirm (§7).
9. Global gates; docs; draft `session-17-handoff.md`.
