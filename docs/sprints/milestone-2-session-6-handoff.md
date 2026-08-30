# M2 Session 6 Handoff — Developer: Assemble & wire ALL M2 screens (frontend)

**Status:** READY. Every dependency has landed:
- **S1a + S1b (Design)** — all 12 screens (C1–C6, A1–A4, K1–K2) approved in
  Paper ("Prosper Hotel", page "Shell+Component kit"), every structural
  state, `… [M2-01]` artboards. 3 flow docs written + updated (canteen
  re-spun 2026-08-30 — see §5).
- **S2 (Kit)** — `QuantityStepper` tap-to-type verified + ADR-42-gated
  (`kit-audit.md` §1, `component-states.md` §9 C10 = "implemented +
  gated (M2-02)"). Use it as-is; **do not touch `components/kit/`**.
- **S3 (Money + Customers)**, **S4 (Orders)**, **S5 (Canteen derived
  sales)** — all backend merged; `pnpm test` 350/350, `tsc` 0, `build`
  clean.

**Role:** Developer (Development Sprint — frontend assembly + wiring). One
role: `app/**` screen routes + per-screen client components + per-feature
hooks + `tests/screens/*.screen.test.tsx` + the doc updates in §8.
**No changes to `lib/domain/**`, `lib/api/**`, `components/kit/**`, or any
`prisma/**`.** If a screen needs a domain change or a UI decision the
design didn't make — **STOP, write it in `PROGRESS.md`, and flag it.** It
goes back to a Design Sprint or a domain follow-up. You do not design here.

**Read before any code:**
1. `docs/design/export-workflow.md` — **the binding method.** M2 model:
   screenshot the approved Paper artboard → assemble kit components in the
   real route to match it → wire to the real `lib/domain` call → gate with
   a `*.screen.test.tsx` spec → owner walkthrough. **No `get_jsx`
   transcription, no skeleton export, no `fixtures.ts`, no
   `/design-preview` route.** Paper is the visual acceptance target only.
2. `docs/sprints/milestone-2-plan.md` — §1 scope, §3 cross-cutting
   contracts (**all of it**), §5 screen table, §6 (every candidate =
   "compose from proven kit"), §7 row 6, §8 guardrails, §9 DoD.
3. `docs/design/flows/restaurant-sales-flow.md`,
   `customers-credit-flow.md`, `canteen-derived-sales-flow.md` — the
   per-feature user flow + every state's copy. **The canteen flow was
   re-spun 2026-08-30** (see §5 — the negative-sold narrative is gone;
   it's reject + same-day undo now).
4. `docs/design/design-principles.md` §9 (ENFORCED interaction contract),
   `docs/design/component-states.md` §2/§9 (kit state matrix + status),
   `docs/design/kit-audit.md` (what each component does now).
5. `docs/API.md` — the "Orders (Restaurant)", "Customers & Credit",
   "Money", "Canteen" sections (implemented-contract style — the real
   request/response shapes, per-route roles, error codes).
6. `docs/sprints/milestone-2-session-{3,4,5}-handoff.md` "Session Notes" →
   the "For Session 6" blocks. **They spell out the return shapes, the
   routing rules, and the flags you must honour.**

---

## 0. What this session delivers

Every M2 screen **live on real data** in its real Next.js route,
assembled from the proven kit, wired to `lib/domain` through a
per-feature hook, gated by a jsdom+RTL screen spec — then walked by the
owner as every relevant role on `pnpm dev`.

| ID | Route | Shell | Wires to | Key artboards / states |
|---|---|---|---|---|
| **C1** | `app/cashier/page.tsx` | Staff mobile | `listOrders` (own, today) + day-open check | populated · empty · day-closed banner · loading |
| **C2** | `app/cashier/orders/new/*` (build step) | Staff mobile | `GET /api/products` (Restaurant `ProductLocation` + derived Restaurant balance) | tap-to-add 2-col product grid + `category` tab row · line panel · sticky total · **line-blocked (§3.8)** |
| **C3** | checkout bottom-sheet over C2 | sheet | `createOrder` | Cash · M-Pesa · Credit-no-customer · Credit-attached · Delivery(+fee) |
| **C4** | `app/cashier/orders/[id]/*` | Staff mobile | `editOwnOrder` (same-day) / route to `correctOrder` (Admin, after) | day-open editable · day-closed read-only · corrected |
| **C5** | customer attach/quick-create sheet over C3 | sheet | `listCustomers`, `createCustomer` | search results · no-match quick-create · phone error |
| **C6** | `app/cashier/customers/*` | Staff mobile | `listCustomers`, `recordRepayment` | populated · empty · repayment sheet · success |
| **A1** | `app/admin/customers/page.tsx` | Admin desktop + mobile | `listCustomers`, `recordRepayment`, `createCustomer` | populated · filtered-empty · empty · error · repayment rail-drawer · add-customer rail-drawer · mobile |
| **A2** | `app/admin/customers/[id]/page.tsx` | Admin desktop + mobile | `getCustomerLedger` | populated · zero history · loading · mobile |
| **A3** | `app/admin/orders/page.tsx` | Admin desktop + mobile | `listOrders` (all), `correctOrder` | populated · filtered-empty · empty · error · read-only detail drawer · correction form drawer · order+correction linked row-group · mobile. **No delete affordance.** |
| **A4** | `app/admin/canteen/derived-sales/page.tsx` (or under an existing Sales nav — check `canteen-derived-sales-flow.md` §G) | Admin desktop + mobile | `GET /api/canteen/stock-counts` | populated · **product never counted (Never / — / muted em-dash)** · filtered-empty · loading · mobile |
| **K1** | `app/canteen/stock-count/*` | Staff mobile, `FlowHeader` | `POST /api/canteen/stock-counts`; **undo** = `DELETE /api/canteen/stock-counts/:id` | product picker (C2 category tab row) · count entered + preview · first-ever count (distinct copy) · **counted-more-than-expected (blocked error)** · validation error · confirm success (Toast) · delete-count confirm · delete success · count-locked-previous-day |
| **K2** | existing Canteen hub (`app/canteen/hub-client.tsx`) | — | existing hub feed + the derived-sale row type | derived-sale entry at top of `ActivityTimeline` · interleaved with a transfer + opening-stock row |

**K2 is NOT a new screen** — it's a new entry *type* in the Canteen hub's
`ActivityTimeline`. Extend the hub's movement→row mapper to render a
`stockCountId`-linked `sale` as: title "Stock count — {product}",
subtitle "{n} {unit} sold since {date} · closing {rem}", trailing
"+KES {y}" green mono. (No correcting-negative case anymore — see §5.)

---

## 1. The per-feature hooks

Mirror `app/admin/catalog/use-catalog.ts` exactly (the `request<T>`
helper, the typed `*RequestError`, domain-typed shapes, `refresh()`):

- **`app/cashier/use-orders.ts`** (shared with A3) — list (role-scoped by
  the API), create, editOwn, correct. Types from `@/lib/domain/sales`
  (`OrderView`, `CreateOrderInput`, …).
- **`app/admin/customers/use-customers.ts`** (shared with C5/C6) — list,
  ledger, createCustomer, recordRepayment. Types from
  `@/lib/domain/customers`.
- **`app/canteen/use-stock-count.ts`** (K1) + reuse for A4 —
  recordStockCount, voidStockCount, listDerivedSales. Types from
  `@/lib/domain/sales` (`RecordStockCountResult`, `DerivedSaleView`, …).

**Money and quantities are decimal strings end to end** — the hook never
parses them to `number` for display; format with the existing helpers.

---

## 2. Compose from the proven kit — never invent

Every M2 pattern was ruled **"compose"** in plan §6 (the one kit change,
`QuantityStepper` tap-to-type, is already built). Use:
`PageShell` / staff shell, `Drawer` (rail, ADR-37b), `BottomSheet`,
`FormField`, `SimpleTable`, `DenseLedger` / `DenseSummaryStrip`,
`SegmentedControl`, `Select` (searchable), `QuantityStepper`,
`CalculatedImpactBanner` (the K1 preview card — exact fit), `Tabs`
(underline — the `category` row), `ActivityTimeline`, `Toast`,
`EmptyState` / `ErrorState`, `IconButton`.

A **thin per-screen mapper** where the kit's prop shape doesn't fit the
data is fine and expected. **A change to a kit component is not** — if you
reach for one, stop and flag it.

The Paper artboard is the visual target: `mcp__paper__get_screenshot` it,
match it. Use `get_computed_styles` / `get_jsx` for **exact values**
(spacing, colour tokens, copy) — never eyeball from the screenshot. Do
**not** paste artboard markup into a screen file.

---

## 3. Cross-cutting contracts to honour (plan §3)

- **§3.2 order money effect** — a cash/M-Pesa order → one `MoneyMovement`;
  a **credit** order → a `Debt`, `customerId` **required** (the C3 UI
  blocks confirm until a customer is attached; the API 400s otherwise).
- **§3.3 / §3.4 edit-vs-correct** — a Cashier edits their **own** order
  only while its business day **is today** (`editOwnOrder`). After that,
  C4 shows read-only + routes to the Admin correction path (A3 →
  `correctOrder`). Reflect this in C4's affordances.
- **§3.5 canteen** — cash only, no credit, no M-Pesa, no account picker
  on K1. The derived-sale preview comes straight from
  `recordStockCount`'s return (`derivedSale: { unitsSold, revenue,
  periodStart, periodEnd }`); `periodStart: null` ⇒ first-count copy.
- **§3.6 role scoping** — a Cashier's C1 view is their own orders only;
  **no `buyingPrice` / unit cost / margin** in any cashier payload (the
  `OrderView` has none — just don't add a "profit" column to A3 either).
  Prove it in a screen spec.
- **§3.8 BLOCK** — C2 surfaces an insufficient-Restaurant-stock line
  inline per line (§9.8 error pattern), sticky Confirm disabled, danger
  caption. The API returns `400 VALIDATION_ERROR` `field: "lines"` naming
  the short line(s) + available qty — render it against the right row.

---

## 4. Screen specs (`tests/screens/*.screen.test.tsx`)

Mirror `tests/screens/canteen-hub.screen.test.tsx` /
`catalog.screen.test.tsx`: `// @vitest-environment jsdom`, mock
`next/navigation`, mock the **feature hook** (not `fetch`), render the
client component, assert structural states + interactions. One spec file
per screen group (`cashier-orders`, `cashier-customers`,
`admin-customers`, `admin-orders`, `canteen-stock-count`, plus the K2
row in the existing `canteen-hub` spec).

Cover, per screen: populated, empty, filtered-empty (where it has
filters), error, loading, and the primary happy-path interaction. Plus
the contract assertions from §3 (credit-needs-customer, §3.8 line block,
same-day edit vs correct routing, no margin column, K1
counted-more-than-expected shows the blocked error + offers undo).

**Do not weaken any existing suite.** After S5 it's **350** green. Add
yours on top. Full `pnpm test` + `tsc --noEmit` + `build` must stay
green; kit `test:visual` + `test:a11y` untouched and green.

---

## 5. Canteen: what changed 2026-08-30 (read this — the flow-doc history is confusing)

The **owner overrode** the original `canteen-derived-sales-flow.md`
narrative. What S5 actually shipped, and what K1/K2/A4 must reflect:

- **Counting more than expected is a hard error**, not an allowed
  reconciliation. `POST /api/canteen/stock-counts` returns
  `400 VALIDATION_ERROR` `field: "countedQuantity"` ("Counted quantity
  exceeds expected stock by N — record the missing receipt or transfer
  first, then recount"). K1 shows this inline on the count field (flow doc
  §D pattern). **There is no negative-sold preview, no negative revenue,
  no "correcting the previous count" copy.** If you find that copy in an
  artboard or a flow doc, it's stale — the 1b re-spin removed it; flag
  any leftover.
- **Recovery = undo today's count.** K1 has a **delete/undo** affordance
  (not "edit last count") → `DELETE /api/canteen/stock-counts/:id`. Valid
  only for the attendant's own count, same business day. After the day
  rolls the API 403s ("This day is closed — ask an administrator") — K1
  shows the count-locked state. Artboards: delete-count confirm, delete
  success, count-locked-previous-day.
- **A4 has no negative-revenue treatment** — the `--color-danger` mono
  cell for a "correcting period" was removed in the 1b re-spin. Every
  `unitsSold` / `revenue` is ≥ 0 or `null` (never counted → em-dash row).
- **K2** — the derived-sale timeline row is always a positive "+KES"
  green value; no correcting-negative variant.

If any of the three flow docs still contains the old negative-sold text
when you read it: **note it in `PROGRESS.md` as a doc-vs-behaviour gap
for QA / a Design touch-up — do not "fix" the doc yourself** (Dev
session, not Design).

---

## 6. Guardrails for this session (plan §8)

1. **Compose proven kit only.** New pattern used 2×+ and not in the kit →
   flag it, don't inline it a third time.
2. **No headless-browser e2e.** jsdom+RTL screen specs are the automated
   gate; the owner walkthrough is the real e2e.
3. **Owner walkthrough per feature.** After each feature's screens work,
   the owner drives it on `pnpm dev` as every role that touches it,
   before it's called done. Split Cashier / (Admin+Canteen) walkthroughs
   only if running hot.
4. **Re-baseline the plan §7 table, don't annotate it.** §10 gets one
   line if sequencing shifts.
5. **Audit passes as named steps:** no raw hex (tokens only), no bespoke
   thing that should be kit, table/layout parity with the artboard,
   empty/error/loading state on every screen.
6. **No UI/UX decisions.** Flag and stop.
7. **Cross-cutting contracts locked** (§3) — verified by screen specs.

---

## 7. Gates (definition of done)

- `pnpm tsc --noEmit` → 0.
- `pnpm build` → clean.
- `pnpm test` → green; existing 350 untouched, new screen specs added.
- Kit `pnpm test:visual` + `pnpm test:a11y` → green, **kit unchanged**.
- `grep -rn "TODO(mock)"` across `app/**` for the M2 screens → none.
- Every M2 screen renders every structural state from its artboard on
  real data; each matches the Paper artboard (re-screenshot to diff).
- **Owner has walked each feature** (Restaurant sales as cashier + admin;
  Customers & Credit as cashier + admin; Canteen derived sales as
  attendant + admin) on `pnpm dev` and signed off.

---

## 8. Docs to update this session

- **`docs/PROGRESS.md`** — a Session 6 entry under "Milestone 2" (screens
  shipped, hooks, any flag raised, any flow-doc-vs-behaviour gap for QA,
  the owner-walkthrough sign-off). **Rebase before writing it.**
- **`docs/sprints/milestone-2-plan.md`** §7 — mark Session 6 status; §10
  only if sequencing changed.
- **`docs/design/export-workflow.md`** — if the assembly turned up a
  reusable note, add it to the "M2 model" section (don't restructure).
- **`docs/API.md`** — only if a wired screen exposed a contract
  ambiguity you had to resolve (with an ADR-style note, not a silent
  change).
- **This file** — status → `DONE`, and note for Session 7 (QA) which
  screens/states got the lightest coverage and where the
  flow-doc-vs-behaviour gaps are.

---

## 9. Explicitly NOT this session

- Any `lib/domain/**` / `lib/api/**` / `prisma/**` change — if a screen
  needs one, flag it; it's a domain follow-up or M3.
- Any `components/kit/**` change — flag it; it's a Kit Sprint.
- New UI/UX decisions — flag it; it's a Design Sprint.
- Day Close / handover / expenses / owner draws — M3.
- The `correctStockCount` Admin path for canteen counts — later session
  (needs a `corrects_stock_count_id` migration; S5 left the module
  shaped for it).
- QA's adversarial pass — Session 7.

---

## Session Notes

*(Live notes added during the session.)*

- **Screen routes chosen:** _record the actual paths for C2/C3/C4/K1/A4
  (the table above is a suggestion where the flow doc was silent)._
- **Flow-doc-vs-behaviour gaps found:** _list them for QA._
- **Anything flagged back to Design / domain:** _…_
- **Owner walkthrough:** _date, roles walked, sign-off / defects found._
