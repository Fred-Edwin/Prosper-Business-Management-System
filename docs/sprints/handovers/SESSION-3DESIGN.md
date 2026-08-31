# HANDOVER — Session 3-DESIGN · Product Designer

**Paste this whole file as your first message in a fresh session.**
**docs/** + Paper only — no code. Runs concurrently with 3-DOMAIN / 3a / 3b.
**Blocks: 3-KIT, 3c, 3d.**

---

## 0. Context / urgency

Prosper is overdue; we're pushing Submission 1 = Milestone 1 + Milestone 2
("staff can sell every day"), **every screen matching Paper**. You are the
**Product Designer this session only** (`CLAUDE.md` "How sessions work").
No `.tsx`, no kit code, no Milestone 3 work.

**The problem you're solving:** the Store-Manager and Canteen **movement
flow** screens (Receive / Issue / Production / Transfer / Non-sale /
Canteen Transfer Dispatch) "look terrible" on localhost. Root cause found
by Design Sprint A2: the M1 Session-12 rebuild (ADR-44) stripped them from
the rich multi-row product picker in the Paper drawings down to one-line
`Select` + `QuantityStepper` forms, and marked the drawings superseded.
**The owner has reversed that (Option A, 2026-08-31): restore the
multi-row picker.**

## 1. Mandatory reading (in this order — CLAUDE.md hard requirement)

1. `docs/design/fidelity-audit-m1.md` — **the whole file.** The
   `✅ RESOLVED — Option A` section at the top is your spec. The
   per-screen `##` sections (SM — Receive, Issue, Production, Transfer,
   Non-sale; Canteen — Transfer dispatch; the two Stock Levels; SM Mobile
   Hub; flow-scaffold.tsx) are the ride-along detail deltas — every one
   still applies on top of the picker rebuild.
2. `docs/sprints/handovers/_ORCHESTRATOR-STATE.md` — "Build batch plan —
   REVISED after Design A2", especially the **orchestrator decisions**
   block (your escalations are already answered — see §2 below).
3. `docs/CONVENTIONS.md` §6 (working practices, lessons carried forward).
4. `docs/design/design-principles.md` — **§9 is an ENFORCED contract.**
5. `docs/design/export-workflow.md` — compose from the proven kit; Paper
   is the visual acceptance target, never transcribed.
6. `docs/design/kit-audit.md` + `docs/design/component-states.md` §2/§9 —
   what the kit already does. You compose from it.
7. `docs/DECISIONS.md` ADR-44 (the decision being partly reversed) and
   ADR-42 (the kit proving gate — relevant because §3 below adds a
   component).

## 2. Decisions already made by the orchestrator — do NOT re-litigate

| Question A2 raised | Answer (build to this) |
|---|---|
| Selectable product row: compose-in-screen or kit component? | **SMALL KIT COMPONENT.** 6 call sites + a shared interaction contract. You draw its **component artboard**; a separate 3-KIT session proves it (ADR-42) before any screen uses it. |
| qty > on-hand on SM/Canteen movements: block or flag? | **BLOCK** (parity with orders §3.8 — the stock ledger must never go negative). Draw the blocked row state per §9.8. |
| Multi-line submit: client loop or batch endpoint? | **BATCH ENDPOINT** per movement type (3-DOMAIN builds it). Not your concern except: the sticky submit **sums the whole batch** and fires once. |
| "Receiving chef" / "Production time & shift" fields (`8XH-0`) | **DROPPED for Submission 1** (staff module is M3). Omit from the re-spin so the artboard doesn't promise a field the build can't deliver. |
| ADR-44 reversal note in DECISIONS.md | Orchestrator/Tech-Lead task (FINAL session). Not yours — but you may reference it. |

## 3. Deliverables

### 3.1 `SelectableProductRow` — component artboard (do this FIRST)

The row used by all 6 flows. Put it on a component artboard near the other
`Component Kit — *` artboards, named e.g. `Component Kit — Selectable
Product Row [M2-3D]`. Compose from existing kit pieces (`QuantityStepper`,
`Button` size sm, the C2 tap-to-add tile/line pattern on the `M2 Sales
Patterns` artboard `DIN-0`, tokens). **States, one sub-frame each:**

- **not selected** — product name (left), `Avail: 46.5 kg`
  (`--text-caption --text-secondary`, fixed-width slot), `+ Select`
  button (right, `flexShrink:0`).
- **selected** — accent tint `--surface-selected` + `--color-accent` 1px
  border; name, `Avail: N`, inline `− 24.0 +` `QuantityStepper`
  (right, fixed-width slot).
- **at available** — stepper `+` disabled, `Avail: N` unchanged (not an
  error — just the ceiling).
- **over available (BLOCKED)** — §9.8 pattern: `--color-danger` row
  treatment, an inline helper `Only 46.5 kg on hand` under the stepper,
  and this row's presence disables the sticky submit (note that on the
  screen artboards, not the component).
- **zero available** — row disabled/muted, `+ Select` inert, caption
  `None on hand`.

Fixed-width slots for the `Avail:` readout and the trailing control so
columns line up across rows (Paper guide: don't rely on `gap` alone).

### 3.2 Re-spin the three flow artboards to current kit + tokens

`8XH-0` (Issue + Production panels), `92M-0` (Transfer + Non-sale panels),
`9FE-0` (Canteen Transfer Dispatch). These predate token reconciliation,
the `QuantityStepper` tap-to-type (C10), the retired
`--surface-panel-tint`, and the filter-toolbar era — they are **not a
clean target as-is**. One canonical artboard per flow (6 flows: Receive,
Issue, Production, Transfer, Non-sale, Canteen Dispatch — Receive currently
has no dedicated panel, give it one), each inside the `FlowScaffold`
chrome (`FlowHeader` + scrolling body + sticky submit — **that chrome
stays**, ADR-44's contribution; only the body reverts to the picker).

Body composition per flow (from the RESOLVED section of the audit):
- `SearchInput` over the location's product set (Issue/Production: `All`
  only; Transfer/Non-sale/Dispatch: category `Tabs` underline over
  `Product.category`, e.g. `All · Beverages & Soda · Shop Goods`).
- a list of `SelectableProductRow` (§3.1).
- `CalculatedImpactBanner` summing the batch
  (`Confirm Kitchen Issue (−53.5 kg)` etc.).
- per-flow secondary fields, unchanged from today's build: Transfer =
  destination `Select`; Non-sale = reason `Select` + note `Textarea`
  (note required iff reason = "other"); Production/Issue = none (chef /
  shift fields **dropped**).
- sticky submit = `<Button size="lg">` with the batch-sum label.

**Structural states per flow** (separate artboards, mobile 390px width):
`populated (≥1 row selected)` · `empty — "No products at this location"`
(`EmptyState`) · `loading` (§9.10 skeleton) · `error` (`ErrorState` +
Retry) · `over-stock blocked` (one row in §9.8 blocked state, submit
disabled). Name them `SM {Flow} — {state} [M2-3D]` /
`Canteen {Flow} — {state} [M2-3D]`.

### 3.3 Ride-along detail fixes (fold into the re-spun artboards)

From the per-screen audit sections — apply every one:
- **Copy alignment:** "Record Production" → **"Record Batch Production"**;
  Non-sale reason wording pick-one ("Staff Meal / Tea Preparation" vs
  "Staff meal / tea"); `as of now` → `as of today` on both Stock Levels.
- **Live availability** on every selected row (that's the `Avail: N` in
  §3.1 — the data comes from `useStockLevels`; 3-DOMAIN confirms the
  endpoint).
- **Empty state** on every flow when the location has no products.
- **Receive "match a payment" path:** `8T3-0` shows a "Purchase Delivery
  Pending → Match Delivery" banner; `GET /api/stock-movements/outstanding`
  is Admin-only today. **Draw** a staff-scoped "deliveries awaiting
  receipt" `MatchCard` list above the manual Receive form as the target,
  **and** flag in your summary that this needs a staff-scoped read
  (domain gap → 3-DOMAIN or an owner "manual-only receive for Submission
  1" ruling).

### 3.4 Two Stock Levels + K1 state artboards (state gaps only)

Not a rebuild — `StockLevelsView` is structurally fine. Just draw the
**missing state artboards** the audit flagged:
- `Canteen Stock Levels — empty` and `— error` off `9GW-0` (mobile).
- Confirm `986-0` / `9GW-0` pill sets: SM =
  `All · Ingredients · Goods · Dishes`; Canteen = `All · Beverages ·
  Goods` (no dead "Dishes" pill — note "pass pill set as a prop" for the
  build).
- `986-0` meta line: `kg · last movement 2h ago` — note whether to add
  `lastMovementAt` to the balances payload or drop the timestamp
  (recommend add; flag for 3-DOMAIN).

### 3.5 Flow doc

Write `docs/design/flows/staff-stock-movements-flow.md` — the user-flow
narrative for all 6 SM/Canteen movement flows (who, job-to-be-done, the
screens table, the multi-row-pick → batch-submit → two-phase-transfer
narrative, the block-on-over-stock rule, states). Match the shape of the
existing `docs/design/flows/*.md`. Add a one-line status note to the top
of `restaurant-sales-flow.md` / `canteen-derived-sales-flow.md` only if
they reference these flows (they mostly don't).

## 4. Output summary (for the human → orchestrator)

- Every artboard created/updated (id + name + state).
- The `SelectableProductRow` component artboard id — 3-KIT consumes it.
- The flow doc path.
- **Escalations:** the Receive "match delivery" staff-read gap (§3.3);
  `986-0` `lastMovementAt` call; anything else that needs a domain change
  or an owner ruling; confirm **no new kit component beyond
  `SelectableProductRow`** is needed.
- Confirm: no code, no kit change, no M3 work, Customers/Catalog
  untouched.

## 5. Guardrails / Do NOT

- One canonical artboard per screen — no half-duplicates. `duplicate_nodes`
  + `update_styles` + `set_text_content` where faster than fresh
  `write_html`.
- `get_guide({ topic: "paper-mcp-instructions" })` once before other
  Paper tools; `get_font_family_info` before typographic styling;
  `get_screenshot` to self-review; `finish_working_on_nodes` when done.
- Light mode only; `tabular-nums` on numeric columns; accent ≲5% pixels.
- No raw node IDs in the user-facing summary prose.
- Don't design M3. Don't touch Customers / Catalog. Don't invent kit
  components beyond the sanctioned `SelectableProductRow`.
