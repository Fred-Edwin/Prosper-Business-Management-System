# Prosper — Design System Plan

**Status:** Approved
**Author:** Design Sprint (planning only — no screens built in this session)
**Governs:** `docs/design/design-principles.md` (to be extracted from this
plan once approved), the Paper.design component library, and every
feature-level Design Sprint that follows.

**Read first:** `docs/PRD.md`, `docs/ARCHITECTURE.md`,
`docs/design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md` (binding house style),
`docs/CONVENTIONS.md` §4 (correction-entry pattern — shapes several
component specs below).

This document is a blueprint, not an implementation. Nothing here is
built yet. The next session (Phase 2, Part B of `docs/sdlc.md`) executes
this plan in Paper.design against real MCP access to the tool. Where
this plan says "TBD in execution," that is a deliberate deferral — a
judgment call that needs to be made with the actual tool open, not
guessed at here.

---

## 0. Decisions already made (this session)

Recorded here so a future session doesn't re-litigate them.

| Decision | Resolution |
|---|---|
| Layout shell | **Two shells, one system** — see §3 |
| Component base | **shadcn/ui** (Radix primitives + restyled scaffold) — see §2 |
| Accent color | **Purple, from the Prosper Hotel logo** — explicit, documented override of the house guideline's purple ban (§9.3 of `ENTERPRISE_UI_DESIGN_PRINCIPLES.md`) — see §1.4 |
| Staff-facing design direction | Speed, one-handed use, fast entry, minimal friction — a named, distinct bar from the Admin's density-first direction — see §1.3 |
| Component spec depth | Full per-component spec (states: default/hover/focus/loading/error/empty/disabled) — see §4 |

---

## 1. Design Direction

### 1.1 What this product is, visually

Prosper is back-office software wearing two outfits. The **Admin** uses
it the way an operator uses Linear or a finance tool — dense,
information-forward, laptop-first, spending long sessions reconciling
numbers. **Cashiers, the Store Manager, and the Canteen Attendant** use
it the way someone uses a banking app mid-shift — one-handed, on a
phone, standing up, between customers, entering one thing and getting
out. Same system, same tokens, same component library — but the
*shape* of the experience differs by who's using it, because the jobs
differ, not because of inconsistent design.

The house guideline's "competence, not delight" meta-rule holds for
both: staff should never feel like they're fighting the phone to log a
sale, and the Admin should never feel like she's hunting for a number
that should already be on screen.

### 1.2 Visual language

Everything in `ENTERPRISE_UI_DESIGN_PRINCIPLES.md` applies as written,
**except** the accent color ban (§1.4 below). In summary, carried
forward as binding:

- Dense, compact-by-default, hairline-separated. No card borders, no
  drop shadows on content containers.
- Light mode only.
- Inter, 14px base, tabular figures on every numeric column — this
  matters more than usual here, since the entire product is money and
  stock counts.
- Full-bleed application layout on desktop, not a centered
  document-style page.
- One primary accent color, used sparingly (≲5% of pixels); neutrals
  do 90%+ of the work; semantic colors (success/warning/danger/info)
  never repurposed decoratively.
- The anti-slop block (§9.3 of the guideline) stands in full otherwise
  — no gradients, no glassmorphism, no purple-*and*-cream-serif
  over-correction, no equal-weight KPI tile grids, no bounce/spring
  motion.

### 1.3 Design direction: staff-facing pages

Staff-facing pages — every screen a Cashier, Store Manager, or Canteen
Attendant uses in the course of a shift (order entry, stock counts,
purchase receipts, transfers, non-sale consumption, handover) — are
held to a distinct, named set of criteria, separate from the density
and information-forward goals that govern the Admin shell. These are
daily-use, repeated-motion tools, not analysis surfaces, and are
designed and reviewed against the following before anything else:

- **Speed & efficiency.** Every staff task is designed for the minimum
  number of taps to complete, not the minimum number of screens to
  build. Multi-field forms default field values wherever a sensible
  default exists (e.g. today's date, the staff member's own location,
  the last-used payment method) so the person is confirming, not
  filling in from scratch, wherever that's honest to do.
- **One-handed usability.** Every primary action on a staff screen must
  be reachable and operable with one thumb on a phone held in the
  other hand — this is why the sticky bottom action bar (§4.6) and
  bottom nav (§5.2) exist: the reachable zone is the bottom half of
  the screen, not the top. Primary controls do not live in a top
  corner on staff screens.
- **Fast data entry.** Prefer selection over typing wherever the data
  is enumerable (product picker, segmented order-type control, payment
  method) — typing is reserved for the things that must genuinely be
  typed (an amount, a customer name, a required note). Numeric entry
  uses a numeric keypad input mode, never the full keyboard.
- **Minimal friction.** No staff-facing task requires navigating away
  from its flow to complete a prerequisite — e.g. if an order needs a
  customer attached for a credit sale, the customer picker supports
  adding a new customer inline, without leaving the order. Confirmation
  dialogs are reserved for genuinely consequential or irreversible
  actions (per §4.3) — never inserted as a routine step in a staff
  flow just to be safe.

**Goal, stated plainly and used as the review bar for every staff
screen:** a staff member can complete their task quickly and
efficiently, with minimal interaction, without having to think about
the software while they're doing it. Where this goal and the general
density-oriented guideline in §1.2 would pull in different directions
on a staff screen specifically (e.g. showing fewer fields at once
rather than more), this section wins — §1.2's density principles are
written for the Admin's analysis-heavy context and are not to be
applied to staff task flows at the cost of speed or one-handed use.

### 1.4 The accent color exception

The Prosper Hotel logo (`carry-forward/brand/prosper-hotel-logo.jpeg`)
uses a deep purple and gold on a decorative, serif hospitality mark.
The house guideline bans purple/violet/indigo as an accent — it is
named as the single most recognizable AI-slop tell.

**Decision, made explicitly by the business owner in this session:**
this project overrides that rule. The accent color is purple, drawn
from the logo. This is a deliberate brand-continuity choice, not an
oversight, and should not be "corrected" back to a safe blue by a
future session that hasn't read this document.

To keep the override from reintroducing the exact failure mode the
rule exists to prevent:

- The accent is desaturated and value-adjusted for a dense **UI**
  context, not lifted directly from the logo's saturated print-ready
  purple. Target: a deep, muted violet that reads as confident and
  neutral-adjacent at small sizes (buttons, focus rings, selected
  states) rather than decorative. Precise hex to be finalized against
  WCAG contrast checks in the execution session — provisional anchor:
  `#4C3B73`–`#5B4785` range (desaturated from the logo's `~#3D1D6B`),
  tested at 4.5:1 against white/near-white surfaces for text use and
  3:1 for UI boundaries.
- Gold from the logo is **not** promoted to a second competing accent.
  It appears only as a small masthead/badge treatment (see §1.5) —
  never as a button, link, or status color, to avoid the two-tone
  "branded gradient" look the guideline separately bans.
- The semantic palette (success/warning/danger/info) stays fully
  independent of the accent — critically, **warning stays amber**, not
  gold, so the two don't visually collide in a table that shows both a
  "select this row" purple tint and a "low stock" amber chip.
- Every other rule in §9.3 (no gradients, no glow, no cream+serif
  combination, no card shadows) still applies without exception. The
  override is scoped to *hue*, not to the whole anti-slop block.

This exception, and the reasoning above, should be copied verbatim into
`docs/design/design-principles.md` when that file is created, so it
carries forward as the binding record — not just this planning doc.

### 1.5 Where the brand mark actually appears

The ornate hospitality logo does not skin the product. It appears in
exactly two places:

1. **Top bar, Admin desktop shell** — small (24–28px), monochrome or
   simplified mark, left-aligned before the product name, gold/purple
   used only here at icon scale.
2. **Login / PWA splash screen** — full mark, one time, before the user
   is inside the dense working UI.

Everywhere else — nav, buttons, chips, tables — the product uses the
restrained accent from §1.4, not the logo's actual color values or
ornamentation.

---

## 2. Design System Decisions

### 2.1 Component library strategy: shadcn/ui on Radix primitives

**Decision:** shadcn/ui, built on Radix UI primitives.

**Why this, given the constraint that components must work both as
Paper.design frames *and* as the real shipped React/Next.js code**
(per `docs/sdlc.md`'s Phase 2 process — screens are assembled directly
into real routes, not rebuilt from a static prototype):

- Radix underneath supplies correct, tested interaction behavior —
  focus trapping in dialogs, roving tabindex in listboxes, ARIA wiring
  for combobox/select/tabs — for free. A solo-agent-driven project
  (per `docs/sdlc.md`, no human collaborator carries context between
  sessions) benefits enormously from not re-solving these each sprint;
  getting keyboard/focus behavior subtly wrong is exactly the kind of
  defect that's invisible until real use.
- shadcn/ui adds a token-driven starting scaffold on top (Tailwind +
  CSS variables), which maps directly onto the token system already
  defined in `ENTERPRISE_UI_DESIGN_PRINCIPLES.md` §Appendix — the same
  `--surface-*`, `--text-*`, `--border-*` semantic-token discipline the
  guideline already requires. We are not adopting shadcn's design
  opinions, only its plumbing.
- shadcn ships as copy-in source, not an npm dependency with a fixed
  visual API — components live in the repo and are fully editable.
  That matters because the guideline's defaults (hairline separation,
  no shadows, 6px/4px radius, dense row heights) actively conflict
  with shadcn's out-of-the-box look (shadows, larger radius,
  card-based). We are not theming shadcn via config; we are editing
  the component source directly.

**The risk this creates, and how the plan guards against it:** shadcn's
default visual style is close to several items on the anti-slop block
(rounded cards, subtle shadows, more generous radius than the 8px
maximum). An agent session under time pressure could plausibly leave a
component half-restyled — Radix behavior correct, but visual defaults
untouched. Mitigation, binding on the execution session:

- Every component pulled from shadcn gets its styling **fully rewritten
  against the token file**, not theme-adjusted. Treat the shadcn
  source as a behavioral starting point only.
- The Pre-Ship Checklist in `ENTERPRISE_UI_DESIGN_PRINCIPLES.md` §10
  runs per component at the time it's added to the library, not only
  at feature-ship time — so a drifted default is caught at the
  component's origin, not rediscovered four features later.
- Radius, shadow, and border rules (§9.3) are checked explicitly for
  every shadcn component pulled in, since those are exactly where
  shadcn's defaults disagree with this project's rules.

### 2.2 Shell strategy: two shells, one system

**Decision:** the Admin gets a desktop-oriented shell (nav + list/table
+ inspector, per the guideline's canonical shape) that collapses
responsively for her occasional phone use. Cashier, Store Manager, and
Canteen Attendant get a **separate, purpose-built mobile shell** —
built from the same component library and tokens, but not a squeezed
version of the Admin's desktop layout.

**Why not one responsive shell:** The guideline's canonical shell (240px
fixed nav, 360px fixed inspector, three-pane list→detail) is built for
continuous multi-hour desktop sessions with a mouse and a large
viewport — exactly the Admin's use case (reconciliation, reporting,
audit trail). Collapsing that same structure down to a 375px phone
screen for a Cashier who needs to log one order between customers and
move on produces a UI that is technically responsive but not actually
*designed* for the job: a drawer nav and a bottom-sheet inspector are a
compromise shape, not the native shape of a fast single-purpose mobile
task flow. The PRD is explicit that all four roles work from personal
phones, with the Admin additionally using a laptop — mobile is not the
edge case here for three of four roles, it's the primary case.

Full specification of both shells is in §5.

---

## 3. Design Foundations Plan — overview

The rest of this document is what the execution session builds, in
this order:

1. Visual standards (§6) — type, spacing, color, radius, motion tokens.
   Built first; every component depends on these.
2. Component inventory (§4) — the actual Paper.design component
   library, one spec per component.
3. Layout templates (§5) — the Admin desktop shell, the staff mobile
   shell, and the archetypes each screen is assembled from.
4. System-level flows and interaction patterns (§7) — cross-cutting
   behavior (corrections, day-close, handover reconciliation, role
   gating) that isn't owned by any single component but shapes several
   of them.

---

## 4. Component Inventory

Organized by family. Every component lists: what it is, when it's
used, and its required states. "N/A" means that state is not
applicable to this component, not that it was skipped.

Money and quantity fields throughout use `tabular-nums`, right-aligned,
per the guideline — noted only where it's easy to miss, not repeated
on every row.

### 4.1 Form controls

#### Text input
- **What:** single-line text/number entry. Variants: text, number,
  currency (fixed prefix, tabular figures, 2-decimal formatting),
  quantity (unit-label suffix, e.g. "kg", per PRD §4.1's per-product
  unit label).
- **States:** default · hover · focus (2px accent ring, 2px offset,
  per guideline §7.2) · filled · loading (async validation, e.g.
  checking a product name for uniqueness) · error (red border +
  inline message below, not a tooltip) · disabled · read-only (for
  fields like Dish buying price, always 0, shown but not editable —
  PRD §3).

#### Select / combobox
- **What:** single-select from a list. Combobox variant for long lists
  with search (e.g. product picker, customer picker).
- **States:** default · hover · focus · open (listbox visible,
  keyboard nav per guideline §5.3 conventions) · loading (async
  options, e.g. products filtered by location) · error · empty (no
  matching options — must show explicit "No matches" row, never a
  blank dropdown) · disabled.

#### Multi-select / location picker
- **What:** used specifically for "which locations is this product
  sold at" (PRD §4.1). Chip-based selection, not a plain multi-select
  list, since the selected set is small (max 3 locations) and needs to
  stay visible inline.
- **States:** default · hover · focus · selected-chip hover (shows
  remove ×) · error · disabled · empty (zero locations selected — this
  is a valid-but-incomplete state, flagged, not blocked, since a
  product can exist before it's assigned anywhere).

#### Radio group / segmented control
- **What:** small mutually exclusive choice sets. Segmented control for
  ≤4 options inline (e.g. Order type: Dine-in/Takeaway/Delivery;
  Payment method: Cash/M-Pesa/Credit). Radio group (stacked) for
  longer option sets in forms (e.g. Expense category, Non-sale
  consumption reason).
- **States:** default · hover · focus · selected · disabled (e.g.
  Credit payment method disabled at the Canteen, since PRD §4.4 states
  no credit sales are supported there).

#### Checkbox
- **What:** boolean toggle, table row selection (40px selection
  column per guideline §5.1).
- **States:** unchecked · checked · indeterminate (partial selection
  in a table header) · hover · focus · disabled.

#### Toggle switch
- **What:** binary settings, not data entry (e.g. staff attendance
  present/absent default-present toggle, PRD §4.8; density toggle in
  the Admin shell).
- **States:** off · on · hover · focus · disabled · loading (rare —
  only if the toggle triggers an immediate server write, e.g.
  attendance).

#### Textarea
- **What:** free-text notes — required-reason fields (non-sale
  consumption "Other" note, handover shortfall note per PRD §4.8,
  correction reason).
- **States:** default · hover · focus · error (e.g. required note left
  empty) · disabled · character-limit-approaching (subtle counter,
  not a hard block, at 90% of limit).

#### Date picker
- **What:** single date selection — used for viewing past-date records
  (PRD §4.11), expense date, asset purchase date.
- **States:** default · hover · focus · open (calendar panel) ·
  error (e.g. a staff member attempting to pick a closed/locked date
  for an edit they're not authorized to make — see §7.2) · disabled ·
  disabled-date (individual dates greyed within the calendar, e.g.
  future dates where not permitted).

#### Money input
- **What:** a specialized text input, broken out separately because
  money is the highest-stakes input type in this product (PRD's core
  trust problem). Always `Decimal`-backed (per `CONVENTIONS.md` §5),
  never native float on the client either — displayed and typed as a
  fixed-format string, parsed once on submit.
- **States:** default · hover · focus · loading (N/A — money inputs
  are never async-validated character-by-character) · error (non-
  numeric input, negative where not permitted) · disabled · zero
  (explicitly styled the same as any other value — never shown as
  blank, since blank vs. zero is a real distinction in reconciliation
  contexts, e.g. handover of exactly KES 0).

### 4.2 Buttons & actions

#### Button
- **What:** primary (filled, accent, exactly one per screen per
  guideline §4.2), secondary (ghost/outline), tertiary (text-only),
  destructive (filled danger — reserved for hard-delete confirmations
  only, PRD §4.1/§4.10).
- **States:** default · hover · focus · active/pressed · loading
  (inline spinner replaces label, button stays same width to avoid
  layout shift) · disabled · disabled-with-reason (disabled buttons
  that need a tooltip explaining why, e.g. "Close day" disabled until
  all handovers are received).

#### Icon button
- **What:** table row actions (revealed on hover per guideline §5.1),
  toolbar actions.
- **States:** default (often invisible until row hover) · hover ·
  focus · active · disabled · loading.

#### Split button / menu button
- **What:** primary action with secondary related actions (e.g. "Save
  order" with a dropdown for "Save & print" — noting printed receipts
  are out of scope per PRD §6, so this pattern is reserved for future
  use, not built in v1 unless a real case appears).
- **States:** default · hover · focus · open · disabled.

### 4.3 Feedback & status

#### Toast / inline notification
- **What:** transient confirmation (e.g. "Order saved") or
  non-blocking error. Given PRD §5's note that forms should retry on a
  dropped submit, the toast system must distinguish "saved" from
  "retrying" from "failed, retry manually."
- **States:** success · error · warning · info · loading/retrying ·
  dismissing (exit animation, ≤200ms per guideline §MOTION).

#### Status chip / badge
- **What:** low-saturation chip conveying record state — never color
  alone (guideline §7.2, WCAG 1.4.1). Always dot/icon + label. Used
  for: order payment method, handover variance state (matched/short/
  over), day status (open/closed), purchase status (awaiting receipt/
  received/variance), stock-count freshness ("counted 2h ago" vs
  "not counted today").
- **States:** each semantic variant (success/warning/danger/info/
  neutral) × N/A for interactive states unless the chip is also a
  filter trigger, in which case it inherits hover/focus/selected from
  the filter chip spec (§4.5).

#### Empty state
- **What:** full-region placeholder for a list/table with no data —
  distinguished from *loading* and from *filtered-to-nothing* (see
  Filters, §4.5). Each instance needs its own copy (e.g. "No orders
  yet today" vs. "No customers match your search"), not a generic
  "Nothing here."
- **States:** true-empty (no data exists) · filtered-empty (data
  exists, current filter excludes all of it — must offer "Clear
  filters") · permission-empty (data exists but this role can't see
  it — should not be reachable in practice since nav already hides
  it, but the state must still be designed defensively).

#### Loading state
- **What:** skeleton loaders for tables/cards (matching final layout
  shape, not a generic spinner, so the page doesn't jump on load) and
  a spinner variant for inline/button contexts.
- **States:** initial load (skeleton) · refetch/background update
  (subtle top-of-region progress bar, content stays visible) ·
  submit-pending (button-level, see Button spec).

#### Error state (page/region-level)
- **What:** distinguished from a form field error — this is "the data
  failed to load," not "you typed something wrong." Includes a retry
  action.
- **States:** network/fetch error · permission error (403 — role/
  ownership denial per `CONVENTIONS.md` §3's `FORBIDDEN` code,
  e.g. a Cashier hitting another cashier's order directly by URL) ·
  not-found (404, e.g. soft-deleted product) · server error (500,
  generic "something went wrong" — never expose raw `message` text
  per `CONVENTIONS.md` §3's rule that the frontend keys off `code`).

#### Confirmation dialog
- **What:** blocking modal for consequential actions. Two distinct
  variants: standard confirm (e.g. day-close) and **friction-gated
  confirm** — retype-to-confirm — reserved specifically for hard
  deletes (PRD §4.1, §4.10 both require this).
- **States:** default · retype-field-invalid (text doesn't match,
  confirm button stays disabled) · retype-field-valid (confirm
  enabled) · submitting · error.

### 4.4 Data display

#### Table
- **What:** the core pattern per guideline §5. Full spec (row heights,
  hover, selection, sticky header) already defined in
  `ENTERPRISE_UI_DESIGN_PRINCIPLES.md` §5 — this entry exists to
  enumerate Prosper-specific column-type variants: currency column,
  quantity column (with unit-label suffix), variance column (signed,
  color-coded via icon+text not color alone — e.g. a small up/down
  indicator beside a red or green figure), timestamp column (relative
  + absolute-on-hover per guideline §5.2), status column (uses the
  status chip, §4.3), attribution column (who recorded this — avatar/
  initials + name, needed throughout given the audit-trail
  requirement in PRD §4.11).
- **States:** loading (skeleton rows) · empty (see §4.3) · populated ·
  row-hover · row-selected · sorting-active (visible sort indicator,
  guideline §5.3) · error (see §4.3).

#### Ledger / running-balance list
- **What:** a Prosper-specific variant of the table, for append-only
  ledger views (stock movements per product/location, money movements)
  — must visually communicate "this is a sum of rows, not an editable
  number" per the ledgers-not-stored-totals principle
  (`ARCHITECTURE.md` §3.1). Each row shows its signed delta; the
  current balance renders as a computed summary row, visually distinct
  (e.g. sticky footer or header, not just another table row), never
  editable inline.
- **States:** same as Table, plus a distinct treatment for
  **correction rows** — visually flagged (small "correction" chip
  inline) so a Cashier or the Admin can immediately tell a
  correction from an original entry without opening the audit trail,
  even though the audit trail (per `CONVENTIONS.md` §4.4) remains the
  only place the full original→corrected history is spelled out.

#### Detail / inspector panel
- **What:** the right-rail 360px pattern (Admin shell) or full-screen
  sheet (mobile shell) showing one record's full detail alongside its
  list.
- **States:** empty (nothing selected) · loading · populated ·
  editing (form mode inline, for staff same-day edits) · read-only
  (closed-day record, staff view) · correcting (Admin correction-entry
  mode, see §7.2).

#### Stat tile / KPI figure
- **What:** single metric + delta + optional sparkline (guideline
  §8.2). Used sparingly on the Admin dashboard — guideline explicitly
  bans rows of equal-weight tiles (§9.3), so this component is
  specified for use in a **varied-size** dashboard grid, never a
  uniform 4-across row.
- **States:** loading (skeleton) · populated · no-prior-period (delta
  can't be computed — show "—", not a fake 0%) · error.

#### Avatar / initials badge
- **What:** staff attribution, small (16–20px), initials-only (no
  photo upload in scope).
- **States:** default · N/A for interactive states unless used as a
  filter/link, then inherits hover/focus.

#### Audit trail entry
- **What:** a specific list-item pattern for `docs/PRD.md` §4.11's
  audit trail — who, what, when, before→after value where applicable.
  Distinct from a generic activity feed in that it must render a
  correction's original and corrected values side by side, per
  `CONVENTIONS.md` §4 point 5 ("audit trail is the only place that
  surfaces originally X, corrected to Y").
- **States:** default · expanded (show full before/after diff) ·
  collapsed (single-line summary) · loading · empty (no history —
  rare but possible for a just-created record).

### 4.5 Navigation & filtering

#### Top bar (Admin shell only)
- **What:** 48px, per guideline §1.4. Contains: brand mark (§1.4),
  location context switcher (Restaurant/Canteen/Store/All — this
  product's multi-location model, PRD §5, needs a persistent location
  scope control), global search, account menu, day-status indicator
  (open/closed for the currently viewed date).
- **States:** default · search-focused (expands) · location-switcher-
  open · account-menu-open.

#### Side nav (Admin shell)
- **What:** 240px fixed, collapsible to 56px, per guideline §1.4.
  Sections match domain modules (`CONVENTIONS.md` §1): Catalog, Stock,
  Sales, Handovers, Customers, Financials, Staff, Assets, Reports,
  Audit Trail.
- **States:** default · item-hover · item-active (current route) ·
  collapsed · item-disabled (N/A for Admin — she has full access per
  PRD §2, so nothing is ever disabled-but-visible in her nav).

#### Bottom nav (Staff mobile shell)
- **What:** the staff-shell equivalent of side nav — see §5.2 for full
  shell spec. 3–4 destinations max per role (e.g. Cashier: New order /
  Today's orders / Handover).
- **States:** default · item-active · item-badge (e.g. a badge on
  "Handover" once end-of-day approaches — TBD in execution whether
  this is time-based or a real signal).

#### Filter bar
- **What:** chip-based filter pattern per guideline §6. Prosper-
  specific facets: location, date range, product, staff member
  (Admin-only facet — never shown to staff filtering their own data,
  since staff can't see others' entries per PRD §2 anyway), payment
  method, status.
- **States:** default (no filters) · filters-active (chips visible +
  result count + Clear all, per guideline §6.2) · filter-picker-open ·
  loading (debounced apply in flight) · empty-options (a facet with
  zero valid values for the current context — hidden, not shown
  disabled, per guideline §6.2).

#### Tabs
- **What:** in-page section switching (e.g. a Record page's tabbed
  body per guideline §1.5 archetype).
- **States:** default · hover · focus · active · disabled (rare —
  e.g. a "Recipe" tab on a Dish detail page could be present but empty
  until the Admin defines one, which should be an empty state within
  the tab, not a disabled tab).

#### Breadcrumb
- **What:** used only where the mobile staff shell's flat structure
  doesn't apply — i.e. Admin shell record pages several levels deep
  (e.g. Product → Location-specific pricing).
- **States:** default · hover (non-terminal items are links) ·
  current (terminal item, not a link).

### 4.6 Mobile-specific primitives

These exist because the staff shell (§5.2) is not a shrunk desktop
shell — it needs its own interaction primitives.

#### Bottom sheet
- **What:** the mobile equivalent of the inspector panel / modal —
  slides up from bottom, used for record detail, confirmations, and
  pickers on the staff shell.
- **States:** closed · opening · open (partial-height "peek" vs
  full-height, if the execution session finds a peek state useful for
  e.g. reviewing an order before handover) · closing · loading
  content · error.

#### Large touch-target list row
- **What:** the mobile list-item pattern, sized for thumb tapping
  (minimum 44px tall, above the guideline's general 32px minimum
  click target §1.4, because these are tapped rapidly and repeatedly
  during a shift, not clicked occasionally).
- **States:** default · pressed · selected · loading · disabled.

#### Sticky action bar (mobile)
- **What:** bottom-pinned primary action (e.g. "Save order",
  "Submit handover") that stays reachable while the form scrolls
  above it — the mobile equivalent of "exactly one primary button per
  screen," pinned so it survives scroll on a long form.
- **States:** default · disabled (validation incomplete) · loading ·
  success (brief inline confirmation before navigating away).

---

## 5. Layout Templates

### 5.1 Admin shell (desktop-primary, responsive down)

The canonical shell from `ENTERPRISE_UI_DESIGN_PRINCIPLES.md` §1.1,
applied directly:

```
┌────────────────────────────────────────────────────┐
│  Top bar — 48px — brand · location switcher ·       │
│  search · day status · account                      │
├────────┬─────────────────────────────┬─────────────┤
│        │  Toolbar / filter bar 44px  │             │
│  Nav   ├─────────────────────────────┤  Inspector  │
│  240px │                             │  360px      │
│  fixed │  Main content — fluid       │  fixed      │
│        │  (the only scroll region)   │             │
└────────┴─────────────────────────────┴─────────────┘
```

Used for every Admin screen: dashboard, catalog, stock, sales review,
handover reconciliation, customers, financials, staff, assets,
reports, audit trail.

**Responsive collapse (Admin on phone — occasional, not primary):**
nav collapses to icon-only (56px) or an off-canvas drawer below
~1024px; inspector becomes a full-screen sheet pushed on top of the
list rather than a persistent right rail below ~768px. This is a
genuine secondary path, not the design target — the Admin's primary
context is the laptop, per PRD §2.

### 5.2 Staff mobile shell (Cashier, Store Manager, Canteen Attendant)

A distinct shell, not a collapsed Admin shell — built specifically to
serve the staff-facing design direction in §1.3 (speed, one-handed
use, fast entry, minimal friction). Every structural choice below
exists to serve one of those four criteria, not general mobile
convention for its own sake.

```
┌────────────────────────────────┐
│  Header — 48px                 │
│  location/role label · account │
├─────────────────────────────────┤
│                                 │
│  Single-column task content    │
│  (the only scroll region)      │
│                                 │
│                                 │
├─────────────────────────────────┤
│  Bottom nav — 56px             │
│  3–4 destinations              │
└─────────────────────────────────┘
```

- No persistent side nav, no persistent inspector — those exist to
  support long multi-hour desktop sessions across many entity types;
  a staff shift is a short repeated loop through 1–3 tasks.
  Destinations live in the bottom nav instead.
- Detail/record views open as a full-screen push (not a sheet) when
  they represent a new task (e.g. tapping "New order"); a bottom sheet
  (§4.6) is reserved for lighter-weight in-context lookups (e.g.
  reviewing a customer's balance mid-order) that shouldn't lose the
  underlying screen's state.
- Every form ends in a sticky action bar (§4.6), not a button at the
  bottom of a potentially long scroll.
- This shell is designed **mobile-only** — there is no responsive
  "grow-up" to desktop, because these roles do not use a laptop per
  PRD §2. If that assumption changes, it's a PRD change, not a CSS
  breakpoint.

### 5.3 Layout archetypes in use

| Archetype (guideline §1.5) | Where it's used in Prosper |
|---|---|
| List–detail | Admin: Products, Customers, Staff, Assets. Orders list → order detail. |
| Full table | Admin: Stock movements, Audit trail, Financial ledgers. |
| Dashboard | Admin home — varied-size regions per guideline's dashboard note, e.g. one dominant "today's reconciliation" panel + smaller supporting KPI tiles, never a uniform tile grid. |
| Record page | Admin: single Product (tabbed: details / pricing per location / recipe), single Customer (tabbed: profile / debt history), Day detail (tabbed: sales / stock / handovers / financials for one date, per PRD §4.11). |
| Settings | Admin: Catalog configuration, Location configuration, Staff pay rates. 640px form column per guideline. |
| **Task flow (new, staff-specific)** | Staff mobile shell: New order, Stock count entry, Handover entry, Purchase receipt confirmation. Single-column, single-task, sticky action bar. Not one of the five desktop archetypes — defined here because none of them fit a one-handed repeated-entry job. |

---

## 6. Visual Standards

Adopted from `ENTERPRISE_UI_DESIGN_PRINCIPLES.md` in full — type scale,
spacing scale, radius, motion — **except accent color**, per §1.4
above. Restated here only where Prosper-specific application needs
spelling out; full token values live in the guideline's Appendix and
should be copied verbatim into the Paper.design token setup.

### 6.1 Typography — Prosper-specific application

- Every money and quantity figure: `tabular-nums`, right-aligned,
  consistent decimal places (2 for currency, matching the product's
  unit precision for quantities — e.g. kg may want 1–2 decimals,
  pieces want 0).
- Unit labels (kg, pcs, crate, ream — PRD §4.1) render in the
  **Caption** token (12px), never full body size, immediately after
  the quantity figure — they're metadata about the number, not part of
  its value.
- Currency: KES, with a fixed, non-repeating prefix style (e.g. "KES"
  once per column header, not re-stated in every cell) to avoid
  cluttering dense financial tables.

### 6.2 Spacing

No Prosper-specific deviation — the 4px scale and proximity rules in
guideline §2 apply as written across both shells.

### 6.3 Color

Full neutral ramp, semantic tokens, and status-fill treatment (8–12%
opacity fills, guideline §7.2 Appendix) apply as written. The only
override is the accent hue itself (§1.4). Restated for clarity:

- `--accent`: deep muted purple, provisional `#4C3B73`–`#5B4785`
  (final value + contrast-checked pair for hover/active states set in
  execution).
- `--warning` stays a conventional amber — deliberately kept far from
  the accent purple in hue so a selected-row tint and a low-stock
  warning chip never read as related.
- Gold from the logo is **not** a token used in components. It exists
  only in the two masthead contexts named in §1.5, handled as a
  one-off brand asset, not part of the semantic palette.

### 6.4 Radius & elevation

No deviation — 6px default / 4px dense / 8px maximum, no shadows on
content containers, hairline dividers only, per guideline §9.3. This
is the section shadcn's defaults will most often disagree with (see
§2.1's mitigation) — flagged again here as the most likely place a
future session drifts.

### 6.5 Motion

No deviation — 100/150/200ms, ease-out only, single entrance animation,
never re-animating on filter change. Applies identically to bottom
sheets and mobile transitions (§4.6) — a bottom sheet's open/close is
still ≤200ms ease-out, not a spring, even though spring-based sheet
motion is common in consumer mobile apps. This product is enterprise
software that happens to run on a phone, not a consumer app.

---

## 7. System-Level User Flows & Interaction Patterns

Cross-cutting patterns that shape multiple components and screens, not
owned by any single one.

### 7.1 Role-scoped visibility

Per PRD §2 and `ARCHITECTURE.md` §3.4, every screen enforces
server-side role/ownership checks — but the UI-level pattern matters
too: staff never see a disabled/greyed-out version of an Admin-only
view (e.g. buying prices, margins). The nav simply does not list it,
and any direct-URL attempt renders the permission-error state (§4.3),
not a visible-but-locked field. Locked-but-visible is reserved
specifically for the closed-day case (§7.2), where seeing the value
without being able to edit it is the correct behavior — that's a
temporal lock, not a role lock, and the two should look different in
Paper.design so an engineer never conflates them.

### 7.2 The correction-entry pattern, at the UI level

Per `CONVENTIONS.md` §4, this is a backend rule with direct UI
consequences:

- Every editable record shows a **"Correct this"** action, distinct in
  label and icon from a plain "Edit" — used once a day is closed and
  only for the Admin.
- The correction form always asks for the **final correct value**,
  never a delta — the field is pre-filled with the current derived
  value, editable, with the delta computed and shown as a preview line
  ("this will record a correction of −KES 200") before submit, so the
  person entering it can sanity-check without doing the math
  themselves.
- Same-day staff edits (pre-close) use the plain "Edit" action and a
  standard form — no correction-preview UI, since these are true edits,
  not ledger corrections.
- List/detail views always show the current derived value (§4.4's
  ledger component); the correction itself is only visible as a
  flagged row inline (§4.4) and in full before/after detail in the
  audit trail (§4.4's audit trail entry component).

### 7.3 Day close

- The Admin's day-status indicator (top bar, §5.1) is persistent and
  always shows which date is in view and whether it's open or closed.
- "Close day" is a confirmation-dialog action (§4.3), not a friction-
  gated one (it's reversible in effect — the Admin can still act on
  closed days via corrections — so it doesn't need the hard-delete-
  level retype friction).
- Once closed, every staff-facing edit control across the whole app
  for that date becomes the locked-but-visible state (§7.1) instead of
  disappearing — this is a single shared visual treatment (e.g. a
  small lock icon replacing the edit affordance), applied consistently
  so staff learn the pattern once.

### 7.4 Handover reconciliation

This is the PRD's core trust mechanic (§0 "Overview") and deserves its
own flow note: the Admin's handover-receipt screen must show
**expected vs. declared vs. received** as three explicit, aligned
figures per handover (not just a single variance number), because the
whole point is that she can see where a mismatch originates. The
variance itself renders using the ledger component's signed-delta
treatment (§4.4), not a separate ad hoc figure.

### 7.5 Unattributed / rolling balance (Canteen)

Per PRD §4.5 and §7 (open question 1, provisional default: rolling
reconciliation) — the canteen's not-yet-counted balance needs a
distinct, clearly-labeled status (not the same "variance" treatment as
a handover mismatch, since it isn't a discrepancy — it's a known,
expected gap that resolves once the next stock count lands). This
should read as an **info-toned** state, not warning/danger, to avoid
training the Admin to treat a normal, expected condition as a problem
each time she sees it.

---

## 8. What happens next

This plan does not build anything. On approval:

1. This document's binding decisions (§0, plus §1.3's staff-facing
   criteria and §1.4's accent exception) get extracted into
   `docs/design/design-principles.md`,
   which is the file every future Design Sprint actually reads per
   `CLAUDE.md`'s routing table.
2. The Phase 2, Part B session (per `docs/sdlc.md`) builds the actual
   Paper.design component library against §4 of this document, using
   shadcn/ui + Radix per §2.1, with the token values in §6 (and the
   guideline's Appendix) as the starting CSS variables.
3. Component-by-component, that session runs the Pre-Ship Checklist
   (guideline §10) at build time, not deferred to feature-ship time —
   per §2.1's mitigation above.
4. Once the library is approved, feature-level Design Sprints
   (Sprint 02 onward, per the existing sprint files) assemble screens
   from it — never inventing new components ad hoc, per `sdlc.md`'s
   process rule.

Open item for the Admin's approval, beyond the document as a whole:
the provisional accent hex in §1.4/§6.3 is a starting anchor, not
final — final contrast-checked values are set when the execution
session has the real tool open to test against actual components, not
guessed at in a planning document.
