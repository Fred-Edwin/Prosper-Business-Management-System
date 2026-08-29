# Session 14 Handoff — Developer: **D1 staff-FORBIDDEN blocker + the M1 copy/label sweep + the Catalog drawer variant**

**Status:** DONE (2026-08-29). D1 fixed (cause 2 — `GET /api/products` +
`GET /api/locations` widened to the staff stock roles; regression tests
added; all 7 staff flows re-walked green). B1 / B4 / C2 / A3 applied in
the decided scope. One new item flagged for Session 17 (accept-transfer
receiver visibility gap). Full write-up: `docs/PROGRESS.md` 2026-08-29;
dispositions in `docs/sprints/m1-manual-verification-observations.md`.

---

**Status (original):** NOT STARTED. **UNBLOCKED** — Session 13 closed the last M1
development sprint (F3 Assets). The owner then ran a manual walkthrough of
M1 on localhost and logged what they saw in
`docs/sprints/m1-manual-verification-observations.md` (raw observation
log, not a findings report). Triage of that log split it into four
follow-up sessions:

| Session | Role | Scope |
|---|---|---|
| **14 — this one** | Developer | **D1** (staff FORBIDDEN blocker) + the cheap label/copy fixes (**B1, B4, C2**) + **A3** (Catalog drawer → `rail`). |
| 15 | Product Designer (Design Sprint) | A2/A1, A4, C1, B3 designed; **A5** (Archive) designed + ADR + spec. Paper only. |
| 16 | Developer (Development Sprint) | Build 15's design changes **and A5** (Archived-list UI + Unarchive + action-blocking). |
| 17 | QA Engineer | The adversarial M1 pass (`docs/sprints/final-qa-handoff.md`) + stand up the Playwright e2e harness. Picks up **B2, B5**. |

**Role:** Developer, Prosper project. **This is a bugfix + copy session,
not a feature or design session.** Every item here has its code location
already identified in the observations doc. No new UI/UX decisions — if
one is needed, STOP and flag it in `PROGRESS.md` (it belongs to Session
15). Do **not** touch `components/kit/*` / `components/shells/*` beyond
the two label strings in B1, and do **not** start any A2 / A4 / A5 / C1 /
B3 work — those are later sessions.

Latest commit on `session-10b-kit-proof-harness`: `9bd1ab4` (Session 13
docs).

---

## Required reading (before any code)

1. **`CLAUDE.md`** — role model, **pnpm only**, **post a visible
   checklist**, the "no new UI/UX decisions in a Development Sprint" rule.
2. **`docs/sprints/m1-manual-verification-observations.md`** — the full
   owner log. This session handles **D1, B1, B4, C2, A3** only. Read the
   others (A1, A2, A4, A5, B2, B3, B5, C1, D-section context) so you know
   what you are *not* doing and don't half-touch it.
3. **`docs/CONVENTIONS.md`** — §3 error shape (the FORBIDDEN codes), §2
   naming.
4. **`docs/DECISIONS.md`** — **ADR-37b** (`Drawer` ships both `panel` and
   `rail` variants by design — A3 is choosing `rail` for Catalog, not a
   kit change), **ADR-26** (staff "own entries only" / role scoping),
   **ADR-5** addenda (JWT sessions, `active` re-check, PIN login).
5. **`node_modules/next/dist/docs/`** — Next 16.3.1. Read the relevant
   guide before any config / route / middleware change (D1 may need
   none, but check before touching auth wiring).
6. Local **Postgres must be running**; you will need a **`pnpm dev`
   server** and the seeded staff logins (`Store Manager` / PIN `1234`,
   `Canteen Attendant` / PIN `1234`, `Admin` / PIN `1234`) to reproduce
   D1.

---

## Scope

### D1 — Staff roles hit FORBIDDEN across the board (HIGHEST PRIORITY)

**Symptom (owner):** logged in as Store Manager / Canteen Attendant and
hit `FORBIDDEN` on every Phase-3 staff flow (receive, issue, production,
non-sale, transfer dispatch, accept/flag, stock levels) — the entire
staff third of M1 is unverifiable until this is fixed.

**This blocks Session 17 (QA) too — it must be fixed first, standalone.**

**Reproduce first, fix second.** Do NOT guess-patch. Steps:

1. `pnpm prisma:seed` (note whether it reports creating vs. skipping the
   staff users — see cause 1), then `pnpm dev`.
2. Log in as `Store Manager` / PIN `1234`. Open the browser network tab.
3. Walk the Store Manager hub → a flow (e.g. Receive, or Issue). Capture
   the **exact failing request URL + method**, the **response body**
   (the `{ error: { code, message } }` shape), and the **HTTP status**.
4. Match it to one of these known candidate causes:

   | # | Cause | Where to check | Fix shape |
   |---|---|---|---|
   | 1 | **Staff `User` row has no `staff` link.** `prisma/seed.ts` `upsert`s the staff `User` with `update: {}`, so a row created before `staffId` was added is **never backfilled** — `resolveActorLocationId` then returns `null` and the domain turns that into `FORBIDDEN` ("Your account is not assigned to a location."). | `lib/api/actor-location.ts`; query the DB: `select id,name,role,"staffId" from "user" where role in ('store_manager','canteen_attendant')` | Re-seed correctly: make the seed's `user.upsert` `update` block backfill `staffId` + `role` + `active` (not `update: {}`), OR a one-off migration/script to link existing rows. Document which. |
   | 2 | **Role missing from an endpoint allow-list.** `requireApiRoleIn([...])` per route. | `grep -rn "requireApiRoleIn\|requireApiRole(" app/api/stock-movements` — verify `store_manager` / `canteen_attendant` are in the list for every route the staff flows call (list, create per `movementType`, `/accept`). | Add the missing role(s) to the route's `requireApiRoleIn` array. |
   | 3 | **Stale JWT** — owner's browser holds a token minted before a role/seed change; `token.role` is wrong or absent. | `lib/auth/config.ts` `jwt` / `session` callbacks (they look correct on inspection — `token.role` set in `jwt`, re-read from DB in `session`). | If this is it: it's not a code bug — sign out / clear cookies re-mints. Still: note it, and consider whether the `session` callback should hard-fail (redirect to login) when `dbUser` is null instead of falling back to `token.role`. |
   | 4 | **`session.user.role` undefined at the route.** | Add a temporary log in one failing route handler: `console.log(auth.user.role)`. | Trace back through the `session` callback. |

5. **Fix the actual cause.** Add a **regression test**:
   - If cause 1 (most likely): a DB-backed test that a `store_manager` /
     `canteen_attendant` `User` created via the seed path resolves a
     non-null `locationId` through `resolveActorLocationId`; and/or an
     API-route test that a staff session with a valid `staff` link is
     **not** 403'd on a stock write for its own location (and **is**
     403'd for another location — ADR-26).
   - If cause 2: an API-route test asserting the role is accepted on that
     route.
6. **Re-walk the staff flows manually** end to end (receive → issue →
   production → non-sale → transfer dispatch → accept/flag → both stock
   levels views) and confirm every one works. Note any *secondary*
   FORBIDDEN that shows up (e.g. `GET /api/stock-movements/outstanding`
   is Admin-only by design — Session 12 carry — a staff hub calling it
   should **degrade gracefully**, not block the screen; if it hard-blocks
   the hub, that is a real bug in the hub's error handling — fix it or
   flag it clearly for Session 17).
7. Write up in `PROGRESS.md`: which cause it was, the fix, the regression
   test, and the manual re-walk result.

**Constraint:** D1's fix may touch `prisma/seed.ts`, a migration/script,
`lib/api/actor-location.ts`, `lib/auth/config.ts`, or an
`app/api/stock-movements/**` route's role list — whatever the repro
points to. It must **not** weaken role scoping: a staff user must still
be 403'd for another location's data (ADR-26). Keep the change minimal
and matched to the diagnosed cause.

### B1 — Rename the "Stock" nav link to "Ledger"

Owner wants the nav entry to read **Ledger**, not **Stock**.

- **Admin shell:** `components/shells/admin-shell.tsx:128` and
  `components/shells/mobile-nav-drawer.tsx:138` — both
  `{ key: "stock", label: "Stock", href: "/admin/stock" }`. Change
  `label` to `"Ledger"`. **Keep `key` and `href` as `stock` /
  `/admin/stock`** — only the visible label changes (no route rename, no
  redirect, no broken links).
- **Decide with the owner, then apply consistently** (ask in-session if
  unclear — this is a naming call, not a design call):
  - the `/admin/stock/opening` breadcrumb
    (`opening-client.tsx:226` — "Stock & Reconciliation")
  - the Financials tab label (`financials-client.tsx:133` — "Stock
    Purchases")
  - the **staff** shell's "Stock" bottom-nav entry
    (`components/layout/staff-shell-client.tsx:31,36`) — is the rename
    Admin-only or app-wide?
- **Default if the owner doesn't specify:** rename the Admin primary nav
  entry only (both shells), leave the breadcrumb / Financials tab / staff
  nav as-is, and note the open question in `PROGRESS.md`. Touching
  `admin-shell.tsx` / `mobile-nav-drawer.tsx` for **a label string only**
  is the one allowed exception to "don't touch `components/shells/*`" —
  no structural change.

### B4 — "Shop Goods" → "Goods"

Catalog already uses "Goods"; the opening-stock screen says "Shop Goods".

- `app/admin/stock/opening/opening-client.tsx:30`
  (`goods: "Shop Goods"` in the kind-label map) → `"Goods"`.
- `app/admin/stock/opening/opening-client.tsx:37`
  (`{ key: "goods", label: "Shop Goods" }` in `TABS`) → `"Goods"`.
- Check line 29 (`dish: "Dish (Finished)"`) and the other tab labels
  ("Kitchen Ingredients", "Dishes") — **leave those as-is** unless the
  owner asks; the note is specifically "Shop Goods" → "Goods".
- `grep -rn "Shop Goods" app/ components/` to confirm there is no third
  occurrence.

### C2 — "Cash at Hand" → "Cash" (Paid From control)

- `app/admin/financials/payment-drawer.tsx:26,28,32` — `PAID_FROM_LABELS`,
  the label→value map, and the reverse map. Change the **"Cash at Hand"**
  string to **"Cash"** in all three.
- `app/admin/financials/financials-client.tsx:34,40` — the same label
  used in the purchases table / display. Change to match.
- Leave the other option ("M-Pesa / Bank Till") untouched.
- The **stored value** (`"cash"` / `"mpesa_bank"`) must not change — this
  is display copy only. Confirm the value side of each map still reads
  `"cash"`.
- `grep -rn "Cash at Hand" app/ components/ lib/` to confirm nothing else
  shows it.

### A3 — Catalog Edit/Create drawer: floating card → full-height rail

Owner wants overlay drawers of this type to be **right-docked, full
viewport height**, not floating centered cards. Three of the four M1
drawers already are (`correction-drawer`, `payment-drawer`,
`asset-drawer` all use `variant="rail"`). Only Catalog's is still the
default `variant="panel"` floating card.

- **`app/admin/catalog/product-drawer.tsx`** — the `<Drawer …>` call has
  no `variant`. Add **`variant="rail"`**. That is the whole change — the
  kit `<Drawer>` supports both by design (ADR-37b); this is not a kit
  change.
- The rail footer left-aligns its actions and the primary button is
  `<Button className="grow">` in the other three drawers — match that
  pattern in `product-drawer.tsx`'s footer so it looks like its siblings
  (compare `asset-drawer.tsx`'s footer).
- **Re-run `tests/screens/catalog.screen.test.tsx`** — it asserts the
  drawer opens as `role="dialog"`, focus-trap, Esc-restore. `rail` and
  `panel` share all of that (same kit internals), so it should stay
  green; if a selector breaks on the variant swap, fix the test to match
  the rail structure, don't weaken it.
- Do **not** change the `FrictionDeleteDialog` (`product-delete-dialog`)
  — it's a separate centered `alertdialog`, correctly so, and A2 (moving
  delete into the drawer) is a **Session 15** design decision, not this
  session.

---

## Out of scope (explicitly — these are later sessions)

- **A1** (Edit/Delete columns cramped) — resolved by A2 in Session 15/16;
  don't reflow the table here.
- **A2** (Delete moves into the Edit drawer) — Session 15 design.
- **A4** (Ingredient/Dish/Goods explainer UI) — Session 15 design.
- **A5** (Archive = Archived-list + Unarchive + action-blocking) —
  Session 15 design + Session 16 build. Do **not** add an Archived view
  or an unarchive endpoint here.
- **B2** (bulk opening-stock post-save behaviour) — Session 17 QA
  verifies against design intent.
- **B3** (ledger digit typography) — Session 15 design decision.
- **B5** (stock correction "Edit not clickable") — Session 17 QA
  reproduces with real movement data. (If, while re-walking for D1, you
  find the correction cell is broken **with a valid single movement
  behind it**, note it in `PROGRESS.md` for Session 17 — but don't fix it
  here.)
- **C1** (searchable product Select + limit kinds) — Session 15 design.
- The **Playwright e2e harness** — Session 17.

---

## Per-change gate

- **D1:** manual re-walk of all 7 staff flows passes; a regression test
  covering the diagnosed cause; `pnpm test` green.
- **B1 / B4 / C2:** `grep` confirms no stale copy remains in the decided
  scope; the stored enum values (C2) are unchanged; `pnpm build` clean.
- **A3:** Catalog drawer renders as a full-height right rail matching the
  other three; `tests/screens/catalog.screen.test.tsx` green.
- **Global (unchanged):** `pnpm test` green (add the D1 regression test,
  don't weaken the suite — 154 tests as of Session 13); `pnpm tsc
  --noEmit` exit 0; `pnpm build` clean; kit `pnpm test:visual` +
  `pnpm test:a11y` still pass (you should not be touching
  `components/kit/*` at all).

---

## Suggested order (one context window)

1. **Read** — the observations doc (all of it), this handoff, ADR-37b,
   ADR-26.
2. **D1 first** — `pnpm prisma:seed` + `pnpm dev`, reproduce, capture the
   failing request, diagnose the cause, fix it, add the regression test,
   re-walk all staff flows manually. Commit. **This is the bulk of the
   session.**
3. **B4 + C2** — pure string swaps with `grep` verification. Commit
   together (copy sweep).
4. **B1** — confirm the rename scope with the owner (or apply the default
   + flag), Admin nav label in both shells. Commit.
5. **A3** — `variant="rail"` on the Catalog drawer + footer alignment;
   re-run the catalog screen spec. Commit.
6. **Full gate sweep** — `pnpm test`, `pnpm tsc --noEmit`, `pnpm build`,
   kit `test:visual` + `test:a11y`. Commit.
7. **Docs** — `PROGRESS.md` Session 14 entry (D1 root cause + fix + test
   + manual re-walk result; the copy changes + their decided scope; A3;
   any B5 observation noted for Session 17). Update this file's
   `Status:` to DONE. Update `docs/sprints/m1-manual-verification-observations.md`
   — mark D1 / B1 / B4 / C2 / A3 as **handled (Session 14)** with a
   one-line disposition each, so Sessions 15–17 see what's left.
8. Push.

---

## Wrap-up (definition of done)

- **D1 fixed** — staff roles can complete every M1 stock flow on
  localhost; root cause documented; a regression test guards it;
  role-scoping still enforced (a staff user is still 403'd for another
  location — ADR-26).
- **B1 / B4 / C2** applied in the decided scope; no stale copy remains;
  no route / enum-value change.
- **A3** — Catalog drawer is a full-height right rail like the other
  three M1 drawers.
- Per-change gate green for all four; global gates green (154+ tests,
  tsc, build, kit visual + a11y).
- `docs/PROGRESS.md` Session 14 entry;
  `docs/sprints/m1-manual-verification-observations.md` updated with the
  handled items;
  `docs/sprints/session-14-handoff.md` `Status: DONE`.

Then Session 15 — Product Designer: the M1 design-change pass (A2/A1, A4,
C1, B3) + A5 (Archive) design + ADR.
