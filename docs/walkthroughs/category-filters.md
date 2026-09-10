# Walkthrough — Category filters on the staff item pickers

**What this feature does.** Every screen where staff scroll a product list
to add items now shows a **category row** at the top. Tap a category and
the list narrows to just that group — much less scrolling on a long
catalog. The categories come from the **Category** field on each product
in the Catalog (Admin sets it). Items with no category sit under
**Uncategorised** and are never hidden.

Branch: `feat/staff-picker-category-filters` (PR — ADR-80).

---

## 0. Set up

```bash
pnpm install
pnpm dev
```

The seed catalog already has some categories set, so the feature is
visible immediately:

| Product | Kind | Category |
|---|---|---|
| Chapati | dish | Sides |
| Chicken Stew | dish | Mains |
| Soda 300ml | goods | Drinks |
| Water 500ml | goods | Drinks |
| Mandazi | goods | Bakery |
| Rice | ingredient | *(none)* |
| Cooking oil | ingredient | *(none)* |
| Chicken Breast | ingredient | *(none)* |

Seed logins are all **PIN 1234**: `Admin`, `Store Manager`, `Cashier`,
`Canteen Attendant`.

---

## 1. Admin — set a category (Catalog)

1. Sign in as **Admin** → **Catalog** → **Products**.
2. Look at the table columns first. What used to be one column labelled
   "Category" (but actually showing *Ingredient / Dish / Goods*) is now
   **Kind**, and there is a separate **Category** column beside it —
   blank for the three ingredients, "Drinks" / "Mains" / "Sides" /
   "Bakery" for the seeded dishes and goods. Same split on the mobile
   card (`Kind · Category · per unit · locations`).
4. Click **Edit** on **Rice**.
5. In the **Category** field, start typing `D`. A dropdown suggests
   **Drinks**, **Sides**, **Mains**, **Bakery** — the categories already
   in use. This is the new `<datalist>` autocomplete: it keeps names
   consistent so you don't end up with both "Drinks" and "drinks".
6. Type a new one — `Grains` — and **Save**. (Free text is still allowed;
   the suggestions are just a convenience.) Back in the table, Rice's
   **Category** cell now reads `Grains` while its **Kind** stays
   `Ingredient`.
7. Edit **Cooking oil** and **Chicken Breast** the same way, both
   `Grains`, and save.

You now have five categories in use: Drinks, Sides, Mains, Bakery, Grains.

---

## 2. Cashier — New Order (was already there; confirm unchanged)

1. Sign in as **Cashier** → **New order**.
2. Above the product grid: **All · Sides · Mains · Drinks**.
3. Tap **Drinks** → only Soda 300ml and Water 500ml. Tap **Mains** → only
   Chicken Stew. Tap **All** → everything back.
4. The search box still works and combines with the active tab.

_(This screen already had category tabs — included here so you can see the
same behaviour is now everywhere.)_

---

## 3. Store Manager — the movement flows (new)

Sign in as **Store Manager**. Each flow below now has a category row
between the search box and the product list. It only appears when at
least one product in that flow's list has a category.

### 3a. Issue Ingredients  (`/store-manager` → Issue Ingredients)
- List is ingredients + goods. After step 1 above, the ingredients are
  `Grains` and the sodas are `Drinks`.
- Category row: **All · Grains · Drinks**.
- Tap **Grains** → Rice, Cooking oil, Chicken Breast only.
- Tap **Drinks** → Soda 300ml, Water 500ml only.

### 3b. Receive Goods  (→ Receive Goods)
- Same list (ingredients + goods), same category row.
- Pick a couple of rows across two categories, enter quantities, and
  confirm the impact banner still sums the whole batch — the category
  filter is display-only, it doesn't drop your selected lines.
  Switch categories after selecting: your picked rows stay picked.

### 3c. Record Batch Production  (→ Record Batch Production)
- List is **dishes only**: Chapati (Sides), Chicken Stew (Mains).
- Category row: **All · Sides · Mains**.

### 3d. Transfer Stock  (→ Transfer Stock)
- List is dishes + goods. Category row built from those:
  **All · Sides · Mains · Drinks**.
- _(This flow previously showed a fixed `All · Beverages & Soda · Shop
  Goods` row that only ever matched two hard-coded names. It's now the
  real categories.)_

### 3e. Log Non-Sale  (→ Log Non-Sale)
- List is everything at the Store. Category row from whatever's in stock.
- Reason + note fields below are unchanged.

**Empty case:** if you undo step 1 (clear the ingredient categories) and
open **Record Batch Production** before setting any dish category — the
category row disappears entirely and you just get search. Nothing breaks;
that's the "nothing is categorised" state.

---

## 4. Canteen — the attendant flows (new)

Sign in as **Canteen Attendant**. The Canteen sells Soda, Water
(Drinks) and Mandazi (Bakery).

### 4a. Transfer / Dispatch  (`/canteen` → Transfer)
- Category row: **All · Drinks · Bakery**.
- Tap **Bakery** → Mandazi only.

### 4b. Receive Goods  (→ Receive Goods)  and  4c. Log Non-Sale (→ Log Non-Sale)
- Same category row, same behaviour.

---

## 5. Store Manager & Canteen — Stock Levels (new for Canteen)

### 5a. Canteen — Stock Levels  (`/canteen` → Stock)
- The pill row used to be a fixed **All · Beverages · Goods** where
  "Beverages" was a keyword guess on the product name.
- It's now built from the **Category** field: **All · Drinks · Bakery**
  (only categories that actually have stock on hand show up).
- Tap **Drinks** → Soda / Water rows. Tap **Bakery** → Mandazi.
- If nothing on hand has a category, the pill row hides itself.

### 5b. Store Manager — Stock Levels  (`/store-manager` → Stock)
- **Unchanged.** Still **All · Ingredients · Goods · Dishes** — those are
  product *kinds*, not categories, and were deliberately left alone.

---

## 6. What did NOT change

- No new database column — `Product.category` has existed since
  Milestone 2.
- No API, domain, or ledger change. This is display-only filtering.
- The Cashier New-Order and Canteen Stock-Count screens already had
  category tabs; their behaviour is identical.
- The Store-Manager Stock-Levels kind pills are untouched.

---

## 7. The automated proof

```bash
pnpm test        # includes:
                 #   lib/catalog-categories.test.ts        (the helper)
                 #   tests/screens/stock-levels.screen.test.tsx
                 #   tests/screens/store-manager-flows.screen.test.tsx
pnpm typecheck
pnpm build
```

The screen tests assert the category row renders from the products'
categories, filters the list, routes "no category" products to
**Uncategorised**, and hides itself when nothing is categorised.
