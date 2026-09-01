# HANDOVER — Session FINAL · Tech Lead · land M2 Submission 1

**Paste this whole file as your first message in a fresh session.**
**ONE SESSION. You are the only active session. This is the last one.**

---

## 0. Context

Prosper is overdue. Submission 1 = Milestone 1 (shipped) + Milestone 2
("staff can sell every day"), **every screen matching Paper**. Every
build/kit/QA/design session is done. The orchestrator has already
**merged all 10 sessions onto `integration/m2-submission-1`** and gated
it green. Your job: land it on `main`, reconcile the docs, do the small
cleanups the sessions flagged, and confirm the owner walkthroughs. You
are the **Tech Lead** this session — no new features, no new design.

## 1. Starting point — verify first

```
git checkout integration/m2-submission-1
git log --oneline main..HEAD | wc -l      # ~32 commits
pnpm tsc --noEmit && pnpm test && pnpm build
```
Expected: **`tsc` 0 · `pnpm test` 556/556 (69 files) · `build` clean**
(41 routes; `/admin/sales` present, `/admin/orders` +
`/admin/canteen/derived-sales` gone → 308 redirects in `next.config.ts`;
5 `…/batch` stock-movement routes; `/api/canteen/stock-counts/preview`).

If any gate is red on the untouched integration branch — STOP and report;
do not paper over it.

## 2. What's on the integration branch (for your PROGRESS entries)

| Piece | Branch merged | Key facts |
|---|---|---|
| M2 S7 QA + fixes | `qa/m2-session-7` | 0 High. F7-1/3/5/6/10 + C4-banner fixed. **F7-2 preview built for real** (`lib/domain/sales/derive-stock-count.ts` — shared calc, `GET /api/canteen/stock-counts/preview`). Report: `docs/sprints/milestone-2-session-7-qa-report.md`. |
| Batch movements | `feat/m2-batch-movements` | 5 `POST …/batch` endpoints (receipts/issues/production/transfers/non-sale), one atomic txn, §3.8 BLOCK parity, 1 AuditLog/line + `batch_*` correlationId. `lastMovementAt` on the balances payload. `GET …/outstanding` widened to `store_manager` (location-scoped). `derivedRevenue` on `StockMovementView` (F7-7). Shared core `lib/domain/stock/movement-core.ts`. **Side effect:** the single-line movement fns now write 1 AuditLog row each (previously 0 — an ADR-25 gap; see §4 ADR notes). |
| `SelectableProductRow` kit | `feat/m2-3kit-selectable-row` | ADR-42-gated (9 stories/baselines). Embedded compact stepper authored inline (kit `<QuantityStepper>` `<FormField>` chrome doesn't fit the slot) — reuses the ADR-43/48 contract verbatim; C10 unchanged. **KIT GAP (deferred):** no additive/`neverBlocks` mode. |
| `FilterToolbar` kit | `feat/m2-3kit-filter-toolbar` | ADR-42-gated (8 stories/baselines). **Kit touch:** `Select` + `DatePicker` gained an additive a11y-only `aria-label` prop (see §4). Deviations from `L9O-0`: at-default select label stays `--text-primary`; date chip trailing glyph. |
| Admin merged Sales (3a) | `feat/m2-3a-sales` | `/admin/sales` = one nav item, tabs Restaurant Orders / Canteen Derived, `?tab=` deep-link, 308 redirects, nav collapsed both shells. **F7-4** full corrected-order form. **F7-8** Payment + Cashier pickers (cashier list derived from loaded orders). Mobile card layouts. **`correction-form.tsx` was lost in the concurrent-session incident and rebuilt.** |
| Admin mobile (3b) | `feat/m2-3b-admin-mobile` | Financials + Assets + Ledger `flex md:hidden` mobile branches. Assets "category" field **dropped** (owner ruling, ADR-44 stands). Drawer mobile-sheet variant **not built** (owner: accept near-fullscreen rail). |
| Opening Stock mobile | `feat/opening-stock-mobile` | `/admin/stock/opening` `< --bp-md` stacked-card branch (owner hit it with no mobile layout). `component-states.md` C26 note. |
| SM flows (3c) | `feat/m2-3c-sm-flows` | 5 SM movement screens rebuilt on the Option-A picker via one shared `MovementPickerFlow` + `FLOW_CONFIG`. **Fixed `FlowScaffold` scroll/sticky-footer.** KIT GAP interim: additive flows pass `max(onHand,lineQty,1)`. |
| Canteen (3d) | `feat/m2-3d-canteen` | Canteen Dispatch via a `dispatch` mode in the shared picker. Stock Levels pill-set-as-prop (Canteen `All·Beverages·Goods`). **F7-7** hub `+KES` revenue row (branch-guarded; SM hub byte-identical + guard test). |
| Filter retrofit (3e) | `feat/m2-3e-filter-retrofit-v2` | Sales / Customers / Ledger / Assets filter rows → `<FilterToolbar>` (kit unchanged). `app/admin/sales/filter-toolbar.tsx` deleted. **Deferred:** 3a's date quick-rows didn't survive (kit `kind:"date"` is a plain `DatePicker`) → Kit follow-up; "Corrected only" renders as a toggle not a checkbox. |

Stash stack is **empty** — all parked work committed (the 3-DESIGN
flow-doc edits landed at `76c4d8f`).

## 3. Tasks

### 3.1 Land on `main`

`integration/m2-submission-1` is already a clean, gated superset of
`main`. **Fast-forward or a single merge commit — do NOT re-merge the 10
feature branches.**

```
git checkout main
git merge --no-ff integration/m2-submission-1 -m "M2 Submission 1 — staff can sell every day"
```
(Mirror how M1 landed: one PR / one merge. If the team wants a PR, push
`integration/m2-submission-1` and open it against `main`.)

Then re-run `pnpm tsc --noEmit && pnpm test && pnpm build` **on `main`**
— must be identical to §1.

### 3.2 Remove the dead staff hamburger (owner-approved 2026-09-01)

`components/shells/staff-shell.tsx` renders a hamburger button but
`staff-shell-client.tsx` never wires `onMenuClick` / a drawer — tapping
it does nothing. The staff bottom nav (Hub/Today · Stock/New-Order ·
History/Customers) is the design's primary nav; a sidebar is Admin-only.
**Remove the hamburger** from `staff-shell.tsx` — header becomes
location/role label + avatar. Sign-out stays on the avatar tap. Update
the shell's story + any screen spec that queried the menu button.
Gate green.

### 3.3 Seed fixes

`prisma/seed.ts`:
- **Relative-dated orders.** Seed orders are dated Aug 27–30 fixed → the
  Admin Sales default "Today" filter shows empty on any later day. Date a
  handful of orders **relative to `now`** (today / yesterday, Africa/
  Nairobi) so the screen isn't empty on a fresh `pnpm dev`.
- **`Location.name` holding an ID.** `/admin/stock` renders
  `seed-location-restaurant` (a raw id) as the location name — the seed
  is putting an id string in `Location.name`. Give each seeded Location a
  real display name.
- Re-run `pnpm db:reset` / the seed and eyeball `/admin/stock` +
  `/admin/sales`.

### 3.4 ADR / decision notes → `docs/DECISIONS.md`

Add short entries (ADR-style, next number):
1. **ADR-44 reversal (partial).** The one-line-form *body* of the 6
   SM/Canteen movement flows is superseded — the multi-row
   `SelectableProductRow` picker is restored (owner, Option A,
   2026-08-31). ADR-44's `FlowScaffold` chrome (FlowHeader + scroll body
   + sticky submit) stays.
2. **`editOwnOrder` audit prune (F7-10).** A same-day order edit deletes
   the `AuditLog` rows for the `MoneyMovement`s it replaces — the one
   place M2 deletes rather than appends an audit row. Acceptable: the
   movements no longer exist and the edit itself is audited by a fresh
   `action:"correct"` row. Also note the inverse: the single-line stock
   movement fns *gained* a per-call `AuditLog` row in `feat/m2-batch-movements`
   (they wrote none before — a latent ADR-25 gap, now closed).
3. **`Select` / `DatePicker` `aria-label` prop.** Additive, a11y-only,
   ignored when `label` is set. Added by 3-KIT-FILTER so `FilterToolbar`
   can name its label-less triggers. No behaviour change to existing
   call sites.

### 3.5 Reconcile the milestone docs

- **`docs/sprints/milestone-2-plan.md` §7** — rewrite the session table
  to reality: 1a/1b/2/3/4/5/6a–6e done (already), **plus** S7 (QA) done,
  **plus** the Submission-1 fidelity pass: 3-DOMAIN, 3-KIT,
  3-KIT-FILTER, 3-DESIGN, 3-DESIGN-FILTERS, 3a, 3b, 3c, 3d, 3e,
  opening-stock-mobile. Add one line to §10 (changelog): "2026-09-01 —
  Submission-1 fidelity pass + M2 S7 QA landed as one integration merge."
  Do **not** stack `> UPDATED` blocks.
- **`docs/PROGRESS.md`** — add the M2 Session 7 entry (paste from the QA
  report §7) + a single "Submission-1 fidelity pass" entry summarising
  §2's table (what shipped per session, gate state 556/0/clean, the
  deferred items). Then, since M2 is closing, you MAY compress the M2
  per-session detail per the log's own rules — or leave it and let a
  later session compress; your call, but the S7 + fidelity entries must
  exist.
- **`docs/ROADMAP.md`** — flip Milestone 2 from "planned … not started"
  to **DONE (2026-09-01)** with the pointer to `PROGRESS.md` + the plan.
  Update the M2 feature table's Status column.
- **`docs/API.md`** — one stale line to fix: the §"Stock Movements"
  header still says `recordPurchasePayment` writes no `MoneyMovement`
  (stale since M2 S4 — it writes a `−cost` row). Correct it. Confirm the
  5 batch endpoints + `preview` + widened `outstanding` are all
  documented (3-DOMAIN + QA updated API.md on their branches — just
  verify it merged coherently).

### 3.6 Known deferrals — record, don't fix (a "Submission-1 follow-ups" list)

Put these in `docs/PROGRESS.md` (or a `docs/sprints/m2-followups.md`):
- **KIT:** `SelectableProductRow` `neverBlocks`/additive mode → removes
  the 3c/3d `max(onHand,lineQty,1)` interim (residual: a 0-stock dish
  reads `In Rest.: 1`).
- **KIT:** fold `DatePicker` quick-rows (Today/Yesterday/All-dates) into
  the kit control → `FilterToolbar` `kind:"date"` picks them up; restores
  what 3a had before the 3e retrofit.
- **KIT:** `Drawer variant="sheet"` (grabber + slide-up) for the mobile
  Payment/Asset drawers → 1-line swap after.
- **DESIGN:** correct the A2 Assets mobile artboards (`J6D-0…`, `JDV-0`)
  to drop the phantom `CATEGORY *` field/strip (ADR-44 stands; the built
  screen already omits it).
- **DOMAIN:** `/api/canteen/products` route-purity (F7-9 — query logic in
  the handler; fold into a `lib/domain` read).
- **DATA/UX:** F7-7 hub subtitle can't show `since {date} · closing {rem}`
  — those fields are on `DerivedSaleView`, not the hub feed row.
- **QA deltas from 3c/3d** (logged in their summaries): Production readout
  `In Rest.: N` prefix not suffix; MatchCard "Flag variance" not wired
  (no staff domain path); additive "blocked-at-0" artboards not
  reproducible (covered by disabled-submit); Canteen Stock Levels has no
  search input though `9GW-0` draws one; `lastMovementAt` meta line not
  surfaced on Stock Levels yet.

### 3.7 Owner walkthroughs — confirm before declaring done

Per plan guardrail 3, each feature is walked by the owner on `pnpm dev`
as every role that touches it. Owed walkthroughs: 3a (Admin Sales), 3b
(Admin mobile), 3c (SM flows), 3d (Canteen), plus the earlier
6b/6c/6d/Customers/Cashier ones. **Ask the human to confirm which are
signed off.** If any fail, log a finding — small fixes can land this
session with a regression test; anything larger is a follow-up. Also do
the eyeball screenshot pass 3e couldn't: the 4 filter rows vs
`IEA-0`/`LDZ-0`/`LGF-0`/`DU2-0` on `pnpm dev`.

### 3.8 Branch cleanup

After `main` has the merge and gates pass:
- Delete the merged feature branches (`feat/m2-3a-sales`,
  `feat/m2-3b-admin-mobile`, `feat/m2-3c-sm-flows`, `feat/m2-3d-canteen`,
  `feat/m2-3e-filter-retrofit`, `feat/m2-3e-filter-retrofit-v2`,
  `feat/m2-3kit-*`, `feat/m2-batch-movements`, `feat/opening-stock-mobile`,
  `feat/m2-session-4-orders`, `feat/m2-session-6-screens`,
  `qa/m2-session-7`, `integration/m2-submission-1`) — local and, if
  pushed, `origin`. Keep only `main` (+ any the team wants for history).

## 4. Definition of done (plan §9 + this push)

- `main`: `pnpm test` + `pnpm tsc --noEmit` + `pnpm build` green; kit
  `test:visual` + `test:a11y` green.
- Dead staff hamburger removed. Seed shows non-empty Sales + real
  location names.
- `DECISIONS.md` has the 3 ADR notes; `milestone-2-plan.md` §7 +
  `PROGRESS.md` + `ROADMAP.md` + `API.md` reconciled.
- Follow-ups list written.
- Owner walkthroughs confirmed (or failures logged + triaged).
- Merged branches deleted.
- **Then M2 Submission 1 is done.** M3 is a fresh milestone-plan doc, not
  this session.

## 5. Do NOT

- Re-merge the 10 feature branches — the integration branch already is
  them.
- Build new features, kit components, or M3 anything.
- Fix the §3.6 follow-ups (record them).
- Force-push or rewrite `main` history.
