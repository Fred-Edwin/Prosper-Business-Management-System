"use client";

// Canteen — Record Credit Sale (ADR-91). The attendant picks a product,
// a quantity, and an existing customer; the sale posts immediately (stock
// leaves now, a Debt is created) — unlike the stock-count-derived cash
// flow, this is a discrete, real-time transaction (mirrors the Cashier's
// C2/C3/C5 credit-order flow at `app/cashier/orders/new/new-order-client.tsx`).
//
// COMPOSED from the proven kit — no kit change:
//   - product picker: same SearchInput + category tabs + tap-target-row
//     pattern as `../../stock-count/stock-count-client.tsx` (screen-local
//     row, not the kit's SelectableProductRow — same deviation that
//     screen already documents).
//   - quantity: the same compact inline stepper as the stock-count screen
//     (screen-local, not a kit export).
//   - customer attach: the Cashier's C5 `CustomerAttachSheet` pattern,
//     duplicated here (it's already screen-local for its one existing
//     consumer — extracting it to a shared location is a separate call,
//     out of this feature's scope).
//   - CalculatedImpactBanner for the preview total; Button for confirm.

import * as React from "react";
import { useRouter } from "next/navigation";
import { FlowHeader } from "@/components/kit/flow-header";
import { SearchInput } from "@/components/kit/search-input";
import { TextInput } from "@/components/kit/text-input";
import { Button } from "@/components/kit/button";
import { BottomSheet, type BottomSheetState } from "@/components/kit/bottom-sheet";
import { CalculatedImpactBanner } from "@/components/kit/calculated-impact-banner";
import { useToast } from "@/components/kit/toast";
import { ErrorState } from "@/components/kit/error-state";
import { cn } from "@/lib/utils";
import { useCreditSaleActions, CreditSaleRequestError } from "../../use-credit-sale";
import { useCanteenProducts, type CanteenProduct } from "../../use-canteen-products";
import { useStaffStock, useStockLevels } from "@/app/store-manager/use-staff-stock";
import { useCustomers } from "@/app/admin/customers/use-customers";
import type { CustomerListRow } from "@/lib/domain/customers";

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
}

function kes(amount: number): string {
  return `KES ${Number.isFinite(amount) ? Math.round(amount).toLocaleString("en-US") : amount}`;
}

export function CreditSaleClient() {
  const router = useRouter();
  const { toast } = useToast();
  const { products, loading: productsLoading, error: productsError } =
    useCanteenProducts();
  const { recordCreditSale } = useCreditSaleActions();

  const { data: staffData } = useStaffStock();
  const myLocationId =
    staffData.locations.find((l) => l.type === "canteen")?.id ??
    staffData.movements[0]?.locationId ??
    null;

  const { rows: stockLevels, loading: levelsLoading } = useStockLevels(
    myLocationId || undefined,
  );
  const availableById = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of stockLevels) {
      m.set(r.productId, Number.parseFloat(r.quantity) || 0);
    }
    return m;
  }, [stockLevels]);

  const [query, setQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = React.useState<CanteenProduct | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [customer, setCustomer] = React.useState<CustomerListRow | null>(null);
  const [attachOpen, setAttachOpen] = React.useState<BottomSheetState>("closed");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const categories = React.useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) if (p.category) cats.add(p.category);
    return [...cats].sort();
  }, [products]);

  const filtered = React.useMemo(() => {
    let out = products;
    if (activeCategory) out = out.filter((p) => p.category === activeCategory);
    if (query.trim()) {
      const q = query.toLowerCase();
      out = out.filter((p) => p.name.toLowerCase().includes(q));
    }
    return out;
  }, [products, activeCategory, query]);

  function availableFor(productId: string): number {
    return availableById.get(productId) ?? 0;
  }

  const available = selectedProduct ? availableFor(selectedProduct.id) : 0;
  const exceedsAvailable = selectedProduct != null && quantity > available;
  const unitPrice = selectedProduct?.sellingPrice
    ? Number.parseFloat(selectedProduct.sellingPrice)
    : 0;
  const total = unitPrice * quantity;

  const canConfirm =
    selectedProduct != null &&
    customer != null &&
    quantity > 0 &&
    !exceedsAvailable &&
    !submitting;

  async function confirm() {
    if (!canConfirm || !selectedProduct || !customer) return;
    setSubmitting(true);
    setError(null);
    try {
      await recordCreditSale({
        productId: selectedProduct.id,
        customerId: customer.id,
        quantity: String(quantity),
      });
      toast(`Credit sale recorded for ${customer.name}`, { tone: "success" });
      router.back();
    } catch (e: unknown) {
      const msg =
        e instanceof CreditSaleRequestError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Couldn't record the credit sale.";
      setError(msg);
      toast(msg, { tone: "danger" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col grow min-h-0 bg-(--surface-page)">
      <FlowHeader title="Credit Sale" onBack={() => router.back()} />

      {productsError ? (
        <div className="flex flex-col p-(--sp-6)">
          <ErrorState title="Couldn't load products" description={productsError} />
        </div>
      ) : (
        <>
          <div className="mx-(--sp-6) mt-(--sp-5) mb-(--sp-5)">
            <SearchInput
              id="credit-sale-product-search"
              placeholder="Search canteen products"
              value={query}
              onChange={setQuery}
              onClear={() => setQuery("")}
            />
          </div>

          <div className="flex px-(--sp-6) gap-(--sp-7) border-b border-b-solid [border-bottom-color:var(--border-subtle)] overflow-x-auto shrink-0">
            <CategoryTab
              label="All"
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {categories.map((cat) => (
              <CategoryTab
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>

          <div className="flex flex-col grow min-h-0 overflow-y-auto p-(--sp-4) gap-(--sp-3)">
            {productsLoading || levelsLoading ? (
              [0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between h-[56px] px-(--sp-4) rounded-lg border border-solid [border-color:var(--border-subtle)]">
                  <div className="kit-skeleton h-[14px] w-[120px]" />
                  <div className="kit-skeleton h-[28px] w-[64px]" />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="flex items-center justify-center h-[120px] font-ui [color:var(--text-tertiary)] text-sm/sm px-(--sp-6) text-center">
                {query ? "No products match your search." : "No canteen products found."}
              </div>
            ) : (
              filtered.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  available={availableFor(p.id)}
                  selected={selectedProduct?.id === p.id}
                  quantity={selectedProduct?.id === p.id ? quantity : null}
                  exceedsAvailable={selectedProduct?.id === p.id && exceedsAvailable}
                  onSelect={() => {
                    setSelectedProduct(p);
                    setQuantity(1);
                  }}
                  onClose={() => setSelectedProduct(null)}
                  onQuantityChange={(v) => setQuantity(Math.max(1, v))}
                />
              ))
            )}
          </div>

          {/* Customer attach */}
          <div className="px-(--sp-6) pb-(--sp-4) shrink-0">
            <button
              type="button"
              aria-label={customer ? "Change attached customer" : "Attach a customer"}
              onClick={() => setAttachOpen("open")}
              className="flex items-center justify-between w-full h-(--control-lg) px-(--sp-5) rounded-lg border border-solid [border-color:var(--border-subtle)] kit-focus-ring text-left"
            >
              {customer ? (
                <div className="flex flex-col gap-px min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body truncate">
                    {customer.name}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-caption/micro truncate">
                    {customer.phone}
                  </span>
                </div>
              ) : (
                <span className="font-ui [color:var(--text-secondary)] text-body/body">
                  Attach a customer
                </span>
              )}
              <span className="font-ui font-(--weight-medium) text-accent text-sm/sm shrink-0">
                {customer ? "Change" : "Select"}
              </span>
            </button>
          </div>

          {/* Preview */}
          <div className="px-(--sp-6) pb-(--sp-4) shrink-0" data-testid="credit-sale-preview">
            <CalculatedImpactBanner className={exceedsAvailable ? "bg-danger-bg" : undefined}>
              {selectedProduct == null ? (
                <span>Select a product to see the total.</span>
              ) : exceedsAvailable ? (
                <span className="text-danger">
                  Fix the quantity above before confirming.
                </span>
              ) : (
                <span>
                  {fmtQty(quantity)} {selectedProduct.unitLabel} × {kes(unitPrice)} = {kes(total)}, owed by{" "}
                  {customer ? customer.name : "the attached customer"}.
                </span>
              )}
            </CalculatedImpactBanner>
          </div>

          {error && (
            <div className="px-(--sp-6) pb-(--sp-4) shrink-0">
              <p className="font-ui text-danger text-caption/micro">{error}</p>
            </div>
          )}
        </>
      )}

      <div className="flex items-center shrink-0 px-(--sp-6) py-(--sp-4) bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)]">
        <Button
          id="credit-sale-confirm"
          variant="primary"
          size="lg"
          disabled={!canConfirm}
          loading={submitting}
          onClick={confirm}
          className="w-full"
        >
          {total > 0 ? `Record credit sale — ${kes(total)}` : "Record credit sale"}
        </Button>
      </div>

      <CustomerAttachSheet
        state={attachOpen}
        onStateChange={setAttachOpen}
        onAttach={(c) => {
          setCustomer(c);
          setAttachOpen("closed");
        }}
      />
    </div>
  );
}

function CategoryTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex items-center h-[36px] shrink-0 kit-focus-ring",
        active
          ? "font-ui font-(--weight-semibold) text-accent border-b-2 border-b-solid border-b-accent"
          : "font-ui [color:var(--text-secondary)] text-sm/sm",
      ].join(" ")}
    >
      {active ? (
        <span className="font-ui font-(--weight-semibold) text-accent text-sm/sm">{label}</span>
      ) : (
        <span className="font-ui [color:var(--text-secondary)] text-sm/sm">{label}</span>
      )}
    </button>
  );
}

// Same visual/interaction contract as `stock-count-client.tsx`'s `CountRow`
// (screen-local, not the kit's SelectableProductRow) — here "available" IS
// a hard ceiling (§9.8 BLOCK semantics), unlike K1's "expected" figure.
function ProductRow({
  product,
  available,
  selected,
  quantity,
  exceedsAvailable,
  onSelect,
  onClose,
  onQuantityChange,
}: {
  product: CanteenProduct;
  available: number;
  selected: boolean;
  quantity: number | null;
  exceedsAvailable: boolean;
  onSelect: () => void;
  onClose: () => void;
  onQuantityChange: (v: number) => void;
}) {
  const unit = product.unitLabel;
  const [editing, setEditing] = React.useState<string | null>(null);

  if (!selected || quantity == null) {
    return (
      <div
        role="group"
        aria-label={`${product.name}, ${fmtQty(available)} ${unit} in stock`}
        className="flex items-center w-full min-h-[56px] py-[12px] px-[14px] rounded-lg gap-[12px] bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]"
      >
        <div className="grow min-w-0 flex flex-col gap-px">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
            {product.name}
          </span>
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            {[product.category, product.unitLabel].filter(Boolean).join(" · ")}
          </span>
        </div>
        <span className="shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-caption/micro">
          {fmtQty(available)} {unit} left
        </span>
        <span className="shrink-0 basis-[92px] flex justify-end">
          <Button id={`credit-sale-select-${product.id}`} size="sm" variant="secondary" onClick={onSelect}>
            Select
          </Button>
        </span>
      </div>
    );
  }

  const display = editing ?? fmtQty(quantity);

  function commit(raw: string) {
    const n = Number.parseFloat(raw);
    onQuantityChange(Number.isNaN(n) ? 1 : n);
    setEditing(null);
  }

  return (
    <div
      role="group"
      aria-label={`${product.name}, ${fmtQty(available)} ${unit} in stock, quantity ${fmtQty(quantity)} ${unit}${exceedsAvailable ? ", exceeds available stock" : ""}`}
      data-blocked={exceedsAvailable || undefined}
      className={cn(
        "flex flex-col w-full min-h-[56px] p-[12px] rounded-lg gap-[6px] border border-solid",
        exceedsAvailable ? "bg-danger-bg border-danger" : "bg-(--surface-selected) border-accent",
      )}
    >
      <div className="flex items-center gap-[8px]">
        <div className="grow min-w-0 flex flex-col gap-px">
          <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1">
            {product.name}
          </span>
          <span className="font-ui [color:var(--text-secondary)] text-caption/micro">
            {fmtQty(available)} {unit} left
          </span>
        </div>

        <div
          className={cn(
            "flex items-center h-[32px] rounded-md overflow-clip shrink-0 bg-(--surface-page) border border-solid",
            exceedsAvailable ? "border-danger" : "[border-color:var(--border-strong)]",
          )}
        >
          <button
            type="button"
            disabled={quantity <= 1}
            onClick={() => onQuantityChange(quantity - 1)}
            aria-label="Decrease"
            tabIndex={-1}
            className="flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body"
          >
            −
          </button>
          <span className="flex items-center justify-center min-w-[48px] h-[30px] px-[4px] shrink-0 border-x border-x-solid [border-color:var(--border-subtle)]">
            <input
              type="text"
              inputMode="decimal"
              role="spinbutton"
              aria-label={`${product.name} quantity`}
              aria-valuenow={quantity}
              aria-valuemin={1}
              aria-invalid={exceedsAvailable || undefined}
              value={display}
              onChange={(e) => setEditing(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  onQuantityChange(quantity + 1);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  onQuantityChange(Math.max(1, quantity - 1));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  commit((e.target as HTMLInputElement).value);
                }
              }}
              className={cn(
                "w-max min-w-0 bg-transparent outline-none text-center font-mono font-(--weight-medium) [font-feature-settings:'tnum'] text-sm/micro",
                exceedsAvailable ? "text-danger" : "[color:var(--text-primary)]",
              )}
              style={{ width: `${Math.max(display.length, 2)}ch` }}
            />
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(quantity + 1)}
            aria-label="Increase"
            tabIndex={-1}
            className="flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body"
          >
            +
          </button>
        </div>

        <button
          type="button"
          id={`credit-sale-remove-${product.id}`}
          onClick={onClose}
          className="font-ui font-(--weight-medium) text-accent text-sm/sm shrink-0 kit-focus-ring rounded-sm"
        >
          Remove
        </button>
      </div>

      {exceedsAvailable && (
        <p className="font-ui font-(--weight-regular) text-danger text-caption/micro">
          Only {fmtQty(available)} {unit} in stock — reduce the quantity.
        </p>
      )}
    </div>
  );
}

// ── Customer attach / quick-create (mirrors app/cashier/orders/new's C5) ─

function CustomerAttachSheet({
  state,
  onStateChange,
  onAttach,
}: {
  state: BottomSheetState;
  onStateChange: (s: BottomSheetState) => void;
  onAttach: (c: CustomerListRow) => void;
}) {
  const [search, setSearch] = React.useState("");
  const { customers, loading, createCustomer } = useCustomers({ search });
  const [nameOverride, setNameOverride] = React.useState<string | null>(null);
  const [phone, setPhone] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [forceCreate, setForceCreate] = React.useState(false);

  React.useEffect(() => {
    if (state === "closed") {
      setSearch("");
      setNameOverride(null);
      setPhone("");
      setCreateError(null);
      setForceCreate(false);
    }
  }, [state]);

  const trimmed = search.trim();
  const showCreate =
    forceCreate || (trimmed !== "" && !loading && customers.length === 0);

  const name = nameOverride ?? trimmed;

  const phoneValid = /^[0-9+\s-]{7,}$/.test(phone.trim());
  const canCreate = name.trim() !== "" && phoneValid && !creating;

  async function quickCreate() {
    if (!canCreate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createCustomer({
        name: name.trim(),
        phone: phone.trim(),
      });
      onAttach({
        id: created.id,
        name: created.name,
        phone: created.phone,
        balance: "0.00",
        archivedAt: null,
        lastActivityAt: null,
        oldestDebtAt: null,
      });
    } catch (e) {
      setCreateError(
        e instanceof Error ? e.message : "Couldn't add the customer.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <BottomSheet state={state} onStateChange={onStateChange} title="Attach customer">
      <div className="flex flex-col gap-(--sp-5)">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name or phone…"
          aria-label="Search customers"
        />

        {showCreate ? (
          <div className="flex flex-col gap-(--sp-5)">
            <p className="font-ui [color:var(--text-secondary)] text-sm/sm">
              {trimmed !== ""
                ? `No customer matches “${trimmed}”. Add them:`
                : "Add a new customer:"}
            </p>
            <TextInput
              label="Name"
              value={name}
              onChange={(e) => setNameOverride(e.target.value)}
            />
            <TextInput
              label="Phone"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              error={phone.trim() !== "" && !phoneValid}
              helperText={
                phone.trim() !== "" && !phoneValid
                  ? "Enter a valid phone number"
                  : undefined
              }
            />
            {createError && (
              <p className="font-ui text-danger text-caption/micro">{createError}</p>
            )}
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={!canCreate}
              loading={creating}
              onClick={quickCreate}
            >
              Add customer &amp; attach
            </Button>
          </div>
        ) : loading && customers.length === 0 ? (
          <div className="flex flex-col">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center h-[56px] border-b border-b-solid [border-bottom-color:var(--border-subtle)]"
              >
                <div className="kit-skeleton h-[14px] w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onAttach(c)}
                className="flex items-center justify-between [width:100%] py-(--sp-5) gap-(--sp-4) text-left border-b border-b-solid [border-bottom-color:var(--border-subtle)] kit-row kit-focus-ring"
              >
                <div className="flex flex-col gap-px min-w-0">
                  <span className="font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/sm truncate">
                    {c.name}
                  </span>
                  <span className="font-ui [color:var(--text-secondary)] text-sm/micro truncate">
                    {c.phone}
                  </span>
                </div>
                <BalanceReadout balance={c.balance} />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setForceCreate(true)}
              className="flex items-center gap-(--sp-4) py-(--sp-5) text-left kit-focus-ring"
            >
              <span className="font-ui text-accent text-h2/h2 leading-none">+</span>
              <span className="font-ui font-(--weight-medium) text-accent text-body/body">
                Add new customer
              </span>
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}

function BalanceReadout({ balance }: { balance: string }) {
  const n = Number(balance);
  if (!Number.isFinite(n) || n === 0) {
    return (
      <span className="font-ui [color:var(--text-tertiary)] text-sm/sm shrink-0">
        Settled
      </span>
    );
  }
  const abs = Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  return (
    <span className={`font-mono text-sm/sm shrink-0 ${n > 0 ? "text-danger" : "text-success"}`}>
      {n > 0 ? `owes KES ${abs}` : `KES ${abs} cr`}
    </span>
  );
}
