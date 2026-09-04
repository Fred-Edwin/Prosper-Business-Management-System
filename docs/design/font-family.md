# Type family — Inter → Geist (2026-09-04)

**Status:** Decided by the owner, implemented this session. Binding —
supersedes the "Inter" references in `design-principles.md` §1/§4.6/§6
(now updated; see §6a there).

## Decision

- `--font-ui`: Inter → **Geist Sans** (`geist/font/sans`)
- `--font-mono`: JetBrains Mono → **Geist Mono** (`geist/font/mono`)
- `--font-display` (Newsreader, login/splash only): unchanged, out of
  scope for this decision.
- Type scale, weights (400/500/550), and every spacing/radius token:
  unchanged. This is a family swap only, not a re-tune of the scale.

## Why

The owner found Inter generic for a top-tier enterprise SaaS look — it's
the default font of most Tailwind/shadcn starters, so a dense app built
in Inter alone doesn't read as deliberately designed. Requirements
considered:

- Must stay excellent at small sizes (11–13px is most of the admin UI,
  per §6) and dense tabular data — this is a finance/stock ledger app
  first.
- A single family had been doing UI text, headings, and labels with no
  pairing; the login screen already had a separate display serif
  (Newsreader) but the rest of the app was one-font.
- Wanted a face associated with current top-tier SaaS/dashboard product
  design, not a redesign of the whole visual language (color, density,
  layout are all separately approved and frozen — see §1/§2 of
  design-principles.md).

**Chosen: Geist Sans + Geist Mono** (Vercel's in-house family,
`geist` npm package). Reasoning:
- Purpose-built for dense product UI (Vercel's own dashboards, and
  widely adopted across current YC/B2B SaaS), so it reads as a deliberate
  "we chose this" pick rather than a starter-template default.
- Geist Mono replaces JetBrains Mono for the same reason the Ledger uses
  a monospace numeric font at all (design-principles.md §4.6) — tabular
  alignment — while now matching the sans family's design language
  instead of pairing with an unrelated mono face.
- One family covers both UI and numeric contexts, both variable fonts
  (100–900 weight range), so the existing 400/500/550 weight tokens work
  unchanged.
- Ships as a plain npm package with a Next.js `localFont` wrapper
  (`geist/font/sans`, `geist/font/mono`) — no Google Fonts network
  dependency, same loading model Inter had via `next/font/google`.

## What changed in code

- `app/layout.tsx` — `next/font/google` Inter import replaced with
  `geist/font/sans` + `geist/font/mono`; both variables applied on
  `<html>` (`GeistSans.variable`, `GeistMono.variable`).
- `app/design-system/tokens.css` + `app/design-system/tokens.ts` —
  `--font-ui` and `--font-mono` now reference `var(--font-geist-sans)` /
  `var(--font-geist-mono))` (the fixed CSS variable names the `geist`
  package emits) with the same system-font fallback stacks as before.
- `app/globals.css` — the `body` font-rendering comment updated to
  reference Geist instead of Inter (`font-synthesis`, `optical-sizing`
  reasoning still applies — Geist Sans is also a variable font with an
  `opsz` axis).
- `docs/design/design-principles.md` — §1, §4.6, §6 code block, plus a
  new §6a documenting this swap.

## Known follow-up (not done this session)

The Paper file ("Prosper Hotel", `01M0EZ7TAHZM26KBMWNYT0928X`) still
renders the old fonts — visual source of truth and code have diverged
on typography only. Re-sync Paper's font family the next time that file
is opened for design work, so future screenshots/exports don't
reintroduce Inter.
