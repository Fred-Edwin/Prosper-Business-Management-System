# Session 11 Handoff — Developer: **Rebuild the shipped screens as kit compositions + rewrite the workflow docs**

**Status:** NOT STARTED. **Blocked on Session 10b** (the kit must be
Storybook/visual/a11y-gated first).

**Role:** Developer, for the Prosper project. This session re-assembles the
already-shipped M1 screens as **compositions of the now-proven component kit**
(Sessions 9 + 10 + 10b), replacing only the transcribed JSX. It keeps **every
hook, every `lib/domain` module, every `app/api` route** exactly as they are —
this is not a backend or logic change.

---

## Why this session exists

Sessions 3–7 built the screens by `get_jsx` **transcription** of Paper
artboards — pixel-faithful copies with bespoke inline markup, raw values, and
no interaction states. Sessions 9–10b rebuilt the component kit properly
(tokens, §9 contract, keyboard, ARIA, overlays, 4 new primitives) and gated it.
The screens now sit on top of an old, hand-transcribed layer that diverges from
the proven kit. This session brings them onto the kit.

**The Paper artboard is the visual acceptance target — it is never copied into
code again.** Screens are *composed* from `<Button>`, `<Drawer>`, `<PageShell>`,
`<FormField>`, `<Toast>`, `<SimpleTable>`, `<DenseLedger>`, `<EmptyState>` /
`<ErrorState>`, etc., and visual-diffed against the artboard.

---

## Required reading

1. **`CLAUDE.md`** — role model, **pnpm only**, **visible checklist**.
2. **`docs/design/kit-audit.md`** + **`docs/design/component-states.md §9`** —
   what each kit component now does and how to use it.
3. **`docs/DECISIONS.md`** — ADR-41 (`--surface-raised`), ADR-42 (Storybook),
   ADR-43 (the 4 primitives + `Toast`/`PageShell`/`DatePicker`/`QuantityStepper`
   final API), ADR-37a/b/c (`DenseLedger showLocation`/`horizontalScroll`,
   `Drawer variant="rail"`, `FlowHeader directionTone`).
4. **`app/design-system/tokens.css`** + **`tokens.ts`** — the vocabulary.
5. **`app/globals.css §9`** — the `.kit-*` utilities.
6. **Every current screen file** in scope (below) — know what markup is being
   replaced and which hook/`derive-*`/`opening-plan` call must be preserved
   verbatim.
7. **`node_modules/next/dist/docs/`** — Next 16.3.1. Not your training data.
8. **The Paper file** — READ-ONLY. `get_screenshot` per screen artboard for
   the per-screen visual-diff.

---

## Scope

### Screens to rebuild as kit compositions (keep all data/logic)

| Route | Current file(s) | Compose from |
|---|---|---|
| `/admin/catalog` | `app/admin/catalog/catalog-client.tsx`, `product-drawer.tsx`, `product-delete-dialog.tsx` | `<PageShell>` + `<Tabs>` + `<SearchInput>` + `<SimpleTable>` (desktop) / mobile card list + `<Drawer>` + `<FormField>`/`<TextInput>`/`<Select>`/`<SegmentedControl>`/`<ToggleSwitch>` + `<FrictionDeleteDialog>` + `<Toast>` on save |
| `/admin/stock` | `app/admin/stock/stock-client.tsx`, `correction-drawer.tsx` | `<PageShell wide>` + `<PillFilter>` + `<DatePicker>` + `<DenseLedger showLocation horizontalScroll onCellClick loading>` + `<EmptyState>` filtered / `<ErrorState>` + `<Drawer variant="rail">` correction + `<CalculatedImpactBanner>` + `<FormField>` + `<Toast>` |
| `/admin/stock/opening` | `app/admin/stock/opening/opening-client.tsx` | `<PageShell>` + `<Breadcrumb>` + `<InstructionalBanner>` + `<Tabs>` + `<BulkEntryGrid>` + `<Toast>` per saved row |
| `/admin/financials` | `app/admin/financials/financials-client.tsx`, `payment-drawer.tsx` | `<PageShell>` + `<Tabs>` + `<SimpleTable>` + `<StatusChip>` + `<MatchCard>` (reconciliation list wrapped in a `role="list"`) + `<Drawer variant="rail">` payment + `<FormField>`/`<Select>` + `<Toast>`. KPI strip stays `—` (M3, ADR-36). |
| `/admin` `/cashier` role homes | `app/admin/page.tsx`, `app/cashier/page.tsx` | `<EmptyState>` (already clean — just confirm it's the kit component) |

**Keep verbatim, do not touch:** `use-catalog.ts`, `use-stock.ts`,
`derive-ledger.ts`, `opening/opening-plan.ts`, everything under
`lib/domain/**`, `lib/validation/**`, `lib/api/**`, `app/api/**`. The rebuild
replaces JSX and swaps in kit components — the data path is unchanged.

**Adopt the new primitives:** every screen uses `<PageShell>` for its content
region (kills the "stock body doesn't fill the viewport like catalog" bug);
every form uses `<FormField>`; every save/record action fires a `<Toast>`
(wrap the admin tree in `<ToastProvider placement="top-right">`, the staff
tree in `<ToastProvider placement="bottom-center">`); every table/list
empty/error uses `<EmptyState>` / `<ErrorState>`.

### Token cleanup

- **Delete the `--surface-panel-tint` deprecated alias** from `tokens.css`
  (+ its `tokens.ts` entry + the drift-test line that asserts it) **once no
  screen references it** — grep `--surface-panel-tint` across `app/` and
  `components/` and confirm zero hits first. (Session 10 migrated the kit off
  it; this session migrates the last consumers — the `/design-preview` washes
  and any screen still using it — then it's safe to remove.)

### Doc rewrites

- **`docs/design/export-workflow.md`** — rewrite: screens are **composed** from
  kit components; Paper markup is **never** copied into code; the Paper
  artboard is the **visual acceptance target**, pulled with `get_screenshot` /
  `get_computed_styles` for the per-screen diff. The old `get_jsx` →
  frame-drop → component-swap flow is retired.
- **`CLAUDE.md`** — update the "Design Sprints / Development Sprints" section
  and the "Where to look" table to point at the new workflow + `kit-audit.md`
  + `component-states.md §9`.
- **The sprint handoff template** — reflect the composed-screen gate.
- **`docs/design/design-principles.md §9`** — promote §9 to a first-class,
  enforced contract (it now is one, per Session 10).
- **`docs/sprints/milestone-1-plan.md §5`/`§6`** — confirm the re-sequenced
  order (10 → 10b → 11 → 12 F2 Store Manager/Canteen → 13 F3 → QA).

### Per-screen gate

For each rebuilt screen: **visual-diff vs the Paper artboard (default state)**
+ a **Playwright interaction pass** (hover / focus / pressed / disabled /
loading / empty / error on the interactive elements) + **responsive** (mobile
card ↔ desktop table swap at `--bp-md`) + **axe** (no serious/critical). The
`pnpm test` unit suite (80) stays green; `pnpm tsc --noEmit` + `pnpm build`
clean.

---

## Constraints

- **Composition, not transcription, not redesign.** No new visual design
  decisions — if a screen needs one, **stop and flag it** (it goes back to a
  Design Sprint). The kit is proven; use it as-is.
- **Do NOT change data/logic.** Hooks, `derive-*`, `opening-plan`,
  `lib/domain`, `app/api` — untouched. If a kit component's prop shape doesn't
  fit a screen's data, adapt in the screen (a mapper), not in the kit.
- **pnpm only.** Read `node_modules/next/dist/docs/` before any config/route
  change.
- Keep the **80 unit tests green**; add screen-level Playwright specs, don't
  weaken the unit suite.

---

## Wrap-up

- All five screens rebuilt as kit compositions; every hook / `derive-*` /
  `lib/domain` / `app/api` unchanged.
- `--surface-panel-tint` alias deleted from `tokens.css` + `tokens.ts` + the
  drift test (grep-confirmed no consumers).
- `export-workflow.md` rewritten; `CLAUDE.md` + the handoff template +
  `design-principles.md §9` + `milestone-1-plan.md §5/§6` updated.
- `docs/TEST_PLAN.md` — the composed-screen gate.
- `docs/PROGRESS.md` — Session 11 entry.
- `docs/DECISIONS.md` — an ADR only if the rebuild forced a real decision
  (next free number after ADR-43 → **ADR-44**).
- `docs/sprints/session-12-handoff.md` drafted: **"F2 Store Manager + Canteen
  frontend, built the new way"** (compose the 7 SM/Canteen screens from the
  kit; the hubs + stock-levels + flow screens; adopt `<PageShell>` /
  `<BottomSheet>` / `<Toast>` / `<FlowHeader>`; keep the fixtures behind the
  same interface real data will use, `TODO(mock)` each; per-screen gate as
  above).
