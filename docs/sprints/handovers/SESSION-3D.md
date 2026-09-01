# HANDOVER — Session 3d · Developer · Canteen screens (Transfer Dispatch + Stock Levels + K2 hub row)

**Paste this whole file as your first message in a fresh session.**
Branch: `feat/m2-3d-canteen` **off `feat/m2-3c-sm-flows`** (3c's branch —
you reuse the `SelectableProductRow` + batch-endpoint wiring 3c already
set up, and 3c's `use-staff-stock` batch additions). Confirm with the
human that 3c has landed (committed) before you start.

**ONE SESSION AT A TIME. You are the only active code session. Do NOT run
`git checkout` / `git stash` / `git branch` against anything but your own
branch. Commit before you exit.**

---

## 0. Context / urgency

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), **every screen matching Paper**. You are the **Developer this
session** (`CLAUDE.md`): compose approved Paper screens from the proven
kit, wire to the built domain, gate with screen specs. No new UI/UX
decisions (flag instead). No kit changes. No Milestone 3.

**The job — 3 Canteen items:**
1. **Canteen Transfer Dispatch** — rebuild to the Option-A multi-row
   picker (same as 3c's SM flows; Canteen → Store direction).
2. **Canteen Stock Levels** — fidelity fixes + the pill-set-as-a-prop
   change (canteen shows `All · Beverages · Goods`, no dead "Dishes"
   pill) + the 2 missing state artboards.
3. **F7-7** — the Canteen hub activity timeline row for a derived sale:
   show `+KES {revenue}` (green, revenue-in) instead of `−{n} pcs` (red,
   stock-out). 3-DOMAIN added the `derivedRevenue` field to the feed —
   this is a frontend-only consumption.

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. **`docs/design/flows/staff-stock-movements-flow.md`** — the same flow
   doc 3c used. **Canteen Dispatch** is the 6th flow in every table; it
   behaves exactly like SM Transfer but Canteen → {destination} and
   reads/writes **Canteen** balances. Walkthrough: the flow doc's
   two-phase-transfer rule (rule 4). On branch
   `feat/m2-3kit-filter-toolbar` if not yet on yours.
2. `docs/design/fidelity-audit-m1.md` §"Canteen — Stock levels (canteen
   items only)" and §"Canteen — Transfer dispatch" — the per-screen
   deltas (location scoping, `as of now` → `as of today`, the "Dishes"
   pill, the missing state artboards). Same branch.
3. `docs/design/flows/canteen-derived-sales-flow.md` §F — the K2 hub
   timeline row spec (**"+KES 5,760.00" in `--color-success`**, subtitle
   "96 pcs sold since {date} · closing {rem}", zero-sold → muted
   em-dash).
4. `docs/CONVENTIONS.md`, `docs/design/design-principles.md` §9 (ENFORCED)
   + §4, `docs/design/export-workflow.md`.
5. `docs/DECISIONS.md` — ADR-15, ADR-25, ADR-29, ADR-42, ADR-44.
6. `components/kit/selectable-product-row.tsx` (on your base from 3c) —
   the API (see 3c's handover §1.7 for the prop list).
7. 3c's `app/store-manager/flows/*` rebuild — **read it as the pattern
   to mirror** for Transfer Dispatch. Same component, same batch-submit
   shape, same block rule.

## 2. Paper artboards (file "Prosper Hotel" `01M0EZ7TAHZM26KBMWNYT0928X`, page `1-0`)

`get_guide({ topic: "paper-mcp-instructions" })` once first.

| Item | populated | empty | loading | error | blocked |
|---|---|---|---|---|---|
| Canteen Dispatch | `KW0-0` | `KY1-0` | `KZX-0` | `L0Y-0` | `L2V-0` (over-stock) |
| Canteen Stock Levels — extra states | — | `L4Y-0` | — | `L72-0` | — |

Existing: `9GW-0` (Canteen Stock Levels populated — structurally fine,
don't rebuild), `9BA-0` (Canteen hub), the K2 timeline artboards
(`HLH-0`, `HNT-0`). Historical only: `9FE-0`.

## 3. Scope

### 3.1 Canteen Transfer Dispatch — Option-A rebuild

`app/canteen/transfer/transfer-dispatch-flow.tsx` + `transfer/page.tsx`.
Keep the `FlowScaffold` chrome; rebuild the body exactly like 3c's SM
Transfer:
- `SearchInput` over the Canteen product set;
- category `Tabs` (`All · Beverages & Soda · Shop Goods`) over
  `Product.category`;
- `SelectableProductRow` list — `available` = derived balance **at the
  Canteen**, from `useStockLevels(canteenLocationId)`; readout `Avail: N`;
  `onBlockedChange` → screen-level `hasBlockedLine` → disables submit;
- Destination `<Select>` (Store) — FlowHeader badge `Canteen → Store`
  (`--color-info`);
- `CalculatedImpactBanner` sums the batch: *"Removes {n} {unit} from
  Canteen now; lands at Store once they accept."*; danger tint when
  blocked;
- sticky `<Button size="lg">` — **`Dispatch Transfer to Store (−{n}
  {unit})`**, fires once → `POST /api/stock-movements/transfers/batch`
  `{ fromLocationId: canteen, toLocationId: store, lines }` → `Toast`
  *"Dispatched · awaiting Store accept"* → back to `/canteen`.
- Role: Canteen Attendant (+ Admin). The attendant's `canteenLocationId`
  resolves the same way today's build does it.

### 3.2 Canteen Stock Levels — fidelity fixes

`app/canteen/stock/page.tsx` → the shared
`app/store-manager/stock/stock-levels-view.tsx` (used by both SM and
Canteen). Per `fidelity-audit-m1.md`:
- **Pill set as a prop.** `StockLevelsView` currently hard-codes
  `All · Ingredients · Goods · Dishes`. Add a `categories` / `pillSet`
  prop. Canteen passes `All · Beverages · Goods` (no "Dishes" — a
  Canteen holds no dishes). SM keeps `All · Ingredients · Goods ·
  Dishes`. **Do not change SM's set or behaviour** — only make it
  parameterised and pass the Canteen's.
- **`as of now` → `as of today`** in the sub-line copy (both views).
- **Location scoping** — the Canteen view must show **canteen products
  only**. `StockLevelsView` resolves `locationId` via
  `listLocations().find(l => l.type === "canteen")` then
  `useStockLevels(locationId)`. 3-DOMAIN confirmed
  `balances?locationId=` is server-scoped — your screen spec asserts a
  Canteen-only product list (no Store rows).
- **Missing state artboards** — build the empty + error states to match
  `L4Y-0` / `L72-0` (kit `EmptyState` / `ErrorState`, mobile width). The
  view already handles them logically; just align to the artboards.
- **Shell header** — verify the Canteen shell shows `Canteen / Canteen
  Attendant`, not `Store`.

### 3.3 F7-7 — Canteen hub derived-sale timeline row

`app/canteen/hub-client.tsx` + `app/store-manager/staff-stock-format.ts`
(`movementsToTimeline`, the `isCanteenSale` branch).
- 3-DOMAIN added **`derivedRevenue: string | null`** to the feed rows
  (on `StockMovementView`, populated for a `sale` row with a
  `stockCountId`). **Consume it.**
- The derived-sale row must render: trailing value **`+KES {derivedRevenue}`**
  in `--color-success` (revenue in), subtitle **"{n} pcs sold since
  {date} · closing {rem}"**, per `canteen-derived-sales-flow.md` §F. A
  zero-sold count (`derivedRevenue == null` on a `sale`+`stockCountId`
  row) → a muted em-dash, not a red stock-out.
- Do **not** change how non-canteen-sale movements render.
- This also touches `staff-stock-format.ts` which SM's hub uses — make
  the change **additive / branch-guarded** so the SM hub timeline is
  byte-unchanged. Assert that in the spec.

## 4. Gates + output

- **Screen specs:**
  - `tests/screens/canteen-transfer-dispatch.screen.test.tsx` (extend) —
    populated / empty / loading / error / blocked + the batch-submit
    interaction; blocked row disables submit; no money/cost string; the
    two-phase toast copy.
  - `tests/screens/stock-levels.screen.test.tsx` — the Canteen pill set
    (`All · Beverages · Goods`, **no** "Dishes"); SM pill set unchanged;
    Canteen shows canteen-only products.
  - `tests/screens/canteen-hub.screen.test.tsx` (extend) — a derived-sale
    row shows `+KES` in success colour + the "sold since" subtitle; a
    zero-sold count shows the muted em-dash; **the SM hub timeline
    render is unchanged** (guard test).
- `pnpm test` all green, `pnpm tsc --noEmit` 0, `pnpm build` clean.
- `grep -rn "TODO(mock)" app/canteen` → clean.
- Screenshot-diff each state vs its `[M2-3D]` / `L4Y-0` / `L72-0`
  artboard; log residual deltas for QA.
- Summary for the human → orchestrator: the 3 items done, the
  `staff-stock-format.ts` additive-change confirmation, gate status.
  Do **not** edit `docs/PROGRESS.md` §7 / `ROADMAP.md`.

## 5. Do NOT

- Change any `components/kit/*`.
- Change SM's Stock Levels pill set or the SM hub timeline (make the
  shared-file changes additive / parameterised).
- Touch the SM flow screens (3c owns those — you branch off 3c and
  reuse its wiring, but don't re-edit `app/store-manager/flows/*`).
- Touch Admin / Cashier screens.
- Make a new design decision — flag instead.
- Add app-level Playwright/e2e. Work on Milestone 3.
- Run git checkout/stash/branch on anything but `feat/m2-3d-canteen`.
- Merge to `main`.
