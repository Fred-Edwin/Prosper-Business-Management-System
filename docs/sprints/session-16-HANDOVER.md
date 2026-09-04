# Session 16 — QA Walkthrough — FULL HANDOVER (supersedes the earlier RESUME)

**For:** a fresh agent taking over the whole of Session 16.

**The owner drives `pnpm dev` in their own browser. You have no browser
access. Do NOT drive the app, do NOT simulate the owner's actions.** You
are their reconciliation partner: do arithmetic, investigate code, fix
bugs live, run gates. Wait for the owner to paste what they see.

---

## 0. READ FIRST (binding — `CLAUDE.md` rules apply)

1. `CLAUDE.md` — whole file. **pnpm only.** The visible-progress
   checklist requirement is real: post a markdown checklist before
   multi-step work and update it as you go. Non-negotiable rules
   (ledgers not totals, corrections are new rows, `Africa/Nairobi` day
   boundary, money is Decimal, no business logic in route handlers).
2. `docs/CONVENTIONS.md` §4 (correction pattern), §5 (money/dates),
   **§6 (working practices — "compose from the frozen kit; don't extend
   it per feature", "stop and ask the owner")**.
3. `docs/DECISIONS.md` — ADR-39 (two-phase transfer), ADR-53/54
   (handover writes NO money row), ADR-55 (COGS all-stock sweep, dishes
   valued 0, purchase-receipts only), ADR-57 (FLOWS over range /
   BALANCES as-of range end), ADR-64 (dashboard net series),
   **ADR-67** (location↔kind model), **ADR-68** (cashier is a
   location-scoped stock reader), **ADR-69** (receiving by destination).
   ADR-67/68/69 are the spine of this session.
4. `docs/PRD.md` §3 (movement table), §4.5 (handover), §4.7 (financials).
5. `docs/sprints/session-16-qa-walkthrough-RESUME.md` — **the baseline,
   the 20-step script and the SEALED PREDICTIONS. Those predictions are
   FROZEN. Do not recompute them to match the app. If the app disagrees,
   investigate the code.**
6. This file, in full.

`docs/sprints/session-16-adr69-delivery-receiving-HANDOFF.md` is the
brief for work already COMPLETED (ADR-69). Read only for context.

---

## 1. WHERE THE WALKTHROUGH ACTUALLY IS

The owner is scripting one deliberately awkward business day (20 steps,
RESUME §3) against hand-computed sealed predictions (RESUME §4), to get
eyes-on confidence that a full day reconciles.

**Steps completed: 0a, 0b, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14.**

**Step 3 (Receive Goods batch) is PARTIALLY done and is the live blocker:**
- Rice 20 kg → Store: **received** (`/admin/financials` shows "Delivered")
- Soda 300ml ×12 → Restaurant: **NOT received** ("Awaiting delivery").
  This was blocked by bugs #11 and #14 (§2). Both are now fixed, and the
  owner has the Receive screen open with the delivery matched and
  "Confirm Receipt (+12 pcs)" ready — but **bug #15 (§3) is showing wrong
  on-hand numbers on that very screen**, which is why they stopped.

**Steps 15–20 remain:** canteen count → derives sale (15), two handovers
+ two receipts (16–19), day close (20). Then the §4 reconciliation.

### Ledger state as at the owner's `/admin/stock` screenshot

| Location | Product | Now | Script expects at close |
|---|---|---|---|
| Store | Rice | 100 | 100 ✓ |
| Store | Cooking oil | 17 | 17 ✓ |
| Store | Chicken Breast | 5 | 5 ✓ |
| Restaurant | Chapati | 66 | 66 ✓ |
| Restaurant | Chicken Stew | 23 | 23 ✓ |
| Restaurant | Soda 300ml | **32** | **44** ← missing the +12 receipt |
| Restaurant | Water 500ml | 22 | 22 ✓ |
| Canteen | Soda 300ml | 60 | 60 ✓ |
| Canteen | Water 500ml | 40 | 40 ✓ |
| Canteen | Mandazi | 45 | 45 ✓ |

Everything reconciles **except** Restaurant Soda, which is short by the
unreceived 12. Completing step 3 closes that gap. Note the Canteen count
(step 15) has NOT yet been recorded — Canteen Soda 60 is post-transfer,
pre-count; the count will derive 12 sold and leave it at 60.

Money now: Cash **2,600**, M-Pesa **−3,040**, owner-owed **−3,000** —
all verified correct for post-step-13. Step 15 adds +720 cash → 3,320.

---

## 2. WHAT THIS SESSION ALREADY FIXED (13 findings, all gated)

Numbered as reported to the owner. #1–#3 predate this handover chain.

| # | Finding | Fix |
|---|---|---|
| 1 | Dev seed was a screen fixture, not a QA baseline | `prisma/seed.ts` rewritten to the RESUME §2 baseline |
| 2 | COGS day-1 opening-boundary in `getFinancialSummary` | opening term also matches `{occurredAt: start, movementType:"opening"}` |
| 3 | Same flaw in the dashboard net series | `trend-series.ts` skips `opening` rows dated at their day start |
| 4 | **Production/Receive painted a false "over stock" block** | kit computes `blocked = quantity > available` off `available`, NOT `max` — so additive flows blocked. Selected additive rows now render in a screen-local `AdditiveStepperRow` |
| 5 | *(not a bug)* stale M-Pesa view | — |
| 6 | No Canteen/Restaurant non-sale UI despite PRD §3 "any staff" | `canteen-non-sale` + `restaurant-non-sale` modes, `/canteen/flows/non-sale`, `/cashier/flows/non-sale`, hub entries. **ADR-68** |
| 7 | Stock Count "Confirm count" pushed off-screen | `min-h-screen` → `grow min-h-0` (the shell is already `h-screen`) |
| 8 | Cashier non-sale 403 — `listMovements` denied `cashier` outright | location-scoped like every other staff role. **ADR-68**. Inverted `app/api/locations/route.test.ts` "cashier is still 403" |
| 9 | Cashier non-sale entry too easy to miss | text link → full-width secondary `<Button>` |
| 10 | "Confirm count" button narrow | one-off `h-(--control-xl)` without `size` → `size="lg"` + `w-full` |
| 11 | **SM delivery banner wired to an empty fixture** (a live `TODO(mock)`) — Admin purchases unreceivable | real `useOutstandingDeliveries()`; tile badge fixed; Flag action dropped (wrong domain path) |
| 12 | Canteen Review & Receive blocked receiving MORE than dispatched | screen-local `ReceiveLineRow` (same root cause as #4) |
| 13 | *(enhancement, owner-requested)* review screens didn't show resulting balance | shared `<ResultingBalanceLine>` — "60 → 72" second line on all additive flows |
| 14 | **Receiving was scoped to the receiver's HOME location** — ADR-67 fallout; a Restaurant/Canteen-destined purchase was a dead end | receiving by DESTINATION: SM → Store+Restaurant, CA → Canteen. `lib/domain/stock/receiving-scope.ts` is the single source of truth for read AND write. Canteen Receive flow + banner + tile added. Admin purchase destination constrained to ADR-67. **ADR-69**. Inverted a `batch.route.test.ts` case |

**#14 was implemented by a separate agent and I verified it
independently** — ADR-68 survived intact, the guard is correct (admin
passes, cashier denied, `guardLocation` untouched for spend flows), both
write paths share the map, ADR-67's one-off restaurant lookup is gone,
and the inverted test asserts what the CA *cannot* see as well as what
they can.

---

## 3. THE OPEN BUG — #15, blocking step 3

**Symptom (owner, live on `/store-manager/flows/receive`):** the Receive
Goods screen shows **"Soda 300ml — On hand: 0 pcs"** and a resulting
balance of **"0 → 12"**. The true Restaurant balance is **32**, so it
should read **"On hand: 32 pcs"** and **"32 → 44"**. Mandazi shows
"On hand: 0" (really 45 at Canteen); Water 500ml shows 0 (really 22
Restaurant / 40 Canteen). Rice / Chicken Breast / Cooking oil are
**correct** (100 / 5 / 17).

**The tell: only Store products show a real balance. Every non-Store
product reads 0.**

**Root cause — confirmed in code.** In
`app/store-manager/flows/movement-picker-flow.tsx`:

```ts
const balanceLocationId =
  mode === "production" ? restaurantLocationId : sourceLocationId;
// ...
const stockLevels = useStockLevels(balanceLocationId || undefined);
```

For `mode="receive"`, `sourceLocationId` falls through to
`storeLocationId` — **one** location. But post-ADR-67 the Receive flow is
inherently **two-destination**: ingredients land at the Store, goods at
the Restaurant. Its own badge says "Supplier → Store / Restaurant" and
its submit already kind-splits into two batches. So goods rows look up
their balance at the Store, find none, and render `On hand: 0`.

`useStockLevels(locationId)` and
`GET /api/stock-movements/balances?...&locationId=` are both
**single-location** (`locationId: z.string().min(1)`), so this needs a
real change, not a one-line swap.

**Not yet discussed with the owner. Options — put them to the owner
before building (CONVENTIONS §6):**

- **(a) Per-row location.** Resolve each row's balance location from the
  product's `kind` (ingredient → Store, goods → Restaurant), mirroring
  the submit-time kind-split. Most correct; needs either two
  `useStockLevels` calls merged by kind, or a multi-location balances
  read.
- **(b) Widen the balances read** to accept several `locationId`s and
  return rows keyed by `(productId, locationId)`. Cleaner long-term,
  touches the API contract + `docs/API.md`.
- **(c) Show no on-hand for goods rows on Receive.** Cheapest, but throws
  away the readout the owner explicitly asked for in #13.

**(a) is my recommendation**, implemented via (b) if the merge gets ugly.

**Check the same class of bug in `canteen-receive`** (added by ADR-69):
it posts one batch at the Canteen and reads balances there, so it is
probably fine — but verify rather than assume.

**Also verify** the resulting-balance line (#13) is correct wherever
on-hand is now fixed: it is `before + added`, so a wrong `before`
silently produced the wrong "after".

---

## 4. THE OTHER OPEN ITEM — the dead "Flag Variance" button

`components/kit/banner.tsx` renders its **"Flag Variance"** button
unconditionally, even when no `onFlag` handler is passed. The two new
delivery banners (SM + Canteen hubs) deliberately omit `onFlag` —
`onFlag` calls `flagTransfer`, the two-phase **transfer** variance path
(ADR-39), which rejects a `purchase_payment` row. Result: a visible
button that silently does nothing.

**The owner has approved the fix: only render the Flag button when
`onFlag` is provided.** One line in `components/kit/banner.tsx`, strictly
additive (every existing caller passes `onFlag` and is unaffected).

This is a **kit change to a frozen kit**, approved as an exception. It
needs: the guard, a kit test, and a note in `docs/design/kit-audit.md`.
**Not yet implemented — do this.**

---

## 5. YOUR IMMEDIATE ORDER OF WORK

1. Fix **bug #15** (§3) — ask the owner which option first.
2. Apply the approved **kit Banner fix** (§4).
3. Gates. Tell the owner to hard-reload and **complete step 3** (Confirm
   Receipt +12 pcs). Restaurant Soda must go 32 → 44.
4. Walk **steps 15–20** with them, one at a time, reconciling each
   against RESUME §4 as you go.
5. Run the **full §4 reconciliation** after day close: every figure,
   predicted vs actual. MATCH → say so. MISMATCH → investigate the code
   path, decide bug vs prediction-error vs intended, fix real bugs
   in-session, re-run gates.
6. Update `docs/PROGRESS.md` with the complete Session 16 entry.

### Flags the owner still wants verified at close (RESUME §4)
- COGS **7,100** / Gross **−4,560** / Net **−5,760** on BOTH
  `/admin/financials` and `/admin` — the two must AGREE.
- Negative Gross/Net and negative M-Pesa render cleanly (no clamp to 0).
- **`account_transfer` (Cash↔M-Pesa) is UNBUILT** — enum value exists, no
  domain fn / route / UI. PRD §4.7 calls for it. A logged finding for its
  own handoff; do not build it here.
- Cashier Two made M-Pesa + credit sales but no handover — check what the
  reconciliation screen shows.
- Handover shortfall must NOT move cash: after step 17 Cash reads
  **3,320.00**, not 3,270.00 (ADR-53/54).
- Owner-owed **−3,000** framed as "business owes owner".

---

## 6. GATES

```
pnpm test          # baseline to beat: 972 passed / 972, 120 files
pnpm typecheck     # must be 0 errors
pnpm build         # run after `rm -rf .next` — a warm build hides errors
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
                   # must return NOTHING (this session cleared the last one)
```

All four were green immediately before this handover. A known flake
exists in `lib/domain/sales/correct-order.test.ts` (DayClose cross-file
race; green on isolated re-run) — it has not recurred in the last five
full runs. If you see it, re-run that file alone and say so; do not
"fix" it.

**Do NOT commit unless the owner explicitly asks.**

---

## 7. TREE STATE

`main`, nothing committed. ~50 modified + 14 untracked paths, all
Session 16 or its two immediate predecessors. Notable new files:

- `lib/domain/stock/receiving-scope.ts` (ADR-69 map)
- `lib/domain/stock/list-movements-cashier-scope.test.ts` (ADR-68)
- `lib/domain/stock/list-outstanding-destination-scope.test.ts` (ADR-69)
- `app/canteen/flows/{non-sale,receive}/`, `app/cashier/flows/non-sale/`
- `tests/screens/{canteen-non-sale,cashier-non-sale,canteen-receive-goods}.screen.test.tsx`
- `docs/sprints/session-16-*.md`

**No schema migration anywhere in this session.**

**Untracked/modified files owned by a SEPARATE in-flight session — DO NOT
TOUCH:** `app/admin/audit-trail/`,
`tests/screens/admin-audit-trail.screen.test.tsx`,
`app/api/audit/route.*`, `lib/domain/audit/*`,
`docs/design/kit-audit.md` (co-owned — coordinate if the §4 kit note
collides), `components/kit/select.tsx`. Ignore stray screenshot PNGs at
the repo root and `.playwright-mcp/`.

`lib/domain/stock/list-movements.ts` carries **both** ADR-68 (cashier
scoping in `listMovements`) and ADR-69 (`listOutstandingPurchasesForLocation`
taking a list). A blunt `git checkout --` on that file will silently
destroy ADR-68 — I did exactly that once this session and had to restore
it. Be careful with reverts there.

---

## 8. WHEN THE WALKTHROUGH FINISHES

- **`docs/PROGRESS.md`**: full Session 16 entry — the baseline, the
  scenario, all 15 findings + resolutions, gate state.
- Every fix that reflects a *decision* needs an ADR; a plain defect is
  described in PROGRESS. ADR-68 and ADR-69 are written; #15 may need one
  depending on which option the owner picks.
- **Optional step 6:** repeat for a full scripted week to check
  day-boundary correctness (Tuesday's opening == Monday's closing; a week
  crossing a month-end). Owner's call.

## 9. REPORT BACK TO THE OWNER

The full reconciliation table (predicted vs actual, per figure), every
finding + resolution, whether a full week was run, and your overall
confidence in the app's correctness after this pass.
