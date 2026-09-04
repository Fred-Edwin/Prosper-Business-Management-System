# Session 16 — ADR-69: delivery receiving by destination — IMPLEMENTATION HANDOFF

**For:** an agent implementing this while the owner continues a manual QA
walkthrough in another session. The owner has **already approved the two
design decisions** below (§2). You are doing the build, not the design.

**Do NOT drive the app.** The owner runs `pnpm dev` themselves. Your job
is code + tests + gates. Report back; they will verify in the browser.

---

## 0. READ FIRST (binding — `CLAUDE.md` rules apply)

1. `CLAUDE.md` — whole file. **pnpm only.** Visible-progress checklist
   requirement (post a markdown checklist and update it as you go).
   Non-negotiable rules.
2. `docs/CONVENTIONS.md` §1 (route handlers hold no business logic), §4
   (correction pattern), **§6 (working practices — "compose from the
   frozen kit; don't extend it per feature", "stop and ask the owner")**.
3. `docs/DECISIONS.md` — **ADR-67** (location↔kind model; the direct
   cause of this bug), **ADR-68** (Session 16, the cashier widening —
   your closest precedent for the shape of this change), ADR-39
   (two-phase transfer).
4. `docs/PRD.md` §3 (movement table — "Purchase receipt … **Ingredients
   land at the Store; goods land at the Restaurant/Canteen**").
5. `docs/sprints/session-16-qa-walkthrough-RESUME.md` — context for the
   walkthrough this unblocks (you do not need to run it).

---

## 1. THE BUG

**Symptom (owner, live):** the Admin recorded a purchase payment for
Soda 300ml ×12 destined for the **Restaurant**. `/admin/financials` →
Stock Purchases shows it as **"Awaiting delivery"**. No staff role has
any way to receive it. The Store Manager hub shows no banner; the SM
Receive flow's "Deliveries awaiting receipt" list is empty.

**Root cause:** `listOutstandingPurchasesForLocation(locationId)` in
`lib/domain/stock/list-movements.ts` filters `purchase_payment` rows on
the caller's **single assigned location**. The Store Manager is assigned
to the **Store**, so a **Restaurant**-destined delivery is invisible.

This is fallout from **ADR-67**, which moved goods deliveries to land at
the Restaurant (goods may not sit at the Store). ADR-67 updated the
*write* path — `app/store-manager/flows/movement-picker-flow.tsx`
`mode="receive"` kind-splits the batch, sending `goods` lines to the
Restaurant — and it widened the batch route so an SM may post a receipt
at a restaurant. **It never updated this read.** So the SM can write a
Restaurant receipt but cannot see that one is pending. A Restaurant- or
Canteen-destined purchase is currently a dead end.

**Related:** `GET /api/stock-movements/outstanding`
(`app/api/stock-movements/outstanding/route.ts`) is `["admin",
"store_manager"]` — the Canteen Attendant cannot receive deliveries at
all.

---

## 2. THE DECISION (owner-approved — implement, don't re-litigate)

### 2a. Receiving is by DESTINATION, not by the receiver's home location

| Role | May see / receive deliveries destined for |
|---|---|
| `admin` | every location (unchanged — unfiltered read) |
| `store_manager` | **Store + Restaurant** |
| `canteen_attendant` | **Canteen** |

Rationale: ADR-67 lands ingredients at the Store and goods at the
Restaurant, and both are the Store Manager's operational responsibility.
The Canteen is the attendant's. Goods still reach the Canteen by transfer
from the Restaurant as well (ADR-67, unchanged) — this adds *direct*
Canteen deliveries, it does not replace the transfer path.

### 2b. The Admin's purchase destination is constrained to ADR-67's model

The purchase-payment form must only offer destinations legal for the
chosen product's `kind`:

| Product kind | Selectable destinations |
|---|---|
| `ingredient` | Store only |
| `dish` | *(not purchasable — see §4 Q1)* |
| `goods` | Restaurant, Canteen |

Today the Admin can create a payment whose receipt ADR-67's R1 guard
would later reject (e.g. goods → Store), i.e. an unreceivable dead-end
row. Constrain it at entry.

---

## 3. WHAT TO BUILD

Work in this order; each step is independently gateable.

### Step 1 — Domain read takes a LIST of locations

`lib/domain/stock/list-movements.ts`:

- `listOutstandingPurchasesForLocation(locationIds: string | readonly string[])`
  — accept both, normalise to an array (keeps existing call sites
  compiling).
- `listOutstandingPurchasesImpl` — `locationFilter` becomes
  `{ locationId: { in: [...locationIds] } }`; `undefined` still means
  "no filter" (Admin).
- Update the docblock: say *why* it is a list (ADR-67 goods-at-Restaurant),
  and that the role→locations map lives at the route.

> A partial version of this edit was started and **reverted**; the file is
> clean. Do not look for leftovers.

### Step 2 — Route resolves the role → destination list

`app/api/stock-movements/outstanding/route.ts`:

- Widen to `["admin", "store_manager", "canteen_attendant"]`.
- Admin → `listOutstandingPurchases()` (unfiltered, unchanged).
- `store_manager` → `[storeId, restaurantId]`.
- `canteen_attendant` → `[canteenId]`.
- Resolve location **ids by `type`** (query `Location` where
  `type in ('store','restaurant')` / `'canteen'`, `active: true`) —
  do **not** hard-code names or assume `resolveActorLocationId` is the
  Store. Keep the existing "no location link → FORBIDDEN" behaviour for a
  misconfigured staff user.
- Route stays thin (CONVENTIONS §1): resolve ids → call the domain.
  If the id resolution grows past a few lines, put it in
  `lib/domain/stock` and call it.

### Step 3 — Receipt WRITE path allows the new targets

Verify (and fix if needed) that a receipt batch can be posted at these
destinations:

- SM → Store **and** Restaurant. ADR-67 says the carve-out already exists
  in `app/api/stock-movements/receipts/batch/route.ts`; **confirm it**,
  don't assume.
- Canteen Attendant → Canteen.
- `lib/api/stock-batch-auth.ts` `guardLocation` is a single-location
  equality check. It will reject an SM posting at the Restaurant unless
  the route carve-out bypasses it. Trace this and make it correct —
  ideally by giving the guard the same **allowed-destinations** notion,
  rather than another one-off bypass.
- ADR-67's R1 domain guard (`assertKindAllowedAtLocation`) stays the
  backstop and must keep rejecting goods→Store.

### Step 4 — Canteen Receive Goods flow

- New route `app/canteen/flows/receive/page.tsx` — a thin `mode` wrapper
  over the shared `MovementPickerFlow`, exactly like the two non-sale
  wrappers added earlier this session (`app/canteen/flows/non-sale/page.tsx`
  is your template).
- New mode in `app/store-manager/flows/movement-picker-flow.tsx`:
  `"canteen-receive"` — sourced at the Canteen, `productKinds: "canteen"`,
  `spend: false` (additive), posts a receipt batch with
  `locationId: canteenLocationId`, redirect `/canteen`.
  Follow how `canteen-non-sale` was added (a `FLOW_CONFIG` entry +
  `CANTEEN_SOURCED` membership + the `isNonSale`-style branches).
  **The existing `receive` mode's kind-split is SM-specific — the Canteen
  mode posts one batch at the Canteen, no split.**
- `app/canteen/hub-client.tsx` — add a **"Receive Goods"** tile (mirror
  the SM tile: `PackagePlus`, accent stroke; sub-label
  `"N deliveries pending"` + `badge` when any are outstanding, else
  `"Log a supplier delivery"`).
- `app/canteen/hub-client.tsx` — add the pinned `<PurchaseDeliveryBanner>`
  list, mirroring what `app/store-manager/hub-client.tsx` now does
  (read `useOutstandingDeliveries()`; **no `onFlag`** — that is the
  two-phase *transfer* path and would reject a `purchase_payment` row;
  primary label "Review & receive" routing to the flow, **never** a
  one-tap receipt, because a delivery can arrive short).

### Step 5 — Constrain the Admin purchase destination (§2b)

Find the purchase-payment form (Admin — `Record Payment` on
`/admin/financials`; grep for `purchase_payment` under `app/admin/`).
Make the Destination options depend on the selected product's `kind` per
the §2b table. Reset/clear the destination when the product changes to
an incompatible kind so a stale illegal value can't submit. Keep the
server-side guard as the backstop — this is a UX narrowing, not the
enforcement point.

### Step 6 — Tests

- **Domain:** extend/add beside
  `lib/domain/stock/list-movements-cashier-scope.test.ts` (same
  `setupStockTestData` helper — it gives you `locationIds.{store,
  restaurant,canteen}` and `goodsProductId`). Cover: a multi-location
  filter returns payments from BOTH; a Canteen-only filter excludes
  Store/Restaurant; the unfiltered Admin path is unchanged; a payment
  already linked to a receipt is excluded (existing behaviour, don't
  regress).
- **Route:** `app/api/stock-movements/batch.route.test.ts` already has an
  `outstanding` describe block with SM/attendant fixtures — extend it.
  Cover: SM sees a Restaurant-destined payment (**the exact bug**); CA
  sees a Canteen one and NOT the Store's; CA is no longer 403 (there is a
  test asserting `canteen attendant → 403 (route not widened to them)` —
  **that test encodes the old rule and must be inverted**, same as
  ADR-68 did to the locations-route test).
- **Screens:** a Canteen receive spec modelled on
  `tests/screens/canteen-non-sale.screen.test.tsx`; add banner/tile cases
  to `tests/screens/canteen-hub.screen.test.tsx` mirroring the ones just
  added to `tests/screens/store-manager-hub.screen.test.tsx` (mock
  `useOutstandingDeliveries`).
- **Purchase form:** a case asserting an ingredient offers only Store and
  goods only Restaurant/Canteen.

### Step 7 — Docs

- **Write ADR-69** in `docs/DECISIONS.md` (append; ADR-68 is last).
  Cover: the bug and that it is ADR-67 fallout; the destination-based
  receiving map; why the Canteen gets direct deliveries *in addition to*
  the transfer path; the purchase-destination constraint; that
  `listOutstandingPurchasesForLocation` now takes a list; every test
  inverted and why. Follow ADR-68's structure.
- `docs/PRD.md` §3 / §4.2 — state who receives what, if not already clear.
- `docs/API.md` — the `/outstanding` role + scope change.
- `docs/PROGRESS.md` — a Session 16 entry for this piece.

---

## 4. STOP AND ASK THE OWNER IF

1. **Dishes.** `dish` has `buyingPrice` fixed at 0 and is produced, not
   bought. If the purchase form can currently select a dish, ask whether
   dishes should be excluded from purchases entirely rather than
   inventing an answer.
2. **`guardLocation`.** If making the SM→Restaurant write correct needs
   more than a small, principled change to the allowed-destination
   notion, describe the options and ask — do not add a second bypass.
3. **Any kit change.** The kit (`components/kit/*`) is **frozen**. If a
   pattern seems to need a new kit component or a prop change, stop and
   ask. Screen-local rows are the established escape hatch — see
   `AdditiveStepperRow` in `movement-picker-flow.tsx` and
   `ReceiveLineRow` in `app/canteen/transfer/receive/receive-transfer-flow.tsx`.

---

## 5. GATES (all must pass before you report done)

```
pnpm test          # baseline to beat: 945 passed / 945, 118 files
pnpm typecheck     # must be 0 errors
pnpm build         # run after `rm -rf .next` — a warm build hides errors
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
                   # must return NOTHING (Session 16 cleared the last one —
                   # do not reintroduce one)
```

A known flake exists in `lib/domain/sales/correct-order.test.ts` (a
DayClose cross-file race; green on isolated re-run). It has **not**
recurred in the last four full runs. If you see it, re-run that file
alone and say so — do not "fix" it.

**Do not commit** unless the owner explicitly asks.

---

## 6. TREE STATE

`main`, uncommitted, many Session-16 changes already in place (bugs #4,
#6–#13 + ADR-68). **All gates were green at 945/945 immediately before
this handoff** — if something is already failing when you start, that is
not your change; say so rather than working around it.

`lib/domain/stock/list-movements.ts` in particular is clean and contains
the **ADR-68** cashier scoping — do not remove it while adding ADR-69.

Untracked/modified files owned by a **separate in-flight session** —
**DO NOT TOUCH:** `app/admin/audit-trail/`,
`tests/screens/admin-audit-trail.screen.test.tsx`, `app/api/audit/route.*`,
`lib/domain/audit/*`, `components/kit/select.tsx`. Also ignore stray
screenshot PNGs at the repo root and `.playwright-mcp/`.

---

## 7. REPORT BACK

- What you changed, file by file, and why.
- The receiving map as built, and how `guardLocation` ended up handling
  SM→Restaurant.
- Every test you inverted or deleted, with the reason (these encode
  reversed rules and the owner must see them).
- Final gate output (`pnpm test` counts, typecheck, clean build,
  `TODO(mock)` grep).
- Anything you hit that needed an owner decision and how you resolved it.
- **What the owner should click to verify**: as Store Manager, the
  Restaurant-destined Soda ×12 delivery from "Coast Bottlers" should now
  appear as a pinned banner on `/store-manager` → "Review & receive" →
  the Receive flow with that delivery matchable. This is scripted **step
  3** of the QA walkthrough and is currently blocking it.
