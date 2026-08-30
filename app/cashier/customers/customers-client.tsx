// C6 — Customers list + balances (Cashier mobile). COMPOSED from the kit:
// staff shell (from the layout) + <SearchInput> + a mobile row list +
// the kit <BottomSheet> repayment form (shared body with A1/A2).
// Visual target: `C6 Customers Mobile — … [M2-01]` (Paper).
//
// Cashier scope (flow doc §5): all customers (credit is business-wide),
// name · phone · derived balance · repayment. No order detail, no
// cost/margin. No "Add customer" button — quick-create is in the
// credit-order flow (C5).
"use client";

import * as React from "react";
import { SearchInput } from "@/components/kit/search-input";
import { BottomSheet, type BottomSheetState } from "@/components/kit/bottom-sheet";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import type { CustomerListRow } from "@/lib/domain/customers";
import { useCustomers } from "@/app/admin/customers/use-customers";
import { RepaymentForm } from "@/app/admin/customers/repayment-form";

/** C6 list balance (artboard DDD-0): "KES 1,200" (whole KES, no
 * decimals) in danger; "Settled" tertiary at zero. */
function BalanceReadout({ balance }: { balance: string }) {
  const n = Number(balance);
  if (Number.isFinite(n) && n === 0) {
    return (
      <span className="font-mono [color:var(--text-tertiary)] text-sm/sm">
        Settled
      </span>
    );
  }
  const abs = Math.abs(n);
  const whole = Number.isFinite(abs)
    ? abs.toLocaleString("en-US", { maximumFractionDigits: 0 })
    : balance;
  return (
    <span
      className={`font-mono text-sm/sm ${n < 0 ? "text-success" : "text-danger"}`}
    >
      KES {whole}
      {n < 0 ? " cr" : ""}
    </span>
  );
}

export function CashierCustomersClient() {
  const [search, setSearch] = React.useState("");
  const { customers, loading, error, refresh, recordRepayment } = useCustomers({
    search,
  });
  const { toast } = useToast();

  const [sheetState, setSheetState] = React.useState<BottomSheetState>("closed");
  const [selected, setSelected] = React.useState<CustomerListRow | null>(null);

  function openRepayment(row: CustomerListRow) {
    setSelected(row);
    setSheetState("open");
  }
  function closeSheet() {
    setSheetState("closed");
    setSelected(null);
  }

  return (
    <div className="flex flex-col grow gap-(--sp-6) p-(--sp-5)">
      <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
        Customers
      </div>

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search name or phone…"
        aria-label="Search customers"
      />

      {error ? (
        <ErrorState
          title="Couldn't load customers"
          description={error}
          onRetry={() => void refresh()}
        />
      ) : loading && customers.length === 0 ? (
        <div className="flex flex-col [width:100%]">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center h-[56px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
            >
              <div className="kit-skeleton h-[14px] w-1/2" />
            </div>
          ))}
        </div>
      ) : customers.length === 0 ? (
        <EmptyState
          title={search.trim() ? "No customers match" : "No customers yet"}
          description={
            search.trim()
              ? "Try a different search."
              : "Customers are added when you take a credit order."
          }
        />
      ) : (
        <div className="flex flex-col [width:100%]">
          {customers.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openRepayment(c)}
              className="flex items-center justify-between [width:100%] py-(--sp-5) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-row kit-focus-ring text-left"
            >
              <div className="flex flex-col gap-[2px] min-w-0">
                <div className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm truncate">
                  {c.name}
                </div>
                <div className="font-ui [color:var(--text-secondary)] text-sm/micro truncate">
                  {c.phone}
                </div>
              </div>
              <BalanceReadout balance={c.balance} />
            </button>
          ))}
        </div>
      )}

      <BottomSheet
        state={selected ? sheetState : "closed"}
        onStateChange={(s) => {
          setSheetState(s);
          if (s === "closed") setSelected(null);
        }}
        // DDD-0 has no h1 title — the in-body name + balance IS the header.
        ariaLabel={
          selected ? `Record repayment for ${selected.name}` : "Record repayment"
        }
      >
        {selected && (
          <RepaymentForm
            customerId={selected.id}
            customerName={selected.name}
            balance={selected.balance}
            onSubmit={recordRepayment}
            onDone={() => {
              toast(`Repayment recorded · ${selected.name}`, { tone: "success" });
              closeSheet();
            }}
            renderFooter={(node) => (
              <div className="pt-(--sp-4) [&>button]:w-full">{node}</div>
            )}
          />
        )}
      </BottomSheet>
    </div>
  );
}
