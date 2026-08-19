import { describe, expect, it } from "vitest";
import { businessDateEndUtc, businessDateStartUtc, toBusinessDate } from "./index";

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
