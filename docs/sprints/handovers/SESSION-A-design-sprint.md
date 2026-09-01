# HANDOVER — Session A · Design Sprint (Product Designer role)

**Paste this whole file as your first message in a fresh session.**

---

## 0. Context and urgency — read first

The Prosper project is **overdue**. The client is waiting for a submission.
We are pushing to ship a clean **"staff can sell every day"** product
(Milestone 1 + Milestone 2, every screen matching its Paper design) as
**Submission 1**. Milestone 3 is a separate later submission — **do not
touch or design anything for M3** (Handover, Reconciliation beyond what
already exists, Day Close, Expenses, Owner draw, profit reporting).

An orchestrator session holds the master plan. Your job is **one Design
Sprint, this session only**. When you finish, the human takes your summary
back to the orchestrator, who drafts the next session. Do not start build
work. Do not write real logic. **You are the Product Designer this
session and nothing else** (`CLAUDE.md` "How sessions work").

Move fast, but the whole point of this sprint is **fidelity** — the last
few dev sprints drifted from Paper and that is exactly what we are fixing.
Precision here saves days downstream.

## 1. Mandatory reading before you touch anything

In this order (`CLAUDE.md` hard requirement):

1. `docs/sprints/milestone-2-plan.md` — the whole thing, especially §3
   (cross-cutting contracts) and §7 (session table). **Note §7 is stale**
   — it lists 6d/7 as pending but 6d + 6e are merged to `main`. The
   orchestrator will fix §7 later; don't fix it yourself.
2. `docs/CONVENTIONS.md` — naming, folder structure, §6 working practices.
3. `docs/design/design-principles.md` — **§9 is an ENFORCED contract.**
   House style: dense, light-mode only, Inter 14px, hairline dividers, no
   card borders/shadows, tables square-cornered, one accent at ≲5% pixels.
4. `docs/design/export-workflow.md` — the "Paper is the visual acceptance
   target, compose from the proven kit, never transcribe markup" method.
5. `docs/design/kit-audit.md` and `docs/design/component-states.md` §2/§9
   — what each kit component already does. **You design by composing
   existing kit components. You do NOT invent new components.** If you
   think a new component is unavoidable, STOP and flag it in your summary
   — that is an orchestrator decision, not yours.
6. The three M2 flow docs in `docs/design/flows/`:
   `restaurant-sales-flow.md`, `customers-credit-flow.md`,
   `canteen-derived-sales-flow.md`. Also `financials-reconciliation-flow.md`.

## 2. Paper file

- File: **"Prosper Hotel"**, fileId `01M0EZ7TAHZM26KBMWNYT0928X`, page
  "Shell+Component kit" (`1-0`).
- **You MUST call `get_guide({ topic: "paper-mcp-instructions" })` once
  before other Paper tools.** Then `get_basic_info`, then `get_font_family_info`
  before any typographic styling.
- Existing artboards you will reference (by id):
  - `DU2-0` A1 Customers Register desktop — **this is the fidelity
    reference standard. The owner has confirmed the Customers screens
    (desktop + mobile) match Paper perfectly and that is the bar for
    everything.**
  - `EPJ-0` A1 Customers mobile, `F7F-0` A2 Customer Detail mobile,
    `GIA-0` A3 Orders List mobile, `H4I-0` A4 Derived Sales mobile —
    existing M2 mobile artboards.
  - `FA1-0` A3 Orders List desktop populated, `GL2-0` A4 Canteen Derived
    Sales desktop populated — the two screens to be MERGED (see §4.1).
  - `8Q4-0` Admin Stock — Mobile, `798-0` Admin Stock desktop ledger.
  - `7ZJ-0` Admin Financials Full Table (desktop), `85W-0` payment
    drawer, `BHJ-0`/`AYB-0` S15 recon variants.
  - `8DL-0` Admin Assets Register (desktop).
  - `8XH-0` Store Manager Flows — Issues & Production (940px),
    `92M-0` Store Manager Flows — Transfers & Consumption (940px),
    `8T3-0` Store Manager Mobile Hub, `986-0` Store Manager Stock Levels,
    `9GW-0` Canteen Stock Levels, `9FE-0` Canteen Transfer Dispatch.
  - Shells: `649-0` Admin desktop sidebar, `6B1-0` Mobile Shell Admin,
    `1ZP-0` Mobile Shell drawer open, `4Y-0` Mobile Shell Staff.
  - Kit pattern artboards: `DIN-0` "M2 Sales Patterns", plus the
    `Component Kit — *` set.

## 3. What the owner reported from localhost (the ground truth of the drift)

- **Admin / Catalog** — desktop ✅, mobile ✅. Leave alone.
- **Admin / Ledger** (`/admin/financials` stock ledger) — desktop ✅.
  **Mobile is poor / may never have been designed properly.** Artboard
  `8Q4-0` exists — verify it is complete and correct, annotate gaps.
- **Admin / Sales** (`/admin/orders`) — desktop ✅, **no mobile view
  built**. Artboard `GIA-0` exists.
- **Admin / Derived Sales** (`/admin/canteen/derived-sales`) — desktop
  ✅, **no mobile built** (`H4I-0` exists). **Owner wants this MERGED
  into the Sales screen** — see §4.1.
- **Admin / Customers** — desktop ✅, mobile ✅. **The reference standard.
  Do not change.**
- **Admin / Financials** — desktop ✅, **no mobile view and no mobile
  artboard exists.** Design one.
- **Admin / Assets** — desktop ✅, **no mobile view and no mobile
  artboard exists.** Design one.
- **Store Manager / Hub** — "close enough" to `8T3-0`. Low priority;
  quick verify only.
- **Store Manager / Receive goods, Issue to kitchen, Record production,
  Transfer to canteen, Log wastage (non-sale), Stock levels** — "look
  nothing like" the Paper designs (`8XH-0`, `92M-0`, `986-0`). These
  artboards EXIST. Your job: screenshot each artboard, screenshot the
  matching localhost screen, and produce a precise per-screen delta
  checklist a Developer can execute mechanically.
- **Canteen / Stock levels** — must show **canteen items only** (Store
  Manager shows restaurant items only). Artboard `9GW-0` exists. Verify +
  annotate.
- **Canteen / Transfer stock** — does not match `9FE-0`. Verify +
  annotate.

You will NOT be able to run localhost yourself in a Design session in a
way that's productive — instead, **read the current screen source** to
judge fidelity:
- `app/store-manager/flows/*` (`receive/`, `issue/`, `production/`,
  `transfer/`, `non-sale/`, `flow-scaffold.tsx`,
  `issue-production-flow.tsx`, `transfer-nonsale-flow.tsx`,
  `receive/receive-flow.tsx`)
- `app/store-manager/stock/stock-levels-view.tsx`
- `app/canteen/stock/page.tsx`, `app/canteen/transfer/transfer-dispatch-flow.tsx`
- `app/admin/orders/admin-orders-client.tsx`,
  `app/admin/canteen/derived-sales/derived-sales-client.tsx`
- `app/admin/financials/financials-client.tsx`
- `app/admin/assets/*`
Compare structure/layout/components against the artboard screenshots and
the kit. You are looking for: wrong component used, missing states,
layout that doesn't match, wrong spacing scale, missing mobile handling.

## 4. Deliverables (this session)

### 4.1 NEW — Admin "Sales" merged screen (desktop + mobile)

Owner decision, confirmed: **one nav item "Sales"** with **two tabs**:

- **Tab 1 — "Restaurant Orders"** = the current `/admin/orders` content
  (the `FA1-0` orders list + its filter chip bar + read-only detail
  drawer + correction form drawer + linked correction row-group). No
  change to that content — it just lives under a tab now.
- **Tab 2 — "Canteen Derived"** = the current `/admin/canteen/derived-sales`
  content (the `GL2-0` derived-sales table + product select + date
  filter).
- Use the kit `Tabs` component (underline style, as used on C2). Shared
  `PageShell`. The nav loses the separate "Derived sales" link.
- Design **both desktop and mobile** artboards. Mobile: the two existing
  mobile layouts (`GIA-0`, `H4I-0`) under a mobile tab row.
- Name the artboards clearly, e.g. `A3+A4 Sales (merged) — desktop,
  Restaurant Orders tab`, `… Canteen Derived tab`, `… mobile Restaurant
  Orders tab`, `… mobile Canteen Derived tab`. Include empty / loading /
  error states for each tab (reuse the existing state artboards' content).
- Update `restaurant-sales-flow.md` and `canteen-derived-sales-flow.md`
  to note the merge (screen id, nav change). Add an ADR-style note only
  if the flow docs have a decisions section; otherwise a short status
  note at the top of each.

### 4.2 NEW — Admin Financials — mobile artboard

- Base it on the desktop `7ZJ-0` (KPI stat strip — note the KPI strip is
  intentionally unwired `TODO(mock)` for M3, keep it visually present but
  that's fine — the transactions tabs: All Transactions / Stock Purchases
  / Operating Expenses / Owner Draws — the transactions table — the
  reconciled-outflows footer — the Reconciliation section per
  `financials-reconciliation-flow.md`).
- Mobile pattern: follow how `8Q4-0` (Admin Stock mobile) and the
  Customers mobile (`EPJ-0`) collapse a desktop table to a mobile
  stacked-row list. Tabs become a horizontally scrollable chip/tab row or
  a select — match whatever the kit + `8Q4-0` already established; do not
  invent a new pattern.
- States: populated / empty / loading / error. Payment drawer on mobile
  = full-screen or bottom sheet, matching the kit's existing drawer
  mobile behavior.

### 4.3 NEW — Admin Assets — mobile artboard

- Base on desktop `8DL-0`. Same table→stacked-row mobile collapse
  pattern. Asset drawer (`8JO-0`) and delete dialog (`8IV-0`) mobile
  behavior per kit. States: populated / empty / loading / error.

### 4.3b NEW — Admin Sales · A3 correction drawer — FULL corrected-order form (desktop + mobile)

**Why:** QA finding F7-4. The current A3 correction drawer (`G4I-0` and
the built screen) is **quantity-only** — the Admin cannot correct a wrong
**payment method**, **order type**, **delivery fee**, or a **missing
line**, even though the domain `correctOrder` supports all of it (and a
credit→cash correction correctly reverses the `Debt`). For a money system
the client will test, "no way to fix a mis-recorded payment method" is a
real gap.

- Redraw the A3 correction drawer (currently `G4I-0`) so it lets the
  Admin restate the **whole corrected order**, matching
  `customers-credit-flow.md` §G step 3:
  - the corrected **line list** with `QuantityStepper` per line **plus an
    add-product control** (reuse the C2 tap-to-add pattern or a
    searchable add row — whichever the kit already supports),
  - **order type** `SegmentedControl` (Dine-in / Takeaway / Delivery),
  - **payment method** `SegmentedControl` (Cash / M-Pesa / Credit),
  - **delivery fee** field, shown only for Delivery,
  - the existing required **Reason** `Textarea`,
  - the `CalculatedImpactBanner` — must now reflect payment-method and
    fee changes too, and label a credit delta as **"Debt"** not "Money"
    (see F7-5).
  - Credit correction: if payment method is set to Credit, a customer
    must be attached (parity with C3) — reuse the customer-attach block /
    `BottomSheet`.
- Desktop = a `Drawer` (as today). Mobile = full-screen sheet (kit drawer
  mobile behavior).
- States: default (populated form) / add-line active / credit-needs-
  customer (submit disabled) / validation error / linked "Correction of
  #N" result.
- This feeds **build batch 3a**. Update `customers-credit-flow.md` and
  `restaurant-sales-flow.md` §G with the final drawer contents.

### 4.3c NOTE — Admin Sales · A3 filter chips (F7-8)

The A3 "Cashier" and "Payment method" filter chips are currently inert.
In your merged-Sales artboards (§4.1), draw the **working** filter set
from `customers-credit-flow.md` §G step 1: Cashier · Date · Payment
method · Corrected-only, as active/inactive `PillFilter` chips with
pickers. Note in your summary that the **Cashier picker needs a staff
list source** (none exists in M2) — flag whether that blocks the chip or
whether it degrades to "all cashiers" for Submission 1. This also feeds
build batch 3a.

### 4.4 VERIFY + ANNOTATE (no new artboards unless one is missing a state)

For each of these, produce a **per-screen delta checklist** in the
relevant flow doc (or a new short doc `docs/design/fidelity-audit-m1.md`
if no flow doc fits — the M1 flow screens predate the flow-doc practice):

| Screen | Artboard | Current source file |
|---|---|---|
| Admin Ledger mobile | `8Q4-0` | `app/admin/financials/` stock ledger portion + `app/admin/stock` |
| SM Receive goods | `8XH-0` | `app/store-manager/flows/receive/` |
| SM Issue to kitchen | `8XH-0` | `app/store-manager/flows/issue/` + `issue-production-flow.tsx` |
| SM Record production | `8XH-0` | `app/store-manager/flows/production/` + `issue-production-flow.tsx` |
| SM Transfer to canteen | `92M-0` | `app/store-manager/flows/transfer/` + `transfer-nonsale-flow.tsx` |
| SM Log wastage / non-sale | `92M-0` | `app/store-manager/flows/non-sale/` + `transfer-nonsale-flow.tsx` |
| SM Stock levels (restaurant items only) | `986-0` | `app/store-manager/stock/stock-levels-view.tsx` |
| Canteen Stock levels (canteen items only) | `9GW-0` | `app/canteen/stock/page.tsx` |
| Canteen Transfer dispatch | `9FE-0` | `app/canteen/transfer/transfer-dispatch-flow.tsx` |
| SM Mobile Hub (quick check only) | `8T3-0` | `app/store-manager/hub-client.tsx` |
| Canteen Hub — "Delete today's count" affordance (NEW, F7-3) | `9BA-0` + K1 re-spin | `app/canteen/hub-client.tsx` |
| K1 Stock Count — "counted more than expected" blocked state (F7-3) | `HBN-0` | `app/canteen/stock-count/stock-count-client.tsx` |

**On the two canteen items above (F7-3):** the QA session is wiring a
"Delete today's count" affordance on the Canteen hub to the existing
`voidStockCount`, and giving K1's blocked state an inline §9.8 error +
`InstructionalBanner` instead of a raw toast. Artboards `9BA-0` (Canteen
hub) and `HBN-0` (K1 blocked) already exist from the 2026-08-30 re-spin —
**verify they show these affordances clearly and annotate any gap** so the
QA session's wiring has a visual target. If `9BA-0` does not show a
delete-count row, add that one state.

Each checklist item must be concrete and buildable, e.g.:
- "Header uses a plain `<h1>`; artboard uses `FlowHeader` with back
  chevron + step label."
- "Quantity control is a bare `<input type=number>`; artboard + kit
  require `QuantityStepper`."
- "Rows are `<div>` cards with borders; §4 says tables are square-cornered
  hairline `SimpleTable` — convert."
- "Missing the empty state entirely — artboard `986-0` shows an
  `EmptyState` with copy '…'."
- "Stock levels query is not location-scoped — must filter to the
  Canteen `ProductLocation` set (this is also a domain check for the
  build session, note it)."

If an artboard is genuinely **missing a state** the screen needs
(e.g. no error state drawn), create just that one state artboard from the
kit and note it.

### 4.5 Output summary (for the human to carry back to the orchestrator)

At the end, write a tight summary with:
- Every artboard created (id + name).
- Every flow doc / audit doc updated.
- The full per-screen delta checklists (or a pointer to the doc holding
  them) — this IS the spec the build sessions consume.
- Anything you had to escalate (new component needed? a real design
  ambiguity? a domain/scoping issue for the build sessions?).
- Your recommended build batching if you disagree with the orchestrator's
  (3a merged Sales, 3b Admin mobiles, 3c SM flows, 3d Canteen).
- Confirm: no code written, no kit changed, no M3 work done.

## 5. Guardrails

- **One canonical version of each screen in Paper.** Don't leave
  half-duplicates. Use `duplicate_nodes` + `update_styles` + `set_text_content`
  where faster than fresh `write_html` (per Paper guide).
- Call `get_screenshot` after meaningful changes to self-review.
- **Call `finish_working_on_nodes` when done.**
- Do not put raw node IDs in user-facing summary prose (fine in the
  handover doc / flow docs as reference).
- Light mode only. `tabular-nums` on numeric columns. Accent ≲5% pixels.
- If you find yourself writing `.tsx` — stop, you've left your lane.
- Time-box the VERIFY/ANNOTATE work: it's a checklist, not a redesign.
  The three NEW artboard sets (4.1–4.3) are the priority deliverable.

## 6. Do NOT

- Touch `lib/`, `app/`, `components/`, tests, Prisma.
- Design anything for Milestone 3.
- Invent a new kit component without escalating.
- Change the Customers screens or the Catalog screens.
- "Improve" the design system — you compose what exists.
