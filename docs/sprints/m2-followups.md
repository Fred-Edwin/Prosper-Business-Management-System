# Milestone 2 Submission-1 — Follow-ups

**Status:** Recorded 2026-09-01 at the M2 landing. Nothing on this list
blocked Submission 1 — every item is a deliberate deferral. Each session
that raised one is named. Pick these up in M3 or a dedicated kit/design
touch-up; none needs a new milestone plan.

---

## KIT

1. **`SelectableProductRow` — `neverBlocks` / additive mode.**
   *(3-KIT, used by 3c / 3d.)* The row has no additive mode, so the
   staff additive flows (receive / production / non-sale where the
   destination can legitimately start at 0) pass
   `max(onHand, lineQty, 1)` as the row's "available" figure. Residual:
   a 0-stock product reads `In Rest.: 1` on an additive flow. Adding a
   `neverBlocks` prop (hide the "available" chip, never disable the
   stepper, never §3.8-block) removes the interim entirely.

2. **`DatePicker` — fold in the quick-rows (Today / Yesterday / All
   dates).** *(3a → lost in the 3e retrofit.)* 3a's Admin Sales filter
   had Today / Yesterday / All-dates quick rows above the calendar. The
   `<FilterToolbar>` retrofit (3e) uses `kind: "date"`, which is a plain
   `DatePicker` with no quick rows. Fold the quick-row list into the kit
   `DatePicker` (or a `FilterToolbar` `kind: "date"` option) so every
   date filter picks them up. Restores what 3a shipped.

3. **`Drawer variant="sheet"` (grabber + slide-up).** *(3b.)* The mobile
   Payment and Asset drawers currently use the near-fullscreen rail
   drawer (owner accepted this for Submission 1). A `variant="sheet"`
   (drag grabber, slide-up from the bottom, backdrop) is a 1-line swap
   at each call site once the kit has it.

4. **`FrictionDeleteDialog` — `showTypeToConfirm={false}`.** *(S7 F7-3.)*
   The dialog always requires a retype; the Canteen hub "Delete today's
   count" wants a plain confirm. S7 wired a bespoke confirm instead of
   touching the kit. Add the prop, then swap the hub to the kit dialog.

## DESIGN

5. **A2 Assets mobile artboards — drop the phantom CATEGORY field.**
   *(3b.)* `J6D-0…` / `JDV-0` still draw a `CATEGORY *` field / strip.
   ADR-44 (and ADR-45) stand — the register has no category — and the
   built screen already omits it. Correct the artboards so Paper matches
   code.

6. **`canteen-derived-sales-flow.md` — the negative-sold narrative.**
   Superseded by the Session-5 `voidStockCount` override (ADR-49 §1
   context / plan §10 2026-08-30) and mostly reconciled in the
   2026-08-30 re-spin + the 3-DESIGN pass. Re-read once more against the
   built K1 for any residual "allow negative" language.

## DOMAIN

7. **`/api/canteen/products` route-purity (F7-9).** *(S7.)* Query logic
   lives in the route handler. Fold it into a `lib/domain` read
   (CONVENTIONS §1 — `app/api/*` handlers carry no business logic).

8. **A3 correction form is quantity-only (F7-4).** *(S7.)* The A3
   correction drawer only edits line quantities; `correctOrder`'s
   payment-method-change path is UI-unreachable. 3a rebuilt the form
   ("F7-4 full corrected-order form") — verify the payment-method path
   is now reachable; if not, finish it.

9. **A3 filter pickers need a Staff list (F7-8).** *(S7.)* 3a derived
   the Cashier picker from the loaded orders as an interim. A real
   `GET` of the cashier/staff list makes the filter complete (shows
   cashiers with no orders in the current window).

## DATA / UX

10. **F7-7 hub subtitle — "since {date} · closing {rem}".** *(3d.)* The
    Canteen hub derived-sale row can't show the period-start date or the
    closing remainder — those fields are on `DerivedSaleView`, not the
    hub feed row (`StockMovementView` + `derivedRevenue`). Widen the hub
    feed row or the derived-sale read to carry them.

11. **`lastMovementAt` not surfaced on Stock Levels.** *(3d QA delta.)*
    The balances payload now carries `lastMovementAt` (3-DOMAIN) but the
    Canteen Stock Levels screen doesn't render the "last counted / last
    moved" meta line yet.

## QA DELTAS FROM 3c / 3d (logged in their session summaries)

12. **Production readout prefix.** Reads `In Rest.: N` (prefix) where the
    artboard has the value then the label (suffix).

13. **MatchCard "Flag variance" not wired.** No staff domain path for a
    variance flag exists yet; the button is inert. Needs a domain
    decision before wiring.

14. **Additive "blocked-at-0" artboards not reproducible.** The additive
    flows never block at 0 by design (that's follow-up #1); the disabled-
    submit state covers the "nothing entered" case. The artboards drawn
    for a 0-block on an additive flow have no code path — reconcile in
    design.

15. **Canteen Stock Levels has no search input.** `9GW-0` draws one; the
    built screen omits it. Add a client-side filter or drop it from the
    artboard.

16. ~~**Movement picker fabricates "Available: 1" when its balance
    location fails to resolve.**~~ **DONE 2026-09-02** — the
    `Math.max(onHand, lineQty, 1)` floor is gone (additive rows pass the
    true `onHand`, with an `AdditiveProductRow` wrapper in the screen
    file handling the on-hand-0 case the kit gets wrong), and
    `useStockLevels.loading` / `.error` are folded into the screen's
    `loading` / `error`. Kit untouched — #1 would delete the wrapper.
    Original text: *(2026-09-02 walkthrough.)* `movement-picker-flow.tsx`:
    `loading` ignores `useStockLevels.loading` and `error` ignores its
    `error`, and the additive branch's `Math.max(onHand, lineQty, 1)`
    floor turns an unresolved Restaurant balance into a screen of fake
    `1`s (this is how the inactive-Restaurant bug presented). Fix: track
    whether the balance read actually resolved (location id non-empty +
    hook not errored) and show `<ErrorState>` when it didn't; fold the
    balance hooks into `loading` / `error`; apply the `,1` floor only to
    a selected row.

17. **Dev DB shared with the test suite.** `route.test.ts` specs mutate
    `DATABASE_URL` (the dev DB) directly. `orders/route.test.ts`
    deactivated `seed-location-restaurant` on every run (fixed 2026-09-02
    — see #18); the durable fix is still to point the `test:db` lane at a
    throwaway database so no spec can touch dev data.

18. **Prisma 7 + `@prisma/adapter-pg` does not escape `_` / `%` in
    `startsWith` / `contains` / `endsWith`.** `startsWith: "__"` compiles
    to `LIKE '__%'` and matches everything. Confirmed: `startsWith:
    "St_re"` matches `Store`, `startsWith: "S%"` matches `Store`. Impact:
    (a) `orders/route.test.ts` deactivated the real Restaurant — fixed by
    filtering on id, not a name wildcard; (b) the catalog / customers /
    assets search filters (`{ contains: userInput }`) treat a typed `_` or
    `%` as a wildcard — low severity, not yet fixed. If Prisma doesn't
    patch this, wrap search input with a `_`/`%`/`\` escaper before
    passing it to `contains`. Test-helper `deleteMany({ where: { name:
    { startsWith: prefix } } })` calls are mostly safe — the literal tail
    of a real prefix (`__catalog_test__list__`) still scopes them.

19. ~~**Stock ledger shows no carried-forward opening line.**~~
    **DONE 2026-09-02.** *(Owner.)* Reported as "the ledger only shows
    three rows" — the Store's seeded ingredients were invisible. Two
    distinct defects, both fixed:

    **(a) Admin ledger dropped every resting product.**
    `useLedger` (`app/admin/stock/use-stock.ts`) seeded its candidate
    `(product, location)` pairs from **this day's movements only**, so a
    product with stock but no movement on the selected day never got a
    `priorClosing` entry — and therefore never got a row.
    `deriveLedgerRows` already had a branch written precisely for this
    case (surface a pair whose opening is non-zero even with no
    movements), but it could never fire because the pair never arrived.
    Fix: seed the pairs from the catalogue's `ProductLocation` set (every
    place a product is actually stocked) **plus** the day's movements
    (which can name a pair with no `ProductLocation`, e.g. a transfer
    counterpart leg); soft-deleted products are skipped, and a pair with
    a 0 opening and no movement is still dropped so never-stocked
    products don't clutter the grid. Effect on the owner's dev data:
    **3 rows → 15**, and the hidden stock was not only the Store's — the
    Restaurant's Chicken Stew 40 / Samosa 60 and the Canteen's Soda 192
    were equally invisible on any day they happened not to move.
    Regression gate: `tests/screens/admin-ledger-resting-rows.screen.test.tsx`
    (verified to fail 2/3 against the old code).

    **(b) Mobile Stock Levels had no day framing at all.**
    `/store-manager/stock` and `/canteen/stock` rendered a bare current
    balance per product. Now a stock card per row — **opening → the day's
    signed movement → closing** — via a new `useStockCard` hook
    (`app/store-manager/use-staff-stock.ts`). Opening is derived, never
    stored (ADR-11 / ADR-40): the ledger sum evaluated at the end of the
    previous business day, i.e. `balances(asOf = previousBusinessDate)`.
    A resting product reads `Open 40 · — · Close 40`. The headline figure
    is the day's closing; the summary strip gained a "Moved" count.
    Non-stock movement types (`opening`, `closing`, `purchase_payment`,
    `stock_count`) are excluded from the day's delta, mirroring the Admin
    grid's `COLUMN_FOR_TYPE` nulls. Business date comes from
    `toBusinessDate` (`Africa/Nairobi`), never server-local.

    Neither fix writes rows or changes the ledger model — both derive at
    read time, so append-only + "corrections are new rows" are untouched.

20. **Quantity accuracy audit — 10 findings.** *(Owner request,
    2026-09-02.)* Full detail in `docs/sprints/m2-quantity-audit.md`;
    fixes specced in
    `docs/sprints/handovers/SESSION-seed-rebuild-and-quantity-fixes.md`.
    HIGH: cashier "Today" total double-counts corrections (F1); three of
    nine staff bottom-nav tabs 404 (F2); the ledger hides opening stock on
    the day it is set (F4); goods mis-typed as dishes so Batch Production
    offers sodas to cook (F10). MEDIUM: seeded orders / canteen counts
    carry no `sale` movements (F3, F5 — seed early-return, production path
    verified correct); transfer variance loses stock with only a free-text
    note (F6); both staff hubs render all history under a "today" heading
    (F7). LOW: zero-quantity money rows render as "+0 kg" (F8);
    soft-deleted products render as "?" (F9).
    **F1 and F6 need an owner product decision before coding.**

21. **Seed rebuild — wipe + relative dates.** *(Owner decision,
    2026-09-02.)* `prisma/seed.ts` to be rewritten: wipe seed-owned rows
    and rebuild rather than upserting onto existing data; dates relative
    to the run day so the data never goes stale; corrected product
    classification (goods sold at the Restaurant AND Canteen, ingredients
    at the Store only, only dishes producible); 7 days of movement so
    every ledger column is populated; every order writes its `sale` row.
    Spec: handover §2. Excluded deliberately — Recipe, Handover,
    OwnerTransaction, Attendance, StaffPayAdjustment, DayClose and
    friends have **no UI reading them yet**, so seeding them creates
    invisible data.

