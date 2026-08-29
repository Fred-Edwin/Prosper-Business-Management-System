# Milestone 1 — The business exists in the system — CLOSED

**Status:** COMPLETE, 2026-08-29. Merged to `main` (PR #1). Session 17's
adversarial QA pass closed with `pnpm test` 226/226, `tsc` 0, `build`
clean.

This file is kept only as a pointer. The full record of what M1 built and
how it got there lives in:

- **`docs/PROGRESS.md`** — "Shipped — earlier milestones" ledger (one line
  per M1 session) + the M1 known-follow-ups list.
- **`docs/DECISIONS.md`** — ADR-13 through ADR-48 (every M1 design and
  architecture decision, with reasoning).
- **`docs/SCHEMA.md` / `docs/API.md`** — the shipped data model and API
  contract.
- **`docs/design/component-states.md` / `kit-audit.md`** — the proven kit.

## What M1 delivered

- **Catalog & Locations** (PRD §4.1) — Admin defines Ingredients / Dishes
  / Goods with per-location selling prices; Dish `buyingPrice = 0`
  invariant; friction-gated hard delete with referential guard; Archive
  (soft-delete) with an Archived tab and friction-free Unarchive.
- **Store & Stock Movements** (PRD §4.2) — the full append-only
  `StockMovement` ledger across Restaurant / Canteen / Store: purchase
  payment → receipt → issue → production → transfer (2-phase) → non-sale
  consumption → opening / closing. Sum-the-ledger derived balances.
  Correction rows (ADR-15 / ADR-39); day-close gate on `correctMovement`.
  Admin ledger + bulk opening-stock grid.
- **`/admin/financials`** (M1 slice) — stock-purchase table + the
  Reconciliation table (Awaiting delivery / Delivered / Received-no-payment
  / Flagged). Real `purchase_*` columns on `StockMovement`. The KPI strip
  is markup-only, deferred to M3 (no `MoneyMovement` ledger yet).
- **Assets** (PRD §4.10) — equipment register across all three locations;
  condition tracking; add/edit drawer; friction-gated delete; Archived
  tab + Restore.

## The two big M1 process lessons (now in `CONVENTIONS.md §6`)

1. The Sprint 06 screen export was reconstructed from `get_computed_styles`
   and scrapped (21 screens). → `export-workflow.md`: compose from the
   proven kit, never eyeball a screenshot for a value.
2. Sessions 3–4 shipped the kit as static "pictures of controls" and
   Sessions 5/7 wired data onto them — forcing an unplanned 2.5-session
   kit remediation (Sessions 9–10d) + a screen rebuild (Session 11). →
   a component is proven in Storybook (states + visual + a11y) before any
   screen composes it.

Milestone 2's plan (`milestone-2-plan.md`) is built to avoid both.
