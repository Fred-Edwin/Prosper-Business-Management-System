# Session 12 Handoff — Developer: **M1-F2 Store Manager + Canteen frontend — composed from the proven kit, wired to the F2 stock APIs**

**Status:** NOT STARTED. **UNBLOCKED** — Session 11 closed the Admin
screen rebuild (compose-don't-transcribe method + per-screen gate),
retired the `--surface-panel-tint` alias, and rewrote
`export-workflow.md`. Latest commit on `session-10b-kit-proof-harness`:
`2e8e5bc` (Session 11 docs) — the Session-11 rebuild commits are
`044752c` → `2e8e5bc`.

**Role:** Developer, Prosper project. **Development Sprint.** This session
takes the **7 approved Store Manager + Canteen mobile skeletons** from
`docs/design/screens/`, **composes** them from the proven component kit
(Sessions 9 + 10 + 10b–10d + the Session-11 method) into their real
`app/store-manager/*` + `app/canteen/*` routes, and wires them to the
**F2 stock domain + API built in Session 6**. Fixtures behind the same
interface real data uses, `TODO(mock)` each unfinished endpoint.

This is **not** a design sprint (no new visual decisions — if a screen
needs one, STOP and flag it in `PROGRESS.md`), **not** a kit change
(`components/kit/*` and `components/shells/*` are proven and gated —
don't touch them), and **not** a rework of the F1/F2 backend
(`lib/domain/**`, `lib/validation/**`, `lib/api/**`, `app/api/**` are
untouchable).

---

## Why this session exists

Sessions 5–7 shipped the **Admin** F1/F2 surface (Catalog + Stock ledger
+ Financials) and Session 11 recomposed it on the proven kit. The
**staff-facing** half of F2 — the Store Manager and Canteen Attendant
mobile screens (issue ingredients, record production, transfer stock, log
non-sale consumption, receive deliveries, view stock levels) — was
exported as static skeletons in Sessions 3–4 and never wired. Session 6
built the domain + API those screens need (`lib/domain/stock` +
`app/api/stock-movements*`, incl. the 2-phase transfer `accept`
endpoint). This session brings the screens onto the kit and onto that
API, the **same way Session 11 did for Admin**.

---

## Required reading (before any code)

1. **`CLAUDE.md`** — role model, **pnpm only**, **post a visible
   checklist**, the rewritten Design/Development-Sprint paragraphs.
2. **`docs/design/export-workflow.md`** — the current method. Screens are
   **composed** from the proven kit; the Paper artboard is the **visual
   acceptance target** (`get_screenshot` / `get_computed_styles`, never
   eyeball a value); the per-screen gate is a `tests/screens/
   *.screen.test.tsx` jsdom+RTL spec. Phase C1–C3.
3. **`docs/design/kit-audit.md`** + **`docs/design/component-states.md`
   §2 / §9** — what each kit component now does.
4. **`docs/DECISIONS.md`** —
   - **ADR-37c** — `FlowHeader` `directionTone` (`info` / `success` /
     `danger` / `warning`).
   - **ADR-39** — the F2 stock ledger: **signed-quantity convention**
     (every `quantity` signed from its own `locationId`'s perspective;
     inputs take an **unsigned magnitude**), the **2-phase transfer**
     (dispatch `−q` row now, counterpart `+q` row on accept via `POST
     /api/stock-movements/:id/accept`; flag = same endpoint `{ flag:
     true, note }`), `correctMovement` always writes a delta row.
   - **ADR-40** — `GET /api/stock-movements/balances` (batched derived
     balances for a stock-levels view).
   - **ADR-43** — `Toast` placement is a `<ToastProvider>` prop; **staff
     gets `placement="bottom-center"`** (admin got `top-right` in Session
     11). `BottomSheet`, `FlowHeader`, `PillFilter` API shapes.
   - **ADR-15** — corrections are new rows; staff edit their own
     same-day entries before close.
5. **`docs/design/flows/*.md`** — the per-feature user flows for the
   Store Manager / Canteen movements (issue, production, transfer,
   non-sale, delivery receipt).
6. **`docs/API.md`** "Stock Movements" — the exact request/response
   shapes for every F2 endpoint. **Do not change these.**
7. **Every skeleton in scope** (listed below) + its Paper artboard —
   know which markup block maps to which kit component, and flag any
   block with no kit equivalent.
8. **`node_modules/next/dist/docs/`** — Next **16.3.1**, React 19.2,
   Tailwind v4.3.3. Read the relevant guide before any config / route /
   middleware change.
9. **The Paper file** ("Prosper Hotel", `01M0EZ7TAHZM26KBMWNYT0928X`,
   page "Shell+Component kit") — **READ-ONLY**, `get_*` only.
   `get_guide({ topic: "paper-mcp-instructions" })` first. The mobile
   artboards are 390px wide.

---

## Scope

### A. Compose these 7 skeletons into their real routes

**Keep the artboards as the visual target. Compose from the kit. Wire a
per-feature hook for data.** Line counts are the current skeleton size —
expect each to change shape as it composes kit components + real state.

| Skeleton (`docs/design/screens/…`) | Artboard | Real route | Compose from |
|---|---|---|---|
| `store-manager-mobile-hub` | `8T3-0` | `app/store-manager/page.tsx` | `<StaffShell>` chrome (already there) + `<ActionTileGrid>` (Issue / Production / Transfer / Non-Sale / Receive) + the persistent `<Banner>` (Transfer **and** PurchaseDelivery, pinned at top when there's an incoming one) + `<BottomNav>` |
| `canteen-mobile-operations-hub` | `9BA-0` | `app/canteen/page.tsx` | same shape, Canteen tiles (Transfer Dispatch, Stock Count, Stock Levels) + the pinned `<Banner>` |
| `store-manager-flows-issues-production` | `8XH-0` | `app/store-manager/flows/issue/*` + `…/production/*` (or one route with a mode) | full-screen flow: `<FlowHeader directionTone="danger">` (Issue) / `directionTone="success"` (Production) + a multi-item entry list (`<QuantityStepper>` rows or a `<BulkEntryGrid>`) + a sticky submit + `<Toast placement="bottom-center">` on save |
| `store-manager-flows-transfers-consumption` | `92M-0` | `app/store-manager/flows/transfer/*` + `…/non-sale/*` | `<FlowHeader directionTone="info">` (Transfer) / `"warning"` (Non-Sale) + origin→destination picker (`<Select>`) + qty (`<QuantityStepper>`) + `<CalculatedImpactBanner>` (impact preview) + reason `<Textarea>` (Non-Sale) + `<Toast>` |
| `canteen-transfer-dispatch` | `9FE-0` | `app/canteen/transfer/*` | `<FlowHeader directionTone="info">` + dispatch form (product `<Select>`, destination `<Select>`, qty `<QuantityStepper>`) + `<Toast>` |
| `store-manager-stock-levels` | `986-0` | `app/store-manager/stock/*` | a mobile stock-levels view: `<DenseSummaryStrip>` (totals) + `<PillFilter>` (category or location) + a mobile stock **card** list (kit `<Card>`-ish + `<StatusChip>` / `<ConditionChip>` where the artboard shows a status) — **not** a `<DenseLedger>` (that's the Admin desktop view) + `<EmptyState>` / `<ErrorState>` |
| `canteen-stock-levels` | `9GW-0` | `app/canteen/stock/*` | same as `store-manager-stock-levels`, Canteen-scoped |

**Responsive:** these are mobile-first (390px). There is no desktop table
swap — the whole screen is the mobile layout. Match the mobile artboards.

### B. Adopt the primitives + the persistent banner flow

- **`<ToastProvider placement="bottom-center">`** wraps the **staff**
  route tree. Do this **once** in
  `components/layout/staff-shell-client.tsx` (the shared client boundary
  for both `/store-manager` and `/canteen` — check before editing).
  Mirror of Session 11's admin `top-right`.
- **`<PageShell>`** (or its staff equivalent if the mobile chrome
  differs) owns each screen's content region. Check whether `<StaffShell>`
  already supplies the padding/scroll region a mobile screen needs before
  wrapping in `<PageShell>` — don't double up.
- **`<FormField>`** wraps every labelled form control (§9.8 helper/error
  row + `aria-describedby` / `aria-invalid`).
- **`<Toast placement="bottom-center">`** on every issue / production /
  transfer / non-sale / receive success.
- **`<EmptyState>` / `<ErrorState>`** for every list empty and every
  fetch error (`<EmptyState variant="filtered">` + "Clear filters" for a
  filtered-to-nothing list).
- **The persistent transfer/delivery banner flow** — the heart of F2
  staff:
  - An **incoming transfer** (a `transfer` row with `quantity < 0`,
    `correctsMovementId = null`, no sibling `+q` row — ADR-39) shows a
    pinned `<Banner>` on the receiver's hub. **Accept** → `POST
    /api/stock-movements/:id/accept` (writes the `+q` counterpart,
    stock lands). **Flag** → same endpoint with `{ flag: true, note }`
    (records the discrepancy note, releases no stock, stays pending).
    After accept/flag, the banner collapses into a **timeline** entry
    (`<ActivityTimeline>`).
  - An **incoming delivery** (a `purchase_payment` awaiting its
    `purchase_receipt`) shows a pinned `<PurchaseDeliveryBanner>` /
    `<MatchCard>` on the Store Manager's hub. **1-tap match & receive**
    → the receipt POST. Same pinned → accept → timeline shape.

### C. Wire the data — one per-feature hook, real F2 API

- All fetching lives in a hook (`app/store-manager/use-staff-stock.ts` or
  similar — mirror `app/admin/stock/use-stock.ts`'s shape and its
  `StockRequestError` / standard-envelope handling). The screens are
  pure presentation + orchestration over it.
- Endpoints (Session 6, **do not change**):
  - `GET /api/stock-movements` — role-scoped list (Store Manager /
    Canteen see their own location only).
  - `GET /api/stock-movements/balances?productIds=…&locationId=…&asOf=…`
    — batched derived balances for the stock-levels view (ADR-40).
  - `POST /api/stock-movements` — `{ movementType, productId,
    locationId, quantity (unsigned magnitude), … }` for issue /
    production / transfer-dispatch / non-sale / receipt.
  - `POST /api/stock-movements/:id/accept` — 2-phase transfer accept /
    `{ flag: true, note }`.
- Anything Session 6 didn't finish: a `TODO(mock)` fixture **behind the
  same interface** the real call will use. Grep `TODO(mock)` before
  calling a screen done.
- **No business logic in the client.** Signs, deltas, derived balances
  are the domain's job — the client sends unsigned magnitudes and
  renders what comes back.

### D. Doc updates

- **`docs/PROGRESS.md`** — a Session 12 entry (what was composed, the
  banner flow wiring, the `TODO(mock)` list carried, doc updates).
- **`docs/sprints/milestone-1-plan.md §5`** — tick Session 12.
- **`docs/DECISIONS.md`** — an ADR **only if** composing a staff screen
  forces a real decision (next free number → **ADR-44**). Composition
  that "just works" needs no ADR.
- **`docs/sprints/session-13-handoff.md`** — draft it: "M1-F3 Assets
  (backend + frontend, one session)" — `lib/domain/assets` (CRUD,
  condition transitions, friction-guarded hard-delete per ADR-22/23),
  `app/api/assets*`, and **compose** the Assets Register + Asset Drawer
  + Asset Delete Dialog from the kit at `app/admin/assets/*` (the
  skeletons are `admin-assets-register` `8DL-0`, `asset-drawer` `8JO-0`,
  `asset-delete-dialog` `8IV-0` — note the ADR-36c label props: "Keep
  Asset" / "Delete Asset Record", and `showArchiveLink={false}` for the
  asset dialog). Tests: the delete guard (blocked with linked history),
  condition transitions. Per-screen gate as this session.

---

## Per-screen gate

> **This is the required method, not a fallback — the owner picked it over
> Playwright in Session 11 and prefers it (faster, and the right fit:
> component behaviour, not pixel regression).** Do **not** stand up
> Playwright / `playwright.config.ts` / a DB-seeding global-setup for this
> gate. The visual half is `paper` MCP `get_screenshot` +
> `get_computed_styles` compared by eye against the composition's
> structure (the kit primitives are already Paper-verified — Session 10d
> parity audit). The interaction half is jsdom + React Testing Library
> specs in the existing `pnpm test` run. A *separate* Playwright e2e
> harness is still wanted for the `TEST_PLAN.md §2` cross-module flows —
> that is its own task (see "Also carried" below), never the screen gate.

For each composed screen, **all** of (identical to Session 11 — see
`export-workflow.md` C3):

1. **Visual-diff vs the Paper artboard** (rest state) — `get_screenshot`
   the mobile artboard node, compare; `get_computed_styles` for anything
   that looks off. If `paper` is unreachable, diff against the committed
   `/design-preview/<slug>` skeleton and note it.
2. **Interaction spec** — a `*.screen.test.tsx` under `tests/screens/`
   (jsdom + RTL, per-file `// @vitest-environment jsdom`, the hook /
   `stockApi` mocked, **no server / DB**). Assert: the flow submits →
   `<Toast>` fires + the screen resets; a pinned `<Banner>` Accept calls
   the accept endpoint and collapses to a timeline entry; Flag sends
   `{ flag: true, note }`; `<EmptyState>` on an empty list;
   `<ErrorState>` on a mocked fetch failure; `<QuantityStepper>` bounds
   (`atMin` / `atMax`). The RTL harness is already wired
   (`vitest.setup.ts`, `tests/screens/`).
3. **Responsive** — the screen is the 390px mobile layout; it matches its
   artboard. (No desktop swap for staff screens.)
4. **axe** — no serious/critical violations.

Global gates (unchanged): **`pnpm test` stays green** (add screen specs,
don't weaken the suite — 99 tests as of Session 11); `pnpm tsc --noEmit`
exit 0; `pnpm build` clean; the kit's `pnpm test:visual` +
`pnpm test:a11y` still pass (you should not be touching
`components/kit/*` — if you do, re-run them and re-baseline only the
affected story).

---

## Also carried into this session (or its own): the real Playwright e2e harness

Session 11 did the per-screen interaction gate as **jsdom + RTL specs in
`pnpm test`**, not Playwright, because there is no `playwright.config.ts`
/ e2e harness and the screens are auth-gated clients needing a running
Next server + seeded Postgres + login. That harness is still wanted for
the `TEST_PLAN.md §2` cross-module flows (order → stock deduction,
handover → variance, day-close → lock, 2-phase transfer end-to-end).
Standing it up = `playwright.config.ts` + a `global-setup` that seeds the
DB and logs in + specs under `tests/e2e/`. It is **not** a blocker for
this session's per-screen gate (the RTL specs cover that) — do it if
context allows, otherwise carry it to its own session and note it in
`PROGRESS.md`.

---

## Constraints

- **Composition, not transcription, not redesign.** No new visual design
  decisions. If a staff screen genuinely needs one, **STOP and flag it**
  in `PROGRESS.md` + raise it — it goes back to a Design Sprint.
- **Do NOT change data / logic.** Untouchable: everything under
  `lib/domain/**`, `lib/validation/**`, `lib/api/**`, `app/api/**`, and
  the Admin hooks/derives. If a kit component's prop shape doesn't fit a
  screen's data, write a **mapper in the screen**, never a change in the
  kit.
- **Do NOT touch `components/kit/*` or `components/shells/*`.** They are
  proven and gated. The one exception: a real kit **bug** (not a missing
  feature) surfaced by composing a screen — fix it in the kit, re-run
  `pnpm test:visual` + `pnpm test:a11y`, re-baseline only the affected
  story, and note it (same rule as Sessions 10d / 11).
- **Do NOT touch the Admin screens** (`app/admin/**`) — Session 11's
  work. **Do NOT touch F3 Assets** — Session 13.
- **`/design-preview/<slug>` routes and `docs/design/screens/<slug>/`
  dirs stay** as the frozen visual-regression reference (Session 3–4
  skeletons + `fixtures.ts`). Compose the **`app/**` copies**; leave the
  `/design-preview` copies.
- **pnpm only.** Read `node_modules/next/dist/docs/` before any config /
  route / middleware change. The local Postgres must be running for
  `pnpm test` (DB-backed domain tests).
- **Git:** you are on `session-10b-kit-proof-harness` (NOT `main`).
  Commit the composition + doc updates there, per screen cluster. If the
  owner wants M1 on `main`, that is a PR opened with `gh` — never push
  `main` directly.

---

## Suggested order (one context window)

1. **Read** — the required-reading list, then all 7 skeletons + their
   artboards, noting per file: (a) which kit component each markup block
   maps to, (b) which F2 endpoint the screen calls, (c) any block with
   no kit equivalent (flag candidate).
2. **`<ToastProvider placement="bottom-center">`** into
   `staff-shell-client.tsx` (one edit) + prove it with a throwaway toast
   on one save path, then remove the throwaway.
3. **`use-staff-stock.ts`** — the per-feature hook (mirror
   `app/admin/stock/use-stock.ts`): list, balances, the movement POSTs,
   the accept/flag call. `TODO(mock)` any Session-6 gap.
4. **Store Manager hub** (`8T3-0`) — `<ActionTileGrid>` + the pinned
   banner flow. Gate. Commit.
5. **Canteen hub** (`9BA-0`) — same shape. Gate. Commit.
6. **The Store Manager flows** (`8XH-0`, `92M-0`) — `<FlowHeader
   directionTone>` + entry list + `<CalculatedImpactBanner>` + submit.
   Gate. Commit.
7. **Canteen transfer dispatch** (`9FE-0`). Gate. Commit.
8. **Stock levels** (`986-0`, `9GW-0`) — `<DenseSummaryStrip>` +
   `<PillFilter>` + mobile card list + `<EmptyState>` / `<ErrorState>`,
   fed by `GET …/balances`. Gate. Commit.
9. **Docs (D)** + draft `session-13-handoff.md`.
10. **Full gate sweep** — `pnpm test`, `pnpm tsc --noEmit`,
    `pnpm build`, kit `test:visual` + `test:a11y`, every screen spec.
    Commit. Push.

---

## Wrap-up (definition of done)

- All 7 Store Manager + Canteen skeletons composed from the kit into
  `app/store-manager/*` + `app/canteen/*`; every `lib/domain` /
  `app/api` unchanged (`git diff --stat` confined to
  `app/store-manager/**` + `app/canteen/**` + `components/layout/
  staff-shell-client.tsx` + `docs/**` + `tests/screens/**`).
- `<ToastProvider placement="bottom-center">` on the staff tree;
  `<PageShell>` / `<FormField>` / `<Toast>` / `<EmptyState>` /
  `<ErrorState>` adopted across scope.
- The persistent transfer/delivery banner flow wired (pinned → accept
  (`POST …/accept`) / flag (`{ flag: true, note }`) → timeline).
- Every unfinished F2 endpoint is a `TODO(mock)` behind the real
  interface; grep is clean of anything else.
- Per-screen gate green for all 7; global gates green (99+ unit/screen,
  tsc, build, kit visual + a11y).
- `docs/PROGRESS.md` Session 12 entry; `milestone-1-plan.md §5` ticked;
  ADR-44 only if a real decision was forced.
- **`docs/sprints/session-13-handoff.md` drafted** — "M1-F3 Assets
  (backend + frontend, one session)", composed the new way.
- (Optional / carried) the real Playwright e2e harness for the
  `TEST_PLAN.md §2` flows.

Then Session 13 (F3 Assets) then the QA pass.
