# HANDOVER — Session FIX-2 · Developer · Canteen "Receive transfer" flow (fast)

**Paste this whole file as your first message in a fresh session.**
Branch: continue on `qa/sm-canteen-routine` (it already carries the
FIX-2 predecessor work — the balances/transfer/list-movements scoping
fixes below in §0). **ONE SESSION. You are the only active session. Do
NOT `git checkout` / `git stash` / `git branch` anything but this
branch. Commit before you exit.**

---

## 0. What already landed on this branch (do NOT redo)

The owner walked the SM → Canteen routine and a chain of scoping bugs
was fixed in this branch's working tree (uncommitted at handover — the
first thing you do is read `git diff` to see them):

1. **Batch Production readout** — `movement-picker-flow.tsx` `production`
   flow: `availPrefix` `"In Rest.:"` → `"Available:"`. It was showing a
   floor of `1` for every dish.
2. **`GET /api/stock-movements/balances`** — the SM is location-bound to
   the Store, but Batch Production and the SM → Canteen Transfer both
   legitimately read the **Restaurant** balance. The route now lets a
   `store_manager` read any `type: "restaurant"` location; every other
   foreign location still returns `[]`; `canteen_attendant` unchanged.
   Tests added in `balances/route.test.ts`.
3. **`POST /api/stock-movements/transfers/batch`** — same story on the
   write path: the SM → Canteen transfer dispatches **from the
   Restaurant**, not the SM's Store. The own-location guard now carves
   out `store_manager` + `fromLocationId` of `type: "restaurant"`
   (mirroring the production batch route's existing carve-out). Test
   added in `batch.route.test.ts`.
4. **`listMovements` (`lib/domain/stock/list-movements.ts`)** — a
   location-bound receiver could not see the **sender's** pending
   dispatch row (it lives at the sender's `locationId`), so
   `deriveIncomingTransfers` had nothing to match and **no incoming
   banner rendered**. `listMovements` now returns own-location rows
   **plus** pending inbound `-q` `transfer` rows whose
   `transferCounterpartLocationId` is the actor's location (only when no
   explicit `locationId` filter is passed). Tests updated/added in
   `tests/integration/m1-flows/flow-6-role-access.test.ts`.

All four are green: `pnpm tsc --noEmit` 0, the touched
`*.test.ts(x)` green, `pnpm test` was mid-run at handover (was passing
562 before these last two edits — **re-run it as your first gate**),
`pnpm build` clean before the last two edits.

**COMMIT §0's work first, as its own commit**, before starting §1 —
message along the lines of `fix(transfer): SM↔Canteen scoping — balances
read, dispatch write, receiver sees pending dispatch`. Then do §1.

## 1. The actual task — the Canteen "Receive transfer" flow

### The bug the owner hit

After the §0 fixes the incoming banner shows on the Canteen hub, **but
it renders in its `flagged` state** — just the muted line "Flagged —
awaiting admin review", **no Accept / Flag buttons**. The owner never
pressed Flag Variance. Two possibilities, **diagnose which**:

- **(likely) stale data** — the dispatch row the owner tested with has a
  non-empty `note` from an earlier Flag press in a previous
  poke-around. `deriveIncomingTransfers`
  (`app/store-manager/use-staff-stock.ts`) sets `flagged: m.note != null
  && m.note !== ""`. Query the DB for the pending `transfer` `-q` rows
  with a `note` and confirm.
- **(possible) real bug** — something is writing a `note` onto the
  dispatch row on plain dispatch. Check `recordTransferBatch`
  (`lib/domain/stock/transfer.ts`) — phase-1 rows should have `note:
  null`. If a batch dispatch sets a note, that's the bug; fix it and
  reset the bad rows.

Either way: **the owner does not want a flag-to-admin path at all** for
this routine. See §2.

### The flow the owner wants (their words, lightly tidied)

> The Canteen Attendant taps the incoming-transfer banner → sees a list
> of the dispatched items → confirms the quantities, or adjusts them →
> taps **Receive**. That's it. No Admin in the loop.

So: **one screen**, reachable from the banner, that lists every pending
inbound line, each with an editable quantity pre-filled to the
dispatched amount, and a single **Receive** submit. Adjusting a
quantity down (or up) is a normal thing the CA can do — it just records
what actually arrived. No escalation.

### This is a COMPOSE task, not a design task

**Do NOT open Paper. Do NOT create artboards or new kit components.**
The owner explicitly asked you to infer the screen from what already
exists. The SM movement pickers are your template:

- **`app/store-manager/flows/movement-picker-flow.tsx`** — the whole
  pattern: `<PageShell>` / `FlowHeader`, a section label, a list of
  rows, per-row steppers, a sticky submit button with a running total,
  `Toast` on success, `router.push` back to the hub. The
  "receive"/"issue" modes already do exactly "list of rows + steppers +
  submit".
- **`components/kit/`** — `SelectableProductRow` (row + stepper;
  read its props — for this screen every row is pre-selected and the
  stepper is the whole point), `PageShell`, `Button`, `Toast`,
  `EmptyState`, `ErrorState`. Reuse as-is; a thin per-screen mapper is
  fine, **kit changes are not**.
- The Canteen hub (`app/canteen/hub-client.tsx`) currently renders
  `<TransferBanner>` per incoming line with `onPrimary` = one-tap
  Accept. Change the banner's primary action to **navigate to the new
  screen** instead of calling `acceptTransfer` inline. (One banner that
  says "N items incoming — Review & Receive" is better than one banner
  per line if there are several; your call, match what reads cleanly.)

### Route + wiring

- New route: `app/canteen/transfer/receive/page.tsx` (+ a client
  component beside it), or fold it into the existing
  `app/canteen/transfer/` area — pick whichever matches the repo's
  existing routing convention (check how `app/canteen/stock-count/` and
  `app/canteen/transfer/` are laid out first).
- Data: the pending inbound lines are already in
  `useStaffStock().data.movements` via `deriveIncomingTransfers` (after
  §0's `listMovements` fix). Reuse that hook + helper — don't add a new
  fetch unless there's a real reason.
- Product name / unit: `data.products` (same as the hub does it).

### Domain / API — the one real change

Today `acceptTransfer` (`lib/domain/stock/transfer.ts`) writes the `+q`
counterpart at **exactly `dispatch.quantity.negated()`** — no way to
receive a different amount. You need per-line received quantities.
Smallest sound change:

- Extend `AcceptTransferInput` (`lib/domain/stock/types.ts`) with an
  optional `receivedQuantity?: string` (unsigned magnitude). When
  present and ≠ the dispatched magnitude, the `+q` row is written at the
  **received** amount, and the difference is recorded so the ledger
  still balances and the log shows the variance. Two options for the
  difference — **pick the simpler one that keeps "stock = sum of rows"
  true**:
  - (a) write the `+q` at the received amount **and** a second
    correction-style row against the **dispatch** (`correctsMovementId
    = dispatch.id`, `movementType: "transfer"`, `quantity` = the
    shortfall/overage with the right sign, `note: "Received N, dispatched
    M"`) so the source location's outstanding-in-transit nets to zero;
    or
  - (b) if the two-phase model already nets correctly once any `+q`
    linked to the dispatch exists (check `isPendingDispatch` /
    `deriveIncomingTransfers`'s `acceptedDispatchIds` logic — it keys
    off `correctsMovementId`, not quantity equality), then just write
    the single `+q` at the received amount with a `note` recording the
    variance. **Verify which is true before coding** — read
    `deriveIncomingTransfers` and the derived-balance sum for both
    locations.
- Keep the plain no-body accept working (received == dispatched).
- **Batch it** if the banner sends multiple lines at once — either loop
  `acceptTransfer` per line in the route, or add an
  `acceptTransferBatch` alongside the existing batch endpoints
  (`app/api/stock-movements/*/batch/route.ts` is the pattern). One
  atomic transaction preferred; a per-line loop is acceptable for a
  fast fix if you note it.
- Route: `POST /api/stock-movements/[id]/accept` already exists and is
  destination-scoped. Extend its body to take `{ receivedQuantity }`,
  or add the batch route. **Remove/retire the `{ flag: true, note }`
  branch from the UI path** — leave the domain `flagTransfer` function
  in place (don't churn code that other things might import) but the
  Canteen hub + new screen must not offer "Flag Variance" anymore.

### If you hit a genuine design fork

The owner said infer it — so infer and proceed, then note what you
chose in your summary. Only stop if something is *architecturally*
ambiguous (e.g. the ledger can't stay consistent without a schema
change — it shouldn't; `correctsMovementId`, `note`,
`transferCounterpartLocationId` carry everything).

## 2. Explicitly OUT of scope

- No Admin review / reconciliation UI for transfers. Not for this
  routine. If a variance needs an audit trail, a `note` on the rows is
  enough for now.
- No Paper, no artboards, no new kit components, no
  `docs/design/**` edits beyond one line in the flow doc (below).
- No `flagTransfer` UI. (Domain function stays; just unused by this
  path.)
- Don't touch the SM-side incoming banner
  (`app/store-manager/hub-client.tsx`) unless the shared
  `deriveIncomingTransfers` / banner change forces a matching tweak —
  if it does, keep it minimal and symmetrical.

## 3. Tests (light bar — same as FIX-1)

- **Domain** (`lib/domain/stock/transfer.test.ts`): one test — accept
  with `receivedQuantity` less than dispatched writes a `+q` at the
  received amount and the source + destination derived balances are both
  correct afterwards (no stock created or destroyed). One test — plain
  accept (no `receivedQuantity`) still works exactly as before.
- **Route** (`app/api/stock-movements/[id]/accept/route.test.ts` if it
  exists, else add coverage in `batch.route.test.ts`): the CA at the
  destination can accept with an adjusted quantity → 200/201; a
  non-destination caller still 403.
- **Screen** (`tests/screens/canteen-*.screen.test.tsx`): the new
  receive screen renders one row per pending inbound line with the
  stepper pre-filled to the dispatched qty; editing a stepper and
  tapping Receive calls the accept endpoint with the adjusted value;
  the hub banner's primary action navigates to the screen (not an
  inline accept).
- Update any existing canteen-hub screen test that asserted the
  one-tap-Accept banner behaviour to the new navigate-to-screen
  behaviour, and say so in your summary.

## 4. Gates + output

- `pnpm tsc --noEmit` → 0.
- Touched `*.test.ts(x)` → green.
- `pnpm test` full run → green. Baseline after §0 is ~**566**
  (562 + the balances/transfer/list-movements assertions). Expect a
  handful more from §3. **0 fail.** A pre-existing test that broke
  because it asserted the old one-tap-Accept flow → fix it to the new
  flow and note it.
- `pnpm build` → clean.
- One line in `docs/design/flows/staff-stock-movements-flow.md` §"Two-
  phase transfer" (~L203): the receiver now **reviews & receives** a
  list with adjustable quantities; the flag-to-admin path is retired for
  the Canteen routine. One line only — don't rewrite the section.
- **`docs/PROGRESS.md`** — one entry: what shipped (SM↔Canteen transfer
  scoping fixes + the Canteen receive-transfer flow), what changed from
  the two-phase design (no admin flag path), any variance-accounting
  choice you made.
- **Summary → owner:** the diagnosis of the "flagged with no buttons"
  banner (stale data vs. real bug, and what you did about existing bad
  rows); the variance-accounting approach you chose ((a) or (b) from
  §1) and why; every file touched; the tests added; anything you
  inferred at a design fork.

## 5. Do NOT

- Merge to `main` — hand back for the owner walkthrough.
- Add a DB migration (nothing here needs a new column).
- Redesign the hub or the banner's look — behaviour/routing change
  only, composed from existing kit.
- Stack `> UPDATED` blocks in any doc — one clean edit.
