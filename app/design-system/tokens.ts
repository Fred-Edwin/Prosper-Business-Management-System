/**
 * Prosper — Design System Tokens (typed mirror of tokens.css)
 * ==========================================================================
 * A plain object mirroring app/design-system/tokens.css exactly, so TS code
 * and tests can reference a token by name and get its literal value.
 *
 * SOURCE OF TRUTH is tokens.css (the reconciliation table, owner-signed
 * 2026-08-27). This file MUST be kept in sync with it by hand — the values
 * below are the exact right-hand sides from tokens.css :root. tokens.css is
 * what the browser reads; this is a convenience for build-time/test code.
 *
 * A vitest guard (app/design-system/tokens.test.ts) parses tokens.css and
 * asserts every :root declaration appears here with the same value, so the
 * two cannot silently drift.
 */

export const tokens = {
  // --- Color: neutral ramp ---------------------------------------------------
  "--color-gray-50": "oklch(98.5% 0 0)",
  "--color-gray-100": "oklch(97% 0.002 247.8)",
  "--color-gray-200": "oklch(93.6% 0.005 258.3)",
  "--color-gray-300": "oklch(88.2% 0.009 264.5)",
  "--color-gray-400": "oklch(78.5% 0.014 262.4)",
  "--color-gray-500": "oklch(65.5% 0.021 263)",
  "--color-gray-600": "oklch(49.4% 0.025 261.7)",
  "--color-gray-700": "oklch(38.2% 0.020 262.6)",
  "--color-gray-800": "oklch(26.8% 0.010 260.7)",
  "--color-gray-900": "oklch(17.7% 0.009 264.3)",

  // --- Color: accent -------------------------------------------------------
  "--color-accent": "oklch(28% 0.126 296)",
  "--color-accent-hover": "oklch(39.2% 0.123 293.2)",
  "--color-danger-hover": "oklch(47% 0.190 21.2)",

  // --- Color: semantic status --------------------------------------------
  "--color-success": "oklch(52.8% 0.121 155)",
  "--color-success-bg": "oklch(52.8% 0.121 155 / 10%)",
  "--color-warning": "oklch(61.6% 0.130 70.8)",
  "--color-warning-bg": "oklch(61.6% 0.130 70.8 / 10%)",
  "--color-danger": "oklch(53.8% 0.190 21.2)",
  "--color-danger-bg": "oklch(53.8% 0.190 21.2 / 10%)",
  "--color-info": "oklch(53.7% 0.146 252.3)",
  "--color-info-bg": "oklch(53.7% 0.146 252.3 / 10%)",
  "--color-success-hover": "oklch(46% 0.121 155)",
  "--color-info-hover": "oklch(46.5% 0.146 252.3)",
  "--color-success-on-dark": "#43c07a",
  "--color-warning-on-dark": "#e5ac4c",
  "--color-danger-on-dark": "#f0736a",

  // --- Color: brand -----------------------------------------------------
  "--color-gold-brand": "oklch(68% 0.110 84.2)",

  // --- Color: semantic surfaces ---------------------------------------
  "--surface-page": "oklch(100% 0 0)",
  "--surface-subtle": "var(--color-gray-50)",
  "--surface-hover": "var(--color-gray-100)",
  "--surface-selected": "rgb(76 59 115 / 7%)",
  "--surface-active": "rgb(76 59 115 / 12%)",
  "--surface-raised": "oklch(93.3% 0.011 308.3)",
  // --surface-panel-tint retired in Session 11 (D2 / ADR-41) — use --surface-raised.

  // --- Color: semantic text -----------------------------------------------
  "--text-primary": "var(--color-gray-900)",
  "--text-secondary": "var(--color-gray-600)",
  "--text-tertiary": "var(--color-gray-500)",
  "--text-disabled": "var(--color-gray-400)",
  "--text-inverse": "var(--surface-page)",

  // --- Color: borders --------------------------------------------------
  "--border-subtle": "oklch(93.6% 0.005 258.3)",
  "--border-strong": "var(--color-gray-300)",

  // --- Color: dark-nav set -------------------------------------------------
  "--nav-bg": "oklch(20% 0.092 310)",
  "--nav-bg-active": "rgb(255 255 255 / 12%)",
  "--nav-bg-hover": "rgb(255 255 255 / 6%)",
  "--nav-bg-avatar": "rgb(0 0 0 / 18%)",
  "--nav-bg-chip": "rgb(255 255 255 / 8%)",
  "--nav-bg-divider-strong": "rgb(255 255 255 / 16%)",
  "--nav-text": "rgb(255 255 255 / 68%)",
  "--nav-text-active": "#ffffff",
  "--nav-text-label": "rgb(255 255 255 / 40%)",
  "--nav-text-subtle": "rgb(255 255 255 / 60%)",
  "--nav-text-strong": "rgb(255 255 255 / 85%)",
  "--nav-border": "rgb(255 255 255 / 10%)",

  // --- Typography: families -------------------------------------------
  "--font-ui": 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-mono": 'var(--font-geist-mono), "SF Mono", monospace',
  "--font-display": 'Newsreader, Georgia, "Times New Roman", serif',

  // --- Typography: scale ---------------------------------------------
  "--text-micro": "11px",
  "--leading-micro": "16px",
  "--text-caption": "12px",
  "--leading-caption": "16px",
  "--text-sm": "13px",
  "--leading-sm": "18px",
  "--text-body": "14px",
  "--leading-body": "20px",
  "--text-h3": "14px",
  "--leading-h3": "20px",
  "--text-h2": "16px",
  "--leading-h2": "24px",
  "--text-h1": "20px",
  "--leading-h1": "28px",
  "--text-display": "24px",
  "--leading-display": "32px",

  // --- Typography: weights ---------------------------------------------
  "--weight-regular": "400",
  "--weight-medium": "500",
  "--weight-semibold": "550",

  // --- Typography: tracking -------------------------------------------
  "--tracking-tight": "-0.01em",
  "--tracking-normal": "0",
  "--tracking-caps": "0.04em",

  // --- Spacing -------------------------------------------------------
  "--sp-1": "2px",
  "--sp-2": "4px",
  "--sp-3": "6px",
  "--sp-4": "8px",
  "--sp-5": "12px",
  "--sp-6": "16px",
  "--sp-7": "20px",
  "--sp-8": "24px",
  "--sp-9": "32px",
  "--sp-10": "40px",
  "--sp-11": "48px",
  "--sp-12": "64px",

  // --- Radius ------------------------------------------------------------
  "--radius-sm": "4px",
  "--radius-md": "6px",
  "--radius-lg": "8px",
  "--radius-full": "9999px",

  // --- Sizing: control heights ---------------------------------------
  "--control-sm": "32px",
  "--control-md": "36px",
  "--control-lg": "44px",

  // --- Sizing: icons ------------------------------------------------
  "--icon-sm": "14px",
  "--icon-md": "16px",
  "--icon-lg": "20px",
  "--icon-xl": "24px",

  // --- Sizing: misc -----------------------------------------------
  "--tap-min": "44px",
  "--content-max": "1200px",
  "--avatar-sm": "24px",
  "--avatar-md": "30px",
  "--nav-item-pad-inline": "10px",
  "--nav-item-radius": "var(--radius-sm)",

  // --- Borders --------------------------------------------------
  "--border-width-hairline": "1px",
  "--border-width-focus": "2px",

  // --- Elevation / shadow ---------------------------------------------
  "--shadow-sm": "0 1px 2px rgb(0 0 0 / 0.05)",
  "--shadow-md": "0 4px 12px rgb(0 0 0 / 0.08)",
  "--shadow-lg": "0 8px 24px rgb(0 0 0 / 0.12)",
  "--shadow-drawer": "-4px 0 16px rgb(0 0 0 / 0.1)",
  "--shadow-dialog": "0 12px 32px rgb(0 0 0 / 0.16)",

  // --- Z-index -------------------------------------------------
  "--z-base": "0",
  "--z-dropdown": "1000",
  "--z-sticky": "1100",
  "--z-overlay": "1200",
  "--z-drawer": "1300",
  "--z-dialog": "1400",
  "--z-toast": "1500",

  // --- Motion -----------------------------------------------------
  "--dur-fast": "120ms",
  "--dur-base": "200ms",
  "--dur-slow": "320ms",
  "--ease-standard": "cubic-bezier(0.2, 0, 0, 1)",
  "--ease-decelerate": "cubic-bezier(0, 0, 0, 1)",
  "--ease-accelerate": "cubic-bezier(0.4, 0, 1, 1)",

  // --- Opacity ------------------------------------------------
  "--opacity-disabled": "0.5",
  "--opacity-loading-label": "0.7",
  "--opacity-scrim": "0.3",

  // --- Breakpoints ------------------------------------------------
  "--bp-sm": "640px",
  "--bp-md": "768px",
  "--bp-lg": "1024px",
  "--bp-xl": "1280px",

  // --- Focus ----------------------------------------------------
  "--focus-ring-color": "var(--color-accent)",
  "--focus-ring-color-on-dark": "var(--nav-text-active)",
  "--focus-ring-width": "var(--border-width-focus)",
  "--focus-ring-offset": "2px",
} as const;

export type TokenName = keyof typeof tokens;

/** `token("--sp-6")` → `"var(--sp-6)"` — for inline styles / CSS-in-JS. */
export function token(name: TokenName): string {
  return `var(${name})`;
}

/** `tokenValue("--bp-md")` → `"768px"` — the literal, e.g. for `matchMedia`. */
export function tokenValue(name: TokenName): string {
  return tokens[name];
}

/** Breakpoint literals as numbers, for JS media-query logic. */
export const breakpoints = {
  sm: Number.parseInt(tokens["--bp-sm"], 10),
  md: Number.parseInt(tokens["--bp-md"], 10),
  lg: Number.parseInt(tokens["--bp-lg"], 10),
  xl: Number.parseInt(tokens["--bp-xl"], 10),
} as const;
