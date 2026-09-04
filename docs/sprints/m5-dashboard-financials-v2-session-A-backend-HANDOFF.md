# M5 — Dashboard & Financials v2 — Session A (Backend) — HANDOFF

**For:** a fresh agent building the backend half of the Dashboard v2 /
Financials v2 redesign. No `milestone-5-plan.md` exists — like S11 / S13
/ S14 / S15, this handoff **is** the plan. Three sessions total: **A
(this one, backend) → B (Dashboard frontend) → C (Financials
frontend)**. The owner is doing the "check" phase manually on `pnpm dev`
— there is no separate QA session.

---

## 0. READ FIRST (binding — `CLAUDE.md` rules apply)

1. `CLAUDE.md` — whole file. **pnpm only.** Post a visible-progress
   checklist and update it as you go (TodoWrite if available).
2. `docs/CONVENTIONS.md` — naming, error shape, §6 working practices.
3. `docs/design/flows/dashboard-screen.md` — read **"Why v2"**, **"The
   now/period split"**, and **"Data-shape notes for the v2 build
   session"** in full. That last section is your task list — it names
   exactly what's missing and what already exists.
4. `docs/design/flows/financials-screen.md` — read **"v2 RESTRUCTURE"**
   and the **"Non-Sale Consumption tab"** paragraph inside "Structure
   (v2 — current)" item 4.
5. `docs/API.md` — **"Dashboard"** section (the shipped M5 aggregator,
   which you are extending, not replacing) and **"Financials"** section
   (`GET /api/financials/summary`, which you will point the Dashboard's
   profit-stack zone at — see §2 below).
6. `docs/DECISIONS.md` — ADR-57 (flow-vs-balance), ADR-55 (COGS model,
   non-sale consumption), ADR-64 (telescoping-COGS, why the trend series
   is cheap).

**Both screen docs are already written and approved** (Paper "Prosper
Hotel" · page "M5 — Dashboard & Audit", artboards `Dashboard — desktop
[v2]` / `Dashboard — mobile [v2]` / `Financials — desktop [v2]` /
`Financials — mobile [v2]`). This session does **not** touch Paper or
make design decisions — if something in the docs is ambiguous, stop and
ask the owner rather than improvising a UI answer (this is backend-only
work; anything that looks like a screen decision is out of scope).

---

## 1. WHAT THIS SESSION BUILDS

**Nothing in this session is a schema change.** No migration. Read-only
work throughout — same posture as the original M5 S13 dashboard backend.

### 1a. Dashboard aggregator gains a period + two new sections

`GET /api/admin/dashboard` currently takes only `?date=`. It needs to
also accept a period (`from`/`to`) for the two new v2 zones that are
period-scoped, while the existing "now"/"today" bands keep using `date`
unchanged. Concretely:

- **Do NOT duplicate the profit-stack numbers onto this endpoint.** Per
  the dashboard-screen.md data-shape notes, the client calls the
  existing `GET /api/financials/summary?from=&to=` directly for the
  profit stack (Revenue/COGS/Gross/Expenses/Net) and the "Financial
  performance by location" table (`perLocation[]`) — that endpoint
  already returns exactly this shape (see `docs/API.md` "Financials").
  **Your job here is to confirm this is sufficient (it should be) and
  leave it alone** — do not add a second profit-stack computation to the
  dashboard aggregator. If you find a real gap (e.g. a prior-period
  comparison figure the client can't get from two plain calls), flag it
  to the owner before building a workaround — don't silently invent a
  new aggregation.
- **Add: owner draws for the period.** Not currently exposed at
  draws-only granularity by any endpoint (check `docs/API.md`
  "Financials" → Owner Draws — `ownerOwedToBusiness` is a *balance*, netted
  against returns; this needs the period's draws only, unnetted). Add a
  small domain read (or extend an existing one in
  `lib/domain/financials/owner-transactions.ts` — check what's there
  first) and surface it on the dashboard aggregator, scoped by the
  period params.
- **Add: "Stock & activity by location" — always "now", not
  period-scoped.** Per location (Store / Restaurant / Canteen), return:
  - `movementCount` — count of today's `StockMovement` rows at that
    location. `listMovements({ date: today, locationId })` per location
    and take `.length` — do not invent a new domain fn for this, three
    calls (or one groupBy query if you'd rather write it that way) is
    fine at this volume (see ADR-65 / S11's "tens of rows a day"
    precedent for the acceptable-N+1 bar in this codebase).
  - `lowStockCount` — count of products at that location currently ≤ 0
    on hand. **Not** the same as `GET /api/stock-movements/balances`
    (that's single-product-scoped, not a count-across-products groupBy)
    — write a small new read, or check whether
    `lib/domain/dashboard/needs-attention.ts`'s `lowOrNegativeStock`
    query (already groups by `productId, locationId` — see that file)
    can be reused/extended to also return a **per-location count**
    alongside its existing top-3-overall list. Prefer extending that
    existing query over writing a second one from scratch.
  - `handoverStatus` — **do not re-derive.** Call
    `getReconciliation(today)` (the domain fn behind `GET
    /api/handovers/reconciliation` — check `lib/domain/handovers/` for
    the exact export name) and fold its `rows[]` by `locationId`: a
    location with any row where `received === false` is "Awaiting"; a
    location with rows and all `received === true` is "Received"; a
    location with no rows for today has no handover status (Store never
    has one — it has no handover flow at all, per PRD; the field can be
    `null` for Store).

  Add this whole section to `GET /api/admin/dashboard`'s response as
  `stockActivity: [{ locationId, locationName, movementCount,
  lowStockCount, handoverStatus }]` (or your own reasonable naming — this
  is new, you're not matching an existing contract). Order the array
  Store → Restaurant → Canteen or alphabetical, your call, just document
  it in `docs/API.md`.

- **Params.** Decide whether `from`/`to` become new optional query params
  on the existing endpoint (defaulting to something sane, e.g. the
  current business week, if omitted) or whether you leave the endpoint
  `date`-only and the *client* is responsible for calling
  `/api/financials/summary` separately for period data and this endpoint
  for now-data — **the second option is very likely correct and
  simpler**, since it avoids coupling two independently-cacheable reads
  into one response. Lean toward NOT adding period params to this
  endpoint unless you find a concrete reason two separate client calls
  don't work. If you do add params, `400 VALIDATION_ERROR` on malformed
  input, matching every other range-taking endpoint in this codebase.

### 1b. Non-Sale Consumption — verify, don't build

Per the financials-screen.md spec: **"No new domain or schema work — this
is a pure read-wiring job."** `listMovements({ movementType:
"non_sale_consumption" })` already returns every field the new tab needs
(`productId`, `locationId`, `quantity`, `reason`, `recordedById`,
`occurredAt`). Your job in this session:

- **Confirm** this is actually true by writing/running a quick check
  (or a domain test) that calls `listMovements` with that filter against
  seeded data and inspect the shape. If a field is missing (e.g. the
  route doesn't currently accept `movementType` as a filter, or doesn't
  resolve `recordedById` to a name), fix that gap — it's a small,
  contained addition to an existing read, not new domain logic.
  Check `app/api/stock-movements/route.ts` — does it already accept
  `?movementType=non_sale_consumption`? If yes, nothing to do here but
  write the confirming test.
- **Confirm** `getFinancialSummary(from, to).nonSaleConsumption.total`
  is what the Session-C build should use for the KPI tile total — it
  already is (see `docs/API.md` "Financials" example response) — no
  action needed, just don't let Session C reinvent this.
- **No new write endpoint needed either** — `recordNonSaleConsumption` /
  the batch variant and their routes already exist (M1). "Record
  Non-Sale Use" in the Financials KPI/tab toolbar is an existing flow
  the frontend session wires a button to, not new backend.

### 1c. Debts owed to the business — row-level detail

`getFinancialSummary`'s `consolidated.debtsOwedToBusiness` is currently
one summed figure. The Financials v2 Debts card needs **rows**: Customer
name, amount owed, oldest unpaid date, each linkable to
`/admin/customers/[id]`.

- Check `lib/domain/customers/` — there is very likely already a
  `listCustomers` or similar read with a derived balance per customer
  (Customers & Credit shipped in M2). **Do not re-derive customer
  balances from scratch** — find and reuse the existing derivation.
- What's likely missing: filtering to only customers with a
  **positive** owed balance, sorted by amount or oldest-unpaid, for this
  card (as opposed to the full customer list `/admin/customers` shows).
  Check whether the existing read supports a `hasBalance` /
  `minBalance` filter; if not, this is a small addition — filter
  client-side in the route handler is NOT allowed per `CLAUDE.md` ("route
  handlers contain no business logic") — the filter belongs in the
  domain fn or a new thin domain wrapper.
- "Oldest unpaid" — check what "unpaid" actually resolves to in the
  Customers & Credit domain (a `Debt` row with no fully-offsetting
  `Repayment`?) before assuming a field exists. If this concept isn't
  already computed anywhere, that's worth flagging to the owner as a
  scope question rather than guessing at a definition — don't invent a
  new business rule.
- Expose via a small addition to whatever endpoint backs the Customers
  list read (reuse), or a new thin `GET /api/customers?owingOnly=true`
  style param if that fits the existing route's shape better. Match the
  codebase's existing filter-param conventions (see how `/api/orders` or
  `/api/stock-movements` accept optional filters) rather than inventing
  a new style.

---

## 2. WHAT THIS SESSION DOES **NOT** DO

- No frontend work. No screen composition, no kit usage, no
  `app/admin/dashboard-client.tsx` or `financials-client.tsx` changes.
  Sessions B and C do that against what you ship here.
- No schema migration.
- No re-deriving figures that already exist elsewhere (profit stack,
  COGS, non-sale total, customer balances) — every one of those has a
  real source; find it before writing a new query.
- No trend-chart bucketing logic (daily vs weekly bars by period) — that
  is explicitly a **client-side, Session B** concern per
  `dashboard-screen.md`'s "Trend bucketing by period" note. Don't
  pre-empt it here.
- **Do not touch** `app/globals.css` or `components/kit/dense-ledger.tsx`
  — both have uncommitted changes in the tree from an unrelated,
  currently-parked piece of work (a Ledger screen redesign). Leave them
  exactly as you find them; if a merge conflict risk comes up, stop and
  ask rather than resolving it yourself.

---

## 3. TESTS

Standard pattern for this codebase — domain tests first, then route
tests:

- Domain: whatever new/extended read fns you add (owner-draws-for-period,
  stock-activity-by-location, debts-with-rows) each get their own
  `*.test.ts` alongside the file, following the style of
  `lib/domain/dashboard/needs-attention.test.ts` /
  `get-dashboard.test.ts`.
- Route: extend `app/api/admin/dashboard/route.test.ts` for the new
  response fields; add/extend the customers route test for the debts
  filter.
- A **reconciliation test** matters here: whatever the Dashboard's new
  "Stock & activity by location" handover status says must **agree**
  with what `GET /api/handovers/reconciliation` itself returns for the
  same date — write a test that asserts this the way
  `day-detail-reconciliation.test.ts` (S11) proved the day-detail read
  agreed with `getFinancialSummary`. Same discipline: don't let two
  reads of the same underlying rows silently drift.

---

## 4. GATES

```
pnpm test          # must stay green; note the current baseline before you start
pnpm typecheck     # 0 errors
pnpm build          # run after `rm -rf .next`
grep -rn "TODO(mock)" --include="*.ts" --include="*.tsx" app lib components
                    # must return nothing
```

**Do NOT commit unless the owner explicitly asks.**

---

## 5. DOCS TO UPDATE WHEN DONE

- `docs/API.md` — the "Dashboard" section gains the `stockActivity`
  field (and `from`/`to` params if you added them) and an
  owner-draws-for-period field; the "Financials" or "Customers" section
  gains whatever debts-row filter you added. Follow the existing
  worked-JSON-example style in each section.
- `docs/PROGRESS.md` — a session entry: what shipped, what was verified
  vs. newly built (be explicit about which of §1a/1b/1c items turned out
  to already exist vs needed real work — that distinction is useful for
  Session B/C to know what's stable).
- If any decision in this session is architecturally real (e.g. how you
  resolved the `from`/`to` question in §1a, or a new "unpaid debt"
  definition from §1c), it may warrant a short ADR — use judgment; a
  plain read-composition choice does not need one, a new business rule
  probably does.

---

## 6. HANDOFF TO SESSION B

Session B (Dashboard frontend) will need, at minimum:
- The final `GET /api/admin/dashboard` response shape (with your
  additions) written into `docs/API.md`.
- Confirmation of whether it calls `/api/financials/summary` itself for
  the profit stack, or whether you decided otherwise in §1a — **state
  this decision explicitly in your `docs/PROGRESS.md` entry** so Session
  B doesn't have to reverse-engineer it from your diff.

Session C (Financials frontend) will need the confirmed Non-Sale
Consumption read shape and the Debts-with-rows endpoint/params.
