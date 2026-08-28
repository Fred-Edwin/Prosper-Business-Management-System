import type { StorybookConfig } from "@storybook/nextjs-vite";

/**
 * Prosper component-kit Storybook (Session 10b, Deliverable 4).
 *
 * This is the permanent proof harness for `components/kit/*` + the four
 * primitives — one story per state per component, visual-regression
 * baselines, and axe a11y gates. It builds no feature screens and imports
 * no `app/**` route code; only the kit, the tokens, and `globals.css`.
 *
 * Storybook 9.1.x on `@storybook/nextjs-vite` (Vite builder). The handoff
 * said "v8", but its own mandated SB8 ↔ Next 16 compat check fails —
 * `@storybook/experimental-nextjs-vite@8.6.x` declares `next: ^14 || ^15`
 * only. `@storybook/nextjs-vite@9` is the first release declaring Next 16 +
 * React 19 support. Deviation recorded in DECISIONS.md ADR-42.
 */
const config: StorybookConfig = {
  stories: ["../components/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-a11y"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["../public"],
  typescript: {
    // The kit is already `pnpm tsc --noEmit`-clean; don't double-check here.
    check: false,
  },
};

export default config;
