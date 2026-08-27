# Sprint 05 — Lessons Learned

Retrospective on the Screen Reassembly design sprint: mistakes made and
caught, corrections applied, and process decisions worth carrying
forward. Kept as a standing retrospective; the sprint's own handover
doc (what-was-built, since scrapped) has been deleted.
`docs/design/paper-workflow-lessons.md` covers Paper tool mechanics;
`docs/design/export-workflow.md` codifies the design-sprint-vs-development-sprint
boundary this retro flagged as needing to be explicit. This file is the
broader "what would we do differently" record.

---

## 1. Mistakes that shipped and had to be caught by review

These weren't caught by process — they were caught because the user
looked closely at screenshots and asked questions. That's a signal the
self-review step wasn't tight enough on its own.

- **Ledger table clipping/misalignment.** Built a 13-column table without
  checking whether the content pane could actually fit it, and the
  footer ended up 132px narrower than the data rows because a Location
  cell was missing from it — invisible in a quick screenshot glance,
  obvious once someone looked for column alignment specifically.
- **Banner icon-gap bug.** An icon + text-block row used
  `justify-content: space-between` (inherited from a clone that
  originally had more children) instead of `flex-start` + `gap` — pushed
  the icon and text to opposite ends of the row. Shipped on two
  screens (Store Manager Hub, Canteen Hub) before the user caught it
  and asked for a fix, and it was present in the *first* banner built
  and then propagated into everything cloned from it.
- **2x2 grid rendering as mismatched-width boxes.** A flex-wrap grid
  with only `flexGrow: 1` (no `flexBasis`) sized each tile by its own
  content instead of splitting evenly — two narrow tiles, two
  full-width tiles, despite looking like a uniform grid was intended.
- **Recurring nav-deactivation bug.** On at least two separate screens,
  the duplicated shell's Dashboard nav item kept its active-state
  background because the fix targeted an assumed node ID from a
  previous duplication's `descendantIdMap`, rather than re-verifying
  the actual node ID with `find_nodes` on *this* duplicate. Caught,
  fixed, and explicitly written into the rules — then happened again on
  a later screen anyway, showing that writing the rule down once wasn't
  enough; it had to become a checklist step actually executed in order,
  not "kept in mind."

**Takeaway:** static screenshots of the whole page are not sufficient
self-review for structural correctness (column alignment, row/footer
parity, nav-state correctness) — those need an explicit, itemized check
per screen, not "eyeball the final render and move on."

## 2. A systemic issue that only surfaced through a dedicated audit

The five bugs above were found by looking at individual screens. A much
bigger, invisible issue — raw hex/alpha-hex color values used instead
of design tokens on the sidebar/header chrome — was present on **every
single one of the 21 screens** and would not have been caught by
per-screen review, because it never rendered visibly wrong. It only
surfaced because a dedicated coverage-and-token audit was run across
the whole file at the end, specifically looking for exactly this kind
of defect.

**Takeaway:** some classes of problem (token hygiene, kit-coverage gaps)
are structurally invisible to visual review and need a separate,
explicit audit pass — not folded into "does this screen look right."
Run that audit *before* declaring a body of work done, not after the
user asks "are we ready."

## 3. The audit also found real gaps, not just violations

The same audit surfaced one genuine coverage gap: a "back-navigation
flow header" pattern (chevron + title + direction badge) was built
identically five times across five screens without ever being added to
the Component Kit — each occurrence was a correct, working
implementation, so nothing looked broken; it was only a gap in the
*system*, not in any individual screen.

**Takeaway:** a pattern being built correctly and consistently is not
the same as a pattern being *in the kit*. If it's used more than once,
it needs to be formalized, and that's easy to miss when each individual
use looks fine in isolation.

## 4. Process discipline that worked and should be repeated

- **Delegating the coverage audit to a subagent** was the right call —
  cross-referencing 21 screens against 16 kit artboards by hand is
  exactly the kind of large, mechanical, error-prone task that benefits
  from a dedicated pass with a narrow, precise brief, rather than being
  squeezed into the main session's already-long context.
- **Delegating the token-propagation fix similarly.** Once the pattern
  was established on one shell (source-of-truth fix, verified pixel-
  identical), applying the identical mechanical fix to 4 more shells and
  19 screens was handed off rather than done by hand — and the agent
  self-caught its own property-name mistake (`color` vs
  `backgroundColor`) mid-task by cross-checking against the reference
  node, which is the kind of verification discipline worth expecting
  from delegated work.
- **Flagging rather than guessing.** Both delegated audits correctly
  left ambiguous cases alone instead of forcing a fit — three leftover
  hex values that didn't cleanly match any new token were reported and
  left untouched rather than papered over with an approximate mapping.
  This is the right default: an honest "doesn't match, flagging" beats
  a confident wrong guess.
- **Writing decisions down the moment they're made**, not batching it
  for later. The handover doc's "open questions" section got resolved
  incrementally, in place, as each question was actually answered in
  conversation — not reconstructed from memory at the end.

## 5. Process gaps worth fixing going forward

- **The written rule about verifying nav-item IDs per-duplicate was
  added *after* the bug happened once, then the same bug happened again
  anyway on a later screen.** Writing a lesson into a memory/handover
  document is necessary but not sufficient — it needs to be converted
  into an actual step performed in sequence for every subsequent screen,
  not just "available to remember." Worth considering whether repetitive
  multi-screen work like this should carry an explicit todo-list
  checkpoint per screen (verify nav state, verify column parity, verify
  no raw hex) rather than relying on the pattern being applied from
  memory each time.
- **Screenshotting an isolated inner node (not the top-level artboard)
  produces a misleading dark-canvas background that looks like a
  contrast/color bug but isn't one.** This caused at least two false
  alarms during the sprint (thinking rows had "gone black" when it was
  just Paper's canvas showing through an unbounded frame). The fix
  (screenshot only top-level artboards for verification) was learned
  and documented, but only after tripping on it more than once.
- **Distinguish "design sprint deliverable" from "development sprint
  deliverable" explicitly and early, not when the user asks.** The
  skeleton-JSX-vs-live-JSX distinction (mock data, no fetches, no APIs,
  `TODO(mock)` markers) is already implied by `CLAUDE.md`'s SDLC
  description, but it took a direct question from the user to make the
  reasoning explicit rather than it being stated proactively when
  scoping the export task.

## 6. What to carry into future sprints

1. Before calling a multi-screen body of work "done," run (or delegate)
   an explicit audit for: token/hex hygiene, kit-coverage gaps, and
   structural parity (column counts, footer/header alignment) — don't
   rely on the same visual pass that checked layout and content.
2. When a bug is found and a rule is written down to prevent recurrence,
   treat that rule as a checklist item to execute on every remaining
   instance of the task, not a fact to remember.
3. Screenshot top-level artboards for verification, not inner frames —
   inner-frame screenshots are for zoomed-in detail only, and their
   background color should not be trusted.
4. State the design-sprint-vs-development-sprint boundary explicitly
   when scoping any export/handoff task, before being asked — mock
   data, no live wiring, `TODO(mock)` markers, per `CLAUDE.md`.
5. Delegate large mechanical cross-referencing or propagation tasks
   (coverage audits, systemic fixes) to a subagent with a narrow,
   precise brief rather than doing them inline — but keep the
   instruction to flag-not-guess on ambiguous cases explicit in that
   brief.
