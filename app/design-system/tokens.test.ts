 /**
 * Drift guard — tokens.ts MUST mirror tokens.css exactly.
 *
 * Parses the :root block of app/design-system/tokens.css and asserts that
 * every custom-property declaration appears in tokens.ts with an identical
 * value, and vice-versa. If this fails, someone edited one file without the
 * other — fix the mismatch, don't loosen the test.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { tokens } from "./tokens";

function parseCssRoot(css: string): Record<string, string> {
  const rootMatch = css.match(/:root\s*\{([\s\S]*)\}/);
  if (!rootMatch) throw new Error("tokens.css: no :root block found");
  const body = rootMatch[1];
  const out: Record<string, string> = {};
  // strip block comments so `/* ... */` on/around declarations doesn't confuse the split
  const noComments = body.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const rawDecl of noComments.split(";")) {
    const decl = rawDecl.trim();
    if (!decl.startsWith("--")) continue;
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const name = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim().replace(/\s+/g, " ");
    out[name] = value;
  }
  return out;
}

const cssPath = join(__dirname, "tokens.css");
const cssTokens = parseCssRoot(readFileSync(cssPath, "utf8"));

describe("design-system tokens.ts ↔ tokens.css", () => {
  it("every tokens.css declaration is in tokens.ts with the same value", () => {
    const mismatches: string[] = [];
    for (const [name, cssValue] of Object.entries(cssTokens)) {
      const tsValue = (tokens as Record<string, string>)[name];
      if (tsValue === undefined) {
        mismatches.push(`${name}: missing from tokens.ts (css = "${cssValue}")`);
      } else if (tsValue.replace(/\s+/g, " ") !== cssValue) {
        mismatches.push(`${name}: css "${cssValue}" ≠ ts "${tsValue}"`);
      }
    }
    expect(mismatches, mismatches.join("\n")).toEqual([]);
  });

  it("every tokens.ts entry is in tokens.css (no stale/extra tokens)", () => {
    const extra = Object.keys(tokens).filter((name) => !(name in cssTokens));
    expect(extra, `stale in tokens.ts: ${extra.join(", ")}`).toEqual([]);
  });

  it("has the D2 fix: --surface-raised is opaque and defined", () => {
    expect(cssTokens["--surface-raised"]).toBeDefined();
    // opaque = an oklch() with no alpha slash
    expect(cssTokens["--surface-raised"]).not.toContain("/");
  });

  it("--surface-panel-tint is fully retired (Session 11 — D2 / ADR-41)", () => {
    // The 38%-alpha "transparent modal" fill is gone from both token files;
    // every consumer uses --surface-raised.
    expect(cssTokens["--surface-panel-tint"]).toBeUndefined();
    expect(
      (tokens as Record<string, string>)["--surface-panel-tint"],
    ).toBeUndefined();
  });
});
