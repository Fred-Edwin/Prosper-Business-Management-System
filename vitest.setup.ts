// Loaded for every test. The jsdom-only bits (jest-dom matchers, cleanup,
// matchMedia shim) are guarded so Node-environment domain tests are unaffected.
import { afterEach, expect, vi } from "vitest";

if (typeof window !== "undefined") {
  const { cleanup } = await import("@testing-library/react");
  const matchers = await import("@testing-library/jest-dom/matchers");
  expect.extend(matchers.default ?? matchers);

  afterEach(() => cleanup());

  // jsdom has no matchMedia / ResizeObserver — a few kit components probe them.
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }
}
