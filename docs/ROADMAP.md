# Prosper — Roadmap

**Status:** Milestones 1–5 all **DONE** — the initial build is complete
and the app is with the client. The project is in maintenance mode
(`docs/maintenance.md`). This roadmap is kept as the feature-history
record and as context for scoping new client-requested features.

The durable record for what shipped: `docs/PROGRESS.md` (the "Milestones
2–5 — COMPLETE" ledger + recent entries), `docs/DECISIONS.md`
(ADR-13–69), and git history. The per-milestone sprint plans and handoff
docs were removed in the 2026-09-06 maintenance-mode cleanup — see git if
you need one.

This roadmap groups the system's features into milestones, ordered by
dependency, and framed around what the business can actually *do* once
each milestone lands.

---

## Gap check (folded into the milestones below)

- **Login & roles** — explicit in Milestone 0: Auth.js, four role types,
  session-based revocation.
- **Ledger corrections** — the "Correct this" pattern (ADR-15) is not its
  own feature; it is a standing acceptance-criteria requirement on every
  Development Sprint that touches a ledger, starting Milestone 1.
- **Audit log writes** — Milestone 5 covers the audit trail *view*; every
  module must write to `AuditLog` starting Milestone 1 (ADR-25).
- **Day Close as a gate** — a hard gate from Milestone 3 onward: once a
  day is closed, staff can no longer edit directly; every further change
  routes through the Admin correction flow (ADR-15, ADR-24).
- **PWA / installability** — slotted into Milestone 0 (manifest + service
  worker, ADR-7).

---

## Milestone 0 — Foundation

Project setup, Prisma schema for all entities, Auth.js login for all four
roles, empty role-scoped screen shells, PWA manifest, seed data.

**Unlocks:** a working login per role and a scaffold ready for real
screens.

**Note:** infrastructure, not a user-facing feature — sprint shape
proposed on its own terms in Stage 2 rather than forced into the
Design/Development/QA pattern.

---

## Milestone 1 — The business exists in the system — DONE (2026-08-29)

**Record:** `docs/PROGRESS.md` M1 ledger + `docs/DECISIONS.md` ADR-13–48.

| Feature | PRD | Status |
|---|---|---|
| Catalog & Locations | §4.1 | **DONE** — domain + API + screens, adversarial QA passed (Session 17). |
| Store & Stock Movements | §4.2 | **DONE** — full `StockMovement` ledger + `/admin/financials` slice + A5 Archive; adversarial QA passed. F-1 (correction-stacking) fixed. F-2 (2-phase transfer receiver visibility) deferred to a Design call. |
| Assets | §4.10 | **DONE** — register + condition + friction-delete + Archive; adversarial QA passed. |

`/admin/financials` (stock-purchase + reconciliation slice only) is also
in M1 scope, under Store & Stock Movements — the full Financials feature
is Milestone 3.

**Store & Stock Movements** covers the full `StockMovement` ledger:
purchase payment (Admin); purchase receipt (Store Manager **or** Canteen
Attendant — confirms goods arrived at *their* location); issue (Store
Manager); production (Store Manager); transfer (Store Manager **or**
Canteen Attendant — stock between **any** two locations, either
direction, e.g. Canteen → Restaurant); non-sale consumption (any staff);
opening/closing stock (auto + Admin-adjustable).

**Unlocks:** Admin defines products, locations, and equipment. Store
Manager and Canteen Attendant can both receive purchased goods into their
location and transfer stock in any direction. Stock is trustworthy across
all three locations — no revenue yet.

**Assets** was moved into this milestone (rather than later) since it has
no dependency on stock, sales, or money.

---

## Milestone 2 — Staff can sell, every day — DONE (2026-09-01)

**Record:** `docs/PROGRESS.md` M2 ledger + `docs/DECISIONS.md` ADR-49–51.

| Feature | PRD | Status |
|---|---|---|
| Restaurant Sales (Orders) | §4.3 | **DONE** — create / edit-own / append-only correct / role-scoped list; §3.8 BLOCK; C1–C5 + Admin `/admin/sales`; adversarial QA passed (S7). |
| Customers & Credit | §4.6 | **DONE** — derived balances, repayment → MoneyMovement, ledger; C6 + A1 + A2; QA passed. |
| Canteen Derived Sales | §4.4 | **DONE** — stock-count derivation exact across period boundaries, counted-more rejected + `voidStockCount` undo, revenue MoneyMovement; K1 + K2 + A4; QA passed. |

**Unlocks:** Cashiers record real orders (cash/M-Pesa first). Canteen
Attendant counts stock; sales derive automatically. Customers carry
running credit balances.

**Sequencing note:** Restaurant Sales leads. Its Development Sprint(s)
sequence cash/M-Pesa orders first, then credit orders as a follow-on
slice once Customers & Credit lands — a credit order needs a Customer
record to attach to (PRD §4.3).

---

## Milestone 3 — Admin gets the trust & money picture — DONE (2026-09-02)

**Record:** `docs/PROGRESS.md` (M3 S1–S7 entries) + `docs/DECISIONS.md`
ADR-52–57. No `milestone-3-plan.md` was created — M3 ran session-to-session
off the per-session handoffs.

| Feature | PRD | Status |
|---|---|---|
| Handover & Reconciliation (+ Day Close) | §4.5 | **DONE** — day-close seal/reopen + shared guard (S1); handover declare/receive/correct + staff today-only gate (S2); Admin reconciliation tab + staff declare screens (S3). |
| Financials | §4.7 | **DONE** — expenses (+ paired MoneyMovement, append-only correction), owner draws/returns + derived owed-to-business, profit summary (Revenue − COGS − Expenses), KPI strip; COGS model = all-stock valuation sweep, dishes valued at zero, non-sale consumption a separate report (ADR-55) (S4). Screen redesign approved in Paper (S5). Redesign built + owner-approved date ranges (Today / This week / This month / Custom) — Profit promoted to an always-on panel, KPI strip kit-native; flow figures take the whole range, balance figures are as-of the range's end (ADR-57), fixing balance tiles that had ignored the date filter (S7). Full-stack, `pnpm test` 745/745. |

**Unlocks:** Admin closes a day, sees expected-vs-received cash/M-Pesa
variance automatically, logs expenses/owner draws, and sees real profit
(Revenue − COGS − Expenses). Day Close is a hard gate from here on.

---

## Milestone 4 — Full operational picture

| Feature | PRD |
|---|---|
| Staff & Pay | §4.8 |
| Recipes (informational) | §4.9 |

**Unlocks:** pay calculated from attendance; optional per-dish cost
estimates and production yield-anomaly flags. Neither blocks anything
upstream.

---

## Milestone 5 — History, at a glance

| Feature | PRD |
|---|---|
| Reporting & Audit Trail | §4.11 |

**Unlocks:** weekly/monthly summaries, the full audit log view, and
historical record lookup for any past date — reading back everything the
system has been recording since Milestone 1.
