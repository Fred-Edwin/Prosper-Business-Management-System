# Session 16 — Manual QA Walkthrough — RESUME HANDOVER

**For:** a fresh agent continuing an in-progress interactive QA walkthrough.
**Owner is driving `pnpm dev` by hand in their own browser.** You are their
real-time reconciliation partner: help build the scenario, do the
arithmetic, fix bugs live as found. **You have no browser access — do not
drive the app or simulate the owner's actions.** Wait for the owner to
paste what they see after each step.

---

## 0. READ FIRST (binding — `CLAUDE.md` rules apply)

1. `CLAUDE.md` — whole file. pnpm only. Visible-progress checklist
   requirement. Non-negotiable rules (ledgers not totals, corrections are
   new rows, `Africa/Nairobi` day boundary, money is Decimal).
2. `docs/CONVENTIONS.md` §4 (correction-entry pattern), §5 (money/dates),
   §6 (working practices — esp. "Owner walkthrough per feature").
3. `docs/DECISIONS.md` — ADR-53/54 (handover writes NO money row),
   ADR-55 (COGS all-stock sweep, dishes valued 0, purchase-receipts
   only, transfers excluded; non-sale consumption is a SEPARATE report),
   ADR-57 (financials FLOWS over range / BALANCES as-of range end),
   ADR-64 (dashboard net series = telescoping-COGS re-derivation),
   **ADR-67** (location↔kind model — ingredients only at Store;
   dishes/goods only at Restaurant/Canteen; transfers Restaurant↔Canteen
   dish/goods only; goods deliveries land at the Restaurant via the
   kind-split in the Receive Goods flow).
4. `docs/PRD.md` §3 (Domain Language / movement table), §4.5 (handover),
   §4.7 (financials).
5. This file, in full.
6. The sealed working log:
   `/tmp/.../scratchpad/session-16-qa-log.md` if it still exists —
   otherwise the SEALED PREDICTIONS in §4 below ARE the ground truth,
   reproduced here so they survive the session boundary.

---

## 1. What this session is

The owner has built Prosper over many sessions and wants **eyes-on
confidence** that a full day of real business activity reconciles —
"I watched the numbers add up," not "tests pass." The method:

1. ~~Establish a baseline~~ **DONE** — see §2.
2. ~~Script one deliberately awkward day~~ **DONE** — see §3.
3. ~~Predict every end-of-day figure by hand, SEALED before running~~
   **DONE** — see §4. **These are frozen. Do not recompute them to
   match the app. If the app disagrees, investigate the code.**
4. **Walk the script — IN PROGRESS. Owner is at step 0a done, about to
   do step 0b.** See §5 for exactly where.
5. Reconcile every figure after day close. Fix real bugs immediately.
6. Optionally repeat for a full week.

**Three real bugs already found and fixed this session** (§6). Expect
more — the walkthrough has barely started.

---

## 2. THE BASELINE (day 0)

`prisma/seed.ts` was rewritten to a **QA baseline** (owner-approved):
- 5 logins, all PIN `1234`: `Admin`, `Store Manager` (Store),
  `Cashier` (Restaurant), `Cashier Two` (Restaurant),
  `Canteen Attendant` (Canteen).
- **8 products, rounded buying prices:**

  | Product | kind | unit | buying | selling | locations |
  |---|---|---|---|---|---|
  | Rice | ingredient | kg | 150.00 | — | Store |
  | Cooking oil | ingredient | litre | 250.00 | — | Store |
  | Chicken Breast | ingredient | kg | 500.00 | — | Store |
  | Chapati | dish | pcs | 0 | 20.00 | Restaurant |
  | Chicken Stew | dish | plate | 0 | 200.00 | Restaurant |
  | Soda 300ml | goods | pcs | 45.00 | 60.00 | Restaurant + Canteen |
  | Water 500ml | goods | pcs | 35.00 | 50.00 | Restaurant + Canteen |
  | Mandazi | goods | pcs | 12.00 | 20.00 | Canteen |

- **Zero** stock movements, orders, counts, handovers, expenses, owner
  txns, customers, assets, day-closes.
- Cash at hand 0.00 · M-Pesa/Bank 0.00.

Re-seed anytime with `pnpm prisma:seed` (deterministic; wipes to exactly
the above).

---

## 3. THE SCRIPTED AWKWARD DAY (v4 — frozen)

All times today, Africa/Nairobi. Restaurant selling prices: Stew 200,
Chapati 20, Soda 60, Water 50.

| # | Time | Role (login) | Action | Exact detail |
|---|---|---|---|---|
| **0a** | 06:30 | Admin | **Opening stock** (`/admin/stock/opening`) | Store: Rice 100, Cooking oil 20, Chicken Breast 10. Restaurant: Chapati 30, Chicken Stew 10, Soda 48, Water 24. Canteen: Soda 60, Water 40, Mandazi 50. **(10 cells — Soda & Water appear twice, once per location.)** |
| **0b** | 06:35 | Admin | **Owner Return** | KES 5,000 CASH in. (Cash 0→5,000. Owner-owed 0→−5,000.) |
| **1** | 07:00 | Admin | **Purchase payment (ingredient)** | Supplier "Kimani Wholesale", Rice 20 kg, KES 3,000, paid from **M-Pesa**, dest Store. (No stock effect. M-Pesa 0→−3,000.) |
| **2** | 07:15 | Admin | **Purchase payment (goods)** | Supplier "Coast Bottlers", Soda 300ml ×12, KES 540, paid from **M-Pesa**, dest Restaurant. (M-Pesa −3,000→−3,540.) |
| **3** | 07:30 | Store Manager | **Receive Goods batch** | Rice 20 kg (→ Store, matches #1) **and** Soda ×12 (→ Restaurant, matches #2), one batch — the kind-split fires two receipts. Store Rice 100→120, Restaurant Soda 48→60. |
| **4** | 08:00 | Admin | **Expense** | Gas/Fuel, KES 1,200, paid from **Cash**, note "13kg refill". Cash 5,000→3,800. |
| **5** | 09:00 | Store Manager | **Issue** (Store → kitchen) | Rice 20, Cooking oil 3, Chicken Breast 5. Store Rice 120→100, oil 20→17, Chicken Breast 10→5. |
| **6** | 09:30 | Store Manager | **Production** (→ Restaurant) | Chicken Stew ×20, Chapati ×40. Restaurant Stew 10→30, Chapati 30→70. |
| **7** | 10:00 | Store Manager | **Transfer dispatch** (Restaurant → Canteen, destination auto-resolved, NO picker) | Soda 300ml ×12. Restaurant Soda 60→48 (12 in transit). |
| **8** | 10:15 | Canteen Attendant | **Accept transfer** (inbound banner on the Canteen hub) | Accept Soda ×12. Canteen Soda 60→72. |
| **9** | 12:00 | Cashier (`Cashier`) | **Restaurant sale — CASH** | Dine-in: Chicken Stew ×3, Chapati ×4, Soda ×2 = 600+80+120 = **KES 800 cash**. Restaurant Stew 30→27, Chapati 70→66, Soda 48→46. Cash 3,800→4,600. |
| **10** | 12:20 | Cashier Two (`Cashier Two`) | **Restaurant sale — M-PESA** | Takeaway: Chicken Stew ×2, Water ×2 = 400+100 = **KES 500 M-Pesa**. Restaurant Stew 27→25, Water 24→22. M-Pesa −3,540→−3,040. |
| **11** | 12:40 | Cashier Two | **Restaurant sale — CREDIT** (new Customer) | Create customer **"Alice Njeri", phone 0712345678**. Takeaway: Chicken Stew ×2, Soda ×1 = **KES 460 credit**. Restaurant Stew 25→23, Soda 46→45. Debt: Alice +460. |
| **12** | 13:00 | Cashier Two | **CORRECTION of order #11** | Alice actually took Chicken Stew ×2, Soda ×**2** (one more soda) → corrected total **KES 520**. Append-only correction row. Restaurant Soda 45→44 (net vs pre-#11: 46→44). Alice debt 460→520. |
| **13** | 14:00 | Admin | **Owner draw** | KES 2,000 CASH out. Cash 4,600→2,600. Owner-owed −5,000→−3,000. |
| **14** | 16:00 | Canteen Attendant | **Non-sale consumption / waste** | Mandazi ×5, reason **Spoiled**, note "left out overnight". Canteen Mandazi 50→45. |
| **15** | 17:00 | Canteen Attendant | **Canteen stock count → derives sale** | Count Soda 300ml = **60** at Canteen. Prior balance 72 → **12 sold**, revenue 12×60 = **KES 720 cash**. Canteen Soda 72→60. Cash 2,600→3,320. |
| **16** | 19:30 | Cashier (`Cashier`) | **Handover — deliberate shortfall** | Declares cash **800**, M-Pesa **0**. |
| **17** | 20:00 | Admin | **Receipt of handover (#16)** | Receives cash **750**, M-Pesa 0 → **cash variance −50**. Record shortfall note "KES 50 short — till miscount". **NO money-ledger effect (ADR-53/54).** |
| **18** | 20:15 | Canteen Attendant | **Handover** | Declares cash **720**, M-Pesa 0. |
| **19** | 20:20 | Admin | **Receipt of handover (#18)** | Receives cash **720** — zero variance. |
| **20** | 20:45 | Admin | **Day close** | Close today. Locks all of the above. |

**Actions covered:** purchase+receipt (ingredient AND goods, kind-split)
· transfer R→C (auto-dest) · issue · production · cash sale · M-Pesa sale
· credit sale + new Customer · canteen count derives sale · non-sale
consumption · append-only correction · handover with shortfall · expense
· owner return · owner draw · day close.

---

## 4. SEALED PREDICTIONS (frozen — the ground truth for Step 5)

**Computed by hand BEFORE running, AFTER the three bug fixes in §6.**

### A. Stock on hand at day close

| Location | Product | Predicted |
|---|---|---|
| Store | Rice | **100 kg** (100 +20 −20) |
| Store | Cooking oil | **17 L** (20 −3) |
| Store | Chicken Breast | **5 kg** (10 −5) |
| Restaurant | Chapati | **66 pcs** (30 +40 −4) |
| Restaurant | Chicken Stew | **23 plate** (10 +20 −3 −2 −2) |
| Restaurant | Soda 300ml | **44 pcs** (48 +12 −2 −2 −12) |
| Restaurant | Water 500ml | **22 pcs** (24 −2) |
| Canteen | Soda 300ml | **60 pcs** (60 +12 −12) |
| Canteen | Water 500ml | **40 pcs** (untouched) |
| Canteen | Mandazi | **45 pcs** (50 −5) |

### B. Money balances at day close (balance = Σ all MoneyMovement rows)

**Cash at hand = KES 3,320.00**
`+5,000 owner return −1,200 gas +800 cash sale −2,000 owner draw +720 canteen sale`

**M-Pesa/Bank = KES −3,040.00**
`−3,000 Rice payment −540 Soda payment +500 M-Pesa sale`
(Negative — no float, purchases exceed the one M-Pesa sale. App must
display a negative balance cleanly.)

*Handover receipts #17/#19 write NOTHING to the ledger (ADR-53/54).*

### C. Revenue / COGS / Profit — for **today** (from=to=today)

- **Revenue = KES 2,540.00**
  `800 cash order + 500 M-Pesa order + 520 credit order (net of correction) + 720 canteen derived`
- **COGS = KES 7,100.00**
  Sweep: opening value 32,700 + purchases value 3,540 − closing value 29,140.
  - Opening value 32,700: Store 25,000 (Rice 15,000 + oil 5,000 + chicken 5,000) + Restaurant 3,000 (Soda 2,160 + Water 840) + Canteen 4,700 (Soda 2,700 + Water 1,400 + Mandazi 600).
  - Purchases 3,540: Rice 20×150 + Soda 12×45.
  - Closing 29,140: Store 21,750 (Rice 15,000 + oil 4,250 + chicken 2,500) + Restaurant 2,750 (Soda 1,980 + Water 770) + Canteen 4,640 (Soda 2,700 + Water 1,400 + Mandazi 540).
  - Cross-check ("cost of stock that left the business"): issues 6,250 (Rice 3,000 + oil 750 + chicken 2,500) + Restaurant Soda sold 4×45=180 + Restaurant Water sold 2×35=70 + Canteen Soda derived-sale 12×45=540 + Mandazi waste 5×12=60 = **7,100**. Transfer nets 0. Dishes value 0.
- **Gross Profit = 2,540 − 7,100 = KES −4,560.00** (a real loss — a
  prep-heavy first day issues far more ingredient value to the kitchen
  than it sells back as dishes. Verify the app shows negative profit
  cleanly.)
- **Total Expenses (today) = KES 1,200.00** (gas only; owner draw,
  shortfall, purchase payments are NOT expenses)
- **Net Profit = −4,560 − 1,200 = KES −5,760.00**

### D. Customer debt

Alice Njeri = **KES 520.00 owing** (order 460, corrected to 520).
Total outstanding = 520.00.

### E. Handover reconciliation (single-day worksheet, ADR-57)

| Staff | Declared cash | Received cash | Cash variance |
|---|---|---|---|
| Cashier | 800.00 | 750.00 | **−50.00** |
| Canteen Attendant | 720.00 | 720.00 | 0.00 |
| Cashier Two | *(no handover recorded)* | — | — |

- 1 open shortfall (KES 50, "Cashier"). Doesn't block close, doesn't
  touch pay, doesn't touch the money ledger.
- **Cashier Two made M-Pesa + credit sales but no cash sale and no
  handover** — check what the reconciliation screen shows for a cashier
  with activity but no handover row.

### F. Owed to business (owner draws − returns)

**KES −3,000.00** (draws 2,000 − returns 5,000). Business owes the owner.
Verify the dashboard tile frames this as "business owes owner", not a
bare 3,000.

### G. Non-sale consumption cost (SEPARATE report — NOT in COGS/profit)

**KES 60.00**, all "spoiled" (Mandazi 5 × 12). A view INTO COGS; already
inside the −25,600... no: already inside the 7,100 COGS sweep. NOT added
on top. Gross/Net unchanged by it.

### H. Dashboard "Needs attention" at close

Open shortfalls: **1** · Handovers awaiting receipt: **0** · Negative
stock: **none** · Open prior dates: **0**.

### FLAGS TO WATCH during the walk

1. **COGS 7,100 / Gross −4,560 / Net −5,760** on `/admin/financials`
   AND `/admin` dashboard — the two must AGREE. (Bug #3 was the
   dashboard disagreeing; fixed. Re-verify they match after real
   activity.)
2. Negative Gross/Net and negative M-Pesa must render cleanly (no crash,
   no clamp to 0).
3. **`account_transfer` (Cash↔M-Pesa) is UNBUILT** — enum value exists,
   no domain fn / route / UI. PRD §4.7 calls for it. Log as a finding;
   likely its own handoff.
4. **Cashier Two: no handover** despite M-Pesa + credit activity — check
   reconciliation screen handling.
5. **Handover shortfall does NOT move cash** — after step 17, Cash must
   read 3,320.00, NOT 3,270.00.
6. Owner-owed −3,000 framing.

---

## 5. EXACTLY WHERE THE WALKTHROUGH IS

- **Step 0a (opening stock): DONE.** Owner entered all 10 cells,
  got toast "Saved 10 opening counts for 2026-09-04", no errors.
  `/admin/financials` (Today) correctly showed Revenue/COGS/Gross/Net
  all 0.00 (confirming bug #2 fix).
- **`/admin` dashboard showed +32,700 fake net profit → bug #3 found
  and FIXED** (§6). Owner has NOT yet re-verified the dashboard reads 0
  after the fix — **first thing the resuming session should ask the
  owner to do: hard-reload `/admin` and confirm the week strip / 30-day
  trend / "This week" NET all read KES 0.00.**
- **NEXT: step 0b** — Admin records an Owner Return of KES 5,000 cash.
  (Look for it under `/admin/financials` → "Record Payment" or the
  Owner Draws tab — owner will find the control; confirm the resulting
  Cash = 5,000 and Owner-owed = −5,000.)
- Then steps 1–20 in order.

Running stock tally after 0a:
Store Rice 100 / oil 20 / chicken 10 · Restaurant Chapati 30 / Stew 10 /
Soda 48 / Water 24 · Canteen Soda 60 / Water 40 / Mandazi 50.
Cash 0 · M-Pesa 0.

---

## 6. BUGS FIXED THIS SESSION (all gated; see §7 for gate status)

### Bug #1 — dev seed was a screen-population fixture, not a QA baseline
Not a code bug — `prisma/seed.ts` rewritten (owner-approved) to the §2
baseline. 1070→47 lines. The pre-Session-16 seed (18 products + 7 days
of history) is in git history if ever needed.

### Bug #2 — COGS day-1 opening-boundary (`getFinancialSummary`)
`cogsByLocationSweep`'s opening term used `occurredAt < start` (strict).
`setOpeningStock` stamps `opening` rows at exactly
`businessDateStartUtc(date)` = `start`, so a day-1 opening row was
EXCLUDED from the opening term but INCLUDED in the closing term → COGS
dragged negative by the whole opening-stock value (≈ −32,700), inflating
Gross/Net by the same.
**Fix:** `lib/domain/financials/get-financial-summary.ts` — opening term
now also matches `{ occurredAt: start, movementType: "opening" }`. Safe:
nothing but `setOpeningStock` writes at exactly `start`, and `opening`
rows are never `purchase_receipt`, so no double-count.
**Test:** `lib/domain/financials/cogs-opening-boundary.test.ts` (new, 4
cases — day-1 COGS/gross neutral, stock still valued as closing, day-2
still neutral).

### Bug #3 — same boundary flaw in the dashboard's net series (`dailyNetSeries`)
`lib/domain/dashboard/trend-series.ts` derives COGS via the telescoping
identity `cogsDay = purchases − Σ(all movement value in the day)`
(ADR-64), which assumes a STRICT `< dayStart` opening term. The day-1
`opening` rows (dated at `dayStart`, `gte`-inclusive) landed in the day's
`movementValue`, so `cogsDay = 0 − 32,700` → fake +32,700 net. This is
what the owner saw on `/admin` (week strip, 30-day trend, "This week"
NET all showed 32,700).
**Fix:** `trend-series.ts` — skip `opening` rows dated exactly at their
business-day start when accumulating `movementValue`, mirroring the
`getFinancialSummary` carve-out. Telescoping identity stays valid.
**Test:** `lib/domain/dashboard/trend-series-opening-boundary.test.ts`
(new — day-1 net neutral, and `dailyNetSeries` agrees with
`getFinancialSummary(day,day)` to the cent).

### Also fixed (blocked step 0a) — opening-stock grid: one cell per (product × location)
The grid gave one editable cell per product at a hard-coded "home
location" (dish→Restaurant, everything else→Store). Post-ADR-67 that
rejected every `goods` opening (Store illegal for goods) and gave no way
to enter a second location's count for Soda / Water.
**Fix:**
- `app/admin/stock/opening/opening-plan.ts` — rewritten: `openingCellsFor(product)`
  = one cell per active `ProductLocation`; state keyed
  `${productId}:${locationId}`; `planOpeningPosts` emits one POST per
  dirty cell. `homeLocationType` removed.
- `app/admin/stock/opening/opening-client.tsx` — grid + mobile list
  flattened to one row/card per cell; `listLocations` fetch dropped;
  multi-location products show the location in the row NAME
  ("Soda 300ml — Canteen"), category column shows just the kind.
- Tests: `opening-plan.test.ts` rewritten; `tests/screens/opening.screen.test.tsx`
  fixtures given real `locations` + a two-location goods case.
**Owner design note:** owner asked whether location-scoped products
should be SEPARATE catalog entries ("Soda (Canteen)", "Soda
(Restaurant)"). Discussed and **rejected** — it breaks the same-product
transfer model (ADR-39) and contradicts PRD "canteen sells items
transferred from the restaurant". Current one-product-many-locations
model stands.

---

## 7. TREE STATE (nothing committed — owner hands to orchestrator)

`git status` — modified/new, on `main`:

**From the ADR-67 location-model enforcement session (a PRIOR session):**
`app/api/stock-movements/batch.route.test.ts`,
`app/api/stock-movements/receipts/batch/route.ts`,
`app/store-manager/flows/movement-picker-flow.tsx`,
`app/store-manager/use-staff-stock.ts`, `docs/DECISIONS.md` (ADR-67),
`docs/PRD.md`, `docs/PROGRESS.md`, `docs/SCHEMA.md`,
`docs/design/flows/staff-stock-movements-flow.md`,
`lib/domain/stock/*` (guards, consumption, issue-production, purchases,
transfer, opening-stock, test-helpers + several `*.test.ts`),
`tests/screens/canteen-transfer-dispatch.screen.test.tsx`,
`tests/screens/store-manager-flows.screen.test.tsx`,
new `lib/domain/financials/cogs-model-guards-regression.test.ts`,
new `lib/domain/sales/ingredient-not-sellable.test.ts`.

**From THIS session (Session 16):**
- `prisma/seed.ts` (QA baseline rewrite)
- `lib/domain/financials/get-financial-summary.ts` (bug #2)
- new `lib/domain/financials/cogs-opening-boundary.test.ts`
- `lib/domain/dashboard/trend-series.ts` (bug #3)
- new `lib/domain/dashboard/trend-series-opening-boundary.test.ts`
- `app/admin/stock/opening/opening-plan.ts` + `opening-client.tsx`
- `app/admin/stock/opening/opening-plan.test.ts` +
  `tests/screens/opening.screen.test.tsx`
- this file: `docs/sprints/session-16-qa-walkthrough-RESUME.md`

**Untracked, DO NOT TOUCH — a separate in-flight audit-trail screen
session owns these:** `app/admin/audit-trail/`,
`tests/screens/admin-audit-trail.screen.test.tsx`, and (modified)
`app/api/audit/route.*`, `lib/domain/audit/*`, `docs/API.md`,
`docs/design/kit-audit.md`, `components/kit/select.tsx`. Plus stray
screenshot PNGs at repo root and `.playwright-mcp/` — ignore.

**No schema migration** in any of the above.

### Gate status (as of handover)
- `pnpm test`: **910 pass / 912**. The 2 failures are the KNOWN
  DayClose cross-file race flake (`lib/domain/sales/correct-order.test.ts`
  — passes on isolated re-run; documented by the ADR-67 agent in
  PROGRESS as "recurred once in ~4 full runs, always green on re-run").
  NOT caused by Session 16 changes — dashboard/financials/opening suites
  all green.
- `pnpm typecheck`: **0 errors.**
- `pnpm build`: **clean.**
- `grep -rn "TODO(mock)"` in touched files: **none.**

---

## 8. WHEN THE WALKTHROUGH FINISHES

Per the original Session 16 brief:
- **Step 5 reconciliation:** compare EVERY §4 figure against the app
  after day close (ask the owner to pull up `/admin/financials` Today,
  `/admin` dashboard, Alice's customer page, the Handovers reconciliation
  tab, the stock ledger). MATCH → say so. MISMATCH → investigate the
  code path, decide bug vs prediction-error vs intentional-behaviour,
  fix real bugs in-session, re-run gates.
- **Step 6 (optional):** repeat steps 2–5 for a full scripted week to
  check day-boundary correctness (Tuesday's opening == Monday's closing;
  a week crossing a month-end). Owner's call.
- **`docs/PROGRESS.md`:** add a Session 16 entry — the baseline, the
  scenario, every finding + resolution, the three bug fixes, gate state.
  If a fix reflects a decision, add an ADR; if it's a plain defect,
  describe it in PROGRESS.
- Do **NOT** commit unless the owner explicitly asks in-session. Leave
  the tree clean for the orchestrator.

## 9. REPORT BACK (to the owner → orchestrator)

The baseline + script (this file), the sealed predictions (§4), the full
reconciliation table (predicted vs actual, per figure), every finding +
resolution, whether a full week was run, and overall confidence in the
app's correctness after this pass.
