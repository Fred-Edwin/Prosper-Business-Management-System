# The measured-diff method (reference)

Not a session handoff. Each per-screen handoff in this folder inlines
what it needs; this file exists so the method has one canonical
explanation to point at.

Proven on `/admin/financials` v2 (M5 Session C), which is the only mobile
screen currently built this way.

## The one rule

**Screenshots judge the result. They never source a value.**
(`docs/CONVENTIONS.md` §6 — the rule that scrapped the Sprint 06 export.)

Every number in the code comes from `get_computed_styles`. A screenshot
is used once, at the end, to check the composed result looks right.

## Why it works here

Paper's tokens and `app/globals.css` are **identical** — same names, same
values (`--sp-6: 16px`, `--text-micro: 11px`, `--color-danger-bg`, …).
So translation is mechanical, not interpretive: you are not converting a
hex to a token, the artboard already speaks in tokens.

If they ever diverge, **stop and report** rather than inventing a mapping.

## The four calls, in order

1. **`open_file`** → returns the token list. Confirm it matches
   `globals.css`.
2. **`get_tree_summary(artboard, depth: 5)`** → the artboard as a named
   tree. This shows things a picture cannot. Example from Financials: the
   active KPI tile's accent rule is a 2px absolutely-positioned
   `Rectangle` child, not a border. You cannot see that difference in an
   image, and it changes the markup.
3. **`get_computed_styles([...many node ids])`** → one batched call.
   This is where every value comes from.
4. **`get_screenshot(artboard)`** → only to judge the finished result.

## What to pull, specifically

Padding, gap, font-size/line-height/weight/letter-spacing, colour token,
border width + colour, radius — and above all:

**`flexGrow` / flex ratios.** These are the highest-value thing the call
returns and the least visible in a picture. Financials' Debts table is
`1.6 / 1 / 1`; its Non-Sale table is
`0.9 / 1.3 / 1 / 0.7 / 1.1 / 1.2 / 0.9`. Column alignment lives entirely
in those numbers. Guessing them is what makes a rebuild look "close but
off" with no identifiable cause.

## Desktop and mobile are two designs

Never derive one from the other. Financials' real differences:

| | desktop | mobile |
|---|---|---|
| tile padding | `14px / 18px` | `12px / 14px` |
| tile gap | `4px` | `3px` |
| KPI layout | 6 across | 2×3 grid |
| body gap | `20px` | `16px` |

## Kit rules that override the artboard

- Compose from `components/kit/*`. Where a prop shape doesn't fit, write
  a thin mapper **in the screen file** — never fork the kit.
- If the artboard needs a pattern the kit has no answer for: **stop and
  ask the owner.** Do not invent one, do not add a kit component
  unprompted.
- If the artboard contradicts `docs/design/design-principles.md` §9
  (ENFORCED): §9 wins, and flag it.
