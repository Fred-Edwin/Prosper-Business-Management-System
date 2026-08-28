/**
 * Shared helpers for the kit's per-state Storybook stories (Session 10b).
 *
 * The `play`-function assertions are the *permanent* form of Session 9's
 * throwaway "Gate-2 probe": each interaction-state story reads
 * `getComputedStyle` on the real rendered element and asserts the value
 * equals the §9 rule / the design token.
 *
 * Colour tokens resolve to `oklch(...)` / `rgb(...)` / `var(--other)` in
 * `tokens.ts`, but the browser reports every colour back as `rgb()` /
 * `rgba()` / `oklch()` in its own normalised form. String-comparing those
 * is brittle, so `resolveToken()` paints the token onto a throwaway probe
 * node and reads what the browser computes — then we compare
 * browser-normalised value to browser-normalised value.
 */

/**
 * Resolve a CSS custom property (e.g. `--color-accent-hover`) to the exact
 * string the browser computes for it, as a colour. Mounts a hidden probe,
 * reads `background-color`, removes it.
 */
export function resolveTokenColor(tokenName: string): string {
  const probe = document.createElement("div");
  probe.style.position = "fixed";
  probe.style.left = "-9999px";
  probe.style.backgroundColor = `var(${tokenName})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

/** As {@link resolveTokenColor} but for a property that lands in `color`. */
export function resolveTokenTextColor(tokenName: string): string {
  const probe = document.createElement("span");
  probe.style.position = "fixed";
  probe.style.left = "-9999px";
  probe.style.color = `var(${tokenName})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/** Assert an element's computed `prop` equals the browser-resolved `tokenName`. */
export function expectComputedColor(
  el: Element,
  prop: "backgroundColor" | "color" | "borderColor" | "outlineColor",
  tokenName: string,
): void {
  const actual = getComputedStyle(el)[prop];
  const expected =
    prop === "color" || prop === "outlineColor"
      ? resolveTokenTextColor(tokenName)
      : resolveTokenColor(tokenName);
  if (actual !== expected) {
    throw new Error(
      `expected ${prop} to equal ${tokenName} (${expected}), got ${actual}`,
    );
  }
}

/**
 * The kit uses `outline` for the §9.1 focus-visible ring. jsdom/CDP report
 * `outlineStyle: "solid"` and a non-zero `outlineWidth` only when the ring
 * is actually painted; assert both.
 */
export function expectFocusRing(el: Element): void {
  const cs = getComputedStyle(el);
  if (cs.outlineStyle === "none" || cs.outlineWidth === "0px") {
    throw new Error(
      `expected a focus-visible ring (outline), got outline-style:${cs.outlineStyle} width:${cs.outlineWidth}`,
    );
  }
}
