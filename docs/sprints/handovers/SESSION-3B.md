# HANDOVER — Session 3b · Developer · Admin mobile views + Customers filter-toolbar

**Paste this whole file as your first message in a fresh session.**
Branch: `feat/m2-3b-admin-mobile` **off `qa/m2-session-7`** (or `main` if
B2 is already merged — confirm with the human).
Runs concurrently with 3a / 3-DESIGN / 3-DOMAIN.

---

## 0. Context / urgency

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), **every screen matching Paper**. You are the **Developer this
session** (`CLAUDE.md`): **compose** approved Paper screens from the
**proven kit**, wire to the **already-built domain**, gate with screen
specs. **No new UI/UX decisions** (flag instead). No kit changes. No
Milestone 3.

**The job:** three Admin screens have **no mobile view** (they render one
desktop layout at every width) — Ledger, Financials, Assets.

> **AMENDMENT (2026-08-31): §3.4 (A1 Customers filter-toolbar
> conversion) is REMOVED from this session.** The filter toolbar is now a
> shared kit component (`FilterToolbar`), and a dedicated session (3e)
> converts every screen's filter — Customers included — onto it in one
> uniform pass. **Do not touch `app/admin/customers/*` this session.**
> Your scope is §3.1 + §3.2 + §3.3 only. Ignore §3.4 below and its
> `admin-customers.screen.test.tsx` change.

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. `docs/sprints/milestone-2-plan.md` §3 contracts, §8 guardrails, §7
   table (**stale** — orchestrator re-baselines, not you).
2. `docs/CONVENTIONS.md` — folder structure, error shape, §6.
3. `docs/design/export-workflow.md` — screenshot → compose from kit →
   screenshot-diff → screen spec.
4. `docs/design/design-principles.md` §9 (ENFORCED), §4 (tables
   square-cornered), the responsive/theme rules.
5. **`docs/design/fidelity-audit-m1.md`** — your primary spec. Read the
   sections:
   - **"Admin Financials — mobile (Task 2 + Task 3)"** — the 10 numbered
     deltas.
   - **"Admin Stock — Ledger mobile (Task 5 row)"**.
   - (Assets mobile deltas: the audit has the Financials + Ledger detail;
     Assets follows the same table→stacked-row collapse — the 6 `[M2-A2]`
     artboards are the spec.)
6. `docs/design/flows/financials-reconciliation-flow.md` — the
   Reconciliation section's card states (actionable / awaiting / all-clear).
7. `docs/sprints/handovers/_ORCHESTRATOR-STATE.md` — the 3b bullet.

## 2. Paper artboards (file "Prosper Hotel" `01M0EZ7TAHZM26KBMWNYT0928X`, page `1-0`)

`get_guide({ topic: "paper-mcp-instructions" })` once first. Use
`get_screenshot` / `get_computed_styles` / `get_jsx` for exact values.

- **Admin Financials mobile** — `[M2-A2]` set:
  `Admin Financials — mobile, populated / empty / loading / error /
  payment sheet`.
- **Admin Assets mobile** — `[M2-A2]` set: 6 artboards —
  `populated / empty / loading / error / drawer sheet / delete dialog`.
- **Admin Ledger mobile** — existing `8Q4-0` "Admin Stock — Mobile" is
  the collapse-pattern reference (the audit's Ledger section lists the
  deltas from the current build).
- **A1 Customers** — the 7 artboards A2 converted to the
  toggle-in-toolbar idiom (the "Has balance" pill → a labelled toggle in
  the filter toolbar). `EPJ-0` is the mobile Customers reference (already
  good — you're only changing the filter control).
- Reference patterns: `8Q4-0` (table→stacked-row collapse, scrollable
  chip row, sticky bottom bar), `EPJ-0` (stacked-row Customers).

## 3. Scope

### 3.1 Admin Financials — add a mobile branch

`app/admin/financials/financials-client.tsx` (+ `payment-drawer.tsx`).
Follow the audit's 10 deltas exactly. Summary:
- Add a `< --bp-md` branch (mirror `stock-client.tsx`'s `hidden md:flex`
  / `flex md:hidden` split). Keep current markup as the `md:` branch.
- KPI strip → **dark 2×2 grid** (`--nav-bg` bg, `--nav-border`
  hairlines), stays visually present but unwired (`—` / "M3" — ADR-36
  D-FIN).
- Transaction tabs → **horizontally-scrollable chip row** (same pattern
  `8Q4-0` uses — do not invent one).
- Transactions table → **stacked-row cards** (top row: vendor + amount;
  meta row: `Product qty · Destination · Paid-from · date`; status row:
  `• {delivery status}` in semantic colour + right-aligned `Edit` link).
- Reconciled-outflows footer → stacked dark block.
- Reconciliation section → **stacked cards** per
  `financials-reconciliation-flow.md`: actionable ("Received, no
  payment") card has a full-width `Record payment` primary button inside
  it; awaiting-delivery card amber, no action; all-clear = the single
  line.
- **Sticky bottom `+ Record Payment` bar** (`8Q4-0` sticky-bar pattern)
  — the desktop toolbar action has no mobile home. Distinct from the
  in-card `Record payment` button (which is pre-scoped to its delivery).
- Payment drawer on mobile → **full-height bottom sheet** (kit `<Drawer>`
  mobile behaviour) with the same fields + sticky
  `Cancel` / `Disburse & register delivery` footer.
- **Section rhythm** between transactions and Reconciliation
  (`margin-top: --sp-8`, an 8px `--surface-subtle` divider band, header
  `padding-top: --sp-6`).
- States: populated / empty / loading / error — all four.

### 3.2 Admin Assets — add a mobile branch

`app/admin/assets/*`. Same table→stacked-row collapse as Financials/
`8Q4-0`/`EPJ-0`. Asset drawer (`8JO-0`) and delete dialog (`8IV-0`) →
mobile bottom-sheet behaviour per kit. States: populated / empty /
loading / error + the drawer-sheet and delete-dialog artboards. No new
domain — the assets API/hook already exist.

### 3.3 Admin Ledger — fix the mobile view

The `/admin/stock` (or the stock-ledger part of `/admin/financials`)
mobile view is poor. Match `8Q4-0` per the audit's Ledger section:
table → stacked rows, the scrollable location chip row
(Store/Restaurant/Canteen), the sticky bottom bar
(`Opening Stock` / `+ Record Payment` as applicable), copy
`as of now` → `as of today`. No domain change.

### 3.4 A1 Customers — filter-toolbar conversion — ❌ REMOVED (see AMENDMENT at top)

Moved to session **3e** (shared `FilterToolbar` kit component retrofit,
all screens at once). **Do not do this work.** Do not open
`app/admin/customers/*`. Do not change
`tests/screens/admin-customers.screen.test.tsx`.

## 4. Gates + output

- Screen specs: extend `financials.screen.test.tsx`,
  `assets.screen.test.tsx`, `stock.screen.test.tsx` /
  `stock-levels.screen.test.tsx` — each new mobile branch: render at
  mobile width, assert the stacked-row layout + the sticky bar + each
  state; desktop branch still renders unchanged. (No
  `admin-customers.screen.test.tsx` change — §3.4 removed.)
- `pnpm test` all green, `pnpm tsc --noEmit` 0, `pnpm build` clean.
- Screenshot-diff each mobile state against its `[M2-A2]` artboard;
  log residual deltas for QA.
- Summary for the human → orchestrator: screens done, any toolbar
  divergence-from-3a to reconcile, screenshot-diff notes, gate status.
  Do **not** edit PROGRESS §7 / ROADMAP.

## 5. Do NOT

- Change any kit component. Flag if you think you need to.
- Restructure the Customers table/rows or the desktop layouts (only add
  the mobile branch + swap the Customers filter control).
- Make a new design decision — flag instead.
- Touch Cashier / SM / Canteen screens.
- Add app-level Playwright/e2e. Work on Milestone 3. Merge to `main`.
