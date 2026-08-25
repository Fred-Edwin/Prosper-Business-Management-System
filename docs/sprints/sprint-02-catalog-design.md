# Sprint 02 — Catalog & Locations (Design Sprint)

**Milestone:** 1 — The business exists in the system  
**Type:** Design Sprint (Phase 3 Feature Loop)  
**Paper.design Target File:** https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/1-0  
**Target Codebase Route:** `app/admin/catalog/`  
**Status:** completed

---

## 1. Required Context & Reading
*Before designing, the agent MUST review these exact documents to align on domain rules and visual standards:*
- [`docs/design/design-principles.md`](../design/design-principles.md) — House design tokens, approved component families, and shell patterns.
- [`docs/design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md`](../design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md) — Density, 1px hairline dividers, zebra striping guidance, typography hierarchy, and anti-patterns.
- [`docs/PRD.md` §4.1](../PRD.md) — Product kinds (`Ingredient`, `Dish`, `Goods`), unit labels, and zero-buying-price rule for Dishes.
- [`docs/milestones/milestone-01-the-business-exists.md`](../milestones/milestone-01-the-business-exists.md) — Milestone 1 operational objectives and decisions.

---

## 2. Two-Phase Execution Workflow

Every Design Sprint in this project follows a strict two-phase workflow:

### Phase A: Visual Design in Paper.design Canvas
Design all required artboards directly on the canonical Paper.design canvas before touching the application code:
1. **Screen 1 Artboard (`/admin/catalog`):** Full table view inside `AdminShell` (toolbar, count chip, `+ Add Product` button, filter bar, 0px table corners, hairline dividers, all 4 visual states).
2. **Screen 2 Artboard (`ProductDrawer`):** Unified slide-over drawer with 3 sections (General Info, Buying Price with Dish invariant rule, Location Pricing) and sticky footer.
3. **Screen 3 Artboard (`ProductDeleteDialog`):** Destructive confirmation dialog with warning banner, string-match retype friction, and soft-archive alternative.
4. **Design Token Audit:** Verify all artboards against `--color-accent: #3D1E70`, 14px base typography, hairline borders, and Lucide icons.

### Phase B: Component Export & Codebase Assembly (Next.js)
Export and assemble the approved visual designs directly into the Next.js App Router codebase:
1. **Types & Models:** Create `app/admin/catalog/types.ts` defining domain interfaces (`Product`, `ProductKind`, `LocationPricing`, filters).
2. **Mock Data:** Create `app/admin/catalog/mock-data.ts` seeded with realistic sample data across all locations, explicitly tagged with `TODO(mock)`.
3. **UI Components:** Import shared primitives from `components/ui/*` and build feature components:
   - `app/admin/catalog/catalog-filter-bar.tsx`
   - `app/admin/catalog/catalog-table.tsx`
   - `app/admin/catalog/product-drawer.tsx`
   - `app/admin/catalog/product-delete-dialog.tsx`
4. **Route Assembly:** Assemble `app/admin/catalog/page.tsx` within `AdminShell`, supporting interactive switching across all 4 view states (Populated, Filtered, Empty, Loading).
5. **Interactive Verification:** Run the local dev server and verify responsiveness, state toggles, and form interactions end-to-end.

---

## 3. Screen Specifications & Design Details

### Screen 1: Admin Catalog Table View (`/admin/catalog`)
- **Context & Purpose:** The central inventory view where the Admin oversees all products across the three locations (Restaurant, Canteen, Store).
- **Layout & Structure:**
  - Placed inside the approved `AdminShell` with breadcrumbs and toolbar.
  - **Toolbar:** Title "Product Catalog", total active product count chip, and primary `[ + Add Product ]` button.
  - **Filter Bar:**
    - Segmented Category Tabs: `All`, `Ingredients`, `Dishes`, `Goods` (Underline pattern).
    - Dropdowns: Location filter (`All Locations`, `Restaurant`, `Canteen`, `Store`), Status (`Active`, `Archived`).
    - Quick search input with clear icon.
  - **Catalog Table:**
    - Columns: Name, Category Text (`Ingredient`, `Dish`, `Goods`), Unit Label (`kg`, `pcs`, `crate`), Buying Price (or `—` for Dishes), 3 Location Columns (`Restaurant`, `Canteen`, `Store`), and Action Menu (`Edit`, `Archive`, `Delete`).
    - Square table corners (0px), 1px hairline row dividers, sticky table header on scroll.
- **States to Design & Implement:**
  1. Default populated state (sample items across all 3 kinds).
  2. Filtered state (e.g. Dishes only).
  3. Empty search result state (`EmptyState` component).
  4. Skeleton loading state (`LoadingState` component).

### Screen 2: Unified Product Create / Edit Drawer (`ProductDrawer`)
- **Context & Purpose:** Single consolidated drawer to create or edit a product and set its location-specific pricing in one unified flow.
- **Layout & Sections:**
  - **Header:** "New Product" or "Edit Product: [Name]".
  - **Section 1 (General Information):**
    - Product Name input.
    - Product Kind segmented control (`Ingredient` | `Dish` | `Goods`).
    - Unit label text input (`kg`, `pcs`, `crate`, `packet`).
  - **Section 2 (Cost & Buying Price):**
    - Buying Price (`MoneyInput`).
    - *Invariant Behavior:* When `Dish` is selected, Buying Price is automatically disabled, showing `0.00 KES` with helper text: *"Dishes carry zero buying price; true food cost is derived from ingredients."*
  - **Section 3 (Location Availability & Selling Prices):**
    - Row for **Restaurant:** `[x] Active` $\rightarrow$ `Selling Price: [ 100 ] KES`
    - Row for **Canteen:** `[x] Active` $\rightarrow$ `Selling Price: [ 90 ] KES`
    - Row for **Store:** `[ ] Active (Storage only — optional selling price)`
  - **Footer:** Sticky bottom bar with `[ Cancel ]` and `[ Save Product ]`.

### Screen 3: Friction-Gated Deletion Dialog (`ProductDeleteDialog`)
- **Context & Purpose:** Guard against accidental or unauthorized hard deletions.
- **Layout & Behavior:**
  - Built on `ConfirmationDialog` with destructive red accents.
  - Warning banner explaining that hard-deleting permanently removes the product and is only permitted if no historical sales/movements exist.
  - Text prompt: *"To confirm, type the product name: [Product Name]"*.
  - Input field bound to validation: The `[ Permanently Delete ]` button remains disabled until the input matches the product name exactly.
  - Quick alternative option: *"Archive product instead"* (Soft delete).

---

## 4. UI/UX Design Principles & Non-Negotiables
- **Light Mode Only:** Strict light mode using curated tokens (`--bg-surface`, `--color-accent: #3D1E70`, etc.).
- **Visual Separation:** 1px hairline dividers and subtle space. No heavy card borders, no floating drop shadows on content containers.
- **No Disconnected Workflows:** Location pricing lives directly inside the product drawer, not in a separate secondary modal.
- **Typography & Form Controls:** Inter font, 14px base, 6px border radius on inputs/buttons, 0px on table corners.
- **Mock Wiring Convention:** When exported to Next.js, all mock data sources must be flagged with `TODO(mock)`.

---

## 5. Acceptance Criteria

### Phase A: Paper.design Canvas Deliverables
- [x] Screen 1 artboard created in Paper.design on the approved canvas (`https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/1-0`) with 3 location columns, underline tabs, white sidebar icons, and account sign-out.
- [x] Screen 2 artboard created for `ProductDrawer` with 3 sections and Dish invariant state.
- [x] Screen 3 artboard created for `ProductDeleteDialog` with friction validation state.
- [x] Mobile artboards created: `Admin Catalog — Mobile` and `Universal Mobile Shell — Drawer Open`.
- [x] Canonical component kit artboards (`Admin Shell — Desktop`, `Universal Mobile Shell`, `Component Kit — Navigation & Filtering`) updated to latest patterns.

### Phase B: Next.js Codebase Deliverables (`app/admin/catalog/`)
- [x] `app/admin/catalog/types.ts` defines complete TypeScript interfaces.
- [x] `app/admin/catalog/mock-data.ts` contains realistic seed data across all locations, marked with `TODO(mock)`.
- [x] `app/admin/catalog/catalog-table.tsx` displays all required columns with square (0px) corners, hairline dividers, and responsive mobile cards.
- [x] `app/admin/catalog/product-drawer.tsx` enforces Dish zero-buying-price invariant and location availability pricing.
- [x] `app/admin/catalog/product-delete-dialog.tsx` validates exact string match before enabling delete.
- [x] `app/admin/catalog/page.tsx` renders in `AdminShell` and supports all 4 visual states (Populated, Filtered, Empty, Loading).

### Phase C: Verification & Quality
- [x] Interactive state transitions (create, edit, filter, search, archive, delete) verified in browser/dev server.
- [x] Zero TypeScript compilation errors (`pnpm tsc --noEmit` passed cleanly).

---

## 6. Session Notes
- Designed desktop and mobile catalog screens in Paper.design with live client feedback.
- Enhanced sidebar navigation with logical grouping (Operations, People & Money, Team, Reporting), white icons, left-accent active indicator, and Sign Out account footer.
- Updated category tabs from segmented control to premium underline style.
- Separated Location Pricing into 3 explicit columns (Restaurant, Canteen, Store).
- Updated canonical upstream Paper artboards so future sprints start from the refined components.
- Assembled full interactive Next.js route under `app/admin/catalog/` with in-memory prototype CRUD state.

