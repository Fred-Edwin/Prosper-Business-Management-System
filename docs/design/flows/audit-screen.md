# `/admin/audit` — Audit trail screen

**Status:** Approved (Paper "Prosper Hotel" · page "M5 — Dashboard &
Audit", `Audit trail — desktop [M5]` + `Audit trail — mobile [M5]`).
Design Sprint M5 Session 12. This doc is the written spec that
accompanies the artboards; the artboards are the pixel reference.

Borrows the `/admin/financials` (M3 S5/S7) table language wholesale —
`<FilterToolbar>` + `<SimpleTable>` head/row, square corners, plain
coloured status text (no chips), same `--color-info` uppercase column
headers. Composed from `components/kit/*` only.

Related: ADR-25 (one `AuditLog` row per line, `correlationId` for
batches), ADR-56 (single admin header row).

---

## The screen's job

A searchable log of **who did what**: actor · action · what was touched ·
when · what changed. Admin-only. This screen only grows, so it is
**paginated** (not infinite scroll) and **defaults to a significant
subset** rather than every row.

---

## Structure (top → bottom)

### Header row (ADR-56)
Title **"Audit trail"** · account avatar. No actions.

### FilterToolbar
A `<FilterToolbar>` row (`components/kit/filter-toolbar.tsx`) with four
labelled-dropdown controls plus one toggle:

| Control | Kind | Values |
|---|---|---|
| Date | `date` (range) | presets: Today / Last 7 days / Last 30 days / This month / Custom. **Default: Last 7 days.** |
| Actor | `select` | All · one option per `User` who has ≥1 audit row |
| Action | `select` | All · Created · Corrected · Deleted · Day closed · Day reopened · Signed in |
| Entity | `select` | All · Order · Stock movement · Stock count · Handover · Receipt · Expense · Owner transaction · Repayment · Staff · Staff payout · Location · Product · Asset · Customer · Day |
| **Show everything** | `ToggleSwitch` | **Off by default** — the list shows the *significant subset*. On → every row. |

Below the controls, a **result line**: when the toggle is off,
*"Showing significant changes — corrections, deletions, day close &
reopen, staff & location changes, payouts · N entries"*; when on,
*"Showing all activity · N entries"*. `aria-live="polite"`.

**The significant subset** = `AuditLog` rows where `action IN (correct,
soft_delete, hard_delete, day_close, day_reopen)` **OR**
`entityType IN (staff, location, staff_payout)`. Everything else (the
high-volume `create` rows for orders / stock movements / stock counts) is
hidden until "Show everything" is on. Session 11's report is the
authority on the exact entity/action set — **the build session must
confirm this list against the real `AuditAction` enum and
`entityType` values** (the enum today is `create | correct | soft_delete
| hard_delete | login | day_close | day_reopen` — there is **no `edit` /
`update`**; a staff-rate change is `correct`).

**Mobile:** the four dropdowns become a horizontal-scroll chip row; the
"Show everything" toggle + result line sit on their own row below.

### The table
A `<SimpleTable>`. Columns:

| Column | Width | Notes |
|---|---|---|
| When | 150px | `--font-mono` `--text-caption`, `--text-secondary`. "3 Sep, 14:22" (Africa/Nairobi). |
| Actor | 140px | plain name text (no avatar — dense-table rule, design-principles §4.2). |
| Action | 110px | plain coloured text, **no chip**: `Corrected` → `--color-warning`; `Deleted` → `--color-danger`; `Created` / `Updated` / `Day closed` / `Day reopened` / `Signed in` → `--text-secondary`. |
| What was touched | 200px | `"<Entity type> · <name>"`. **`--color-accent` and a link when the record still exists**; plain `--text-secondary` when it does not (a closed business day; a hard-deleted asset shown by id). |
| Change | grow | the one-line human summary (see below). |
| _(chevron)_ | 32px | present only on rows that have an expandable detail; opens/closes the inline detail block. Rows with a trivial change (e.g. `day_close`) have no chevron. |

**Row hover / click:** a row with a chevron is a `.kit-row` (hover tint,
keyboard-operable); the whole row toggles the expansion.

### The value-change treatment (the hard part)

`oldValue` / `newValue` are free-form JSON whose shape varies by action.
The row renders a **one-line human summary**; the expansion renders a
**bordered mini-table**. No generic deep-diff viewer.

**One-line summary (always in the row):**

- **Single scalar field changed** → `"Quantity 5.00 → 3.00"`,
  `"Daily rate 750.00 → 800.00"`. The field label is title-cased from
  the JSON key; the "was" value is `--text-secondary` (mono for numbers),
  the "now" value is `--text-primary` `--weight-medium`.
- **A `day_close` / `day_reopen`** → prose: `"Sealed the day — staff
  entries locked"` / `"Reopened the day"`.
- **A `create`** (only visible with "Show everything" on) → prose:
  `"Paid KES 18,600.00 from Cash · Sept pay"`, `"Recorded sale · KES
  1,850.00"` — a short human sentence built from the `newValue` fields
  the build session picks per entity type.
- **Multiple fields changed** → `"3 fields changed — total, payment
  method, note"` (list up to ~3 key names, then "…").
- **Fallback — `oldValue`/`newValue` don't resolve to readable
  field/scalar pairs** (raw ids, nested objects) → `"Record removed —
  expand for the deleted values"` / `"Record changed — expand for
  detail"`.

**Expanded detail (bordered mini-table, inset `--sp-8` from the row's
left edge, on `--surface-subtle`):**

A `<div>` table, `--radius-md`, `--border-subtle`:

- Header row: `FIELD` · `WAS` · `NOW` (10px uppercase `--text-tertiary`,
  `WAS`/`NOW` right-aligned).
- One row per changed field: label left (`--text-secondary`,
  `--text-sm`); "was" value right-aligned `--text-tertiary`; "now" value
  right-aligned `--text-primary` `--weight-medium`. Numeric values use
  `--font-mono`; text/enum values use the UI font and are **humanised**
  (`"mpesa"` → `M-Pesa`, `null` → `—`).
- **Fallback inside the expansion** (unresolvable JSON): drop the
  FIELD/WAS/NOW header and render the raw `oldValue` / `newValue` as two
  `--font-mono` `--text-caption` blocks labelled "Before" / "After", the
  entity type + id above them. Never a coloured pretty-diff.

**Mobile:** the row becomes a card (action + entity + timestamp on the
first line, summary below, actor below that). The expansion is the same
bordered box but one line per field: `Label` left, `was → now`
right-aligned.

### Which entity types link, and to what

The build session confirms against Session 11's resolution report. The
design assumes:

| Entity type | Resolves to a name? | Row links to |
|---|---|---|
| Order | ✅ order number | the order in Sales |
| Stock movement | ✅ product name | the Stock ledger (that product/day) |
| Stock count | ✅ product name | Stock ledger |
| Handover / Receipt | ✅ location + date | Handovers reconciliation for that date |
| Expense | ✅ category | Financials → Expenses tab |
| Owner transaction | ✅ type + date | Financials → Owner Draws tab |
| Repayment | ✅ customer name | that customer |
| Staff / Staff payout | ✅ staff name | `/admin/staff` (that member) |
| Location | ✅ location name | `/admin/catalog` locations |
| Product | ✅ product name | `/admin/catalog` |
| Asset | ⚠️ name **if still present**, else raw id | Assets register (or no link if hard-deleted) |
| Customer | ✅ customer name | that customer |
| Day (`day_close`/`day_reopen`) | n/a — it's a date | no link (the date is the identity) |

A row whose target has been hard-deleted shows the entity type + a
truncated id in `--font-mono` `--text-micro`, `--text-secondary`, **no
link**.

### Pagination
A footer row: **"1–50 of 142"** (left) · **Previous** / **Page N of M** /
**Next** (right). Page size 50. `Previous` is disabled (`--text-disabled`)
on page 1; `Next` disabled on the last page. Not infinite scroll — this
table only grows.

**Mobile:** `"1–50 of 142"` left, `Prev` / `1 / 3` / `Next` right, on one
row below the list.

---

## What the kit couldn't express, and the workaround

- **The expanded before/after mini-table** — composed from a plain
  bordered `<div>` grid + tokens, in the screen file. It re-uses the
  visual language of the Financials profit stack and the staff pay-out
  calc block (bordered box, hairline row dividers, right-aligned mono
  values). **Not** a new kit component; **not** a deep-diff viewer.
- Everything else is `<PageShell>` / `<FilterToolbar>` / `<SimpleTable>` /
  `<ToggleSwitch>` / `<Select>` / `<DatePicker>` / `<Button>` straight
  from the frozen kit.

---

## Data-shape notes for the build session to confirm against `docs/API.md`

**The audit-trail backend does not exist yet.** Today
`GET /api/audit-log` takes `?entity_type=&entity_id=&user_id=&from=&to=`
and returns raw `AuditLog` rows (`id, userId, action, entityType,
entityId, oldValue, newValue, occurredAt`) with **no pagination, no
significant-subset filter, and no name resolution**. There is no
`listAuditLog` domain function (only `listDayCloses`). The build session
must add:

1. **Pagination** — `?page=&limit=` (default `limit=50`), returning
   `{ data: rows, page, pageSize, total }`.
2. **The `significant` filter** — `?significant=true` (the screen's
   default) → server-side restricts to the action/entity set above.
   `?significant=false` (Show everything) → no restriction.
3. **Actor + entity name resolution** — each returned row carries
   `actorName` and a resolved `entityLabel` + `entityHref` (null when
   the target no longer exists). The mapping of `entityType` →
   how-to-resolve is the meat of this; base it on Session 11's report
   and the table above.
4. **The actor dropdown's option list** — a small
   `GET /api/audit-log/actors` (or a field on the main response) listing
   `{ id, name }` for every `User` with ≥1 row.
5. **Action label mapping** — `correct` → "Corrected", `create` →
   "Created", `soft_delete` / `hard_delete` → "Deleted", `day_close` →
   "Day closed", `day_reopen` → "Day reopened", `login` → "Signed in".
   A staff-rate / expense-amount change is `correct`, **not** a distinct
   `update` action (the enum has no `update`).
6. **The one-line summary + the resolved field pairs** — the domain
   should return, per row, a `summary` string and a
   `fields: [{ label, was, now, kind: "number" | "text" }]` array
   (empty for trivial rows; the raw `oldValue`/`newValue` still ship for
   the fallback rendering). Deciding `summary` and `fields` from the
   heterogeneous JSON is the build session's core task — keep the
   readable-common-case logic per entity type, and fall back to
   raw-JSON blocks when a row doesn't fit.

All Admin-only. Timestamps rendered `Africa/Nairobi` (`lib/time`).

---

## Assumptions the build session should verify

- The route is `GET /api/audit-log` (extended) and the screen lives at
  `/admin/audit` — **confirm the nav slug**; the sidebar artboard labels
  it "Audit trail" under a "Reporting" group.
- Batch rows sharing a `correlationId` (ADR-25) — the design shows them
  as individual rows. Confirm whether the build should collapse a
  `batch_*` correlation into one summary row ("Issued 6 ingredients")
  with the lines in the expansion, or leave them separate. **Flag to the
  owner** — this was not decided in M5.
- `login` rows: included in "Show everything" only, never in the
  significant subset. Confirm the owner wants sign-ins visible at all
  (they may be noise).
- The Dashboard's "Correction today →" link lands here with
  `?action=correct&from=<today>&to=<today>` — the filter parsing must
  accept those.
