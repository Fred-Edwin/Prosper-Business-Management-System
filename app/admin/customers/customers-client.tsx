// A1 — Customers & Credit register (Admin). COMPOSED from the proven kit
// only: <PageShell> + <Breadcrumb> + <SimpleTable> + <SearchInput> +
// <PillFilter> + rail <Drawer>. Visual target: `A1 Customers Register —
// … [M2-01]` (Paper artboards DU2-0 / DZ0-0 / E41-0 / E97-0 / EJ6-0 /
// EEE-0 / EPJ-0).
//
// Paper→code notes: the artboard draws fixed row heights / grow-ratio
// columns / a trailing chevron; the codebase kit <SimpleTable> is the
// design-system source of truth for row height + header + hairlines, so
// those come from the kit (responsive, token-based), not the artboard's
// pixels. The "Has balance" filter is modelled with the kit <PillFilter>
// ("All customers" / "Owing"). The trailing-chevron affordance has no
// kit equivalent — flagged for a Kit Sprint; the clickable row uses the
// kit's hover/focus affordance meanwhile (as Catalog/Stock rows do).
"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/kit/page-shell";
import { Breadcrumb } from "@/components/kit/breadcrumb";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { SearchInput } from "@/components/kit/search-input";
import { PillFilter } from "@/components/kit/pill-filter";
import { Drawer } from "@/components/kit/drawer";
import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/text-input";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { useToast } from "@/components/kit/toast";
import type { CustomerListRow } from "@/lib/domain/customers";
import { useCustomers } from "./use-customers";
import { RepaymentForm, fmtMoney } from "./repayment-form";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Nairobi",
  });
}

/** Table-density balance: plain colored mono text, no chip (§4.4).
 * "KES 1,200.00" in danger when owing; "Settled" tertiary at zero;
 * credit balance (overpaid) shown explicitly. No "Owes" prefix — the
 * column header already says "Balance" (artboard DU2-0). */
function BalanceCell({ balance }: { balance: string }) {
  const n = Number(balance);
  if (Number.isFinite(n) && n === 0) {
    return <span className="[color:var(--text-tertiary)]">Settled</span>;
  }
  if (Number.isFinite(n) && n < 0) {
    return <span className="text-success">KES {fmtMoney(String(-n))} cr</span>;
  }
  return <span className="text-danger">KES {fmtMoney(balance)}</span>;
}

const FILTER_OPTIONS = [
  { key: "all", label: "All customers" },
  { key: "owing", label: "Owing" },
];

type DrawerMode = "repayment" | "add-customer" | null;

export function CustomersClient() {
  const [search, setSearch] = React.useState("");
  const [filterKey, setFilterKey] = React.useState("all");
  const hasBalance = filterKey === "owing";

  const { customers, loading, error, refresh, createCustomer, recordRepayment } =
    useCustomers({ search, hasBalance });
  const { toast } = useToast();

  const [drawerMode, setDrawerMode] = React.useState<DrawerMode>(null);
  const [selected, setSelected] = React.useState<CustomerListRow | null>(null);

  const [newName, setNewName] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const addValid = newName.trim() !== "" && newPhone.trim() !== "";

  function closeDrawer() {
    setDrawerMode(null);
    setSelected(null);
    setNewName("");
    setNewPhone("");
    setAddError(null);
  }
  function openRepayment(row: CustomerListRow) {
    setSelected(row);
    setDrawerMode("repayment");
  }

  async function submitAddCustomer() {
    if (!addValid || adding) return;
    setAdding(true);
    setAddError(null);
    try {
      await createCustomer({ name: newName.trim(), phone: newPhone.trim() });
      toast("Customer added", { tone: "success" });
      closeDrawer();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add the customer.");
    } finally {
      setAdding(false);
    }
  }

  const filtered = search.trim() !== "" || hasBalance;
  function clearFilters() {
    setSearch("");
    setFilterKey("all");
  }

  const columns: SimpleTableColumn<CustomerListRow>[] = [
    {
      key: "name",
      header: "Name",
      width: "grow min-w-[160px]",
      cell: "accent",
      render: (r) => (
        <Link
          href={`/admin/customers/${r.id}`}
          onClick={(e) => e.stopPropagation()}
          className="kit-focus-ring rounded-sm"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      width: "grow min-w-[120px]",
      render: (r) => r.phone,
    },
    {
      key: "balance",
      header: "Balance",
      width: "grow min-w-[120px]",
      align: "right",
      cell: "mono",
      render: (r) => <BalanceCell balance={r.balance} />,
    },
    {
      key: "last",
      header: "Last activity",
      width: "grow min-w-[110px]",
      render: (r) => fmtDate(r.lastActivityAt),
    },
    {
      key: "action",
      header: "",
      width: "w-[150px]",
      align: "right",
      render: (r) => (
        <button
          type="button"
          aria-label={`Record repayment for ${r.name}`}
          onClick={(e) => {
            e.stopPropagation();
            openRepayment(r);
          }}
          className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
        >
          Record repayment
        </button>
      ),
    },
  ];

  return (
    <PageShell
      toolbar={
        <div className="flex flex-col gap-(--sp-2) w-full">
          <Breadcrumb items={[{ label: "Customers" }]} />
          <div className="flex items-center gap-(--sp-4) w-full">
            <div className="font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1">
              Customers &amp; Credit
            </div>
            <div className="grow" />
            <Button
              variant="secondary"
              onClick={() => setDrawerMode("add-customer")}
            >
              Add customer
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col grow gap-(--sp-6)">
        <div className="flex items-center justify-between gap-(--sp-4) flex-wrap">
          <div className="flex items-center gap-(--sp-4)">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name or phone…"
              aria-label="Search customers"
            />
            <PillFilter
              options={FILTER_OPTIONS}
              activeKey={filterKey}
              onChange={setFilterKey}
              aria-label="Filter customers by balance"
            />
          </div>
          {filtered && (
            <button
              type="button"
              onClick={clearFilters}
              className="font-ui font-(--weight-medium) text-accent text-caption/micro kit-focus-ring rounded-sm"
            >
              Clear all
            </button>
          )}
        </div>

        {error ? (
          <ErrorState
            title="Couldn't load customers"
            description={error}
            onRetry={() => void refresh()}
          />
        ) : (
          <>
            {/* Desktop table (≥ --bp-md) — artboard DU2-0 */}
            <div className="hidden md:block">
              <SimpleTable
                columns={columns}
                rows={customers}
                rowKey={(r) => r.id}
                onRowClick={openRepayment}
                rowLabel={(r) => `Record repayment for ${r.name}`}
                loading={loading && customers.length === 0}
                emptyState={{
                  variant: filtered ? "filtered" : "default",
                  title: filtered ? "No customers match" : "No customers yet",
                  description: filtered
                    ? "Try a different search, or clear the filters."
                    : "Add a customer, or one is created when you take a credit order.",
                  actionLabel: filtered ? "Clear filters" : "Add customer",
                  onAction: filtered
                    ? clearFilters
                    : () => setDrawerMode("add-customer"),
                }}
              />
            </div>

            {/* Mobile row list (< --bp-md) — artboard EPJ-0 */}
            <div className="flex md:hidden flex-col w-full">
              {loading && customers.length === 0 ? (
                [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="flex items-center h-[56px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
                  >
                    <div className="kit-skeleton h-[14px] w-1/2" />
                  </div>
                ))
              ) : customers.length === 0 ? (
                <EmptyState
                  variant={filtered ? "filtered" : "default"}
                  title={filtered ? "No customers match" : "No customers yet"}
                  description={
                    filtered
                      ? "Try a different search, or clear the filters."
                      : "Add a customer, or one is created when you take a credit order."
                  }
                  actionLabel={filtered ? "Clear filters" : "Add customer"}
                  onAction={
                    filtered ? clearFilters : () => setDrawerMode("add-customer")
                  }
                />
              ) : (
                customers.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-label={`Record repayment for ${c.name}`}
                    onClick={() => openRepayment(c)}
                    className="flex items-center justify-between w-full py-(--sp-5) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-row kit-focus-ring text-left"
                  >
                    <div className="flex flex-col gap-[2px] min-w-0">
                      <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm truncate">
                        {c.name}
                      </span>
                      <span className="font-ui [color:var(--text-secondary)] text-sm/micro truncate">
                        {c.phone}
                      </span>
                    </div>
                    <span className="font-mono text-sm/sm shrink-0">
                      <BalanceCell balance={c.balance} />
                    </span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Repayment rail drawer */}
      <Drawer
        open={drawerMode === "repayment" && selected !== null}
        onClose={closeDrawer}
        variant="rail"
        title="Record repayment"
        subtitle={
          selected ? `${selected.name} · ${selected.phone}` : undefined
        }
        footer={null}
      >
        {selected && (
          <RepaymentForm
            customerId={selected.id}
            balance={selected.balance}
            withNote
            onSubmit={recordRepayment}
            onDone={() => {
              toast("Repayment recorded", { tone: "success" });
              closeDrawer();
            }}
            renderFooter={(node) => (
              <div className="flex items-center justify-end gap-(--sp-4) pt-(--sp-4)">
                <Button variant="secondary" onClick={closeDrawer}>
                  Cancel
                </Button>
                {node}
              </div>
            )}
          />
        )}
      </Drawer>

      {/* Add-customer rail drawer */}
      <Drawer
        open={drawerMode === "add-customer"}
        onClose={closeDrawer}
        variant="rail"
        title="Add customer"
        footer={
          <>
            <Button variant="secondary" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submitAddCustomer}
              loading={adding}
              disabled={!addValid}
            >
              Add customer
            </Button>
          </>
        }
      >
        <TextInput
          label="Name"
          required
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <TextInput
          label="Phone"
          required
          inputMode="tel"
          value={newPhone}
          onChange={(e) => setNewPhone(e.target.value)}
        />
        {addError && (
          <div role="alert" className="font-ui text-danger text-sm/sm">
            {addError}
          </div>
        )}
      </Drawer>
    </PageShell>
  );
}
