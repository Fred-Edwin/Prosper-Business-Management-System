# HANDOVER — Session 3a · Developer · Admin merged "Sales" screen

**Paste this whole file as your first message in a fresh session.**
Branch: `feat/m2-3a-sales` **off `qa/m2-session-7`** (needs the B2 fixes —
F7-5/F7-6 touch `admin-orders-client.tsx`; C4/OrderView changes are
upstream of your work). If `qa/m2-session-7` is already merged to `main`
by the time you start, branch off `main` instead — confirm with the
human.

Runs concurrently with 3b / 3-DESIGN / 3-DOMAIN.

---

## 0. Context / urgency

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), **every screen matching Paper**. You are the **Developer this
session** (`CLAUDE.md`): **compose** the approved Paper screen from the
**proven kit** into the real route, wire to the **already-built domain**,
gate with a screen spec. **No new UI/UX decisions** — if one is needed,
stop and flag it. No kit changes. No Milestone 3.

**The job:** the owner wants the Admin's separate "Sales" (`/admin/orders`)
and "Derived sales" (`/admin/canteen/derived-sales`) pages **merged into
one "Sales" screen with two tabs**. Plus two QA findings that live in this
screen (F7-4, F7-8).

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. `docs/sprints/milestone-2-plan.md` §1 scope, §3 contracts (esp. §3.2
   order money effect, §3.3 correction = append-only new row, §3.6 no
   margin/cost to non-admin — Admin sees all here), §7 table (**stale** —
   6d/6e are merged; orchestrator re-baselines it, not you), §8
   guardrails.
2. `docs/CONVENTIONS.md` — folder structure, naming, error shape, §6.
3. `docs/design/export-workflow.md` — screenshot artboard → compose from
   kit → screenshot-diff → `*.screen.test.tsx`. No `get_jsx` skeleton, no
   fixtures.
4. `docs/design/design-principles.md` §9 (ENFORCED), §4 (tables
   square-cornered).
5. `docs/design/flows/restaurant-sales-flow.md` (esp. §G — the A3 filter
   set and the correction flow) and
   `docs/design/flows/canteen-derived-sales-flow.md`. Both got a status
   note from Design A2 about the merge.
6. `docs/design/fidelity-audit-m1.md` — skim; the merged-Sales specifics
   are in the Paper artboards, not here.
7. `docs/sprints/milestone-2-session-7-qa-report.md` — findings **F7-4**
   and **F7-8** (full text), and F7-5 (the impact-banner fix B2 already
   did — build on it, don't redo).
8. `docs/sprints/handovers/_ORCHESTRATOR-STATE.md` — the 3a bullet in
   "Build batch plan — REVISED".

## 2. Paper artboards (file "Prosper Hotel" `01M0EZ7TAHZM26KBMWNYT0928X`, page `1-0`)

`get_guide({ topic: "paper-mcp-instructions" })` once first. The `[M2-SA]`
set from Design Sprint A + A2:

- `A3+A4 Sales (merged) — desktop, Restaurant Orders tab` (populated)
- `A3+A4 Sales (merged) — desktop, Canteen Derived tab` (populated)
- `… Restaurant Orders tab — empty` / `— filtered-empty` / `— error`
- `… Canteen Derived tab — filtered-empty` / `— loading`
- `A3+A4 Sales (merged) — mobile, Restaurant Orders tab`
- `A3+A4 Sales (merged) — mobile, Canteen Derived tab`
- The 3 re-skinned **A3 drawer** artboards from A2 (read-only detail /
  correction form / linked group) — now with the new filter-toolbar +
  tabs chrome.
- States not re-drawn (use the canonical + a note): Restaurant Orders
  loading = §9.10 skeleton 3 rows; Canteen Derived empty/error = plain
  `EmptyState` / `ErrorState`.

Use `get_screenshot` / `get_computed_styles` / `get_jsx` for exact
values — never read sizes/colours off a screenshot alone.

## 3. Scope

### 3.1 Merge the two routes into one "Sales" screen

- New nav model: **one "Sales" nav item** → kit `<Tabs>` (underline
  style, as C2): **"Restaurant Orders"** and **"Canteen Derived"**.
  16px gap between the tab row and the filter row.
- Route: consolidate under `app/admin/sales/` (or keep `/admin/orders`
  as the home and mount the derived tab there — pick the cleaner Next.js
  App Router shape per `node_modules/next/dist/docs/`; the nav label is
  "Sales" either way). **Remove the separate "Derived sales" nav link**
  from both `components/shells/admin-shell.tsx` and
  `components/shells/mobile-nav-drawer.tsx`. Active-key by longest
  href-prefix (existing pattern).
- Tab 1 content = today's `admin-orders-client.tsx` (orders table +
  detail drawer + correction drawer + linked correction row-group),
  moved under the tab. Tab 2 content = today's
  `derived-sales-client.tsx` (per-product derived-sales table + product
  select + date filter), under the tab.
- Preserve deep-linking: `?tab=derived` (or a nested route) so the nav
  link and a refresh land on the right tab.
- Mobile: the two existing mobile layouts under a mobile tab row (see
  the mobile `[M2-SA]` artboards).

### 3.2 New filter-toolbar pattern (replaces the pill-filter bar here)

Per the `[M2-SA]` artboards: a toolbar of **labelled dropdown controls**
— `Cashier: {name} ▾`, `Payment: All ▾` (value lives in the control's
label), a **date-picker chip**, a `☐ Corrected only` checkbox,
right-aligned **result count**, and a **Reset** link that appears only
when a filter is off its default. All proven kit (`Select`, `DatePicker`,
checkbox). Mobile = a scrollable row of dropdown chips + a "More" chip.
- Restaurant Orders tab filters: Cashier · Date · Payment method ·
  Corrected-only (flow doc §G step 1).
- Canteen Derived tab filters: Product · Date (its existing two).

### 3.3 F7-8 — make the filter pickers actually work

Today the Cashier / Payment chips are inert. Wire them:
- **Payment method** picker → sets `filter.paymentMethod`, re-queries.
- **Cashier** picker → needs a **staff list source**. M2 has no staff
  endpoint. Options, in order of preference:
  1. derive the cashier list from the orders already loaded (distinct
     `cashierId` + `cashierName` from the current result set) — zero new
     API, good enough for a filter;
  2. if that's unacceptable UX, **flag to the orchestrator** and ship the
     Cashier picker disabled with a caption.
  Go with (1) unless it's clearly wrong; note the choice in your summary.
- "Corrected only" and the default "Today" already work — keep them.

### 3.4 F7-4 — full corrected-order form in the A3 correction drawer

Today `CorrectionForm` is **quantity-only**, so `correctOrder`'s
payment-method / order-type / delivery-fee / add-line paths are
UI-unreachable. Rebuild the correction drawer to match the A2 re-skinned
**correction form** artboard so the Admin can restate the whole corrected
order:
- corrected **line list** with `QuantityStepper` per line **+ an
  add-product control** (reuse the C2 tap-to-add pattern / a searchable
  add row — whichever the kit already supports; do NOT build a new
  component),
- **order type** `SegmentedControl` (Dine-in / Takeaway / Delivery),
- **payment method** `SegmentedControl` (Cash / M-Pesa / Credit),
- **delivery fee** field — shown only for Delivery,
- the existing required **Reason** `Textarea`,
- if payment method = Credit, a customer must be attached (parity with
  C3 checkout) — reuse the customer-attach block / `BottomSheet`,
- `CalculatedImpactBanner` reflecting payment-method + fee changes;
  credit deltas labelled **"Customer debt:"** (B2 already did this label
  fix in `impactText` — extend it to cover the new inputs, don't
  regress it).
- The linked "Correction of #N" result row-group is unchanged.
- Wire to the existing `correctOrder` domain fn / `PATCH`/correct route
  (Admin-only) via the shared `use-orders` hook — the domain already
  supports every field; you're only adding the inputs.

### 3.5 Keep intact

- No delete affordance anywhere (§3.3). No cost / margin / profit column
  (§3.6). Detail drawer stays read-only. Cashier name (not UUID) in the
  drawer subtitle — B2 fixed this (F7-6); don't regress.

## 4. Gates + output

- `tests/screens/admin-sales.screen.test.tsx` (rename/extend
  `admin-orders.screen.test.tsx` + fold in
  `canteen-derived-sales.screen.test.tsx`): per tab —
  populated / empty / filtered-empty / loading / error + the primary
  interaction; tab switch + deep-link; the working Payment/Cashier
  filters; **F7-4**: correcting an order's payment method
  credit→cash saves and the banner shows "Customer debt"; credit
  correction with no customer disables submit; add-a-line works;
  **no margin/cost string anywhere**.
- `pnpm test` all green, `pnpm tsc --noEmit` 0, `pnpm build` clean
  (route list changes — the merged route registers, the old derived
  route is gone or redirects).
- `grep -rn "TODO(mock)" app/admin/sales app/admin/orders
  app/admin/canteen` → clean.
- Screenshot-diff each built state against its `[M2-SA]` artboard;
  note any residual delta for QA.
- Summary for the human → orchestrator: route shape chosen, the Cashier-
  filter source decision, F7-4 drawer done, screenshot-diff notes, gate
  status. Do **not** edit PROGRESS §7 / ROADMAP — orchestrator does that
  in FINAL.

## 5. Do NOT

- Change any kit component (`components/kit/*`). Flag if you think you
  need to.
- Make a new design decision — flag to the orchestrator instead.
- Touch the Cashier screens, Customers screens, Catalog, or the SM /
  Canteen flows (other sessions own those).
- Add app-level Playwright/e2e.
- Work on Milestone 3.
- Merge to `main`.
