# Feature scope — Admin handover entry, receipt on any open day, multi-day worksheet

**Status:** scoped, partly built. Raised 2026-09-09 from client feedback.
One feature branch, four connected changes:

1. **Back-entry** — Admin records a handover the staff member never
   declared, dated to the day it belongs to.
2. **Receipt gate fix** — Admin can record *receipt* of a handover on any
   day that isn't closed, not only today.
3. **Multi-day worksheet** — Financials → Handovers honours a real date
   range (This week / This month), instead of silently showing the
   range's end day only.
4. **Per-row Date column** — each row states its own reconciled day.
   **(DONE — shipped ahead of the rest, see §7.)**

Background invariant that makes all of this small: a handover and its
receipt write **no money-ledger row** (ADR-53) — custody records, not
revenue. No `MoneyMovement`, no ADR-72 ledger-correction obligation. The
ADR-72 pairing that applies is create ↔ correct, and `correctHandover` /
`correctReceipt` already exist.

---

## 1. Why the gaps exist today

**Back-entry.** `declareHandover` is the only create path for a
`Handover`, and it is locked to `cashier` / `canteen_attendant`, today's
date (`assertStaffDateIsToday`), and an open day. When staff forget,
there is no in-app way in — hence the 2026-09-08 raw-SQL insert.

**Receipt gate.** `recordReceipt` (domain) and `POST
/api/handovers/:id/receive` (route) gate on **`assertDayOpen` only** —
there is **no today restriction**. The block is purely
`handovers-tab.tsx` hiding the "Record receipt" button when `!isToday`
(`ReconRow` / `MobileHandoverCard`). So a handover on any open past day
is stuck at "Not received" with no affordance.

**Multi-day.** `getReconciliation(date)` and the endpoint take one
business date. `transactions-tab.tsx` passes `date={to}` — the range's
end day — and `handovers-tab.tsx` captions "this worksheet shows {end
day}". For This week / This month, `to` is a **future** day with no
handovers, so the table reads "No handovers for this day" even though the
week is full of them.

---

## 2. Domain changes (`lib/domain/handovers`)

### 2a. `recordHandoverForDate` (new — `record-handover-for-date.ts`)

```ts
export type RecordHandoverForDateInput = {
  staffId: string;
  locationId: string;      // must equal the staff member's location
  cashDeclared: string;    // decimal string >= 0
  mpesaDeclared: string;
  businessDate: string;    // YYYY-MM-DD (Africa/Nairobi)
};
export async function recordHandoverForDate(
  input: RecordHandoverForDateInput,
  actor: HandoverActor,    // role must be "admin" — asserted here + at route
): Promise<HandoverView>;
```

In the transaction:

1. Assert `actor.role === "admin"` → `FORBIDDEN` otherwise (defence in
   depth; the route also guards).
2. Load the `Staff` row by `staffId`; `VALIDATION_ERROR` if
   `input.locationId` ≠ their `locationId` (a handover is always for the
   staff member's own location).
3. `occurredAt = businessDateStartUtc(businessDate)` **+ 9h** → noon
   Nairobi, unambiguously inside the day. (Matches the SQL script and the
   expenses back-entry convention.)
4. **Day-close rule, role-aware** — reuse `isDayClosed`:
   - open day → proceed.
   - closed day → proceed **only** because `actor` is admin (already
     asserted in step 1). Mirrors `assertActorMayCorrectOnDate`'s
     closed-day branch. Do **not** call `assertDayOpen` (it would block
     the closed-day case entirely).
5. `CONFLICT` if an **original** (`correctsHandoverId is null`) handover
   already exists for this `staffId` in that Nairobi day —
   "A handover for this staff member on {date} already exists — correct
   it instead."
6. Create the `Handover` (`correctsHandoverId: null`).
7. `AuditLog` `action: "create"`, `entityType: "handover"`, `newValue`
   with the figures + `locationId` + `"backEntry": true` +
   `recordedByRole`, `occurredAt` = the handover's `occurredAt`.
8. Return `toHandoverView(...)`.

Export from `index.ts`. No new `correctX` — `correctHandover` /
`recordReceipt` already accept any original row.

### 2b. `recordReceipt` — no domain change

It already permits any open day. The fix is entirely UI (§4b). If we
later want Admin to receive on a *closed* day too, that's a separate
change (swap `assertDayOpen` for a role-aware gate) — **out of scope
here**; closed days are rare and reopening is the intended path.

### 2c. `getReconciliation` — accept a range (`get-reconciliation.ts`)

Add an overload / second param:

```ts
export async function getReconciliation(
  range: { from: string; to: string },  // inclusive YYYY-MM-DD
): Promise<ReconciliationView>;          // existing single-date form kept
```

- `where.occurredAt` becomes `gte businessDateStartUtc(from)` ..
  `lt businessDateEndUtc(to)`.
- Each `ReconciliationRow` already carries `occurredAt` — the screen
  groups by day. `totals` stays a single grand total across the range
  (the screen renders per-day sub-totals from the rows; a range-wide
  total is still useful).
- Keep `date` in the return shape (set to `to` for a range) for
  backwards compat, **or** widen `ReconciliationView` with
  `from`/`to` — prefer widening; update `types.ts`.
- The existing single-date signature stays valid (delegates to the
  range form with `from === to`).

Tests: rows from three different days in one call; correct bucketing;
totals sum across the range; a day with no handover contributes nothing.

---

## 3. API surface (`app/api/handovers`)

### 3a. `POST /api/handovers/backdated` (new)

- `requireApiRoleIn(["admin"])`.
- `recordHandoverForDateSchema` in `lib/validation/handovers.ts`:
  ```ts
  export const recordHandoverForDateSchema = z.object({
    staffId: z.string().min(1),
    locationId: z.string().min(1),
    cashDeclared: decimalString,
    mpesaDeclared: decimalString,
    businessDate,   // regex already in this file
  });
  ```
- Thin handler: parse → Zod → role → `recordHandoverForDate` →
  `ok(view, { status: 201 })`; `DomainError` → `fail`.

### 3b. `GET /api/handovers/reconciliation` — accept `from` / `to`

- `reconciliationQuerySchema`: allow **either** `date` **or**
  `from` + `to` (a `z.union` / refine). `date` alone keeps working.
- Route passes the range (or single date) to `getReconciliation`.

Document both in `docs/API.md`.

---

## 4. Frontend (`app/admin/financials`)

### 4a. "Record a handover" entry (Handovers tab)

- Secondary **"Record a handover"** button in the tab header (Admin-only;
  the tab already is). New `record-handover-drawer.tsx`, composed from the
  frozen kit following `handover-correction-drawer.tsx` +
  `expenses-tab.tsx`'s entry drawer.
- Fields: **Staff member** select (cashiers + canteen attendants; picking
  one fills location) · **Business date** (defaults to the worksheet's
  focused day; not in the future) · **Cash declared** · **M-Pesa
  declared** (decimal, same validation as the correction drawer).
- Submit → `useHandovers.recordBackdated(args)` →
  `POST /api/handovers/backdated` → `refresh()`; if the new row's day is
  outside the visible range, toast "Recorded for {date} — widen the date
  range to see it."
- Errors: `CONFLICT` → inline; field `VALIDATION_ERROR` → on the field.

### 4b. Receipt on any open day

- `handovers-tab.tsx`: the "Record receipt" affordance currently shows
  only when `isToday`. Change the gate to **"the row's day is not
  closed"**. The worksheet doesn't know per-day closed state today, so:
  - add `closedDates: string[]` (or a `Set`) to `ReconciliationView` —
    `getReconciliation` already touches `DayClose`-adjacent logic via the
    guard helpers; have it return which days in range are closed. Cheap:
    one `dayClose.findMany({ where: { date: { in daysInRange } } })`.
  - `ReconRow` / `MobileHandoverCard`: `canReceive = !row.dayClosed`
    (derive per row from `closedDates` + the row's Nairobi day), replacing
    the `isToday` prop for the receipt button. Keep `isToday` only if
    something else needs it (it doesn't — remove it and the
    `isRangeToday` plumbing in `transactions-tab.tsx`).
  - A closed-day row shows "Day closed — reopen to receive" instead of
    "Not received".
- Domain/route already allow it — no change there for the open-day case.

### 4c. Multi-day worksheet

- `transactions-tab.tsx`: stop clamping to `to`. Pass `from` + `to`:
  ```tsx
  <HandoversView from={from} to={to} />
  ```
  Drop the "single-DAY worksheet" comment + `isRangeToday`.
- `use-handovers.ts` `useReconciliation`: take `{ from, to }`, call
  `GET /api/handovers/reconciliation?from=&to=`.
- `handovers-tab.tsx`:
  - Props become `{ from, to }`. Remove the `isMultiDayRange` "end day
    only" caption entirely — the worksheet now genuinely covers the range.
  - **Group rows by Nairobi day.** A day sub-header row
    ("Sat 6 Sep — 2 handovers · 1 awaiting") + that day's rows + a
    per-day sub-totals row. The existing grand `TotalsRow` stays at the
    bottom as the range total.
  - Empty range → EmptyState "No handovers between {from} and {to}".
  - Mobile: same grouping, day sub-headers between card clusters.
- The per-row **Date column (§7) stays** — it's still the quickest scan
  inside a day group and essential when a back-entry lands mid-range.

---

## 5. Roles touched

| Role | Change |
|---|---|
| Admin | "Record a handover" action; can receive on any open past day; worksheet spans a range |
| Cashier / Canteen Attendant | none |
| Everyone | Date column (shipped); day-grouped worksheet |

---

## 6. Ship checklist (new-feature loop, `docs/maintenance.md`)

- [ ] `recordHandoverForDate` + tests
- [ ] `getReconciliation` range form + `closedDates` + tests
- [ ] `recordHandoverForDateSchema`; `reconciliationQuerySchema` range;
      `ReconciliationView` widened (`types.ts`)
- [ ] `POST /api/handovers/backdated` (thin); reconciliation route range;
      `docs/API.md`
- [ ] `record-handover-drawer.tsx` + `recordBackdated` in `use-handovers.ts`
- [ ] receipt gate → per-row closed-day, remove `isToday` plumbing
- [ ] multi-day grouping in `handovers-tab.tsx` (desktop + mobile),
      `useReconciliation({from,to})`, `transactions-tab.tsx` passes range
- [x] per-row Date column (§7)
- [ ] screen tests (back-entry drawer; receive on a past open day;
      multi-day grouping; closed-day row) + Paper visual check
- [ ] `pnpm test` + `pnpm typecheck` + `pnpm build` green
- [ ] `docs/PROGRESS.md`; **ADR-79** in `docs/DECISIONS.md` (Admin
      back-dated handover + receipt-on-any-open-day + range worksheet;
      extends ADR-53)

---

## 7. Shipped ahead: per-row Date column

`app/admin/financials/handovers-tab.tsx` + its screen test. Adds a
`Date` column (first data column) to the desktop grouped table and the
mobile card sub-line, rendering each row's `occurredAt` as its
Africa/Nairobi business day (`"6 Sep"`, with year when it differs from
the current one). `nairobiDate()` helper; `COL.date` (92px); table
`min-w` 980 → 1072; Totals row gets a blank date cell. No domain / API /
type change — the data was already on `ReconciliationRow.occurredAt`.
This is the groundwork the day-grouped multi-day worksheet (§4c) builds
on.
