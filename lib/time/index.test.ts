import { describe, expect, it } from "vitest";
import {
  businessDateEndUtc,
  businessDateLastInstantUtc,
  businessDateStartUtc,
  businessMonthRange,
  businessWeekRange,
  toBusinessDate,
} from "./index";

describe("toBusinessDate", () => {
  it("converts a UTC timestamp to its Africa/Nairobi (UTC+3) business date", () => {
    // 2026-03-05T10:00:00Z is 13:00 in Nairobi — same calendar day.
    expect(toBusinessDate(new Date("2026-03-05T10:00:00Z"))).toBe("2026-03-05");
  });

  it("rolls a late-UTC timestamp forward into the next Nairobi business day", () => {
    // 2026-03-05T22:00:00Z is 01:00 the next day in Nairobi (UTC+3).
    expect(toBusinessDate(new Date("2026-03-05T22:00:00Z"))).toBe("2026-03-06");
  });

  it("keeps an early-UTC timestamp on the same Nairobi business day", () => {
    // 2026-03-05T00:30:00Z is 03:30 in Nairobi — still 2026-03-05.
    expect(toBusinessDate(new Date("2026-03-05T00:30:00Z"))).toBe("2026-03-05");
  });

  it("is independent of server-local timezone (guards the Frankfurt-hosting scenario)", () => {
    // Regardless of what TZ the process itself runs under, the business
    // date must be computed against the fixed Africa/Nairobi constant —
    // simulated here by picking a UTC instant that would land on a
    // different calendar day under common server timezones (e.g. US
    // Pacific) than it does in Nairobi.
    const instant = new Date("2026-03-05T23:30:00Z");
    expect(toBusinessDate(instant)).toBe("2026-03-06");
  });

  it("handles a UTC midnight boundary correctly", () => {
    expect(toBusinessDate(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });
});

describe("businessDateStartUtc / businessDateEndUtc", () => {
  it("returns 21:00 UTC the previous day as the Nairobi business-day start", () => {
    const start = businessDateStartUtc("2026-03-05");
    expect(start.toISOString()).toBe("2026-03-04T21:00:00.000Z");
  });

  it("returns 21:00 UTC on the business date as its exclusive end", () => {
    const end = businessDateEndUtc("2026-03-05");
    expect(end.toISOString()).toBe("2026-03-05T21:00:00.000Z");
  });

  it("round-trips: any instant between start and end maps back to the same business date", () => {
    const businessDate = "2026-06-15";
    const start = businessDateStartUtc(businessDate);
    const end = businessDateEndUtc(businessDate);

    expect(toBusinessDate(start)).toBe(businessDate);
    // `end` is exclusive — the last valid instant is 1ms before it.
    expect(toBusinessDate(new Date(end.getTime() - 1))).toBe(businessDate);
  });
});

describe("businessDateLastInstantUtc", () => {
  it("is 1ms before the exclusive business-day end (still on that date)", () => {
    const last = businessDateLastInstantUtc("2026-03-05");
    expect(last.toISOString()).toBe("2026-03-05T20:59:59.999Z");
    expect(toBusinessDate(last)).toBe("2026-03-05");
  });

  it("excludes the first instant of the next business day", () => {
    const last = businessDateLastInstantUtc("2026-03-05");
    const nextDayStart = businessDateStartUtc("2026-03-06");
    expect(last.getTime()).toBeLessThan(nextDayStart.getTime());
  });
});

describe("businessWeekRange — Monday-first", () => {
  it("returns Mon→Sun for a mid-week date", () => {
    // 2026-09-03 is a Thursday.
    expect(businessWeekRange("2026-09-03")).toEqual({
      from: "2026-08-31", // Monday
      to: "2026-09-06", // Sunday
    });
  });

  it("keeps a Monday as the range start", () => {
    expect(businessWeekRange("2026-08-31")).toEqual({
      from: "2026-08-31",
      to: "2026-09-06",
    });
  });

  it("puts Sunday at the end of its own week, not the start of the next", () => {
    expect(businessWeekRange("2026-09-06")).toEqual({
      from: "2026-08-31",
      to: "2026-09-06",
    });
  });

  it("spans a month edge correctly", () => {
    // 2026-03-01 is a Sunday → its week is 2026-02-23 … 2026-03-01.
    expect(businessWeekRange("2026-03-01")).toEqual({
      from: "2026-02-23",
      to: "2026-03-01",
    });
  });
});

describe("businessMonthRange", () => {
  it("returns the 1st → last day of the month", () => {
    expect(businessMonthRange("2026-09-03")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("handles 31-day months", () => {
    expect(businessMonthRange("2026-01-15")).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
  });

  it("handles February in a non-leap year", () => {
    expect(businessMonthRange("2026-02-10")).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("handles February in a leap year", () => {
    expect(businessMonthRange("2028-02-10")).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
  });
});
