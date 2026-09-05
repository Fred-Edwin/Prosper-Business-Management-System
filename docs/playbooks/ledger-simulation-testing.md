# Playbook — Proving a Ledger System Is Correct

**A method for testing any system whose value is trustworthy numbers:**
accounting, inventory, payroll, billing, banking, point-of-sale, anything
that accumulates money or quantities over time.

Written after applying it to Prosper (a food-business management system) in
one session. It found no defects in the ledger logic and one latent API
weakness — but more usefully, it produced a permanent, re-runnable proof
that the numbers hold over 60 days.

This document is both a **guide for a human** and a **brief for an agent**.
If you are handing this to an agent, §11 is the copy-paste prompt.

---

## The problem

In a financial system, **a wrong number looks exactly like a right number.**
There is no crash, no error, no red text. It is discovered weeks later, when
the books do not reconcile and nobody can say which day went wrong.

Ordinary testing is weak here for two specific reasons:

1. **Tests are usually short.** A test sets up two or three days of data and
   checks a total. But the dangerous bugs — drift, double-counting across a
   correction, a boundary that only fails when crossing a month — need
   *accumulated* history to appear at all.

2. **Tests usually check the code against itself.** If the test computes the
   expected answer using the same helper the system uses, a bug is present on
   both sides and cancels out. The test passes and proves nothing.

This playbook is built to defeat both.

---

## The two core ideas

Everything else is mechanics. If you take only two things, take these.

### Idea 1 — Keep two independent sets of books

Write a **second ledger that shares no code with the system under test.**

It should be almost insultingly simple: plain addition and subtraction over
what the scenario *intended* to happen. No imports from the domain layer. No
clever abstractions. When the scenario sells 3 items at 60 each, the shadow
records `+180 revenue, +180 cash, −3 units`.

Then compare the two. **If they ever disagree, something is wrong.**

This is double-entry bookkeeping's own insight, applied to testing: a second
independent record, kept a different way, that must reconcile with the first.
A bug in the system cannot hide in the shadow, because the shadow does not
use the system's code.

> **Rule:** the shadow ledger imports nothing from the application's domain
> layer. If you find yourself importing a helper "just to format money",
> stop. Write the four lines yourself.

**Hold money as integers.** Not floats. `0.1 + 0.2 !== 0.3` in most
languages, and a test that carries its own rounding error is worse than no
test. Store cents as `bigint` (or your language's arbitrary-precision
integer) and format only at the boundary:

```ts
export function money(s: string): bigint { /* "1234.56" → 123456n */ }
export function fmtMoney(v: bigint): string { /* 123456n → "1234.56" */ }
```

### Idea 2 — Assert relationships, not remembered numbers

`expect(revenue).toBe("4200.00")` proves one number on one day. It also
breaks every time the fixture changes, so it gets updated rather than
investigated — and a test you routinely update to match reality is not a
test.

Assert instead the things that must be true **for any input**:

| Invariant | The claim |
|---|---|
| **Additivity** | Σ(daily reports) == the period report |
| **Telescoping** | `f(a..c) == f(a..b) + f(b+1..c)`, at *every* split |
| **Chain** | gross = revenue − cost; net = gross − expenses |
| **Conservation** | derived balance == Σ(all movements) |
| **Point-in-time** | a balance "as of" day N ignores everything after N |
| **Correction neutrality** | correcting X to Y moves totals by exactly Y−X |
| **Reordering** | same events, different order, same totals |

**Telescoping is the strongest of these.** Check it at every split point of
the period. If a single day is double-counted or dropped, exactly one split
fails, and the failing split names the day. It is a bisection search that
runs itself.

These invariants are also **self-maintaining**: they stay true as the
business logic evolves, so nobody has to update them, so nobody erodes them.

---

## The method, step by step

### Step 1 — Read the system before testing it

Find the ledger rules before writing a line. Specifically:

- **What is derived vs. stored?** (A stored total that should be derived is
  itself a bug — look for it.)
- **How are corrections modelled?** Overwrite, or append a delta? Append is
  correct; if this system overwrites, that is a finding.
- **What is the day boundary?** A fixed business timezone, or the server's
  local time? (Server-local is a bug waiting for a hosting migration.)
- **What money type?** Decimal, or float? Float is a defect, full stop.
- **Who may write what?** Role rules you will need to obey.

In Prosper these were documented as architecture decision records, which made
this fast. In an undocumented system, read the schema and the write paths.

### Step 2 — Test through the API, not the domain

Call the system the way the application calls it — through its HTTP handlers
or service boundary — not by reaching into the domain functions.

It is slower to set up, and it is worth it. Testing through the API also
proves **authentication, authorisation, input validation and ownership
checks**. In Prosper this immediately surfaced a genuine separation-of-duties
rule: the Admin may *pay* for stock, but only a Store Manager may *receive*
it. A domain-level test would have sailed straight past that.

You need a way to act as each role. Usually that means one mockable seam:

```ts
const mockSession = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(async () => mockSession.current),
}));
export function actAs(user: { id: string; role: Role }) {
  mockSession.current = { user, expires: "2999-01-01T00:00:00.000Z" };
}
```

### Step 3 — Move the clock, do not fake the dates

**This is the trick that makes long-horizon testing possible**, and it is
where most attempts go wrong.

A well-built ledger system will *refuse* to backdate. Prosper pins staff
writes to "today" so a cashier cannot backdate a sale to cover a shortfall.
That is a feature.

So do not pass fake dates, and above all **do not disable the guard**. Move
the clock instead:

```ts
export function setBusinessMoment(day: string, hhmm: string): void {
  vi.setSystemTime(new Date(`${day}T${hhmm}:00+03:00`));
}
```

Now the system genuinely believes it is that day. Every guard, every
permission check, every date rule runs **for real and passes honestly**.

> **The rule that keeps this trustworthy:** if a guard would have stopped a
> real user, it must stop the simulation too. The moment you add a
> `skipValidation` flag or a test-only bypass, your proof is worth nothing —
> you are testing a system that does not exist in production.

Times within a day matter too. Sequence them realistically (purchases at
08:00, sales at midday, close at 19:00) so ordering-dependent logic is
exercised, and so a handover lands after the sales it covers.

### Step 4 — Isolate the database completely

The simulation needs one continuous, single-threaded timeline. Give it its
own database.

Not the development database (it holds real work). Not the test database
(parallel test workers write into it and wipe it between runs). Its own.

Then check what your test infrastructure does behind your back. Prosper
routes each parallel test worker to a private schema; my simulation inherited
that routing and pointed at a schema that did not exist. The fix was an
explicit opt-out, **not** a weakening of the isolation everything else
depends on:

```ts
function testWorkerSchema(): string | undefined {
  const override = process.env.PRISMA_SCHEMA_OVERRIDE;   // sim lane only
  if (override) return override;
  const poolId = process.env.VITEST_POOL_ID;
  return poolId ? `test_worker_${poolId}` : undefined;
}
```

Run the simulation single-worker and sequentially. Suites that each reset and
rebuild a shared timeline must never overlap.

### Step 5 — Make the randomness repeatable

Vary the activity — order counts, payment methods, quantities — so the
simulation explores combinations you would not think to write by hand.

But seed it. A failure on day 43 is useless if it cannot be reproduced.

```ts
export class Rng {
  constructor(private state: number) {}
  next(): number { /* mulberry32 — deterministic */ }
}
```

Never `Math.random()`.

### Step 6 — Grow the horizon in stages

Do not start at 60 days. Debugging a 60-day failure is miserable; debugging
the same failure over 7 days is quick.

**One week → one month → sixty days.**

Each stage runs the identical invariant battery. Once the week is green, the
month usually passes first time, and the 60 days after it. Make sure the long
run crosses at least two month boundaries — that is where date bugs live.

### Step 7 — Attack corrections and permissions separately

The happy path proves arithmetic accumulates. A separate suite should attack
where financial systems actually break:

- Correcting a record moves the total by **exactly** the delta
- The original is **not** double-counted afterwards
- A closed period rejects **new** entries — from everyone, admin included
- A closed period still accepts an **admin correction** (the way back in)
- Users see only their own data
- Cost and margin fields never reach unprivileged roles
- **After all of that, re-run every earlier invariant** — corrections must
  not quietly break the totals

That last one matters most and is the one most often skipped.

### Step 8 — Close the gap to the screen

**This is the step most teams miss, and it is the one your users actually
see.**

Proving the server computes 5,400 does not prove the screen *shows* 5,400.
Between them sits formatting, filtering, caching, date-range defaults, and —
very often — a client-side re-implementation of a server-side rule.

Prosper had exactly that: a screen re-deriving a cost rule in JavaScript
floating-point that the server computed in exact decimals. Two
implementations of one formula. It had no test at all.

Typical screen tests mock the data layer, so they prove a screen renders what
it is handed — never that what it is handed is correct. Close the gap by
replacing **only** the network boundary and letting everything else run:

```ts
// real DB → real API handler → real hook → real component → assert TEXT
globalThis.fetch = async (input, init) => {
  const url = new URL(String(input), "http://sim");
  const mod = await routeFor(url.pathname);      // the real handler
  return mod[init?.method ?? "GET"](new Request(url, init));
};
```

Then assert on the text actually rendered. Include at least one test that
**changes a filter and checks the number changes** — that proves the control
genuinely filters rather than displaying the same figure regardless.

### Step 9 — Build a dataset a human can verify

Everything above is machines checking machines. Add one scenario with
deliberately round numbers that a person can check in their head:

```
Day 1  buy 100kg rice @150 = 15,000 cash
       sell 10 stew @200   =  2,000 cash
       rent                =  5,000 cash
Day 2  sell 5 stew @200 on credit = 1,000
       canteen: 30 sodas @60      = 1,800
...
Revenue  2,400 + 2,800 + 200 = 5,400
```

Then provide two things:

- a **loader** that writes this into a database and prints the expected
  figures
- a **walkthrough document** listing what each screen must show, and the
  arithmetic to check it against

Now a non-technical owner can verify the system personally. That is a
different and complementary kind of confidence from any automated test — and
it is often what actually persuades the person paying for the software.

---

## What "passing" looks like

From the Prosper run, for calibration:

| Horizon | Days | Checks |
|---|---|---|
| Week | 7 | 10 |
| Month | 31 | 10 |
| 60 days (2 month boundaries) | 60 | 10 |
| Corrections / close / permissions | 14 | 7 |
| Clean hand-checkable numbers | 3 | 4 |
| Screens end-to-end | 3 | 6 |
| **Total** | | **47** |

Volume in the 60-day run: 227 orders, 1,037 stock movements, 596 money
movements, 180 stock counts, 94 expenses. Runtime ~2.5 minutes.

**Keep it out of the default test command.** A 2.5-minute suite that people
skip is worse than a separate one they run deliberately. Give it its own
script (`pnpm test:sim`) and run it before releases and after any change to
ledger logic.

---

## Reading the failures

**Nearly every early failure will be your scenario's fault, not the
system's.** In this session, every single one was — a missing required field,
acting as the wrong role, misreading a response field name, trying to sell
stock that did not exist.

That is not wasted time. **A system that rejects your invalid test data is
demonstrating that it rejects invalid real data.** Log those as evidence, not
annoyance.

But do not let it dull you. When something fails, ask in this order:

1. Did the system reject it *correctly*? → fix the scenario, note the rule
2. Is the shadow's arithmetic wrong? → fix the shadow
3. Is the invariant itself wrong? → think harder about what must be true
4. **Only then:** is the system wrong? → you have found something

### The silent-failure trap

Watch for fallbacks that hide mistakes:

```ts
const revenue = money(count.saleValue ?? "0");   // WRONG
```

I wrote that. The field was actually `derivedSale.revenue`, so `saleValue`
was `undefined`, the fallback recorded zero, and the shadow *silently agreed
with itself* while the real revenue went unrecorded. It surfaced only because
a totals check disagreed.

Fail loudly instead:

```ts
if (!ds || ds.revenue == null) {
  throw new Error(`no derivedSale in response: ${JSON.stringify(count)}`);
}
```

**In test code, `??` and optional chaining on a value you are asserting
against are almost always bugs.** A test that defaults its way to green is
worse than a failing one.

---

## Common mistakes

| Mistake | Why it ruins the proof |
|---|---|
| Shadow imports the domain's helpers | Bug appears on both sides, cancels out |
| Floats for money | Test carries its own rounding error |
| Disabling a guard to make data load | You are testing a system that does not exist |
| `Math.random()` | Failures are not reproducible |
| Sharing the test database | Parallel workers corrupt the timeline |
| Starting at 60 days | Every failure is a slog to debug |
| Asserting remembered numbers | Brittle; gets "updated" rather than investigated |
| Only testing the happy path | Corrections are where these systems break |
| Stopping at the API | The screen may still show the wrong thing |
| `?? 0` in an assertion path | Silently passes while proving nothing |

---

## Honest limits

State these plainly wherever you report results. Overselling a test suite is
worse than a smaller honest one.

This method **does not** prove:

- **That the rules are the ones the business wants.** It proves the system
  does what it was designed to do, consistently. Whether the design is right
  is a human judgement.
- **Concurrency.** Two people saving simultaneously, a request dying halfway.
  Needs different tooling.
- **Every screen**, unless you extended step 8 to all of them. Say which.
- **Real-world data shapes.** One catalogue, one business size.
- **Performance at scale.** 60 days is not 5 years.

Write these into the report. A reader who knows the limits trusts the rest
more.

---

## Deliverables checklist

- [ ] `shadow.*` — independent ledger, zero domain imports, integer money
- [ ] `rng.*` — seeded, deterministic
- [ ] `harness.*` — role switching, clock control, API wrappers, DB reset
- [ ] `scenario.*` — a realistic day, sequenced by the hour
- [ ] Horizon suites — week, month, 60+ days, same invariants
- [ ] Corrections / permissions suite, ending by re-running the invariants
- [ ] Clean hand-checkable scenario + loader
- [ ] Screen suite — real DB through to rendered text
- [ ] Its own database and run script, outside the default test command
- [ ] **Report for the owner** in plain language, with real figures
      reconciled by hand and an explicit "what this does not prove"

---

## §11 — Brief for an agent

> Test the financial/ledger correctness of this system over a long horizon.
>
> **First, read** the schema and the write paths, and tell me: what is
> derived vs. stored, how corrections are modelled, what the day boundary is,
> what type money uses, and what the role rules are. Flag anything that looks
> wrong before writing tests.
>
> **Then build a simulation harness:**
>
> 1. A **shadow ledger** that imports nothing from the domain layer and
>    holds money as integer minor units. It is a second, independent set of
>    books.
> 2. Drive the system **through its API**, not its domain functions, so
>    auth, validation and permissions are exercised too.
> 3. **Move the system clock** to simulate each business day. Never disable
>    a date or permission guard — if a guard would stop a real user, it must
>    stop the simulation.
> 4. Use a **seeded PRNG**; no `Math.random()`.
> 5. Use a **dedicated database**, single worker, sequential.
>
> **Assert invariants, not remembered numbers:** additivity (daily sums ==
> period), telescoping at every split point, the profit chain, per-day
> balance conservation, point-in-time balances, correction deltas.
>
> **Grow the horizon:** one week → one month → 60+ days crossing two month
> boundaries. Same invariants at each stage.
>
> **Then, separately:** corrections (exact delta, no double-count), closed
> periods (reject new entries from everyone; still allow admin corrections),
> role scoping (no cross-user data, no cost/margin leakage) — and re-run
> every earlier invariant afterwards.
>
> **Then close the gap to the UI:** replace only the network boundary so
> real screens render from the real database through the real API, and
> assert the text actually displayed. Include a test that changes a filter
> and checks the number changes.
>
> **Finally:** build a clean round-numbers dataset a human can verify by
> hand, a loader for it, and a plain-language report with real figures and an
> explicit "what this does not prove" section.
>
> **Rules:** fix as you go; explain each fix in plain language. Never use
> `?? 0` or optional chaining in an assertion path — fail loudly instead.
> When something fails, first ask whether the system rejected it *correctly*.
> Report honestly: if you did not test something, say so.

---

## Why this works

Nothing here is novel. It is double-entry bookkeeping (two independent
records that must reconcile), property-based testing (assert relationships,
not examples), and simulation testing (long horizons, seeded randomness),
pointed at the part of a system where being wrong is most expensive and least
visible.

The reason it is worth the effort: at the end you can say, with evidence,
*"here is what was checked, here is how, here is what was not checked."*
That sentence is what makes numbers trustworthy — not the absence of known
bugs, but a stated and verifiable scope of proof.
