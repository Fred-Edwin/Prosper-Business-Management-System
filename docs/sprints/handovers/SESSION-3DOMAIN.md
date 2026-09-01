# HANDOVER — Session 3-DOMAIN · Developer (backend)

**Paste this whole file as your first message in a fresh session.**
Own branch off `main`: `feat/m2-batch-movements`. **Backend + tests
only — no screens.** Runs concurrently with 3-DESIGN / 3a / 3b.
**Blocks: 3c, 3d.**

---

## 0. Context / urgency

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), every screen matching Paper. You are the **Developer this session**
(`CLAUDE.md`) — real logic, behind `lib/domain`, thin API handlers, tests.
No UI. No Milestone 3 features.

**Why this session exists:** the owner reversed ADR-44's one-line-form
shape for the Store-Manager / Canteen **movement flows** — they go back to
a multi-row product picker (search + category tabs + N selectable rows,
each with an inline quantity). That means a single flow submission now
carries **multiple lines**. Rather than have 6 screens each loop N
single-line POSTs and hand-roll partial-failure handling, the orchestrator
decided: **one batch endpoint per movement type**, each atomic.

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. `docs/sprints/milestone-2-plan.md` §3 (cross-cutting contracts —
   especially **§3.8 BLOCK**: an order line whose qty exceeds derived
   balance rejects the whole write, nothing persisted, balance never goes
   negative — you are applying the **same rule** to movement batches),
   §8 guardrails.
2. `docs/CONVENTIONS.md` — error shape, `app/api/*` handler purity (parse
   → Zod → auth/role/ownership → `lib/domain/*` → standard response), the
   correction-entry pattern, `TODO(mock)` convention.
3. `docs/API.md` + `docs/SCHEMA.md` — the stock-movement sections (you'll
   update API.md).
4. `docs/DECISIONS.md` — ADR-15, ADR-16, ADR-17, ADR-25 (audit — every
   mutation writes `AuditLog`), ADR-29 (Africa/Nairobi), ADR-30 (Decimal
   money), ADR-42, ADR-44 (the shape being reversed — you implement the
   batch API; the FINAL session writes the reversal note).
5. `docs/design/fidelity-audit-m1.md` — the `✅ RESOLVED — Option A`
   section and the "Domain / API implications for the build" block inside
   it, plus the per-screen sections for Receive / Issue / Production /
   Transfer / Non-sale.
6. `docs/sprints/handovers/_ORCHESTRATOR-STATE.md` — "Build batch plan —
   REVISED", the orchestrator-decisions block.

## 2. Existing single-line domain functions (the batch versions wrap these rules)

| Movement | Current fn | File |
|---|---|---|
| Purchase receipt | `recordPurchaseReceipt` | `lib/domain/stock/purchases.ts:124` |
| Kitchen issue | `recordKitchenIssue` | `lib/domain/stock/issue-production.ts:21` |
| Production | `recordProduction` | `lib/domain/stock/issue-production.ts:51` |
| Transfer | `recordTransfer` | `lib/domain/stock/transfer.ts:43` |
| Non-sale consumption | `recordNonSaleConsumption` | `lib/domain/stock/consumption.ts:16` |

Derived balance helpers: `getDerivedStockBalance` /
`getDerivedStockBalances` (`lib/domain/stock/derived-balance.ts`).

## 3. Deliverables

### 3.1 One batch function per movement type — in `lib/domain/stock`

Add `recordPurchaseReceiptBatch`, `recordKitchenIssueBatch`,
`recordProductionBatch`, `recordTransferBatch`,
`recordNonSaleConsumptionBatch` (name to match the file's existing
convention). Each:

- Takes `{ …flow-level fields, lines: Array<{ productId, quantity, … }> }`
  — e.g. transfer batch: `{ fromLocationId, toLocationId, lines,
  occurredAt? }`; non-sale batch: `{ locationId, reason, note?, lines }`.
- Runs in **one Prisma transaction** (`prisma.$transaction`), reusing the
  **exact validation + row-writing logic** of the single-line function —
  factor the per-line core out of the existing fn and have **both** the
  single and batch versions call it, so they cannot diverge. Do **not**
  copy-paste.
- **BLOCK semantics (§3.8 parity):** before writing anything, check every
  line's resulting balance. If **any** line would drive a location's
  derived balance negative (issue / transfer-out / non-sale), **reject
  the whole batch** with a `VALIDATION_ERROR` naming each short line and
  its available qty, and the `field` `"lines"`. **No `StockMovement`, no
  `MoneyMovement`, no `AuditLog` row written.** (Receipt / production are
  additive — no block, but still validate product/location existence and
  kind.)
- **Duplicate productId in `lines`** → reject with a clear message (or
  sum them — pick one, document it; reject is simpler and safer).
- **Empty `lines`** → `VALIDATION_ERROR` field `"lines"`.
- **Audit (ADR-25):** one `AuditLog` row **per line** (so the ledger
  detail is preserved), all written inside the same transaction. If the
  `AuditLog` schema easily allows it, also stamp a shared
  `batchId`/correlation so the N rows read as one logical action — only
  if it's a non-invasive add; otherwise N plain rows is fine, note it.
- **Two-phase transfer** unchanged: a transfer batch writes the
  dispatch-side rows now; `acceptTransfer` / `flagTransfer` stay
  single-transfer and are **out of scope** here.
- Money: only the purchase-receipt path touches money today (via the
  matched payment) — keep that behaviour; a plain receipt with no
  matched payment writes no `MoneyMovement`, same as the single-line fn.

### 3.2 One thin API route per batch

`POST /api/stock-movements/receipts:batch` (or
`/api/stock-movements/receipt/batch` — match the existing route naming),
and likewise for issue / production / transfer / non-sale. Each handler:
parse → Zod (the `{ …, lines: [...] }` shape) → `requireApiRole*`
(Store Manager for store-origin flows incl. their own location; Canteen
Attendant for the canteen dispatch flow; Admin allowed) → call the domain
batch fn → `ok(...)` / `fail(code, message, field)`. **No logic in the
handler.** Role scoping must match the single-line routes exactly (a
Store Manager can't post a batch for the Canteen's location, etc.).

### 3.3 Per-row availability read for the picker (confirm, don't rebuild)

The screens (3c/3d) will show `Avail: N` per product row. Confirm
`GET /api/stock-movements/balances?locationId=` (backing
`useStockLevels`) returns **only** the passed location's rows,
server-side — if it returns all locations, that's a scoping bug: fix the
domain read to filter by `locationId` and add a test. (This is also the
Canteen-vs-Store stock-levels scoping check the audit flags.)

### 3.4 Two gaps the orchestrator has now RULED IN — build both

(3-DESIGN escalated these; orchestrator decision 2026-08-31: build.)

- **`986-0` / `9GW-0` "last movement Nh ago" meta line** — add
  `lastMovementAt: string | null` per row to the balances payload
  (`getDerivedStockBalances` + the `GET /api/stock-movements/balances`
  response). A `MAX(occurredAt)` per (product, location) join. Additive,
  no breaking change. Test it's present and correct.
- **Receive "match a delivery the Admin already paid for"** — add a
  **`store_manager`-scoped read** of deliveries awaiting receipt at the
  caller's assigned location. Mirror the Admin `listOutstandingPurchases`
  with a mandatory location filter = the caller's location; a Store
  Manager sees only their location's pending deliveries, an Admin sees
  all (keep the existing Admin route/behaviour). Expose as
  `GET /api/stock-movements/outstanding` widened to allow
  `store_manager` (location-scoped) **or** a sibling staff route —
  match the existing route conventions. Thin handler. Tests: SM sees only
  their location; SM cannot see another location's; Admin unchanged.

- **F7-7 — canteen hub timeline needs the derived-sale revenue.** The
  Canteen hub activity feed (`app/canteen/hub-client.tsx` via
  `movementsToTimeline` in `app/store-manager/staff-stock-format.ts`)
  currently shows a derived canteen sale as a stock-out (`−96 pcs`, red).
  The flow doc wants it shown as revenue-in (`+KES 5,760`, green). The
  screen fix is 3d's, but it needs the **revenue figure in the hub
  feed** — which today it doesn't carry. In this session: make the feed
  that backs the canteen hub include, for each `sale` `StockMovement`
  that has a `stockCountId`, the matching `canteen_sale` `MoneyMovement`
  amount (join on `sourceType = canteen_sale` + `sourceId`). Expose it on
  whatever read `hub-client.tsx` consumes for its timeline (likely the
  movements list / a canteen activity endpoint — trace it from
  `hub-client.tsx`). Additive field, e.g. `derivedRevenue: string | null`
  on the relevant row shape. Test: a canteen `sale` row carries the
  revenue that equals `sold × canteen price`; a non-canteen movement
  carries `null`.

## 4. Gates + output

- New tests under `lib/domain/stock/*.test.ts` and
  `app/api/stock-movements/**/*.test.ts`:
  - batch == N single calls in effect (row-for-row) for a valid batch;
  - a batch with one over-stock line writes **nothing** (assert
    `StockMovement` / `MoneyMovement` / `AuditLog` counts unchanged) and
    the error names every short line;
  - empty `lines`, duplicate `productId`, cross-location role rejection;
  - one `AuditLog` row per line on success;
  - the `balances?locationId=` scoping test;
  - `lastMovementAt` present + correct in the balances payload;
  - SM-scoped "deliveries awaiting receipt" — SM sees only their
    location, Admin unchanged;
  - canteen hub feed carries `derivedRevenue` on a `sale`+`stockCountId`
    row = `sold × canteen price`, `null` elsewhere (F7-7).
- `pnpm test` green (baseline is 450/450 on `qa/m2-session-7`; you're off
  `main` @ 426 — either number, just all-green + your additions),
  `pnpm tsc --noEmit` 0, `pnpm build` clean.
- `docs/API.md` updated with the 5 batch endpoints (request/response
  shape, role, the block-the-whole-batch rule).
- Summary for the human → orchestrator: endpoints added, the
  factor-out done (which core fns are now shared), test count, decisions
  on §3.4, gate status.

## 5. Do NOT

- Touch any screen / `.tsx` / `components/`.
- Add app-level Playwright/e2e.
- Change `acceptTransfer` / `flagTransfer` / correction paths.
- Work on Milestone 3 features (staff, recipes, day-close, financials
  KPI).
- Merge to `main` — the orchestrator sequences the final PR.
