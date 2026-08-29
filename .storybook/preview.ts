import type { Preview } from "@storybook/nextjs-vite";

// Load the exact same CSS the app loads, in the same order, so every story
// renders byte-identically to production. `globals.css` itself `@import`s
// `./design-system/tokens.css` and `tailwindcss`, but we import tokens.css
// explicitly first per the Session 10b handoff (§4a) so the intent is
// visible and a future globals.css refactor can't silently drop it.
import "../app/design-system/tokens.css";
import "../app/globals.css";

// Collapse every transition/animation to ~0s in Storybook. Two reasons:
//  1. visual snapshots need a settled frame (the test-runner also passes
//     `animations: "disabled"`, this covers CSS transitions it doesn't).
//  2. the overlay components unmount on `transitionend` with no timeout
//     fallback — a real 200ms slide can outlast a `play` step in the runner.
//     A 1ms transition still fires `transitionend`, so the exit completes
//     deterministically. (Kept at 1ms, not 0s, so the event reliably fires.)
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.setAttribute("data-storybook-speedups", "");
  style.textContent = `*, *::before, *::after {
    transition-duration: 1ms !important;
    animation-duration: 1ms !important;
    animation-delay: 0ms !important;
    transition-delay: 0ms !important;
  }`;
  document.head.appendChild(style);
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    // Kit surfaces are light; the app has no dark mode (design-principles.md
    // §1 — "Default to light mode"). Pin the story canvas to --surface-page.
    backgrounds: {
      default: "surface-page",
      values: [
        { name: "surface-page", value: "#FFFFFF" },
        { name: "surface-subtle", value: "#FAFAFA" },
        // For on-dark controls (nav items, sticky footer, dense summary strip).
        { name: "nav-bg", value: "#241033" },
      ],
    },
    a11y: {
      // 4e: the gate fails CI on serious/critical. Keep the report visible in
      // the addon panel during authoring; `pnpm test:a11y` enforces it.
      test: "error",
    },
    layout: "centered",
  },
};

export default preview;
