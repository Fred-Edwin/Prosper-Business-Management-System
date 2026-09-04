# Prosper — Design Principles

**Status:** Approved — binding on every Design Sprint and Development Sprint
from this point forward.
**Source:** Extracted from `docs/design/DESIGN_SYSTEM_PLAN.md` (approved
plan) and `docs/design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md` (house style),
after the Phase 2B execution session that built the full component library
in Paper.design. Where this document and the plan disagree, this document
wins — it reflects what was actually built and approved, including
corrections made during execution.

**Paper.design file:** "Prosper Hotel" (fileId `01M0EZ7TAHZM26KBMWNYT0928X`)
— the canonical visual source of truth. This document is the *why and
when*; the Paper file is the *what*.

---

## 1. House style (binding, inherited from ENTERPRISE_UI_DESIGN_PRINCIPLES.md)

Every rule in `docs/design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md` applies as
written, **except accent color** (§3 below). In summary:

- Dense, compact-by-default, hairline dividers only — no card borders, no
  drop shadows on content containers.
- Light mode only. Geist Sans, 14px base, `tabular-nums` on every numeric
  column. (Switched from Inter — see §6a, `docs/design/font-family.md`.)
- Full-bleed desktop layout, not centered/document-style.
- One primary accent color at ≲5% of pixels; neutrals do 90%+ of the work.
- Radius: 6px default, 4px dense controls, 8px maximum — **except tables,
  which use square corners (0px) by explicit correction, see §4**.
- No gradients, no glassmorphism, no purple-and-cream over-correction, no
  equal-weight KPI tile grids, no bounce/spring motion.

---

## 2. Two shells, one system

- **Admin shell** (desktop-primary): 48px top bar, 240px side nav
  (collapsible to 56px), fluid content, 360px inspector. Built for the
  Admin's dense, analysis-heavy, laptop-first workflow.
- **Staff mobile shell** (Cashier, Store Manager, Canteen Attendant):
  48px header, single-column task content, 56px bottom nav, sticky bottom
  action bar. Built for speed, one-handed use, fast entry, minimal
  friction — a distinct design direction from the Admin shell, not a
  squeezed-down version of it. See `DESIGN_SYSTEM_PLAN.md` §1.3 for the
  full staff-facing criteria (unchanged, carried forward verbatim).
- Both shells share the same token file and component library.

**Shell-level maximize/restore pattern** (added during execution, not in
original plan): any Admin screen with a wide table can collapse the side
nav to its 56px icon rail and hide the inspector, reclaiming width for the
content pane. Entry point: a small icon-only toggle button (expand-corners
glyph) in the table's toolbar. Restore: the same glyph, mirrored, in the
maximized view's header. This is a shell-level state, not a separate
component — see the "Admin Shell — Ledger Maximized" artboard in Paper.
Even maximized, a very wide table may still need a few pixels of
horizontal scroll on a 1440px screen — accepted deliberately in favor of
readable column spacing over cramming, per Admin decision.

---

## 3. The accent color exception

**Binding, explicit override of the house guideline's purple ban.**

- `--color-accent: #3D1E70` — a deep violet drawn from the Prosper Hotel
  logo, deliberately chosen by the business owner as a brand-continuity
  decision. This is the **final** value (darker/more saturated than the
  plan's original provisional anchor of `#4C3B73`–`#5B4785` — the Admin
  reviewed it live in Paper and kept the deeper tone).
- `--color-accent-hover: #4A3480` — tuned to sit one step lighter than the
  final accent value.
- Gold from the logo (`--color-gold-brand: #B8923F`) is **not** a
  component token — it appears only in the two masthead contexts named in
  the original plan (Admin top bar brand mark, login/splash screen), never
  as a button, link, chip, or status color.
- The semantic palette (success/warning/danger/info) stays fully
  independent of the accent. Warning is amber, not gold — deliberately, so
  a selected-row purple tint and a low-stock amber chip never collide.
- Every other rule in the house guideline's anti-slop block still applies
  without exception — the override is scoped to hue only.

---

## 4. Corrections made during execution (binding — supersede the original plan text)

These came from Admin review of the live Paper build and are now the
standard, not exceptions:

1. **Tables use square corners (0px radius), not the house 6px default.**
   Applies to every table variant: the dense Ledger, the Simple Table, and
   any future table.
2. **No avatar in attribution columns.** "Recorded by" / "Added by" style
   columns show the plain name as text only — no initials-circle avatar.
   Avatars remain valid elsewhere (top bar account, audit trail entry
   header, bottom-sheet context) — the correction is scoped to dense table
   attribution columns specifically, where an avatar was assessed as
   noise at that density.
3. **The Ledger is a table, not a separate visual pattern.** Earlier
   drafts treated "Ledger" as a distinct component (description-style rows
   + a footer balance). The approved shape instead is: **one row = one
   product, one day, one location**, with one column per movement type
   (Opening → Purchases → Issues → Production → Transfer In → Transfer Out
   → Sold → Sold Value → Closing → Closing Value), reconciliation-sheet
   style. This is the Admin's single most-used screen — treat changes to
   it as high-stakes.
   - A **per-row running balance** is not part of this shape (balance is
     the Closing/Closing Value columns, once per row, not per movement).
   - A **sticky footer summary row** (dark background, larger type) sits
     below the visible rows showing the current total for the active
     product/location filter.
   - **Corrected cells** are flagged inline: a movement value that has
     been corrected renders in its semantic color (`--color-danger` for
     a negative movement, `--color-success` for a positive one) with a
     1px underline in the same color — never a silent overwrite. The
     cell is the click target for the correction drawer (original vs
     corrected value, who, when). There is **no "CORRECTED" chip** — a
     correction lands in a specific movement *column* (Issues,
     Purchases, …), not on the row as a whole, so the flag is on the
     cell, not the row. Matches `CONVENTIONS.md` §4's correction-entry
     pattern. (Resolved: `DECISIONS.md` ADR-36a, Design Sprint Session
     2. This supersedes the earlier "amber CORRECTED chip" text.)
   - The Ledger has its own **filter bar** (chip-based: Location, Date
     range, +Filter) and a **Columns visibility control** directly above
     it, per the wide-table, many-column use case.
   - Wide ledgers scroll horizontally inside a bounded container sized to
     the real content-pane width (not the artboard) — never let a table
     silently overflow its shell. **Location and Product stay pinned as a
     sticky-left column group** (`position: sticky; left: 0` in the real
     app — Paper's canvas cannot preview sticky positioning, this is a
     Development Sprint implementation note, not an undecided design
     question) with a hairline divider immediately after Product marking
     the boundary between the pinned block and the horizontally-scrolling
     movement/value columns. This applies to the header row, every data
     row, and the sticky footer alike, so the divider forms one
     continuous vertical line down the table.
   - **The amount of horizontal scroll needed depends on Admin Shell
     sidebar state**, since collapsing the sidebar (56px icon rail
     instead of 240px) reclaims ~184px of content-pane width:
     - **Sidebar open (default, ~1200px content pane):** at the Ledger's
       full 11 movement/value columns plus Location/Product/Edit, the
       table exceeds the available width — expect horizontal scroll
       under the sticky Location/Product columns to be the normal case,
       not an edge case.
     - **Sidebar collapsed (icon rail, ~1384px content pane):** most or
       all columns fit without scrolling at the Ledger's default column
       count — this is the intended reason a user reaches for the
       shell-level maximize/collapse control on this specific screen (see
       §2's maximize/restore pattern), not just a general width nice-to-have.
     - Practically: the sticky-left pinned columns and the horizontal
       scroll container are the *same* component in both states — there
       is no separate "narrow" vs "wide" table variant to build. Sidebar
       state only changes how much of the scrollable region is visible
       before scrolling kicks in.
4. **A separate, simpler Table component exists alongside the Ledger** —
   for plain record lists (Customers, Staff, Assets) with a handful of
   columns and no per-movement breakdown. Same square-corner, no-avatar,
   hairline rules; status shown as plain colored text (e.g. "Owes" /
   "Settled"), not a dot+pill chip, at this lower density.
5. **Segmented control active-segment treatment**: the active segment
   needs both a subtle shadow lift (legitimate small-control affordance,
   not a banned container shadow) *and* accent-colored label text — a
   plain white pill with no shadow read as too weak to register as
   "selected" against the house's restrained palette.
6. **Numeric cell typography — the deliberate answer (B3, Design Sprint
   Session 15).** The owner asked what font / weight the ledger's
   numeric cells use and whether it is the right choice for a
   financial / stock table. Confirmed and now a stated rule:
   - **Ledger movement + value cells use `--font-mono`** (Geist Mono,
     switched from JetBrains Mono — see §6a). Monospace is inherently tabular — every digit occupies the
     same advance width — which is exactly the reconciliation-table
     convention: figures line up in their columns so the eye can scan
     and compare down a column without landing on a ragged edge. This
     is the industry-standard choice for a finance/stock table; the
     current build is already correct, this pins it so it isn't
     "improved" away.
   - **Weights:** movement value cells (Opening, Purchases, Issues,
     Production, Transfer In/Out, Sold, …) are `--weight-regular`. The
     **derived-total columns** (Closing, Closing Value) and the **dark
     sticky-footer totals** are `--weight-semibold` — the heavier weight
     is the signal that these are the reconciled bottom-line figures,
     not raw movements. A corrected cell keeps its column's base weight
     and takes the semantic colour + 1px underline from §4.3.
   - **`SimpleTable` numeric columns** (Financials amounts, Assets cost
     basis) that use a proportional font for the row text still render
     their numeric cells with **`font-variant-numeric: tabular-nums`**
     (house rule §1) so those columns align the same way without
     switching to mono.
   - No artboard changed — the kit ledger (`6ET-0`) and the ledger
     screen artboards already render this. This item is
     confirm-and-document only.

---

## 5. Icon library

**Lucide** (thin 1.5px stroke, 24px viewbox source, rendered at 16px
content / 20px nav per the house guideline). Chosen over Phosphor/Radix
icons specifically because it ships as `lucide-react` with real React
components, letting the Development Sprint swap each hand-drawn Paper
placeholder for the real component by visual match — no re-drawing, no
icon-mapping guesswork.

---

## 6. Design tokens (as built — final values)

> **As of Session 9, the tokens live in code:
> `app/design-system/tokens.css`** (the `:root` source of truth) **+
> `app/design-system/tokens.ts`** (typed mirror; a drift-guard test keeps
> them in sync). `app/globals.css` imports `tokens.css`. `lib/tokens.css`
> is a retired redirect stub. The **full** set — including the categories
> the snapshot below never had (z-index, motion, elevation, control /
> icon sizing, opacity, breakpoints, border widths, tracking) — is
> codified there against the owner-signed
> `docs/design/token-reconciliation.md`. This section is now the
> **human-readable mirror of the foundations subset**; the code files are
> authoritative.
>
> **D2 / ADR-41:** `--surface-panel-tint` (the 38%-alpha veil that caused
> "transparent modals") is **retired** for new use — drawer / dialog /
> bottom-sheet panels use the opaque **`--surface-raised`**
> (`oklch(93.3% 0.011 308.3)` — the veil flattened over white; still a
> subtle lavender, never see-through). A deprecated alias is kept one
> session for the not-yet-rebuilt feature screens.

**The Paper file is authoritative for the visual values of the
foundations.** Paper's token set and the codified foundations are
identical (`contentHash 710ac1c5`). Colors are OKLCH (see §7's kit facts)
— do not re-derive to hex.

### 6a. Type family — Geist (switched from Inter, 2026-09-04)

`--font-ui` is now **Geist Sans** and `--font-mono` is now **Geist
Mono**, both via the `geist` npm package (`geist/font/sans`,
`geist/font/mono` — a local variable-font load, not `next/font/google`;
Geist is Vercel's own family, not a Google font). Owner decision — full
rationale in `docs/design/font-family.md`. Weights and the type scale
(§6 above) are unchanged; only the family swapped, so no layout/spacing
values moved.

**Not yet done as part of this swap** — flagged so a future session
doesn't assume it's covered:
- The Paper file (`01M0EZ7TAHZM26KBMWNYT0928X`) still renders Inter /
  JetBrains Mono; `contentHash 710ac1c5` above is now stale for typography
  specifically (colors/spacing/radius are still current). Re-sync Paper's
  font family next time that file is opened for edits, or note the
  divergence to whoever does.
- `--font-display` (Newsreader, login screen only) is untouched — out of
  scope, the owner asked about the app-wide UI/mono fonts, not the
  display serif.

```css
:root {
  --color-gray-50: oklch(98.5% 0 0);
  --color-gray-100: oklch(97% 0.002 247.8);
  --color-gray-200: oklch(93.6% 0.005 258.3);
  --color-gray-300: oklch(88.2% 0.009 264.5);
  --color-gray-400: oklch(78.5% 0.014 262.4);
  --color-gray-500: oklch(65.5% 0.021 263);
  --color-gray-600: oklch(49.4% 0.025 261.7);
  --color-gray-700: oklch(38.2% 0.020 262.6);
  --color-gray-800: oklch(26.8% 0.010 260.7);
  --color-gray-900: oklch(17.7% 0.009 264.3);

  --surface-page: oklch(100% 0 0);
  --surface-subtle: var(--color-gray-50);
  --surface-hover: var(--color-gray-100);
  --surface-selected: rgb(76 59 115 / 7%);
  --surface-active: rgb(76 59 115 / 12%);      /* pressed tint (§9.6) — added Session 9 */
  --surface-raised: oklch(93.3% 0.011 308.3);  /* opaque drawer/dialog panel — D2/ADR-41 */
  /* --surface-panel-tint (#A690B838) RETIRED — was the "transparent modal" bug. Deprecated alias only. */

  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-600);
  --text-tertiary: var(--color-gray-500);
  --text-disabled: var(--color-gray-400);

  --border-subtle: oklch(93.6% 0.005 258.3);
  --border-strong: var(--color-gray-300);

  --color-accent: oklch(28% 0.126 296);
  --color-accent-hover: oklch(39.2% 0.123 293.2);

  --color-success: oklch(52.8% 0.121 155);
  --color-success-bg: oklch(52.8% 0.121 155 / 10%);
  --color-warning: oklch(61.6% 0.130 70.8);
  --color-warning-bg: oklch(61.6% 0.130 70.8 / 10%);
  --color-danger: oklch(53.8% 0.190 21.2);
  --color-danger-bg: oklch(53.8% 0.190 21.2 / 10%);
  --color-info: oklch(53.7% 0.146 252.3);
  --color-info-bg: oklch(53.7% 0.146 252.3 / 10%);

  --color-gold-brand: oklch(68% 0.110 84.2); /* masthead-only, never a component token */

  /* Dark nav fill (sidebar, bottom nav) — see §7 kit facts */
  --nav-bg: oklch(20% 0.092 310);
  --nav-bg-active: rgb(255 255 255 / 12%);
  --nav-bg-hover: rgb(255 255 255 / 6%);
  --nav-bg-avatar: rgb(0 0 0 / 18%);
  --nav-bg-chip: rgb(255 255 255 / 8%);
  --nav-bg-divider-strong: rgb(255 255 255 / 16%);
  --nav-text: rgb(255 255 255 / 68%);
  --nav-text-active: #FFFFFF;
  --nav-text-label: rgb(255 255 255 / 40%);
  --nav-text-subtle: rgb(255 255 255 / 60%);
  --nav-text-strong: rgb(255 255 255 / 85%);
  --nav-border: rgb(255 255 255 / 10%);

  --font-ui: var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: var(--font-geist-mono), "SF Mono", monospace;
  --text-micro: 11px;   --leading-micro: 16px;
  --text-caption: 12px; --leading-caption: 16px;
  --text-sm: 13px;      --leading-sm: 18px;
  --text-body: 14px;    --leading-body: 20px;
  --text-h3: 14px;      --leading-h3: 20px;
  --text-h2: 16px;      --leading-h2: 24px;
  --text-h1: 20px;      --leading-h1: 28px;
  --text-display: 24px; --leading-display: 32px;
  --weight-regular: 400; --weight-medium: 500; --weight-semibold: 550;
  /* semibold softened 600 → 550 app-wide (ADR-63) — Inter is variable, so
   * 550 is a true intermediate weight. Foundation type rendering lives on
   * `body` in app/globals.css: antialiased + font-synthesis:none +
   * font-optical-sizing:none (matches the Paper mockups). Don't re-declare
   * per component; don't restore 600. */

  --sp-1: 2px;   --sp-2: 4px;   --sp-3: 6px;   --sp-4: 8px;
  --sp-5: 12px;  --sp-6: 16px;  --sp-7: 20px;  --sp-8: 24px;
  --sp-9: 32px;  --sp-10: 40px; --sp-11: 48px; --sp-12: 64px;

  --radius-sm: 4px;  /* dense controls */
  --radius-md: 6px;  /* default */
  --radius-lg: 8px;  /* maximum, and status chips */
  /* Tables: 0px, see §4.1 */
}
```

(Live-pulled at end of Sprint 05, `contentHash.tokens: 710ac1c5`. The 6
`--nav-*` alpha tokens beyond `--nav-bg`/`--nav-bg-active`/`--nav-bg-hover`/
`--nav-text`/`--nav-text-active`/`--nav-border` were added during Sprint 05
to replace raw hex values found on the shell chrome — see §7.)

---

## 7. Component inventory — built and approved

All components live in the Paper file (`01M0EZ7TAHZM26KBMWNYT0928X`, page
"Shell+Component kit") across these 16 kit artboards — this table replaces
an earlier, stale grouping that didn't match what was actually built:

| Artboard | id | Contents |
|---|---|---|
| Admin Shell — Desktop (Full-Height Sidebar) | `649-0` | Top bar, side nav (11 items), toolbar, content pane |
| Admin Shell — Desktop (Sidebar Collapsed, Icon Rail) | `67T-0` | Collapsed 56px icon-rail variant, see §2 |
| Mobile Shell — Admin (Drawer Closed) | `6B1-0` | Status bar, hamburger header, content |
| Mobile Shell — Staff (Drawer Closed) | `4Y-0` | Status bar, hamburger header, content, Sticky Action Bar, Bottom Nav |
| Mobile Shell — Sidebar Drawer Open (Admin & Staff) | `1ZP-0` | Drawer-open state for both mobile roles |
| Component Kit — Buttons & Actions | `6BR-0` | Primary/secondary/tertiary/destructive, disabled, icon button |
| Component Kit — Form Controls | `6CG-0` | Text input, select, segmented control, **toggle switch (on/off)** |
| Component Kit — Chips & Status | `6DJ-0` | Semantic status chips, ledger correction/condition chips |
| Component Kit — Tables | `6ET-0` | Simple Table, Dense Ledger |
| Component Kit — Tabs & Filters | `6IW-0` | Underline tabs, pill filter |
| Component Kit — Drawers & Dialogs | `6OE-0` | Friction Delete Dialog (2 states), Edit Drawer |
| Component Kit — Stat Tiles & KPI | `6R4-0` | Hairline stat strip, Dense Summary Strip |
| Component Kit — Banners & Cards | `6SB-0` | Transfer Banner, Match Card, **Calculated Impact Banner** |
| Component Kit — Bulk Entry Grid | `6TT-0` | Per-location editable grid, Valuation Footer |
| Component Kit — Utility & Layout | `6WD-0` | Search/location/avatar row, date picker, breadcrumb, instructional banner, action-tile grid, **Bottom Nav sample, Back-Navigation Flow Header** |
| Component Kit — Bottom Sheet | `6Z4-0` | Peek + open states |
| Component Kit — Empty & Error States | `9U3-0` | `EmptyState` (default + filtered/no-results), `ErrorState` (retry) — see ADR-36d |

**17th kit area added (Design Sprint Session 2):** `EmptyState` /
`ErrorState`. `EmptyState` = icon + title + one-line guidance + optional
single action button; two states (default; filtered / no-results with a
"Clear filters" action). `ErrorState` = same layout, `--color-danger`
icon, "Retry" action. Consumes five M1 surfaces (Assets Register,
Product Catalog, Dense Ledger filtered-empty, mobile Activity timeline,
Financials reconciliation) plus the four role home pages. Resolved:
`DECISIONS.md` ADR-36d.

**18th kit area added (Design Sprint M2-3DF, 2026-08-31):**
`FilterToolbar` — `Component Kit — Filter Toolbar [M2-3DF]` (`L9O-0`),
model `IEA-0`. The persistent labelled-dropdown filter bar that
**replaces the dismissible-pill "Filter Bar" (`GQQ-0`)** — dismissing a
chip removed the control from the UI with no way back (M2 Session 7,
F7-8). Composed from `Select` / `DatePicker` / native checkbox /
`ToggleSwitch` / text / tertiary `Button` — **no new primitive**.
Controlled (`controls[]` + `onChange` + `resultCount` + `resultNoun`);
owns no filter state. `Reset` appears only when a control is off its
default. Six states + a full contract on `L9O-0`. Spec:
`docs/design/filter-toolbar.md`; states matrix `component-states.md` §2
C34. Built + ADR-42-gated by 3-KIT-FILTER; rolled onto every
multi-filter screen (Sales, Customers, Stock Ledger, Assets) by 3e. The
one-tap `PillFilter` (C12) category / location tab-strips on the Stock
Levels screens are **not** converted — a `FilterToolbar` is for the
multi-control filter row, not a single-axis switch.

Four patterns were built ad hoc during Sprint 05 screen reassembly and have
since been formalized into the kit (no longer exceptions):

- **Toggle switch** (On/Off) — Form Controls kit. 40×22 track, 2px padding,
  18px white circular knob. On: `--color-accent` track, knob pushed right
  via `margin-left: auto`. Off: `--border-strong` track, knob at rest on
  the left. Originated on the Product Drawer's per-location availability
  rows.
- **Calculated Impact banner** — Banners & Cards kit. Warning-amber
  (`--color-warning-bg` background, `--color-warning` icon/text), used in
  correction/adjustment drawers to preview the numeric consequence of an
  edit before it's saved. Distinct from the neutral info banner
  (`--color-info-bg`) used for static instructional copy. Originated on
  the Stock Ledger's Movement Correction drawer.
- **Back-navigation flow header** — Utility & Layout kit. A distinct
  header variant from the hamburger-menu header the Staff mobile shell
  ships with by default: back-chevron + title (left) and an
  origin→destination direction badge in `--color-info` (right), 48px
  height, `--border-subtle` bottom hairline. Used on every staff
  "flow" screen (Issue Ingredients, Record Batch Production, Transfer
  Stock, Log Non-Sale, Canteen Transfer Dispatch) — a coverage audit
  found it built identically five times without ever being added to the
  kit; now formalized so it isn't rebuilt ad hoc again.
- **Bottom Nav** — Utility & Layout kit, and also added directly to the
  canonical Mobile Shell — Staff component (`4Y-0`) itself as a 5th
  child alongside the Sticky Action Bar. Persistent Hub/Stock/History
  tab bar — the primary nav for the staff shell's frequent destinations,
  distinct from the hamburger drawer (reserved for secondary/rare
  items). Not every staff screen uses both the Sticky Action Bar and the
  Bottom Nav — use whichever fits the screen's need.

Every component was built directly against the token file (`var(--color-*)`
etc.), reviewed via screenshot at each step, and checked against the house
guideline's Pre-Ship Checklist (spacing scale, contrast, one primary button
per screen, tabular-nums, no forbidden patterns).

---

## 8. Open design decisions

Full context and ownership in `docs/DECISIONS.md` ADR-36. All four are
now resolved (three at Design Sprint Session 2, 2026-08-27; ADR-36b's
stale "open" status caught and corrected during this session's Ledger
review — the code had already resolved it, the doc hadn't caught up).

1. **RESOLVED — "CORRECTED" chip on ledger correction rows.** No chip.
   Corrected cells render in their semantic color with a 1px underline
   in the same color; the cell is the correction-drawer click target
   (§4.3, as rewritten). `components/kit/dense-ledger.tsx` drops the
   amber pill when rebuilt in Session 3. (ADR-36a)

2. **RESOLVED — Ledger Maximize / sidebar-collapse persistence.** The
   Maximize button uses the general Icon Rail collapse, not a bespoke
   component (§2), and the collapsed state persists app-wide —
   `admin-shell-client.tsx` holds `collapsed` above the shell/route
   split and mirrors it to `localStorage`
   (`prosper.admin.sidebarCollapsed`), so it survives both a navigation
   and a full reload (degrades to "expanded" if storage is unavailable).
   Found already implemented and documented as done in code during this
   session's Ledger review — this entry was stale, not re-decided.
   (ADR-36b)

3. **RESOLVED — `FrictionDeleteDialog` button labels.** The component
   takes optional `cancelLabel` / `confirmLabel` / `title` / `bodyCopy`
   / `showArchiveLink` props; each entity passes its own copy, defaults
   keep the generic "Cancel" / "Permanently Delete". Built in Session 3.
   (ADR-36c)

4. **RESOLVED — EmptyState / ErrorState as a kit component.** Yes —
   both, added as the 17th kit area (§7). Designed in Paper this session
   with their states; built in Session 3. (ADR-36d)

---

## 9. Global interaction states (a first-class contract)

**Status: this is the contract every kit component upholds.** Each rule
below is encoded **once** — in the `.kit-*` utilities in `app/globals.css`
and the shared helpers in `components/kit/internal/*` — not re-implemented
per component. The Session 10b–10d Storybook proof harness that used to
assert these per-component via CDP pseudo-states was **removed 2026-09**
(ADR-42 superseded); the rules still hold because the shared utilities
still implement them and the kit is frozen. Feature screens are composed
**from** these components, so they inherit the contract rather than
re-implementing it. A change to a `.kit-*` utility is a deliberate,
owner-flagged kit edit — verify the affected components by hand.

These are the interaction states that are **not** worth a per-component
artboard. The kit encodes each of these **once** as global CSS / a shared
utility, not by reading many near-identical artboards. The few states that
*are* drawn as artboards (button disabled/loading, input focus/error,
toggle disabled, ledger corrected cell, etc.) are enumerated in
`docs/design/component-states.md` §2 and serve as the visual reference;
everything below is the uniform rule for the rest.

1. **Focus-visible ring.** Every interactive element
   (button, icon button, input, textarea, select, tab, pill, toggle,
   link, nav item, action tile, editable grid cell):
   `outline: 2px solid var(--color-accent); outline-offset: 2px;` on
   `:focus-visible` only (keyboard focus), never on mouse `:focus`. On
   dark surfaces (side nav, bottom nav, sticky footer) the ring color
   switches to `var(--nav-text-active)` (white) at the same width and
   offset. The outline is **not** transitioned — it must appear
   instantly.

2. **Input focus border.** Text input / textarea / select / search /
   date field / stepper number field: on *any* focus (mouse or
   keyboard) the border becomes `1px solid var(--color-accent)`, in
   addition to the keyboard-only ring from rule 1. Matches the
   "Text Input — Focus" kit artboard.

3. **Row / list hover tint.** Any clickable row — Simple Table body
   row, Dense Ledger data row, Select menu option, Bottom Sheet list
   item, a timeline row that links — gets `background:
   var(--surface-hover)` on hover. Non-clickable rows get no hover
   tint. This tint is load-bearing (it signals "this row opens
   something"), so the Tables kit artboard also draws it once as a
   labelled reference row.

4. **Selected / active tint.** `var(--surface-selected)` (7% accent).
   Used for the active pill and active underline-tab background, and for
   any genuinely multi-selected row. Never stacked with the hover tint
   — selected wins.

5. **Button hover.** primary → `background: var(--color-accent-hover)`.
   secondary / tertiary / icon button → `background:
   var(--surface-hover)`. destructive → darken (a
   `--color-danger-hover` token if Session 3 adds one, otherwise the
   documented fallback `filter: brightness(0.92)`). No transform, no
   scale, no shadow change.

6. **Active / pressed.** Identical visual to hover, with no additional
   transform. Prosper has **no** press-scale, bounce, or spring motion
   (house rule, §1).

7. **Disabled treatment.** `opacity: 0.5; pointer-events: none;` and,
   where the element has its own text, set the text to
   `var(--text-disabled)`. No greyscale filter, no special cursor
   (removing pointer-events removes the pointer). The drawn
   disabled-state artboards (button primary/destructive, text input,
   toggle) are the reference; every other disabled state is this rule.

8. **Error field pattern.** `border: 1px solid var(--color-danger)`;
   an error/helper text row directly below the field in
   `var(--color-danger)`, `var(--text-caption)` /
   `var(--leading-caption)`, `margin-top: var(--sp-2)`. One pattern for
   every field type (text input, textarea, select, quantity stepper,
   bulk-grid cell).

9. **Transition timing.** `transition: background-color 120ms ease,
   border-color 120ms ease, opacity 120ms ease;` on interactive
   elements. Nothing over 160ms except the drawer / bottom-sheet slide,
   which is `transform 200ms ease` only. Focus outline is never
   transitioned.

10. **Loading / skeleton.** Table / list loading = 3 placeholder rows,
    each a `var(--surface-subtle)` block with a `var(--surface-hover)`
    shimmer sweep on a `1200ms` loop. A button in flight keeps its
    variant color, dims its label to `opacity: 0.7`, shows a 14px
    inline spinner in the label color, and sets `pointer-events: none`.

11. **Searchable `Select`.** A searchable `Select` (combobox with a
    filter input) keeps the full §9 contract of the plain `Select` — the
    filter input is a `.kit-field` (§9.2 accent border on focus), the
    option list scrolls inside a `max-height` container (§10 skeleton
    rule N/A — the list is never a loading surface), and a no-matches
    state renders one non-interactive `var(--text-tertiary)` row, never
    an empty popover.

> **As of Session 10 the §9 contract is implemented per-component; as of the
> Session 10b–10d harness it is _enforced_ per-component (see the §9 header);
> as of Session 11 the shipped Admin screens are composed from those
> components, not hand-authored, so they inherit it.** The rules
> above are authored **once** as shared CSS in `app/globals.css` (`.kit-focus-ring`,
> `.kit-field`, `.kit-row`, `.kit-interactive`, `.kit-skeleton`, `.kit-scrim`,
> `.kit-spinner`) plus the overlay slide utilities **added in Session 10**:
> `.kit-drawer-panel` (right/left `transform` slide, `--ease-decelerate` in /
> `--ease-accelerate` out), `.kit-sheet-panel` (bottom slide),
> `.kit-dialog-panel` (opacity + subtle scale, no bounce — §1). Overlays
> (`Drawer`, `FrictionDeleteDialog`, `BottomSheet`, `MobileNavDrawer`) get the
> full contract — portal, `.kit-scrim`, focus-trap, scroll-lock, background
> `inert`, focus-restore, a single-active-overlay guard — from
> `components/kit/internal/overlay.ts`. The APG roving-tabindex keyboard pattern
> for `Tabs` / `PillFilter` / `SegmentedControl` is
> `components/kit/internal/roving.ts`. Per-component status:
> `docs/design/component-states.md §9`. Kit audit: `docs/design/kit-audit.md`.

---

