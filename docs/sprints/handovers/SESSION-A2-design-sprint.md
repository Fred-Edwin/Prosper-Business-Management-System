# HANDOVER — Session A2 · Design Sprint (Product Designer role)

Paste this whole file as your first message in a fresh session.

---

## 0. Context and urgency — read first

The Prosper project is overdue. The client is waiting for **Submission 1**
= Milestone 1 + Milestone 2, every screen matching its Paper design.
**Milestone 3 is a separate later submission — do not touch or design
anything for M3** (Handover, Reconciliation beyond what exists, Day Close,
Expenses, Owner draw, profit reporting).

An orchestrator session holds the master plan. Your job is **one Design
Sprint, this session only** — the *remainder* of the work started in
Session A (design fidelity fixes for Submission 1). When you finish, the
human takes your summary back to the orchestrator, who drafts the next
session.

**You are the Product Designer this session and nothing else**
(CLAUDE.md "How sessions work"). Do not start build work. Do not write
real logic. If you find yourself writing `.tsx` — stop, you've left your
lane.

The whole point of this sprint is **fidelity** — the last few dev sprints
drifted from Paper and that is what we are fixing. Precision here saves
days downstream.

---

## 1. What Session A already delivered (do NOT redo this)

Session A was split by the owner mid-session. **Session A finished the
merged Sales screen only**; the rest was deferred to you.

### DONE in Session A — the merged "Sales" screen (A3 + A4)

**Owner decision, confirmed & built:** the separate `/admin/orders` (A3)
and `/admin/canteen/derived-sales` (A4) screens are **merged into one
"Sales" screen** with two underline tabs — **Restaurant Orders** and
**Canteen Derived**. The separate "Derived sales" nav link is removed.

**Owner decision, confirmed & built — NEW FILTER PATTERN (replaces the
pill filter bar EVERYWHERE):** the old pill-style filter bar
(pills that mixed active-filter chips with dormant menu triggers, no
visible affordance for how you pick a value) is **retired**. The
replacement is a **filter toolbar**:

- Labelled dropdown controls — `Cashier: Mary Njeri ▾`, `Payment: All ▾`
  (kit `Select`); the current value lives *inside* the control's label.
  Default value renders `--text-secondary` regular; a set value renders
  `--text-primary` `--weight-medium`.
- A **date chip** — calendar glyph + `Today` / `All dates` (kit
  `DatePicker` trigger).
- A **`☐ Corrected only`** checkbox (16px square, `--border-strong`,
  `--radius-sm`) — plain checkbox, not a pill.
- Right-aligned (`margin-left:auto` via a flex spacer): the **result
  count** (`6 orders`, `--text-tertiary`), then a `·`, then a **`Reset`**
  link (`--color-accent`, `--weight-medium`) that is **only shown when at
  least one filter is off its default**.
- Row: `display:flex; align-items:center; gap:var(--sp-4);
  padding-top:var(--sp-6); padding-bottom:var(--sp-6); width:1200px`.
  The `padding-top:var(--sp-6)` is the deliberate 16px gap between the
  tab row and the toolbar (they were touching before — owner flagged it).

**Mobile variant of the toolbar:** a horizontally-scrollable row of
**dropdown chips** — `Cashier ▾ · Date ▾ · Payment ▾ · More` for the
Orders tab, `Product ▾ · Date range ▾` for the Derived tab. Chip =
`height:32px; padding-inline:var(--sp-4); border:1px solid
var(--border-strong); border-radius:var(--radius-sm)`, 12px chevron
(`stroke-width:2`), text `white-space:nowrap`, `flex-shrink:0`. Row:
`gap:var(--sp-3); padding-block:var(--sp-4);
padding-inline:var(--sp-5)`. The count/`Reset` row keeps its existing
layout but `Clear all` → `Reset`.

**Tab row (both desktop + mobile):** kit underline tabs. The full-width
grey hairline under the whole strip is the kit tablist rule and is
**always present**; only the **active** tab gets `color:var(--color-accent)`
+ a 2px `border-bottom:var(--color-accent)` segment. Inactive tab =
`color:var(--text-secondary)`, `border-bottom:#00000000`. (Owner asked to
confirm this — it is correct and matches the Catalog tabs.)

**9 artboards created/updated, all tagged `[M2-SA]`, arranged in a
horizontal row at `worldY 24000` on page "Shell+Component kit" for
review:**

| x (worldX) | Artboard |
|---|---|
| 0 | `A3+A4 Sales (merged) — desktop, Restaurant Orders tab [M2-SA]` (populated) |
| 1560 | `… desktop, Restaurant Orders tab — empty [M2-SA]` (was `FN0-0`) |
| 3120 | `… desktop, Restaurant Orders tab — filtered-empty [M2-SA]` (was `FHF-0`) |
| 4680 | `… desktop, Restaurant Orders tab — error [M2-SA]` (was `FSL-0`) |
| 6240 | `A3+A4 Sales (merged) — desktop, Canteen Derived tab [M2-SA]` (populated) |
| 7800 | `… desktop, Canteen Derived tab — filtered-empty [M2-SA]` (was `GVN-0`) |
| 9360 | `… desktop, Canteen Derived tab — loading [M2-SA]` (was `GZO-0`) |
| 11000 | `A3+A4 Sales (merged) — mobile, Restaurant Orders tab [M2-SA]` (from `GIA-0`) |
| 11600 | `A3+A4 Sales (merged) — mobile, Canteen Derived tab [M2-SA]` (from `H4I-0`) |

Node ids for the two populated desktop artboards: **`I00-0`** (Restaurant
Orders tab), **`I5S-0`** (Canteen Derived tab). The reusable toolbar
subtree to clone lives inside `I00-0` as layer **"Filter Toolbar"**
(id `IEA-0`); the Product/Date-only variant is inside `I5S-0` as
**`IEY-0`**. The desktop tab-row subtree is `I5L-0` (Restaurant active) /
`I8B-0` (Canteen active); mobile tab row is `IKQ-0`.

**States NOT re-drawn (deliberate — covered by existing canonical
artboards + a note):** Restaurant Orders tab *loading* = §9.10 skeleton,
3 rows (see `C38-0` / `A2 loading`); Canteen Derived tab *empty* / *error*
= plain `EmptyState` / `ErrorState` per the flow doc (A4 has no distinct
"no products" empty).

**Session A confirmed:** no code written, no `.tsx` touched, no kit
component changed, no M3 work, Customers + Catalog screens untouched, and
the new toolbar composes **only proven kit** — no new component needed.

### The originals Session A spun from — LEFT IN PLACE, NOW STALE

`FA1-0` (A3 desktop populated), `GL2-0` (A4 desktop populated),
`GIA-0` (A3 mobile), `H4I-0` (A4 mobile), plus the A3/A4 drawer + state
artboards (`FYX-0`, `G4I-0`, `GCP-0`, `FN0-0`→renamed, `FHF-0`→renamed,
`FSL-0`→renamed, `GVN-0`→renamed, `GZO-0`→renamed, `GRM-0`) **still show
the OLD pill filter bar / old single-screen framing.** These are your
Task 1 (below).

---

## 2. Mandatory reading before you touch anything

In this order (CLAUDE.md hard requirement):

1. `docs/sprints/milestone-2-plan.md` — the whole thing, esp. §3
   (cross-cutting contracts) and §7 (session table). **§7 is stale** —
   it does not reflect the A/A2 design-fidelity split; the orchestrator
   will re-baseline it, don't fix it yourself.
2. `docs/CONVENTIONS.md` — §4 (correction pattern), §6 (working
   practices).
3. `docs/design/design-principles.md` — **§9 is an ENFORCED contract.**
   House style: dense, light-mode only, Inter 14px, hairline dividers,
   no card borders/shadows, tables square-cornered, one accent at ≲5%
   pixels, `tabular-nums` on numeric columns.
4. `docs/design/export-workflow.md` — "Paper is the visual acceptance
   target, compose from the proven kit, never transcribe markup."
5. `docs/design/kit-audit.md` + `docs/design/component-states.md` §2/§9 —
   what each kit component already does. **You design by composing
   existing components. Do NOT invent new ones. If you think a new
   component is unavoidable, STOP and flag it in your summary** — that's
   an orchestrator decision.
6. The flow docs in `docs/design/flows/`: `restaurant-sales-flow.md`,
   `customers-credit-flow.md`, `canteen-derived-sales-flow.md`,
   `financials-reconciliation-flow.md`.
7. `docs/PROGRESS.md` — most recent entries (Session 6d/6e, QA S7).

---

## 3. Paper file

File: **"Prosper Hotel"**, fileId `01M0EZ7TAHZM26KBMWNYT0928X`, page
**"Shell+Component kit"** (`1-0`).

- You MUST call `get_guide({ topic: "paper-mcp-instructions" })` once
  before other Paper tools. Then `get_basic_info`, then
  `get_font_family_info` before any typographic styling.
- **Fidelity reference standard:** `DU2-0` `A1 Customers Register —
  desktop populated`. The owner has confirmed the Customers screens
  (desktop + mobile) match Paper perfectly — that is the bar for
  everything.
- **Screenshot top-level artboards for verification, not inner frames**
  (an isolated inner node renders on Paper's dark canvas and reads as a
  contrast bug that isn't one — CONVENTIONS §6).
- `get_computed_styles` for any exact value — **never eyeball a
  screenshot for a value** (Sprint 06 scrap).
- One canonical version of each screen. Use
  `duplicate_nodes` + `update_styles` + `set_text_content` over fresh
  `write_html` where faster.
- `get_screenshot` after each meaningful change to self-review against
  the checkpoint list in the Paper guide.
- `finish_working_on_nodes` when done.
- Do not put raw node IDs in user-facing summary prose (fine in this doc
  / flow docs as reference).

### Key artboard ids you will need

- Shells: `649-0` Admin desktop sidebar, `6B1-0` Mobile Shell Admin,
  `1ZP-0` Mobile Shell drawer open.
- Kit: `6CG-0` Form Controls (Select spec: 36px h, `--border-strong` 1px,
  `--radius-sm`, `padding-inline:var(--sp-5)`, `--text-sm` label, 14px
  chevron `polyline` `stroke:var(--text-tertiary)`); `6IW-0` Tabs &
  Filters; `6ET-0` Tables; `9U3-0` Empty & Error States; `6WD-0` Utility
  & Layout (FlowHeader, date picker, action-tile grid); `6R4-0` Stat
  Tiles & KPI (`DenseSummaryStrip`, hairline stat strip); `6OE-0`
  Drawers & Dialogs; `6Z4-0` Bottom Sheet; `DIN-0` "M2 Sales Patterns".
- The Session-A merged Sales row: `worldY 24000` (see §1 table).
- **Financials (Task 3):** `7ZJ-0` `Admin Financials — Full Table`
  (desktop; the S15 recon-as-table variant is folded here — see
  `BHJ-0` too), `85W-0` / `AYB-0` payment drawer, `BHJ-0` / `BR7-0`
  recon section states. Flow: `financials-reconciliation-flow.md`.
  **NOTE:** the KPI stat strip on `7ZJ-0` is intentionally unwired
  `TODO(mock)` for M3 — keep it visually present, that's fine.
- **Assets (Task 4):** `8DL-0` `Admin Assets Register` (desktop),
  `8JO-0` `Asset Drawer — Create / Edit`, `8IV-0` `Asset Delete Dialog`.
- **Verify/annotate (Task 5):**
  - `8Q4-0` `Admin Stock — Mobile`, `798-0` Admin Stock desktop ledger
  - `8XH-0` `Store Manager Flows — Issues & Production` (940px)
  - `92M-0` `Store Manager Flows — Transfers & Consumption` (940px)
  - `986-0` `Store Manager — Stock Levels`
  - `9GW-0` `Canteen — Stock Levels`
  - `9FE-0` `Canteen — Transfer Dispatch`
  - `8T3-0` `Store Manager Mobile Hub`

### Mobile-table → stacked-row pattern (for Tasks 3 & 4)

The established Prosper pattern for collapsing a desktop table to mobile:
see `8Q4-0` (Admin Stock mobile) and `EPJ-0` (A1 Customers mobile) —
one stacked "Card" per record, a top row (primary label left · key
figure right, both `--text-body`/`18px`) and a meta row
(`--text-secondary`/`--text-sm`, `·`-joined). Desktop filter toolbar →
the mobile **dropdown-chip row** Session A established (see §1). Payment/
asset drawers on mobile = full-screen or bottom sheet per the kit's
existing `Drawer` mobile behaviour.

---

## 4. Your tasks this session (in priority order)

### TASK 1 — Roll the new filter toolbar onto the standalone A1 / A3 / A4 artboards

Session A applied the new toolbar to the **merged Sales** artboards only.
The standalone artboards still show the old pill bar. Bring them in line
so there is **one filter pattern in the file**.

**1a. A3 standalone + mobile** — `FA1-0`, `GIA-0`, and the A3 state/
drawer artboards (`FYX-0` read-only detail drawer, `G4I-0` correction
form drawer, `GCP-0` linked row-group). Replace the pill filter bar with
the Session-A **Filter Toolbar** (clone `IEA-0`); replace the mobile pill
row with the Session-A **mobile dropdown-chip row** (clone `IKQ-0`'s
sibling `IKW-0` "Mobile Filter Row"). **Do NOT change the tab framing** —
these standalone A3 artboards can either (i) be re-titled as the merged
"Sales / Restaurant Orders" tab sub-states (preferred — matches the
merge, keeps one canonical screen), or (ii) be marked superseded by the
`[M2-SA]` set. **Recommend (i)**; confirm with the owner if unsure.

**1b. A4 standalone + mobile** — `GL2-0`, `GRM-0` (product never
counted), `H4I-0`. Same treatment with the **Product/Date-only** toolbar
variant (clone `IEY-0`).

**1c. A1 Customers** — `DU2-0`, `DZ0-0`, `E41-0`, `E97-0`, `EJ6-0`,
`EEE-0`, `EPJ-0` (mobile). A1's current filter row is a **"Has balance"
pill + a search field**. Convert to the toolbar idiom: keep the search
field, turn "Has balance" into a **labelled toggle** (`Has balance` +
kit toggle switch, `6CG-0`) sitting in the same toolbar row, right-align
the count + `Reset`. **This is the fidelity-reference screen — be
surgical.** Screenshot before/after; if the toggle-in-toolbar reads
worse than the current pill, STOP and flag it rather than shipping a
regression.

> **Escalation already on record from Session A:** "Filter-toolbar
> pattern is now the standard but only the merged Sales artboards use it.
> A1, A3-standalone, A4-standalone (+ mobiles) still show the old pill
> filter bar and need a re-spin." — that is this task.

### TASK 2 — Admin Ledger mobile: verify + annotate

Owner reported: `/admin/financials` **stock ledger, desktop ✅**;
**mobile is poor / may never have been designed properly.** Artboard
`8Q4-0` exists. **Screenshot `8Q4-0`, read the current source
(`app/admin/financials/` stock-ledger portion + `app/admin/stock/`),
produce a precise per-screen delta checklist** a Developer can execute
mechanically. If `8Q4-0` is missing a state the screen needs (error?
filtered-empty?), create **just that one state artboard** from the kit
and note it. Put the checklist in `docs/design/fidelity-audit-m1.md`
(new doc — see Task 5).

### TASK 3 — NEW: Admin Financials — mobile artboard

Base on the desktop `7ZJ-0`. There is **no mobile view and no mobile
artboard** — design one.

Contents to carry to mobile (all present on `7ZJ-0`):
- the **KPI stat strip** (intentionally unwired `TODO(mock)` for M3 —
  keep it visually present; on mobile collapse to a 2-up or stacked
  hairline stat strip, `6R4-0`);
- the **transactions tabs** — All Transactions / Stock Purchases /
  Operating Expenses / Owner Draws → a **horizontally-scrollable
  dropdown-chip / tab row** matching what `8Q4-0` + the kit already
  established (do **not** invent a new pattern);
- the **transactions table** → **stacked-row list** (per `8Q4-0` /
  `EPJ-0` collapse pattern);
- the **reconciled-outflows footer**;
- the **Reconciliation section** per `financials-reconciliation-flow.md`
  (the recon-as-table redesign — status dot + text, Action column
  "Record payment" on the actionable row; on mobile the Action becomes a
  full-width button inside the card).

**States:** populated / empty / loading / error. **Payment drawer on
mobile** = full-screen or bottom sheet, matching the kit's existing
drawer mobile behaviour (`85W-0` / `AYB-0` is the desktop source).

Name artboards `Admin Financials — mobile [M2-A2]`, `… mobile empty
[M2-A2]`, etc. Place them in a fresh horizontal row (e.g. `worldY
25200`).

### TASK 4 — NEW: Admin Assets — mobile artboard

Base on desktop `8DL-0`. **No mobile view, no mobile artboard** — design
one. Same table→stacked-row collapse. Asset drawer (`8JO-0`) and delete
dialog (`8IV-0`) mobile behaviour per kit (`FrictionDeleteDialog` with
`showTypeToConfirm` as the desktop uses it). **States:** populated /
empty / loading / error. Name `Admin Assets — mobile [M2-A2]` etc.,
fresh row (e.g. `worldY 26400`).

### TASK 5 — VERIFY + ANNOTATE the Store-Manager / Canteen screens

The owner reported these "**look nothing like**" their Paper designs.
Produce a **per-screen delta checklist** a Developer can execute
mechanically. **This is a checklist, not a redesign — time-box it.**

For each: **screenshot the Paper artboard**, **read the matching source
file**, list concrete buildable deltas. Example item shapes:

- "Header uses a plain `<h1>`; artboard uses `FlowHeader` with back
  chevron + step label — swap to `<FlowHeader>`."
- "Quantity control is a bare `<input type=number>`; artboard + kit
  require `QuantityStepper` — swap."
- "Rows are `<div>` cards with borders; §4 says tables are
  square-cornered hairline `SimpleTable` — convert."
- "Missing the empty state entirely — artboard `986-0` shows an
  `EmptyState` with copy '…' — add it."
- "Stock-levels query is not location-scoped — must filter to the
  Canteen `ProductLocation` set (domain check for the build session,
  note it)."

| Screen | Artboard | Source file |
|---|---|---|
| Admin Ledger mobile | `8Q4-0` | `app/admin/financials/` stock-ledger portion + `app/admin/stock/` |
| SM Receive goods | `8XH-0` | `app/store-manager/flows/receive/` (+ `receive/receive-flow.tsx`) |
| SM Issue to kitchen | `8XH-0` | `app/store-manager/flows/issue/` + `issue-production-flow.tsx` |
| SM Record production | `8XH-0` | `app/store-manager/flows/production/` + `issue-production-flow.tsx` |
| SM Transfer to canteen | `92M-0` | `app/store-manager/flows/transfer/` + `transfer-nonsale-flow.tsx` |
| SM Log wastage / non-sale | `92M-0` | `app/store-manager/flows/non-sale/` + `transfer-nonsale-flow.tsx` |
| SM Stock levels (restaurant items only) | `986-0` | `app/store-manager/stock/stock-levels-view.tsx` |
| Canteen Stock levels (canteen items only) | `9GW-0` | `app/canteen/stock/page.tsx` |
| Canteen Transfer dispatch | `9FE-0` | `app/canteen/transfer/transfer-dispatch-flow.tsx` |
| SM Mobile Hub (quick check only) | `8T3-0` | `app/store-manager/hub-client.tsx` |

Also review (structure/layout/component/spacing/mobile-handling against
the artboard + kit): `app/store-manager/flows/flow-scaffold.tsx`.

Common flags to look for: wrong component used, missing states, layout
that doesn't match, wrong spacing scale, missing mobile handling.

If an artboard is genuinely missing a state the screen needs, create
**just that one state artboard** from the kit and note it.

**Output doc:** create `docs/design/fidelity-audit-m1.md` (the M1 flow
screens predate the flow-doc practice, so a dedicated audit doc fits
better than shoehorning into a flow doc). One `##` section per screen,
each a checklist of concrete buildable items. Task 2's Ledger-mobile
checklist goes here too.

### TASK 6 — Update flow docs

- **`restaurant-sales-flow.md`** — add a status note at the top: A3 is
  now the **"Restaurant Orders" tab of the merged "Sales" screen**
  (`[M2-SA]` artboards, `worldY 24000`); nav loses the separate
  "Derived sales" link; the pill filter bar is replaced by the **filter
  toolbar** (describe it — see §1). Update the "Artboards" list.
- **`canteen-derived-sales-flow.md`** — same: A4 is now the **"Canteen
  Derived" tab**; filter toolbar (Product + Date range variant).
  Update the "Artboards" list.
- **`customers-credit-flow.md`** — the A3 section: note the merge + the
  toolbar; update A1's filter description (Has-balance → labelled toggle
  in the toolbar). Update the "Artboards" list.
- If a flow doc has a decisions section, add an ADR-style note; else a
  short status note at the top. Do **not** stack `> UPDATED` blocks —
  one note (CONVENTIONS §6 / guardrail 4).

### TASK 7 — Output summary for the orchestrator

A tight summary with:

- Every artboard created (name + one-line purpose).
- Every artboard updated (name + what changed).
- Every flow doc / audit doc created or updated.
- The full per-screen delta checklists **or** a pointer to
  `fidelity-audit-m1.md` — this IS the spec the build sessions consume.
- Anything escalated (new component needed? real design ambiguity?
  domain/scoping issue for the build sessions? A1 toggle-in-toolbar
  regression?).
- Your recommended **build batching** for the orchestrator (e.g.
  3a merged-Sales toolbar rollout to A1/A3/A4, 3b Admin Financials +
  Assets mobile, 3c SM flows fidelity fixes, 3d Canteen fidelity fixes).
- Confirm: **no code written, no kit changed, no M3 work done.**

---

## 5. Guardrails

- **One canonical version of each screen** in Paper. Don't leave
  half-duplicates. When you supersede an old artboard, either update it
  in place or clearly rename it `— superseded [M2-SA/A2]`.
- **Compose from the proven kit.** Do NOT invent a new component — if one
  seems unavoidable, STOP and flag it.
- **Light mode only.** `tabular-nums` on numeric columns. Accent ≲5%
  pixels. Square-corner tables. Hairline dividers, no card borders/
  shadows.
- **`get_computed_styles` for exact values** — never eyeball a
  screenshot for a number.
- **Screenshot top-level artboards** for review, not inner frames.
- **`get_screenshot` after each meaningful change** and run the Paper
  guide's checkpoint list (spacing / typography / contrast / alignment /
  artboard fit / repetition).
- **Time-box the VERIFY/ANNOTATE work** (Tasks 2 & 5) — it's a
  checklist, not a redesign. Tasks 3 & 4 (the two new mobile artboard
  sets) and Task 1 (toolbar rollout) are the priority deliverables.
- Switch an artboard to `height: "fit-content"` via `update_styles` if
  content clips — don't guess fixed heights.
- Do not put raw node IDs in the user-facing summary prose.
- `finish_working_on_nodes` when done.

## 6. Do NOT

- Touch `lib/`, `app/`, `components/`, tests, Prisma.
- Design anything for Milestone 3.
- Invent a new kit component without escalating.
- Change the **Customers** screens' *content* or the **Catalog**
  screens (Task 1c only adjusts A1's filter row to the toolbar idiom —
  nothing else on A1/A2).
- Re-do the merged Sales screen — it's done (`[M2-SA]`, `worldY 24000`).
- "Improve" the design system — you compose what exists.
- Stack `> UPDATED` blocks in any doc.
