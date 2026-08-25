# Prosper — Roadmap

**Status:** Stage 1 approved. Sprint breakdown (Stage 2) in progress — see
`docs/sprints/` for individual sprint files as they're approved.
Milestone 1's design + design-export phases are complete (Sprints 01–06);
its backend/domain sprints (07–10) are next — see
`docs/milestones/milestone-01-the-business-exists.md` §0/§5 for current
status.

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

## Milestone 1 — The business exists in the system

**Detailed Plan & Progress Tracking:** See [`docs/milestones/milestone-01-the-business-exists.md`](milestones/milestone-01-the-business-exists.md)

| Feature | PRD |
|---|---|
| Catalog & Locations | §4.1 |
| Store & Stock Movements | §4.2 |
| Assets | §4.10 |

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

## Milestone 2 — Staff can sell, every day

| Feature | PRD |
|---|---|
| Restaurant Sales (Orders) | §4.3 |
| Customers & Credit | §4.6 |
| Canteen Derived Sales | §4.4 |

**Unlocks:** Cashiers record real orders (cash/M-Pesa first). Canteen
Attendant counts stock; sales derive automatically. Customers carry
running credit balances.

**Sequencing note:** Restaurant Sales leads. Its Development Sprint(s)
sequence cash/M-Pesa orders first, then credit orders as a follow-on
slice once Customers & Credit lands — a credit order needs a Customer
record to attach to (PRD §4.3).

---

## Milestone 3 — Admin gets the trust & money picture

| Feature | PRD |
|---|---|
| Handover & Reconciliation (+ Day Close) | §4.5 |
| Financials | §4.7 |

**Unlocks:** Admin closes a day, sees expected-vs-received cash/M-Pesa
variance automatically, logs expenses/owner draws, and sees real profit
(Revenue − COGS − Expenses). Day Close becomes a hard gate from here on.

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
