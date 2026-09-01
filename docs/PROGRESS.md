# Prosper — Progress Log

Running status log, updated at the end of every sprint session.

**How this log is kept (so it doesn't inflate):**

- The **current milestone** gets a full entry per session: what shipped,
  what's blocked, what changed from plan, key ADRs, gate state.
- When a milestone closes, its detailed entries are **compressed to
  one-line ledger rows** in the "Shipped — earlier milestones" table
  below, and the full milestone plan (`docs/sprints/milestone-XX-plan.md`)
  plus the ADRs remain the durable record.
- Per-session handoff docs are **not** kept — once a session's PROGRESS
  entry is written, the handoff has done its job.

---

## Milestone 2 — Staff can sell, every day

**Plan:** `docs/sprints/milestone-2-plan.md` (living — Session 6 split
into 6a / 6b / 6c / 6d / 6e).
**Status:** Sessions 2, 3, 4, 5 done; 1a + 1b done. **Sessions 6a + 6b +
6c + 6d + 6e done** (backend gap-fills + Customers feature; responsive Admin shell +
nav wiring + `SimpleTable` rowChevron + Catalog `category` field;
Restaurant Orders C1–C5 + hooks + minimal seed; Admin Orders A3 + Canteen
Derived Sales A4 + Canteen Stock Count K1 + Canteen Hub K2 + full M2 seed +
Domain Gap-Fixes G1–G4 + final gates). Ready for Session 7 (QA). S1a + S3 + S4 + S5 sit on
`feat/m2-session-4-orders`; 6a–6e are on `feat/m2-session-6-screens`.
Merge order to `main`: the whole M2 chain → 6a → 6b → 6c → 6d → 6e → S7 (one
PR after QA, mirroring how M1 landed).

### 2026-09-01 — M2 Session 3a: Admin merged "Sales" screen + F7-4 + F7-8 (Developer) — DONE

Post-QA batch-3 session (orchestrator-tracked, `feat/m2-3a-sales` off
`qa/m2-session-7`). Merged the Admin's two separate screens —
`/admin/orders` (A3) and `/admin/canteen/derived-sales` (A4) — into one
tabbed **`/admin/sales`** screen.

- **Route + nav.** New `app/admin/sales/` — `page.tsx` (server, resolves
  `?tab=`) + `sales-client.tsx` (kit `<Tabs>` underline; deep-link via
  `router.replace`; initial tab from `?tab=derived`). `orders-tab.tsx`
  (A3 content) + `derived-tab.tsx` (A4 content). Old route dirs deleted;
  `next.config.ts` `redirects()` 308s `/admin/orders` → `/admin/sales`
  and `/admin/canteen/derived-sales` → `/admin/sales?tab=derived`. The
  separate "Derived sales" nav link removed from `admin-shell.tsx` +
  `mobile-nav-drawer.tsx`; one "Sales" → `/admin/sales`.
- **Filter toolbar** (`filter-toolbar.tsx`, screen-level, Paper `IEA-0`).
  Composed from proven primitives (kit `<Select>` in a labelled `role=
  group` wrapper, a native `<input type=date>` popover, a native
  checkbox). Orders tab: Cashier · Date · Payment · Corrected-only.
  Derived tab: Product · Date. Right-aligned result count + a **Reset**
  link shown only when a control is off its default. Value display
  load-bearing (default = `--text-secondary`/regular; off-default =
  `--text-primary`/medium). Mobile: controls scroll horizontally, count
  + Reset drop to their own row. **Session 3e** retrofits this onto the
  shared `FilterToolbar` kit component (now on a separate branch).
- **F7-8 — Cashier / Payment pickers wired.** Payment → sets
  `filter.paymentMethod`, re-queries. **Cashier list source decision:**
  no `/api/staff` in M2, so the Cashier options are **derived from the
  loaded orders** (distinct `cashierId` + `cashierName`, kept in a
  sticky map so a narrowed result set doesn't drop the active option) —
  zero new API, per the orchestrator's pre-approved choice.
- **F7-4 — full corrected-order form** (`correction-form.tsx`). The
  Admin now restates the whole order: line list with `QuantityStepper`
  + remove + a searchable **add-product** row (kit `<Select searchable>`
  over the Restaurant menu via `useRestaurantProducts`), order-type +
  payment-method `<SegmentedControl>`s, a delivery-fee `<TextInput>`
  (Delivery only), a customer-attach `<Select searchable>` when payment
  = Credit (submit blocked until a customer is attached, parity with
  C3), required Reason `<Textarea>`. `CalculatedImpactBanner` recomputed
  against the exact request inputs; credit deltas labelled **"Customer
  debt"** (extends the F7-5 fix); payment-method changes show both the
  reversed original channel and the new one. Wired to `correctOrder`
  via the shared `use-orders` hook. The domain `validateOrder` stays
  the gate (delivery-fee-only-on-delivery, credit⇒customerId, §3.8 stock
  BLOCK); server errors surface inline.
- **Gate.** `tests/screens/admin-sales.screen.test.tsx` (22 tests) —
  folds in the old `admin-orders` + `canteen-derived-sales` specs and
  adds tab switch + deep-link, the working Payment/Cashier/Product
  filters, F7-4 (credit→cash saves + banner says "Customer debt";
  credit-no-customer disables submit; add-a-line), no-margin assertions.
  Old two specs deleted. `pnpm test` **460/460**, `pnpm tsc --noEmit`
  **0**, `pnpm build` clean (`/admin/sales` registers; old routes 308).
  `grep TODO(mock) app/admin/sales` clean.
- **Screenshot-diff deltas logged for QA:**
  1. **Correction form vs `G4I-0`** — the artboard still draws the
     pre-3a quantity-only drawer; 3a builds the fuller F7-4 form the
     flow docs specify (`customers-credit-flow.md` §G step 3 /
     `restaurant-sales-flow.md` §E). Expected per the 3a brief §3.4.
  2. **Linked correction row-group tint (`GCP-0`)** — the correction
     row's `bg-(--surface-subtle)` + left accent bar is **not** applied;
     `SimpleTable` has no per-row style hook and the kit is frozen this
     session. The "Corrected" / "Correction of #N" status text still
     ties the pair. (This tint was dead code in the shipped A3 too — the
     const was defined but never passed.)
  3. **Mobile toolbar** — the controls **wrap onto rows** rather than
     collapsing secondary ones into a **"More"** chip (`IJ1-0`).
     Functionally equivalent; all controls reachable. (Was briefly
     `overflow-x-auto`, which clipped the dropdown popovers — fixed to
     `flex-wrap` in the follow-up below.)
  4. **Date control** — a native `<input type=date>` in a small popover
     (the shipped A4 pattern), not the kit `DatePicker` calendar. The
     "Today" default already worked (F7-8); kept working.
  5. **Linked row-group tint on mobile** — the mobile Orders card list
     *does* tint the correction card (`bg-(--surface-subtle)`); only the
     desktop `SimpleTable` can't (delta 2).

**Follow-up fixes (2026-09-01, same session, after owner spotted issues
on `pnpm dev` mobile):**
- **Canteen Derived tab had no mobile layout** — it was the desktop
  `<SimpleTable>` (5 cols) crushed into 440px, text overlapping. Added
  the `hidden md:block` table / `flex md:hidden` **stacked-card list**
  per artboard `ILC-0` (name + KES on one row; "Last counted …" /
  "Covers … · N sold" sub-lines; `—` for never-counted). Did the same
  for the Restaurant Orders tab per `IJ1-0` (time + "cashier · type ·
  payment" left; total + status right; correction card tinted).
- **Filter dropdowns unreachable on mobile** — the toolbar row had
  `overflow-x-auto`, which (CSS: one axis non-visible ⇒ the other
  becomes `auto`) clipped the `Select` / date popovers that open
  downward. Changed to `flex-wrap` (the `[M2-SA]` mobile artboards show
  ≤4 chips, they wrap cleanly). Verified: dropdowns now open fully.
- **Restaurant Orders looked "broken" (0 orders)** — not a wiring bug
  (the `/api/orders` filter params work; verified `?paymentMethod=mpesa`
  returns only mpesa rows). The tab defaults to a **`date=today`** filter
  (flow doc §G) and the dev seed's orders are all dated Aug 27–30 vs a
  Sep 1 "today", so everything is filtered out. Made that empty state
  actionable: **"No orders today"** + a **"Show all dates"** button
  (sets `date=null` → omits the param → all orders). The date chip now
  reads **"All dates"** (bold, off-default) in that mode, with a
  visible result count + Reset. Reworked the `DateControl` model so
  `today` / `null` (all dates) / a specific day are all distinct. **The
  stale seed itself is a `prisma/seed.ts` concern for another session**
  — some orders should be dated relative-to-today.

- **Out of scope but flagged for the orchestrator:** `/admin/stock/opening`
  (the bulk opening-stock grid) has **no mobile layout** — the owner hit
  it during the walkthrough. Not a 3a file (brief §5 forbids touching
  Ledger/Stock screens); needs its own session.

- **Owner walkthrough:** owed (Admin).

### 2026-08-30 — M2 Session 6e: Gap-Fix Sprint — Domain & API Hydration (Developer) — DONE

Development Sprint (Gap-Fixes before QA). Resolved all 4 domain/API gaps (G1–G4) identified during design review:

- **G1 — Cashier Name Hydration.**
  - Added `cashierName: string` to `OrderView` in `lib/domain/sales/types.ts`.
  - Updated Prisma queries in `createOrder`, `editOwnOrder`, `correctOrder`, and `listOrders` to include `cashier: { select: { name: true } }`.
  - Updated `toOrderView` in `internal.ts` to map `cashier.name`.
  - Updated `app/admin/orders/admin-orders-client.tsx` to render `order.cashierName` in the table.
- **G2 — Product Name Hydration.**
  - Added `productName: string` to `OrderLineView` in `lib/domain/sales/types.ts`.
  - Updated Prisma queries to include `lines: { include: { product: { select: { name: true } } } }`.
  - Updated `toOrderLineView` in `internal.ts` to map `product.name`.
  - Updated `app/admin/orders/admin-orders-client.tsx` (detail and correction drawers) and `app/cashier/orders/[id]/order-detail-client.tsx` to render `productName` instead of raw UUIDs.
- **G3 — Dedicated Canteen Products API.**
  - Created `app/api/canteen/products/route.ts` with role-scoped fetching for `canteen_attendant` (assigned location) and `admin`.
  - Added route unit tests in `app/api/canteen/products/route.test.ts` (5 tests).
  - Updated `app/canteen/stock-count/stock-count-client.tsx` to directly consume `/api/canteen/products`.
- **G4 — Same-Day Count Detection & stockCountId.**
  - Added `stockCountId: string | null` to `DerivedSaleView` in `lib/domain/sales/types.ts` and mapped `latest.id` in `lib/domain/sales/derived-sales.ts`.
  - Enables K1 / Canteen Hub to identify today's count ID for same-day void and re-counting.
- **Verification & Gates.**
  - `pnpm tsc --noEmit` — 0 errors.
  - `pnpm build` — Clean production build of all 41 routes.
  - `pnpm test` — **416/416 tests passing across all 64 test files.**

Development Sprint (frontend assembly + final M2 gates). Complete frontend coverage for Admin Orders (A3), Canteen Derived Sales (A4), Canteen Mobile Stock Count (K1), and Canteen Mobile Operations Hub timeline extensions (K2).

- **Hooks.**
  - `app/canteen/use-stock-count.ts` — typed `StockCountRequestError`, `request<T>`, domain-typed hooks for `useStockCountActions` (`recordStockCount`, `voidStockCount`) and `useDerivedSales({ productId, date })`.
- **A3 Admin Orders** (`app/admin/orders/page.tsx` → `admin-orders-client.tsx`).
  - SimpleTable listing all orders (Time · Cashier · Type · Total · Payment · Status).
  - Filter chips row matching Paper FA1-0 (active dismissible chips + inactive picker chips + order counter + "Clear all").
  - Detail drawer (read-only breakdown of order lines and totals).
  - Correction drawer with `QuantityStepper` per line, `CalculatedImpactBanner` (live money/stock delta preview), and required Reason `Textarea`.
  - Linked correction pair handling (`bg-(--surface-subtle)` styling and "Correction of #N" status).
  - G6: disabled double correction with clear affordance.
  - Zero delete buttons (§3.3), zero cost/margin columns (§3.6).
- **A4 Admin Canteen Derived Sales** (`app/admin/canteen/derived-sales/page.tsx` → `derived-sales-client.tsx`).
  - Read-only table of per-product sales derived from stock counts (Product · Last counted · Period covered · Units sold · Revenue).
  - G5: functional Product select dropdown and Date filter pickers.
  - Formatted currency (KES) and relative time labels ("today", "1 day ago").
- **K1 Canteen Mobile Stock Count** (`app/canteen/stock-count/page.tsx` → `stock-count-client.tsx`).
  - Two sub-screens in one component: product picker (search + category tabs + select) → counting screen (selected product + `QuantityStepper` + `CalculatedImpactBanner` impact preview).
  - G3 stopgap: canteen products filtered from `/api/products` by active canteen `ProductLocation`.
  - Sticky bottom "Confirm count" button triggering `recordStockCount`.
- **K2 Canteen Operations Hub Extension** (`app/canteen/hub-client.tsx` & `app/store-manager/staff-stock-format.ts`).
  - Resolved `TODO(mock)` on Stock Count action tile to point to `/canteen/stock-count`.
  - G7: `movementsToTimeline` recognizes `movementType === "sale"` with `stockCountId` as "Stock count" timeline entries with accurate quantities and timestamps.
- **Navigation Wiring.**
  - Connected `/admin/orders` ("Sales") and `/admin/canteen/derived-sales` ("Derived sales") in both desktop `admin-shell.tsx` and `mobile-nav-drawer.tsx`.
- **Full Database Seed.**
  - `prisma/seed.ts` expanded with Canteen products (`Mandazi`, `Groundnuts 50g`, `Soda 300ml`, `Water 500ml`), initial stock movements, and Stock Counts producing derived sales and revenue matching Paper GL2-0 walkthroughs.
- **Screen Tests.**
  - `tests/screens/admin-orders.screen.test.tsx` (6 tests).
  - `tests/screens/canteen-derived-sales.screen.test.tsx` (4 tests).
  - `tests/screens/canteen-stock-count.screen.test.tsx` (3 tests).
  - `tests/screens/canteen-hub.screen.test.tsx` (expanded to 7 tests).
  - **All 17 screen test suites passing (127/127 tests).**
- **Gates.**
  - `pnpm tsc --noEmit` — 0 errors.
  - `pnpm build` — Clean production build of all 40 routes.
  - `pnpm test` — **411/411 unit, integration, and screen tests passing across all 63 test files.**

### 2026-08-30 — M2 Session 6c: Restaurant Orders C1–C5 (Developer) — DONE (owner walkthrough owed)

Development Sprint (frontend assembly). The Cashier can take a Restaurant
order end to end on real data. No schema. Small hook additions:
`useCustomers.createCustomer` now returns the created customer (C5
quick-create attach). **Two kit changes were approved mid-session by the
owner** (both defects vs the kit's own artboards, not new design
decisions) — see the "6c follow-up" block below.

- **Hooks.**
  - `app/cashier/use-orders.ts` — mirrors `use-catalog.ts` /
    `use-customers.ts` (typed `OrdersRequestError`, `request<T>`,
    domain-typed shapes). `useOrders({ date })` list (the API role-scopes
    to the caller; `date: "today"` resolved against Africa/Nairobi
    client-side), `createOrder`, `editOwnOrder`, `correctOrder`
    (exposed for A3's reuse in 6d — Admin-only at the API). `useOrder(id)`
    for C4 — finds the row in the caller's list (M2 has no `GET
    /api/orders/:id`), plus the linked `correction` row if visible.
    `isSameBusinessDay` / `nairobiBusinessDate` helpers.
  - `app/cashier/use-restaurant-products.ts` — `GET /api/products`
    filtered to products with an active, priced Restaurant
    `ProductLocation` (the Restaurant `locationId` comes from the
    payload's `locationType`, so the Cashier needs no `/api/locations`
    access), joined with `GET /api/stock-movements/balances` for the
    tile stock-available count + the §3.8 block.
- **C1 Cashier Today** (`app/cashier/page.tsx` → `cashier-today-client.tsx`).
  Own orders for today, newest first; day running total; "Day open" pill
  (M2 has no Day Close — `isPastDay` is a permanently-false hook and the
  `C0Z-0` day-closed banner stays behind it). `CORRECTED` / `Correction`
  chip derived from whether another visible row's `correctsOrderId` points
  at this one. States: populated / empty / loading / error. Sticky "New
  order" (the `flow-scaffold.tsx` `sticky bottom-0` pattern — the staff
  shell's `stickyActionBar` slot isn't wired for hub routes).
- **C2 New Order build** (`app/cashier/orders/new/*`). `SearchInput` +
  kit `Tabs` (underline) `category` row ("All" + one per distinct
  `Product.category`; `null` → "Uncategorised") + a 2-col product-tile
  grid (tap to add / +1, qty badge) + a pinned order-line panel
  (`QuantityStepper` per row) + a sticky total bar. §3.8: a line whose
  qty exceeds the derived Restaurant balance renders the §9.8 error
  pattern on the row and disables "Review order" with a danger caption —
  the server is still the gate. States: populated / empty (no sellable
  products) / loading / error / line-blocked.
- **C3 Checkout** — a `BottomSheet` over C2. Order-type + payment
  `SegmentedControl`s; the delivery-fee `TextInput` appears only for
  Delivery and is dropped on switch-back; **`account` is omitted** (the
  domain derives cash→cash / mpesa→mpesa_bank). Credit reveals the
  customer-attach block and **Confirm stays disabled until a customer is
  attached** (plan §3.2). On confirm → `createOrder` → toast → back to C1.
- **C4 Order detail / edit** (`app/cashier/orders/[id]/*`). The server
  page resolves `currentUserId` + today's business date so the client
  needs no session hook. Editable iff own **and** same Africa/Nairobi
  business day (`editOwnOrder` / PATCH) — reuses the C2 line rows + C3
  controls, "Save changes", same §3.8 block. Otherwise **read-only**: a
  static list + a warning banner + "Correct this (Admin)" which does
  **not** open a form (ADR-15) — it fires a toast surfacing the order
  **number** for the Cashier to give the Admin (flow doc walkthrough F).
  A corrected order shows a `CORRECTED` banner + "View correction entry —
  order #N" linking the correction row; no Correct button.
- **C5 Customer attach / quick-create** — a `BottomSheet` over C3, reusing
  `useCustomers` (search + `createCustomer`). Search results / no-match
  quick-create (name prefilled from the search text until edited) / phone
  validation error / an explicit "Add new customer" row.
- **Spec** `tests/screens/cashier-orders.screen.test.tsx` — 28 tests.
  Per screen: populated / empty / error / loading + the primary
  interaction. Contracts proven: credit → Confirm disabled until a
  customer is attached; §3.8 line block disables Review; C4 same-day →
  editable form, past-day / not-own → read-only + no edit + Admin path;
  **no margin / cost / profit value or "buying price" string anywhere in
  C1–C4**. `SegmentedControl` renders `role="radio"` (not tab);
  `BottomSheet` renders `role="dialog"`.
- **Seed** — `prisma/seed.ts` gained a `seedM2Sales()` block (idempotent
  by fixed `seed-*` ids): the Restaurant menu now carries `category` +
  `production` stock so C2 tiles aren't all §3.8-blocked; a **second
  cashier** ("Cashier Two" / PIN 1234); 4 customers (Grace owes 220 net
  after a 200 cash repayment, John owes 100 net after a 500 mpesa_bank
  repayment **with a note**, Mary owes 400, Peter clear); ~8 orders
  across the two cashiers — cash / M-Pesa / credit / dine-in / takeaway /
  delivery+fee, two dated **yesterday**, one **corrected** (original +
  linked correction row). Enables both the owed 6b Customers walkthrough
  and the 6c Cashier walkthrough on `pnpm dev`. The **full** M2 seed
  (canteen counts, more breadth) stays a 6d task.
- **Flow-doc-vs-behaviour deltas for QA (Session 7):**
  - C4 "corrected" banner omits the correcting Admin's **name** and shows
    only the correction's date + number — `OrderView` carries neither a
    `correctedByName` nor a `correctedAt`; `D18-0` shows "by Edwin K.
    (Admin)". Data gap, not a bug.
  - "Correct this (Admin)" on C4 fires a **toast** with the order number
    rather than a modal/alert; the flow doc only says it "surfaces the
    order reference … does not open a form".
  - C2/C4 line-row `QuantityStepper` uses the **kit** control size, not
    the artboard's fixed 30px cells (owner ruling 6a — kit wins on
    sizing).
- **Gates (as of the 6c screen work):** `pnpm tsc --noEmit` 0;
  `pnpm build` clean (new routes `/cashier`, `/cashier/orders/new`,
  `/cashier/orders/[id]` registered); **`pnpm test` 396/396**;
  `grep TODO(mock) app/cashier` clean.
- **Owner walkthrough:** _PENDING — owner drives the Cashier order flow
  on `pnpm dev` (cash, M-Pesa, credit-with-new-customer, edit a same-day
  order, view a past-day order), plus the still-owed 6b Customers walk
  (C6 as Cashier, A1/A2 as Admin). Seed data is in place._

#### 6c follow-up (owner-driven review on `pnpm dev`, same day)

The owner walked C1–C6 on `pnpm dev` and found four issues; all fixed
this session:

1. **Runtime — `POST /api/orders` failed "No active Restaurant location
   is configured."** The seeded `Restaurant` `Location` row had
   `active: false` (flipped by an earlier test run against the dev DB;
   the seed's `update: {}` never healed it). `resolveRestaurantId`
   requires an **active** restaurant. Fix: the seed's three
   `location.upsert` calls now `update: { active: true }` (self-healing).
   Dev DB re-seeded.
2. **Kit `BottomSheet` — open-state `children` rendered edge-to-edge.**
   Only the (now-removed) h1 title bar was padded; C3 checkout, C5
   attach and the 6a C6 repayment sheet all had text running to the
   screen edge. **Kit fix (owner-approved):** the open-state content is
   wrapped in a padded (`px-(--sp-6) pt-(--sp-5) pb-(--sp-8)`),
   `overflow-y-auto` scroll region; the panel is capped `max-h-[90dvh]`
   so tall sheets scroll internally. Consumers pass bare content now.
   Matches artboards `6ZJ-0` / `DLP-0` / `DDD-0`. Story `visual: {
   disable: true }` → no baseline to re-key.
3. **Kit `TextInput` — no in-field currency marker.** `DDD-0` (repayment
   Amount) and `DRN-0` (C3 delivery fee) show a "KES" marker *inside* the
   box. **Kit fix (owner-approved):** new optional `startAdornment`
   prop — a node rendered before the input, `aria-hidden`,
   `--text-tertiary`, not focusable; a string is `--font-mono` and
   mono-izes the input. Off ⇒ byte-identical. Applied to the C6 Amount
   field (label → "Amount", `startAdornment="KES"`) and both C3 + C4
   delivery-fee fields (label → "Delivery fee"). New story `StartAdornment`.
   ⚠️ **Owed:** the visual baseline `kit-textinput--start-adornment.png`
   has NOT been generated — the Playwright story runner
   (`pnpm test:visual` / `test:a11y`, Storybook on :6006) needs to run
   once and `-u` to write it, then eyeball + commit. `tsc` + the jsdom
   screen specs are green.
4. **C6 repayment sheet — fidelity gaps vs `DDD-0`:** (a) dropped the
   "Record repayment" h1 sheet title — `BottomSheet` now takes an
   `ariaLabel` prop so a titleless sheet is still named; the in-body
   name + balance IS the header. (b) balance line now whole-KES
   ("Owes KES 1,200", not "…220.00") via `balanceLabel(balance, true)` —
   the A1/A2 rail-drawer "Current balance" row keeps 2dp. (c) fields +
   the C6 button are now full-width (kit `FormField` hard-codes
   `w-[280px]`; overridden locally with `[&_.kit-field]:w-full` in
   `RepaymentForm` and `[&>button]:w-full` in C6's `renderFooter`).
   A1/A2 footer (Cancel + primary row) unchanged.

Docs updated for the kit changes: `component-states.md` §C3 / §C19,
`kit-audit.md` (TextInput / BottomSheet rows).

**Full-suite re-run after the follow-up: `pnpm test` 396/396, `tsc` 0.**

### 2026-08-30 — M2 Session 6b: responsive Admin shell + nav wiring + SimpleTable rowChevron + Catalog category (Developer) — DONE

Development Sprint (frontend assembly). Closes the five 6a-flagged frontend
gaps + the one approved kit change. No schema, no `lib/domain`.

- **6b.1 — Admin shell responsive.** _(first attempt merged the mobile
  chrome into `admin-shell.tsx`; that entangled the desktop flex-row and
  mobile fixed-height-column box models and shipped two bugs — see the
  fix commit `921fe6d` below.)_ **Final:** `admin-shell.tsx` stays
  **desktop-only**; `app/admin/admin-shell-client.tsx` renders **both**
  proven shells and toggles with `hidden md:block` / `md:hidden` — the
  desktop `AdminShell` (`649-0`/`67T-0`) and the existing
  `MobileShellAdmin` (`6B1-0`/`1ZP-0`, hamburger → kit `MobileNavDrawer`).
  `children` renders in both subtrees (client-only, no server effects;
  the hidden shell's hooks still run — accepted). Also fixed:
  `MobileNavDrawer`'s portal wrapper was `position: fixed` +
  `z-index: auto`, a level-0 stacking context that trapped the scrim
  (`--z-overlay`) / panel (`--z-drawer`) **below** `PageShell`'s
  `--z-sticky` (1100) toolbar — the drawer painted under the page header.
  Wrapper is now non-positioned (mirrors the kit `Drawer`); scrim + panel
  (`fixed inset-y-0 left-0`) escape to root and cover the page. Owner
  verified on localhost (drawer over toolbar; both viewports).
- **6b.2 — Admin nav wired.** In both `admin-shell.tsx` and
  `mobile-nav-drawer.tsx`: **Sales** → `/admin/orders` (A3, key `orders`);
  new **Derived sales** item → `/admin/canteen/derived-sales` (A4, key
  `derived-sales`) in the Operations group (`canteen-derived-sales-flow.md
  §G` allows a top-level item). Active-nav resolution moved from
  first-path-segment to **longest matching href prefix** (exported
  `ADMIN_NAV_ITEMS`) so `/admin/canteen/derived-sales` lights the right
  item. Links land ahead of their screens — a 404 until 6d is acceptable
  per the handoff.
- **6b.3 — Cashier bottom nav** (`components/layout/staff-shell-client.tsx`)
  → **Today · New Order · Customers** (was New Order · History). `today`
  key = the bare `/cashier` route (C1, lands 6c); `customers` →
  `/cashier/customers` (C6, built 6a); `new-order` → C2 (6c). Glyphs
  match artboard `D8E-0` (home / bag / speech-bubble).
- **6b.4 — `SimpleTable` `rowChevron`** — opt-in `rowChevron?: boolean`.
  Off (default) → byte-identical. On (and `onRowClick` set): a fixed
  `w-[24px]` trailing slot — header spacer + a `ChevronRight`
  (`--text-tertiary`) per clickable row — so column lanes stay aligned.
  Matches the M2 A1–A4 artboards. New story `Kit/SimpleTable → RowChevron`
  + baseline `kit-simpletable--row-chevron.png` (only that snapshot
  added; no existing baseline moved). `kit-audit.md` /
  `component-states.md` updated. First consumer: **A1**
  (`customers-client.tsx`). A2's ledger rows are not click targets — no
  chevron there.
- **6b.5 — Catalog `category` field** (`app/admin/catalog/product-drawer.tsx`)
  — one free-text `<FormField label="Category">` in "General Information",
  wired to the create/update body (`"" → null`). Domain + Zod already
  accepted it (6a). Without this C2/K1's tabs are permanently
  "Uncategorised". `catalog.screen.test.tsx` asserts it round-trips into
  the create payload.
- **6b.6 — Customers state artboards verified** (`E41-0` `DZ0-0` `E97-0` /
  `EXK-0` `F23-0` / `D8E-0` `DBH-0` `DF9-0`). **All structural states
  match** — correct kit component in the correct place. Minor **copy**
  deltas only (6a-built screens, not state gaps) — logged for QA:
  empty/filtered-empty/zero-history `EmptyState` descriptions are shorter
  than the artboards'; A1 error shows the live error string rather than
  the artboard's static line; C6 success toast is "Repayment recorded ·
  {name}" vs the artboard's "… · KES {amt} from {name}" (the shared
  `RepaymentForm.onDone` carries no amount — deferred, would touch A1
  too).

**Gate state:** `tsc --noEmit` 0 · kit `test:visual` + `test:a11y` green
(181/181, 1 new snapshot) · `catalog.screen.test.tsx` 10/10 · full
`pnpm test` run <PENDING — fill on completion>.

**Owner walkthrough (Customers & Credit, Cashier C6 + Admin A1/A2) —
still owed** (the real e2e gate). Needs seed data: minimal customer block
or a couple added by hand during the walk (full M2 seed is a 6d task).

**Flow-doc-vs-behaviour / doc gaps for QA:** none new. (Canteen
negative-sold gap from S5 still stands for 6c/6d.)

### 2026-08-30 — M2 Session 6a: backend gap-fills + Customers screens (Developer) — DONE

Development Sprint. Started as "assemble all M2 screens"; on discovery,
three backend gaps blocked the designs, the owner approved filling them,
and the session was **re-scoped and split** — 6a delivers the backend
fills + the one feature they most affect (Customers & Credit); 6b/6c/6d
carry the rest. See `docs/sprints/milestone-2-session-6-handoff.md` for
the 6b–6d breakdown.

**Backend gap-fills (owner-approved scope exceptions — schema + domain,
which the original Session 6 handoff forbade):**

- **`Order.number`** (`Int @unique @default(autoincrement())`) — a
  human-readable, monotonic order number ("#1043") that staff and the
  Admin say out loud. The `Order` model had only a UUID `id`; every M2
  screen design (A2 ledger, A3 list + "Correction of #1043", C1/C4)
  assumed a spoken number. `OrderView.number` + `toOrderView` expose it.
  A correction is its own row with its own number.
- **`Product.category`** (`String?`, free-text ≤40 chars) — the
  Admin-set menu category (Mains / Drinks …) that powers the C2 grid and
  K1 picker category tab rows. Planned M2-01 §6/§10, folded into "Session
  3 + a Catalog follow-up", **never built**. Wired through
  `lib/domain/catalog` (types, `toProductView`, create/update/list),
  `lib/validation/catalog` (create/update/list schemas), and
  `GET /api/products` (`?category=` + the field in the payload).
- **`cashier` added to `PRODUCT_READ_ROLES`** (`app/api/products`) **and
  `STOCK_ROLES`** (`app/api/stock-movements/balances`) — C2's product
  grid + the §3.8 over-stock check need both as a Cashier. `buyingPrice`
  stays stripped for the Cashier (no cost/margin leak — plan §3.6). Two
  stale M1 tests (`route.test.ts` "cashier is still 403",
  `flow-6-role-access` "a cashier cannot read the catalogue") updated to
  assert the new correct behaviour (200 + `buyingPrice: null`).
- **`Repayment.account` + `.note`** columns + `recordRepayment` writes
  them + `CustomerLedgerEntry` carries `account` / `note` / `orderNumber`
  — the A2 ledger "Reference" cell (artboard ER9-0) shows "Order #1043"
  for a debt and "Cash" / "M-Pesa" / the note for a repayment. The entry
  previously carried only a debt's `orderId` (a UUID).
- **Migration:** dev DB via `prisma db push` (owner-consented — Prisma's
  AI-safety guard); deploy migration
  `prisma/migrations/20260830120000_m2_s6_order_number_product_category_repayment_detail/`.
  `prisma generate` re-run. `docs/API.md` Orders / Customers / Catalog
  sections carry ADR-style notes for each addition.

**Customers & Credit screens (C6, A1, A2) — composed from the proven kit,
verified against Paper:**

- **`app/admin/customers/use-customers.ts`** — feature hook (`useCustomers`
  list + repayment; `useCustomerLedger` for A2). Mirrors
  `use-catalog.ts`; money stays a decimal string end to end.
- **`app/admin/customers/repayment-form.tsx`** — shared repayment form
  body (A1 rail Drawer, A2 rail Drawer, C6 BottomSheet) — kit `TextInput`
  + `SegmentedControl` (Cash / M-Pesa) + `Textarea`.
- **A1** (`customers-client.tsx` + `page.tsx`) — `PageShell` + `Breadcrumb`
  + desktop `SimpleTable` (`md:block`) + mobile row list (`md:hidden`) +
  `PillFilter` (All customers / Owing) + `SearchInput` + rail `Drawer`
  (repayment + add-customer) + `EmptyState` / `ErrorState` + `Toast`.
- **A2** (`[id]/customer-detail-client.tsx` + `page.tsx`) — `Breadcrumb`,
  header with Current-balance read-out + Record repayment, desktop ledger
  `SimpleTable` + mobile 2-line cards, "Reference" = `orderNumber` /
  `account` / `note`.
- **C6** (`app/cashier/customers/customers-client.tsx` + `page.tsx`) —
  `SearchInput` + row list + `BottomSheet` repayment (mobile, whole-KES
  balance per artboard DDD-0).
- **Specs:** `tests/screens/admin-customers.screen.test.tsx` (14) +
  `tests/screens/cashier-customers.screen.test.tsx` (6) — populated /
  empty / filtered-empty / error / loading / repayment happy-path +
  Esc-restore + the §3.6 "no cost/margin/order-detail on the Cashier
  view" contract. **18 new, 368/368 total.**

**Paper verification done:** artboards `DU2-0` (A1 desktop, + `get_jsx`),
`EJ6-0` (A1 repayment drawer), `EPJ-0` (A1 mobile), `ER9-0` (A2 desktop),
`F7F-0` (A2 mobile), `DDD-0` (C6 sheet). **Not yet verified** (6b): A1
`E41-0`/`DZ0-0`/`E97-0`, A2 `EXK-0`/`F23-0`, C6 `D8E-0`/`DBH-0`/`DF9-0`.

**Paper→code divergence handled (owner ruling):** the artboards draw
fixed pixel row heights + grow-ratio columns + a trailing row chevron;
the **kit `SimpleTable` is the design-system source of truth** for row
height / header / hairlines, so those come from the kit (responsive,
token-based), not the artboard pixels. "Has balance" pill → kit
`PillFilter`. The trailing chevron has no kit equivalent — a small
opt-in `SimpleTable` prop is a **6b task** (owner-approved), not
hand-rolled.

**Gate state:** `tsc --noEmit` 0 · `pnpm build` clean · `pnpm test`
368/368 · dev server runs. Kit untouched → `test:visual` / `test:a11y`
not re-run (no `components/kit/**` change).

**Frontend gaps found (full register in the 6b–6d handoff):**
1. **`AdminShellClient` is not responsive** — fixed 240px sidebar at all
   widths, no breakpoint switch to the mobile hamburger + drawer shell
   (Paper `6B1-0`). This is why the admin screens still look desktop in
   DevTools mobile view. Shell-level, affects every admin screen (M1's
   too). Kit `MobileNavDrawer` already exists to build it. **6b.**
2. Admin sidebar "Customers" / "Sales" nav entries route nowhere. **6b.**
3. Cashier bottom nav has no "Customers" entry → C6 unreachable. **6b.**
4. Kit `SimpleTable` clickable rows have no trailing-chevron affordance
   the artboards show. **6b (small kit change, approved).**
5. Only the *populated* states of A1/A2/C6 verified vs Paper. **6b.**

### 2026-08-30 — M2 Session 2: QuantityStepper verify-and-gate (Developer — kit) — DONE

Kit Sprint, re-scoped. The M2 plan and the 1a handoff scoped Session 2 as
"build the `QuantityStepper` tap-to-type value". **On inspection it already
existed** — the `<span>` → `<input inputmode="decimal" role="spinbutton">`
rewrite (− / + unchanged, `↑`/`↓` step, `onValueString` raw-string hatch)
landed in **M1 Session 10** as an owner-approved kit-audit item (`kit-audit.md`
§1, ratified ADR-43 / ADR-48), before M2 planning assumed it was still owed. So
Session 2 became a **verification pass + paper-trail close-out**, not a build.
No change to `quantity-stepper.tsx`.

**Verified (§2 of the handoff):**
- **Gate (ADR-42):** `tsc --noEmit` clean; `test:visual` + `test:a11y` on the
  stepper stories **7/7 play, 7/7 snapshots, 0 axe serious/critical, 0 console**
  (`--failOnConsole`). `pnpm test` (full vitest) **not run** — no vitest-visible
  file changed (only `.stories.tsx` + baselines + docs), and the suite is slow
  by design since S4/S5 (`maxWorkers: 2`, Postgres pool); `tsc` is the type gate
  here.
- **§9 contract per state:** REST byte-identical to `6XC-0` / `6CG-0`; §9.2
  accent border on `.kit-field` focus; §9.7 − / + disabled at bound (opacity
  0.5, `pointer-events: none`); §9.8 danger border + `--text-caption` helper row
  via the `error` prop, `aria-invalid` + `aria-describedby` wired; `↑`/`↓` step
  by `step`; commit on blur / Enter; out-of-range / non-numeric raw does **not**
  fire `onChange`. All proven by a `play` story.
- **M2 screen needs:** C2/C3/C4 order-line stepper + A3 correction editor +
  K1 counted-remaining all covered by the as-built component. K1's larger
  presentation (40px controls, `--text-h2` value) is reachable via a
  screen-level `className` / wrapper — **no new size variant needed**, no flag.

**Added:** one story — **`TypeALargeQuantity`** (`quantity-stepper.stories.tsx`):
a `play` that focuses the spinbutton, `userEvent.clear` + `type(input, "24")`,
asserts the raw string shows + `onValueString("24")` fired, `userEvent.tab()` to
blur, then asserts the committed display is `24` and `onChange` was last called
with `24`. Maps to the `6CG-0` / `DKR-0` "value focused — type a quantity"
artboard. Baseline committed (committed-state, not mid-type — caret blink makes
mid-type snapshots flaky; the `play` proves the typing path directly).

**Behaviour sign-off (§2.4):** commit-on-blur / commit-on-Enter + the
`onValueString` escape hatch + `↑`/`↓` stepping confirmed as-is — the ratified
ADR-48 "keep the full §9 contract, add the input" pattern (same as
`Select searchable`). Not judged a wrong commit-trigger → **no owner
escalation**, nothing BLOCKED.

**Docs closed:** `component-states.md` §9 C10 → **"implemented + gated
(M2-02)"** (was "Behaviour pending owner review"); `kit-audit.md` — the C10
BEFORE→AFTER table's `_tbd_` AFTER column filled in, "Remaining gaps" item 4
marked RATIFIED; story title de-suffixed `Kit/QuantityStepper — NEEDS OWNER
REVIEW` → `Kit/QuantityStepper` (matches ratified `Kit/Select`), 6 baselines
re-keyed + 1 new = 7.

**Discipline:** files touched — `components/kit/quantity-stepper.stories.tsx`,
`tests/visual/__screenshots__/kit-quantitystepper--*.png` (7),
`docs/design/component-states.md`, `docs/design/kit-audit.md`,
`docs/sprints/milestone-2-plan.md`, `docs/PROGRESS.md`,
`docs/sprints/milestone-2-session-2-handoff.md`. Nothing under `app/`, `lib/`,
no other kit component, no change to `quantity-stepper.tsx`.

**Handoff to next:** Session 6 (screen assembly) — the `QuantityStepper` hard
dependency for C2/C3/C4 order lines + A3's correction editor is now satisfied
and gated. Session 7 (QA) will re-check the §9 contract on the stepper as
composed into the real screens.

### 2026-08-29 — M2 Session 1a: Cashier screens design (Product Designer) — DONE

Design Sprint, Phase A. Ran after Session 3 landed. Scoped **mid-session
by the owner** to the Cashier screens only (C1–C6); the Admin (A1–A4) and
Canteen (K1–K2) screens moved to a new **Session 1b**. The 3 flow docs
were written in full (all of M2), so the backend sessions are unblocked.

**Shipped — Paper ("Prosper Hotel", page "Shell+Component kit"):**
22 Cashier artboards + 1 component artboard, all named `… [M2-01]`.
- **C1 Cashier Today** (4): populated · empty · day-closed banner · loading.
- **C2 New Order — build** (3): populated · empty · line-blocked (§3.8).
  **Redesigned** from a search-only add flow to a **tap-to-add 2-column
  product grid** (POS-standard): search → category tab row → tappable
  tiles (name · price · unit · stock-available · qty badge) → a pinned
  order-line panel above the sticky total bar.
- **C3 Checkout** (5): Cash · M-Pesa · Credit-no-customer · Credit-attached
  · Delivery — all drawn as a **tall bottom-sheet over the dimmed C2**
  (mobile-POS convention; Square / Toast / Loyverse open tender as a
  modal sheet, not a route).
- **C4 Order detail** (3): day-open editable · day-closed read-only ·
  corrected.
- **C5 Customer attach** (3): search results · no-match quick-create ·
  phone error — bottom-sheet over the dimmed C3.
- **C6 Customers (mobile)** (4): populated · empty · repayment sheet open
  · repayment success.
- **`Component Kit — M2 Sales Patterns [M2-01]`** — canonical states for
  the order-line row, product tile, and sticky total bar. **`6CG-0`
  Form Controls** — `QuantityStepper` tap-to-type states added.

**Flow docs (all written, full M2 scope):**
`restaurant-sales-flow.md`, `customers-credit-flow.md`,
`canteen-derived-sales-flow.md` — match the
`financials-reconciliation-flow.md` format. The customers + canteen docs
carry a note that their Admin/Canteen artboards are owed by Session 1b.

**Decisions:**
- **§3.8 — BLOCK.** A Restaurant order line whose qty exceeds the
  product's derived stock-available count cannot be confirmed (line →
  §9.8 error pattern, sticky action disabled + danger caption; server
  enforces `400 insufficient_stock`). Recorded in `restaurant-sales-flow.md`.
- **New-component verdict: ONE kit change → Session 2 runs.**
  `QuantityStepper` gains a **tap-to-type numeric value** (`<span>` →
  `<input inputmode="decimal">`; − / + unchanged) for large order
  quantities — already flagged in `kit-audit.md` C10. Everything else on
  the plan §6 list composes from the proven kit.

**Changed from plan:**
- **Session 1 → 1a (done) / 1b (pending).** §7 re-baselined, §10 changelog
  appended. M2 is now 8 session-slots.
- **Session 2 confirmed needed** (was "skipped if none").
- **New product `category` field flagged** — the C2 / K1 category tab row
  needs an Admin-set `category` attribute on products (schema column +
  Catalog UI + `PRD.md` §4.1 line). Folded into Session 3's backend +
  a Catalog follow-up; `milestone-2-plan.md` §6/§10.

**Gate state:** design-only session — no code, no tests. Discipline held:
only `docs/**` and the Paper file were touched.

**Owed by Session 1b:** A1–A4, K1–K2 — desktop **and** mobile, every
structural state.

### 2026-08-29 — M2 Session 1b: Admin + Canteen screens design (Product Designer) — DONE

Design Sprint, Phase A — the second half of M2's design. Ran against the
3 flow docs from 1a; disjoint from the domain sessions (docs + Paper
only). Delivers the Admin (A1–A4) and Canteen (K1–K2) screens.

**Shipped — Paper ("Prosper Hotel", page "Shell+Component kit"),
32 new artboards, all `… [M2-01]`:**

- **A1 Customers & Credit register** (7): desktop populated · filtered-empty
  · empty · error · repayment rail-drawer open · add-customer rail-drawer
  open · mobile. `SimpleTable` (Name · Phone · Balance mono · Last
  activity), chip filter bar (Has balance toggle + Search, count +
  Clear all at ≥2), repayment / add-customer in a right-edge `Drawer`
  (rail, ADR-37b).
- **A2 Customer detail** (4): desktop populated · zero history · loading
  · mobile. Header block with large mono derived balance + Record
  repayment; body is a `DenseLedger`-style interleaved Debt / Repayment
  table with a semibold running-balance column (signed colour: red
  +debt, green −repayment).
- **A3 Orders list (Admin)** (8): desktop populated · filtered-empty ·
  empty · error · read-only order-detail drawer open · correction form
  drawer open · order + correction linked row-group · mobile.
  **Read-only** — the only mutating action is "Record correction",
  opening a rail `Drawer` with the original as read context + a
  corrected line list (M2 Sales Patterns order-line row +
  `QuantityStepper` tap-to-type) + `CalculatedImpactBanner` + required
  Reason. **No delete affordance anywhere.** Corrected order + its
  correction render as a bracketed, indented linked pair.
- **A4 Canteen Derived Sales** (5): desktop populated · product never
  counted (Never / — / muted em-dash) · filtered-empty · loading ·
  mobile. `SimpleTable` (Product · Last counted date+relative · Period
  covered span · Units sold mono · Revenue mono); correcting-period
  negative in `--color-danger`.
- **K1 Stock Count** (6): product picker · count entered + preview ·
  first-ever count (distinct copy) · correcting re-count negative sold
  · validation error · confirm success (Toast). Staff mobile shell +
  back-nav `FlowHeader` (no direction badge); product picker reuses the
  C2 category tab row over the new `category` field; preview card is
  `CalculatedImpactBanner` (amber, read-only) with the exact flow-doc
  derivation copy.
- **K2** (2): the derived sale as a **new entry type in the existing
  Canteen hub `ActivityTimeline`** (`9BA-0`) — "Stock count — {product}"
  / "{n} {unit} sold since {date} · closing {rem}" / "+KES {y}" green
  mono (correcting negative → "−KES {y}" red). Shown once at the top of
  the log and once interleaved between a transfer and an opening-stock
  row (the visual-consistency acceptance point). No new screen, no new
  component.
- **`Component Kit — M2 Sales Patterns [M2-01]`** extended with 3 new
  canonical sections: chip filter bar states, derived-sale timeline row
  (positive + correcting-negative), correction linked row-group. One
  canonical artboard; no component has two divergent versions.

**Flow docs:** `customers-credit-flow.md` and
`canteen-derived-sales-flow.md` — "Artboards" lists filled in with the
1b frames + a composition note; the top "Artboard status" note flipped
from "deferred to Session 1b" to **DONE**. No new policy written into
the flow docs.

**Decisions:** none — §3.8 (BLOCK) and the one-kit-change verdict were
settled in 1a and stand. Nothing surfaced that the flow docs + kit +
M2-01 patterns didn't already cover; **nothing flagged for escalation**.

**Changed from plan:** none. §7 table: Session 1b marked done; no
sequencing change, no §10 changelog line.

**Gate state:** design-only session — no code, no tests. Discipline
held: only `docs/**` and the Paper file were touched (`lib/`,
`app/api/`, `components/kit/`, `app/**/*.tsx`, tests all untouched).

**Handoff to next:** Session 2 (kit — `QuantityStepper` tap-to-type),
Sessions 4 / 5 (Orders + Canteen domain), then Session 6 assembles all
M2 screens (Cashier from 1a, Admin + Canteen from 1b) into real routes
from the Paper screenshots.

### 2026-08-30 — M2 Canteen design re-spin: `voidStockCount` (Product Designer) — DONE

A targeted Design touch-up, **not** a full sprint. Triggered by Session
5's owner decision (2026-08-30): "counted more than expected" is
**rejected** (`400`) with a **same-day hard-delete undo**
(`voidStockCount`), overriding the flow doc's earlier "allow a
negative-sold reconciliation" design. That made 3 M2-01b artboards +
2 pattern-sheet variants + parts of `canteen-derived-sales-flow.md`
stale. This session brings design back in sync — **docs + Paper only**.

**Paper — K1 re-spun from 6 → 9 states** (`worldY 20400`):
- `K1 … correcting re-count, negative sold` → renamed + reworked to
  **`K1 … counted more than expected (blocked)`** — §9.8 inline error
  on the count field with the server's exact message ("exceeds expected
  stock by N pcs"), an `InstructionalBanner` ("a transfer/delivery may
  not have been recorded — ask the Store Manager, then recount"), a
  "Delete today's count" link for the redo case, Confirm disabled, **no
  preview card**.
- **Added `K1 … delete count confirm`** — `FrictionDeleteDialog` over
  the dimmed screen, **no type-to-confirm** (ADR-36c
  `showTypeToConfirm={false}` — same-day, recount-recoverable), body
  spells out exactly what's deleted incl. the KES figure, Cancel /
  "Delete count" (destructive).
- **Added `K1 … delete count success`** — returns to the Canteen hub
  with a `Toast` ("Count deleted · … sale removed · recount when
  ready"); the timeline entry for that count is gone.
- **Added `K1 … count locked, previous day`** — count field read-only,
  amber lock banner ("from a closed day — ask the Admin to correct
  it"), sticky bar disabled "Only the Admin can change this" (mirrors
  C4's "Correct this (Admin)").
- `K1 … validation error` clarified as blank/non-numeric only — the
  "over expected" case is now its own artboard.

**Paper — A4** (`GL2-0` + `H4I-0`): the correcting-negative Mandazi row
→ a normal positive count; **no `--color-danger` on any Units/Revenue
cell anywhere**.

**Paper — "M2 Sales Patterns" (`DIN-0`):** derived-sale timeline row
section's "correcting-negative" variant → **"zero sold"** variant (no
`canteen_sale` money row → muted em-dash where the value would be); new
**"Stock-count delete confirm"** section pinned.

**Paper — K2:** no change — both artboards already showed a positive
derived sale.

**Flow doc — `canteen-derived-sales-flow.md` rewritten:** cross-cutting
rule 5 (was "self-adjusting correction" → now "can't go negative,
delete + redo"); §"The period-boundary case" (new `> UPDATED
2026-08-30` box + the "hard stop, not a negative" bullet); walkthroughs
**C** (blocked), **C2** (delete + redo), **C3** (day-locked) replace
the old "correcting re-count showing a negative"; **D** narrowed to
blank/non-numeric; **F** (timeline) drops the negative-revenue mention,
adds zero-sold; data notes updated with the `voidStockCount` contract +
`recordStockCount` return shape + "reject if `sold < 0`". Artboards
list + a re-spin changelog appended.

**Not touched (correctly):** `restaurant-sales-flow.md`,
`customers-credit-flow.md`, any Cashier/Admin artboard — the override
is Canteen-only.

**Decisions:** none new — this implements the owner's 2026-08-30 call.
**Nothing flagged.** **Gate state:** design-only — `docs/**` + Paper
only; no `lib/`, `app/`, `components/`, tests.

**Handoff to next:** Session 6 can now assemble the **whole** Canteen
slice (K1's 9 states, K2, A4) against the shipped `voidStockCount` — no
blocker remains. `FrictionDeleteDialog` needs its
`showTypeToConfirm` / configurable-copy props confirmed present (they
are per ADR-36c) when Session 6 composes the delete-confirm.

### 2026-08-29 — M2 planning + doc/codebase cleanup (Tech Lead) — DONE

Not a feature sprint — a planning + cleanup pass before M2 Session 1.

- **`docs/sprints/milestone-2-plan.md`** written — scope, out-of-scope,
  starting state, §3 cross-cutting contracts (money ledger goes live;
  order money effect; append-only correction; soft "open day" check;
  canteen derivation; role scoping; audit), backend + screen + new-component
  outlines, the 7-session sequence, the 7 guardrails, definition of done,
  a changelog section. It is a **living** doc — re-baselined as M2 runs.
- **`docs/sprints/milestone-2-session-1-handoff.md`** — the M2 Session 1
  (Design Sprint) handoff (renamed from an externally-authored
  `sprint-m2-01-…`; content kept, verified consistent with the plan).
- **PROGRESS.md compacted** 3,344 → ~90 lines. M1's 30 detailed session
  entries collapsed to a one-line ledger on M1 close. Rule added: full
  detail for the current milestone only.
- **`docs/sprints/` cleared** of all per-session handoffs, findings docs,
  and the old `sprint-0X-*` files. Kept: `milestone-1-plan.md` (rewritten
  to a short closed stub + pointers) and the two M2 files.
- **`app/design-preview/` + `docs/design/screens/` deleted** (23 preview
  routes, 21 screen skeletons + their `fixtures.ts`). From M2 the frontend
  model is screenshot-the-artboard-and-assemble — no skeleton export, no
  fixtures mock layer, no `/design-preview` route. The 5 `app/admin/**`
  page comment headers updated to drop the dangling references.
- **`docs/design/export-workflow.md`** — added the M2 model (Phases
  C1 backend / C2 frontend assembly; owner walkthrough as a gate step);
  removed the `fixtures.ts` / `/design-preview` machinery.
- **`docs/sdlc.md`** trimmed 614 → 277 lines (dropped the 7 verbose prompt
  templates + the stale monorepo codebase-structure block; added a
  "deviations from the generic structure" note). Phase 3.1 / 3.2 rewritten
  for the M2 backend-first model.
- **Headless-browser e2e dropped** (per owner). The M1 Playwright harness
  was never built; Session 17 already repurposed `test:e2e` to run Vitest
  integration suites. `TEST_PLAN.md §2` rewritten (Playwright → Vitest
  domain-integration + owner walkthrough); `DECISIONS.md` ADR-35 given an
  M2 superseding note. `@playwright/test` / `axe-playwright` **kept** —
  the Storybook test-runner (`test:visual` / `test:a11y`) uses them.
- **`docs/CONVENTIONS.md §6`** added — working practices carried forward
  from M1 (prove-before-use, never-eyeball-a-screenshot, named audit
  passes, owner walkthrough per feature, re-baseline don't annotate,
  ledgers-not-totals + correction-of-correction rejection).
- **`CLAUDE.md` / `ROADMAP.md` / `milestone-01-*.md`** updated for the
  new doc layout (one plan file per milestone; PROGRESS ledger; M1 marked
  done).
- Gates: `pnpm tsc --noEmit` 0, `pnpm build` clean, `pnpm test` **226/226**.

### 2026-08-29 — M2 Session 3: Money ledger + Customers & Credit (Developer) — DONE

Backend-only Development Sprint; ran in parallel with Session 1 (Design)
on disjoint files. Unblocks Sessions 4 (Orders) and 5 (Canteen sales).

**Shipped:**

- **Migration `20260829130000_add_m2_money_source_types`** — adds `order`,
  `repayment`, `canteen_sale` to the `MoneySourceType` enum (plain
  `ALTER TYPE … ADD VALUE`, no table change). **Applied to the dev DB via
  `prisma db push`** (the dev DB carries no `_prisma_migrations` history —
  carried convention from M1); the migration file is committed for a real
  deploy. S4/S5 consume `order` / `canteen_sale` and need no further
  migration.
- **`lib/domain/financials/`** — the money ledger (ADR-17):
  - `recordMoneyMovement(input, { actorId, tx? })` — internal, no route.
    Appends one signed `MoneyMovement` row + an `AuditLog` row. Takes an
    **optional Prisma tx client** so S4/S5 can write it inside the same
    transaction as the `Order` / `StockCount` and its `StockMovement`s —
    money and stock commit together or not at all. With no `tx` it opens
    its own transaction. Shaped for a future `correctMoneyMovement`
    (offsetting row via `correctsMovementId`, ADR-15) — not built.
  - `getAccountBalances()` → `{ cash, mpesaBank }` as `Prisma.Decimal`,
    one grouped `SUM(amount)` by account over the whole ledger. No stored
    total. `serialiseAccountBalances` stringifies at the route boundary.
- **`lib/domain/customers/`** — Customers & Credit (ADR-19):
  - `createCustomer` (trim + non-empty name/phone; no phone format /
    uniqueness — SCHEMA sets none; `AuditLog` on create).
  - `listCustomers({ search?, hasBalance? })` — derived `balance`
    computed **set-wise** (two grouped sums, `Σdebts − Σrepayments`),
    `lastActivityAt`, case-insensitive name-or-phone search.
  - `getCustomerLedger` — debts + repayments interleaved by `occurredAt`
    then `createdAt`, running balance, `NOT_FOUND` for an unknown id.
  - `recordRepayment` — one transaction: `Repayment` + a `+amount`
    `MoneyMovement` (`sourceType: "repayment"`) + two `AuditLog` rows.
    `amount > 0`. **Overpayment allowed → negative balance** (see flag).
    `occurredAt` stamped, not day-gated (no Day Close in M2).
  - `recordDebt({ customerId, orderId, amount, occurredAt }, { tx })` —
    **tx-only helper for S4** to call from `createOrder` on a `credit`
    order. S3 only reads `Debt`; it never originates one.
- **Routes** (each mirrors `app/api/products/route.ts` in shape; no logic
  in the handler): `GET`/`POST /api/customers`, `GET /api/customers/:id`,
  `POST /api/customers/:id/repayments` — all **Admin or Cashier**;
  `GET /api/money/balances` — **Admin only**. Zod in
  `lib/validation/customers.ts`.

**Changed from plan:** none — scope as handoff. `recordDebt` helper built
this session (handoff left it to my discretion; building it keeps S4 out
of Prisma for `Debt` writes).

**Flag for Session 1 flow doc + QA:** a repayment greater than the
outstanding balance is **accepted** and drives the derived balance
negative (credit in hand). Deliberate per the handoff; not silently
blocked. If the owner wants it blocked that is a follow-up, not a code
change made here.

**One existing test adjusted (not weakened):**
`tests/integration/m1-flows/flow-4-purchase-reconciliation.test.ts` —
its "purchase_payment writes NO MoneyMovement" check used a global
`prisma.moneyMovement.count()` before/after, which is now flaky because
the money ledger is live and other suites hold `MoneyMovement` rows
concurrently. Rescoped to "no `MoneyMovement` linked to *this* payment"
(by `stockMovementId` / `sourceId`) — a stricter assertion of the same
intent.

- Gates: `pnpm tsc --noEmit` **0**; `pnpm build` **clean**; `pnpm test`
  **268/268** (226 existing + 42 new: financials 7, customers domain 17,
  routes 18), stable across repeated runs.
  `grep TODO(mock)` in the new modules → none.

### 2026-08-30 — M2 Session 4: Restaurant Orders (Developer) — DONE

Backend-only Development Sprint. `lib/domain/sales` Restaurant-order slice
+ `lib/validation/orders` + `app/api/orders` + tests. Ran concurrently
with Session 5 (Canteen) in the same working tree, split by file per the
handoff — S4 owns `create-order.ts` / `edit-own-order.ts` /
`correct-order.ts` / `list-orders.ts` / `order-effects.ts` /
`restaurant-location.ts` and its share of the barrel + `types.ts` +
`test-helpers.ts`.

**Shipped:**

- **`createOrder(input, ctx)` → `OrderView`** — one `prisma.$transaction`:
  validate lines / prices / delivery-fee / payment; **snapshot** each
  line's Restaurant `sellingPrice` as its `unitPrice` (never re-looked-up,
  ADR-16); **§3.8 BLOCK** — sum ordered qty per product, compare to the
  derived Restaurant balance **re-read on the tx client** right before the
  writes, reject in full (nothing written, balance never negative) naming
  every short line; then write `Order` + `OrderLine[]` + one negative
  `sale` `StockMovement` per line + **either** a `MoneyMovement` (cash →
  `cash`, mpesa → `mpesa_bank`; `sourceType: "order"`) **or** a `Debt`
  (credit; `customerId` required, no money row — plan §3.2) + an
  `AuditLog` row.
- **`editOwnOrder(orderId, input, ctx)` → `OrderView`** — a Cashier's
  **true edit** of their own, same-day order. `NOT_FOUND` / `FORBIDDEN`
  (not own) / `FORBIDDEN` "closed" (order's Africa/Nairobi business day ≠
  today — a business-date equality check; **M3 swaps in the real
  `DayClose` gate**, comment left in code). Deletes this order's lines /
  `sale` movements / `MoneyMovement` / `Debt`, re-validates (incl. §3.8),
  rewrites, recomputes `total`. `AuditLog` `action: "correct"` (no `edit`
  in the enum) with pre/post summaries. Shared write body factored into
  `order-effects.writeOrderEffects` (used by create + edit).
- **`correctOrder(orderId, input, ctx)` → `OrderView`** — Admin-only
  append-only correction (ADR-15, mirrors `stock/correct-movement.ts`).
  `NOT_FOUND`; `VALIDATION_ERROR` if the target is itself a correction
  (no chaining); `FORBIDDEN` for a non-admin. Writes a **new `Order`**
  (`correctsOrderId` set, `cashierId` = original, `occurredAt` =
  original's), its lines, and **offsetting** deltas so the net effect
  across `original + all corrections` = the corrected state: one delta
  `sale` `StockMovement` per changed product (`correctsMovementId` → the
  original's `sale` row where singular), one signed delta `MoneyMovement`,
  and/or one signed `Debt` (payment-method change reverses one kind and
  writes the other). **F-1 idempotency:** deltas measured against the
  *current* derived effect; an identical re-submit → `VALIDATION_ERROR`
  "nothing to correct". §3.8 for the corrected state adds the original's
  `sale` movements back before comparing.
- **`listOrders(filter, ctx)` → `OrderView[]`** — role-scoped (mirrors
  `stock/list-movements.ts`): `admin` → all (`cashierId` narrows);
  `cashier` → forced to own, a foreign `cashierId` → `[]` (no error, no
  leak); other role → `FORBIDDEN`. `date` windows the Africa/Nairobi
  business day on `occurredAt`. Newest first. **No margin / cost /
  buyingPrice / profit field** in any row (an `OrderView` has none).
  **Correction rows are returned as separate rows** with `correctsOrderId`
  exposed — reads are **not folded** (simplest for M2; the Session 6
  screen badges / links the pair).
- **Routes** (`app/api/orders/**`), thin handlers per
  `app/api/products/route.ts`: `POST` (cashier → 201), `GET` (admin +
  cashier), `PATCH /:id` (cashier, own + same-day), `POST /:id/correct`
  (admin → 201). Zod shape-only in `lib/validation/orders.ts`; the
  `credit ⇒ customerId` cross-field rule lives in the domain.
- **`lib/domain/customers/correct-debt.ts`** — new tx-only helper for
  `correctOrder`: appends a **signed** `Debt` row (negative reverses,
  positive tops up) — `recordDebt` rejects non-positive amounts by
  design. Exported from the customers barrel; tested.
- **M1 `purchases.ts` `TODO(mock)` resolved** (plan §11): a
  `purchase_payment` now also writes one **`−cost` `MoneyMovement`**
  against `purchase_paid_from` (`sourceType: "purchase_payment"`,
  `sourceId` = the stock-movement id) inside the same transaction. The
  `flow-4` integration test and the `stock` / `flow-4` cleanup helpers
  updated to match; `grep TODO(mock)` in `lib/domain/stock` → none.

**Schema change (owner-approved):** added **`Order.occurred_at`**
(`DateTime @default(now())`) — the edit-vs-correct gate and the
correction-lands-in-the-original's-day rule need a business instant on the
order, and every other ledger table already has one. Applied to the dev
DB via `prisma db push` + `prisma generate`; migration file
`20260829140000_add_order_occurred_at` committed for a real deploy.

**Account-mapping assumption:** `restaurant-sales-flow.md` shows no
explicit account picker on the checkout sheet (walkthroughs A/B: Cash →
Cash account, M-Pesa → M-Pesa/Bank), so `createOrder` **derives** the
account from `paymentMethod`. An optional `account` input is still
accepted and validated for consistency — the Session 6 screen may pass it
explicitly.

**`listOrders` correction rows:** returned as **separate rows** (not
folded), `correctsOrderId` exposed.

**Test-infra change:** `vitest.config.ts` — `maxWorkers: 4` (+
`testTimeout`/`hookTimeout` bumps). The full suite was exhausting the
local Postgres 100-connection ceiling once S4's + S5's DB-heavy suites
ran alongside the M1 set (8 forks × ~17 Prisma connections); capping
forks keeps the total ~68. Isolated suites still run sub-second.

- Gates: `pnpm tsc --noEmit` **0**; `pnpm build` **clean**; `pnpm test`
  **350/350** with S5's suites present (268 M1/S3 baseline untouched +
  S4 domain 33 + S4 routes 16 + purchases money-effect test + S5's).
  `grep TODO(mock)` in `lib/domain/sales` → none.
- Committed on `feat/m2-session-4-orders` (off the S1a HEAD, which
  carries S3 + the handoffs; `main` does not yet have S3). Merge order to
  `main`: S3 → {S4, S5} → S1a/S1b/S2 → S6.

### 2026-08-30 — M2 Session 5: Canteen Derived Sales (Developer) — DONE

Backend-only Development Sprint; ran in the same working tree as Session 4
(Orders), split by file per the handoff (S5 owns `record-stock-count.ts` /
`derived-sales.ts` / `canteen-guards.ts` and adds to the shared
`types.ts` / `index.ts` / `test-helpers.ts` — additively; S4 rebases
those on its final versions before committing).

**Shipped (`lib/domain/sales` canteen slice):**

- **`recordStockCount(input, ctx)` → `{ count, derivedSale }`** — the
  attendant records what is physically on the shelf; the system derives
  the sale for the period since that product's previous count at this
  canteen. `sold = expectedRemaining − countedQuantity`, where
  `expectedRemaining` is the signed `Σ StockMovement.quantity` for
  (product, canteen) up to the count's `occurredAt`, **read on the tx
  client** so two concurrent counts can't both pass a stale read. In one
  transaction: the `StockCount`; one `sale` `StockMovement`
  (`quantity = −sold`, `stockCountId` set — ADR-16, uniform with
  Restaurant sales); a `canteen_sale` `MoneyMovement`
  (`sold × canteen sellingPrice`, `account: "cash"`, `sourceId` = count
  id) **skipped when `sold === 0`**; an `AuditLog` `create` row.
  Validates: product exists & sold at the canteen (active
  `ProductLocation` + non-null `sellingPrice`, snapshotted);
  `countedQuantity ≥ 0`; `occurredAt` (default now) strictly after the
  previous count.
- **`voidStockCount(countId, ctx)`** — same-day undo. **Hard delete** of
  the `StockCount` + its `sale` `StockMovement` + its `canteen_sale`
  `MoneyMovement`, plus a `hard_delete` `AuditLog` row. `FORBIDDEN` for
  another attendant's count or once the Africa/Nairobi business day has
  rolled; `NOT_FOUND` for an unknown id.
- **`getDerivedSalesForProduct(productId, ctx)` /
  `listDerivedSales({ productId?, date? }, ctx)`** — per product, the
  most-recent count's `{ lastCountedAt, periodStart, periodEnd,
  unitsSold, revenue }` (PRD §4.4), joining the latest `StockCount` to
  its `sale` `StockMovement` and `canteen_sale` `MoneyMovement`.
  Never-counted canteen products list with `null` figures (shown, not
  hidden). Role scope: `admin` → every canteen; `canteen_attendant` →
  own canteen; else `FORBIDDEN`. `date` windows on the count's
  Africa/Nairobi business day; newest count first, never-counted last.
- **Routes** (`app/api/canteen/**`, mirror `stock-movements/route.ts`
  shape, no logic in handler): `POST /api/canteen/stock-counts`
  (Attendant only, → 201), `DELETE /api/canteen/stock-counts/:id`
  (Attendant only), `GET /api/canteen/stock-counts` (Admin + Attendant).
  Zod shape-only in `lib/validation/canteen.ts`.
- **Closing stock** is never a written row (ADR-11) — after the `sale`
  row the derived balance at the count's instant equals `countedQuantity`.

**Decisions recorded (owner, 2026-08-30):**

- **Counted more than expected (`sold` < 0): REJECT** —
  `VALIDATION_ERROR`, nothing written. The approved
  `canteen-derived-sales-flow.md` (walkthrough C / "the period-boundary
  case") had described *allowing* a negative-sold reconciliation with a
  reversing money row; the owner overrode that in favour of reject +
  **same-day undo** (`voidStockCount`). The flow doc's negative-sold
  narrative is now superseded — **Session 6 / QA should treat "count
  more than expected" as a blocked error, and "undo today's count" as
  the recovery path.** Flow doc not yet edited (design artifact — flag
  for a Design touch-up or QA note).
- **Zero-value rows:** the `sale` `StockMovement` is still written for
  `sold === 0` (uniform audit trail); the `canteen_sale` `MoneyMovement`
  is **skipped** for `sold === 0` (no zero-value money row).
- **Explicit `stock_count` closing marker row:** not written — relied on
  the derived balance (ADR-11).
- **GET route:** `/api/canteen/stock-counts` only; no `/derived-sales`
  alias (the flow doc doesn't name one).
- **`correctStockCount` schema gap:** no `corrects_stock_count_id`
  column; an Admin post-close correction path needs a migration in a
  later session. Module is shaped so it can drop in.

**Changed from plan:** the reject-vs-allow decision above (plan §3.5 /
handoff §3 left it to the owner; the flow doc's lean toward "allow" was
not taken). Added a `DELETE` route for the same-day undo — not in the
handoff's route table, follows from the owner decision.

**Shared-file edits (additive — S4 unaffected, still green):**
`types.ts` (+`RecordStockCountInput`, `DerivedSale*`,
`ListDerivedSalesFilter`, `ActorContext.locationId?`), `index.ts` (+4
exports), `test-helpers.ts` (+`setupCanteenTestData`, `seedMovement`,
canteen cleanup branch — `Staff` + `StockCount` + `canteen_sale` money
rows).

**Test note:** `getAccountBalances()` and `prisma.debt.count()` are
global aggregates and race the parallel S4 order suites — S5 domain
tests assert revenue/debt effects on their **own** `sourceId` /
location, never a global before/after delta.

- Gates: `pnpm tsc --noEmit` **0**; `pnpm build` **clean**; `pnpm test`
  **350/350** (318 after S4 + 32 new: `record-stock-count` 16,
  `derived-sales` 8, canteen route 8). Existing suite untouched.
  `grep TODO(mock)` in the new canteen files → none.

*(Full per-session entries for M2 Sessions 1–7 go here as they run.)*

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
