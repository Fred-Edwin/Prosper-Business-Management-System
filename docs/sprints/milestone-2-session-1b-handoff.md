# Sprint M2-01b — Admin & Canteen screens (Design Sprint, Phase A)

**Milestone:** 2 — *Staff can sell, every day*
**Type:** Design Sprint (Phase 3 Feature Loop — Phase A only)
**Session #:** 1b of Milestone 2 (Session 1 was split — see
`milestone-2-plan.md` §7 / §10 and `milestone-2-session-1-handoff.md` §8)
**Role:** Product Designer (feature-scoped) — **one role, this session**
**Paper.design file:** "Prosper Hotel" — fileId
`01M0EZ7TAHZM26KBMWNYT0928X`, page **"Shell+Component kit"** (the one
canonical visual source of truth — do **not** start a new file)
**Target routes (for later sessions, not this one):**
`app/admin/customers/**`, `app/admin/orders/**` (or `app/admin/sales/**`),
`app/admin/canteen/**` (or a "Derived sales" sub-nav), `app/canteen/**`
**Status:** ready-to-start

---

## 0. What this session is — and is not

**This is the second half of M2's Design Sprint.** Session 1a
(`…-session-1-handoff.md`) delivered the **Cashier** screens (C1–C6, 22
artboards), the **three flow docs** (all of M2), the **§3.8 decision**
(BLOCK), and the **new-component verdict** (one kit change:
`QuantityStepper` tap-to-type — Session 2 builds it). Session 1b delivers
the **Admin** screens (A1–A4) and the **Canteen** screens (K1–K2).

Per `CLAUDE.md` and `docs/design/export-workflow.md`, a Design Sprint
session **writes no real logic** — no `lib/domain`, no `app/api`, no route
wiring, no hooks, no `components/kit/*` changes. If you find yourself
editing anything under `lib/`, `app/api/`, `components/kit/`, `app/**/*.tsx`,
or any test — stop, you have left the sprint. **This session touches only
`docs/` and the Paper file.**

**As of Milestone 2 the Design Sprint also does not export a code
skeleton** — no `get_jsx` transcription, no `fixtures.ts`, no
`/design-preview/<slug>` route, no `TODO(mock)` layer. Session 6
screenshots these artboards and assembles the real screens from the
proven kit.

**Deliverables of THIS session (all four required):**

1. **A1–A4 artboards** in the canonical Paper file — **desktop AND
   mobile** per screen (the Admin mobile screen is a purpose-built
   handheld view, not a squashed table), including every
   structurally-distinct screen-state as its own artboard (drawer open,
   empty, filtered-empty, error, loading, linked row-group).
2. **K1 artboards** (new screen) + **K2** shown as a **new entry type in
   the existing Canteen hub timeline** (`9BA-0`) — not a new screen.
   Every K1 state as its own artboard.
3. Every **new pattern** these screens introduce pulled into **one**
   canonical component artboard with all its states — extend the
   existing **"Component Kit — M2 Sales Patterns [M2-01]"** artboard (or
   the relevant kit artboard) rather than drawing a divergent second
   version anywhere.
4. **Update each flow doc's "Artboards" section** with the frames you
   create, and flip the "Artboard status" note at the top of
   `customers-credit-flow.md` and `canteen-derived-sales-flow.md` from
   "deferred to Session 1b" to done.

**No new design decisions get made here that aren't already settled by
the flow docs.** If a screen needs something the flow doc + the kit +
the M2-01 patterns don't cover, **stop and flag it in `PROGRESS.md`** —
it is not yours to invent.

---

## 1. Required context & reading

Read before designing — hard requirement, not a suggestion (`CLAUDE.md`):

- **`docs/design/flows/customers-credit-flow.md`** — the authoritative
  narrative for A1 (Customers & Credit register), A2 (Customer detail
  ledger), A3 (Orders list + correction drawer). It lists the exact
  columns, states, walkthroughs, and the "M2 Sales Patterns" reuse.
  **The screens must match this doc.**
- **`docs/design/flows/canteen-derived-sales-flow.md`** — the
  authoritative narrative for K1 (Stock Count), K2 (hub timeline entry),
  A4 (Canteen Derived Sales view). Includes the **period-boundary case**
  and the **first-ever-count** copy variant — both must be drawn.
- **`docs/design/flows/restaurant-sales-flow.md`** — §"New components"
  (the composed patterns and the one kit change) and the §3.8 BLOCK
  treatment. A3's correction drawer re-uses the C2 order-line row +
  `QuantityStepper` pattern; K1's product picker re-uses the **C2
  category tab row**.
- **`docs/sprints/milestone-2-plan.md`** — §1 scope, §3 cross-cutting
  contracts (money ledger live & derived; correction = new row, no
  delete; role scoping — Admin sees everything incl. `buyingPrice` /
  margin and which cashier took each order; audit), §5 screen list, §6
  (the confirmed new-component list — nothing new to add unless A/K
  genuinely need it), §8 the 7 guardrails.
- **`docs/design/design-principles.md`** — house tokens, the two shells
  (§2: Admin desktop shell + staff mobile shell), the table corrections
  (§4: square corners, no avatar in attribution columns, the Dense
  Ledger shape, `SimpleTable` vs `DenseLedger`, `--font-mono` numeric
  cells), **§9 the ENFORCED interaction contract**.
- **`docs/design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md`** — density,
  hairline dividers, `tabular-nums`, the filter-bar rules (§6:
  chip-based, always show a result count + Clear all, applied filters
  visible without opening anything), the "AI-slop" anti-patterns.
- **`docs/design/export-workflow.md`** — Phase A rules: assemble from the
  proven kit, never invent; extract-as-you-go into one canonical
  component artboard with all states; structurally-different
  screen-states get their own artboards; exit criteria = no component
  has two divergent versions anywhere in the file.
- **`docs/design/kit-audit.md`** + **`docs/design/component-states.md`**
  §2/§9 — what each kit component already does and its state matrix.
- **`docs/PRD.md`** §4.3 (Orders), §4.4 (Canteen Derived Sales), §4.6
  (Customers & Credit) — the acceptance ground truth.
- **ADRs:** ADR-15 (corrections are new rows), ADR-16 (orders & derived
  sales), ADR-17 (money is a derived ledger), ADR-19 (customers / debt /
  repayment), ADR-24 (day close — the boundary M2 respects but does not
  build), ADR-25 (audit trail), ADR-29 (Africa/Nairobi day boundary),
  ADR-30 (Decimal money), ADR-36a (Dense Ledger corrected-cell
  treatment — underlined semantic colour, no chip), ADR-37a/b (Dense
  Ledger `showLocation` / `horizontalScroll`; `Drawer` `variant="rail"`),
  ADR-42 (kit gating), ADR-48 (`Select searchable`).
- **`docs/design/flows/financials-reconciliation-flow.md`** — the
  existing flow-doc format (already matched by the 3 M2 flow docs; use
  it only if you extend a flow doc's structure).

---

## 2. What Session 1a already built (reuse, don't redraw)

**Cashier artboards** (page "Shell+Component kit"), all named `… [M2-01]`:
- `C1 Cashier Today —` populated / empty / day-closed banner / loading
- `C2 New Order Build —` populated / empty / line blocked (insufficient stock)
- `C3 Checkout —` Cash / M-Pesa / Credit no customer / Credit attached / Delivery
  (all **tall bottom-sheet overlays over the dimmed C2**)
- `C4 Order Detail —` day open editable / day closed read-only / corrected order
- `C5 Customer Attach —` search results / no match quick-create / phone error
  (bottom-sheet over the dimmed C3)
- `C6 Customers Mobile —` populated / empty / repayment sheet open / repayment success

**Component artboards:**
- **`Component Kit — M2 Sales Patterns [M2-01]`** — canonical states for:
  - **Order-line row** (product · price · stock · `QuantityStepper` ·
    subtotal · remove) — default / at-min / **over-stock (§3.8 block)**.
    **A3's correction drawer re-uses this.**
  - **Product tile** (C2 grid) — resting / in-order (qty badge) /
    out-of-stock. **K1's product picker may re-use this or a list form.**
  - **Sticky total bar** — default / action-disabled / blocked (danger
    caption).
- **`Component Kit — Form Controls`** (`6CG-0`) — **`QuantityStepper`
  tap-to-type** states (rest / value-focused / at-bound / error). This is
  the **one kit change** (Session 2 builds it). A3's correction line
  editor uses it.

**Patterns established in 1a that A/K should stay consistent with:**
- **Overlay = dimmed parent screen + `.kit-scrim` + panel.** Any A-screen
  whose primary content is a `Drawer` (A1 repayment / add-customer, A3
  correction) is drawn this way — the list/table behind, dimmed, then the
  rail drawer. K1 is a full staff screen (not an overlay); its confirm
  success is a `Toast`.
- **Money & derived values are read-outs** — `--font-mono`, right-aligned,
  `--color-danger` when owing / negative, `--text-tertiary` "Settled" at
  zero. Never styled as an input.
- **Bottom-sheet panel** treatment: 12px top radius, grabber, header +
  X, `--surface-raised` fill, sticky footer. (Admin uses the **rail
  `Drawer`** — right-edge, `w-[420px]`, `border-l`, no radius,
  `--surface-subtle` footer — not the bottom sheet. See ADR-37b.)

---

## 3. Screens to design

Every screen is designed against its flow doc. Where a screen has a
materially different desktop vs mobile form (all four Admin tables),
**design both** — the mobile one is a purpose-built handheld UX.

### 3.1 Admin — desktop + mobile (`app/admin/**`)

Admin desktop shell (`649-0` — 48px top bar, 240px side nav collapsible
to 56px, fluid content, breadcrumbs, `SimpleTable` / `DenseLedger`,
top-right `Toast`). Admin mobile shell (`6B1-0`).

| ID | Screen | Purpose & key elements | States to draw (each its own artboard) |
|---|---|---|---|
| **A1** | Customers & Credit register | `PageShell` + breadcrumb + chip filter bar (**Has balance** toggle, **Search**, result count + **Clear all** at ≥2 filters). `SimpleTable`: **Name · Phone · Balance (derived, mono) · Last activity · (row → drawer)**. "Add customer" secondary button in the toolbar. Record-repayment **rail `Drawer`** (amount, account-in `SegmentedControl`, optional note). Add-customer **rail `Drawer`** (name, phone, validated). | desktop populated · filtered-empty (`<EmptyState variant="filtered">` + Clear filters, chips still visible) · genuinely-empty (`<EmptyState>` + Add customer) · error (`<ErrorState>` + Retry) · repayment drawer open (over dimmed table) · add-customer drawer open · **mobile** populated |
| **A2** | Customer detail | Header block: **name · phone · current derived balance** (large read-out, `--font-mono`, `--text-h1`, `--color-danger` if owing) + a **Record repayment** action (same drawer as A1). Body: a **`DenseLedger`**-style interleaved `Debt` / `Repayment` table — **Date · Type (Credit order / Repayment) · Reference (order # / note) · Amount (signed, mono) · Running balance (mono, `--weight-semibold` — the reconciled figure)**. `Debt` row `+KES` in `--color-danger`; `Repayment` row `−KES` in `--color-success`. | desktop populated ledger · customer with zero history (header "Settled", inline `<EmptyState>` "No credit history") · loading (header + 3 skeleton rows) · **mobile** |
| **A3** | Orders list (Admin) | `PageShell` + breadcrumb + chip filter bar (**Cashier**, **Date**, **Payment method**, **Corrected only**) + result count + **Clear all**. `SimpleTable`: **Time · Cashier · Type · Total (mono) · Payment · Status · (row → detail/correction)**. Status = plain colored text (table density): "Posted" / "Corrected" / "Correction of #123". **Read-only** — the only mutating action is **"Record correction"**, opening a **rail `Drawer`** that (a) shows the original order as read context, (b) a corrected line list re-using the **M2 Sales Patterns order-line row + `QuantityStepper` tap-to-type**, corrected type / fee / payment, (c) a **`CalculatedImpactBanner`** previewing the stock + money/debt consequence and "Original is kept and marked Corrected", (d) a required **Reason** `Textarea`, (e) a **Record correction** primary button. **No delete affordance on any posted order, anywhere.** | desktop populated · filtered-empty (chips visible) · empty · error · **read-only order-detail drawer open** (over dimmed table) · **correction form drawer open** · **order + its correction as a linked row group** (bracketed pair, correction row indented, "Correction of #{n}" in Reference) · **mobile** |
| **A4** | Canteen Derived Sales view | `PageShell` + breadcrumb + filter row (**Product**, **Date range**). `SimpleTable`: **Product · Last counted (date + relative) · Period covered (span the latest figure covers, e.g. "Mon 25 Aug → Thu 28 Aug") · Units sold (mono) · Revenue (mono)**. A correcting-period **negative** shows in `--color-danger`. Answers PRD §4.4 "Admin sees when it was last counted and what period a figure covers." | desktop populated · **a product never counted yet** (Last counted "Never", Period "—", Units/Revenue muted em-dash — shown so the gap is visible) · filtered-empty (chips visible) · loading · **mobile** |

### 3.2 Canteen Attendant — mobile-first (`app/canteen/**`)

Staff mobile shell (`4Y-0`). K1 uses the **back-navigation `FlowHeader`**
(back chevron + "Stock Count", **no direction badge**). K2 is an addition
to the **existing** Canteen hub (`9BA-0`), not a new screen.

| ID | Screen | Purpose & key elements | States to draw |
|---|---|---|---|
| **K1** | Stock Count | **Pick product** — a `Select searchable` (or short list) of canteen products, **with the same category tab row as C2** (existing `Tabs` over the new `category` field). **Counted-remaining** field (`QuantityStepper` tap-to-type, or numeric `TextInput`, unit label shown). A **preview card** (`CalculatedImpactBanner`, warning-amber, **read-only**) shown **before** confirm: *"Since last count on {date} ({n} days): opening {o} + received {r} − non-sale {c} − counted {rem} = **sold {n} {unit}**. Revenue **KES {y}** ({n} × KES {price}). Closing stock will be set to {rem} {unit}."* **Confirm count** primary in a sticky bar. | product picker (no count entered, no preview) · count entered + preview shown · **first-ever count for a product** (preview copy differs — "First count for {product}… covers everything since {product}'s opening stock was set") · **correcting re-count, negative sold** (preview shows "sold −{n}" in `--color-danger` + caption "A negative here means the last count was low. Recording this reconciles it.") · confirm success (`Toast`) · validation error (blank / non-numeric / negative counted-remaining → §9.8 error pattern on the field, Confirm disabled, no preview card) |
| **K2** | Canteen Hub — derived sales in the log | A derived sale is a **new entry type in the existing `ActivityTimeline`** on `9BA-0`, styled like the existing movement rows: title **"Stock count — {product}"**, subtitle **"{n} {unit} sold since {date} · closing {rem} {unit}"** (`--text-secondary`), trailing value **"+KES {y}"** in `--color-success` `--font-mono` (a correcting negative shows **"−KES {y}"** in `--color-danger`). **No new screen, no new component.** | Canteen hub timeline **with** a derived-sale entry · timeline with a derived-sale **interleaved** with a transfer + an opening-stock row (the visual-consistency check is the acceptance point) |

---

## 4. Candidate new components — Session 1a already ruled

Session 1a's verdict stands: **the only kit change in M2 is
`QuantityStepper` tap-to-type** (Session 2 builds it). Everything the
A/K screens need is already in the proven kit or on the "M2 Sales
Patterns" artboard:

| A/K need | Verdict | Composed from |
|---|---|---|
| A1 / A3 record-repayment / add-customer / correction | compose | `Drawer` (`variant="rail"`, ADR-37b) + `TextInput` / `Textarea` / `SegmentedControl` + `CalculatedImpactBanner` (A3) |
| A2 debt/repayment ledger | compose | `DenseLedger` + a per-screen `rows` mapper (interleaved debts + repayments, running balance column) |
| A3 correction line editor | compose | the **M2 Sales Patterns order-line row** + `QuantityStepper` tap-to-type (the Session 2 change) |
| A1 / A3 / A4 filter bars | compose | `PillFilter` + the chip-based filter-bar pattern (`ENTERPRISE_UI_DESIGN_PRINCIPLES.md` §6) |
| A1 / A3 / A4 empty / filtered-empty / error | compose | `EmptyState` (default + `variant="filtered"`) / `ErrorState` |
| K1 preview card | compose | `CalculatedImpactBanner` (exact fit — `component-states.md` C23) |
| K1 product picker | compose | `Select searchable` + the **C2 category tab row** (`Tabs`) |
| K2 hub entry | compose | `ActivityTimeline` (existing, unchanged) |

**If — and only if — an A/K screen genuinely cannot be built from the
above**, stop and flag it in `PROGRESS.md`. Do not invent a component.

---

## 5. Design principles & non-negotiables (this session)

- **Light mode only**, house tokens only — no raw hex (the sole
  exceptions on record: `--color-gold-brand` masthead, and the schematic
  `rgb(17 24 39 / …)` "dimmed screen behind" fill on overlay artboards).
  No gradients, no decorative icons, ≤2–3 font weights doing real work.
- **Dense tables:** 0px corners, 1px hairline dividers, `--font-mono` +
  `tabular-nums` on every money / quantity column, signed colour coding
  (green `+`, red `−`) consistent with the M1 stock ledger and the M2
  Cashier screens.
- **Money is always KES with 2 decimals**, right-aligned, mono. Never a
  bare float.
- **Derived values are never presented as editable.** Customer balances,
  running balances, "sold since last count" are outputs — style them as
  read-out, not as inputs.
- **Correction = a new append-only row.** A3 shows "Record correction"
  producing a **new** offsetting `Order` entry, never an in-place edit or
  delete. No delete affordance on a posted order anywhere. ADR-36a for
  the Dense Ledger corrected-cell treatment (underlined semantic colour,
  no chip) — A2's ledger follows the same rule if a figure is corrected.
- **No disconnected workflows.** Repayment is a drawer on A1/A2, not a
  separate page. Correction is a drawer on A3.
- **Every screen has its empty, filtered-empty, error and loading states
  designed** (guardrail 6) — not left for the Development Sprint.
- **One canonical component artboard.** Extract-as-you-go; every later
  use reuses it; no divergent second version anywhere
  (`export-workflow.md` Phase A exit criteria). Extend
  "Component Kit — M2 Sales Patterns [M2-01]" if A/K introduce a pattern.
- **Role scoping:** Admin screens show everything — `buyingPrice`, unit
  cost, margin, and which cashier took each order. (The M1 non-admin
  strip does **not** apply here.)

---

## 6. No open questions to resolve this session

§3.8 was decided in 1a (**BLOCK**). The new-component verdict is final
(**one kit change**). The `category` field is flagged, not designed here
beyond the tab row visual (reuse C2's). If something genuinely
unresolved surfaces, escalate in `PROGRESS.md` and mark it BLOCKED — do
not pick an answer ad hoc.

---

## 7. Acceptance criteria (Design Sprint — Phase A only)

### Paper deliverables
- [ ] **A1–A4** artboards created — **desktop AND mobile** per screen.
- [ ] **K1** artboards created; **K2** shown as a new entry type in the
      existing Canteen hub timeline artboard (`9BA-0`), interleaved with
      other movements.
- [ ] Every structurally-distinct screen-state listed in §3 exists as
      its own artboard (drawer open, empty, filtered-empty, error,
      loading, linked row-group, first-count / negative-sold preview
      variants).
- [ ] Every new pattern pulled into **one** canonical component artboard
      with all its states; **no component has two divergent versions**
      anywhere in the file. (Extend "M2 Sales Patterns" as needed.)
- [ ] Token audit: house tokens only, 14px base, hairline borders,
      Lucide icons, `--font-mono` + `tabular-nums` on numeric columns,
      accent ≤5% of pixels.

### Flow docs
- [ ] `customers-credit-flow.md` — "Artboards" section updated with the
      A1–A3 frames; the top "Artboard status" note flipped to done.
- [ ] `canteen-derived-sales-flow.md` — "Artboards" section updated with
      the K1 / K2 / A4 frames; the top "Artboard status" note flipped to
      done.
- [ ] No new design decisions written into the flow docs that weren't
      already settled by 1a. (Clarifying detail is fine; new policy is
      not.)

### Discipline
- [ ] **No** files changed under `lib/`, `app/api/`, `components/kit/`,
      `app/**/*.tsx` route files, or any test. This session touches only
      `docs/` and the Paper file.
- [ ] `docs/PROGRESS.md` updated with the Session 1b entry (what was
      designed, anything flagged).
- [ ] `milestone-2-plan.md` §7 status for Session 1b updated; §10
      changelog line added only if sequencing changed.
- [ ] This file's `Status:` set to `completed`.

---

## 8. Session Notes

*(Live notes added during the session.)*

- **Artboard links / frame ids:** _add per-screen as created._
- **Patterns added to "M2 Sales Patterns" (if any):** _list._
- **Flags / escalations:** _none yet._

---

## 9. Handoff to the next session

- **Session 2 (Kit Sprint — Developer)** — builds the `QuantityStepper`
  tap-to-type value (states from `6CG-0`, full ADR-42 gate). Independent
  of 1b; may run in parallel. Must land before Session 6.
- **Sessions 4 / 5 (Development Sprint — Developer)** — Orders and the
  Canteen derived-sales slice. Build on Session 3 (done). Do not wait on
  1b's artboards.
- **Session 6 (Development Sprint — Developer)** — assembles **all** M2
  screens (Cashier from 1a, Admin + Canteen from 1b) into their real
  routes from the Paper screenshots, wires to `lib/domain`, adds
  `use-orders` / `use-customers` hooks and per-screen jsdom+RTL specs,
  then the owner walkthrough. Needs 1a + 1b artboards, Session 2's proven
  component, and Sessions 3–5's domain.
- **Session 7 (QA Sprint)** — adversarial pass against every M2
  acceptance criterion, the 3 flow docs, and the approved screens.
