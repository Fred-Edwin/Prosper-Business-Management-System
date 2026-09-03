// A2 — Customer detail (Admin). COMPOSED from the kit: <PageShell> +
// <SimpleTable> for the interleaved Debt/Repayment ledger + the rail
// <Drawer> repayment form (shared with A1). Visual target:
// `A2 Customer Detail — … [M2-01]` (Paper). The kit <DenseLedger> is
// stock-column-shaped, so the ledger here is a thin per-screen table
// (Date · Type · Reference · Amount · Running balance) — flow doc §F
// calls it "a DenseLedger-style table".
"use client";

import * as React from "react";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { Drawer } from "@/components/kit/drawer";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import type { CustomerLedgerEntry } from "@/lib/domain/customers";
import { useCustomerLedger } from "../use-customers";
import { RepaymentForm, fmtMoney } from "../repayment-form";

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

const ACCOUNT_LABEL: Record<string, string> = {
  cash: "Cash",
  mpesa_bank: "M-Pesa",
};

/** A2 ledger "Reference" cell (artboard ER9-0): "Order #1043" for a debt;
 * the account ("Cash" / "M-Pesa") or the note for a repayment. */
function referenceFor(r: CustomerLedgerEntry): string {
  if (r.kind === "debt") {
    return r.orderNumber != null ? `Order #${r.orderNumber}` : "Credit order";
  }
  if (r.note && r.note.trim() !== "") return r.note;
  return r.account ? (ACCOUNT_LABEL[r.account] ?? r.account) : "Repayment";
}

export function CustomerDetailClient({ customerId }: { customerId: string }) {
  const { ledger, loading, error, refresh, recordRepayment } =
    useCustomerLedger(customerId);
  const { toast } = useToast();
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const balance = ledger?.balance ?? "0.00";
  const owes = Number(balance) > 0;

  const columns: SimpleTableColumn<CustomerLedgerEntry>[] = [
    {
      key: "date",
      header: "Date",
      width: "w-[120px]",
      render: (r) => fmtDate(r.occurredAt),
    },
    {
      key: "type",
      header: "Type",
      width: "grow min-w-[140px]",
      cell: "strong",
      render: (r) => (r.kind === "debt" ? "Credit order" : "Repayment"),
    },
    {
      // Flow doc §F: "Reference (order # or note)".
      key: "reference",
      header: "Reference",
      width: "w-[160px]",
      render: (r) => referenceFor(r),
    },
    {
      key: "amount",
      header: "Amount",
      width: "w-[120px]",
      align: "right",
      render: (r) => (
        <span
          className={`font-mono text-sm/sm ${
            r.kind === "debt" ? "text-danger" : "text-success"
          }`}
        >
          {r.kind === "debt" ? "+" : "−"}KES {fmtMoney(r.amount)}
        </span>
      ),
    },
    {
      key: "running",
      header: "Running balance",
      width: "w-[150px]",
      align: "right",
      render: (r) => (
        <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm">
          KES {fmtMoney(r.runningBalance)}
        </span>
      ),
    },
  ];

  const balanceOut = Number(balance);
  const balanceText =
    Number.isFinite(balanceOut) && balanceOut === 0
      ? "Settled"
      : `KES ${fmtMoney(String(Math.abs(balanceOut)))}${balanceOut < 0 ? " cr" : ""}`;

  return (
    <PageShell>
      <AdminPageHeader
        title={
          <Breadcrumb
            items={[
              { label: "Customers", href: "/admin/customers" },
              { label: loading ? "…" : (ledger?.customer.name ?? "Customer") },
            ]}
          />
        }
      />
      {error ? (
        <ErrorState
          title="Couldn't load this customer"
          description={error}
          onRetry={() => void refresh()}
        />
      ) : (
        <div className="flex flex-col grow gap-(--sp-8)">
          {/* Header block (artboard ER9-0): name + phone left; a
              Current-balance read-out + Record-repayment action right. */}
          <div className="flex items-start justify-between gap-(--sp-6) border-b border-b-solid [border-bottom-color:var(--border-subtle)] pb-(--sp-6)">
            <div className="flex flex-col gap-(--sp-1)">
              <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
                {loading ? "…" : ledger?.customer.name}
              </div>
              <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
                {ledger?.customer.phone ?? ""}
              </div>
            </div>
            <div className="flex flex-col items-end gap-(--sp-3) shrink-0">
              <div className="flex flex-col items-end gap-(--sp-1)">
                <span className="font-ui [color:var(--text-tertiary)] text-caption/micro">
                  Current balance
                </span>
                <span
                  className={`font-mono text-h1/h1 ${
                    owes ? "text-danger" : "[color:var(--text-tertiary)]"
                  }`}
                >
                  {loading ? "" : balanceText}
                </span>
              </div>
              <Button variant="primary" onClick={() => setDrawerOpen(true)}>
                Record repayment
              </Button>
            </div>
          </div>

          {/* Ledger — desktop table (≥ --bp-md), artboard ER9-0 */}
          <div className="hidden md:block">
            {!loading && ledger && ledger.entries.length === 0 ? (
              <EmptyState
                title="No credit history for this customer"
                description="Debts and repayments will appear here once the customer takes a credit order or pays."
              />
            ) : (
              <SimpleTable
                columns={columns}
                rows={ledger?.entries ?? []}
                rowKey={(r) => `${r.kind}-${r.occurredAt}-${r.runningBalance}`}
                loading={loading && !ledger}
                emptyState={{
                  title: "No credit history for this customer",
                  description:
                    "Debts and repayments will appear here once the customer takes a credit order or pays.",
                }}
              />
            )}
          </div>

          {/* Ledger — mobile 2-line cards (< --bp-md), artboard F7F-0 */}
          <div className="flex md:hidden flex-col w-full">
            <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-tertiary)] text-caption/micro pb-(--sp-3)">
              Credit history
            </div>
            {loading && !ledger ? (
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center h-[56px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                >
                  <div className="kit-skeleton h-[14px] w-2/3" />
                </div>
              ))
            ) : !ledger || ledger.entries.length === 0 ? (
              <EmptyState
                title="No credit history for this customer"
                description="Debts and repayments will appear here once the customer takes a credit order or pays."
              />
            ) : (
              ledger.entries.map((r) => (
                <div
                  key={`${r.kind}-${r.occurredAt}-${r.runningBalance}`}
                  className="flex flex-col gap-[2px] py-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                >
                  <div className="flex items-center justify-between gap-(--sp-4)">
                    <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm">
                      {r.kind === "debt" ? "Credit order" : "Repayment"}
                    </span>
                    <span
                      className={`font-mono text-sm/sm ${
                        r.kind === "debt" ? "text-danger" : "text-success"
                      }`}
                    >
                      {r.kind === "debt" ? "+" : "−"}KES {fmtMoney(r.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-(--sp-4)">
                    <span className="font-ui [color:var(--text-secondary)] text-sm/micro">
                      {fmtDate(r.occurredAt)} · {referenceFor(r)}
                    </span>
                    <span className="font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/micro">
                      KES {fmtMoney(r.runningBalance)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <Drawer
        open={drawerOpen && ledger !== null}
        onClose={() => setDrawerOpen(false)}
        variant="rail"
        title="Record repayment"
        subtitle={
          ledger ? `${ledger.customer.name} · ${ledger.customer.phone}` : undefined
        }
        footer={null}
      >
        {ledger && (
          <RepaymentForm
            customerId={customerId}
            balance={balance}
            withNote
            onSubmit={recordRepayment}
            onDone={() => {
              toast("Repayment recorded", { tone: "success" });
              setDrawerOpen(false);
            }}
            renderFooter={(node) => (
              <div className="flex items-center gap-(--sp-4) pt-(--sp-4)">
                <Button variant="secondary" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </Button>
                {node}
              </div>
            )}
          />
        )}
      </Drawer>
    </PageShell>
  );
}
