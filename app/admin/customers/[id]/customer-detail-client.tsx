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
import { AdminDateRangeControl } from "@/app/admin/date-range-control";
import { useAdminDateRange, resolvePreset } from "@/app/admin/use-date-range";
import { businessDateStartUtc, businessDateEndUtc, nairobiToday } from "@/lib/time";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { Drawer } from "@/components/kit/drawer";
import { Button } from "@/components/kit/button";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { useToast } from "@/components/kit/toast";
import type { CustomerLedgerEntry } from "@/lib/domain/customers";
import { useCustomerLedger } from "../use-customers";
import { RepaymentForm, fmtMoney } from "../repayment-form";
import { RepaymentCorrectionDrawer } from "./repayment-correction-drawer";

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
  const {
    ledger,
    loading,
    error,
    refresh,
    recordRepayment,
    correctRepayment,
    voidRepayment,
    archiveCustomer,
    unarchiveCustomer,
  } = useCustomerLedger(customerId);
  const { toast } = useToast();

  const [confirmingArchive, setConfirmingArchive] = React.useState(false);
  const [archiveSubmitting, setArchiveSubmitting] = React.useState(false);

  async function confirmArchive() {
    if (archiveSubmitting) return;
    setArchiveSubmitting(true);
    try {
      await archiveCustomer();
      toast("Customer archived", { tone: "success" });
      setConfirmingArchive(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not archive the customer.", {
        tone: "danger",
      });
    } finally {
      setArchiveSubmitting(false);
    }
  }

  async function handleUnarchive() {
    try {
      await unarchiveCustomer();
      toast("Customer restored", { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not restore the customer.", {
        tone: "danger",
      });
    }
  }
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // The repayment ledger entry currently open in the correction drawer.
  const [correcting, setCorrecting] =
    React.useState<CustomerLedgerEntry | null>(null);

  const balance = ledger?.balance ?? "0.00";
  const owes = Number(balance) > 0;

  // Client feedback 2026-09-22: "view transactions over a period (e.g. at
  // least 1 month)". The ledger's running balance must accumulate over
  // the customer's WHOLE history to stay correct (ADR-17 — no stored
  // total, always derived from account opening), so the range only
  // narrows which rows are DISPLAYED — never re-derives the balance from
  // a truncated window. Defaults to "This month" rather than the usual
  // "Today" (every other <AdminDateRangeControl> screen's default) —
  // credit activity is sparse/long-tailed per customer, so "Today" would
  // read as empty for almost everyone on first load.
  const { range, setPreset, setCustomDay, setCustomRange, today } =
    useAdminDateRange(
      React.useMemo(() => {
        const t = nairobiToday();
        return { preset: "month" as const, ...resolvePreset("month", t) };
      }, []),
    );
  const rangeStartMs = businessDateStartUtc(range.from).getTime();
  const rangeEndMs = businessDateEndUtc(range.to).getTime();
  const visibleEntries = React.useMemo(
    () =>
      (ledger?.entries ?? []).filter((r) => {
        const t = new Date(r.occurredAt).getTime();
        return t >= rangeStartMs && t < rangeEndMs;
      }),
    [ledger, rangeStartMs, rangeEndMs],
  );

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
    {
      // ADR-72: a per-row Correct action on repayments (Admin). Opens the
      // correction drawer prefilled with the current derived values; Void
      // sits behind a confirm step inside it.
      key: "actions",
      header: "",
      width: "w-[96px]",
      align: "right",
      render: (r) =>
        r.kind === "repayment" && r.repaymentId ? (
          <Button
            variant="tertiary"
            size="sm"
            onClick={() => setCorrecting(r)}
          >
            Correct
          </Button>
        ) : null,
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
        actions={
          <AdminDateRangeControl
            range={range}
            today={today}
            onPreset={setPreset}
            onCustomDay={setCustomDay}
            onCustomRange={setCustomRange}
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
              <div className="flex items-center gap-(--sp-3)">
                <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
                  {loading ? "…" : ledger?.customer.name}
                </div>
                {ledger?.customer.archivedAt && (
                  <span className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.03em] text-micro/micro [color:var(--text-tertiary)] px-[6px] py-[2px] rounded-sm border border-solid [border-color:var(--border-subtle)]">
                    Archived
                  </span>
                )}
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
              <div className="flex items-center gap-(--sp-4)">
                {ledger?.customer.archivedAt ? (
                  <Button variant="secondary" onClick={() => void handleUnarchive()}>
                    Unarchive
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setDrawerOpen(true)}>
                    Record repayment
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Ledger — desktop table (≥ --bp-md), artboard ER9-0 */}
          <div className="hidden md:block">
            {!loading && ledger && visibleEntries.length === 0 ? (
              <EmptyState
                title={
                  ledger.entries.length === 0
                    ? "No credit history for this customer"
                    : "No activity in this range"
                }
                description={
                  ledger.entries.length === 0
                    ? "Debts and repayments will appear here once the customer takes a credit order or pays."
                    : "Try a wider date range to see earlier activity."
                }
              />
            ) : (
              <SimpleTable
                columns={columns}
                rows={visibleEntries}
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
            ) : !ledger || visibleEntries.length === 0 ? (
              <EmptyState
                title={
                  !ledger || ledger.entries.length === 0
                    ? "No credit history for this customer"
                    : "No activity in this range"
                }
                description={
                  !ledger || ledger.entries.length === 0
                    ? "Debts and repayments will appear here once the customer takes a credit order or pays."
                    : "Try a wider date range to see earlier activity."
                }
              />
            ) : (
              visibleEntries.map((r) => (
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
                  {r.kind === "repayment" && r.repaymentId && (
                    <div className="flex justify-end pt-(--sp-2)">
                      <Button
                        variant="tertiary"
                        size="sm"
                        onClick={() => setCorrecting(r)}
                      >
                        Correct
                      </Button>
                    </div>
                  )}
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
          <>
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

            {/* Archive section — Assets' Edit-drawer danger-section pattern. */}
            <div className="flex flex-col mt-[4px] pt-[20px] gap-[8px] border-t border-t-solid [border-top-color:var(--border-subtle)]">
              <div className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.04em] [color:var(--text-tertiary)] text-caption/micro">
                Archive this customer
              </div>
              <div className="font-ui [color:var(--text-secondary)] text-sm/sm">
                Hides them from the active list and blocks new credit orders.
                Their history stays intact and they can be unarchived later.
              </div>
              <button
                type="button"
                onClick={() => {
                  setDrawerOpen(false);
                  setConfirmingArchive(true);
                }}
                className="kit-interactive kit-focus-ring inline-flex self-start items-center h-[32px] mt-[2px] px-[4px] gap-[6px] shrink-0 rounded-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
                  <path
                    d="M21 8v13H3V8"
                    fill="none"
                    stroke="var(--color-danger)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M1 3h22v5H1z"
                    fill="none"
                    stroke="var(--color-danger)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="10"
                    y1="12"
                    x2="14"
                    y2="12"
                    stroke="var(--color-danger)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="font-ui font-(--weight-medium) text-danger text-sm/sm">
                  Archive this customer…
                </span>
              </button>
            </div>
          </>
        )}
      </Drawer>

      {/* ADR-72 — Correct / Void a repayment (Admin). */}
      <Drawer
        open={correcting !== null}
        onClose={() => setCorrecting(null)}
        variant="rail"
        title="Correct Repayment"
        subtitle={
          ledger
            ? `${ledger.customer.name} · ${ledger.customer.phone}`
            : undefined
        }
        footer={null}
      >
        {correcting && (
          <RepaymentCorrectionDrawer
            customerId={customerId}
            entry={correcting}
            onCorrect={correctRepayment}
            onVoid={voidRepayment}
            onClose={() => setCorrecting(null)}
            onDone={(message) => toast(message, { tone: "success" })}
          />
        )}
      </Drawer>

      <ConfirmDialog
        open={confirmingArchive}
        onClose={() => setConfirmingArchive(false)}
        onConfirm={confirmArchive}
        title="Archive customer"
        bodyCopy={
          ledger
            ? `Archive ${ledger.customer.name}? They'll be hidden from the ` +
              `active list and can't be added to new credit orders. You can ` +
              `unarchive them later.`
            : ""
        }
        confirmLabel="Archive"
        submitting={archiveSubmitting}
      />
    </PageShell>
  );
}
