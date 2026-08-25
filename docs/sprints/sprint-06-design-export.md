# Sprint 06 — Design Export (Components + Screen Skeletons)

**Role for this session:** Developer (export/scaffolding task — no new UI/UX
decisions, no real data/API wiring)
**Paper file:** https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/1-0
**Status:** Done. Kit components (16/16, 28 files) and shells (all 5
states, 4 files) exported to `components/kit/`/`components/shells/`. All
21 screens exported to `docs/design/screens/<slug>/` (`page.tsx` +
`mock-data.ts`), `/design-preview` route built listing all 21. Route
rewiring done — `app/admin/admin-shell-client.tsx` and
`components/layout/staff-shell-client.tsx` rebuilt against the new
shells; the four role home pages use inline placeholders (no Empty State
artboard exists in the approved kit). Verified: `pnpm tsc --noEmit`
clean, `pnpm dev` boots, all 21 preview routes + `/login` + `/` return
correct HTTP status, screenshot-compared a sample against Paper directly.
See `docs/sprints/sprint-06-design-export-handover.md` for the full
extraction record and flagged items.

---

## 1. What this session does

Convert the approved Paper Component Kit and all 21 rebuilt screens
(Sprint 05) into real code:

1. **16 kit components → `components/kit/`** and **5 shells →
   `components/shells/`** — real, reusable `.tsx` components.
2. **21 screens → `docs/design/screens/<screen>/`** — a `page.tsx`
   skeleton (composed only from `components/kit`/`components/shells`,
   real data hardcoded, no fetches/APIs/auth) plus a `mock-data.ts` with
   that screen's real data, marked `TODO(mock)` per `CONVENTIONS.md`.
3. **`app/design-preview/`** — thin routes that render each screen
   skeleton, so `pnpm dev` → `/design-preview/<screen>` shows every
   screen live in the browser for fidelity checking against Paper.

This is a **skeleton export, not a live implementation.** No database
queries, no API routes, no auth checks, no business logic — those are
Development Sprint work per `CLAUDE.md`'s SDLC and come after this.

## 2. Read first, in this order

1. `docs/design/design-principles.md` — binding house rules, the full
   16-artboard kit table (§7), and the live token snapshot (§6). This is
   the authoritative written spec.
2. `docs/design/paper-workflow-lessons.md` — 7 concrete Paper-extraction
   gotchas from the last sprint (layout containment, duplicate-rename
   discipline, nested-duplicate positioning, screenshot-scoping, flex
   gap/space-between traps, nav-activation verification, flex-wrap grid
   sizing). Read before pulling anything directly from Paper.
3. `docs/CONVENTIONS.md` — naming, folder structure, the `TODO(mock)`
   convention.

Do **not** read `docs/sprints/sprint-05-screen-reassembly-handover.md`
unless you need to trace a specific screen's design history — it's a
session diary from the design sprint, not a task brief; everything you
need from it is already folded into `design-principles.md` and this
file.

## 3. Setup

- Re-pull tokens live from Paper: `get_tokens({format: "css"})`. Paper is
  authoritative — use this pull directly, no need to cross-check it
  against `design-principles.md` §6 first.
- Confirm `pnpm dev` runs clean before starting (baseline check).

## 4. Folder structure to build

```
components/kit/
  button.tsx, icon-button.tsx
  text-input.tsx, select.tsx, segmented-control.tsx, toggle-switch.tsx,
  textarea.tsx, date-picker.tsx
  status-chip.tsx, condition-chip.tsx
  simple-table.tsx, dense-ledger.tsx
  tabs.tsx, pill-filter.tsx
  drawer.tsx, friction-delete-dialog.tsx
  stat-tile-row.tsx, dense-summary-strip.tsx
  banner.tsx (variants: transfer / purchase-delivery / calculated-impact / info)
  match-card.tsx
  bulk-entry-grid.tsx
  search-input.tsx, breadcrumb.tsx, instructional-banner.tsx,
  bottom-nav.tsx, flow-header.tsx, action-tile-grid.tsx
  bottom-sheet.tsx

components/shells/
  admin-shell.tsx, admin-shell-collapsed.tsx
  mobile-shell-admin.tsx, mobile-shell-staff.tsx, mobile-shell-drawer-open.tsx

docs/design/screens/<screen-slug>/
  page.tsx        — skeleton JSX, composed only from components/kit + components/shells
  mock-data.ts     — this screen's mock data only, TODO(mock)
  (21 subfolders — one per screen, see §5)

app/design-preview/
  layout.tsx           — nav listing all 21 screens
  [screen]/page.tsx     — thin import-and-render of the matching docs/design/screens/<screen>/page.tsx
```

## 5. Screens to export (21)

Admin desktop: Product Catalog, Product Drawer, Product Delete Dialog,
Stock Ledger (Full Width), Stock Ledger (Sidebar Collapsed), Stock
Ledger (Drawer Open), Bulk Opening Stock Grid, Financials (Full Table),
Financials (Payment Drawer Open), Assets Register, Asset Delete Dialog,
Asset Drawer.

Admin mobile: Catalog, Stock.

Store Manager: Mobile Hub, Issues & Production flow, Transfers &
Consumption flow, Stock Levels.

Canteen: Mobile Operations Hub, Transfer Dispatch, Stock Levels.

Pull each screen's exact structure/data via `get_tree_summary` +
`get_computed_styles`/`get_jsx` on its Paper artboard — see
`design-principles.md` §7 for kit artboard IDs; screen artboard IDs are
in the live Paper file itself (`get_basic_info`), not reproduced here
since the file is the source of truth.

## 6. Build rules

- **Component extraction order:** primitives before things that compose
  them — Buttons → Form Controls → Chips & Status → Tables → Tabs &
  Filters → Drawers & Dialogs → Stat Tiles & KPI → Banners & Cards →
  Bulk Entry Grid → Utility & Layout → Bottom Sheet → shells last.
- Pull exact values via `get_computed_styles`/`get_jsx` — never eyeball
  from a screenshot.
- Use token CSS variables directly (`var(--color-accent)` etc.) — never
  re-derive to raw hex/px.
- **Every component must ship with every state Paper actually designed for it** — this is not optional per-component polish, it's part of "done." Concretely, before moving to the next component, check whether Paper has more than one visual state for it and build all of them:
  - `friction-delete-dialog.tsx` — both states (disabled/pending-retype, enabled/confirmed-red)
  - `tabs.tsx` / `pill-filter.tsx` — active and inactive segment styles
  - `toggle-switch.tsx` — on and off
  - `segmented-control.tsx` — active (shadow-lift + accent text) and inactive
  - `status-chip.tsx` / `condition-chip.tsx` — every semantic color used across the 21 screens (success/warning/danger/info, Good/Needs Repair/Decommissioned)
  - `button.tsx` — primary/secondary/tertiary/destructive, and the disabled variant shown in the Buttons & Actions kit artboard
  - text/select/date inputs — default, focused (has a visible focus ring in Paper), and disabled, all three of which are separately designed in the Form Controls kit artboard
  - Any other component with more than one example on its kit artboard — check the artboard, don't assume single-state.
  These are meaning-bearing states designed in Paper, not decoration — pull them the same way as the base state (`get_computed_styles`/`get_jsx`), do not improvise or skip any of them.
- **Decorative interaction states Paper never designed** (hover/press feedback that isn't shown as its own artboard state) are the one thing NOT re-fetched from Paper — build per the house rule: hover = subtle shift or `--color-accent-hover` where defined; focus = 2px accent ring; disabled = reduced opacity, no pointer events. This only applies to states Paper doesn't already show explicitly — check the kit artboard first before assuming a state is "just decorative."
- Screen skeletons compose only from `components/kit`/`components/shells`
  — no new one-off markup. If a screen seems to need something not in
  the kit, stop and flag it rather than inventing a one-off.

## 7. Two things already decided — don't re-litigate

1. **Ledger Maximize button** = the general Icon Rail sidebar-collapse
   state (`components/shells/admin-shell-collapsed.tsx`), not a
   separate bespoke "maximized" component. One sub-question is still
   open: does the collapse persist app-wide after navigating away from
   the Ledger, or snap back when leaving that screen? Ask the Admin
   before implementing real toggle logic (not this session's job, but
   worth flagging now if it affects shell component API design).
2. **Transfer vs. purchase-delivery banner color** — amber (warning) for
   transfers, blue (info) for purchase deliveries — is final. Build
   `banner.tsx` with both as named variants, not a single generic
   banner with a color prop.

## 8. When done

- Verify: `pnpm dev`, browse every screen at `/design-preview/<screen>`,
  screenshot-compare a sample against Paper directly. Flag anything that
  couldn't be matched exactly rather than shipping a silent
  approximation.
- Update this file's `Status:` field and add an entry to
  `docs/PROGRESS.md` per the standard end-of-sprint convention.
