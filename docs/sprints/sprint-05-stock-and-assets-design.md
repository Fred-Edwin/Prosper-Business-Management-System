# Sprint 05 — Stock Movements Ledger & Assets Register (Design Sprint)

**Milestone:** 1 — The business exists in the system  
**Type:** Design Sprint (Phase 3 Feature Loop)  
**Paper.design Target File:** https://app.paper.design/file/01M0EZ7TAHZM26KBMWNYT0928X/1-0  
**Target Codebase Routes:** `app/admin/stock/`, `app/admin/assets/`, `app/store-manager/`, `app/canteen/`  
**Status:** ready-to-start  

---

## 1. Required Context & Reading
*Before designing, the agent MUST review these exact documents to align on domain rules and visual standards:*
- [`docs/design/design-principles.md`](../design/design-principles.md) — House design tokens, approved component families, and shell patterns.
- [`docs/design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md`](../design/ENTERPRISE_UI_DESIGN_PRINCIPLES.md) — Density, 1px hairline dividers, tabular numbers, sticky columns, and anti-patterns.
- [`docs/PRD.md` §4.2–§4.4](../PRD.md) — Stock movement lifecycle, 2-way purchase-to-receipt matching, 2-phase stock transfers, and asset tracking rules.
- [`docs/milestones/milestone-01-the-business-exists.md`](../milestones/milestone-01-the-business-exists.md) — Milestone 1 operational objectives and decisions.

---

## 2. Two-Phase Execution Workflow

Every Design Sprint in this project follows a strict two-phase workflow:

### Phase A: Visual Design in Paper.design Canvas
Design first-class artboards for both Desktop and Mobile. **Note on Mobile UX:** Mobile is not a cramped responsive squash of desktop tables; it is a **purpose-built mobile UX** tailored to phone ergonomics and task workflows:

1. **Admin Desktop Stock Ledger (`/admin/stock` — Desktop):**
   - 13-column reconciliation ledger grid (`Opening → Purchases → Issues → Production → Transfer In → Transfer Out → Sold → Sold Value → Closing → Closing Value`).
   - Location switch tabs, date picker, maximize/restore rail, and inline `CORRECTED` delta badge.
2. **Admin Mobile Stock Center (`Admin Stock — Mobile` — Purpose-Built Mobile UX):**
   - Distinct mobile design: Daily stock-on-hand summary cards, movement breakdown drawers, discrepancy quick-flagging, and location selector (designed specifically for handheld speed, not a squished 13-column table).
3. **Movement Correction Modal (Desktop & Mobile):**
   - Pop-up modal requesting `Corrected Quantity`, showing computed delta (`correct - original`), and mandatory reason input.
4. **Purchase Payment Modal (Desktop & Mobile):**
   - Form for recording supplier payments: Supplier, Product, Qty, Total Cost, Destination location, and Payment source (*Cash at Hand* vs. *M-Pesa/Bank*).
5. **Day 1 Bulk Opening Stock Grid (`/admin/stock/opening` — Desktop & Mobile):**
   - Desktop bulk spreadsheet entry grid + Mobile guided sequential setup flow.
6. **Admin Assets Register (`/admin/assets` — Desktop & Mobile):**
   - Desktop: Equipment and asset register table with condition chips (*Good*, *Needs Repair*, *Decommissioned*).
   - Mobile: Purpose-built asset inspection cards with quick status updates and filter pills.
   - Asset Create/Edit slide-over drawer and friction-gated delete dialog.
7. **Store Manager Operations Hub (`/store-manager`):**
   - Mobile-first dashboard with 4 primary action cards (`[ Issue ]`, `[ Produce ]`, `[ Transfer ]`, `[ Receive ]`), incoming transfer alert banners, and daily activity timeline.
8. **Store Manager Dedicated Full-Screen Task Flows:**
   - **`/store-manager/issues/new`**: Kitchen ingredient issue selector with multi-item rows and recipe session notes.
   - **`/store-manager/production/new`**: Cooked dish production logger with batch quantity and destination selector.
   - **`/store-manager/receipts`**: "Pending Deliveries from Admin Payments" card (1-tap matching) + direct unlinked receipt logger.
   - **`/store-manager/transfers/new`**: Stock transfer dispatch form.
   - **`/store-manager/consumption/new`**: Spoilage/damage/staff meal logger with mandatory reason dropdown.
9. **Canteen Operations Hub (`/canteen`):**
   - Mobile hub featuring 1-tap Incoming Transfer Acknowledge banner (`[ Accept ]` / `[ Flag Discrepancy ]`) and daily timeline.

### Phase B: Component Export & Codebase Assembly (Next.js)
Export and assemble the approved visual designs into Next.js App Router routes with in-memory interactive state:
1. **Types & Models:** Create `types.ts` for stock movements, ledger lines, purchase payments, receipts, and assets.
2. **Mock Datasets:** Seed realistic mock data flagged with `TODO(mock)`.
3. **UI Components:** Build feature components under `app/admin/stock/`, `app/admin/assets/`, `app/store-manager/`, and `app/canteen/`.
4. **Route Assembly:** Assemble interactive pages supporting view states (populated, filtered, empty, loading).
5. **Verification:** Run `pnpm tsc --noEmit` and interactive browser validation.

---

## 3. Screen Specifications & Design Details

### Screen Group 1: Admin Stock Ledger & Reconciliation (`/admin/stock`)
* **Context & Purpose:** The Admin's primary operational command center. Verifies the daily mathematical balance of every product across all locations.
* **Layout & Behavior:**
  * **Toolbar:** Title "Stock & Reconciliation", Location switch tabs, Date picker, Maximize/Restore button.
  * **13-Column Ledger Table:**
    * Sticky first 3 columns: `Date`, `Location`, `Product`.
    * Movement columns: `Opening`, `Purchases (+)` in green, `Issues (-)` in red, `Production (+)` in green, `Transfer In (+)` in green, `Transfer Out (-)` in red, `Sold (-)`, `Closing`.
    * Sticky footer summary row showing totals.
    * Inline `CORRECTED` badges linking to the audit trail diff.
  * **Movement Correction Modal:**
    * Triggered by clicking any editable cell.
    * Prompts for new quantity, calculates delta automatically, and requires reason text.

### Screen Group 2: Admin Purchase Payments & Day 1 Opening Stock
* **Purchase Payment Modal:**
  * Supplier name, product selection, quantity, total amount, destination location (Store/Canteen/Restaurant), and payment account toggle (*Cash at Hand* / *M-Pesa/Bank*).
* **`/admin/stock/opening`:**
  * Bulk tabular grid enabling quick baseline initialization for all products on Day 1.

### Screen Group 3: Admin Assets Register (`/admin/assets`)
* **Context & Purpose:** Register and track non-consumable physical assets (cookers, fridges, POS tablets, furniture).
* **Asset Table:** Columns for Asset Name, Tag/Serial #, Category, Location, Purchase Date, Purchase Cost, Condition Tag (`Good` in green, `Needs Repair` in amber, `Decommissioned` in red), and Action Menu.
* **Asset Drawer:** Create/Edit slide-over drawer with name, category, location, cost, condition dropdown, and serial/notes.
* **Asset Delete Dialog:** Friction-gated dialog requiring typing the asset name to confirm deletion.

### Screen Group 4: Store Manager Mobile Operations (`/store-manager`)
* **Universal Mobile Shell:** Hamburger navigation (☰), location switcher, active user avatar.
* **Operations Hub (`/store-manager`):**
  * Top banner for **"Incoming Transfer Dispatched from Canteen"** with 1-tap `[ Accept ]` or `[ Flag Discrepancy ]`.
  * 4 large tap cards: **Issue to Kitchen**, **Record Production**, **Receive Goods**, **Transfer Stock**.
  * Daily live activity feed list with timestamps.
* **Full-Screen Task Flows:**
  * `/store-manager/issues/new`: Multi-item ingredient selector, quantity fields, and session notes.
  * `/store-manager/production/new`: Cooked dish batch recorder.
  * `/store-manager/receipts`: "Pending Deliveries from Admin Payments" card (1-tap matching) + button for Direct/Unlinked receipts.
  * `/store-manager/transfers/new`: Destination location, product, and quantity dispatched.
  * `/store-manager/consumption/new`: Non-sale consumption (spoilage/damage/staff meals) with mandatory reason.

### Screen Group 5: Canteen Operations Hub (`/canteen`)
* **Canteen Hub:**
  * Prominent **Incoming Transfer Banner** (`[ Accept ]` / `[ Flag ]`).
  * Direct receipt & transfer action buttons.
  * Live timeline of movements.

---

## 4. UI/UX Design Principles & Non-Negotiables
- **Light Mode Only:** Strict light mode using house tokens (`--surface-page`, `--color-accent: #3D1E70`, etc.).
- **Dense Ledger Conventions:** 0px square corners, 1px hairline borders, tabular numerals (`font-variant-numeric: tabular-nums`), signed color-coded deltas (green `+`, red `-`).
- **No Disconnected Workflows:** 2-way purchase matching allows receiving in 1 tap without manual retyping.
- **Friction-Gated Destructive Actions:** Hard deletions of assets require exact string match confirmation.
- **Mock Wiring Convention:** When exported to Next.js, all mock data sources must be flagged with `TODO(mock)`.

---

## 5. Acceptance Criteria

### Phase A: Paper.design Canvas Deliverables
- [ ] Admin Desktop Stock Ledger artboard (`/admin/stock`) created in Paper.design with 13 columns, sticky header/columns, and maximize state.
- [ ] Admin Mobile Stock Ledger artboard (`Admin Stock — Mobile`) created with responsive stock cards.
- [ ] Movement Correction Modal artboard designed (desktop & mobile).
- [ ] Purchase Payment Modal artboard designed (desktop & mobile).
- [ ] Bulk Opening Stock Grid artboard (`/admin/stock/opening` — desktop & mobile) designed.
- [ ] Admin Assets Register (`/admin/assets` — Desktop & Mobile), Asset Drawer, and Delete Dialog artboards designed.
- [ ] Store Manager Mobile Operations Hub (`/store-manager`) and 5 full-screen task flow artboards designed.
- [ ] Canteen Mobile Operations Hub (`/canteen`) artboard designed with incoming transfer banner.

### Phase B: Next.js Codebase Deliverables
- [ ] `types.ts` created for stock movements, ledger entries, purchase payments, receipts, and assets.
- [ ] `mock-data.ts` created with realistic seed data, marked with `TODO(mock)`.
- [ ] `/admin/stock` page assembled with interactive ledger, location tabs, date picker, correction modal, and mobile card view.
- [ ] `/admin/stock/opening` bulk grid assembled (responsive).
- [ ] `/admin/assets` page assembled with asset table, drawer, friction delete dialog, and mobile card view.
- [ ] `/store-manager` hub and task flow routes (`/issues/new`, `/production/new`, `/receipts`, `/transfers/new`, `/consumption/new`) assembled.
- [ ] `/canteen` hub route assembled with transfer acceptance banner.

### Phase C: Verification & Quality
- [ ] Interactive state transitions verified in browser across desktop and mobile.
- [ ] Zero TypeScript compilation errors (`pnpm tsc --noEmit` passes).

---

## 6. Session Notes
*(Live notes and handover details added during implementation)*
