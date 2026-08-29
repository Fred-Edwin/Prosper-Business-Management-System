# Session 11 Handoff — Developer: **Rebuild the shipped Admin screens as kit compositions + rewrite the workflow docs**

**Status:** NOT STARTED. **UNBLOCKED** — Session 10b/10c/10d closed Gate 4
(the kit is now Storybook + story-snapshot + axe gated; `DECISIONS.md`
ADR-42 + ADR-43 finalised; `kit-audit.md` "Session 10d — Paper-parity
audit" recorded). Latest commit on `session-10b-kit-proof-harness`:
`16897ba`.

**Role:** Developer, Prosper project. **Development Sprint.** This session
re-assembles the already-shipped M1 Admin screens as **compositions of the
now-proven component kit** (Sessions 9 + 10 + 10b–10d), replacing **only the
transcribed JSX**. It keeps **every hook, every `lib/domain` module, every
`app/api` route, every `derive-*` / `opening-plan` function** exactly as they
are. This is **not** a backend change, **not** a logic change, and **not** a
design sprint.

---

## Why this session exists

Sessions 3–7 built the screens by `get_jsx` **transcription** of Paper
artboards — pixel-faithful copies with bespoke inline markup, raw off-scale
values, hand-rolled drawers/backdrops, and no interaction states. Sessions
9–10d then rebuilt the component kit properly (tokens, the §9 interaction
contract, keyboard, ARIA, real overlays, 4 new primitives) and gated it
forever with Storybook + visual-regression + axe. The screens now sit on top
of an **old, hand-transcribed layer** that diverges from the proven kit —
wrong `--surface-panel-tint` panels, no `<PageShell>`, no `<FormField>`, no
`<Toast>`, inline tables where a kit component exists.

**This session brings the screens onto the kit.** The Paper artboard is the
**visual acceptance target** — it is never copied into code again. Screens
are *composed* from `<Button>`, `<Drawer>`, `<PageShell>`, `<FormField>`,
`<Toast>`, `<SimpleTable>`, `<DenseLedger>`, `<EmptyState>` / `<ErrorState>`,
etc., and visual-diffed against the artboard.

---

## Required reading (before any code)

1. **`CLAUDE.md`** — role model, **pnpm only**, **post a visible checklist**
   (`TodoWrite` if available, else a re-posted markdown checklist).
2. **`docs/design/kit-audit.md`** — the per-component before → after record +
   the "Session 10d — Paper-parity audit" section + the harness-surfaced
   flags. This is the authoritative "what each kit component now does".
3. **`docs/design/component-states.md`** §2 (per-component state matrix) + §9
   (implementation status table — every component marked `implemented`).
4. **`docs/DECISIONS.md`** —
   - **ADR-41** — `--surface-raised` (opaque panel fill); `--surface-panel-tint`
     retired from the kit, **you delete the alias this session**.
   - **ADR-42** — Storybook 9.1.x adopted; the kit's permanent gate.
   - **ADR-43 (RATIFIED)** — the 4 primitives + the final `Toast` /
     `PageShell` / `DatePicker` / `QuantityStepper` API shapes + `Button`
     `size` + `PillFilter` radiogroup + the 2 hover tokens.
   - **ADR-37a/b/c** — `DenseLedger` `showLocation` / `horizontalScroll`,
     `Drawer` `variant="rail"`, `FlowHeader` `directionTone`.
   - **ADR-36a/b/c/d** — no CORRECTED chip (underlined cell); sidebar-collapse
     persists via `localStorage`; friction-dialog label props; EmptyState /
     ErrorState are kit components.
   - **ADR-38 / ADR-39 / ADR-40** — Catalog & Stock API contracts (so you
     don't accidentally change a call). **Do not touch these code paths.**
5. **`app/design-system/tokens.css`** + **`tokens.ts`** — the token vocabulary.
6. **`app/globals.css` §9** — the `.kit-*` utilities the kit composes.
7. **Every screen file in scope** (listed below) — know exactly which markup
   is being replaced and which hook / `derive-*` / `opening-plan` call must be
   preserved **verbatim**.
8. **`node_modules/next/dist/docs/`** — Next **16.3.1**, React 19.2, Tailwind
   v4.3.3. **This is not the Next.js in your training data.** Read the
   relevant guide before any config / route change.
9. **The Paper file** ("Prosper Hotel", `01M0EZ7TAHZM26KBMWNYT0928X`, page
   "Shell+Component kit") — **READ-ONLY**, `get_*` only.
   `get_guide({ topic: "paper-mcp-instructions" })` first. `get_screenshot` per
   screen artboard for the per-screen visual-diff; `get_computed_styles` for
   any exact value in doubt. **Never eyeball a screenshot for a value.** (The
   `paper` MCP has been intermittent — if it will not connect, proceed with
   the committed `/design-preview` skeletons as the visual reference and note
   it; do not block the session.)

---

## Scope

### A. Rebuild these 5 Admin screen clusters as kit compositions

**Keep ALL data / logic. Replace ONLY the JSX.** Line counts are the current
transcription size — expect each to shrink substantially once it composes kit
components.

| Route | Current file(s) | Compose from |
|---|---|---|
| `/admin/catalog` | `app/admin/catalog/catalog-client.tsx` (344), `product-drawer.tsx` (374), `product-delete-dialog.tsx` (107) | `<PageShell>` + `<Tabs>` (All / Ingredients / Dishes / Goods) + `<SearchInput>` + `<SimpleTable>` (desktop) / a mobile card list at `< --bp-md` + `<Drawer>` (create/edit) + `<FormField>` wrapping `<TextInput>` / `<Select>` / `<SegmentedControl>` (Product Kind) / `<ToggleSwitch>` (per-location availability rows) + `<FrictionDeleteDialog>` (pass `cancelLabel="Keep Product"` / `confirmLabel="Delete Product"` per ADR-36c) + `<Toast>` on save success |
| `/admin/stock` | `app/admin/stock/stock-client.tsx` (328), `correction-drawer.tsx` (190) | `<PageShell wide>` + `<PillFilter>` (Location) + `<Tabs>` if the screen has the All/Store/Restaurant/Canteen row + `<DatePicker>` (real-calendar mode, `selected` / `onSelect`) + `<DenseLedger showLocation horizontalScroll onCellClick loading>` + `<EmptyState variant="filtered">` (no movements for filter) / `<ErrorState>` (fetch failed) + `<Drawer variant="rail">` for the correction drawer + `<CalculatedImpactBanner>` (impact preview) + `<FormField>` + `<Textarea>` (Reason for Adjustment) + `<QuantityStepper>` + `<Toast>` on correction saved |
| `/admin/stock/opening` | `app/admin/stock/opening/opening-client.tsx` (293) | `<PageShell>` + `<Breadcrumb>` + `<InstructionalBanner>` (numbered) + `<Tabs>` + `<BulkEntryGrid>` + `<Toast>` per saved row |
| `/admin/financials` | `app/admin/financials/financials-client.tsx` (406), `payment-drawer.tsx` (236) | `<PageShell>` + `<Tabs>` + `<SimpleTable>` (stock-purchase table) + `<StatusChip>` (Delivery Status: Matched / Pending / Awaiting receipt / Closed) + `<MatchCard>` for each reconciliation item, the list wrapped in `role="list"` + `<Drawer variant="rail">` (record-payment) + `<FormField>` / `<Select>` (paid-from account) + `<Toast>` on payment recorded. **KPI stat strip stays `—` / "M3"** (ADR-36 D-FIN — no F2 data source; do NOT wire it, do NOT delete the markup slot yet) |
| `/admin` & `/cashier` role homes | `app/admin/page.tsx`, `app/cashier/page.tsx` | Already use `<EmptyState>` — **just confirm** they import the kit component and render cleanly. No rebuild needed. |

**Responsive requirement:** `/admin/catalog` and `/admin/stock` swap a mobile
card/stack layout for the desktop table at `--bp-md`. The kit `<SimpleTable>`
/ `<DenseLedger>` are the desktop side; the mobile side is a composed card
list (kit `<Card>`-ish primitives + `<StatusChip>` / `<ConditionChip>`), not
a second table. Match the mobile artboards (`8L7-0` catalog, `8Q4-0` stock).

### B. Adopt the new primitives everywhere in scope

- **`<PageShell>`** owns every screen's content region — `--content-max`
  (1200), page padding (`--sp-7` block / `--sp-8` inline), the sticky toolbar
  slot. This kills the "stock body doesn't fill the viewport like catalog"
  divergence. Use `<PageShell wide>` for `/admin/stock` (the ledger needs the
  full width), default for the rest.
- **`<FormField>`** wraps every labelled form control — it authors the §9.8
  helper/error row and wires `aria-describedby` / `aria-invalid`. The field
  components (`TextInput` / `Textarea` / `Select` / `QuantityStepper`) keep
  their `error?: boolean` + `helperText?: string` API, so the screen passes
  the same props it does today — just through `<FormField>`.
- **`<Toast>`** on every save / record / correction success. Wrap the **admin
  route tree** in `<ToastProvider placement="top-right">` (do this once, in
  `app/admin/layout.tsx` or `admin-shell-client.tsx` — whichever is the right
  client boundary; check before editing). The staff tree gets
  `placement="bottom-center"` in Session 12, not here.
- **`<EmptyState>` / `<ErrorState>`** for every table/list empty and every
  fetch error. `<EmptyState variant="filtered">` (with a "Clear filters"
  action) for a table that has data but the current filter matches nothing;
  plain `<EmptyState>` for genuinely-no-records.

### C. Token cleanup — delete the `--surface-panel-tint` alias

1. `grep -rn "surface-panel-tint" app/ components/` — current consumers:
   - `app/admin/catalog/product-drawer.tsx:163` — the drawer panel fill. This
     goes away when the drawer becomes `<Drawer>` (opaque `--surface-raised`).
   - `app/design-preview/{asset-delete-dialog,product-drawer,asset-drawer,admin-stock-ledger-drawer-open,product-delete-dialog,kit}/page.tsx`
     — the `/design-preview` skeletons. Migrate each to `--surface-raised` (or
     to the kit component, if the skeleton is trivially a kit composition).
   - `components/kit/*` + `internal/overlay.ts` — **comments only**, leave.
   - `app/globals.css`, `app/design-system/tokens.{css,ts}`,
     `tokens.test.ts` — the alias definition + the drift-test line.
2. Once `grep` shows **zero non-comment consumers** in `app/` + `components/`,
   delete the alias from `tokens.css` + `tokens.ts` + the assertion in
   `tokens.test.ts`. Run the token drift test — it must still pass.
3. `--color-gold-brand` (masthead) remains the sole approved raw-hex
   exception — do **not** touch it.

### D. Doc rewrites

- **`docs/design/export-workflow.md`** — rewrite. Screens are **composed**
  from kit components; Paper markup is **never** copied into code; the Paper
  artboard is the **visual acceptance target**, pulled with `get_screenshot` /
  `get_computed_styles` for the per-screen diff. Retire the old `get_jsx` →
  frame-drop → component-swap → screenshot-verify flow (keep a short
  "historical: how Sessions 3–4 worked" note so the change is legible).
- **`CLAUDE.md`** — update the "Design Sprints / Development Sprints"
  paragraphs and the "Where to look" table: point at `kit-audit.md` +
  `component-states.md §9` + the rewritten `export-workflow.md`. The
  Development-Sprint description should say screens are composed from the
  proven kit, not transcribed.
- **The sprint handoff template** (if one exists as a file — otherwise skip) —
  reflect the composed-screen per-screen gate.
- **`docs/design/design-principles.md §9`** — promote it from "spec" to a
  first-class **enforced** contract (it now is one — the Storybook
  `postVisit` interaction assertions enforce it per-component).
- **`docs/sprints/milestone-1-plan.md §5/§6`** — confirm the re-sequenced
  order still reads right (10 → 10b–10d → **11** → 12 F2 SM/Canteen → 13 F3 →
  QA) and tick Session 11 once done.
- **`docs/TEST_PLAN.md`** — add the composed-screen gate (see the per-screen
  gate below). `§2a` (kit gating) is already written — leave it.
- **`docs/PROGRESS.md`** — a Session 11 entry (what was rebuilt, the primitive
  adoption, the token deletion, the doc rewrites, what's carried).
- **`docs/DECISIONS.md`** — an ADR **only if** the rebuild forces a real
  decision (next free number → **ADR-44**). Composition that "just works" from
  the kit needs no ADR.
- **`docs/sprints/session-12-handoff.md`** — draft it (see "Wrap-up").

---

## Per-screen gate

For each rebuilt screen cluster, **all** of:

1. **Visual-diff vs the Paper artboard** (default / rest state) — the artboard
   is the acceptance target. `get_screenshot` the artboard node at 2× and
   compare; pull exact values with `get_computed_styles` for anything that
   looks off. (If `paper` is unreachable, diff against the committed
   `/design-preview/<slug>` skeleton and note it.)
2. **Playwright interaction pass** — a `*.spec.ts` under `tests/` (new
   `tests/screens/` dir; `pnpm test:e2e` already wired to Playwright) that
   drives the interactive elements through hover / focus / pressed / disabled
   / loading / empty / error and asserts the right kit behaviour (drawer
   opens + traps focus + Esc restores to opener; toast fires on save;
   `<EmptyState>` renders on an empty filter; `<ErrorState>` on a mocked fetch
   failure).
3. **Responsive** — the mobile card layout ↔ desktop table swap happens at
   `--bp-md`, both match their artboards.
4. **axe** — no serious/critical violations on the rendered screen.

Global gates (unchanged): **`pnpm test` 80 unit tests stay green**
(add screen-level specs, do **not** weaken the unit suite); `pnpm tsc
--noEmit` exit 0; `pnpm build` clean; the kit's `pnpm test:visual` +
`pnpm test:a11y` still pass (you should not be touching `components/kit/*` —
if you do, re-run them).

---

## Constraints

- **Composition, not transcription, not redesign.** No new visual design
  decisions. If a screen genuinely needs one (a state the kit + artboards
  don't cover), **STOP and flag it** in `PROGRESS.md` + raise it — it goes
  back to a Design Sprint. Do not decide it ad hoc.
- **Do NOT change data / logic.** Untouchable:
  `app/admin/catalog/use-catalog.ts`, `app/admin/stock/use-stock.ts`,
  `app/admin/stock/derive-ledger.ts`,
  `app/admin/stock/opening/opening-plan.ts`, their `*.test.ts` siblings, and
  everything under `lib/domain/**`, `lib/validation/**`, `lib/api/**`,
  `app/api/**`. If a kit component's prop shape doesn't fit a screen's data,
  write a **mapper in the screen**, never a change in the kit.
- **Do NOT touch `components/kit/*` or `components/shells/*`.** They are
  proven and gated. The one exception: if composing a screen reveals a real
  kit bug (not a missing feature), fix it in the kit, re-run
  `pnpm test:visual` + `pnpm test:a11y`, re-baseline only the affected story,
  and note it — same rule as Session 10d.
- **Do NOT touch feature screens outside this Admin scope** — Store Manager /
  Canteen / Cashier screens are Session 12. `docs/design/screens/**` and the
  other `/design-preview/**` routes are regression fixtures — migrate only the
  6 that reference `--surface-panel-tint` (task C), leave the rest.
- **pnpm only.** Read `node_modules/next/dist/docs/` before any config / route
  / middleware change.
- **Keep the 80 unit tests green** throughout.
- **Git:** you are on `session-10b-kit-proof-harness` (NOT `main`). Commit the
  rebuild + doc rewrites there. If the owner wants M1 on `main`, that is a PR
  (`session-10b-kit-proof-harness` → `main`) opened with `gh` — never push
  `main` directly.

---

## Suggested order (one context window)

1. **Read** — the required-reading list, then all 8 screen files, noting per
   file: (a) the hook / derive / plan call to preserve verbatim, (b) which
   kit component each markup block maps to, (c) any block with no kit
   equivalent (flag candidate).
2. **`<ToastProvider>`** into the admin tree (one edit) + a throwaway toast on
   one save path to prove the wiring, then remove the throwaway.
3. **`/admin/catalog`** — the simplest cluster and the one with the clearest
   kit mapping. Rebuild `catalog-client` → `product-drawer` →
   `product-delete-dialog`. Run its per-screen gate. Commit.
4. **`/admin/financials`** — `<SimpleTable>` + `<MatchCard>` + rail drawer.
   Gate. Commit.
5. **`/admin/stock`** — the hardest: `<DenseLedger>` with all the ADR-37a
   props + the rail correction drawer + `<CalculatedImpactBanner>` +
   `<EmptyState variant="filtered">` / `<ErrorState>`. Gate. Commit.
6. **`/admin/stock/opening`** — `<BulkEntryGrid>` + `<InstructionalBanner>` +
   `<Breadcrumb>`. Gate. Commit.
7. **Token cleanup (C)** — migrate the 6 `/design-preview` consumers + the
   `product-drawer` line (already gone if step 3 is done), delete the alias,
   run the drift test.
8. **Doc rewrites (D)** + draft `session-12-handoff.md`.
9. **Full gate sweep** — `pnpm test` (80), `pnpm tsc --noEmit`, `pnpm build`,
   `pnpm test:visual` + `pnpm test:a11y`, every screen spec. Commit. Push.

---

## Wrap-up (definition of done)

- All 5 Admin screen clusters rebuilt as kit compositions; every hook /
  `derive-*` / `opening-plan` / `lib/domain` / `app/api` unchanged
  (`git diff --stat` confined to `app/admin/**` JSX + `app/design-preview/**`
  + `docs/**` + `app/design-system/tokens.*`).
- `<PageShell>` / `<FormField>` / `<Toast>` / `<EmptyState>` / `<ErrorState>`
  adopted across the scope.
- `--surface-panel-tint` alias **deleted** from `tokens.css` + `tokens.ts` +
  `tokens.test.ts` (grep-confirmed zero non-comment consumers); drift test
  green.
- `export-workflow.md` rewritten; `CLAUDE.md` + `design-principles.md §9` +
  `milestone-1-plan.md §5/§6` + `TEST_PLAN.md` updated.
- `docs/PROGRESS.md` — Session 11 entry.
- `docs/DECISIONS.md` — ADR-44 only if a real decision was forced.
- Per-screen gate green for all 5; global gates green (80 unit, tsc, build,
  kit visual + a11y).
- **`docs/sprints/session-12-handoff.md` drafted:** "M1-F2 Store Manager +
  Canteen frontend, built the new way" — move the 7 SM/Canteen skeletons
  (`store-manager-mobile-hub`, `store-manager-flows-issues-production`,
  `store-manager-flows-transfers-consumption`, `store-manager-stock-levels`,
  `canteen-mobile-operations-hub`, `canteen-transfer-dispatch`,
  `canteen-stock-levels`) to `app/store-manager/*` + `app/canteen/*`; compose
  from the kit (`<PageShell>` / `<BottomSheet>` / `<Toast placement="bottom-center">`
  / `<FlowHeader directionTone>` / the persistent `<TransferBanner>` /
  `<PurchaseDeliveryBanner>` pinned→accept/flag→timeline flow / the 2-phase
  transfer accept via `POST /api/stock-movements/:id/accept`); wire against
  the F2 stock APIs (Session 6) — fixtures behind the same interface real data
  uses, `TODO(mock)` each; per-screen gate as in this session. Then Session 13
  (F3 Assets) then the QA pass.

---

## Practical notes

- The `/design-preview/<slug>` routes and `docs/design/screens/<slug>/` dirs
  are **regression fixtures** — they render the Session 3–4 skeletons with
  `fixtures.ts` data. Session 5/7 already moved the real screens to
  `app/admin/**` and dropped fixtures from those copies. This session rebuilds
  the `app/admin/**` copies; the `/design-preview` copies stay as the "what it
  looked like" reference (except the 6 you migrate off `--surface-panel-tint`).
- `app/admin/financials/financials-client.tsx` still carries the KPI stat-strip
  markup from the Session 4a export (owner chose "export as drawn"). Keep the
  slot, keep it unwired (`—` / "M3"). Removing it is an M3 design-sprint call,
  not this session's.
- Storybook: `pnpm storybook` (port 6006). The test-runner needs it up:
  `node_modules/.bin/test-storybook --url http://127.0.0.1:6006 --maxWorkers 2`
  (3+ workers OOM this machine; full run ≈ 2 min). You should not need to
  re-baseline anything unless you touch `components/kit/*`.
- The local Postgres must be running for `pnpm test` (the catalog/stock/auth
  domain tests are DB-backed). If 8 test files fail with `beforeAll` hook
  timeouts, the DB is down — start it, don't debug the tests.
- Expected session length: **long** — 5 screen clusters + token cleanup + 5
  doc rewrites. If context runs short, the natural split is after
  `/admin/catalog` + `/admin/financials` (commit), with `/admin/stock` +
  `/opening` + docs as a continuation — but prefer to finish; the handoff for
  a mid-rebuild state is expensive.
