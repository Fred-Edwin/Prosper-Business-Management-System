# M2 — Quantity accuracy audit (2026-09-02)

**Scope:** every Store Manager, Canteen Attendant and Restaurant Cashier
screen (16 routes), plus the Admin stock ledger at the owner's request
("this is what the admin is going to be referring to and checking daily").

**Method:** for each screen, call its API as that role, independently
recompute every displayed figure from raw `StockMovement` / `Order` rows,
and compare. Then exercise the real write endpoints with scratch data and
verify the deltas. All scratch writes reversed — DB restored to 18
stockMovements / 10 orders / 14 orderLines. No source files changed.

**Severity:** HIGH = actively misstates money or stock to a user.

---


## F1. Cashier "Today" total double-counts corrected orders — CONFIRMED, HIGH
Screen: /cashier (C1), app/cashier/cashier-today-client.tsx:126-133
Live: business date 2026-09-01, user "Cashier"
  API returns #155 (260, corrects=null) + #154 (120) => screen renders "KES 380 · 2 orders"
  Truth: #155 was corrected by #156 (200). Collected = 120 (+200 by the correction row).
  Cashier's own true figure: KES 120 / 1 order. Overstated 3x.
Cause: listOrders returns the superseded ORIGINAL and the CORRECTION as separate
rows; correction.total is the full recomputed total (correct-order.ts:167-180),
not a delta. The reducer sums every row.
Second defect: the cashier-scoped query never returns the correction row (#156
has cashierId=original but is excluded), so `correctedByNumber` is always empty
for the cashier => the "Corrected" chip can never render on C1.
Admin unscoped: 4 rows, naive sum 1380 vs true 1120 — same double-count.

## F2. Three of nine staff bottom-nav tabs 404 — CONFIRMED, HIGH
components/layout/staff-shell-client.tsx:24-44 + hrefForKey():65-68
Nav keys double as route segments (`<basePath>/<key>`), but three keys
name routes that do not exist:
  Cashier      "New Order" -> /cashier/new-order      404 (real: /cashier/orders/new)
  Store Mgr    "History"   -> /store-manager/history  404 (no such route)
  Canteen      "History"   -> /canteen/history        404 (no such route)
Verified by HTTP: working pages 19-22KB, these three 13.8KB (Next default 404).
The Cashier one is reachable two ways: the sticky "New order" BUTTON works
(pushes /cashier/orders/new); only the NAV LINK is dead. Owner confirmed.
Fix for cashier = give the def an explicit href. For the two History tabs a
product decision is needed: build the screen or drop the tab.

## F3. Restaurant sale movements missing for all seeded orders — SEED ARTIFACT, MEDIUM
10 orders / 14 order lines exist, but 0 `sale` StockMovement rows.
prisma/seed.ts:405-423 early-returns when the order id already exists, so a
re-seed never regenerates the sale rows that were lost.
NOT a production bug: verified by creating a real order through the API as
Cashier -> a `-1` Chapati sale row was written and the Restaurant balance
moved 115 -> 114 correctly.
Impact: the ledger's SOLD column and the Restaurant's true on-hand are
untestable/overstated against current dev data. Restaurant stock reads high
because nothing was ever sold off it.
## F4. Ledger hides opening stock on the day it is set — CONFIRMED, HIGH
app/admin/stock/derive-ledger.ts:28-39 (COLUMN_FOR_TYPE)
`opening` maps to null ("opening is derived from prior closing, not this
day's rows"). But on the DAY an `opening` row is written, the prior day's
closing is 0 and the row feeds no column, so:
  Ledger 2026-08-29, Store: Opening 0.0 · (all columns —) · Closing 0.0
  Truth  (balances asOf 2026-08-29): Cooking oil 40, Carrots 25, Beans 30
The ledger's own Closing contradicts GET /api/stock-movements/balances for
the same date. Every product stocked via /admin/stock/opening is invisible
on exactly the day its stock was established, then appears the next day.
Same applies to `stock_count` (also null) — a count that adjusts stock
shows no column, though its derived sale is written as a separate row.
Fix options: (a) route `opening` into its own column / into the opening
figure for its own date, or (b) compute opening as `balances asOf date` MINUS
the day's column sum, which self-heals for every null-column type.
## F5. Canteen derived sales report 0 units against real revenue — CONFIRMED, MEDIUM
GET /api/canteen/stock-counts returns, for every seeded count:
  Soda 300ml   unitsSold "0.0000"  revenue "2880.00"
  Water 500ml  unitsSold "0.0000"  revenue "2000.00"
  Mandazi      unitsSold "0.0000"  revenue  "680.00"
0 units sold against real revenue is self-contradictory on screen (the
Canteen hub renders "{n} pcs sold" from this, and the delete-count confirm
dialog quotes it back to the attendant).
Root cause is F3, not a separate defect: `unitsSold` is DERIVED from the
`sale` StockMovements (StockCount has no soldQuantity column — units sold is
never stored, per the ledger rule). The seed re-run never regenerated those
sale rows, so the derivation correctly returns 0 from an empty set while the
MoneyMovement rows (2880/2000/680) survive from the original seed.
=> Fix the seed (F3) and this resolves. Worth a guard so revenue>0 with
unitsSold==0 is impossible to render.
## F6. Transfer variance loses stock with no quantity trail — DESIGN GAP, MEDIUM
Live test: dispatched 6 Samosa Restaurant->Canteen, accepted only 4.
  Restaurant -6, Canteen +4, net system stock 60 -> 58.
The 2 lost units appear ONLY as free text on the accept row
("Received 4, dispatched 6"). No shrinkage/variance column, no movement row,
nothing a total can sum. The Admin ledger's TOTAL closing silently drops by 2
with no column explaining it, so a daily reconciliation cannot see where the
stock went without reading every note.
Arithmetic is internally consistent — this is a missing accounting concept,
not a calculation bug. Needs an owner decision (a `variance`/`shrinkage`
movement type, or a variance column on the ledger).

## F7. SM + Canteen hub "today's activity" shows ALL history — CONFIRMED, MEDIUM
app/store-manager/hub-client.tsx:51, app/canteen/hub-client.tsx:44 both call
`useStaffStock()` with NO date. use-staff-stock.ts:433 then calls
`listMovements({})` — unfiltered — so the timeline renders every movement
ever recorded, while the code comment and the UI framing say "today's
movement log". Live: the SM hub timeline shows the 29 Aug opening rows as
if they happened today.
Fix: `useStaffStock(nairobiBusinessDate())` on both hubs.

## F8. Hub timeline renders zero-quantity money rows as stock — CONFIRMED, LOW
`purchase_payment` rows carry quantity 0 (money-only, no stock effect) but
movementsToTimeline renders them like any movement: "Rice · Purchase paid ·
+0 kg". The Admin ledger deliberately routes this type to NO column
(COLUMN_FOR_TYPE null); the hub timeline has no such exclusion.

## F9. Soft-deleted products render as "?" / "Unknown product" — CONFIRMED, LOW
staff-stock-format.ts:100 falls back to "Unknown product" when a movement's
product is absent from the joined product list. GET /api/products excludes
soft-deleted rows, so any movement for an archived product (e.g. Beans while
it was archived) shows an unnamed row with no unit label. Live-reproduced on
the SM hub. Fix: have the movement read carry productName/unitLabel, or let
the products fetch include archived rows for name resolution.
## F10. Goods mis-typed as dishes; goods treated as Canteen-only — CONFIRMED, HIGH (data model)
Owner (2026-09-02): "goods are also sold at the restaurant — sodas, water and
all those. Not all goods should go to the canteen."
Current classification is wrong:
  Soda 300ml      kind="dish"   (Restaurant @60 · Canteen @60)
  Water 500ml     kind="dish"   (Restaurant @50 · Canteen @50)
  Mandazi         kind="dish"   (Canteen @20)
  Groundnuts 50g  kind="dish"   (Canteen @30)
Only Bar Soap + Glucose are kind="goods".
Consequence (verified live): FLOW_CONFIG.production uses productKinds:"dish",
so **Record Batch Production lists Soda 300ml and Water 500ml as things to
cook in the kitchen**. The Restaurant's existing stock for them was written as
`production` rows rather than purchase_receipt/transfer.
Also suspect: ingredients (Beans, Carrots, Rice, Cooking oil) carry
ProductLocation rows at the CANTEEN; Beans is at all three locations.
Fix belongs in the seed rebuild + a data migration for real rows:
  - Soda/Water/Mandazi/Groundnuts -> kind:"goods"
  - goods get ProductLocation at BOTH Restaurant and Canteen where sold
  - ingredients stocked at Store only
  - Restaurant goods stock arrives via purchase_receipt or transfer, never production

---

## VERIFIED CORRECT (live, via the real APIs)
  Issue      Store Cooking oil 40 -> 37 on issue 3          (sign + magnitude OK)
  Non-sale   Store Carrots  25 -> 23 on spoiled 2           (OK)
  Receive    Store Carrots  23 -> 30 on receipt 7           (OK)
  Transfer   phase 1: Restaurant 60 -> 54, Canteen still 0  (OK — 2-phase honored)
             phase 2: Canteen 0 -> 4 on accept 4            (OK)
  Sale       Restaurant Chapati 115 -> 114 on a 1-unit order (OK)
  Balances   carry forward correctly across days (asOf 29 Aug -> 2 Sep stable)
  Ledger     columns/totals recompute exactly against raw rows for 30 Aug & 2 Sep
