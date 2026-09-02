"use client";

// M3 S3 — the body of /admin/financials: whichever inner tab is active
// (Stock Purchases / Deliveries / Handovers), scoped to the business date
// from the toolbar.
//
// Purchases / Deliveries: a single kit <SimpleTable> each, date-scoped via
// `stockApi.listMovements({ movementType, date })`. The old ADR-46
// "Reconciliation" table is folded in as a Status column:
//   • Stock Purchases → Awaiting delivery · Delivered · Flagged
//     (+ "Record payment" affordance is on Deliveries, not here)
//   • Deliveries → Matched · Unmatched  (Unmatched carries "Record payment")
//
// Handovers: delegates to <HandoversView> (its own read +
// receipt / correction drawers).
//
// Kit-vs-Paper: no separate bespoke Reconciliation table any more — one
// table language. `outstanding` still tells us which payments have no
// receipt yet (Awaiting) and which receipts have no payment (Unmatched);
// we just render that as a chip on the row instead of a second table.

import * as React from "react";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { ErrorState } from "@/components/kit/error-state";
import type {
  OutstandingPurchases,
  StockMovementView,
} from "@/lib/domain/stock";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import { stockApi } from "../stock/use-stock";
import { PaymentDrawer } from "./payment-drawer";
import { HandoversView } from "./handovers-tab";

export type TxTabKey = "purchases" | "deliveries" | "handovers";

// ── helpers ────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

function fmtMoney(dec: string | null): string {
  if (dec == null) return "";
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : dec;
}

function trimQty(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n) ? n.toFixed(1) : dec;
}

const PAID_FROM_LABEL: Record<string, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank Till",
};

type PurchaseStatus = "awaiting_delivery" | "delivered" | "flagged";

const PURCHASE_STATUS: Record<
  PurchaseStatus,
  { label: string; variant: "success" | "warning" | "danger" }
> = {
  awaiting_delivery: { label: "Awaiting delivery", variant: "warning" },
  delivered: { label: "Delivered", variant: "success" },
  flagged: { label: "Flagged", variant: "danger" },
};

// ── component ──────────────────────────────────────────────────────────

export function TransactionsTab({
  tab,
  date,
  isToday,
  registerRecordPayment,
}: {
  tab: TxTabKey;
  /** `YYYY-MM-DD` business date from the toolbar. */
  date: string;
  isToday: boolean;
  registerRecordPayment?: (fn: () => void) => void;
}) {
  const [payments, setPayments] = React.useState<StockMovementView[]>([]);
  const [receipts, setReceipts] = React.useState<StockMovementView[]>([]);
  const [outstanding, setOutstanding] = React.useState<OutstandingPurchases>({
    awaitingReceipt: [],
    unmatchedReceipts: [],
  });
  const [products, setProducts] = React.useState<ProductWithLocations[]>([]);
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [drawerProductId, setDrawerProductId] = React.useState<
    string | undefined
  >(undefined);

  const openDrawer = React.useCallback((productId?: string) => {
    setDrawerProductId(productId);
    setDrawerOpen(true);
  }, []);

  React.useEffect(() => {
    registerRecordPayment?.(() => openDrawer());
  }, [registerRecordPayment, openDrawer]);

  const isStockTab = tab === "purchases" || tab === "deliveries";

  const refresh = React.useCallback(async () => {
    if (!isStockTab) return;
    setLoading(true);
    setError(null);
    try {
      const [pmts, rcpts, out, prods, locs] = await Promise.all([
        stockApi.listMovements({ movementType: "purchase_payment", date }),
        stockApi.listMovements({ movementType: "purchase_receipt", date }),
        stockApi.outstanding(),
        stockApi.listProducts(),
        stockApi.listLocations(),
      ]);
      setPayments(pmts);
      setReceipts(rcpts);
      setOutstanding(out);
      setProducts(prods.filter((p) => p.deletedAt == null));
      setLocations(locs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [isStockTab, date]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const productById = React.useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );
  const locationById = React.useMemo(
    () => new Map(locations.map((l) => [l.id, l])),
    [locations],
  );

  // `outstanding` is the whole open set (not date-scoped) — we only use it
  // to classify the date-scoped rows we ARE showing.
  const awaitingIds = React.useMemo(
    () => new Set(outstanding.awaitingReceipt.map((m) => m.id)),
    [outstanding],
  );
  const unmatchedReceiptIds = React.useMemo(
    () => new Set(outstanding.unmatchedReceipts.map((m) => m.id)),
    [outstanding],
  );

  // ── Handovers tab: delegate ─────────────────────────────────────────
  if (tab === "handovers") {
    return <HandoversView date={date} isToday={isToday} />;
  }

  // ── Purchases / Deliveries columns ─────────────────────────────────
  const purchaseColumns: SimpleTableColumn<StockMovementView>[] = [
    {
      key: "date",
      header: "Date",
      width: "w-[100px] shrink-0",
      cell: "mono",
      render: (m) => fmtDate(m.occurredAt),
    },
    {
      key: "supplier",
      header: "Supplier / Description",
      width: "grow basis-0 min-w-[180px]",
      render: (m) => {
        const product = productById.get(m.productId);
        const costLabel = fmtMoney(m.purchaseTotalCost);
        return (
          <div className="flex flex-col gap-[2px] min-w-0">
            <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/micro truncate">
              {m.purchaseSupplier ?? (
                <span className="[color:var(--text-tertiary)]">
                  Supplier not recorded
                </span>
              )}
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-caption/micro truncate">
              {product
                ? `${product.name} (${product.unitLabel})`
                : m.productId}
              {costLabel ? ` · KES ${costLabel}` : ""}
            </div>
          </div>
        );
      },
    },
    {
      key: "destination",
      header: "Destination",
      width: "w-[110px] shrink-0",
      render: (m) => locationById.get(m.locationId)?.name ?? "—",
    },
    {
      key: "paidFrom",
      header: "Paid from",
      width: "w-[130px] shrink-0",
      render: (m) =>
        m.purchasePaidFrom
          ? (PAID_FROM_LABEL[m.purchasePaidFrom] ?? m.purchasePaidFrom)
          : "—",
    },
    {
      key: "amount",
      header: "Amount (KES)",
      width: "w-[120px] shrink-0",
      align: "right",
      cell: "mono",
      render: (m) =>
        m.purchaseTotalCost != null ? (
          fmtMoney(m.purchaseTotalCost)
        ) : (
          <span className="font-ui [color:var(--text-tertiary)]">
            Not recorded
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[150px] shrink-0",
      render: (m) => {
        const status: PurchaseStatus = m.note
          ?.toLowerCase()
          .includes("variance")
          ? "flagged"
          : awaitingIds.has(m.id)
            ? "awaiting_delivery"
            : "delivered";
        const s = PURCHASE_STATUS[status];
        return <StatusChip variant={s.variant}>{s.label}</StatusChip>;
      },
    },
  ];

  const deliveryColumns: SimpleTableColumn<StockMovementView>[] = [
    {
      key: "date",
      header: "Date",
      width: "w-[100px] shrink-0",
      cell: "mono",
      render: (r) => fmtDate(r.occurredAt),
    },
    {
      key: "item",
      header: "Item",
      width: "grow basis-0 min-w-[180px]",
      render: (r) => {
        const product = productById.get(r.productId);
        return (
          <div className="flex flex-col gap-[2px] min-w-0">
            <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/micro truncate">
              {product
                ? `${product.name} (${product.unitLabel})`
                : r.productId}
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-caption/micro truncate">
              {r.purchasePaymentId
                ? "Matched to a payment"
                : "No matching payment"}
            </div>
          </div>
        );
      },
    },
    {
      key: "destination",
      header: "Destination",
      width: "w-[110px] shrink-0",
      render: (r) => locationById.get(r.locationId)?.name ?? "—",
    },
    {
      key: "quantity",
      header: "Quantity",
      width: "w-[100px] shrink-0",
      align: "right",
      cell: "mono",
      render: (r) => Number(r.quantity).toFixed(1),
    },
    {
      key: "status",
      header: "Status",
      width: "w-[180px] shrink-0",
      render: (r) =>
        r.purchasePaymentId ? (
          <StatusChip variant="success">Matched</StatusChip>
        ) : (
          <div className="flex items-center gap-(--sp-4)">
            <StatusChip variant="warning">Unmatched</StatusChip>
            {unmatchedReceiptIds.has(r.id) && (
              <button
                type="button"
                onClick={() => openDrawer(r.productId)}
                className="kit-interactive font-ui font-(--weight-medium) text-accent text-caption/micro"
              >
                Record payment
              </button>
            )}
          </div>
        ),
    },
  ];

  const dateLabel = fmtDate(`${date}T12:00:00Z`);

  return (
    <>
      {/* ───────── Desktop ───────── */}
      <div className="hidden md:flex flex-col grow gap-(--sp-6) pt-(--sp-6)">
        {error && (
          <div role="alert" className="font-ui text-danger text-body/sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          {tab === "purchases" ? (
            <SimpleTable
              columns={purchaseColumns}
              rows={payments}
              rowKey={(m) => m.id}
              loading={loading && payments.length === 0}
              emptyState={{
                title: `No stock purchases on ${dateLabel}`,
                description:
                  "Payments to suppliers recorded on the selected day appear here.",
                actionLabel: isToday ? "Record Payment" : undefined,
                onAction: isToday ? () => openDrawer() : undefined,
              }}
            />
          ) : (
            <SimpleTable
              columns={deliveryColumns}
              rows={receipts}
              rowKey={(r) => r.id}
              loading={loading && receipts.length === 0}
              emptyState={{
                title: `No deliveries on ${dateLabel}`,
                description:
                  "Deliveries received by the Store Manager on the selected day appear here.",
              }}
            />
          )}
        </div>

      </div>

      {/* ───────── Mobile ───────── */}
      <div className="flex md:hidden flex-col grow min-h-0">
        {error ? (
          <div className="py-(--sp-8) px-(--sp-5)">
            <ErrorState
              title="Couldn't load transactions"
              description="Something went wrong fetching the data. Check your connection and try again."
              onRetry={() => void refresh()}
            />
          </div>
        ) : (
          <div className="flex flex-col grow min-h-0 overflow-y-auto">
            {loading && (payments.length === 0 && receipts.length === 0) ? (
              <div className="flex flex-col">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex flex-col p-(--sp-5) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                  >
                    <div className="kit-skeleton h-[14px] w-2/3 rounded-sm" />
                    <div className="kit-skeleton h-[12px] w-full rounded-sm" />
                  </div>
                ))}
              </div>
            ) : tab === "purchases" ? (
              <MobilePurchaseCards
                rows={payments}
                productById={productById}
                locationById={locationById}
                awaitingIds={awaitingIds}
                dateLabel={dateLabel}
              />
            ) : (
              <MobileDeliveryCards
                rows={receipts}
                productById={productById}
                locationById={locationById}
                unmatchedReceiptIds={unmatchedReceiptIds}
                onRecordPayment={openDrawer}
                dateLabel={dateLabel}
              />
            )}
          </div>
        )}
      </div>

      {drawerOpen && (
        <PaymentDrawer
          products={products}
          locations={locations}
          preselectedProductId={drawerProductId}
          onClose={() => {
            setDrawerOpen(false);
            setDrawerProductId(undefined);
          }}
          onRecorded={refresh}
        />
      )}
    </>
  );
}

// ── Mobile cards ───────────────────────────────────────────────────────

function MobilePurchaseCards({
  rows,
  productById,
  locationById,
  awaitingIds,
  dateLabel,
}: {
  rows: StockMovementView[];
  productById: Map<string, ProductWithLocations>;
  locationById: Map<string, Location>;
  awaitingIds: Set<string>;
  dateLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-(--sp-10) px-(--sp-6) gap-(--sp-3)">
        <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
          No stock purchases on {dateLabel}
        </div>
        <div className="font-ui [color:var(--text-tertiary)] text-sm/sm">
          Payments to suppliers recorded on the selected day appear here.
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {rows.map((m) => {
        const p = productById.get(m.productId);
        const dest = locationById.get(m.locationId)?.name ?? "—";
        const status: PurchaseStatus = m.note
          ?.toLowerCase()
          .includes("variance")
          ? "flagged"
          : awaitingIds.has(m.id)
            ? "awaiting_delivery"
            : "delivered";
        const s = PURCHASE_STATUS[status];
        return (
          <div
            key={m.id}
            className="flex flex-col p-(--sp-5) gap-(--sp-2) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
          >
            <div className="flex items-baseline justify-between gap-(--sp-4)">
              <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
                {m.purchaseSupplier ?? "Supplier not recorded"}
              </span>
              <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-body/body shrink-0">
                {m.purchaseTotalCost != null
                  ? `KES ${fmtMoney(m.purchaseTotalCost)}`
                  : "Not recorded"}
              </span>
            </div>
            <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
              {p ? `${p.name} ${trimQty(m.purchaseOrderedQty ?? "0")} ${p.unitLabel}` : m.productId}
              {" · "}
              {dest}
              {" · "}
              {fmtDate(m.occurredAt)}
            </div>
            <div>
              <StatusChip variant={s.variant}>{s.label}</StatusChip>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MobileDeliveryCards({
  rows,
  productById,
  locationById,
  unmatchedReceiptIds,
  onRecordPayment,
  dateLabel,
}: {
  rows: StockMovementView[];
  productById: Map<string, ProductWithLocations>;
  locationById: Map<string, Location>;
  unmatchedReceiptIds: Set<string>;
  onRecordPayment: (productId?: string) => void;
  dateLabel: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-(--sp-10) px-(--sp-6) gap-(--sp-3)">
        <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
          No deliveries on {dateLabel}
        </div>
        <div className="font-ui [color:var(--text-tertiary)] text-sm/sm">
          Deliveries received by the Store Manager on the selected day appear here.
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {rows.map((r) => {
        const p = productById.get(r.productId);
        const dest = locationById.get(r.locationId)?.name ?? "—";
        const matched = Boolean(r.purchasePaymentId);
        return (
          <div
            key={r.id}
            className="flex flex-col p-(--sp-5) gap-(--sp-2) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
          >
            <div className="flex items-baseline justify-between gap-(--sp-4)">
              <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
                {p ? `${p.name} delivery` : "Delivery"}
              </span>
              <span className="font-mono shrink-0 [color:var(--text-primary)] text-body/body">
                {Number(r.quantity).toFixed(1)}
                {p ? ` ${p.unitLabel}` : ""}
              </span>
            </div>
            <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
              {dest} · {fmtDate(r.occurredAt)}
            </div>
            <div className="flex items-center gap-(--sp-4)">
              <StatusChip variant={matched ? "success" : "warning"}>
                {matched ? "Matched" : "Unmatched"}
              </StatusChip>
              {!matched && unmatchedReceiptIds.has(r.id) && (
                <button
                  type="button"
                  onClick={() => onRecordPayment(r.productId)}
                  className="kit-interactive font-ui font-(--weight-medium) text-accent text-caption/micro"
                >
                  Record payment
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
