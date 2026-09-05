# The measured-diff method (reference)

Not a session handoff. Each per-screen handoff in this folder inlines
what it needs; this file exists so the method has one canonical
explanation to point at.

Proven on `/admin/financials` v2 (M5 Session C) and `/admin` (Dashboard
mobile parity, 2026-09-05).

## Fast start — don't rediscover any of this

```
pnpm dev                      # http://localhost:3000, ready in ~1s
```
Sign in at `/login` as **Admin** / PIN **1234** (seeded in
`prisma/seed.ts`). Then resize to 390×844 and go to the screen.

- `pnpm dev` is already correct — don't probe whether a server is up
  with a bare `curl` first; on a cold compile it can hang past the tool
  timeout.
- Screenshot to an **absolute path inside the repo** and read it back
  from there; a bare filename lands somewhere you'll then have to hunt for.
- The seed's own rows are dated **today**, so unscoped "today" reads
  collide with them.
- The four gates at the end are **not** optional overhead — they're
  cheap (~3 min total) and catch the class of error that costs a whole
  follow-up session.

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

## Three traps that produce wrong numbers — read before measuring

These cost real time on the Dashboard session. They are not obvious and
you will not notice them from a screenshot.

1. **The admin shell mounts `children` TWICE** (desktop + mobile shells,
   M2 S6b). An unscoped `document.querySelector` usually finds the
   *hidden* mount and every measurement comes back `0`. Always find the
   visible one first:
   ```js
   const els = [...document.querySelectorAll(sel)];
   const visible = els.find(e => e.getBoundingClientRect().height > 0);
   ```
2. **`textContent` matches hidden elements.** A zone gated
   `hidden md:flex` still matches a text probe, so you will "find" a
   desktop-only element on mobile and report it as a bug. Confirm
   visibility by geometry (`getBoundingClientRect().height > 0`), never
   by text.
3. **The page's own scroll container is not `window`.** The body scrolls
   inside a `overflow-y: auto` div, so `window.scrollTo` does nothing.
   Find the scroller and set its `scrollTop`.

Reading the live screen through `browser_evaluate` + `getComputedStyle`
(rather than squinting at a screenshot) is the fastest way to get the
`from` half of the diff. Batch it: one call returning an object of
20+ probes beats 20 calls.

## The font is wider than Paper's

Paper artboards still show **Inter**; the app ships **Geist** (documented
in `app/globals.css` — not a token mismatch, don't "fix" it). Metrics
match closely enough to trust measurements, **but Geist Mono is
noticeably wider than Paper's JetBrains Mono at the same px.** Any large
mono figure that fits in the artboard may overflow or collide in the
build. When it does, check the artboard for whether that element exists
on mobile at all before shrinking it — on the Dashboard the answer was
that the 24px figure simply isn't in the mobile design.

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

## Responsive-scope every change

Desktop is signed off on these screens. Never fork a component into
mobile/desktop copies and never change a desktop value: express the
difference with `md:` variants from one markup
(`px-(--sp-6) md:px-(--sp-8)`), and where a number must differ per
viewport inside inline styles, swap a CSS var at the breakpoint
(`[--bar-scale:62px] md:[--bar-scale:84px]`) rather than branching.

Zone **order** differences are the same idea: `order-N md:order-none` on
each child of the body column reorders mobile while desktop renders from
the identical markup.

## Kit rules that override the artboard

- Compose from `components/kit/*`. Where a prop shape doesn't fit, write
  a thin mapper **in the screen file** — never fork the kit.
- **A shared kit component may be made responsive** (`md:` variants) when
  the mobile need is genuine and general — `<PageShell>`'s 16px mobile
  padding and `<SegmentedControl>`'s full-width segments were both done
  this way, with owner approval, and both benefit every mobile screen.
  That is not "forking the kit". Changing a *desktop* kit value is.
- If the artboard needs a pattern the kit has no answer for: **stop and
  ask the owner.** Do not invent one, do not add a kit component
  unprompted.
- If the artboard contradicts `docs/design/design-principles.md` §9
  (ENFORCED): §9 wins, and flag it.
