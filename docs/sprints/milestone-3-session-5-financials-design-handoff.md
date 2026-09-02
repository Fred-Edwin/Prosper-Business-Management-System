# M3 Session 5 — Design pass on `/admin/financials` (Financials & Expenses)

**Type:** DESIGN session. No feature work, no new endpoints, no schema
changes. The backend and the data are done and correct (S4). What ships
from S4 is *functionally complete but visually unresolved* — the owner
looked at it on `pnpm dev` and does not like the layout, the KPI strip,
the type, or the visual hierarchy. This session fixes that and only that.

**Deliverable of this session is a DESIGN, not an implementation.** You
propose a layout; the owner approves it or sends corrections; you iterate
until it is approved. Implementation is a *follow-up* session. Do not
start editing `app/admin/financials/*.tsx` until the owner has said "build
this".

---

## Read first (binding, in this order)

1. `CLAUDE.md` — the whole thing. Note the "Design in Paper is not a step
   in this loop … **only when the owner explicitly asks**" clause — the
   owner is now explicitly asking, so a Paper design pass IS in scope for
   this session.
2. `docs/design/design-principles.md` — **§9 is an ENFORCED contract.**
   Also §1 (the Paper file is the *what*, this doc is the *when/why*),
   the type scale, spacing tokens, colour tokens. Every value you put in
   a mock must be a token, not a raw hex (the one sanctioned exception is
   `--color-gold-brand`).
3. `docs/design/kit-audit.md` + `docs/design/component-states.md` — what
   each frozen kit component does and its state matrix. **The kit is
   frozen.** The new design must be composable from
   `components/kit/*` — `<PageShell>`, `<Tabs>`, `<SimpleTable>`,
   `<DenseLedger>`, `<Drawer>`, `<FormField>`, `<SegmentedControl>`,
   `<Select>`, `<StatusChip>`, `<EmptyState>` / `<ErrorState>`,
   `<DatePicker>`, `<Toast>`. If the approved design genuinely needs a
   pattern the kit has no answer for, **stop and ask the owner** — do not
   invent a kit component.
4. `docs/design/export-workflow.md` — how a screen is composed from the
   kit; the thin-mapper-in-the-screen-file rule.
5. `docs/design/paper-workflow-lessons.md` — the Admin-review lessons
   from M1 (sticky headers, table widths vs artboard width, screenshot
   top-level artboards not inner frames).
6. `docs/PRD.md` §4.7 and **ADR-55** (`docs/DECISIONS.md`) — the COGS
   model, so you design the profit view around the *right* numbers and
   the right relationships (esp. that non-sale consumption is a *view
   into* COGS, never a line item added on top).
7. `docs/API.md` → "Financials" section — the exact shape of
   `GET /api/financials/summary` (`perLocation`, `consolidated`,
   `nonSaleConsumption`), `/api/expenses`, `/api/owner-transactions`.
   This is the data you have to lay out — nothing more, nothing less.

## Look at, in the Paper file

Paper file **"Prosper Hotel"**, fileId `01M0EZ7TAHZM26KBMWNYT0928X`.

- Open it, `get_basic_info`, and study the **already-shipped Admin
  screens** as the visual vocabulary to match: the Admin Shell / Ledger
  Maximized artboards, `/admin/stock`, `/admin/sales`, `/admin/customers`,
  the existing `/admin/financials` handover-reconciliation artboards.
  Screenshot **top-level artboards**, not inner frames (an isolated inner
  node reads as a contrast bug that isn't one).
- The point is: the new financials layout must look like it belongs in
  the same product as those screens — same toolbar treatment, same table
  language, same type scale, same density.

## Also look at (current state, to critique)

`pnpm dev` → `/admin/financials` as Admin (seed has data on every tab:
handovers, expenses, owner draws, profit). The six inner tabs are:
**Stock Purchases · Deliveries · Handovers · Expenses · Owner Draws ·
Profit**. Files: `financials-client.tsx` (shell), `kpi-strip.tsx`,
`transactions-tab.tsx`, `handovers-tab.tsx`, `expenses-tab.tsx`,
`owner-draws-tab.tsx`, `profit-summary.tsx`.

The owner's stated problems with what S4 shipped:
- The **KPI strip** looks off — visually and typographically.
- The **font / type** looks off across the page.
- The **visual hierarchy** is unclear.
- The **overall layout / structure** of the screens in this page.

The owner is **happy with the content** — everything that needs to be on
a Financials & Expenses page is present. This is purely about how it is
structured and presented.

---

## Step 1 — agree on scope & structure BEFORE designing

Before drawing anything, write a short proposal (in this session's chat,
not a doc) and get the owner to agree on:

1. **Is the six-tab inner row the right container?** Options to weigh:
   - Keep all six as sibling tabs (current).
   - Group them — e.g. a "Transactions" area (Stock Purchases /
     Deliveries / Handovers) and a "Money" area (Expenses / Owner Draws /
     Profit), as two tab groups or two sub-sections.
   - Promote **Profit** out of the tab row entirely — it is a summary,
     not a transaction log; it may want to be an always-visible panel
     (like the KPI strip) or its own thing.
   - Something else you propose.
2. **What does the KPI strip become?** Right now it is four tiles
   (Total Liquidity / Cash / M-Pesa / Today's Outflows), always on, above
   the tab row. Questions for the owner: is a strip the right form? Which
   figures earn a top-of-screen slot? Should it be date-reactive or
   always "now"? Does it belong on this screen at all, or is it really a
   dashboard thing (the owner mentioned a future dashboard — **out of
   scope for this session**, but note if the KPI strip is duplicative
   with it).
3. **The Profit view's internal hierarchy** — the Revenue → COGS → Gross
   → Expenses → Net stack, the per-location table, the position tiles
   (cash / M-Pesa / debts owed / owed by owner), and the **separate**
   non-sale-consumption block. What leads? What is secondary? The one
   hard constraint from ADR-55: non-sale consumption must never render as
   a sibling line item in the Revenue→Net running total — no reader may
   be invited to subtract it twice.
4. **Mobile.** Every one of these tabs already has a mobile card branch.
   The design must say what mobile looks like, not just desktop.
5. **Density.** These are Admin screens — the house style is dense
   (`<DenseLedger>` exists for a reason). Confirm the target density with
   the owner against the shipped `/admin/stock` ledger.

Only once the owner signs off on the structure do you move to Step 2.

## Step 2 — design it in Paper

- Generate a brief first (palette / type scale / spacing / direction) —
  or rather, *restate* the one already in `design-principles.md`, since
  this must match the existing product, and note any place the current
  S4 screens deviate from it (that deviation is likely the "font looks
  off" the owner is seeing).
- Build the artboard(s) in the Paper file on a page for this work. Use
  the real content-pane width, not an arbitrary artboard width. Pull
  exact values from existing kit artboards with `get_computed_styles` /
  `get_jsx` — never eyeball.
- Cover: desktop + mobile, and the empty / loading / error states for at
  least the Profit and Expenses views.
- `get_screenshot` top-level artboards to review as you go. Switch the
  artboard to `height: "fit-content"` when content clips.
- `finish_working_on_nodes` when done.

## Step 3 — owner review loop

Present screenshots. The owner approves or sends corrections. Iterate in
Paper until approved. **Record the approved design** — a short
`docs/design/flows/financials-screen.md` (or an addition to
`financials-reconciliation-flow.md`) describing the approved structure,
so the implementation session has a written spec plus the Paper artboard
to copy from.

## Explicitly OUT of scope this session

- The **dashboard page** — the owner wants it designed in a later session
  that also has this financials design as input. Not now. If you notice
  the KPI strip overlaps with what a dashboard would show, write that
  observation down for that session; don't design the dashboard.
- Any backend / API / schema change.
- Implementing the new layout in `app/**` — that is the session *after*
  approval. (If the owner explicitly says "and build it now" once it's
  approved, then compose it from the kit following sibling Admin screens,
  keep `pnpm test` / `typecheck` / `build` green, and re-run the full
  suite after the last change — S4 shipped a broken spec by skipping that.)

## State you inherit (commit after S4)

- `pnpm test` 715/715, typecheck clean, build clean.
- `/admin/financials` is functionally complete: 6 tabs, all wired to real
  endpoints, KPI strip live, no `TODO(mock)` anywhere.
- Seed has displayable data on every tab (today's handovers, a week of
  expenses, owner draws, and therefore non-zero profit figures).
- M3 is otherwise DONE — this design pass is polish, not a milestone
  blocker.
