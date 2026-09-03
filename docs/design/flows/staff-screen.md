# `/admin/staff` — Staff & Pay screen

**Status:** Approved (Paper "Prosper Hotel" · page "M4 S8 — Staff & Pay",
desktop + mobile artboards for all three tabs, plus two drawers). Design
sprint M4 S8B. This doc is the written spec that accompanies the
artboards; the artboards are the pixel reference. Backend defined in
parallel by M4 S8A — see "Data-shape notes for S8A" at the end.

Borrows the `/admin/financials` (M3 S5/S7) layout language wholesale —
same shell, toolbar, `<Tabs>`, `<SimpleTable>` head/row treatment, dark
totals-footer, KPI caption style. Composed from `components/kit/*` only.

Related: ADR-56 (single admin header row), PRD §4.8.

---

## Shell & header (all tabs)

- ADR-56 header row owned by `<PageShell>`: title **"Staff & Pay"** ·
  (tab-specific control) · (tab-specific primary action) · account
  avatar.
- 240px `--nav-bg` sidebar, **Staff** nav item active. 1200px
  `--surface-page` body.
- **Roster:** no header control. Primary action **"Add staff"**
  (`--color-accent`).
- **Attendance:** header carries the `<DatePicker>` (single date,
  backdatable, capped at today). Secondary action **"Mark all present"**
  (bordered/tertiary — it is a reset, not the page's primary).
- **Pay & advances:** header carries a **month** picker
  (`September 2026` — a `<DatePicker>` / `<Select>` styled trigger; the
  kit has no month picker, see workaround note). Primary action
  **"Record advance / deduction"** (`--color-accent`).
- `<Tabs>` directly under the header: **Roster · Attendance · Pay &
  advances** (underline tabs, `--sp-7` gap, active = accent label +
  accent underline).

**Mobile:** 390px staff-style shell — status bar, hamburger header
("Staff & Pay" + avatar), then a horizontal **pill** tab-strip
(Roster / Attendance / Pay & advances; active = `--surface-selected`
fill + `--color-accent` border/label). Tab-specific controls move into a
row directly under the tab-strip. One full-width sticky bottom action
bar: "Add staff" / "Save attendance" / "Record advance / deduction".

---

## Tab 1 — Roster

**Desktop:** count line ("24 staff · 22 active") + a Location
`PillFilter` strip (All locations / Restaurant / Canteen / Store) in a
sub-toolbar, then a `<SimpleTable>`:

| Column | Notes |
|---|---|
| Name | grow, `--weight-medium` |
| Role | 150px |
| Location | 140px |
| Daily rate (KES) | 150px, right, `--font-mono` + `tabular-nums` |
| Status | 96px, plain colored text — `--color-success` "Active" / `--text-tertiary` "Inactive". **No chip** (design-principles §4.4). |
| _(chevron)_ | 24px trailing slot; whole row is the click target → edit drawer |

**Mobile:** count line, then one card per staff member — name +
"Role · Location" caption on the left; daily rate (mono) + status stacked
right-aligned; trailing chevron. Row opens the drawer.

### Add / edit staff drawer

Right-side `<Drawer>` (opaque `--surface-raised`). Header "Add staff" /
"Edit staff member" + subtitle = the staff name when editing. Fields
(top → bottom), each a `<FormField>`:

1. **Full name** — text input.
2. **Role** — `<Select>`.
3. **Location** — `<Select>`.
4. **Daily rate** — `<FormField>` with a `"KES"` start-adornment
   (`--font-mono`); helper "Used to compute gross pay as rate × days
   present."
5. **4-digit login PIN** — text input, `inputmode="numeric"`, mono with
   wide letter-spacing; helper **"The Admin sets this. Staff cannot
   change their own PIN."** The Admin creates the login; there is no
   self-service.
6. **Active** — `<ToggleSwitch>` (on = `--color-accent`); helper
   "Inactive staff are hidden from attendance and pay."

Footer: `Cancel` (tertiary) · `Save changes` / `Add staff`
(`--color-accent`).

---

## Tab 2 — Attendance  (optimised for ~15 seconds/day)

**One control does the work: a two-segment `<SegmentedControl>` per
staff member — `Present` / `Absent`, default `Present`.** The Admin only
touches the exceptions. No per-row save; one **"Save attendance"** action
(sticky bar on mobile; the header "Mark all present" is a bulk reset).

**Desktop:** summary strip ("22 present · 2 absent · 24 staff") +
Location `PillFilter`, then a `<SimpleTable>`:

| Column | Notes |
|---|---|
| Name | grow |
| Role | 160px |
| Location | 140px |
| Attendance | 188px — the `Present`/`Absent` `<SegmentedControl>`, active segment = shadow-lift + `--color-accent` label (design-principles §4.5) |

The date being edited is the header `<DatePicker>` (backdatable).

**Mobile:** a date row (date-picker trigger + "Mark all present") +
summary line, then one card per staff member — name + "Role · Location"
caption on the left, a compact `Present`/`Absent` `<SegmentedControl>`
(150px) on the right.

---

## Tab 3 — Pay & advances

Per staff member for the selected **month** (header month picker).

### The three money actions and how they reconcile

Pay is **derived** (`gross = daily rate × days present`, from Attendance)
— it is never a recorded "enter the pay" action. The three actions that
*are* recorded happen at different moments in the month and each touches
cash at most once:

| Action | When | Money ledger? | Effect |
|---|---|---|---|
| **Record advance** (header) | mid-month, owner gives cash early | ✅ posts that day | staff has already received part of their salary |
| **Record deduction** (header) | mid-month, a penalty | ❌ no cash moves | just lowers the eventual payout |
| **Pay out** (row / bulk) | payroll day | ✅ posts that day | hands over the **net**: `gross − advances − deductions` |

No double-count: the advance already left the till; payout pays only
what's still owed. `advance + net = gross` in total cash to that person.
**Handover shortfalls are not in this arithmetic** (see below).

Edge case for S8A: if `advances + deductions > gross`, net floors at
**0** and the remainder shows as "carried forward" — confirm S8A's rule.

**Desktop:** summary line ("September 2026 · 6 of 24 paid · KES 392,100
to pay"), a **"Pay out all unpaid"** bordered action, and the Location
`PillFilter` in the sub-toolbar, then a `<SimpleTable>`:

| Column | Notes |
|---|---|
| Staff member | grow — name + "Role · Location" caption |
| Days | 64px, right, mono |
| Daily rate | 92px, right, mono |
| Gross pay | 108px, right, mono, `--text-primary` |
| Advances | 100px, right, mono, `--text-secondary` (shown as `− 5,000.00` / `—`) |
| Deductions | 100px, right, mono, `--text-secondary` |
| **Net pay** | 116px, right, mono, **`--weight-semibold`** — the reconciled bottom line |
| **Payout** | 150px — `Unpaid` (`--text-tertiary`) + a small bordered **"Pay out"** button, OR `Paid · <date>` in `--color-success` (no button). Plain text status, no chip. |

Then a **dark totals-footer row** (`--color-gray-900`, mono, semibold
Gross & Net) — same language as the Financials sticky footer — with a
**paid/unpaid split** in the Payout slot ("6 of 24 paid" /
"392,100.00 to pay").

`gross = daily rate × days present`.
`net = gross − advances − deductions`. **Nothing else.**

### Pay out drawer

Opened from a row's "Pay out" button (or "Pay out all unpaid" → a
batch variant). Right-side `<Drawer>`. Header "Pay out salary" +
subtitle "<name> · <month>". Body:

1. **Calc block** — a bordered mini-table that shows the reconciliation
   explicitly: `Gross pay · N days × rate` → `− Advances already paid in
   cash` → `− Deductions` → a `--surface-subtle` **"Net to pay now"** row
   with the figure at `--text-h1`. This is the single place the owner
   sees *why* the payout is smaller than gross.
2. **Pay from** — `<Select>` Cash / M-Pesa · Bank; helper "Reduces this
   account's balance in Financials."
3. **Payout date** — date input; helper "Defaults to today. Posts to the
   money ledger on this date."

Footer: `Cancel` · `Confirm payout` (`--color-accent`).

### Handover shortfalls — a SEPARATE block, never a pay column

Below the totals footer, after a deliberate gap, a **distinct bordered
card** on `--surface-subtle` with a `--color-warning-bg` border and a
`--color-warning` warning-triangle icon:

- Title **"Handover shortfalls this month"**.
- Caption (must stay): *"Shown here for follow-up only. Shortfalls are
  never deducted from pay and are not part of the Net pay figures above
  — settle them separately with the staff member."*
- Rows are a **different shape** from the pay table — name + "date ·
  reason note" caption + a single `--color-warning` mono amount. There is
  deliberately **no column that lines up with Advances / Deductions**, so
  a shortfall cannot be misread as a deduction (same class of problem as
  the non-sale-consumption caption on Financials, ADR-55).
- Foot line: "N open shortfalls · tracked outside payroll" + total.

**Mobile:** summary line with the paid split, a full-width **"Pay out
all unpaid"** bordered button, then one card per staff member — name +
net pay (bold mono) on the top row, a `"26 days × 800.00 = gross
20,800.00 · advances −5,000.00 · deductions −500.00"` breakdown caption,
and a status row: `Unpaid` + a compact **"Pay out"** button, or
`Paid · <date>` in `--color-success`. Then the same separated **Handover
shortfalls** warning-card, stacked. The sticky bottom bar stays
"Record advance / deduction".

### Record advance / deduction drawer

(The header primary action — unchanged; this is the mid-month
Moment 1 / Moment 2 action, distinct from the payroll-day Pay out
drawer above.)

Right-side `<Drawer>`. Header "Record advance / deduction", subtitle
"Netted off <Month> pay". Fields:

1. **Staff member** — `<Select>`.
2. **Type** — `<SegmentedControl>` `Advance` / `Deduction`.
3. **Amount** — `<FormField>` + `"KES"` adornment; helper "Subtracted
   from this month's net pay for this staff member."
4. **Date** — date input; helper "Defaults to today. Backdate within the
   open month if needed."
5. **Note** — text input.

Footer: `Cancel` · `Save` (`--color-accent`).

---

## What the kit couldn't express, and the workaround

- **Month picker in the header (Pay tab).** The kit `<DatePicker>` is
  single-date only; there is no month picker (same gap the Financials
  redesign hit). Drawn as a `<DatePicker>`-styled trigger showing
  `"September 2026"`. Build session: reuse the Financials approach
  (a trigger that opens a month list) — do **not** add a kit component
  without owner sign-off.
- **Attendance `Present`/`Absent` control.** Used `<SegmentedControl>`
  as-is (two segments). No new component. Its ~188px desktop / 150px
  mobile fixed width is a screen-level layout choice, not a kit change.
- **Shortfalls warning-card.** Composed from a plain frame + the
  warning-triangle icon + tokens (`--color-warning`,
  `--color-warning-bg`, `--surface-subtle`). Not the
  `Calculated Impact` banner (that's for previewing an edit's numeric
  consequence in a drawer) — this is a static, standing list. No new
  component.
- Everything else is `<PageShell>` / `<Tabs>` / `<SimpleTable>` /
  `<Drawer>` / `<FormField>` / `<Select>` / `<ToggleSwitch>` /
  `<SegmentedControl>` / `<DatePicker>` / `<PillFilter>` straight from
  the frozen kit.

---

## Data-shape notes for S8A to confirm

The design assumes these are available from the API; S8A is defining it
in parallel, so flag anything the endpoints won't return:

1. **Staff record**: `name`, `role` (free string or enum?), `locationId`
   / location name, `dailyRate` (Decimal), `active` (bool), `pin`
   (4 digits, Admin-set, write-only). Design shows role as a free-ish
   label — confirm whether it's a fixed enum (Cashier / Cook / Waiter /
   Store Manager / Canteen Attendant / Cleaner …) or free text.
2. **Attendance**: per `(staffId, businessDate)` a `present` bool that
   **defaults to true** when no row exists — the screen renders every
   active staff member as Present unless there's an explicit absence
   row. Backdatable (`businessDate` in `Africa/Nairobi`, `lib/time`).
   Confirm the default-present semantics live server-side (derive), not
   a nightly job that writes rows.
3. **Monthly pay per staff** for a `{month}`:
   `daysPresent` (count of present days in the month),
   `dailyRate` (as of when? — design assumes current rate; confirm
   there's no historical-rate requirement for M4),
   `grossPay = dailyRate × daysPresent`,
   `advancesTotal`, `deductionsTotal` (sums of the month's advance /
   deduction entries),
   `netPay = grossPay − advancesTotal − deductionsTotal`,
   plus a **payout status**: `paid` (bool) + `paidDate` + `paidFrom`
   ('cash' | 'mpesa') when paid. Confirm net floors at 0 and how a
   carry-forward (advances+deductions > gross) is represented.
4. **Advance / deduction entry**: `staffId`, `type` ('advance' |
   'deduction'), `amount` (Decimal), `note`, `date` (business date,
   within the open month). Append-only; corrections are new rows
   (CONVENTIONS §4). **An `advance` posts to the money ledger on its
   date; a `deduction` does not.** Confirm S8A wires advances into the
   money ledger (like an expense) and leaves deductions ledger-neutral.

4b. **Payout event**: `staffId`, `month`, `amount` (= `netPay` at time
   of payout), `paidFrom` ('cash' | 'mpesa'), `date`. Posts to the
   money ledger on its date (reduces the chosen account). One per
   staff-month; "Pay out all unpaid" creates one per still-unpaid staff
   member. Confirm this is a first-class recorded event in the money
   ledger — the design assumes liquidity in Financials drops by the net
   on payout, and by each advance when it's given.
5. **Handover shortfalls per staff for the month**: a list of
   `{ staffId, date, amount, note }` from the handovers module, **plus a
   month total**. These are READ-ONLY here and **must not** be included
   in any pay figure — confirm `getMonthlyPay` does not net them and
   that the shortfalls list is a separate call / field.
6. **Roster counts**: `total`, `active` for the count line; attendance
   summary `present` / `absent` / `total` for the selected date.
7. **Net-pay month total** for the dark totals-footer (sum of every
   staff member's `netPay`), plus gross / advances / deductions totals.
