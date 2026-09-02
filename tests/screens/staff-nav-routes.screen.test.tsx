// @vitest-environment jsdom
// Regression gate — every staff bottom-nav tab must navigate to a route that
// actually exists (F2, owner report 2026-09-02). The nav key doubles as the
// route segment, and three of nine tabs named segments with no route behind
// them: the Cashier's "New Order" (real route /cashier/orders/new) and a
// "History" tab on both the Store Manager and the Canteen for a screen that
// was never built. All three rendered Next's default 404.
//
// This spec asserts the routing contract, not the pixels: the href each tab
// resolves to, that it corresponds to a real app/** route directory, and that
// the deep route lights up the right tab.
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  NAV_DEFS_BY_BASE,
  hrefForKey,
  activeNavKeyFromPathname,
} from "@/components/layout/staff-shell-client";

const APP_DIR = path.join(process.cwd(), "app");

/** True when `app/<href>/page.tsx` exists — i.e. the route really resolves. */
function routeExists(href: string): boolean {
  const segments = href.replace(/^\//, "").split("/").filter(Boolean);
  return fs.existsSync(path.join(APP_DIR, ...segments, "page.tsx"));
}

describe("staff bottom nav — every tab points at a real route", () => {
  const bases = Object.keys(NAV_DEFS_BY_BASE);

  it("covers the three staff roles", () => {
    expect(bases.sort()).toEqual(["/canteen", "/cashier", "/store-manager"]);
  });

  for (const basePath of Object.keys(NAV_DEFS_BY_BASE)) {
    const defs = NAV_DEFS_BY_BASE[basePath];

    for (const def of defs) {
      it(`${basePath} · "${def.label}" resolves to a route that exists`, () => {
        const href = hrefForKey(basePath, defs, def.key);
        expect(routeExists(href), `${href} has no page.tsx`).toBe(true);
      });
    }
  }

  it("sends the Cashier's New Order tab to /cashier/orders/new, not /cashier/new-order", () => {
    const defs = NAV_DEFS_BY_BASE["/cashier"];
    expect(hrefForKey("/cashier", defs, "new-order")).toBe("/cashier/orders/new");
  });

  it("lights up New Order while on the deep /cashier/orders/new route", () => {
    const defs = NAV_DEFS_BY_BASE["/cashier"];
    expect(activeNavKeyFromPathname("/cashier", "/cashier/orders/new", defs)).toBe(
      "new-order",
    );
    // The bare base route still lands on the first tab.
    expect(activeNavKeyFromPathname("/cashier", "/cashier", defs)).toBe("today");
  });

  it("no longer offers a History tab on the Store Manager or the Canteen", () => {
    for (const base of ["/store-manager", "/canteen"]) {
      expect(NAV_DEFS_BY_BASE[base].map((d) => d.key)).not.toContain("history");
    }
  });
});
