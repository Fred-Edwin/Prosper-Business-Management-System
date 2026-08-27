# Session 4b Handoff — Developer (Design Sprint): export the remaining 12 F2 screens

---

> **STATUS (2026-08-27): 4b DONE — split again into 4b + 4c.** Per
> `export-workflow.md` "Session discipline" the 12 screens were split
> (owner approved): **4b (this file, done) = the 5 Admin Stock screens**
> (`admin-stock-ledger-full-width`, `admin-stock-ledger-sidebar-collapsed`,
> `admin-stock-ledger-drawer-open`, `admin-stock-mobile`,
> `bulk-opening-stock-grid`) — exported, kit-swapped, `fixtures.ts`
> written, `/design-preview` routes added, `SCREENS` list updated,
> `pnpm tsc --noEmit` exit 0, all 5 screenshot-verified vs their Paper
> artboards. **Two owner-authorised kit changes were made
> (DECISIONS.md ADR-37, both additive + backward-compatible):**
> `dense-ledger.tsx` gained opt-in `showLocation` + `horizontalScroll`
> props (the Admin Stock ledger's Location column); `drawer.tsx` gained
> a `variant="rail"` (docked right-edge rail — the ledger-correction
> and Financials payment drawers). Paper artboards `6ET-0` / `6OE-0`
> are stale w.r.t. these and need a follow-up Design Sprint. The
> role-home swaps did NOT happen here (the two hub screens `8T3-0` /
> `9BA-0` are in 4c). See `docs/PROGRESS.md` 2026-08-27 "Session 4b".
> **4c (`docs/sprints/session-4c-handoff.md`) = the 7 Store Manager +
> Canteen screens + the two role-home swaps.**
> Everything below is the original 4b brief, still authoritative for
> method.

---

**Role:** Developer, **Design Sprint** mode, for the Prosper project.
**Phase:** B2 / B3 / B5 of `docs/design/export-workflow.md` (screen
export). This is the **second half** of Session 4 — Session 4a exported
F1 (4 screens) + F3 (3 screens) + Financials (2 screens), all verified.
This session does the 12 remaining F2 screens **and** swaps two
role-home placeholders for their real skeletons.

**You make NO new UI/UX decisions. You wire NO real data, APIs, auth, or
orchestration.** If Paper is wrong, underspecified, or contradicts
`design-principles.md` / `DECISIONS.md`, **STOP and flag it for the
owner** — it goes back to a design sprint, it is not decided here. Do
NOT touch `components/kit/*` or `components/shells/*` — Session 3 is
complete and verified; Session 4a did not touch them either.

---

## Required reading (before any code)

Read these in order — this is a hard requirement, not a suggestion:

1. `CLAUDE.md` (root) — role model, non-negotiables, **pnpm only**, the
   "This is NOT the Next.js you know — read `node_modules/next/dist/docs/`"
   rule (read the relevant `01-app` page/layout guide before touching a
   route file), the **visible-progress** rule (post a checklist, update
   it per screen as you go).
2. `docs/sprints/session-4-handoff.md` — **the original Session 4 brief.
   Its "Method per screen (Phase B2 / B3)", "Preview routes (Phase B4)",
   "Verification", and "Constraints" sections are the binding method for
   THIS session too.** Read the status block at the top for what 4a did.
3. `docs/design/export-workflow.md` — re-read "Why this exists (the
   Sprint 06 failure)" and the three rules: `get_jsx` not
   reconstruction; **swap don't reconstruct**; screenshot-verify every
   screen. If `get_jsx` is blocked for the session, **STOP and tell the
   owner** — do not fall back to `get_computed_styles`.
4. `docs/PROGRESS.md` — the `2026-08-27 "Session 4a"` entry in full
   (what shipped, the deviations, the `_kit`→`kit` fix, the Financials
   Option-A KPI decision).
5. `docs/sprints/milestone-1-plan.md` — §3 (the 21-screen master table
   with artboard IDs), §4 (live design decisions — no
   `/admin/stock/reconciliation` route; receipts are persistent banners
   on the hubs; amber = transfer / blue = purchase-delivery banner;
   Canteen has its own Transfer Dispatch), §5 "Session 4" (4a done, 4b
   outstanding).
6. `docs/CONVENTIONS.md` — §1 folder structure, §2 naming, **§4 the
   `TODO(mock)` convention** (reserved for deferred real integration —
   not a general TODO).
7. `docs/design/design-principles.md` — §2 (two shells), §4 (component
   behaviours), §7 (kit inventory), §9 (global interaction rules —
   already in `app/globals.css`, do not re-specify per screen).
8. `docs/design/component-states.md` §2 + §8 — which states each screen
   surfaces; the corrected-cell convention (ADR-36a: underlined
   semantic-color cell, **no chip**).
9. `docs/DECISIONS.md` ADR-36 (a/b/c/d) — build against the design **as
   approved**; the OPEN sub-questions (collapse persistence ADR-36b) are
   for the Dev Sprint, not this one.

**Reference files to open first** (the "done right" output style):
- `docs/design/screens/admin-catalog-product-catalog/{page.tsx,fixtures.ts}`
  — the canonical verbatim-transcription screen.
- `docs/design/screens/admin-financials-full-table/{page.tsx,fixtures.ts,side-nav.tsx}`
  — 4a's example of a full admin screen with an **extracted shared
  sidebar module** and inline table transcription.
- `docs/design/screens/admin-financials-payment-drawer-open/page.tsx` —
  4a's example of a **docked side-rail** screen-state that reuses a
  sibling screen's fixtures + sidebar.
- A few `components/kit/*.tsx` you'll swap to: `dense-ledger.tsx`,
  `dense-summary-strip.tsx`, `pill-filter.tsx`, `tabs.tsx`,
  `banner.tsx`, `action-tile-grid.tsx`, `activity-timeline.tsx`,
  `flow-header.tsx`, `bulk-entry-grid.tsx`, `quantity-stepper.tsx`,
  `drawer.tsx`, `calculated-impact-banner.tsx`, `bottom-sheet.tsx`,
  `instructional-banner.tsx`.

**Paper file:** `https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X`
— "Prosper Hotel", page "Shell+Component kit".

**Paper MCP setup** (per `session-4-handoff.md`):
1. `get_guide({ topic: "paper-mcp-instructions" })` — read once.
2. `get_basic_info` — artboards, fonts, tokens.
3. `open_file` with fileId `01M0EZ7TAHZM26KBMWNYT0928X` so it's sticky.
4. `get_jsx` (format `"tailwind"`) is the REQUIRED extraction tool, in
   small node batches (one screen section at a time).
5. `get_screenshot` on the **top-level artboard** (never an inner frame)
   is for VERIFYING, never as input to writing code.
6. `finish_working_on_nodes` on every inspected node when done.
7. Paper node IDs must never appear in text the owner reads.

---

## The 12 screens to export (from `milestone-1-plan.md` §3)

Slugs are fixed — use them for both the `docs/design/screens/<slug>/`
folder and the `/design-preview/<slug>` route.

### Admin Stock — Ledger cluster

| # | Screen | Artboard | Slug | Type |
|---|---|---|---|---|
| 7 | Admin Stock — Ledger (Full Width) | `798-0` | `admin-stock-ledger-full-width` | screen |
| 8 | Admin Stock — Ledger (Sidebar Collapsed) | `7G9-0` | `admin-stock-ledger-sidebar-collapsed` | screen-state (shell collapsed) |
| 9 | Admin Stock — Ledger (Drawer Open) | `7LJ-0` | `admin-stock-ledger-drawer-open` | screen-state (correction drawer) |
| 10 | Admin Stock — Mobile | `8Q4-0` | `admin-stock-mobile` | screen |
| 11 | Bulk Opening Stock Grid | `7UD-0` | `bulk-opening-stock-grid` | screen |

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

**If this does not fit one context window WITH proper screenshot
verification of each, split again** (`export-workflow.md` "Session
discipline"). A natural split: the 5 Admin Stock screens in 4b, the 7
Store Manager + Canteen screens in 4c. Flag the split to the owner and
update this handoff.

---

## Method per screen (same as `session-4-handoff.md` — summary)

1. `get_tree_summary` / `get_children` to navigate; `get_screenshot` the
   **top-level artboard** once for orientation.
2. `get_jsx` (tailwind) the full artboard, in small section batches.
3. **Drop the Paper artboard frame** so the screen fills the viewport:
   desktop → `w-full min-h-screen`, fixed-width sidebar, body `flex-1`;
   mobile → root `w-[390px]` → `w-full`. Drop the mobile status-bar node.
4. **Swap every span that corresponds to a kit component for the kit
   import.** The layout scaffold *around* the components stays
   **verbatim** from `get_jsx` — do not restructure, do not "tidy".
5. **Lift literal data** into `docs/design/screens/<slug>/fixtures.ts`,
   marked `TODO(mock)`. Extract values **verbatim from the artboard** —
   never invent data. ~20-line file.
6. Write `docs/design/screens/<slug>/page.tsx` as a **static skeleton**:
   no `useState` beyond the cosmetically unavoidable, no fetches, no
   auth, no orchestration.
7. **Screen-states** (`7G9-0`, `7LJ-0`): export as their own skeleton
   under the slug, OR as a component if it's a sub-part the real screen
   mounts conditionally (a drawer body). `7LJ-0`'s correction drawer is
   a drawer body → export the panel like 4a's `product-drawer` /
   `asset-drawer`; `7G9-0` is the whole screen with the shell in its
   collapsed state → own skeleton.
8. `finish_working_on_nodes` on every inspected node.

### Notes specific to these screens

- **The 3 Admin Stock ledger screens share the admin-shell sidebar**
  (Stock active). Extract it once to
  `docs/design/screens/admin-stock-ledger-full-width/side-nav.tsx` and
  import it from all three — exactly the pattern 4a used for
  `admin-financials-full-table/side-nav.tsx`. For `7G9-0` the sidebar is
  the **collapsed icon-rail** variant — that's a *different* sidebar
  markup (transcribe `7G9-0`'s own sidebar frame; don't reuse the full
  one).
- **`DenseLedger` corrected cell** = underlined `--color-danger` /
  `--color-success` text, **no chip** (ADR-36a). The cell is the
  correction click target (`onCellClick`). Check `components/kit/dense-ledger.tsx`
  for the actual prop shape before swapping.
- **`7LJ-0` correction drawer** uses the kit `Drawer` with a `subtitle`
  (the context-subtitle header variant — "Store · Beef Fillet · Aug 24")
  and likely a `CalculatedImpactBanner` + `QuantityStepper` + `Textarea`
  in the body. Swap those; keep the drawer body scaffold verbatim.
- **The two mobile hubs** (`8T3-0`, `9BA-0`) carry the persistent
  banners: `TransferBanner` (amber) + `PurchaseDeliveryBanner` (blue) —
  both are named exports of `components/kit/banner.tsx`. Also
  `ActionTileGrid` ("Quick Operations") and `ActivityTimeline`
  ("Today's Movement Log"). These render **inside the staff shell**
  (`staff-shell-client`) — for the `/design-preview` route render just
  the hub content; for the role-home swap (below) drop the content into
  the existing shell.
- **The flow screens** (`8XH-0`, `92M-0`) use `FlowHeader` (back-nav)
  and per-panel `QuantityStepper` / `Select` / `SegmentedControl`.
- **`7UD-0` bulk grid** uses `BulkEntryGrid` + `InstructionalBanner`
  (numbered) + `Breadcrumb` + `DenseSummaryStrip` (valuation footer).

---

## Preview routes (Phase B4)

- One thin `app/design-preview/<slug>/page.tsx` per screen, importing the
  skeleton + `fixtures.ts`. For mobile screens wrap in
  `mx-auto w-[390px]` (see `admin-catalog-mobile`); for drawer/rail
  states use a tinted backdrop (see `product-drawer` /
  `admin-financials-payment-drawer-open`).
- **Update `app/design-preview/layout.tsx`'s `SCREENS` list** — add all
  12 new slugs, ordered by feature after the existing F2-Financials
  entries and before the F3 entries. Keep the list complete.

---

## Role-home swaps (Phase C-adjacent, but static)

- **`store-manager-mobile-hub` (`8T3-0`) skeleton** → replace the
  `<EmptyState>` placeholder in `app/store-manager/page.tsx` with the
  real exported skeleton (rendered as the shell's *content* — do not
  touch `staff-shell-client`).
- **`canteen-mobile-operations-hub` (`9BA-0`) skeleton** → replace the
  placeholder in `app/canteen/page.tsx` the same way.
- `app/admin/page.tsx` and `app/cashier/page.tsx` **keep** their
  `<EmptyState>` — no M1 home screen for Admin (dashboard is later) or
  Cashier (New Order is post-M1). They are already clean (no
  `TODO(mock)` marker) — nothing to change there.

---

## Verification (all required before calling the session done)

1. **Screenshot-verify EVERY screen and EVERY screen-state against its
   top-level Paper artboard.** Check spacing, type scale, table
   structure, which-side borders, colours, component fidelity. Flag
   every mismatch. "Looks close" is not the bar — if you cannot make it
   match, STOP and flag it. (Note: the `/design-preview` left nav
   overlaps wide/mobile screens in screenshots — a harness artifact;
   verify against the true artboard width, e.g. render at a viewport
   wide enough that the 256px preview nav + the screen both fit.)
2. `pnpm tsc --noEmit` exits 0. If `.next/dev/types` complains about a
   route path, `rm -rf .next` and retry.
3. `pnpm dev` smoke-check: every new `/design-preview/<slug>` route
   renders with no runtime error, plus `/store-manager` and `/canteen`
   (the two rewired role homes — need a local Postgres +
   `pnpm prisma db seed` and login as the seeded role, PIN 1234; the
   `/design-preview/*` routes need no login). Any throwaway Playwright
   script MUST live in the repo root and be deleted when done.
4. `finish_working_on_nodes` for all inspected Paper nodes.

---

## Wrap-up

- `docs/sprints/milestone-1-plan.md` §5 — mark **Session 4 fully DONE**
  (4a + 4b); note "all 21 M1 screens exported + verified; ready for
  Session 5 (F1 implement)".
- `docs/PROGRESS.md` — add a "Session 4b" entry: which screens/slugs
  exported, which `fixtures.ts` files created, the shared `side-nav.tsx`
  module(s), what was pixel-verified, the two role homes swapped, the
  `SCREENS` list additions, and anything flagged (a Paper mismatch, a
  4b/4c split, a state with no artboard).
- If you split into 4c, write `session-4c-handoff.md` the same way this
  file was written, and update this file's status block.

---

## Constraints (unchanged from Session 4)

- **Design Sprint role.** NO real data, API calls, auth logic, business
  rules, or orchestration. Skeletons are static.
- **NO new UI/UX decisions.** Paper + `design-principles.md` +
  `DECISIONS.md` are the authority. Missing / contradictory → STOP and
  flag.
- **`get_jsx` is the required tool and its output is TRANSCRIBED, not
  reinterpreted.** Never reconstruct from computed styles or
  screenshots. Keep the token-ref classes `get_jsx` emits.
- **Swap, don't reconstruct** — kit-component spans become kit imports;
  the scaffold around them stays verbatim.
- pnpm only. Read `node_modules/next/dist/docs/` for any route/layout
  API you touch.
- Post a checklist up front; update it as each screen lands.
- Do NOT touch `components/kit/*` or `components/shells/*`.
- Split across sessions if 12 screens don't fit one context window with
  proper verification — flag the split.
