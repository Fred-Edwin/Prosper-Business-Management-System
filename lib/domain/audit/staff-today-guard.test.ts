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
});
