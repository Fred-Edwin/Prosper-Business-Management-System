# Session 8 Handoff — Developer (Development Sprint): wire the M1-F2 **Store Manager + Canteen stock frontend**

**Status:** NOT STARTED.

**Role:** Developer, **Development Sprint** mode, for the Prosper project.
**Phase:** C (Implementation) of `docs/design/export-workflow.md`, feature
M1-F2. **Frontend-only session** — the F2 backend shipped in Session 6
(`lib/domain/stock` + `app/api/stock-movements*`) and Session 7 wired the
**Admin** half (ledger, correction drawer, bulk opening grid, financials
slice). You wire the **Store Manager** and **Canteen** half: the two
mobile hubs, the full-screen multi-item flows, Canteen transfer dispatch,
and the two read-only Stock Levels screens.

**Your job:** take the seven exported skeletons below, move them to their
real `app/store-manager/*` and `app/canteen/*` routes, and replace every
`fixtures.ts` import with real calls to the Session-6 endpoints —
**without touching the approved markup/layout**. Then this session's
tests.

**You make NO new UI/UX decisions.** The Paper screens are approved and
exported. If wiring reveals a genuine UI gap (a state nobody designed, a
control that can't express what the data needs), **STOP and flag it** — it
goes back to a design sprint, it is not decided here. Do NOT touch
`components/kit/*`, `components/shells/*`, `components/layout/*`,
`docs/design/screens/*`, or any `/design-preview/*` route.

---

## Required reading (before any code)

Read in this order:

1. **`CLAUDE.md`** (root) — the role model, the non-negotiables. For this
   session the load-bearing ones: **no business logic in the client** (the
   client fetches, holds view state, renders — every rule lives in
   `lib/domain/stock`, already built); **ledgers not stored totals**
   (every on-hand / available figure comes from `getDerivedStockBalance`
   via a route, never a column); **corrections are new rows** (any
   "adjust" affordance POSTs the *corrected final quantity*, the domain
   computes the delta — the UI never sends a delta); **`Africa/Nairobi`
   day boundaries** (`lib/time`, never `new Date()` locale); **pnpm
   only**; **post a visible checklist and tick it**.
2. **`docs/sprints/milestone-1-plan.md`** —
   - §3 (master screen list — your seven are **#17–#23**: `8T3-0`
     `store-manager-mobile-hub`, `8XH-0`
     `store-manager-flows-issues-production`, `92M-0`
     `store-manager-flows-transfers-consumption`, `986-0`
     `store-manager-stock-levels`, `9BA-0`
     `canteen-mobile-operations-hub`, `9FE-0` `canteen-transfer-dispatch`,
     `9GW-0` `canteen-stock-levels`).
   - §4 **"Live design decisions carried forward"** — items **2, 4, 5, 7**
     are yours:
     - **#2** — **no `/store-manager/receipts` or `/canteen/receipts`
       routes.** Purchase deliveries **and** stock transfers are
       **persistent banners** on each mobile hub — pinned until
       Accepted / Matched / Flagged, then dropped into the hub's
       "Today's … Log" timeline. **Both** are banners, not
       transfers-only.
     - **#4** — `/store-manager/stock` and `/canteen/stock` are in M1
       scope: **read-only** current-stock-level views.
     - **#5** — Canteen gets its **own** Transfer Dispatch screen
       (`9FE-0`) — the Canteen dispatches too, it is not purely a
       transfer *destination*.
     - **#7** — transfer vs. purchase-delivery banner colour is **final**:
       amber (`<TransferBanner>`) for transfers between own locations,
       blue (`<PurchaseDeliveryBanner>`) for external-supplier deliveries.
       Both already ship in `components/kit/banner.tsx` — **just pass the
       right one**, do not re-open the kit.
   - §5 **"Session 8"** (your one-paragraph scope) and the "Sessions
     5..N" preamble (Phase C rules — `fixtures.ts` decouples
     backend/frontend; the `/design-preview` reference screens stay).
3. **`docs/PROGRESS.md`** — the **Session 7 entry** (2026-08-27): the
   fetch-hook shape you will copy (`app/admin/stock/use-stock.ts` —
   `StockRequestError` + `request<T>` + `stockApi` + a `useLedger` hook),
   the derive-the-columns pattern, the `GET
   /api/stock-movements/balances` route added there (ADR-40), the ADR-36b
   resolution, and the flagged multi-movement-cell design gap. Read the
   **Session 6 entry** too — it is the backend contract you are wiring
   against (every domain fn, every route, the sign convention, the
   **2-phase transfer model**, the camelCase-on-the-wire convention).
4. **`docs/API.md` → "Stock Movements"** (rewritten Session 6, extended
   Session 7). The exact wire contract. The ones you need this session:
   - `GET /api/stock-movements` — role/location scoped; query
     `?productId=&locationId=&movementType=&date=`. A location-bound
     caller (Store Manager / Canteen Attendant) **only ever sees its own
     location's rows**; a foreign `locationId` filter → `[]`.
   - `GET /api/stock-movements/balances?productIds=&locationId=&asOf=` —
     batched derived balances (ADR-40). The Stock Levels screens' "on
     hand" column and the flow screens' "Avail: …" figures come from
     here.
   - `POST /api/stock-movements` — discriminated on `movementType`. Your
     writes: **`issue`** (Store Manager; `−q` at the Store),
     **`production`** (Store Manager; `+q` at a `restaurant` location;
     product must be `kind = "dish"`), **`transfer`** (Store Manager /
     Canteen Attendant; **phase 1** — writes the `−q` dispatch row at
     `fromLocationId` only), **`non_sale_consumption`** (Store Manager /
     Canteen Attendant, location-scoped; `−q`; `reasonNote` **required
     iff `reason = "other"`**), **`purchase_receipt`** (Store Manager /
     Canteen Attendant; `+q` at `locationId`; optional
     `purchasePaymentId` → `404` if it doesn't reference a real
     `purchase_payment`).
   - `POST /api/stock-movements/:id/accept` — **phase 2** of a transfer.
     No body / `{}` → accept (writes the `+q` counterpart at the
     destination; double-accept → `409`). `{ "flag": true, "note": "…" }`
     → flag a discrepancy (records the note on the pending `−q` row,
     releases **no** stock).
   - `POST /api/stock-movements/:id/correct` — `{ correctedQuantity,
     note? }`. Only if a Store Manager / Canteen "adjust my own entry"
     affordance appears in a skeleton (check — the hub "Today's Log"
     rows may have one). Same-day, own-entry → allowed by the domain;
     closed day → `403`.
5. **`docs/CONVENTIONS.md`** — §1 (folder structure — role folders under
   `app/` are plain paths, `/store-manager` + `/canteen`), §3 (**error
   shape** — the client switches on `error.code`, never the message
   string; copy `StockRequestError` from Session 7's `use-stock.ts`), §4
   (the correction-entry pattern), §5 (money & quantity = decimal string
   on the wire).
6. **`docs/DECISIONS.md`** — **ADR-39** (Session 6 — the sign convention,
   the **2-phase transfer representation** — a pending transfer is
   exactly *a `transfer` row with `quantity < 0` and `correctsMovementId
   = null` and no sibling `transfer` row pointing back at it*;
   `acceptTransfer` / `flagTransfer` semantics; the F3 `MoneyMovement`
   boundary); **ADR-11** (opening/on-hand computed on read); **ADR-36a**
   (corrected cells: no chip — semantic-colour value + 1px underline;
   the cell is the click target); **ADR-40** (Session 7 — the
   `/balances` route; there is a matching *balances* route but **no
   pending-transfers route yet** — see "Likely scope addition" below).
7. **`docs/TEST_PLAN.md`** + **ADR-31** (each dev session ends with its
   own tests). Runner **`pnpm test`** (`vitest run`). **76 tests
   currently green — keep them so.** The Session-7 pattern: pure helper
   tests + a `stockApi`-layer test with a mocked `fetch`, **not** a
   jsdom/React-render suite (vitest `environment: "node"` here). Extract
   any non-trivial view logic (the flow screens' multi-item selection +
   running-total, the hub's banner→timeline transition, the Stock
   Levels low-stock sort/filter) into a pure module and test *that*,
   exactly as Session 7 did with `derive-ledger.ts` and
   `opening/opening-plan.ts`.
8. **The seven exported skeletons you're moving** — read each `page.tsx`
   + `fixtures.ts`:
   - `docs/design/screens/store-manager-mobile-hub/` (`8T3-0`) — two
     persistent hub banners (pinned transfer / purchase-delivery), a
     "Quick Store Operations" tile row, "Today's Movement Log" timeline.
   - `docs/design/screens/store-manager-flows-issues-production/`
     (`8XH-0`) — **two** full phone screens side by side: "Issue
     Ingredients" (multi-select ingredient cards + per-row qty + a
     running "Confirm Kitchen Issue (−53.5 kg)" total) and "Record Batch
     Production" (dish + batch/shift metadata).
   - `docs/design/screens/store-manager-flows-transfers-consumption/`
     (`92M-0`) — **two** full phone screens: "Transfer Stock" (category
     tabs, multi-select, destination) and "Record Non-Sale Consumption"
     (item + reason + conditional reason-note).
   - `docs/design/screens/store-manager-stock-levels/` (`986-0`) —
     read-only current-stock table for the Store.
   - `docs/design/screens/canteen-mobile-operations-hub/` (`9BA-0`) —
     one persistent incoming-transfer banner, "Canteen Workflows" row,
     "Today's Canteen Log" timeline.
   - `docs/design/screens/canteen-transfer-dispatch/` (`9FE-0`) — the
     Canteen's own transfer-dispatch flow (mirror of the Store
     Manager's transfer panel).
   - `docs/design/screens/canteen-stock-levels/` (`9GW-0`) — read-only
     current-stock table for the Canteen.
9. **The Session-7 wiring pattern to copy exactly** (`app/admin/stock/`):
   - `page.tsx` — thin server component, renders the client container; a
     comment pointing at the `/design-preview` regression fixtures.
   - `*-client.tsx` — `"use client"`, holds all view state, orchestrates
     the flow / drawer.
   - `use-stock.ts` — **all** data-fetching in one module;
     `StockRequestError` (status + `code` + `field`); a `request<T>`
     helper that unwraps `{ data }` / throws on `{ error }`; a `stockApi`
     object of plain (non-React) calls; role-specific hooks on top. Make
     `app/store-manager/stock/use-store-stock.ts` (or a shared
     `lib/api/stock-client.ts` if you find yourself copying it into two
     role folders — flag that as a small refactor if you do it).
   - `app/store-manager/layout.tsx` / `app/canteen/layout.tsx` already
     wrap every route in `<StaffShellClient>` (header + bottom nav +
     sticky action bar). The real pages render the **content region
     only** — the exported skeletons that bundle their own chrome drop
     it in the `app/**` copy, same as the role-home pages
     (`app/store-manager/page.tsx`) already do today.
   - The bottom-nav segments are already defined in
     `components/layout/staff-shell-client.tsx` — `/store-manager` and
     `/canteen` both have `hub` / `stock` / `history`. Your Stock Levels
     screens are the **`stock`** segment (`/store-manager/stock`,
     `/canteen/stock`). Do **not** edit `staff-shell-client.tsx` — the
     nav is approved; if a flow needs a route the nav doesn't list
     (e.g. `/store-manager/issue`), that's a nested route reached from a
     hub tile, not a new nav item.

---

## Likely scope addition to resolve early — a pending-transfers read route

The hub banners (`8T3-0`, `9BA-0`) and the accept/flag affordance need
**"the pending incoming transfers for my location"**. Session 6 built
`recordTransfer` / `acceptTransfer` / `flagTransfer` and the accept
route, and Session 7 added `GET /api/stock-movements/balances` — but
**there is no `GET` that lists pending transfers**. `GET
/api/stock-movements?movementType=transfer&locationId=…` returns *this*
location's `transfer` rows (dispatches *out*), not the ones dispatched
*to* it awaiting acceptance (those rows live at the *sender's*
`locationId`, with `transferCounterpartLocationId` = you).

**Almost certainly you need to add `GET
/api/stock-movements/pending-transfers`** (Store Manager / Canteen
Attendant → their location; Admin → all), backed by a new
`listPendingTransfers(locationId)` in `lib/domain/stock` that returns
`transfer` rows where `transferCounterpartLocationId = locationId AND
quantity < 0 AND correctsMovementId IS NULL AND` no sibling counterpart
row exists (the ADR-39 "pending" definition). This is the direct analogue
of what Session 7 did with `/balances` (domain fn existed / route added)
— except here the **domain fn also needs writing**.

**Do this the same way Session 7 handled `/balances`:** add the domain
fn + the thin route, flag it in the wrap-up as a **scope addition**, add
an **ADR-41** (next number) for the route + the pending-transfer query
definition, and update `docs/API.md` "Stock Movements". Keep the handler
logic-free (validate → role/location check → call the domain fn → standard
envelope). If, reading the skeletons, you find the banners can be
satisfied some other way with the *existing* routes, take that path and
note why no new route was needed — but do not fake it with a client-side
filter over an over-broad list.

---

## Scope — what "done" means

### Routes moved + wired

| Skeleton (`docs/design/screens/…`) | Real route | Wired to |
|---|---|---|
| `store-manager-mobile-hub` (`8T3-0`) | `app/store-manager/page.tsx` (the `hub` segment / bare base route — replaces today's fixture-backed home) | banners → the pending-transfers read + `GET …?movementType=purchase_receipt` (unmatched, or awaiting) ; Quick Ops tiles → links to the flow routes ; "Today's Movement Log" → `GET /api/stock-movements?locationId=<store>&date=<today>` |
| `store-manager-flows-issues-production` (`8XH-0`) | `app/store-manager/issue/` and `app/store-manager/production/` (two nested routes, reached from hub tiles — or one route with a mode switch if the skeleton is drawn as a single screen with a toggle; **follow the skeleton**) | multi-select + running total → one `POST /api/stock-movements { movementType: "issue" | "production", … }` per confirmed line (or one call if the domain takes a line set — it does **not**; F2 issue/production are single-row per call, so it's one POST per selected item, `Promise.allSettled`, surface per-row failure like the Session-7 opening grid) |
| `store-manager-flows-transfers-consumption` (`92M-0`) | `app/store-manager/transfer/` and `app/store-manager/consumption/` | transfer → `POST … { movementType: "transfer", productId, fromLocationId: <store>, toLocationId, quantity }` (**phase 1 only** — stock leaves now; the destination accepts later) ; consumption → `POST … { movementType: "non_sale_consumption", …, reason, reasonNote? }` (send `reasonNote` **iff** `reason === "other"`; the domain 400s otherwise) |
| `store-manager-stock-levels` (`986-0`) | `app/store-manager/stock/` (the `stock` nav segment) | **read-only.** `GET /api/stock-movements/balances?productIds=<all Store-stocked>&locationId=<store>` for the on-hand column; product list from `GET /api/products`. No writes. |
| `canteen-mobile-operations-hub` (`9BA-0`) | `app/canteen/page.tsx` (the `hub` segment) | incoming-transfer banner → pending-transfers read ; banner Accept → `POST /api/stock-movements/:id/accept` ; banner Flag → `POST …/:id/accept { flag: true, note }` ; "Today's Canteen Log" → `GET /api/stock-movements?locationId=<canteen>&date=<today>` |
| `canteen-transfer-dispatch` (`9FE-0`) | `app/canteen/transfer/` | `POST … { movementType: "transfer", productId, fromLocationId: <canteen>, toLocationId, quantity }` (phase 1) |
| `canteen-stock-levels` (`9GW-0`) | `app/canteen/stock/` (the `stock` nav segment) | **read-only**, same shape as `986-0` but `locationId = <canteen>`. |

- **Zero `fixtures.ts` imports** remain in the `app/store-manager/**` and
  `app/canteen/**` copies. The `docs/design/screens/*` + `/design-preview/*`
  copies **stay** (still importing `fixtures.ts`) as the permanent
  visual-regression reference — do NOT delete them. Note the two role-home
  pages (`app/store-manager/page.tsx`, `app/canteen/page.tsx`) currently
  **`import … from "@/docs/design/screens/…/page"`** — that indirection
  goes away; the real content region moves into the client component.
- Approved markup/layout **unchanged** — you add state/handlers/fetch
  around it; you don't restyle it. Banners use the kit
  `<TransferBanner>` / `<PurchaseDeliveryBanner>` already in the
  skeletons.
- **On-hand / available figures are derived** — every one comes from
  `GET /api/stock-movements/balances` (or the day's movement list), never
  a stored number.
- **The `Store` location scoping is automatic** — a Store Manager /
  Canteen Attendant session resolves its location via
  `User.staff.locationId` (Session 6, `resolveActorLocationId`); the
  routes enforce it. The client should still pass `locationId` where the
  contract asks, but a foreign one returns `[]` / `403` — surface that via
  `error.code`, don't pre-guess.

### The multi-item flow screens (`8XH-0`, `92M-0`, `9FE-0`)

- Each is a **select items → set per-item quantity → confirm** flow with
  a **running total** in the confirm button ("Confirm Kitchen Issue
  (−53.5 kg)"). That total is **display-only** — the server is
  authoritative per row.
- On confirm: **one `POST /api/stock-movements` per selected line**
  (`issue` / `production` / `transfer` / `non_sale_consumption` are all
  single-row-per-call in F2 — there is no batch endpoint). Fire them
  with `Promise.allSettled`; on partial failure, keep the successful
  rows done and re-surface the failed ones with `error.code` (the
  Session-7 opening-grid `planOpeningPosts` + `Promise.allSettled`
  pattern is the model — extract the "selected lines → POST bodies"
  planning into a pure, tested module).
- **Never send a delta or a signed quantity** — these take an **unsigned
  magnitude**; the domain applies the sign per movement type.
- Category tabs / search are **client-side view state** over the product
  list; no server round-trip per tab.

### The hub banners → timeline transition (`8T3-0`, `9BA-0`)

- A pending transfer / delivery renders as a **pinned banner**. On
  Accept / Flag / Match it **leaves the banner area and appears in
  "Today's … Log"**. After the write, **refetch** both the
  pending-transfers read and the day's movement list so the banner
  disappears and the log row appears from real data — do not
  optimistically move a client object between two arrays and skip the
  refetch (the log row's derived fields come from the server).
- Accept → `POST /api/stock-movements/:id/accept` (no body). `409`
  (already accepted) → refetch and show it as already done, don't error
  loudly.
- Flag → `POST /api/stock-movements/:id/accept { flag: true, note }` —
  the transfer **stays pending** (an Admin resolves it); the banner
  stays, now showing the flagged state if the skeleton draws one.

### The read-only Stock Levels screens (`986-0`, `9GW-0`)

- Pure read. `GET /api/products` for the catalog, `GET
  /api/stock-movements/balances?productIds=…&locationId=…` for on-hand.
- Any "low stock" highlight is a **client-side** comparison against a
  threshold **only if the skeleton already shows one with a fixture
  value** — if there's no threshold field in the data model, render what
  the skeleton shows and **flag** that a reorder-level concept would need
  designing/schema. Do not invent a threshold.
- No "adjust" / "correct" affordance here unless the skeleton draws one.

### Tests (`pnpm test`) — minimum

- The fetch layer (whichever module ends up owning it): `request<T>`
  unwraps `{ data }`, throws a typed error on `{ error }` / non-2xx
  (mock `fetch`); the discriminated `POST` bodies are shaped right
  (`issue` / `production` / `transfer` / `non_sale_consumption` — magnitude
  unsigned, `reasonNote` present iff `reason === "other"`).
- The flow screens' **selected-lines → POST-bodies** planning (given a
  set of selected items with quantities, the request bodies are right,
  one per line; invalid / zero / unselected rows produce no body).
- If you add `listPendingTransfers` — a unit test of the pending-query
  predicate (a `−q` transfer row with `correctsMovementId = null` and
  `transferCounterpartLocationId = me` and no counterpart is pending;
  an already-accepted one is not).
- Keep the existing **76** green.

### Cleanup / verification (all required before "done")

1. `pnpm tsc --noEmit` exits 0 (`rm -rf .next` first if
   `.next/dev/types` complains).
2. `pnpm test` — all suites green, including the new ones. State the
   count in `PROGRESS.md`.
3. `pnpm build` — succeeds; the new routes appear in the route table.
4. `grep -rn "fixtures" app/store-manager app/canteen` → only
   doc-comment prose (no `from "…/fixtures"` import).
5. `grep -rn "TODO(mock)" app/store-manager app/canteen` → empty (or
   every remaining marker is explicitly re-scoped with a reason in
   `PROGRESS.md`).
6. `grep -rn "docs/design/screens" app/store-manager app/canteen` →
   only comment references, no `import` (the role-home pages' current
   `import … from "@/docs/design/screens/…/page"` must be gone).
7. `pnpm dev` smoke as **Store Manager** and **Canteen Attendant**
   (local Postgres + `pnpm prisma db seed`): open the hub — a seeded /
   freshly-dispatched pending transfer shows as a banner; Accept it,
   confirm stock lands (balance moves) and the banner → log; run the
   Issue flow for 2 ingredients, confirm two `issue` rows and the Store
   balance drops by the exact magnitudes; run a transfer dispatch,
   confirm the `−q` row exists at the sender and the destination now has
   a pending banner; open Stock Levels, confirm the on-hand column
   matches what you'd compute from the ledger; run Non-Sale Consumption
   with `reason = "other"` and no note → the flow surfaces the 400.
   Throwaway script lives in the repo root, deleted when done (import
   from `@playwright/test`, not `playwright`).
8. **No kit / shell / layout / `docs/design/screens` / `/design-preview`
   file touched.** `git status` should show only
   `app/store-manager/**`, `app/canteen/**`, any new hook/client files,
   `app/api/stock-movements/pending-transfers/**` (if added) + a
   `lib/domain/stock` addition (if added), and docs.

---

## Wrap-up

- `docs/sprints/milestone-1-plan.md` §5 — mark **Session 8 DONE**; note
  "F2 Store Manager + Canteen stock frontend wired (both hubs +
  issue/production + transfer/consumption flows + Canteen dispatch +
  both Stock Levels); 2-phase transfer accept/flag wired; ready for
  Session 9 (F3 Assets)".
- `docs/PROGRESS.md` — a "Session 8" entry in the Session-7 format:
  routes moved, the fetch-hook shape (and whether it was shared into
  `lib/api/`), how the hub banner→timeline transition works, the
  multi-item-flow one-POST-per-line pattern, any pending-transfers route
  added, test counts, anything flagged.
- `docs/DECISIONS.md` — add **ADR-41** if you added the
  pending-transfers route (route + the pending-transfer query
  definition). Add another ADR only for a fresh structural choice.
- `docs/API.md` — update "Stock Movements" only if you added an endpoint.

---

## Constraints (unchanged from Session 7)

- **Development Sprint role.** Wire real calls only. **No new UI/UX
  decisions** — missing/contradictory design → STOP and flag.
- **No business logic in the client.** Rules live in `lib/domain/stock`
  (built). The client fetches, holds view state, renders.
- **Ledger, not stored totals.** Every on-hand / available figure is
  derived from `/balances` or the movement list.
- **Writes take an unsigned magnitude.** The domain applies the sign.
  Corrections (if any affordance appears) POST the corrected final value;
  the UI never computes or sends a delta.
- **Money & quantity are decimal strings on the wire.** Parse for
  display; never float math in the client.
- **Reuse Session 7's `use-stock.ts` shape** (`StockRequestError` +
  `request<T>` + `stockApi`). Keep camelCase on the wire.
- **2-phase transfer:** dispatch (`POST transfer`) releases stock at the
  sender now; the destination's Accept (`POST …/:id/accept`) lands it
  there later. A pending transfer is *a `−q` `transfer` row with
  `correctsMovementId = null` and no counterpart* (ADR-39).
- pnpm only. Read `node_modules/next/dist/docs/` before any route code
  (if you add the pending-transfers endpoint).
- Do NOT touch any `components/kit/*`, `components/shells/*`,
  `components/layout/*`, `docs/design/screens/*`, or `/design-preview/*`
  file. The exported skeletons' markup is approved and frozen.
- Post a checklist up front; tick it per task.

---

## Notes carried from Session 7

- `docs/design/flows/` is **empty** — there are no per-feature flow
  docs. The flow *is* the skeleton + `fixtures.ts` + the milestone-plan
  §4 decisions. Do not go looking for a flow markdown; there isn't one.
- Session 7 flagged a **design gap** (Admin ledger aggregate cells
  backed by >1 movement have no correction affordance). Not your problem
  this session unless a Store Manager / Canteen skeleton has the same
  shape — if an "adjust" affordance targets an aggregated figure rather
  than one movement, that's the same gap; flag it, wire the single-row
  case.
- The Session-7 fetch layer (`app/admin/stock/use-stock.ts`) is
  Admin-scoped by usage but not by code — you can lift `StockRequestError`
  + `request<T>` + the discriminated-POST helpers into
  `lib/api/stock-client.ts` and have all three role folders import it.
  If you do, that's a small refactor to call out in the wrap-up (and
  re-point `app/admin/stock/use-stock.ts` at it), not a silent
  duplication.
- Test env is `environment: "node"` — no jsdom. Keep tests to pure
  helpers + `fetch`-mocked `stockApi` calls, as Session 7 did.
