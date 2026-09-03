// M4 S9B — shared display helpers for the /admin/staff tabs. Money never
// crosses the API boundary as a number; these are DISPLAY-only.

export const ROLE_LABEL: Record<string, string> = {
  store_manager: "Store Manager",
  cashier: "Cashier",
  canteen_attendant: "Canteen Attendant",
};

export const ACCOUNT_LABEL: Record<string, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank",
};

/** `"20800.00"` → `"20,800.00"`. Falls back to the raw string. */
export function money(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

/** A signed money magnitude for the Advances / Deductions columns. */
export function negMoney(dec: string): string {
  const n = Number(dec);
  if (!Number.isFinite(n) || n === 0) return "—";
  return `− ${money(Math.abs(n).toFixed(2))}`;
}

/** `YYYY-MM-DD` → e.g. "Sep 12". */
export function shortDate(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** `YYYY-MM-DD` → e.g. "Sep 12, 2026". */
export function shortDateWithYear(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** `YYYY-MM-DD` → a local `Date` at midnight (for the kit <DatePicker> grid). */
export function dateOf(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** A local `Date` → `YYYY-MM-DD` (the calendar day picked). */
export function ymdOf(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
