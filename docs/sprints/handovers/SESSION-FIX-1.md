# HANDOVER — Session FIX-1 · Developer · product-scoping bug fixes (fast)

**Paste this whole file as your first message in a fresh session.**
Branch: `fix/product-scoping` **off `main`** (`7045162` — M2 Submission 1
is landed and clean). **ONE SESSION. You are the only active session. Do
NOT run `git checkout` / `git stash` / `git branch` against anything but
your own branch. Commit before you exit.**

---

## 0. Context + how this session runs (READ — it's different)

M1 + M2 are shipped to `main`. The owner walked the app and found a
cluster of **product-list-scoping bugs**: several screens show the wrong
set of products (raw ingredients where only sellable goods/dishes belong,
or an un-scoped list where a location-scoped one belongs). These are
**data-filter bugs, not design questions.** The owner wants them fixed
**fast**.

**This session is deliberately low-ceremony:**
- **No Paper, no artboards, no kit changes, no new components.**
- **No design decisions** — the correct set for each screen is specified
  in §2 below. If a case is genuinely ambiguous, make the smallest
  sensible choice, do it, and note it in your summary. Don't stop to ask.
- **Light test bar:** **one** regression assertion per fixed screen
  ("this list includes X and excludes Y"). NOT a full
  populated/empty/loading/error matrix. NOT screenshot-diffs.
- **Minimal reading:** this file, the current source of each screen in
  §2, and `docs/CONVENTIONS.md` §1 + the product-scoping bits of
  `docs/SCHEMA.md`. Skip the rest of the doc set.
- Gates: `pnpm tsc --noEmit` 0 · the targeted `*.screen.test.tsx` you
  touch green · `pnpm test` full run green (no regression) · `pnpm build`
  clean. That's it.

## 1. The domain model you're filtering on

`prisma/schema.prisma`:
- **`Product.kind`** — enum `ProductKind` = `ingredient | dish | goods`.
- **`Product.sellingPrice`** (`Decimal?`) — set ⇒ the product is
  sellable. Raw ingredients typically have no `sellingPrice`.
- **`ProductLocation { productId, locationId, sellingPrice?, active }`** —
  a product is *stocked/sellable at a location* iff it has an **active**
  `ProductLocation` row for that location. The canteen's sellable set =
  products with an active `ProductLocation` for the canteen `Location`.
- There is already a **canteen-scoped products endpoint**:
  `GET /api/canteen/products` (added Session 6e — role-scoped to the
  attendant's assigned location, or `admin`). Prefer reusing it over
  re-deriving the canteen set client-side.

Current mechanism in the SM/Canteen movement screens
(`app/store-manager/flows/movement-picker-flow.tsx`): a per-flow
`cfg.productKinds` of `"dish"` / `"non-dish"` / `all` filters
`data.products` by `p.kind`. The bugs below are mostly wrong
`productKinds` values + missing location scoping.

## 2. The fixes — screen → correct product set

### FIX A — SM "Transfer to canteen" shows ingredients; must show sellable goods + dishes

**File:** `app/store-manager/flows/movement-picker-flow.tsx` — the
`transfer` entry in `FLOW_CONFIG` (and the `productKinds` filter at
~L260–269).

**Wrong now:** the transfer flow shows raw ingredients. The Store Manager
does **not** transfer raw ingredients to the Canteen — they transfer
**cooked dishes and sellable goods** (sodas, snacks, packaged items).

**Correct set:** `kind === "dish" || kind === "goods"` — i.e. exclude
`kind === "ingredient"`. (If a "sellable" signal is wanted on top —
`sellingPrice != null` — apply it too, but `kind !== "ingredient"` is the
primary cut and matches the owner's description.)

**How:** add a `productKinds` mode (e.g. `"sellable"` /
`"dish-or-goods"`) or just special-case `transfer` to
`p.kind !== "ingredient"`. Keep `issue` (`non-dish` — ingredients TO the
kitchen, correct) and `production` (`dish`) unchanged.

**Also check `non-sale`** (Log wastage): the owner didn't flag it, but
it should be able to write off **anything at the Store** —
ingredients, dishes, goods. If it's currently `non-dish` or `dish`-only,
widen it to `all`. Note the change in your summary.

**Test:** `tests/screens/store-manager-flows.screen.test.tsx` — one
assertion: the Transfer flow's product list contains a `goods` and a
`dish` product and **does not** contain an `ingredient` product.

### FIX B — Admin "Sales" / logged sales screen should show BOTH products and ingredients

**File:** `app/admin/sales/orders-tab.tsx` (+ `derived-tab.tsx` if the
product filter/picker is shared). Whatever product list or `Product:`
filter dropdown backs the Sales screen.

**Wrong now:** the owner says the Sales screen is showing a **partial**
product set — it should show **both products and ingredients** (i.e. the
full catalogue, no `kind` filter).

**Correct set:** all products — no `kind` restriction. If there's a
`.filter(p => p.kind === …)` or a `productKinds`-style cut on the Sales
product list / the `Product:` filter options, **remove it**.

**Caveat:** the Cashier-facing order-build screen (`/cashier/orders/new`)
is a *different* screen and its scoping (Restaurant-sellable only) is
correct — **do not touch the Cashier screens.** This fix is the
**Admin** Sales view only.

**Test:** `tests/screens/admin-sales.screen.test.tsx` — one assertion:
the Sales product filter / list includes both an `ingredient` and a
non-ingredient product.

### FIX C — Canteen "Transfer stock" (dispatch) must show canteen sellable items only

**File:** `app/canteen/transfer/transfer-dispatch-flow.tsx` and/or the
`dispatch` entry in `movement-picker-flow.tsx`'s `FLOW_CONFIG`; the
products hook it feeds off.

**Wrong now:** the Canteen Attendant's Transfer Dispatch screen shows the
wrong set (not scoped to canteen-sellable items).

**Correct set:** products that are **sellable at the Canteen** — an
active `ProductLocation` for the canteen `Location`. **Use
`GET /api/canteen/products`** (already role-scoped) as the product source
for this screen instead of the generic `data.products` / `useStaffStock`
list. Fall back to filtering `data.products` by the canteen
`ProductLocation` set only if wiring the endpoint here is disproportionate
— but the endpoint is the right answer.

**Test:** `tests/screens/canteen-transfer-dispatch.screen.test.tsx` —
one assertion: the dispatch product list = the canteen-sellable set
(mock `/api/canteen/products` returning 2 items ⇒ exactly those 2 render;
a Store-only product does **not**).

### FIX D — Canteen "Stock count" must show canteen sellable items only

**File:** `app/canteen/stock-count/stock-count-client.tsx` + its products
hook.

**Wrong now:** same class of bug — the stock-count product picker isn't
scoped to canteen-sellable items. (Session 6e's notes claim it already
consumes `/api/canteen/products` — **verify**; if it regressed or never
actually did, wire it.)

**Correct set:** canteen-sellable items — same as FIX C, via
`GET /api/canteen/products`.

**Test:** `tests/screens/canteen-stock-count.screen.test.tsx` — one
assertion: the stock-count product picker = the canteen-sellable set
(same mock shape as FIX C).

### FIX E — (owner said "many such changes") — sweep for the same bug

After A–D, grep for the pattern and eyeball any other product picker /
list / filter:
```
grep -rn "kind === \|kind !== \|productKinds\|\.filter(p =>\|data.products" app/ | grep -v test
```
For each hit that scopes a **product list a user picks from**, sanity-check
it against "who is this user and what can they legitimately move/sell/
count here?" Fix the obvious wrong ones the same lightweight way; **list
every screen you touched + the before/after set** in your summary. If a
hit is ambiguous or clearly out of the "product-scoping" theme, leave it
and note it.

Likely additional suspects to check (not confirmed bugs — verify):
- SM "Receive goods" — receiving is deliveries of anything the Store
  stocks; probably `all` already, confirm.
- SM / Canteen "Stock Levels" views — already got a pill-set-as-prop in
  3d; confirm the Canteen one lists canteen items only (server-scoped per
  3-DOMAIN) and SM lists Store/Restaurant items.
- Any `Product:` filter dropdown on an Admin screen.

## 3. Gates + output

- `pnpm tsc --noEmit` → 0.
- The `*.screen.test.tsx` files you touched → green, each with its one
  new scoping assertion.
- `pnpm test` full run → green (baseline **556**; expect ~561 with the
  new assertions, **0 fail**). If a pre-existing test breaks because it
  *asserted the buggy set*, fix that assertion to the correct set and say
  so in your summary — that's expected, not a regression.
- `pnpm build` → clean.
- **Summary → orchestrator:** a table of every screen touched · the
  before set · the after set · the file · the one test added. Plus:
  anything ambiguous you decided, anything from the §2E sweep you left
  alone and why, and whether FIX D was already correct or needed wiring.
- **Do NOT** edit `docs/PROGRESS.md` / `ROADMAP.md` / the milestone plan
  / any Paper artboard.

## 4. Do NOT

- Touch `components/kit/*`, any shell, or the Cashier order screens.
- Add a full state-matrix spec or screenshot-diffs — one assertion per
  screen.
- Redesign anything or change layout — this is a data-filter change only.
- Add a DB migration unless a fix genuinely can't be done without a new
  column (it shouldn't — `kind`, `sellingPrice`, `ProductLocation`
  already carry everything). If you think you need one, STOP and flag it.
- Merge to `main` — hand back for the owner walkthrough first.
