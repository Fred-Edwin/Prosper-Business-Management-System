# Session 4 Handoff — Developer (Design Sprint): re-export all M1 screens

---

> **SPLIT RECORDED (2026-08-27).** The 21-screen scope was split per
> `export-workflow.md` "Session discipline" (owner approved).
>
> **Session 4a — DONE (9 of 9 in-scope screens).** F1
> (`admin-catalog-product-catalog` re-export/normalise,
> `admin-catalog-mobile`, `product-drawer`, `product-delete-dialog`) + F3
> (`admin-assets-register`, `asset-delete-dialog`, `asset-drawer`) +
> **Financials** (`admin-financials-full-table`,
> `admin-financials-payment-drawer-open`) — all exported, kit-swapped,
> `fixtures.ts` written, `/design-preview` routes added, `SCREENS` list
> `_kit`→`kit` fixed, `pnpm tsc --noEmit` exit 0, every screen
> screenshot-verified against its Paper artboard. See `docs/PROGRESS.md`
> 2026-08-27 "Session 4a".
>
> **Financials resolution:** `7ZJ-0` was body-less in Paper (sidebar
> only). The **owner copied the body from `85W-0` into `7ZJ-0`** in Paper
> mid-session, unblocking it. On the KPI-stat-strip contradiction
> (drawn in Paper, but D-FIN / ADR-36 put it in M3) the **owner chose
> Option A: export both screens exactly as drawn, KPI strip included**,
> with a PROGRESS note that a later design sprint removes it. FIN-2's
> "drawer" is a **docked 420px right rail**, not a floating modal —
> transcribed as drawn. The two Financials screens share
> `admin-financials-full-table/side-nav.tsx` (`AdminShellSideNav`) and
> `admin-financials-full-table/fixtures.ts` (FIN-2 reuses it +
> adds a small drawer-rail fixture).
>
> **Session 4b — OUTSTANDING.** The 12 remaining F2 screens (`798-0`,
> `7G9-0`, `7LJ-0`, `8Q4-0`, `7UD-0`, `8T3-0`, `8XH-0`, `92M-0`, `986-0`,
> `9BA-0`, `9FE-0`, `9GW-0`) + the Store Manager Hub (`8T3-0`) and Canteen
> Hub (`9BA-0`) role-home swaps in `app/store-manager/page.tsx` /
> `app/canteen/page.tsx`. `/admin` + `/cashier` keep their `EmptyState`
> (already clean — no `TODO(mock)` to downgrade).
>
> Everything below is the original Session 4 brief, still authoritative
> for method.

---

**Role:** Developer, **Design Sprint** mode, for the Prosper project.
**Phase:** B2 / B3 / B5 of `docs/design/export-workflow.md` (screen
export — a *separate* session from the Session 3 kit + shell export,
which is done).

**Your job:** for every M1 screen artboard still un-exported, `get_jsx`
the artboard, drop the artboard frame so it fills the viewport, **swap**
kit-component spans for the real kit imports, lift literal data into a
`fixtures.ts` marked `TODO(mock)`, and write a **static skeleton**
`page.tsx`. Add a thin `/design-preview/<slug>` route per screen. Then
**screenshot-verify every screen against its Paper artboard** — the
mandatory gate. Finally replace two of the four role-home placeholders
with their real skeletons.

**You make NO new UI/UX decisions. You wire NO real data, APIs, auth, or
orchestration.** If Paper is wrong, underspecified, or contradicts
`design-principles.md` / `DECISIONS.md`, **STOP and flag it for the
owner** — it goes back to a design sprint, it does not get decided here.
Do NOT touch `components/kit/*` or `components/shells/*` — Session 3 is
complete and verified.

---

## What Session 3 already did (done — do not redo)

Session 3 (parts 1 + 2, both `docs/PROGRESS.md` 2026-08-27) re-exported
the **entire component kit and all 4 shells** by verbatim `get_jsx`
transcription, `tsc` clean, screenshot-verified:

- **`components/kit/*`** — all 24 M1 kit components, verbatim
  transcriptions of their Paper artboards (arbitrary values, exact DOM
  nesting, token refs, SVG path data preserved; duplicate state markup
  merged behind props). `stat-tile-row` was **deleted** (M3 — do not
  rebuild). The kit gallery is `app/design-preview/kit/page.tsx` (plain
  `kit`, **not** `_kit`).
- **`components/shells/*`** — `admin-shell` (from `649-0` + `67T-0`, one
  component with a `collapsed` prop), `staff-shell` (from `4Y-0`, imports
  the kit `BottomNav`), `mobile-shell-admin` (from `6B1-0`),
  `mobile-nav-drawer` (from `1ZP-0`). Prop contracts recovered from git
  `a654e2a`.
- **Route clients rewired** — `app/admin/admin-shell-client.tsx` and
  `components/layout/staff-shell-client.tsx` consume the new shell +
  `BottomNavItem` (`{ key, label, activeIcon, inactiveIcon }`) API.
- `pnpm tsc --noEmit` exits 0. Role homes + kit gallery + the one
  reference screen smoke-checked with real login, no runtime error.

**The kit component APIs you must swap to** (these changed from the old
hand-written kit — check the actual files before swapping):

| Component | New shape (abbreviated) |
|---|---|
| `components/kit/button.tsx` | `<Button variant?="primary"\|"secondary"\|"tertiary"\|"destructive" loading? disabled? />` |
| `components/kit/empty-state.tsx` | `<EmptyState variant?="default"\|"filtered" title description actionLabel? onAction? icon? />` |
| `components/kit/bottom-nav.tsx` | `<BottomNav items={BottomNavItem[]} activeKey onNavigate />`, `BottomNavItem = { key, label, activeIcon, inactiveIcon }` |
| `components/kit/drawer.tsx` | `<Drawer open onClose title subtitle? footer? >children</Drawer>` — `subtitle` switches to the context-subtitle header variant |
| `components/kit/friction-delete-dialog.tsx` | label/copy props per ADR-36c (`cancelLabel` / `confirmLabel` / `title` / `bodyCopy` / `showArchiveLink`) |
| `components/kit/dense-ledger.tsx` | corrected cell = underlined semantic-color text, **no chip** (ADR-36a); the cell is the correction click target (`onCellClick`) |

Read `docs/design/screens/admin-catalog-product-catalog/page.tsx` +
`mock-data.ts` and a few `components/kit/*.tsx` (e.g. `drawer.tsx`,
`dense-ledger.tsx`) first — they are the reference for the
verbatim-transcription output style.

---

## Required reading (before any code)

- `CLAUDE.md` (root) — role model, non-negotiables, **pnpm only**, the
  "This is NOT the Next.js you know — read `node_modules/next/dist/docs/`"
  rule (read the relevant `01-app` layout/page guide before touching
  any route/layout file), the **visible-progress** rule (post a
  checklist, update it per item as you go).
- `docs/design/export-workflow.md` — THE binding method. Re-read
  "Why this exists (the Sprint 06 failure)", the three rules
  (`get_jsx` not reconstruction; **swap don't reconstruct**;
  screenshot-verify every screen), and **PHASE B2 / B3 / B5** in full.
  If `get_jsx` is blocked for the session, **STOP and tell the owner** —
  do NOT fall back to `get_computed_styles` reconstruction.
- `docs/sprints/milestone-1-plan.md` — §3 (the 21-screen master table
  with artboard IDs — your checklist), §4 (live design decisions:
  no `/admin/stock/reconciliation` route; receipts are persistent
  banners on the hubs; `/admin/financials` M1 = stock-purchase +
  reconciliation slice only, **no KPI stat strip**; Canteen has its own
  Transfer Dispatch; amber = transfer / blue = purchase-delivery
  banner), §5 "Session 4" (your scope), §6 (session count).
- `docs/PROGRESS.md` — both 2026-08-27 "Session 3" entries in full.
- `docs/CONVENTIONS.md` — §1 folder structure, §2 naming (kebab `.tsx`,
  PascalCase export + `<Name>Props`, `cn()` from `lib/utils.ts`),
  **§4 the `TODO(mock)` convention** (reserved for deliberately deferred
  real integration — not a general TODO).
- `docs/design/design-principles.md` — §2 (two shells), §4 (component
  behaviours), §7 (kit inventory), §9 (global interaction rules —
  already encoded in `app/globals.css`, do not re-specify per screen).
- `docs/design/component-states.md` §8 — the state-artboard inventory
  Session 2 added; §2 for which states each screen surfaces.
- `docs/DECISIONS.md` ADR-36 (a/b/c/d) — the ledger corrected-cell
  treatment, collapse persistence (OPEN — Dev Sprint), friction-dialog
  labels, EmptyState. Build skeletons against the design **as approved**;
  the OPEN sub-questions are for the Dev Sprint, not this one.

**Paper file:**
`https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X` — "Prosper
Hotel", page "Shell+Component kit".

**Paper MCP setup:**
1. `get_guide({ topic: "paper-mcp-instructions" })` — read fully once.
2. `get_basic_info` — load artboards, fonts, tokens.
3. `open_file` with fileId `01M0EZ7TAHZM26KBMWNYT0928X` so it's sticky.
4. `get_jsx` (format `"tailwind"`) is the REQUIRED extraction tool —
   work in small node batches (one screen section at a time). If it
   stays blocked for the session, STOP and tell the owner.
5. `get_screenshot` on the **top-level artboard** (never an inner frame)
   is for VERIFYING your built screen, never as an input to writing code.
6. `finish_working_on_nodes` on every inspected node when done.
7. Paper node IDs must never appear in text the owner reads.

---

## The screens — 20 to export + 1 to normalise

From `milestone-1-plan.md` §3. Slugs are fixed — use them for both the
`docs/design/screens/<slug>/` folder and the `/design-preview/<slug>`
route.

### F1 — Catalog & Locations

| Screen | Artboard | Slug | Type |
|---|---|---|---|
| Admin Catalog — Product Catalog | `6ZO-0` | `admin-catalog-product-catalog` | ✅ already exported — **RE-EXPORT** to normalise (see below) |
| Admin Catalog — Mobile | `8L7-0` | `admin-catalog-mobile` | screen |
| Product Drawer — Create / Edit | `796-0` | `product-drawer` | screen-state (drawer) |
| Product Delete Dialog | `797-0` | `product-delete-dialog` | screen-state (dialog) |

### F2 — Store & Stock Movements

| Screen | Artboard | Slug | Type |
|---|---|---|---|
| Admin Stock — Ledger (Full Width) | `798-0` | `admin-stock-ledger-full-width` | screen |
| Admin Stock — Ledger (Sidebar Collapsed) | `7G9-0` | `admin-stock-ledger-sidebar-collapsed` | screen-state (shell collapsed) |
| Admin Stock — Ledger (Drawer Open) | `7LJ-0` | `admin-stock-ledger-drawer-open` | screen-state (correction drawer) |
| Admin Stock — Mobile | `8Q4-0` | `admin-stock-mobile` | screen |
| Bulk Opening Stock Grid | `7UD-0` | `bulk-opening-stock-grid` | screen |
| Admin Financials — Full Table | `7ZJ-0` | `admin-financials-full-table` | screen (stock-purchase + reconciliation slice only — **no KPI strip**) |
| Admin Financials — Payment Drawer Open | `85W-0` | `admin-financials-payment-drawer-open` | screen-state (payment drawer) |
| Store Manager Mobile Hub | `8T3-0` | `store-manager-mobile-hub` | screen (both banner variants live here) |
| Store Manager Flows — Issues & Production | `8XH-0` | `store-manager-flows-issues-production` | screen (2 flow panels) |
| Store Manager Flows — Transfers & Consumption | `92M-0` | `store-manager-flows-transfers-consumption` | screen (2 flow panels) |
| Store Manager — Stock Levels | `986-0` | `store-manager-stock-levels` | screen |
| Canteen Mobile Operations Hub | `9BA-0` | `canteen-mobile-operations-hub` | screen |
| Canteen — Transfer Dispatch | `9FE-0` | `canteen-transfer-dispatch` | screen |
| Canteen — Stock Levels | `9GW-0` | `canteen-stock-levels` | screen |

### F3 — Assets

| Screen | Artboard | Slug | Type |
|---|---|---|---|
| Admin Assets Register | `8DL-0` | `admin-assets-register` | screen |
| Asset Delete Dialog | `8IV-0` | `asset-delete-dialog` | screen-state (dialog) |
| Asset Drawer — Create / Edit | `8JO-0` | `asset-drawer` | screen-state (drawer) |

Login (`15K-0` / `16J-0`) is already done — do not touch.

**Total: 20 new + 1 re-export = 21 screens.** If this does not fit one
context window *with proper screenshot-verification of each*, **split
across two sessions** (`export-workflow.md` "Session discipline" —
Sprint 06 failed by cramming). A natural split is F1 + F3 + Financials
in session 4a, the rest of F2 in session 4b — flag the split to the
owner and update this handoff.

---

## Method per screen (Phase B2 / B3)

1. `get_tree_summary` / `get_children` to navigate the artboard;
   `get_screenshot` the **top-level artboard** once for orientation.
2. `get_jsx` (tailwind) the full screen artboard, in small section
   batches.
3. **Drop the Paper artboard frame.** Paper emits a fixed-size root
   (`w-[1440px] h-[900px]` desktop, `w-[390px] h-[844px]` mobile).
   Remove it so the screen fills the viewport: `w-full min-h-screen`,
   fixed-width sidebar, body `flex-1`. Must render identically on a
   1440 laptop and a 1920 monitor. Drop the mobile status-bar node too.
   *(The old reference screen still carries `w-[1440px] h-[900px]` on
   its root — a known deviation to fix on re-export, not a pattern to
   copy.)*
4. **Swap every span of markup that corresponds to a kit component for
   the kit-component import** — Button, IconButton, TextInput, Select,
   SegmentedControl, ToggleSwitch, SearchInput, DatePicker,
   QuantityStepper, Tabs, PillFilter, StatusChip, ConditionChip,
   SimpleTable, DenseLedger, FrictionDeleteDialog, Drawer, BottomSheet,
   DenseSummaryStrip, Banner (`TransferBanner` / `PurchaseDeliveryBanner`),
   CalculatedImpactBanner, MatchCard, InstructionalBanner, BulkEntryGrid,
   ActionTileGrid, ActivityTimeline, Breadcrumb, BottomNav, FlowHeader,
   EmptyState, ErrorState. The **layout scaffold around** the components
   (flex containers, page structure, spacing, gaps) stays **verbatim**
   from `get_jsx` — do not restructure, do not "tidy".
5. **Lift literal data** (names, prices, dates, quantities, counts, tab
   labels, placeholder/helper text) into
   `docs/design/screens/<slug>/fixtures.ts`, marked `TODO(mock)` per
   `CONVENTIONS.md` §4. Extract values **verbatim from the artboard** —
   never invent plausible-looking data. `fixtures.ts` is a ~20-line
   file: it holds the screen's literal data, doubles as the
   `/design-preview/<slug>` render fixture, and **stays forever** as the
   visual-regression fixture.
6. Write `docs/design/screens/<slug>/page.tsx` as a **static skeleton**:
   no `useState` beyond what is cosmetically unavoidable, no fetches,
   no auth, no orchestration, no domain calls.
7. **Screen-state artboards** (`7G9-0`, `7LJ-0`, drawer/dialog states):
   export either as their own skeleton under
   `docs/design/screens/<slug>-<state>/`, or — if it is a sub-part the
   real screen mounts conditionally (a drawer body) — as a component.
8. `finish_working_on_nodes` on every inspected node.

---

## Preview routes (Phase B4)

- One thin `app/design-preview/<slug>/page.tsx` per screen that imports
  and renders the skeleton with its `fixtures.ts`.
- **Update `app/design-preview/layout.tsx`'s `SCREENS` list** — add
  every new slug + label. **Also fix the stale `_kit` entry** — Session
  3 part 1 moved the gallery folder from `_kit` to `kit`; the
  `SCREENS` array still says `{ slug: "_kit", label: "Component Kit" }`.
  Change it to `{ slug: "kit", ... }`.
- Keep the list complete and ordered (Login, kit, then screens by
  feature).

---

## Reference-screen normalisation

Re-export `admin-catalog-product-catalog` (`6ZO-0`):
- Rename `docs/design/screens/admin-catalog-product-catalog/mock-data.ts`
  → `fixtures.ts` (new work uses `fixtures.ts`; this is the file to
  normalise, per `export-workflow.md` "Naming").
- Drop the leftover `w-[1440px] h-[900px]` frame from its root so it
  fills the viewport like the new screens.
- Update its `/design-preview` route + `page.tsx` import accordingly.

---

## Role-home routes

- **Store Manager Mobile Hub** (`8T3-0`) skeleton → replace the
  `<EmptyState>` placeholder in `app/store-manager/page.tsx` with the
  real exported skeleton.
- **Canteen Mobile Operations Hub** (`9BA-0`) skeleton → replace the
  placeholder in `app/canteen/page.tsx`.
- `app/admin/page.tsx` and `app/cashier/page.tsx` **keep** their
  `<EmptyState>` placeholder — there is no M1 home screen for Admin
  (dashboard is later) or Cashier (New Order is post-M1). If any
  placeholder carries a `TODO(mock)` marker, downgrade it to a plain
  `TODO` (these placeholders are not deferred *integration*, they're
  "no screen yet").
- The four role homes render **inside the shells** (`admin-shell-client`
  / `staff-shell-client`) — you are only swapping the *content*, not the
  shell.

---

## Verification (all required before calling the session done)

1. **Screenshot-verify EVERY screen and EVERY screen-state against its
   Paper artboard** (`get_screenshot` on the top-level artboard). This
   is the mandatory Phase B5 gate — the step Sprint 06 skipped. Check
   spacing, type scale, table structure, which-side borders, colours,
   component fidelity. Flag every mismatch. **Do not ship a silent
   approximation.** "Looks close" is not the bar — if you cannot make it
   match, STOP and flag it.
2. `pnpm tsc --noEmit` exits 0.
3. `pnpm dev` smoke-check: every new `/design-preview/<slug>` route
   renders with no runtime error, plus `/design-preview/kit`,
   `/store-manager`, `/canteen` (the two rewired role homes — a local
   Postgres + `pnpm prisma db seed` and login as the seeded role,
   PIN 1234, are needed to reach the auth-gated homes; the
   `/design-preview/*` routes need no login). Any throwaway Playwright
   script MUST live in the repo root (an mjs in /tmp can't import
   `@playwright/test`) and be deleted when done.
4. `finish_working_on_nodes` for all inspected Paper nodes.
5. If `.next/dev/types` complains about a deleted/renamed route path,
   `rm -rf .next` and retry.

---

## Wrap-up

- `docs/sprints/milestone-1-plan.md` §5 — mark **Session 4 done**; note
  "M1 screens exported + verified; ready for Session 5 (F1 implement)".
- `docs/PROGRESS.md` — add a "Session 4" entry: which screens/slugs
  exported, which `fixtures.ts` files created, what was pixel-verified,
  the `_kit`→`kit` `SCREENS` fix, the two role homes swapped, and
  anything flagged (a Paper mismatch, a split into 4a/4b, a state that
  had no artboard).

---

## Constraints

- **Design Sprint role.** NO real data, API calls, auth logic, business
  rules, or orchestration. Skeletons are static.
- **NO new UI/UX decisions.** Paper + `design-principles.md` +
  `DECISIONS.md` are the authority. Missing / contradictory → STOP and
  flag.
- **`get_jsx` is the required tool and its output is TRANSCRIBED, not
  reinterpreted.** Never reconstruct from computed styles or
  screenshots. Keep the token-ref classes `get_jsx` emits. Translate a
  raw literal only where a token exists, and note it in PROGRESS.
- **Swap, don't reconstruct** — kit-component spans become kit imports;
  the scaffold around them stays verbatim.
- pnpm only. Read `node_modules/next/dist/docs/` for any route/layout
  API you touch.
- Post a checklist up front; update it as each screen lands.
- Do NOT touch `components/kit/*` or `components/shells/*` — Session 3
  is done and verified.
- Split across two sessions if 21 screens don't fit one context window
  with proper verification — flag the split.
