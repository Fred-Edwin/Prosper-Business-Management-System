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

/**
 * Map today's movement rows to `<ActivityTimeline>` rows for a hub log.
 * `unitById` supplies the unit label; the subtitle carries the movement
 * kind + time. Newest first (the list arrives newest-first from the API).
 *
 * G7: a `sale` movement with `stockCountId` set is a canteen derived-sale;
 * it renders as "Stock count · HH:MM" so the hub distinguishes it from a
 * restaurant order sale at a glance.
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
    const kind = isCanteenSale
      ? "Stock count"
      : m.movementType === "non_sale_consumption" && m.reason
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
