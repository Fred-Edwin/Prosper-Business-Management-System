# Session 13 Handoff — Developer: **M1-F3 Assets — `lib/domain/assets` + `app/api/assets*` + the Assets Register / Drawer / Delete Dialog composed from the proven kit**

**Status:** DONE (2026-08-28). `lib/domain/assets` + `lib/validation/assets.ts`
+ `app/api/assets*` (4 handlers) shipped; the hard-delete friction guard
(409 with linked `AuditLog` history) and every condition transition tested
DB-backed (20 domain tests). Assets Register + Asset Drawer + Asset Delete
Dialog composed from the proven kit into `app/admin/assets/*` over a
`use-assets.ts` hook; 7 `assets.screen.test.tsx` specs. Suite 127 → 154;
tsc + build clean; no `components/kit/*` / `components/shells/*` touched.
**ADR-45** decided: the 3 asset artboards (`8DL-0` / `8JO-0` / `8IV-0`)
are pre-kit Session 3–4 exports, so ADR-44 extends to `8DL-0` + `8JO-0`
(kit is the visual target; `8IV-0` is already kit-shaped). No `Asset`
schema change / no migration. `docs/API.md` + `docs/SCHEMA.md` Assets
sections rewritten; `milestone-1-plan.md §5` ticked;
`docs/sprints/final-qa-handoff.md` drafted. Commits on
`session-10b-kit-proof-harness`: `6a5a341` (backend) → `a185883`
(frontend) → the Session-13 doc commit. **Next:**
`docs/sprints/final-qa-handoff.md` (QA Engineer, adversarial M1 pass —
the last session before M1 is done).

---

_Original handoff below (as written before the session)._

**Status (original):** NOT STARTED. **UNBLOCKED** — Session 12 closed the
M1-F2 staff frontend (7 Store Manager + Canteen screens composed from the
kit, wired to the F2 stock API; ADR-44). Latest commits on
`session-10b-kit-proof-harness`: `3b9461c` (Session 12 cluster 1 — staff
ToastProvider + `use-staff-stock` hook + both hubs) → `c7598ec` (cluster 2
— flows + stock-levels) → the Session-12 doc commit.

**Role:** Developer, Prosper project. **Development Sprint.** This session
builds **F3 Assets** end-to-end in one context window — it has no
stock/money dependency and a small surface (ADR-22):

1. **Backend** — `lib/domain/assets` (CRUD, condition transitions,
   friction-guarded hard-delete per ADR-22 / ADR-23) + `app/api/assets*`
   route handlers (parse → Zod → auth/role → `lib/domain/assets` →
   standard response shape; **no business logic in the handler**).
2. **Frontend** — **compose** the Assets Register + Asset Drawer + Asset
   Delete Dialog from the proven kit at `app/admin/assets/*`, wired to a
   per-feature hook (mirror `app/admin/stock/use-stock.ts` /
   `app/store-manager/use-staff-stock.ts`).

This is **not** a design sprint (no new visual decisions — if a screen
needs one, STOP and flag it in `PROGRESS.md`), **not** a kit change
(`components/kit/*` + `components/shells/*` are proven and gated — don't
touch them), and **not** a rework of F1/F2 (`lib/domain/{catalog,stock}`,
`app/api/{products,locations,stock-movements}*`, `app/admin/**`,
`app/store-manager/**`, `app/canteen/**` are untouchable).

---

## Required reading (before any code)

1. **`CLAUDE.md`** — role model, **pnpm only**, **post a visible
   checklist**, the Design/Development-Sprint paragraphs.
2. **`docs/design/export-workflow.md`** — the compose-don't-transcribe
   method + the per-screen gate (Phase C1–C3).
3. **`docs/DECISIONS.md`** —
   - **ADR-22** — Assets: the register, condition field, retirement.
   - **ADR-23** — soft-delete / hard-delete mechanics (the friction
     pattern — same as Product: hard-delete blocked with linked history →
     `409 CONFLICT`; soft-delete = `deletedAt` stamp + hidden from
     default reads).
   - **ADR-36c** — the `<FrictionDeleteDialog>` label props: for assets,
     **"Keep Asset" / "Delete Asset Record"**, and `showArchiveLink={false}`
     (assets have no archive-instead affordance — a used asset just can't
     be hard-deleted).
   - **ADR-42 / ADR-43** — the kit's Storybook gate; `<Toast>` placement
     is a `<ToastProvider>` prop (**admin gets `top-right`** — already
     wired in `app/admin/admin-shell-client.tsx`, Session 11).
   - **ADR-44** — *(Session 12)* the staff artboards were superseded by
     the kit. **Check whether the 3 asset artboards have the same
     problem** — they are also Session 3–4 exports. If they were drawn
     before the kit and diverge structurally, the same ruling applies
     (kit is the target, visual-diff against Storybook); if they compose
     cleanly, diff against the artboard as normal. Decide early and note
     it.
4. **`docs/SCHEMA.md`** "Assets" — the `Asset` table shape (fields,
   condition enum, the linked-history relations that gate hard-delete).
5. **`docs/API.md`** "Assets" — `POST /api/assets`, `PATCH
   /api/assets/:id`, `POST /api/assets/:id/soft-delete`, `POST
   /api/assets/:id/hard-delete`. **Do not change these shapes** — if the
   doc is thin, follow the Catalog Product endpoints as the precedent
   (Session 5) and expand the doc.
6. **The 3 asset skeletons** + their Paper artboards:
   - `docs/design/screens/admin-assets-register` (artboard `8DL-0`)
   - `docs/design/screens/asset-drawer` (`8JO-0`)
   - `docs/design/screens/asset-delete-dialog` (`8IV-0`)
   Know which markup block maps to which kit component; flag any block
   with no kit equivalent (per ADR-44 that's a "kit is the target" call,
   not a blocker).
7. **`app/admin/catalog/*`** — the closest precedent. The Assets Register
   is a `<PageShell>` + `<SimpleTable>` (desktop) / card list (mobile) +
   `<SearchInput>` + a rail `<Drawer>` for create/edit + a
   `<FrictionDeleteDialog>` — structurally the same as `catalog-client` /
   `product-drawer` / `product-delete-dialog`. Compose from those
   patterns; write a per-screen mapper where the kit prop shape doesn't
   fit, never a kit change.
8. **`node_modules/next/dist/docs/`** — Next 16.3.1, React 19.2, Tailwind
   v4.3.3. Read the relevant guide before any config / route change.
9. **The Paper file** ("Prosper Hotel", `01M0EZ7TAHZM26KBMWNYT0928X`,
   page "Shell+Component kit") — **READ-ONLY**, `get_*` only.
   `get_guide({ topic: "paper-mcp-instructions" })` first.

---

## Scope

### A. Backend — `lib/domain/assets` + `app/api/assets*`

- **`lib/domain/assets`** (new module, `docs/CONVENTIONS.md §1` — one
  module per schema section):
  - `createAsset` / `updateAsset` — name, category, location, condition,
    acquired date, cost (money = `Decimal`), notes. Zod schema in
    `lib/validation/assets.ts` (shared FE + BE).
  - `listAssets` — role-scoped (Admin sees all; if any location-bound
    role gets an asset view later, scope it — but M1 is Admin-only per
    ADR-22).
  - `transitionCondition` — the condition field is an enum
    (`SCHEMA.md`); moving between states is a plain update in M1 (no
    approval workflow) but goes through the domain so the audit-log hook
    can pick it up later. **Corrections are new rows? No** — Assets is a
    mutable register (ADR-22), not a ledger; `updateAsset` is a true
    update. (Contrast F2 stock — that's append-only.) Confirm against
    `SCHEMA.md` / ADR-22 and note it.
  - `softDeleteAsset` — stamp `deletedAt`; hidden from `listAssets` by
    default.
  - `hardDeleteAsset` — **blocked with `409 CONFLICT` if the asset has
    linked history** (ADR-23 — e.g. a maintenance log, an assignment
    record, an audit-log entry). If nothing links, the row is deleted.
    Mirror `hardDeleteProduct` in `lib/domain/catalog/delete-product.ts`.
- **`app/api/assets/route.ts`** (`GET` list, `POST` create),
  **`app/api/assets/[id]/route.ts`** (`PATCH` update),
  **`app/api/assets/[id]/soft-delete/route.ts`**,
  **`app/api/assets/[id]/hard-delete/route.ts`** — each: parse → Zod →
  `requireApiRole("admin")` → `lib/domain/assets` → `ok()` / `fail()`.
  Follow `app/api/products/**` exactly.
- **Tests** (`vitest`, DB-backed — local Postgres must be running):
  - `createAsset` / `updateAsset` happy paths + Zod rejections.
  - **The hard-delete guard**: an asset with linked history → the domain
    throws `DomainError("CONFLICT", …)`; an unlinked asset → deleted.
  - **Condition transitions**: each allowed move; the read path shows the
    current condition.
  - `softDeleteAsset` hides the row from `listAssets`; a `?includeDeleted`
    (or equivalent) flag surfaces it.

### B. Frontend — compose the 3 screens at `app/admin/assets/*`

- **`app/admin/assets/page.tsx` + `assets-client.tsx`** — the Assets
  Register: `<PageShell>` + `<SearchInput>` + `<SimpleTable>` (desktop
  columns: Name / Category / Location / Condition / Acquired / Cost) with
  a `<StatusChip>` or `<ConditionChip>` for the condition cell, a card
  list below `--bp-md`, `<EmptyState>` (no assets) / `<EmptyState
  variant="filtered">` + Clear (search matches nothing) / `<ErrorState>`
  (Retry). A row / "Add asset" opens the rail `<Drawer>`.
- **`asset-drawer.tsx`** — create/edit in a rail `<Drawer>`:
  `<FormField>`-wrapped `<TextInput>` (name), `<Select>` (category,
  location, condition), `<DatePicker>` (acquired — `selected` / `onSelect`,
  `maxDate=now`), `<TextInput>` (cost — money), `<Textarea>` (notes).
  Submit → domain call → `<Toast>` + close + refresh. **Do not** hand-roll
  a `fixed inset-0` wrapper — `<Drawer>` owns its scrim / portal /
  focus-trap.
- **`asset-delete-dialog.tsx`** — `<FrictionDeleteDialog>` with
  **`confirmLabel="Delete Asset Record"` / `cancelLabel="Keep Asset"` /
  `showArchiveLink={false}`** (ADR-36c). Blocked path: when the API
  returns `409 CONFLICT`, show the "this asset has linked history and
  can't be deleted" state (the dialog's blocked variant), not a raw
  error toast.
- **`app/admin/assets/use-assets.ts`** — the per-feature hook (mirror
  `app/admin/stock/use-stock.ts`): `AssetRequestError` + `request<T>`,
  `assetApi` (`listAssets`, `createAsset`, `updateAsset`, `softDelete`,
  `hardDelete`), a `useAssets` hook. Screens are pure presentation +
  orchestration over it.
- **`TODO(mock)`** anything the backend didn't finish, behind the real
  interface. Grep before calling it done.

### C. Doc updates

- **`docs/PROGRESS.md`** — a Session 13 entry (backend shipped, screens
  composed, the ADR-44-or-not call for the asset artboards, `TODO(mock)`
  list, doc updates).
- **`docs/API.md`** "Assets" — fill in / correct the 4 endpoint shapes to
  what actually shipped.
- **`docs/SCHEMA.md`** — if the `Asset` table needed a field the schema
  didn't have, add it (+ a Prisma migration).
- **`docs/sprints/milestone-1-plan.md §5`** — tick Session 13.
- **`docs/DECISIONS.md`** — an ADR **only if** composing an asset screen
  or building the domain forces a real decision (next free number →
  **ADR-45**). Composition / CRUD that "just works" needs no ADR.
- **`docs/sprints/final-qa-handoff.md`** — draft it: the adversarial M1
  pass (QA Engineer role) against every M1 acceptance criterion, the
  approved screens, and the flow docs. Highest-stakes target: **ledger
  integrity** (F2 — derived balances, the 2-phase transfer, corrections
  as new rows, day-close lock). Plus: the F3 delete guard, F1 catalog
  price rules, the staff role-scoping (a Store Manager can't see / act on
  another location's stock). Note the carried Playwright e2e harness as
  the QA session's likely first task.

---

## Per-screen gate

Identical to Session 11 / 12 (see `export-workflow.md` C3):

1. **Visual-diff** — `get_screenshot` the artboard, compare;
   `get_computed_styles` for any value in doubt. **If the asset artboards
   are pre-kit Session 3–4 exports that diverge structurally (like the
   staff screens — ADR-44), the kit is the target and you diff against
   the kit Storybook stories instead.** Decide this early, per screen,
   and note it.
2. **Interaction spec** — a `*.screen.test.tsx` under `tests/screens/`
   (jsdom + RTL, the hook / `assetApi` mocked, no server / DB). Assert:
   the drawer opens + Esc restores focus to the opener (WCAG 2.4.3);
   create/edit submits → `<Toast>` + drawer closes + list refreshes;
   `<FrictionDeleteDialog>` confirm → `hardDelete` called; the **blocked
   (409) path** shows the can't-delete state, not a toast;
   `<EmptyState variant="filtered">` on an empty search; `<ErrorState>`
   on a mocked fetch failure.
3. **Responsive** — the `<SimpleTable>` ↔ card-list swap at `--bp-md`,
   both matching their target.
4. **axe** — no serious/critical violations.

Global gates (unchanged): **`pnpm test` stays green** (add the domain +
screen specs, don't weaken the suite — 127 tests as of Session 12);
`pnpm tsc --noEmit` exit 0; `pnpm build` clean; the kit's
`pnpm test:visual` + `pnpm test:a11y` still pass (you should not be
touching `components/kit/*`).

---

## Constraints

- **Composition, not transcription, not redesign.** No new visual design
  decisions. If a screen genuinely needs one, **STOP and flag it** in
  `PROGRESS.md` + raise it.
- **No business logic in `app/api/assets/*` handlers.** Parse → Zod →
  auth → `lib/domain/assets` → standard response shape.
- **Money is `Decimal` / `NUMERIC`.** Asset cost never touches
  floating-point.
- **Do NOT touch `components/kit/*` / `components/shells/*`** (proven +
  gated). The one exception: a real kit **bug** surfaced by composing a
  screen — fix it, re-run `test:visual` + `test:a11y`, re-baseline only
  the affected story, note it.
- **Do NOT touch F1/F2** — `lib/domain/{catalog,stock}`,
  `app/api/{products,locations,stock-movements}*`, `app/admin/{catalog,
  stock,financials}/**`, `app/store-manager/**`, `app/canteen/**`.
- **`/design-preview/<slug>` routes + `docs/design/screens/<slug>/` dirs
  stay** as the frozen visual-regression reference. Compose the `app/**`
  copies.
- **pnpm only.** Read `node_modules/next/dist/docs/` before any config /
  route / middleware change. Local Postgres must be running for
  `pnpm test`.
- **Git:** you are on `session-10b-kit-proof-harness` (NOT `main`).
  Commit per cluster (backend, then each screen). If the owner wants M1
  on `main`, that's a PR opened with `gh` — never push `main` directly.

---

## Suggested order (one context window)

1. **Read** — the required-reading list, `SCHEMA.md` Assets, the 3
   skeletons + artboards. Decide per screen whether ADR-44 applies (the
   artboards are pre-kit) or the artboard is the direct target.
2. **`lib/domain/assets`** + `lib/validation/assets.ts` + the DB-backed
   domain tests (CRUD, condition transitions, the hard-delete guard).
   Gate: `pnpm test` green. Commit.
3. **`app/api/assets/**`** — the 4 route handlers, following
   `app/api/products/**`. Commit.
4. **`use-assets.ts`** — the per-feature hook (mirror `use-stock.ts`).
5. **Assets Register** (`8DL-0`) — `<PageShell>` + `<SimpleTable>` / card
   list + `<SearchInput>` + `<EmptyState>` / `<ErrorState>`. Gate.
   Commit.
6. **Asset Drawer** (`8JO-0`) — rail `<Drawer>` + `<FormField>` fields +
   `<Toast>` on save. Gate. Commit.
7. **Asset Delete Dialog** (`8IV-0`) — `<FrictionDeleteDialog>` with the
   ADR-36c labels + the 409-blocked state. Gate. Commit.
8. **Docs (C)** + draft `final-qa-handoff.md`.
9. **Full gate sweep** — `pnpm test`, `pnpm tsc --noEmit`, `pnpm build`,
   kit `test:visual` + `test:a11y`, every screen spec. Commit. Push.

---

## Wrap-up (definition of done)

- `lib/domain/assets` + `lib/validation/assets.ts` + `app/api/assets*`
  built; the hard-delete friction guard (409 with linked history) and
  condition transitions tested (DB-backed).
- Assets Register + Asset Drawer + Asset Delete Dialog composed from the
  kit into `app/admin/assets/*`; `<PageShell>` / `<FormField>` /
  `<Toast>` / `<EmptyState>` / `<ErrorState>` / `<FrictionDeleteDialog>`
  (ADR-36c labels, `showArchiveLink={false}`) adopted.
- `use-assets.ts` per-feature hook; screens are pure presentation over
  it. Every unfinished piece a `TODO(mock)` behind the real interface;
  grep clean of anything else.
- Per-screen gate green for all 3; global gates green (127+ unit/screen,
  tsc, build, kit visual + a11y).
- `docs/PROGRESS.md` Session 13 entry; `docs/API.md` + `docs/SCHEMA.md`
  Assets sections corrected; `milestone-1-plan.md §5` ticked; ADR-45 only
  if a real decision was forced.
- **`docs/sprints/final-qa-handoff.md` drafted** — the adversarial M1 QA
  pass.

Then the QA pass, then M1 is done.
