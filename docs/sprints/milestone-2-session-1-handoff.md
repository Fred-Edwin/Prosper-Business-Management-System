# Sprint M2-01 — M2 Sales, Credit & Canteen Derived Sales (Design Sprint)

> Filename is milestone-scoped (`sprint-m2-01-…`) on purpose: the plain
> `sprint-06` slot was burned by the scrapped M1 "Sprint 06 — Design
> export" (see `docs/PROGRESS.md`). This is **Session 1 of Milestone 2**.

**Milestone:** 2 — *Staff can sell, every day*
**Type:** Design Sprint (Phase 3 Feature Loop — Phase A only)
**Session #:** 1 of 7 (see `milestone-2-plan.md` §7)
**Role:** Product Designer (feature-scoped) — **one role, this session**
**Paper.design file:** "Prosper Hotel" — fileId `01M0EZ7TAHZM26KBMWNYT0928X` (the one canonical visual source of truth; do not start a new file)
**Target routes (for later sessions, not this one):** `app/cashier/**`, `app/admin/customers/**`, `app/admin/orders/**`, `app/admin/canteen/**`, `app/canteen/**`
**Status:** ready-to-start

---

## 0. What this session is — and is not

This is a **Design Sprint**. Per `CLAUDE.md` and `docs/design/export-workflow.md`,
a Design Sprint session **writes no real logic** — no `lib/domain`, no
`app/api`, no route wiring, no hooks, no `components/kit/*` changes. If you
find yourself editing anything under `lib/`, `app/api/`, or `components/kit/`,
stop — you have left the sprint.

**As of Milestone 2 the Design Sprint also does not export a code skeleton.**
There is no `get_jsx` transcription, no `fixtures.ts`, no `/design-preview/<slug>`
route, no `TODO(mock)` layer. The M2 flow is: this session produces **approved
Paper artboards + flow docs + a confirmed new-component list**; Session 2
builds any new kit component; Sessions 3–5 build the backend; Session 6
screenshots these artboards and assembles the real screens from the proven
kit. See `export-workflow.md` "As of Milestone 2 the flow simplified further."

**§3.8 is already decided (owner, 2026-08-29): BLOCK.** An order cannot be
saved while any line's quantity exceeds the current derived Restaurant
balance; the balance never goes negative. Design C2 *to* this — an inline,
per-line "only N available" treatment that prevents adding/confirming the
line — do not re-open the question.

**Deliverables of THIS session (all three required):**

1. Every M2 screen (C1–C6, A1–A4, K1–K2) as an approved artboard in the
   canonical Paper file, including every structurally-distinct screen-state
   (drawer open, empty, filtered-empty, error, loading) as its own artboard.
2. Three flow docs written now, at the start of this feature's design work:
   `docs/design/flows/restaurant-sales-flow.md`,
   `docs/design/flows/customers-credit-flow.md`,
   `docs/design/flows/canteen-derived-sales-flow.md`.
3. The **final** new-component list — for each: a one-line spec, which
   screens use it, and whether it is genuinely new or an existing kit
   component with a new variant/prop. This list is the input to Session 2
   (Kit Sprint). **If the list is empty, say so explicitly in the Session
   Notes** — Session 2 is then skipped and M2 becomes a 6-session milestone.
   Capture the §3.8 BLOCK behaviour in `restaurant-sales-flow.md` (the
   C2 inline "only N available" per-line treatment; save disabled while
   any line is over) — it is a decided contract, not an open question.

---

## 1. Required context & reading

Read before designing — this is a hard requirement, not a suggestion
(`CLAUDE.md`):

- **`docs/sprints/milestone-2-plan.md`** — the authoritative living plan.
  §1 scope, §3 cross-cutting contracts, §5 screen list, §6 candidate
  components, §8 the 7 guardrails. This sprint file elaborates §5/§6; the
  plan wins on any conflict.
- **`docs/design/design-principles.md`** — house tokens, approved component
  families, shell patterns. **§9 is an ENFORCED interaction contract.**
- **`docs/design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md`** — density, hairline
  dividers, `tabular-nums`, typography hierarchy, the "AI-slop" anti-patterns
  to avoid.
- **`docs/design/export-workflow.md`** — Phase A rules: assemble from the
  proven kit, never invent; extract-as-you-go into one canonical component
  artboard with all states; structurally-different screen-states get their
  own artboards; exit criteria = no component has two divergent versions
  anywhere in the file.
- **`docs/design/kit-audit.md`** + **`docs/design/component-states.md`** §2/§9
  — what each kit component already does and its state matrix, so you reuse
  rather than re-draw.
- **`docs/PRD.md`** §4.3 (Restaurant Sales / Orders), §4.4 (Canteen Derived
  Sales), §4.6 (Customers & Credit) — the acceptance ground truth.
- **ADRs:** ADR-15 (corrections are new rows), ADR-16 (orders & derived
  sales), ADR-17 (money as a derived ledger), ADR-19 (customers / debt /
  repayment), ADR-24 (day close — the boundary M2 respects but does not
  build), ADR-25 (audit trail), ADR-29 (Africa/Nairobi day boundary),
  ADR-30 (Decimal money), ADR-42 (kit gating), ADR-48 (new-component model).
- **`docs/design/flows/financials-reconciliation-flow.md`** — the existing
  flow-doc format to match.

---

## 2. Cross-cutting contracts these screens must reflect (from plan §3)

The screens are a **design** surface, but they must not contradict the
already-settled domain contracts. Design to these:

1. **Money ledger is live and derived.** Any balance shown (Cash at hand,
   M-Pesa/Bank, customer credit) is a sum of append-only rows — never
   presented or labelled as a stored/editable number.
2. **Order money effect.** Cash / M-Pesa order → one money movement.
   **Credit order → no money movement**; it creates a `Debt` and
   **`customerId` is required** (C3 must not allow "Credit" to be
   confirmed without a customer attached).
3. **Correction = a new append-only row.** C4 / A3 show "Correct this"
   producing a **new** order entry, never an in-place delete or overwrite.
   No delete affordance on a posted order anywhere.
4. **Staff edit window.** A Cashier edits their **own** order **only while
   the day is open** — M2's soft rule: the order's `Africa/Nairobi`
   business day equals today. After that, the screen offers the Admin
   correction path, not an edit form. C1 surfaces day-open status; C4
   switches its primary action on it.
5. **Canteen derived sale.** K1 previews
   `sold = opening + received − non-sale consumption − counted remaining`
   for the period since that product's previous count, then on save sets
   closing = counted value and records a Cash revenue movement
   (`sold × canteen selling price`). **No credit, no M-Pesa at the canteen
   in M2** unless this session finds a real reason otherwise — if so, flag
   it, don't design it in silently.
6. **Role scoping.** Cashier screens never show `buyingPrice`, unit cost,
   or margin. Admin screens show everything. A Cashier sees only their own
   orders (C1, C4); A3 is the all-cashiers view and is Admin-only.
7. **Audit.** Not a screen, but every mutating action these screens trigger
   writes an `AuditLog` row — don't design an action that implies a silent
   change.

---

## 3. Screens to design

Every screen is designed **mobile-first**. Where a screen has a materially
different desktop form (Admin tables especially), design both artboards —
the mobile one is a purpose-built handheld UX, not a squashed table.

### 3.1 Cashier — mobile-first, one-handed (`app/cashier/**`)

The Cashier shell today is a placeholder (`app/cashier/page.tsx`); this
session defines the real screens. Reuse the staff mobile shell pattern
(bottom nav / `<BottomNav>`, `<FlowHeader>`, `<BottomSheet>`) already proven
in the kit and used by store-manager / canteen.

| ID | Screen | Purpose & key elements | States to draw |
|---|---|---|---|
| **C1** | Cashier Hub / Today | Today's **own** orders list, running total for the day, day-open status indicator, prominent "New order" CTA. Each row: time, order type, total, payment method, `CORRECTED` marker if applicable. | populated; empty (no orders yet today); day-closed banner state; loading |
| **C2** | New Order — build | Searchable product picker (kit `<Select searchable>` or the candidate customer/product picker), line list with `<QuantityStepper>` per line, live running-total bar (sticky footer). Add / remove line; empty line-list state before first item. | empty (no lines); populated (several lines); item-not-in-location / out-of-stock inline treatment per §3.8 decision |
| **C3** | New Order — checkout | Order-type segmented control (Dine-in / Takeaway / Delivery); **conditional** delivery-fee field (visible only for Delivery); payment-method selector (Cash / M-Pesa / Credit); when **Credit** → customer-attach block appears inline (see C5). Confirm button. | Cash selected; M-Pesa selected; Credit selected + no customer (confirm disabled); Credit selected + customer attached; Delivery type showing fee field |
| **C4** | Order detail / edit | View one own order. **Day open:** inline edit of lines / type / payment (re-uses C2/C3 controls). **Day closed:** read-only view + "Correct this" routing to the Admin correction path (Cashier cannot self-correct). | day-open editable; day-closed read-only; a corrected order showing the correction link |
| **C5** | Customer attach / quick-create | Invoked inline from C3 when payment = Credit. Searchable customer list; "Add new customer" affordance inline (name + phone, minimal); on select, returns to C3 with the customer attached. | search with results; no match → quick-create form; quick-create validation error (phone) |
| **C6** | Customers list + balances (mobile) | Cashier views customer credit balances and records a repayment. Row: name, phone, **derived** balance. Tapping a row → repayment bottom-sheet (amount, Cash / M-Pesa in). | populated; empty; repayment sheet open; repayment success (toast) |

### 3.2 Admin — desktop + mobile (`app/admin/**`)

Match the existing Admin shell (`<PageShell>`, sidebar, breadcrumbs,
`<SimpleTable>` / `<DenseLedger>`, drawers, `top-right` toasts).

| ID | Screen | Purpose & key elements | States to draw |
|---|---|---|---|
| **A1** | Customers & Credit register | Table: name, phone, **derived** balance, last activity; filters (has-balance, search). Record-repayment **drawer** (amount, account in, note). "Add customer" drawer. | populated; filtered-empty (`<EmptyState variant="filtered">` + Clear filters); genuinely-empty; error (fetch fail, `<ErrorState>` + Retry); repayment drawer open; add-customer drawer open |
| **A2** | Customer detail | One customer's debt / repayment **ledger**, interleaved, with a running balance column (`<DenseLedger>`). Header: name, phone, current derived balance. Record-repayment action. | populated ledger; customer with zero history; loading |
| **A3** | Orders list (Admin) | **All** orders, all cashiers. Columns incl. cashier, time, type, total, payment method, status; filters (cashier, date, payment method, corrected-only). **Read-only** + "Correction entry" action opening a correction drawer (new offsetting order row). | populated; filtered-empty; empty; error; correction drawer open; a row group showing an order + its correction linked |
| **A4** | Canteen Derived Sales view | Per product: last-counted-at, the period a figure covers, units sold, revenue. Answers PRD §4.4 "Admin sees when it was last counted and what period a figure covers." Filter by product / date range. | populated; a product never counted yet; filtered-empty; loading |

### 3.3 Canteen Attendant — mobile-first (`app/canteen/**`)

The Canteen hub already exists (M1). K2 is an addition to it, not a new
screen; K1 is new.

| ID | Screen | Purpose & key elements | States to draw |
|---|---|---|---|
| **K1** | Stock Count | Pick product; enter counted-remaining; **preview card** "since last count on {date}: sold {n}, revenue KES {y}" shown **before** the attendant confirms; confirm writes the count + derived sale. | product picker; count entered + preview shown; first-ever count for a product (no prior period — preview copy differs); confirm success (toast); validation error (negative / non-numeric) |
| **K2** | Canteen Hub — derived sales in the log | Today's derived sales appear in the **existing** hub timeline (`<ActivityTimeline>`), styled consistently with existing movement entries. No new screen — a new entry type in the current feed. | timeline with a derived-sale entry; timeline with derived-sale + other movements interleaved |

---

## 4. Candidate new components (plan §6 — this session confirms, Session 2 builds)

For each: decide **new kit component** vs **new variant/prop on an existing
one** vs **not needed (compose from existing)**. Anything genuinely new gets
the full ADR-42 treatment in Session 2 (§9 contract, Storybook story per
state, visual-regression baseline, axe, `postVisit`) **before any screen
composes it** (guardrail 1). Assume the answer is "compose from existing"
unless a screen truly cannot be built from the current kit.

| Candidate | One-line spec | Likely verdict to test |
|---|---|---|
| Order-line editor | Repeatable row: product + `<QuantityStepper>` + unit price + subtotal; add / remove; empty state | Possibly composable from `<QuantityStepper>` + layout; confirm |
| Payment-method selector | Segmented (Cash / M-Pesa / Credit) with the Credit → customer-attach branch surfaced | Likely a `<SegmentedControl>` variant + screen-level branch, not new |
| Running-total bar | Sticky footer showing order total, updates as lines change | Likely new (no sticky-footer-summary primitive); check `<DenseSummaryStrip>` |
| Customer picker + quick-create | Searchable select over customers with inline "add new" | `<Select searchable>` may already cover; the inline-create affordance may be the only new bit |
| Derived-sales preview card | "since last count on {date}: sold {n}, revenue KES {y}" before confirm | Check `<CalculatedImpactBanner>` / `<InstructionalBanner>` before declaring new |

Existing kit that likely covers most of these: `segmented-control`,
`quantity-stepper`, `select` (searchable mode), `bottom-sheet`, `drawer`,
`dense-summary-strip`, `calculated-impact-banner`, `activity-timeline`,
`simple-table`, `dense-ledger`, `empty-state`, `error-state`, `toast`.

---

## 5. Design principles & non-negotiables (this feature)

- **Light mode only**, house tokens only — no raw hex (the sole exception on
  record is `--color-gold-brand` for the masthead). No gradients, no
  decorative icons, ≤2–3 font weights doing real work.
- **Dense tables:** 0px corners, 1px hairline dividers, `tabular-nums` on
  every money / quantity column, signed colour coding (green `+`, red `−`)
  consistent with the M1 stock ledger.
- **Money is always shown as KES with 2 decimals**, right-aligned, tabular.
  Never a bare float.
- **Derived values are never presented as editable.** Balances, running
  totals, "sold since last count" are outputs — style them as read-out,
  not as inputs.
- **No disconnected workflows.** Customer quick-create happens inline in the
  checkout flow (C5 from C3), not as a separate errand. Repayment is a
  drawer/sheet on the register, not a separate page.
- **Every screen has its empty, filtered-empty, error and loading states
  designed** (guardrail 6) — not left for the Development Sprint to invent.
- **One canonical component artboard.** Extract-as-you-go; every later use
  reuses it; no divergent second version anywhere in the file
  (`export-workflow.md` Phase A exit criteria).

---

## 6. §3.8 — decided: BLOCK insufficient-stock order lines

**Decided by the owner, 2026-08-29 (plan §3.8 / changelog).** An order
**cannot be saved** while any line's quantity exceeds the current derived
Restaurant balance for that product; the balance is never allowed to go
negative. `createOrder` / `editOwnOrder` reject naming the short line(s)
and write nothing.

Design C2 to this:

- Per line, once a product is chosen, show its available quantity ("only
  {N} available") near the stepper.
- If the entered quantity exceeds available, the line reads as an error
  state (inline, per line — not a modal) and the order's confirm/save
  action is disabled until every line is within stock.
- No "allow anyway" / override affordance.

Capture this in `restaurant-sales-flow.md`. It is not an open question —
do not design an allow-negative path.

---

## 7. Acceptance criteria (Design Sprint — Phase A only)

### Paper deliverables
- [ ] C1–C6 artboards created in the canonical Paper file (mobile; desktop
      only where materially different).
- [ ] A1–A4 artboards created (desktop **and** mobile).
- [ ] K1 artboard created; K2 shown as a new entry type in the existing
      Canteen hub timeline artboard.
- [ ] Every structurally-distinct screen-state listed in §3 exists as its
      own artboard (drawer/sheet open, empty, filtered-empty, error,
      loading).
- [ ] Every component used is pulled into **one** canonical component
      artboard with all its states; **no component has two divergent
      versions** anywhere in the file.
- [ ] Token audit: no raw hex, 14px base, hairline borders, Lucide icons,
      `tabular-nums` on numeric columns.

### Flow docs
- [ ] `docs/design/flows/restaurant-sales-flow.md` written (order build →
      checkout → payment branches → edit-own vs correct; the §6 BLOCK
      behaviour for insufficient stock).
- [ ] `docs/design/flows/customers-credit-flow.md` written (credit order →
      debt; repayment → money movement; balance derivation as seen by
      Cashier vs Admin).
- [ ] `docs/design/flows/canteen-derived-sales-flow.md` written (count →
      preview → confirm → derived sale + closing + revenue movement; the
      period-boundary case).
- [ ] Each flow doc matches the format of
      `docs/design/flows/financials-reconciliation-flow.md`.

### New-component list
- [ ] Final list produced: per candidate, verdict (new component / new
      variant / compose from existing), one-line spec, consuming screens.
- [ ] If **empty**, stated explicitly here and in Session Notes → Session 2
      is skipped, M2 is 6 sessions.

### Discipline
- [ ] **No** files changed under `lib/`, `app/api/`, `components/kit/`,
      `app/**/*.tsx` route files, or any test. This session touches only
      `docs/` and the Paper file.
- [ ] **Session 3 may be running in parallel** (plan §7 "Allowed
      concurrency") — it owns `lib/domain/{financials,customers}` +
      `app/api/customers*` + the money/customers parts of `SCHEMA.md` /
      `API.md`. Stay out of those. If both sessions need to write
      `docs/PROGRESS.md` or `milestone-2-plan.md`, rebase and append.
- [ ] `docs/PROGRESS.md` updated with the Session 1 entry (what was
      designed, the new-component verdict, anything flagged).
- [ ] `milestone-2-plan.md` §7 status for Session 1 updated; §10 changelog
      line added if sequencing changed (e.g. Session 2 dropped).
- [ ] This file's `Status:` set to `completed`.

---

## 8. Session Notes

*(Live notes added during the session.)*

- **§3.8 (insufficient Restaurant stock):** DECIDED before this session —
  BLOCK (see §6). Nothing to decide; just design C2 to it.
- **New-component verdict:** _TBD — list, or "none; Session 2 skipped"._
- **Paper artboard links:** _add per-screen frame URLs as created._
- **Flags / escalations:** _none yet._

---

## 9. Handoff to the next session

- **Session 3 (Development Sprint — money ledger + Customers & Credit)**
  can start immediately and run in parallel with this session; it does
  not wait on the artboards. Its handoff:
  `docs/sprints/milestone-2-session-3-handoff.md`.
- **If this session identifies new components →** Session 2 (Kit Sprint):
  design each new component's states in Paper, build in `components/kit/*`
  with the full ADR-42 gate, no screens. It may overlap Sessions 4/5.
- **If none →** Session 2 is skipped; set the plan §7 count to 6 and add
  a §10 changelog line.
- The assembled screens are built in **Session 6** from these artboards
  (screenshot → assemble kit → wire to `lib/domain`), per
  `export-workflow.md` Phase C2 — after S3–S5 land.
