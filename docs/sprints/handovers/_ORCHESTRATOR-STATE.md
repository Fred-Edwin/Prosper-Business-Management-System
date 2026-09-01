# Orchestrator State — Submission 1 push

**Owner-facing goal:** ship Milestone 1 + Milestone 2 ("staff can sell
every day"), **every screen matching its Paper design**, as Submission 1.
Milestone 3 is a separate later submission, designed properly. Nothing in
this push touches M3.

**Working model:** orchestrator session (this one) holds the plan and
drafts handover prompts → owner runs each in a fresh session → owner
reports a summary → orchestrator updates state + drafts the next. One role
per session.

---

## Session ledger

| Session | Role | File | Status |
|---|---|---|---|
| A | Product Designer | `SESSION-A-design-sprint.md` | **DONE** — split into A + A2. Merged Sales artboards + new filter-toolbar pattern. |
| A2 | Product Designer | `SESSION-A2-design-sprint.md` | **DONE** — filter-toolbar rollout, Financials mobile (5 artboards), Assets mobile (6 artboards), `fidelity-audit-m1.md`, ADR-44 reversal (Option A). |
| B | QA Engineer (M2 S7) | `SESSION-B-qa-logic.md` | **DONE** — 0 High, 10 findings. Branch `qa/m2-session-7` @ `76c14cb`. |
| B2 | QA Engineer (fixes) | `SESSION-B2-qa-fixes.md` | **DONE** — 7 fixes + F7-2 preview built for real. Branch `qa/m2-session-7` @ `0ef0403`. `pnpm test` 450/450. Not merged. |
| 3-DESIGN | Product Designer | `SESSION-3DESIGN.md` | **DONE** — 33 `[M2-3D]` artboards: `SelectableProductRow` component (`JL7-0`), 6 flows × 5 states, 2 canteen stock-level state gaps. `staff-stock-movements-flow.md` written. Escalations answered below. |
| 3-DOMAIN | Developer | `SESSION-3DOMAIN.md` | **DONE** — branch `feat/m2-batch-movements` @ `bdea9bd`, not merged. 5 batch endpoints, `lastMovementAt`, SM-scoped outstanding read, F7-7 `derivedRevenue` on `StockMovementView`. `pnpm test` 455/455, tsc 0, build clean. Shared core in `lib/domain/stock/movement-core.ts`. See "3-DOMAIN outcome" below for the API shapes 3c/3d consume + 2 FINAL follow-ups. |
| 3-KIT | Developer (kit) | `SESSION-3KIT.md` | **DONE** — `feat/m2-3kit-selectable-row` @ `aef9fb3`. `SelectableProductRow` built + ADR-42-gated (9 stories, 9 baselines). Embedded stepper authored inline (kit `<QuantityStepper>` `<FormField>` chrome doesn't fit the 108px slot) — reuses the ADR-43/48 contract verbatim; C10 unchanged. **KIT GAP (deferred):** no additive/`neverBlocks` mode — 3c interim = pass `max(onHand,lineQty,1)`; residual = 0-stock dish reads `In Rest.: 1`. Post-submission Kit Sprint. |
| 3-DESIGN-FILTERS | Product Designer | `SESSION-3DESIGN-FILTERS.md` | **DONE** — `FilterToolbar` component artboard `L9O-0` + contract in `docs/design/filter-toolbar.md`. Per-screen artboards `LDZ-0` (Ledger), `LGF-0` (Assets). `GQQ-0` + `DIN-0` chip bar superseded. **Key finding:** no live screen still renders the dismissible-pill pattern — real 3e work is Ledger + Assets (fold labelled-dropdown rows onto the component + replace built-code `PillFilter`/bespoke pills) + retrofit Sales/Customers inline toolbars. No new data source needed. |
| 3-KIT-FILTER | Developer (kit) | `SESSION-3KIT-FILTER.md` | **READY TO DISPATCH** — build + ADR-42-gate `FilterToolbar` from `L9O-0` + `docs/design/filter-toolbar.md`. Concurrent with 3c/3d/3a/3b. Blocks 3e. |
| 3e | Developer | _drafted after 3-KIT-FILTER + 3a + 3b_ | Convert Ledger + Assets to `<FilterToolbar>` (replace `PillFilter`/bespoke pills; keep Assets Category tab-strip + the "Columns" control as non-filter); retrofit 3a's Sales + Customers (A2) inline toolbars onto the shared component. One uniform pass. Per `LDZ-0` / `LGF-0` / `filter-toolbar.md` §7. |
| 3a | Developer | `SESSION-3A.md` | **DONE** — `feat/m2-3a-sales` @ `61e3f06`. Merged `/admin/sales` (tabs + `?tab=` deep-link + 308 redirects), F7-4 full corrected-order form, F7-8 pickers (cashier list derived from loaded orders), mobile card layouts, date filter = quick rows + kit `DatePicker`. 461 tests. **`correction-form.tsx` was lost in the shared-tree incident and rebuilt this session.** Owner walkthrough owed. |
| 3b | Developer | `SESSION-3B.md` | **DONE** — `feat/m2-3b-admin-mobile` @ `5a9e81c`. Financials + Assets + Ledger mobile branches (`flex md:hidden`). 468 tests. §3.4 (A1 Customers filter) **removed by amendment** → 3e. Flags: Assets "category" field (A2 artboards vs ADR-44) → **owner ruled DROP**; Drawer mobile-sheet variant → **owner ruled accept near-fullscreen rail**. Owner walkthrough owed. |
| opening-stock-mobile | Developer | (unplanned) | **DONE** — `feat/opening-stock-mobile` @ `8a9dc03`. Owner hit `/admin/stock/opening` with no mobile layout during a walkthrough; a session built the `< --bp-md` stacked-card branch + `component-states.md` C26 note. 422 tests. Folds into the FINAL merge chain. |
| 3c | Developer | `SESSION-3C.md` | **DONE** — `feat/m2-3c-sm-flows` @ `50316f7` (off `feat/m2-batch-movements` + cherry-pick `aef9fb3`). 5 SM movement screens rebuilt on the Option-A picker via one shared `MovementPickerFlow` + `FLOW_CONFIG`. 472 tests. Also **fixed `FlowScaffold` scroll/sticky-footer** (`50316f7`) — 3d inherits it. KIT GAP interim accepted (see 3-KIT row). QA deltas: additive "blocked-at-0" artboards not reproducible (covered by disabled-submit); Production readout `In Rest.: N` prefix not suffix; MatchCard "Flag variance" not wired. Owner walkthrough owed. |
| 3d | Developer | `SESSION-3D.md` | **READY TO DISPATCH** — branch off `feat/m2-3c-sm-flows`. Canteen Dispatch (reuse 3c's `MovementPickerFlow` via a new `FLOW_CONFIG` mode), Canteen Stock Levels (pill-set-as-prop, 2 state artboards), F7-7 hub `+KES` row. |
| 3e | Developer | `SESSION-3E.md` _(to draft)_ | **READY after 3d** — FilterToolbar retrofit: Ledger + Assets + Sales + Customers onto `<FilterToolbar>`; ratify 3a's date-filter (quick rows + kit DatePicker) into the component; drop the phantom Assets "category" strip per owner ruling. Deps 3-KIT-FILTER ✅ + 3a ✅ + 3b ✅ all met. |
| FINAL | Tech Lead | `SESSION-FINAL.md` _(to draft)_ | **After 3d + 3e + walkthroughs.** Merge chain; resolve `stash@{0}` (3-DESIGN docs); **remove dead hamburger from `staff-shell.tsx`** (owner-approved); relocate/keep handovers (now on `main` @ `e28bdce`); correct A2 Assets artboards (drop category); seed fixes (relative-dated orders; `Location.name` holding an ID); ADR notes (ADR-44 reversal, F7-10 audit-prune, `Select`/`DatePicker` aria-label); reconcile `milestone-2-plan.md` §7 + `PROGRESS.md` + `ROADMAP.md`; full gate sweep. |
| Owner walkthroughs | Owner, on `pnpm dev` | — | Ongoing in parallel |

---

## Branch state

- `main` — M1 done; M2 6a–6e merged (`47886b5`).
- `qa/m2-session-7` — off `main` @ `76c14cb`. Holds the QA report + 10
  new adversarial tests. Session B2 adds the fix commits here. **Not
  merged** — orchestrator sequences the final PR.
- `feat/m2-session-4-orders`, `feat/m2-session-6-screens` — fully merged
  to `main`, can be deleted (defer).

---

## QA Session 7 — outcome + dispositions (2026-08-31)

**0 High. Ledgers provably correct** — all plan §7 attack targets pass
with 10 new tests. All 10 findings are screen-layer.

| Finding | Sev | Disposition (orchestrator decision) |
|---|---|---|
| F7-1 C4 credit-order edit blocked | M | **FIX in B2** |
| F7-2 K1 no sold/revenue preview | M | **FIX in B2** (owner overrode the cut, 2026-08-31). B2 adds a dry-run preview fn in `lib/domain/sales` (shared calc with `recordStockCount`) + `GET /api/canteen/stock-counts/preview` + wires the K1 banner to real figures. Full K1 visual polish still 3d. |
| F7-3 canteen count undo unreachable | M | **FIX in B2** — wire "Delete today's count" on hub → existing `voidStockCount`; + K1 blocked-state inline error. Design (A) verifies artboards `9BA-0` / `HBN-0`. |
| F7-4 A3 correction drawer quantity-only | M | **FIX in build 3a** (needs artboard first — added to Session A brief §4.3b). Domain path already built/tested. |
| F7-5 A3 impact banner mis-labels credit | L | **FIX in B2** |
| F7-6 A3 cashier UUID not name | L | **FIX in B2** |
| F7-7 K2 hub row shows stock not revenue | L | **FIX in build 3d** (needs revenue in hub feed) |
| F7-8 A3 filter chips inert | L | **FIX in build 3a** (needs staff list source — A flags if blocking; added to Session A brief §4.3c) |
| F7-9 `/api/canteen/products` route purity | L | **Tech-debt backlog**, post-submission |
| F7-10 `editOwnOrder` deletes stale audit rows | L | **ADR note in B2**, no code change |
| C4 corrected-banner: no Admin name/timestamp | (from §3) | **FIX in B2** — add `correctedAt` + `correctedByName` to `OrderView`, source from `AuditLog`. |

---

## Build batch plan — REVISED after Design A2 (2026-08-31)

### Orchestrator decisions on A2's escalations (2026-08-31)

1. **Filter-toolbar rollout** — folded into 3a (Sales, already uses it)
   + 3b (A1 Customers conversion — needs its own screen-test update since
   Customers is the reference standard). Standalone A3/A4 artboards are
   superseded by the merge, no separate work.
2. **Selectable product row → SMALL KIT COMPONENT** (`SelectableProductRow`
   or similar). 6 call sites + a shared interaction contract
   (select/deselect · inline stepper · `Avail: N` readout · over-stock
   blocked state) is past the extract threshold. → 3-DESIGN draws the
   component artboard; **3-KIT proves it (ADR-42 gate)** before 3c/3d.
3. **qty > on-hand on SM/Canteen movements → BLOCK** (same as orders
   §3.8 — ledger must not go negative). 3-DESIGN draws the blocked row
   state (§9.8 pattern).
4. **Multi-line submit → BATCH ENDPOINT per movement type** (atomic txn,
   clean audit, no client-side partial-failure handling ×6). → 3-DOMAIN
   builds them.
5. **"Receiving chef" / "Production time & shift" fields → DROPPED** for
   Submission 1 (staff module is M3). 3-DESIGN omits from the re-spin.
6. **ADR-44 reversal note** → FINAL session (Tech-Lead doc reconciliation).

### Sessions — dependency order

```
B2 (done) ─────────────────────────────────────┐
                                               │
3a (Sales) ────────────┐  (concurrent)         │
3b (Admin mobile) ─────┤                        ├──► FINAL (merge + docs + gates)
                       │                        │
3-DESIGN ──► 3-KIT ──► 3c (SM flows) ───────────┤
       └──► (also feeds) 3d (Canteen) ──────────┤
3-DOMAIN ──────────────► 3c, 3d ────────────────┘
```

- **3a — Admin merged Sales screen** (`SESSION-3A.md`). One "Sales" nav
  item → tabs Restaurant Orders / Canteen Derived; drop "Derived sales"
  link. Desktop + mobile, new filter-toolbar. **+ F7-4** full
  corrected-order drawer. **+ F7-8** working filter pickers (flag if the
  Cashier picker's missing staff-list source blocks — degrade to "all"
  if so). Files: `app/admin/orders/*`,
  `app/admin/canteen/derived-sales/*` (merge → one route),
  admin shell nav, `mobile-nav-drawer.tsx`. Artboards: `[M2-SA]` set.
  Concurrent with 3-DESIGN/3-DOMAIN/3b. Needs B2 merged first (or rebased
  onto it).
- **3b — Admin mobile views** (`SESSION-3B.md`). Ledger mobile (`8Q4-0`,
  deltas in `fidelity-audit-m1.md` §"Admin Stock — Ledger mobile"),
  Financials mobile (5 `[M2-A2]` artboards + the 10-point delta list),
  Assets mobile (6 `[M2-A2]` artboards). **+ A1 Customers filter-toolbar
  conversion** (7 artboards re-skinned by A2; "Has balance" pill → toggle
  in toolbar; update `admin-customers.screen.test.tsx`). Concurrent with
  3a.
- **3-DESIGN — SM/Canteen movement-flow re-spin** (`SESSION-3DESIGN.md`).
  docs/Paper only. Re-spin `8XH-0` / `92M-0` / `9FE-0` to current
  kit+tokens with structural states incl. the **BLOCKED** over-stock row;
  draw the `SelectableProductRow` **component artboard** (states: not-
  selected `+ Select` / selected w/ stepper / at-avail / over-avail
  blocked / zero-avail disabled); write
  `docs/design/flows/staff-stock-movements-flow.md`; omit the dropped
  staff fields. Concurrent with 3a/3b/3-DOMAIN. **Blocks 3-KIT, 3c, 3d.**
- **3-DOMAIN — batch movement endpoints** (`SESSION-3DOMAIN.md`).
  A batch endpoint per movement type (receive / issue / production /
  transfer / non-sale) taking `{ lines: [{productId, quantity, …}] }`,
  one atomic transaction, one `AuditLog` per line wrapped in one logical
  action; BLOCK the whole batch if any line exceeds on-hand (§3.8 parity)
  — nothing written. Tests. Confirm `use-staff-stock` `useStockLevels`
  gives per-row availability the picker needs. Concurrent with
  3-DESIGN/3a/3b. **Blocks 3c, 3d.**
- **3-KIT — prove `SelectableProductRow`** (drafted after 3-DESIGN).
  Storybook story per state, visual-regression baseline, axe, §9
  `postVisit`. ADR-42 gate green before any screen uses it. **Blocked on
  3-DESIGN.**
- **3c — Store Manager flow screens** (drafted after 3-DESIGN + 3-DOMAIN
  + 3-KIT). Rebuild Receive / Issue / Production / Transfer / Non-sale
  from the re-spun artboards using the proven `SelectableProductRow` +
  the batch endpoints. + Stock Levels restaurant-scoped (`986-0`). Verify
  SM sees restaurant/store items only. **Blocked on 3-DESIGN, 3-DOMAIN,
  3-KIT.**
- **3d — Canteen screens** (drafted with 3c). Stock Levels canteen-scoped
  (`9GW-0` — pass the pill-set in as a prop, no dead "Dishes" filter),
  Transfer Dispatch (re-spun `9FE-0`) using `SelectableProductRow` + its
  batch endpoint. **+ F7-7** (K2 hub row revenue styling — consume the
  `derivedRevenue` field 3-DOMAIN adds to the hub feed; frontend-only).
  Verify canteen stock-count uses `/api/canteen/products`. **Blocked on
  3-DESIGN, 3-DOMAIN, 3-KIT.**

Each build session: screenshot artboard → recompose from proven kit →
screenshot-diff → `*.screen.test.tsx` → gates. No kit changes except
3-KIT's sanctioned one. No new design decisions (flag → back to Design).

---

## FINAL session (draft after ALL build sessions + B2 report green)

- Merge order to `main`, one PR (mirror how M1 landed):
  `qa/m2-session-7` (B2 fixes) → 3-DOMAIN → 3-KIT → 3a → 3b → 3-DESIGN
  (docs/Paper only, merges anywhere) → 3c → 3d, rebasing each.
- **ADR-44 reversal note** → add to `docs/DECISIONS.md`: ADR-44's
  one-line-flow body shape is superseded for the SM/Canteen movement
  picker (owner, 2026-08-31, Option A). The `FlowScaffold` chrome
  (FlowHeader + scroll body + sticky submit) stays; only the form body
  reverts to the multi-row picker.
- Reconcile `docs/sprints/milestone-2-plan.md` §7 (currently stale —
  6d/6e are done; re-baseline the table, one line to §10 changelog).
- `docs/PROGRESS.md`: paste the Session 7 entry (report §7) + build-session
  entries + this fidelity pass.
- `docs/ROADMAP.md`: mark M2 table done once §9 Definition of Done met.
- Full gate sweep: `pnpm test`, `tsc`, `build`, kit `test:visual` +
  `test:a11y`.
- Confirm owner walkthroughs (Cashier / Customers / Canteen) signed off.
- Then M2 is submittable. M3 planning is a fresh milestone-plan doc.

---

## Open items to resolve as sessions report

- [x] Session A: new component? → **yes, `SelectableProductRow`** (6 call
      sites). 3-DESIGN draws it, 3-KIT proves it.
- [x] Cashier-filter staff-list source (F7-8) → 3a derives the list from
      loaded orders (distinct cashierId+name); disabled-with-caption
      fallback if that's bad UX.
- [x] 3-DESIGN: Receive "match delivery" staff-scoped read → **BUILD in
      3-DOMAIN** (SM hub already advertises it). Brief §3.4 firmed.
- [x] 3-DESIGN: `986-0` `lastMovementAt` → **ADD to balances payload**
      (3-DOMAIN §3.4).
- [x] 3-DESIGN: Receive/Production have no over-stock block (additive) —
      their "blocked" artboard is the blank/zero-qty validation state.
      3c + QA: don't expect an over-stock path there.
- [x] 3-DESIGN: `SelectableProductRow` stepper shows magnitude only
      (unit in the `Avail:` readout + submit label); long names ellipsis.
      Baked into the 3-KIT contract.
- [ ] 3-DOMAIN: confirm `balances?locationId=` is scoped server-side (SM
      vs Canteen stock-levels isolation) — fix + test if not (§3.3).
- [ ] 3a vs 3b: the new filter-toolbar must end up identical on Sales and
      Customers — reconcile in FINAL if they diverge.
- [ ] Owner: functional bugs from `pnpm dev` walkthroughs → route to the
      relevant build batch.
- [ ] Delete merged `feat/*` branches (cosmetic, defer to FINAL).

## Dispatch order for the human (current)

**DONE:** B, B2, 3-DESIGN, **3-DOMAIN**.
**DISPATCHED / in flight:** 3-KIT, 3a, 3b.

**Dispatch now (concurrent, docs/Paper only):**
- `SESSION-3DESIGN-FILTERS.md` — Product Designer (filter-toolbar rollout
  audit + `FilterToolbar` component artboard)

Owner walkthroughs on `pnpm dev` continue alongside.

**Filter-rollout decisions (2026-08-31):** `FilterToolbar` becomes a
proven **kit component** (like `SelectableProductRow`); **full rollout in
Submission 1** — every dismissible-pill filter (`GQQ-0` type) replaced by
the persistent labelled-dropdown toolbar (`IEA-0` type); Stock Levels
category tab-strips stay as pills (out of scope). 3a/3b build their
toolbars inline as planned; **session 3e retrofits all screens** (Sales +
Customers included) onto the shared component in one pass.

**Sequencing gates:**
- After **3-KIT** green → draft `SESSION-3C.md` + `SESSION-3D.md`.
- ~~After 3-DESIGN-FILTERS → draft 3-KIT-FILTER~~ **DONE** —
  `SESSION-3KIT-FILTER.md` ready to dispatch now.
- After **3-KIT-FILTER** green **AND 3a + 3b done** → draft `SESSION-3E.md`
  (3e retrofits Sales/Customers which 3a/3b must have landed first).
- After **everything** green + walkthroughs signed off → draft
  `SESSION-FINAL.md`.

**3A branch answer (2026-08-31):** the running 3A session asked — branch
**off `qa/m2-session-7`** (option 1). It's unmerged on purpose; the
orchestrator sequences all merges in FINAL. Not off `main`, not
"merge first".

## 3-DOMAIN outcome (2026-08-31) — what 3c/3d consume

Branch `feat/m2-batch-movements` @ `bdea9bd`. All endpoints `201 →
{ data: StockMovementView[] }`, one entry per line.

| Endpoint | Body | Rule |
|---|---|---|
| `POST /api/stock-movements/receipts/batch` | `{ locationId, lines:[{productId, quantity, purchasePaymentId?}] }` | additive, no MoneyMovement |
| `POST /api/stock-movements/issues/batch` | `{ locationId, lines }` | §3.8 BLOCK on location |
| `POST /api/stock-movements/production/batch` | `{ locationId, lines }` | Restaurant + dish guard, additive |
| `POST /api/stock-movements/transfers/batch` | `{ fromLocationId, toLocationId, lines }` | dispatch side only; §3.8 BLOCK on `from`; accept/flag untouched |
| `POST /api/stock-movements/non-sale/batch` | `{ locationId, reason, note?, lines }` | one reason all lines; §3.8 BLOCK |

Common failures → `400 VALIDATION_ERROR` field `"lines"`, nothing
written: empty `lines`, duplicate `productId`, any over-stock line
(message names each short line + available qty).

- **`GET /api/stock-movements/balances`** now returns
  `lastMovementAt: string | null` per row (only the batched
  `getDerivedStockBalances`; single `getDerivedStockBalance` leaves it
  undefined). Location-scoping confirmed correct server-side.
- **`GET /api/stock-movements/outstanding`** widened to `store_manager`,
  hard-scoped to their `Staff.locationId`
  (`listOutstandingPurchasesForLocation`). Admin unchanged. SM with no
  location → 403. `canteen_attendant` → still 403.
- **`StockMovementView.derivedRevenue: string | null`** — populated only
  by `listMovements`, for a `sale` row with a `stockCountId`, joined from
  the `canteen_sale` MoneyMovement on `sourceType` + `sourceId =
  stockCountId` (NB: money row's `sourceId` is the **count id**, not the
  movement id). `null` everywhere else incl. zero-sold counts. 3d's F7-7
  screen fix reads this field.
- Shared per-line core: `lib/domain/stock/movement-core.ts`
  (`writeMovementLine`, `assertRemovalWouldNotGoNegative`,
  `parseBatchLines`). Single + batch fns both call it — cannot diverge.
- Audit correlation: no schema change; a `batch_<uuid>` `correlationId`
  is stamped into each line's `AuditLog.newValue` JSON.

### FINAL-session follow-ups from 3-DOMAIN

1. **Side effect (benign):** the single-line movement fns
   (`recordKitchenIssue` etc.) now write **one `AuditLog` row per call** —
   they wrote **none** before (an ADR-25 gap). Nothing asserted zero, so
   nothing broke. FINAL: add an ADR note that this closed an audit gap.
2. **Stale doc:** `docs/API.md` §"Stock Movements" still says
   `recordPurchasePayment` writes no `MoneyMovement` — stale since M2 S4.
   FINAL: correct it in the doc reconciliation.

---

## Artboard reference (post-3-DESIGN)

- `JL7-0` — SelectableProductRow component (3-KIT target)
- SM Receive: `JXC-0`/`JZ0-0`/`K0W-0`/`K1X-0`/`K3U-0` (pop/empty/load/err/blocked)
- SM Issue: `JNK-0`/`JPL-0`/`JR9-0`/`JSX-0`/`JUL-0`
- SM Production: `K5X-0`/`K7L-0`/`K9H-0`/`KAI-0`/`KCF-0`
- SM Transfer: `KE5-0`/`KFT-0`/`KHP-0`/`KIQ-0`/`KKN-0`
- SM Non-sale: `KN6-0`/`KOU-0`/`KQQ-0`/`KRR-0`/`KTO-0`
- Canteen Dispatch: `KW0-0`/`KY1-0`/`KZX-0`/`L0Y-0`/`L2V-0`
- Canteen Stock Levels states: `L4Y-0` (empty), `L72-0` (error)
- Flow doc: `docs/design/flows/staff-stock-movements-flow.md`
