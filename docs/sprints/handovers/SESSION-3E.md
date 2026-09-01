# HANDOVER — Session 3e · Developer · FilterToolbar retrofit (all screens)

**Paste this whole file as your first message in a fresh session.**
Branch: `feat/m2-3e-filter-retrofit` **off `feat/m2-3kit-filter-toolbar`**
(`f45b7d9` — you need the proven `FilterToolbar` component). You will
also need 3a's Sales screen and 3b's mobile screens — cherry-pick or
merge them in (see §0.1).

**ONE SESSION AT A TIME. You are the only active code session. Do NOT run
`git checkout` / `git stash` / `git branch` against anything but your own
branch. Commit before you exit.**

---

## 0. Context / urgency

Prosper is overdue; pushing Submission 1 = M1 + M2 ("staff can sell every
day"), **every screen matching Paper**. You are the **Developer this
session** (`CLAUDE.md`): compose screens from the **proven kit**, no kit
changes, no new UI/UX decisions (flag instead), no Milestone 3.

**The job:** the owner's decision — replace **every** dismissible-pill /
ad-hoc filter row with the single proven **`FilterToolbar`** kit
component (built + ADR-42-gated by 3-KIT-FILTER). This is the last screen
session before FINAL.

### 0.1 Branch setup

`FilterToolbar` is on your base (`feat/m2-3kit-filter-toolbar`). You also
need:
- **3a's Sales screen** (`feat/m2-3a-sales` @ `61e3f06`) — `app/admin/sales/*`
  incl. its **inline** `filter-toolbar.tsx` that you replace.
- **3b's mobile branches** (`feat/m2-3b-admin-mobile` @ `5a9e81c`) —
  `app/admin/{stock,financials,assets}/*-client.tsx` whose filter rows
  you convert.

Cleanest: `git merge feat/m2-3a-sales feat/m2-3b-admin-mobile` into your
branch first (they touch disjoint files from each other and from the kit
branch — expect at most trivial doc conflicts in `component-states.md` /
`kit-audit.md`; resolve by keeping **both** sets of additions). Run
`pnpm test` + `pnpm tsc --noEmit` once to get a green baseline before you
change anything. **If a merge conflict is more than append-style doc
lines, STOP and report** — the orchestrator resolves cross-session
conflicts in FINAL, not you.

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. **`docs/design/filter-toolbar.md`** — the full component spec.
   Especially **§3 the contract** (the `FilterControl[]` / `onChange` /
   `onReset?` / `resultCount` / `resultNoun` / `search?` / `layout?`
   props) and **§7 the rollout table** (per-screen: which controls, which
   defaults, `resultNoun`, artboard).
   - On `feat/m2-3kit-filter-toolbar` if not yet on your branch.
2. `components/kit/filter-toolbar.tsx` — the header comment + the
   `FilterToolbarProps` interface. **This is the exact API you compose.**
   Key points:
   - **Controlled** — the toolbar owns no filter state; your screen holds
     the filter object and re-queries on `onChange`.
   - `Reset` renders **iff** any control ≠ its default; you don't render
     it yourself.
   - A screen's free-text search goes in the **`search?`** prop (a
     sibling node), NOT as a `FilterControl` — it keeps its own state,
     the screen clears it on reset.
   - 3-KIT-FILTER's two documented deviations from `L9O-0`: (a) an
     at-default `select` label stays `--text-primary` (kit `Select` has
     no recessive-tone hook) — the "filter on" signal for a select is
     the value text going `All` → concrete + `Reset` appearing; (b) the
     date chip uses `DatePicker`'s trailing glyph + mono value.
3. `docs/design/fidelity-audit-m1.md` §"Admin Stock — Ledger mobile" and
   the Assets notes — the per-screen deltas.
4. `docs/CONVENTIONS.md`, `docs/design/design-principles.md` §9 (ENFORCED),
   `docs/design/export-workflow.md`.
5. `docs/sprints/handovers/_ORCHESTRATOR-STATE.md` — the 3e row + the
   filter-rollout decision block.

## 2. Paper artboards (file "Prosper Hotel" `01M0EZ7TAHZM26KBMWNYT0928X`, page `1-0`)

`get_guide({ topic: "paper-mcp-instructions" })` once first.

- `L9O-0` — `FilterToolbar` component (the shape). `IEA-0` (desktop) /
  `IKW-0` (mobile) — the shipped merged-Sales toolbar.
- `LDZ-0` — **Admin Stock Ledger — filter toolbar [M2-3DF]** (desktop
  default / filters-active+Reset / mobile).
- `LGF-0` — **Admin Assets — filter toolbar [M2-3DF]** (same 3 states;
  Category `Tabs` strip stays above).
- `DU2-0` + A1 states + `EPJ-0` — Customers (A2 already converted; you
  reconcile the toggle to `kind:"toggle"`).

## 3. Scope — 4 screens, per `filter-toolbar.md` §7

### 3.1 Admin Sales — reconcile 3a's inline toolbar to `<FilterToolbar>`

`app/admin/sales/filter-toolbar.tsx` (3a's inline build) → **delete it**;
`sales-client.tsx` / `orders-tab.tsx` / `derived-tab.tsx` compose the kit
`<FilterToolbar>` instead.
- **Restaurant Orders tab** controls: `Cashier: All ▾` (options derived
  from loaded orders — F7-8, keep 3a's derivation), `Payment: All ▾`,
  `📅 Today` (`kind:"date"`, default the business day — **carry 3a's
  quick-rows + kit `DatePicker` date control**; the orchestrator ratified
  that pattern — if `FilterToolbar`'s built-in `kind:"date"` uses a plain
  `DatePicker` without quick-rows, use the toolbar's `search?`-style
  escape or a custom control slot **only if the component supports it**;
  otherwise flag that the quick-rows need to move into the kit
  `DatePicker` — a FINAL/Kit item, and ship the plain date control for
  now). `☐ Corrected only` (`kind:"toggle"` or a checkbox per the
  component). `resultNoun` `"orders"`.
- **Canteen Derived tab** controls: `Product: All ▾`, `📅 All dates`.
  `resultNoun` `"sales"`.
- The mobile card layouts + `?tab=` deep-link + 308 redirects 3a built
  stay. Only the filter row changes.

### 3.2 Admin Customers — reconcile A2's toggle

`app/admin/customers/*`. A2 already drew the toggle-in-toolbar idiom; the
built screen still has the old pill. Compose `<FilterToolbar>`:
- `search?` = the existing customer `SearchInput` (keeps its own state).
- one control: `Has balance` `kind:"toggle"`, default `false`.
- `resultNoun` `"customers"`.
- Search + the customer table/rows are **unchanged** — Customers is the
  reference standard; touch only the filter row.
- Update `tests/screens/admin-customers.screen.test.tsx`.

### 3.3 Admin Stock Ledger — CONVERT (`LDZ-0`)

`app/admin/stock/stock-client.tsx` (both the desktop and 3b's
`flex md:hidden` mobile branch). Replace the `PillFilter` location switch
+ any ad-hoc `Category:` / `Date:` controls with `<FilterToolbar>`:
- controls: `Location: All ▾` (Store/Restaurant/Canteen), `Category: All ▾`,
  `📅 <business day>` (`kind:"date"`).
- **`Columns` visibility control is NOT a filter** — it stays as its own
  control to the toolbar's right, untouched.
- `resultNoun` `"rows"`.
- Mobile: the toolbar's own `< --bp-md` chip-scroller replaces 3b's
  short-chip row. Keep 3b's stacked-row list + sticky Opening Stock bar.

### 3.4 Admin Assets — CONVERT (`LGF-0`)

`app/admin/assets/assets-client.tsx` (desktop + 3b's mobile branch).
Replace the bespoke filled-pill Condition radiogroup + the ad-hoc
location control with `<FilterToolbar>`:
- `search?` = the existing `SearchInput`.
- controls: `Location: All ▾`, `Condition: All ▾`.
- **The Category `Tabs` strip STAYS** (kit `Tabs`, above the toolbar) —
  it is the primary cut, not a filter. **DO NOT add a "category" field or
  strip beyond what exists** — the owner ruled (2026-09-01) that the A2
  Assets artboards' phantom `CATEGORY *` field is dropped (ADR-44
  stands). If `LGF-0` still draws it, ignore that part of the artboard.
- Active/Archived tab (if present) stays.
- `resultNoun` `"assets"`.

## 4. Gates + output

- Screen specs: extend `admin-sales`, `admin-customers`, `stock`,
  `assets` screen tests — the toolbar renders the right controls at
  their defaults; changing a control fires `onChange` + re-queries;
  `Reset` appears only off-default and clears; `resultCount` updates;
  mobile chip-scroller renders `< --bp-md`. No behaviour regression on
  the tables/rows.
- `pnpm test` all green (baseline after the 3a+3b merge — expect ~480+),
  `pnpm tsc --noEmit` 0, `pnpm build` clean.
- `grep -rn "PillFilter" app/admin/stock app/admin/assets app/admin/customers`
  → only the Stock **Levels** category strips remain (those are
  out of scope — SM/Canteen `stock-levels-view.tsx`, NOT the Admin
  Ledger). No dismissible-pill filter anywhere.
- Screenshot-diff Sales / Ledger / Assets / Customers filter rows
  (desktop + mobile) vs `IEA-0` / `LDZ-0` / `LGF-0` / `DU2-0`.
- Summary → orchestrator: the merge result (any conflicts + how
  resolved), the 4 screens converted, the date-control decision (did
  3a's quick-rows survive, or is that a FINAL/Kit follow-up?), gate
  status. **Do NOT edit `docs/PROGRESS.md` §7 / `ROADMAP.md`.**

## 5. Do NOT

- Change any `components/kit/*` — incl. `filter-toolbar.tsx` (it's
  proven; if a screen genuinely needs something it can't do, FLAG it,
  don't fork it).
- Convert the Stock **Levels** category tab-strips
  (`stock-levels-view.tsx` — SM `All·Ingredients·Goods·Dishes`, Canteen
  `All·Beverages·Goods`) — out of scope, they stay as pills.
- Add a "category" field/strip to Assets (owner ruled it out).
- Restructure any table/row or non-filter layout.
- Make a new design decision — flag instead.
- Add app-level Playwright/e2e. Work on Milestone 3.
- Run git checkout/stash/branch on anything but `feat/m2-3e-filter-retrofit`.
- Merge to `main`.
