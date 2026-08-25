# Sprint 04 — Catalog & Locations (QA & Verification)

**Milestone:** 1 — The business exists in the system  
**Type:** QA Sprint (Adversarial Verification)  
**Dependency:** Follows Sprint 03 (Implemented Logic & UI)  
**Status:** ready  

---

## 1. Required Context & Reading
*Before testing, the agent MUST review these exact documents:*
- [`docs/milestones/milestone-01-the-business-exists.md`](../milestones/milestone-01-the-business-exists.md) — Master Milestone 1 specifications and acceptance criteria.
- [`docs/sprints/sprint-03-catalog-development.md`](sprint-03-catalog-development.md) — Implemented domain functions, API contracts, and component behavior.
- [`docs/TEST_PLAN.md`](../TEST_PLAN.md) — Testing strategy, unit test standards, and RBAC rules.
- [`docs/CONVENTIONS.md`](../CONVENTIONS.md) — Standard API error response shapes and status codes.

---

## 2. Scope & Test Matrix

### A. Automated Unit Tests (`lib/domain/catalog/index.test.ts`)
Write comprehensive Vitest test suites covering:
1. **Creation & Invariants:**
   - Creating an `ingredient` or `goods` persists accurate `buying_price` and `ProductLocation` selling prices.
   - Creating a `dish` with a non-zero buying price is forcefully overridden to `0` (database and return value).
   - Creating a product with empty name or missing unit label triggers Zod validation error.
   - Creating a product with a duplicate name is rejected.
2. **Updates & Price Overrides:**
   - Updating location selling price for Restaurant does not affect Canteen selling price.
   - Deactivating a product at Store keeps it active at Restaurant.
3. **Deletion & Referential Guard Tests:**
   - Hard-deleting an unused product with exact matching name succeeds.
   - Hard-deleting with a mismatched name (e.g. wrong casing or typo) throws validation error.
   - Hard-deleting a product that has linked `StockMovement` rows is blocked and returns `409 CONFLICT`.

### B. Automated API & RBAC Tests (`app/api/products/route.test.ts`)
1. **Authentication & Authorization:**
   - Unauthenticated `GET /api/products` or `POST /api/products` returns `401 UNAUTHENTICATED`.
   - Cashier or Canteen Attendant role attempting `POST /api/products` or `PATCH /api/products/:id` returns `403 FORBIDDEN`.
   - `GET /api/products` for Cashier role returns products with `buying_price` stripped / hidden.
   - `GET /api/products` for Admin role returns complete product records including `buying_price`.

### C. Adversarial UI & Manual Flow Verification
1. **Friction-Gated Dialog UX:**
   - Test deleting "Wheat Flour": verify button stays disabled for "wheat flour", "Wheat", or "Wheat Flour ", and enables ONLY on exact match "Wheat Flour".
2. **Form Interaction & Edge Cases:**
   - Test switching Kind from `Ingredient` (with price 500) $\rightarrow$ `Dish` $\rightarrow$ verify Buying Price input clears/disables $\rightarrow$ switch to `Goods` $\rightarrow$ verify input re-enables.
   - Test decimal prices: `12.50 KES`, `0.75 KES`.
   - Test search with special characters and case-insensitivity.
3. **Multi-Location Visibility:**
   - Product enabled only at Restaurant: verify it does not show under Canteen filter.

---

## 3. Acceptance Criteria & Sign-Off
- [ ] All Vitest test suites pass with 100% success rate:
  ```bash
  pnpm test
  ```
- [ ] TypeScript compilation and build pass without warnings:
  ```bash
  pnpm build
  ```
- [ ] All security and RBAC guards verified (buying price never leaks to non-Admin).
- [ ] No regression on existing foundation tests (`lib/auth`, `lib/time`).
- [ ] Milestone 1 Progress Checklist in `docs/milestones/milestone-01-the-business-exists.md` updated for Slice 1.

---

## 4. Session Notes
*(To be updated with test results during QA execution)*
