import { describe, expect, it } from "vitest";
import {
  effectiveRole,
  isRoleAllowed,
  roleHomePath,
  routePrefixForPath,
} from "./roles";

describe("roleHomePath", () => {
  it("maps each role to its own role-scoped route", () => {
    expect(roleHomePath("admin")).toBe("/admin");
    expect(roleHomePath("store_manager")).toBe("/store-manager");
    expect(roleHomePath("cashier")).toBe("/cashier");
    expect(roleHomePath("canteen_attendant")).toBe("/canteen");
  });
});

describe("routePrefixForPath", () => {
  it("matches a role-scoped path exactly", () => {
    expect(routePrefixForPath("/admin")).toBe("/admin");
  });

  it("matches a nested path under a role-scoped prefix", () => {
    expect(routePrefixForPath("/admin/products")).toBe("/admin");
  });

  it("does not match an unrelated path", () => {
    expect(routePrefixForPath("/login")).toBeUndefined();
    expect(routePrefixForPath("/")).toBeUndefined();
  });

  it("does not match a path that merely starts with the same characters", () => {
    // "/admins" is not under the "/admin" role-scoped tree.
    expect(routePrefixForPath("/admins")).toBeUndefined();
  });
});

describe("isRoleAllowed", () => {
  it("allows a role into its own route group", () => {
    expect(isRoleAllowed("admin", "/admin")).toBe(true);
    expect(isRoleAllowed("cashier", "/cashier/orders")).toBe(true);
  });

  it("blocks a store_manager from admin routes (server-side check)", () => {
    expect(isRoleAllowed("store_manager", "/admin")).toBe(false);
    expect(isRoleAllowed("store_manager", "/admin/products")).toBe(false);
  });

  it("blocks every non-admin role from admin routes", () => {
    expect(isRoleAllowed("cashier", "/admin")).toBe(false);
    expect(isRoleAllowed("canteen_attendant", "/admin")).toBe(false);
  });

  it("blocks a cashier from another role's routes", () => {
    expect(isRoleAllowed("cashier", "/canteen")).toBe(false);
    expect(isRoleAllowed("cashier", "/store-manager")).toBe(false);
  });

  it("allows any authenticated role into paths with no role-scoped prefix", () => {
    expect(isRoleAllowed("cashier", "/login")).toBe(true);
    expect(isRoleAllowed("admin", "/")).toBe(true);
  });
});

describe("effectiveRole (Admin role-switching)", () => {
  it("returns the real role when actingAs is null", () => {
    expect(
      effectiveRole({ user: { role: "admin", actingAs: null } }),
    ).toBe("admin");
    expect(
      effectiveRole({ user: { role: "cashier", actingAs: null } }),
    ).toBe("cashier");
  });

  it("returns actingAs when it is set (Admin acting as a staff role)", () => {
    expect(
      effectiveRole({ user: { role: "admin", actingAs: "store_manager" } }),
    ).toBe("store_manager");
    expect(
      effectiveRole({ user: { role: "admin", actingAs: "canteen_attendant" } }),
    ).toBe("canteen_attendant");
  });
});
