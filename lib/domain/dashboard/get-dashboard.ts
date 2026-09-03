import { Prisma } from "@prisma/client";
import {
  businessDateLastInstantUtc,
  businessWeekRange,
  addBusinessDays,
} from "@/lib/time";
import {
  getAccountBalances,
  getOwnerOwedToBusiness,
} from "@/lib/domain/financials";
import { DomainError } from "@/lib/domain/financials/errors";
import { dailyNetSeries, type DailyNet } from "./trend-series";
import { getNeedsAttention } from "./needs-attention";
import { getTodaysActivity } from "./todays-activity";
import type {
  DashboardView,
  DashboardPosition,
  DashboardWeek,
  DashboardTrend,
} from "./types";

const ZERO = new Prisma.Decimal(0);
const BUSINESS_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TREND_DAYS = 30;

/**
 * The `/admin` Dashboard aggregator (M5 S13). One read for the owner's
 * morning triage screen — five bands, every figure "now" / "today" /
 * "this week so far" (there is NO period picker on this screen).
 *
 * ── Composed, not re-derived ────────────────────────────────────────
 *   - Position    → `getAccountBalances` / `getOwnerOwedToBusiness` with
 *     `asOf` = end of `date` — the SAME derivations `getFinancialSummary`
 *     uses for its balance figures (one source of truth).
 *   - Week + Trend → `dailyNetSeries` (ADR-64): net profit per business
 *     date via span-wide bucketed queries, agreeing to the cent with
 *     `getFinancialSummary(day, day)` but WITHOUT 37 stock sweeps.
 *   - Needs attention / Today → `getNeedsAttention` / `getTodaysActivity`.
 *
 * `date` is the current Africa/Nairobi business date (the route passes
 * `nairobiToday()`; an explicit `?date=` is honoured for testing and for
 * a pre-close review of a past day).
 */
export async function getDashboard(date: string): Promise<DashboardView> {
  if (!BUSINESS_DATE_RE.test(date)) {
    throw new DomainError(
      "VALIDATION_ERROR",
      "date must be a YYYY-MM-DD business date.",
      "date",
    );
  }

  const asOf = businessDateLastInstantUtc(date);
  const week = businessWeekRange(date);
  const trendFrom = addBusinessDays(date, -(TREND_DAYS - 1));

  // Both the week strip (Mon..Sun of this week) and the 30-day trend are
  // slices of one continuous net-profit series — compute it once over the
  // union of every span, then slice. The week band also needs last
  // week's equivalent range for its "vs. same point last week" deltas,
  // so the series must reach back a further 7 days from the week's
  // Monday.
  const priorWeekFrom = addBusinessDays(week.from, -7);
  const seriesFrom =
    trendFrom < priorWeekFrom ? trendFrom : priorWeekFrom;
  const seriesTo = date > week.to ? date : week.to;

  const [balances, ownerOwed, series, needsAttention, today] =
    await Promise.all([
      getAccountBalances({ asOf }),
      getOwnerOwedToBusiness(asOf),
      dailyNetSeries(seriesFrom, seriesTo),
      getNeedsAttention(date),
      getTodaysActivity(date),
    ]);

  const byDate = new Map(series.map((d) => [d.date, d]));

  return {
    date,
    position: buildPosition(balances, ownerOwed),
    week: buildWeek(week, date, byDate),
    needsAttention,
    today,
    trend: buildTrend(trendFrom, date, byDate),
  };
}

function buildPosition(
  balances: { cash: Prisma.Decimal; mpesaBank: Prisma.Decimal },
  ownerOwed: Prisma.Decimal,
): DashboardPosition {
  return {
    liquidity: balances.cash.add(balances.mpesaBank).toFixed(2),
    cash: balances.cash.toFixed(2),
    mpesaBank: balances.mpesaBank.toFixed(2),
    ownerOwedToBusiness: ownerOwed.toFixed(2),
  };
}

function buildWeek(
  range: { from: string; to: string },
  today: string,
  byDate: Map<string, DailyNet>,
): DashboardWeek {
  // 7 entries Mon→Sun. A day AFTER today has not happened yet → net: null
  // (the design renders those as a faded stub, not a zero bar).
  const dailyNet: DashboardWeek["dailyNet"] = [];
  for (let i = 0; i < 7; i++) {
    const d = addBusinessDays(range.from, i);
    dailyNet.push(
      d > today
        ? { date: d, net: null }
        : { date: d, net: (byDate.get(d)?.net ?? ZERO).toFixed(2) },
    );
  }

  // WTD spans Monday..today; the equivalent range last week is
  // (Monday−7)..(today−7). Every figure sums the per-day series parts, so
  // `netWtd === revenueWtd − cogsWtd − expensesWtd` holds by construction
  // and each agrees with `getFinancialSummary` over the same range.
  const sum = (
    from: string,
    to: string,
  ): { revenue: Prisma.Decimal; expenses: Prisma.Decimal; net: Prisma.Decimal } => {
    let revenue = ZERO;
    let expenses = ZERO;
    let net = ZERO;
    for (let d = from; d <= to; d = addBusinessDays(d, 1)) {
      const row = byDate.get(d);
      if (!row) continue;
      revenue = revenue.add(row.revenue);
      expenses = expenses.add(row.expenses);
      net = net.add(row.net);
    }
    return { revenue, expenses, net };
  };

  const wtd = sum(range.from, today);
  const prior = sum(addBusinessDays(range.from, -7), addBusinessDays(today, -7));

  return {
    from: range.from,
    to: range.to,
    dailyNet,
    revenueWtd: wtd.revenue.toFixed(2),
    expensesWtd: wtd.expenses.toFixed(2),
    netWtd: wtd.net.toFixed(2),
    revenuePriorWtd: prior.revenue.toFixed(2),
    expensesPriorWtd: prior.expenses.toFixed(2),
    netPriorWtd: prior.net.toFixed(2),
  };
}

function buildTrend(
  from: string,
  to: string,
  byDate: Map<string, DailyNet>,
): DashboardTrend {
  const dailyNet: DashboardTrend["dailyNet"] = [];
  let total = ZERO;
  for (let d = from; d <= to; d = addBusinessDays(d, 1)) {
    const net = byDate.get(d)?.net ?? ZERO;
    total = total.add(net);
    dailyNet.push({ date: d, net: net.toFixed(2) });
  }
  return { dailyNet, net30Total: total.toFixed(2) };
}

export type { DailyNet };
