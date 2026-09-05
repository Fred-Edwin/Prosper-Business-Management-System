// ═══════════════════════════════════════════════════════════════════════
// The shadow ledger — an INDEPENDENT second set of books.
//
// The whole point of the simulation is to compare the system's answer
// against an answer derived a completely different way. If the shadow
// re-used lib/domain, a bug in the domain would appear in both and cancel
// out. So this file:
//
//   • imports nothing from lib/domain,
//   • records what the simulation INTENDED to happen, as plain arithmetic
//     on integers-scaled decimals, keyed by business date,
//   • is only ever appended to by the scenario, from the API's own
//     confirmed responses.
//
// Money and quantities are held as BIGINT MINOR UNITS (cents / 1e4 for
// quantity) so no JS float ever touches a figure.
// ═══════════════════════════════════════════════════════════════════════

const MONEY_SCALE = 100n; // 2dp
const QTY_SCALE = 10_000n; // 4dp

/** "1234.56" → 123456n. Rejects anything that isn't a plain decimal. */
export function money(s: string | number): bigint {
  return toScaled(String(s), MONEY_SCALE, 2);
}

/** "12.3456" → 123456n. */
export function qty(s: string | number): bigint {
  return toScaled(String(s), QTY_SCALE, 4);
}

function toScaled(raw: string, scale: bigint, dp: number): bigint {
  const s = raw.trim();
  const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(s);
  if (!m) throw new Error(`not a decimal: ${JSON.stringify(raw)}`);
  const [, sign, whole, frac = ""] = m;
  if (frac.length > dp) {
    // Values coming back from Prisma carry trailing zeros ("100.0000").
    const extra = frac.slice(dp);
    if (/[^0]/.test(extra)) {
      throw new Error(`too many decimal places for scale ${dp}: ${raw}`);
    }
  }
  const padded = (frac + "0".repeat(dp)).slice(0, dp);
  const v = BigInt(whole) * scale + BigInt(padded || "0");
  return sign === "-" ? -v : v;
}

/** 123456n → "1234.56" — for readable assertion messages. */
export function fmtMoney(v: bigint): string {
  return fmtScaled(v, 2);
}
export function fmtQty(v: bigint): string {
  return fmtScaled(v, 4);
}
function fmtScaled(v: bigint, dp: number): string {
  const neg = v < 0n;
  const a = (neg ? -v : v).toString().padStart(dp + 1, "0");
  const whole = a.slice(0, a.length - dp);
  const frac = a.slice(a.length - dp);
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

/** Multiply a scaled quantity by a scaled money unit price → scaled money. */
export function qtyTimesMoney(q: bigint, unit: bigint): bigint {
  // q is /1e4, unit is /1e2, product is /1e6 → bring back to /1e2.
  const raw = q * unit; // scale 1e6
  return divRoundHalfUp(raw, 10_000n);
}

function divRoundHalfUp(n: bigint, d: bigint): bigint {
  const neg = n < 0n;
  const a = neg ? -n : n;
  const q = a / d;
  const r = a % d;
  const rounded = r * 2n >= d ? q + 1n : q;
  return neg ? -rounded : rounded;
}

// ── the books ──────────────────────────────────────────────────────────

type DayKey = string; // YYYY-MM-DD
type StockKey = string; // `${productId}@${locationId}`

export const stockKey = (productId: string, locationId: string): StockKey =>
  `${productId}@${locationId}`;

/**
 * Everything the scenario believes it did, per business day. The
 * invariants read these, never the app's own aggregates.
 */
export class ShadowLedger {
  /** business date → consolidated revenue (money) */
  readonly revenueByDay = new Map<DayKey, bigint>();
  /** business date → locationId → revenue */
  readonly revenueByDayLocation = new Map<DayKey, Map<string, bigint>>();
  /** business date → expenses */
  readonly expensesByDay = new Map<DayKey, bigint>();
  /** business date → purchase-receipt value entering the business (COGS "added") */
  readonly purchaseValueByDay = new Map<DayKey, bigint>();
  /** business date → locationId → purchase-receipt value */
  readonly purchaseValueByDayLocation = new Map<DayKey, Map<string, bigint>>();
  /** stock key → signed quantity delta, per business day */
  readonly stockDeltaByDay = new Map<DayKey, Map<StockKey, bigint>>();
  /** business date → account → signed money delta */
  readonly cashDeltaByDay = new Map<DayKey, bigint>();
  readonly mpesaDeltaByDay = new Map<DayKey, bigint>();
  /** business date → net new debt (debts raised − repayments) */
  readonly debtDeltaByDay = new Map<DayKey, bigint>();
  /** every business date the simulation touched, in order */
  readonly days: DayKey[] = [];

  markDay(day: DayKey): void {
    if (!this.days.includes(day)) this.days.push(day);
  }

  private bump(m: Map<DayKey, bigint>, day: DayKey, delta: bigint): void {
    this.markDay(day);
    m.set(day, (m.get(day) ?? 0n) + delta);
  }
  private bump2(
    m: Map<DayKey, Map<string, bigint>>,
    day: DayKey,
    k: string,
    delta: bigint,
  ): void {
    this.markDay(day);
    let inner = m.get(day);
    if (!inner) m.set(day, (inner = new Map()));
    inner.set(k, (inner.get(k) ?? 0n) + delta);
  }

  addRevenue(day: DayKey, locationId: string, amount: bigint): void {
    this.bump(this.revenueByDay, day, amount);
    this.bump2(this.revenueByDayLocation, day, locationId, amount);
  }
  addExpense(day: DayKey, amount: bigint): void {
    this.bump(this.expensesByDay, day, amount);
  }
  addPurchaseValue(day: DayKey, locationId: string, value: bigint): void {
    this.bump(this.purchaseValueByDay, day, value);
    this.bump2(this.purchaseValueByDayLocation, day, locationId, value);
  }
  addStock(day: DayKey, key: StockKey, delta: bigint): void {
    this.bump2(this.stockDeltaByDay, day, key, delta);
  }
  addCash(day: DayKey, delta: bigint): void {
    this.bump(this.cashDeltaByDay, day, delta);
  }
  addMpesa(day: DayKey, delta: bigint): void {
    this.bump(this.mpesaDeltaByDay, day, delta);
  }
  addDebt(day: DayKey, delta: bigint): void {
    this.bump(this.debtDeltaByDay, day, delta);
  }

  // ── range readers (inclusive from..to) ───────────────────────────────

  private sumRange(m: Map<DayKey, bigint>, from: DayKey, to: DayKey): bigint {
    let total = 0n;
    for (const [day, v] of m) if (day >= from && day <= to) total += v;
    return total;
  }

  revenue(from: DayKey, to: DayKey): bigint {
    return this.sumRange(this.revenueByDay, from, to);
  }
  expenses(from: DayKey, to: DayKey): bigint {
    return this.sumRange(this.expensesByDay, from, to);
  }
  purchaseValue(from: DayKey, to: DayKey): bigint {
    return this.sumRange(this.purchaseValueByDay, from, to);
  }
  revenueAtLocation(from: DayKey, to: DayKey, locationId: string): bigint {
    let total = 0n;
    for (const [day, inner] of this.revenueByDayLocation) {
      if (day >= from && day <= to) total += inner.get(locationId) ?? 0n;
    }
    return total;
  }
  /** Cash balance as of the END of `to` (a level, not a flow). */
  cashAsOf(to: DayKey): bigint {
    let total = 0n;
    for (const [day, v] of this.cashDeltaByDay) if (day <= to) total += v;
    return total;
  }
  mpesaAsOf(to: DayKey): bigint {
    let total = 0n;
    for (const [day, v] of this.mpesaDeltaByDay) if (day <= to) total += v;
    return total;
  }
  debtsAsOf(to: DayKey): bigint {
    let total = 0n;
    for (const [day, v] of this.debtDeltaByDay) if (day <= to) total += v;
    return total;
  }
  /** Derived on-hand quantity for one product/location as of end of `to`. */
  stockAsOf(key: StockKey, to: DayKey): bigint {
    let total = 0n;
    for (const [day, inner] of this.stockDeltaByDay) {
      if (day <= to) total += inner.get(key) ?? 0n;
    }
    return total;
  }
  allStockKeys(): StockKey[] {
    const keys = new Set<StockKey>();
    for (const inner of this.stockDeltaByDay.values()) {
      for (const k of inner.keys()) keys.add(k);
    }
    return [...keys].sort();
  }
}
