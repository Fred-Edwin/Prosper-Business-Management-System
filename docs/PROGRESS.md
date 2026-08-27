# Prosper — Progress Log

Running status log, updated at the end of every sprint session: what
shipped, what's blocked, what changed from plan.

---

## 2026-08-27 — Design Sprint Session 2: component states + consistency audit

**Role:** Product Designer. **Touched:** Paper file "Prosper Hotel" only,
plus `docs/design/component-states.md` (new), `docs/DECISIONS.md`,
`docs/design/design-principles.md`, `docs/sprints/milestone-1-plan.md`.
No application code.

**Shipped:**

- **`docs/design/component-states.md`** — the component-states spec:
  32 components mapped to the 21 M1 screens; per-component state matrix
  (which states are artboards vs which are global CSS); naming
  convention; consistency-audit result.
- **Four open decisions settled with the owner** (all recommendations
  accepted) and recorded in `DECISIONS.md` ADR-36 + `design-principles.md`:
  - **ADR-36a** — no "CORRECTED" chip on ledger correction rows.
    Corrected cells render in their semantic color (`--color-danger` /
    `--color-success`) with a 1px underline; the cell is the
    correction-drawer click target. `design-principles.md` §4.3
    rewritten; §8 item 1 closed.
  - **ADR-36c** — `FrictionDeleteDialog` takes optional `cancelLabel` /
    `confirmLabel` / `title` / `bodyCopy` / `showArchiveLink` props;
    defaults keep the generic copy. §8 item 3 closed.
  - **ADR-36d** — Prosper gets a real `EmptyState` + `ErrorState` kit
    component (17th kit area, `design-principles.md` §7). Drawn in
    Paper this session (artboard `9U3-0`) with 3 states. §8 item 4
    closed.
  - **D-FIN** — the `/admin/financials` KPI stat strip (liquidity /
    cash / bank / outflows) is **Milestone 3, not M1**. M1's Financials
    screen = stock-purchase table + reconciliation Match cards only.
    Noted in `milestone-1-plan.md` §2. The kit "Stat tile row"
    component is not touched this session.
- **`design-principles.md` §9 (new)** — global interaction rules:
  focus-visible ring, input focus border, row hover tint, selected
  tint, button hover, active/pressed (no motion), disabled treatment,
  error field pattern, transition timing, skeleton loading. These are
  encoded **once** as global CSS by Session 3, not per-component.
- **Paper file — state artboards added** to 7 existing kit areas +
  1 new artboard (full list in `component-states.md` §8):
  - Buttons: primary/destructive loading + disabled reference row.
  - Form Controls: text-input/select/stepper **error**, **select-open**
    (industry-standard attached popover), segmented **disabled**,
    toggle **disabled**.
  - Tables: ledger **corrected cell** (underlined — now matches
    screens), **row hover**, **empty**; simple-table **row hover**.
  - Drawers & Dialogs: friction-dialog **retype-mismatch** (3rd state).
  - Banners & Cards: **PurchaseDeliveryBanner** (blue, extracted from a
    screen into the kit), transfer-banner **flagged**, match-card
    **matched** + **flagged**.
  - Utility & Layout: search **filled** (with clear), date-picker
    **open** (calendar popover), flow-header **no-badge**.
  - Bulk Entry Grid: **cell error**.
  - **NEW artboard "Component Kit — Empty & Error States" (`9U3-0`)** —
    EmptyState default, EmptyState filtered/no-results, ErrorState.
- **Consistency audit (Task 3):** every component that appears on more
  than one M1 screen was compared instance-by-instance.
  - **5 real divergences fixed in Paper:** kit ledger corrected-cell
    was plain text vs underlined on the 3 screen ledgers → kit now
    underlined; kit primary button / tertiary label / segmented active
    label used a raw `oklch(28.4% …)` literal instead of
    `var(--color-accent)` → retokenised; the Success status chip + all
    3 condition chips used raw OKLCH literals → retokenised to
    `--color-success` / `--color-warning` / `--color-danger`; kit
    bottom-nav had an all-sides border vs border-top-only in real use
    → fixed.
  - **2 divergences kept as legitimate content variants:** the ledger
    correction drawer's header carries a context subtitle (documented
    as a `subtitle` prop for Session 3); the friction delete dialog's
    per-entity labels (now the ADR-36c props).
  - **1 divergence deferred:** the staff-mobile-shell order-type
    segmented control (40px / `--radius-md`) differs from the kit
    (36px / `--radius-sm`) — but it's on a **post-M1 Cashier screen**,
    left for the Cashier design work.
  - **CONSISTENT (one canonical version, safe to export as one
    component):** Admin side nav, underline tabs, pill filter, dense
    summary strip / sticky footer, Edit Drawer shell.
- `milestone-1-plan.md` §5 Session 2 marked DONE; §2 gained the
  Financials M1-cut note.

**Blocked / open:** ADR-36b (ledger Maximize / sidebar-collapse
**persistence** — does it persist app-wide or reset on navigation) is
still open. It is a **Development Sprint** question (where the
`collapsed` state lives), to be resolved with the Admin at the start of
the Stock admin-frontend session (Session 7). Not a design question, so
not resolved here.

**Tooling note:** Paper's `write_html` intermittently dropped all
layout/border/background styling when inserting complex nested flex into
the large kit artboards (collapsed to unstyled stacked text). Worked
around it by using `duplicate_nodes` + `update_styles` on existing
canonical nodes for almost everything; `write_html` was only reliable
on small isolated frames (the date-picker calendar, the Empty/Error
artboard). Session 3 should expect the same and prefer `get_jsx` reads
(which worked fine throughout).

**Next:** Session 3 — Developer (Design Sprint): delete
`components/kit/*` + `components/shells/*` and rebuild each from Paper
via `get_jsx`, encoding the drawn states from the artboards and the
interaction states from `design-principles.md` §9. Resolve nothing new
— all design decisions are settled. Build
`app/design-preview/_kit/page.tsx`. Screenshot-verify every component
against its artboard.

---

## 2026-08-19 — Planning & repo setup

- Phase 0 (Discovery) and Phase 1 (Planning: PRD, Architecture, Roadmap)
  complete — see `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/API.md`,
  `docs/SCHEMA.md`, `docs/DECISIONS.md`, `docs/CONVENTIONS.md`,
  `docs/TEST_PLAN.md`, `docs/ROADMAP.md`.
- Milestone 1 fully broken into sprints (Sprints 01–11: Foundation,
  Catalog & Locations, Store & Stock Movements, Assets) — see
  `docs/sprints/`.
- Milestone 2 in progress: Restaurant Sales Design Sprint (12) and
  Development Part 1 (13) drafted, not yet written to file. Credit-order
  slice deferred until Customers & Credit lands (sequencing: Restaurant
  Sales → Customers & Credit → Canteen Derived Sales).
- Session 3.5 (Repository & Git Setup) completed: git initialized on
  `main`, single-Next.js-app folder structure established per
  `ARCHITECTURE.md`/`CONVENTIONS.md` (no separate `server/` — deviates
  from sdlc.md's generic template deliberately, since Prosper's approved
  architecture (ADR-2, ADR-6, ADR-8) is a single Vercel-deployed
  modular monolith, not a Vercel+Droplet split).
- **Next:** Sprint 01 (Foundation) — Next.js scaffold, Prisma schema,
  Auth.js, role-scoped shells, PWA manifest, seed data.

---

## 2026-08-19 — Sprint 01 (Foundation) shipped

Full scope built and verified: Next.js (App Router, TS) scaffold on
pnpm; full `prisma/schema.prisma` for every `SCHEMA.md` entity, migrated
clean against local Postgres (Docker); Auth.js credentials login with
server-side role checks on all four role-scoped route shells
(`/admin`, `/store-manager`, `/cashier`, `/canteen`); PWA manifest +
installability-only service worker; seed script (Admin + one user per
role, three locations, sample products); `lib/time` Africa/Nairobi
business-day helper; `lib/validation` Zod pattern example. Zero
non-auth `app/api/*` routes, zero `TODO(mock)` markers (none of this
sprint's scope needed one).

**Test run (`pnpm test`):**
```
 Test Files  3 passed (3)
      Tests  24 passed (24)
```
Covers `lib/time` business-day conversion (incl. the Frankfurt-hosting
guard), the route-role-matching logic behind both the proxy fast-path
and the authoritative server-side check, and the real `authorize()` PIN
flow against Postgres (correct PIN, wrong PIN, unknown user, lockout
after repeated failures, deactivated-user rejection). Role-gating was
also verified manually end-to-end via curl (unauthenticated → redirect
to `/login`; cashier → 200 on `/cashier`, 307 away from `/admin`) and a
full `next build` passed.

**Two decisions made mid-session, diverging from how the sprint scope
was originally written** (both confirmed with the user; full reasoning
in `DECISIONS.md` ADR-5 addenda and `docs/sprints/sprint-01-foundation.md`
session notes):

1. Login is **unique display name + 4-digit PIN**, not email/password —
   user's call, this is a shared-device till app. `SCHEMA.md`'s `User`
   table updated; brute-force lockout added given the small PIN
   keyspace.
2. Sessions are **JWT, not database-backed** — next-auth v4's
   Credentials provider doesn't support database sessions at all
   (discovered during implementation, not a preference). Instant
   revocation is preserved via a live `active` re-check on every
   session read instead.

**Also fixed, not scope changes:** `CONVENTIONS.md`'s literal
`app/(admin)/` route-group syntax would have collided all four role
shells on `/` — corrected to plain `app/admin/` etc., doc updated to
match. Picked up two library-version realities along the way: Next.js
16 renamed `middleware.ts` to `proxy.ts`; Prisma 7 requires a driver
adapter + `prisma.config.ts` instead of `datasource.url`.

PWA icons carried forward from `carry-forward/brand/` (a prior failed
build's assets, now committed to the repo) as a functional placeholder;
real branding is a Design Sprint decision.

**Next:** Sprint 02 (Catalog & Locations — Design).

---

## 2026-08-20 — Phase 2B: Design system component library (Paper.design)

`docs/design/DESIGN_SYSTEM_PLAN.md` executed end-to-end: full component
library built in Paper.design ("Prosper Hotel" file), connected via
Paper's MCP server (required enabling WSL mirrored networking — Paper's
desktop app runs on Windows, session runs in WSL). Session hit Paper's
free-tier weekly MCP limit mid-build; resolved by upgrading to Paper Pro.

**Built and verified in Paper (screenshot-checked at every step, several
real bugs caught and fixed along the way — camelCase vs. kebab-case CSS
in `write_html`, a `color-mix()` token that didn't render, a `replace`
call that deleted a button's container frame instead of its icon):**

- Design tokens (68 total) — neutral ramp, semantic surfaces/text/borders,
  accent + hover, semantic status colors, spacing/radius/type/motion.
- Admin desktop shell and Staff mobile shell, both to spec.
- All 6 component families from `DESIGN_SYSTEM_PLAN.md` §4: Form controls
  (9), Buttons & actions, Feedback & status, Data display, Navigation &
  filtering, Mobile-specific primitives.
- A shell-level maximize/restore pattern for wide tables (not in the
  original plan — added after Admin review): collapses side nav to its
  icon rail and hides the inspector to reclaim width.

**Corrections made after Admin review of the live build (now binding, not
exceptions — see `docs/design/design-principles.md` §4 for full detail):**

1. Tables use square corners (0px), not the house 6px default.
2. No avatar in dense-table attribution columns — plain name text only.
3. The Ledger is a table, not a separate visual pattern: one row per
   product/day/location, one column per movement type
   (Opening→Purchases→Issues→Production→Transfer In/Out→Sold→Sold
   Value→Closing→Closing Value), reconciliation-sheet style — not the
   original per-movement-row / prose-description draft. Correction rows
   flagged inline with a chip. Has its own filter bar + column-visibility
   control, and scrolls horizontally inside a container bounded to the
   real content-pane width (not the artboard).
4. A separate, simpler Table component added for plain list views
   (Customers/Staff/Assets) — distinct from the dense Ledger.
5. Segmented-control active state needed a shadow lift + accent text
   color; a plain white pill read as too weak to register as selected.

Two Paper comment threads from the Admin were read and resolved in-session
(the Ledger's leftover artboard space; a clunky text "Restore" button
replaced with a proper icon-only toggle, plus the missing maximize
entry-point on the un-maximized view).

**Output:**
- `docs/design/design-principles.md` — the binding design record (house
  style, final token values, shell/component decisions, all corrections
  above). This is now the file every future Design Sprint reads, per
  `CLAUDE.md`'s routing table — supersedes reasoning-in-progress from
  `DESIGN_SYSTEM_PLAN.md` where the two differ.
- `docs/design/COMPONENT_EXPORT_HANDOVER.md` — self-contained handover
  prompt for a fresh session to export the Paper component library into
  real shadcn/ui + Tailwind code (`components/ui/`, `components/layout/`,
  `lib/tokens.css`). Not yet run.

**Next:** Run the component export handover in a fresh session, then
Sprint 02 (Catalog & Locations — Design) can proceed against a real,
code-backed component library instead of inventing UI ad hoc.

---

## 2026-08-20 — Component export: Paper.design → real code

Ran `docs/design/COMPONENT_EXPORT_HANDOVER.md` end-to-end. Every
component in its inventory now exists in `components/ui/` or
`components/layout/`, pulled from Paper via `get_jsx` /
`get_computed_styles` (never eyeballed from screenshots), and screenshot-
verified against the Paper source using a Playwright driver script
(project's `chromium-cli` skill wasn't available in this environment).

**Foundation:**
- Tailwind v4 installed (`@tailwindcss/postcss`, CSS-first `@theme`
  config — no `tailwind.config.js`, matches this Next.js version's docs).
- shadcn CLI init pulled in its own dark-mode/oklch default theme and a
  Geist font mapping that directly conflicted with this project's
  light-mode-only, Inter, custom-token rules — stripped out immediately
  after init, keeping only the Radix behavioral scaffold (`components.json`,
  `lib/utils.ts`, `radix-ui` package) per `DESIGN_SYSTEM_PLAN.md` §2.1's
  explicit warning that this was the most likely failure mode.
- `lib/tokens.css` written verbatim from a fresh `get_tokens` pull, then
  mapped into Tailwind's theme via `@theme inline` in `app/globals.css`
  (one convention, applied consistently, per the handover's instruction).
- `lucide-react` installed; icons matched to Paper's hand-drawn
  placeholders by shape per component (no icon-mapping guesswork).

**Token drift found and corrected:** `design-principles.md`'s §6 token
snapshot was missing an entire group that exists live in Paper —
`--nav-bg`, `--nav-bg-active`, `--nav-bg-hover`, `--nav-text`,
`--nav-text-active`, `--nav-border` (dark violet nav fill, darkened
further from `--color-accent` per an Admin request recorded only in the
live file's token descriptions, not in the doc). Added to `lib/tokens.css`
and the Tailwind theme. **`design-principles.md` §6 still needs a human
or a future Design Sprint session to add this token group to its
snapshot** — not done here, since this was a Developer-role session per
`docs/sdlc.md` and updating binding design docs is out of scope.

**Built (all screenshot-verified against Paper, real bugs found and fixed
along the way):**
- Form controls (9): input, money-input, textarea, checkbox, toggle,
  radio-group + segmented-control, select, multi-select, date-picker.
- Buttons & actions: button (primary/secondary/tertiary/destructive),
  icon-button, split-button.
- Feedback & status (6): toast, status-chip, empty-state, error-state,
  loading-state (skeleton/refetch-progress/inline-spinner),
  confirmation-dialog (incl. friction-gated retype-to-confirm, verified
  live — stays disabled until the exact text is typed).
- Data display (8): stat-tile, avatar, audit-trail-entry (collapsed +
  expanded before/after diff), detail-panel, table (Simple), ledger-table,
  filter-bar. The Ledger table — the Admin's highest-stakes screen — got
  the most scrutiny: 13-column reconciliation layout, signed/color-coded
  movement deltas, sticky first-3-columns via `position: sticky` (Paper's
  canvas note said this couldn't be previewed there, confirmed as a build
  note not a missing decision), CORRECTED chip per CONVENTIONS.md §4,
  sticky dark footer summary row. Two real overflow bugs were caught by
  screenshot diff and fixed: header cells wrapped ("TRANSFER IN" etc. onto
  two lines, breaking row height) and the footer label wrapped inside the
  narrow Date column — fixed with `whitespace-nowrap`/`overflow-hidden`
  and by spanning the footer label across all three sticky columns as one
  cell instead of forcing it into the first.
- Navigation & filtering: tabs (Radix), breadcrumb.
- Mobile primitives: bottom-sheet (peek + full-height open variants, Radix
  Dialog for real focus-trap/dismiss).
- Layout shells: `admin-shell.tsx` (top bar, 240px/56px collapsible side
  nav, toolbar, inspector, and the shell-level maximize/restore toggle —
  verified live, matches the "Ledger Maximized" artboard exactly) and
  `staff-shell.tsx` (header, single-column content, sticky action bar,
  bottom nav with active state + badge dot).

**Deviations / not built exactly as spec:** none found requiring
approximation — every component matched its Paper source once corrected.
Split button is built per spec but, per `DESIGN_SYSTEM_PLAN.md` §4.2,
remains unused until a real save-and-print-style case appears in a
feature Design Sprint.

No `TODO(mock)` markers were needed — every component here is pure
presentation, wired with props/callbacks the way `CONVENTIONS.md`
expects; no fixture/placeholder data logic was embedded in
`components/ui/*`.

**Next:** Sprint 02 (Catalog & Locations — Design) can now assemble real
screens from this library instead of inventing UI ad hoc, per
`docs/sdlc.md`'s process rule. A future session should also backport the
`--nav-*` token group into `design-principles.md` §6 so the doc stops
drifting from the Paper file.

---

## 2026-08-20 — Login screen (Design + Development) and role shells wired

Before Sprint 02, closed the gap between "auth works" and "you can log in
and see something real": designed a real login screen (was a bare
placeholder from Sprint 01), and wrapped the four role landing pages in
the real `AdminShell`/`StaffShell` components exported above.

**Login screen — Design Sprint pass in Paper, iterated live with the
Admin over several rounds:**
- First pass: hard split-panel (purple brand side + white form side),
  Fraunces display serif, radial glow behind the seal, generic
  hospitality-SaaS value props.
- Admin reviewed two external reference screens (hotel-SaaS login
  mockups with photography, SSO buttons, email/password fields) and
  asked what to steal vs. discard. Kept: the floating-card form
  treatment, a real display-serif headline, a kicker label, small
  icon+text value-prop bullets. Discarded: SSO buttons, Remember-me,
  Forgot-password, and email/password fields — none of that exists in
  this app's actual auth (name + 4-digit PIN against Prisma via
  Auth.js Credentials, see `lib/auth/config.ts`), and stock photography
  would misrepresent a business with no real interior photography on
  file.
- Second round of Admin feedback: drop the glow (too much), swap
  Fraunces for a lighter serif (**Newsreader**, weight 500), replace
  the generic value props with the product's real four PRD-backed
  differentiators (ledger traceability, handover reconciliation,
  multi-location, full financial picture — pulled from `docs/PRD.md`
  §0/§4.5/§4.7, not invented), add a footer credit — **"Built by Lobster
  Technologies"**, linking to `https://lobstertechnologies.co.ke/` —
  and enclose the sign-in fields in a real card matching the
  Confirmation dialog's existing border/radius/padding language, not a
  new pattern.
- One real Paper-tool bug hit mid-session: a `move_nodes` call
  reparenting several already-built frames corrupted the tree (moved
  frames lost their children, one node ended up fully detached). Fixed
  by identifying and deleting the orphaned/emptied nodes and rewriting
  their contents fresh rather than continuing to fight broken
  references — no shortcuts taken, verified via screenshot before
  calling it done.
- Real seal image (`carry-forward/brand/prosper-hotel-logo.jpeg`)
  uploaded into Paper as a real asset and used directly (not a
  placeholder) once Windows-side drag-and-drop into the desktop app
  worked — WSL path references to the file didn't resolve for Paper.
- Approved final: desktop hard-split with card-enclosed form, real
  seal, Newsreader headline, 4 real feature bullets, Lobster
  Technologies credit; mobile keeps the simpler compact-header layout
  approved earlier in the session, intentionally not given the same
  card/feature-list treatment (no room at that width).

**Exported to real code:**
- `app/login/page.tsx`, `login-form.tsx`, `brand-panel.tsx`,
  `mobile-brand-header.tsx` — pulled from Paper's `get_jsx` /
  `get_computed_styles`, not eyeballed. Existing `signIn("credentials",
  ...)` logic in `login-form.tsx` was untouched — only markup/styling
  changed.
- Real seal image copied to `public/prosper-hotel-seal.jpg`.
  Newsreader wired via `next/font/google`, added to the Tailwind theme
  as `--font-display` — explicitly scoped/commented as a login-only
  exception, not a system-wide type choice.
- One real icon-mapping bug caught by screenshot diff: `LayoutGrid` was
  the wrong Lucide icon for "Every movement traced" (didn't match
  Paper's table/grid glyph) — fixed to `Table`.
- One real layout bug on mobile: the form block was vertically centered
  in the remaining viewport height instead of flowing directly under
  the brand header as approved — fixed (`items-start`/`justify-start`
  on mobile, centered only at the `lg:` breakpoint).

**Role shells wired (the original goal of this session):**
- `app/admin/layout.tsx` now renders the real `AdminShell` via a new
  `admin-shell-client.tsx` (derives active nav key + toolbar title from
  the URL, wires the account avatar to real `signOut()`).
- `app/{cashier,store-manager,canteen}/layout.tsx` now render the real
  `StaffShell` via a shared `components/layout/staff-shell-client.tsx`,
  with role-correct bottom-nav items per `docs/PRD.md` §2's stated
  responsibilities (Cashier: New order/Today's orders/Handover; Store
  Manager: Receipts/Production/Transfers; Canteen Attendant: Stock
  counts/Receipts/Handover).
- `AdminShell`/`StaffShell` (`components/layout/*.tsx`) gained one new
  prop each, `onAccountClick`, so the previously-static account avatar
  can trigger real sign-out — the only functional (non-visual) change
  made to the approved shell components.
- One real cross-boundary bug caught via live Playwright test, not
  just typecheck: the three staff layouts (Server Components) were
  passing `navItems` arrays containing Lucide icon component
  references as props into `StaffShellClient` (a Client Component) —
  Next.js can't serialize component references across that boundary,
  which surfaced as a silent console error ("Only plain objects can be
  passed to Client Components..."), not a build failure. Fixed by
  moving the nav-item definitions (including icon imports) inside
  `staff-shell-client.tsx` itself, keyed by `basePath`, so nothing
  crosses the server/client boundary.
- All four roles verified with a real login → redirect → shell render
  end-to-end, using the seeded users from `prisma/seed.ts` (Admin,
  Store Manager, Cashier, Canteen Attendant — PIN `1234` each) against
  the existing `prosper-bms-db` Docker Postgres container. Confirmed:
  correct shell renders per role, correct nav item is active, no
  console errors beyond one known Turbopack dev-mode
  `Performance.measure` timing quirk unrelated to this work.

**Not done / left for a later sprint:** the mobile login variant was
deliberately left without the card/feature-list/credit treatment (Admin
decision, not an oversight). `app/{admin,cashier,store-manager,canteen}
/page.tsx` show a real `EmptyState` ("screens are coming in a later
sprint") rather than real content — Sprint 02 replaces these.

**Next:** Sprint 02 (Catalog & Locations — Design) — same as above, now
additionally verified that a user can actually log in and land in a
real, working shell for their role before any feature screens exist.

---

## 2026-08-24 — Sprint 02 (Catalog & Locations — Design & Next.js Assembly) shipped

Executed Sprint 02 end-to-end following the two-phase workflow:

**Phase A (Visual Design in Paper.design):**
- Designed `/admin/catalog` table view with 3 separate location columns (Restaurant, Canteen, Store) per Admin review.
- Underline category filter tabs (`All`, `Ingredients`, `Dishes`, `Goods`) replacing the chunkier segmented controls.
- Clean category status text (blue for Ingredient, amber for Dish, green for Goods) without heavy background pills.
- Designed `ProductDrawer` with 3 sections: General Info, Buying Price with automatic Dish zero-price invariant rule and notice banner, and Location Availability & Selling Prices.
- Designed `ProductDeleteDialog` with destructive red warning banner, exact string-match retype friction, and soft-archive alternative.
- Designed mobile versions (`Admin Catalog — Mobile` and `Universal Mobile Shell — Drawer Open`) supporting the universal hamburger navigation pattern.
- Updated canonical upstream artboards (`Admin Shell — Desktop`, `Universal Mobile Shell`, `Component Kit — Navigation & Filtering`, `Component Kit — Data Display`) so future sprints inherit the refined components.

**Phase B (Component Export & Next.js Codebase Assembly):**
- Updated `components/layout/admin-shell.tsx`: grouped navigation categories (Operations, People & Money, Team, Reporting), `#FFFFFF` icon strokes, 2px white left accent bar, mobile hamburger slide-over drawer, and pinned Sign Out account footer.
- Created `app/admin/catalog/types.ts` defining domain interfaces (`Product`, `ProductKind`, `LocationPricing`, filter contracts).
- Created `app/admin/catalog/mock-data.ts` seeded with realistic data across all 3 locations, flagged with `TODO(mock)`.
- Created `app/admin/catalog/catalog-filter-bar.tsx` (underline tabs, location/status dropdowns, search input with clear button).
- Created `app/admin/catalog/catalog-table.tsx` (desktop 0px table with hairline dividers, tabular numbers, action menu; mobile high-density cards).
- Created `app/admin/catalog/product-drawer.tsx` (slide-over drawer with Dish invariant enforcement and location availability toggles).
- Created `app/admin/catalog/product-delete-dialog.tsx` (friction-gated delete confirmation requiring exact product name match + archive option).
- Created `app/admin/catalog/page.tsx` with live in-memory client state wiring up full interactive CRUD, search, filter, soft-archive, hard-delete, and toast notifications.
- Verified TypeScript cleanly (`pnpm tsc --noEmit` passed with 0 errors).

**Next:** Sprint 03 (Store & Stock Movements — Design).

---

## 2026-08-25 — Sprint 06 (Design Export) shipped

The 2026-08-20 "Component export" entry above described a **first,
non-compliant export pass** — ad hoc components, not built from an
approved Paper kit. Per explicit user correction, that whole pass
(`components/ui/*`, `components/layout/*` as they existed then,
`app/admin/catalog/*`, `app/admin/admin-shell-client.tsx`,
`app/login/brand-panel.tsx`, `app/login/mobile-brand-header.tsx`) was
scrapped and re-exported cleanly from the real approved Paper source —
the "Prosper Hotel" file, 16-artboard Component Kit + 21 rebuilt screens
+ Login, documented in `docs/design/design-principles.md`. This entry
covers that full re-export, run across two sessions (kit/shells first,
screens/rewiring/docs in a follow-on session) per
`docs/sprints/sprint-06-design-export.md` and its handover file.

**Kit components — `components/kit/` (28 files, all 16 approved areas):**
button, icon-button, text-input, textarea, select, segmented-control,
toggle-switch, search-input, date-picker, breadcrumb,
instructional-banner, action-tile-grid, bottom-nav, flow-header,
status-chip, condition-chip, simple-table, dense-ledger, tabs,
pill-filter, friction-delete-dialog, drawer, stat-tile-row,
dense-summary-strip, banner (4 variants), match-card, bulk-entry-grid,
bottom-sheet — every documented multi-state component (button variants,
chip semantics, toggle on/off, segmented-control active/inactive,
friction-delete pending/confirmed, ledger signed deltas) built with all
its states, pulled from Paper via `get_computed_styles`/`get_tree_summary`,
never eyeballed.

**Shells — `components/shells/` (4 files, all 5 shell states):**
`admin-shell.tsx` (one component, `collapsed` prop covers both the
full-sidebar and icon-rail states), `staff-shell.tsx`,
`mobile-shell-admin.tsx`, `mobile-nav-drawer.tsx` (shared drawer-open
state for both mobile roles).

**All 21 screens exported to `docs/design/screens/<slug>/`** (`page.tsx`
skeleton + `mock-data.ts`, every mock source marked `TODO(mock)` per
`CONVENTIONS.md` §4), composed entirely from `components/kit`/`shells` —
no one-off markup invented for any screen: Admin Catalog (desktop +
mobile), Product Drawer, Product Delete Dialog, Admin Stock Ledger (full
width, sidebar collapsed, drawer open — a Movement Correction drawer with
`CalculatedImpactBanner`), Admin Stock Mobile, Bulk Opening Stock Grid,
Admin Financials (full table + payment drawer, with a `MatchCard`
reconciliation section), Admin Assets Register, Asset Delete Dialog,
Asset Drawer, Store Manager Mobile Hub, Store Manager Flows (Issues &
Production, Transfers & Consumption — two-phone-frame comparison
screens), Store Manager Stock Levels, Canteen Mobile Operations Hub,
Canteen Transfer Dispatch, Canteen Stock Levels. All real data
(quantities, prices, names, dates) extracted verbatim from the live Paper
artboards, not invented.

**`/design-preview` route** — `app/design-preview/layout.tsx` (nav
listing all 21 screens) + one thin `app/design-preview/<slug>/page.tsx`
per screen, each just importing and rendering its
`docs/design/screens/<slug>/page.tsx` skeleton.

**Route rewiring (unblocks `pnpm dev`/`next build`):**
- `app/admin/admin-shell-client.tsx` rebuilt against
  `components/shells/admin-shell.tsx` — `activeNavKey` derived from
  `usePathname()`, `onNavigate` → `router.push()`, `onAccountClick` →
  `next-auth` `signOut()`.
- `components/layout/staff-shell-client.tsx` rebuilt against
  `components/shells/staff-shell.tsx`, with a `NAV_ITEMS_BY_BASE` map
  (Cashier: New Order/History; Store Manager & Canteen: Hub/Stock/History,
  matching the Bottom Nav pattern on their exported Hub/Stock screens).
- `app/{admin,cashier,store-manager,canteen}/page.tsx` — the deleted
  `components/ui/empty-state` import replaced with an inline placeholder
  `<div>` in each, per explicit handover guidance: "Empty State" isn't in
  the approved 16-artboard kit inventory, so it's not a kit component to
  build, just a temporary inline stand-in until each role's real home
  screen lands.

**Verification:** `pnpm tsc --noEmit` clean (zero errors, after clearing
a stale `.next/dev/types/validator.ts` referencing the already-deleted
old `app/admin/catalog` route). `pnpm dev` boots clean; all 21
`/design-preview/<slug>` routes plus `/login` (200) and `/` (307,
redirects unauthenticated as expected) verified via curl. Screenshot-
compared 4 screens directly against their Paper artboards (Product
Catalog, Stock Ledger Full Width, Store Manager Mobile Hub, Admin Assets
Register) — all matched.

**Flagged for the user's judgement (not decided unilaterally this
session):**
1. **CORRECTED-chip doc conflict.** `design-principles.md` §4.3 describes
   an amber "CORRECTED" chip on ledger rows as approved;
   `sprint-05-screen-reassembly-handover.md` said no such chip exists.
   Pulling the live Ledger artboards (`798-0`/`7G9-0`/`7LJ-0`) settled
   the *screen* question — none of Paper's example rows show a chip, so
   none of the exported mock data uses `corrected: true`. But
   `components/kit/dense-ledger.tsx` itself still implements the chip
   (left untouched, since no screen needed it removed to match Paper).
   The underlying doc conflict between `design-principles.md` and the
   older handover is still open — needs the Admin/user to say which is
   right so `design-principles.md` can be corrected if needed.
2. **`FrictionDeleteDialog` button copy is hardcoded** ("Cancel"/
   "Permanently Delete"), but Paper's Asset Delete Dialog shows "Keep
   Asset"/"Permanently Delete Asset". Used the kit component as-is
   (its approved button text) rather than inventing a variant — a future
   session may want optional label-override props if this distinction
   matters.
3. Ledger Maximize/Icon-Rail collapse-persistence question (does the
   collapse persist across navigation, or reset?) is still unconfirmed
   with the Admin — explicitly out of scope for this sprint per its own
   instructions.

**Not done / explicitly out of scope this session:** no real domain
logic, API routes, or database wiring — every mock source is marked
`TODO(mock)` and stays that way until the matching Development Sprint
(Sprint 07 for Stock, Sprint 09 for Assets, per
`docs/milestones/milestone-01-the-business-exists.md` §5).

**Next:** Sprint 07 (Stock Domain & APIs) — wire real data into the
Sprint 06 screen skeletons for Stock Movements, replacing every
`TODO(mock)` marker in that scope. Also worth a quick side-session to
resolve the CORRECTED-chip doc conflict above before Sprint 07 touches
`dense-ledger.tsx`'s consumers.

---

## 2026-08-27 — Tech Lead session: export workflow documented, stale docs cleaned, Milestone 1 scope pinned

Documentation / planning session only — no feature code, no Paper, no
export. Context: the Sprint 06 export (2026-08-25 entry above) was done
by reconstruction-from-`get_computed_styles`, not `get_jsx`; its 21
screens did not match Paper and were deleted. One screen
(`admin-catalog-product-catalog`) was re-exported correctly as proof of
method. This session turned the corrected workflow into permanent docs
and reconciled the status docs to reality.

**What this session changed:**

1. **Corrected export workflow documented** —
   `docs/design/export-workflow.md` (new): Phases A–D
   (Design → Export → Implementation → QA), with the non-negotiable
   rules named explicitly — `get_jsx` is required (never reconstruct
   from computed styles), swap kit-component spans for kit imports
   (don't rebuild markup), drop the Paper artboard frame so screens
   fill the viewport, and screenshot-verify every screen and component
   against its artboard. Pointers added from `docs/sdlc.md` (Phase
   3.1/3.2 + document index) and `CLAUDE.md`'s "Where to look" table.
   The `mock-data.ts` → `fixtures.ts` rename is specified for new work;
   the reference screen keeps `mock-data.ts` until the re-export
   normalizes it.

2. **Open design decisions recorded** — `docs/DECISIONS.md` ADR-36 (new)
   + `docs/design/design-principles.md` §8 (new): the CORRECTED-chip
   conflict (design-principles §4.3 vs. deleted Sprint 05 handover vs.
   live artboards showing no chip — still unresolved), the Ledger
   Maximize / sidebar-collapse persistence question, the
   `FrictionDeleteDialog` hardcoded-label vs. per-entity question, and
   the EmptyState inline-vs-kit-component question. All flagged OPEN,
   with which future session owns each.

3. **Stale sprint docs audited and cleaned.** Deleted as spent husks
   (all live content migrated first):
   `sprint-06-design-export.md`, `sprint-06-design-export-handover.md`,
   `sprint-05-screen-reassembly-handover.md`, `screen-audit-handoff.md`,
   `component-audit-handoff.md`. Kept: `sprint-05-lessons-learned.md`
   (standing retro), `component-audit-report.md` (kit-defect record +
   known-suspect-pattern checklist for the kit rebuild). The master
   21-screen artboard-ID table and the Sprint 05 §5 design decisions
   were migrated into the new `docs/sprints/milestone-1-plan.md`.
   Dangling references cleaned in `milestone-01-the-business-exists.md`,
   `sprint-05-lessons-learned.md`, `component-audit-report.md`.
   (Working-tree reversions of the two audit `.md` files to an older
   stale copy were discarded — the committed versions are canonical.)

4. **Milestone 1 scope pinned** — `docs/sprints/milestone-1-plan.md`
   (new): 3 features (Catalog & Locations, Store & Stock Movements incl.
   the `/admin/financials` stock+reconciliation slice, Assets); the
   21-screen master table with artboard IDs and feature mapping; the 8
   carried-forward design decisions; and the remaining session plan —
   Session 2 (Product Designer Paper pass: component-states spec,
   one-canonical-version check, resolve chip + EmptyState), Session 3
   (Developer: delete + rebuild `components/kit`/`shells` from Paper via
   `get_jsx`, build `/design-preview/_kit`, screenshot-verify), Session
   4 (Developer: re-export all 20 remaining M1 screens, normalize the
   reference screen, rewire role home pages, screenshot-verify),
   Sessions 5–9 (Developer, N=5: implement F1 Catalog / F2 Stock backend
   / F2 admin frontend / F2 staff frontend / F3 Assets), Final (QA
   adversarial M1 pass). **Total remaining: 8 sessions.**

5. **ROADMAP.md + PROGRESS.md reconciled.** ROADMAP's status header
   corrected (it claimed "design + design-export phases complete
   (Sprints 01–06)"); M1 feature table now shows per-feature status and
   points at `milestone-1-plan.md`.
   `milestone-01-the-business-exists.md` marked HISTORICAL with a
   redirect to the new plan; its "Design Export ✅ Done" claims
   corrected to "⚠ SCRAPPED, being redone."

**Build state verified:** `pnpm tsc --noEmit` — clean, exit 0. The
"broken routes" from the Sprint 06 handover §5 (role home pages, admin
shell client, login brand panels) were fixed by that sprint's committed
rewiring and are intact; nothing needs un-breaking. The four role home
pages render an inline "coming later" placeholder (carrying a
technically-misapplied `TODO(mock)` — it's deferred UI, not mock data;
noted for Session 4 to switch to plain `TODO`). `components/kit/` has 29
files (28 + `quantity-stepper.tsx` from the kit audit); one kit open
item remains (`InfoBanner` padding — Session 3). These will all be
deleted and rebuilt from Paper in Session 3 regardless.

**Not touched (owned by later sessions):** `components/kit/*`,
`components/shells/*`, the one reference screen, anything in Paper.

**Next:** Session 2 — Product Designer: component-states spec + Paper
pass (see `docs/sprints/milestone-1-plan.md` §5).
