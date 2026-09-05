# The Simulation Tests — What They Do and Why You Can Trust Them

**Written for the owner, in plain language.** If you want to satisfy
yourself that Prosper's money and stock figures are right, read this
document. It explains what was tested, how, what passed, and — just as
importantly — what was *not* tested.

Date: 2026-09-05. Status: all 37 checks passing.

---

## 1. The problem this solves

Prosper's whole value is trustworthy numbers. The danger with financial
software is that **a wrong number looks exactly like a right number.**
Nobody notices until weeks later, when the books don't add up and there is
no way to tell which day went wrong.

Before this work, the project already had 1,040 tests, and they were good
ones. But nearly all of them checked **two or three days** of activity at a
time. That leaves an obvious question unanswered:

> Does this still add up after a week? A month? Two months of real trading?

Some bugs only appear over time — a valuation that drifts a few cents a
day, a total that is right daily but wrong when you add up the month, a
boundary that only misbehaves when you cross from July into August. A
three-day test cannot see any of those.

The simulation answers that question.

---

## 2. The core idea: two sets of books

This is the single most important thing to understand.

If I tested Prosper by asking Prosper to add things up, and then checked
that against Prosper's own arithmetic, a bug would appear on both sides and
cancel itself out. The test would pass and prove nothing.

So the simulation keeps **two completely separate sets of books**:

**Book 1 — Prosper.** The real system. Real database, real screens' API,
real rules.

**Book 2 — the "shadow ledger".** A deliberately dumb second record that I
wrote from scratch (`tests/simulation/shadow.ts`). It shares **no code
whatsoever** with Prosper. It does plain addition and subtraction, nothing
else. When the simulation sells 3 sodas at 60/= each, the shadow simply
writes down "+180 revenue, +180 cash, −3 sodas."

Then the two are compared. **If they ever disagree, something is wrong.**

Think of it as a second bookkeeper sitting beside the system, keeping their
own tally by hand, and comparing totals at the end of every day. That is
why a pass here means something — the two books were built independently and
still agree to the cent.

> One detail that matters: the shadow never uses ordinary decimal numbers.
> Computers are famously bad at decimals (`0.1 + 0.2` genuinely does not
> equal `0.3` in most programming languages). The shadow stores money as
> whole numbers of cents, so no rounding error can ever creep in from the
> testing side.

---

## 3. How a fake business was run for 60 days

### The obstacle

Prosper is strict about dates, on purpose. Staff can only record things
dated **today** — a cashier cannot backdate a sale to cover a shortfall.
That is a good rule and I did not want to weaken it.

But it meant I could not simply tell the system "pretend this is day 1,
now day 2, now day 3." It would refuse, correctly.

### The solution

Instead of weakening the rule, **I moved the clock.** Before each
simulated day, the test moves the system's sense of "now" to 8am on that
day, then does that day's business normally. From Prosper's point of view
it genuinely *is* that day, so every rule, every date check and every
permission check runs for real and passes honestly.

Nothing was disabled, skipped, or worked around. That was the guiding
constraint: **if a guard would have stopped a real user, it stopped the
simulation too.**

### A day in the simulated business

Each day runs in realistic order, with realistic times:

| Time | What happens | Who does it |
|---|---|---|
| 08:00 | Buy stock (pay a supplier) | Admin |
| 08:30 | Receive the delivery into Store/Canteen | Store Manager / Canteen Attendant |
| 10:00 | Issue ingredients to the kitchen | Store Manager |
| 10:30 | Cook dishes (production) | Store Manager |
| 12:00–15:00 | Restaurant sales — cash, M-Pesa and credit | Both Cashiers |
| 16:00 | Occasional waste / staff meals | Store Manager |
| 17:00 | Canteen stock count → system derives the sale | Canteen Attendant |
| 19:00 | Record expenses | Admin |
| 20:00 | Occasional debt repayment | Admin |

The mix is randomised — how many orders, what was bought, who paid cash
versus M-Pesa versus credit — but it is **repeatable randomness**. The same
starting number always produces the exact same 60 days. If day 43 ever
fails, it can be replayed exactly. Nothing is left to chance.

### The scale of what was run

The 60-day run put through:

- **227 orders** (296 individual order lines)
- **1,037 stock movements**
- **180 canteen stock counts**
- **596 money movements**
- **94 expenses**
- **34 credit debts** and **24 repayments**
- **1,558 audit log entries**

Every one of those went through the real API — the same code path the real
screens use.

---

## 4. What was checked (and why each one matters)

Rather than checking "revenue on day 5 should be 4,200" — which only proves
one number on one day — the tests check **relationships that must be true no
matter what happened.** These are far harder to satisfy by accident.

### I1 — Adding up the days gives the month

> The 60 individual daily reports, added together, must equal the one
> 60-day report.

**Why it matters:** if you look at Monday, Tuesday and Wednesday separately,
then look at the whole week, the numbers must agree. If they don't, you can
never trust any report. This is the single most likely place for a
date-boundary bug to hide.

### I2 — Splitting a period anywhere still adds up ("telescoping")

> Cost of goods for the whole period must equal cost of goods for the first
> half plus the second half — **at every possible split point.**

**Why it matters:** this was checked at all 59 split points across the 60
days. If any single day were double-counted or dropped, exactly one split
would fail. This is the strongest check in the suite, and it is the one that
would catch the kind of COGS bug the system had once before.

Revenue is checked the same way (I2b).

### I3 — The profit chain holds

> Gross profit = Revenue − Cost of goods.
> Net profit = Gross profit − Expenses.

**Why it matters:** these are the numbers you actually make decisions on.

### I4 / I4b — Revenue and expenses match the independent books

> What Prosper says you earned must equal what the shadow ledger
> independently recorded.

**Why it matters:** this is the "second bookkeeper" check. It covers
restaurant sales *and* canteen sales, including the derived-sale
calculation where the system works out what was sold from a stock count.

### I5 — Every stock figure, every product, every day

> For each product at each location, on each of the 60 days, the quantity
> Prosper reports must equal the shadow's count.

**Why it matters:** this is roughly 480 separate quantity checks over the
60-day run. Stock errors turn into money errors.

### I6 — Cash and M-Pesa balances, every day

> Cash at hand and M-Pesa/Bank, as at the end of each day, must match the
> shadow.

**Why it matters:** the balance is derived by adding up every movement ever
made — so an error anywhere in history shows up here.

### I7 — Debts owed to the business

> What customers owe must match the shadow, after all credit sales and
> repayments.

### I8 — The locations add up to the total

> Restaurant revenue + Canteen revenue + Store revenue = total revenue.

### C1–C8 — The awkward cases

Corrections are where financial systems usually break, so these were
attacked specifically:

- **C1/C2** — When an order is corrected, revenue moves by **exactly** the
  difference, and the original is not counted twice.
- **C3** — When an expense is corrected, net profit moves by exactly the
  difference.
- **C4** — Once a day is closed, **nobody** can add a new entry to it — not
  staff, and not even the Admin.
- **C5** — But the Admin *can* still post a correction to a closed day.
  That is the intended way back in, and it works.
- **C6** — A Cashier sees only their own orders. Asking for another
  cashier's orders returns nothing.
- **C7** — No buying price, cost or margin field ever reaches a Cashier,
  and a Cashier cannot open the financial summary at all.
- **C8** — After all those corrections, **every earlier check is re-run and
  still passes.** Corrections did not quietly break the totals.

---

## 5. The results

| Horizon | Days | Checks | Result |
|---|---|---|---|
| One week | 7 | 10 | ✅ all pass |
| One month | 31 | 10 | ✅ all pass |
| Sixty days | 60 | 10 | ✅ all pass |
| Corrections / permissions | 14 | 7 | ✅ all pass |
| **Total** | | **37** | **✅ all pass** |

The 60-day run crosses **two month boundaries** (July → August →
September), which is where date bugs like to hide.

Full run takes about 2 minutes.

---

## 6. Check it yourself

You do not have to take my word for any of this.

```bash
pnpm test:sim
```

That wipes the simulation database, replays all 60 days, and re-checks
everything. It never touches your development database or your real data.

To see the individual check names as they run:

```bash
pnpm test:sim -- --reporter=verbose
```

**A suggestion for satisfying yourself personally:** open the simulation
database and add up a day by hand — pick one day, add up its orders, and
compare to what the daily report says. That is exactly what the automated
checks do, just done by you.

---

## 7. Real figures from the 60-day run

These are the actual books after 60 simulated days. Every relationship
below has been verified by hand with a calculator, not just by the tests:

```
Revenue          125,970.00
Cost of goods    223,480.00
Gross profit     −97,510.00     ← 125,970 − 223,480 ✓
Total expenses   127,589.00
Net profit      −225,099.00     ← −97,510 − 127,589 ✓
Debts owed        10,789.00
```

Per location:

| Location | Revenue | Cost of goods | Gross profit |
|---|---:|---:|---:|
| Canteen | 47,630.00 | 33,630.00 | 14,000.00 |
| Restaurant | 78,340.00 | 4,800.00 | 73,540.00 |
| Store | 0.00 | 185,050.00 | −185,050.00 |
| **Total** | **125,970.00** | **223,480.00** | |

Revenue adds up: 47,630 + 78,340 + 0 = 125,970 ✓
Cost adds up: 33,630 + 4,800 + 185,050 = 223,480 ✓

### Why is the simulated business losing money?

**This is not a bug, and it is worth understanding.**

The made-up business in the simulation buys stock almost every day but only
sells a fraction of it. Stock piles up in the Store, and cash goes
negative. A real business would go bankrupt behaving this way.

But that does not affect what is being tested. The tests check that the
numbers are **internally consistent and correctly derived** — that revenue
minus cost really is gross profit, that days add up to months. A
badly-run imaginary business tests that just as well as a well-run one.
Arguably better: it produces large, awkward numbers and negative balances,
which are exactly the conditions where rounding and sign errors surface.

Also worth noting: the Store shows a large cost and no revenue because the
Store *is* where cost enters the business. That is the design working as
intended — the Store buys, the Restaurant and Canteen sell.

---

## 8. What was found

**No bugs were found in Prosper's financial logic.** All 37 checks pass.

During development, the simulation failed several times. **Every single
failure was a mistake in my test code, not in Prosper** — and in each case
Prosper was right to reject what the test was doing:

1. I tried to create a customer without a phone number → correctly rejected.
2. I tried to have the Admin receive a delivery → correctly rejected;
   receiving is the Store Manager's or Canteen Attendant's job.
3. I read a field name wrong when recording canteen sales → my error.
4. I tried to increase an order to more units than were in stock →
   correctly rejected as overselling.

That pattern is itself reassuring: repeatedly, when the test did something
a careful business wouldn't allow, the system stopped it.

### Two observations worth your attention

Neither is a bug in the numbers, but both are worth knowing.

**1. `GET /api/money/balances` quietly ignores unrecognised inputs.**

I asked this endpoint for the balance "as of 6 July" and it returned
**today's** balance instead — without complaining. It has no date option at
all, so the request was silently discarded.

*Nothing in the app calls it that way today, so no current screen shows a
wrong number.* But it is the kind of thing that causes trouble later:
someone builds a screen, passes a date, gets a plausible-looking figure that
is quietly wrong. My recommendation is either to support the date option
there, or to reject unknown inputs rather than ignore them. The financial
summary already handles this correctly.

**2. The strict separation of duties is real and enforced.**

The Admin pays for stock, but only a Store Manager or Canteen Attendant can
*receive* it. This is proper accounting practice — the person who pays
should not be the person who confirms the goods arrived — and it is
genuinely enforced by the system, not just by the screens. Good.

---

## 9. What this does NOT prove

I would rather be straight with you about the limits than oversell this.

- **Screen coverage is now partial, not absent.** The Financials and
  Dashboard screens ARE checked end-to-end — real database, real API, real
  hooks, real components, asserting the text actually rendered
  (`screens-financials.sim.test.tsx`, `screens-dashboard.sim.test.tsx`, and
  `docs/UI_WALKTHROUGH.md` for checking it yourself in a browser). Other
  screens — Stock, Sales, Customers, Staff, Audit — are still covered only
  by mocked-hook specs, which prove they render what they are handed, not
  that what they are handed is correct.

- **Handovers are only lightly covered.** The simulation runs the day
  through to the handover step but does not yet exercise declaring and
  receiving cash with variances. **This is the most valuable next addition.**

- **Staff pay and attendance are not covered.** Monthly pay across a month
  boundary is untested by the simulation.

- **One business shape, not all of them.** Eight products, three locations,
  five staff. A different mix might behave differently.

- **Real-world messiness is not simulated.** Two people saving at the same
  moment, a lost connection halfway through a sale, a phone going flat
  mid-order.

- **It cannot prove the rules are the ones you want.** It proves the system
  does what it was designed to do, consistently and correctly. Whether the
  design matches how you actually want the business run is a judgement only
  you can make. For example, the system deliberately treats waste as
  *already inside* cost of goods rather than an extra cost on top. That is a
  decision (recorded as ADR-55), and the tests confirm it behaves that
  way — they cannot tell you it is the right decision for your business.

---

## 10. Where the files live

| File | What it is |
|---|---|
| `tests/simulation/shadow.ts` | The independent second set of books |
| `tests/simulation/scenario.ts` | The fake business — what happens each day |
| `tests/simulation/harness.ts` | Plumbing: logging in as each role, moving the clock |
| `tests/simulation/rng.ts` | Repeatable randomness |
| `tests/simulation/week-1.sim.test.ts` | 7-day checks |
| `tests/simulation/month-1.sim.test.ts` | 31-day checks |
| `tests/simulation/days-60.sim.test.ts` | 60-day checks |
| `tests/simulation/corrections.sim.test.ts` | Corrections, day-close, permissions |

The simulation uses its own database (`prosper_hotel_sim`). It cannot
touch your development data or the normal test suite.
