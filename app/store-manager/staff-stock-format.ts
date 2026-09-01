// Shared client-side *formatting* helpers for the staff stock screens —
// presentation only, no business logic (signs / deltas / balances come
// from the domain, per the Session 12 handoff). Used by both hubs and the
// stock-levels views.

import type {
  MovementType,
  NonSaleReason,
  StockMovementView,
} from "@/lib/domain/stock";
import type { ActivityTimelineRow } from "@/components/kit/activity-timeline";
import type { ProductWithLocations } from "@/lib/domain/catalog";

const MOVEMENT_LABEL: Record<MovementType, string> = {
  opening: "Opening stock",
  purchase_payment: "Purchase paid",
  purchase_receipt: "Delivery received",
  issue: "Issued to Kitchen",
  production: "Batch production",
  transfer: "Transfer",
  sale: "Sold",
  non_sale_consumption: "Non-sale",
  stock_count: "Stock count",
  closing: "Closing stock",
};

const NON_SALE_LABEL: Record<NonSaleReason, string> = {
  staff_meal: "Staff meal",
  complimentary: "Complimentary",
  spoiled: "Spoiled",
  damaged: "Damaged",
  other: "Other",
};

/** "46.5000" → "46.5", "48.0000" → "48", "-3.5000" → "-3.5" (trailing-zero trim). */
export function trimQty(decimalString: string): string {
  const n = Number.parseFloat(decimalString);
  if (Number.isNaN(n)) return decimalString;
  return String(Number(n.toFixed(4)));
}

/** Signed magnitude with a leading `+` for positives, e.g. "+40", "-18.5". */
export function signedQty(decimalString: string): string {
  const trimmed = trimQty(decimalString);
  return trimmed.startsWith("-") ? trimmed : `+${trimmed}`;
}

/** HH:MM in the viewer's locale — the log rows show a wall-clock time. */
export function shortTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** KES money string, 2dp, thousands-separated: "5760.00" → "KES 5,760.00". */
function formatKes(decimalString: string): string {
  const n = Number.parseFloat(decimalString);
  if (Number.isNaN(n)) return `KES ${decimalString}`;
  return `KES ${n.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Map today's movement rows to `<ActivityTimeline>` rows for a hub log.
 * `unitById` supplies the unit label; the subtitle carries the movement
 * kind + time. Newest first (the list arrives newest-first from the API).
 *
 * G7: a `sale` movement with `stockCountId` set is a canteen derived-sale;
 * it renders as "Stock count · HH:MM" so the hub distinguishes it from a
 * restaurant order sale at a glance.
 *
 * F7-7 (canteen-derived-sales-flow §F): a canteen derived-sale is a
 * revenue-in event, not a stock-out. Its trailing value is the derived
 * revenue (`+KES …`, `--color-success` via `sign: "positive"`), not the
 * negative sale magnitude, and the subtitle reads "{n} pcs sold · {time}".
 * A zero-sold count (`derivedRevenue == null` on a sale+stockCount row)
 * writes no `MoneyMovement`, so its value is an em-dash, not a red figure.
 * Everything OUTSIDE this `isCanteenSale` branch is byte-unchanged — the
 * Store Manager hub timeline (which never carries canteen sales) renders
 * exactly as before.
 *
 * NOTE for QA (frontend-only data gap): the §F artboard subtitle also
 * carries "since {date} · closing {rem}". `StockMovementView` (the hub
 * feed row) exposes only `quantity` (= units sold) + `occurredAt` +
 * `derivedRevenue` — `periodStart` / closing live on `DerivedSaleView`
 * (`GET /api/canteen/derived-sales`, the Admin A4 view), not the feed.
 * So the hub row shows the achievable "{n} pcs sold · {time}". The kit
 * `<ActivityTimeline>` also has no neutral value tone (only
 * success/danger), so the zero-sold em-dash renders in the success tone
 * rather than muted — a kit limitation, no kit change this session.
 */
export function movementsToTimeline(
  movements: StockMovementView[],
  products: ProductWithLocations[],
): ActivityTimelineRow[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return movements.map((m) => {
    const product = byId.get(m.productId);
    const unit = product?.unitLabel ?? "";
    // G7: canteen derived-sale — movementType=="sale" with a stockCountId.
    const isCanteenSale =
      m.movementType === "sale" && m.stockCountId !== null;

    if (isCanteenSale) {
      // F7-7: revenue-in row. |quantity| is the units-sold magnitude.
      const soldQty = trimQty(m.quantity).replace("-", "");
      const zeroSold = m.derivedRevenue == null;
      return {
        title: product?.name ?? "Unknown product",
        subtitle: `${soldQty}${unit ? ` ${unit}` : ""} sold · ${shortTime(
          m.occurredAt,
        )}`,
        value: zeroSold ? "—" : `+${formatKes(m.derivedRevenue as string)}`,
        // Never the red stock-out treatment for a derived sale.
        sign: "positive",
      };
    }

    const kind =
      m.movementType === "non_sale_consumption" && m.reason
        ? NON_SALE_LABEL[m.reason]
        : MOVEMENT_LABEL[m.movementType];
    return {
      title: product?.name ?? "Unknown product",
      subtitle: `${kind} · ${shortTime(m.occurredAt)}`,
      value: `${signedQty(m.quantity)}${unit ? ` ${unit}` : ""}`,
      sign: Number.parseFloat(m.quantity) < 0 ? "negative" : "positive",
    };
  });
}
