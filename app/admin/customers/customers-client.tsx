// A1 — Customers & Credit register (Admin). COMPOSED from the proven kit
// only: <PageShell> + <SimpleTable> + the shared kit
// <FilterToolbar> (search slot + a "Has balance" kind:"toggle" — 3e
// retrofit off the old <PillFilter>) + rail <Drawer>. Visual target:
// `A1 Customers Register — … [M2-01]` (Paper artboards DU2-0 / DZ0-0 /
// E41-0 / E97-0 / EJ6-0 / EEE-0 / EPJ-0).
//
// Paper→code notes: the artboard draws fixed row heights / grow-ratio
// columns / a trailing chevron; the codebase kit <SimpleTable> is the
// design-system source of truth for row height + header + hairlines, so
// those come from the kit (responsive, token-based), not the artboard's
// pixels. The "Has balance" filter is a `kind:"toggle"` control inside the
// shared kit <FilterToolbar> (A2's toggle-in-toolbar idiom, filter-toolbar.md
// §7); the free-text search rides the toolbar's `search?` slot and keeps its
// own state. The trailing-chevron affordance has no kit equivalent — flagged
// for a Kit Sprint; the clickable row uses the kit's hover/focus affordance
// meanwhile (as Catalog/Stock rows do).
"use client";

import * as React from "react";
import Link from "next/link";
import { PageShell } from "@/components/kit/page-shell";
import { AdminPageHeader } from "@/components/shells/admin-toolbar-context";
import { SimpleTable, type SimpleTableColumn } from "@/components/kit/simple-table";
import { SearchInput } from "@/components/kit/search-input";
import { FilterToolbar, type FilterControl } from "@/components/kit/filter-toolbar";
import { Drawer } from "@/components/kit/drawer";
import { Button } from "@/components/kit/button";
import { TextInput } from "@/components/kit/text-input";
import { EmptyState } from "@/components/kit/empty-state";
import { ErrorState } from "@/components/kit/error-state";
import { ConfirmDialog } from "@/components/kit/confirm-dialog";
import { useToast } from "@/components/kit/toast";
import type { CustomerListRow } from "@/lib/domain/customers";
import { useCustomers } from "./use-customers";
import { RepaymentForm, fmtMoney } from "./repayment-form";
import { CustomersKpiStrip } from "./kpi-strip";

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

type DrawerMode = "repayment" | "add-customer" | null;

export function CustomersClient() {
  const [search, setSearch] = React.useState("");
  const [hasBalance, setHasBalance] = React.useState(false);
  const [includeArchived, setIncludeArchived] = React.useState(false);

  const {
    customers,
    loading,
    error,
    refresh,
    createCustomer,
    recordRepayment,
    archiveCustomer,
    unarchiveCustomer,
  } = useCustomers({ search, hasBalance, includeArchived });
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

  const filtered = search.trim() !== "" || hasBalance || includeArchived;
  function clearFilters() {
    setSearch("");
    setHasBalance(false);
    setIncludeArchived(false);
  }

  const [archiving, setArchiving] = React.useState<CustomerListRow | null>(
    null,
  );
  const [archiveSubmitting, setArchiveSubmitting] = React.useState(false);

  async function confirmArchive() {
    if (!archiving || archiveSubmitting) return;
    setArchiveSubmitting(true);
    try {
      await archiveCustomer(archiving.id);
      toast("Customer archived", { tone: "success" });
      setArchiving(null);
      closeDrawer();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not archive the customer.", {
        tone: "danger",
      });
    } finally {
      setArchiveSubmitting(false);
    }
  }

  async function handleUnarchive(row: CustomerListRow) {
    try {
      await unarchiveCustomer(row.id);
      toast("Customer restored", { tone: "success" });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not restore the customer.", {
        tone: "danger",
      });
    }
  }

  const filterControls: FilterControl[] = [
    {
      id: "hasBalance",
      label: "Has balance",
      kind: "toggle",
      value: hasBalance,
      default: false,
    },
    {
      id: "includeArchived",
      label: "Include archived",
      kind: "toggle",
      value: includeArchived,
      default: false,
    },
  ];

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
          className={`kit-focus-ring rounded-sm inline-flex items-center gap-(--sp-3) ${
            r.archivedAt ? "opacity-60" : ""
          }`}
        >
          {r.name}
          {r.archivedAt && (
            <span className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.03em] text-micro/micro [color:var(--text-tertiary)] px-[6px] py-[2px] rounded-sm border border-solid [border-color:var(--border-subtle)]">
              Archived
            </span>
          )}
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
      render: (r) =>
        r.archivedAt ? (
          <button
            type="button"
            aria-label={`Unarchive ${r.name}`}
            onClick={(e) => {
              e.stopPropagation();
              void handleUnarchive(r);
            }}
            className="font-ui font-(--weight-medium) text-accent text-sm/micro kit-focus-ring rounded-sm"
          >
            Unarchive
          </button>
        ) : (
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
    <PageShell>
      <AdminPageHeader
        title="Customers & Credit"
        actions={
          <Button
            variant="secondary"
            onClick={() => setDrawerMode("add-customer")}
          >
            Add customer
          </Button>
        }
      />
      <div className="flex flex-col grow gap-(--sp-6)">
        {!error && (
          <CustomersKpiStrip customers={customers.filter((c) => !c.archivedAt)} />
        )}

        <FilterToolbar
          aria-label="Filter customers"
          search={
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search name or phone…"
              aria-label="Search customers"
            />
          }
          controls={filterControls}
          onChange={(id, value) => {
            if (id === "hasBalance") setHasBalance(Boolean(value));
            if (id === "includeArchived") setIncludeArchived(Boolean(value));
          }}
          onReset={clearFilters}
          resultCount={customers.length}
          resultNoun="customers"
        />

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
                onRowClick={(r) => {
                  if (!r.archivedAt) openRepayment(r);
                }}
                rowLabel={(r) =>
                  r.archivedAt ? r.name : `Record repayment for ${r.name}`
                }
                rowChevron
                /* DU2-0 draws a trailing › on every clickable row (M2 6b). */
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
                customers.map((c) =>
                  c.archivedAt ? (
                    <Link
                      key={c.id}
                      href={`/admin/customers/${c.id}`}
                      aria-label={`${c.name}, archived`}
                      className="flex items-center justify-between w-full py-(--sp-5) gap-(--sp-4) border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-row kit-focus-ring text-left opacity-60"
                    >
                      <div className="flex flex-col gap-[2px] min-w-0">
                        <span className="flex items-center gap-(--sp-3) font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm truncate">
                          {c.name}
                          <span className="font-ui font-(--weight-semibold) uppercase [letter-spacing:0.03em] text-micro/micro [color:var(--text-tertiary)] px-[6px] py-[2px] rounded-sm border border-solid [border-color:var(--border-subtle)]">
                            Archived
                          </span>
                        </span>
                        <span className="font-ui [color:var(--text-secondary)] text-sm/micro truncate">
                          {c.phone}
                        </span>
                      </div>
                      <span className="font-mono text-sm/sm shrink-0">
                        <BalanceCell balance={c.balance} />
                      </span>
                    </Link>
                  ) : (
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
                  ),
                )
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
          <>
            {/* View history — the only path into the ledger detail screen
                from the mobile row list (< --bp-md), where the row itself
                opens this drawer rather than the desktop table's separate
                name link (owner-reported gap, 2026-09-23). Kept inside the
                drawer rather than duplicating the row tap target. */}
            <Link
              href={`/admin/customers/${selected.id}`}
              className="kit-focus-ring inline-flex items-center gap-(--sp-3) self-start mb-(--sp-5) font-ui font-(--weight-medium) text-accent text-sm/sm rounded-sm"
            >
              View full history
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden style={{ flexShrink: 0 }}>
                <polyline points="9 6 15 12 9 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

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

            {/* Archive section — Assets' Edit-drawer danger-section pattern
                (heading + description + inline destructive action below a
                divider), the only place this action lives (moved out of the
                table row per owner feedback). */}
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
                onClick={() => setArchiving(selected)}
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

      <ConfirmDialog
        open={archiving !== null}
        onClose={() => setArchiving(null)}
        onConfirm={confirmArchive}
        title="Archive customer"
        bodyCopy={
          archiving
            ? `Archive ${archiving.name}? They'll be hidden from the active ` +
              `list and can't be added to new credit orders. You can ` +
              `unarchive them later.`
            : ""
        }
        confirmLabel="Archive"
        submitting={archiveSubmitting}
      />
    </PageShell>
  );
}
