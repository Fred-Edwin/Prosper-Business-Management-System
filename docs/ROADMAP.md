# Prosper — Roadmap

**Status:** Stage 1 (this milestone list) approved.

**Milestone 1 — DONE (2026-08-29).** All three features (Catalog &
Locations, Store & Stock Movements incl. the `/admin/financials`
stock+reconciliation slice + A5 Archive, Assets) are built, wired, and
through an adversarial QA pass (Session 17: `pnpm test` 226/226, `tsc` 0,
`build` clean; the one High finding — F-1 correction-stacking — fixed
in-session). Two non-blocking follow-ups are recorded: F-2 (2-phase
transfer receiver visibility — a Design call, M2 territory) and the
misleading ledger "Edit" column (Design Sprint). Plan + session history:
**`docs/sprints/milestone-1-plan.md`**; findings:
`docs/sprints/session-17-findings.md`.
`docs/milestones/milestone-01-the-business-exists.md` is retained for
original intent/reasoning only.

Milestones 2–5 below are unchanged and not yet broken into sprints.

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

**Current plan & session sequence:** [`docs/sprints/milestone-1-plan.md`](sprints/milestone-1-plan.md).
Original intent/reasoning: [`docs/milestones/milestone-01-the-business-exists.md`](milestones/milestone-01-the-business-exists.md) (historical).

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
