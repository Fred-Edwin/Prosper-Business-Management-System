# Session 10d Handoff — Developer: **Close out the Kit Proof Harness (Deliverable 4, final)**

**Status:** DONE. Continues Session 10c. Manual Paper-parity audit performed
(owner did the visual comparison in Storybook; `paper` MCP was intermittent).
Two deviation-from-approved fixes found and applied — Drawer panel missing
`z-index` (scrim `backdrop-filter` blurred the panel) and ToggleSwitch
`.kit-interactive` flick on click; both in `components/kit/**` only. ADR-42
(SB 9.1.x) + ADR-43 (7 review items) finalised; `kit-audit.md` flags + audit
result recorded; `TEST_PLAN.md §2a` added; `PROGRESS.md` updated. Gate 4
passed. Handoff Statuses for 10b/10c/10d flipped to done.

**Role:** Developer, Prosper project. Deliverable 4 of the Session 9
remediation sprint. **You build no feature screens and touch no feature-screen
file** (`app/admin/**`, `app/store-manager/**`, `app/canteen/**`,
`app/cashier/**`, `app/design-preview/**`, `docs/design/screens/**`).

---

## Required reading (before any code)

1. **`CLAUDE.md`** — role model, **pnpm only**, post a visible checklist.
2. **`docs/sprints/session-10c-handoff.md`** — the full Deliverable 4 context
   (toolchain, story pattern, the fixed focus bug, owner-review items).
3. **`docs/sprints/session-10b-handoff.md`** — the authoritative Deliverable 4
   scope. Its `Status:` is the one you flip to `done` at the end.
4. **`docs/design/kit-audit.md`** — the Session 10 before→after record + the
   "Remaining gaps" list (you tick these ratified + add the new flags).
5. **`docs/design/component-states.md` §2 + §8 + §9** — the per-component state
   matrix (§2), what Paper actually draws per state (§8), the §9 interaction
   contract. §8 is your checklist for the manual audit.
6. **`docs/DECISIONS.md`** — ADR-42 (Storybook adopted) and ADR-43 (owner
   review, currently DRAFT). You finalise both.
7. **`docs/design/design-principles.md` §7** — kit artboard ids, for the audit.
8. **`node_modules/next/dist/docs/`** — Next 16.3.1, React 19.2, Tailwind
   v4.3.3. Not the Next.js in your training data.

---

## What Session 10c shipped (commit `23111c1`, pushed to `session-10b-kit-proof-harness`)

- **Overlay focus-restore bug FIXED** (WCAG 2.4.3). Root cause:
  `useBackgroundInert` was keyed on `mounted`, so the trigger's container
  stayed `inert` through the ~400ms slide-out; `useFocusTrap`'s cleanup called
  `opener.focus()` inside an `[inert]` subtree — a spec no-op — so
  `document.activeElement` fell to `<body>`. Fix in
  `components/kit/internal/overlay.ts`: key inert on `active`, defer + retry
  the restore past the commit flush, lift stale `[inert]`/`aria-hidden`
  ancestors. The 4 overlay components changed
  `useBackgroundInert(rootRef, mounted)` → `(rootRef, active)`. All 4 overlay
  stories green **unchanged**.
- **19 new story files** — one story per applicable `component-states.md §2`
  state + §9 interaction assertions:
  `quantity-stepper`, `banner` (+ `PurchaseDeliveryBanner`), `match-card`,
  `simple-table`, `dense-ledger`, `bulk-entry-grid`, `status-chip`,
  `condition-chip`, `breadcrumb`, `action-tile-grid`, `activity-timeline`,
  `dense-summary-strip`, `flow-header`, `bottom-nav`, `empty-state`,
  `error-state`, `instructional-banner`, `calculated-impact-banner`,
  `components/shells/admin-shell.stories.tsx` (nav-item states only).
- **2 real component a11y fixes the harness exposed**, in
  `components/kit/simple-table.tsx`:
  - `role="row"` was on a `<button>` (invalid — `aria-allowed-role`) → now a
    focusable `div[role="row"]` + Enter/Space keydown handler.
  - `role="columnheader"` was on a `<button>` → role moved to a wrapping
    `<div>`, the `<button>` nested inside as the activation/focus target.
  - skeleton / empty / EmptyState branches given proper
    `role="row"` / `role="cell"` wrappers.
- **Systemic contrast FLAGs** — `color-contrast` scoped off per-story with
  FLAG notes (see task 2 for the full list). All match the drawn Paper
  visuals; routed to a design sprint.
- **Gates green:** `pnpm test` 80/80, `pnpm tsc --noEmit` clean,
  `test-storybook --maxWorkers 2` = **38 suites / 174 tests / 144 visual
  snapshots**, all pass. 144 baselines committed under
  `tests/visual/__screenshots__/`.

**Do NOT redo any of the above.** Session 10b's toolchain + first 15 story
files are already committed (`b42ff1c`).

---

## SCOPE CHANGE — the automated Paper-artboard visual diff is REPLACED by a manual audit

The Session 10b/10c handoffs specced an automated per-state screenshot diff
against the Paper artboard nodes at 2× DSF (handoff task 3 / 4c). **This is
deliberately dropped** for these reasons, and the decision must be recorded
(not silently skipped):

- The kit was already consistency-audited against Paper in Session 2
  (`component-states.md §8`) and rebuilt verbatim from `get_jsx` in Sessions
  3–4b. Session 10 kept every REST visual byte-identical.
- The 144 committed story snapshots already catch **future** drift
  (story-vs-baseline). The only thing the Paper diff would add is a **one-time**
  "does today's baseline still match Paper" check.
- The `paper` MCP has been unreachable (`CONNECT_TIMEOUT`) across 10b and 10c.

**Replacement — a one-time manual Paper-parity audit checkpoint:**

1. Restart the `paper` MCP (`get_guide({ topic: "paper-mcp-instructions" })`
   first). It is **READ-ONLY** — `get_*` only.
   - **If it connects:** for each component in `component-states.md §2`, open
     its Storybook stories side by side with its kit artboard
     (`design-principles.md §7` for ids) and compare each drawn state from
     `§8`. Pull exact values with `get_computed_styles` where anything looks
     off — never decide from a screenshot alone.
   - **If it will not connect:** the human owner does the visual comparison and
     hands you a discrepancy list. Do NOT block the session on the MCP.
2. For every discrepancy found:
   - If it is an **in-scope code bug** (a token/structure/ARIA deviation from
     the approved design — not a redesign): fix it in `components/kit/**`,
     keep the 80 unit tests green + `tsc` clean, re-baseline only the affected
     story after confirming the component (not the story) was wrong.
   - If it is a **design question** (needs a new visual decision): FLAG it in
     `kit-audit.md`, do not decide it — it goes to a design sprint.
3. Record the outcome in `kit-audit.md` under a new
   "Session 10d — Paper-parity audit" heading: what was checked, what matched,
   what was fixed, what was flagged.

**Record the scope change** in `docs/sprints/session-10b-handoff.md` and
`kit-audit.md`: "Automated Paper-artboard visual diff (4c) deferred — the kit
is gated by story-snapshot + axe; Paper parity is verified by a manual audit
checkpoint (Session 10d), not a CI diff."

---

## Remaining tasks

### 1. Manual Paper-parity audit — see the SCOPE CHANGE section above.

### 2. Docs

- **`DECISIONS.md` ADR-42** — add a note: Storybook **9.1.x** was used, not
  v8. v8's Next adapter (`@storybook/experimental-nextjs-vite@8.6.x`) declares
  `next: ^14 || ^15` only; `@storybook/nextjs-vite@9` is the first release
  declaring Next 16 + React 19 support. Owner approved SB 9.1.x.
- **`DECISIONS.md` ADR-43** — finalise (currently DRAFT). Mark all 7
  owner-review items **ratified** (owner approved this session in Storybook):
  1. `Button` `size` prop (`sm` 32 / `md` 36 / `lg` 44; `md` = the sole artboard)
  2. `Toast` — placement, 4-visible stack cap, 4000ms auto-dismiss,
     pause-on-hover, tone + hairline left border
  3. `PageShell` — `--content-max` 1200, `--sp-7`/`--sp-8` padding, sticky
     toolbar row, `wide` / `flush` escape hatches
  4. `PillFilter` as `role="radiogroup"` + arrow-key select
  5. `DatePicker` real-calendar `selected` / `onSelect` API + keyboard nav
     (legacy `weeks` prop kept as an escape hatch)
  6. `QuantityStepper` typed `<input role="spinbutton">` + `↑`/`↓`
  7. `--color-success-hover` / `--color-info-hover` tokens (Banner Accept /
     Match button hover)
- **`docs/design/kit-audit.md`** —
  - Tick the "10 remaining gaps" as **ratified** (owner approved this session).
  - Add the **new flags found by the harness** (Session 10c):
    - **§9.1 ring on field boxes:** `TextInput` / `Textarea` carry `.kit-field`
      (the §9.2 accent *border* on any focus) but NOT `.kit-focus-ring` (the
      §9.1 keyboard-only ring). `Select` has both. Adding a ring to the two
      field boxes is a visual change → design sprint. The `text-input` story
      documents this and asserts the §9.2 border only.
    - **Systemic low-contrast text (one flag, many sites):** `--text-tertiary`
      (`--color-gray-500`) ≈ 3.4:1 on `--surface-page`, and semantic-colour
      text — `--color-warning` ≈ 2.5:1, `--color-danger` / `--color-success`
      on tint or on `--color-gray-900` — all below WCAG AA 4.5:1. Affected,
      all matching the drawn Paper visuals: Select placeholder; DatePicker
      out-of-month / disabled-future cells; StatusChip / ConditionChip warning
      label; Transfer / PurchaseDelivery / CalculatedImpact banner heading &
      body; DenseLedger movement values + dash + empty line + footer tone
      values; BulkEntryGrid category cell / non-editable cell / footer subtle
      labels; DenseSummaryStrip tone values; Breadcrumb parent links;
      ActivityTimeline subtitles; BottomNav inactive labels; AdminShell
      nav-group section labels. `color-contrast` is scoped off per-story with
      a FLAG note in each. → design-sprint decision: darken dimmed text to
      `--text-secondary`, add on-dark / on-tint semantic-colour tokens for
      text use, or accept as incidental / status-indicator text where colour
      is not the only cue.
    - **SimpleTable ARIA (audit miss, FIXED this session):** `role="row"` and
      `role="columnheader"` were on `<button>` elements; corrected to
      role-on-wrapper with a nested button, and the skeleton/empty rows given
      real `role="row"`/`role="cell"`. Record as an audit miss now fixed.
  - Add the **Session 10d Paper-parity audit** result (from task 1).
- **`docs/TEST_PLAN.md`** — two sentences: the kit is gated by Storybook +
  story-snapshot visual-regression + axe (`pnpm test:visual` / `pnpm
  test:a11y`, both the same `test-storybook` run); Paper parity is verified by
  a one-time manual audit checkpoint, not a CI diff. (Do NOT write the full
  Session-11 screen-gate spec — that belongs to Session 11's planner.)
- **`docs/PROGRESS.md`** — a Session 10c + 10d entry: the overlay focus fix,
  the 19 story files, the SimpleTable ARIA fixes, the two flag families, the
  Paper-diff deferral + manual audit, what's carried (nothing, if Gate 4
  closes).
- **`docs/sprints/session-10b-handoff.md`** — flip `Status:` to `done` once
  Gate 4 passes. Also mark `session-10c-handoff.md` and this file `done`.

### 3. Gate 4 (definition of done)

- `pnpm storybook` runs — restart with `pnpm storybook` (may be down after a
  machine restart; it was restarted twice in 10c).
- Every `components/kit/*` component + the 4 primitives (`Spinner`,
  `FormField`, `Toast`, `PageShell`) has a story per state — **already true**,
  spot-check.
- `pnpm test:visual` + `pnpm test:a11y` pass — **already green**; re-run once
  at the end to confirm (`node_modules/.bin/test-storybook --url
  http://127.0.0.1:6006 --maxWorkers 2` — 3+ workers OOM this machine; full
  run ≈ 2–3 min).
- Baselines committed under `tests/visual/__screenshots__/` — **already done**
  (144); commit any re-baselines from task 1.
- **80 `pnpm test` unit tests still green** + `pnpm tsc --noEmit` clean —
  re-verify.
- **`pnpm build` clean** — NOT run in 10c; run it this session.
- **No feature-screen file touched** — hold.

### 4. Commit + push

- Branch is `session-10b-kit-proof-harness` (NOT `main`). Commit the docs +
  any audit fixes/re-baselines. Push the branch.
- If the owner wants it on `main`: open a PR
  (`session-10b-kit-proof-harness` → `main`) with `gh` — do **not** push
  `main` directly (sprint rule: branch first, never commit to `main`).

---

## Constraints

- **Proof harness, not features, not redesign.** No new component behaviour
  except axe-driven a11y fixes and Paper-parity code fixes that are pure
  deviations-from-approved-design (not new decisions).
- **DO touch:** `components/kit/**` (stories + audit fixes), `docs/**`,
  `tests/visual/**`, `.storybook/**` if needed.
- **Do NOT touch feature-screen files** (list at the top).
- **Paper is read-only.** `get_*` only. If it won't connect, proceed without
  it and take the owner's discrepancy list.
- **pnpm only.**
- Keep the **80 unit tests green** and `pnpm tsc --noEmit` clean throughout.

## Practical notes

- Machine restarted twice during Session 10c. Storybook + the test-runner are
  stateless restarts.
- Session 10c's story-writing pattern and the worked examples are documented
  in `session-10c-handoff.md` — reuse if any story needs a touch.
- Expected session length: **short** — roughly half a session. The build work
  is done; this is an audit pass + docs + `pnpm build` + Status flips.
