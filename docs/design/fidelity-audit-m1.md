# Fidelity Audit — M1 flow screens + Admin mobile (Design Sprint A2)

**Status:** Produced 2026-08-31 by Design Sprint A2 (Product Designer).
This is a **verify + annotate** pass, not a redesign. Each `##` section is
a per-screen checklist of concrete, buildable deltas a Developer can
execute mechanically against the named Paper artboard and source file.

The M1 flow screens predate the flow-doc practice, so this dedicated doc
holds their deltas rather than shoehorning into a flow doc. The
Admin-Financials-mobile (Task 2) checklist lives here too.

Feeds build batches **3b** (Admin mobile) and **3c / 3d** (SM / Canteen
flows) — see the orchestrator summary in
`docs/sprints/handovers/SESSION-A2-design-sprint.md` §7 output.

> **Owner decision 2026-08-31:** the SM / Canteen movement flows go to
> **Option A** — restore the multi-row product picker from the Paper
> drawings. This **adds a Design Sprint before 3c/3d** (re-spin
> `8XH-0` / `92M-0` / `9FE-0` + a flow doc + a component-artboard for the
> selectable product row). See the RESOLVED section immediately below.

---

## ✅ RESOLVED — SM / Canteen movement flows go to Option A (owner, 2026-08-31)

**The owner has chosen Option A: honour the drawings.** The
Store-Manager and Canteen **movement flows** (Receive, Issue, Production,
Transfer, Non-sale, Canteen Transfer Dispatch) get the **multi-row
picker** back — this is why they "look terrible" today: the M1
Session-12 rebuild (ADR-44) traded the rich picker for a one-line
`Select` + one `QuantityStepper` form and marked `8XH-0` / `92M-0` /
`9FE-0` "superseded". That trade is now reversed.

### What Option A means, concretely

**Target shape (from `8XH-0` / `92M-0` / `9FE-0`):**

- a **search field** over the location's product set;
- a **category tab row** — kit `<Tabs>` (underline) over `Product.category`
  (`All · Beverages & Soda · Shop Goods` on `92M-0`; `All` for the
  flows with no category split, e.g. Issue/Production);
- a **multi-row selectable product list** — each row: product name, a
  **live `Avail: N unit`** readout, and either an inline
  `<QuantityStepper>` (row is in the batch) or a `+ Select` button (row
  not yet added);
- a **selected-row highlight** — accent tint (`--surface-selected`) +
  `--color-accent` 1px border, matching the C2 in-order tile state;
- the sticky submit **sums the whole batch**:
  `Confirm Kitchen Issue (−53.5 kg)` for a 2-line issue;
- one POST per line, **or** a batch endpoint — a Development-Sprint /
  domain call (see "Domain / API implications" below);
- the secondary fields per flow are unchanged from the current build
  (Issue: receiving-chef — see §SM Issue item 4, likely dropped for M2;
  Production: production-time note — likely dropped; Transfer:
  destination `<Select>`; Non-sale: reason `<Select>` + note
  `<Textarea>`).

**No new kit component** — every piece exists (`SearchInput`, `Tabs`,
`QuantityStepper`, the C2 tap-to-add product-tile / order-line row
pattern on the `M2 Sales Patterns` artboard, `CalculatedImpactBanner`,
`FlowScaffold`).

### Sequencing — a Design Sprint must run BEFORE the build (3c/3d)

`8XH-0` / `92M-0` / `9FE-0` predate several kit changes (token
reconciliation, the `QuantityStepper` tap-to-type, the retired
`--surface-panel-tint`, the filter-toolbar era) — they are **not a
clean visual target as-is**. A Design Sprint must:

1. **Re-spin `8XH-0` / `92M-0` / `9FE-0`** to the current kit + tokens —
   one canonical artboard per flow, plus its structural states
   (loading / empty "no products at this location" / error / a row in
   the batch vs. `+ Select` / an over-available-stock row if that blocks
   like §3.8 does for orders — confirm with the owner whether SM/Canteen
   movements block or allow-and-flag when qty > on-hand).
2. **Extract the "selectable product row with inline stepper + Avail"**
   onto a component artboard (it's used by 6 flows → it is a kit-coverage
   item; decide compose-in-screen vs. a small kit row component — flag
   to the orchestrator, don't guess).
3. Write/refresh the flow doc(s): the SM/Canteen movement flows have no
   dedicated flow doc today (they predate the practice) — either add
   `docs/design/flows/staff-stock-movements-flow.md` or fold a section
   into an existing one.
4. Only then do **3c** (SM flows) and **3d** (Canteen flows) rebuild
   the screens from the re-spun artboards.

### Domain / API implications for the build

- **Live availability per row** needs the product's current derived
  balance at the staff member's location — `use-staff-stock` already has
  `useStockLevels`; join it into the picker list. (Already flagged as a
  standalone gap in the per-screen sections — Option A makes it
  mandatory, not optional.)
- **Batch submit:** the current `stockApi.recordIssue` /
  `recordProduction` / `dispatchTransfer` / `recordNonSale` /
  `recordPurchaseReceipt` each take **one** `{ productId, quantity, … }`.
  Multi-line either loops the existing single-line call client-side
  (simplest; N POSTs, partial-failure handling needed) or gets a new
  batch endpoint per movement type (cleaner; a Development-Sprint call).
  **Flag to the owner** which — it affects the audit-trail granularity
  (one `AuditLog` row per line either way, but a batch endpoint can wrap
  them in one logical action).
- **`8XH-0` "Receiving chef" / "Production time & shift" fields** still
  have no domain home (staff module is M3). Recommend dropping both for
  Submission 1; the re-spin should omit them so the artboard doesn't
  promise a field the build can't deliver.

### ADR-44 status

ADR-44's "one-line flow" decision is **superseded for the picker shape**
by this owner call. The `FlowScaffold` chrome (FlowHeader + scrolling
body + sticky submit) that ADR-44 introduced **stays** — only the
`children` (the form body) reverts to the multi-row picker. A short note
should be added to `docs/DECISIONS.md` recording the reversal (an
orchestrator / Tech-Lead task, not this Design Sprint's).

### The per-screen sections below

They were written against the *smaller* Option B shape (per-field
deltas: FlowHeader copy, missing empty/error states, location scoping,
add-availability). **Under Option A every one of those still applies** —
they are the small fixes that ride along on top of the picker rebuild.
Read them as "the details to get right", not "the whole job".

Everything in Task 2 (Admin Financials mobile) is unaffected by this
decision.

---

## Admin Financials — mobile  (Task 2 + Task 3)

**Artboard:** none existed → **created this session**:
`Admin Financials — mobile, populated / empty / loading / error /
payment sheet [M2-A2]` (page "Shell+Component kit", `worldY 25200–26280`).
**Source:** `app/admin/financials/financials-client.tsx` (+ `payment-drawer.tsx`).

`8Q4-0` (Admin Stock mobile) is the collapse-pattern reference; `EPJ-0`
(Customers mobile) is the stacked-row reference.

### Deltas — the screen has **zero** mobile handling today

1. **No responsive branch at all.** `financials-client.tsx` renders one
   layout for every width — there is no `hidden md:flex` / `flex md:hidden`
   split like `stock-client.tsx` has. Add a `< --bp-md` branch that
   renders the mobile artboard; keep the current markup as the
   `md:` branch.
2. **KPI stat strip overflows.** Current: a single horizontal flex of 4
   tiles with `px-(--sp-8)` and `text-display` figures — ~1000px wide,
   unusable at 390px. Mobile artboard: a **dark 2×2 grid**
   (`--nav-bg` background, `--nav-border` hairlines), `--text-micro`
   uppercase label + `--text-body` `--font-mono` figure per cell, semantic
   colour on the figure (success / info / danger / primary). Keep it
   **visually present but unwired** (`—` / "M3" is fine — ADR-36 D-FIN);
   just make it fit.
3. **Transaction tabs overflow.** Current: kit `<Tabs>` (underline) with
   4 tabs + counts — too wide for 390px. Mobile artboard: a
   **horizontally-scrollable chip row** (`height:32px`,
   `border-radius:--radius-lg`, active = `--surface-selected` +
   `--color-accent` text, inactive = `--border-strong` outline +
   `--text-secondary`), `overflow-x:auto`, `flex-shrink:0` per chip.
   Same pattern `8Q4-0` uses for its Store/Restaurant/Canteen tabs — do
   **not** invent a new one.
4. **Transactions table → stacked-row list.** Current: `<SimpleTable>`
   with Date / Vendor·Desc / Destination / Quantity / Match-status
   columns. Mobile card (per `8Q4-0` / `EPJ-0`): **top row** = vendor
   name (`--text-body` `--weight-medium`, left) + amount (`--font-mono`
   `--weight-semibold`, right); **meta row** = `Product qty · Destination
   · Paid-from · date` (`--text-sm --text-secondary`, `·`-joined);
   **status row** = a `• {delivery status}` caption in its semantic
   colour + a right-aligned `Edit` link (`--color-accent`
   `--weight-medium`). One card per txn, `--border-subtle` bottom
   hairline, `--sp-5` padding.
5. **Reconciled-outflows footer.** Current: a full-width dark bar with
   `Cash Payments · Bank/M-Pesa · Total Outflow` inline. Mobile: keep the
   dark (`--nav-bg`) block but **stack** it — `--text-micro` uppercase
   label, then a wrapping row of `Cash KES … · Bank/M-Pesa KES …`
   (`--text-caption`, mono figures), then `Total outflow`
   (`--color-danger`, mono `--text-body`).
6. **Reconciliation section → stacked cards (recon-as-table redesign).**
   Per `financials-reconciliation-flow.md`: one card per open/resolved
   purchase. **Actionable card** ("Received, no payment"): tinted
   `--surface-subtle`, `• Received, no payment` in `--color-info`, and a
   **full-width `Record payment` primary button** inside the card
   (`height:40px`, `--color-accent`) — on mobile the desktop "Action
   column" becomes this button. **Awaiting-delivery card**: amber
   `• Awaiting delivery`, no action. **All-clear**: the single line
   *"Every payment is matched to a delivery, and every delivery has a
   payment. Nothing to reconcile."* (see the `empty` artboard).
7. **States.** `populated` / `empty` (EmptyState "No transactions yet" +
   recon all-clear line) / `loading` (KPI + footer stay; txn list = 3
   `.kit-skeleton` rows; recon = 1 skeleton block) / `error`
   (`ErrorState` "Couldn't load financials" + Retry; recon shows a muted
   "Reconciliation is unavailable…" line). All four drawn `[M2-A2]`.
8. **Payment drawer on mobile = full-screen bottom sheet.** Current:
   `<PaymentDrawer>` is a right-edge rail (`85W-0` / `AYB-0`). On
   `< --bp-md` it must render as a **full-height sheet** (kit `<Drawer>`
   mobile behaviour): grabber, `Record purchase payment` /
   `2-WAY DELIVERY MATCHING` header, the same fields
   (Supplier `<Select>`, Product, Destination, Quantity, Total cost,
   `Paid from` `<SegmentedControl>`), the `--color-info-bg` info banner,
   and a sticky footer `Cancel` / `Disburse & register delivery`. See
   the `payment sheet [M2-A2]` artboard.
9. **Global "Record Payment" action → sticky bottom bar.** The desktop
   `7ZJ-0` has a primary `+ Record Payment` in the toolbar (opens the
   payment drawer with no product pre-selected). Mobile has no toolbar
   room, so it becomes a **sticky bottom action bar** — full-width
   `+ Record Payment` primary button, `--surface-page` bar with a
   `--border-subtle` top hairline, `--sp-4 / --sp-5` padding — matching
   the `8Q4-0` sticky-bar pattern (`Opening Stock` / `+ Record Payment`).
   This is **distinct from** the in-card `Record payment` button in the
   Reconciliation "Received, no payment" row, which stays and is
   pre-scoped to that delivery (desktop has both too). Present on
   populated / empty / loading / error; the payment sheet variant covers
   itself. See all `[M2-A2]` artboards.
10. **Section rhythm — transactions vs. Reconciliation.** Give the
   Reconciliation section a clear break from the transactions block: a
   `margin-top: var(--sp-8)` gap, an `8px` `--surface-subtle` divider
   band on its top edge, and `padding-top: var(--sp-6)` on the section
   header. The reconciled-outflows dark footer also gets
   `margin-top: var(--sp-4)` so it doesn't butt against the last txn
   card. Without this the three zones (txn list / dark footer / recon)
   read as one dense wall on a 390px screen.

---

## Admin Stock — Ledger mobile  (Task 5 row; the built `/admin/stock` mobile)

**Artboard:** `8Q4-0` (`Admin Stock — Mobile`).
**Source:** `app/admin/stock/stock-client.tsx` (the `flex md:hidden` block,
L~195–290) + `app/admin/stock/correction-drawer.tsx`.

**This one is largely OK** — Session 11 already composed it: mobile
stacked rows, `<PillFilter>` (location tabs, `overflow-x-auto`),
`<EmptyState variant="filtered">`, `<ErrorState>`, the correction
`<Drawer>`. Deltas are small:

1. **Loading state is a bare text line.** Current mobile:
   `"Loading…"` in `--text-tertiary`. `8Q4-0` + §9.10 want **3
   `.kit-skeleton` rows**. Swap the text for the skeleton (the desktop
   branch already does `loading={loading && rows.length === 0}` on
   `<DenseLedger>`; give the mobile branch the same 3-row skeleton).
2. **No plain (unfiltered) empty state.** Current mobile: when
   `rows.length === 0` and not filtered, it renders a `--text-tertiary`
   "No stock movements for this day." text line. `8Q4-0` shows a proper
   `<EmptyState>` (icon + title + guidance). Use `<EmptyState title="No
   movements this day" description="Stock activity for {date} will show
   here as it's recorded.">`.
3. **No error-vs-filtered-empty distinction drawn on `8Q4-0`.** The
   screen handles both; `8Q4-0` only draws the populated state. **Add
   two state artboards** off `8Q4-0`: `Admin Stock — Mobile, filtered-empty`
   and `Admin Stock — Mobile, error` (kit `<EmptyState variant="filtered">`
   / `<ErrorState>` at the mobile width). *(Not drawn this session — time-box;
   flagged here so 3b creates them or the owner accepts the built
   behaviour as-is.)*
4. **Movement chips vs. artboard.** Current mobile row renders the
   movement deltas as a `flex-wrap` of tappable mono chips
   (`+50.0 Purchase`, `−18.5 Kitchen Issue`, …) — matches `8Q4-0`'s
   `+50.0 Purch  −18.5 Issue  −10.0 Tr Out` line. **Verify** the
   abbreviations match (`8Q4-0` uses `Purch` / `Tr Out`; the code does
   `COLUMN_LABEL[k].replace(/ \(.\)$/, "")` → `Purchase` / `Transfer
   Out`). Align the code's labels to the artboard's short forms, or
   update `8Q4-0` — pick one, don't leave them divergent.
5. **"Adjust" / "Opening Stock" action.** `8Q4-0` shows a per-row
   **`Adjust`** button; the code renders an `Opening Stock` link to
   `/admin/stock/opening`. Reconcile the label — the artboard's `Adjust`
   implies the correction drawer (which `onCellClick` already opens via
   the chips), so the extra `Opening Stock` link per row is redundant
   noise at this density. **Recommend:** drop the per-row link, keep the
   chips as the correction entry point, and move a single `Opening Stock`
   affordance to the screen header (it's already in the desktop toolbar).
6. **`/admin/financials` ≠ `/admin/stock`.** The owner's "Ledger mobile"
   complaint may actually be about the **Financials** screen (no mobile
   at all — see the section above), not this one. Confirm with the owner
   which screen they meant; this `/admin/stock` mobile is in good shape.

---

## SM — Receive goods

**Artboard:** `8XH-0` (left panel is Issue; Receive has no dedicated
panel — the `receive-flow.tsx` header says artboard superseded).
**Source:** `app/store-manager/flows/receive/receive-flow.tsx` +
`flow-scaffold.tsx`.

Per-field deltas (Option B):

1. **`FlowHeader` — OK.** `FlowScaffold` renders `<FlowHeader
   title="Receive Goods" direction="Supplier → Store"
   directionTone="success" onBack={router.back}>` — matches the kit
   back-nav flow header (`6WD-0`). ✓ No change.
2. **Product control.** Current: a single `<Select>` "Product delivered".
   `8XH-0`-style would be a search + selectable list; under Option B the
   `<Select>` stays. **Verify** it's the kit `<Select>` (searchable
   variant for a long product list — §9.11) not a bare `<select>`. It
   is (`@/components/kit/select`). ✓
3. **Quantity control — OK.** `<QuantityStepper>` (kit, tap-to-type
   value per C10). Matches the artboard's stepped `Issue Qty` field. ✓
4. **Impact preview — OK.** `<CalculatedImpactBanner>` ("Adds N unit …
   to Store stock now.") — the artboard's grey routing hint is the
   `InstructionalBanner`; `CalculatedImpactBanner` (warning-amber) is
   the sharper choice and is what the flow docs specify. ✓
5. **Missing: no empty state for "no products to receive".** If
   `products` is `[]` the `<Select>` just shows "Select a product…"
   with an empty menu. Add an `<EmptyState title="No products set up"
   description="Add ingredients or goods in the Catalog before recording
   a delivery.">` when `!loading && products.length === 0`.
6. **`TODO(mock)` still open.** The file header flags the "match a
   payment the Admin already made" path (`purchasePaymentId` +
   `<MatchCard>`) as unbuilt — GET `/api/stock-movements/outstanding` is
   Admin-only. `8T3-0` (SM hub) **does** show a "Purchase Delivery
   Pending → Match Delivery (+100 kg)" pinned banner, so the match path
   is expected. **Flag for the build session:** either wire a
   staff-scoped "deliveries awaiting receipt" read + the `<MatchCard>`
   list above the manual form, or the owner accepts manual-only receive
   for Submission 1. (This is a domain/API gap, not a design gap.)

---

## SM — Issue to kitchen

**Artboard:** `8XH-0` (left panel — "Issue Ingredients").
**Source:** `app/store-manager/flows/issue-production-flow.tsx`
(`mode="issue"`) + `flow-scaffold.tsx`.

1. **`FlowHeader` — OK.** `title="Issue Ingredients"`, `direction="Store
   → Kitchen"`, `directionTone="danger"` — matches `8XH-0`'s red
   `Store → Kitchen` badge. ✓
2. **Multi-line vs. single-line — the Option A/B decision.** `8XH-0`
   shows **two ingredient rows** (Beef Fillet with a highlighted
   selected state + inline stepper + `Avail: 46.5 kg`; Rice Basmati with
   its own `Issue Qty` field), and a submit that sums both
   (`Confirm Kitchen Issue (−53.5 kg)`). Current build: one `<Select>` +
   one `<QuantityStepper>`, one POST. **If Option A:** rebuild as a
   selectable list. **If Option B:** the single-line form stays; retire
   `8XH-0`'s left panel.
3. **Missing: live availability on the selected product.** `8XH-0` shows
   `Avail: 46.5 kg` on the row. The current form shows **no stock figure
   at all** — the SM can issue a quantity with no idea of what's on hand.
   **Add** (regardless of A/B): once a product is selected, show its
   current derived Store balance under the stepper (the data is one
   `GET /api/stock-movements/balances` call — `use-staff-stock` already
   has `useStockLevels`). Even a `--text-caption` "On hand at Store:
   46.5 kg" line closes the gap.
4. **Receiving chef `<Select>` — present on artboard, absent in build.**
   `8XH-0` has a `RECEIVING CHEF *` field (`Chef Mike (Head Cook)`).
   The current `issue` flow has **no chef field** and the domain
   `recordIssue` takes no chef. **Flag:** either the artboard's chef
   capture is dropped for M2 (staff module is M3 — PRD §4.8), or it's a
   note field. Recommend: drop it for Submission 1, note in the audit.
5. **Missing empty state** — same as Receive item 5.
6. **§9.8 error pattern — OK.** `touched && productId === ""` drives the
   `<Select error helperText>` and `<QuantityStepper error helperText>`.
   Matches the enforced §9.8 contract. ✓

---

## SM — Record production

**Artboard:** `8XH-0` (right panel — "Record Batch Production").
**Source:** `app/store-manager/flows/issue-production-flow.tsx`
(`mode="production"`) + `flow-scaffold.tsx`.

1. **`FlowHeader` — OK.** `title="Record Production"` (artboard says
   *"Record **Batch** Production"* — align the copy), `direction="Kitchen
   → Restaurant"`, `directionTone="success"`. Fix the title to
   **"Record Batch Production"** to match `8XH-0`.
2. **This screen is genuinely single-line — the A/B split does not bite
   here.** `8XH-0` right panel is one `COOKED DISH` `<Select>` + one
   `QUANTITY COOKED / PRODUCED` field + a routing hint + a
   `PRODUCTION TIME & SHIFT` field. The current build matches this shape
   closely. ✓
3. **Missing: `PRODUCTION TIME & SHIFT` field.** `8XH-0` shows
   `Today 11:30 AM · Lunch Prep Batch #2` as a text field. The current
   build has **no** such field; `recordProduction` takes only
   `{ productId, locationId, quantity }`. **Flag:** drop it for
   Submission 1 (it's a free-text label with no domain use) or add an
   optional `note`. Recommend: drop + note.
4. **Routing hint — OK.** `<CalculatedImpactBanner>` "Adds N unit … to
   Restaurant stock now." carries the artboard's *"All batch production
   increments Restaurant stock immediately upon logging"* meaning. ✓
5. **Quantity field shows `+40.0` with a green tint on the artboard.**
   The current `<QuantityStepper>` renders an unsigned magnitude. The
   `+`/green is a presentational cue that production is additive — the
   submit label already does this (`Record Batch Production (+40.0 pcs)`).
   Acceptable; no change needed, but **note** the stepper itself won't
   show the `+`.
6. **Missing empty state** — same as Receive item 5, scoped to
   `kind === "dish"` products.

---

## SM — Transfer to canteen

**Artboard:** `92M-0` (left panel — "Transfer Stock", `Store → Canteen`).
**Source:** `app/store-manager/flows/transfer-nonsale-flow.tsx`
(`mode="transfer"`) + `flow-scaffold.tsx`.

1. **`FlowHeader` — OK.** `title="Transfer Stock"`, `direction="Store →
   {dest}"`, `directionTone="info"` (blue) — matches `92M-0`'s blue
   `Store → Canteen` badge. ✓ (Direction is dynamic on the dest
   `<Select>` — nice, and better than the static artboard.)
2. **Search + category tabs — the biggest visible gap.** `92M-0` shows a
   `Search sodas, goods, stock…` field and an `All · Beverages & Soda ·
   Shop Goods` tab row above the product list. The current build has
   **neither** — just a `<Select>`. Under **Option A** these come back
   (kit `SearchInput` + `Tabs` over `Product.category`). Under
   **Option B** they're retired with the artboard.
3. **Multi-line list + inline steppers + `Available in Store: N`** —
   same Option A/B decision as Issue. `92M-0` shows Soda 300ml selected
   (accent tint + border, inline `− 48.0 +` stepper) and Mineral Water
   with a `+ Select` button, both with `Available in Store: N pcs`.
4. **Missing: live availability** — same as Issue item 3. Add the
   selected product's Store balance under the stepper regardless of A/B.
5. **Dispatch semantics note — OK.** The `<CalculatedImpactBanner>`
   ("Removes N from Store now; lands at {dest} once they accept.") plus
   the toast ("awaiting their accept") correctly encode the two-phase
   transfer. Matches `92M-0`'s grey hint *"Canteen staff will receive an
   alert to accept upon arrival."* ✓
6. **Missing empty state** — same as Receive item 5.

---

## SM — Log wastage / non-sale

**Artboard:** `92M-0` (right panel — "Log Non-Sale", `Staff Meals &
Spoilage`).
**Source:** `app/store-manager/flows/transfer-nonsale-flow.tsx`
(`mode="non-sale"`) + `flow-scaffold.tsx`.

1. **`FlowHeader` — OK.** `title="Log Non-Sale"`, `direction="Staff
   meals & spoilage"`, `directionTone="warning"` (amber) — matches
   `92M-0`'s amber badge. ✓
2. **Search field — present on artboard, absent in build.** `92M-0`
   shows `Search items to log…`. Option A restores it; Option B retires
   it. No category tabs on this panel (unlike Transfer).
3. **Product control + `Avail: 12 pcs`** — `92M-0` shows one selected
   product row (Milk Fresh 500ml, amber tint + border, inline
   `2.0 pcs` field, `Avail: 12 pcs`). Current build: `<Select>` +
   `<QuantityStepper>`, no availability shown. Add availability
   (item 3 pattern from Issue).
4. **Reason `<Select>` — OK.** Current options: `staff_meal ·
   complimentary · spoiled · damaged · other`. `92M-0` shows
   `Staff Meal / Tea Preparation` selected under a `CONSUMPTION REASON *`
   label. **Align copy:** artboard says "Staff Meal / Tea Preparation";
   code says "Staff meal / tea". Pick one wording.
5. **Note `<Textarea>` — OK.** `OPTIONAL NOTES` on the artboard; code
   makes it required iff `reason === "other"` ("Note (required)" /
   "Note (optional)" label swap + §9.8 error). Better than the artboard.
   ✓
6. **Missing empty state** — same as Receive item 5.

---

## Canteen — Stock levels (canteen items only)

**Artboard:** `9GW-0` (`Canteen — Stock Levels`).
**Source:** `app/canteen/stock/page.tsx` →
`app/store-manager/stock/stock-levels-view.tsx`
(`locationType="canteen"`).

1. **Shared view — OK structurally.** `StockLevelsView` renders the
   `Stock Levels` display title + `{location} · as of now` sub, a
   `<DenseSummaryStrip>` (Lines / Total units), a `<PillFilter>`
   (All · Ingredients · Goods · Dishes), a stacked card list (name +
   unit / mono qty), and `<EmptyState>` / `<EmptyState variant="filtered">`
   / `<ErrorState>` / `<Spinner>`. This is close to `9GW-0`. ✓
2. **Location scoping — VERIFY (domain check for the build session).**
   `9GW-0` must show **canteen products only**; `986-0` (SM) must show
   **restaurant/store products only**. `StockLevelsView` resolves
   `locationId` via `stockApi.listLocations().find(l => l.type ===
   locationType)` then `useStockLevels(locationId)` →
   `GET /api/stock-movements/balances`. **Confirm** that endpoint
   filters balances to the passed `locationId` (i.e. a Canteen attendant
   never sees Store rows). If `balances` returns all locations and the
   client doesn't post-filter, that's a **scoping bug** — the checklist
   item is: *"assert `/api/stock-movements/balances?locationId=` is
   honoured server-side; add a client-side `.filter(r => r.locationId
   === locationId)` guard if not."*
3. **`9GW-0` header is a plain title; artboard has no `FlowHeader`** —
   correct, this is a bottom-nav destination not a flow. The staff shell
   supplies the hamburger header. ✓ But **verify** the shell header
   shows `Canteen / Canteen Attendant` (artboard) not `Store`.
4. **`PillFilter` "Dishes" pill on the Canteen view.** A Canteen holds
   sodas / goods / snacks — `dish` is a Restaurant kind. The `Dishes`
   pill will always be empty for the Canteen. **Recommend:** pass the
   pill set in as a prop so the Canteen gets `All · Beverages · Goods`
   and the SM gets `All · Ingredients · Goods · Dishes`. Low effort,
   removes a dead filter.
5. **`as of now` vs `as of today`.** Code renders `{locationLabel} · as
   of now`; `9GW-0` reads `Canteen · as of today`. Align copy.
6. **No loading/empty/error artboards for `9GW-0`.** The view handles
   all three; `9GW-0` draws only populated. **Add** `Canteen Stock
   Levels — empty` and `— error` state artboards off `9GW-0` (kit
   `<EmptyState>` / `<ErrorState>`, mobile width). *(Not drawn this
   session — time-boxed; flagged for 3d or owner sign-off.)*

---

## SM — Stock levels (restaurant items only)

**Artboard:** `986-0` (`Store Manager — Stock Levels`).
**Source:** `app/store-manager/stock/stock-levels-view.tsx`
(`locationType="store"`).

Same shared component as the Canteen view — items 1, 2, 4, 5, 6 above
apply identically (with `store` scoping and the
`All · Ingredients · Goods · Dishes` pill set, which is correct here).

1. **`986-0` shows `kg · last movement 2h ago` as the meta line** —
   product unit **plus a relative "last movement" timestamp**. The
   current build's meta line is **just the unit** (`r.unitLabel`).
   **Add** the "last movement {relative}" clause — `balances` would need
   to return a `lastMovementAt` per row (domain/API note), or drop the
   timestamp from `986-0`. Recommend: add it to the balances payload;
   it's genuinely useful for the SM.
2. **Header** — `986-0` shows `Store / Store Manager` in the shell
   header + a `Stock Levels` display title + `Store · as of today`.
   Verify the shell header role label; align `as of now` → `as of today`.
3. **Bottom nav** — `986-0` shows `Hub · Stock · History` with `Stock`
   active. The staff shell supplies this; **verify** `Stock` gets the
   active state on `/store-manager/stock`.

---

## Canteen — Transfer dispatch

**Artboard:** `9FE-0` (`Canteen — Transfer Dispatch`, `Canteen → Store`).
**Source:** `app/canteen/transfer/transfer-dispatch-flow.tsx` +
`flow-scaffold.tsx`.

1. **`FlowHeader` — OK.** `title="Transfer Stock"`, `direction="Canteen
   → {dest}"`, `directionTone="info"` — matches `9FE-0`'s blue
   `Canteen → Store` badge. Artboard title is "Transfer Stock" ✓.
2. **Search + category tabs — present on `9FE-0`, absent in build.**
   `9FE-0` shows `Search sodas, goods, stock…` + `All · Beverages &
   Soda · Shop Goods`. Same Option A/B decision.
3. **Multi-line list + inline stepper + `Available in Canteen: N`** —
   `9FE-0` shows Mineral Water 500ml selected (accent tint + border,
   inline `− 24.0 +`) and Soda 300ml with `+ Select`, both with
   `Available in Canteen: N pcs`. Current build: `<Select>` + one
   `<QuantityStepper>`, no availability. Same A/B + add-availability
   note.
4. **Dispatch semantics — OK.** `<CalculatedImpactBanner>` ("Removes N
   from Canteen now; lands at {dest} once they accept.") + toast matches
   `9FE-0`'s grey hint *"Returns excess Canteen stock to Store. Store
   Manager will receive an alert to accept upon arrival."* ✓
5. **Missing empty/error states** — same as Receive item 5; `9FE-0`
   draws only the populated state.

---

## SM — Mobile Hub (quick check only)

**Artboard:** `8T3-0` (`Store Manager Mobile Hub`).
**Source:** `app/store-manager/hub-client.tsx`.

Owner said "close enough" — quick verify only. Structure matches:
pinned incoming-transfer + purchase-delivery banners with
`Accept / Flag Variance` and `Match / Flag Variance` actions, a
`Quick Store Operations` 2×2 action-tile grid
(`Receive Goods · Issue to Kitchen · Record Production · Transfer to
Canteen`), and a `Today's Movement Log` list. Minor deltas:

1. **Action-tile grid — verify the kit `action-tile grid`** (`6WD-0`)
   is used, not hand-rolled `<div>` cards. `8T3-0` tiles have a title +
   an icon + a status sub-line (`1 Delivery Pending`, `Cooked batches`).
2. **`8T3-0` sub-lines carry status** (`1 Delivery Pending` in accent,
   `Raw ingredients` muted, `Cooked batches` in success green). Verify
   the built tiles show these — a live "N delivery pending" count on
   Receive Goods is load-bearing (it's the SM's cue to go match).
3. **`Open` day-status pill** in the header (`8T3-0` shows a green
   `• Open`). M2 has no Day Close, so this is a permanent-`Open`
   placeholder (same pattern as C1's day pill). Verify it renders.
4. Everything else structurally matches — no rebuild needed.

---

## Also reviewed — `flow-scaffold.tsx` (structure / layout / spacing)

**Source:** `app/store-manager/flows/flow-scaffold.tsx`.

- `<FlowHeader>` + scrolling body (`gap-(--sp-5) p-(--sp-6)`) + a
  `sticky bottom-0` submit bar (`px-(--sp-6) py-(--sp-4)`, `--surface-page`,
  `--border-subtle` top hairline, full-width `<Button size="lg">`).
- **This is correct and matches the kit's staff-flow chrome** (the
  `Confirm …` / `Dispatch …` / `Log …` sticky primary on every SM/Canteen
  artboard). ✓ No change.
- **One note:** the header comment says *"artboards 8XH-0 / 92M-0 / 9FE-0
  superseded"* — this scaffold is the ADR-44 replacement chrome. If
  **Option A** is chosen, the scaffold stays; only the `children`
  (the form body) changes to the multi-line picker. If **Option B**,
  formally rename those three artboards `— SUPERSEDED by ADR-44
  flow-scaffold`.
