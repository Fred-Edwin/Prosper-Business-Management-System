# Handover — Store Manager stock readouts (Issue / Receive / Non-Sale)

**For:** the next session. Role: **Developer**, following the streamlined
loop in `docs/sdlc.md` Phase 3 (backend → frontend → in-session check —
no Design Sprint, compose from the frozen kit). This is a small
investigation + decision + fix, not a rebuild.

**Read first:** `CLAUDE.md`, `docs/sdlc.md` Phase 3, `docs/CONVENTIONS.md`,
this file, and `docs/sprints/m2-followups.md` items **#16, #17, #18**.

---

## What the owner reported (2026-09-02)

Walking the SM flows on `pnpm dev`:

| Screen | Balance location it reads | Owner sees | Correct? |
|---|---|---|---|
| Record Batch Production | Restaurant | Chapati 115 etc. — right | ✓ |
| Transfer to Canteen | per-product (dish→Restaurant, goods→Store) | available quantities right | ✓ |
| **Issue Ingredients** | **Store** | every ingredient "None on hand" except Rice ("Avail: 10 kg") | ✗ (feels wrong) |
| **Receive Goods** | **Store** | Carrots "On hand: 1 kg" (owner knows it's more) | ✗ |
| **Log Non-Sale** | **Store** | every item "None on hand" | ✗ (feels wrong) |

## Root cause — already diagnosed, confirm and act

**The numbers are arithmetically correct. The Store ledger is nearly
empty.** Live check as `Store Manager`:

```
GET /api/stock-movements/balances?locationId=seed-location-store&productIds=<all>
→ Rice = 10.0000 (one purchase_receipt, 2026-09-02 — the owner's test entry)
→ every other product = 0.0000
```

There is **no opening stock and no delivery history at the Store** for
anything but that one Rice receipt (`prisma/seed.ts` seeds opening stock
at the Canteen and production at the Restaurant, but **nothing at the
Store**).

- **Production works** — reads the Restaurant (real `production` rows).
- **Transfer works** — its dish rows read the Restaurant; only shop-goods
  rows read the (empty) Store, and the owner was transferring dishes.
- **Issue / Receive / Non-Sale read the empty Store** → 0 for everything
  but Rice.

The **"Carrots: 1 kg"** is a **real cosmetic bug** (not data): Receive is
an *additive* flow, so `movement-picker-flow.tsx` renders
`rowAvailable = Math.max(onHand, lineQty, 1)` (line ~709, the "KIT GAP"
comment). With `onHand = 0` and nothing typed, that floor shows a
fabricated **1**. Same defect that used to show Production "Available: 1"
before the Restaurant was re-activated. See `m2-followups.md` #16.

## Two questions to settle with the owner (product decision — ask, don't assume)

1. **Is the Store supposed to be stocked via opening stock + deliveries?**
   If yes → the "empty Store" is a data gap: the Admin enters Store
   opening balances at `/admin/stock/opening`, and Issue/Non-Sale then
   show real numbers with no code change. Confirm the intended stocking
   path for the Store.
2. **On an additive flow (Receive), should a 0-balance row be selectable,
   and what should the readout say?** You're *adding* stock — a 0 balance
   shouldn't make the row inert or show a fake "1". Likely answer: show
   `On hand: 0`, keep the row selectable.

## Scope for this session (once #1/#2 are answered)

**Frontend only — `app/store-manager/flows/movement-picker-flow.tsx` +
`app/store-manager/use-staff-stock.ts`. Do not touch `components/kit/*`.**

1. **Fix the additive readout (`m2-followups.md` #16).**
   - Don't fabricate `1`. For an additive flow, an unselected row shows
     the true `onHand` (including `0`); only clamp the *stepper minimum*
     for a selected row if the kit needs `available >= quantity`.
   - Options: pass a real `available={onHand}` and add a `neverBlocks` /
     `additive` opt-in to `SelectableProductRow` **(kit change — needs
     owner sign-off, out of scope by default)**, OR keep the interim
     entirely in the screen: render the row with `available={onHand}` and
     suppress the kit's zero-inert + §9.8 block for additive modes via
     the existing `handleBlockedChange` no-op plus a small wrapper. Prefer
     the screen-only route unless the owner approves the kit prop.
   - Copy: additive flows should read `On hand: N` (Receive already sets
     `availPrefix: "On hand:"`), showing `0` honestly — not "None on
     hand".

2. **Fold the balance hooks into `loading` / `error`.**
   `movement-picker-flow.tsx` `loading` currently ignores
   `useStockLevels.loading`; `error` ignores `useStockLevels.error`. A
   slow or failed `/api/stock-movements/balances` read shows a settled
   screen of zeros instead of a skeleton then `<ErrorState>`. Add them
   (mirror how `transferLevels` / `canteen` are already folded in).

3. **`useStockLevels` zero-filtering.** It drops rows whose balance is a
   clean `0` (`.filter((r) => Number.parseFloat(r.quantity) !== 0)`) —
   fine for a *stock-levels list*, but the picker then does
   `availableById.get(p.id) ?? 0`, so a legitimately-zero product just
   falls through to 0 anyway. No bug, but note it: the picker doesn't
   actually need that filtered hook — it could read balances directly.
   Low priority; don't gold-plate.

4. **In-session check.** `pnpm dev`, log in as Store Manager, walk Issue /
   Receive / Non-Sale / Transfer / Production. Confirm: no fabricated
   "1"; a real `0` reads "On hand: 0" (additive) or "None on hand"
   (spend, as drawn); an errored balance read shows `<ErrorState>`. Add /
   extend `tests/screens/store-manager-flows.screen.test.tsx`. Gates:
   `pnpm test`, `pnpm typecheck`, `pnpm build` green.

## Also on the backlog (mention, don't necessarily do here)

- **`m2-followups.md` #17** — the test suite runs against the dev DB.
  `orders/route.test.ts` was fixed this session (no longer deactivates
  `seed-location-restaurant`), but the durable fix is a throwaway
  `test:db` database. If the owner wants it, it's a separate infra
  session.
- **`m2-followups.md` #18** — Prisma 7 + `@prisma/adapter-pg` doesn't
  escape `_` / `%` in `startsWith`/`contains`/`endsWith`. Confirmed. The
  catalog/customers/assets search boxes treat a typed `_` / `%` as a
  wildcard. Low severity. Fix = escape `_`/`%`/`\` before `contains`.
- **Admin Locations management UI.** There is still no UI or API to toggle
  `Location.active` (only the seed and tests write it). A small
  admin screen + `PATCH /api/locations/[id]` would close the hole that
  let the Restaurant silently go inactive. Product/scope decision for the
  owner.

## State at handover

- `main` @ `35e7c34` (merged `chore/streamline-workflow-catalog-locations`,
  `--no-ff`). **Not pushed** — owner pushes.
- `pnpm test` 583/583 · `pnpm typecheck` 0 · `pnpm build` clean.
- All three seed locations `active: true`; the full suite now leaves them
  that way.
- Workflow docs rewritten to the streamlined loop; Storybook harness
  deleted (ADR-42 superseded).
- Catalog location column + filter shipped.
