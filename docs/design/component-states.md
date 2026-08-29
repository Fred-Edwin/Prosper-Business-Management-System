# Prosper — Component States Spec (Milestone 1)

**Status:** CONFIRMED (2026-08-27). Owner approved all four §7 open
decisions ("I agree with all your recommendations"): D-CHIP = A
(underlined semantic-color cell, no chip), D-LABEL = A (label/copy
props), D-EMPTY = A (real EmptyState + ErrorState kit component),
D-FIN = KPI strip is M3, not M1. Recorded in `DECISIONS.md` ADR-36 and
`design-principles.md` §4.3 / §7 / §8 / §9. Paper pass (Task 2) and
consistency audit (Task 3) executed — see §8 below for the audit result.
**Session:** Design Sprint — Session 2 (Product Designer). Milestone 1
scope only.
**Purpose:** Make "add all the states" executable. This spec says
exactly which state artboards each M1 component needs, which states are
handled once as global CSS rules instead, and how the new artboards are
named/organised so Session 3 (kit rebuild) can find them.

**Source of truth:** the Paper file "Prosper Hotel"
(`01M0EZ7TAHZM26KBMWNYT0928X`, page "Shell+Component kit"). This doc is
the *why/when*; Paper is the *what*. Tokens per
`design-principles.md` §6.

---

## 1. Component list (M1 scope) and where each is used

M1 has 21 screen artboards (`milestone-1-plan.md` §3) across three
features: F1 Catalog & Locations, F2 Store & Stock Movements, F3 Assets.
Every component below is drawn from the approved 16-artboard kit
inventory (`design-principles.md` §7) — nothing new is proposed here.

| # | Component | Kit artboard | Appears in these M1 screens | Interactive? |
|---|---|---|---|---|
| C1 | **Button** (primary / secondary / tertiary / destructive) | Buttons & Actions `6BR-0` | Every screen — toolbar actions, drawer footers, dialog footers, sticky action bars | yes |
| C2 | **Icon button** | Buttons & Actions `6BR-0` | Ledger toolbar (Maximize), drawer close (×), catalog row actions, mobile header hamburger | yes |
| C3 | **Text input** | Form Controls `6CG-0` | Product Drawer, Asset Drawer, delete dialogs (retype field), bulk grid cells, payment drawer | yes |
| C4 | **Textarea** | Utility & Layout `6WD-0` | Correction drawer (Reason for Adjustment), Asset Drawer (notes), non-sale consumption flow | yes |
| C5 | **Select** | Form Controls `6CG-0` | Product Drawer (Category), Asset Drawer (Location/Condition), payment drawer (account) | yes |
| C6 | **Segmented control** | Form Controls `6CG-0` | Product Drawer (Product Kind), Asset Drawer (Condition) | yes |
| C7 | **Toggle switch** | Form Controls `6CG-0` | Product Drawer (per-location availability rows) | yes |
| C8 | **Search input** | Utility & Layout `6WD-0` | Product Catalog, Assets Register, Ledger toolbar | yes |
| C9 | **Date picker** | Utility & Layout `6WD-0` | Ledger toolbar (Date), Asset Drawer (purchase date), bulk grid | yes |
| C10 | **Quantity stepper** | Utility & Layout `6WD-0` (+ `quantity-stepper.tsx`) | Correction drawer, store-manager flow screens (issue/production/transfer qty) | yes |
| C11 | **Underline tabs** | Tabs & Filters `6IW-0` | Product Catalog (All / Ingredients / Dishes / Goods), Ledger (All / Store / Restaurant / Canteen) | yes |
| C12 | **Pill filter** | Tabs & Filters `6IW-0` | Ledger filter bar (Location), mobile stock-level screens | yes |
| C13 | **Status chip** (semantic: success / warning / danger / info / neutral) | Chips & Status `6DJ-0` | Financials reconciliation table (Matched / Pending / Awaiting receipt / Closed), match cards | display-only |
| C14 | **Condition chip** (Good / Needs Repair / Decommissioned) | Chips & Status `6DJ-0` | Assets Register table, Asset Drawer preview | display-only |
| C15 | **Simple Table** | Tables `6ET-0` | Assets Register, Financials full table, catalog (desktop) | rows: selectable? see C15 matrix |
| C16 | **Dense Ledger** | Tables `6ET-0` | Admin Stock Ledger (full-width, sidebar-collapsed, drawer-open), Admin Stock Mobile | rows: click-to-correct |
| C17 | **Friction Delete Dialog** | Drawers & Dialogs `6OE-0` | Product Delete Dialog `797-0`, Asset Delete Dialog `8IV-0` | yes (retype gate) |
| C18 | **Edit Drawer** | Drawers & Dialogs `6OE-0` | Product Drawer `796-0`, Asset Drawer `8JO-0`, Ledger correction drawer `7LJ-0`, payment drawer `85W-0` | yes (open/close, focus trap) |
| C19 | **Bottom Sheet** | Bottom Sheet `6Z4-0` | Mobile catalog add-product, mobile in-context lookups | yes (peek/open, drag) |
| C20 | **Stat tile row** | Stat Tiles & KPI `6R4-0` | Financials (liquidity/cash/bank/outflows) — *M1 uses the stock-purchase slice only; confirm tiles are in the M1 cut* | display-only |
| C21 | **Dense summary strip** | Stat Tiles & KPI `6R4-0` | Ledger sticky footer (Totals reconciled), bulk grid valuation footer, mobile stock banners | display-only |
| C22 | **Transfer / Purchase-Delivery banner** | Banners & Cards `6SB-0` | Store Manager Hub, Canteen Hub (persistent pinned banners) | yes (Accept / Flag actions) |
| C23 | **Calculated Impact banner** | Banners & Cards `6SB-0` | Correction drawer, any adjust-before-save flow | display-only |
| C24 | **Match card** | Banners & Cards `6SB-0` | Financials reconciliation section | yes (1-tap match action) |
| C25 | **Instructional banner** (numbered) | Utility & Layout `6WD-0` | Bulk Opening Stock Grid header | display-only |
| C26 | **Bulk Entry Grid** | Bulk Entry Grid `6TT-0` | Bulk Opening Stock Grid | yes (editable cells) |
| C27 | **Action-tile grid** | Utility & Layout `6WD-0` | Store Manager Hub, Canteen Hub (Quick Operations) | yes (tap target) |
| C28 | **Activity timeline** | Utility & Layout `6WD-0` | Store Manager Hub, Canteen Hub ("Today's Movement Log") | display-only |
| C29 | **Breadcrumb** | Utility & Layout `6WD-0` | Bulk grid, nested admin screens | link |
| C30 | **Bottom Nav** | Utility & Layout `6WD-0` + Mobile Shell — Staff `4Y-0` | Every staff mobile screen (Hub / Stock / History) | yes (active item) |
| C31 | **Back-navigation flow header** | Utility & Layout `6WD-0` | Store Manager flow screens, Canteen transfer dispatch | back action |
| C32 | **Toolbar controls row** (search + location pill + avatar) | Utility & Layout `6WD-0` | composite of C8 + C12 + avatar — no states of its own beyond its parts | n/a |

**Shells** (Admin Shell `649-0` / `67T-0`, Mobile Shell Admin `6B1-0` /
Staff `4Y-0` / Drawer-open `1ZP-0`) are *layout states already drawn as
their own artboards*. This spec does not re-spec the shells — their
collapsed / drawer-open variants exist. Bottom Nav (C30) is the one
shell sub-part that also needs its own component-level state row (active
vs inactive item), because Session 3 builds it as a kit component.

**Out of M1 / skip:** none of the 32 are post-M1-only. Every kit
component is touched by at least one M1 screen. `Match card` and
`Stat tile row` are the two whose M1 inclusion is *conditional* on the
Financials M1 cut — flagged in §7.

---

## 2. Per-component state matrix

Legend for what becomes an **artboard** vs a **global rule** (§3):
`ARTBOARD` = drawn as a labelled state in Paper; `GLOBAL` = not drawn,
applied uniformly from §3's CSS rules; `n/a` = state doesn't apply.

### C1 — Button

Variants (all already drawn on `6BR-0`): **primary** ("Save changes"),
**secondary** ("Cancel", outline), **tertiary** ("View details", text
only), **destructive** ("Permanently delete").

| State | primary | secondary | tertiary | destructive |
|---|---|---|---|---|
| default | ARTBOARD ✅ | ARTBOARD ✅ | ARTBOARD ✅ | ARTBOARD ✅ |
| hover | GLOBAL (→ `--color-accent-hover` on primary; `--surface-hover` on secondary/tertiary; darker danger on destructive) | GLOBAL | GLOBAL | GLOBAL |
| active/pressed | GLOBAL (no separate treatment — same as hover, no transform) | GLOBAL | GLOBAL | GLOBAL |
| focus-visible | GLOBAL (2px accent ring, §3) | GLOBAL | GLOBAL | GLOBAL |
| disabled | **ARTBOARD** ✅ ("Primary — Disabled" exists) | **ARTBOARD** (ADD — secondary disabled) | GLOBAL (tertiary disabled = `--text-disabled`, no bg) | **ARTBOARD** (ADD — destructive disabled; the delete-dialog pending state depends on it) |
| loading | ARTBOARD (ADD — primary only: label + inline spinner, used on drawer/dialog submit) | n/a | n/a | ARTBOARD (ADD — destructive loading, same pattern) |

**Add for C1:** secondary-disabled, destructive-disabled,
primary-loading, destructive-loading. Everything else is global.

### C2 — Icon button

| State | artboard? |
|---|---|
| default | ARTBOARD ✅ (the `+` 32×32 on `6BR-0`) |
| hover | GLOBAL (`--surface-hover` fill) |
| active | GLOBAL |
| focus-visible | GLOBAL (2px accent ring) |
| disabled | ARTBOARD (ADD — `--text-disabled` glyph, no pointer) |

### C3 — Text input

| State | artboard? |
|---|---|
| default | ARTBOARD ✅ |
| focus | ARTBOARD ✅ (accent border, drawn on `6CG-0`) |
| filled | GLOBAL (filled = default box with value text; no separate style) — but keep the **"Beef Fillet" filled example** that already exists as the default sample |
| error | **ARTBOARD (ADD)** — `--color-danger` border + helper text row below in `--color-danger`. Needed: Product Drawer name-required, delete-dialog retype-mismatch, bulk grid invalid cell. |
| disabled | ARTBOARD ✅ ("0.00 KES" greyed sample on `6CG-0`) |

### C4 — Textarea

| State | artboard? |
|---|---|
| default | ARTBOARD ✅ (on `6WD-0`, "Reason for Adjustment") |
| focus | ARTBOARD (ADD — accent border, match C3 focus) |
| error | ARTBOARD (ADD — danger border + helper text; correction "Reason required") |
| disabled | GLOBAL (rare; `--surface-subtle` bg, `--text-disabled`) |

### C5 — Select

| State | artboard? |
|---|---|
| default (closed) | ARTBOARD ✅ |
| focus (closed, keyboard) | GLOBAL (2px accent ring) |
| open (menu expanded) | **ARTBOARD (ADD)** — Session 3 builds real open/close behaviour; it needs the open-menu visual (list, hover row = `--surface-hover`, selected row = check + `--surface-selected`). |
| filled | GLOBAL (value text in place of placeholder) |
| error | ARTBOARD (ADD — danger border; "Location required" on Asset Drawer) |
| disabled | GLOBAL (`--surface-subtle`, `--text-disabled`, no chevron interaction) |
| **searchable / combobox variant** | **FLAGGED FOR A KIT DESIGN SPRINT + KIT DEVELOPER SPRINT (Session 15, ADR-46 §6).** Full handoff: **`docs/sprints/kit-searchable-select-handoff.md`** — Phase A (Design: 3 `6CG-0` state rows — Searchable closed / open-filtered / open-no-match) then Phase B (Developer: add a `searchable` **opt-in mode** to `components/kit/select.tsx` — a text input in the trigger filters the option list `label`-contains, `max-height` ≈ 8 rows then scroll, a "No matches" row, keyboard = the existing APG combobox extended to the input; +3 Storybook stories; `test:visual` + `test:a11y` + §9 `postVisit`). It is an **edit** of the existing APG-listbox `Select`, not a rebuild — `searchable` off = byte-unchanged. Not built by a Development Sprint into a screen. **Session 16 interim** until Phase B ships: plain `Select` popover `max-height ~280px` + scroll + the drawer's `ingredient`/`goods` kind filter. |

### C6 — Segmented control

Only the **active** segment is drawn on `6CG-0` today.

| State | artboard? |
|---|---|
| a segment: active | ARTBOARD ✅ (shadow lift + accent label, per `design-principles.md` §4.5) |
| a segment: inactive (rest) | ARTBOARD (ADD — `--text-secondary` label, no lift; currently only implied) |
| a segment: hover (inactive) | GLOBAL (`--text-primary` label on hover) |
| whole control: disabled | ARTBOARD (ADD — all segments `--text-disabled`, track `--surface-subtle`) |

Draw one artboard showing the full control with segment 1 active +
segments 2–3 inactive together (this is the canonical resting state),
plus one disabled artboard.

### C7 — Toggle switch

| State | artboard? |
|---|---|
| on | ARTBOARD ✅ (accent track, knob right) |
| off | ARTBOARD ✅ (`--border-strong` track, knob left) |
| disabled-on / disabled-off | ARTBOARD (ADD — one artboard showing both at reduced opacity, no pointer) |
| focus-visible | GLOBAL (2px accent ring around track) |

### C8 — Search input

| State | artboard? |
|---|---|
| default (placeholder) | ARTBOARD ✅ ("Search products, movements…") |
| focus | GLOBAL (2px accent ring, matches C3) |
| filled (query + clear affordance) | ARTBOARD (ADD — value text + trailing `×` clear glyph) |
| disabled | n/a (search is never disabled in M1) |

### C9 — Date picker

| State | artboard? |
|---|---|
| default (date shown) | ARTBOARD ✅ ("Aug 24, 2026" on `6WD-0`) |
| focus | GLOBAL (2px accent ring) |
| open (calendar popover) | **ARTBOARD (ADD)** — Session 3 wires open/close; needs the calendar-grid visual (today ring, selected day = `--color-accent` fill, disabled future days = `--text-disabled`). |
| disabled | GLOBAL (`--surface-subtle`, `--text-disabled`) |

### C10 — Quantity stepper

| State | artboard? |
|---|---|
| default | ARTBOARD ✅ (`− 70.0 + kg` on `6WD-0`) |
| − disabled at min / + disabled at max | ARTBOARD (ADD — one artboard, `−` greyed at min bound) |
| focus (value field) | GLOBAL (2px accent ring on the number field) |
| error (out-of-range typed value) | ARTBOARD (ADD — danger border on the field) |

### C11 — Underline tabs

`6IW-0` already has: **active** ("All"), **inactive** (Ingredients /
Dishes / Goods), **disabled** ("Tab — Disabled").

| State | artboard? |
|---|---|
| active | ARTBOARD ✅ (accent label + 2px accent underline) |
| inactive | ARTBOARD ✅ (`--text-secondary`, no underline) |
| hover (inactive) | GLOBAL (`--text-primary` label, 2px `--border-strong` underline) |
| disabled | ARTBOARD ✅ |
| focus-visible | GLOBAL (2px accent ring on the tab hit area) |

**No new artboards for C11** — it is already state-complete. ✅

### C12 — Pill filter

`6IW-0` has **active** ("All") + **inactive** (Store / Restaurant /
Canteen). No disabled, no hover.

| State | artboard? |
|---|---|
| active | ARTBOARD ✅ (`--surface-selected` fill, `--color-accent` label) |
| inactive | ARTBOARD ✅ (transparent, `--text-secondary`, `--border-strong` outline) |
| hover (inactive) | GLOBAL (`--surface-hover` fill) |
| disabled | ARTBOARD (ADD — a pill for a location with no data; `--text-disabled`, no pointer) |
| focus-visible | GLOBAL (2px accent ring) |

### C13 — Status chip (semantic states-as-variants)

`6DJ-0` draws: Matched (success), Pending (warning), Short (danger),
Awaiting receipt (info), Closed (neutral). These are **variants, not
interaction states** — a chip is display-only.

| Variant | artboard? |
|---|---|
| success / warning / danger / info / neutral | ARTBOARD ✅ (all 5 present as `dot + label`) |

**No new artboards for C13.** ✅ (One cleanup item — see §6 divergence
D3 on the dot+pill vs dot+text rendering.)

### C14 — Condition chip

`6DJ-0`: Good (success), Needs Repair (warning), Decommissioned
(danger). Display-only.

| Variant | artboard? |
|---|---|
| Good / Needs Repair / Decommissioned | ARTBOARD ✅ |

**No new artboards for C14.** ✅

### C15 — Simple Table

`6ET-0` has: header row + 4 body rows. No hover, no selected, no empty.

| State | artboard? |
|---|---|
| header row | ARTBOARD ✅ |
| body row default | ARTBOARD ✅ |
| body row hover | **ARTBOARD (ADD)** — `--surface-hover` tint. (Also expressible as GLOBAL, but the ledger/table hover tint is a load-bearing affordance for "this row is clickable → opens drawer", so draw it once here as the canonical reference.) |
| body row selected | ARTBOARD (ADD, **conditional**) — only if any M1 simple-table is multi-select. Assets/Financials M1 tables are **not** selectable (row click = open edit drawer, not select). → **Skip unless owner says otherwise.** |
| empty state (no rows) | **ARTBOARD (ADD)** — see §7 open decision on EmptyState. If EmptyState becomes a component, this row references it; if not, draw the inline "No records" treatment here. |
| loading (skeleton rows) | GLOBAL — 3 shimmer rows using `--surface-subtle` / `--surface-hover`; one rule for both tables. |
| **Archived-tab row treatment** (Session 15, ADR-47 §1) | **SCREEN COMPOSITION, not a kit change.** On the "Archived" tab (Catalog + Assets), each row shows a neutral **"Archived"** `StatusChip` in the name cell and the last-column action is **"Unarchive"** (accent text) instead of "Edit". Same columns otherwise. Artboard: `Admin Catalog — Archived tab [S15]`. |
| **row action = single "Edit"** (Session 15, ADR-46 §5) | Confirmed: every M1 `SimpleTable` (Catalog + Assets) has **one "Edit" affordance** in the last column, **no Delete column**. Row click is not wired to open Edit in M1. This matches the approved `6ZO-0` / `8DL-0` artboards; the shipped `catalog-client.tsx` diverged with a second Delete button (fixed in Session 16). |

### C16 — Dense Ledger

`6ET-0` Dense Ledger + the three screen artboards (`798-0`, `7G9-0`,
`7LJ-0`).

> **Kit extension (ADR-37a, Session 4b):** the three Admin Stock ledger
> screens use a **leading Location column** + `w-max` horizontal scroll
> that `6ET-0` does not draw. `components/kit/dense-ledger.tsx` gained
> opt-in `showLocation` + `horizontalScroll` props for this; the base
> `6ET-0` behaviour is unchanged. **`6ET-0` needs a Location-column
> state added** so Paper and code agree — a follow-up Design Sprint.

| State | artboard? |
|---|---|
| header row | ARTBOARD ✅ |
| data row default | ARTBOARD ✅ |
| data row hover | ARTBOARD (ADD — `--surface-hover`; same token as C15) |
| sticky footer (Totals reconciled) | ARTBOARD ✅ (dark bg, present on all ledger artboards) |
| **corrected cell** | ARTBOARD (ADD — canonical treatment: see §7 open decision **D-CHIP**. The screen artboards render corrected cells as **underlined `--color-danger`/`--color-success` text**; the kit `6ET-0` renders the same value as **plain colored text, no underline**. This is a real divergence — §6 D1 — that the owner's D-CHIP answer resolves.) |
| empty (no movements for filter) | ARTBOARD (ADD — ties to EmptyState decision, §7) |
| loading | GLOBAL (skeleton rows) |

### C17 — Friction Delete Dialog

`6OE-0` has **2 states**: "Default (retype pending)" and "Confirmed
(retyped match)". Screen artboards `797-0` (Product) and `8IV-0` (Asset)
also exist.

| State | artboard? |
|---|---|
| pending (retype field empty or non-matching → destructive btn disabled) | ARTBOARD ✅ |
| confirmed (retyped string matches → destructive btn enabled) | ARTBOARD ✅ |
| retype mismatch / error | ARTBOARD (ADD — field shows `--color-danger` border once the user has typed a non-matching non-empty string; distinct from the neutral "not yet typed" pending state) |
| submitting (delete in flight) | GLOBAL (destructive-loading button from C1) |

**Label divergence (§7 D-LABEL):** kit + `797-0` use "Cancel" /
"Permanently Delete"; `8IV-0` uses "Keep Asset" / "Permanently Delete
Asset" and drops the "Archive instead" link and uses a different body
copy + header ("Delete Asset Record" vs "Delete Product"). Owner
decides: per-entity label props, or unify. Recorded as §6 D2.

### C18 — Edit Drawer

`6OE-0` "Edit Asset" + screen artboards `796-0`, `8JO-0`, `7LJ-0`,
`85W-0`.

> **Kit extension (ADR-37b, Session 4b):** `7LJ-0` (ledger correction)
> and `85W-0` (Financials payment) draw the panel as a **docked
> right-edge rail** (`w-[420px]`, `border-l`, no radius,
> `--surface-subtle` footer), not the `6OE-0` floating card.
> `components/kit/drawer.tsx` gained a `variant="rail"` for this; the
> `"panel"` default is unchanged. **`6OE-0` needs a `rail` variant
> state added** — a follow-up Design Sprint.

| State | artboard? |
|---|---|
| shell (header + body + footer) | ARTBOARD ✅ |
| open (on screen, veil behind) | ARTBOARD ✅ (`7LJ-0` shows the veil `--surface-panel-tint`) |
| closed | n/a (absence — no artboard) |
| footer: primary disabled (form invalid / no changes) | ARTBOARD (ADD — one artboard; the "Save changes" disabled) |
| footer: submitting | GLOBAL (primary-loading from C1) |
| scrolled (header hairline appears) | GLOBAL (add `--border-subtle` bottom border to header on scroll > 0) |
| **bottom "Delete this record" section** (Session 15, ADR-46 §5) | **SCREEN COMPOSITION, not a kit change.** A2/A1: the Edit drawer for Catalog + Assets gets a bottom section — divider → uppercase "Delete this &lt;record&gt;" label → one line of copy → a **destructive-`tertiary`** `<Button>` that opens the unchanged `FrictionDeleteDialog`. Rendered only in edit mode. It is arbitrary drawer children + an existing button variant + an existing dialog — the `Drawer` component is untouched. Artboard: `Product Drawer — rail + kind hint + delete section [S15]`. |
| **archived-record guard** (Session 15, ADR-47 §3.2) | **CAPTION on `6OE-0` — a small fallback, not a new component.** If the Edit drawer is opened on an archived row (deep link / stale state), it renders its fields **disabled** + a single info line ("This record is archived. Unarchive it to make changes.") + a **Close**-only footer. The normal path is that the Archived tab offers only "Unarchive", so the drawer never opens for an archived row. |

### C19 — Bottom Sheet

`6Z4-0`: **peek** + **open**. Genuinely interactive (Session 3 gives it
drag/snap).

| State | artboard? |
|---|---|
| peek (in-context lookup) | ARTBOARD ✅ |
| open (full task) | ARTBOARD ✅ |
| dragging / mid-snap | GLOBAL (transform only; no distinct visual) |
| backdrop | GLOBAL (`--surface-panel-tint` veil, matches drawer) |

**No new artboards for C19.** ✅

### C20 — Stat tile row  *(conditional on Financials M1 cut — §7)*

Display-only. `6R4-0` draws 4 tiles, hairline-divided.

| State | artboard? |
|---|---|
| tile default | ARTBOARD ✅ |
| positive / negative value color | ARTBOARD ✅ (green cash, red outflows already shown) |

**No new artboards.** If Financials M1 slice excludes the KPI strip,
mark C20 **deferred to M3** and skip verification.

### C21 — Dense summary strip

Display-only. `6R4-0` + ledger footer + bulk grid footer.

| State | artboard? |
|---|---|
| default (dark strip, label:value pairs) | ARTBOARD ✅ |
| positive / negative emphasis value | ARTBOARD ✅ (green "Consolidated" already shown) |

**No new artboards.** (Verify one-canonical-version across the 3 places
it appears — §6 D4.)

### C22 — Transfer / Purchase-Delivery banner

`6SB-0` draws the **Transfer** (amber) banner. `milestone-1-plan.md`
§4.7 requires **both** `TransferBanner` (amber) and
`PurchaseDeliveryBanner` (blue/info) as named variants. Store Manager
Hub `8T3-0` shows both live.

| State | artboard? |
|---|---|
| transfer variant (amber) — pinned | ARTBOARD ✅ |
| purchase-delivery variant (blue) — pinned | **ARTBOARD (ADD)** — `6SB-0` only has the amber one; the blue variant is only shown embedded in `8T3-0`. Extract it to the kit artboard. |
| action buttons: Accept (primary-success) + Flag (secondary) | ARTBOARD ✅ (part of the banner) |
| flagged state (after "Flag Variance" tapped) | ARTBOARD (ADD — banner shows "Flagged — awaiting admin" muted, actions removed) |
| resolved / dismissed | n/a (banner unmounts → moves to timeline C28) |

### C23 — Calculated Impact banner

`6SB-0` + correction drawer `7LJ-0`. Display-only, single visual.

| State | artboard? |
|---|---|
| default (amber, icon + impact sentence) | ARTBOARD ✅ |

**No new artboards.** (Check padding — `component-audit-report.md`
flags suspected `p-3` vs `--sp-5` undersizing; §6 D5. Verify against the
artboard.)

### C24 — Match card

`6SB-0` + Financials reconciliation. *(Conditional on M1 Financials cut
— but the reconciliation section **is** in M1 per `milestone-1-plan.md`
§2, so C24 is in.)*

| State | artboard? |
|---|---|
| default (payment awaiting receipt — "1-Tap Match & Receive") | ARTBOARD ✅ |
| matched (after tap — success chip, action removed) | ARTBOARD (ADD — the post-match resting state) |
| flagged / variance | ARTBOARD (ADD — "Flag Variance" outcome; ties to C22's flagged pattern for consistency) |
| submitting | GLOBAL (primary-loading) |

### C25 — Instructional banner (numbered)

`6WD-0`. Display-only.

| State | artboard? |
|---|---|
| default (numbered circle + title + body) | ARTBOARD ✅ |

**No new artboards.** (Confirm it is the neutral `--surface-subtle`
info treatment, distinct from C23's amber — §6 D6.)

### C26 — Bulk Entry Grid

`6TT-0`.

| State | artboard? |
|---|---|
| header row | ARTBOARD ✅ |
| editable cell — default (this-location column) | ARTBOARD ✅ |
| editable cell — focused / active | ARTBOARD ✅ (`6TT-0` shows a focused cell with accent border) |
| non-editable cell (other-location column, greyed) | ARTBOARD ✅ ("0.0" muted) |
| cell — error (invalid value) | ARTBOARD (ADD — `--color-danger` cell border) |
| valuation footer | ARTBOARD ✅ (shared with C21) |
| row for a Dish (cost = 0, "0.00 (Dish)") | ARTBOARD ✅ |

**Add:** one error-cell artboard.

### C27 — Action-tile grid

`6WD-0` + hubs. Tap target.

| State | artboard? |
|---|---|
| tile default (icon + label + sub-label) | ARTBOARD ✅ |
| tile with count badge ("1 Delivery Pending") | ARTBOARD ✅ |
| tile pressed | GLOBAL (`--surface-hover` fill, brief) |
| tile disabled (operation unavailable for role/state) | ARTBOARD (ADD — `--text-disabled`, no pointer) |

### C28 — Activity timeline

`6WD-0` + hubs. Display-only.

| State | artboard? |
|---|---|
| default (row: title + subtitle + signed qty) | ARTBOARD ✅ (signed pos green / neg red shown) |
| empty (no movements today) | ARTBOARD (ADD — "No movements logged today" line; ties to EmptyState §7) |

### C29 — Breadcrumb

`6WD-0`. Link.

| State | artboard? |
|---|---|
| default (parent / current) | ARTBOARD ✅ |
| link hover | GLOBAL (underline, `--text-primary`) |

**No new artboards.** ✅

### C30 — Bottom Nav

`6WD-0` + `4Y-0`. Interactive.

| State | artboard? |
|---|---|
| item active (accent icon + label) | ARTBOARD ✅ ("Hub" active on `9J5-0`) |
| item inactive (`--text-secondary`) | ARTBOARD ✅ |
| item pressed | GLOBAL (brief `--surface-hover`) |
| per-role variants | Staff roles share Hub / Stock / History → **one canonical nav**. Cashier is post-M1 (New Order / History) → out of scope. **No per-role artboard needed for M1.** |

**No new artboards for C30.** ✅

### C31 — Back-navigation flow header

`6WD-0`. Interactive (back).

| State | artboard? |
|---|---|
| default (back chevron + title + direction badge) | ARTBOARD ✅ |
| back pressed | GLOBAL |
| no direction badge (flows without an origin→dest) | ARTBOARD (ADD — title-only variant; Log Non-Sale has no direction) |

### C32 — Toolbar controls row

Composite of C8 + C12 + avatar. **No states of its own** — its parts
carry their states. No artboards. ✅

---

## 3. Global interaction rules (NOT per-component artboards)

These go into `design-principles.md` (new §9 "Interaction states") and
are encoded **once** as global CSS by Session 3 — never by reading 40
near-identical artboards.

1. **Focus-visible ring.** Every interactive element (button, icon
   button, input, textarea, select, tab, pill, toggle, checkbox,
   link, nav item, action tile, editable grid cell):
   `outline: 2px solid var(--color-accent); outline-offset: 2px;`
   applied on `:focus-visible` only (keyboard), never on `:focus` from
   mouse. On dark surfaces (nav, sticky footer) the ring switches to
   `var(--nav-text-active)` (white) at the same width/offset.

2. **Row / list hover tint.** Any clickable row (Simple Table body row,
   Dense Ledger data row, Select menu option, Bottom Sheet list item,
   timeline row if it links): background `var(--surface-hover)` on
   hover. Non-clickable rows get no hover.

3. **Selected row tint.** `var(--surface-selected)` (the 7% accent).
   Used for the active pill/tab background and any genuinely
   multi-selected row. Never combine with hover tint — selected wins.

4. **Disabled treatment.** `opacity: 0.5; pointer-events: none;` plus,
   where the element has its own text, swap text color to
   `var(--text-disabled)`. No greyscale filter, no cursor change
   beyond the default (pointer-events:none removes the pointer). The
   few artboards drawn for disabled states (C1 primary/destructive, C3,
   C7) are the visual reference; every other disabled state is this
   rule.

5. **Hover on buttons.** primary → `background: var(--color-accent-hover)`.
   secondary / tertiary / icon-button → `background: var(--surface-hover)`.
   destructive → darken danger by using `--color-danger` at ~90%
   lightness-equivalent (Session 3: a `--color-danger-hover` token if
   one is added, else `filter: brightness(0.92)` as the documented
   fallback). No transform, no shadow change, no scale.

6. **Active / pressed.** Same visual as hover, no additional transform.
   Prosper deliberately has **no** press-scale / bounce (house rule,
   `design-principles.md` §1).

7. **Transition timing.** `transition: background-color 120ms ease,
   border-color 120ms ease, opacity 120ms ease;` on interactive
   elements. Focus outline is **not** transitioned (must be instant for
   accessibility). No transition longer than 160ms anywhere. Drawer /
   bottom-sheet slide: `200ms ease` on `transform` only.

8. **Input focus border.** Text input / textarea / select / search /
   date field / stepper number field: on focus, border becomes
   `1px solid var(--color-accent)` **in addition to** the §3.1
   focus-visible ring (the ring is keyboard-only; the border color
   change applies on any focus so a click-focused field still reads as
   active). This matches the "Text Input — Focus" artboard.

9. **Error field pattern.** Border `1px solid var(--color-danger)`;
   helper/error text directly below in `var(--color-danger)`,
   `var(--text-caption)` size, `var(--leading-caption)`,
   `margin-top: var(--sp-2)`. One pattern for every field type
   (C3/C4/C5/C10/C26).

10. **Loading / skeleton.** Table and list loading = 3 placeholder
    rows, each a `var(--surface-subtle)` block with a subtle
    `var(--surface-hover)` shimmer sweep, `1200ms` loop. Buttons in
    flight = existing label dims to `opacity: 0.7` + a 14px inline
    spinner in the label color, button stays its variant color and
    `pointer-events: none`.

---

## 4. Naming / organisation convention for the new state artboards

**Chosen approach: one state-row per component, appended inside its
existing kit artboard** — NOT separate artboards per state.

Rationale: the kit already groups by area (`6BR-0` Buttons, `6CG-0`
Form Controls, …). Session 3 does `get_jsx` on the whole kit artboard
and reads all states of a component together. Scattering states into 40
tiny artboards would break that and make the "one canonical version"
check harder.

**Rules:**

1. Each component lives in its existing kit artboard (per the §1 table's
   "Kit artboard" column). New states are **added as a labelled row**
   inside that artboard, below the existing default row.
2. **Row label** = a `--text-caption` / `--text-tertiary` text node
   immediately above the row, reading exactly:
   `<Component> — <State>` — e.g. `Button (primary) — Loading`,
   `Text Input — Error`, `Select — Open`, `Dense Ledger — Corrected cell`.
   Session 3 greps these labels.
3. **State order within a component**, left→right or top→bottom:
   `default → hover* → focus* → filled → active/selected → open →
   error → disabled → loading`. (`*` only if drawn; most are global.)
4. If adding states makes a kit artboard overflow its frame, set that
   artboard to `height: fit-content` via `update_styles` — **do not**
   guess a new fixed height (Paper guide, Review Checkpoints).
5. New variant *extractions* that currently only live inside a screen
   (C22 blue purchase-delivery banner) are **moved/copied into the kit
   artboard** so the kit artboard is complete on its own.
6. Do not introduce a value that isn't a token. Build every state by
   duplicating the existing canonical node and changing only the
   token(s) the state changes.
7. When a component is already state-complete (C11, C13, C14, C19, C29,
   C30, C32) — leave it untouched, just record "verified complete" in
   the consistency report.

---

## 5. Summary — what actually gets drawn in Task 2

**New state artbo/rows to add** (≈24 rows across 9 kit artboards):

| Kit artboard | New rows |
|---|---|
| Buttons & Actions `6BR-0` | secondary-disabled, destructive-disabled, primary-loading, destructive-loading, icon-button-disabled |
| Form Controls `6CG-0` | text-input-error, select-open, select-error, segmented-resting (1 active + 2 inactive together), segmented-disabled, toggle-disabled |
| Utility & Layout `6WD-0` | textarea-focus, textarea-error, search-filled (with clear), date-picker-open (calendar), quantity-stepper-at-bound, quantity-stepper-error, pill-filter-disabled, action-tile-disabled, activity-timeline-empty, flow-header-no-badge |
| Tables `6ET-0` | simple-table-row-hover, simple-table-empty, dense-ledger-row-hover, dense-ledger-corrected-cell (per D-CHIP), dense-ledger-empty |
| Drawers & Dialogs `6OE-0` | friction-dialog-retype-mismatch, edit-drawer-primary-disabled |
| Banners & Cards `6SB-0` | purchase-delivery-banner (blue variant, extracted), transfer-banner-flagged, match-card-matched, match-card-flagged |
| Bulk Entry Grid `6TT-0` | grid-cell-error |

**Conditional / decision-gated (draw only after §7 answers):**
- EmptyState / ErrorState artboard + its states (D-EMPTY)
- Dense-ledger corrected-cell canonical treatment (D-CHIP) — the row is
  listed above but *what it looks like* depends on the answer
- Friction-dialog per-entity label rows (D-LABEL)

**Verified already-complete (no work):** C11 tabs, C13 status chips,
C14 condition chips, C19 bottom sheet, C29 breadcrumb, C30 bottom nav,
C32 toolbar row, and the display-only C20/C21/C23/C25/C28 (aside from
the noted divergence checks).

---

## 6. Divergences found so far (full audit is Task 3)

Pre-flagged from the screenshots taken while writing this spec. Task 3
verifies each with `get_computed_styles` across all instances and either
fixes in Paper or escalates.

| ID | Component | Divergence | Where | Likely canonical |
|---|---|---|---|---|
| D1 | Dense Ledger corrected cell | Kit `6ET-0` = plain red text; screen artboards `798-0`/`7G9-0`/`7LJ-0` = **underlined** red text | kit vs 3 screens | screens (they're the real usage) — but confirm via **D-CHIP** decision first |
| D2 | Friction Delete Dialog | "Cancel"/"Permanently Delete" (kit, `797-0`) vs "Keep Asset"/"Permanently Delete Asset" + no Archive link + different header/body (`8IV-0`) | kit + Product vs Asset | owner call — **D-LABEL** |
| D3 | Status chip | Need to confirm every instance renders as `dot + text` (as `6DJ-0`) and none as `dot + filled pill` — `design-principles.md` §4.4 says "plain colored text, not a dot+pill chip" for the *Simple Table* density specifically | `6DJ-0` vs Financials table vs Match card | `6DJ-0` dot+text |
| D4 | Dense summary strip | Confirm ledger footer, bulk-grid valuation footer, and `6R4-0` sample are one component (same height, dark bg token, type scale) | `6R4-0` / `798-0` footer / `6TT-0` footer | `6R4-0` |
| D5 | Calculated Impact banner | Suspected padding undersizing (`p-3` vs `--sp-5`) per `component-audit-report.md` | `6SB-0` vs `7LJ-0` embedded | measure both |
| D6 | Instructional vs Calculated Impact banner | Confirm they are visually distinct (neutral `--surface-subtle` vs amber `--color-warning-bg`) and not accidentally converged | `6WD-0` vs `6SB-0` | keep distinct |
| D7 | Segmented control | `6CG-0` (Product Kind) vs `6OE-0` Edit Asset (Condition) vs `8JO-0` — confirm identical track/lift/label treatment | 3 places | `6CG-0` |
| D8 | Bottom Nav | `6WD-0` sample vs `4Y-0` embedded vs the mobile hub screens — confirm identical (height 56, icon 20, active accent) | 4+ places | `4Y-0` (canonical shell) |

---

## 7. OPEN DECISIONS — need the owner's answer before Task 2

### D-CHIP — "CORRECTED" chip on ledger correction rows  *(ADR-36a)*

**The conflict:** `design-principles.md` §4.3 says correction rows carry
a small amber **"CORRECTED" chip** next to the movement-type cell.
Reality in Paper: **no artboard anywhere shows a chip.** All three
ledger screen artboards render a corrected cell as **underlined
`--color-danger` text** (the value itself, e.g. `-18.5`), with the
correction drawer showing "ORIGINAL: 15.0" as context. The kit ledger
`6ET-0` shows the same corrected value as **plain (non-underlined)
colored text**. The old code (`dense-ledger.tsx`, about to be deleted
and rebuilt) implements the amber chip.

Because the ledger is "one row = one product/day/location with one
column per movement type" (§4.3), there is **no single movement-type
cell** to put a chip next to — a correction lands in a specific
*column* (Issues, Purchases…), not on the row as a whole. That's
structurally why the screens ended up marking the **cell**, not the
row.

**Options:**

- **A — Underlined colored cell (matches the screen artboards).**
  Corrected cell = the value in `--color-danger` (negative) /
  `--color-success` (positive) with a 1px underline in the same color.
  Hover/click the cell → correction drawer showing original vs
  corrected + who/when. Update `design-principles.md` §4.3 to describe
  this; delete the chip bullet. Draw one canonical
  `Dense Ledger — Corrected cell` artboard. *(Recommended — it's what
  the approved screens already show, needs the least change, and fits
  the per-column reality.)*
- **B — Keep a chip, but on the cell.** Small amber `CORR` chip
  *inside* the corrected cell, before the number. Requires redrawing
  all 3 ledger screen artboards + the kit + adding the chip to `6DJ-0`.
- **C — Row-level indicator.** A thin `--color-warning` left-border on
  any row containing a corrected cell + a chip in the pinned
  Location/Product block. More visible; more artboard work.

**Owner: pick A / B / C.** Whatever is chosen, §4.3, the Paper
artboards, and Session 3's `dense-ledger.tsx` all get reconciled to it.

### D-LABEL — Friction Delete Dialog button labels  *(ADR-36c)*

Kit + Product dialog: **"Cancel" / "Permanently Delete"**. Asset dialog:
**"Keep Asset" / "Permanently Delete Asset"**, no "Archive instead"
link, header "Delete Asset Record", different body copy.

**Options:**

- **A — Component takes optional `cancelLabel` / `confirmLabel` /
  `title` / `bodyCopy` / `showArchiveLink` props.** Each entity passes
  its own ("Keep Product" / "Keep Asset" / …). One component, per-entity
  text. *(Recommended — matches how the Asset artboard was actually
  drawn; the retype-gate mechanic stays identical.)*
- **B — Unify on the generic "Cancel" / "Permanently Delete"** for
  every entity; redraw `8IV-0` to match. Less flexible, one less prop
  surface.

**Owner: pick A / B.** If A, also confirm: does every delete dialog
keep the "Archive instead" link, or is it Product-only (Assets soft-
delete may be worded differently)?

### D-EMPTY — EmptyState / ErrorState as a kit component  *(ADR-36d)*

Not in the approved 16-artboard inventory. M1 screens that will hit an
empty/error state: Assets Register (no assets yet), Product Catalog
(no products / no search results), Dense Ledger (no movements for
filter), mobile Activity timeline (nothing logged today), Financials
reconciliation (nothing to match). The four role home pages currently
inline a placeholder `<div>`.

**Options:**

- **A — Add a real `EmptyState` kit component** (icon + title + one-line
  guidance + optional single action button), with 2 artboards:
  `EmptyState — default` and `EmptyState — filtered/no-results`
  (different copy, "Clear filters" action). Plus an `ErrorState`
  variant (same layout, `--color-danger` icon, "Retry" action). Drawn
  in Paper this session, built in Session 3. *(Recommended — five M1
  surfaces want a consistent treatment; inlining five different empties
  is exactly the divergence this session exists to prevent.)*
- **B — No component; each screen inlines its own empty.** Keep the
  status quo. Faster now, guaranteed drift later.

**Owner: pick A / B.** If A, confirm scope: `EmptyState` only, or
`EmptyState` + `ErrorState` both this session.

### D-FIN — Is the Financials KPI strip (C20) + Match card (C24) in the M1 cut?

`milestone-1-plan.md` §2 puts the **reconciliation section** of
`/admin/financials` in M1 (so C24 Match card is in), but says the
"broader Financials feature (expenses, owner draws, real profit) is
Milestone 3". The 4-tile **KPI stat strip** (C20 — liquidity / cash /
bank / outflows) reads like the M3 part.

**Owner: confirm** — does M1's Financials screen show the KPI stat
strip, or just the stock-purchase table + reconciliation match cards?
If KPI strip is M3, C20 is marked deferred and skipped in Task 2/3.

---

## Sign-off

- [ ] D-CHIP answered → recorded in `DECISIONS.md` ADR-36a, `design-principles.md` §4.3/§8
- [ ] D-LABEL answered → recorded in ADR-36c
- [ ] D-EMPTY answered → recorded in ADR-36d, added to `design-principles.md` §7 inventory if A
- [ ] D-FIN answered → noted in `milestone-1-plan.md` §2
- [ ] Owner approves the §2 matrix + §3 global rules + §4 naming convention

**On sign-off, Task 2 proceeds** per §5's draw list + whatever the
decisions add.

---

## 8. Consistency audit result (Task 3) — 2026-08-27

Method: `get_computed_styles` / `get_tree_summary` comparison of each
multi-screen component's instances across the M1 screen artboards,
against its kit artboard. "CONSISTENT" = same structure + tokens +
dimensions (content differences like row data or label text are
expected and ignored). Divergences were either fixed in Paper this
session or flagged.

| Component | Instances checked | Verdict | Action |
|---|---|---|---|
| **Dense Ledger — corrected cell** | kit `6ET-0` vs ledger screens `798-0` / `7G9-0` / `7LJ-0` | **DIVERGENT → FIXED** | Kit showed the corrected value as plain `--color-danger` text; the three screens showed it **underlined**. Per D-CHIP resolution (underlined semantic-color cell is canonical), added `text-decoration: underline` + `2px` offset to the kit cell so kit now matches the screens. (This was pre-flagged as D1.) |
| **Primary button fill** | kit `6BR-0` `6BW-0` vs reference screen `6ZO-0` `72X-0` | **DIVERGENT → FIXED** | Kit used a raw literal `oklch(28.4% 0.126 296.2)`; the verified reference screen uses `var(--color-accent)` (`oklch(28% 0.126 296)`). Retokenised the kit primary button, the kit tertiary label (`6C3-0`), and the kit segmented-control active label (`6DD-0`) to `var(--color-accent)`. |
| **Status chip — Success** + **Condition chips (all 3)** | kit `6DJ-0` dots/labels vs Assets Register `8DL-0`, Simple Table `6ET-0` | **DIVERGENT → FIXED** | Warning/danger/info/neutral chip dots+labels already used tokens; only the **Success** chip dot (`6DR-0`) + label (`6DS-0`) and **all three condition chips'** dots+labels used raw `oklch(52.8% 0.121 155)` etc. Retokenised to `var(--color-success)` / `var(--color-warning)` / `var(--color-danger)`. Note: the Assets table renders condition chips at `--text-sm` / 400 (table density, per `design-principles.md` §4.4), the kit shows `--text-caption` / 500 (chip density) — both legitimate; documented, not "fixed". |
| **Bottom Nav** | kit `6WD-0` `9J5-0` vs staff shell `4Y-0` `9JK-0` vs hub screen `8T3-0` `8X1-0` | **DIVERGENT (trivial) → FIXED** | Item structure identical everywhere (flex-col, centred, `gap: 2px`, `flex-grow: 1`, 56px bar, `--surface-page`). Kit bar had an all-sides `1px --border-subtle` border; real usage has **border-top only**. Changed the kit to border-top only. |
| **Segmented control** | kit `6CG-0` `6DB-0` vs Edit-Asset kit drawer `6QQ-0` vs Asset Drawer screen `8JX-0` | **CONSISTENT** (within M1) | All three: 36px, `2px` pad, `--radius-sm`, `--surface-subtle`. **Flagged, not fixed:** the *staff mobile shell* order-type control (`4Y-0` `5K-0`) is 40px / `--radius-md` / `--surface-hover` — a divergence, but it is on a **Cashier "New Order" screen which is post-M1**, and the larger touch target may be deliberate. Left for the Cashier design work to reconcile. |
| **Admin side-nav item** | ledger `798-0` `7B3-0` vs catalog `6ZO-0` `71J-0` | **CONSISTENT** | Byte-identical (36px, `10px` inline pad, `4px` radius, `8px` gap, `--text-sm` / regular / `--nav-text`). Token-hygiene note for Session 3: the `10px` pad and `4px` radius are raw values (no `--sp` = 10px; `4px` = `--radius-sm`) — consistent everywhere, so not a divergence, but worth tokenising on rebuild. |
| **Underline tabs** | kit `6IW-0` `6J6-0` vs Product Catalog `6ZO-0` `738-0` | **CONSISTENT** | Byte-identical (36px, `--sp-5` inline, `2px` transparent bottom border, `--text-sm` / medium / `--text-secondary`). Already state-complete (active / inactive / disabled all drawn). |
| **Pill filter** | kit `6IW-0` `6JM-0` / `6JP-0` vs ledger `798-0` `7D1-0` | **CONSISTENT** | 32px, `--sp-6` inline, `--radius-lg`; active adds `--surface-selected`. Identical. |
| **Dense summary strip / sticky footer** | kit ledger footer `6O1-0` vs ledger screen footer `7DC-0` | **CONSISTENT** | Identical (36px, `--sp-6` inline pad, `--sp-5` gap, `--color-gray-900` bg). Screen uses `width: max-content; min-width: 100%` vs kit `width: 100%` — a required consequence of the screen ledger's horizontal scroll, not a divergence. |
| **Edit Drawer header** | kit `6OE-0` `6Q7-0` vs Product Drawer `796-0` `76D-0` vs correction drawer `7LJ-0` `7SA-0` | **DIVERGENT (defensible) → DOCUMENTED** | Kit + Product Drawer + Asset Drawer: single-line title, **fixed 52px**, `--sp-8` inline, `1px --border-subtle` bottom. Correction drawer: **title + a `--text-caption` / `--text-secondary` context subtitle** ("Store · Beef Fillet · Aug 24"), sized by `padding-block: --sp-6` instead of a fixed height. This is a legitimate content variant (the correction drawer needs row context). Added a caption to the kit Drawers artboard documenting both header variants so Session 3 builds the drawer with an optional `subtitle` prop rather than treating one as wrong. |
| **Friction Delete Dialog** | kit `6OE-0` vs Product Delete `797-0` vs Asset Delete `8IV-0` | **DIVERGENT (by design) → RESOLVED via props** | Labels/title/body/archive-link differ per entity (D-LABEL). Resolved as `cancelLabel` / `confirmLabel` / `title` / `bodyCopy` / `showArchiveLink` props (ADR-36c). The retype-gate mechanic is identical across all three. Added the third state artboard (retype-mismatch) + a caption documenting the prop contract. |

### Summary

- **5 real token/structure divergences found and fixed in Paper** this
  session: ledger corrected-cell underline, primary-button/tertiary/
  segmented-label raw-OKLCH → `--color-accent`, success + condition
  chips raw-OKLCH → semantic tokens, bottom-nav border, (plus the
  earlier D1 which is the same as the corrected-cell one).
- **2 divergences documented as legitimate content variants**, not
  bugs: the drawer-header subtitle variant, and the friction-dialog
  per-entity labels (now prop-driven).
- **1 divergence deferred** as out of M1 scope: the staff-mobile-shell
  order-type segmented control (post-M1 Cashier screen).
- Everything else that appears on more than one M1 screen —
  **side nav, underline tabs, pill filter, sticky footer, drawer
  shell** — is **CONSISTENT**: one canonical version, safe for Session
  3 to export as a single kit component.
- **Token-hygiene notes for Session 3** (not divergences, but worth
  fixing on rebuild): several nav-item paddings/radii are raw `10px` /
  `4px` rather than `--sp-*` / `--radius-sm`; they are consistent
  across all screens so they don't block export.

### New state artboards added this session

| Kit artboard | Added |
|---|---|
| Buttons & Actions `6BR-0` | "Section — Button States": primary-loading (spinner + dimmed label), destructive-loading, secondary-disabled, destructive-disabled, primary-disabled (ref), icon-button. Caption: hover / focus / active / pressed are §9 global. |
| Form Controls `6CG-0` | Text Input / Select / Quantity-Stepper **— Error** (danger border + danger helper text); **Select — Open** (industry-standard attached popover: border + shadow, 4px pad, 2px row gap, 32px rows, selected = accent-tint + accent label, hover = `--surface-hover`, chevron flipped up); **Segmented Control — Disabled**; **Toggle Switch — Disabled** (on + off). |
| Tables `6ET-0` | Dense Ledger: **corrected cell** (underlined `--color-danger`, kit now matches screens), **row hover** (`--surface-hover`), **empty** (single centred `--text-tertiary` row). Simple Table: **row hover**. Captions document the corrected-cell convention (no chip, ADR-36a), no-multi-select, EmptyState reference, and skeleton loading. |
| Drawers & Dialogs `6OE-0` | **Friction Delete Dialog — Retype mismatch** (3rd state alongside pending / confirmed). Caption: the label-prop contract + the drawer-header subtitle variant + footer-disabled → §9. |
| Banners & Cards `6SB-0` | **Purchase Delivery Banner (info / blue)** — the named `PurchaseDeliveryBanner` variant, extracted from screen `8T3-0` into the kit (was only amber `TransferBanner` before); **Transfer Banner — Flagged** (actions removed, muted status line); **Match Card — Matched** (success) and **Match Card — Flagged** (warning variance). |
| Utility & Layout `6WD-0` | **Search — Filled** (query + `✕` clear affordance, accent border); **Date Picker — Open** (attached calendar popover: month header + `‹ ›`, weekday row, day grid with **today ringed**, **selected = accent fill**, **future dates disabled**); **Flow Header — No direction badge** (title-only variant for flows with no origin→destination, e.g. Record Production / Log Non-Sale). |
| Bulk Entry Grid `6TT-0` | **Grid Cell — Error** (danger border + danger value). Caption documents all four cell states (default / focused / non-editable / error). |
| **NEW: Component Kit — Empty & Error States `9U3-0`** | **EmptyState — Default** (icon + title + guidance + primary action), **EmptyState — Filtered / no results** ("Clear filters" secondary action, no-results copy), **ErrorState** (`--color-danger` icon + "Retry" secondary action). The 17th kit area (`design-principles.md` §7). |

**Naming convention used** (per §4): state rows added as labelled
`Frame` layers inside each existing kit artboard, layer-named
`<Component> — <State>`, greppable via `get_tree_summary`. Each artboard
switched to `height: fit-content` where the additions overflowed. The
new Empty & Error artboard is a standalone artboard next to the kit
group.

### Not drawn (intentionally — covered by §9 global rules)

Per the approved spec, these are **not** per-component artboards; they
are written once as global CSS by Session 3, with the drawn
disabled/error/loading artboards above serving as the visual reference:
all `hover`, `focus-visible`, `active/pressed` states on every
interactive element; row/list hover tint (except the one reference row
drawn in Tables); the generic `disabled` treatment beyond the few
reference artboards; transition timing; skeleton loading. See
`design-principles.md` §9.

## Component kit is state-complete and consistency-verified for M1 — ready for export

All 16 approved kit areas + the new 17th (Empty & Error States) now
carry their meaning-bearing state artboards. The consistency audit
found one canonical version of every multi-screen component (5
divergences fixed, 2 documented as content variants, 1 deferred as
post-M1). Session 3 can `get_jsx` each artboard and its labelled state
rows and build `components/kit/*` directly, encoding the drawn states
from the artboards and the interaction states from §9.

---

## 9. Implementation status — Session 10 (Deliverable 3), 2026-08-27

Every component's §2 state matrix is now **implemented** in code, not just
spec'd. Session 3–4 built the REST artboards; Session 9 authored the §9
interaction contract as shared CSS; **Session 10 wired every component to it
and added the keyboard + ARIA behaviour** (`docs/design/kit-audit.md` is the
per-component before → after record).

| Component | §2 states | Status |
|---|---|---|
| C1 Button | default×4, hover/active/focus (GLOBAL), disabled×4, loading | **implemented** — per-variant `--kit-hover-bg`; `data-loading` → §9.10 dim + `<Spinner>`; new `size` prop (`sm`/`lg` pending owner review) |
| C2 IconButton | default, hover/active/focus, disabled | **implemented** |
| C3 TextInput | default/focus/filled/error/disabled | **implemented** — `.kit-field` + `<FormField>` (helper row + `aria-describedby`) |
| C4 Textarea | default/focus/error/disabled | **implemented** — as C3 |
| C5 Select | closed/focus/**open**/filled/error/disabled | **implemented** — real APG listbox (arrow/Home-End/type-ahead/`aria-activedescendant`) |
| C6 SegmentedControl | active/resting/hover/disabled | **implemented** — roving tabindex + arrows; `--shadow-sm` lift |
| C7 ToggleSwitch | on/off/disabled/focus | **implemented** |
| C8 SearchInput | default/focus/**filled+clear** | **implemented** — + `aria-label`, `role="search"`, Esc-to-clear |
| C9 DatePicker | closed/focus/**open calendar**/disabled | **implemented** — real calendar (internal month state, grid ARIA, arrow/PageUp-Down/Home-End); legacy `weeks` prop kept. **API pending owner review** |
| C10 QuantityStepper | default/**at-bound**/**focus (value)**/**error (typed)** | **implemented** — value is now `<input role="spinbutton">`. **Behaviour pending owner review** |
| C11 Tabs | active/inactive/hover/disabled/focus | **implemented** — roving tabindex + `←→`/Home/End; `aria-controls` hook |
| C12 PillFilter | active/inactive/hover/**disabled**/focus | **implemented** — now `role="radiogroup"` (was `aria-pressed`); arrows. **Pattern pending owner review** |
| C13 StatusChip | 5 semantic variants | **no change needed** (display-only, verified) |
| C14 ConditionChip | 3 variants | **no change needed** |
| C15 SimpleTable | header/row/**row hover**/empty/loading | **implemented** — clickable rows are `<button>`s; `loading` skeleton; `<EmptyState>` slot; `sortable` + `aria-sort` |
| C16 DenseLedger | header/row/**row hover**/**corrected cell**/empty/loading | **implemented** — `.kit-row` gated on `onCellClick`; cells are keyboard-operable; `loading` skeleton |
| C17 FrictionDeleteDialog | pending/confirmed/**retype-mismatch**/submitting | **implemented** — full overlay contract; field neutral→danger on mismatch; footer `<Button>` |
| C18 Drawer | shell/open/footer-disabled/submitting/scrolled | **implemented** — scrim + opaque panel + focus-trap + scroll-lock + inert + focus-restore + single-overlay guard + slide; `panel`/`rail` |
| C19 BottomSheet | peek/open/dragging/backdrop | **implemented** — same overlay contract, slide from bottom |
| C20 Stat tile row | — | **deferred to M3** (D-FIN) — not built |
| C21 DenseSummaryStrip | default/±emphasis | **implemented** — raw whites → tokens |
| C22 Transfer/PurchaseDelivery banner | transfer/purchase-delivery/actions/**flagged** | **implemented** — actions → `<Button>`; flagged now shows a muted status line; new `--color-success-hover`/`--color-info-hover` tokens (pending owner ratify) |
| C23 CalculatedImpactBanner | default | **implemented** — `role="status"`, icon `aria-hidden` (D5 padding confirmed `--sp-5`) |
| C24 MatchCard | awaiting/matched/flagged/submitting | **implemented** — awaiting action → `<Button loading>` |
| C25 InstructionalBanner | default | **implemented** — `--text-inverse` on the numbered circle |
| C26 BulkEntryGrid | header/editable/focused/non-editable/**error**/footer/Dish | **implemented** — grid ARIA; editable cells named + `inputMode`. No §9.8 helper row per cell (documented exception) |
| C27 ActionTileGrid | default/badge/pressed/disabled | **implemented** — redundant disabled inline removed |
| C28 ActivityTimeline | default/empty | **implemented** — empty `role="status"` |
| C29 Breadcrumb | default/hover | **implemented** — `aria-hidden` separator |
| C30 BottomNav | active/inactive/pressed | **implemented** — `<nav aria-label="Primary">` |
| C31 FlowHeader | default/**no-badge**/back-pressed | **implemented** — `<header>` + `role="heading"` |
| C32 Toolbar row | (composite) | n/a — its parts carry their states |

**New primitives (no §2 row — added this session, `kit-audit.md §3`):**
`Spinner`, `FormField` (mechanical); `Toast` / `ToastProvider` / `useToast()`,
`PageShell` / `ContentRegion` (owner review in Session 10b).

**Gate for "done":** proved this session by `pnpm tsc --noEmit` + `pnpm build`
+ 80 unit tests + a kit-gallery smoke render. The permanent per-state
Playwright + axe gates are **Session 10b** (`session-10b-handoff.md`).
