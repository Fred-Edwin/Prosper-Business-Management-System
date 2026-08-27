# Session 5 Handoff — Developer (Development Sprint): implement M1-F1 Catalog & Locations

**Role:** Developer, **Development Sprint** mode, for the Prosper project.
**Phase:** C (Implementation) of `docs/design/export-workflow.md`, feature
M1-F1. **First** development session of Milestone 1 — everything before
this was design/export.

**Your job:** turn the F1 design skeletons into a working feature —
`lib/domain/catalog` (the rules), `app/api/products*` + `/api/locations`
(the HTTP layer), and the real `app/admin/catalog/*` screens — with every
`TODO(mock)` in F1 scope replaced by a real call. Then write this
session's tests.

**You make NO new UI/UX decisions.** The Paper screens are approved and
exported. If wiring reveals a genuine UI gap (a state nobody designed, a
control that can't express what the data needs), **STOP and flag it** —
it goes back to a design sprint, it does not get decided here. Do NOT
touch `components/kit/*`, `components/shells/*`, or the approved
markup/layout of the exported skeletons.

---

## Required reading (before any code)

Read in this order:

1. **`CLAUDE.md`** (root) — the role model, the non-negotiables (ledgers
   not stored totals; **`app/api/*` handlers contain NO business logic**;
   money is always `Decimal`; `TODO(mock)` must be resolved before
   "done"), **pnpm only**, the "read `node_modules/next/dist/docs/`
   before any route/API code" rule, the visible-progress rule (post a
   checklist, tick it as you go).
2. **`docs/sprints/milestone-1-plan.md`** — §2 (F1 = "Admin defines
   Ingredients / Dishes / Goods with per-location selling prices; Dish
   `buying_price = 0` invariant; friction-gated delete with referential
   guard"), §5 "Session 5" (your one-paragraph scope), §5 "Sessions
   5..N" preamble (Phase C rules — backend/frontend either order,
   `fixtures.ts` decouples them, each session ends with its own tests).
3. **`docs/CONVENTIONS.md`** — §1 (folder structure; the
   `app/api/*` = parse → validate → check auth/role/ownership → call one
   `lib/domain` function → standard response shape rule), §2 (naming),
   §3 (**the error-response shape** — `{ error: { code, message, field? } }`
   and the standard `code` values incl. `CONFLICT` = 409), §4 (the
   correction-entry pattern — **note: a catalog entry is NOT a ledger**,
   so product edits are true edits, not correction rows; §4 still governs
   how you word deletes), §5 (money = `Decimal`, never float).
4. **`docs/SCHEMA.md`** + **`prisma/schema.prisma`** — the `Product`,
   `ProductLocation`, `Location` models (already migrated — do NOT add a
   migration unless a real gap is found). Key facts from the live schema:
   - `Product`: `id`, `name`, `kind` (`ProductKind` enum: `ingredient` |
     `dish` | `goods`), `buyingPrice Decimal?` (`@db.Decimal(12,2)`),
     `unitLabel`, `deletedAt DateTime?` (soft-delete marker),
     timestamps. Relations: `productLocations`, `stockMovements`,
     `orderLines`, `stockCounts`, `recipe`, `recipeIngredientOf`.
   - `ProductLocation`: `productId` + `locationId` (`@@unique` together),
     `sellingPrice Decimal?`, `active Boolean @default(true)`.
   - `Location`: `id`, `name`, `type` (`LocationType`: `restaurant` |
     `canteen` | `store`), `active`.
   - **`Product.unitCost` does not exist** (removed by ADR-33).
5. **`docs/API.md`** — the "Catalog" section. It already specifies the
   endpoints (`GET /api/locations`, `GET /api/products`, `POST
   /api/products`, `PATCH /api/products/:id`, `POST
   /api/products/:id/soft-delete`, `POST /api/products/:id/hard-delete`,
   `POST /api/products/:id/locations`). **Match this contract.** If you
   deviate (e.g. fold location prices into the create/patch body — the
   `product-drawer` design submits them together, which argues for it),
   update `API.md` in the same session and note it in `PROGRESS.md`.
6. **`docs/DECISIONS.md` ADR-33** — the Dish `buying_price = 0` rule and
   *why* (food cost is derived from ingredient consumption, not a
   per-dish figure). Recipes are informational-only and **out of scope
   for this session** — do not build `lib/domain/catalog` recipe logic
   or `/api/recipes` here (that is a later milestone's concern; the
   schema models exist but stay untouched).
7. **`docs/TEST_PLAN.md`** — the testing strategy + `ADR-31` (each
   dev session ends with its own tests). Test runner is **`pnpm test`**
   (`vitest run`).
8. The **exported F1 skeletons** you'll be moving/wiring — read all four
   plus their `fixtures.ts`:
   - `docs/design/screens/admin-catalog-product-catalog/{page.tsx,fixtures.ts}`
   - `docs/design/screens/admin-catalog-mobile/{page.tsx,fixtures.ts}`
   - `docs/design/screens/product-drawer/{page.tsx,fixtures.ts}`
   - `docs/design/screens/product-delete-dialog/{page.tsx,fixtures.ts}`
9. **Existing patterns to copy:**
   - `lib/db/index.ts` — the shared `prisma` client (`import { prisma }
     from "@/lib/db"`). Use it; do not `new PrismaClient()`.
   - `lib/auth/session.ts` `requireRole()` — the page-level guard. There
     is **no API-route auth helper yet** — you create the first one this
     session (see Task A0 below).
   - `lib/validation/example.ts` — the shared-Zod-schema pattern (one
     schema per resource, imported by both the route and the client
     form). `lib/validation/catalog.ts` is yours to write.
   - `app/admin/admin-shell-client.tsx` + `app/admin/page.tsx` — how an
     admin route mounts inside the admin shell.

**Note — `docs/sprints/sprint-03-catalog-development.md` exists** and
covers the same feature. It predates the `milestone-1-plan.md` re-plan
and the Paper re-export. Treat it as **historical reference for the
domain-logic intent only** (its §2A/§2B function list is still accurate);
`milestone-1-plan.md` §5 + this handoff are authoritative for scope,
file locations, and the fact that you're moving *exported* skeletons, not
building screens from scratch.

---

## Scope — what "done" means

### Backend

- `lib/domain/catalog/*` implements the F1 rules, HTTP-agnostic, tested.
- `app/api/products*` + `app/api/locations` are thin handlers over it,
  matching `API.md`'s contract and `CONVENTIONS.md` §3's response shape.
- **No business logic in a route handler.** If a handler has an `if`
  about a domain rule, a price calculation, or a query beyond "fetch the
  thing," it belongs in `lib/domain/catalog`.

### Frontend

- The four F1 skeletons live at their real `app/admin/catalog/*` paths,
  wired to the API, with **zero** `fixtures.ts` imports remaining in the
  `app/**` copies.
- The approved markup/layout is unchanged — you add state/handlers/fetch
  around it, you don't restyle it.
- `docs/design/screens/admin-catalog-*` + `product-*` and their
  `/design-preview/*` routes **stay** (still importing `fixtures.ts`) as
  the permanent visual-regression reference — do NOT delete them.

### Tests

- New `vitest` suites for the Dish invariant, per-location price
  persistence, and the delete referential guard (see "Tests" below).

### Cleanup

- `grep -rn "TODO(mock)" app/admin/catalog lib/domain/catalog` returns
  nothing.
- `pnpm tsc --noEmit` exit 0. `pnpm test` green.

---

## Task list

Post this as your working checklist and tick it as you go.

### A0. Route-auth + response-shape helpers (once, reused by every handler)

- `lib/api/response.ts` — `ok(data, init?)` and `fail(code, message,
  field?, status?)` returning `NextResponse.json` in the
  `CONVENTIONS.md` §3 shape (`{ data }` / `{ error: { code, message,
  field? } }`). Map each `code` to its status (`VALIDATION_ERROR`→400,
  `UNAUTHENTICATED`→401, `FORBIDDEN`→403, `NOT_FOUND`→404,
  `CONFLICT`→409, `INTERNAL_ERROR`→500).
- `lib/api/require-role.ts` — `requireApiRole(role): Promise<Session |
  NextResponse>` — the API-route equivalent of `lib/auth/session.ts`'s
  `requireRole` (reads the session, returns a `401`/`403`
  `NextResponse` instead of redirecting). Handlers call it first and
  early-return the response if it isn't a session.
- Read `node_modules/next/dist/docs/` for the current Route Handler API
  (`export async function GET(req: Request)` etc. — the signatures and
  `params` shape may differ from your training data).

### A. Domain — `lib/domain/catalog/`

Pure functions, no `Request`/`Response`, no `NextResponse`. Each throws a
typed `DomainError` (see below) the route layer maps to a `fail(...)`.

- `lib/domain/catalog/errors.ts` — a small `DomainError` class carrying a
  `code` (one of the `CONVENTIONS.md` §3 values) + `message` + optional
  `field`, so route handlers `catch` and translate uniformly.
- `lib/domain/catalog/types.ts` — TS shapes: `ProductWithLocations`,
  `LocationPriceInput` (`{ locationId, sellingPrice, active }`),
  `CreateProductInput`, `UpdateProductInput`. Exported for the domain,
  the Zod file, and the frontend.
- `lib/domain/catalog/list-products.ts` — `listProducts({ kind?, search?,
  includeArchived? }, { role }): Promise<ProductWithLocations[]>`. Joins
  `productLocations` (+ their `location`). Filters by `kind`, by a
  case-insensitive `name` contains `search`, excludes `deletedAt != null`
  unless `includeArchived`. **Role scoping:** strip `buyingPrice` to
  `null` for any non-`admin` role (per `API.md` "buying price stripped
  for non-Admin"). Deterministic sort (kind, then name).
- `lib/domain/catalog/get-product.ts` — `getProduct(id): Promise<
  ProductWithLocations>` (throws `NOT_FOUND` if missing or soft-deleted).
  Populates the edit drawer.
- `lib/domain/catalog/create-product.ts` — `createProduct(input:
  CreateProductInput): Promise<ProductWithLocations>`.
  - `name` non-empty (trimmed); `kind` a valid enum; `unitLabel`
    non-empty.
  - **Dish invariant (ADR-33):** if `kind === "dish"`, force
    `buyingPrice = 0` regardless of what was passed. For `ingredient` /
    `goods`, `buyingPrice` is required and `>= 0`.
  - Writes the `Product` + its `ProductLocation` rows (one per submitted
    location; `sellingPrice` may be `null` when `active === false`) in a
    single `prisma.$transaction`.
- `lib/domain/catalog/update-product.ts` — `updateProduct(id, input:
  UpdateProductInput): Promise<ProductWithLocations>`.
  - Same name/kind/unit validation. Same Dish invariant — and if the
    kind is being **changed to** `dish`, zero the `buyingPrice` too.
  - Reconcile `ProductLocation` rows to match the submitted set: upsert
    the ones present (by the `@@unique([productId, locationId])`),
    deactivate or delete the ones no longer present (pick one and be
    consistent — deactivating preserves any future audit need; document
    the choice).
  - `NOT_FOUND` if the product is missing / soft-deleted.
- `lib/domain/catalog/delete-product.ts` — two exported functions:
  - `archiveProduct(id): Promise<void>` — sets `Product.deletedAt = now()`
    (and `ProductLocation.active = false` for its rows). Idempotent-ish;
    `NOT_FOUND` if the product never existed.
  - `hardDeleteProduct(id, confirmName): Promise<void>` —
    - `confirmName` must equal `product.name` **exactly** (case-sensitive)
      → else `VALIDATION_ERROR` (`field: "confirmName"`).
    - **Referential guard:** count linked `StockMovement` + `OrderLine`
      (+ `StockCount`, `RecipeIngredient` if you want to be thorough —
      but `StockMovement`/`OrderLine` are the ones `API.md` names). If
      `> 0` → throw `CONFLICT` ("Cannot delete a product with historical
      transactions — archive it instead."). The frontend turns this into
      the "Archive instead" path.
    - If clean → delete the `ProductLocation` rows then the `Product`, in
      a transaction.
- `lib/domain/catalog/locations.ts` — `listLocations({ activeOnly = true
  }): Promise<Location[]>`. Thin, but keeps the route logic-free; needed
  to render the drawer's per-location rows.
- `lib/domain/catalog/index.ts` — re-export the public functions so
  routes `import { createProduct, ... } from "@/lib/domain/catalog"`.

### B. Validation — `lib/validation/catalog.ts`

- `createProductSchema`, `updateProductSchema` — Zod, mirroring
  `CreateProductInput` / `UpdateProductInput`: `name` min 1, `kind`
  enum, `unitLabel` min 1, `buyingPrice` a non-negative number
  (`.optional()` — the domain enforces "required for non-dish"),
  `locations` an array of `{ locationId: uuid, sellingPrice: number ≥ 0
  | null, active: boolean }`.
- `hardDeleteProductSchema` — `{ confirmName: z.string().min(1) }`.
- `export type` the inferred types; the client forms import the same
  schemas (the `lib/validation/example.ts` pattern).

### C. API routes — `app/api/`

Each handler: `requireApiRole("admin")` (early-return on non-session) →
parse body / query → `schema.safeParse` (→ `fail("VALIDATION_ERROR",
..., issue.path)` on failure) → `try { call domain } catch (e) { if
(e instanceof DomainError) return fail(e.code, e.message, e.field) ;
throw }` → `ok(result)`.

- `app/api/locations/route.ts` — `GET` → `listLocations()`.
  (`API.md` says "Roles: all" — but M1 only the Admin catalog uses it;
  gate to `admin` for now and widen when another consumer appears, or
  follow `API.md` — your call, note it.)
- `app/api/products/route.ts` —
  - `GET` → `listProducts({ kind, search, includeArchived }, { role })`
    from the query string. Role from the session (so non-admins, when
    they exist, get buying price stripped).
  - `POST` → `createProduct(parsed)` (admin only).
- `app/api/products/[id]/route.ts` —
  - `GET` → `getProduct(id)`.
  - `PATCH` → `updateProduct(id, parsed)` (admin only).
  - `DELETE` → admin only. `?mode=archive` → `archiveProduct(id)`.
    Otherwise expects `{ confirmName }` in the body →
    `hardDeleteProduct(id, confirmName)`. **OR** keep `API.md`'s explicit
    `POST /api/products/:id/soft-delete` + `POST
    /api/products/:id/hard-delete` sub-routes — either is fine, pick one,
    keep `API.md` in sync.
- **If the drawer submits location prices together with the product**
  (it does — the design has one Save button), let `POST`/`PATCH`
  `/api/products` carry the `locations` array and drop the separate
  `POST /api/products/:id/locations` route, updating `API.md`. A
  standalone location endpoint with no screen calling it is dead
  surface.

### D. Frontend — move + wire `app/admin/catalog/`

The exported skeletons are **static**. Moving them to `app/admin/catalog`
means adding exactly the orchestration Phase C calls for (state for
which drawer/dialog is open + which product is selected; fetch on load;
submit → API → close + refetch) — **nothing else changes**.

- `app/admin/catalog/use-catalog.ts` — a client hook: holds `products`,
  `locations`, `loading`, `error`, and actions `refresh()`,
  `create(input)`, `update(id, input)`, `archive(id)`,
  `hardDelete(id, confirmName)`. All fetch calls live here. Returns
  typed data (reuse `ProductWithLocations` from the domain types).
- `app/admin/catalog/page.tsx` — from
  `docs/design/screens/admin-catalog-product-catalog/page.tsx`. Becomes
  a client container (or a server shell + client island — your call, but
  the table is interactive so a client component is simplest). Uses
  `use-catalog`, renders the real rows, owns `openDrawer` /
  `selectedProduct` / `deleteTarget` state, mounts the drawer + dialog.
  Keep the sidebar, toolbar, tabs, table markup **verbatim** from the
  skeleton.
- `app/admin/catalog/product-drawer.tsx` — from
  `docs/design/screens/product-drawer/page.tsx`. Real controlled form:
  name, kind segmented control (**picking "Dish" disables + zeroes the
  buying-price field** and shows the existing dish note), unit label,
  per-location rows (toggle on/off + price), footer Save → `create` or
  `update` → close + `refresh()`. Surface API `VALIDATION_ERROR.field`
  on the matching input.
- `app/admin/catalog/product-delete-dialog.tsx` — from
  `docs/design/screens/product-delete-dialog/page.tsx`. The
  type-the-exact-name gate stays (compare to `deleteTarget.name`).
  Confirm → `hardDelete(id, typedName)`. On a `409 CONFLICT` response,
  switch the dialog to the **"Archive instead"** affordance (the
  skeleton already has `showArchiveLink: true`) → `archive(id)`.
- **Responsive:** `admin-catalog-mobile` is the same feature at mobile
  width. Fold it in as the responsive variant here (same `use-catalog`),
  or as a separate `@media`/breakpoint branch — do not build a second
  data path.
- **Do NOT delete** `docs/design/screens/admin-catalog-*`,
  `product-drawer`, `product-delete-dialog`, or their
  `app/design-preview/*` routes — they stay as the regression fixtures.

### E. Tests (`pnpm test`)

Against a real local Postgres (the `lib/auth/config.test.ts` pattern —
`import { prisma } from "@/lib/db"`, seed/cleanup per test). Minimum:

- `lib/domain/catalog/create-product.test.ts`
  - a `dish` created with `buyingPrice: 500` is persisted with
    `buyingPrice` equal to `0`;
  - an `ingredient` created with `buyingPrice: 580` keeps it;
  - `createProduct` with 3 location rows writes 3 `ProductLocation` rows
    with the right `sellingPrice`s;
  - missing `buyingPrice` on a `goods` product → `DomainError`
    `VALIDATION_ERROR`.
- `lib/domain/catalog/update-product.test.ts`
  - changing an `ingredient` to `dish` zeroes its `buyingPrice`;
  - editing the `locations` set adds a new `ProductLocation`, updates an
    existing price, and deactivates/removes a dropped one.
- `lib/domain/catalog/delete-product.test.ts`
  - `hardDeleteProduct` on a product with a linked `StockMovement` throws
    `DomainError` `CONFLICT`; the product still exists afterward;
  - `hardDeleteProduct` on an unreferenced product with a matching
    `confirmName` deletes it and its `ProductLocation` rows;
  - wrong `confirmName` → `VALIDATION_ERROR`, nothing deleted;
  - `archiveProduct` sets `deletedAt`; `listProducts` without
    `includeArchived` no longer returns it.

Keep the existing 24 tests green.

---

## Verification (all required before "done")

1. `pnpm tsc --noEmit` exits 0 (`rm -rf .next` first if
   `.next/dev/types` complains).
2. `pnpm test` — all suites green, including the 3 new ones.
3. `pnpm dev` smoke-check as **Admin** (local Postgres + `pnpm prisma db
   seed`, log in "Admin" / PIN 1234):
   - `/admin/catalog` lists the seeded products;
   - create an **Ingredient** (buying price sticks) and a **Dish**
     (buying-price field disabled, saved as `0.00` — confirm in the DB
     or a refetch);
   - edit a product's per-location prices, toggle a location off →
     reopen → the change persisted;
   - delete a seeded product that has a `StockMovement`/`OrderLine` →
     get the 409 → "Archive instead" path works (product gains
     `deletedAt`, drops off the list);
   - delete an unreferenced product via the type-the-name gate.
   - `/design-preview/admin-catalog-product-catalog` (+ mobile, drawer,
     dialog) still render (fixtures untouched).
4. `grep -rn "TODO(mock)" app/admin/catalog lib/domain/catalog` → empty.
   (F1's `docs/design/screens/*/fixtures.ts` keep their `TODO(mock)` —
   those files stay as fixtures; only the `app/**` copies are wired.)
5. Any throwaway script lives in the repo root and is deleted when done
   (import from `@playwright/test`, not `playwright`).

---

## Wrap-up

- `docs/sprints/milestone-1-plan.md` §5 — mark **Session 5 DONE**; note
  "F1 Catalog & Locations implemented + tested; ready for Session 6 (F2
  stock backend)".
- `docs/PROGRESS.md` — add a "Session 5" entry: domain functions +
  routes shipped, the F1 screens moved to `app/admin/catalog/*`,
  fixtures swapped, any `API.md` contract change (e.g. folding location
  prices into create/patch), test counts, anything flagged.
- `docs/API.md` — update the Catalog section if the implemented contract
  differs from what's written.
- `docs/DECISIONS.md` — a short ADR only if a real design/architecture
  choice was made mid-session (e.g. "location prices are submitted with
  the product, not via a separate endpoint").

---

## Constraints (unchanged)

- **Development Sprint role.** Real logic only. **No new UI/UX
  decisions** — missing/contradictory design → STOP and flag.
- **No business logic in `app/api/*`** — parse → validate → check
  auth/role → call `lib/domain/catalog` → standard response shape.
- **Money is `Decimal`**, never float. Trimmed, non-negative.
- **Dish `buyingPrice` is always `0`** — enforced in the domain, not
  just the form (ADR-33).
- **Corrections vs edits:** a catalog entry is not a ledger — product
  edits are true edits. Deletes follow `CONVENTIONS.md` §4's wording
  (friction-gated, referential guard → 409, archive as the safe path).
- Do NOT delete the `docs/design/screens/*` skeletons or the
  `/design-preview/*` routes — they are permanent regression fixtures.
- Do NOT touch `components/kit/*` / `components/shells/*` / the approved
  skeleton markup.
- pnpm only. Read `node_modules/next/dist/docs/` before any Route
  Handler / route API code.
- Post a checklist up front; tick it per task.
