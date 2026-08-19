/**
 * Fixed business timezone (ADR-29). Never inferred from server locale —
 * day boundaries must behave identically regardless of hosting region.
 */
export const BUSINESS_TIMEZONE = "Africa/Nairobi";

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Returns the Africa/Nairobi business date (YYYY-MM-DD) that a UTC
 * timestamp falls on.
 */
export function toBusinessDate(date: Date): string {
  return dateFormatter.format(date);
}

/**
 * Start of the given Africa/Nairobi business date, expressed as a UTC
 * Date instant. `businessDate` must be `YYYY-MM-DD`.
 */
export function businessDateStartUtc(businessDate: string): Date {
  // Africa/Nairobi is a fixed UTC+3 offset (no DST), so business-day
  // midnight is always 21:00 UTC the previous day.
  return new Date(`${businessDate}T00:00:00+03:00`);
}

/**
 * End (exclusive) of the given Africa/Nairobi business date, expressed as
 * a UTC Date instant.
 */
export function businessDateEndUtc(businessDate: string): Date {
  return new Date(`${businessDate}T24:00:00+03:00`);
}
