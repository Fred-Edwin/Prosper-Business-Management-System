# Session 15 Handoff — Product Designer: **M1 design-change pass (A1/A2, A4, C1, B3) + Financials Purchases↔Deliveries reconciliation redesign + A5 (Archive) design + ADRs**

**Status:** DONE (2026-08-29). ADR-46 + ADR-47 written; the Financials
reconciliation redesign (default + 4 structural states), the Payment
Drawer searchable picker, the Product Drawer (rail + kind hint + delete
section), and the Catalog Archived tab are drawn in Paper. B3 written into
`design-principles.md §4.6`. `PROGRESS.md` Session 15 entry carries every
decision + the Session 16 build list. `session-16-handoff.md` drafted.
Assets Register Archived tab, Asset Drawer delete section, the `6CG-0`
searchable-`Select` kit rows, and the `6OE-0` archived-guard caption are
**spec'd in ADR-46 §7 / ADR-47 §5 for Session 16** rather than drawn
(direct repeats of the patterns proven on the S15 Catalog / Product
artboards). The searchable `Select` variant is **flagged for a kit Design
Sprint**.
**Role:** Product Designer, Prosper project. **Design Sprint** (`sdlc.md`
Phase A / `export-workflow.md` Phase A). This session works **in Paper**
against the approved component library + `docs/design/design-principles.md`,
plus writes ADRs and short specs. It makes **design decisions**; it does
**not** write real logic (that's Session 16). Assemble from the **proven
kit** — do not invent new components; if a screen genuinely needs
something with no kit equivalent, that's a new kit component with its own
artboard + states, and you flag it.

**Origin:** the owner's manual M1 walkthrough
(`docs/sprints/m1-manual-verification-observations.md`) plus a
follow-up: **the Financials reconciliation UI for purchases and receipts
"does not really make sense — it's confusing"** and needs a proper
redesign. Triage split the follow-up work into four sessions:

| Session | Role | Scope |
|---|---|---|
| 14 | Developer | D1 blocker + B1/B4/C2 copy + A3 (Catalog drawer → rail). |
| **15 — this one** | Product Designer (Design Sprint) | **A1/A2, A4, C1, B3 designed; the Financials reconciliation redesign; A5 (Archive) designed + ADR + spec.** Paper + ADRs only. |
| 16 | Developer (Development Sprint) | Build 15's design changes **and A5**. |
| 17 | QA Engineer | Adversarial M1 pass + Playwright e2e harness; picks up B2, B5. |

---

## Required reading (before any Paper work)

1. **`CLAUDE.md`** — role model (a Design Sprint makes design decisions,
   writes no real logic), **post a visible checklist**, "assemble from
   existing components".
2. **`docs/design/export-workflow.md`** — Phase A (design in Paper
   against the kit; extract-as-you-go; structurally-different states get
   their own artboards; exit criteria = no component has two divergent
   versions).
3. **`docs/design/design-principles.md`** — the product-wide UI/UX rules;
   **§9 is an ENFORCED contract**. Any new state you draw must fit it.
4. **`docs/design/component-states.md`** — §2 the component state matrix,
   §9 implementation status. What each kit component already covers.
5. **`docs/design/kit-audit.md`** — what each kit component does now
   (before→after), so you compose from reality, not the old artboards.
6. **`docs/sprints/m1-manual-verification-observations.md`** — the full
   owner log. This session owns the **design-decision** items: **A1**
   (cramped Edit/Delete columns), **A2** (Delete → a section inside the
   Edit drawer), **A4** (Ingredient/Dish/Goods explainer UI), **C1**
   (searchable/scoped product Select in the payment drawer), **B3**
   (ledger digit typography — decide the deliberate answer), and it adds
   **A5** (Archive model) as a design + ADR. Read the rest so you know
   what Sessions 14 / 16 / 17 own.
7. **`docs/DECISIONS.md`** — especially:
   - **ADR-14 / ADR-15 / ADR-39** — the stock ledger. **ADR-39 §4** is
     load-bearing for the reconciliation redesign: `purchase_payment` is
     a `StockMovement` row with **`quantity = 0`**, and
     supplier / ordered-qty / cost / `paidFromAccount` are **stuffed into
     a free-text `note` string** (`"Ordered <qty> from <supplier>; cost
     <cost> from <account>"`) — there is **no `PurchasePayment` entity**.
     The `MoneyMovement` debit is deferred to M3 (F-Financials-proper).
   - **ADR-36 D-FIN** / `milestone-1-plan.md §2` "Financials M1 cut" —
     M1's `/admin/financials` is **stock-purchase table + reconciliation
     Match cards only**; the 4-tile KPI stat strip has no F2 data source
     and renders `—` / "M3". **The redesign must respect this cut** — no
     new KPI wiring, no `MoneyMovement`.
   - **ADR-23** — soft-delete / hard-delete mechanics (the basis A5
     builds on).
   - **ADR-38** — dropped *locations* are deactivated, not deleted
     (related to A5's "archived = blocked from actions" but distinct).
   - **ADR-36c** — `FrictionDeleteDialog` per-entity label props (A2
     relocates *where* delete is initiated, not the friction mechanic).
   - **ADR-37b** — `Drawer` ships `panel` + `rail`; Session 14 sets
     Catalog to `rail`.
8. **`docs/API.md`** "Stock Movements" + "Assets" — the `purchase_payment`
   / `purchase_receipt` shapes, `GET /api/stock-movements/outstanding`
   (`{ awaitingReceipt, unmatchedReceipts }`), the product/asset
   soft-delete + `?includeArchived` / `?includeDeleted` flags.
9. **The current screens** (read the code as the *current state*, the
   thing being redesigned — not a target):
   - `app/admin/financials/financials-client.tsx` — the KPI strip + the
     `Tabs` (Stock Purchases / Deliveries) + two `SimpleTable`s + a
     separate `Reconciliation` `<MatchCard>` list. Note `parsePaymentNote`
     — the screen **regex-parses supplier / cost / paidFrom out of the
     `note` string**. Note the **three different status vocabularies**:
     "Received" / "Pending Delivery" (payments table), "Matched" /
     "Unmatched" (deliveries table), "awaiting" / "flagged" (MatchCards).
   - `app/admin/financials/payment-drawer.tsx` — the record-payment form
     (supplier, product `<Select>`, location, quantity, cost, Paid From
     segmented control).
   - `app/admin/catalog/{catalog-client,product-drawer,product-delete-dialog}.tsx`
     — for A1 / A2 / A4.
   - `app/admin/stock/stock-client.tsx` — for B3 (the ledger numeric
     cells).
10. **The relevant kit artboards** in the Paper file
    ("Prosper Hotel", `01M0EZ7TAHZM26KBMWNYT0928X`, page "Shell+Component
    kit") — `MatchCard`, `SimpleTable`, `Drawer` (panel + rail),
    `FormField`, `Select`, `SegmentedControl`, `StatusChip`, `Tabs`,
    `PageShell`, `EmptyState`/`ErrorState`. Plus the current screen
    artboards: **Admin Financials Full Table `7ZJ-0`**, **Payment Drawer
    `85W-0`**, the Catalog screens, the Assets Register `8DL-0`.
    `get_guide({ topic: "paper-mcp-instructions" })` first. **Paper is
    READ + WRITE this session** (Design Sprint) — you draw the new
    artboards here.

---

## Scope

### 1. Financials — Purchases ↔ Deliveries reconciliation redesign (the headline item)

**Problem (owner):** "The current design does not really make sense.
It's confusing." Concretely, from the code + `7ZJ-0`:

- The **2-way match** (a supplier *payment* ↔ the *delivery/receipt*
  that fulfils it) is scattered across **three UI regions** with **three
  different status vocabularies** — the payments table's "Received /
  Pending Delivery", the deliveries table's "Matched / Unmatched", and
  the reconciliation list's "awaiting / flagged". A user can't tell that
  these describe the same relationship.
- Supplier / cost / paid-from are **not first-class data** — they're
  regex-scraped from a free-text `note` (ADR-39 §4). When the parse
  misses, the cell shows `—`. This is fragile and it shows.
- Two tabs + a separate reconciliation list means the "what still needs
  attention" answer is **below the fold and disconnected** from the
  records it refers to.
- The KPI strip at the top is all `—` / "M3" (correct per the M1 cut)
  but visually dominates a screen whose actual job right now is the
  match.

**Deliverable — a redesigned `/admin/financials` (M1 cut) that:**

1. **Makes the payment↔delivery relationship the primary structure.**
   Decide the model: a single reconciliation-first view? one row per
   payment with its delivery status + a drill-in? a two-column
   "unmatched payments | unmatched deliveries" board? Pick one, justify
   it, draw it. **One consistent status vocabulary** across the whole
   screen (propose the terms — e.g. *Awaiting delivery* / *Delivered* /
   *Delivery without a payment* — and use them everywhere).
2. **Treats "what needs my attention" as the top of the screen**, not a
   trailing list. The open items (`awaitingReceipt` +
   `unmatchedReceipts` from `GET .../outstanding`) are the point of this
   screen in M1.
3. **Handles the KPI strip** deliberately for the M1 cut — shrink it,
   move it, collapse it to a single "M3" placeholder line, or drop it
   from the M1 artboard with a note that it returns in M3. Your call;
   justify it. (Do **not** wire it — ADR-36 D-FIN.)
4. **Composes from the proven kit.** `MatchCard` exists and is built for
   exactly this ("supplier / status / details / actionLabel"). Use it,
   or say precisely why it needs a variant (a new state → its own
   artboard + a flag, not an inline one-off).
5. **Names the data-shape decision.** The redesign is limited by ADR-39
   §4: supplier / cost / paid-from live in a parsed `note`, and there is
   no `PurchasePayment` entity. **Decide and record in the ADR:**
   - (a) the redesign works within the parsed-`note` reality for M1
     (accept the fragility, design around missing values gracefully), OR
   - (b) the redesign *requires* promoting supplier / cost / paidFrom to
     real columns (a `purchase_payment`-shaped sub-table or a
     `PurchasePayment` entity) — in which case that's a **schema +
     API + `SCHEMA.md` + `API.md`** change that Session 16 implements,
     and you spec it here.
   Recommend one. (b) is cleaner but bigger; (a) is faster but keeps a
   known smell. The owner should see the trade-off in the ADR.
6. **Redraws `7ZJ-0`** (and `85W-0` if the payment drawer changes —
   see C1) as the new visual acceptance target, with its
   structurally-different states as their own artboards (all-reconciled
   / has-open-items / loading / error / empty).

**Output:** updated Paper artboards + **an ADR** (next free number —
confirm against `DECISIONS.md`; likely **ADR-46**) capturing the new
structure, the single status vocabulary, the KPI-strip decision, and the
(a)-vs-(b) data-shape call with its consequences.

### 2. A2 (+ A1) — Delete moves into the Edit drawer

**Owner's model:** to delete a product you **open Edit**, scroll to a
dedicated **Delete** section at the bottom of the drawer, and act there —
**no standalone Delete button in the table row.** This also removes the
cramped two-column Edit/Delete action cluster (**A1**) for free.

- Design the **Delete section** inside the (now `rail`, per Session 14)
  `product-drawer` — placement (bottom, after a divider), copy, the
  affordance that opens `FrictionDeleteDialog` (ADR-36c friction
  mechanic is unchanged; only the entry point moves).
- Design the **table row** without the Delete column — what the row
  action becomes (row click → open Edit? a single "Edit" affordance?).
  Keep it consistent with how the Assets Register (`8DL-0`) and any
  other M1 `SimpleTable` present row actions — **one pattern**, not a
  per-screen choice. If Assets should follow the same "delete lives in
  the drawer" model, say so and draw it (it's the same
  `SimpleTable` + rail `Drawer` + `FrictionDeleteDialog` shape).
- Redraw the affected Catalog artboards (Product Catalog table, Product
  Drawer) + the Assets Register / Asset Drawer if the ruling extends to
  them.

**Output:** updated artboards + a short note in the ADR (or its own ADR
if it forces a real decision — e.g. "row click opens Edit everywhere").

### 3. A4 — Ingredient / Dish / Goods explainer UI

When adding a product, the kind selector gives **no indication of what
each kind means**. Owner wants context UI (helper text, tooltip, or a
short per-option description).

- Design it against the kit. `SegmentedControl` has no description slot —
  decide: a helper line under the control (`FormField` `hint`) that
  changes with the selection? a static three-line legend? an info
  popover? Pick the lightest thing that answers "which do I pick".
- The copy matters — write the actual one-line description for each:
  **Ingredient** (raw input, has a buying price, consumed by
  production), **Dish** (finished menu item, `buyingPrice = 0`, food
  cost derived from ingredients — ADR-33), **Goods** (bought-and-resold
  item, has a buying price + a selling price). Keep it plain-language for
  a non-technical owner.
- Redraw the Product Drawer artboard with the explainer.

### 4. C1 — Payment-drawer product Select: searchable + scoped

The product `<Select>` in the record-payment drawer will hold **many**
products in production; a plain dropdown is unusable at length. Owner
raised: type-to-filter, and/or a sensible max-height scroll, and/or
**limiting which kinds appear** (a Dish is never *purchased* — only
Ingredients + Goods).

- **Decide the kind scope:** should the payment-drawer product picker
  show **only `ingredient` + `goods`**? (Strongly implied — you don't
  pay a supplier for a Dish.) If yes, that's a filter the drawer applies
  and a line in the ADR / `API.md` note.
- **Decide the control pattern at scale:** does the kit `Select` need a
  searchable/combobox variant (a real kit component change → artboard +
  states + a flag for a *kit* session), or does M1 get by with a
  `max-height` + scroll on the existing `Select` popover + the kind
  filter cutting the list down? Recommend the smaller option if it's
  genuinely adequate for M1's product count; flag the combobox as a
  post-M1 kit item if not.
- Redraw `85W-0` (Payment Drawer) with the resolved control.

### 5. B3 — Ledger digit typography

Owner asks what font / weight the ledger's numeric cells use (e.g. the
**Closing** column) and whether it's an industry-standard choice for a
financial/stock table — wants a **deliberate answer**: tabular figures?
mono? which weight?

- Check the current state: `app/admin/stock/stock-client.tsx` +
  `component-states.md` — the ledger cells use `font-mono` at some
  weight (`DenseLedger` / `SimpleTable` `cell: "mono"`).
- Decide the standard: for a reconciliation table, **tabular / monospaced
  figures so digits align in columns** is the convention. Confirm the
  current `font-mono` gives that (it does — monospace is inherently
  tabular), or specify `font-variant-numeric: tabular-nums` on a
  proportional font if the design wants that instead. Pin the **weight**
  (the current is `--weight-regular` / `--weight-medium` per cell type —
  decide if that's right, or if e.g. totals should be `--weight-semibold`).
- This is likely a **confirm + document** outcome, not a redesign —
  write the answer into `design-principles.md` §4 (tables) so it's a
  stated rule, and note whether any artboard changes.

### 6. A5 — Archive model: design + ADR (design only; build is Session 16)

**Owner's expectation** for Archive (products / ingredients / goods —
and by extension assets):

- An archived item is **removed from the main list entirely** and
  appears **only** in a dedicated **Archived** list.
- While archived, it is **blocked from every action** an active item has
  (no edit, no price change, no use in any flow).
- **Reversible** via an **Unarchive** action from the Archived list.

**Current reality (for triage):** soft-delete stamps `deletedAt` and
hides the row from the default list unless `?includeArchived=true` /
`?includeDeleted=true` — but there is **no Archived-list UI**, **no
Unarchive** endpoint, and "blocked from all actions" is **not
enforced/tested**. ADR-38 (dropped locations deactivated) is adjacent but
separate.

**Deliverable (design + decision, NOT code):**

1. **Design the Archived list** — is it a tab on the existing table
   (Catalog already has an "Archived" tab per `catalog-client.tsx`!) or a
   separate view? What columns, what's different from the active list,
   where's the **Unarchive** affordance, does it need its own friction
   (probably not — unarchive is safe/reversible).
2. **Decide the enforcement scope for M1** — "blocked from every action"
   is broad. Which of these does M1 actually enforce, and where:
   - edit blocked (drawer won't open, or opens read-only)?
   - price change blocked?
   - **not selectable in stock flows** (issue / production / transfer /
     purchase-payment product pickers exclude archived) — this is the
     one with real integrity weight.
   Recommend a scope. Full enforcement everywhere may be more than M1
   needs; the stock-flow exclusion is the part that matters for
   trustworthy numbers.
3. **Spec the backend/API delta** for Session 16: an **Unarchive**
   endpoint (`POST /api/products/:id?mode=unarchive` or
   `/api/assets/:id/restore` — match the existing pattern), the
   `listProducts` / `listAssets` filter behaviour, and every product/
   asset picker that must exclude `deletedAt != null`. Keep it aligned
   with ADR-23.
4. **Write the ADR** (next free number — likely **ADR-47**): the Archive
   model, the Archived-list UI decision, the M1 enforcement scope (with
   what's deferred), and the API delta.
5. **Draw the artboards** — the Archived list/tab, the Unarchive
   affordance, and any "this item is archived" empty/blocked state a flow
   picker needs.

---

## What this session does NOT do

- **No real logic / no code** beyond ADRs + specs + Paper. Session 16
  builds everything designed here.
- **D1 / B1 / B4 / C2 / A3** — Session 14 owns those (copy + the drawer
  variant + the blocker).
- **B2** (bulk opening-stock post-save behaviour) — Session 17 QA
  verifies against design intent; not a redesign.
- **B5** (stock correction "Edit not clickable") — Session 17 QA repro.
- **The Playwright e2e harness** — Session 17.
- **Wiring the KPI strip / any `MoneyMovement`** — M3, out of the M1 cut
  (ADR-36 D-FIN). The redesign *presents* the strip differently at most.
- **A kit component change** — if C1's combobox or A4's description slot
  or the reconciliation redesign genuinely needs a **new/changed kit
  component**, you **flag it** (its own artboard + states + a note that a
  kit Design Sprint builds it); you do not build it and you do not have
  Session 16 hack it into a screen.

---

## Exit criteria / definition of done

- **Financials reconciliation redesign:** new `7ZJ-0` (+ its
  structural-state artboards, + `85W-0` if the drawer changed) in Paper
  as the visual acceptance target; **ADR** (≈46) with the new structure,
  the single status vocabulary, the KPI-strip decision, and the
  parsed-`note`-vs-real-columns data-shape call + consequences.
- **A2/A1:** Catalog (and, if the ruling extends, Assets) artboards
  redrawn with delete-in-drawer + no delete column; the row-action
  pattern is **one** pattern, documented.
- **A4:** Product Drawer artboard with the kind explainer + the three
  one-line descriptions written.
- **C1:** `85W-0` redrawn with the resolved product picker; the
  kind-scope decision (ingredient + goods only?) and the
  control-at-scale decision recorded (in ADR-46 or a note); combobox
  flagged as a kit item if deferred.
- **B3:** the ledger-digit typography answer written into
  `design-principles.md` §4; artboard touched only if it changes.
- **A5:** Archived-list/tab + Unarchive + blocked-state artboards; **ADR**
  (≈47) with the model, the M1 enforcement scope, and the API delta
  spec'd for Session 16.
- **`docs/design/component-states.md`** updated if any kit component
  gained a state (or a flagged new one).
- **No kit component has two divergent versions** after this session
  (`export-workflow.md` Phase A exit criterion).
- **`docs/PROGRESS.md`** — a Session 15 entry: every decision made, every
  ADR added, every artboard redrawn, everything flagged for a kit
  session, and the precise build list handed to Session 16.
- **`docs/sprints/milestone-1-plan.md`** — note that M1 now includes this
  design-change pass + the Session 16 build before the QA pass; update
  the session count.
- **`docs/sprints/session-15-handoff.md`** `Status: DONE`;
  **`docs/sprints/m1-manual-verification-observations.md`** — mark
  A1/A2/A4/C1/B3/A5 as **designed (Session 15)** with a one-line
  disposition + ADR reference each.
- Draft **`docs/sprints/session-16-handoff.md`** — the Development Sprint
  that builds everything above (the reconciliation screen, delete-in-
  drawer, the kind explainer, the payment-picker changes, the B3
  typography if any, and the full A5 Archive feature: Unarchive endpoint
  + Archived UI + the stock-flow exclusion + tests).

---

## Suggested order

1. **Read** everything above. Pull `7ZJ-0` / `85W-0` / the Catalog +
   Assets artboards + the `MatchCard` / `Select` / `SegmentedControl` kit
   artboards with `get_screenshot` + `get_computed_styles`.
2. **Reconciliation redesign first** — it's the headline and the
   hardest. Sketch 2–3 structural directions, pick one, draw it + its
   states, write ADR-46 (incl. the data-shape call). This can begin
   before Session 14 finishes.
3. **A5 Archive** — design the Archived list/tab + Unarchive + M1
   enforcement scope, write ADR-47, draw the artboards.
4. **A2/A1** — delete-in-drawer + the row-action pattern; redraw Catalog
   (+ Assets if extended). Do this **after Session 14** (the Catalog
   drawer is now `rail`).
5. **A4** — kind explainer + copy; redraw the Product Drawer.
6. **C1** — payment-picker scope + control; redraw `85W-0`.
7. **B3** — confirm/spec the ledger digit typography; write it into
   `design-principles.md` §4.
8. **Consistency pass** — no divergent component versions; update
   `component-states.md`.
9. **Docs** — `PROGRESS.md`, `milestone-1-plan.md`, the observations doc,
   this file's `Status:`, and draft `session-16-handoff.md`.

Then Session 16 — Developer: build all of it.
