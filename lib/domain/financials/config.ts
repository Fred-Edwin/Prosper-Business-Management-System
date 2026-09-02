import { Prisma } from "@prisma/client";

/**
 * Tunable financial-reporting constants — the **single source of truth**
 * (ADR-55). Nothing else in the codebase should hard-code these values.
 *
 * ── `dishWasteCostPercent` ────────────────────────────────────────────
 * A Dish carries `buyingPrice = 0` (ADR-33) — its real cost lives at the
 * ingredient level and is already captured by the COGS stock sweep. But
 * the **non-sale consumption cost report** (PRD §4.7 / SCHEMA §14 — waste,
 * staff meals, complimentary) needs *some* per-unit cost for a wasted
 * Dish. We use a percentage of its selling price as a cost proxy:
 * a Dish that sells for KES 100 is assumed to have cost ~KES 60 to make.
 *
 * This proxy is used **only** in the separate non-sale-consumption report.
 * It never touches COGS, Gross Profit or Net Profit (those come straight
 * from the stock sweep, where a Dish values at zero).
 *
 * Owner-configurable without a code edit: set `DISH_WASTE_COST_PERCENT`
 * (a decimal fraction, e.g. `0.55`) in the environment. Unset / invalid /
 * out of the `(0, 1]` range → the documented default below.
 */
export const DEFAULT_DISH_WASTE_COST_PERCENT = 0.6;

export function getDishWasteCostPercent(): Prisma.Decimal {
  const raw = process.env.DISH_WASTE_COST_PERCENT;
  if (raw != null && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1) {
      return new Prisma.Decimal(raw.trim());
    }
  }
  return new Prisma.Decimal(DEFAULT_DISH_WASTE_COST_PERCENT);
}
