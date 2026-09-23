"use client";

// Canteen Mobile Operations Hub — composed from the proven kit (Session 12,
// ADR-44: the kit is the visual acceptance target; the Session-4b artboard
// 9BA-0 is superseded). Same shape as the Store Manager hub.
//
// Composition:
//   • one pinned <TransferBanner> when transfers are incoming (ADR-39) —
//     "N items incoming — Review & Receive" → navigates to
//     /canteen/transfer/receive, where the attendant confirms/adjusts the
//     quantities and accepts. No inline one-tap accept, no flag-to-admin.
//   • pinned <PurchaseDeliveryBanner> per Canteen-destined delivery the
//     Admin has paid for (ADR-69 — receiving is by DESTINATION, so the
//     attendant sees the Canteen's; `useOutstandingDeliveries`). "Review
//     & receive" routes to the Receive flow rather than one-tap writing a
//     receipt — a delivery can arrive short. No Flag action: that is the
//     two-phase TRANSFER variance path and rejects a `purchase_payment`.
//   • <ActionTileGrid> — Receive Goods / Transfer Dispatch / Stock Count /
//     Stock Levels / Non-sale.
//   • <ActivityTimeline> — today's canteen movement log / empty line.
//   • <ErrorState> on a fetch failure.

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  ClipboardList,
  Boxes,
  Trash2,
  PackagePlus,
  CreditCard,
  Users,
} from "lucide-react";
import { ActionTileGrid, type ActionTile } from "@/components/kit/action-tile-grid";
import { ActivityTimeline } from "@/components/kit/activity-timeline";
import { InstructionalBanner } from "@/components/kit/instructional-banner";
import { PurchaseDeliveryBanner } from "@/components/kit/banner";
import { Button } from "@/components/kit/button";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import {
  useStaffStock,
  useOutstandingDeliveries,
  deriveIncomingTransfers,
  stockApi,
} from "@/app/store-manager/use-staff-stock";
import {
  movementsToTimeline,
  todaysMovements,
  trimQty,
} from "@/app/store-manager/staff-stock-format";
import type { StockMovementView } from "@/lib/domain/stock";
import {
  useDerivedSales,
  useStockCountActions,
} from "@/app/canteen/use-stock-count";
import { useCreditSales, useCreditSaleActions } from "@/app/canteen/use-credit-sale";
import { nairobiBusinessDate } from "@/app/cashier/use-orders";

const TILE_ICON_PROPS = { width: 20, height: 20, strokeWidth: 1.5, "aria-hidden": true } as const;

export function CanteenHubClient({ locationLabel }: { locationLabel: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error, refresh } = useStaffStock();
  // Canteen-destined deliveries the Admin has paid for and nobody has
  // received yet (ADR-69 destination scoping). Non-fatal on failure — the
  // hub still renders without the banner, same as the SM hub treats it.
  const outstanding = useOutstandingDeliveries();

  // F7-3 (QA S7) — today's canteen stock counts, so the attendant can
  // undo a mistaken same-day count (the `voidStockCount` recovery path,
  // owner decision 2026-08-30). The full 9-state K1 rebuild with a
  // FrictionDeleteDialog is Batch 3d; this is the reachable minimum.
  const today = nairobiBusinessDate();
  const { rows: derivedToday, refresh: refreshDerived } = useDerivedSales({
    date: today,
  });
  const { voidStockCount } = useStockCountActions();
  const [voidingId, setVoidingId] = React.useState<string | null>(null);
  // The kit <ConfirmDialog> (on-brand, replaces a native window.confirm —
  // client feedback 2026-09-18) needs the target row to render its body
  // copy, not just a boolean.
  const [deleteCountTarget, setDeleteCountTarget] = React.useState<
    { stockCountId: string; productName: string; unitsSold: string | null } | null
  >(null);
  // Today's own deliveries, with a "Void" recovery path (F-1 fix, 2026-09-
  // 17) — same reachable-minimum shape as "Delete today's count" below.
  const [voidingReceiptId, setVoidingReceiptId] = React.useState<string | null>(
    null,
  );
  const [voidReceiptTarget, setVoidReceiptTarget] =
    React.useState<StockMovementView | null>(null);

  const todaysCounts = derivedToday.filter(
    (r) => r.stockCountId != null && r.lastCountedAt != null,
  );

  // ADR-91 — today's canteen credit sales, with the same same-day void
  // recovery pattern as stock counts.
  const { rows: todaysCreditSales, refresh: refreshCreditSales } =
    useCreditSales({ date: today });
  const { voidCreditSale } = useCreditSaleActions();
  const [voidingCreditSaleId, setVoidingCreditSaleId] = React.useState<
    string | null
  >(null);
  const [voidCreditSaleTarget, setVoidCreditSaleTarget] = React.useState<
    { stockMovementId: string; productName: string; customerName: string; total: string } | null
  >(null);

  async function confirmVoidCreditSale() {
    if (!voidCreditSaleTarget) return;
    const { stockMovementId, productName: soldProductName } = voidCreditSaleTarget;
    setVoidingCreditSaleId(stockMovementId);
    try {
      await voidCreditSale(stockMovementId);
      toast(`Credit sale voided · ${soldProductName}`, { tone: "info" });
      setVoidCreditSaleTarget(null);
      await Promise.all([refresh(), refreshCreditSales()]);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Couldn't void the credit sale.",
        { tone: "danger" },
      );
    } finally {
      setVoidingCreditSaleId(null);
    }
  }

  async function confirmDeleteCount() {
    if (!deleteCountTarget) return;
    const { stockCountId, productName: countProductName } = deleteCountTarget;
    setVoidingId(stockCountId);
    try {
      await voidStockCount(stockCountId);
      toast(`Count deleted · ${countProductName} sale removed`, { tone: "info" });
      setDeleteCountTarget(null);
      await Promise.all([refresh(), refreshDerived()]);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Couldn't delete the count.",
        { tone: "danger" },
      );
    } finally {
      setVoidingId(null);
    }
  }

  const myLocationId =
    data.locations.find((l) => l.type === "canteen")?.id ??
    data.movements[0]?.locationId ??
    null;

  const incoming = deriveIncomingTransfers(data.movements, myLocationId);
  // `voided` excluded — a fully-reversed receipt has nothing left to void
  // again (the server already rejects it with VALIDATION_ERROR); showing
  // it here as a live 0-quantity row with an active Void button was
  // confusing. It still appears in the movement log below, unchanged.
  const todaysReceipts = todaysMovements(data.movements).filter(
    (m) =>
      m.movementType === "purchase_receipt" &&
      m.correctsMovementId === null &&
      !m.voided,
  );
  const timeline = movementsToTimeline(todaysMovements(data.movements), data.products);
  const incomingUnits = incoming.reduce(
    (sum, { movement }) =>
      sum + Math.abs(Number.parseFloat(movement.quantity) || 0),
    0,
  );

  const productName = (id: string) =>
    data.products.find((p) => p.id === id)?.name ?? "stock";
  const productUnit = (id: string) =>
    data.products.find((p) => p.id === id)?.unitLabel ?? "";

  async function confirmVoidReceipt() {
    if (!voidReceiptTarget) return;
    const receipt = voidReceiptTarget;
    setVoidingReceiptId(receipt.id);
    try {
      await stockApi.voidPurchaseReceipt(receipt.id);
      toast(`Delivery voided · ${productName(receipt.productId)}`, {
        tone: "info",
      });
      setVoidReceiptTarget(null);
      await refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't void the delivery.", {
        tone: "danger",
      });
    } finally {
      setVoidingReceiptId(null);
    }
  }

  // Deliveries awaiting receipt, once the read has settled cleanly.
  const pendingDeliveries =
    outstanding.loading || outstanding.error ? [] : outstanding.rows;
  const pendingCount = pendingDeliveries.length;

  const tiles: ActionTile[] = [
    {
      // Session 16 / ADR-69 — a supplier delivery destined for the Canteen
      // is received here directly (goods can't sit at the Store, and the
      // Restaurant transfer path is not the only way in any more).
      icon: <PackagePlus {...TILE_ICON_PROPS} stroke="var(--color-accent)" />,
      label: "Receive Goods",
      subLabel: pendingCount
        ? `${pendingCount} ${pendingCount === 1 ? "delivery" : "deliveries"} pending`
        : "Log a supplier delivery",
      badge: pendingCount > 0,
      onClick: () => router.push("/canteen/flows/receive"),
    },
    {
      icon: <ArrowLeftRight {...TILE_ICON_PROPS} stroke="var(--color-info)" />,
      label: "Transfer Dispatch",
      subLabel: "Return stock to Store",
      onClick: () => router.push("/canteen/transfer"),
    },
    {
      // M2 6d: Canteen stock count route (app/canteen/stock-count) implements K1.
      icon: <ClipboardList {...TILE_ICON_PROPS} stroke="var(--color-accent)" />,
      label: "Stock Count",
      subLabel: "Derives sales & closing",
      onClick: () => router.push("/canteen/stock-count"),
    },
    {
      icon: <Boxes {...TILE_ICON_PROPS} stroke="var(--text-secondary)" />,
      label: "Stock Levels",
      subLabel: "Current on-hand",
      onClick: () => router.push("/canteen/stock"),
    },
    {
      // Session 16: the Canteen-side non-sale-consumption flow (PRD §3
      // "any staff"; ADR-67 non_sale_consumption legal outbound at the
      // Canteen). "Non-sale" is the domain term — spoilage, staff meals,
      // complimentary, damage all fall under it.
      icon: <Trash2 {...TILE_ICON_PROPS} stroke="var(--color-warning)" />,
      label: "Non-sale",
      subLabel: "Spoilage & staff meals",
      onClick: () => router.push("/canteen/flows/non-sale"),
    },
    {
      // ADR-91 — a discrete, real-time transaction alongside the
      // stock-count-derived cash flow: sell now, customer pays later.
      icon: <CreditCard {...TILE_ICON_PROPS} stroke="var(--color-danger)" />,
      label: "Credit Sale",
      subLabel: "Sell now, pay later",
      onClick: () => router.push("/canteen/flows/credit-sale"),
    },
    {
      // ADR-91 follow-up — collect a repayment against a canteen credit
      // sale's debt, the same way the Cashier's C6 screen does.
      icon: <Users {...TILE_ICON_PROPS} stroke="var(--color-accent)" />,
      label: "Customers",
      subLabel: "Balances & repayments",
      onClick: () => router.push("/canteen/customers"),
    },
  ];

  return (
    <div className="flex flex-col gap-(--sp-6) px-(--sp-6) py-(--sp-6)">
      {incoming.length > 0 && (
        <div role="region" aria-label="Incoming transfers" className="flex flex-col gap-(--sp-4)">
          <InstructionalBanner
            step={incoming.length}
            title={`${incoming.length} ${
              incoming.length === 1 ? "item" : "items"
            } incoming — Review & Receive`}
            body={`${trimQty(String(incomingUnits))} unit${
              incomingUnits === 1 ? "" : "s"
            } dispatched from Store / Restaurant. Confirm what actually arrived.`}
          />
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => router.push("/canteen/transfer/receive")}
          >
            Review &amp; Receive
          </Button>
        </div>
      )}

      {pendingDeliveries.map((d) => {
        const qty = d.purchaseOrderedQty ? trimQty(d.purchaseOrderedQty) : "?";
        const unit = productUnit(d.productId);
        return (
          <PurchaseDeliveryBanner
            key={d.id}
            title={`Purchase delivery pending · ${productName(d.productId)}`}
            detail={`${qty} ${unit} · ${d.purchaseSupplier ?? "Supplier"}`}
            primaryLabel="Review & receive"
            onPrimary={() => router.push("/canteen/flows/receive")}
            // No Flag action: `onFlag` is the two-phase TRANSFER variance
            // path (`flagTransfer`, ADR-39) and would reject a
            // `purchase_payment` row. A short delivery is reported by
            // receiving the actual quantity in the Receive flow.
          />
        );
      })}

      <div className="flex flex-col gap-(--sp-4)">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Canteen workflows
        </div>
        <ActionTileGrid tiles={tiles} className="w-full" />
      </div>

      {todaysReceipts.length > 0 && (
        <div className="flex flex-col gap-(--sp-4)">
          <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
            Today&rsquo;s deliveries
          </div>
          <ul className="flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)] overflow-hidden">
            {todaysReceipts.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-(--sp-4) px-(--sp-5) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
              >
                <div className="flex flex-col gap-px min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
                    {productName(r.productId)}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    {trimQty(r.quantity).replace("-", "")} {productUnit(r.productId)}
                    {" received"}
                    {r.purchasePaymentId ? " · matched to a payment" : ""}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setVoidReceiptTarget(r)}
                  disabled={voidingReceiptId === r.id}
                  className="font-ui font-(--weight-medium) text-danger text-caption/micro kit-focus-ring rounded-sm shrink-0 disabled:opacity-50"
                >
                  {voidingReceiptId === r.id ? "Voiding…" : "Void delivery"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {todaysCounts.length > 0 && (
        <div className="flex flex-col gap-(--sp-4)">
          <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
            Today&rsquo;s stock counts
          </div>
          <ul className="flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)] overflow-hidden">
            {todaysCounts.map((row) => (
              <li
                key={row.stockCountId}
                className="flex items-center justify-between gap-(--sp-4) px-(--sp-5) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
              >
                <div className="flex flex-col gap-px min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
                    {row.productName}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    {trimQty(row.unitsSold ?? "0")} sold ·{" "}
                    {row.revenue ? `KES ${row.revenue}` : "—"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    row.stockCountId &&
                    setDeleteCountTarget({
                      stockCountId: row.stockCountId,
                      productName: row.productName,
                      unitsSold: row.unitsSold,
                    })
                  }
                  disabled={voidingId === row.stockCountId}
                  className="font-ui font-(--weight-medium) text-danger text-caption/micro kit-focus-ring rounded-sm shrink-0 disabled:opacity-50"
                >
                  {voidingId === row.stockCountId
                    ? "Deleting…"
                    : "Delete today’s count"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {todaysCreditSales.length > 0 && (
        <div className="flex flex-col gap-(--sp-4)">
          <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
            Today&rsquo;s credit sales
          </div>
          <ul className="flex flex-col rounded-md border border-solid [border-color:var(--border-subtle)] overflow-hidden">
            {todaysCreditSales.map((row) => (
              <li
                key={row.stockMovementId}
                className="flex items-center justify-between gap-(--sp-4) px-(--sp-5) py-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] last:border-b-0"
              >
                <div className="flex flex-col gap-px min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
                    {row.productName}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
                    {trimQty(row.quantity)} to {row.customerName} · KES {row.total}
                  </span>
                </div>
                {row.voidable && (
                  <button
                    type="button"
                    onClick={() =>
                      setVoidCreditSaleTarget({
                        stockMovementId: row.stockMovementId,
                        productName: row.productName,
                        customerName: row.customerName,
                        total: row.total,
                      })
                    }
                    disabled={voidingCreditSaleId === row.stockMovementId}
                    className="font-ui font-(--weight-medium) text-danger text-caption/micro kit-focus-ring rounded-sm shrink-0 disabled:opacity-50"
                  >
                    {voidingCreditSaleId === row.stockMovementId
                      ? "Voiding…"
                      : "Void"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-(--sp-4)">
        <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
          Today&rsquo;s canteen log
        </div>
        {error ? (
          <ErrorState
            title="Couldn't load the hub"
            description={error}
            onRetry={refresh}
          />
        ) : (
          <ActivityTimeline
            rows={loading ? [] : timeline}
            emptyMessage={
              loading ? "Loading…" : `No movements logged at ${locationLabel} today`
            }
            className="w-full"
          />
        )}
      </div>

      <ConfirmDialog
        open={voidReceiptTarget !== null}
        onClose={() => setVoidReceiptTarget(null)}
        onConfirm={confirmVoidReceipt}
        title="Void delivery"
        bodyCopy={
          voidReceiptTarget
            ? `Void today's delivery of ${trimQty(voidReceiptTarget.quantity).replace("-", "")} ` +
              `${productUnit(voidReceiptTarget.productId)} ${productName(voidReceiptTarget.productId)}? ` +
              `This removes it from stock. Do a fresh receipt to replace it.`
            : ""
        }
        confirmLabel="Void delivery"
        submitting={voidingReceiptId === voidReceiptTarget?.id}
      />

      <ConfirmDialog
        open={deleteCountTarget !== null}
        onClose={() => setDeleteCountTarget(null)}
        onConfirm={confirmDeleteCount}
        title="Delete today's count"
        bodyCopy={
          deleteCountTarget
            ? `Delete today's count for ${deleteCountTarget.productName}? ` +
              `The stock count and the sale it created (${trimQty(
                deleteCountTarget.unitsSold ?? "0",
              )} sold) will be removed. Do a fresh count to replace it.`
            : ""
        }
        confirmLabel="Delete count"
        submitting={voidingId === deleteCountTarget?.stockCountId}
      />

      <ConfirmDialog
        open={voidCreditSaleTarget !== null}
        onClose={() => setVoidCreditSaleTarget(null)}
        onConfirm={confirmVoidCreditSale}
        title="Void credit sale"
        bodyCopy={
          voidCreditSaleTarget
            ? `Void today's credit sale of ${voidCreditSaleTarget.productName} to ` +
              `${voidCreditSaleTarget.customerName}? The stock returns and the ` +
              `KES ${voidCreditSaleTarget.total} debt is cleared.`
            : ""
        }
        confirmLabel="Void credit sale"
        submitting={voidingCreditSaleId === voidCreditSaleTarget?.stockMovementId}
      />
    </div>
  );
}
