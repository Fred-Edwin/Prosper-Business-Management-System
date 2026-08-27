# Milestone 1 — Pinned Scope & Session Plan

**Status:** Active. This is the authoritative plan for finishing
Milestone 1 after the Sprint 06 export was scrapped. It supersedes the
session/slice tables in
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

**Role:** Developer, Design-Sprint mode. **Touches:** `components/kit/*`,
`components/shells/*`, `app/design-preview/_kit`.

- **Delete the current `components/kit/*` and `components/shells/*`
  first** — they were exported by the non-compliant method. Rebuild each
  from Paper via **`get_jsx`** (Phase B1 of `export-workflow.md`).
- Encode every state from Session 2's `component-states.md`. Interactive
  primitives (Drawer, Tabs, Select, BottomSheet) get minimal real
  behavior.
- Resolve **ADR-36c** (friction-delete-dialog label props) while
  rebuilding that component. Re-check the `InfoBanner` padding open item
  from `component-audit-report.md` (suspected same undersizing as
  `CalculatedImpactBanner` — `p-3` vs. a likely `--sp-5`; confirm against
  Paper now that there may be an artboard for it).
- Build `app/design-preview/_kit/page.tsx` — every component, every
  state.
- **Screenshot-verify every component against its artboard** (Phase B5).
  Flag mismatches; do not ship approximations.

### Session 4 — Developer (Design Sprint): re-export all M1 screens

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

- **Session 5 — M1-F1 Catalog & Locations.** `lib/domain/catalog`
  (`createProduct` with Dish `buying_price=0` invariant, `updateProduct`,
  soft/hard delete with `StockMovement`/`OrderLine` referential guard →
  409). `app/api/products*`, `/api/locations`. Move
  `admin-catalog-product-catalog` + mobile + `product-drawer` +
  `product-delete-dialog` skeletons to `app/admin/catalog/*`; wire
  orchestration; swap fixtures. Tests: Dish invariant, location-price
  persistence, delete guard.
- **Session 6 — M1-F2 Stock backend (domain + APIs).** `lib/domain/stock`
  — `recordPurchasePayment`, `recordPurchaseReceipt`, `recordKitchenIssue`,
  `recordProduction`, `recordTransfer` (2-phase), `recordNonSaleConsumption`,
  `setOpeningStock`, `correctMovement` (day-close check + delta), plus
  `getDerivedStockBalance` (sum-the-ledger, never a stored total). All
  `app/api/stock-movements*` routes. Tests: derived-balance math,
  correction deltas, 2-phase transfer state, day-close gating.
- **Session 7 — M1-F2 Admin stock frontend.** Move ledger (full-width +
  drawer-open correction drawer), stock-mobile, bulk-opening-stock-grid,
  and the financials full-table + payment-drawer skeletons to their
  `app/admin/*` routes. Wire the reconciliation section to Delivery
  Status. Resolve **ADR-36a** consumers (chip or not) and **ADR-36b**
  (collapse persistence) with the Admin before wiring. Swap fixtures.
- **Session 8 — M1-F2 Store Manager + Canteen frontend.** Move the two
  hubs, both Store Manager flow screens, Canteen transfer dispatch, and
  both Stock Levels skeletons to `app/store-manager/*` and
  `app/canteen/*`. Wire the persistent transfer/delivery banners
  (pinned → accept/flag → timeline), the full-screen multi-item flows,
  and the 2-phase transfer accept. Swap fixtures.
- **Session 9 — M1-F3 Assets (backend + frontend, one session).** Assets
  has no stock/money dependency and a small surface — `lib/domain/assets`
  (CRUD, condition, friction-guarded delete), `app/api/assets*`, and move
  the register + asset-drawer + asset-delete-dialog skeletons to
  `app/admin/assets/*`. Tests: delete guard, condition transitions.

**N = 5** development sessions (Sessions 5–9).

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

**Reasoning for N = 5:** F1 (Catalog) is one contained
domain + one screen cluster → 1 session. F2 (Stock) is the milestone's
bulk — 8 domain functions, ~5 API route groups, and 11 screens across 3
roles; it does not fit one context window and splits cleanly into
backend / admin-frontend / staff-frontend → 3 sessions. F3 (Assets) is
small and dependency-free → 1 session. Splitting any further would create
sessions too small to justify their own setup cost; combining any would
risk the Sprint 06 failure mode of a session running out of context
mid-task.
