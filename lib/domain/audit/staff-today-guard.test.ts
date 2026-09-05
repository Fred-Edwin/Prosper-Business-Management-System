import { describe, expect, it } from "vitest";
import { toBusinessDate } from "@/lib/time";
import { DomainError } from "./errors";
import { assertStaffDateIsToday } from "./day-close-guard";

/**
 * ADR-53 — staff may only create / edit records dated to TODAY
 * (Africa/Nairobi). Admin is exempt. Tested once per rule, not per call
 * site (the call sites just delegate here).
 */
describe("assertStaffDateIsToday (ADR-53)", () => {
  const today = toBusinessDate(new Date());
  const notToday = "2019-06-06";

  it("non-admin, a non-today date → FORBIDDEN", () => {
    expect(() =>
      assertStaffDateIsToday(notToday, { role: "cashier" }),
    ).toThrow(DomainError);
    try {
      assertStaffDateIsToday(notToday, { role: "canteen_attendant" });
      throw new Error("expected throw");
    } catch (e) {
      expect(e).toMatchObject({ code: "FORBIDDEN" });
    }
  });

  it("non-admin, today's date → allowed", () => {
    expect(() =>
      assertStaffDateIsToday(today, { role: "store_manager" }),
    ).not.toThrow();
    // also accepts a Date instant for now
    expect(() =>
      assertStaffDateIsToday(new Date(), { role: "cashier" }),
    ).not.toThrow();
  });

  it("admin is NOT restricted — a past date is allowed", () => {
    expect(() =>
      assertStaffDateIsToday(notToday, { role: "admin" }),
    ).not.toThrow();
    expect(() =>
      assertStaffDateIsToday(new Date("2019-01-01T00:00:00Z"), {
        role: "admin",
      }),
    ).not.toThrow();
  });

  // Admin role-switching (role-switching-session-1). The staff write
  // routes pass `effectiveRole(session)` as `actor.role`, so an Admin
  // acting as a staff role arrives here as that staff role and gets the
  // staff "today only" rail — she is doing the staff member's job. A real
  // Admin (not acting as anyone) still arrives as "admin" and is exempt.
  it("an admin ACTING AS a staff role is bound by the today-only rule", () => {
    // this is exactly what the route passes: effectiveRole === the acting role
    expect(() =>
      assertStaffDateIsToday(notToday, { role: "store_manager" }),
    ).toThrow(DomainError);
    expect(() =>
      assertStaffDateIsToday(today, { role: "store_manager" }),
    ).not.toThrow();
  });
});
