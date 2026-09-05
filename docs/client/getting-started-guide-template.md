# "Getting Started with Prosper" — PDF Structure & Writing Template

**Status:** Approved structure for the client-facing onboarding PDF.
**Audience:** A non-technical restaurant/canteen/store owner (the Admin),
receiving the app for the first time. She is smart and busy, not
technical — she does not know what an "API," a "ledger row," or a
"schema" is, and should never need to.

This file is the spec. Whoever drafts the PDF builds against this
structure and voice — don't improvise a different shape or tone.

---

## 1. Writing rules (read this before writing a single section)

- **Short sentences. One idea per sentence.** If a sentence needs a
  comma to hold two ideas, split it into two sentences.
- **No developer language, ever.** Ban list: ledger, endpoint, schema,
  API, row, hash, backend, database, domain, PIN hash, movement type,
  enum. Say what it *means* to her instead — "every change is recorded
  permanently" not "an append-only ledger."
- **Second person, active voice.** "You add your staff here," not "Staff
  can be added by the user on this screen."
- **Every section answers one question: "What do I do, and why?"** Not
  "how the feature was built" or "why we designed it this way" — that
  belongs in internal docs, not this PDF.
- **Screenshots carry the weight; text is the caption.** Aim for 3–5
  sentences of text per screen, not a paragraph. If a screenshot makes a
  step self-explanatory, don't narrate what's visibly on the screen —
  just say what to type/click and why it matters.
- **No walls of text.** Prefer numbered steps and short bullet lists over
  paragraphs. A section longer than ¾ of a page (excluding its
  screenshot) is a signal to cut, not to reformat.
- **Warnings are short and appear once, right before the risky action** —
  not as a disclaimer paragraph up front. Bold the one sentence that
  matters; don't bold everything.
- **Never say "the system"** — say "Prosper" or "the app."
- **Reassurance belongs near the thing that might worry her**, not
  bundled into a general FAQ at the end. If a step could make her
  nervous (correcting a mistake, closing a day), say in one sentence why
  it's safe, right there.
- **No apologies, no hedging.** Don't write "this might seem confusing
  but…" — if it needs that caveat, simplify the instruction instead.

## 2. Visual/format rules

- One clear, cropped, real screenshot per major step — taken from the
  actual running app (`pnpm dev`), never a mockup.
- Screenshots are annotated only when necessary (an arrow or box on the
  one button/field that matters) — don't annotate every element on
  screen.
- Consistent screenshot framing: same browser chrome (or none), same
  zoom level, consistent crop margins throughout the document.
- A running numbered-step style for anything sequential (setup
  checklist, closing a day) — not prose paragraphs describing a
  sequence.
- Section headers are short and literal ("Logging in," "Adding your
  staff") — not clever or abstract.
- Table of contents on page 2, page numbers throughout, since this is a
  PDF she may jump around in rather than read start to finish.

## 3. Final section structure

1. **Welcome** — one paragraph. What Prosper does for her business, in
   outcome terms ("always know what stock and money you have"), not
   feature terms.

2. **Logging in**
   - Screenshot: login screen.
   - Her starter login: **Admin** / PIN **1234**.
   - Immediate, explicit instruction to change this PIN now, before
     anything else — link forward to the how-to.
   - Screenshot: the "Your account" PIN-change step.

3. **Three things to understand before you start** (no screenshots —
   this is the conceptual grounding that prevents confusion later)
   - Locations — Restaurant, Canteen, Store each track their own stock
     and prices.
   - Everything is recorded, nothing is erased — every change is kept
     permanently, so you can always see what happened.
   - Handover & closing the day — staff report their cash/M-Pesa at
     day's end, you confirm it, then the day is sealed.

4. **Setting up for the first time** — one numbered checklist, this is
   the spine of the document:
   1. Confirm your locations.
   2. Add your products and their prices.
   3. Add your staff.
   4. Tell Prosper where you're starting from:
      - 4a. Count what's currently in stock. *(screenshot)*
      - 4b. Enter your starting cash and M-Pesa balances. *(screenshot
        of both the empty form and the completed view)*
      - One bolded line: **"You do this once. After today, Prosper
        tracks your money and stock for you — you won't come back to
        this screen to log today's balance."**
   5. You're ready to start your first day.

5. **Your daily dashboard**
   - Screenshot: `/admin` dashboard.
   - Plain-language walk through what each part of the dashboard is
     telling her each morning.

6. **Everyday tasks** — one short subsection per task, each with a
   screenshot:
   - Checking stock
   - Recording a delivery/purchase
   - Reviewing sales
   - Customer credit
   - Staff, attendance, and pay
   - Expenses and your own withdrawals from the business
   - One-line note near the money section: *"You won't see a starting
     balance field here — that's set up once, back in Step 4."*

7. **Closing a day**
   - Screenshot of the handover/reconciliation view.
   - What closing means and why she does it every day.

8. **What your team sees** — one short subsection per role, each with
   1–2 screenshots of that role's main screen:
   - Store Manager
   - Cashier
   - Canteen Attendant
   - Framed as "so you understand what they're doing," not as a manual
     for her to operate their screens herself.

9. **Fixing a mistake**
   - Screenshot: a correction in the history/audit view.
   - General rule: mistakes are fixed by adding a note, never by
     erasing the original.
   - Specific subsection: **correcting your starting balance** — what
     the "Correct a mistake" button does, and the one-sentence
     reassurance that the original figure and everything recorded since
     stay untouched. End with the one-line warning: this is only for
     fixing a wrong starting figure, never for logging today's cash.

10. **Quick reference** (last page) — a short glossary, one line each:
    Location, Recorded history, Handover, Closing the day, Correction,
    Day 1 / starting balance, PIN.

## 4. What to leave out

- Assets register and the full Audit Trail screen: one sentence each,
  no dedicated section, no screenshot — they exist, but they're not
  first-week material.
- Anything not actually shipped (e.g. Recipes) — do not document a
  screen that doesn't exist in the running app.
- Internal reasoning ("we designed it this way because…", ADR numbers,
  bug history) — none of that belongs in this document.
