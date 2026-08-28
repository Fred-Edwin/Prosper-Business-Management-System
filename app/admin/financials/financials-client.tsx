// Session 11 rebuild — COMPOSED from the kit, no longer a transcription of
// Paper artboards 7ZJ-0 / 85W-0. Assembled from <PageShell> + <Tabs> +
// <SimpleTable> + <StatusChip> + <MatchCard> (reconciliation, in a role="list")
// + the rail <Drawer> + <Toast>.
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
import { StatusChip, type StatusChipVariant } from "@/components/kit/status-chip";
import { MatchCard } from "@/components/kit/match-card";
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
  "Cash at Hand",
  "M-Pesa / Bank Till",
  "Today's Total Outflows",
];

const PAID_FROM_LABEL: Record<string, string> = {
  cash: "Cash at Hand",
  mpesa_bank: "M-Pesa / Bank Till",
};

/** Pull "supplier" / "cost" out of a purchase_payment note. Best-effort, display-only. */
function parsePaymentNote(note: string | null): {
  supplier?: string;
  cost?: string;
  paidFrom?: string;
} {
  if (!note) return {};
  const supplier = note.match(/supplier[:=]\s*([^;|]+)/i)?.[1]?.trim();
  const cost = note.match(/cost[:=]\s*([\d,]+(?:\.\d{2})?)/i)?.[1]?.trim();
  const paidFrom = note.match(/(cash|mpesa_bank)/i)?.[1]?.toLowerCase();
  return { supplier, cost, paidFrom };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

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
        const note = parsePaymentNote(payment.note);
        const product = productById.get(payment.productId);
        return (
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/micro">
              {note.supplier ?? "—"}
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              {product ? `${product.name} (${product.unitLabel})` : payment.productId}
              {note.cost ? ` · KES ${note.cost}` : ""}
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
      render: ({ payment }) => {
        const { paidFrom } = parsePaymentNote(payment.note);
        return paidFrom ? (PAID_FROM_LABEL[paidFrom] ?? paidFrom) : "—";
      },
    },
    {
      key: "amount",
      header: "Amount (KES)",
      width: "w-[130px]",
      align: "right",
      cell: "mono",
      render: ({ payment }) => parsePaymentNote(payment.note).cost ?? "—",
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

  const reconciliationEmpty =
    outstanding.awaitingReceipt.length === 0 &&
    outstanding.unmatchedReceipts.length === 0;

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
          <Button variant="primary" onClick={() => setDrawerOpen(true)}>
            Record Payment
          </Button>
        </>
      }
    >
      <div className="flex flex-col grow gap-(--sp-8)">
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
              onAction: () => setDrawerOpen(true),
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

        {/* Reconciliation — a list of <MatchCard>s (payments awaiting delivery,
            deliveries with no matching payment). */}
        <div className="flex flex-col [width:100%] gap-(--sp-5)">
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h2/h2">
              Reconciliation
            </div>
            <div className="font-ui [color:var(--text-tertiary)] text-caption/micro">
              Payments awaiting delivery, and deliveries without a matching payment
            </div>
          </div>

          {loading ? (
            <div className="font-ui [color:var(--text-tertiary)] text-sm/micro">
              Loading…
            </div>
          ) : reconciliationEmpty ? (
            <div className="font-ui [color:var(--text-tertiary)] text-sm/micro">
              Everything reconciles — no open items.
            </div>
          ) : (
            <div
              role="list"
              aria-label="Reconciliation items"
              className="flex flex-col gap-(--sp-4)"
            >
              {outstanding.awaitingReceipt.map((m) => {
                const note = parsePaymentNote(m.note);
                const product = productById.get(m.productId);
                return (
                  <MatchCard
                    key={m.id}
                    supplier={note.supplier ?? "—"}
                    status="awaiting"
                    details={[
                      `${product ? product.name : m.productId} · paid, awaiting receipt`,
                      note.cost ? `KES ${note.cost}` : "",
                    ].filter(Boolean)}
                    actionLabel="Awaiting delivery — match on receipt"
                  />
                );
              })}
              {outstanding.unmatchedReceipts.map((m) => {
                const product = productById.get(m.productId);
                return (
                  <MatchCard
                    key={m.id}
                    supplier={
                      product ? `${product.name} (${product.unitLabel})` : m.productId
                    }
                    status="flagged"
                    details={[
                      `${Number(m.quantity).toFixed(1)} received · no matching payment`,
                    ]}
                    resultLabel="Receipt, no payment — needs a matching payment"
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {drawerOpen && (
        <PaymentDrawer
          products={products}
          locations={locations}
          onClose={() => setDrawerOpen(false)}
          onRecorded={refresh}
        />
      )}
    </PageShell>
  );
}
