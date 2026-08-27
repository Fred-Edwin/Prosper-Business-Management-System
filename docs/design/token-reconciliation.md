# Token Reconciliation — Session 9

**Status:** SIGNED OFF (owner, 2026-08-27). Decisions: **D1** = yes
(tokenise raw nav values); **D2** = **(b)** opaque base with a subtle
purple tint — implemented as a single opaque `--surface-raised` token
(the veil color flattened over white), NOT a composite layer, never
see-through; `--surface-panel-tint` retired as an alpha fill; **D3** =
Storybook; **D4** = **keep full motion — NO `prefers-reduced-motion`
reduction block is added**. All proposed gap-row values approved as
listed. `tokens.css` + `tokens.ts` are now written from this table
verbatim.

**Purpose.** This is the single design sign-off for Session 9 (Design
System Codification). It reconciles three sources into one approved token
set, which then becomes `app/design-system/tokens.css` + `tokens.ts`
verbatim — no hand-picked numbers outside this table.

**Sources**

| Source | Role | Pulled |
|---|---|---|
| **Paper** — `get_tokens` / `get_computed_styles` on the "Prosper Hotel" file (`01M0EZ7TAHZM26KBMWNYT0928X`) | authoritative for **visual values** | 2026-08-27, `contentHash.tokens: 710ac1c5` |
| **Code** — `lib/tokens.css` `:root` + `design-principles.md §6` snapshot + kit class strings | authoritative for **what is already wired** | 2026-08-27 |
| **Gap proposals** — categories neither source has (z-index, motion, elevation, control sizing, opacity, breakpoints) | proposed here, derived from what was found | — |

**Decision legend**

- **✓ match → codify** — Paper, code and §6 agree; carried into `tokens.css` unchanged.
- **⚠ conflict → OWNER** — sources disagree; owner picks the value.
- **+ gap → OWNER SIGN-OFF** — no source has it; value proposed here, needs a yes.

---

## 0. Headline finding

**Paper's token set and `lib/tokens.css` are byte-identical** — same 71
tokens, same values, same `contentHash 710ac1c5` (unchanged since Sprint
05). `design-principles.md §6` is a faithful mirror of both. **There are
no value conflicts in the existing token set.** Every Tier-1 row below is
either **✓ match** (existing) or **+ gap** (missing category to add).

The two real questions for the owner are **structural, not numeric**:

1. **D2 — the drawer/dialog panel fill.** Confirmed in Paper:
   **every** panel (`6Q6-0` kit Edit Drawer, `6OH-0` kit Friction
   Dialog, `7S9-0` screen correction rail) uses
   `background-color: var(--surface-panel-tint)` — i.e. `#A690B838`,
   **38% alpha** — as its *only* fill. There is no opaque base layer
   anywhere. This is the "transparent modal" bug: content behind the
   panel shows through. **OWNER DECISION (D2 = b):** keep the intended
   subtle purple so the panel differs from the white body, but as a
   **single opaque token** — `--surface-raised: #EBE7EF` (the veil
   flattened over white). `--surface-panel-tint` retired. See §3 / ADR-41.
2. **D1 — one raw-value hygiene item.** Nav items across all screens use
   a raw `10px` inline padding and `4px` radius (consistent everywhere —
   `component-states.md §8` token-hygiene note). Not a conflict; a
   proposal to tokenise on rebuild (`--sp` has no 10px step; `4px` =
   `--radius-sm`). See row group F.

---

## 1. Tier-1 token table

### A. Color — primitives (gray + accent + semantic scales)

| token | Paper value | code value (`lib/tokens.css`) | spec value (§6) | decision |
|---|---|---|---|---|
| `--color-gray-50` | `oklch(98.5% 0 0)` | same | same | ✓ match → codify |
| `--color-gray-100` | `oklch(97% 0.002 247.8)` | same | same | ✓ match → codify |
| `--color-gray-200` | `oklch(93.6% 0.005 258.3)` | same | same | ✓ match → codify |
| `--color-gray-300` | `oklch(88.2% 0.009 264.5)` | same | same | ✓ match → codify |
| `--color-gray-400` | `oklch(78.5% 0.014 262.4)` | same | same | ✓ match → codify |
| `--color-gray-500` | `oklch(65.5% 0.021 263)` | same | same | ✓ match → codify |
| `--color-gray-600` | `oklch(49.4% 0.025 261.7)` | same | same | ✓ match → codify |
| `--color-gray-700` | `oklch(38.2% 0.020 262.6)` | same | same | ✓ match → codify |
| `--color-gray-800` | `oklch(26.8% 0.010 260.7)` | same | same | ✓ match → codify |
| `--color-gray-900` | `oklch(17.7% 0.009 264.3)` | same | same | ✓ match → codify |
| `--color-accent` | `oklch(28% 0.126 296)` | same | same | ✓ match → codify |
| `--color-accent-hover` | `oklch(39.2% 0.123 293.2)` | same | same | ✓ match → codify |
| `--color-success` | `oklch(52.8% 0.121 155)` | same | same | ✓ match → codify |
| `--color-success-bg` | `oklch(52.8% 0.121 155 / 10%)` | same | same | ✓ match → codify |
| `--color-warning` | `oklch(61.6% 0.130 70.8)` | same | same | ✓ match → codify |
| `--color-warning-bg` | `oklch(61.6% 0.130 70.8 / 10%)` | same | same | ✓ match → codify |
| `--color-danger` | `oklch(53.8% 0.190 21.2)` | same | same | ✓ match → codify |
| `--color-danger-bg` | `oklch(53.8% 0.190 21.2 / 10%)` | same | same | ✓ match → codify |
| `--color-info` | `oklch(53.7% 0.146 252.3)` | same | same | ✓ match → codify |
| `--color-info-bg` | `oklch(53.7% 0.146 252.3 / 10%)` | same | same | ✓ match → codify |
| `--color-gold-brand` | `oklch(68% 0.110 84.2)` | same | same | ✓ match → codify (masthead-only) |
| **`--color-danger-hover`** | — | — (§9.5 uses `filter: brightness(0.92)` fallback) | — | **+ gap → OWNER.** Proposed `oklch(47% 0.190 21.2)` — one lightness step below `--color-danger`, mirroring how `--color-accent-hover` sits below `--color-accent`. Replaces the `filter` fallback so destructive-button hover is a real token (handoff §D1 / §3c Button). |

### B. Color — semantic surfaces & text

| token | Paper value | code value | spec value (§6) | decision |
|---|---|---|---|---|
| `--surface-page` | `oklch(100% 0 0)` | same | same | ✓ match → codify |
| `--surface-subtle` | `var(--color-gray-50)` | same | same | ✓ match → codify |
| `--surface-hover` | `var(--color-gray-100)` | same | same | ✓ match → codify |
| `--surface-selected` | `rgb(76 59 115 / 7%)` | same | same | ✓ match → codify |
| **`--surface-active`** (pressed) | — | — (§9.6 "same visual as hover") | — | **+ gap → OWNER.** Proposed `rgb(76 59 115 / 12%)` — one step darker than `--surface-selected`, for the pressed tint on rows/tiles where §9.6 wants a distinct-but-subtle press. If owner prefers §9.6 literally ("identical to hover"), we alias `--surface-active: var(--surface-hover)` and add no new value. |
| **`--surface-raised`** (opaque drawer/dialog panel) | — | — | — | **+ gap → SIGNED (D2 = b).** `#EBE7EF` — the retired `--surface-panel-tint` (`#A690B8` @ 38%) flattened over white, so the panel is a **single opaque pale-lavender fill**, visibly distinct from the `#FFF` body, never see-through. Expressed in `tokens.css` as OKLCH (`oklch(93.2% 0.009 305)`, exact conversion pinned at write time). The drawer/dialog/bottom-sheet panel background. Tunable in Storybook. |
| `--surface-panel-tint` | `#A690B838` (38% alpha) | same | same | **RETIRED (D2 = b).** Removed from the token set — it was only ever used as a panel fill, which is the bug. Replaced by the opaque `--surface-raised`. The §6 raw-hex exception list drops from two entries to one (`--color-gold-brand` only). |
| `--text-primary` | `var(--color-gray-900)` | same | same | ✓ match → codify |
| `--text-secondary` | `var(--color-gray-600)` | same | same | ✓ match → codify |
| `--text-tertiary` | `var(--color-gray-500)` | same | same | ✓ match → codify |
| `--text-disabled` | `var(--color-gray-400)` | same | same | ✓ match → codify |
| **`--text-inverse`** | — | `#FFFFFF` used raw on primary/destructive button labels | — | **+ gap → OWNER.** Proposed `var(--surface-page)` (white) — the label color on filled accent / danger / dark-nav surfaces, so button components stop hard-coding `#fff` / `text-white`. |
| `--border-subtle` | `oklch(93.6% 0.005 258.3)` | same | same | ✓ match → codify |
| `--border-strong` | `var(--color-gray-300)` | same | same | ✓ match → codify |

### C. Color — dark-nav set

All twelve `--nav-*` tokens (`--nav-bg`, `--nav-bg-active`,
`--nav-bg-hover`, `--nav-bg-avatar`, `--nav-bg-chip`,
`--nav-bg-divider-strong`, `--nav-text`, `--nav-text-active`,
`--nav-text-label`, `--nav-text-subtle`, `--nav-text-strong`,
`--nav-border`): **Paper = code = §6, all ✓ match → codify.** (Values in
`design-principles.md §6`; not re-listed here.)

### D. Typography

| token | Paper | code | §6 | decision |
|---|---|---|---|---|
| `--font-ui` | `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | same | same | ✓ match → codify |
| `--font-mono` | `"JetBrains Mono", "SF Mono", monospace` | same | same | ✓ match → codify |
| `--font-display` | *(not a Paper token)* | `var(--font-display)` in `globals.css` `@theme` — Newsreader, login only | — | ✓ keep as-is (documented single-screen exception, not system-wide) |
| `--text-micro … --text-display` (8 steps) + paired `--leading-*` | all present, match | same | same | ✓ match → codify (11/12/13/14/14/16/20/24 px; leadings 16/16/18/20/20/24/28/32) |
| `--weight-regular / -medium / -semibold` | `400 / 500 / 600` | same | same | ✓ match → codify |
| **`--tracking-tight` / `--tracking-normal` / `--tracking-caps`** | Paper defines **no** `letterSpacing` tokens (confirmed: `get_tokens` returns none) | — | — | **+ gap → OWNER.** House style (`ENTERPRISE_UI §…` / Paper guide) wants tighter tracking on large type, open on small caps. Proposed: `--tracking-tight: -0.01em` (display / h1), `--tracking-normal: 0` (body — default), `--tracking-caps: 0.04em` (micro / all-caps labels e.g. nav group headers). Low-risk; purely additive. If owner prefers "no tracking system", we omit all three and set nothing. |
| `font-synthesis: none` | — | — | — | **+ gap → OWNER.** Recommended global rule (not a token) in the reset, so faux-bold/italic never render. |

### E. Spacing

| token | Paper | code | §6 | decision |
|---|---|---|---|---|
| `--sp-1 … --sp-12` (2/4/6/8/12/16/20/24/32/40/48/64) | all present, match | same | same | ✓ match → codify |

### F. Sizing (control heights, icons, tap target, content width) — **all gaps**

| token | evidence found | decision |
|---|---|---|
| **`--control-sm: 32px`** | pills (`6JM-0` 32px), icon buttons (32×32), stepper buttons | **+ gap → OWNER.** Codify the three ad-hoc control heights. |
| **`--control-md: 36px`** | primary button `6BW-0` = `36px`; tabs `36px`; select/segmented `36px` | **+ gap → OWNER** |
| **`--control-lg: 44px`** | staff-shell touch targets; sticky action bar buttons | **+ gap → OWNER** |
| **`--icon-sm: 14px`** | `Sign out` nav icon `7PK-0` = 14×14; inline spinner §9.10 = 14px | **+ gap → OWNER** |
| **`--icon-md: 16px`** | content icons (drawer ×, nav item icons) = 16×16 (Lucide, §5) | **+ gap → OWNER** |
| **`--icon-lg: 20px`** | nav rail icons at 20px per house guide (§5) | **+ gap → OWNER** |
| **`--icon-xl: 24px`** | empty/error-state illustration icons | **+ gap → OWNER** |
| **`--tap-min: 44px`** | WCAG 2.5.5 / staff one-handed use | **+ gap → OWNER** (recommended) |
| **`--content-max: 1200px`** | admin `Body` frame `7LK-0` = `1200px`; the "stock body doesn't fill viewport" bug is screens hand-rolling this | **+ gap → OWNER.** Powers the new `<PageShell>`. |
| **`--nav-item-pad-inline: 10px`** + **`--nav-item-radius: 4px`** | raw `10px` / `4px` on every nav item, all screens (`component-states.md §8` hygiene note) | **+ gap → OWNER.** Tokenise the consistent raw values; `4px` can just alias `--radius-sm`. |
| avatar sizes (`--avatar-sm: 24px` / `--avatar-md: 30px`) | sidebar footer avatar `7PS-0` = 30×30; table attribution has no avatar (§4.2) | **+ gap → OWNER** (minor; include for completeness) |

### G. Radii

| token | Paper | code | §6 | decision |
|---|---|---|---|---|
| `--radius-sm: 4px` | `4px` | same | same | ✓ match → codify (dense controls; primary button uses this) |
| `--radius-md: 6px` | `6px` | same | same | ✓ match → codify (default; drawer/dialog panels) |
| `--radius-lg: 8px` | `8px` | same | same | ✓ match → codify (max; status chips, pills) |
| tables = `0px` | (applied inline in table components) | same | §4.1 | ✓ keep as the documented rule (not a token) |
| **`--radius-full: 9999px`** | toggle knob, avatar, status dot | — | — | **+ gap → OWNER.** Codify the pill/circle radius. |

### H. Borders — **gaps**

| token | evidence | decision |
|---|---|---|
| **`--border-width-hairline: 1px`** | every divider / field / panel border = `1px solid` | **+ gap → OWNER** |
| **`--border-width-focus: 2px`** | §9.1 focus ring = `2px`; active tab underline = `2px` | **+ gap → OWNER** |

### I. Elevation / shadow — **all gaps** (Paper draws none)

Paper's house style forbids shadows on **content containers** (§1), and
`get_computed_styles` on the drawer/dialog panels returns **no
`box-shadow`**. But an overlay panel floating above a blurred scrim needs
*some* separation, and §4.5 explicitly allows "a subtle shadow lift" on
small controls (segmented control active segment). Proposed minimal
ladder:

| token | proposed value | use | decision |
|---|---|---|---|
| **`--shadow-sm`** | `0 1px 2px rgb(0 0 0 / 0.05)` | segmented-control active segment (§4.5), select/date popover | **+ gap → OWNER** |
| **`--shadow-md`** | `0 4px 12px rgb(0 0 0 / 0.08)` | dropdown menus, bottom-sheet peek | **+ gap → OWNER** |
| **`--shadow-lg`** | `0 8px 24px rgb(0 0 0 / 0.12)` | — (reserve) | **+ gap → OWNER** |
| **`--shadow-drawer`** | `-4px 0 16px rgb(0 0 0 / 0.10)` (rail slides from right) | `Drawer` panel + rail | **+ gap → OWNER** |
| **`--shadow-dialog`** | `0 12px 32px rgb(0 0 0 / 0.16)` | `FrictionDeleteDialog`, centered modals | **+ gap → OWNER** |

If the owner wants **zero shadows even on overlays** (strict house
reading), the fallback is: scrim blur + `1px` border does all the
separation, and only `--shadow-sm` (for §4.5's explicitly-permitted
segmented lift) is added. Flagging both.

### J. Z-index — **all gaps** (this is what lets overlays stop fighting)

| token | proposed | decision |
|---|---|---|
| **`--z-base: 0`** | default | **+ gap → OWNER** |
| **`--z-dropdown: 1000`** | select / date popover | **+ gap → OWNER** |
| **`--z-sticky: 1100`** | sticky table header, sticky footer, sticky action bar | **+ gap → OWNER** |
| **`--z-overlay: 1200`** | `.kit-scrim` backdrop | **+ gap → OWNER** |
| **`--z-drawer: 1300`** | `Drawer` panel / rail (above its scrim) | **+ gap → OWNER** |
| **`--z-dialog: 1400`** | `FrictionDeleteDialog` / `BottomSheet` panel | **+ gap → OWNER** |
| **`--z-toast: 1500`** | `Toast` / `Notifier` (above everything) | **+ gap → OWNER** |

Recommended as-is — standard 100-step scale with generous gaps, matches
the handoff's proposed numbers exactly.

### K. Motion — **all gaps** (values dictated by §9.9)

| token | proposed | source | decision |
|---|---|---|---|
| **`--dur-fast: 120ms`** | §9.9 verbatim ("`background-color 120ms ease`…") | §9.9 | **+ gap → OWNER** |
| **`--dur-base: 200ms`** | §9.9 verbatim ("drawer / bottom-sheet slide … `transform 200ms ease`") | §9.9 | **+ gap → OWNER** |
| **`--dur-slow: 320ms`** | toast auto-dismiss travel, larger sheet transitions | proposed | **+ gap → OWNER** |
| **`--ease-standard: cubic-bezier(0.2, 0, 0, 1)`** | general | proposed (no bounce/spring — §1) | **+ gap → OWNER** |
| **`--ease-decelerate: cubic-bezier(0, 0, 0, 1)`** | enter (drawer slide-in) | proposed | **+ gap → OWNER** |
| **`--ease-accelerate: cubic-bezier(0.4, 0, 1, 1)`** | exit (drawer slide-out) | proposed | **+ gap → OWNER** |
| `.kit-interactive` transition **allow-list** | `background-color`, `border-color`, `opacity`, `transform` **only** — never layout props, never `outline` | §9.9 | encoded in `globals.css`, not a token — **confirm rule** |

### L. Opacity — **all gaps** (values from §9.7 / §9.10)

| token | proposed | source | decision |
|---|---|---|---|
| **`--opacity-disabled: 0.5`** | §9.7 verbatim | §9.7 | **+ gap → OWNER** |
| **`--opacity-loading-label: 0.7`** | §9.10 verbatim ("dims its label to `opacity: 0.7`") | §9.10 | **+ gap → OWNER** |
| **`--opacity-scrim: 0.3`** | `.kit-scrim` `rgb(0 0 0 / 0.3)` | handoff §D2 / Deliverable 2 | **+ gap → OWNER** |

### M. Breakpoints — **all gaps** (Paper defines none as tokens)

| token | proposed | decision |
|---|---|---|
| **`--bp-sm: 640px`** | **+ gap → OWNER** |
| **`--bp-md: 768px`** | **+ gap → OWNER** — the mobile-card ↔ desktop-table swap point (catalog, stock use `md:` today) |
| **`--bp-lg: 1024px`** | **+ gap → OWNER** |
| **`--bp-xl: 1280px`** | **+ gap → OWNER** |

**Layout-swap map** (documentation, lives beside the tokens):

| screen | at `< md` | at `≥ md` |
|---|---|---|
| `/admin/catalog` | mobile product cards | desktop `SimpleTable` |
| `/admin/stock` | mobile summary cards (`8Q4-0`) | `DenseLedger` full ledger (`798-0`) |
| `/admin/financials` | *(M1: desktop only — no mobile artboard)* | full table |
| staff hubs / stock-levels | single-column (only layout) | — |

*(CSS custom properties can't be used in `@media` queries directly; these
`--bp-*` are documented constants + the `tokens.ts` mirror is the value
source for any JS matchMedia. Tailwind's own breakpoints stay the
mechanism in class strings.)*

### N. Focus (rule params — mostly encoded in `globals.css`, listed for completeness)

| item | value | source | decision |
|---|---|---|---|
| ring color (light) | `var(--color-accent)` | §9.1 | ✓ |
| ring color (on dark nav) | `var(--nav-text-active)` (white) | §9.1 | ✓ |
| ring width | `var(--border-width-focus)` = `2px` | §9.1 | ✓ (depends on H) |
| ring offset | `2px` | §9.1 | ✓ |
| trigger | `:focus-visible` only; **never** transitioned | §9.1 | ✓ rule |

### O. Reduced motion

**OWNER DECISION (D4): NOT added.** No `@media (prefers-reduced-motion:
reduce)` block is written this session. Transitions (§9.9) and the
no-bounce stance (§1) are unchanged. The one pre-existing rule —
`.kit-skeleton { animation: none }` under reduced-motion — is kept as an
accessibility floor and is *not* extended to other elements. See §5-note.

---

## 2. Summary counts

| | count |
|---|---|
| ✓ match → codify (existing, no change) | ~71 |
| ⚠ conflict → OWNER | **0 numeric** — 1 structural (`--surface-panel-tint` *usage*, = D2) |
| + gap → OWNER SIGN-OFF (new categories) | ~55 across sizing / elevation / z-index / motion / opacity / breakpoints / 4 semantic colors / tracking |

The existing design system is **internally consistent** — Paper, code and
spec agree. Session 9's token work is **codifying what exists + adding the
6 missing categories**, not resolving drift.

---

## 3. D2 — Drawer / dialog panel: opaque vs translucent

**The bug.** `get_computed_styles` on all three panel nodes:

| node | what it is | `background-color` |
|---|---|---|
| `6Q6-0` | kit "Edit Drawer" (`6OE-0` artboard) | `var(--surface-panel-tint)` → `#A690B838` (**38% alpha**) |
| `6OH-0` | kit "Friction Delete Dialog — Default" | `var(--surface-panel-tint)` (**38% alpha**) |
| `7S9-0` | screen "Drawer Panel" (correction rail, `7LJ-0`) | `var(--surface-panel-tint)` (**38% alpha**) |

No opaque base layer underneath any of them. The panel *is* the 38%
veil, so ledger rows / page content read straight through it. This is
exactly the "transparent modal" the owner reported.

**Option (a) — opaque panel. RECOMMENDED.**
Panel `background: var(--surface-raised)` (= `var(--surface-page)`, pure
white). `--surface-panel-tint` is **retired** (removed from the token
set; the two documented raw-hex exceptions in §6 drop to one —
`--color-gold-brand`). The blurred `.kit-scrim` behind the panel does all
the "floating above the page" work. This is how shadcn/Radix, macOS
sheets, and every mature design system do it: **opaque surface + blurred
dimmed backdrop.** Least code, kills the bug outright, matches §1's
"no glassmorphism".

**Option (b) — translucent veil over an opaque base.**
Keep `--surface-panel-tint` but composite it: panel is
`background: var(--surface-page)` with a `::before` or inner layer at
`--surface-panel-tint`, so the panel is opaque but tinted lavender.
Only justified if the owner wants the frosted look *on purpose*. Paper
shows no evidence of that intent — it's the same flat 38% fill on every
panel, which reads as a mistake, not a designed frost. More code, more
fragile (the tint math has to stay right over every possible panel
content).

**→ OWNER DECISION: (b), simplified.** The panel gets a *subtle purple*
so it differentiates from the white body — but implemented as a **single
opaque token** (`--surface-raised: #EBE7EF`, the veil color flattened
over white), not a composite base+veil. Opaque, one fill, never
see-through. `--surface-panel-tint` is retired. ADR-41.

---

## 4. D1 / D3 / D4 — the other three decisions

- **D1 (token conflicts).** None numeric. The only hygiene item is the
  raw `10px` / `4px` on nav items (row group F) — proposed as
  `--nav-item-pad-inline` / alias `--radius-sm`. Owner: OK to tokenise?
- **D3 (Storybook as a dependency).** **OWNER: Storybook.** ~40
  dev-deps; brings `@storybook/addon-a11y` (axe) + `@storybook/test-runner`
  (Playwright visual + a11y gates) for free — Deliverable 4 leans on
  both. ADR-42.
- **D4 (`prefers-reduced-motion`).** **OWNER: do NOT reduce motion.** No
  `prefers-reduced-motion` block is added this session. The product's
  motion stance (§9.9 transitions kept; §1 no-bounce) is unchanged. The
  single pre-existing `.kit-skeleton { animation: none }` reduced-motion
  rule stays as an accessibility floor (see §5-note) — it is not
  extended.

---

## Sign-off — SIGNED 2026-08-27

- [x] **D1** — **yes**, tokenise the raw `10px` / `4px` nav-item values.
- [x] **D2** — **(b)** opaque base with a subtle purple tint. Implemented
  as one opaque `--surface-raised` token (`#EBE7EF`, the veil flattened
  over white), not a composite layer; `--surface-panel-tint` retired.
  ADR-41.
- [x] **D3** — **Storybook**. ADR-42.
- [x] **D4** — **keep full motion**. No `prefers-reduced-motion` block is
  added this session. (The one pre-existing exception —
  `.kit-skeleton { animation: none }` under reduced-motion in
  `globals.css` — see §5 for its disposition.)
- [x] **Gap rows** — all proposed values approved. Owner direction:
  "fill the gaps with best practice." Applied per §5.
- [x] Table approved → `tokens.css` + `tokens.ts` written from it verbatim.

## 5. Gap-row values — best-practice basis (owner: "fill with best practice")

Every added token below is justified, not guessed. Comments in
`tokens.css` carry the one-line rationale; the fuller basis:

| category | basis | notes |
|---|---|---|
| **Control heights** (`--control-sm/md/lg` 32/36/44) | measured from Paper (`6BW-0` primary button = 36; pills = 32; staff touch targets = 44) | not invented — these are the three heights already in use, now named |
| **Icon sizes** (14/16/20/24) | Lucide's native 24px viewbox rendered at the house-guide sizes (§5: "16px content / 20px nav"); 14 = the §9.10 inline-spinner size; 24 = empty/error illustration | standard 4px-step icon ramp |
| **`--tap-min: 44px`** | WCAG 2.5.5 Target Size (Enhanced) / Apple HIG 44pt / Material 48dp → 44 is the common floor | staff shell is one-handed, mobile-first — non-negotiable |
| **`--content-max: 1200px`** | Paper admin `Body` frame = 1200px exactly | powers `<PageShell>`; kills the "stock body doesn't fill viewport" divergence |
| **`--radius-full: 9999px`** | universal pill/circle idiom | — |
| **Border widths** (hairline 1 / focus 2) | every Paper divider = 1px; §9.1 ring = 2px | — |
| **Elevation ladder** | house rule §1: **no shadow on content containers**. Shadows only where an element genuinely floats above the page: `--shadow-sm` = §4.5's explicitly-permitted segmented-control lift + dropdown/select popovers; `--shadow-md` = menus / bottom-sheet peek; `--shadow-drawer` / `--shadow-dialog` = overlay panels above the scrim. Values are conventional soft-ambient (low-alpha black, no spread, downward offset; drawer offsets leftward as it enters from the right edge). `--shadow-lg` reserved. | a strict-house reader could drop everything but `--shadow-sm`; kept the overlay shadows because an opaque panel on a blurred scrim still needs edge separation — standard practice (macOS sheets, Radix Dialog) |
| **Z-index scale** (1000→1500, 100-step) | standard layered-UI convention with generous gaps so future intermediates fit; ordering dropdown < sticky < scrim < drawer < dialog < toast is the WAI-ARIA / common-sense stack | matches the handoff's proposed numbers exactly |
| **Motion durations** (`--dur-fast 120` / `--dur-base 200` / `--dur-slow 320`) | 120 and 200 are **verbatim from §9.9**; 320 for toast travel / larger sheets follows the ~1.6× ratio | Material's 100–400 "productive" band |
| **Easing curves** | `--ease-standard` `cubic-bezier(0.2,0,0,1)` (Material "standard"), `--ease-decelerate` for enter, `--ease-accelerate` for exit. **No overshoot / spring** — §1 forbids bounce. | — |
| **Opacity** (`--opacity-disabled 0.5` / `--opacity-loading-label 0.7` / `--opacity-scrim 0.3`) | first two **verbatim from §9.7 / §9.10**; scrim 0.3 = the handoff's `.kit-scrim` spec, and a common dim level (Radix overlay ≈ 0.4, Material scrim ≈ 0.32) | — |
| **Breakpoints** (640/768/1024/1280) | **exactly Tailwind v4's `sm/md/lg/xl` defaults** — so `--bp-*` constants and the `md:` class strings the screens already use can never disagree | `--bp-md` (768) is the mobile-card ↔ desktop-table swap point |
| **Tracking** (`--tracking-tight -0.01em` / `normal 0` / `caps 0.04em`) | Paper guide + house style: tighter on large display type, open on small all-caps labels; −0.01em is a restrained tightening (not the −0.02/−0.03 of marketing display), 0.04em opens the 11px nav-group caps | applied to display/h1 and micro/all-caps only; body stays at 0 |
| **`--surface-active: rgb(76 59 115 / 12%)`** | one step past `--surface-selected` (7%) for the pressed tint §9.6 wants distinct from hover; 12% is a perceptible-but-quiet bump | if it ever reads as too much, alias to `--surface-hover` |
| **`--color-danger-hover`** `oklch(47% 0.190 21.2)` | −6.8% L from `--color-danger` (53.8%), mirroring `--color-accent-hover`'s −11.2% relationship scaled for the smaller danger range; replaces §9.5's `filter: brightness(0.92)` fallback with a real token | — |
| **`--text-inverse: var(--surface-page)`** | white — the label color on filled accent/danger/dark-nav; stops components hard-coding `#fff` | — |
| **`--nav-item-pad-inline: 10px`** / **`--nav-item-radius`** → alias `--radius-sm` | tokenising the consistent raw values (D1); 10px has no `--sp` step so it gets its own name; 4px *is* `--radius-sm` so it aliases | — |
| **Avatar sizes** (`--avatar-sm 24` / `--avatar-md 30`) | sidebar footer avatar measured at 30; 24 for denser contexts | minor, included for completeness |

### §5-note — the pre-existing `.kit-skeleton` reduced-motion exception

`globals.css` today has:
```css
@media (prefers-reduced-motion: reduce) { .kit-skeleton { animation: none; } }
```
D4 says "don't reduce motion", but this specific rule is an
**accessibility floor** (a looping shimmer can trigger vestibular
discomfort / distract AT users) and is orthogonal to the product's
"no bounce, keep transitions" motion stance. **Disposition: keep it.**
It is the *only* `prefers-reduced-motion` rule in the codebase; no
broader block is added. If the owner wants it gone too, it's a one-line
delete — flag on review.

---

ADR-41 (D2 — panel opacity) and ADR-42 (D3 — Storybook) written into
`DECISIONS.md`.
