# M2 Session 6 Handoff — Frontend assembly (split into 6a / 6b / 6c / 6d)

**Session 6a is DONE** (2026-08-30). This file is now the handoff for
**6b, 6c, 6d** — the rest of the M2 frontend. Read `§0` for what 6a
changed under you, then your session's section (`§6b` / `§6c` / `§6d`).

**Role for all three:** Developer (Development Sprint — frontend assembly
+ wiring). `app/**` screen routes + per-screen client components +
per-feature hooks + `tests/screens/*.screen.test.tsx` + the shell/nav
changes named below + the doc updates in `§9`.

**Branch:** continue on `feat/m2-session-6-screens` (6a is committed
there). Commit per session (`6b`, `6c`, `6d`).

---

## 0. What Session 6a changed (READ THIS — it changes the contract)

6a started as "assemble all 12 screens" and hit **three backend gaps the
screen designs need but the plan never built**. The owner approved
filling them (schema + domain — which the original handoff forbade). All
merged, `pnpm test` **368/368**, `tsc` 0, `build` clean.

### Backend additions — already done, just consume them

| Addition | Where | Use it for |
|---|---|---|
| **`OrderView.number`** (`int`, monotonic, e.g. `1043`) | every order domain fn / `GET /api/orders` payload | A2 ledger "Order #1043", A3 list + "Correction of #1043", C1/C4 headers + toasts. A correction is its own `Order` row with its own `number`. |
| **`Product.category`** (`string \| null`) on `ProductWithLocations` | `GET /api/products` (now `?category=` too) | The C2 New-Order grid + K1 Stock-Count picker **category tab rows** (kit `Tabs`, underline). Group products by `category`; `null` → an "Uncategorised" tab. |
| **`cashier` in `PRODUCT_READ_ROLES` + `STOCK_ROLES`** | `app/api/products`, `app/api/stock-movements/balances` | C2 can now read the product list + the derived Restaurant balance as a Cashier. `buyingPrice` is still stripped for the Cashier — **do not** surface cost/margin anywhere (plan §3.6). |
| **`CustomerLedgerEntry.orderNumber` / `.account` / `.note`** | `GET /api/customers/:id` | 6a already wired A2's "Reference" cell. No action unless you touch A2. |
| Catalog product drawer — **no `category` input yet** | `app/admin/catalog/product-drawer.tsx` | **6b or 6c must add a `category` text/select field** so an Admin can set it, or C2/K1's tabs are always "Uncategorised". Small — one `<TextInput>` wired to the create/update body (`category` is already in the Zod schema + domain). |

Deploy migration:
`prisma/migrations/20260830120000_m2_s6_order_number_product_category_repayment_detail/`.
Dev DB already pushed. **Do not add more schema/domain changes without
owner sign-off** — but the owner has said: *if a fresh feature genuinely
needs one, raise it, get the go-ahead, fill it properly* (don't ship a
half-usable screen to stay inside a boundary). Flag → wait → fill.

### `docs/API.md` already updated

Orders / Customers / Catalog sections carry ADR-style notes for every
addition above. Trust them.

---

## 1. Standing rules for 6b–6d (unchanged from the original handoff)

1. **Compose from the proven kit only.** `PageShell`, `Drawer` (rail,
   ADR-37b), `BottomSheet`, `FormField`, `SimpleTable`, `DenseLedger` /
   `DenseSummaryStrip`, `SegmentedControl`, `Select` (searchable),
   `QuantityStepper`, `CalculatedImpactBanner`, `Tabs`,
   `ActivityTimeline`, `Toast`, `EmptyState` / `ErrorState`, `IconButton`,
   `PillFilter`, `Breadcrumb`, `SearchInput`, `MobileNavDrawer`. A **thin
   per-screen mapper** where the kit's prop shape doesn't fit is expected.
   **A change to a kit component is not** — except the one 6b task
   explicitly named (`SimpleTable` chevron). If you reach for another,
   stop and flag it.
2. **Money + quantities are decimal strings end to end.** The hook never
   `Number()`-parses them for the domain call; format with local helpers
   only for display.
3. **No new UI/UX decisions.** If a screen needs a state the kit +
   artboards don't cover, flag it — it's a Design touch-up.
4. **Cross-cutting contracts (plan §3)** — verified by screen specs:
   - §3.2 — a cash/M-Pesa order → one `MoneyMovement`; a **credit** order
     → a `Debt`, `customerId` required (C3 blocks Confirm until a
     customer is attached; the API 400s otherwise).
   - §3.3 / §3.4 — a Cashier edits their **own** order only while its
     business day **is today** (`editOwnOrder`). After that C4 is
     read-only + routes to the Admin correction path (A3 → `correctOrder`,
     Admin-only). The API enforces this regardless.
   - §3.5 — canteen is cash-only, no credit, no M-Pesa, no account picker
     on K1. The derived-sale preview comes straight from
     `recordStockCount`'s return; `periodStart: null` ⇒ first-count copy.
   - §3.6 — a Cashier's C1 is their own orders only; **no `buyingPrice` /
     unit cost / margin** in any cashier payload or screen. No "profit"
     column on A3 either. Prove it in a spec.
   - §3.8 — C2 surfaces an insufficient-Restaurant-stock line inline per
     line (§9.8 error pattern), sticky Confirm disabled, danger caption.
     The API returns `400 VALIDATION_ERROR` `field: "lines"` naming the
     short line(s) + available qty.
5. **Canteen 2026-08-30 re-spin** (`canteen-derived-sales-flow.md`):
   counting **more** than expected is a **hard 400** on `countedQuantity`
   ("exceeds expected stock by N …"), **not** a negative-sold
   reconciliation. Recovery = **undo today's count**
   (`DELETE /api/canteen/stock-counts/:id`, attendant + same-day only;
   after the day rolls → 403 "closed"). No negative-sold / negative-revenue
   state anywhere. If a flow doc or artboard still shows the old
   negative-sold text, note it in `PROGRESS.md` as a doc-vs-behaviour gap
   for QA — do not "fix" the doc (Dev session, not Design).

---

## 2. Testing discipline (this is why 6a ran slow — don't repeat it)

**6a ran the full 368-test suite ~5 times. Most of those were wasted.**
For 6b–6d:

- **While building / iterating a screen:** run ONLY that screen's spec —
  `pnpm vitest run tests/screens/<name>.screen.test.tsx` (~2s). Iterate
  there.
- **Full suite (`pnpm test`) runs ONCE per session**, at the end, before
  the commit. Not after every edit.
- **6b–6d touch no schema and no `lib/domain`** — so a broken M1/backend
  test is essentially impossible. If the full suite is green after 6a's
  commit, the only thing that can break it is your new `*.screen.test.tsx`
  files, which you already ran individually. One end-of-session full run
  confirms it.
- **`tsc --noEmit`** is fast — run it freely.
- **jsdom applies NO CSS**, so `md:block` (desktop) AND `md:hidden`
  (mobile) BOTH render in a screen spec. Every screen that has a
  responsive split renders each label/row **twice**. So:
  - **never** bare `screen.getByText("Grace Wanjiru")` for content that
    appears in both layouts — it throws "found multiple elements".
  - Use `screen.getAllByText(...).length` **or** scope with
    `within(screen.getByRole("table"))` (the desktop table) /
    `within(<the mobile container>)`.
  - `catalog.screen.test.tsx` has a comment about this — read it first.
    `admin-customers.screen.test.tsx` (6a) is the worked example.
- **`get_jsx` on a full 1440×900 Paper artboard takes ~20–30s to return.**
  It is not hung. Wait for it. (6a's owner interrupted it twice thinking
  it was stuck.)
- **Kit `test:visual` / `test:a11y`** only need re-running if you touch
  `components/kit/**` — i.e. only in 6b for the `SimpleTable` chevron.
  Re-baseline **only** the `simple-table` story if its snapshot changes.

---

## 3. Paper verification — Paper IS reachable

The auth warning at the top of a fresh session is about the **Figma** and
**Google Drive** connectors, **not Paper**. Paper works. 6a used it
throughout.

- File: **"Prosper Hotel"**, page **"Shell+Component kit"**
  (`mcp__paper__get_basic_info` → `pageId 1-0`).
- Per screen: `mcp__paper__get_screenshot` the artboard (`scale: 2`) →
  assemble to match → `mcp__paper__get_jsx` / `get_computed_styles` for
  **exact** structure / copy / tokens. **Never eyeball a screenshot for a
  value.** Never paste artboard markup into a screen file.
- **Paper draws fixed pixel sizes** (`h-[52px]` rows, `grow-2` /
  `grow-[1.4]` column ratios, hard-coded gaps). **The codebase kit is the
  design-system source of truth**, not the artboard pixels (owner ruling,
  6a). Match Paper on **structure, hierarchy, copy, colour tokens, which
  components, which states** — take **row heights / control sizes /
  spacing scale** from the kit + `--sp-*` / `--bp-md` tokens, so the
  result is responsive. Where they conflict, the kit wins; note it in a
  screen-file comment.
- Artboard IDs are listed per screen below.

---

## 4. The per-feature hooks

Mirror `app/admin/catalog/use-catalog.ts` exactly (the `request<T>`
helper, a typed `*RequestError`, domain-typed shapes, `refresh()`).
`app/admin/customers/use-customers.ts` (6a) is the second worked example.

- **`app/cashier/use-orders.ts`** (6c; shared with A3 in 6d) — `list`
  (role-scoped by the API), `create`, `editOwn`, `correct`. Types from
  `@/lib/domain/sales` (`OrderView`, `CreateOrderInput`, …).
- **`app/admin/customers/use-customers.ts`** — **already built (6a)**.
  C5 reuses it (`useCustomers` + `createCustomer`).
- **`app/canteen/use-stock-count.ts`** (6d; reuse for A4) —
  `recordStockCount`, `voidStockCount`, `listDerivedSales`. Types from
  `@/lib/domain/sales` (`RecordStockCountResult`, `DerivedSaleView`, …).

---

## §6b — Shell + nav + finish Customers

**Goal:** the Admin shell responsive, every M2 nav link routing, the
`SimpleTable` chevron, and Customers & Credit fully verified + walked.

### 6b.1 — Make `AdminShellClient` responsive (the blocker)

`app/admin/layout.tsx` → `app/admin/admin-shell-client.tsx` renders a
**fixed 240px sidebar at every width**. There is no `--bp-md` switch to a
mobile shell, so on a narrow viewport the admin screens keep the desktop
frame (this is the gap the owner saw in DevTools mobile view). Every M2
admin screen has a `— mobile [M2-01]` artboard that assumes a
hamburger + slide-in drawer, not a fixed rail.

- Below `--bp-md`: hide the fixed sidebar, show a top bar with a
  hamburger that opens the nav in the kit **`MobileNavDrawer`**
  (`components/kit/mobile-nav-drawer.tsx` — already built for this).
  Match Paper **`6B1-0`** "Mobile Shell — Admin (Drawer Closed)" +
  **`1ZP-0`** "Mobile Shell — Sidebar Drawer Open".
- At/above `--bp-md`: unchanged (the current 240px sidebar).
- The `StaffShellClient` is already mobile-first — **do not touch it**
  beyond 6b.3.
- This is `components/layout/**` + `app/admin/**`, not `components/kit/**`
  (the drawer primitive already exists) — in scope.

### 6b.2 — Wire the Admin sidebar nav

`admin-shell-client.tsx` — the sidebar items currently render but several
route nowhere. Wire:
- **Customers** → `/admin/customers` (A1, built 6a)
- **Sales** → `/admin/orders` (A3, built 6d — the link can land ahead of
  the screen; a 404 until 6d is acceptable, or gate the item)
- **Canteen / Derived sales** → `/admin/canteen/derived-sales` (A4, 6d) —
  check `canteen-derived-sales-flow.md` §G for whether it's a top-level
  item or under "Sales".
- Mark the active item from the pathname (the shell already has the
  pattern for the built ones).

### 6b.3 — Add "Customers" to the Cashier bottom nav

`components/layout/staff-shell-client.tsx` — `NAV_DEFS_BY_BASE["/cashier"]`
is currently `[New Order, History]` only. Add **Customers** → `/cashier/customers`
(C6, built 6a). Confirm against `restaurant-sales-flow.md` §"The screens"
(C1 is the Cashier hub / "Today") — the bottom nav should be roughly
**Today · New order · Customers**. Add the "Today" item pointing at
`/cashier` (C1 lands in 6c; the item can precede the screen).

### 6b.4 — `SimpleTable` trailing-chevron prop (the one approved kit change)

The A1/A2/A3/A4 artboards draw a trailing `›` on every clickable row. The
kit `SimpleTable` clickable row (`role="row"` + `aria-label` + `tabIndex`)
has no chevron. Add an **opt-in** prop (e.g. `rowChevron?: boolean`) that
renders a right-pointing chevron in a fixed-width trailing slot on
clickable rows only. `rowChevron` off → byte-identical to today.
- Update `components/kit/simple-table.stories.tsx` with a `RowChevron`
  story; re-run `pnpm test:visual` + `pnpm test:a11y`; re-baseline **only**
  the affected snapshot. Keep `kit-audit.md` / `component-states.md` in
  sync if they enumerate `SimpleTable` states.
- Then set `rowChevron` on A1 (and A2 if its ledger rows are clickable —
  check `ER9-0`; 6a's A2 rows are not currently click targets).

### 6b.5 — Add the `category` field to the Catalog product drawer

`app/admin/catalog/product-drawer.tsx` — one `<TextInput label="Category">`
(or a `<Select>` if the flow prefers a fixed list; the flow docs don't
specify, so free-text is fine) wired into the create/update body. The
domain + Zod already accept `category`. Without this, C2/K1's tabs are
permanently "Uncategorised".

### 6b.6 — Finish Customers verification + walkthrough

- Screenshot + reconcile the **remaining** Customers state artboards
  (6a only did the populated ones):
  A1 `E41-0` (empty) · `DZ0-0` (filtered-empty) · `E97-0` (error);
  A2 `EXK-0` (zero history) · `F23-0` (loading);
  C6 `D8E-0` (populated) · `DBH-0` (empty) · `DF9-0` (repayment success).
- **Owner walkthrough** of Customers & Credit on `pnpm dev` as **Cashier**
  (C6) and **Admin** (A1, A2) — the real e2e gate (plan §8 guardrail 3).
  Needs seed data: either do a minimal `prisma/seed.ts` customer block
  now, or ask the owner to add a couple of customers + repayments by hand
  during the walk. (Full M2 seed is a 6d task.)

### 6b — done when

Admin shell switches to the mobile drawer below `--bp-md` and matches
`6B1-0` / `1ZP-0`; every M2 nav link routes (or is deliberately gated);
`SimpleTable` `rowChevron` shipped + gated; Catalog drawer sets
`category`; all Customers state artboards verified; owner has walked
Customers as Cashier + Admin. `tsc` 0, one `pnpm test` run green, kit
`test:visual`/`test:a11y` green.

---

## §6c — Restaurant Orders (C1–C5)

**Goal:** the Cashier can take an order end to end on real data.

### Hook: `app/cashier/use-orders.ts`

Mirror `use-catalog.ts` / `use-customers.ts`. Surface: `orders` (list),
`loading`, `error`, `refresh`, `createOrder`, `editOwnOrder`,
`correctOrder` (correct is Admin-only at the API — the hook can still
expose it for A3's reuse in 6d). Types from `@/lib/domain/sales`.

### Screens

| ID | Route (record the actual path in `§10`) | Wires to | Artboards |
|---|---|---|---|
| **C1** Cashier Today | `app/cashier/page.tsx` (replace the `EmptyState` placeholder) | `use-orders` list (own, `?date=today`) | `BVG-0` populated · `BYQ-0` empty · `C0Z-0` day-closed banner · `C38-0` loading |
| **C2** New Order — build | `app/cashier/orders/new/*` (path is a suggestion) | `GET /api/products` (Restaurant `ProductLocation` + `category`) + `GET /api/stock-movements/balances` for the derived Restaurant balance | `C6D-0` populated (grid + `category` `Tabs` + pinned order panel + sticky total) · `CGM-0` empty · `CJ7-0` line blocked (§3.8) |
| **C3** Checkout | bottom-sheet over C2 | `use-orders.createOrder` | `DLP-0` Cash · `DN8-0` M-Pesa · `DOP-0` Credit-no-customer (Confirm disabled) · `DQ6-0` Credit-attached · `DRN-0` Delivery + fee |
| **C4** Order detail / edit | `app/cashier/orders/[id]/*` | `use-orders.editOwnOrder` (same-day own) / **read-only + route to A3** otherwise | `CWU-0` day-open editable · `CZF-0` day-closed read-only · `D18-0` corrected |
| **C5** Customer attach / quick-create | sheet over C3 | **reuse `use-customers`** (`useCustomers` search + `createCustomer`) | `D4S-0` search results · `D5P-0` no-match quick-create · `D6K-0` phone error |

**Notes:**
- C2 grid: group products by `category` into a kit `Tabs` (underline) row
  — "All" + one tab per distinct category; `null` → "Uncategorised".
  Products with no Restaurant `ProductLocation` (or inactive) don't
  appear.
- C2 §3.8: read `GET /api/stock-movements/balances?productIds=…&locationId=<Restaurant>`
  for the tiles' stock-available count; block a line whose qty exceeds it
  (§9.8 pattern on the row, sticky Confirm disabled). The server is still
  the gate — on a `400 VALIDATION_ERROR field: "lines"` from
  `createOrder`, parse the short-line names out of `message` and render
  the block against the right row.
- C3 `account`: **omit it** — the domain derives cash→cash, mpesa→mpesa_bank
  from `paymentMethod` (no picker in the flow doc / artboards).
- C4 routing rule (S4 handoff): `order.cashierId === session.user.id`
  **and** `toBusinessDate(order.occurredAt) === toBusinessDate(now)` →
  editable (PATCH). Else read-only; "Correct this" is **Admin-only** and,
  from a Cashier's C4, only surfaces the order **number** for the Admin
  (flow doc walkthrough F) — it does not open a form. Use `OrderView.number`
  for every "#1043" and the corrected-order link.
- C1 "day open": M2 has **no Day Close** — the pill is "Day open" for
  today, and the day-closed banner (`C0Z-0`) is for viewing a **past**
  day. C1's scope is *today's own orders*, so the banner is effectively a
  future hook; render the pill "Day open" and keep the banner markup
  behind an `isPastDay` flag that is always false in M2. (Don't invent a
  Day Close check.)

### Spec: `tests/screens/cashier-orders.screen.test.tsx`

Per screen: populated, empty, error, loading, + the primary interaction.
Contract assertions: credit → Confirm disabled until a customer is
attached; §3.8 line block renders + disables Confirm; C4 same-day →
editable form, past-day → read-only + no edit; **no margin/cost column or
value anywhere** in C1–C4.

### 6c — done when

C1–C5 live on real data, every structural state renders, the spec covers
the contracts, and the owner has walked the Cashier order flow on
`pnpm dev` (take a cash order, an M-Pesa order, a credit order with a
new customer, edit a same-day order, view a past-day order).

---

## §6d — Admin Orders + Canteen + wrap

**Goal:** the last 4 screens, the seed, the final gates, hand to QA.

### Read these first (6d may run cold, in any IDE, no session memory)

Everything 6d needs is in the repo. Before writing code, read, in order:

1. **This file** — `§0` (what 6a changed), `§1` (standing rules), `§2`
   (testing discipline), `§4` (the per-feature hook pattern), `§6d`
   (below), and `§10` (per-session notes — 6a/6b/6c are all logged).
2. `docs/sprints/milestone-2-plan.md` — `§3` (cross-cutting contracts),
   `§7` (session table + status), guardrails.
3. **Worked examples already in the tree** (copy these patterns; do not
   invent):
   - Hooks: `app/cashier/use-orders.ts` + `app/admin/customers/use-customers.ts`
     — the `request<T>` helper, a typed `*RequestError`, `refresh()`.
   - Screen specs: `tests/screens/cashier-orders.screen.test.tsx` (6c) +
     `tests/screens/admin-customers.screen.test.tsx` (6a) — the hook-mock
     pattern, the jsdom dual-layout gotcha, `role="radio"` for
     `SegmentedControl`, `role="dialog"` for `BottomSheet`.
   - Screen composition: `app/cashier/orders/new/new-order-client.tsx`
     (C2/C3/C5 — grid, `BottomSheet` overlays, `startAdornment`),
     `app/cashier/orders/[id]/order-detail-client.tsx` (C4 — edit vs
     read-only), `app/cashier/cashier-today-client.tsx` (C1).
4. `docs/design/component-states.md` §2 + §9 and `docs/design/kit-audit.md`
   — the current kit surface (6c added `TextInput.startAdornment` and
   `BottomSheet` padding + `ariaLabel`).

**The gate method (not app-level Playwright):** per-screen interaction is
proven with **jsdom + React Testing Library** in
`tests/screens/*.screen.test.tsx`, run under `pnpm vitest run <file>`.
While iterating a screen, run ONLY that file (~2 s). Run the **full
`pnpm test` once**, at the end, before the commit — not after every edit.
`pnpm tsc --noEmit` is fast, run it freely. Visual diffing of a screen is
done by screenshotting the Paper artboard (`mcp__paper__get_screenshot`)
and comparing by eye — there is NO app-level headless-browser e2e
(plan guardrail 2). The Storybook kit gate (`pnpm test:visual` /
`pnpm test:a11y`, Playwright under the hood) is only touched if you
change `components/kit/**`.

**Owed from 6c (close it in 6d):** the visual baseline
`tests/visual/__screenshots__/kit-textinput--start-adornment.png` was
never generated (the `startAdornment` kit prop shipped without it — see
`§10` 6c). Run the Storybook runner once and `-u` to write it, eyeball
the PNG, commit. If it was already done, skip.

### A3 — Admin Orders list

- Route: `app/admin/orders/page.tsx`. Shell: Admin desktop + mobile
  (uses 6b's responsive shell).
- Hook: **reuse `use-orders`** (6c) — `list` (all, the API role-scopes),
  `correctOrder`.
- Artboards: `FA1-0` populated · `FHF-0` filtered-empty · `FN0-0` empty ·
  `FSL-0` error · `FYX-0` read-only order-detail drawer · `G4I-0`
  correction form drawer · `GCP-0` order + correction linked row-group ·
  `GIA-0` mobile.
- `SimpleTable` (with 6b's `rowChevron`): Time · Cashier · Type · Total ·
  Payment · Status · (row → drawer). Status = "Posted" / "Corrected" /
  "Correction of #{original.number}" as plain coloured text (table
  density, §4.4 — not a chip). A corrected order + its correction render
  as a **linked row-group** (`GCP-0` — bracketed pair, correction
  indented, "Correction of #1043" in its Reference).
- **Read-only** — row opens a read-only detail `Drawer` (rail). The one
  mutating action is "Record correction" → the drawer switches to the
  correction form: original as read context, corrected line list (reuse
  the C2 line-row + `QuantityStepper` pattern), corrected type / fee /
  payment, a `CalculatedImpactBanner` previewing the stock + money
  reversal, a required **Reason** `Textarea`, "Record correction" primary.
  → `use-orders.correctOrder` → `POST /api/orders/:id/correct`. `Toast`
  (top-right) "Correction recorded as order #{new.number}".
- **No delete affordance anywhere. No margin / cost / profit column**
  (§3.6 — the `OrderView` has none; don't add one).
- `use-orders.correctOrder` is Admin-only at the API; A3 is an admin
  route so that's fine.

### A4 — Canteen Derived Sales

- Route: `app/admin/canteen/derived-sales/page.tsx` (or under an existing
  "Sales" nav — check `canteen-derived-sales-flow.md` §G).
- Hook: `app/canteen/use-stock-count.ts` → `listDerivedSales`
  (`GET /api/canteen/stock-counts?productId=&date=`).
- Artboards: `GL2-0` populated · `GRM-0` product never counted
  (**Never / — / muted em-dash**, not blank) · `GVN-0` filtered-empty ·
  `GZO-0` loading · `H4I-0` mobile.
- `SimpleTable`: Product · Last counted (date + relative) · Period
  covered (span) · Units sold (mono, right) · Revenue (mono, right).
  Every `unitsSold` / `revenue` is `≥ 0` or `null` (never-counted →
  em-dash row). **No negative-revenue treatment** (removed in the
  2026-08-30 re-spin).

### K1 — Stock Count

- Route: `app/canteen/stock-count/*`. Shell: staff mobile + `FlowHeader`
  (back, "Stock Count", no direction badge).
- Hook: `use-stock-count` → `recordStockCount` (`POST`), `voidStockCount`
  (`DELETE …/:id`).
- Artboards: `H6V-0` product picker (reuses the C2 `category` `Tabs` over
  `Product.category` — **now populated** by 6a) · `H8J-0` count entered +
  preview · `HA3-0` first-ever count (distinct copy) · `HBN-0`
  counted-more-than-expected (**blocked** — §9.8 inline error on the
  count field + an `InstructionalBanner`, Confirm disabled, no preview) ·
  `HIQ-0` confirm success (`Toast`) · `HWS-0` delete success · +
  validation error (blank/non-numeric), count-locked-previous-day,
  delete-count confirm (`FrictionDeleteDialog` with
  `showTypeToConfirm={false}`).
- The preview card is `CalculatedImpactBanner`, rendered straight from
  `recordStockCount`'s return `derivedSale: { unitsSold, revenue,
  periodStart, periodEnd }`. `periodStart: null` ⇒ first-count copy
  (`HA3-0`).
- **No account picker, no customer attach** (canteen cash-only, §3.5).
- "Counted more than expected" → the POST returns `400 VALIDATION_ERROR`
  `field: "countedQuantity"` ("exceeds expected stock by N …") — surface
  it inline (`HBN-0`), and offer **Delete today's count** if a same-day
  count for this product exists (undo = `DELETE …/:id`, same-day only;
  past-day → 403 → the count-locked state).

### K2 — Canteen hub derived-sale row (NOT a new screen)

- Extend `app/canteen/hub-client.tsx` — the movement→row mapper in the
  hub's `ActivityTimeline`. A `stockCountId`-linked `sale` renders as:
  title **"Stock count — {product}"**, subtitle
  **"{n} {unit} sold since {date} · closing {rem}"**, trailing
  **"+KES {y}"** green mono. A zero-sold count (no `canteen_sale`
  `MoneyMovement`) shows a muted em-dash where the value would be. **No
  negative variant.**
- Artboards: `HLH-0` entry at top · `HNT-0` interleaved with a transfer +
  an opening-stock row (the visual-consistency acceptance point).
- Add the K2 row to the existing `tests/screens/canteen-hub.screen.test.tsx`.

### Specs

`tests/screens/admin-orders.screen.test.tsx`,
`tests/screens/canteen-derived-sales.screen.test.tsx`, + the K2 row in
`canteen-hub.screen.test.tsx`. Cover populated / empty / filtered-empty /
error / loading / happy-path + the §3 contracts (A3: no margin column, no
delete, correction writes a new numbered row; K1: counted-more-than-expected
shows the blocked error + offers undo; A4: never-counted → em-dash row).

### Seed — `prisma/seed.ts`

Add an M2 dev-data block so `pnpm dev` shows **populated** states:
- ~4 customers, 2–3 with outstanding `Debt` rows (via a couple of credit
  orders) and 1–2 with `Repayment` rows (mix of cash / mpesa_bank +
  a note on one).
- ~6 orders across the two cashiers — cash, M-Pesa, credit, dine-in,
  takeaway, delivery-with-fee — a couple dated **yesterday** (so C4's
  past-day read-only path is walkable), one **corrected** (so the A3
  linked row-group + C4 corrected state show).
- 1–2 canteen `StockCount` rows on a canteen product (so A4 has a
  populated row + K2 has a hub entry), plus one canteen product left
  **never counted** (so A4's em-dash row shows).
- Keep it idempotent (`upsert` / guard on a marker) like the existing
  seed.

### Final gates (6d closes the milestone's dev work)

- `pnpm tsc --noEmit` → 0.
- `pnpm build` → clean.
- `pnpm test` → green (368 from 6a + every new `*.screen.test.tsx`).
- Kit `pnpm test:visual` + `pnpm test:a11y` → green (only the
  `simple-table` baseline changed, in 6b).
- `grep -rn "TODO(mock)"` across `app/**` for the M2 screens → none.
- Every M2 screen renders every structural state from its artboard on
  real data; each matches the Paper artboard (re-screenshot to diff).
- **Owner has walked each feature** (Restaurant sales as cashier + admin;
  Customers & Credit as cashier + admin — 6b; Canteen derived sales as
  attendant + admin) on `pnpm dev` and signed off.

---

## 9. Docs to update (6d owns the final pass; 6b/6c append as they go)

- **`docs/PROGRESS.md`** — a `6b` / `6c` / `6d` entry each (rebase before
  writing). Screens shipped, hooks, any flag raised, any
  flow-doc-vs-behaviour gap for QA, the owner-walkthrough sign-off.
- **`docs/sprints/milestone-2-plan.md`** §7 — mark 6b / 6c / 6d status;
  §10 changelog line only if sequencing shifts again.
- **`docs/design/export-workflow.md`** — if the assembly turned up a
  reusable note, add it to the "M2 model" section (don't restructure).
- **`docs/API.md`** — only if a wired screen exposed a contract ambiguity
  you had to resolve (ADR-style note, not a silent change).
- **`docs/design/kit-audit.md` / `component-states.md`** — the
  `SimpleTable` `rowChevron` state (6b).
- **This file** — 6d flips the top line to `DONE`, and adds a note for
  Session 7 (QA): which screens/states got the lightest coverage, where
  the flow-doc-vs-behaviour gaps are.

---

## 10. Session Notes

*(Live notes added during 6b / 6c / 6d.)*

### 6a (done, 2026-08-30)
- **Backend fills:** `Order.number`, `Product.category` (+ `cashier` API
  read roles), `Repayment.account`/`.note` — migration
  `20260830120000_m2_s6_…`. `docs/API.md` updated.
- **Screens shipped:** C6, A1, A2 (+ `use-customers.ts`,
  `repayment-form.tsx`). 18 screen specs. `pnpm test` 368/368.
- **Paper verified:** `DU2-0`, `EJ6-0`, `EPJ-0`, `ER9-0`, `F7F-0`,
  `DDD-0` (populated states only).
- **Owner rulings:** (1) kit is the design-system source of truth over
  Paper's fixed pixels; (2) fill any gap a fresh feature needs even if it
  crosses schema/domain — raise it, get the go-ahead, do it properly;
  (3) `SimpleTable` chevron = a small opt-in kit prop, do it in 6b, don't
  hand-roll.
- **Not done / for 6b:** responsive `AdminShellClient` (the mobile-view
  gap), nav wiring, `SimpleTable` chevron, Catalog `category` input,
  remaining Customers state artboards, Customers owner walkthrough.

### 6b (done 2026-08-30 — owner walkthrough still owed)
- **Admin shell responsive:** mobile chrome (`6BD-0` header + `1ZP-0`
  drawer) **merged into `components/shells/admin-shell.tsx`**, not a shell
  swap — sidebar/rail `hidden md:flex`, a `flex md:hidden` header +
  hamburger opens the existing kit `MobileNavDrawer` (one internal
  `useState`). `children` renders once. `MobileShellAdmin` is now
  unreferenced (left in place — valid `6B1-0` transcription; 6d/QA may
  delete). `admin-shell-client.tsx` active-key → longest href-prefix
  match against exported `ADMIN_NAV_ITEMS`.
- **Nav wired:** `admin-shell.tsx` + `mobile-nav-drawer.tsx` — **Sales** →
  `/admin/orders` (key `orders`), new **Derived sales** →
  `/admin/canteen/derived-sales` (key `derived-sales`) in Operations.
  Cashier bottom nav (`staff-shell-client.tsx`) → **Today · New Order ·
  Customers** (`today` = bare `/cashier`; glyphs per `D8E-0`).
- **`SimpleTable` chevron:** opt-in `rowChevron?: boolean` — off =
  byte-identical; on (+ `onRowClick`) = a `w-[24px]` trailing slot
  (header spacer + `ChevronRight` per clickable row). Story `RowChevron`
  + one new baseline `kit-simpletable--row-chevron.png` (no existing
  baseline moved). `kit-audit.md` / `component-states.md` updated. Set on
  A1; A2 ledger rows aren't click targets so no chevron there.
- **Catalog `category`:** free-text `<FormField label="Category">` in the
  product drawer's General Information, wired to create/update body.
  `catalog.screen.test.tsx` asserts it round-trips.
- **Customers artboards verified:** `E41-0` `DZ0-0` `E97-0` / `EXK-0`
  `F23-0` / `D8E-0` `DBH-0` `DF9-0` — all **structural** states match;
  only minor copy deltas (shorter EmptyState descriptions; A1 error shows
  the live error string; C6 toast omits the amount — `RepaymentForm.onDone`
  carries none, shared with A1, deferred). Logged in PROGRESS for QA.
- **Gates:** `tsc` 0; kit `test:visual`+`test:a11y` green (181/181, 1 new
  snapshot); `catalog.screen.test.tsx` 10/10. **Full `pnpm test` deferred
  to 6d** (owner directive — run once, at the end).
- **Customers walkthrough:** _PENDING — owner drives C6 (Cashier) + A1/A2
  (Admin) on `pnpm dev`. Needs a minimal customer seed block or a couple
  added by hand._

### 6c (done 2026-08-30 — owner walkthrough owed)
- **Screen routes:** C1 = `app/cashier/page.tsx` (→ `cashier-today-client.tsx`);
  C2 = `app/cashier/orders/new/` (`page.tsx` + `new-order-client.tsx` —
  C3 checkout + C5 attach are `BottomSheet` overlays composed inside the
  same client); C4 = `app/cashier/orders/[id]/` (`page.tsx` resolves the
  session + today's business date, `order-detail-client.tsx` renders
  editable-vs-read-only).
- **Hooks:** `app/cashier/use-orders.ts` (`useOrders` + `useOrder`),
  `app/cashier/use-restaurant-products.ts` (grid + §3.8 balances).
  `useCustomers.createCustomer` now **returns the created customer** (was
  `void`) for C5's quick-create → attach.
- **Spec:** `tests/screens/cashier-orders.screen.test.tsx`, 28 tests.
  Note: `SegmentedControl` = `role="radio"`, `BottomSheet` = `role="dialog"`.
- **Kit changes (owner-approved mid-session — defects vs the kit's own
  artboards, found in the owner's `pnpm dev` walk):**
  - `BottomSheet` — open-state `children` were edge-to-edge; now wrapped
    in a padded, `overflow-y-auto` scroll region + panel `max-h-[90dvh]`.
    New optional `ariaLabel` (name a titleless sheet — C6 `DDD-0`).
  - `TextInput` — new optional `startAdornment` node inside the box
    before the input (a "KES" marker, `DDD-0` / `DRN-0`). Applied to C6
    Amount + C3/C4 delivery fee. **Visual baseline
    `kit-textinput--start-adornment` NOT yet generated — see the "Read
    these first" box in §6d; close it in 6d.**
  - `component-states.md` §C3/§C19 + `kit-audit.md` updated.
- **Seed runtime fix:** the seeded `Restaurant` `Location` had
  `active: false` (a prior test run flipped it) → `POST /api/orders`
  failed `resolveRestaurantId`. The seed's `location.upsert` calls now
  `update: { active: true }`.
- **C6 repayment sheet** brought closer to `DDD-0`: no h1 title (uses
  `ariaLabel`), whole-KES balance line, full-width fields + button.
- **Flow-doc-vs-behaviour gaps for QA (also in PROGRESS):**
  (1) C4 "corrected" banner has no Admin **name** / `correctedAt` —
  `OrderView` lacks both; shows date + `#number` only (`D18-0` shows
  "by Edwin K. (Admin)"). (2) "Correct this (Admin)" on C4 fires a
  **toast** with the order number, not a modal. (3) line-row
  `QuantityStepper` uses the kit size, not the artboard's 30px cells.
- **Seed:** `prisma/seed.ts` → `seedM2Sales()` — Restaurant menu with
  `category` + `production` stock, "Cashier Two", 4 customers (2 with a
  net balance after a repayment, 1 with a noted mpesa_bank repayment),
  ~8 orders across both cashiers incl. 2 yesterday + 1 corrected pair.
  Idempotent (`seed-*` ids). Full canteen/breadth seed → 6d.
- **Cashier order-flow walkthrough:** _PENDING — owner drives cash /
  M-Pesa / credit-new-customer / edit-same-day / view-past-day on
  `pnpm dev`; also the owed 6b Customers walk._

### 6d (done 2026-08-30)
- **Screen routes chosen (A3/A4/K1/K2):**
  - A3 = `app/admin/orders/` (`page.tsx` + `admin-orders-client.tsx`) — SimpleTable listing, active/inactive filter chips row, Detail Drawer, Correction Drawer with `QuantityStepper`, `CalculatedImpactBanner`, and Reason `Textarea`.
  - A4 = `app/admin/canteen/derived-sales/` (`page.tsx` + `derived-sales-client.tsx`) — SimpleTable with Product, Last counted, Period covered, Units sold, Revenue; G5 functional Product select & Date filter pickers.
  - K1 = `app/canteen/stock-count/` (`page.tsx` + `stock-count-client.tsx`) — Mobile 390px stock count flow: product picker (search + categories) → counting sub-screen with stepper, impact preview banner, and Confirm count button.
  - K2 = `app/canteen/hub-client.tsx` & `app/store-manager/staff-stock-format.ts` — resolved `TODO(mock)` on Stock Count action tile; G7 `movementsToTimeline` formats canteen derived-sale movements as "Stock count" entries.
- **Hook added:** `app/canteen/use-stock-count.ts` (`useStockCountActions`, `useDerivedSales`).
- **Seed block added:** `prisma/seed.ts` expanded with full Canteen products (`Mandazi`, `Groundnuts 50g`, `Soda 300ml`, `Water 500ml`), opening stock movements, purchase receipt, and Stock Counts producing derived sales and money movements.
- **Screen Specs:**
  - `tests/screens/admin-orders.screen.test.tsx` (6 tests).
  - `tests/screens/canteen-derived-sales.screen.test.tsx` (4 tests).
  - `tests/screens/canteen-stock-count.screen.test.tsx` (3 tests).
  - `tests/screens/canteen-hub.screen.test.tsx` (7 tests).
  - All 17 screen test suites (127 tests) pass.
- **Gates:**
  - `pnpm tsc --noEmit` — 0 errors.
  - `pnpm build` — Clean production build (40 routes).
  - `pnpm test` — **411/411 passed across 63 test files.**
- **Identified Gaps for Session 6e (Gap-Fix Sprint, agreed with Owner):**
  - **G1:** Hydrate `cashierName: string` on `OrderView` via join in `toOrderView`.
  - **G2:** Hydrate `productName: string` on `OrderLineView` via join in `toOrderView`.
  - **G3 & G4:** Dedicated `/api/canteen/products` and today-count check endpoint.
  - After 6e completes domain type updates and affected tests, proceed to Session 7 (QA).

