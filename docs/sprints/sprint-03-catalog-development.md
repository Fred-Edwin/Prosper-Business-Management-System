# Sprint 03 — Catalog & Locations (Development & Integration)

**Milestone:** 1 — The business exists in the system  
**Type:** Development Sprint  
**Dependency:** Follows Sprint 02 (Approved Designs)  
**Status:** ready  

---

## 1. Required Context & Reading
*Before writing logic or API routes, the agent MUST review these exact documents:*
- [`docs/milestones/milestone-01-the-business-exists.md`](../milestones/milestone-01-the-business-exists.md) — Master Milestone 1 specifications and decisions.
- [`docs/sprints/sprint-02-catalog-design.md`](sprint-02-catalog-design.md) — Approved screen designs, component structure, and form layouts.
- [`docs/SCHEMA.md`](../SCHEMA.md) & [`prisma/schema.prisma`](../../prisma/schema.prisma) — `Product`, `ProductLocation`, and `Location` data models.
- [`docs/API.md`](../API.md) — Standard REST API contract, error shapes, and role filtering.
- [`docs/CONVENTIONS.md`](../CONVENTIONS.md) — Separation of concerns (all business logic in `lib/domain/catalog/`, thin route handlers in `app/api/*`).

---

## 2. Scope & Implementation Tasks

### A. Domain Business Logic (`lib/domain/catalog/index.ts`)
Implement pure domain functions independent of HTTP requests:
1. `getProducts(filters, userRole)`:
   - Queries `Product` with relations (`ProductLocation`).
   - Filters by `location_id`, `kind`, `active`.
   - **Role Scoping Invariant:** Strips `buying_price` for non-Admin roles (e.g. Cashier, Canteen Attendant).
2. `createProduct(input)`:
   - Validates input against Zod schema.
   - **Dish Invariant:** If `kind === 'dish'`, forces `buying_price = 0` (food costs are captured at ingredient level).
   - Atomically creates `Product` and its `ProductLocation` entries in a single Prisma transaction (`prisma.$transaction`).
3. `updateProduct(id, input)`:
   - Updates product metadata (name, unit label, active status).
   - Upserts `ProductLocation` entries (location selling prices and location-active flags).
4. `softDeleteProduct(id)`:
   - Sets `active = false` on `Product` and related `ProductLocation` entries.
5. `hardDeleteProduct(id, confirmName)`:
   - Validates that `confirmName === product.name` (case-sensitive).
   - **Referential Integrity Guard:** Checks whether any linked `StockMovement` or `OrderLine` records exist. If records exist, throws a conflict error (`409 CONFLICT: Cannot delete product with historical transactions`).
   - If clean, permanently deletes `Product` and its `ProductLocation` rows.

### B. Validation Schemas (`lib/validation/catalog.ts`)
- `createProductSchema`: Zod schema for product creation with nested array of location prices.
- `updateProductSchema`: Zod schema for updating product info and location overrides.
- `hardDeleteProductSchema`: Zod schema validating `confirm_name`.

### C. API Route Handlers (`app/api/`)
*Thin HTTP layer: parse $\rightarrow$ validate $\rightarrow$ check role $\rightarrow$ call domain $\rightarrow$ standard JSON response.*
- `GET /api/locations` — Fetch active business locations.
- `GET /api/products` — Role-scoped list of products.
- `POST /api/products` — Create product with inline location prices (Admin only).
- `PATCH /api/products/:id` — Update product details and location prices (Admin only).
- `POST /api/products/:id/soft-delete` — Archive product (Admin only).
- `POST /api/products/:id/hard-delete` — Friction-gated permanent deletion (Admin only).

### D. Real Frontend Wiring (`app/admin/catalog/`)
*Direct database integration with ZERO mock data:*
- `app/admin/catalog/page.tsx`: Server component / client container fetching real data from `/api/products`.
- `components/catalog/product-drawer.tsx`:
  - Form state bound to real `createProduct` / `updateProduct` mutations.
  - Interactive Dish selector auto-disabling Buying Price.
  - Location pricing inputs for Restaurant, Canteen, and Store.
  - Toast feedback on success/failure.
- `components/catalog/product-table.tsx`:
  - Live category tab filtering (`All`, `Ingredients`, `Dishes`, `Goods`).
  - Search filtering and location dropdowns.
  - Row action menus wired to Edit, Archive, and Delete.
- `components/catalog/product-delete-dialog.tsx`:
  - Friction matching input enabling delete button only upon exact match.
  - Error banner display if server returns 409 conflict.

---

## 3. Invariants & Business Rules
1. **Zero Mock Data:** All interfaces connect to real PostgreSQL database via Prisma.
2. **Dish Buying Price Rule:** A Dish never carries a buying price in database or API responses (`buying_price = 0`).
3. **Admin Exclusivity:** Non-Admin roles can never view buying prices or access `/admin/catalog`.
4. **History Protection:** Products with existing stock movements can never be hard-deleted.

---

## 4. Acceptance Criteria
- [ ] Admin can create Ingredients and Goods with buying price and location-specific selling prices.
- [ ] Admin can create Dishes with selling prices; buying price is enforced at 0.
- [ ] Catalog table renders live products from PostgreSQL with accurate category chips and price badges.
- [ ] Filtering by Category (`Ingredients`, `Dishes`, `Goods`), Location, and Search query works in real-time.
- [ ] Editing a product updates both general metadata and location selling prices in one submit.
- [ ] Soft delete hides product from active catalog without database deletion.
- [ ] Hard delete requires exact product name and fails safely with `409 CONFLICT` if history exists.
- [ ] `pnpm build` passes with zero TypeScript or lint errors.

---

## 5. Session Notes
*(To be updated during development execution)*
