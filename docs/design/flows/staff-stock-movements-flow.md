# Flow — Staff Stock Movements (Store Manager + Canteen)

**Status:** Design Sprint 3-DESIGN (2026-08-31). Design intent for the six
Store-Manager / Canteen **stock-movement flows** — Receive, Issue,
Production, Transfer, Non-sale, Canteen Transfer Dispatch. Composed from
the proven kit (`FlowScaffold` chrome + `SearchInput` + `Tabs` +
`SelectableProductRow` + `CalculatedImpactBanner` + `Select` / `Textarea`
+ `Toast`). One new kit component: **`SelectableProductRow`** (drawn this
sprint, proven by 3-KIT before any screen uses it — ADR-42). Backend:
batch endpoint per movement type (3-DOMAIN). Screens: 3c (SM) / 3d
(Canteen).

This flow doc did not exist during M1 — these screens predate the
flow-doc practice. It is written now as part of the Option-A re-spin (see
below).

> **Owner decision 2026-08-31 — Option A (honour the drawings).** The M1
> Session-12 rebuild (ADR-44) traded the multi-row product picker in the
> Paper drawings (`8XH-0` / `92M-0` / `9FE-0`) for a one-line `Select` +
> one `QuantityStepper` form and marked those artboards superseded. The
> owner has reversed that for the **body** of these six flows: the
> multi-row picker comes back. ADR-44's `FlowScaffold` chrome
> (`FlowHeader` + scrolling body + sticky submit) **stays** — only the
> form body reverts. See `docs/design/fidelity-audit-m1.md` §"RESOLVED —
> Option A" and the ADR-44 reversal note (FINAL session).

**Scope:** the movements that change a *stock* ledger at the Store or the
Canteen. Not in scope: Restaurant sales (`restaurant-sales-flow.md`),
Canteen derived sales (`canteen-derived-sales-flow.md`), Admin stock
corrections (Admin Ledger), Day Close (M3). "Receiving chef" and
"Production time & shift" fields from the old `8XH-0` drawing are
**dropped for Submission 1** (staff module is M3) — the re-spun artboards
omit them.

---

## Who and why

**Actors:**

- the **Store Manager**, on their phone in the Store / kitchen area,
  moving raw stock and cooked dishes around: booking in a supplier
  delivery, issuing ingredients to the kitchen, logging a cooked batch,
  sending sodas/goods to the Canteen, writing off staff meals and
  spoilage.
- the **Canteen Attendant**, on their phone at the Canteen, sending
  excess Canteen stock back to the Store.

**Job to be done:**
*"I moved several things at once. Let me pick them all off one list, say
how much of each, see the running total of what that does to my stock,
and record it in one go — and don't let me record a number my shelf
can't back."*

**What staff must never see** (PRD §4.8, plan §3.6): buying price, unit
cost, margin. Every figure on these screens is a **quantity** (with unit)
or a stock balance — never money, except the Receive "match a delivery"
card, which shows the Admin-entered purchase total for identification
only.

---

## The screens

| ID | Screen | Role / shell | Direction badge |
|---|---|---|---|
| **Receive** | Receive Goods | SM, staff mobile shell, `FlowHeader` | Supplier → Store (`--color-success`) |
| **Issue** | Issue Ingredients | SM | Store → Kitchen (`--color-danger`) |
| **Production** | Record Batch Production | SM | Kitchen → Restaurant (`--color-success`) |
| **Transfer** | Transfer Stock | SM | Store → {destination} (`--color-info`) |
| **Non-sale** | Log Non-Sale | SM | Staff meals & spoilage (`--color-warning`) |
| **Canteen Dispatch** | Transfer Stock | Canteen Attendant | Canteen → {destination} (`--color-info`) |

All six sit inside the **`FlowScaffold`** chrome: back-chevron
`FlowHeader` (title + direction badge, 48px, `--border-subtle` bottom
hairline) → a scrolling body (`gap-(--sp-5) p-(--sp-6)`) → a
`position: sticky; bottom: 0` submit bar (`px-(--sp-6) py-(--sp-4)`,
`--surface-page`, `--border-subtle` top hairline, a full-width
`<Button size="lg">`).

Artboards: `SM {Flow} — {state} [M2-3D]` and
`Canteen Dispatch — {state} [M2-3D]` (Paper file "Prosper Hotel", page
"Shell+Component kit"). The old `8XH-0` / `92M-0` / `9FE-0` are the
historical reference only.

---

## Body composition (the Option-A picker)

Top to bottom, inside the scrolling body:

1. **Receive only** — a **"Deliveries awaiting receipt"** list above the
   search: one `MatchCard` per purchase the Admin has already paid for
   but that hasn't been booked in, showing supplier, the purchase total
   (identification only), the product + quantity, and **Match this
   delivery** / **Flag variance** actions. Tapping *Match* pre-fills the
   manual form below with that delivery's product + quantity. *(Domain
   gap — see Escalations. If the staff-scoped read isn't built for
   Submission 1, this section is hidden and Receive is manual-only.)*

2. **`SearchInput`** over the location's product set — placeholder scoped
   per flow ("Search ingredients at Store…", "Search dishes…", "Search
   sodas, goods, stock…", "Search items to log…").

3. **Category `Tabs`** (kit underline tabs, roving-tabindex per §9) over
   `Product.category` — **Transfer, Non-sale?, Canteen Dispatch only**.
   `92M-0` / `9FE-0` show `All · Beverages & Soda · Shop Goods`. Issue /
   Production / Receive have no category split (one `All` context) so no
   tab row is drawn. *(Non-sale: `92M-0` shows a search field but no
   category tabs — Non-sale gets search only.)*

4. **A vertical list of `SelectableProductRow`** — the component drawn on
   `Component Kit — Selectable Product Row [M2-3D]`. Each row:
   - **product name** (left, truncates with ellipsis when long — real
     product names are short; tap opens the full name);
   - a **live `Avail: N unit`** readout (fixed 88px slot,
     `--font-mono` `--text-caption` `--text-secondary`, right-aligned) —
     the product's current derived balance **at this staff member's
     location**, from `useStockLevels`. Copy varies by flow: `Avail: N`
     for the "how much can I move" flows; `On hand: N` for Receive
     (where you're adding, not spending); `N in Rest.` for Production
     (the dish's current Restaurant stock).
   - a **trailing control** (fixed 108px slot): a **`+ Select`** button
     (kit `<Button size="sm">` outline) when the row is not in the
     batch, or an inline **`− [n] +` `QuantityStepper`** when it is. The
     stepper shows the **magnitude only** — the unit lives in the Avail
     readout and the sticky-submit label, so the stepper stays narrow
     enough for the 390 px row.
   - **selected** rows get `--surface-selected` fill + a
     `--color-accent` 1 px border (matches the C2 in-order tile state,
     §9.4).
   - **over-available (BLOCKED)** — §9.8: `--color-danger` row
     treatment (`--color-danger` border + `--color-danger-bg` fill),
     the stepper border goes `--color-danger`, the typed value goes
     `--color-danger`, and an inline helper renders under the row:
     *"Only N unit on hand — reduce or remove this line."* A blocked
     row **disables the sticky submit** (see §Block rule).
   - **zero-available** — row muted (`opacity: 0.5`), `+ Select` inert,
     readout reads `None on hand`.

   Fixed-width slots for the readout and the trailing control so the
   columns line up down the list (Paper guide: don't rely on `gap`
   alone).

5. **Per-flow secondary fields**, below the list:
   - **Transfer / Canteen Dispatch** — a **Destination `<Select>`**
     ("Canteen" / "Store"). The `FlowHeader` direction badge tracks it.
   - **Non-sale** — a **Consumption reason `<Select>`** (`staff_meal ·
     complimentary · spoiled · damaged · other`) + a **Note
     `<Textarea>`**. The note label + validation swap to **"Note
     (required)"** with the §9.8 error pattern iff `reason === "other"`;
     otherwise **"Note (optional)"**.
   - **Receive / Issue / Production** — none (the old chef / shift
     fields are dropped).

6. **`CalculatedImpactBanner`** (warning-amber) — **sums the whole
   batch**: *"Removes 53.5 kg across 2 ingredients from Store stock now,
   and adds it to Kitchen."* / *"Adds 90 kg across 2 products to Store
   stock now."* / *"Removes 72 pcs from Store now; lands at Canteen once
   they accept."* / *"Removes 5 units from Store as staff meals /
   spoilage. This is not a sale."* Read-only; it is a preview, never
   editable. When a row is blocked the banner switches to a
   `--color-danger` tint and reads *"1 line is over available stock. Fix
   it to continue."*

7. **Sticky submit** — a `<Button size="lg">` whose label carries the
   **batch total**: `Confirm Kitchen Issue (−53.5 kg)`,
   `Confirm Receipt (+90 kg)`, `Log Batch Production (+64 pcs)`,
   `Dispatch Transfer to Canteen (−72 pcs)`, `Log Non-Sale (−5 units)`,
   `Dispatch Transfer to Store (−36 pcs)`. The signed total sums every
   selected row; the button fires **once** for the whole batch (batch
   endpoint — 3-DOMAIN). When the batch is empty, blocked, or the screen
   is loading / erroring, the button drops the total from its label and
   is disabled.

---

## Cross-cutting rules these screens encode

1. **Multi-row pick, one submit.** The staff member builds a batch by
   tapping `+ Select` on as many rows as they need and setting each
   quantity, then submits once. The batch endpoint writes it in **one
   atomic transaction**, one `AuditLog` row per line wrapped in one
   logical action (ADR-25). No client-side partial-failure handling.

2. **Live availability on every selected row.** The `Avail: N` readout is
   the product's current derived balance at the staff member's location
   (`useStockLevels` / `GET /api/stock-movements/balances?locationId=`).
   The old one-line forms showed **no** stock figure — the SM could
   issue a quantity blind. That gap is closed here for every flow.

3. **The block rule (§9.8 parity with Restaurant orders §3.8).** A line
   whose quantity **exceeds the on-hand balance** is rejected — the row
   goes to the BLOCKED state, the sticky submit is disabled, and
   **nothing is written**. The stock ledger must never go negative. This
   applies to Issue, Transfer, Non-sale and Canteen Dispatch (all
   *spend* stock at the source location). **Receive** and **Production**
   *add* stock, so an over-on-hand block cannot occur — their
   "blocked" artboard instead shows the **zero / blank-quantity**
   validation block (*"Enter a quantity greater than 0, or remove this
   line."*), same §9.8 treatment, same disabled submit.

4. **Two-phase transfer.** Transfer and Canteen Dispatch **remove** stock
   from the source location immediately on submit, but the stock only
   **lands** at the destination once staff there accept it (the incoming
   banner on the destination hub — `8T3-0` / `9BA-0`). The impact
   banner and the success toast both say so ("lands at {dest} once they
   accept").

5. **Production increments Restaurant stock immediately.** A cooked batch
   is available to the Restaurant the moment it's logged — no accept
   step. The direction badge is `Kitchen → Restaurant`.

6. **Corrections are new rows (ADR-15 / CONVENTIONS §4).** None of these
   screens edit a past movement. A wrong movement dated to an open day
   is fixed by the staff member's own same-day edit path (not designed
   here — it reuses the History screen); a closed-day movement is an
   Admin correction on the Ledger (M3 for the staff-initiated path).

7. **Role scoping.** SM flows read/write Store + Kitchen + Restaurant
   balances; Canteen Dispatch reads/writes Canteen balances. A Canteen
   Attendant never sees Store rows and vice-versa — assert
   `balances?locationId=` is honoured server-side (see Escalations).

---

## Structural states (drawn per flow, mobile 390 px)

| State | What it shows |
|---|---|
| **populated** | ≥ 1 row selected; impact banner sums the batch; submit enabled with the total. |
| **empty** | The location has no products for this flow — `EmptyState` (icon + title + one-line guidance, e.g. *"No ingredients at Store"* / *"No dishes set up"* / *"Nothing to transfer"*). Search + list hidden; submit disabled, label without total. |
| **loading** | §9.10 — search + section label render; the row list is **3 `.kit-skeleton` rows**; impact banner hidden; submit disabled. |
| **error** | `ErrorState` (`--color-danger` icon + *"Couldn't load {Store/Canteen} stock"* / *"Couldn't load dishes"* + **Retry**). Body content + submit hidden. |
| **over-stock blocked** | One row in the §9.8 BLOCKED state; impact banner in its danger variant; sticky submit disabled. (Receive / Production: the blank-quantity variant.) |

Artboard names: `SM Receive — populated / empty / loading / error /
validation blocked [M2-3D]`; `SM Issue — … / over-stock blocked`;
`SM Production — … / validation blocked`; `SM Transfer — … / over-stock
blocked`; `SM Non-sale — … / over-stock blocked`; `Canteen Dispatch — …
/ over-stock blocked`.

---

## Walkthroughs

### A — a two-line kitchen issue (Issue, populated)

1. SM opens the Store hub (`8T3-0`) → **Issue to Kitchen** →
   `FlowHeader`: back + "Issue Ingredients" + red `Store → Kitchen`.
2. Types "beef" in the search → the list filters. Taps **`+ Select`** on
   **Beef Fillet** — the row flips to selected (accent tint + border),
   an inline stepper appears defaulted to the step. SM sets **18.5**.
   `Avail: 46.5 kg` stays on the row.
3. Clears the search, taps **`+ Select`** on **Rice Basmati**, sets
   **35.0**.
4. The `CalculatedImpactBanner` reads *"Removes 53.5 kg across 2
   ingredients from Store stock now, and adds it to Kitchen."*
5. Sticky submit reads **Confirm Kitchen Issue (−53.5 kg)**. Tap → one
   batch POST → `Toast` (bottom-center) *"Issued · 2 ingredients ·
   53.5 kg to Kitchen"* → back to the hub, the movement log shows both
   lines.

### B — booking in a delivery the Admin already paid for (Receive)

1. SM opens **Receive Goods** (green `Supplier → Store`). Above the
   search: **Deliveries awaiting receipt** — a `MatchCard` for *Mwangi
   Supplies · KES 18,400 · Beef Fillet 40 kg · paid by Admin · Fri 29
   Aug*.
2. Taps **Match this delivery** → the manual form below is pre-filled
   with Beef Fillet at 40 kg (selected row). SM adds a second line
   (Rice Basmati 50 kg) that arrived on the same truck but wasn't on
   the paid purchase.
3. Impact banner: *"Adds 90 kg across 2 products to Store stock now."*
   Submit: **Confirm Receipt (+90 kg)**. On submit the matched line
   links to the purchase (`purchasePaymentId`); the unmatched line is a
   plain receipt. `Toast` *"Received · 2 products · +90 kg"*.

### C — a batch of cooked dishes (Production)

1. SM opens **Record Batch Production** (green `Kitchen → Restaurant`).
   No category tabs; the list is dishes only.
2. Selects **Grilled Chicken** (40) and **Beef Stew** (24). Each row
   shows `N in Rest.` (the dish's current Restaurant stock).
3. Impact banner: *"Adds 64 portions across 2 dishes to Restaurant stock
   now."* Submit: **Log Batch Production (+64 pcs)**. No accept step —
   the dishes are on the Restaurant immediately.

### D — sending sodas to the Canteen (Transfer)

1. SM opens **Transfer Stock** → blue `Store → Canteen`.
2. Category `Tabs`: `All · Beverages & Soda · Shop Goods`. On **Beverages
   & Soda** the SM selects **Soda 300ml** (48) and **Mineral Water
   500ml** (24). A **Destination `<Select>`** below the list reads
   **Canteen** (the badge tracks it).
3. Impact banner: *"Removes 72 pcs from Store now; lands at Canteen once
   they accept."* Submit: **Dispatch Transfer to Canteen (−72 pcs)** →
   `Toast` *"Dispatched · awaiting Canteen accept"*. Store stock drops
   now; the Canteen hub gets an incoming-transfer banner.

### E — writing off staff meals (Non-sale)

1. SM opens **Log Non-Sale** → amber `Staff meals & spoilage`. Search
   only, no category tabs.
2. Selects **Milk Fresh 500ml** (2) and **Bread 400g** (3). Below the
   list: **Consumption reason** = *Staff meal / tea preparation*; **Note
   (optional)** = "Morning staff breakfast preparation."
3. Impact banner: *"Removes 5 units from Store as staff meals /
   spoilage. This is not a sale."* Submit: **Log Non-Sale (−5 units)**.
   (Reason *other* → the note becomes required, §9.8 on the textarea.)

### F — the over-stock block (any spend flow)

1. In Issue, the SM sets **Rice Basmati** to **35.0** but only **30 kg**
   is on hand. The row goes to the §9.8 BLOCKED state — danger border +
   fill, the helper *"Only 30 kg on hand — reduce or remove this
   line."* under it.
2. The impact banner switches to its danger tint: *"1 line is over
   available stock. Fix it to continue."* The sticky submit is
   **disabled** and drops the total from its label.
3. The SM lowers the quantity to 30 (or below) → the row returns to
   normal, the banner re-sums, the submit re-enables. Nothing was
   written while blocked.

### G — the Canteen sends stock back (Canteen Dispatch)

1. The Canteen Attendant opens **Transfer Stock** from the Canteen hub
   (`9BA-0`) → blue `Canteen → Store`.
2. Same body as Transfer: category tabs, `SelectableProductRow` list
   with `Avail: N` from the **Canteen** balance, a **Destination
   `<Select>`** = **Store**.
3. Selects Mineral Water 500ml (24) and Soda 300ml (12). Impact banner:
   *"Removes 36 pcs from Canteen now; lands at Store once they
   accept."* Submit: **Dispatch Transfer to Store (−36 pcs)**. Canteen
   stock drops now; the Store hub gets the incoming banner.

---

## Stock Levels (bottom-nav destinations, not flows)

`986-0` (SM) and `9GW-0` (Canteen) are **not** part of this flow — they
have no `FlowHeader`, no submit. They are read-only balance lists. This
sprint only fills the **missing state artboards** and pins two build
decisions:

- **`Canteen Stock Levels — empty [M2-3D]`** — `EmptyState` *"No stock at
  the Canteen yet"* + guidance (search stays, table hidden).
- **`Canteen Stock Levels — error [M2-3D]`** — `ErrorState` *"Couldn't
  load stock levels"* + Retry.
- **Pill set is a prop.** `StockLevelsView` passes its filter pill set in
  as a prop: SM gets `All · Ingredients · Goods · Dishes`; the Canteen
  gets `All · Beverages · Goods` — **no dead "Dishes" pill** for the
  Canteen (a Canteen holds sodas / goods / snacks). `9GW-0` currently
  draws no pill row at all; 3d adds it from the prop.
- **`as of today`** (not `as of now`) and the **`kg · last movement Nh
  ago`** meta line are already on `986-0` / `9GW-0` — the build should
  match them (`lastMovementAt` per row from the balances payload — see
  Escalations).

---

## Data notes for 3-DOMAIN / 3c / 3d

- **Batch endpoint per movement type** —
  `POST /api/stock-movements/{receive|issue|production|transfer|non-sale}`
  (or a single `…/batch` with a `type` discriminator — 3-DOMAIN picks),
  body `{ lines: [{ productId, quantity, … }], … }` plus the per-flow
  secondary fields (`destinationLocationId` for transfer/dispatch,
  `reason` + `note` for non-sale, `purchasePaymentId?` per matched line
  for receive). One atomic transaction. **If any line exceeds on-hand at
  the source → reject the whole batch** (`400 VALIDATION_ERROR`,
  `field` naming the offending line), nothing written. One `AuditLog`
  row per line, wrapped in one logical action.
- **Per-row availability** — `use-staff-stock` `useStockLevels` already
  exists; the picker list joins it in. Confirm it returns a balance per
  `{ productId, locationId }` scoped to the staff member's location.
- **`SelectableProductRow` interaction contract** (for 3-KIT):
  `+ Select` → selected (row enters the batch, stepper defaults to
  `step`); stepper decremented past `0` → deselect; `quantity >
  available` → BLOCKED state + a callback the parent uses to disable its
  sticky submit; `available === 0` → inert. Focus / hover / disabled /
  the error row all per §9 (authored once as `.kit-*`, not per
  component). Props (provisional): `productName`, `available`,
  `unitLabel`, `availLabelPrefix` ("Avail:" / "On hand:" / suffix "in
  Rest."), `selected`, `quantity`, `step`, `min`, `max`
  (= `available` for spend flows, unbounded for Receive/Production),
  `blocked`, `onSelect`, `onDeselect`, `onQuantityChange`.
- **Composed from:** staff shell + `FlowHeader`, `SearchInput`, `Tabs`
  (category, transfer/dispatch/non-sale), `SelectableProductRow` (new,
  3-KIT), `CalculatedImpactBanner` (batch sum), `Select` (destination /
  reason), `Textarea` (non-sale note), `MatchCard` (Receive), `Button`
  size lg (sticky submit), `EmptyState` / `ErrorState`, `Toast`. **No
  kit change beyond `SelectableProductRow`.**

---

## New components

**One — `SelectableProductRow`.** Every other piece exists in the proven
kit. Drawn this sprint on `Component Kit — Selectable Product Row
[M2-3D]` with five states (not selected / selected / at available / over
available BLOCKED / zero available); 3-KIT builds and proves it (ADR-42
gate — story per state, visual-regression baseline, axe, §9 `postVisit`)
before 3c / 3d compose it.

---

## Escalations (for the orchestrator)

1. **Receive "match a delivery" needs a staff-scoped read.**
   `GET /api/stock-movements/outstanding` is Admin-only today. The
   re-spun `SM Receive` artboards draw a staff-scoped "Deliveries
   awaiting receipt" `MatchCard` list above the manual form as the
   target. Either 3-DOMAIN adds a `canteen_attendant` / `store_manager`
   -scoped read, or the owner rules **manual-only receive for Submission
   1** (in which case 3c hides that section).
2. **`986-0` `lastMovementAt`.** The Stock Levels meta line shows
   `kg · last movement 2h ago`. The balances payload needs a
   `lastMovementAt` per row. Recommend adding it (genuinely useful for
   the SM); the alternative is dropping the timestamp from `986-0` /
   `9GW-0`.
3. **`balances?locationId=` server-side scoping.** Confirm the endpoint
   filters to the passed `locationId` so a Canteen Attendant never sees
   Store rows (and vice-versa). If not, 3c/3d add a client-side
   `.filter(r => r.locationId === locationId)` guard.
4. **No new kit component beyond `SelectableProductRow`.** Confirmed —
   the category tab row is the existing `Tabs`, the destination/reason
   pickers are the existing `Select`, the note is the existing
   `Textarea`, the delivery card is the existing `MatchCard`.
5. **Receive / Production have no over-on-hand block.** Their "blocked"
   artboard is the blank/zero-quantity validation block instead. Flagged
   here so 3c/3d and QA don't expect an over-stock path on those two.

---

## Confirmations

- No code, no kit change, no M3 work this sprint. Customers / Catalog
  untouched.
- `FlowScaffold` chrome (ADR-44) kept; only the body reverts to the
  multi-row picker.
- Dropped for Submission 1: "Receiving chef" (`8XH-0`), "Production time
  & shift" (`8XH-0`) — omitted from the re-spun artboards.
