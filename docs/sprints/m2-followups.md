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

16. **Movement picker fabricates "Available: 1" when its balance location
    fails to resolve.** *(2026-09-02 walkthrough.)* `movement-picker-flow.tsx`:
    `loading` ignores `useStockLevels.loading` and `error` ignores its
    `error`, and the additive branch's `Math.max(onHand, lineQty, 1)`
    floor turns an unresolved Restaurant balance into a screen of fake
    `1`s (this is how the inactive-Restaurant bug presented). Fix: track
    whether the balance read actually resolved (location id non-empty +
    hook not errored) and show `<ErrorState>` when it didn't; fold the
    balance hooks into `loading` / `error`; apply the `,1` floor only to
    a selected row.

17. **Dev DB shared with the test suite.** Several `route.test.ts` specs
    run `prisma.location.updateMany({ data: { active: false } })` against
    `DATABASE_URL`, which is the dev DB — one such run deactivated the
    Restaurant and broke three screens. Point the `test:db` lane at a
    throwaway database (or have every such spec restore `active: true` in
    `afterAll` and scope the "deactivate competing restaurants" query by
    test-prefix name so it can never touch `seed-location-*`).
