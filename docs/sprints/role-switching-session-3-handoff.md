# Admin Role Switching — Session 3 (Desktop staff shell) Handoff

**Not tied to a milestone plan** — ad hoc cross-cutting feature. Sessions
1 (backend) and 2 (switcher UI + guard swaps) are done and on `main`
(commits `a6ee88c`, `e600bc9`, `8b47ceb`). This doc + `docs/PROGRESS.md`
("Admin role-switching — Session 1 / 2") are the only continuity.

Session 2 shipped the whole switcher UX against the **existing
mobile-first staff shell**. This session builds the one piece deferred:
the **desktop staff shell** the Paper M7 designs show for the acting-as
screens.

## Read first, in order

1. This document, in full.
2. `role-switching-session-2-handoff.md` and the `docs/PROGRESS.md`
   entries for Sessions 1 & 2 — the as-built contract and the four
   flagged deviations. The **"not impersonation"** rule is
   non-negotiable: every write stays attributed to the real Admin id.
3. `CLAUDE.md`'s standard before-you-start list — the current design
   docs, `CONVENTIONS.md` §6, and **one or two sibling shells**. The
   closest sibling is `components/shells/admin-shell.tsx` +
   `app/admin/admin-shell-client.tsx` (the desktop sidebar + its
   responsive two-shell client) — copy its structure.
4. The Paper design: file `01M0EZ7TAHZM26KBMWNYT0928X`, page **"M7 —
   Admin role switching"**, artboards:
   - `TE6-0` "3 — Staff list screen on desktop (Stock)" — the desktop
     staff shell: full-width acting-as banner, then a **dark sidebar**
     (`--nav-bg`) with the role's nav (Hub, Stock) + a footer
     (avatar · role · Sign out), then the content column.
   - `TLE-0` "4 — Staff flow screen on desktop (centered form)" — the
     same shell hosting a centered flow screen (Issue Ingredients).
   Pull exact values with `get_computed_styles` / `get_jsx` — never
   eyeball (`CONVENTIONS §6`).
5. `components/shells/staff-shell.tsx` (the mobile shell — its
   `onMenuClick` hamburger + `navItems`/`activeNavKey` contract),
   `components/layout/staff-shell-client.tsx` (`StaffChrome` — the
   `useActingAs()` + full-width `<ActingAsBanner>` wrapper that Session 2
   added), `components/shells/mobile-shell-admin.tsx` (the
   `hidden md:*` two-shell pattern to mirror).

## Your role for this session

Build the **desktop staff sidebar shell** and wire it into the three
staff route trees as the desktop half of a responsive pair, then check
it. Backend is untouched — no `lib/**` changes, no route changes, no
schema. If you find yourself editing an API route or a domain function,
stop; that is not this session.

## The one scoping decision, already made (owner, 2026-09-06)

**The desktop staff sidebar renders ONLY while an Admin is acting-as.** A
real staff user on a desktop browser keeps today's mobile-first shell
(bottom nav, stretched wide). Rationale: staff are a phone-first
audience; the sidebar exists for the Admin's benefit while she drives
staff screens on her laptop. Do not turn it on for real staff without a
new owner decision.

Concretely: the shell choice keys off `session.user.actingAs` (or the
`useActingAs()` hook's `actingAs`), not off the viewport alone. On
desktop:
- `actingAs` set → desktop staff sidebar shell.
- `actingAs` null (real staff) → the current mobile-first shell.
On mobile, everyone gets the mobile-first shell (the acting-as
hamburger + inline switcher Session 2 added stays).

## What to build

### 1. `components/shells/staff-desktop-shell.tsx` (new)

A verbatim build of `TE6-0`'s chrome. Structure (copy `admin-shell.tsx`):

- Root: `flex h-full w-full` (NOT `h-screen` — the full-width
  `<ActingAsBanner>` sits above it in the client wrapper, exactly as it
  does for `AdminShell`; Session 2 already changed the admin shell to
  `h-full` for this reason).
- **Sidebar** (`--nav-bg`, fixed width — read it from `TE6-0`, the admin
  shell's is `w-[240px]`): brand row, hairline, the role's nav rows
  (reuse the per-role nav-item definitions from
  `components/layout/staff-shell-client.tsx`'s `NAV_DEFS_BY_BASE` —
  Store Manager / Canteen: Hub, Stock; Cashier: Today, New Order,
  Customers, Handover), footer (avatar · role label · Sign out).
  - Nav icons: `NAV_DEFS_BY_BASE` already carries a lucide icon per item
    (`toNavItems` maps them for the bottom nav). Reuse those.
  - Active-row treatment: match `TE6-0` (the admin shell uses
    `bg-(--nav-bg-active)` + a 2px left accent bar).
  - **No workspace switcher trigger in this footer.** While acting-as on
    a staff screen the Admin switches via the banner's "Exit to Admin"
    (then re-opens the switcher from the Admin shell) — the artboards
    show no switcher in the staff sidebar. If `TE6-0` proves otherwise
    when you inspect it, stop and ask.
- **Content column**: header row (`TE6-0` shows the screen title +
  page actions + account avatar — check whether the staff screens
  publish a header the way admin screens do via `AdminPageHeader`; the
  staff screens currently render their own in-page headers, so the
  desktop shell's header row may just be the account avatar + a thin
  border. Inspect `TE6-0` and a real staff screen side by side), then
  `{children}` as the only scroll region (`overflow-y-auto min-h-0`).
- The `min-w-0` fix from `admin-shell.tsx` (wide tables must scroll
  inside their own container, not blow out the shell) applies here too —
  copy that comment and the class.

Props: mirror `StaffShellProps` where they overlap (`roleLabel`,
`accountInitials`, `onAccountClick`, `navItems`, `activeNavKey`,
`onNavigate`, `children`) so `StaffChrome` can feed both shells from one
set of values.

### 2. `components/layout/staff-shell-client.tsx` — responsive switch

`StaffChrome` (added in Session 2) currently renders `<StaffShell>` in a
`flex-col h-screen` wrapper under `<ActingAsBanner density="mobile">`.
Extend it to the two-shell pattern (`hidden md:*`), mirroring
`app/admin/admin-shell-client.tsx`:

- Only when `actingAs` is set: render `<StaffDesktopShell>` in
  `hidden md:flex flex-1 min-h-0` and `<StaffShell>` in
  `md:hidden flex-1 min-h-0`. Banner density: `"desktop"` for the
  desktop mount ("Exit to Admin"), `"mobile"` for the mobile mount
  ("Exit") — or render the banner once above both and pick density from
  a `matchMedia("(min-width: 768px)")` state (see how
  `admin-shell-client.tsx` tracks `isDesktop`).
- When `actingAs` is null (real staff): render `<StaffShell>` only,
  exactly as today. No desktop shell, no wrapper change.
- The `isDesktop` / hidden-mount caveat from `admin-shell-client.tsx`
  applies: `children` mounts in both shells; both subtrees' hooks run.
  The staff screens are client subtrees with no server-only effects, so
  this is an accepted cost (same as admin). If any staff screen has a
  mount-effect that must not double-fire, gate it with the
  `AdminShellVisibility`-equivalent — check
  `components/shells/admin-toolbar-context.tsx` for that pattern; you
  may need a staff version, or you may get away without one. Flag it if
  you add one.

### 3. Nothing else

- `app/store-manager|cashier|canteen/layout.tsx` — no change (they
  already pass `actingLocationName` and use `requireActingRole`).
- The switcher, the hook, the banner component, the API guards — all
  done in Session 2. Don't touch them beyond the `density` prop wiring.

## Check

`pnpm dev`. Drive as the **Admin**, desktop viewport (≥ 768px):

- Switch into Store Manager → land on `/store-manager` in the **desktop
  sidebar shell**: full-width banner on top, dark sidebar with Hub /
  Stock, footer, content. Compare side-by-side with `TE6-0`
  (`get_screenshot` the artboard; screenshot the running screen).
- Navigate Hub ↔ Stock via the sidebar. Open a flow (Issue to Kitchen)
  — compare with `TLE-0`.
- Do a real staff task in the desktop shell (record a stock movement),
  confirm it succeeds and — spot-check in Postgres — is attributed to
  the Admin id.
- Shrink the viewport below 768px → the shell flips to the mobile
  bottom-nav shell + the acting-as hamburger, no reload artifacts.
- "Exit to Admin" from the banner → back to `/admin`.

Drive as a **real staff user** (seeded `Store Manager` / `1234`),
desktop viewport: confirm they still get the **mobile-first shell**
(bottom nav), NOT the new sidebar. This is the scoping decision — it
must hold.

Add a jsdom + RTL screen spec under `tests/screens/` (sibling:
`tests/screens/admin-nav-accordion.screen.test.tsx` and the Session 2
`admin-workspace-switcher.screen.test.tsx` — the latter shows how to
fake `useActingAs`): the desktop staff shell renders the role's nav,
`onNavigate` fires the right route, and — the scoping guard — with
`actingAs: null` the desktop shell is not rendered.

## Gate

`pnpm typecheck`, `pnpm test` (or `test:unit` for the inner loop, full
`test` once at the end), `pnpm build` all green. Watch for the
client-bundle trap Session 2 hit: **never import `lib/auth/acting-as.ts`
(or anything that pulls in `@/lib/db`) into a client component** — the
build catches it, but only on a full `pnpm build`, not `next dev`.

## End of session

- Update `docs/PROGRESS.md` — new entry "Admin role-switching — Session 3
  (desktop staff shell)", following the Session 2 entry's format.
- If you deviated from this handoff (the "acting-as only" scoping, the
  no-switcher-in-staff-sidebar call, the header-row shape), say so
  explicitly in the PROGRESS entry.
- This should be the **last** session for the feature. If it isn't —
  something else surfaced — write the next handoff and say why.
