# Session 7 Handoff — Developer (Development Sprint): wire the M1-F2 **Admin stock frontend**

**Status:** DONE (2026-08-27). See `docs/PROGRESS.md` Session 7 entry.

**Role:** Developer, **Development Sprint** mode, for the Prosper project.
**Phase:** C (Implementation) of `docs/design/export-workflow.md`, feature
M1-F2. **Frontend-only session** — the F2 backend shipped in Session 6
(`lib/domain/stock` + `app/api/stock-movements*`, 56 tests green). You
move the **Admin** F2 design skeletons to their real `app/admin/*` routes
and wire them to those APIs. Store Manager / Canteen screens are Session 8.

**Your job:** take the five exported Admin skeletons below, put them at
their real paths, and replace every `fixtures.ts` import with real calls
to the Session-6 endpoints — **without touching the approved
markup/layout**. Then this session's tests.

**You make NO new UI/UX decisions.** The Paper screens are approved and
exported. If wiring reveals a genuine UI gap (a state nobody designed, a
control that can't express what the data needs), **STOP and flag it** — it
goes back to a design sprint, it is not decided here. Do NOT touch
`components/kit/*`, `components/shells/*`, `docs/design/screens/*`, or any
`/design-preview/*` route.

---

## Required reading (before any code)

Read in this order:

1. **`CLAUDE.md`** (root) — the role model, the non-negotiables. For this
   session the load-bearing ones: **no business logic in the client** (the
   client fetches, holds view state, and renders — every rule lives in
   `lib/domain/stock`, already built); **ledgers not stored totals**
   (every balance/closing figure the ledger shows comes from
   `getDerivedStockBalance` via `GET /api/stock-movements`, never a
   column); **corrections are new rows** (the correction drawer POSTs the
   *corrected final quantity*, the domain computes the delta — the UI
   never sends a delta); **`Africa/Nairobi` day boundaries** (any "which
   business day" label uses `lib/time`, never `new Date()` locale);
   **pnpm only**; **post a visible checklist and tick it**.
2. **`docs/sprints/milestone-1-plan.md`** — §2 (F2 definition + the
   **"Financials note"** and **"Financials M1 cut"** paragraphs — M1's
   `/admin/financials` is the **stock-purchase table + reconciliation
   Match cards only**; the 4-tile KPI stat strip is **M3**, do not build
   it), §3 (the master screen list — your five are #7–#11, artboards
   `798-0` / `7G9-0` / `7LJ-0` / `8Q4-0` / `7UD-0`, plus #12–#13
   `7ZJ-0` financials), §5 **"Session 7"** (your one-paragraph scope) and
   the "Sessions 5..N" preamble (Phase C rules — `fixtures.ts` decouples
   backend/frontend; the reference screens stay).
3. **`docs/PROGRESS.md`** — the **Session 6 entry** (2026-08-27). It is
   the contract you are wiring against: every domain function, every
   route, the response shapes, the camelCase-on-the-wire convention, the
   sign convention, the 2-phase transfer model, the one retained
   `TODO(mock)` (F3 `MoneyMovement`). Read the Session 5 entry too for the
   **frontend wiring pattern you will copy** (`use-catalog.ts` hook +
   `catalog-client.tsx` + thin `page.tsx`).
4. **`docs/API.md` → "Stock Movements"** (rewritten by Session 6). This is
   the exact wire contract: `GET /api/stock-movements` (role/location
   scoped; query `?productId=&locationId=&movementType=&date=`, `date` a
   `YYYY-MM-DD` business date), `POST /api/stock-movements` (discriminated
   on `movementType`; `opening` is a POST body here), `POST
   /api/stock-movements/:id/correct` (body `{ correctedQuantity, note? }`),
   `POST /api/stock-movements/:id/accept` (transfer phase 2 — **not an
   Admin screen; Session 8**), `GET /api/stock-movements/outstanding`
   (Admin; `{ awaitingReceipt, unmatchedReceipts }`). All money/quantity
   fields are **decimal strings**.
5. **`docs/CONVENTIONS.md`** — §1 (folder structure), §3 (**error shape**
   — the client switches on `error.code`, never the message string; copy
   `CatalogRequestError` from `use-catalog.ts`), §4 (the correction-entry
   pattern — read paths show the **derived** value; the correction drawer
   shows original-vs-corrected only in that drawer, per ADR-15), §5
   (money = decimal string on the wire).
6. **`docs/DECISIONS.md`** — **ADR-39** (Session 6 — the sign convention,
   the 2-phase transfer representation, `correctMovement` semantics, the
   F3 boundary — everything your fetch layer must respect); **ADR-15**
   (corrections are new entries); **ADR-11** (opening/closing computed on
   read — the ledger's Opening and Closing columns are **derived**, not
   stored); **ADR-36a** — **RESOLVED** (no "CORRECTED" chip; a corrected
   ledger cell renders as the value in the semantic color with a 1px
   underline, and the cell is the click target for the correction
   drawer); **ADR-36b** — **STILL OPEN, and it's yours** (see "Open
   decision to resolve with the owner" below); **ADR-37** (the
   `DenseLedger` kit props `showLocation` + `horizontalScroll` the ledger
   skeletons already pass — do not re-open the kit, just keep passing
   them).
7. **`docs/TEST_PLAN.md`** + **ADR-31** (each dev session ends with its
   own tests). Runner **`pnpm test`** (`vitest run`). **56 tests
   currently green — keep them so.** Frontend tests here are
   component/hook tests over the fetch layer (mock `fetch`), not a full
   browser suite — match whatever Session 5 did for its screens (it
   leaned on domain tests + a `pnpm dev` smoke; if the wired client has
   non-trivial view logic — the ledger's location-tab filter, the
   opening-stock grid's per-row dirty state — add focused tests for
   *that*).
8. **The five exported Admin skeletons you're moving** — read each
   `page.tsx` + `fixtures.ts` (+ `side-nav.tsx` where present):
   - `docs/design/screens/admin-stock-ledger-full-width/` (`798-0`) —
     the 11-column reconciliation ledger, location pill-tabs, date picker,
     Maximize, "Opening Stock" entry point. Uses kit `<DenseLedger
     showLocation horizontalScroll>` + `<PillFilter>`.
   - `docs/design/screens/admin-stock-ledger-sidebar-collapsed/` (`7G9-0`)
     — same screen, `AdminShell` `collapsed` state (this is the Maximize
     target — **ADR-36b**).
   - `docs/design/screens/admin-stock-ledger-drawer-open/` (`7LJ-0`) —
     same screen with the **correction drawer** open (original qty,
     corrected-qty input, computed delta, reason/note).
   - `docs/design/screens/admin-stock-mobile/` (`8Q4-0`) — purpose-built
     mobile: stock-on-hand summary cards, movement-breakdown drawers,
     discrepancy quick-flag, location selector. Not a squashed table.
   - `docs/design/screens/bulk-opening-stock-grid/` (`7UD-0`) — Day-1
     bulk opening-stock spreadsheet grid (desktop) + guided sequential
     entry (mobile).
   - **Plus the two Financials skeletons** (milestone-1-plan §3 #12–#13,
     both F2): `docs/design/screens/admin-financials-full-table/` (`7ZJ-0`)
     and `docs/design/screens/admin-financials-payment-drawer-open/` — the
     stock-purchase table + reconciliation Match cards + the
     record-payment drawer.
9. **The Session-5 wiring pattern to copy exactly:**
   - `app/admin/catalog/page.tsx` — thin server component, renders the
     client container; a comment pointing at the `/design-preview`
     regression fixtures.
   - `app/admin/catalog/catalog-client.tsx` — `"use client"`, holds all
     view state, orchestrates drawer/dialog.
   - `app/admin/catalog/use-catalog.ts` — **all** data-fetching in one
     hook; `CatalogRequestError` (status + `code` + `field`); a `request<T>`
     helper that unwraps `{ data }` / throws on `{ error }`. Make
     `app/admin/stock/use-stock.ts` (or similar) the same shape.
   - `app/admin/layout.tsx` already wraps every admin route in
     `<AdminShell>` — the real pages render the **content region only**
     (the exported skeletons bundle their own sidebar for standalone
     `/design-preview` use; drop it in the `app/**` copy, same as Session
     5 did for catalog).
   - `lib/domain/stock` is fully exported from its `index.ts` — but the
     **client** calls the **HTTP routes**, not the domain directly (domain
     is server-only; it imports `@/lib/db`).

---

## Open decision to resolve with the owner (before wiring the Maximize toggle)

**ADR-36b — ledger "Maximize" / sidebar-collapse persistence.** The
Ledger's Maximize button toggles `AdminShell`'s `collapsed` prop (that
part is settled). **Undecided:** when the user navigates away from the
ledger, does the collapsed state **persist app-wide** (shell-level state /
`localStorage`) or **snap back** to expanded (screen-local `useState`)?
This changes where the state lives. **Ask the owner at the start of the
session; record the answer in ADR-36b (close it) and PROGRESS.md.** Do
not pick one silently.

*(ADR-36a is already resolved — no chip, underlined semantic-color cell.
The milestone-1-plan §5 line that says "resolve ADR-36a" is stale; only
36b is open.)*

---

## Scope — what "done" means

### Routes moved + wired

| Skeleton (`docs/design/screens/…`) | Real route | Wired to |
|---|---|---|
| `admin-stock-ledger-full-width` (+ `-sidebar-collapsed`, `-drawer-open` are **states** of the same screen, not separate routes) | `app/admin/stock/` | `GET /api/stock-movements` (per-location, per-`date`) → derive the 11 columns; the correction drawer → `POST …/:id/correct`; "Opening Stock" button → the grid route |
| `admin-stock-mobile` | `app/admin/stock/` responsive **or** a nested segment (match how Session 5 handled catalog desktop+mobile — one route, responsive, or `/mobile` — check the catalog precedent and follow it) | same `GET`; the breakdown drawers slice the movement list; quick-flag → `POST …/:id/correct` or a note |
| `bulk-opening-stock-grid` | `app/admin/stock/opening/` | one `POST /api/stock-movements` `{ movementType: "opening", … }` per dirty row (sequential or `Promise.all`; a second submit for the same product/location/date is a correction server-side — surface that in the row state) |
| `admin-financials-full-table` | `app/admin/financials/` | `GET /api/stock-movements?movementType=purchase_payment` + `…=purchase_receipt` for the table; `GET /api/stock-movements/outstanding` for the reconciliation Match cards (Delivery Status) |
| `admin-financials-payment-drawer-open` | `app/admin/financials/` (drawer state) | the record-payment drawer → `POST /api/stock-movements` `{ movementType: "purchase_payment", …, paidFromAccount }` |

- **Zero `fixtures.ts` imports** remain in the `app/**` copies. The
  `docs/design/screens/*` + `/design-preview/*` copies **stay** (still
  importing `fixtures.ts`) as the permanent visual-regression reference —
  do NOT delete them.
- Approved markup/layout **unchanged** — you add state/handlers/fetch
  around it; you don't restyle it. The ledger keeps
  `<DenseLedger showLocation horizontalScroll>`; the corrected-cell
  treatment is the ADR-36a underlined semantic-color cell already in
  `dense-ledger.tsx`.
- **Derived columns are derived.** Opening / Closing / the running
  figures come from summing the movement list the API returns (or a
  dedicated balance call if you add one to the hook) — never a stored
  number. Closing = opening + Σ(movements in the day); next day's opening
  = today's closing (ADR-11). If the ledger needs a balance-as-of read
  the current `GET` can't express efficiently, **flag it** — a batched
  balance endpoint may be worth adding (Session 6 built
  `getDerivedStockBalances` in the domain but exposed no route for it).

### The correction drawer (`7LJ-0`)

- Opens from a ledger cell (the cell is the click target — ADR-36a).
- Shows the **original** movement's quantity, an input for the
  **corrected final quantity**, the **computed delta** (`corrected −
  original`, display-only — the server recomputes it authoritatively),
  and the reason/note field.
- Submit → `POST /api/stock-movements/:id/correct` with
  `{ correctedQuantity, note? }`. **Never send a delta.**
- On success, refetch the ledger for the active date/location so the cell
  now shows the derived (post-correction) value.
- `403` from the route (closed day, non-admin — shouldn't happen for an
  Admin screen, but handle it) → show the error via `error.code`, don't
  parse the message.

### Tests (`pnpm test`) — minimum

- The fetch hook: `request<T>` unwraps `{ data }`, throws a typed error on
  `{ error }` / non-2xx (mock `fetch`).
- The ledger's derive-the-columns logic (given a movement list for a
  product/day/location, the 11 column values are right — especially
  Opening/Closing and that a correction row lands in the derived value
  once, per ADR-39).
- The opening-stock grid's dirty-row → one-POST-per-row submit (mock the
  hook; assert the request bodies).
- Keep the existing **56** green.

### Cleanup / verification (all required before "done")

1. `pnpm tsc --noEmit` exits 0 (`rm -rf .next` first if `.next/dev/types`
   complains).
2. `pnpm test` — all suites green, including the new ones. State the count
   in `PROGRESS.md`.
3. `grep -rn "fixtures" app/admin/stock app/admin/financials` → empty
   (the `app/**` copies import no fixture module).
4. `grep -rn "TODO(mock)" app/admin/stock app/admin/financials` → empty
   (or every remaining marker is explicitly re-scoped with a reason in
   `PROGRESS.md` — note that the F3 `MoneyMovement` marker lives in
   `lib/domain/stock/purchases.ts`, **not** in your frontend scope, and
   stays).
5. `pnpm dev` smoke as **Admin** (local Postgres + `pnpm prisma db seed`):
   open `/admin/stock`, switch location tabs + date, confirm the columns
   reconcile against what you POST; open the correction drawer on an
   open-day cell, submit a corrected quantity, confirm the cell moves to
   the derived value by exactly the delta; run the bulk opening-stock
   grid for a couple of products, reload, confirm persistence (and that a
   re-submit is treated as a correction); open `/admin/financials`,
   confirm the purchase table + Match cards populate from
   `…/outstanding`, record a payment via the drawer. Any throwaway script
   lives in the repo root and is deleted when done (import from
   `@playwright/test`, not `playwright`).
6. **No kit / shell / `docs/design/screens` / `/design-preview` file
   touched.** `git status` should show only `app/admin/stock/**`,
   `app/admin/financials/**`, any new `app/admin/stock/*.ts(x)` hook/client
   files, and docs. (If you add a batched-balance route, that's
   `app/api/stock-movements/**` + a domain re-export — flag it in the
   wrap-up as a scope addition and update API.md.)

---

## Wrap-up

- `docs/sprints/milestone-1-plan.md` §5 — mark **Session 7 DONE**; note
  "F2 Admin stock frontend wired (ledger + correction drawer + mobile +
  bulk opening grid + financials stock-purchase/reconciliation slice);
  ready for Session 8 (Store Manager + Canteen frontend)".
- `docs/PROGRESS.md` — a "Session 7" entry in the Session-6 format: routes
  moved, the fetch-hook shape, how the 11 ledger columns are derived, the
  **ADR-36b resolution** (persist vs snap-back, and where the state now
  lives), any batched-balance route added, test counts, anything flagged.
- `docs/DECISIONS.md` — **close ADR-36b** with the owner's answer (edit
  the existing 36b section: change its status line, state the decision and
  where `collapsed` lives). Add a new ADR only if the session made a
  fresh structural choice (e.g. a batched-balance endpoint — next number
  is **ADR-40**).
- `docs/API.md` — update "Stock Movements" only if you added an endpoint
  (e.g. `GET /api/stock-movements/balances`); otherwise no change.

---

## Constraints (unchanged)

- **Development Sprint role.** Wire real calls only. **No new UI/UX
  decisions** — missing/contradictory design → STOP and flag. The one
  open decision (ADR-36b) is a *state-location* question for the owner,
  not a design change.
- **No business logic in the client.** Rules live in `lib/domain/stock`
  (built). The client fetches, holds view state, renders.
- **Ledger, not stored totals.** Every balance/opening/closing figure is
  derived from the movement list. No balance column, no client-side
  "running total" persisted anywhere.
- **Corrections POST the corrected final value (ADR-15).** The UI never
  computes or sends a delta; the displayed delta is cosmetic.
- **Money & quantity are decimal strings on the wire.** Parse for display;
  never do float math on them in the client.
- **Reuse Session 5's `use-*.ts` hook + `*-client.tsx` + thin `page.tsx`
  pattern** and its `CatalogRequestError` shape. Keep camelCase on the
  wire.
- pnpm only. Read `node_modules/next/dist/docs/` before any route code (if
  you add a balances endpoint).
- Do NOT touch any `components/kit/*`, `components/shells/*`,
  `docs/design/screens/*`, or `/design-preview/*` file. The exported
  skeletons' markup is approved and frozen.
- Post a checklist up front; tick it per task.
