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

/**
 * The value to store/query for a Postgres `DATE` column (Prisma
 * `@db.Date`) representing a business date — midnight **UTC** of that
 * calendar date. `@db.Date` carries no time or zone; Prisma round-trips it
 * as a `Date` at `00:00:00Z`, so anything else risks an off-by-one when
 * the process TZ isn't UTC. `businessDate` must be `YYYY-MM-DD`.
 *
 * Use this for `DayClose.date` lookups, never `businessDateStartUtc`
 * (which is a UTC *instant* — 21:00Z the previous day — not a date-only
 * value).
 */
export function businessDateOnly(businessDate: string): Date {
  return new Date(`${businessDate}T00:00:00Z`);
}

/**
 * The last representable UTC instant that still falls on the given
 * Africa/Nairobi business date (1ms before the exclusive end). This is the
 * "as of end of <businessDate>" cutoff for a **point-in-time balance**
 * read (ADR-57): every movement dated on or before this instant is in,
 * everything after it is out. `businessDate` must be `YYYY-MM-DD`.
 */
export function businessDateLastInstantUtc(businessDate: string): Date {
  return new Date(businessDateEndUtc(businessDate).getTime() - 1);
}

/** The Africa/Nairobi business date (`YYYY-MM-DD`) of "now". */
export function nairobiToday(now: Date = new Date()): string {
  return toBusinessDate(now);
}

/** Add `days` (may be negative) to a `YYYY-MM-DD` business date. */
export function addBusinessDays(businessDate: string, days: number): string {
  const [y, m, d] = businessDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

/**
 * The Monday–Sunday business week that contains `businessDate`, as an
 * inclusive `{ from, to }` pair of `YYYY-MM-DD` Africa/Nairobi business
 * dates. **Weeks start Monday** (ISO 8601; also the local trading-week
 * convention) — the same Monday-first boundary the kit `<DatePicker>`
 * grid already uses. `businessDate` must be `YYYY-MM-DD`.
 */
export function businessWeekRange(businessDate: string): {
  from: string;
  to: string;
} {
  const [y, m, d] = businessDate.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sun … 6 = Sat
  const sinceMonday = (dow + 6) % 7; // 0 = Mon
  const from = addBusinessDays(businessDate, -sinceMonday);
  return { from, to: addBusinessDays(from, 6) };
}

/**
 * The calendar month that contains `businessDate`, as an inclusive
 * `{ from, to }` pair of `YYYY-MM-DD` Africa/Nairobi business dates
 * (1st → last day of that month). `businessDate` must be `YYYY-MM-DD`.
 */
export function businessMonthRange(businessDate: string): {
  from: string;
  to: string;
} {
  const [y, m] = businessDate.split("-").map(Number);
  const from = `${businessDate.slice(0, 7)}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate(); // day 0 of next month
  return { from, to: `${businessDate.slice(0, 7)}-${String(lastDay).padStart(2, "0")}` };
}
