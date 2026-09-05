# Handover: Build the "Getting Started with Prosper" client PDF

**For:** a fresh agent session taking on the whole task — research,
screenshots, drafting, and producing the final PDF. No prior context
carries over; this file plus the two references below are everything
you need.

**Role:** you are acting as a technical writer / documentation lead
producing a client deliverable, not a developer making code changes.
Do not modify application code. The only exception: you may need to run
the app locally (`pnpm dev`) to log in and capture real screenshots.

---

## 1. Read first

1. `CLAUDE.md` — project orientation (skip the "before making any code
   change" reading list; you're not changing code).
2. `docs/client/getting-started-guide-template.md` — **this is your
   spec.** It is an already-approved document structure (10 sections, in
   order) plus a writing-voice guide (sentence length, tone, banned
   jargon, screenshot rules). Follow it exactly — do not redesign the
   structure or invent a different tone.
3. `docs/PROGRESS.md` — top entries, for what's actually shipped. In
   particular, read the **2026-09-05 "Opening Balances & Day-1 Pinning
   (ADR-70)" entry** in full — it describes a feature that is central to
   section 4 (setup checklist) and section 9 (fixing mistakes) of the
   template, including a specific failure mode the docs must guard
   against (an Admin mistaking the one-time opening-balance screen for a
   place to log today's cash). Do not just skim it — the template's
   section 4 and 9 content requirements are written against this entry.
4. `docs/DECISIONS.md` → ADR-70, for the underlying rule if you need
   more precision than PROGRESS.md gives: a business has exactly one
   opening position ever, per product/location and per money account,
   dated to Day 1; neither opening screen (`/admin/stock/opening`,
   `/admin/financials/opening`) offers a date picker; Day 1 is derived
   automatically and pinned once the first opening entry is saved.
5. `docs/API.md` — confirm `GET/PUT /api/financials/opening-balance` and
   `GET /api/stock-movements/opening-day` exist and match the described
   behavior, since ADR-70 was shipped but **not yet walked through by
   the owner on `pnpm dev`** — if the running app behaves differently
   from the handoff description, trust the running app and flag the
   discrepancy back rather than documenting the described-but-unverified
   behavior.

## 2. Login credentials (for taking screenshots only)

- Name: **Admin**
- PIN: **1234**

This is a seeded development credential, not a production one — use it
only to drive `pnpm dev` for screenshots. It also becomes content in the
PDF itself (template section 2) with an explicit instruction to the
client to change it immediately — do not present it as a permanent
credential.

## 3. What to actually check on the running app before writing

Don't write the guide from the docs alone — drive the real screens,
since the template's screenshot-heavy format requires it and because
ADR-70's screens haven't had an owner walkthrough yet:

- `/login` — confirm the login form fields/copy.
- `/admin/staff` — confirm the "Your account" PIN-change row and drawer
  (shipped 2026-09-05, see PROGRESS.md "Self-service PIN change" entry).
- `/admin/stock/opening` — confirm it behaves as ADR-70 describes: no
  date picker, retitles to "Opening stock — Day 1 was {date}" once
  pinned.
- `/admin/financials/opening` — confirm both states described in
  PROGRESS.md/ADR-70 (never-set entry form; already-set locked receipt
  with a "Correct a mistake" button and its warning copy).
- `/admin` dashboard, and one screen each for: catalog, stock ledger,
  financials (any tab), staff roster, customers, a correction in the
  audit trail.
- One representative screen each for Store Manager, Cashier, and
  Canteen Attendant (log in as each — check `prisma/seed.ts` or ask if
  you need seeded non-admin credentials).

Do **not** include Recipes, Assets full-screen, or Audit Trail
full-screen — the template explicitly excludes/minimizes these (§4 of
the template).

## 4. Deliverable

- A single, well-formatted PDF: `docs/client/getting-started-with-prosper.pdf`
  (plus keep the source — Markdown or HTML — alongside it so it can be
  revised later without redoing the whole thing from scratch).
- Follow the template's 10-section structure exactly, in order.
- Every screenshot real, cropped, and captioned per the template's
  visual rules (§2 of the template).
- Follow the writing rules in template §1 — short sentences, no jargon,
  reassurance placed right next to the thing that might worry her, one
  bolded warning line max per risky action.

## 5. Report back

When done, report: the PDF's page count, a one-line note on any place
where the running app's actual behavior differed from what ADR-70/
PROGRESS.md described (there may be none — the feature is described as
shipped and tested, just not owner-walked-through), and confirmation
that every screenshot came from the real running app rather than being
reconstructed from code.
