# HANDOVER — Session 3c · Developer · Store Manager stock-movement flow screens

**Paste this whole file as your first message in a fresh session.**
Branch: `feat/m2-3c-sm-flows` **off `feat/m2-batch-movements`** (`bdea9bd`
— you need the batch endpoints) **cherry-picking `feat/m2-3kit-selectable-row`'s
one commit** (`aef9fb3` — the `SelectableProductRow` component). See §0.1.

**ONE SESSION AT A TIME. You are the only active code session. Do NOT run
`git checkout` / `git stash` / `git branch` against anything but your own
branch. Commit before you exit.**

---

## 0. Context / urgency

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), **every screen matching Paper**. You are the **Developer this
session** (`CLAUDE.md`): **compose** the approved Paper screens from the
**proven kit** into the real routes, wire to the **already-built domain**,
gate with screen specs. **No new UI/UX decisions** (flag instead). **No
kit changes.** No Milestone 3.

**The job:** rebuild the **5 Store Manager stock-movement flow screens** —
Receive Goods, Issue to Kitchen, Record Batch Production, Transfer Stock,
Log Non-Sale. They currently look nothing like Paper because M1's ADR-44
stripped them to one-line forms. The owner reversed that (Option A): the
**multi-row product picker** comes back, using the now-proven
`SelectableProductRow` kit component + the now-built batch endpoints.

### 0.1 Branch setup (do this first, carefully)

```
git checkout -b feat/m2-3c-sm-flows feat/m2-batch-movements      # bdea9bd — batch endpoints
git cherry-pick aef9fb3                                          # SelectableProductRow component
```
`aef9fb3` is the single commit on `feat/m2-3kit-selectable-row`. It adds
`components/kit/selectable-product-row.tsx` + its stories + baselines +
doc updates — it should cherry-pick clean onto the batch-movements base
(disjoint files). If it conflicts, STOP and report — do not force.

After the cherry-pick, run `pnpm test` + `pnpm tsc --noEmit` once to
confirm a green baseline before you write anything.

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. **`docs/design/flows/staff-stock-movements-flow.md`** — the complete
   design intent: the screens table, the Option-A body composition
   (search → category `Tabs` → `SelectableProductRow` list → per-flow
   secondary fields → `CalculatedImpactBanner` batch sum → sticky submit
   with the signed total), the 7 cross-cutting rules (multi-row pick /
   one submit, live availability, the §9.8 block rule, two-phase
   transfer, production-is-immediate, corrections-are-new-rows, role
   scoping), the 5 structural states, and walkthroughs A–F. **This is
   your primary spec.**
   - It's on branch `feat/m2-3kit-filter-toolbar` if not yet on yours:
     `git show feat/m2-3kit-filter-toolbar:docs/design/flows/staff-stock-movements-flow.md`
2. `docs/design/fidelity-audit-m1.md` §"RESOLVED — Option A" + the
   per-screen sections (SM — Receive / Issue / Production / Transfer /
   Non-sale) — the ride-along detail deltas (FlowHeader copy fixes,
   missing empty states, "Record Production" → "Record Batch
   Production", the Non-sale reason copy, location scoping). Same branch.
3. `docs/CONVENTIONS.md` — folder structure, error shape, the
   correction-entry pattern, §6.
4. `docs/design/design-principles.md` §9 (ENFORCED), §4.
5. `docs/design/export-workflow.md` — screenshot artboard → compose from
   kit → screenshot-diff → `*.screen.test.tsx`.
6. `docs/DECISIONS.md` — ADR-15 (corrections are new rows), ADR-25
   (audit), ADR-29 (Africa/Nairobi), ADR-42 (kit gate — you only
   *consume* proven kit), ADR-44 (the body shape being reversed — the
   `FlowScaffold` chrome STAYS, only the body reverts).
7. `components/kit/selectable-product-row.tsx` (after the cherry-pick) —
   its header comment + the `SelectableProductRowProps` interface. The
   exact API you compose:
   ```ts
   productId, name, unit, available: number, selected: boolean,
   quantity: number, onSelect(id), onDeselect(id),
   onQuantityChange(id, next), onQuantityString?(id, raw),
   onBlockedChange?(id, blocked)   // parent uses this to gate the sticky submit
   ```

## 2. Paper artboards (file "Prosper Hotel" `01M0EZ7TAHZM26KBMWNYT0928X`, page `1-0`)

`get_guide({ topic: "paper-mcp-instructions" })` once first. Use
`get_screenshot` / `get_computed_styles` / `get_jsx` for exact values.

The `[M2-3D]` set (from Design Sprint 3-DESIGN):

| Flow | populated | empty | loading | error | blocked |
|---|---|---|---|---|---|
| SM Receive | `JXC-0` | `JZ0-0` | `K0W-0` | `K1X-0` | `K3U-0` (blank-qty validation) |
| SM Issue | `JNK-0` | `JPL-0` | `JR9-0` | `JSX-0` | `JUL-0` (over-stock) |
| SM Production | `K5X-0` | `K7L-0` | `K9H-0` | `KAI-0` | `KCF-0` (blank-qty validation) |
| SM Transfer | `KE5-0` | `KFT-0` | `KHP-0` | `KIQ-0` | `KKN-0` (over-stock) |
| SM Non-sale | `KN6-0` | `KOU-0` | `KQQ-0` | `KRR-0` | `KTO-0` (over-stock) |

Component reference: `JL7-0` (`SelectableProductRow`, already built).
Historical only (do NOT target): `8XH-0`, `92M-0`.

## 3. Scope — the 5 SM flow screens

Current source (rebuild the **body**; keep the `FlowScaffold` chrome):
- `app/store-manager/flows/receive/receive-flow.tsx` + `receive/page.tsx`
- `app/store-manager/flows/issue-production-flow.tsx` (`mode="issue"` and
  `mode="production"`) + `issue/page.tsx` + `production/page.tsx`
- `app/store-manager/flows/transfer-nonsale-flow.tsx` (`mode="transfer"`
  and `mode="non-sale"`) + `transfer/page.tsx` + `non-sale/page.tsx`
- `app/store-manager/flows/flow-scaffold.tsx` — the chrome, **unchanged**
  (FlowHeader + scrolling body + sticky submit; audit confirmed it's
  correct). You replace what it renders as `children`.

### 3.1 Body composition (per `staff-stock-movements-flow.md` §"Body composition")

Top → bottom inside the scrolling body:
1. **Receive only** — "Deliveries awaiting receipt" `MatchCard` list
   above the search, from `GET /api/stock-movements/outstanding`
   (3-DOMAIN widened it to `store_manager`, location-scoped). Tapping
   **Match this delivery** pre-fills the picker with that delivery's
   product + quantity (as a selected row) and links the line via
   `purchasePaymentId` on submit. If the read returns empty → hide the
   section, Receive is manual-only.
2. **`SearchInput`** over the location's product set — per-flow
   placeholder (see flow doc).
3. **Category `Tabs`** (kit underline, roving-tabindex) over
   `Product.category` — **Transfer only** in practice (`All · Beverages
   & Soda · Shop Goods`). Issue / Production / Receive / Non-sale: no tab
   row (Non-sale = search only).
4. **`SelectableProductRow` list** — one per product in the
   filtered/searched set. Feed each row `available` from the derived
   balance at the SM's location (see §3.3). Wire `onBlockedChange` up to
   a screen-level `hasBlockedLine` that disables the sticky submit.
   Readout copy per flow: `Avail: N` (Issue/Transfer/Non-sale),
   `On hand: N` (Receive), `N in Rest.` (Production).
5. **Per-flow secondary fields:**
   - Transfer — Destination `<Select>` (Canteen/Store); FlowHeader badge
     tracks it.
   - Non-sale — reason `<Select>` (`staff_meal · complimentary · spoiled
     · damaged · other`) + Note `<Textarea>`; note becomes **required**
     (§9.8) iff `reason === "other"`.
   - Receive / Issue / Production — none (chef / shift fields DROPPED).
6. **`CalculatedImpactBanner`** — sums the whole batch (see flow doc for
   the exact copy per flow). Danger tint + "1 line is over available
   stock. Fix it to continue." when any row is blocked.
7. **Sticky submit** `<Button size="lg">` — label carries the signed
   batch total (`Confirm Kitchen Issue (−53.5 kg)` etc.). Fires **once**
   → the batch endpoint. Disabled + total dropped when the batch is
   empty / blocked / loading / error.

### 3.2 Wire to the batch endpoints (3-DOMAIN, on your base branch)

| Flow | Endpoint | Body |
|---|---|---|
| Receive | `POST /api/stock-movements/receipts/batch` | `{ locationId, lines:[{productId, quantity, purchasePaymentId?}] }` |
| Issue | `POST /api/stock-movements/issues/batch` | `{ locationId, lines }` |
| Production | `POST /api/stock-movements/production/batch` | `{ locationId, lines }` |
| Transfer | `POST /api/stock-movements/transfers/batch` | `{ fromLocationId, toLocationId, lines }` |
| Non-sale | `POST /api/stock-movements/non-sale/batch` | `{ locationId, reason, note?, lines }` |

All return `201 → { data: StockMovementView[] }` (one per line). A
`400 VALIDATION_ERROR` field `"lines"` means a blocked/empty/dup-line
batch was rejected server-side — surface it, but the client §9.8 block
should prevent it reaching that point. On success → `Toast`
(bottom-center, per flow doc walkthroughs) → back to `/store-manager`.

Use / extend the existing `app/store-manager/use-staff-stock.ts` hook
(it already has `useStockLevels` for the per-row `available`, and the
old single-line `stockApi.*` calls — add batch variants alongside; do
not delete the single-line ones, other code may use them).

### 3.3 Live availability + location scoping (flow doc rules 2 & 7)

- Each `SelectableProductRow.available` = the product's current derived
  balance **at the SM's location**, from `useStockLevels(locationId)` →
  `GET /api/stock-movements/balances?locationId=`. 3-DOMAIN confirmed
  this is location-scoped server-side — trust it, but your screen spec
  should assert the SM never sees a Canteen-only product.
- The SM's `locationId` comes from the flow payload's `locationType`
  (same as today's build resolves it) — the SM needs no `/api/locations`
  access.

### 3.4 Ride-along fixes (from `fidelity-audit-m1.md` per-screen sections)

- "Record Production" → **"Record Batch Production"** (FlowHeader title).
- Non-sale reason copy: **"Staff meal / tea preparation"** (pick one
  wording, match the flow doc).
- **EmptyState** on every flow when the location has no products for it
  (icon + title + one-line guidance — see the flow doc's states table).
- FlowHeader direction badges + tones per the screens table (Supplier→
  Store success / Store→Kitchen danger / Kitchen→Restaurant success /
  Store→{dest} info / Staff meals & spoilage warning).
- Keep the existing §9.8 error wiring on the secondary fields.

## 4. Gates + output

- **Screen specs** — `tests/screens/store-manager-flows.screen.test.tsx`
  (extend the existing file). Per flow: populated / empty / loading /
  error + the blocked state + the primary interaction (select 2 rows,
  set quantities, the impact banner sums, submit fires **one** batch
  POST). Assert: a blocked row disables submit; no money/cost/margin
  string anywhere on these screens; `SelectableProductRow` renders with
  the right `available`.
- `pnpm test` all green, `pnpm tsc --noEmit` 0, `pnpm build` clean.
- `grep -rn "TODO(mock)" app/store-manager/flows` → clean (the current
  `TODO(mock)` on the Receive "match a payment" path is RESOLVED by
  §3.1 — remove the marker).
- Screenshot-diff each built state against its `[M2-3D]` artboard; log
  residual deltas for QA.
- Summary for the human → orchestrator: screens done, the cherry-pick
  result, batch wiring, any artboard delta, gate status. Do **not** edit
  `docs/PROGRESS.md` §7 / `ROADMAP.md` — FINAL does that.

## 5. Do NOT

- Change any `components/kit/*` (incl. `selectable-product-row.tsx` —
  it's proven; if it genuinely doesn't fit, flag to the orchestrator).
- Touch `flow-scaffold.tsx`'s chrome (FlowHeader / scroll / sticky bar).
- Touch the Canteen screens (`app/canteen/*` — that's 3d), the Admin
  screens, the Cashier screens.
- Make a new design decision — flag instead.
- Add app-level Playwright/e2e. Work on Milestone 3.
- Run git checkout/stash/branch on anything but `feat/m2-3c-sm-flows`.
- Merge to `main`.
