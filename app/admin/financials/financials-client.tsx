// Wired from:
//   docs/design/screens/admin-financials-full-table/page.tsx            (7ZJ-0)
//   docs/design/screens/admin-financials-payment-drawer-open/page.tsx   (85W-0)
//
// M1 Financials cut (milestone-1-plan §2 "Financials M1 cut" / ADR-36): the
// wired route is the stock-purchase table + reconciliation Match cards +
// record-payment drawer. The 4-tile KPI stat strip is exported in the Paper
// artboard ("Option A") but has NO F2 data source — the MoneyMovement ledger
// that would populate liquidity / cash / bank / outflows is F3. Per the owner
// (2026-08-27): keep the strip markup, render all four values as "—" with an
// "M3" caption. No client-side money math, no note-parsing.
// TODO(mock): the KPI strip is intentionally unwired — full figures land with
// the F3 MoneyMovement ledger (Milestone 3). Re-scoped, not forgotten.
//
// The skeleton's own sidebar is dropped (app/admin/layout.tsx wraps this
// route in <AdminShell>). Markup + classes are verbatim from the skeleton;
// this file adds tab state, the fetch, and the payment-drawer orchestration.
"use client";

import * as React from "react";
import type {
  OutstandingPurchases,
  StockMovementView,
} from "@/lib/domain/stock";
import type { Location, ProductWithLocations } from "@/lib/domain/catalog";
import { toBusinessDate } from "@/lib/time";
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

const STATUS_DOT: Record<"success" | "warning", string> = {
  success: "bg-success",
  warning: "bg-warning",
};
const STATUS_TEXT: Record<"success" | "warning", string> = {
  success: "text-success",
  warning: "text-warning",
};

type PurchaseTxRow = {
  payment: StockMovementView;
  matched: boolean;
};

export function FinancialsClient() {
  const businessDate = toBusinessDate(new Date());

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
      setError(
        e instanceof Error ? e.message : "Failed to load financials.",
      );
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

  const TABS = [
    `Stock Purchases (${payments.length})`,
    `Deliveries (${receipts.length})`,
  ];
  const [activeTab, setActiveTab] = React.useState(TABS[0]);

  return (
    <div className="flex flex-col grow min-w-[0px] self-stretch">
      {/* Toolbar */}
      <div className="flex items-center h-[44px] shrink-0 gap-(--sp-4) pr-[24px] pl-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
        <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h1/h1">
          Financials &amp; Expenses
        </div>
        <div className="font-ui shrink-0 self-center inline-block w-max [color:var(--text-tertiary)] text-caption/micro">
          ({fmtDate(new Date().toISOString())})
        </div>
        <div className="grow" />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center h-[36px] shrink-0 px-(--sp-6) rounded-sm gap-(--sp-3) bg-accent kit-interactive kit-focus-ring"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
            <line x1="12" y1="5" x2="12" y2="19" stroke="#FFFFFF" strokeWidth="2" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="#FFFFFF" strokeWidth="2" />
          </svg>
          <span className="font-ui font-(--weight-medium) inline-block w-max shrink-0 text-white text-body/sm">
            Record Payment
          </span>
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col grow p-(--sp-6) gap-(--sp-8) w-[1200px] max-w-[1200px] overflow-clip">
        {/* KPI stat strip — markup kept; values unwired until F3 (see header). */}
        <div className="flex h-[87.3281px] [width:100%] items-center shrink-0 border border-solid [border-color:var(--border-subtle)]">
          {KPI_TILES.map((label, i) => (
            <React.Fragment key={label}>
              {i > 0 && <div className="w-px self-stretch shrink-0 bg-gray-500" />}
              <div
                className={`flex flex-col gap-(--sp-3) self-stretch justify-center ${
                  i === 0
                    ? "pr-(--sp-8)"
                    : i === KPI_TILES.length - 1
                      ? "pl-(--sp-8)"
                      : "px-(--sp-8)"
                }`}
              >
                <div className="font-ui font-(--weight-medium) uppercase tracking-[0.04em] [color:var(--text-tertiary)] text-caption/micro">
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
          <div className="font-ui text-danger text-body/sm">{error}</div>
        )}

        {/* Transaction tabs */}
        <div className="flex items-center [width:100%] border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
          {TABS.map((tab) => {
            const isActive = tab === activeTab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex items-center justify-center h-[36px] px-(--sp-5) border-b-2 border-b-solid kit-focus-ring ${
                  isActive ? "border-b-accent" : "border-b-[#00000000]"
                }`}
              >
                <span
                  className={`font-ui font-(--weight-medium) inline-block w-max shrink-0 text-sm/sm ${
                    isActive ? "text-accent" : "[color:var(--text-secondary)]"
                  }`}
                >
                  {tab}
                </span>
              </button>
            );
          })}
        </div>

        {/* Transactions table */}
        <div className="flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]">
          <div className="flex items-center h-[32px] shrink-0 px-(--sp-6) gap-(--sp-6) bg-info-bg border-b border-b-solid border-b-gray-600">
            <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[100px] shrink-0 inline-block text-info">Date</div>
            <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] grow min-w-[200px] inline-block text-info">Vendor / Description</div>
            <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[110px] shrink-0 inline-block text-info">Destination</div>
            <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[130px] shrink-0 inline-block text-info">Paid From</div>
            <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[100px] shrink-0 text-right inline-block text-info">Quantity</div>
            <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[130px] shrink-0 text-right inline-block text-info">Amount (KES)</div>
            <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[150px] shrink-0 inline-block text-info">Delivery Status</div>
          </div>

          {activeTab === TABS[0] ? (
            loading && txRows.length === 0 ? (
              <div className="flex items-center h-[52px] px-(--sp-6) font-ui [color:var(--text-tertiary)] text-sm/micro">Loading…</div>
            ) : txRows.length === 0 ? (
              <div className="flex items-center h-[52px] px-(--sp-6) font-ui [color:var(--text-tertiary)] text-sm/micro">No purchase payments recorded.</div>
            ) : (
              txRows.map(({ payment, matched }, i) => {
                const note = parsePaymentNote(payment.note);
                const product = productById.get(payment.productId);
                const location = locationById.get(payment.locationId);
                return (
                  <div
                    key={payment.id}
                    className={`flex items-center h-[52px] shrink-0 px-(--sp-6) gap-(--sp-6) ${
                      i < txRows.length - 1 ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]" : ""
                    }`}
                  >
                    <div className="font-mono w-[100px] shrink-0 inline-block [color:var(--text-secondary)] text-sm/micro">{fmtDate(payment.occurredAt)}</div>
                    <div className="flex flex-col grow min-w-[200px] gap-[2px]">
                      <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/micro">{note.supplier ?? "—"}</div>
                      <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
                        {product ? `${product.name} (${product.unitLabel})` : payment.productId}
                        {note.cost ? ` · KES ${note.cost}` : ""}
                      </div>
                    </div>
                    <div className="font-ui w-[110px] shrink-0 inline-block [color:var(--text-primary)] text-sm/micro">{location?.name ?? "—"}</div>
                    <div className="font-ui w-[130px] shrink-0 inline-block [color:var(--text-primary)] text-sm/micro">{note.paidFrom ? PAID_FROM_LABEL[note.paidFrom] ?? note.paidFrom : "—"}</div>
                    <div className="font-mono w-[100px] shrink-0 text-right inline-block [color:var(--text-tertiary)] text-sm/micro">—</div>
                    <div className="font-mono font-(--weight-medium) w-[130px] shrink-0 text-right inline-block [color:var(--text-primary)] text-sm/micro">{note.cost ?? "—"}</div>
                    <div className="flex items-center h-[22px] w-[150px] shrink-0 rounded-lg gap-[6px]">
                      <div className={`w-[6px] h-[6px] shrink-0 rounded-[50%] ${matched ? STATUS_DOT.success : STATUS_DOT.warning}`} />
                      <div className={`font-ui inline-block w-max shrink-0 text-sm/micro ${matched ? STATUS_TEXT.success : STATUS_TEXT.warning}`}>
                        {matched ? "Received" : "Pending Delivery"}
                      </div>
                    </div>
                  </div>
                );
              })
            )
          ) : loading && receipts.length === 0 ? (
            <div className="flex items-center h-[52px] px-(--sp-6) font-ui [color:var(--text-tertiary)] text-sm/micro">Loading…</div>
          ) : receipts.length === 0 ? (
            <div className="flex items-center h-[52px] px-(--sp-6) font-ui [color:var(--text-tertiary)] text-sm/micro">No deliveries recorded.</div>
          ) : (
            receipts.map((r, i) => {
              const product = productById.get(r.productId);
              const location = locationById.get(r.locationId);
              return (
                <div
                  key={r.id}
                  className={`flex items-center h-[52px] shrink-0 px-(--sp-6) gap-(--sp-6) ${
                    i < receipts.length - 1 ? "border-b border-b-solid [border-bottom-color:var(--border-subtle)]" : ""
                  }`}
                >
                  <div className="font-mono w-[100px] shrink-0 inline-block [color:var(--text-secondary)] text-sm/micro">{fmtDate(r.occurredAt)}</div>
                  <div className="flex flex-col grow min-w-[200px] gap-[2px]">
                    <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/micro">
                      {product ? `${product.name} (${product.unitLabel})` : r.productId}
                    </div>
                    <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
                      {r.purchasePaymentId ? "Matched to a payment" : "No matching payment"}
                    </div>
                  </div>
                  <div className="font-ui w-[110px] shrink-0 inline-block [color:var(--text-primary)] text-sm/micro">{location?.name ?? "—"}</div>
                  <div className="font-ui w-[130px] shrink-0 inline-block [color:var(--text-tertiary)] text-sm/micro">—</div>
                  <div className="font-mono w-[100px] shrink-0 text-right inline-block [color:var(--text-primary)] text-sm/micro">{Number(r.quantity).toFixed(1)}</div>
                  <div className="font-mono w-[130px] shrink-0 text-right inline-block [color:var(--text-tertiary)] text-sm/micro">—</div>
                  <div className="flex items-center h-[22px] w-[150px] shrink-0 rounded-lg gap-[6px]">
                    <div className={`w-[6px] h-[6px] shrink-0 rounded-[50%] ${r.purchasePaymentId ? STATUS_DOT.success : STATUS_DOT.warning}`} />
                    <div className={`font-ui inline-block w-max shrink-0 text-sm/micro ${r.purchasePaymentId ? STATUS_TEXT.success : STATUS_TEXT.warning}`}>
                      {r.purchasePaymentId ? "Matched" : "Unmatched"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reconciliation section — the Match cards, from …/outstanding */}
        <div className="flex flex-col [width:100%] gap-(--sp-5)">
          <div className="flex flex-col gap-[2px]">
            <div className="font-ui font-(--weight-semibold) inline-block [color:var(--text-primary)] text-h2/h2">
              Reconciliation
            </div>
            <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
              Payments awaiting delivery, and deliveries without a matching payment
            </div>
          </div>
          <div className="flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]">
            <div className="flex items-center h-[32px] shrink-0 px-(--sp-6) gap-(--sp-6) bg-info-bg border-b border-b-solid border-b-gray-600">
              <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] grow min-w-[200px] inline-block text-info">Vendor / Description</div>
              <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[130px] shrink-0 text-right inline-block text-info">Amount (KES)</div>
              <div className="font-ui font-(--weight-semibold) text-[10px] tracking-[0.04em] uppercase leading-[12px] w-[180px] shrink-0 inline-block text-info">Status</div>
            </div>

            {loading ? (
              <div className="flex items-center h-[44px] px-(--sp-6) font-ui [color:var(--text-tertiary)] text-sm/micro">Loading…</div>
            ) : outstanding.awaitingReceipt.length === 0 &&
              outstanding.unmatchedReceipts.length === 0 ? (
              <div className="flex items-center h-[44px] px-(--sp-6) font-ui [color:var(--text-tertiary)] text-sm/micro">
                Everything reconciles — no open items.
              </div>
            ) : (
              <>
                {outstanding.awaitingReceipt.map((m) => {
                  const note = parsePaymentNote(m.note);
                  const product = productById.get(m.productId);
                  return (
                    <div key={m.id} className="flex items-center h-[44px] shrink-0 px-(--sp-6) gap-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
                      <div className="flex flex-col grow min-w-[200px] gap-[2px]">
                        <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/micro">{note.supplier ?? "—"}</div>
                        <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
                          {product ? product.name : m.productId} · paid, awaiting receipt
                        </div>
                      </div>
                      <div className="font-mono font-(--weight-medium) w-[130px] shrink-0 text-right inline-block [color:var(--text-primary)] text-sm/micro">{note.cost ?? "—"}</div>
                      <div className="flex items-center h-[22px] w-[180px] shrink-0 rounded-lg gap-[6px]">
                        <div className="w-[6px] h-[6px] shrink-0 rounded-[50%] bg-warning" />
                        <div className="font-ui inline-block w-max shrink-0 text-sm/micro text-warning">Payment made, no receipt</div>
                      </div>
                    </div>
                  );
                })}
                {outstanding.unmatchedReceipts.map((m) => {
                  const product = productById.get(m.productId);
                  return (
                    <div key={m.id} className="flex items-center h-[44px] shrink-0 px-(--sp-6) gap-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)]">
                      <div className="flex flex-col grow min-w-[200px] gap-[2px]">
                        <div className="font-ui font-(--weight-medium) inline-block [color:var(--text-primary)] text-sm/micro">
                          {product ? `${product.name} (${product.unitLabel})` : m.productId}
                        </div>
                        <div className="font-ui inline-block [color:var(--text-tertiary)] text-caption/micro">
                          {Number(m.quantity).toFixed(1)} received · no matching payment
                        </div>
                      </div>
                      <div className="font-mono font-(--weight-medium) w-[130px] shrink-0 text-right inline-block [color:var(--text-tertiary)] text-sm/micro">—</div>
                      <div className="flex items-center h-[22px] w-[180px] shrink-0 rounded-lg gap-[6px]">
                        <div className="w-[6px] h-[6px] shrink-0 rounded-[50%] bg-warning" />
                        <div className="font-ui inline-block w-max shrink-0 text-sm/micro text-warning">Receipt, no payment</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
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
    </div>
  );
}
