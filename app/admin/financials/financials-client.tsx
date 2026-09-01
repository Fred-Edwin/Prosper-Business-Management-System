// Session 11 rebuild — COMPOSED from the kit. Session 16 (ADR-46): the
// Reconciliation section is rebuilt from a <MatchCard> list into a table
// (Date · Supplier/Item · Product · Destination · Amount · Status · Action)
// with the four-term status vocabulary and a "Record payment" action on
// deliveries with no payment. Everything above the Reconciliation heading —
// the KPI strip, the tabs, the transactions table — is UNCHANGED (scope
// correction, ADR-46 box at top). No <MatchCard> on this screen any more.
//
// The recon table is bespoke screen markup (not the kit <SimpleTable>):
// it needs a per-row background tint (`--surface-subtle` on the
// "Received, no payment" row) and `min-h` rows, neither of which the kit
// <SimpleTable> exposes. It matches Paper artboard BHJ-0 / BR7-0.
//
// M1 Financials cut (milestone-1-plan §2 / ADR-36 D-FIN): the 4-tile KPI stat
// strip has NO F2 data source (the MoneyMovement ledger is F3). Per the owner:
// keep the strip markup, render all four values as "—" with an "M3" caption.
// Do NOT wire it, do NOT delete the slot. No client-side money math.
// TODO(mock): the KPI strip is intentionally unwired — full figures land with
// the F3 MoneyMovement ledger (Milestone 3). Re-scoped, not forgotten.
//
// The data path is unchanged: the 5 parallel fetches via stockApi, the
// payment/receipt/outstanding shaping, and the drawer orchestration are verbatim.
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { Tabs } from "@/components/kit/tabs";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { StatusChip } from "@/components/kit/status-chip";
import { ErrorState } from "@/components/kit/error-state";
import { Button } from "@/components/kit/button";
import type {
  OutstandingPurchases,
  StockMovementView,
} from "@/lib/domain/stock";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import { stockApi } from "../stock/use-stock";
import { PaymentDrawer } from "./payment-drawer";

const KPI_TILES = [
  "Total Business Liquidity",
  "Cash",
  "M-Pesa / Bank Till",
  "Today's Total Outflows",
];

// Mobile KPI grid (artboard IQO-0): a dark 2×2 grid. Same four figures, still
// unwired until the F3 MoneyMovement ledger (ADR-36 D-FIN) — rendered "—" / "M3"
// with the artboard's semantic colour per cell, just made to fit 390px.
const MOBILE_KPI_TILES: { label: string; tone: string }[] = [
  { label: "Total liquidity", tone: "text-white" },
  { label: "Cash at hand", tone: "text-success" },
  { label: "M-Pesa / Bank", tone: "text-info" },
  { label: "Today's outflows", tone: "text-danger" },
];

const PAID_FROM_LABEL: Record<string, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa / Bank Till",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

/** Short "Aug 24" for the reconciliation table's Date column. */
function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

/** "18,000.00" from a "18000.00" decimal string; "" for null. */
function fmtMoney(dec: string | null): string {
  if (dec == null) return "";
  const n = Number(dec);
  return Number.isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : dec;
}

/** "100.0" from a "100.0000" decimal string. */
function trimQty(dec: string): string {
  const n = Number(dec);
  return Number.isFinite(n) ? n.toFixed(1) : dec;
}

/** "Aug 24" for the mobile txn card's `·`-joined meta line. */
function fmtDateMed(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

/** The Africa/Nairobi calendar day of an instant (YYYY-MM-DD), for the
 * "recently delivered" window on the reconciliation table. */
function nairobiDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
}

type ReconStatus =
  | "awaiting_delivery"
  | "delivered"
  | "received_no_payment"
  | "flagged";

type ReconRow = {
  id: string;
  dateIso: string;
  /** Supplier name (payment rows) or a delivery label (receipt rows). */
  supplierOrItem: string;
  /** "Rice Basmati · 100.0 kg" — product name + qty. */
  product: string;
  destination: string;
  /** Formatted "18,000.00", or null → renders "—". */
  amount: string | null;
  status: ReconStatus;
  /** Set on `received_no_payment` rows — pre-selects the payment drawer. */
  recordPaymentProductId?: string;
};

const RECON_STATUS: Record<
  ReconStatus,
  { label: string; dot: string; text: string }
> = {
  awaiting_delivery: {
    label: "Awaiting delivery",
    dot: "bg-warning",
    text: "text-warning",
  },
  delivered: { label: "Delivered", dot: "bg-success", text: "text-success" },
  received_no_payment: {
    label: "Received, no payment",
    dot: "bg-info",
    text: "text-info",
  },
  flagged: { label: "Flagged", dot: "bg-danger", text: "text-danger" },
};

type PurchaseTxRow = {
  payment: StockMovementView;
  matched: boolean;
};

export function FinancialsClient() {
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
  const [drawerProductId, setDrawerProductId] = React.useState<string | undefined>(
    undefined,
  );

  const openDrawer = React.useCallback((productId?: string) => {
    setDrawerProductId(productId);
    setDrawerOpen(true);
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pmts, rcpts, out, prods, locs] = await Promise.all([
        stockApi.listMovements({ movementType: "purchase_payment" }),
        stockApi.listMovements({ movementType: "purchase_receipt" }),
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
      setError(e instanceof Error ? e.message : "Failed to load financials.");
    } finally {
      setLoading(false);
    }
  }, []);

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

  const awaitingIds = React.useMemo(
    () => new Set(outstanding.awaitingReceipt.map((m) => m.id)),
    [outstanding],
  );

  const txRows: PurchaseTxRow[] = payments.map((p) => ({
    payment: p,
    matched: !awaitingIds.has(p.id),
  }));

  // Reconciliation table rows (ADR-46 §2). No new endpoint: rows come from
  // `outstanding` (awaiting + unmatched) plus the recently-Delivered
  // payments (a payment a receipt links back to, occurring on today's
  // Africa/Nairobi business day — the "recently" window is a
  // Development-Sprint detail, not a design decision).
  const reconRows: ReconRow[] = React.useMemo(() => {
    const productLabel = (m: StockMovementView, qty: string) => {
      const p = productById.get(m.productId);
      return `${p ? p.name : m.productId} · ${trimQty(qty)}${
        p ? ` ${p.unitLabel}` : ""
      }`;
    };
    const destName = (m: StockMovementView) =>
      locationById.get(m.locationId)?.name ?? "—";
    const today = nairobiDay(new Date().toISOString());

    const rows: ReconRow[] = [];

    // Awaiting delivery — a payment with no receipt linking back.
    for (const m of outstanding.awaitingReceipt) {
      rows.push({
        id: m.id,
        dateIso: m.occurredAt,
        supplierOrItem: m.purchaseSupplier ?? "Supplier not recorded",
        product: productLabel(m, m.purchaseOrderedQty ?? "0"),
        destination: destName(m),
        amount: m.purchaseTotalCost != null ? fmtMoney(m.purchaseTotalCost) : null,
        status: m.note?.toLowerCase().includes("variance")
          ? "flagged"
          : "awaiting_delivery",
      });
    }

    // Delivered — a payment a receipt links back to, on today's business day.
    for (const m of payments) {
      if (awaitingIds.has(m.id)) continue; // still awaiting → handled above
      if (nairobiDay(m.occurredAt) !== today) continue; // outside the window
      rows.push({
        id: m.id,
        dateIso: m.occurredAt,
        supplierOrItem: m.purchaseSupplier ?? "Supplier not recorded",
        product: productLabel(m, m.purchaseOrderedQty ?? "0"),
        destination: destName(m),
        amount: m.purchaseTotalCost != null ? fmtMoney(m.purchaseTotalCost) : null,
        status: m.note?.toLowerCase().includes("variance") ? "flagged" : "delivered",
      });
    }

    // Received, no payment — a receipt with a null purchasePaymentId.
    for (const m of outstanding.unmatchedReceipts) {
      const p = productById.get(m.productId);
      rows.push({
        id: m.id,
        dateIso: m.occurredAt,
        supplierOrItem: `${p ? p.name : m.productId} delivery`,
        product: productLabel(m, m.quantity),
        destination: destName(m),
        amount: null,
        status: "received_no_payment",
        recordPaymentProductId: m.productId,
      });
    }

    return rows.sort((a, b) => b.dateIso.localeCompare(a.dateIso));
  }, [outstanding, payments, awaitingIds, productById, locationById]);

  const TAB_PURCHASES = "purchases";
  const TAB_DELIVERIES = "deliveries";
  const tabs = [
    { key: TAB_PURCHASES, label: `Stock Purchases (${payments.length})` },
    { key: TAB_DELIVERIES, label: `Deliveries (${receipts.length})` },
  ];
  const [activeTab, setActiveTab] = React.useState(TAB_PURCHASES);

  const paymentColumns: SimpleTableColumn<PurchaseTxRow>[] = [
    {
      key: "date",
      header: "Date",
      width: "w-[100px]",
      cell: "mono",
      render: ({ payment }) => fmtDate(payment.occurredAt),
    },
    {
      key: "vendor",
      header: "Vendor / Description",
      width: "grow min-w-[200px]",
      render: ({ payment }) => {
        const product = productById.get(payment.productId);
        const costLabel = fmtMoney(payment.purchaseTotalCost);
        return (
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/micro">
              {payment.purchaseSupplier ?? (
                <span className="[color:var(--text-tertiary)]">
                  Supplier not recorded
                </span>
              )}
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              {product ? `${product.name} (${product.unitLabel})` : payment.productId}
              {costLabel ? ` · KES ${costLabel}` : ""}
            </div>
          </div>
        );
      },
    },
    {
      key: "destination",
      header: "Destination",
      width: "w-[110px]",
      render: ({ payment }) => locationById.get(payment.locationId)?.name ?? "—",
    },
    {
      key: "paidFrom",
      header: "Paid From",
      width: "w-[130px]",
      render: ({ payment }) =>
        payment.purchasePaidFrom
          ? (PAID_FROM_LABEL[payment.purchasePaidFrom] ?? payment.purchasePaidFrom)
          : "—",
    },
    {
      key: "amount",
      header: "Amount (KES)",
      width: "w-[130px]",
      align: "right",
      cell: "mono",
      render: ({ payment }) =>
        payment.purchaseTotalCost != null ? (
          fmtMoney(payment.purchaseTotalCost)
        ) : (
          <span className="font-ui [color:var(--text-tertiary)]">
            Cost not recorded
          </span>
        ),
    },
    {
      key: "status",
      header: "Delivery Status",
      width: "w-[150px]",
      render: ({ matched }) => (
        <StatusChip variant={matched ? "success" : "warning"}>
          {matched ? "Received" : "Pending Delivery"}
        </StatusChip>
      ),
    },
  ];

  const receiptColumns: SimpleTableColumn<StockMovementView>[] = [
    {
      key: "date",
      header: "Date",
      width: "w-[100px]",
      cell: "mono",
      render: (r) => fmtDate(r.occurredAt),
    },
    {
      key: "vendor",
      header: "Vendor / Description",
      width: "grow min-w-[200px]",
      render: (r) => {
        const product = productById.get(r.productId);
        return (
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/micro">
              {product ? `${product.name} (${product.unitLabel})` : r.productId}
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              {r.purchasePaymentId ? "Matched to a payment" : "No matching payment"}
            </div>
          </div>
        );
      },
    },
    {
      key: "destination",
      header: "Destination",
      width: "w-[110px]",
      render: (r) => locationById.get(r.locationId)?.name ?? "—",
    },
    {
      key: "quantity",
      header: "Quantity",
      width: "w-[100px]",
      align: "right",
      cell: "mono",
      render: (r) => Number(r.quantity).toFixed(1),
    },
    {
      key: "status",
      header: "Match Status",
      width: "w-[150px]",
      render: (r) => (
        <StatusChip variant={r.purchasePaymentId ? "success" : "warning"}>
          {r.purchasePaymentId ? "Matched" : "Unmatched"}
        </StatusChip>
      ),
    },
  ];

  return (
    <PageShell
      toolbar={
        <>
          <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
            Financials &amp; Expenses
          </div>
          <div className="font-ui shrink-0 self-center [color:var(--text-tertiary)] text-caption/micro">
            ({fmtDate(new Date().toISOString())})
          </div>
          <div className="grow" />
          <Button variant="primary" onClick={() => openDrawer()}>
            Record Payment
          </Button>
        </>
      }
    >
      {/* ───────── Desktop ───────── */}
      <div className="hidden md:flex flex-col grow gap-(--sp-8)">
        {/* KPI stat strip — markup kept; values unwired until F3 (ADR-36 D-FIN). */}
        <div className="flex [width:100%] items-center shrink-0 border border-solid [border-color:var(--border-subtle)]">
          {KPI_TILES.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && (
                <div className="w-px self-stretch shrink-0 [background-color:var(--border-subtle)]" />
              )}
              <div
                className={`flex flex-col gap-(--sp-3) self-stretch justify-center py-(--sp-6) ${
                  i === 0
                    ? "pr-(--sp-8)"
                    : i === KPI_TILES.length - 1
                      ? "pl-(--sp-8)"
                      : "px-(--sp-8)"
                }`}
              >
                <div className="font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro">
                  {label}
                </div>
                <div className="flex items-baseline gap-(--sp-3)">
                  <div className="font-mono font-(--weight-semibold) text-display/display [color:var(--text-tertiary)]">
                    —
                  </div>
                  <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                    M3
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div role="alert" className="font-ui text-danger text-body/sm">
            {error}
          </div>
        )}

        <Tabs tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

        {activeTab === TAB_PURCHASES ? (
          <SimpleTable
            columns={paymentColumns}
            rows={txRows}
            rowKey={({ payment }) => payment.id}
            loading={loading && txRows.length === 0}
            emptyState={{
              title: "No purchase payments recorded",
              description: "Record a payment to a supplier to start the 2-way match.",
              actionLabel: "Record Payment",
              onAction: () => openDrawer(),
            }}
          />
        ) : (
          <SimpleTable
            columns={receiptColumns}
            rows={receipts}
            rowKey={(r) => r.id}
            loading={loading && receipts.length === 0}
            emptyState={{
              title: "No deliveries recorded",
              description: "Deliveries appear here once the Store Manager receives them.",
            }}
          />
        )}

        {/* Reconciliation — a table (ADR-46 §2): one row per open or
            recently-resolved purchase. Bespoke markup (per-row tint +
            min-h rows aren't in the kit <SimpleTable>). Matches BHJ-0 / BR7-0. */}
        <div className="flex flex-col [width:100%] gap-(--sp-5)">
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
              Reconciliation
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              Has each payment been delivered? And which deliveries still need a
              payment recorded?
            </div>
          </div>

          {loading ? (
            <ReconTable rows={[]} loading onRecordPayment={openDrawer} />
          ) : reconRows.length === 0 ? (
            <div className="font-ui [color:var(--text-secondary)] [background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)] px-(--sp-6) py-(--sp-5) text-sm/sm">
              Every payment is matched to a delivery, and every delivery has a
              payment. Nothing to reconcile.
            </div>
          ) : (
            <ReconTable rows={reconRows} onRecordPayment={openDrawer} />
          )}
        </div>
      </div>

      {/* ───────── Mobile (artboard IQO-0 / ITG-0 / IW1-0 / IYM-0 / J17-0) ───────── */}
      <MobileFinancials
        kpiTiles={MOBILE_KPI_TILES}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        txnTab={activeTab}
        purchaseTab={TAB_PURCHASES}
        txRows={txRows}
        receipts={receipts}
        productById={productById}
        locationById={locationById}
        reconRows={reconRows}
        loading={loading}
        error={error}
        onRetry={() => void refresh()}
        onRecordPayment={openDrawer}
      />

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
    </PageShell>
  );
}

// ── Reconciliation table (ADR-46 §2, artboards BHJ-0 / BR7-0) ──────────────
// Bespoke, not the kit <SimpleTable>: the "Received, no payment" row is
// tinted `--surface-subtle` and rows are `min-h` — neither is a
// <SimpleTable> capability. Status is a dot + colored text at table
// density (design-principles §4.4), not a filled StatusChip pill.

const RECON_COL = {
  date: "w-[84px] shrink-0",
  supplier: "grow basis-0 min-w-[150px]",
  product: "w-[170px] shrink-0",
  destination: "w-[90px] shrink-0",
  amount: "w-[110px] shrink-0 text-right flex justify-end flex-wrap",
  status: "w-[150px] shrink-0",
  action: "w-[110px] shrink-0",
} as const;

const RECON_HEADER_CELL =
  "font-ui text-[10px] [letter-spacing:var(--tracking-caps)] leading-[12px] uppercase font-(--weight-semibold) text-info";

function ReconTable({
  rows,
  loading = false,
  onRecordPayment,
}: {
  rows: ReconRow[];
  loading?: boolean;
  onRecordPayment: (productId?: string) => void;
}) {
  return (
    <div className="[font-synthesis:none] flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)] antialiased">
      {/* Header */}
      <div className="flex items-center h-[32px] px-[16px] gap-[16px] shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600">
        <div className={`${RECON_COL.date} ${RECON_HEADER_CELL}`}>Date</div>
        <div className={`${RECON_COL.supplier} ${RECON_HEADER_CELL}`}>
          Supplier / Item
        </div>
        <div className={`${RECON_COL.product} ${RECON_HEADER_CELL}`}>Product</div>
        <div className={`${RECON_COL.destination} ${RECON_HEADER_CELL}`}>
          Destination
        </div>
        <div className={`${RECON_COL.amount} ${RECON_HEADER_CELL}`}>Amount</div>
        <div className={`${RECON_COL.status} ${RECON_HEADER_CELL}`}>Status</div>
        <div className={`${RECON_COL.action} ${RECON_HEADER_CELL}`}>Action</div>
      </div>

      {loading
        ? [0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center h-[44px] px-[16px] gap-[16px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="kit-skeleton h-[12px] grow rounded-sm" />
            </div>
          ))
        : rows.map((row) => {
            const status = RECON_STATUS[row.status];
            const tinted = row.status === "received_no_payment";
            return (
              <div
                key={row.id}
                className={`flex items-center min-h-[44px] py-[8px] px-[16px] gap-[16px] border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
                  tinted ? "[background-color:var(--surface-subtle)]" : ""
                }`}
              >
                <div
                  className={`${RECON_COL.date} font-mono [color:var(--text-secondary)] text-sm/sm`}
                >
                  {fmtDateShort(row.dateIso)}
                </div>
                <div
                  className={`${RECON_COL.supplier} font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm`}
                >
                  {row.supplierOrItem}
                </div>
                <div
                  className={`${RECON_COL.product} font-ui [color:var(--text-secondary)] text-sm/sm`}
                >
                  {row.product}
                </div>
                <div
                  className={`${RECON_COL.destination} font-ui [color:var(--text-secondary)] text-sm/sm`}
                >
                  {row.destination}
                </div>
                <div
                  className={`${RECON_COL.amount} font-mono text-sm/sm ${
                    row.amount == null
                      ? "[color:var(--text-tertiary)] font-ui"
                      : "[color:var(--text-primary)]"
                  }`}
                >
                  {row.amount ?? "—"}
                </div>
                <div className={`${RECON_COL.status} flex items-center gap-[6px]`}>
                  <span
                    className={`w-[6px] h-[6px] rounded-[3px] shrink-0 ${status.dot}`}
                  />
                  <span
                    className={`font-ui font-(--weight-medium) ${status.text} text-sm/sm`}
                  >
                    {status.label}
                  </span>
                </div>
                <div className={RECON_COL.action}>
                  {row.status === "received_no_payment" ? (
                    <button
                      type="button"
                      onClick={() => onRecordPayment(row.recordPaymentProductId)}
                      className="kit-interactive font-ui font-(--weight-medium) text-accent text-sm/sm"
                    >
                      Record payment
                    </button>
                  ) : (
                    <span className="font-ui [color:var(--text-tertiary)] text-sm/sm">
                      —
                    </span>
                  )}
                </div>
              </div>
            );
          })}
    </div>
  );
}

// ── Mobile Financials (artboards IQO-0 populated / ITG-0 empty / IW1-0 loading /
//    IYM-0 error / J17-0 payment sheet). Per fidelity-audit-m1.md §"Admin
//    Financials — mobile" — the 10 numbered deltas. A `< --bp-md` branch;
//    the desktop markup above is the `md:` branch, unchanged. ────────────────

const MOBILE_RECON_STATUS: Record<
  ReconStatus,
  { label: string; text: string; tinted: boolean }
> = {
  awaiting_delivery: { label: "• Awaiting delivery", text: "text-warning", tinted: false },
  delivered: { label: "• Delivered", text: "text-success", tinted: false },
  received_no_payment: {
    label: "• Received, no payment",
    text: "text-info",
    tinted: true,
  },
  flagged: { label: "• Flagged", text: "text-danger", tinted: false },
};

function MobileFinancials({
  kpiTiles,
  tabs,
  activeTab,
  onTabChange,
  txnTab,
  purchaseTab,
  txRows,
  receipts,
  productById,
  locationById,
  reconRows,
  loading,
  error,
  onRetry,
  onRecordPayment,
}: {
  kpiTiles: { label: string; tone: string }[];
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTabChange: (key: string) => void;
  txnTab: string;
  purchaseTab: string;
  txRows: PurchaseTxRow[];
  receipts: StockMovementView[];
  productById: Map<string, ProductWithLocations>;
  locationById: Map<string, Location>;
  reconRows: ReconRow[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onRecordPayment: (productId?: string) => void;
}) {
  const showPurchases = txnTab === purchaseTab;

  const metaLine = (m: StockMovementView, qty: string) => {
    const p = productById.get(m.productId);
    const dest = locationById.get(m.locationId)?.name ?? "—";
    const paidFrom = m.purchasePaidFrom
      ? (PAID_FROM_LABEL[m.purchasePaidFrom] ?? m.purchasePaidFrom)
      : null;
    const parts = [
      `${p ? p.name : m.productId} ${trimQty(qty)}${p ? ` ${p.unitLabel}` : ""}`,
      dest,
      ...(paidFrom ? [paidFrom] : []),
      fmtDateMed(m.occurredAt),
    ];
    return parts.join(" · ");
  };

  const txnCards = showPurchases
    ? txRows.map(({ payment, matched }) => ({
        id: payment.id,
        title: payment.purchaseSupplier ?? "Supplier not recorded",
        amount:
          payment.purchaseTotalCost != null
            ? `KES ${fmtMoney(payment.purchaseTotalCost)}`
            : "Cost not recorded",
        meta: metaLine(payment, payment.purchaseOrderedQty ?? "0"),
        statusText: matched ? "• Received" : "• Pending delivery",
        statusTone: matched ? "text-success" : "text-warning",
      }))
    : receipts.map((r) => {
        const p = productById.get(r.productId);
        return {
          id: r.id,
          title: p ? `${p.name} delivery` : "Delivery",
          amount: "",
          meta: metaLine(r, r.quantity),
          statusText: r.purchasePaymentId ? "• Matched" : "• Unmatched",
          statusTone: r.purchasePaymentId ? "text-success" : "text-warning",
        };
      });

  const emptyCopy = showPurchases
    ? {
        title: "No transactions yet",
        body: "Stock payments, expenses and owner draws will appear here as they are recorded.",
      }
    : {
        title: "No deliveries recorded",
        body: "Deliveries appear here once the Store Manager receives them.",
      };

  return (
    <div className="flex md:hidden flex-col grow min-h-0">
      <div className="flex flex-col grow min-h-0 overflow-y-auto">
        {/* 1. KPI 2×2 grid — dark, present but unwired (— / M3, ADR-36 D-FIN). */}
        <div className="flex flex-wrap [background-color:var(--nav-bg)] shrink-0">
          {kpiTiles.map((tile, i) => (
            <div
              key={tile.label}
              className={`flex flex-col grow basis-[45%] p-(--sp-5) gap-(--sp-2) ${
                i % 2 === 0
                  ? "border-r border-r-solid border-r-(--nav-border)"
                  : ""
              } ${
                i < 2 ? "border-b border-b-solid border-b-(--nav-border)" : ""
              }`}
            >
              <div className="font-ui uppercase [letter-spacing:var(--tracking-caps)] text-(--nav-text-label) text-micro/micro">
                {tile.label}
              </div>
              <div className="flex items-baseline gap-(--sp-3)">
                <div
                  className={`font-mono font-(--weight-semibold) ${tile.tone} text-body/body`}
                >
                  —
                </div>
                <div className="font-ui text-(--nav-text-label) text-micro/micro">
                  M3
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 3. Transaction tabs → horizontally-scrollable chip row (8Q4-0 pattern). */}
        <div className="flex items-center py-(--sp-4) px-(--sp-5) overflow-x-auto gap-(--sp-3) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          {tabs.map((t) => {
            const active = t.key === activeTab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onTabChange(t.key)}
                aria-pressed={active}
                className={`flex items-center h-[32px] shrink-0 px-(--sp-4) rounded-lg kit-focus-ring ${
                  active
                    ? "[background-color:var(--surface-selected)]"
                    : "border border-solid [border-color:var(--border-strong)]"
                }`}
              >
                <span
                  className={`font-ui ${
                    active
                      ? "font-(--weight-medium) text-accent"
                      : "[color:var(--text-secondary)]"
                  } text-sm/micro`}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="py-(--sp-8)">
            <ErrorState
              title="Couldn't load financials"
              description="Something went wrong fetching the data. Check your connection and try again."
              onRetry={onRetry}
            />
          </div>
        ) : loading ? (
          /* 7. loading — KPI + tabs stay; txn list = 3 skeleton rows. */
          <div className="flex flex-col [width:100%]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex flex-col p-(--sp-5) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="kit-skeleton h-[14px] w-2/3 rounded-sm" />
                <div className="kit-skeleton h-[12px] w-full rounded-sm" />
                <div className="kit-skeleton h-[12px] w-1/3 rounded-sm" />
              </div>
            ))}
          </div>
        ) : txnCards.length === 0 ? (
          <div className="flex flex-col items-center text-center py-(--sp-10) px-(--sp-6) gap-(--sp-3)">
            <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body">
              {emptyCopy.title}
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-sm/sm">
              {emptyCopy.body}
            </div>
          </div>
        ) : (
          /* 4. Transactions → stacked-row cards. */
          <div className="flex flex-col [width:100%]">
            {txnCards.map((c) => (
              <div
                key={c.id}
                className="flex flex-col p-(--sp-5) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="flex items-baseline gap-(--sp-4)">
                  <div className="font-ui font-(--weight-medium) grow [color:var(--text-primary)] text-body/body">
                    {c.title}
                  </div>
                  {c.amount && (
                    <div className="font-mono font-(--weight-semibold) shrink-0 [color:var(--text-primary)] text-body/body">
                      {c.amount}
                    </div>
                  )}
                </div>
                <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
                  {c.meta}
                </div>
                {/* Artboard shows an "Edit" link here, but there is no
                    edit-a-payment flow (the desktop table is read-only too —
                    corrections go through Reconciliation). Status only. */}
                <div className={`font-ui ${c.statusTone} text-caption/micro`}>
                  {c.statusText}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 5. Reconciled-outflows footer — stacked dark block. Unwired money
            (F3) so figures render as "—". 10. margin-top so it doesn't butt
            the last txn card. */}
        {!error && (
          <div className="flex flex-col p-(--sp-5) gap-(--sp-2) mt-(--sp-4) [background-color:var(--nav-bg)] shrink-0">
            <div className="font-ui uppercase [letter-spacing:var(--tracking-caps)] text-(--nav-text-label) text-micro/micro">
              Total reconciled outflows
            </div>
            <div className="flex items-baseline flex-wrap gap-(--sp-4)">
              <div className="font-ui text-white text-caption/micro">Cash —</div>
              <div className="font-ui text-white text-caption/micro">
                Bank/M-Pesa —
              </div>
            </div>
            <div className="flex items-baseline gap-(--sp-3)">
              <div className="font-ui text-(--nav-text-subtle) text-sm/micro">
                Total outflow
              </div>
              <div className="font-mono font-(--weight-semibold) text-danger text-body/sm">
                —
              </div>
            </div>
          </div>
        )}

        {/* 6 + 10. Reconciliation → stacked cards, with a section-rhythm break. */}
        <div className="flex flex-col mt-(--sp-8) border-t-8 border-t-solid [border-top-color:var(--surface-subtle)]">
          <div className="flex flex-col pb-(--sp-4) pt-(--sp-6) gap-(--sp-1)">
            <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
              Reconciliation
            </div>
            <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
              Payments awaiting delivery, and deliveries without a payment.
            </div>
          </div>

          {error ? (
            <div className="font-ui [color:var(--text-tertiary)] text-sm/sm px-(--sp-5) pb-(--sp-5)">
              Reconciliation is unavailable while the page can't load.
            </div>
          ) : loading ? (
            <div className="flex flex-col p-(--sp-5) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
              <div className="kit-skeleton h-[14px] w-1/2 rounded-sm" />
              <div className="kit-skeleton h-[12px] w-3/4 rounded-sm" />
            </div>
          ) : reconRows.length === 0 ? (
            <div className="font-ui [color:var(--text-secondary)] text-sm/sm px-(--sp-5) pb-(--sp-5)">
              Every payment is matched to a delivery, and every delivery has a
              payment. Nothing to reconcile.
            </div>
          ) : (
            reconRows.map((row) => {
              const s = MOBILE_RECON_STATUS[row.status];
              return (
                <div
                  key={row.id}
                  className={`flex flex-col p-(--sp-5) gap-(--sp-3) border-b border-b-solid [border-bottom-color:var(--border-subtle)] ${
                    s.tinted ? "[background-color:var(--surface-subtle)]" : ""
                  }`}
                >
                  <div className="flex items-baseline gap-(--sp-4)">
                    <div className="font-ui font-(--weight-medium) grow [color:var(--text-primary)] text-body/body">
                      {row.supplierOrItem}
                    </div>
                    <div
                      className={`font-mono shrink-0 text-body/sm ${
                        row.amount == null
                          ? "[color:var(--text-tertiary)]"
                          : "[color:var(--text-primary)]"
                      }`}
                    >
                      {row.amount ?? "—"}
                    </div>
                  </div>
                  <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
                    {row.product}
                  </div>
                  <div className={`font-ui ${s.text} text-caption/micro`}>
                    {s.label}
                  </div>
                  {row.status === "received_no_payment" && (
                    <button
                      type="button"
                      onClick={() => onRecordPayment(row.recordPaymentProductId)}
                      className="flex items-center justify-center h-[40px] mt-(--sp-2) rounded-md shrink-0 bg-accent kit-interactive kit-focus-ring"
                    >
                      <span className="font-ui font-(--weight-medium) text-white text-body/sm">
                        Record payment
                      </span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 9. Global "Record Payment" → sticky bottom action bar. */}
      <div className="flex items-center py-(--sp-4) px-(--sp-5) gap-(--sp-4) shrink-0 [background-color:var(--surface-page)] border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <button
          type="button"
          onClick={() => onRecordPayment()}
          className="flex items-center justify-center h-[44px] grow rounded-md gap-(--sp-2) bg-accent kit-interactive kit-focus-ring"
        >
          <span className="font-ui font-(--weight-medium) text-white text-body/sm">
            + Record Payment
          </span>
        </button>
      </div>
    </div>
  );
}
