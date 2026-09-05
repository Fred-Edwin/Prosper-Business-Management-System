# UI Walkthrough — Check the Numbers Yourself

**Purpose:** to let you, personally, confirm that what the app *shows you*
is what the ledger *actually holds* — without taking anyone's word for it.

The automated tests prove this too (see §7). This document exists so you
can prove it to yourself, in a browser, with a calculator.

---

## 1. Set it up (one command)

```bash
pnpm demo:load      # writes the demo data into your dev database
pnpm dev            # start the app
```

Then open the app and sign in as **Admin, PIN 1234**.

> **`pnpm demo:load` wipes the ledger in your dev database** — orders,
> stock, money, expenses, customers. It keeps the logins, the locations and
> the product catalogue. A backup of your previous dev data was saved to
> your home folder as `prosper-dev-db-backup-<date>.sql` when this was
> first set up; to restore it:
> ```bash
> docker exec -i prosper-hotel-postgres-1 psql -U prosper -d prosper_hotel \
>   < ~/prosper-dev-db-backup-<date>.sql
> ```

---

## 2. What the demo data is

Three business days — **1, 2 and 3 June 2026** — of deliberately round
numbers. Every figure below was chosen so you can check it in your head.

Nothing here was planted directly into the database. The demo runs through
**the same code the real app uses** — the same rules, the same permissions,
the same day-by-day sequence — so what you see is what a real three days
would produce.

### Day 1 — Monday 1 June

| What happened | Figure |
|---|---|
| Bought 100 kg rice @ 150 (paid **cash**) | 15,000 |
| Made 50 chapati and 20 chicken stew | — |
| Sold 10 stew @ 200 (**cash**) | 2,000 |
| Sold 20 chapati @ 20 (**M-Pesa**) | 400 |
| Paid rent (**cash**) | 5,000 |

**Day 1 revenue: 2,000 + 400 = 2,400.** Day 1 expenses: **5,000.**

### Day 2 — Tuesday 2 June

| What happened | Figure |
|---|---|
| Bought 100 sodas @ 45 for the Canteen (**M-Pesa**) | 4,500 |
| Sold 5 stew @ 200 **on credit** to Demo Customer A | 1,000 |
| Canteen: counted 70 sodas left of 100 → system worked out 30 sold @ 60 | 1,800 |
| Paid utilities (**M-Pesa**) | 2,000 |

**Day 2 revenue: 1,000 + 1,800 = 2,800.** Day 2 expenses: **2,000.**

> The 1,800 is worth pausing on. **Nobody typed "1,800".** The attendant
> only counted 70 sodas on the shelf. The system knew 100 had arrived, so
> it worked out that 30 were sold, and 30 × 60 = 1,800. That is the canteen
> derived-sale rule doing its job.

### Day 3 — Wednesday 3 June

| What happened | Figure |
|---|---|
| Sold 10 chapati @ 20 (**cash**) | 200 |
| 2 kg rice spoiled (written off) | cost 300 |
| Demo Customer A repaid (**cash**) | 400 |
| Paid transport (**cash**) | 1,000 |

**Day 3 revenue: 200.** Day 3 expenses: **1,000.**

---

## 3. The totals you should see

Add the three days up yourself:

```
Revenue     2,400 + 2,800 + 200   =  5,400
Expenses    5,000 + 2,000 + 1,000 =  8,000
Debts       1,000 owed − 400 paid =    600
Waste       2 kg rice × 150/kg    =    300
```

**Set the date range to "This month"** (the demo days are all in June 2026)
and the app must show exactly:

| Figure | Must show |
|---|---|
| Revenue | **5,400.00** |
| Cost of goods sold | **1,650.00** |
| Gross profit | **3,750.00** |
| Total expenses | **8,000.00** |
| Net profit | **−4,250.00** |
| Debts owed to the business | **600.00** |
| Non-sale consumption | **300.00** |
| Cash at hand | **−16,600.00** |
| M-Pesa / Bank | **−6,100.00** |

### Where the two less-obvious figures come from

**Cost of goods sold — 1,650.** This is *not* what you spent on stock. It
is the value of stock you actually **used up**:

```
  Stock you started with        3,950
+ Stock you bought in          19,500   (15,000 rice + 4,500 soda)
− Stock still on the shelf     21,800
                              ────────
= Used up                       1,650
```

Most of what was bought is still sitting in the Store — so it is not a
cost yet. That is the correct accounting treatment, and it is why gross
profit is healthy (3,750) even though a lot of cash went out.

**Net profit is negative (−4,250)** because rent of 5,000 landed in these
three days. Over three days that is normal; over a month it would not be.
**The demo business is not meant to be a well-run business** — it is meant
to produce numbers you can check.

**Cash and M-Pesa are negative** for the same reason: the demo starts from
zero with no cash float, then buys 19,500 of stock. A real business would
open with cash on hand.

---

## 4. The walkthrough — screen by screen

Tick each one off. **Set the date range to "This month" first** unless a
step says otherwise.

### ☐ Dashboard (`/admin`)

- [ ] Revenue shows **5,400.00**
- [ ] Total expenses shows **8,000.00**
- [ ] Debts owed shows **600.00**
- [ ] Switch the range to **Today** (3 June): revenue drops to **200.00**
- [ ] Switch back to **This month**: it returns to **5,400.00**

> That last pair is the important one. It proves the date range genuinely
> filters, rather than showing the same figure regardless.

### ☐ Financials → Expenses tab (`/admin/financials`)

- [ ] The tile says **3 expenses**, totalling **8,000.00**
- [ ] Three rows: **Rent 5,000.00**, **Utilities 2,000.00**, **Transport 1,000.00**
- [ ] Rent and Transport say **Cash**; Utilities says **M-Pesa**
- [ ] Add them yourself: 5,000 + 2,000 + 1,000 = **8,000** ✓

### ☐ Financials → Non-Sale Consumption tab

- [ ] One row: **Rice**, reason **Spoiled**, **2** units
- [ ] Estimated cost **300.00** (2 kg × 150/kg — check it)

### ☐ Financials → Stock Purchases tab

- [ ] Two payments: **15,000.00** (rice, cash) and **4,500.00** (soda, M-Pesa)
- [ ] Together **19,500.00**

### ☐ Stock (`/admin/stock`)

- [ ] **Rice** at the Store: **98 kg** — 100 bought, 2 spoiled
- [ ] **Soda** at the Canteen: **70** — 100 bought, 30 sold
- [ ] **Chapati** at the Restaurant: **20** — 50 made, 20 + 10 sold
- [ ] **Chicken Stew** at the Restaurant: **5** — 20 made, 10 + 5 sold

> Every one of these you can verify by arithmetic from §2.

### ☐ Sales (`/admin/sales`)

- [ ] Four orders across the three days
- [ ] One is marked **credit** (the 1,000 stew sale on 2 June)
- [ ] Order totals: **2,000**, **400**, **1,000**, **200** — adding to **3,600**

> 3,600 is the *Restaurant* revenue. The other 1,800 is the Canteen's
> derived sale, which is not an order — that is why they are separate.
> 3,600 + 1,800 = **5,400** ✓

### ☐ Customers (`/admin/customers`)

- [ ] **Demo Customer A** owes **600.00**
- [ ] Their history shows a **1,000** debt and a **400** repayment

### ☐ Canteen count — the derived sale

- [ ] Find the soda count on 2 June (Canteen section or the audit trail)
- [ ] It records **70 counted**, **30 sold**, **1,800.00** revenue
- [ ] Confirm nobody entered 1,800 — only the count of 70

### ☐ Permissions — sign out, sign in as **Cashier / PIN 1234**

- [ ] You **cannot** reach `/admin/financials` — no profit figures
- [ ] You **cannot** see any buying price or margin anywhere
- [ ] You see only **your own** orders, not the other cashier's

---

## 5. If a number is wrong

That is a real finding — please report it. Note:

1. Which screen, and which date range was selected
2. What it showed, and what this document says it should show
3. A screenshot if convenient

A mismatch means either a genuine bug or that this document is stale. Both
are worth knowing, and both are fixable.

---

## 6. Resetting

Re-run `pnpm demo:load` at any time to wipe and reload the clean three
days. It is safe to run repeatedly — it always produces identical figures.

To get your original dev data back, restore the backup (see §1).

---

## 7. What proves this automatically

Everything in §4 is also asserted by automated tests, so a future change
that breaks a figure fails the build rather than waiting to be noticed:

| Test file | What it proves |
|---|---|
| `tests/simulation/clean-numbers.sim.test.ts` | The **server** computes these exact figures |
| `tests/simulation/screens-financials.sim.test.tsx` | The **Financials screen** displays them |
| `tests/simulation/screens-dashboard.sim.test.tsx` | The **Dashboard** displays them |

The screen tests are the important addition. They render the real screen
components, wired to the real database through the real API — nothing
mocked in between — and assert on the **text actually rendered**. That is
what closes the gap between "the engine is right" and "what you see is
right".

```bash
pnpm test:sim     # all of it, including the 60-day horizons
```

See `docs/SIMULATION_TESTING.md` for the full picture, and for an honest
list of what is still **not** covered (handovers with variances is the
main one).
