# Milestone 1 — Manual Verification: Owner Observations

**Date:** 2026-08-29
**Driver:** Owner (Edwinfred), manual walkthrough on localhost
**Role of this doc:** raw observation log from the pre-QA manual pass. NOT
a findings report and NOT a fix list — it captures what the owner saw and
flagged while driving the M1 screens by hand. Triage (design-sprint vs
bug vs QA-scope), severity, and disposition happen after this is
reviewed.

**Context:** the owner ran their own `pnpm dev` and walked the plan in
`docs/sprints/m1-manual-verification-plan` order (Catalog → Stock →
Financials → Store Manager/Canteen). Items are grouped by screen, in the
order observed.

---

## Disposition status (updated as follow-up sessions run)

| Item | Owner | Status |
|---|---|---|
| **D1** staff FORBIDDEN | Session 14 (Developer) | **HANDLED** — cause 2: `GET /api/products` + `GET /api/locations` were admin-only; the staff stock hooks depend on both. Guards widened to the staff roles (`POST` stays admin; `buyingPrice` still stripped for non-admin). Regression tests added; all 7 staff flows re-walked green. See PROGRESS 2026-08-29. |
| **B1** "Stock" → "Ledger" | Session 14 | **HANDLED** — Admin primary nav label only (both shells), per owner's in-session call. Breadcrumb / Financials tab / staff-shell entry left as-is (open naming follow-up). |
| **B4** "Shop Goods" → "Goods" | Session 14 | **HANDLED** — `opening-client.tsx` kind-label + tab. `grep` clean. |
| **C2** "Cash at Hand" → "Cash" | Session 14 | **HANDLED** — `payment-drawer.tsx` (3 maps) + `financials-client.tsx` (reverse map + KPI tile). Stored values unchanged. KPI-tile wording flagged for Session 15 to confirm in the Financials redesign. |
| **A3** Catalog drawer → rail | Session 14 | **HANDLED** — `variant="rail"` + `grow` footer button; matches the other three M1 drawers. `catalog.screen.test.tsx` green. |
| A1, A2, A4, C1, B3 | Session 15 (Design) | pending |
| A5 (Archive) | Session 15 design + Session 16 build | pending |
| B2, B5 | Session 17 (QA) | pending |

**New for Session 17 (found during D1 re-walk):**

- **Accept-transfer visibility gap.** A `transfer` dispatch row stores
  `locationId = source`; `listMovements` scopes a location-bound role to
  `where.locationId = actor.locationId`, so the **receiver never sees the
  pending inbound dispatch** and the hub's Accept banner
  (`deriveIncomingTransfers`) never appears for a real cross-location
  transfer. `POST …/accept` works given a valid id — the gap is which
  rows the receiver's list returns. Pre-existing 2-phase-transfer scope
  question; likely needs a Design decision on how the receiver queries
  inbound transfers. Not a D1 regression.
- **`opening.screen.test.tsx` "toasts on a successful batch"** fails on
  the branch tip (pre-existing, unrelated to Session 14's tab-label
  edit) — a `findByText(/Saved 1 opening count…/)` timeout after a
  successful save. Sits under **B2**; verify against design intent.

---

## A. Catalog & Locations (`/admin/catalog`)

### A1. Edit / Delete columns too close together
The row-level **Edit** and **Delete** action columns sit too close and
are easy to mis-tap.

### A2. Delete should live inside the Edit drawer, not as its own row action
Owner's model: to delete a product you should **open Edit**, scroll to a
dedicated **Delete** section at the bottom of the drawer, and act there —
not have a standalone Delete button in the table row. This removes the
cramped two-column action cluster (A1) at the same time.

### A3. Overlay components are floating cards, not full-height right rails
The Catalog Edit/Create drawer renders as a **floating centered card**
with the page visible around it. Owner wants every overlay of this type
to be a **right-docked sidebar panel at full viewport height**, not a
floating modal.

- **Verified in code:** `app/admin/catalog/product-drawer.tsx` uses the
  kit `<Drawer>` with **no `variant`**, i.e. the default
  `variant="panel"` = the floating `w-[380px]` `h-[560px]` card.
- **The other three drawers already use `variant="rail"`** (full-height,
  right-docked, `w-[420px] h-full`, border-l):
  `app/admin/stock/correction-drawer.tsx`,
  `app/admin/financials/payment-drawer.tsx`,
  `app/admin/assets/asset-drawer.tsx`.
- So this is **Catalog-only** among the drawers. Question for triage:
  make Catalog's drawer `variant="rail"` to match, OR is "panel" ever
  the intended shape anywhere? (The kit supports both by design —
  ADR-37b.) The `FrictionDeleteDialog` is a separate center dialog and
  is out of scope of this specific note.

### A4. No explanatory UI for Ingredient / Dish / Goods
When adding a product, the kind selector (Ingredient / Dish / Goods) has
**no inline explanation** of what each kind means or how they differ, so
the user can't tell which to pick. Owner wants context UI (helper text,
tooltip, or a short description per option).

### A5. Archiving behaviour is unclear / probably wrong
Owner doesn't understand how "Archive" currently works and believes it
should mean:
- An archived product/ingredient/goods is **removed from the main list**
  entirely and appears **only** in a dedicated **Archived** list.
- While archived, it is **blocked from every action** available to
  active products (no edit, no price change, no use in flows).
- Presumably reversible via an **Unarchive** action from the Archived
  list.

Needs a look at what the current soft-delete / "Archive instead"
affordance actually does vs. this expectation. (Backend note for triage:
`softDeleteAsset`/soft-delete on products stamps `deletedAt` and hides
the row from the default list unless `?includeDeleted=true` — but there
is **no Archived-list UI** to view or reverse it, and "blocked from all
actions" isn't explicitly enforced/tested. ADR-38 also says dropped
*locations* are deactivated, not deleted — related but distinct.)

---

## B. Stock / Ledger (`/admin/stock`, `/admin/stock/opening`)

### B1. Rename "Stock" nav link to "Ledger"
The navigation entry currently reads **Stock**; owner wants **Ledger**.
- **Locations in code:** `components/shells/admin-shell.tsx:128`,
  `components/shells/mobile-nav-drawer.tsx:138` (both:
  `label: "Stock", href: "/admin/stock"`). Also the breadcrumb
  `app/admin/stock/opening/opening-client.tsx:226` ("Stock &
  Reconciliation") and the Financials tab label
  `financials-client.tsx:133` ("Stock Purchases") — decide whether those
  change too.
- The staff-shell also has a "Stock" entry
  (`components/layout/staff-shell-client.tsx:31,36`) — decide if the
  rename is Admin-only or app-wide.

### B2. How does Bulk Opening Stock work? Does the entry disappear after first save?
Owner observed that after the first entry the row/grid appears to go
away and asked whether that's intended. (Design intent per
`milestone-1-plan.md` / Session 7: one editable cell per product at its
home location; a re-submit for the same product/location/date is treated
as a **correction** server-side, and the row reflects "corrected" vs
"saved".) Needs a plain-language explanation confirmed against actual
behaviour — is the post-save disappearance correct, or a bug?

### B3. Ledger digit typography — what is it, and is it right?
Owner asks what font / weight is used for the numeric cells in the
ledger (e.g. under the **Closing** column), and whether that is an
industry-standard choice for a financial/stock table. Wants a
deliberate answer: tabular figures? mono? current weight? vs. what a
finance table should use.

### B4. "Shop goods" wording should be "Goods"
Somewhere the label reads **"Shop Goods"** where it should just say
**"Goods"**.
- **Locations in code:** `app/admin/stock/opening/opening-client.tsx:30`
  (`goods: "Shop Goods"`) and `:37` (`{ key: "goods", label: "Shop
  Goods" }`). Catalog itself uses "Goods". Decide the canonical term and
  make it consistent (Catalog tab, opening-stock tab, any filter).

### B5. Stock correction not usable — Edit button not clickable
Owner could not perform a correction; the cell/edit affordance did not
respond.
- **Verified in code:** corrections **are** wired
  (`app/admin/stock/stock-client.tsx` `onCellClick` →
  `<CorrectionDrawer>` → `POST /api/stock-movements/:id/correct`). A
  cell opens the drawer **only if** the column is in `CORRECTABLE`
  **and** exactly **one** movement sits behind that cell.
- Likely explanations to check live:
  1. **No movement data yet** — on a freshly-seeded DB with zero
     `StockMovement` rows, every cell has nothing to correct, so nothing
     is clickable. (Opening/Closing are **derived** columns and are not
     correctable by design.)
  2. **Aggregate cell** — a cell backed by >1 movement shows an inline
     "not designed yet — flagged for a design sprint" note instead of
     opening the drawer (known Session 7 flag).
  3. A genuine wiring/regression bug.
- **Action:** reproduce with real movements present (do B/Phase-2 of the
  plan first: opening stock + a purchase receipt), then confirm whether
  a single-movement correctable cell opens the drawer. If it still
  doesn't → real bug.

---

## C. Financials (`/admin/financials`, payment drawer)

### C1. Product dropdown in "Record Payment" must be searchable / filterable
The product `<Select>` in the record-payment drawer will hold **many**
products in production; a plain dropdown is unusable at that length.
Owner wants:
- type-to-filter / searchable select, **and/or**
- scrollable with a sensible max height, **and/or**
- a decision on whether to **limit which product kinds** appear here
  (e.g. only Ingredients + Goods for a stock purchase — a Dish is never
  purchased). Owner explicitly raised "should we limit the categories
  shown here?"
- Open UX question flagged by owner: what's the best pattern for this
  control at scale.

### C2. Rename "Cash at Hand" → "Cash" in the Paid From control
The payment drawer's **Paid From** options read **"Cash at Hand"**;
owner wants just **"Cash"**.
- **Locations in code:** `app/admin/financials/payment-drawer.tsx:26,28,32`
  (`PAID_FROM_LABELS`, the label→value map, and the reverse map) and
  `app/admin/financials/financials-client.tsx:34,40` (the same label used
  in the purchases table / display). The other option is "M-Pesa / Bank
  Till" — leave as-is unless told otherwise.

---

## D. Store Manager & Canteen (staff phase) — BLOCKED

### D1. Pervasive FORBIDDEN errors — could not test the staff flows at all
Owner logged in as Store Manager / Canteen Attendant and hit **FORBIDDEN
errors across the board**, blocking the entire Phase 3 walkthrough
(receive, issue, production, non-sale, transfer dispatch, accept/flag,
stock levels).

- **Not yet reproduced by me** (no server session available in this
  session to drive it). Candidate causes to investigate:
  1. **Actor has no location.** `lib/api/actor-location.ts`
     `resolveActorLocationId` returns the user's `Staff.locationId` via
     `User.staffId → Staff`. If the logged-in staff `User` row has a
     null/broken `staff` link (e.g. DB seeded before a schema change, or
     seed not re-run), every location-bound write fails with
     `"Your account is not assigned to a location."` (a FORBIDDEN).
  2. **Role not in the endpoint's allow-list.** `requireApiRoleIn` on
     each route — verify `store_manager` / `canteen_attendant` are in
     `STOCK_ROLES` for the routes the flows call.
  3. **`GET /api/stock-movements/outstanding` is Admin-only by design**
     (carried from Session 12) — a staff hub that calls it will get a
     403 for *that* call specifically; that one is expected, but it
     should degrade gracefully, not block the screen.
  4. Auth/session role claim not populated (`session.user.role`
     undefined) — check `lib/auth/config.ts` callbacks.
- **Action:** first thing next session — log in as `Store Manager`
  (PIN 1234), open the network tab, capture the exact failing
  request(s), response body, and which of the four causes above it is.
  This is the highest-priority item in the log — it blocks a third of
  the M1 surface from any manual verification.

---

## Cross-cutting questions raised

- **Q1 (from A3):** Were *all* overlay components built as floating
  modals? — **Answer: no.** Only Catalog's product drawer uses the
  floating `panel` variant; stock/financials/assets drawers already use
  the full-height `rail` variant. The kit intentionally ships both
  (ADR-37b).
- **Q2 (from B5):** Is correction wired into the ledger at all? —
  **Answer: yes, it's wired**; the gate is "exactly one movement behind
  a correctable column". Needs live re-test with real movement data.

---

## Not yet walked (plan phases remaining)

- **F3 Assets** (`/admin/assets`) — register, future-date rejection,
  in-place edit, condition transition, filters, friction delete, the
  audit-log-blocked delete state. Not reached.
- **Cross-cutting:** Cashier role sees no Admin/stock screens; buying
  price hidden from non-admin; `Africa/Nairobi` day-boundary spot check.
  Not reached.
</content>
</invoke>
