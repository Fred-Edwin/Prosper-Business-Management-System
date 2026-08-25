# Milestone 1: The Business Exists in the System

**Document Status:** Approved Milestone Plan — sections 1–3 (goal, key
decisions, screen inventory) describe original intent and are
superseded where noted in §0 below. Sections 4–6 (technical tasks,
slice breakdown, progress checklist) are the **original plan**, not yet
updated to match actual sprint execution — treat their sprint numbers
and checkboxes as historical, not current status. See §0 for what's
actually true today.
**Milestone Goal:** Establish the master product catalog, location pricing, asset register, and the complete append-only stock movement ledger across Restaurant, Canteen, and Store.

---

## 0. Current Status (updated after the Sprint 05 design pass)

### What's done

- **All Milestone 1 screens are designed and approved** — 21 screens
  built in Paper (19 from the original screen inventory below, plus 2
  screens the original plan didn't anticipate — see "Scope changes"
  below). Component Kit (16 shared components + 5 shells) is complete,
  token-clean, and coverage-audited against every screen.
- **Design tokens are finalized** — OKLCH color system, full spacing/
  type/radius scale, plus a `--nav-*` token set added during Sprint 05
  to eliminate raw hex values from the shell chrome.
- **Design export is done (Sprint 06)** — the approved kit is real code:
  `components/kit/` (28 files, 16 areas), `components/shells/` (4 files,
  covering all 5 shell states), all 21 screens exported to
  `docs/design/screens/<slug>/{page.tsx,mock-data.ts}` with real data
  pulled from Paper and marked `TODO(mock)`, and a browsable
  `/design-preview` route listing all 21. Real app routes
  (`app/admin`, `app/{cashier,store-manager,canteen}`) are rewired to the
  new shell components and compile/boot clean. See
  `docs/sprints/sprint-06-design-export.md` for the full session record.
- **Not yet started:** any real domain logic, API routes, or database
  wiring for Catalog, Stock Movements, or Assets. Everything in §4's
  Backend & Domain Tasks checklist is still open.

### Decisions that superseded the original plan (§§1–3 below)

These were made during the Sprint 05 design pass and change what's
actually being built vs. what §§1–3 originally described. Full
reasoning lives in `docs/sprints/sprint-05-screen-reassembly-handover.md`
§5.

1. **No `/admin/stock/reconciliation` screen** (contradicts §3A's row
   for it). Folded into a **Reconciliation section on `/admin/financials`**
   instead, using the Stock Purchases table's Delivery Status column as
   its data source. `/admin/financials` itself is also new — not named
   in the original §3A inventory at all, but confirmed in-scope for
   Milestone 1.
2. **No `/store-manager/receipts` or `/canteen/receipts` screens**
   (contradicts §3B/§3C rows for them). Both purchase deliveries and
   stock transfers are now **persistent banners** on each hub screen
   instead — pinned until Accepted/Matched or Flagged, then logged to
   the hub's activity timeline. Confirmed as "both are banners," not
   transfers-only.
3. **Two new screens added that §3 doesn't list:** `/store-manager/stock`
   and `/canteen/stock` — read-only current-stock-level views for each
   location. These were designed fresh in Sprint 05, not present in the
   original screen inventory.
4. **Canteen gets its own transfer dispatch screen** (`/canteen/transfers/new`
   in §3C was already planned, but its scope was confirmed broader than
   originally implied — Canteen is not purely a transfer-destination
   role, it dispatches too, mirroring Store Manager's flow).
5. **Ledger Maximize button** = the general Icon Rail sidebar-collapse
   shell state, not a separate bespoke "maximized" UI — a build detail,
   not a scope change, but worth knowing before implementing `/admin/stock`.

### Where to look

| Question | See |
|---|---|
| What was actually built, screen by screen, with real data | `docs/sprints/sprint-05-screen-reassembly-handover.md` |
| Binding design rules, current token set, component kit inventory | `docs/design/design-principles.md` |
| What the next session (component/screen code export) will do | `docs/sprints/sprint-06-design-export.md` |
| Process lessons from the design sprint (mistakes, fixes, what to repeat) | `docs/sprints/sprint-05-lessons-learned.md` |
| Paper-tool-specific extraction gotchas | `docs/design/paper-workflow-lessons.md` |

### What's left

Per the corrected scope above: real domain logic and API routes for
Catalog, Stock Movements, and Assets (all of §4's Backend & Domain
Tasks, none started); the component/screen code export (Sprint 06);
then wiring real data into the exported skeletons, replacing every
`TODO(mock)` marker. §5/§6 below describe a slice/sprint breakdown that
no longer matches how design work actually proceeded (it took 4 sprints
of design/QA iteration, not the single "Sprint 05" the table implies) —
treat that structure as directional intent for the *development* work
still ahead, not a literal schedule.

---

## 1. Milestone Overview & Objectives

Milestone 1 transitions Prosper from a technical foundation into an operational inventory and asset management system. Once this milestone is complete:
1. **Catalog is Live:** Admin defines Ingredients, Dishes, and Goods with location-specific pricing in a unified product drawer.
2. **Stock Movements Ledger is Active:** Store Manager and Canteen Attendant receive purchases (linked to Admin payments), issue ingredients to kitchen, record dish production, transfer stock (dispatch & acknowledge), and log non-sale consumption.
3. **Day 1 Onboarding & Daily Carry-Forward Work:** Admin inputs initial stock quantities as `opening` ledger rows; daily reconciliation sheet displays complete 13-column stock history.
4. **Asset Register is Functional:** Permanent tracking of equipment and furniture across all three locations.

---

## 2. Key Architectural & UX Decisions for Milestone 1

1. **Unified Product Create/Edit Drawer:**
   - Location enablement toggles (Restaurant, Canteen, Store) and location-specific selling prices live directly inside the product drawer. No separate disconnected pricing modal.
2. **Dish Buying Price Invariant:**
   - Products with `kind = dish` have `buying_price = 0` permanently enforced at DB and domain level to prevent double-counting food cost against ingredients.
3. **2-Way Purchase-to-Receipt Matching:**
   - Admin logs purchase payment.
   - Staff receipt screen displays a **"Pending Deliveries"** card allowing 1-tap receipt linking to `purchase_payment_id`.
   - Admin dashboard highlights unlinked payments and unlinked receipts.
4. **2-Phase Stock Transfers (Dispatch $\rightarrow$ Acknowledge):**
   - Sender logs transfer dispatch (deducts source stock).
   - Receiver sees an **"Incoming Transfer"** banner on their hub and taps **Accept** (adds destination stock) or flags a discrepancy.
5. **Store Manager Operations Hub + Dedicated Full Screens:**
   - Store Manager lands on a **Daily Operations Hub** with a live activity timeline.
   - Tapping **`[ Issue to Kitchen ]`**, **`[ Record Production ]`**, **`[ Transfer Stock ]`**, or **`[ Receive Goods ]`** opens a dedicated full-screen multi-item flow (not a cramped bottom-sheet).
6. **Friction-Gated Deletions:**
   - Hard-deleting a product or asset requires typing the exact name and is blocked with `409 CONFLICT` if linked historical movements exist.

---

## 3. Screen Inventory & UI Specifications

### A. Admin Console (`/admin`)
*Desktop-first layout with sidebar, toolbar, and maximize/restore table rails.*

| Screen / Route | Purpose & Key Features |
|---|---|
| **`/admin/catalog`** | Product catalog table. Filter by Kind (`Ingredient`, `Dish`, `Goods`), Location, Active/Archived. Quick search. Unit labels and location price badges. |
| **Product Create/Edit Drawer** | Unified drawer: Name, Kind, Unit (`kg`, `pcs`, `crate`), Buying Price (disabled for Dishes), Location Availability Toggles, and Location Selling Price inputs. |
| **`/admin/stock`** | 13-column reconciliation ledger table (`Opening → Purchases → Issues → Production → Transfers → Sales → Closing`). Date picker, location tabs, sticky header/columns, inline `CORRECTED` badges. |
| **`/admin/stock/opening`** | Bulk grid to set Day 1 initial opening stock and adjust daily carry-forward baselines. |
| **Purchase Payment Modal** | Modal to record supplier purchase: Supplier, product, qty, cost, destination location, and payment source (`Cash at Hand` vs `M-Pesa/Bank`). |
| **`/admin/stock/reconciliation`** | Outstanding inspector: Payments awaiting physical receipt vs. receipts logged without prior payment. |
| **`/admin/assets`** | Asset table: Equipment/furniture register with location, purchase date, cost, condition chip (`Good`, `Needs Repair`, `Decommissioned`), add/edit drawer, and friction delete dialog. |

---

### B. Store Manager Mobile Shell (`/store-manager`)
*Mobile-first single-column shell with live timeline and full-screen task flows.*

| Screen / Route | Purpose & Key Features |
|---|---|
| **`/store-manager` (Hub)** | **Daily Operations Hub:** Quick action cards at top (`Issue`, `Produce`, `Transfer`, `Receive`), incoming transfer alerts, and live daily activity timeline. |
| **`/store-manager/issues/new`** | **Kitchen Issues (Full Screen):** Multi-item ingredient selector, quantity inputs, cooking session notes. |
| **`/store-manager/production/new`** | **Dish Production (Full Screen):** Cooked dish selector, batch quantity produced, destination location (Restaurant). |
| **`/store-manager/receipts`** | **Purchase Receipts:** Top card for "Pending Deliveries from Admin Payments" (1-tap receive) + button for Direct/Unlinked receipts. |
| **`/store-manager/transfers/new`** | **Stock Transfer Dispatch:** Select destination location, product, and quantity dispatched. |
| **`/store-manager/consumption/new`** | **Non-Sale Consumption:** Log spoiled, damaged, or staff meal items with mandatory reason dropdown and notes. |
| **`/store-manager/stock`** | **Store Stock Levels:** Read-only view of current on-hand derived quantities at Store. |

---

### C. Canteen Attendant Mobile Shell (`/canteen`)
*Mobile-first single-column shell.*

| Screen / Route | Purpose & Key Features |
|---|---|
| **`/canteen` (Hub)** | **Canteen Operations Hub:** Incoming stock transfer banner (`[ Accept ]`), quick actions, and daily activity timeline. |
| **`/canteen/receipts`** | **Direct Canteen Receipts:** Receive goods delivered straight to Canteen with 1-tap pending delivery matching. |
| **`/canteen/transfers/new`** | **Canteen Stock Transfers:** Dispatch stock (e.g. Canteen $\rightarrow$ Restaurant). |
| **`/canteen/consumption/new`** | **Canteen Spoilage/Breakage:** Log damaged or expired retail goods. |
| **`/canteen/stock`** | **Canteen Stock Levels:** Read-only view of current derived stock at Canteen. |

---

## 4. Technical Architecture: Frontend & Backend Tasks

### Frontend Tasks
- [ ] **Routing:** Scaffold sub-routes for `/admin/catalog`, `/admin/stock`, `/admin/assets`, `/store-manager/*`, and `/canteen/*`.
- [ ] **Component Integration:**
  - Build unified `ProductDrawer` embedding `MoneyInput`, `Checkbox`, `Select`, and location pricing fields.
  - Wire `LedgerTable` with horizontal scroll, sticky columns, and summary footer in `/admin/stock`.
  - Implement full-screen mobile task layouts for `/store-manager/issues/new` and `/store-manager/production/new`.
  - Build `ConfirmationDialog` friction modal requiring exact entity name matching for deletions.
  - Build "Correct This" modal requesting `corrected_quantity` and `reason`.
- [ ] **State & API Wiring:** Standardize client-side fetch calls with Zod validation, toast feedback, and auto-retry on dropped mobile submissions.

### Backend & Domain Tasks
- [ ] **Domain Module: Catalog (`lib/domain/catalog/index.ts`)**
  - `createProduct()`: Atomic creation of `Product` + `ProductLocation` rows. Force `buying_price = 0` for Dishes.
  - `updateProduct()`: Update metadata and location prices.
  - `softDeleteProduct()` / `hardDeleteProduct()`: Referential guard checking if `StockMovement` or `OrderLine` exists (returns `409 CONFLICT`).
- [ ] **Domain Module: Stock Movements (`lib/domain/stock/index.ts`)**
  - `recordPurchasePayment()`: Atomic write to `PurchasePayment` and `MoneyMovement` (deducts cash/M-Pesa balance).
  - `recordPurchaseReceipt()`: Writes `PurchaseReceipt` and `StockMovement` (`purchase_receipt`), optionally linking `purchase_payment_id`.
  - `recordKitchenIssue()`: Writes `StockMovement` (`issue`, negative from Store).
  - `recordProduction()`: Writes `StockMovement` (`production`, positive to Restaurant).
  - `recordTransfer()`: Two-phase transfer logic (dispatched $\rightarrow$ acknowledged).
  - `recordNonSaleConsumption()`: Writes `StockMovement` (`non_sale_consumption`) with required `reason`.
  - `setOpeningStock()`: Writes `StockMovement` (`opening`) for Day 1 setup or daily adjustment.
  - `correctMovement()`: Validates day-close status, computes delta (`correct - original`), and inserts linked correction row.
  - `getDerivedStockBalance()`: Dynamic query summing all movements for product/location/date.
- [ ] **Domain Module: Assets (`lib/domain/assets/index.ts`)**
  - CRUD operations, location movements, condition tracking, and deletion friction guards.
- [ ] **API Route Handlers (`app/api/*`)**
  - `/api/products`, `/api/products/:id`, `/api/products/:id/locations`, `/api/products/:id/soft-delete`, `/api/products/:id/hard-delete`
  - `/api/locations`
  - `/api/stock-movements`, `/api/stock-movements/:id/correct`, `/api/stock-movements/outstanding`, `/api/stock-movements/transfers/accept`
  - `/api/assets`, `/api/assets/:id`, `/api/assets/:id/soft-delete`, `/api/assets/:id/hard-delete`

---

## 5. Actual Sprint History & Remaining Work

**Superseded — this section replaces the original slice/sprint table.**
The original plan assumed one design sprint per slice (02, 05, 08). In
practice, Slice 2 and Slice 3's design work were combined into one
sprint number (05), and that sprint itself took multiple sessions
(initial design brief, then a full consistency rebuild) rather than
finishing in a single pass. The table below reflects what actually
happened and the real numbering for what's left — update it as sprints
land, the same way `docs/PROGRESS.md` gets updated at the end of every
session.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    MILESTONE 1 — ACTUAL PROGRESS                         │
├────────────────────────────────────┬─────────────────────────────────────┤
│ SLICE 1: Catalog & Locations        │ Sprint 01: Foundation          ✅  │
│ (Products, Prices, Delete Guards)   │ Sprint 02: Catalog Design       ✅  │
│                                     │ Sprint 03: Catalog Development  ✅  │
│                                     │ Sprint 04: Catalog QA           ✅  │
├────────────────────────────────────┼─────────────────────────────────────┤
│ SLICE 2 + 3: Stock, Store/Canteen   │ Sprint 05: Stock & Assets       ✅  │
│ Ops, and Assets — Design            │   Design + Screen Reassembly        │
│ (combined into one sprint, not      │   (see §0 for scope changes:        │
│ split 05/08 as originally planned)  │   Reconciliation→Financials,        │
│                                     │   receipts→hub banners, +2 new     │
│                                     │   Stock Levels screens)             │
├────────────────────────────────────┼─────────────────────────────────────┤
│ Design → Code scaffolding           │ Sprint 06: Design Export        ✅  │
│ (components/kit, screen skeletons,  │   done — see                        │
│ /design-preview route)              │   sprint-06-design-export.md        │
├────────────────────────────────────┼─────────────────────────────────────┤
│ SLICE 1 backend (Catalog domain)    │ Already covered by Sprints 03–04    │
│                                     │ above — Slice 1 is fully done.      │
├────────────────────────────────────┼─────────────────────────────────────┤
│ SLICE 2: Stock Engine & Ops Dev     │ Sprint 07: Stock Domain & APIs  ⏳  │
│ (ledger, transfers, 2-way match)    │ Sprint 08: Stock QA & Ledger        │
│                                     │   Integrity                    ⏳  │
├────────────────────────────────────┼─────────────────────────────────────┤
│ SLICE 3: Assets Dev                 │ Sprint 09: Assets Domain & APIs ⏳  │
│                                     │ Sprint 10: Assets QA +              │
│                                     │   Milestone 1 E2E Verification ⏳  │
└────────────────────────────────────┴─────────────────────────────────────┘
```

Sprint 06 must land before Sprint 07 can start — Sprint 07 wires real
domain logic into the screen skeletons Sprint 06 produces, per the
design-sprint/development-sprint boundary in `CLAUDE.md`'s SDLC (no
domain logic gets written directly against Paper designs; it gets
written against the exported component/screen scaffolding).

---

## 6. Progress Tracking Checklist

### Slice 1: Catalog & Locations — ✅ Done (Sprints 01–04)
- [x] Design `/admin/catalog` and unified `ProductDrawer` with location pricing (Sprint 02).
- [x] Scaffold Next.js routes, wire with mock data (Sprint 02).
- [x] Build friction-gated delete dialog (Sprint 02, later reconciled to the canonical kit version in Sprint 05).
- [x] Implement `lib/domain/catalog` business rules & Zod schemas (Sprint 03).
- [x] Build `/api/products` endpoints and referential delete guards (Sprint 03).
- [x] Replace `TODO(mock)` with real API queries and mutations (Sprint 03).
- [x] Vitest test suite for catalog domain and API routes (Sprint 04).
- [x] Verify Dish zero-buying-price rule and location pricing persistence (Sprint 04).

### Slice 2 + 3 Design: Stock, Store/Canteen Ops, Assets — ✅ Done (Sprint 05)
- [x] Design `/admin/stock` 13-column ledger sheet & bulk opening stock grid.
- [x] Design Store Manager Operations Hub & full-screen flows (Issue, Production, Transfer, Non-Sale Consumption).
- [x] Design Canteen Operations Hub, transfer dispatch, and both hubs' persistent transfer/delivery banners (superseding the originally-planned `/receipts` screens — see §0).
- [x] Design `/admin/assets` table, asset drawer, condition tracking, friction delete.
- [x] Design `/admin/financials` with Reconciliation section (superseding the originally-planned `/admin/stock/reconciliation` — see §0).
- [x] Design `/store-manager/stock` and `/canteen/stock` (new screens, not in original plan — see §0).
- [x] Full Component Kit built, coverage-audited, and token-hygiene-fixed across all 21 screens.

### Design Export — ✅ Done (Sprint 06)
- [x] Convert the 16 kit components + 5 shells into `components/kit/` and `components/shells/`.
- [x] Export all 21 screens as skeletons (`docs/design/screens/<screen>/page.tsx` + `mock-data.ts`).
- [x] Build `/design-preview` route for live fidelity checking.
- [ ] Resolve the Ledger Maximize/Icon-Rail collapse-persistence sub-question with the Admin (see §0, item 5) — still open, not this sprint's job.
- Full task spec: `docs/sprints/sprint-06-design-export.md`.

### Slice 2: Stock Movements Ledger — ⏳ Not started (Sprints 07–08)
- [ ] Implement `lib/domain/stock` movement ledger & delta calculation engine.
- [ ] Build 2-way purchase-receipt matching and transfer dispatch/acknowledge flows.
- [ ] Wire real API routes into the Sprint 06 screen skeletons, replacing `TODO(mock)`.
- [ ] Test mathematical accuracy of derived balances and correction deltas.
- [ ] Test purchase-receipt outstanding reconciliation (now surfaced on `/admin/financials`, not a standalone route).

### Slice 3: Assets Register — ⏳ Not started (Sprints 09–10)
- [ ] Implement `lib/domain/assets` and API routes.
- [ ] Wire real data into the Sprint 06 asset screen skeletons.
- [ ] Run end-to-end Milestone 1 verification across Catalog, Stock, and Assets together.
