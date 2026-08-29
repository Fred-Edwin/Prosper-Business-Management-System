# Milestone 1 — Pinned Scope & Session Plan

**Status: DONE (2026-08-29).** All plan sessions (2–17, incl. the 4
inserted M1 design-change sessions) are complete. Session 17's adversarial
QA pass closed with `pnpm test` 226/226, `tsc` 0, `build` clean; the one
High finding (F-1, correction-stacking) was fixed in-session. Two deferred
items are recorded as follow-ups, neither M1-blocking: F-2 (2-phase
transfer receiver visibility — a Design call, M2 territory) and the
misleading ledger "Edit" column (B5 — Design Sprint). See
`docs/sprints/session-17-findings.md` and the PROGRESS Session 17 entry.

This was the authoritative plan for finishing Milestone 1 after the Sprint
06 export was scrapped. It supersedes the session/slice tables in
`docs/milestones/milestone-01-the-business-exists.md` §5/§6 (kept there
as historical intent) and folds in the still-live decisions and the
master screen list from the now-deleted Sprint 05/06 handover docs.

**Milestone goal:** the business exists in the system — master catalog +
location pricing, the complete append-only stock movement ledger across
Restaurant / Canteen / Store, and the asset register. No revenue yet.

---

## 1. Where things actually stand (2026-08-27)

### Shipped and intact

- **Sprint 01 — Foundation.** Next.js (App Router, TS) on pnpm; full
  `prisma/schema.prisma` migrated against local Postgres; Auth.js
  name + 4-digit-PIN login with server-side role checks on all four
  role shells; PWA manifest + installability SW; seed script;
  `lib/time` (Africa/Nairobi), `lib/validation` Zod example. 24 tests
  passing.
- **Design system foundation.** `docs/design/design-principles.md` is
  the binding record. The approved Paper file ("Prosper Hotel",
  `01M0EZ7TAHZM26KBMWNYT0928X`) holds the 16-artboard component kit +
  5 shell states + 21 M1 screens + Login. Design tokens finalized
  (`lib/tokens.css`, OKLCH, `--nav-*` set).
- **Login screen** — designed and exported; `app/login/*` compiles and
  renders (`login-form.tsx` logic untouched since Sprint 01).
- **Role shells wired** — `components/shells/admin-shell.tsx`,
  `staff-shell.tsx`, `mobile-shell-admin.tsx`, `mobile-nav-drawer.tsx`;
  `app/admin/admin-shell-client.tsx` and
  `components/layout/staff-shell-client.tsx` connect them to
  `usePathname()` / `router.push()` / `signOut()`. Four role home pages
  render an inline "coming later" placeholder.
- **`components/kit/` (29 files)** — exported in Sprint 06. The kit
  itself was audited and **6 defects fixed** (`stat-tile-row`,
  `dense-summary-strip`, `friction-delete-dialog`, `banner`,
  `admin-shell` collapsed rail) + `quantity-stepper.tsx` added. One kit
  item stays open: `InfoBanner` padding (see Session 3 notes below).
  Whether the *screen* export used the kit faithfully is moot — those
  screens were deleted.
- **One reference screen re-exported correctly** —
  `docs/design/screens/admin-catalog-product-catalog/{page.tsx,mock-data.ts}`
  + `app/design-preview/admin-catalog-product-catalog/page.tsx`, done via
  `get_jsx` + component-swap + screenshot-verify, confirmed to match
  Paper. This is the template for the re-export
  (`docs/design/export-workflow.md`).

### Scrapped / not done

- **The Sprint 06 screen export.** 20 of 21 screens and their
  `/design-preview` routes were deleted (built by
  reconstruction-from-computed-styles, did not match Paper). Being
  redone per `docs/design/export-workflow.md`.
- **All M1 domain logic.** No `lib/domain/catalog`, `lib/domain/stock`,
  or `lib/domain/assets`; no `app/api/*` beyond auth. Every M1 backend
  task is open. *(Note: `milestone-01…md` §5 claims Catalog domain
  shipped in "Sprints 03–04" — treat that as not real; there is no
  `lib/domain/catalog` in the tree. Catalog backend is in scope here.)*

### Build state

`pnpm tsc --noEmit` — **clean, exit 0** (verified this session). The
"broken routes" noted in the Sprint 06 handover §5 were fixed by that
sprint's rewiring, which is committed and intact. Nothing needs
un-breaking; the four role home pages just carry placeholder content
until their real screens land.

---

## 2. Pinned Milestone 1 feature list

Three features, each running the full Design → Development → QA loop.
Design (Phase A) is **done and approved in Paper** for all three; what
remains is the re-export (Phase B) and implementation (Phase C).

| # | Feature | PRD | What it delivers |
|---|---|---|---|
| M1-F1 | **Catalog & Locations** | §4.1 | Admin defines Ingredients / Dishes / Goods with per-location selling prices; Dish `buying_price = 0` invariant; friction-gated delete with referential guard. |
| M1-F2 | **Store & Stock Movements** | §4.2 | The full append-only `StockMovement` ledger: purchase payment (Admin) → purchase receipt (Store Mgr **or** Canteen) → issue → production → transfer (either direction, any two locations, 2-phase dispatch/accept) → non-sale consumption → opening/closing stock. Admin reconciliation ledger + bulk opening-stock grid. Correction rows per `CONVENTIONS.md` §4 / ADR-15. |
| M1-F3 | **Assets** | §4.10 | Equipment/furniture register across all three locations; condition tracking (Good / Needs Repair / Decommissioned); add/edit drawer; friction-gated delete. No dependency on stock or money — can be built in parallel with F2's backend. |

**Financials note:** `/admin/financials` (with its Reconciliation
section) was confirmed **in M1 scope** during Sprint 05 even though it
isn't in `milestone-01…md` §3's original table. It belongs to F2 — the
Reconciliation section is the "payments awaiting receipt / receipts
without payment" view (replacing the rejected standalone
`/admin/stock/reconciliation` route), and it reads from the Stock
Purchases table's Delivery Status. The broader Financials *feature*
(expenses, owner draws, real profit) is **Milestone 3** — M1 builds only
the stock-purchase + reconciliation slice of that screen.

**Financials M1 cut — confirmed (Design Sprint Session 2, 2026-08-27):**
M1's `/admin/financials` shows the **stock-purchase table + the
reconciliation Match cards only**. The 4-tile KPI stat strip
(liquidity / cash / bank / outflows — kit component "Stat tile row",
`6R4-0`) is **Milestone 3**, not M1. The kit "Stat tile row" component
is therefore not verified or state-extended in this session's Paper
pass — deferred to the M3 design work.

---

## 3. Master screen list — the 21 approved M1 artboards

From the Paper "Prosper Hotel" file, page "Shell+Component kit". These
artboard IDs are confirmed live (carried forward from the deleted Sprint
06 handover §3 — the one piece of it worth keeping). This is the
checklist for Session 4's re-export.

| # | Screen | Artboard | Slug | Feature | Type |
|---|---|---|---|---|---|
| 1 | Login — Desktop | `15K-0` | `login-desktop` | (done) | already exported |
| 2 | Login — Mobile | `16J-0` | `login-mobile` | (done) | already exported |
| 3 | Admin Catalog — Product Catalog | `6ZO-0` | `admin-catalog-product-catalog` | F1 | ✅ reference (re-exported, verified) |
| 4 | Admin Catalog — Mobile | `8L7-0` | `admin-catalog-mobile` | F1 | screen |
| 5 | Product Drawer — Create/Edit | `796-0` | `product-drawer` | F1 | screen-state (drawer) |
| 6 | Product Delete Dialog | `797-0` | `product-delete-dialog` | F1 | screen-state (dialog) |
| 7 | Admin Stock — Ledger (Full Width) | `798-0` | `admin-stock-ledger-full-width` | F2 | screen |
| 8 | Admin Stock — Ledger (Sidebar Collapsed) | `7G9-0` | `admin-stock-ledger-sidebar-collapsed` | F2 | screen-state (shell collapsed) |
| 9 | Admin Stock — Ledger (Drawer Open) | `7LJ-0` | `admin-stock-ledger-drawer-open` | F2 | screen-state (correction drawer) |
| 10 | Admin Stock — Mobile | `8Q4-0` | `admin-stock-mobile` | F2 | screen |
| 11 | Bulk Opening Stock Grid | `7UD-0` | `bulk-opening-stock-grid` | F2 | screen |
| 12 | Admin Financials — Full Table | `7ZJ-0` | `admin-financials-full-table` | F2 | screen (stock-purchase + reconciliation slice) |
| 13 | Admin Financials — Payment Drawer Open | `85W-0` | `admin-financials-payment-drawer-open` | F2 | screen-state (payment drawer) |
| 14 | Admin Assets Register | `8DL-0` | `admin-assets-register` | F3 | screen |
| 15 | Asset Delete Dialog | `8IV-0` | `asset-delete-dialog` | F3 | screen-state (dialog) |
| 16 | Asset Drawer — Create/Edit | `8JO-0` | `asset-drawer` | F3 | screen-state (drawer) |
| 17 | Store Manager Mobile Hub | `8T3-0` | `store-manager-mobile-hub` | F2 | screen |
| 18 | Store Manager Flows — Issues & Production | `8XH-0` | `store-manager-flows-issues-production` | F2 | screen (2 flow panels) |
| 19 | Store Manager Flows — Transfers & Consumption | `92M-0` | `store-manager-flows-transfers-consumption` | F2 | screen (2 flow panels) |
| 20 | Store Manager — Stock Levels | `986-0` | `store-manager-stock-levels` | F2 | screen |
| 21 | Canteen Mobile Operations Hub | `9BA-0` | `canteen-mobile-operations-hub` | F2 | screen |
| 22 | Canteen — Transfer Dispatch | `9FE-0` | `canteen-transfer-dispatch` | F2 | screen |
| 23 | Canteen — Stock Levels | `9GW-0` | `canteen-stock-levels` | F2 | screen |

(21 M1 screens + the 2 already-done Login artboards = 23 rows.)

---

## 4. Live design decisions carried forward (from the deleted Sprint 05 handover §5)

These were decided by the Admin in conversation during the Sprint 05
design pass and remain binding. They change what §§1–3 of
`milestone-01-the-business-exists.md` originally described.

1. **No `/admin/stock/reconciliation` route.** Folded into a
   **Reconciliation section on `/admin/financials`**, sourced from the
   Stock Purchases table's Delivery Status column (payments awaiting
   receipt / receipts without payment, each with a Match action).
2. **No `/store-manager/receipts` or `/canteen/receipts` routes.**
   Purchase deliveries **and** stock transfers are **persistent banners**
   on each mobile hub — pinned until Accepted / Matched / Flagged, then
   dropped into the hub's "Today's … Log" timeline. Confirmed as "both
   are banners," not transfers-only.
3. **`/admin/financials` is in M1 scope** (stock-purchase + reconciliation
   slice only — see §2 note). Not in the original §3A table.
4. **`/store-manager/stock` and `/canteen/stock` are in M1 scope** —
   read-only current-stock-level views, designed fresh in Sprint 05, not
   in the original inventory.
5. **Canteen gets its own Transfer Dispatch screen** mirroring Store
   Manager's — Canteen dispatches too, it is not purely a
   transfer-destination role.
6. **Ledger Maximize = the general Icon Rail sidebar-collapse shell
   state**, not a bespoke "maximized" component. (Persistence sub-question
   still open — ADR-36b.)
7. **Transfer vs. purchase-delivery banner color is final:** amber
   (warning) for transfers between own locations, blue (info) for
   external-supplier purchase deliveries. `components/kit/banner.tsx`
   ships both as named variants (`TransferBanner` / `PurchaseDeliveryBanner`).
8. **Calculated Impact banner** is a formalized kit component
   (`CalculatedImpactBanner`, warning-amber) for previewing the numeric
   consequence of a correction/adjustment before save. Not ad hoc.

Open items that are **not** resolved: ADR-36 (CORRECTED chip, Maximize
persistence, delete-dialog labels, EmptyState).

---

## 5. Session plan for finishing Milestone 1

Design (Phase A) is done. The remaining work is Phase B (re-export) then
Phase C (implement), per `docs/design/export-workflow.md`. One role per
session (`CLAUDE.md`).

### Session 2 — Product Designer: component-states spec + Paper pass

**Role:** Product Designer. **Touches:** Paper only, plus a short spec
doc.

- Go through every kit component artboard and confirm it has **all** its
  meaning-bearing states as artboards (default / hover / focus / active /
  disabled / error as applicable). Add any that are missing — the
  component audit found the *code* was missing states; verify the
  *artboards* aren't too.
- Verify **one canonical version** of each component across all 21
  screens — no divergent second copies. Fix divergences in Paper.
- Resolve the design-owned open items: **ADR-36a** (CORRECTED chip — get
  the Admin's call, update the artboards + `design-principles.md` §4.3 /
  §8), **ADR-36d** (EmptyState / ErrorState — decide; if yes, draw the
  artboard with states).
- Output: updated Paper file + a short `docs/design/component-states.md`
  listing every component and its confirmed states, for Session 3 to
  export against.

**Session 2 — DONE (2026-08-27).** Component-states spec written and
approved (`docs/design/component-states.md`). Owner settled all four
open decisions: ADR-36a = no CORRECTED chip (underlined semantic-color
cell); ADR-36c = `FrictionDeleteDialog` label/copy props; ADR-36d = new
`EmptyState` + `ErrorState` kit component (17th kit area, Paper artboard
`9U3-0`); Financials KPI stat strip confirmed **M3, not M1**. State
artboards added to 7 existing kit areas + the new Empty/Error artboard
(see `component-states.md` §8). Consistency audit: 5 token/structure
divergences found and fixed in Paper (ledger corrected-cell underline;
primary-button / tertiary / segmented-label raw-OKLCH → `--color-accent`;
success + condition chips raw-OKLCH → semantic tokens; bottom-nav
border), 2 documented as legitimate content variants (drawer-header
subtitle; friction-dialog per-entity labels, now prop-driven), 1
deferred as post-M1 (staff-shell order-type segmented control). Side
nav, tabs, pill filter, sticky footer, drawer shell all verified
CONSISTENT. `design-principles.md` gained §9 (global interaction
rules). **Component kit is state-complete and consistency-verified for
M1 — ready for export.**

### Session 3 — Developer (Design Sprint): rebuild `components/kit/*` from Paper

**Status: DONE (2026-08-27).** Split into two parts.

**Part 1 (kit):** all 24 M1 `components/kit/*` re-exported by verbatim
`get_jsx` transcription; `stat-tile-row` deleted (M3);
`app/design-preview/kit/page.tsx` gallery rewritten; `tsc` clean for
`components/kit/*`. See `docs/PROGRESS.md` 2026-08-27 "Session 3 (part 1)".

**Part 2 (shells + rewiring):** all 4 `components/shells/*`
(`admin-shell` from `649-0` + `67T-0`, `staff-shell` from `4Y-0`,
`mobile-shell-admin` from `6B1-0`, `mobile-nav-drawer` from `1ZP-0`)
re-exported by verbatim `get_jsx` transcription.
`app/admin/admin-shell-client.tsx` + `components/layout/staff-shell-client.tsx`
rewired to the new shell + `BottomNavItem` (`{ key, label, activeIcon,
inactiveIcon }`) API. `pnpm tsc --noEmit` exits 0. Role homes + kit
gallery + reference screen smoke-checked (real login, no runtime error).
admin full/collapsed + staff shells pixel-verified against their
artboards. See `docs/PROGRESS.md` 2026-08-27 "Session 3 (part 2)".

**Kit + shells ready for Session 4 screen export.**

- Original scope (kept for reference): delete non-compliant
  `components/kit/*` + `components/shells/*`; rebuild from Paper via
  `get_jsx` (Phase B1); encode every `component-states.md` state;
  interactive primitives get minimal real behavior; resolve ADR-36c;
  re-check `InfoBanner` padding; build the kit gallery; screenshot-verify
  every component.

### Session 4 — Developer (Design Sprint): re-export all M1 screens

**Status: DONE (4a + 4b + 4c, 2026-08-27).** All 21 M1 screens exported
+ verified; ready for Session 5 (F1 implement). Per `export-workflow.md`
"Session discipline" the 21-screen scope was split into 4a / 4b / 4c.

**Session 4a (done):** F1 (4 screens) + F3 (3 screens) + **Financials
(2 screens)** exported — `get_jsx` → frame-drop → component-swap →
`fixtures.ts` → static skeleton → `/design-preview` route →
screenshot-verified; reference screen `admin-catalog-product-catalog`
normalised (`mock-data.ts` → `fixtures.ts`, frame dropped); `SCREENS`
list `_kit` → `kit` fixed; `pnpm tsc --noEmit` exit 0. **9 of 9
in-scope screens delivered.** See `docs/PROGRESS.md` 2026-08-27
"Session 4a".
- Financials: `7ZJ-0` was body-less in Paper; owner copied `85W-0`'s
  body across mid-session, then it exported normally. Owner chose
  **Option A** on the KPI stat strip — exported as drawn (contradicts
  the D-FIN M1 cut; a later design sprint removes it).

**Session 4b (done, 2026-08-27):** the **5 Admin Stock screens** —
`admin-stock-ledger-full-width` (`798-0`),
`admin-stock-ledger-sidebar-collapsed` (`7G9-0`),
`admin-stock-ledger-drawer-open` (`7LJ-0`), `admin-stock-mobile`
(`8Q4-0`), `bulk-opening-stock-grid` (`7UD-0`) — exported, kit-swapped
(`PillFilter` / `Tabs` / `BulkEntryGrid` / `CalculatedImpactBanner` /
`Button`), `fixtures.ts` written, shared `AdminStockSideNav` module
extracted, `/design-preview` routes added, `SCREENS` list updated,
`pnpm tsc --noEmit` exit 0, all 5 screenshot-verified. The ledger
table + the bulk-grid instruction banner + valuation footer are
transcribed **inline** (structural divergence from their kit
components — the 4a Financials-table precedent). See `docs/PROGRESS.md`
2026-08-27 "Session 4b" for the full flag list.

**Session 4c (done, 2026-08-27):** the **7 Store Manager + Canteen
screens** — `store-manager-mobile-hub` (`8T3-0`),
`store-manager-flows-issues-production` (`8XH-0`),
`store-manager-flows-transfers-consumption` (`92M-0`),
`store-manager-stock-levels` (`986-0`),
`canteen-mobile-operations-hub` (`9BA-0`),
`canteen-transfer-dispatch` (`9FE-0`), `canteen-stock-levels`
(`9GW-0`) — exported, `fixtures.ts` written, `/design-preview` routes
added, `SCREENS` list updated, `pnpm tsc --noEmit` exit 0, all 7
screenshot-verified. At export time **0 kit swaps** — every section
diverges structurally from its kit component (banners with a leading
icon, non-`PillFilter` category tabs, bespoke qty boxes / steppers,
row-style workflow lists, `info-bg` stock-level tables), transcribed
**inline verbatim** (the 4b `admin-stock-mobile` precedent). The two
role homes (`app/store-manager/page.tsx`, `app/canteen/page.tsx`) now
render the exported hub skeletons as staff-shell content (verified with
a seeded login).

**Post-export fixes (owner-directed, same session):**
- **ADR-37c** — `components/kit/flow-header.tsx` gained
  `directionTone?: "info" | "success" | "danger" | "warning"` (default
  `"info"`); the 3 flow screens now use the kit `<FlowHeader>` instead
  of an inline header.
- **`app/globals.css` type-scale fix** — the `@theme` block was missing
  concrete `--text-*` values and all `--leading-*` keys, so the slash
  classes `get_jsx` emits (`text-h2/h2`, `text-display/display`, …) were
  silently dropped and every heading fell back to 14px. Fixed
  project-wide; verified across the design-preview + kit gallery.

See `docs/PROGRESS.md` 2026-08-27 "Session 4c" for the full write-up.

**Role:** Developer, Design-Sprint mode. **Touches:**
`docs/design/screens/*`, `app/design-preview/*`, and the four role home
routes.

- For each of the 20 not-yet-done screens in §3's table: `get_jsx` the
  artboard, **drop the artboard frame** (fill the viewport), **swap**
  kit-component spans for kit imports, lift literals into `fixtures.ts`
  (`TODO(mock)`), write a **static skeleton** `page.tsx` (Phase B2/B3).
- Re-export the reference screen too, to **normalize `mock-data.ts` →
  `fixtures.ts`** and drop its leftover `w-[1440px] h-[900px]` frame.
- Add the thin `/design-preview/<slug>` route per screen; keep
  `layout.tsx`'s `SCREENS` list complete.
- Replace the four role home-page inline placeholders with the real
  exported skeletons where one exists (Store Manager Hub, Canteen Hub);
  `/admin` and `/cashier` keep a placeholder — no M1 home screen for
  those (Admin dashboard and Cashier are later milestones). Remove the
  misapplied `TODO(mock)` from the remaining placeholders (use plain
  `TODO`).
- **Screenshot-verify every screen against its artboard** (Phase B5).

### Sessions 5..N — Developer (Development Sprint): implement M1, feature by feature

Phase C. Backend and frontend in either order per feature; `fixtures.ts`
decouples them. Each session ends with its own tests (`sdlc.md` /
`ADR-31`).

- **Session 5 — M1-F1 Catalog & Locations. DONE (2026-08-27).**
  `lib/domain/catalog` (`createProduct` with Dish `buying_price=0`
  invariant, `updateProduct`, soft/hard delete with
  `StockMovement`/`OrderLine` referential guard → 409). `app/api/products*`,
  `/api/locations`. F1 skeletons moved to `app/admin/catalog/*`, wired,
  fixtures dropped from the `app/**` copies; `/design-preview/*` +
  `docs/design/screens/*` kept as regression fixtures. 11 new tests
  (Dish invariant, location-price persistence, delete guard) — 35 total,
  all green. F1 Catalog & Locations implemented + tested; ready for
  Session 6 (F2 stock backend).
- **Session 6 — M1-F2 Stock backend (domain + APIs). DONE (2026-08-27).**
  `lib/domain/stock` — `recordPurchasePayment`, `recordPurchaseReceipt`,
  `recordKitchenIssue`, `recordProduction`, `recordTransfer` +
  `acceptTransfer` / `flagTransfer` (2-phase), `recordNonSaleConsumption`,
  `setOpeningStock`, `correctMovement` (day-close gate + delta),
  `getDerivedStockBalance` + batched `getDerivedStockBalances`
  (sum-the-ledger, no stored total), `listMovements` (role/location
  scoped), `listOutstandingPurchases`. `lib/validation/stock.ts`;
  `lib/api/require-role-in.ts` + `actor-location.ts`;
  `lib/time.businessDateOnly`. Routes: `GET`/`POST /api/stock-movements`,
  `POST .../:id/correct`, `POST .../:id/accept`, `GET .../outstanding`.
  **ADR-39** — signed-quantity convention, 2-phase transfer = two rows
  (`+q` linked via `correctsMovementId`), `correctMovement` always a delta
  row, `MoneyMovement` deferred to F3. API.md Stock section rewritten to
  camelCase. 21 new tests, **56 green**. F2 stock backend (domain + APIs)
  implemented + tested; ready for Session 7 (Admin stock frontend).
- **Session 7 — M1-F2 Admin stock frontend. DONE (2026-08-27).** F2 Admin
  stock frontend wired (ledger + correction drawer + mobile + bulk opening
  grid + financials stock-purchase/reconciliation slice). Routes:
  `app/admin/stock/` (ledger, responsive desktop+mobile, correction drawer
  → `POST .../:id/correct`), `app/admin/stock/opening/` (bulk grid, one
  `POST` per dirty row, re-submit = correction), `app/admin/financials/`
  (purchase table from `?movementType=purchase_payment`/`purchase_receipt`,
  Match cards from `.../outstanding`, record-payment drawer). Fetch hook
  `app/admin/stock/use-stock.ts` (StockRequestError + `request<T>`, Session
  5 shape). Pure `derive-ledger.ts` builds the 11 columns
  (opening = prior-day closing via the new balances route; closing =
  opening + Σday; correction delta counted once, ADR-39). **ADR-40** —
  new `GET /api/stock-movements/balances` (batched derived-balance read;
  Session 6 built the domain fn, no route). **ADR-36b closed** — collapse
  persists app-wide via `localStorage` (state in
  `app/admin/admin-shell-client.tsx`). KPI stat strip kept as markup but
  unwired (`—`/"M3" — no F2 data source, F3 MoneyMovement owns it).
  20 new tests, **76 green**. Ready for Session 8 (Store Manager + Canteen
  frontend). Flagged: ledger aggregate cells backed by >1 movement have no
  approved correction affordance (single-row case wired; multi-row → design
  sprint).
> **RE-SEQUENCED 2026-08-27 (see `session-9-handoff.md` "Note on
> sequencing").** The kit built in Sessions 3–4 was a set of static
> *pictures* of controls with no interaction states, and Sessions 5/7
> wired data into them without fixing that. A two-part remediation
> sprint was inserted before any more frontend work. Corrected order
> from Session 8 on:
>
> - **Session 8 (was: Store Manager/Canteen) → Session 9** — *Kit
>   remediation Part 1:* codify the design system as
>   `app/design-system/tokens.{css,ts}`, complete the §9 interaction
>   contract as shared CSS. **DONE** (Deliverables 1–2, Gates 1–2
>   passed). ADR-41 (panel opacity / `--surface-panel-tint` retired),
>   ADR-42 (Storybook adopted).
> - **Session 10** — *Kit remediation Part 2:* audit + fix all 32
>   `components/kit/*` to implement every §9 state + full keyboard +
>   ARIA; add `Spinner` / `Toast` / `PageShell` / `FormField`; stand up
>   Storybook + visual-regression + a11y gates.
>   (`session-10-handoff.md`.)
> - **Session 11 — DONE.** Rebuilt the shipped Admin screens
>   (`/admin/catalog`, `/admin/stock` + `/opening` + `/financials`) as
>   compositions of the proven kit — `<PageShell>` / `<FormField>` /
>   `<Toast>` / `<EmptyState>` / `<ErrorState>` adopted across scope;
>   `<ToastProvider placement="top-right">` on the admin tree. Every
>   hook / `derive-*` / `opening-plan` / `lib/domain` / `app/api`
>   unchanged. `--surface-panel-tint` alias deleted. `export-workflow.md`
>   rewritten (compose, don't transcribe); `design-principles.md §9`
>   promoted to an enforced contract; per-screen gate is now a
>   `tests/screens/*.screen.test.tsx` jsdom+RTL spec (18 new specs).
> - **Session 12 — DONE.** M1-F2 Store Manager + Canteen frontend,
>   composed from the proven kit and wired to the F2 stock API. All 7
>   staff screens live under `app/store-manager/*` + `app/canteen/*`;
>   `<ToastProvider placement="bottom-center">` on the staff tree;
>   `use-staff-stock.ts` per-feature hook. **ADR-44** — the Session-4b
>   staff artboards were transcribed before the kit existed, so they are
>   superseded: the proven kit is the visual acceptance target and the
>   per-screen visual gate diffs against kit Storybook. Carried:
>   the purchase-delivery banner + `<MatchCard>` (`GET .../outstanding`
>   is Admin-only — no staff endpoint), the Canteen Stock Count route
>   (F-sales, not F2), and the real Playwright e2e harness.
> - **Session 13 — DONE.** M1-F3 Assets, backend + frontend in one
>   session. `lib/domain/assets` (CRUD + `transitionCondition` +
>   friction-guarded `hardDeleteAsset` — 409 with linked `AuditLog`
>   history), `lib/validation/assets.ts`, `app/api/assets*` (4 handlers).
>   Register + Asset Drawer + Asset Delete Dialog composed from the
>   proven kit into `app/admin/assets/*` over a `use-assets.ts` hook.
>   **ADR-45** — the 3 asset artboards (`8DL-0` / `8JO-0` / `8IV-0`) are
>   pre-kit Session 3–4 exports; ADR-44 extends to them (kit is the
>   visual target; diff against Storybook). 20 DB-backed domain tests +
>   7 screen specs; suite 127 → 154.
> - **Then** the QA pass.

- **Session 12 (was Session 8) — M1-F2 Store Manager + Canteen frontend.
  DONE (2026-08-28).** The two hubs, both Store Manager flow screens
  (issue/production, transfer/non-sale + a receive flow), Canteen transfer
  dispatch, and both Stock Levels views composed from the proven kit into
  `app/store-manager/*` and `app/canteen/*`. Incoming-transfer banner
  wired (pinned `<TransferBanner>` → `POST .../accept` / `{ flag, note }`
  → collapses when accepted/flagged). 2-phase transfer accept wired.
  28 new `tests/screens/*.screen.test.tsx` specs; `components/kit/*` +
  `components/shells/*` untouched. See ADR-44 and `PROGRESS.md`.
- **Session 13 (was Session 9) — M1-F3 Assets (backend + frontend, one
  session). DONE (2026-08-28).** `lib/domain/assets` (CRUD;
  `transitionCondition` — a plain condition move, no approval workflow,
  routed through the domain for a later audit-log hook;
  `hardDeleteAsset` — exact `confirmName` + ADR-23 friction guard, 409
  `CONFLICT` when any `AuditLog` row references the asset, the only
  linked history an asset can accrue in M1), `lib/validation/assets.ts`,
  `app/api/assets*` (GET/POST list+create, PATCH edit/transition,
  POST soft-delete, POST hard-delete). Register + Asset Drawer + Asset
  Delete Dialog composed from the proven kit at `app/admin/assets/*`
  over a `use-assets.ts` hook. The `Asset` schema was already
  sufficient — no migration. Artboards `8DL-0` / `8JO-0` / `8IV-0` are
  pre-kit; **ADR-45** extends ADR-44 to them. 20 DB-backed domain tests
  (CRUD + Zod rejections, the hard-delete guard, every condition
  transition, soft-delete visibility) + 7 screen specs; suite 127 → 154.

**N = 9** development sessions (Sessions 5–13): 5–7 shipped F1/F2
backend+frontend; 9–10 kit remediation; 11 screen rebuild; 12–13
F2-staff + F3. **All 9 development sessions complete.**

### M1 design-change pass (added 2026-08-29, after the owner's manual walkthrough)

The owner's pre-QA manual walkthrough
(`docs/sprints/m1-manual-verification-observations.md`) surfaced items
that go beyond bug-fixing — a confusing Financials reconciliation UI, no
kind explainer, an unclear Archive model, delete-in-drawer, ledger
typography. Triage split them into **4 sessions inserted before the QA
pass**:

| Session | Role | Scope | Status |
|---|---|---|---|
| **14** | Developer (Development Sprint) | D1 blocker + B1/B4/C2 copy + A3 (Catalog drawer → rail) | **DONE (2026-08-29)** |
| **15** | Product Designer (Design Sprint) | A1/A2, A4, C1, B3 designed; **Financials reconciliation redesign**; A5 Archive designed + **ADR-46 / ADR-47**. Paper + ADRs only. | **DONE (2026-08-29)** |
| **16** | Developer (Development Sprint) | Build everything Session 15 designed **+ the full A5 Archive feature** (Unarchive endpoints, Archived UI, the stock-flow picker exclusion, the `StockMovement` migration for real purchase-payment fields, tests) | **DONE (2026-08-29)** |
| **17** | QA Engineer | Adversarial M1 pass; B2, B5; M1-flow integration tests (Playwright dropped for Vitest integration — WSL2). F-1 ledger-integrity finding fixed. | **DONE (2026-08-29)** |

### Final session — QA Engineer: adversarial M1 pass

Against every M1 acceptance criterion, the approved Paper screens, and
the flow docs. Ledger integrity is the highest-stakes target: derived
balances must reconcile, correction deltas must be exact, day-close must
actually gate staff edits, 2-phase transfers must not double-count or
lose stock. Report findings before fixing.

---

## 6. Total remaining session count

| Sessions | Purpose |
|---|---|
| 1 | This one — docs/workflow/scope (done) |
| 2 | Product Designer — component-states + Paper pass |
| 3 | Developer — rebuild kit from Paper (`get_jsx`) |
| 4 | Developer — re-export 20 screens from Paper |
| 5–9 (N = 5) | Developer — implement F1, F2 (×3), F3 |
| 1 | QA Engineer — adversarial M1 pass |

**Total remaining after this session: 8 sessions** (2 design-phase
re-export sessions + 5 development sessions + 1 QA).

> **Updated 2026-08-29:** the 9 development sessions and the 2
> design-phase sessions are done. The **M1 design-change pass** (above)
> adds **4 sessions before the QA pass**: Session 14 (Developer,
> **done**), Session 15 (Product Designer, **done**), Session 16
> (Developer — built Session 15's designs + the full A5 Archive feature,
> **done**; plus a parallel kit Developer Sprint that added the opt-in
> searchable `<Select>` mode, **done**), Session 17 (QA Engineer — the
> adversarial pass, also owning B2 / B5 and the Playwright e2e harness —
> `docs/sprints/session-17-handoff.md`). Net: **1 session remaining**
> (Session 17 QA).

**Reasoning for N = 5:** F1 (Catalog) is one contained
domain + one screen cluster → 1 session. F2 (Stock) is the milestone's
bulk — 8 domain functions, ~5 API route groups, and 11 screens across 3
roles; it does not fit one context window and splits cleanly into
backend / admin-frontend / staff-frontend → 3 sessions. F3 (Assets) is
small and dependency-free → 1 session. Splitting any further would create
sessions too small to justify their own setup cost; combining any would
risk the Sprint 06 failure mode of a session running out of context
mid-task.
