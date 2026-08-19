# Prosper Hotel — what the data says, for the next iteration

Extracted from the final production dump, 2026-08-19, before the droplet
was destroyed. Companion to `reference-data.json`, which holds the
catalogue itself in importable form.

Money here is in **KES major units**. The old schema stored `*Minor`
(cents) integers — a good decision, worth keeping.

---

## The business, as the data actually describes it

Two locations trading as one business:

| Code | Name |
|---|---|
| `restaurant` | Prosper Restaurant |
| `canteen` | Prosper Canteen |

**They sell genuinely different things.** This is the single most
important structural fact, and the old build spent a lot of effort
discovering it:

| Location | Kind | Count |
|---|---|---|
| restaurant | goods | 50 |
| restaurant | cooked_food | 18 |
| restaurant | service | 11 |
| restaurant | packaging | 6 |
| canteen | goods | 52 |
| canteen | service | 3 |

The canteen is a shop (goods, stationery, snacks). The restaurant cooks
(meals from ingredients) **and** runs a cyber café (printing, binding,
logbooks — 14 services). Three different trading models under one roof.

**Four product kinds proved necessary:** `goods`, `cooked_food`,
`service`, `packaging`. Services don't consume stock the way food does;
packaging is consumed but never sold. Keep this distinction.

---

## Catalogue

- **140 products**, all active, 139 priced, 140 with a cost
- **43 ingredients**, all with a cost, all active
- **7 categories**: Beverages, cyber, dawa, fruits, meals, snacks, stationery

### Findings worth acting on

**1. 37 of 140 products have no category** — mostly canteen goods named
by number (`#15 Canteen`, `#22 Canteen`, `#44`, `20`). Either the owner
categorises by habit rather than by system, or categories were added
after the products. Ask before designing the category UI.

**2. Product names carry a workaround.** `Githeri Vegetables` and
`Githeri Vegetables (120)`; `Spiral Binding` and `Spiral Binding (70)`.
The price is being encoded *in the name* because the same item sells at
two prices. **The next build needs price variants**, or this pattern
repeats.

**3. Ingredient units are a mess — 18 distinct spellings for what is
maybe 8 real units:** `Pcs`/`pcs`/`Pc`, `Kg`/`kg`, `litre`/`lit`/`Lit`,
`Cups`, `Portions`/`Portion`, `Full`, `gm`, `Pkt 2kg`/`Pkt`/`500g`,
`Kasuku`, `Token`. Free-text units let this happen. Use a controlled
list next time, with `Kasuku` (a local measure) included rather than
normalised away.

**4. Cooked food has prices but mostly zero cost.** Of the meals sampled,
only `Chicken Stew` carries a real cost (110.00); `Beef Stew`,
`Chips Full`, `Mukimo Beef` and others are 0.00.

---

## The COGS problem, explained by the data

`recipes` = **0 rows**. `recipe_lines` = **0 rows**.

The recipe mechanism was built in Stage 1 and **never used once**. That
is the root of the COGS issue that was never resolved: cost of goods for
cooked food is supposed to derive from a recipe, and no recipe exists,
so cooked-food cost falls back to zero or to a manually-typed figure.

For the next iteration this is the central design question, not an
afterthought: **how does a cooked meal get its cost, given the owner
will not sit down and enter recipes?** Options worth weighing —
periodic manual cost per dish, a margin assumption, or costing at the
ingredient-issue level rather than per-portion.

---

## Features built and never used

Zero rows, despite being fully built:

| Table | Meaning |
|---|---|
| `recipes`, `recipe_lines` | Recipe/yield mechanism |
| `customers` | Named credit customers |
| `repayments` | Customer debt repayment |
| `drawing_debts`, `drawing_repayments` | Owner drawings as debt |
| `days_worked` | Staff attendance for pay |
| `assets` | Equipment register |

Credit sales, customer balances, drawings-as-debt and staff pay were all
built out. **None were ever touched.** Either they weren't needed, or
they were never reachable enough in the UI to get used. Worth asking the
owner directly before rebuilding any of them.

---

## What was actually used

| Table | Rows | Reading |
|---|---|---|
| `products` | 140 | Real catalogue entry — the genuine asset here |
| `stock_movements` | 114 | Stock recording exercised |
| `stock_count_lines` | 98 | Counting exercised |
| `sessions` | 81 | Repeated logins — the app was opened often |
| `ingredient_movements` | 76 | Kitchen issuing exercised |
| `amendments` | 59 | **Corrections were frequent** |
| `sale_lines` | 15 | |
| `expenses` | 13 | Money out used |
| `stock_counts` | 5 | |
| `transfers` | 2 | |
| `sales` | 2 | **Only two sales, ever** |
| `handovers` | 2 | |

**The system never entered real daily trading.** Two sales against 140
catalogued products means the catalogue was loaded and stock was
practised with, but the till was never run for a real day.

**59 amendments against 15 sale lines** is the loudest signal in this
table. Whatever was recorded needed correcting constantly. The editable
ledger was built to solve this — but the ratio suggests the underlying
entry flow was hard to get right first time. Fix the entry, not just the
correction.

---

## Staff (8, roles and rates — no credentials carried over)

| Role | Location | Daily rate |
|---|---|---|
| owner | restaurant | 1000 |
| store_manager | restaurant | 700 |
| attendant ×2 | canteen | 600 |
| cashier ×4 (1 inactive) | restaurant | 550 |

Four roles proved sufficient: `owner`, `store_manager`, `cashier`,
`attendant`. PIN hashes and phone numbers were deliberately **excluded**
from the export — do not carry credentials into a new system.

---

## Carry-forward recommendation

**Take:** products, ingredients, categories, locations, staff roles and
rates. That is `reference-data.json`. It is real business knowledge and
re-typing it would be a waste.

**Leave:** every transaction — sales, movements, counts, amendments,
handovers, expenses. It is build-time trial data, not trading history.
Starting the new system with a clean transactional slate is correct.

**Design against these five findings:**
1. Price variants, so prices stop living in product names
2. A controlled unit list, so 18 spellings don't become 30
3. A costing answer for cooked food that doesn't depend on recipes
4. Ask which unused features are wanted at all before rebuilding them
5. Make first-time entry easy enough that amendments stop outnumbering sales
