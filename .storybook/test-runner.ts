import type { TestRunnerConfig } from "@storybook/test-runner";
import { getStoryContext, waitForPageReady } from "@storybook/test-runner";
import { injectAxe, checkA11y } from "axe-playwright";
import { toMatchImageSnapshot } from "jest-image-snapshot";

/**
 * Prosper kit proof harness — CI gates (Session 10b, Deliverable 4).
 *
 * Every story goes through, in `postVisit`:
 *
 *  1. `parameters.interaction` — apply a REAL pseudo-state via Playwright
 *     (`page.hover` / `.focus` / pointer-down) BEFORE the snapshot and the
 *     colour assertions. `@storybook/test`'s in-page `userEvent.hover` does
 *     not engage the CSS `:hover` pseudo-class in the runner; a CDP mouse
 *     move does. This is the permanent form of Session 9's Gate-2 probe:
 *     "computed value === the §9 rule / the token", per component, per state.
 *
 *  2. 4e. a11y — axe runs; FAILS on any serious/critical violation
 *     (`pnpm test:a11y`). Per-story opt-outs go in `parameters.a11y`.
 *
 *  3. 4c. visual — one #storybook-root screenshot per story, diffed against
 *     the committed baseline in `tests/visual/__screenshots__/`
 *     (`pnpm test:visual`). A REST diff failing almost always means the
 *     story/baseline is wrong, not the component (Session 10 kept every
 *     REST byte identical) — investigate before `-u`.
 *
 * `pnpm test:visual` and `pnpm test:a11y` are the same run; the names just
 * signal intent — both checks always execute.
 */

interface ColorAssertion {
  selector: string;
  /** camelCase computed-style key, e.g. "backgroundColor", "borderColor". */
  prop: "backgroundColor" | "color" | "borderColor" | "outlineColor";
  /** design token name, e.g. "--color-accent-hover". */
  token: string;
}

interface InteractionParam {
  /** Selector (within #storybook-root) to real-`page.hover()` before asserting. */
  hover?: string;
  /** Selector to focus (keyboard-equivalent) before asserting. */
  focus?: string;
  /** Selector to hold the pointer down on (`:active`) before asserting. */
  active?: string;
  /** After the state is applied, assert each element's computed prop === token. */
  assertColor?: ColorAssertion[];
  /** After the state is applied, assert this element paints a focus ring. */
  assertFocusRing?: string;
}

const ROOT = "#storybook-root";

const config: TestRunnerConfig = {
  setup() {
    expect.extend({ toMatchImageSnapshot });
  },

  async preVisit(page) {
    await injectAxe(page);
  },

  async postVisit(page, context) {
    const storyContext = await getStoryContext(page, context);
    await waitForPageReady(page);

    const interaction = storyContext.parameters?.interaction as
      | InteractionParam
      | undefined;

    // ── 1. apply a real pseudo-state ─────────────────────────────────
    if (interaction?.hover) {
      await page.locator(`${ROOT} ${interaction.hover}`).first().hover();
    }
    if (interaction?.focus) {
      await page.locator(`${ROOT} ${interaction.focus}`).first().focus();
      // focus-visible needs a keyboard heuristic — a Tab press satisfies it
      // for the just-focused element in Chromium.
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
    }
    let activeHandle;
    if (interaction?.active) {
      const el = page.locator(`${ROOT} ${interaction.active}`).first();
      const box = await el.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        activeHandle = true;
      }
    }

    // ── 2. interaction-state assertions (browser-side) ───────────────
    if (interaction?.assertColor?.length) {
      for (const a of interaction.assertColor) {
        const result = await page.evaluate(
          ([root, sel, prop, token]) => {
            const el = document.querySelector(`${root} ${sel}`);
            if (!el) return { ok: false, msg: `no element for "${sel}"` };
            const actual = getComputedStyle(el as Element)[
              prop as keyof CSSStyleDeclaration
            ] as string;
            const probe = document.createElement("div");
            probe.style.position = "fixed";
            probe.style.left = "-9999px";
            const isText = prop === "color" || prop === "outlineColor";
            if (isText) probe.style.color = `var(${token})`;
            else probe.style.backgroundColor = `var(${token})`;
            document.body.appendChild(probe);
            const expected = isText
              ? getComputedStyle(probe).color
              : getComputedStyle(probe).backgroundColor;
            probe.remove();
            return { ok: actual === expected, actual, expected };
          },
          [ROOT, a.selector, a.prop, a.token] as const,
        );
        if (!result.ok) {
          throw new Error(
            `[${context.id}] ${a.selector} ${a.prop} expected ${a.token} ` +
              `(${(result as { expected?: string }).expected ?? "?"}), got ` +
              `${(result as { actual?: string }).actual ?? (result as { msg?: string }).msg}`,
          );
        }
      }
    }
    if (interaction?.assertFocusRing) {
      const sel = interaction.assertFocusRing;
      const ring = await page.evaluate(
        ([root, s]) => {
          const el = document.querySelector(`${root} ${s}`);
          if (!el) return { ok: false, msg: "no element" };
          const cs = getComputedStyle(el as Element);
          return {
            ok: cs.outlineStyle !== "none" && cs.outlineWidth !== "0px",
            outlineStyle: cs.outlineStyle,
            outlineWidth: cs.outlineWidth,
          };
        },
        [ROOT, sel] as const,
      );
      if (!ring.ok) {
        throw new Error(
          `[${context.id}] ${sel} expected a focus-visible ring, got ` +
            `outline-style:${(ring as { outlineStyle?: string }).outlineStyle} ` +
            `width:${(ring as { outlineWidth?: string }).outlineWidth}`,
        );
      }
    }

    // ── 3. a11y gate ────────────────────────────────────────────────
    // Per-story opt-outs live in `parameters.a11y` — `{ disable: true }` skips
    // the story entirely; `{ config: { rules: [{ id, enabled: false }] } }`
    // turns one rule off (each such case is a documented FLAG routed to a
    // design sprint, never a silent pass). Rule overrides are passed straight
    // to axe via `axeOptions.rules` (merged with `runOnly` by tag) — going
    // through `configureAxe` did not stick alongside a tag `runOnly`.
    if (storyContext.parameters?.a11y?.disable !== true) {
      const ruleOverrides = (storyContext.parameters?.a11y?.config?.rules ??
        []) as { id: string; enabled: boolean }[];
      const rulesMap = Object.fromEntries(
        ruleOverrides.map((r) => [r.id, { enabled: r.enabled }]),
      );
      await checkA11y(page, ROOT, {
        detailedReport: true,
        detailedReportOptions: { html: true },
        axeOptions: {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
          ...(Object.keys(rulesMap).length ? { rules: rulesMap } : {}),
        },
      });
    }

    // ── 4. visual-regression gate ───────────────────────────────────
    if (storyContext.parameters?.visual?.disable !== true) {
      const image = await page
        .locator(ROOT)
        .screenshot({ animations: "disabled" });
      expect(image).toMatchImageSnapshot({
        customSnapshotsDir: "tests/visual/__screenshots__",
        customSnapshotIdentifier: context.id,
        failureThreshold: 0.02,
        failureThresholdType: "percent",
      });
    }

    if (activeHandle) await page.mouse.up();
  },
};

export default config;
