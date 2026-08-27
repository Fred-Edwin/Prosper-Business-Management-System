# Session 4c Handoff — Developer (Design Sprint): export the 7 Store Manager + Canteen F2 screens

**Role:** Developer, **Design Sprint** mode, for the Prosper project.
**Phase:** B2 / B3 / B5 of `docs/design/export-workflow.md` (screen
export). This is the **third slice** of Session 4:

- **Session 4a — DONE.** F1 (4) + F3 (3) + Financials (2), verified.
- **Session 4b — DONE (2026-08-27).** The 5 Admin Stock screens
  (`admin-stock-ledger-full-width`, `admin-stock-ledger-sidebar-collapsed`,
  `admin-stock-ledger-drawer-open`, `admin-stock-mobile`,
  `bulk-opening-stock-grid`) exported, kit-swapped, `fixtures.ts`
  written, `/design-preview` routes added, `SCREENS` list updated,
  `pnpm tsc --noEmit` exit 0, all 5 screenshot-verified vs their Paper
  artboards. See `docs/PROGRESS.md` 2026-08-27 "Session 4b".
- **Session 4c — THIS SESSION.** The 7 remaining F2 screens (Store
  Manager ×4 + Canteen ×3) **and** the two role-home swaps.

**You make NO new UI/UX decisions. You wire NO real data, APIs, auth, or
orchestration.** If Paper is wrong, underspecified, or contradicts
`design-principles.md` / `DECISIONS.md`, **STOP and flag it for the
owner**. Do NOT touch `components/kit/*` or `components/shells/*`.

---

## Required reading (before any code)

Same as Session 4b's list — read in order:

1. `CLAUDE.md` (root) — role model, non-negotiables, **pnpm only**, the
   "read `node_modules/next/dist/docs/`" rule, the visible-progress rule.
2. `docs/sprints/session-4-handoff.md` — the original brief. Its "Method
   per screen", "Preview routes", "Verification", "Constraints" sections
   are the binding method.
3. `docs/design/export-workflow.md` — the three rules (`get_jsx` not
   reconstruction; swap don't reconstruct; screenshot-verify every
   screen). If `get_jsx` is blocked, STOP and tell the owner.
4. `docs/PROGRESS.md` — the `2026-08-27 "Session 4b"` entry in full, and
   `docs/DECISIONS.md` **ADR-37** (the two owner-authorised kit changes:
   `DenseLedger` opt-in `showLocation` + `horizontalScroll`; `Drawer`
   `variant="rail"`). Remaining 4b deviations still inline: the bulk-grid
   instruction banner + valuation footer, the `7UD-0` double-active
   sidebar Paper defect, the `BulkEntryGrid` editable-cell text-color
   kit limitation. The shared `admin-stock-ledger-full-width/side-nav.tsx`
   module is `AdminStockSideNav`.

   **Note for this session:** `components/kit/*` remains OUT OF SCOPE
   unless the owner explicitly authorises a change (as they did for
   ADR-37 in 4b). If a Store Manager / Canteen screen diverges from its
   kit component, transcribe inline verbatim and flag it — do not edit
   the kit on your own judgment.
5. `docs/sprints/milestone-1-plan.md` — §3 (master table), §4 (live
   decisions — receipts are persistent banners on the hubs; amber =
   transfer / blue = purchase-delivery; Canteen has its own Transfer
   Dispatch), §5 "Session 4".
6. `docs/CONVENTIONS.md` — §1, §2, **§4 `TODO(mock)`**.
7. `docs/design/design-principles.md` — §2, §4, §7, §9.
8. `docs/design/component-states.md` §2 + §8.
9. `docs/DECISIONS.md` ADR-36.

**Reference files to open first:**
- `docs/design/screens/admin-catalog-mobile/{page.tsx,fixtures.ts}` — the
  canonical mobile-screen transcription (bespoke markup kept verbatim).
- `docs/design/screens/admin-stock-mobile/{page.tsx,fixtures.ts}` — 4b's
  mobile screen (dark summary banner + bespoke pill row + cards + sticky
  action bar).
- `docs/design/screens/bulk-opening-stock-grid/{page.tsx,fixtures.ts}` —
  4b's example of swapping `Tabs` + `BulkEntryGrid` and transcribing a
  divergent banner + footer inline.
- `components/kit/*.tsx` you'll swap to: `banner.tsx`
  (`TransferBanner` / `PurchaseDeliveryBanner`), `action-tile-grid.tsx`,
  `activity-timeline.tsx`, `flow-header.tsx`, `quantity-stepper.tsx`,
  `segmented-control.tsx`, `select.tsx`, `pill-filter.tsx`,
  `bottom-sheet.tsx`.
- The staff shell: `components/shells/staff-shell.tsx` +
  `components/layout/staff-shell-client.tsx` (for the role-home swaps —
  drop content into the shell's slot, do NOT touch the shell).

**Paper file:** `https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X`
— "Prosper Hotel", page "Shell+Component kit".

**Paper MCP setup:** `get_guide({ topic: "paper-mcp-instructions" })` →
`get_basic_info` → `open_file` with fileId `01M0EZ7TAHZM26KBMWNYT0928X` →
`get_jsx` (format `"tailwind"`) in small batches → `get_screenshot` on the
**top-level artboard** for verifying only → `finish_working_on_nodes` on
every inspected node. Paper node IDs must never appear in owner-facing text.

---

## The 7 screens to export (from `milestone-1-plan.md` §3)

### Store Manager (mobile)

| # | Screen | Artboard | Slug | Type |
|---|---|---|---|---|
| 17 | Store Manager Mobile Hub | `8T3-0` | `store-manager-mobile-hub` | screen (both banner variants live here) |
| 18 | Store Manager Flows — Issues & Production | `8XH-0` | `store-manager-flows-issues-production` | screen (2 flow panels) |
| 19 | Store Manager Flows — Transfers & Consumption | `92M-0` | `store-manager-flows-transfers-consumption` | screen (2 flow panels) |
| 20 | Store Manager — Stock Levels | `986-0` | `store-manager-stock-levels` | screen |

### Canteen (mobile)

| # | Screen | Artboard | Slug | Type |
|---|---|---|---|---|
| 21 | Canteen Mobile Operations Hub | `9BA-0` | `canteen-mobile-operations-hub` | screen |
| 22 | Canteen — Transfer Dispatch | `9FE-0` | `canteen-transfer-dispatch` | screen |
| 23 | Canteen — Stock Levels | `9GW-0` | `canteen-stock-levels` | screen |

If this + full screenshot-verification doesn't fit one context window,
split again and flag it (a natural line: SM 4 screens, then Canteen 3).

---

## Method per screen (same as 4a / 4b)

1. `get_tree_summary` / `get_children` to navigate; `get_screenshot` the
   top-level artboard once for orientation.
2. `get_jsx` (tailwind) the full artboard, in small section batches.
3. Drop the Paper artboard frame + the mobile status-bar node. Mobile
   root `w-[390px]` → `w-full`.
4. Swap kit-component spans for kit imports; keep the layout scaffold
   **verbatim**. For a screen table / banner / footer that diverges
   structurally from its kit component, transcribe it **inline** verbatim
   (the 4a/4b precedent — don't drop Paper data, don't edit the kit).
5. Lift literal data into `docs/design/screens/<slug>/fixtures.ts`,
   `TODO(mock)`, verbatim from the artboard. ~20-line file.
6. Write `docs/design/screens/<slug>/page.tsx` as a static skeleton.
7. `finish_working_on_nodes` on every inspected node.

### Notes specific to these screens

- **The two mobile hubs** (`8T3-0`, `9BA-0`) carry the persistent
  banners: `TransferBanner` (amber) + `PurchaseDeliveryBanner` (blue) —
  both named exports of `components/kit/banner.tsx`. Also `ActionTileGrid`
  ("Quick Operations") and `ActivityTimeline` ("Today's Movement Log").
  These render **inside the staff shell** — for `/design-preview` render
  just the hub content wrapped `mx-auto w-[390px]`; for the role-home
  swap drop the content into the existing shell.
- **The flow screens** (`8XH-0`, `92M-0`) use `FlowHeader` (back-nav) and
  per-panel `QuantityStepper` / `Select` / `SegmentedControl`. Each
  artboard has 2 flow panels — check whether they're 2 separate skeletons
  or one screen with both panels stacked (transcribe as drawn).
- **`986-0` / `9GW-0` stock-level screens** — read-only current-level
  views; likely a bespoke card list + `PillFilter`. Check for a kit
  equivalent before swapping; transcribe bespoke markup verbatim.
- **`9FE-0` Canteen Transfer Dispatch** mirrors a Store Manager flow —
  `FlowHeader` + steppers/selects.

---

## Preview routes (Phase B4)

- One thin `app/design-preview/<slug>/page.tsx` per screen. Mobile
  screens wrap in `mx-auto w-[390px] border-x border-solid border-border-subtle`
  (see `admin-stock-mobile`).
- **Update `app/design-preview/layout.tsx`'s `SCREENS` list** — add all 7
  new slugs, ordered by feature after the 4b Admin Stock entries and
  before the F3 entries. Keep the list complete.

---

## Role-home swaps (static)

- **`store-manager-mobile-hub` (`8T3-0`) skeleton** → replace the
  `<EmptyState>` placeholder in `app/store-manager/page.tsx` with the
  real exported skeleton (rendered as the shell's *content* — do not
  touch `staff-shell-client`).
- **`canteen-mobile-operations-hub` (`9BA-0`) skeleton** → replace the
  placeholder in `app/canteen/page.tsx` the same way.
- `app/admin/page.tsx` and `app/cashier/page.tsx` **keep** their
  `<EmptyState>` — no M1 home for Admin or Cashier. They're already clean
  (no `TODO(mock)`).

---

## Verification (all required before calling the session done)

1. **Screenshot-verify EVERY screen against its top-level Paper
   artboard.** Spacing, type scale, structure, borders, colours,
   component fidelity. Flag every mismatch; "looks close" is not the bar.
   (The `/design-preview` left nav overlaps wide/mobile screens in
   screenshots — a harness artifact; verify against the true artboard
   width.)
2. `pnpm tsc --noEmit` exits 0. If `.next/dev/types` complains, `rm -rf
   .next` and retry.
3. `pnpm dev` smoke-check: every new `/design-preview/<slug>` renders
   with no runtime error, plus `/store-manager` and `/canteen` (need a
   local Postgres + `pnpm prisma db seed` and login as the seeded role,
   PIN 1234). Any throwaway Playwright script lives in the repo root and
   is deleted when done (import from `@playwright/test`, not `playwright`).
4. `finish_working_on_nodes` for all inspected Paper nodes.

---

## Wrap-up

- `docs/sprints/milestone-1-plan.md` §5 — mark **Session 4 fully DONE**
  (4a + 4b + 4c); note "all 21 M1 screens exported + verified; ready for
  Session 5 (F1 implement)".
- `docs/PROGRESS.md` — add a "Session 4c" entry: screens/slugs exported,
  `fixtures.ts` files, kit swaps vs inline transcriptions, the two role
  homes swapped, `SCREENS` additions, anything flagged.

---

## Constraints (unchanged)

- **Design Sprint role.** NO real data, API calls, auth logic, business
  rules, or orchestration. Skeletons are static.
- **NO new UI/UX decisions.** Missing / contradictory → STOP and flag.
- **`get_jsx` is required and TRANSCRIBED, not reinterpreted.** Keep the
  token-ref classes it emits.
- **Swap, don't reconstruct** — kit spans become kit imports; scaffold
  stays verbatim; structurally-divergent tables/banners/footers are
  transcribed inline verbatim (4a/4b precedent).
- pnpm only. Read `node_modules/next/dist/docs/` for any route API.
- Post a checklist up front; update it per screen.
- Do NOT touch `components/kit/*` or `components/shells/*`.
- Split if 7 screens don't fit one context window with verification.
